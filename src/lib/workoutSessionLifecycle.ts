/**
 * Client workout session lifecycle helpers.
 * Enforces at most one in_progress session per client (app layer).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from './supabase'

type SessionTimestamps = {
  last_activity_at?: string | null
  started_at?: string | null
  created_at?: string | null
}

/** Timestamp to store on abandoned sessions (not a real completion). */
export function abandonCompletedAt(row: SessionTimestamps): string {
  return row.last_activity_at ?? row.started_at ?? row.created_at ?? new Date().toISOString()
}

function activityMs(row: SessionTimestamps): number | null {
  const raw = row.last_activity_at ?? row.started_at ?? row.created_at
  if (!raw) return null
  const ms = new Date(raw).getTime()
  return Number.isFinite(ms) ? ms : null
}

/**
 * Mark every other in_progress session for this client as abandoned.
 * @returns number of sessions abandoned
 */
export async function abandonOtherInProgressSessions(
  clientId: string,
  keepSessionId: string | null | undefined,
  db: SupabaseClient = supabase,
): Promise<number> {
  let q = db
    .from('workout_sessions')
    .select('id, last_activity_at, started_at, created_at')
    .eq('client_id', clientId)
    .eq('status', 'in_progress')

  if (keepSessionId) {
    q = q.neq('id', keepSessionId)
  }

  const { data: others, error } = await q
  if (error) {
    console.error('[workoutSessionLifecycle] abandonOther fetch failed:', error)
    return 0
  }
  if (!others?.length) return 0

  let count = 0
  for (const row of others) {
    const { error: updateError } = await db
      .from('workout_sessions')
      .update({
        status: 'abandoned',
        completed_at: abandonCompletedAt(row),
      })
      .eq('id', row.id)
      .eq('status', 'in_progress')

    if (updateError) {
      console.error(
        `[workoutSessionLifecycle] failed to abandon session ${row.id}:`,
        updateError,
      )
    } else {
      count++
    }
  }
  return count
}

/**
 * Abandon in_progress sessions whose last activity is before cutoffISO.
 * Uses coalesce(last_activity_at, started_at, created_at) for the comparison.
 */
export async function closeStaleInProgressSessionsForClient(
  clientId: string,
  cutoffISO: string,
  db: SupabaseClient = supabase,
): Promise<number> {
  const cutoffMs = new Date(cutoffISO).getTime()
  if (!Number.isFinite(cutoffMs)) return 0

  const { data: sessions, error } = await db
    .from('workout_sessions')
    .select('id, last_activity_at, started_at, created_at')
    .eq('client_id', clientId)
    .eq('status', 'in_progress')

  if (error) {
    console.error('[workoutSessionLifecycle] stale session fetch failed:', error)
    return 0
  }
  if (!sessions?.length) return 0

  let count = 0
  for (const row of sessions) {
    const ms = activityMs(row)
    if (ms == null || ms >= cutoffMs) continue

    const { error: updateError } = await db
      .from('workout_sessions')
      .update({
        status: 'abandoned',
        completed_at: abandonCompletedAt(row),
      })
      .eq('id', row.id)
      .eq('status', 'in_progress')

    if (updateError) {
      console.error(
        `[workoutSessionLifecycle] failed to close stale session ${row.id}:`,
        updateError,
      )
    } else {
      count++
    }
  }
  return count
}
