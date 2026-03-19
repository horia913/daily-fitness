/**
 * Leaderboard Population Service
 * Writes and updates leaderboard_entries, recalculates ranks, returns rank changes.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from './supabase'
import {
  calculatePRForExercise,
  calculateTonnage,
  type LeaderboardEntry,
} from './leaderboardService'

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
 * Upsert one row into leaderboard_entries (select then update or insert, no unique constraint on columns).
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
 * Recalculate ranks for a given (leaderboard_type, exercise_id, time_window) partition.
 */
async function recalcRanksForPartition(
  db: SupabaseClient,
  leaderboardType: string,
  exerciseId: string | null,
  timeWindow: string
): Promise<void> {
  let q = db
    .from('leaderboard_entries')
    .select('id, score')
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
 * Update leaderboard entries for a client and recalculate ranks.
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
    .select('id, first_name, last_name, bodyweight, leaderboard_visibility')
    .eq('id', clientId)
    .single()

  if (profileError || !profile) {
    return { entries, rankChanges }
  }

  const visibility = (profile.leaderboard_visibility as string) ?? 'public'
  if (visibility === 'hidden') {
    return { entries, rankChanges }
  }

  const displayName =
    visibility === 'anonymous'
      ? 'Anonymous'
      : [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() || 'Anonymous'
  const isAnonymous = visibility === 'anonymous'
  const bodyweightKg = profile.bodyweight != null ? Number(profile.bodyweight) : null

  const beforeRanks = await getCurrentRanks(supabaseClient, clientId)
  const exerciseIds = await getExercisesWithSets(supabaseClient, clientId, exerciseId)
  const partitions: { type: string; exerciseId: string | null; timeWindow: string }[] = []

  for (const eid of exerciseIds) {
    const pr1 = await calculatePRForExercise(clientId, eid, 1, supabaseClient)
    const pr3 = await calculatePRForExercise(clientId, eid, 3, supabaseClient)
    const pr5 = await calculatePRForExercise(clientId, eid, 5, supabaseClient)
    if (pr1 != null && pr1 > 0) {
      await upsertEntry(supabaseClient, clientId, 'pr_1rm', eid, 'all_time', pr1, displayName, isAnonymous)
      partitions.push({ type: 'pr_1rm', exerciseId: eid, timeWindow: 'all_time' })
    }
    if (pr3 != null && pr3 > 0) {
      await upsertEntry(supabaseClient, clientId, 'pr_3rm', eid, 'all_time', pr3, displayName, isAnonymous)
      partitions.push({ type: 'pr_3rm', exerciseId: eid, timeWindow: 'all_time' })
    }
    if (pr5 != null && pr5 > 0) {
      await upsertEntry(supabaseClient, clientId, 'pr_5rm', eid, 'all_time', pr5, displayName, isAnonymous)
      partitions.push({ type: 'pr_5rm', exerciseId: eid, timeWindow: 'all_time' })
    }
    if (bodyweightKg != null && bodyweightKg > 0 && pr1 != null && pr1 > 0) {
      const bw = Math.round((pr1 / bodyweightKg) * 100) / 100
      await upsertEntry(supabaseClient, clientId, 'bw_multiple', eid, 'all_time', bw, displayName, isAnonymous)
      partitions.push({ type: 'bw_multiple', exerciseId: eid, timeWindow: 'all_time' })
    }
  }

  const tonnageWeek = await calculateTonnage(clientId, 'this_week', undefined, supabaseClient)
  const tonnageMonth = await calculateTonnage(clientId, 'this_month', undefined, supabaseClient)
  const tonnageAll = await calculateTonnage(clientId, 'all_time', undefined, supabaseClient)
  await upsertEntry(supabaseClient, clientId, 'tonnage_week', null, 'this_week', tonnageWeek, displayName, isAnonymous)
  await upsertEntry(supabaseClient, clientId, 'tonnage_month', null, 'this_month', tonnageMonth, displayName, isAnonymous)
  await upsertEntry(supabaseClient, clientId, 'tonnage_all_time', null, 'all_time', tonnageAll, displayName, isAnonymous)
  partitions.push({ type: 'tonnage_week', exerciseId: null, timeWindow: 'this_week' })
  partitions.push({ type: 'tonnage_month', exerciseId: null, timeWindow: 'this_month' })
  partitions.push({ type: 'tonnage_all_time', exerciseId: null, timeWindow: 'all_time' })

  const seenPartition = new Set<string>()
  for (const p of partitions) {
    const key = `${p.type}|${p.exerciseId ?? SENTINEL_EXERCISE_ID}|${p.timeWindow}`
    if (seenPartition.has(key)) continue
    seenPartition.add(key)
    await recalcRanksForPartition(supabaseClient, p.type, p.exerciseId, p.timeWindow)
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
