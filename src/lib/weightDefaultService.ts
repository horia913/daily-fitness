/**
 * Weight default and suggestion service.
 * Enforces: at most ONE of default_weight or suggested_weight is non-null.
 * default_weight !== null => suggested_weight === null (no suggestion chip when default is set).
 */

export type WeightSource =
  | 'sticky_session'
  | 'last_session'
  | 'percent_e1rm'
  | 'none'

export interface GetWeightDefaultAndSuggestionParams {
  /** Session-level last performed weight for this exercise (from lastPerformedWeightByExerciseId[exerciseId]) */
  sessionStickyWeight: number | null
  /** Earliest set weight in most recent completed session for this user+exercise */
  lastSessionWeight: number | null
  /** Coach load percentage (e.g. 70 for 70% of e1RM) */
  loadPercentage: number | null | undefined
  /** e1RM for this exercise from user_exercise_metrics */
  e1rm: number | null | undefined
}

export interface GetWeightDefaultAndSuggestionResult {
  /** Truth-based value to autofill; when set, suggested_weight is null and UI must NOT show suggestion chip */
  default_weight: number | null
  /** Tap-to-apply only; shown only when default_weight is null */
  suggested_weight: number | null
  source: WeightSource
  explanation: string
}

/**
 * Returns default weight (truth-based autofill) and/or suggested weight (tap-to-apply only).
 * Guarantee: default_weight !== null => suggested_weight === null.
 * Priority: sticky_session > last_session > percent_e1rm (suggestion only) > none.
 */
export function getWeightDefaultAndSuggestion(
  params: GetWeightDefaultAndSuggestionParams
): GetWeightDefaultAndSuggestionResult {
  const {
    sessionStickyWeight,
    lastSessionWeight,
    loadPercentage,
    e1rm,
  } = params

  // 1) Same-session sticky (session-level map)
  if (sessionStickyWeight != null && sessionStickyWeight > 0) {
    return {
      default_weight: sessionStickyWeight,
      suggested_weight: null,
      source: 'sticky_session',
      explanation: `Last set this session: ${sessionStickyWeight}kg`,
    }
  }

  // 2) Last-session (earliest set in most recent session)
  if (lastSessionWeight != null && lastSessionWeight > 0) {
    return {
      default_weight: lastSessionWeight,
      suggested_weight: null,
      source: 'last_session',
      explanation: 'Last workout weight',
    }
  }

  // 3) Coach % — suggestion only, no autofill
  if (
    loadPercentage != null &&
    loadPercentage > 0 &&
    e1rm != null &&
    e1rm > 0
  ) {
    const suggested = Math.round((e1rm * (loadPercentage / 100)) * 2) / 2
    return {
      default_weight: null,
      suggested_weight: suggested,
      source: 'percent_e1rm',
      explanation: `${loadPercentage}% of e1RM`,
    }
  }

  // 4) No data
  return {
    default_weight: null,
    suggested_weight: null,
    source: 'none',
    explanation: 'No previous data or prescription',
  }
}

/** Extract performed weight from a set log row for a given exercise (handles straight_set, superset, dropset, rest_pause, etc.) */
function getWeightFromSetLog(
  row: {
    exercise_id?: string | null
    weight?: number | null
    superset_exercise_a_id?: string | null
    superset_exercise_b_id?: string | null
    superset_weight_a?: number | null
    superset_weight_b?: number | null
    dropset_initial_weight?: number | null
    rest_pause_initial_weight?: number | null
    block_type?: string | null
  },
  exerciseId: string
): number | null {
  if (row.exercise_id === exerciseId && row.weight != null && row.weight > 0) {
    return row.weight
  }
  if (row.superset_exercise_a_id === exerciseId && row.superset_weight_a != null && row.superset_weight_a > 0) {
    return row.superset_weight_a
  }
  if (row.superset_exercise_b_id === exerciseId && row.superset_weight_b != null && row.superset_weight_b > 0) {
    return row.superset_weight_b
  }
  if (row.exercise_id === exerciseId && row.dropset_initial_weight != null && row.dropset_initial_weight > 0) {
    return row.dropset_initial_weight
  }
  if (row.exercise_id === exerciseId && row.rest_pause_initial_weight != null && row.rest_pause_initial_weight > 0) {
    return row.rest_pause_initial_weight
  }
  return null
}

/**
 * Fetch the weight from the earliest set (by set_number, then created_at) in the most recent
 * completed workout/session that contains logs for this user + exercise.
 * Used as last-session default only; never for e1RM.
 */
export async function fetchLastSessionWeightForExercise(
  supabase: any,
  userId: string,
  exerciseId: string
): Promise<number | null> {
  try {
    const { data: rows, error } = await supabase
      .from('workout_set_logs')
      .select(
        'set_number, created_at, weight, exercise_id, superset_exercise_a_id, superset_exercise_b_id, superset_weight_a, superset_weight_b, dropset_initial_weight, rest_pause_initial_weight, block_type, workout_logs!inner(completed_at, client_id)'
      )
      .eq('workout_logs.client_id', userId)
      .not('workout_logs.completed_at', 'is', null)
      .or(`exercise_id.eq.${exerciseId},superset_exercise_a_id.eq.${exerciseId},superset_exercise_b_id.eq.${exerciseId}`)
      .limit(200)

    if (error || !rows?.length) return null

    type Row = (typeof rows)[0] & { workout_logs?: { completed_at: string } }
    const withCompletedAt = rows as Row[]
    withCompletedAt.sort((a, b) => {
      const atA = a.workout_logs?.completed_at ? new Date(a.workout_logs.completed_at).getTime() : 0
      const atB = b.workout_logs?.completed_at ? new Date(b.workout_logs.completed_at).getTime() : 0
      if (atB !== atA) return atB - atA
      const setA = a.set_number ?? 999999
      const setB = b.set_number ?? 999999
      if (setA !== setB) return setA - setB
      const createdA = a.created_at ? new Date(a.created_at).getTime() : 0
      const createdB = b.created_at ? new Date(b.created_at).getTime() : 0
      return createdA - createdB
    })

    const first = withCompletedAt[0]
    const weight = getWeightFromSetLog(first, exerciseId)
    return weight != null ? weight : null
  } catch {
    return null
  }
}
