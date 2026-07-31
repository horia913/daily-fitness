import type { CanvasExercise, CanvasGroup } from '@/lib/groupModel/canvasTypes'
import { mapCanvasGroupToExerciseGroupDisplay } from './mapCanvasToExerciseDisplay'

function rx(
  setNumber: number,
  patch: Partial<CanvasExercise['prescriptions'][0]>,
): CanvasExercise['prescriptions'][0] {
  return { set_number: setNumber, ...patch }
}

function slot(
  id: string,
  name: string,
  order: number,
  patch: Omit<Partial<CanvasExercise>, 'prescriptions'> & {
    prescriptions: CanvasExercise['prescriptions']
  },
): CanvasExercise {
  const { prescriptions, ...rest } = patch
  return {
    id,
    exercise_id: id,
    exercise_order: order,
    measurement: 'reps',
    technique: 'none',
    prescriptions,
    enabledProperties: ['load', 'rir', 'tempo'],
    exercise: { id, name },
    ...rest,
  }
}

/** (a) Straight set — %1RM + RIR + rest */
export const straightSetGroup = mapCanvasGroupToExerciseGroupDisplay(
  {
    id: 'g1',
    set_order: 1,
    rounds_driver: 'fixed',
    total_sets: 3,
    rest_seconds: 90,
    slots: [
      slot('e1', 'Barbell Back Squat', 1, {
        prescriptions: [
          rx(1, { reps: '8', load_percentage: 75, rir: 2 }),
          rx(2, { reps: '8', load_percentage: 75, rir: 2 }),
          rx(3, { reps: '8', load_percentage: 75, rir: 2 }),
        ],
      }),
    ],
  } satisfies CanvasGroup,
  0,
)

/** (b) 2-exercise superset */
export const supersetGroup = mapCanvasGroupToExerciseGroupDisplay(
  {
    id: 'g2',
    set_order: 2,
    rounds_driver: 'fixed',
    total_sets: 4,
    rest_seconds: 120,
    slots: [
      slot('e2a', 'Romanian Deadlift', 1, {
        prescriptions: [
          rx(1, { reps: '10' }),
          rx(2, { reps: '10' }),
          rx(3, { reps: '10' }),
          rx(4, { reps: '10' }),
        ],
      }),
      slot('e2b', 'Walking Lunge', 2, {
        prescriptions: [
          rx(1, { reps: '12' }),
          rx(2, { reps: '12' }),
          rx(3, { reps: '12' }),
          rx(4, { reps: '12' }),
        ],
      }),
    ],
  } satisfies CanvasGroup,
  1,
)

/** (c) Giant set — technique + BW */
export const giantSetGroup = mapCanvasGroupToExerciseGroupDisplay(
  {
    id: 'g3',
    set_order: 3,
    rounds_driver: 'fixed',
    total_sets: 3,
    rest_seconds: 150,
    slots: [
      slot('e3a', 'Pull-Up', 1, {
        prescriptions: [
          rx(1, { reps: '8', weight_kg: 0 }),
          rx(2, { reps: '8', weight_kg: 0 }),
          rx(3, { reps: '8', weight_kg: 0 }),
        ],
      }),
      slot('e3b', 'Dumbbell Row', 2, {
        prescriptions: [
          rx(1, { reps: '10', weight_kg: 22 }),
          rx(2, { reps: '10', weight_kg: 22 }),
          rx(3, { reps: '10', weight_kg: 22 }),
        ],
      }),
      slot('e3c', 'Face Pull', 3, {
        prescriptions: [
          rx(1, { reps: '15', tempo: '4s ECC / 1s pause' }),
          rx(2, { reps: '15', tempo: '4s ECC / 1s pause' }),
          rx(3, { reps: '15', tempo: '4s ECC / 1s pause' }),
        ],
      }),
    ],
  } satisfies CanvasGroup,
  2,
)

/** (d) Isometric per-side */
export const isometricGroup = mapCanvasGroupToExerciseGroupDisplay(
  {
    id: 'g4',
    set_order: 4,
    rounds_driver: 'fixed',
    total_sets: 2,
    rest_seconds: 45,
    slots: [
      slot('e4', 'Copenhagen Plank', 1, {
        measurement: 'time',
        prescriptions: [
          rx(1, { work_seconds: 15, tempo: 'Isometric' }),
          rx(2, { work_seconds: 15, tempo: 'Isometric' }),
        ],
      }),
    ],
  } satisfies CanvasGroup,
  3,
)

/** (e) EMOM */
export const emomGroup = mapCanvasGroupToExerciseGroupDisplay(
  {
    id: 'g5',
    set_order: 5,
    rounds_driver: 'interval',
    total_sets: 1,
    interval_seconds: 60,
    duration_seconds: 600,
    rest_seconds: null,
    slots: [
      slot('e5', 'Kettlebell Swing', 1, {
        prescriptions: [rx(1, { reps: '15', load_percentage: 50 })],
      }),
    ],
  } satisfies CanvasGroup,
  0,
)

/** (e) Tabata */
export const tabataGroup = mapCanvasGroupToExerciseGroupDisplay(
  {
    id: 'g6',
    set_order: 6,
    rounds_driver: 'fixed',
    total_sets: 8,
    rest_seconds: 10,
    slots: [
      slot('e6a', 'Assault Bike', 1, {
        measurement: 'time',
        prescriptions: [rx(1, { work_seconds: 20 })],
      }),
      slot('e6b', 'Burpee', 2, {
        measurement: 'time',
        prescriptions: [rx(1, { work_seconds: 20 })],
      }),
    ],
  } satisfies CanvasGroup,
  1,
)

/** (f) Compact mode — superset round context */
export const compactSupersetExercise = mapCanvasGroupToExerciseGroupDisplay(
  {
    id: 'g7',
    set_order: 7,
    rounds_driver: 'fixed',
    total_sets: 5,
    rest_seconds: 90,
    slots: [
      slot('e7a', 'Incline Bench Press', 1, {
        prescriptions: [
          rx(1, { reps: '8' }),
          rx(2, { reps: '6' }),
          rx(3, { reps: '6' }),
        ],
      }),
      slot('e7b', 'Chest-Supported Row', 2, {
        prescriptions: [
          rx(1, { reps: '10' }),
          rx(2, { reps: '10' }),
          rx(3, { reps: '10' }),
        ],
      }),
    ],
  } satisfies CanvasGroup,
  2,
  { compact: true },
)
