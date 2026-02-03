/**
 * Habit metrics per metric contract.
 * Source: habit_logs (client_id, log_date, completed_at).
 */

import { supabase } from '../supabase'
import type { PeriodBounds } from './period'
import { getDaysInPeriod } from './period'

export async function getHabitCompletionsCount(
  clientIds: string[],
  period: PeriodBounds
): Promise<number> {
  if (clientIds.length === 0) return 0
  const periodStart = period.start.slice(0, 10)
  const periodEnd = period.end.slice(0, 10)
  const { data, error } = await supabase
    .from('habit_logs')
    .select('id')
    .in('client_id', clientIds)
    .gte('log_date', periodStart)
    .lt('log_date', periodEnd)
  if (error) {
    console.error('[metrics/habit] getHabitCompletionsCount:', error)
    return 0
  }
  return data?.length ?? 0
}

/**
 * Habit compliance = (days with at least one habit completion in period) / (days in period).
 * Returns 0–100.
 */
export async function getHabitCompliance(
  clientId: string,
  period: PeriodBounds,
  periodKind: 'this_week' | 'this_month' | 'last_7_days' | 'last_4_weeks'
): Promise<{ ratePercent: number; daysWithHabits: number; daysInPeriod: number }> {
  const periodStart = period.start.slice(0, 10)
  const periodEnd = period.end.slice(0, 10)
  const { data, error } = await supabase
    .from('habit_logs')
    .select('log_date')
    .eq('client_id', clientId)
    .gte('log_date', periodStart)
    .lt('log_date', periodEnd)
  if (error || !data) {
    const daysInPeriod = getDaysInPeriod(periodKind)
    return { ratePercent: 0, daysWithHabits: 0, daysInPeriod }
  }
  const uniqueDays = new Set(data.map((r) => r.log_date))
  const daysInPeriod = getDaysInPeriod(periodKind)
  const ratePercent = daysInPeriod > 0 ? Math.round((uniqueDays.size / daysInPeriod) * 100) : 0
  return { ratePercent, daysWithHabits: uniqueDays.size, daysInPeriod }
}
