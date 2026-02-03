/**
 * Goals metrics per metric contract.
 * Source: goals (client_id, coach_id, status, completed_date, progress_percentage).
 */

import { supabase } from '../supabase'
import type { PeriodBounds } from './period'

export async function getGoalsAchieved(
  clientIds: string[],
  period?: PeriodBounds
): Promise<number> {
  if (clientIds.length === 0) return 0
  let q = supabase
    .from('goals')
    .select('id', { count: 'exact', head: true })
    .in('client_id', clientIds)
    .eq('status', 'completed')
  if (period) {
    q = q
      .not('completed_date', 'is', null)
      .gte('completed_date', period.start.slice(0, 10))
      .lt('completed_date', period.end.slice(0, 10))
  }
  const { count, error } = await q
  if (error) {
    console.error('[metrics/goals] getGoalsAchieved:', error)
    return 0
  }
  return count ?? 0
}

export async function getTotalGoals(clientIds: string[]): Promise<number> {
  if (clientIds.length === 0) return 0
  const { count, error } = await supabase
    .from('goals')
    .select('*', { count: 'exact', head: true })
    .in('client_id', clientIds)
    .in('status', ['active', 'completed'])
  if (error) return 0
  return count ?? 0
}

export async function getSuccessRate(
  clientIds: string[],
  period?: PeriodBounds
): Promise<{ achieved: number; total: number; ratePercent: number }> {
  const [achieved, total] = await Promise.all([
    getGoalsAchieved(clientIds, period),
    getTotalGoals(clientIds)
  ])
  const ratePercent = total > 0 ? Math.round((achieved / total) * 100) : 0
  return { achieved, total, ratePercent }
}
