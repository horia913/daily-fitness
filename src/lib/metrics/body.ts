/**
 * Body composition metrics per metric contract.
 * Source: body_metrics (client_id, weight_kg, body_fat_percentage, measured_date).
 *
 * Current bodyweight ownership: body_metrics is the sole source of truth.
 * Do not read or write profiles.bodyweight for current weight.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase as defaultClient } from '../supabase'

export interface BodyMetricsPoint {
  measured_date: string
  weight_kg: number | null
  body_fat_percentage: number | null
}

/** Latest logged weight for a client (from body_metrics). Null if none. */
export type LatestClientWeight = {
  weightKg: number
  measuredDate: string
}

/**
 * Shared "latest weight for client X" helper.
 * Prefer this over ad-hoc body_metrics queries for current bodyweight.
 * Fallback: returns null when there is no positive weight_kg row (callers show "—" / skip bw-multiples).
 */
export async function getLatestClientWeight(
  clientId: string,
  db: SupabaseClient = defaultClient,
): Promise<LatestClientWeight | null> {
  const { data, error } = await db
    .from('body_metrics')
    .select('weight_kg, measured_date')
    .eq('client_id', clientId)
    .not('weight_kg', 'is', null)
    .order('measured_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  const weightKg = Number(data.weight_kg)
  if (!Number.isFinite(weightKg) || weightKg <= 0) return null
  const measuredDate = String(data.measured_date ?? '').slice(0, 10)
  if (!measuredDate) return null
  return { weightKg, measuredDate }
}

export async function getBodyMetricsHistory(
  clientId: string,
  limit: number = 30,
): Promise<BodyMetricsPoint[]> {
  const { data, error } = await defaultClient
    .from('body_metrics')
    .select('measured_date, weight_kg, body_fat_percentage')
    .eq('client_id', clientId)
    .order('measured_date', { ascending: false })
    .limit(limit)
  if (error || !data) return []
  return data as BodyMetricsPoint[]
}

export async function getCurrentWeight(clientId: string): Promise<number | null> {
  const latest = await getLatestClientWeight(clientId)
  return latest?.weightKg ?? null
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
