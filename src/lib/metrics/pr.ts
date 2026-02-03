/**
 * Personal records count per metric contract.
 * Source: personal_records (client_id, exercise_id, record_type, record_value, achieved_date).
 */

import { supabase } from '../supabase'
import type { PeriodBounds } from './period'

export async function getPersonalRecordsCount(
  clientIds: string[],
  period?: PeriodBounds
): Promise<number> {
  if (clientIds.length === 0) return 0
  let q = supabase
    .from('personal_records')
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
