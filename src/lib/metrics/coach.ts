/**
 * Coach-scoped metrics (engagement, retention).
 * Source: clients (id, client_id, coach_id, status, created_at).
 */

import { supabase } from '../supabase'
import type { PeriodBounds } from './period'

/** Get coach's client_ids (user UUIDs) for metric queries. */
export async function getCoachClientIds(coachId: string, activeOnly: boolean = true): Promise<string[]> {
  let q = supabase
    .from('clients')
    .select('client_id')
    .eq('coach_id', coachId)
  if (activeOnly) q = q.eq('status', 'active')
  const { data, error } = await q
  if (error || !data) return []
  return data.map((r) => r.client_id)
}

/** Coach's total clients count. */
export async function getTotalClients(coachId: string): Promise<number> {
  const { count, error } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('coach_id', coachId)
    .eq('status', 'active')
  if (error) return 0
  return count ?? 0
}

/** New clients in period (created_at in period). */
export async function getNewClientsInPeriod(coachId: string, period: PeriodBounds): Promise<number> {
  const { count, error } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('coach_id', coachId)
    .gte('created_at', period.start)
    .lt('created_at', period.end)
  if (error) return 0
  return count ?? 0
}

/** Active clients = status = 'active'. Optionally with at least one workout in period. */
export async function getActiveClientsCount(
  coachId: string,
  withActivityInPeriod?: PeriodBounds
): Promise<number> {
  const clientIds = await getCoachClientIds(coachId, true)
  if (clientIds.length === 0) return 0
  if (!withActivityInPeriod) return clientIds.length
  const { data } = await supabase
    .from('workout_logs')
    .select('client_id')
    .in('client_id', clientIds)
    .not('completed_at', 'is', null)
    .gte('completed_at', withActivityInPeriod.start)
    .lt('completed_at', withActivityInPeriod.end)
  const activeInPeriod = new Set((data || []).map((r) => r.client_id))
  return activeInPeriod.size
}
