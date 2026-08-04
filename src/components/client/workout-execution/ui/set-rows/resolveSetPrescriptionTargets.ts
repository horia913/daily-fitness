/**
 * Resolve coach-prescribed targets for a single set row.
 * Matches prescriptions by set_number (not array index).
 *
 * Hierarchy per field:
 *  1. that set's prescription field when non-null
 *  2. exercise-level scalar when non-null
 *  3. (callers apply progression / last-time defaults after this)
 *  4. blank / null
 */

import type { Prescription } from '@/lib/groupModel/types'
import type { WorkoutSetEntryExercise } from '@/types/workoutSetEntries'

export type SetPrescriptionTargets = {
  reps: string | null
  weight_kg: number | null
  load_percentage: number | null
  rpe: number | null
  tempo: string | null
  work_seconds: number | null
  distance_meters: number | null
}

function findPrescription(
  prescriptions: Prescription[] | undefined,
  setNumber: number,
): Prescription | undefined {
  if (!prescriptions?.length) return undefined
  return prescriptions.find((p) => p.set_number === setNumber)
}

function pickString(
  rx: string | null | undefined,
  scalar: string | null | undefined,
): string | null {
  if (rx != null && String(rx).trim() !== '') return String(rx)
  if (scalar != null && String(scalar).trim() !== '') return String(scalar)
  return null
}

function pickNumber(
  rx: number | null | undefined,
  scalar: number | null | undefined,
): number | null {
  if (rx != null && Number.isFinite(Number(rx))) return Number(rx)
  if (scalar != null && Number.isFinite(Number(scalar))) return Number(scalar)
  return null
}

/**
 * Resolve prescription targets for set N on an exercise.
 * Rest / technique are slot-level — not returned here.
 */
export function resolveSetPrescriptionTargets(
  exercise:
    | Pick<
        WorkoutSetEntryExercise,
        | 'prescriptions'
        | 'reps'
        | 'weight_kg'
        | 'load_percentage'
        | 'rpe'
        | 'tempo'
      >
    | null
    | undefined,
  setNumber: number,
  blockRepsPerSet?: string | null,
): SetPrescriptionTargets {
  const rx = findPrescription(exercise?.prescriptions, setNumber)
  return {
    reps: pickString(rx?.reps, exercise?.reps ?? blockRepsPerSet ?? null),
    weight_kg: pickNumber(rx?.weight_kg, exercise?.weight_kg),
    load_percentage: pickNumber(rx?.load_percentage, exercise?.load_percentage),
    rpe: pickNumber(rx?.rpe, exercise?.rpe),
    tempo: pickString(rx?.tempo, exercise?.tempo),
    work_seconds: pickNumber(rx?.work_seconds, null),
    distance_meters: pickNumber(rx?.distance_meters, null),
  }
}
