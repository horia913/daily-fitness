/**
 * Leaderboard Population Service
 * Writes and updates leaderboard_entries, recalculates ranks within a coach roster.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from './supabase'
import {
  calculatePRForExercise,
  calculateTonnage,
  type LeaderboardEntry,
} from './leaderboardService'
import { getLatestClientWeight } from './metrics/body'

const SENTINEL_EXERCISE_ID = '00000000-0000-0000-0000-000000000000'
const SENTINEL_TIME_WINDOW = 'all_time'

export interface LeaderboardRankChange {
  exerciseId: string | null
  exerciseName: string
  leaderboardType: string
  oldRank: number
  newRank: number
}

export interface UpdateLeaderboardResult {
  entries: LeaderboardEntry[]
  rankChanges: LeaderboardRankChange[]
}

type PartitionKey = {
  type: string
  exerciseId: string | null
  timeWindow: string
  coachId: string
}

/**
 * Resolve the coach for a client via clients.coach_id.
 */
export async function resolveClientCoachId(
  clientId: string,
  db?: SupabaseClient
): Promise<string | null> {
  const supabaseClient = db ?? supabase
  const { data, error } = await supabaseClient
    .from('clients')
    .select('coach_id')
    .eq('client_id', clientId)
    .maybeSingle()
  if (error || !data?.coach_id) return null
  return data.coach_id as string
}

/**
 * Get exercises the client has logged sets for (optionally filter to one).
 */
async function getExercisesWithSets(
  db: SupabaseClient,
  clientId: string,
  exerciseId?: string
): Promise<string[]> {
  let q = db
    .from('workout_set_logs')
    .select('exercise_id')
    .eq('client_id', clientId)
    .not('exercise_id', 'is', null)
  if (exerciseId) {
    q = q.eq('exercise_id', exerciseId)
  }
  const { data, error } = await q
  if (error) return []
  const ids = [...new Set((data || []).map((r: { exercise_id: string }) => r.exercise_id).filter(Boolean))]
  return ids
}

/**
 * Fetch current ranks for this client (for rank-change detection).
 */
async function getCurrentRanks(
  db: SupabaseClient,
  clientId: string
): Promise<Map<string, { rank: number; exercise_id: string | null; leaderboard_type: string; time_window: string | null }>> {
  const { data, error } = await db
    .from('leaderboard_entries')
    .select('id, leaderboard_type, exercise_id, time_window, rank')
    .eq('client_id', clientId)
  if (error || !data) return new Map()
  const map = new Map<string, { rank: number; exercise_id: string | null; leaderboard_type: string; time_window: string | null }>()
  for (const row of data) {
    const key = `${row.leaderboard_type}|${row.exercise_id ?? SENTINEL_EXERCISE_ID}|${row.time_window ?? SENTINEL_TIME_WINDOW}`
    map.set(key, { rank: row.rank, exercise_id: row.exercise_id ?? null, leaderboard_type: row.leaderboard_type, time_window: row.time_window ?? null })
  }
  return map
}

/**
 * Upsert one row into leaderboard_entries (select then update or insert).
 * coach_id is filled by the DB trigger on INSERT/UPDATE — do not set here.
 */
async function upsertEntry(
  db: SupabaseClient,
  clientId: string,
  leaderboardType: string,
  exerciseId: string | null,
  timeWindow: string | null,
  score: number,
  displayName: string,
  isAnonymous: boolean
): Promise<void> {
  const exId = exerciseId ?? null
  const tw = timeWindow ?? 'all_time'

  let q = db.from('leaderboard_entries').select('id').eq('client_id', clientId).eq('leaderboard_type', leaderboardType)
  if (exId) q = q.eq('exercise_id', exId)
  else q = q.is('exercise_id', null)
  if (tw) q = q.eq('time_window', tw)
  else q = q.is('time_window', null)
  const { data: existingRow } = await q.maybeSingle()

  const row = {
    client_id: clientId,
    leaderboard_type: leaderboardType,
    exercise_id: exId,
    time_window: tw,
    rank: 0,
    score,
    display_name: displayName,
    is_anonymous: isAnonymous,
    last_updated: new Date().toISOString(),
  }

  if (existingRow?.id) {
    await db.from('leaderboard_entries').update({ score, display_name: displayName, is_anonymous: isAnonymous, last_updated: row.last_updated }).eq('id', existingRow.id)
  } else {
    await db.from('leaderboard_entries').insert(row)
  }
}

/**
 * Recalculate ranks for a (coach_id, leaderboard_type, exercise_id, time_window) partition.
 */
export async function recalcRanksForPartition(
  db: SupabaseClient,
  leaderboardType: string,
  exerciseId: string | null,
  timeWindow: string,
  coachId: string
): Promise<void> {
  let q = db
    .from('leaderboard_entries')
    .select('id, score')
    .eq('coach_id', coachId)
    .eq('leaderboard_type', leaderboardType)
    .eq('time_window', timeWindow)
    .order('score', { ascending: false })
  if (exerciseId) {
    q = q.eq('exercise_id', exerciseId)
  } else {
    q = q.is('exercise_id', null)
  }
  const { data: rows, error } = await q
  if (error || !rows?.length) return
  let rank = 1
  for (const row of rows) {
    await db.from('leaderboard_entries').update({ rank }).eq('id', row.id)
    rank++
  }
}

/**
 * Delete all leaderboard_entries for a client, then recalc ranks in each affected coach partition.
 */
export async function deleteClientLeaderboardEntriesAndRecalc(
  clientId: string,
  db?: SupabaseClient
): Promise<void> {
  const supabaseClient = db ?? supabase

  const { data: rows } = await supabaseClient
    .from('leaderboard_entries')
    .select('leaderboard_type, exercise_id, time_window, coach_id')
    .eq('client_id', clientId)

  const partitions: PartitionKey[] = []
  const seen = new Set<string>()
  for (const row of rows || []) {
    const coachId = row.coach_id as string | null
    if (!coachId) continue
    const timeWindow = (row.time_window as string | null) ?? SENTINEL_TIME_WINDOW
    const exerciseId = (row.exercise_id as string | null) ?? null
    const key = `${coachId}|${row.leaderboard_type}|${exerciseId ?? SENTINEL_EXERCISE_ID}|${timeWindow}`
    if (seen.has(key)) continue
    seen.add(key)
    partitions.push({
      type: row.leaderboard_type as string,
      exerciseId,
      timeWindow,
      coachId,
    })
  }

  await supabaseClient.from('leaderboard_entries').delete().eq('client_id', clientId)

  for (const p of partitions) {
    await recalcRanksForPartition(
      supabaseClient,
      p.type,
      p.exerciseId,
      p.timeWindow,
      p.coachId
    )
  }
}

/**
 * Update display_name / is_anonymous on all existing rows for a client.
 */
export async function syncClientLeaderboardDisplay(
  clientId: string,
  displayName: string,
  isAnonymous: boolean,
  db?: SupabaseClient
): Promise<void> {
  const supabaseClient = db ?? supabase
  await supabaseClient
    .from('leaderboard_entries')
    .update({
      display_name: displayName,
      is_anonymous: isAnonymous,
      last_updated: new Date().toISOString(),
    })
    .eq('client_id', clientId)
}

/**
 * Update leaderboard entries for a client and recalculate ranks within their coach's roster.
 * Returns updated entries and list of rank improvements for toasts.
 */
export async function updateLeaderboardForClient(
  clientId: string,
  exerciseId?: string,
  db?: SupabaseClient
): Promise<UpdateLeaderboardResult> {
  const supabaseClient = db ?? supabase
  const rankChanges: LeaderboardRankChange[] = []
  const entries: LeaderboardEntry[] = []

  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('id, first_name, last_name, leaderboard_visibility')
    .eq('id', clientId)
    .single()

  if (profileError || !profile) {
    return { entries, rankChanges }
  }

  const visibility = (profile.leaderboard_visibility as string) ?? 'public'
  if (visibility === 'hidden') {
    return { entries, rankChanges }
  }

  const coachId = await resolveClientCoachId(clientId, supabaseClient)
  if (!coachId) {
    console.warn('[leaderboardPopulationService] No coach_id for client; skipping update:', clientId)
    return { entries, rankChanges }
  }

  const displayName =
    visibility === 'anonymous'
      ? 'Anonymous'
      : [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() || 'Anonymous'
  const isAnonymous = visibility === 'anonymous'
  // Current BW from body_metrics only; skip bw_multiple when none (no zero/stale fallback).
  const latestWeight = await getLatestClientWeight(clientId, supabaseClient)
  const bodyweightKg = latestWeight?.weightKg ?? null

  const beforeRanks = await getCurrentRanks(supabaseClient, clientId)
  const exerciseIds = await getExercisesWithSets(supabaseClient, clientId, exerciseId)
  const partitions: PartitionKey[] = []

  for (const eid of exerciseIds) {
    const pr1 = await calculatePRForExercise(clientId, eid, 1, supabaseClient)
    const pr3 = await calculatePRForExercise(clientId, eid, 3, supabaseClient)
    const pr5 = await calculatePRForExercise(clientId, eid, 5, supabaseClient)
    if (pr1 != null && pr1 > 0) {
      await upsertEntry(supabaseClient, clientId, 'pr_1rm', eid, 'all_time', pr1, displayName, isAnonymous)
      partitions.push({ type: 'pr_1rm', exerciseId: eid, timeWindow: 'all_time', coachId })
    }
    if (pr3 != null && pr3 > 0) {
      await upsertEntry(supabaseClient, clientId, 'pr_3rm', eid, 'all_time', pr3, displayName, isAnonymous)
      partitions.push({ type: 'pr_3rm', exerciseId: eid, timeWindow: 'all_time', coachId })
    }
    if (pr5 != null && pr5 > 0) {
      await upsertEntry(supabaseClient, clientId, 'pr_5rm', eid, 'all_time', pr5, displayName, isAnonymous)
      partitions.push({ type: 'pr_5rm', exerciseId: eid, timeWindow: 'all_time', coachId })
    }
    if (bodyweightKg != null && bodyweightKg > 0 && pr1 != null && pr1 > 0) {
      const bw = Math.round((pr1 / bodyweightKg) * 100) / 100
      await upsertEntry(supabaseClient, clientId, 'bw_multiple', eid, 'all_time', bw, displayName, isAnonymous)
      partitions.push({ type: 'bw_multiple', exerciseId: eid, timeWindow: 'all_time', coachId })
    }
  }

  const tonnageWeek = await calculateTonnage(clientId, 'this_week', undefined, supabaseClient)
  const tonnageMonth = await calculateTonnage(clientId, 'this_month', undefined, supabaseClient)
  const tonnageAll = await calculateTonnage(clientId, 'all_time', undefined, supabaseClient)
  await upsertEntry(supabaseClient, clientId, 'tonnage_week', null, 'this_week', tonnageWeek, displayName, isAnonymous)
  await upsertEntry(supabaseClient, clientId, 'tonnage_month', null, 'this_month', tonnageMonth, displayName, isAnonymous)
  await upsertEntry(supabaseClient, clientId, 'tonnage_all_time', null, 'all_time', tonnageAll, displayName, isAnonymous)
  partitions.push({ type: 'tonnage_week', exerciseId: null, timeWindow: 'this_week', coachId })
  partitions.push({ type: 'tonnage_month', exerciseId: null, timeWindow: 'this_month', coachId })
  partitions.push({ type: 'tonnage_all_time', exerciseId: null, timeWindow: 'all_time', coachId })

  const seenPartition = new Set<string>()
  for (const p of partitions) {
    const key = `${p.coachId}|${p.type}|${p.exerciseId ?? SENTINEL_EXERCISE_ID}|${p.timeWindow}`
    if (seenPartition.has(key)) continue
    seenPartition.add(key)
    await recalcRanksForPartition(supabaseClient, p.type, p.exerciseId, p.timeWindow, p.coachId)
  }

  const { data: updatedRows } = await supabaseClient
    .from('leaderboard_entries')
    .select('*')
    .eq('client_id', clientId)

  const exerciseNames = new Map<string, string>()
  if (exerciseIds.length > 0) {
    const { data: exData } = await supabaseClient.from('exercises').select('id, name').in('id', exerciseIds)
    for (const e of exData || []) {
      exerciseNames.set(e.id, e.name ?? 'Exercise')
    }
  }

  for (const row of updatedRows || []) {
    entries.push({
      id: row.id,
      client_id: row.client_id,
      leaderboard_type: row.leaderboard_type,
      exercise_id: row.exercise_id ?? undefined,
      rank: row.rank,
      score: Number(row.score),
      time_window: row.time_window ?? undefined,
      display_name: row.display_name ?? '',
      is_anonymous: row.is_anonymous ?? false,
      last_updated: row.last_updated ?? '',
    })
    const key = `${row.leaderboard_type}|${row.exercise_id ?? SENTINEL_EXERCISE_ID}|${row.time_window ?? SENTINEL_TIME_WINDOW}`
    const before = beforeRanks.get(key)
    if (before && row.rank < before.rank) {
      const exerciseName = row.exercise_id ? exerciseNames.get(row.exercise_id) ?? 'Exercise' : 'Tonnage'
      rankChanges.push({
        exerciseId: row.exercise_id ?? null,
        exerciseName,
        leaderboardType: row.leaderboard_type,
        oldRank: before.rank,
        newRank: row.rank,
      })
    }
  }

  const hasTopThree = (updatedRows || []).some((r: { rank: number }) => r.rank >= 1 && r.rank <= 3)
  if (hasTopThree) {
    try {
      const { AchievementService } = await import('@/lib/achievementService')
      await AchievementService.checkAndUnlockAchievements(clientId, 'leaderboard_rank', db)
    } catch (err) {
      console.warn('[leaderboardPopulationService] leaderboard_rank achievement check failed (non-blocking):', err)
    }
  }

  return { entries, rankChanges }
}
