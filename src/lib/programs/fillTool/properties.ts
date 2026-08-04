import type { CanvasExercise } from '@/lib/groupModel/canvasTypes'
import type { Prescription } from '@/lib/groupModel/types'
import { roundWeight } from '@/lib/progressionGenerator'
import type { FillPropertyKey, LoadUnit } from './types'

export const FILL_PROPERTY_LABELS: Record<FillPropertyKey, string> = {
  load_pct: 'Load (% 1RM)',
  load_kg: 'Load (kg)',
  reps: 'Reps',
  rir: 'RIR',
  work_seconds: 'Time (seconds)',
  distance_meters: 'Distance (meters)',
  rest_after_exercise: 'Rest after exercise (seconds)',
}

function sortedPrescriptions(slot: CanvasExercise): Prescription[] {
  return [...slot.prescriptions].sort((a, b) => a.set_number - b.set_number)
}

export function detectLoadUnit(slot: CanvasExercise): LoadUnit | null {
  const rows = sortedPrescriptions(slot)
  if (rows.some((r) => r.load_percentage != null)) return 'pct'
  if (rows.some((r) => r.weight_kg != null)) return 'kg'
  return null
}

export function propertyKeyForLoadUnit(unit: LoadUnit): FillPropertyKey {
  return unit === 'pct' ? 'load_pct' : 'load_kg'
}

export function loadUnitForProperty(property: FillPropertyKey): LoadUnit | null {
  if (property === 'load_pct') return 'pct'
  if (property === 'load_kg') return 'kg'
  return null
}

export function propertyExistsOnSlot(slot: CanvasExercise, property: FillPropertyKey): boolean {
  switch (property) {
    case 'load_pct':
      return (
        slot.enabledProperties.includes('load') &&
        sortedPrescriptions(slot).some((r) => r.load_percentage != null)
      )
    case 'load_kg':
      return (
        slot.enabledProperties.includes('load') &&
        sortedPrescriptions(slot).some((r) => r.weight_kg != null)
      )
    case 'reps':
      return (
        slot.measurement === 'reps' &&
        sortedPrescriptions(slot).some((r) => r.reps != null && String(r.reps).trim() !== '')
      )
    case 'rir':
      return (
        slot.enabledProperties.includes('rir') &&
        sortedPrescriptions(slot).some((r) => r.rpe != null)
      )
    case 'work_seconds':
      return (
        slot.measurement === 'time' &&
        sortedPrescriptions(slot).some((r) => r.work_seconds != null)
      )
    case 'distance_meters':
      return (
        slot.measurement === 'distance' &&
        sortedPrescriptions(slot).some((r) => r.distance_meters != null)
      )
    case 'rest_after_exercise':
      return slot.enabledProperties.includes('rest_after_exercise') && slot.rest_seconds != null
    default:
      return false
  }
}

function parseRepValue(raw: string | null | undefined): number | null {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s || s.includes('-')) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export function readBaselineValues(slot: CanvasExercise, property: FillPropertyKey): number[] | null {
  if (property === 'rest_after_exercise') {
    return slot.rest_seconds != null ? [slot.rest_seconds] : null
  }

  const rows = sortedPrescriptions(slot)
  switch (property) {
    case 'load_pct':
      return rows.map((r) => r.load_percentage).filter((v): v is number => v != null)
    case 'load_kg':
      return rows.map((r) => r.weight_kg).filter((v): v is number => v != null)
    case 'reps': {
      const parsed = rows.map((r) => parseRepValue(r.reps))
      if (parsed.some((v) => v == null)) return null
      return parsed as number[]
    }
    case 'rir':
      return rows.map((r) => r.rpe).filter((v): v is number => v != null)
    case 'work_seconds':
      return rows.map((r) => r.work_seconds).filter((v): v is number => v != null)
    case 'distance_meters':
      return rows.map((r) => r.distance_meters).filter((v): v is number => v != null)
    default:
      return null
  }
}

export function readBaselineScalar(slot: CanvasExercise, property: FillPropertyKey): number | null {
  const values = readBaselineValues(slot, property)
  if (!values || values.length === 0) return null
  return values[0]
}

export function roundForProperty(property: FillPropertyKey, value: number): number {
  switch (property) {
    case 'load_pct':
      return Math.round(value * 4) / 4
    case 'load_kg':
      return roundWeight(value)
    case 'reps':
    case 'rir':
    case 'work_seconds':
    case 'distance_meters':
    case 'rest_after_exercise':
      return Math.round(value)
    default:
      return value
  }
}

export function formatPropertyValues(
  property: FillPropertyKey,
  values: number[],
): string {
  if (values.length === 0) return '—'
  if (property === 'load_pct') {
    const rounded = values.map((v) => roundForProperty(property, v))
    return `${rounded.join('/')}%`
  }
  if (property === 'load_kg') {
    const rounded = values.map((v) => roundForProperty(property, v))
    return rounded.map((v) => `${v} kg`).join('/')
  }
  return values.map((v) => String(roundForProperty(property, v))).join('/')
}

/** Preview grid only — top/working set for coach scanning; Apply still writes all sets. */
export function representativeSetValue(property: FillPropertyKey, values: number[]): number {
  if (values.length === 0) return NaN
  if (property === 'load_pct' || property === 'load_kg') return Math.max(...values)
  if (property === 'rir') return Math.min(...values)
  return values[values.length - 1]
}

export function formatPropertyPreviewValue(
  property: FillPropertyKey,
  values: number[],
): string {
  if (values.length === 0) return '—'
  const v = roundForProperty(property, representativeSetValue(property, values))
  if (property === 'load_pct') return `${v}%`
  if (property === 'load_kg') return `${v} kg`
  return String(v)
}

export function enumeratePropertiesForSlots(
  slots: CanvasExercise[],
): FillPropertyKey[] {
  const keys = new Set<FillPropertyKey>()
  for (const slot of slots) {
    const loadUnit = detectLoadUnit(slot)
    if (loadUnit === 'pct' && propertyExistsOnSlot(slot, 'load_pct')) keys.add('load_pct')
    if (loadUnit === 'kg' && propertyExistsOnSlot(slot, 'load_kg')) keys.add('load_kg')
    for (const key of [
      'reps',
      'rir',
      'work_seconds',
      'distance_meters',
      'rest_after_exercise',
    ] as FillPropertyKey[]) {
      if (propertyExistsOnSlot(slot, key)) keys.add(key)
    }
  }
  return [...keys]
}

export function applyValuesToSlot(
  slot: CanvasExercise,
  property: FillPropertyKey,
  values: number[],
): CanvasExercise {
  if (property === 'rest_after_exercise') {
    return { ...slot, rest_seconds: values[0] ?? slot.rest_seconds }
  }

  const rows = sortedPrescriptions(slot)
  const prescriptions = rows.map((row, index) => {
    const value = values[index]
    if (value == null) return row
    switch (property) {
      case 'load_pct':
        return { ...row, load_percentage: value, weight_kg: null }
      case 'load_kg':
        return { ...row, weight_kg: value, load_percentage: null }
      case 'reps':
        return { ...row, reps: String(Math.round(value)) }
      case 'rir':
        return { ...row, rpe: Math.round(value) }
      case 'work_seconds':
        return { ...row, work_seconds: Math.round(value) }
      case 'distance_meters':
        return { ...row, distance_meters: Math.round(value) }
      default:
        return row
    }
  })

  return { ...slot, prescriptions }
}
