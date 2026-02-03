/**
 * Workout metrics per metric contract.
 * Source: workout_logs (client_id, completed_at, total_duration_minutes).
 */

import { supabase } from '../supabase'
import type { PeriodBounds, PeriodKind } from './period'
import { getPeriodBounds } from './period'

export async function getTotalWorkouts(
  clientIds: string[],
  period?: PeriodBounds
): Promise<number> {
  if (clientIds.length === 0) return 0
  let q = supabase
    .from('workout_logs')
    .select('id', { count: 'exact', head: true })
    .in('client_id', clientIds)
    .not('completed_at', 'is', null)
  if (period) {
    q = q.gte('completed_at', period.start).lt('completed_at', period.end)
  }
  const { count, error } = await q
  if (error) {
    console.error('[metrics/workout] getTotalWorkouts:', error)
    return 0
  }
  return count ?? 0
}

export async function getAvgSessionTime(
  clientIds: string[],
  period: PeriodBounds
): Promise<number> {
  if (clientIds.length === 0) return 0
  const { data, error } = await supabase
    .from('workout_logs')
    .select('total_duration_minutes')
    .in('client_id', clientIds)
    .not('completed_at', 'is', null)
    .not('total_duration_minutes', 'is', null)
    .gte('completed_at', period.start)
    .lt('completed_at', period.end)
  if (error || !data || data.length === 0) return 0
  const sum = data.reduce((s, r) => s + (r.total_duration_minutes ?? 0), 0)
  return Math.round(sum / data.length)
}

export async function getSessionsPerWeek(
  clientIds: string[],
  period: PeriodBounds
): Promise<number> {
  const count = await getTotalWorkouts(clientIds, period)
  if (period.weeksInPeriod <= 0) return 0
  return Math.round((count / period.weeksInPeriod) * 10) / 10
}

export async function getTotalWorkoutDurationMinutes(
  clientIds: string[],
  period: PeriodBounds
): Promise<number> {
  if (clientIds.length === 0) return 0
  const { data, error } = await supabase
    .from('workout_logs')
    .select('total_duration_minutes')
    .in('client_id', clientIds)
    .not('completed_at', 'is', null)
    .gte('completed_at', period.start)
    .lt('completed_at', period.end)
  if (error || !data) return 0
  return data.reduce((s, r) => s + (r.total_duration_minutes ?? 0), 0)
}

/** Workout compliance = completed in period / assigned in period. Returns 0–100 or N/A when no assignments. */
export async function getWorkoutCompliance(
  clientId: string,
  period: PeriodBounds
): Promise<{ ratePercent: number; completed: number; assigned: number }> {
  const [completed, assigned] = await Promise.all([
    getTotalWorkouts([clientId], period),
    getAssignedWorkoutsCount(clientId, period)
  ])
  if (assigned === 0) return { ratePercent: 0, completed, assigned }
  const ratePercent = Math.round((completed / assigned) * 100)
  return { ratePercent, completed, assigned }
}

async function getAssignedWorkoutsCount(clientId: string, period: PeriodBounds): Promise<number> {
  const periodStart = period.start.slice(0, 10)
  const periodEnd = period.end.slice(0, 10)
  const { data, error } = await supabase
    .from('workout_assignments')
    .select('scheduled_date, assigned_date')
    .eq('client_id', clientId)
  if (error || !data) return 0
  const inPeriod = data.filter((row) => {
    const d = (row.scheduled_date || row.assigned_date) ?? ''
    return d >= periodStart && d < periodEnd
  })
  return inPeriod.length
}

/** Sparkline: last 7 days, count of completed workouts per day (UTC date). */
export async function getSparklineData(
  clientId: string,
  days: number = 7
): Promise<{ date: string; count: number }[]> {
  const end = new Date()
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - days + 1)
  start.setUTCHours(0, 0, 0, 0)
  const { data, error } = await supabase
    .from('workout_logs')
    .select('completed_at')
    .eq('client_id', clientId)
    .not('completed_at', 'is', null)
    .gte('completed_at', start.toISOString())
    .lte('completed_at', end.toISOString())
  if (error || !data) {
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(start)
      d.setUTCDate(d.getUTCDate() + i)
      return { date: d.toISOString().slice(0, 10), count: 0 }
    })
  }
  const byDay: Record<string, number> = {}
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setUTCDate(d.getUTCDate() + i)
    byDay[d.toISOString().slice(0, 10)] = 0
  }
  for (const row of data) {
    if (!row.completed_at) continue
    const dateKey = new Date(row.completed_at).toISOString().slice(0, 10)
    if (byDay[dateKey] !== undefined) byDay[dateKey]++
  }
  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))
}

/** Batch sparkline for multiple clients (e.g. coach view). Returns map clientId -> sparkline. */
export async function getSparklineDataBatch(
  clientIds: string[],
  days: number = 7
): Promise<Record<string, { date: string; count: number }[]>> {
  const result: Record<string, { date: string; count: number }[]> = {}
  const emptySeries = (): { date: string; count: number }[] => {
    const end = new Date()
    const start = new Date(end)
    start.setUTCDate(start.getUTCDate() - days + 1)
    start.setUTCHours(0, 0, 0, 0)
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(start)
      d.setUTCDate(d.getUTCDate() + i)
      return { date: d.toISOString().slice(0, 10), count: 0 }
    })
  }
  if (clientIds.length === 0) return result
  const end = new Date()
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - days + 1)
  start.setUTCHours(0, 0, 0, 0)
  const { data, error } = await supabase
    .from('workout_logs')
    .select('client_id, completed_at')
    .in('client_id', clientIds)
    .not('completed_at', 'is', null)
    .gte('completed_at', start.toISOString())
    .lte('completed_at', end.toISOString())
  for (const id of clientIds) result[id] = emptySeries()
  if (error || !data) return result
  const byClientDate: Record<string, Record<string, number>> = {}
  for (const id of clientIds) {
    byClientDate[id] = {}
    result[id].forEach(({ date }) => (byClientDate[id][date] = 0))
  }
  for (const row of data) {
    const id = row.client_id
    if (!byClientDate[id] || !row.completed_at) continue
    const dateKey = new Date(row.completed_at).toISOString().slice(0, 10)
    if (byClientDate[id][dateKey] !== undefined) byClientDate[id][dateKey]++
  }
  for (const id of clientIds) {
    result[id] = result[id].map(({ date }) => ({ date, count: byClientDate[id]?.[date] ?? 0 }))
  }
  return result
}

export { getPeriodBounds }
export type { PeriodKind, PeriodBounds }
