import { deriveSetType } from './deriveSetType'
import type { GroupModelSlotWrite, GroupModelWritePayload } from './types'

function parseIntOr(value: unknown, fallback: number | null = null): number | null {
  if (value === undefined || value === null || value === '') return fallback
  const n = parseInt(String(value), 10)
  return Number.isFinite(n) ? n : fallback
}

function parseFloatOr(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null
  const n = parseFloat(String(value))
  return Number.isFinite(n) ? n : null
}

function parseRepsField(value: unknown): string | null {
  if (value === undefined || value === null) return null
  const s = String(value).trim()
  return s || null
}

function baseSlot(
  exerciseId: string,
  order: number,
  partial: Partial<GroupModelSlotWrite> = {},
): GroupModelSlotWrite {
  return {
    exercise_id: exerciseId,
    exercise_order: order,
    measurement: 'reps',
    technique: 'none',
    ...partial,
  }
}

function dedupeSlotsByExerciseId(slots: GroupModelSlotWrite[]): GroupModelSlotWrite[] {
  const seen = new Set<string>()
  const out: GroupModelSlotWrite[] = []
  for (const slot of slots) {
    if (seen.has(slot.exercise_id)) continue
    seen.add(slot.exercise_id)
    out.push(slot)
  }
  return out.map((s, i) => ({ ...s, exercise_order: i + 1 }))
}

/**
 * Translate unchanged form exercise object → Group-model write payload.
 */
export function formExerciseToGroupModel(
  exercise: Record<string, unknown>,
  exerciseType: string,
): GroupModelWritePayload {
  const type = exerciseType || 'straight_set'
  let rounds_driver: GroupModelWritePayload['rounds_driver'] = 'fixed'
  let interval_seconds: number | null = null
  let time_cap_seconds: number | null = null
  let total_sets: number | null = parseIntOr(exercise.sets, null)
  let rest_seconds: number | null = parseIntOr(exercise.rest_seconds, null)
  let duration_seconds: number | null = null
  const slots: GroupModelSlotWrite[] = []

  const commonSlot = (exerciseId: string, order: number, extra: Partial<GroupModelSlotWrite> = {}) =>
    baseSlot(exerciseId, order, {
      reps: parseRepsField(exercise.reps),
      weight_kg: parseFloatOr(exercise.weight_kg),
      load_percentage: parseFloatOr(exercise.load_percentage),
      rpe: parseIntOr(exercise.rpe, null),
      tempo: (exercise.tempo as string) || null,
      notes: (exercise.notes as string) || null,
      sets: total_sets,
      ...extra,
    })

  switch (type) {
    case 'straight_set': {
      if (exercise.exercise_id) {
        slots.push(commonSlot(String(exercise.exercise_id), 1))
      }
      break
    }

    case 'superset': {
      if (exercise.exercise_id) {
        slots.push(
          commonSlot(String(exercise.exercise_id), 1, {
            exercise_letter: 'A',
            reps: parseRepsField(exercise.reps),
          }),
        )
      }
      if (exercise.superset_exercise_id) {
        slots.push(
          baseSlot(String(exercise.superset_exercise_id), 2, {
            measurement: 'reps',
            technique: 'none',
            exercise_letter: 'B',
            reps: parseRepsField(exercise.superset_reps ?? exercise.reps),
            weight_kg: parseFloatOr((exercise as any).superset_weight_kg),
            load_percentage: parseFloatOr((exercise as any).superset_load_percentage),
            rpe: parseIntOr((exercise as any).superset_rpe ?? exercise.rpe, null),
            tempo: ((exercise as any).superset_tempo as string) || (exercise.tempo as string) || null,
            notes: ((exercise as any).superset_notes as string) || (exercise.notes as string) || null,
            sets: total_sets,
          }),
        )
      }
      break
    }

    case 'giant_set': {
      const giant = (exercise.giant_set_exercises as any[]) || []
      giant.forEach((gs, idx) => {
        if (!gs?.exercise_id) return
        slots.push(
          baseSlot(String(gs.exercise_id), idx + 1, {
            measurement: 'reps',
            technique: 'none',
            exercise_letter: String.fromCharCode(65 + idx),
            reps: parseRepsField(gs.reps ?? exercise.reps),
            weight_kg: parseFloatOr(gs.weight_kg ?? exercise.weight_kg),
            load_percentage: parseFloatOr(gs.load_percentage ?? exercise.load_percentage),
            rpe: parseIntOr(gs.rpe ?? exercise.rpe, null),
            tempo: gs.tempo || (exercise.tempo as string) || null,
            notes: gs.notes || (exercise.notes as string) || null,
            sets: parseIntOr(gs.sets ?? exercise.sets, total_sets),
          }),
        )
      })
      break
    }

    case 'pre_exhaustion': {
      if (exercise.exercise_id) {
        slots.push(
          commonSlot(String(exercise.exercise_id), 1, {
            exercise_letter: 'A',
            reps: parseRepsField(exercise.isolation_reps ?? exercise.reps),
          }),
        )
      }
      if (exercise.compound_exercise_id) {
        slots.push(
          baseSlot(String(exercise.compound_exercise_id), 2, {
            measurement: 'reps',
            technique: 'none',
            exercise_letter: 'B',
            reps: parseRepsField(exercise.compound_reps ?? exercise.reps),
            weight_kg: parseFloatOr((exercise as any).compound_weight_kg ?? exercise.weight_kg),
            load_percentage: parseFloatOr(
              (exercise as any).compound_load_percentage ?? exercise.load_percentage,
            ),
            rpe: parseIntOr((exercise as any).compound_rpe ?? exercise.rpe, null),
            tempo: ((exercise as any).compound_tempo as string) || (exercise.tempo as string) || null,
            notes: ((exercise as any).compound_notes as string) || (exercise.notes as string) || null,
            sets: total_sets,
          }),
        )
      }
      break
    }

    case 'drop_set': {
      if (exercise.exercise_id) {
        slots.push(
          commonSlot(String(exercise.exercise_id), 1, {
            technique: 'drop_set',
            reps: parseRepsField(exercise.drop_set_reps ?? exercise.reps),
            drop_percentage: parseIntOr(exercise.drop_percentage, 20),
            max_drops: 2,
          }),
        )
      }
      break
    }

    case 'cluster_set': {
      if (exercise.exercise_id) {
        slots.push(
          commonSlot(String(exercise.exercise_id), 1, {
            technique: 'cluster',
            reps_per_cluster: parseIntOr(exercise.cluster_reps ?? exercise.reps, 10),
            clusters_per_set: parseIntOr(exercise.clusters_per_set, 3),
            intra_cluster_rest_seconds: parseIntOr(exercise.intra_cluster_rest, 15),
          }),
        )
      }
      break
    }

    case 'rest_pause': {
      if (exercise.exercise_id) {
        slots.push(
          commonSlot(String(exercise.exercise_id), 1, {
            technique: 'rest_pause',
            rest_pause_seconds: parseIntOr(exercise.rest_pause_duration, 15),
            max_rest_pauses: parseIntOr(exercise.max_rest_pauses, 3),
          }),
        )
      }
      break
    }

    case 'amrap': {
      rounds_driver = 'amrap'
      duration_seconds = parseIntOr(exercise.amrap_duration, 10)
        ? parseIntOr(exercise.amrap_duration, 10)! * 60
        : null
      if (exercise.exercise_id) {
        slots.push(
          commonSlot(String(exercise.exercise_id), 1, {
            reps: parseRepsField(exercise.target_reps ?? exercise.reps),
          }),
        )
      }
      break
    }

    case 'emom': {
      rounds_driver = 'interval'
      interval_seconds = 60
      duration_seconds = parseIntOr(exercise.emom_duration, 10)
        ? parseIntOr(exercise.emom_duration, 10)! * 60
        : null
      const mode = String(exercise.emom_mode || 'target_reps')
      const isReps = mode === 'target_reps' || mode === 'rep_based' || mode === ''
      if (exercise.exercise_id) {
        slots.push(
          commonSlot(String(exercise.exercise_id), 1, {
            measurement: isReps ? 'reps' : 'time',
            reps: isReps ? parseRepsField(exercise.emom_reps ?? exercise.reps) : null,
            work_seconds: !isReps ? parseIntOr(exercise.work_seconds, null) : null,
          }),
        )
      }
      break
    }

    case 'for_time': {
      rounds_driver = 'for_time'
      time_cap_seconds = parseIntOr(exercise.time_cap, null)
        ? parseIntOr(exercise.time_cap, null)! * 60
        : null
      if (exercise.exercise_id) {
        slots.push(
          commonSlot(String(exercise.exercise_id), 1, {
            reps: parseRepsField(exercise.target_reps ?? exercise.reps),
          }),
        )
      }
      break
    }

    case 'tabata': {
      total_sets = parseIntOr(exercise.rounds ?? exercise.sets, 8)
      rest_seconds = parseIntOr((exercise as any).rest_after_set ?? exercise.rest_after, 10)
      const tabataSets = (exercise.tabata_sets as any[]) || []
      const tabataExercises =
        tabataSets[0]?.exercises ||
        (exercise as any).tabata_exercises ||
        []
      tabataExercises.forEach((ex: any, idx: number) => {
        if (!ex?.exercise_id) return
        slots.push(
          baseSlot(String(ex.exercise_id), idx + 1, {
            measurement: 'time',
            technique: 'none',
            exercise_letter: String.fromCharCode(65 + idx),
            work_seconds: parseIntOr(ex.work_seconds ?? exercise.work_seconds, 20),
            rest_seconds: parseIntOr(ex.rest_after ?? ex.rest_seconds ?? exercise.rest_after, 10),
            load_percentage: parseFloatOr(ex.load_percentage),
            sets: total_sets,
          }),
        )
      })
      break
    }

    case 'timed_set': {
      if (exercise.exercise_id) {
        slots.push(
          commonSlot(String(exercise.exercise_id), 1, {
            measurement: 'time',
            work_seconds: parseIntOr(exercise.work_seconds, null),
            reps: null,
          }),
        )
      }
      break
    }

    case 'speed_work': {
      total_sets = parseIntOr(exercise.speed_intervals ?? exercise.sets, 1)
      rest_seconds = parseIntOr(exercise.speed_rest_seconds, 120)
      if (exercise.exercise_id) {
        const useHr = exercise.speed_intensity_mode === 'hr'
        slots.push(
          commonSlot(String(exercise.exercise_id), 1, {
            measurement: 'distance',
            distance_meters: parseFloatOr(exercise.speed_distance_meters),
            load_percentage: parseFloatOr(exercise.speed_load_percent_bw),
            target_speed_pct: useHr
              ? null
              : parseFloatOr(exercise.speed_max_speed_percent),
            target_hr_pct: useHr
              ? parseFloatOr(exercise.speed_max_hr_percent)
              : null,
            notes: (exercise.speed_notes as string) || (exercise.notes as string) || null,
            sets: total_sets,
          }),
        )
      }
      break
    }

    case 'endurance': {
      total_sets = 1
      if (exercise.exercise_id) {
        const km = parseFloatOr(exercise.endurance_distance_km)
        const useHr = exercise.endurance_intensity_mode === 'hr'
        slots.push(
          commonSlot(String(exercise.exercise_id), 1, {
            measurement: 'distance',
            distance_meters: km != null ? Math.round(km * 1000) : null,
            target_time_seconds: parseIntOr(exercise.endurance_target_time_seconds, null),
            target_pace_seconds_per_km: parseFloatOr(exercise.endurance_target_pace_sec_per_km),
            hr_zone: useHr
              ? null
              : parseIntOr(exercise.endurance_hr_zone, null),
            target_hr_pct: useHr
              ? parseFloatOr(exercise.endurance_hr_percentage)
              : null,
            notes: (exercise.endurance_notes as string) || (exercise.notes as string) || null,
            sets: 1,
          }),
        )
      }
      break
    }

    default: {
      if (exercise.exercise_id) {
        slots.push(commonSlot(String(exercise.exercise_id), 1))
      }
    }
  }

  const deduped = dedupeSlotsByExerciseId(slots)
  const set_type = deriveSetType(
    { rounds_driver, total_sets },
    deduped,
  )

  const firstRepsSlot = deduped.find((s) => s.measurement === 'reps' && s.reps)
  const reps_per_set =
    type === 'timed_set' ? null : firstRepsSlot?.reps ?? parseRepsField(exercise.reps)

  return {
    rounds_driver,
    interval_seconds,
    time_cap_seconds,
    total_sets,
    rest_seconds,
    duration_seconds,
    set_type,
    reps_per_set,
    set_name: (exercise.set_name as string) || null,
    set_notes: (exercise.notes as string) || null,
    slots: deduped,
  }
}
