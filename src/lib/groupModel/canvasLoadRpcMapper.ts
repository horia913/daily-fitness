import { inferPropertiesFromSlot } from './canvasActions'
import {
  createEmptyCanvasWorkout,
  type CanvasExercise,
  type CanvasGroup,
  type CanvasWorkout,
} from './canvasTypes'
import { prescriptionsFromSlotLegacy } from './prescriptions'
import type { Prescription, RoundsDriver, WorkoutKind } from './types'

function inferRoundsDriver(setType: string | undefined, stored: unknown): RoundsDriver {
  if (stored === 'fixed' || stored === 'amrap' || stored === 'interval' || stored === 'for_time') {
    return stored
  }
  if (setType === 'amrap') return 'amrap'
  if (setType === 'emom') return 'interval'
  if (setType === 'for_time') return 'for_time'
  return 'fixed'
}

function rowToPrescription(row: Record<string, unknown>): Prescription {
  return {
    id: row.id as string | undefined,
    slot_id: row.slot_id as string | undefined,
    set_number: Number(row.set_number) || 1,
    reps: row.reps as string | null | undefined,
    weight_kg: row.weight_kg as number | null | undefined,
    load_percentage: row.load_percentage as number | null | undefined,
    rpe: row.rpe as number | null | undefined,
    tempo: row.tempo as string | null | undefined,
    work_seconds: row.work_seconds as number | null | undefined,
    distance_meters: row.distance_meters as number | null | undefined,
  }
}

function mapSlotRow(
  row: Record<string, unknown>,
  totalSets: number,
  roundsDriver: RoundsDriver,
): CanvasExercise {
  const technique = (row.technique as CanvasExercise['technique']) ?? 'none'
  const slotId = String(row.id)
  const embedded = Array.isArray(row.prescriptions)
    ? (row.prescriptions as Record<string, unknown>[])
        .map(rowToPrescription)
        .sort((a, b) => a.set_number - b.set_number)
    : []
  const prescriptions =
    embedded.length > 0 ? embedded : prescriptionsFromSlotLegacy(row, totalSets, roundsDriver)
  const exerciseRaw = row.exercise as Record<string, unknown> | null | undefined

  return {
    id: slotId,
    exercise_id: String(row.exercise_id),
    exercise_order: Number(row.exercise_order) || 1,
    measurement: (row.measurement as CanvasExercise['measurement']) ?? 'reps',
    technique,
    prescriptions,
    enabledProperties: inferPropertiesFromSlot(row, technique),
    rest_seconds: row.rest_seconds as number | null | undefined,
    notes: row.notes as string | null | undefined,
    target_time_seconds: row.target_time_seconds as number | null | undefined,
    target_pace_seconds_per_km: row.target_pace_seconds_per_km as number | null | undefined,
    target_speed_pct: row.target_speed_pct as number | null | undefined,
    hr_zone: row.hr_zone as number | null | undefined,
    target_hr_pct: row.target_hr_pct as number | null | undefined,
    drop_percentage: row.drop_percentage as number | null | undefined,
    max_drops: row.max_drops as number | null | undefined,
    reps_per_cluster: row.reps_per_cluster as number | null | undefined,
    clusters_per_set: row.clusters_per_set as number | null | undefined,
    intra_cluster_rest_seconds: row.intra_cluster_rest_seconds as number | null | undefined,
    rest_pause_seconds: row.rest_pause_seconds as number | null | undefined,
    max_rest_pauses: row.max_rest_pauses as number | null | undefined,
    exercise: exerciseRaw
      ? {
          id: String(exerciseRaw.id),
          name: String(exerciseRaw.name ?? ''),
          description: (exerciseRaw.description as string | null | undefined) ?? null,
        }
      : null,
  }
}

function mapGroupRow(row: Record<string, unknown>): CanvasGroup {
  const rounds_driver = inferRoundsDriver(row.set_type as string, row.rounds_driver)
  const total_sets = (row.total_sets as number | null | undefined) ?? 3
  const slotList = Array.isArray(row.slots) ? (row.slots as Record<string, unknown>[]) : []

  return {
    id: String(row.id),
    set_order: Number(row.set_order) || 0,
    rounds_driver,
    total_sets,
    rest_seconds: row.rest_seconds as number | null | undefined,
    duration_seconds: row.duration_seconds as number | null | undefined,
    interval_seconds: row.interval_seconds as number | null | undefined,
    time_cap_seconds: row.time_cap_seconds as number | null | undefined,
    slots: slotList.map((slot) => mapSlotRow(slot, total_sets, rounds_driver)),
  }
}

export interface WorkoutCanvasRpcPayload {
  template?: Record<string, unknown> | null
  groups?: Record<string, unknown>[] | null
}

export function mapWorkoutCanvasRpcToCanvasWorkout(
  payload: WorkoutCanvasRpcPayload | null | undefined,
  options?: { defaultKind?: WorkoutKind },
): CanvasWorkout | null {
  if (!payload?.template) return null
  const template = payload.template
  const groups = (payload.groups ?? []).map(mapGroupRow)

  return createEmptyCanvasWorkout({
    id: String(template.id),
    name: String(template.name ?? ''),
    description: template.description as string | undefined,
    category: template.category as string | undefined,
    difficulty_level: template.difficulty_level as string | undefined,
    estimated_duration: template.estimated_duration as number | undefined,
    kind: (template.kind as WorkoutKind) ?? options?.defaultKind ?? 'library',
    source_workout_id: (template.source_workout_id ?? template.source_template_id) as
      | string
      | null
      | undefined,
    groups,
  })
}
