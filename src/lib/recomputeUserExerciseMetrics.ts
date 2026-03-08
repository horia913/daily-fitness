/**
 * Recompute user_exercise_metrics for given user and exercises from all remaining
 * workout_set_logs. Used after set edit/delete so e1RM and best_* stay correct.
 *
 * Invariant: If there are zero remaining set logs for (user_id, exercise_id),
 * we DELETE the user_exercise_metrics row (do not leave null/zeroed row).
 */

import type { SupabaseClient } from '@supabase/supabase-js'

type Row = Record<string, unknown>

function parseNum(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const n = typeof value === 'number' ? value : parseFloat(String(value))
  return isNaN(n) ? null : n
}

function parseIntNum(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const n = typeof value === 'number' ? value : parseInt(String(value), 10)
  return isNaN(n) ? null : n
}

/** Extract (weight, reps) for a given exercise from a set log row by set_type */
function getWeightRepsForExercise(row: Row, exerciseId: string): { weight: number; reps: number } | null {
  const blockType = row.set_type as string
  const w = parseNum(row.weight)
  const r = parseIntNum(row.reps)

  switch (blockType) {
    case 'straight_set':
      return row.exercise_id === exerciseId && w != null && r != null && w > 0 && r > 0
        ? { weight: w, reps: r }
        : null
    case 'superset':
      if (row.superset_exercise_a_id === exerciseId) {
        const wa = parseNum(row.superset_weight_a)
        const ra = parseIntNum(row.superset_reps_a)
        return wa != null && ra != null && wa > 0 && ra > 0 ? { weight: wa, reps: ra } : null
      }
      if (row.superset_exercise_b_id === exerciseId) {
        const wb = parseNum(row.superset_weight_b)
        const rb = parseIntNum(row.superset_reps_b)
        return wb != null && rb != null && wb > 0 && rb > 0 ? { weight: wb, reps: rb } : null
      }
      return null
    case 'giant_set': {
      const arr = row.giant_set_exercises as Array<{ exercise_id?: string; weight?: unknown; reps?: unknown }> | null
      if (!Array.isArray(arr)) return null
      const el = arr.find((e) => e?.exercise_id === exerciseId)
      if (!el) return null
      const ew = parseNum(el.weight)
      const er = parseIntNum(el.reps)
      return ew != null && er != null && ew > 0 && er > 0 ? { weight: ew, reps: er } : null
    }
    case 'dropset':
      return row.exercise_id === exerciseId
        ? (() => {
            const wi = parseNum(row.dropset_initial_weight)
            const ri = parseIntNum(row.dropset_initial_reps)
            return wi != null && ri != null && wi > 0 && ri > 0 ? { weight: wi, reps: ri } : null
          })()
        : null
    case 'cluster_set':
      return row.exercise_id === exerciseId && w != null && r != null && w > 0 && r > 0
        ? { weight: w, reps: r }
        : null
    case 'rest_pause':
      return row.exercise_id === exerciseId
        ? (() => {
            const wi = parseNum(row.rest_pause_initial_weight)
            const ri = parseIntNum(row.rest_pause_initial_reps)
            return wi != null && ri != null && wi > 0 && ri > 0 ? { weight: wi, reps: ri } : null
          })()
        : null
    case 'preexhaust':
      if (row.preexhaust_isolation_exercise_id === exerciseId) {
        const wi = parseNum(row.preexhaust_isolation_weight)
        const ri = parseIntNum(row.preexhaust_isolation_reps)
        return wi != null && ri != null && wi > 0 && ri > 0 ? { weight: wi, reps: ri } : null
      }
      if (row.preexhaust_compound_exercise_id === exerciseId) {
        const wc = parseNum(row.preexhaust_compound_weight)
        const rc = parseIntNum(row.preexhaust_compound_reps)
        return wc != null && rc != null && wc > 0 && rc > 0 ? { weight: wc, reps: rc } : null
      }
      return null
    case 'amrap':
      if (row.exercise_id !== exerciseId) return null
      const ar = parseIntNum(row.amrap_total_reps)
      return w != null && ar != null && w > 0 && ar > 0 ? { weight: w, reps: ar } : null
    case 'emom':
      if (row.exercise_id !== exerciseId) return null
      const er = parseIntNum(row.emom_total_reps_this_min)
      return w != null && er != null && w > 0 && er > 0 ? { weight: w, reps: er } : null
    case 'fortime':
      if (row.exercise_id !== exerciseId) return null
      const fr = parseIntNum(row.fortime_total_reps) ?? parseIntNum(row.fortime_target_reps)
      return w != null && fr != null && w > 0 && fr > 0 ? { weight: w, reps: fr } : null
    default:
      return null
  }
}

/** Epley: e1RM = weight * (1 + 0.0333 * reps) */
function epleyE1RM(weight: number, reps: number): number {
  return weight * (1 + 0.0333 * reps)
}

/** Rows that might contribute to an exercise: direct exercise_id or superset/preexhaust columns */
function rowContributesToExercise(row: Row, exerciseId: string): boolean {
  if (row.exercise_id === exerciseId) return true
  if (row.superset_exercise_a_id === exerciseId || row.superset_exercise_b_id === exerciseId) return true
  if (row.preexhaust_isolation_exercise_id === exerciseId || row.preexhaust_compound_exercise_id === exerciseId)
    return true
  if (row.set_type === 'giant_set' && Array.isArray(row.giant_set_exercises)) {
    const arr = row.giant_set_exercises as Array<{ exercise_id?: string }>
    return arr.some((e) => e?.exercise_id === exerciseId)
  }
  return false
}

export async function recomputeUserExerciseMetrics(
  userId: string,
  exerciseIds: string[],
  supabaseAdmin: SupabaseClient
): Promise<void> {
  if (exerciseIds.length === 0) return

  const uniq = [...new Set(exerciseIds)]

  for (const exerciseId of uniq) {
    // Fetch all set logs for this user that might contribute to this exercise
    const orParts = [
      `exercise_id.eq.${exerciseId}`,
      `superset_exercise_a_id.eq.${exerciseId}`,
      `superset_exercise_b_id.eq.${exerciseId}`,
      `preexhaust_isolation_exercise_id.eq.${exerciseId}`,
      `preexhaust_compound_exercise_id.eq.${exerciseId}`,
    ].join(',')

    const { data: directRows, error: directErr } = await supabaseAdmin
      .from('workout_set_logs')
      .select('*')
      .eq('client_id', userId)
      .or(orParts)

    if (directErr) {
      console.error('[recomputeUserExerciseMetrics] direct query error:', directErr)
      continue
    }

    const { data: giantRows, error: giantErr } = await supabaseAdmin
      .from('workout_set_logs')
      .select('*')
      .eq('client_id', userId)
      .eq('set_type', 'giant_set')
      .not('giant_set_exercises', 'is', null)

    if (giantErr) {
      console.error('[recomputeUserExerciseMetrics] giant_set query error:', giantErr)
    }

    const allRows = [...(directRows || []), ...(giantRows || [])].filter((r) =>
      rowContributesToExercise(r as Row, exerciseId)
    )

    const entries: { weight: number; reps: number }[] = []
    for (const row of allRows) {
      const wr = getWeightRepsForExercise(row as Row, exerciseId)
      if (wr) entries.push(wr)
    }

    if (entries.length === 0) {
      const { error: delErr } = await supabaseAdmin
        .from('user_exercise_metrics')
        .delete()
        .eq('user_id', userId)
        .eq('exercise_id', exerciseId)
      if (delErr) console.error('[recomputeUserExerciseMetrics] delete row error:', delErr)
      continue
    }

    let bestWeight: number | null = null
    let bestReps: number | null = null
    let bestVolume: number | null = null
    let bestVolumeWeight: number | null = null
    let bestVolumeReps: number | null = null
    let bestE1RM = 0

    for (const e of entries) {
      const volume = e.weight * e.reps
      const e1rm = epleyE1RM(e.weight, e.reps)
      if (e1rm > bestE1RM) bestE1RM = e1rm
      if (
        bestWeight === null ||
        e.weight > bestWeight ||
        (e.weight === bestWeight && e.reps > (bestReps ?? 0))
      ) {
        bestWeight = e.weight
        bestReps = e.reps
      }
      if (bestVolume === null || volume > bestVolume) {
        bestVolume = volume
        bestVolumeWeight = e.weight
        bestVolumeReps = e.reps
      }
    }

    const upsertRow = {
      user_id: userId,
      exercise_id: exerciseId,
      estimated_1rm: bestE1RM,
      best_weight: bestWeight,
      best_reps: bestReps,
      best_volume: bestVolume,
      best_volume_weight: bestVolumeWeight,
      best_volume_reps: bestVolumeReps,
      updated_at: new Date().toISOString(),
    }

    const { error: upsertErr } = await supabaseAdmin
      .from('user_exercise_metrics')
      .upsert(upsertRow, { onConflict: 'user_id,exercise_id' })

    if (upsertErr) console.error('[recomputeUserExerciseMetrics] upsert error:', upsertErr)
  }
}
