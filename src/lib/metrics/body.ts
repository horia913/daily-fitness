/**
 * Body composition metrics per metric contract.
 * Source: body_metrics (client_id, weight_kg, body_fat_percentage, measured_date).
 */

import { supabase } from '../supabase'

export interface BodyMetricsPoint {
  measured_date: string
  weight_kg: number | null
  body_fat_percentage: number | null
}

export async function getBodyMetricsHistory(
  clientId: string,
  limit: number = 30
): Promise<BodyMetricsPoint[]> {
  const { data, error } = await supabase
    .from('body_metrics')
    .select('measured_date, weight_kg, body_fat_percentage')
    .eq('client_id', clientId)
    .order('measured_date', { ascending: false })
    .limit(limit)
  if (error || !data) return []
  return data as BodyMetricsPoint[]
}

export async function getCurrentWeight(clientId: string): Promise<number | null> {
  const history = await getBodyMetricsHistory(clientId, 1)
  return history.length > 0 ? (history[0].weight_kg ?? null) : null
}

export async function getWeightChange(clientId: string): Promise<number> {
  const history = await getBodyMetricsHistory(clientId, 2)
  if (history.length < 2) return 0
  const cur = history[0].weight_kg
  const prev = history[1].weight_kg
  if (cur == null || prev == null) return 0
  return Math.round((cur - prev) * 10) / 10
}

export async function getCurrentBodyFat(clientId: string): Promise<number | null> {
  const history = await getBodyMetricsHistory(clientId, 1)
  return history.length > 0 ? (history[0].body_fat_percentage ?? null) : null
}
