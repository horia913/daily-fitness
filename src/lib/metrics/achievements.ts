/**
 * Achievements metrics per metric contract.
 * Source: user_achievements + achievement_templates (unified).
 */

import { supabase } from '../supabase'
import type { PeriodBounds } from './period'

export interface AchievementItem {
  id: string
  title: string
  achievement_type: string
  achieved_date: string
  tier?: string | null
}

export async function getAchievementsCount(
  clientIds: string[],
  period?: PeriodBounds
): Promise<number> {
  if (clientIds.length === 0) return 0
  let q = supabase
    .from('user_achievements')
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
    .from('user_achievements')
    .select(`
      id,
      achieved_date,
      tier,
      achievement_templates (
        name,
        achievement_type
      )
    `)
    .eq('client_id', clientId)
    .order('achieved_date', { ascending: false })
    .limit(limit)
  if (error || !data) return []
  return (data as any[]).map((r) => ({
    id: r.id,
    title: r.achievement_templates?.name ?? 'Achievement',
    achievement_type: r.achievement_templates?.achievement_type ?? '',
    achieved_date: r.achieved_date,
    tier: r.tier ?? null,
  }))
}
