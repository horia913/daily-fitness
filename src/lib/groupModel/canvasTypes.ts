import { emptyPrescription } from './prescriptions'
import { newId } from './newId'
import type {
  Measurement,
  Prescription,
  RoundsDriver,
  SlotProperty,
  Technique,
  WorkoutKind,
} from './types'

export interface CanvasExercise {
  id: string
  exercise_id: string
  exercise_order: number
  measurement: Measurement
  technique: Technique
  prescriptions: Prescription[]
  /** Explicit column visibility — session-only unless values exist (see canvasLoad). */
  enabledProperties: SlotProperty[]
  rest_seconds?: number | null
  notes?: string | null
  target_time_seconds?: number | null
  target_pace_seconds_per_km?: number | null
  target_speed_pct?: number | null
  hr_zone?: number | null
  target_hr_pct?: number | null
  drop_percentage?: number | null
  max_drops?: number | null
  reps_per_cluster?: number | null
  clusters_per_set?: number | null
  intra_cluster_rest_seconds?: number | null
  rest_pause_seconds?: number | null
  max_rest_pauses?: number | null
  exercise?: { id: string; name: string; description?: string | null } | null
}

export interface CanvasGroup {
  id: string
  set_order: number
  rounds_driver: RoundsDriver
  total_sets: number
  rest_seconds?: number | null
  duration_seconds?: number | null
  interval_seconds?: number | null
  time_cap_seconds?: number | null
  slots: CanvasExercise[]
}

export interface CanvasWorkout {
  id: string
  name: string
  description?: string
  category?: string
  difficulty_level?: string
  estimated_duration?: number
  kind: WorkoutKind
  source_workout_id?: string | null
  groups: CanvasGroup[]
}

export const GROUP_IDENTITY_COLORS = [
  '#6EE7B7',
  '#7DD3FC',
  '#F0ABFC',
  '#FDE68A',
  '#FDBA74',
  '#A5B4FC',
] as const

export function groupColorIndex(groupIndex: number): number {
  return groupIndex % GROUP_IDENTITY_COLORS.length
}

export function defaultPropertiesForMeasurement(measurement: Measurement): SlotProperty[] {
  if (measurement === 'reps') return ['load', 'rest_after_exercise']
  return ['rest_after_exercise']
}

/** Default rest between sets when Rest is enabled on a new exercise. */
export const DEFAULT_REST_SECONDS = 90

export function createDefaultExercise(
  exerciseId: string,
  exercise: CanvasExercise['exercise'],
  order: number,
): CanvasExercise {
  const prescriptions: Prescription[] = [1, 2, 3].map((n) => emptyPrescription(n))
  return {
    id: newId(),
    exercise_id: exerciseId,
    exercise_order: order,
    measurement: 'reps',
    technique: 'none',
    prescriptions,
    /** New slots: RPE + Rest on; load off (coach can add via + Add property). Sets/reps always shown. */
    enabledProperties: ['rpe', 'rest_after_exercise'],
    rest_seconds: DEFAULT_REST_SECONDS,
    exercise: exercise ?? null,
  }
}

export function createSoloGroup(exercise: CanvasExercise, setOrder: number): CanvasGroup {
  return {
    id: newId(),
    set_order: setOrder,
    rounds_driver: 'fixed',
    total_sets: 3,
    rest_seconds: null,
    slots: [{ ...exercise, exercise_order: 1 }],
  }
}

export function createEmptyCanvasWorkout(partial?: Partial<CanvasWorkout>): CanvasWorkout {
  return {
    id: partial?.id ?? newId(),
    name: partial?.name ?? 'Untitled template',
    description: partial?.description ?? '',
    category: partial?.category ?? 'general',
    difficulty_level: partial?.difficulty_level ?? 'intermediate',
    estimated_duration: partial?.estimated_duration ?? 60,
    kind: partial?.kind ?? 'library',
    source_workout_id: partial?.source_workout_id ?? null,
    groups: partial?.groups ?? [],
  }
}

/** Slot counts as an exercise only when it references a real exercise. */
export function isValidExerciseSlot(slot: CanvasExercise): boolean {
  const id = slot.exercise_id?.trim()
  return Boolean(id)
}

/** Total valid exercise slots across all groups (for day-strip summaries). */
export function countCanvasExercises(workout: CanvasWorkout): number {
  return workout.groups.reduce(
    (sum, group) => sum + group.slots.filter(isValidExerciseSlot).length,
    0,
  )
}
