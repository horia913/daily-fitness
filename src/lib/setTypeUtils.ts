/**
 * Normalize set_type values so template (e.g. drop_set) and logs (e.g. dropset) both work.
 * Canonical form uses underscores to match workout_set_entries.set_type.
 */
const SET_TYPE_MAP: Record<string, string> = {
  dropset: 'drop_set',
  straight_set: 'straight_set',
  cluster_set: 'cluster_set',
  rest_pause: 'rest_pause',
  superset: 'superset',
  giant_set: 'giant_set',
  pre_exhaustion: 'pre_exhaustion',
  preexhaust: 'pre_exhaustion',
  amrap: 'amrap',
  emom: 'emom',
  for_time: 'for_time',
  fortime: 'for_time',
  tabata: 'tabata',
  circuit: 'circuit',
  pyramid_set: 'pyramid_set',
  ladder: 'ladder',
  hr_sets: 'hr_sets',
};

/**
 * Returns the canonical set_type (underscore form). Unknown types are returned as-is.
 */
export function normalizeSetType(type: string | null | undefined): string {
  if (type == null || type === '') return type ?? '';
  return SET_TYPE_MAP[type] ?? type;
}
