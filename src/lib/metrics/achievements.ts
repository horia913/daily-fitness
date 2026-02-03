/**
 * Achievements metrics per metric contract.
 * Source: achievements (client_id, title, achievement_type, achieved_date).
 */

import { supabase } from '../supabase'
import type { PeriodBounds } from './period'

export interface AchievementItem {
  id: string
  title: string
  achievement_type: string
  achieved_date: string
}

export async function getAchievementsCount(
  clientIds: string[],
  period?: PeriodBounds
): Promise<number> {
  if (clientIds.length === 0) return 0
  let q = supabase
    .from('achievements')
    .select('id', { count: 'exact', head: true })
    .in('client_id', clientIds)
  if (period) {
    q = q
      .gte('achieved_date', period.start.slice(0, 10))
      .lt('achieved_date', period.end.slice(0, 10))
  }
  const { count, error } = await q
  if (error) return 0
  return count ?? 0
}

export async function getAchievementsList(
  clientId: string,
  limit: number = 50
): Promise<AchievementItem[]> {
  const { data, error } = await supabase
    .from('achievements')
    .select('id, title, achievement_type, achieved_date')
    .eq('client_id', clientId)
    .order('achieved_date', { ascending: false })
    .limit(limit)
  if (error || !data) return []
  return data as AchievementItem[]
}
