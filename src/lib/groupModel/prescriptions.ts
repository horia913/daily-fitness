import { newId } from './newId'
import type { Measurement, Prescription, RoundsDriver } from './types'

export const PRESCRIPTION_VALUE_FIELDS = [
  'reps',
  'weight_kg',
  'load_percentage',
  'rpe',
  'tempo',
  'work_seconds',
  'distance_meters',
] as const

export type PrescriptionValueField = (typeof PRESCRIPTION_VALUE_FIELDS)[number]

/** Columns on workout_set_prescriptions (pace/time/speed/HR targets live on wsee slots). */
export const PRESCRIPTION_SELECT_COLUMNS =
  'id, slot_id, set_number, reps, weight_kg, load_percentage, rpe, tempo, work_seconds, distance_meters'

export function emptyPrescription(setNumber: number): Prescription {
  return { id: newId(), set_number: setNumber }
}

export function clonePrescription(row: Prescription, setNumber: number): Prescription {
  return { ...row, id: newId(), set_number: setNumber }
}

/** Row count per slot for a given rounds driver. */
export function prescriptionRowCount(totalSets: number, roundsDriver: RoundsDriver): number {
  if (roundsDriver === 'amrap' || roundsDriver === 'interval') return 1
  return Math.max(1, totalSets)
}

/** Sync every slot's prescription array to the group's rounds linkage. */
export function syncPrescriptionsForGroup<T extends { prescriptions: Prescription[] }>(
  slots: T[],
  totalSets: number,
  roundsDriver: RoundsDriver,
): T[] {
  const targetCount = prescriptionRowCount(totalSets, roundsDriver)
  return slots.map((slot) => {
    let rows = [...slot.prescriptions].sort((a, b) => a.set_number - b.set_number)
    while (rows.length < targetCount) {
      const last = rows[rows.length - 1] ?? emptyPrescription(rows.length + 1)
      rows.push(clonePrescription(last, rows.length + 1))
    }
    if (rows.length > targetCount) {
      rows = rows.slice(0, targetCount)
    }
    rows = rows.map((r, i) => ({ ...r, set_number: i + 1 }))
    return { ...slot, prescriptions: rows }
  })
}

export function addSetToGroup<T extends { prescriptions: Prescription[] }>(
  slots: T[],
  totalSets: number,
  roundsDriver: RoundsDriver,
): { slots: T[]; totalSets: number } {
  if (roundsDriver === 'amrap' || roundsDriver === 'interval') {
    return { slots, totalSets }
  }
  const nextTotal = totalSets + 1
  return { slots: syncPrescriptionsForGroup(slots, nextTotal, roundsDriver), totalSets: nextTotal }
}

export function removeSetFromGroup<T extends { prescriptions: Prescription[] }>(
  slots: T[],
  totalSets: number,
  roundsDriver: RoundsDriver,
): { slots: T[]; totalSets: number } {
  if (roundsDriver === 'amrap' || roundsDriver === 'interval') {
    return { slots, totalSets }
  }
  if (totalSets <= 1) return { slots, totalSets }
  const nextTotal = totalSets - 1
  return { slots: syncPrescriptionsForGroup(slots, nextTotal, roundsDriver), totalSets: nextTotal }
}

/** First prescription row → slot legacy scalar columns. */
export function derivedLegacyFromPrescriptions(
  prescriptions: Prescription[],
): Pick<
  Prescription,
  'reps' | 'weight_kg' | 'load_percentage' | 'rpe' | 'tempo' | 'work_seconds' | 'distance_meters'
> {
  const first = prescriptions.slice().sort((a, b) => a.set_number - b.set_number)[0]
  if (!first) return {}
  return {
    reps: first.reps ?? null,
    weight_kg: first.weight_kg ?? null,
    load_percentage: first.load_percentage ?? null,
    rpe: first.rpe ?? null,
    tempo: first.tempo ?? null,
    work_seconds: first.work_seconds ?? null,
    distance_meters: first.distance_meters ?? null,
  }
}

export function derivedRepsPerSet(prescriptions: Prescription[]): string | null {
  const first = prescriptions.slice().sort((a, b) => a.set_number - b.set_number)[0]
  return first?.reps ?? null
}

export function exerciseLetter(slotCount: number, order: number): string | undefined {
  if (slotCount < 2) return undefined
  return String.fromCharCode(64 + order)
}

/** Build default prescriptions when loading slots without prescription rows. */
export function prescriptionsFromSlotLegacy(
  slot: Record<string, unknown>,
  totalSets: number,
  roundsDriver: RoundsDriver,
): Prescription[] {
  const count = prescriptionRowCount(totalSets, roundsDriver)
  const base: Prescription = {
    set_number: 1,
    reps: (slot.reps as string | null | undefined) ?? null,
    weight_kg: (slot.weight_kg as number | null | undefined) ?? null,
    load_percentage: (slot.load_percentage as number | null | undefined) ?? null,
    rpe: (slot.rpe as number | null | undefined) ?? null,
    tempo: (slot.tempo as string | null | undefined) ?? null,
    work_seconds: (slot.work_seconds as number | null | undefined) ?? null,
    distance_meters: (slot.distance_meters as number | null | undefined) ?? null,
  }
  return Array.from({ length: count }, (_, i) =>
    i === 0 ? { ...base, set_number: 1 } : emptyPrescription(i + 1),
  )
}

export function measurementValueField(measurement: Measurement): PrescriptionValueField {
  switch (measurement) {
    case 'time':
      return 'work_seconds'
    case 'distance':
      return 'distance_meters'
    default:
      return 'reps'
  }
}

export function clearMeasurementValues(prescriptions: Prescription[]): Prescription[] {
  return prescriptions.map((row) => ({
    ...row,
    reps: null,
    work_seconds: null,
    distance_meters: null,
  }))
}
