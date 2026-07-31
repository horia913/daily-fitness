import { normalizeSetType } from '@/lib/setTypeUtils'

/** Canonical set_type values persisted to workout_set_logs (no legacy aliases). */
export const CANONICAL_LOG_SET_TYPES = [
  'straight_set',
  'superset',
  'giant_set',
  'amrap',
  'drop_set',
  'cluster_set',
  'rest_pause',
  'pre_exhaustion',
  'emom',
  'tabata',
  'for_time',
  'speed_work',
  'endurance',
  'timed_set',
] as const

export type CanonicalLogSetType = (typeof CANONICAL_LOG_SET_TYPES)[number]

/**
 * Normalize the incoming set_type / block_type alias once at the API boundary.
 * Returns null when the value cannot be mapped to a supported canonical type.
 */
export function resolveCanonicalLogSetType(
  raw: string | null | undefined,
): CanonicalLogSetType | null {
  if (raw == null || raw === '') return 'straight_set'
  const canonical = normalizeSetType(raw)
  if ((CANONICAL_LOG_SET_TYPES as readonly string[]).includes(canonical)) {
    return canonical as CanonicalLogSetType
  }
  return null
}
