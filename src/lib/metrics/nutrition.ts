/**
 * Nutrition metrics per metric contract.
 * Source: meal_completions (client_id, completed_at).
 */

import { supabase } from '../supabase'
import type { PeriodBounds } from './period'
import { getDaysInPeriod } from './period'

export async function getTotalMeals(
  clientIds: string[],
  period: PeriodBounds
): Promise<number> {
  if (clientIds.length === 0) return 0
  const { count, error } = await supabase
    .from('meal_completions')
    .select('*', { count: 'exact', head: true })
    .in('client_id', clientIds)
    .gte('completed_at', period.start)
    .lt('completed_at', period.end)
  if (error) {
    console.error('[metrics/nutrition] getTotalMeals:', error)
    return 0
  }
  return count ?? 0
}

/**
 * Nutrition compliance = (days with at least one meal completion in period) / (days in period).
 * Returns 0–100.
 */
export async function getNutritionCompliance(
  clientId: string,
  period: PeriodBounds,
  periodKind: 'this_week' | 'this_month' | 'last_7_days' | 'last_4_weeks'
): Promise<{ ratePercent: number; daysWithMeals: number; daysInPeriod: number }> {
  const { data, error } = await supabase
    .from('meal_completions')
    .select('completed_at')
    .eq('client_id', clientId)
    .gte('completed_at', period.start)
    .lt('completed_at', period.end)
  if (error || !data) {
    const daysInPeriod = getDaysInPeriod(periodKind)
    return { ratePercent: 0, daysWithMeals: 0, daysInPeriod }
  }
  const uniqueDays = new Set(data.map((r) => new Date(r.completed_at).toISOString().slice(0, 10)))
  const daysInPeriod = getDaysInPeriod(periodKind)
  const ratePercent = daysInPeriod > 0 ? Math.round((uniqueDays.size / daysInPeriod) * 100) : 0
  return { ratePercent, daysWithMeals: uniqueDays.size, daysInPeriod }
}
