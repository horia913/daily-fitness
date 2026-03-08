/**
 * Build PATCH payload for /api/sets/[id] — edit set log.
 * Single source of truth: only whitelisted keys per set_type, no undefined values.
 * Mirrors server whitelist in src/app/api/sets/[id]/route.ts.
 * App set_type (e.g. drop_set, pre_exhaustion, for_time) is normalized to API names.
 */
const BLOCK_TYPE_TO_API: Record<string, string> = {
  drop_set: 'dropset',
  pre_exhaustion: 'preexhaust',
  for_time: 'fortime',
};

const WHITELIST: Record<string, Set<string>> = {
  straight_set: new Set(['weight', 'reps', 'set_number', 'rpe']),
  superset: new Set([
    'set_number',
    'superset_exercise_a_id',
    'superset_weight_a',
    'superset_reps_a',
    'superset_exercise_b_id',
    'superset_weight_b',
    'superset_reps_b',
    'rpe',
  ]),
  giant_set: new Set(['round_number', 'giant_set_exercises', 'rpe']),
  amrap: new Set(['exercise_id', 'weight', 'amrap_total_reps', 'amrap_duration_seconds', 'amrap_target_reps', 'rpe']),
  dropset: new Set([
    'set_number',
    'dropset_initial_weight',
    'dropset_initial_reps',
    'dropset_final_weight',
    'dropset_final_reps',
    'dropset_percentage',
    'exercise_id',
    'rpe',
  ]),
  cluster_set: new Set(['exercise_id', 'weight', 'reps', 'set_number', 'cluster_number', 'rpe']),
  rest_pause: new Set([
    'exercise_id',
    'rest_pause_initial_weight',
    'rest_pause_initial_reps',
    'rest_pause_reps_after',
    'rest_pause_number',
    'set_number',
    'rest_pause_duration',
    'max_rest_pauses',
    'rpe',
  ]),
  preexhaust: new Set([
    'set_number',
    'preexhaust_isolation_exercise_id',
    'preexhaust_isolation_weight',
    'preexhaust_isolation_reps',
    'preexhaust_compound_exercise_id',
    'preexhaust_compound_weight',
    'preexhaust_compound_reps',
    'rpe',
  ]),
  emom: new Set(['exercise_id', 'weight', 'emom_minute_number', 'emom_total_reps_this_min', 'emom_total_duration_sec', 'rpe']),
  tabata: new Set(['exercise_id', 'tabata_rounds_completed', 'tabata_total_duration_sec', 'rpe']),
  fortime: new Set([
    'exercise_id',
    'weight',
    'fortime_total_reps',
    'fortime_time_taken_sec',
    'fortime_time_cap_sec',
    'fortime_target_reps',
    'rpe',
  ]),
  hr_sets: new Set(['rpe']),
}

/**
 * Build PATCH body for editing a set log. Returns only whitelisted keys for the block type;
 * strips undefined. editDraft should use server API key names (e.g. superset_weight_a not weightA).
 */
export function buildSetEditPatchPayload(
  blockType: string,
  editDraft: Record<string, unknown>
): Record<string, unknown> {
  const apiBlockType = BLOCK_TYPE_TO_API[blockType] ?? blockType
  const allowed = WHITELIST[apiBlockType] ?? WHITELIST.hr_sets
  const payload: Record<string, unknown> = {}
  for (const key of Object.keys(editDraft)) {
    if (!allowed.has(key)) continue
    const val = editDraft[key]
    if (val === undefined) continue
    payload[key] = val
  }
  return payload
}
