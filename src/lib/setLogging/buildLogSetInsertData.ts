import type { CanonicalLogSetType } from './resolveLogSetType'

export type LogSetBody = Record<string, unknown>

export type LogSetInsertBuildResult =
  | {
      ok: true
      insertData: Record<string, unknown>
      primaryExerciseId: string | null
      primaryWeight: number | null
      primaryReps: number | null
    }
  | {
      ok: false
      error: string
      details?: unknown
    }

const parseNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  const num = typeof value === 'number' ? value : parseFloat(String(value))
  return isNaN(num) ? null : num
}

const parseIntNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  const num = typeof value === 'number' ? value : parseInt(String(value), 10)
  return isNaN(num) ? null : num
}

/**
 * Build workout_set_logs insert fields for a canonical set_type.
 * Callers must set client_id, set_entry_id, workout_log_id, set_type, completed_at first.
 */
export function buildLogSetInsertData(
  body: LogSetBody,
  blockType: CanonicalLogSetType,
  baseInsertData: Record<string, unknown>,
): LogSetInsertBuildResult {
  const insertData: Record<string, unknown> = { ...baseInsertData }
  let primaryExerciseId: string | null = null
  let primaryWeight: number | null = null
  let primaryReps: number | null = null

  switch (blockType) {
    case 'straight_set': {
      const exerciseId = body.exercise_id as string | undefined
      const weightNum = parseNumber(body.weight)
      const repsNum = parseIntNumber(body.reps)

      if (!exerciseId || !weightNum || !repsNum) {
        return {
          ok: false,
          error: 'Missing required fields for straight_set: exercise_id, weight, reps',
          details: {
            exercise_id: exerciseId || 'missing',
            weight: weightNum !== null ? weightNum : 'missing or invalid',
            reps: repsNum !== null ? repsNum : 'missing or invalid',
          },
        }
      }

      insertData.exercise_id = exerciseId
      insertData.weight = weightNum
      insertData.reps = repsNum
      insertData.set_number = body.set_number || 1
      primaryExerciseId = exerciseId
      primaryWeight = weightNum
      primaryReps = repsNum
      break
    }

    case 'superset': {
      insertData.set_number = body.set_number || 1
      insertData.superset_exercise_a_id = body.superset_exercise_a_id
      insertData.superset_weight_a = parseNumber(body.superset_weight_a)
      insertData.superset_reps_a = parseIntNumber(body.superset_reps_a)
      insertData.superset_exercise_b_id = body.superset_exercise_b_id
      insertData.superset_weight_b = parseNumber(body.superset_weight_b)
      insertData.superset_reps_b = parseIntNumber(body.superset_reps_b)
      primaryExerciseId =
        typeof body.superset_exercise_a_id === 'string' ? body.superset_exercise_a_id : null
      primaryWeight = parseNumber(body.superset_weight_a)
      primaryReps = parseIntNumber(body.superset_reps_a)
      break
    }

    case 'giant_set': {
      insertData.round_number = body.round_number || 1
      insertData.giant_set_exercises = body.giant_set_exercises || null
      break
    }

    case 'amrap': {
      if (body.exercise_id) insertData.exercise_id = body.exercise_id
      insertData.amrap_total_reps = parseIntNumber(body.amrap_total_reps)
      insertData.amrap_duration_seconds = parseIntNumber(body.amrap_duration_seconds)
      insertData.amrap_target_reps = parseIntNumber(body.amrap_target_reps) || null
      break
    }

    case 'drop_set': {
      insertData.set_number = body.set_number || 1
      const dropsArray = Array.isArray(body.dropset_drops) ? body.dropset_drops : null
      if (dropsArray && dropsArray.length >= 2) {
        const first = dropsArray[0] as { weight?: number; reps?: number }
        const last = dropsArray[dropsArray.length - 1] as { weight?: number; reps?: number }
        insertData.dropset_initial_weight = parseNumber(first?.weight)
        insertData.dropset_initial_reps = parseIntNumber(first?.reps)
        insertData.dropset_final_weight = parseNumber(last?.weight)
        insertData.dropset_final_reps = parseIntNumber(last?.reps)
        insertData.dropset_percentage =
          insertData.dropset_initial_weight && insertData.dropset_final_weight
            ? ((Number(insertData.dropset_initial_weight) -
                Number(insertData.dropset_final_weight)) /
                Number(insertData.dropset_initial_weight)) *
              100
            : null
      } else {
        insertData.dropset_initial_weight = parseNumber(body.dropset_initial_weight)
        insertData.dropset_initial_reps = parseIntNumber(body.dropset_initial_reps)
        insertData.dropset_final_weight = parseNumber(body.dropset_final_weight)
        insertData.dropset_final_reps = parseIntNumber(body.dropset_final_reps)
        insertData.dropset_percentage = parseNumber(body.dropset_percentage)
      }

      primaryExerciseId = (body.exercise_id as string | undefined) || null
      primaryWeight = parseNumber(insertData.dropset_initial_weight)
      primaryReps = parseIntNumber(insertData.dropset_initial_reps)
      if (body.exercise_id) insertData.exercise_id = body.exercise_id
      if (
        primaryWeight !== null &&
        primaryReps !== null &&
        primaryWeight > 0 &&
        primaryReps > 0
      ) {
        insertData.weight = primaryWeight
        insertData.reps = primaryReps
      }
      break
    }

    case 'cluster_set': {
      const exerciseId = body.exercise_id as string | undefined
      const weightNum = parseNumber(body.weight)
      const repsNum = parseIntNumber(body.reps)
      insertData.exercise_id = exerciseId
      insertData.weight = weightNum
      insertData.reps = repsNum
      insertData.set_number = body.set_number || 1
      insertData.cluster_number = body.cluster_number || 1
      primaryExerciseId = exerciseId || null
      primaryWeight = weightNum
      primaryReps = repsNum
      break
    }

    case 'rest_pause': {
      const exerciseId = body.exercise_id as string | undefined
      insertData.exercise_id = exerciseId
      insertData.rest_pause_initial_weight = parseNumber(body.rest_pause_initial_weight)
      insertData.rest_pause_initial_reps = parseIntNumber(body.rest_pause_initial_reps)
      insertData.rest_pause_reps_after = parseIntNumber(body.rest_pause_reps_after)
      insertData.rest_pause_number = body.rest_pause_number || 1
      insertData.set_number = body.set_number || 1
      insertData.rest_pause_duration = parseIntNumber(body.rest_pause_duration)
      insertData.max_rest_pauses = parseIntNumber(body.max_rest_pauses)
      primaryExerciseId = exerciseId || null
      primaryWeight = parseNumber(body.rest_pause_initial_weight)
      primaryReps = parseIntNumber(body.rest_pause_initial_reps)
      break
    }

    case 'pre_exhaustion': {
      insertData.set_number = body.set_number || 1
      insertData.preexhaust_isolation_exercise_id = body.preexhaust_isolation_exercise_id
      insertData.preexhaust_isolation_weight = parseNumber(body.preexhaust_isolation_weight)
      insertData.preexhaust_isolation_reps = parseIntNumber(body.preexhaust_isolation_reps)
      insertData.preexhaust_compound_exercise_id = body.preexhaust_compound_exercise_id
      insertData.preexhaust_compound_weight = parseNumber(body.preexhaust_compound_weight)
      insertData.preexhaust_compound_reps = parseIntNumber(body.preexhaust_compound_reps)
      break
    }

    case 'emom': {
      if (body.exercise_id) insertData.exercise_id = body.exercise_id
      insertData.emom_minute_number = body.emom_minute_number
      insertData.emom_total_reps_this_min = parseIntNumber(body.emom_total_reps_this_min)
      insertData.emom_total_duration_sec = parseIntNumber(body.emom_total_duration_sec)
      break
    }

    case 'tabata': {
      if (body.exercise_id) insertData.exercise_id = body.exercise_id
      insertData.tabata_rounds_completed = parseIntNumber(body.tabata_rounds_completed)
      insertData.tabata_total_duration_sec = parseIntNumber(body.tabata_total_duration_sec)
      break
    }

    case 'for_time': {
      if (body.exercise_id) insertData.exercise_id = body.exercise_id
      insertData.fortime_total_reps = parseIntNumber(body.fortime_total_reps)
      insertData.fortime_time_taken_sec = parseIntNumber(body.fortime_time_taken_sec)
      insertData.fortime_time_cap_sec = parseIntNumber(body.fortime_time_cap_sec)
      insertData.fortime_target_reps = parseIntNumber(body.fortime_target_reps) || null
      break
    }

    case 'speed_work': {
      const exerciseId = body.exercise_id as string | undefined
      const timeSec = parseIntNumber(body.actual_time_seconds)
      if (!exerciseId || timeSec === null || timeSec <= 0) {
        return {
          ok: false,
          error: 'Missing required fields for speed_work: exercise_id, actual_time_seconds',
          details: { exercise_id: exerciseId || 'missing', actual_time_seconds: timeSec },
        }
      }
      insertData.exercise_id = exerciseId
      insertData.set_number = body.set_number ?? 1
      insertData.actual_time_seconds = timeSec
      insertData.actual_distance_meters = parseNumber(body.actual_distance_meters)
      insertData.actual_hr_avg = parseNumber(body.actual_hr_avg)
      insertData.actual_speed_kmh = parseNumber(body.actual_speed_kmh)
      primaryExerciseId = exerciseId
      break
    }

    case 'endurance': {
      const exerciseId = body.exercise_id as string | undefined
      const distM = parseNumber(body.actual_distance_meters)
      const timeSec = parseIntNumber(body.actual_time_seconds)
      if (!exerciseId || distM === null || distM <= 0 || timeSec === null || timeSec <= 0) {
        return {
          ok: false,
          error:
            'Missing required fields for endurance: exercise_id, actual_distance_meters, actual_time_seconds',
          details: {
            exercise_id: exerciseId || 'missing',
            actual_distance_meters: distM,
            actual_time_seconds: timeSec,
          },
        }
      }
      insertData.exercise_id = exerciseId
      insertData.set_number = body.set_number ?? 1
      insertData.actual_distance_meters = distM
      insertData.actual_time_seconds = timeSec
      insertData.actual_hr_avg = parseNumber(body.actual_hr_avg)
      insertData.actual_speed_kmh = parseNumber(body.actual_speed_kmh)
      primaryExerciseId = exerciseId
      break
    }

    case 'timed_set': {
      const exerciseId = body.exercise_id as string | undefined
      const durationSec = parseIntNumber(body.actual_duration_seconds)
      if (!exerciseId || durationSec === null || durationSec <= 0) {
        return {
          ok: false,
          error: 'Missing required fields for timed_set: exercise_id, actual_duration_seconds',
          details: {
            exercise_id: exerciseId || 'missing',
            actual_duration_seconds: durationSec,
          },
        }
      }
      insertData.exercise_id = exerciseId
      insertData.set_number = body.set_number ?? 1
      insertData.actual_duration_seconds = durationSec
      primaryExerciseId = exerciseId
      break
    }

    default: {
      const _exhaustive: never = blockType
      return { ok: false, error: `Unhandled set_type: ${_exhaustive}` }
    }
  }

  return {
    ok: true,
    insertData,
    primaryExerciseId,
    primaryWeight,
    primaryReps,
  }
}
