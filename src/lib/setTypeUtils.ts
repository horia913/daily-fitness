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
  hr_sets: 'hr_sets',
  speedwork: 'speed_work',
  speed_work: 'speed_work',
  endurance: 'endurance',
};

/** Human-readable labels for UI (coach + client) */
export const SET_TYPE_DISPLAY: Record<string, string> = {
  straight_set: 'Straight Set',
  superset: 'Superset',
  giant_set: 'Giant Set',
  drop_set: 'Drop Set',
  cluster_set: 'Cluster Set',
  rest_pause: 'Rest-Pause',
  pre_exhaustion: 'Pre-Exhaustion',
  amrap: 'AMRAP',
  emom: 'EMOM',
  tabata: 'Tabata',
  for_time: 'For Time',
  hr_sets: 'HR Sets',
  speed_work: 'Speed Work',
  endurance: 'Endurance',
};

/**
 * Short icon hints for set types (emoji). Specialized UIs may use Lucide instead.
 */
export const SET_TYPE_ICON: Record<string, string> = {
  speed_work: '⚡',
  endurance: '🏃',
};

/**
 * Returns the canonical set_type (underscore form). Unknown types are returned as-is.
 */
export function normalizeSetType(type: string | null | undefined): string {
  if (type == null || type === '') return type ?? '';
  return SET_TYPE_MAP[type] ?? type;
}

export function getSetTypeDisplayLabel(type: string | null | undefined): string {
  if (type == null || type === '') return '';
  const c = normalizeSetType(type);
  return SET_TYPE_DISPLAY[c] ?? SET_TYPE_DISPLAY[type] ?? type;
}
