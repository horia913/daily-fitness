import { zonedYmdFromIsoTimestamp } from '@/lib/clientZonedCalendar'
import { dbToUiScale } from '@/lib/wellnessService'
import type { ClientHabitWithTemplate, HabitTemplateRow } from '@/lib/habitTemplateService'

export const STUB_SOURCE_TYPES = new Set<string>([
  'water_log',
  'nutrition_field',
  'meal_completion_count',
  'body_metric_count',
])

export type WellnessLogDay = {
  log_date: string
  sleep_hours?: number | null
  sleep_quality?: number | null
  stress_level?: number | null
  steps?: number | null
}

export type HabitSourceData = {
  clientTimezone: string
  /** log_date -> row (one row per day expected) */
  wellnessByYmd: Map<string, WellnessLogDay>
  /** Calendar days (client tz) with at least one completed workout */
  workoutCompletedYmds: Set<string>
}

export type DeriveCompletionResult = {
  done: boolean
  value: number | string | null
  target: number | string | null
  /** no underlying wellness/workout row when relevant */
  missingData: boolean
}

function mergedTarget(habit: ClientHabitWithTemplate, template: HabitTemplateRow): Record<string, unknown> {
  return {
    ...template.default_target,
    ...habit.target,
  }
}

function readField(row: WellnessLogDay | undefined, field: string): number | null {
  if (!row) return null
  const v = (row as Record<string, unknown>)[field]
  if (v == null) return null
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isNaN(n) ? null : n
  }
  return null
}

function targetKeyForWellnessField(field: string): string {
  if (field === 'sleep_hours') return 'hours'
  if (field === 'sleep_quality') return 'quality'
  if (field === 'stress_level') return 'max_stress'
  return field
}

function compare(op: string, left: number, right: number): boolean {
  if (op === 'lte') return left <= right
  if (op === 'eq') return left === right
  return left >= right
}

/**
 * Auto-derive completion for wellness_field, wellness_check, workout_logged.
 * Returns null for stub pipeline types — caller should use habit_logs.
 */
export function deriveCompletion(
  habit: ClientHabitWithTemplate,
  dayYmd: string,
  data: HabitSourceData
): DeriveCompletionResult | null {
  const template = habit.template
  const st = template.source_type

  if (STUB_SOURCE_TYPES.has(st) || st === 'manual') return null

  if (st === 'wellness_check') {
    const row = data.wellnessByYmd.get(dayYmd)
    const done = Boolean(row)
    return { done, value: done ? 1 : null, target: 1, missingData: !row }
  }

  if (st === 'workout_logged') {
    const done = data.workoutCompletedYmds.has(dayYmd)
    return { done, value: done ? 1 : null, target: 1, missingData: !done }
  }

  if (st === 'wellness_field') {
    const cfg = template.source_config ?? {}
    const field = typeof cfg.field === 'string' ? cfg.field : ''
    const op = typeof cfg.operator === 'string' ? cfg.operator : 'gte'
    if (!field) {
      return { done: false, value: null, target: null, missingData: true }
    }

    const row = data.wellnessByYmd.get(dayYmd)
    if (!row) {
      return { done: false, value: null, target: null, missingData: true }
    }

    const raw = readField(row, field)
    if (raw == null) {
      const merged = mergedTarget(habit, template)
      const tkey = targetKeyForWellnessField(field)
      const thresholdRaw = merged[tkey]
      const threshold =
        typeof thresholdRaw === 'number'
          ? thresholdRaw
          : typeof thresholdRaw === 'string'
            ? Number(thresholdRaw)
            : null
      return { done: false, value: null, target: threshold, missingData: true }
    }

    let valueForCompare: number = raw
    if (field === 'stress_level') {
      valueForCompare = dbToUiScale(raw) ?? raw
    }

    const tkey = targetKeyForWellnessField(field)
    const merged = mergedTarget(habit, template)
    const thresholdRaw = merged[tkey]
    const threshold =
      typeof thresholdRaw === 'number'
        ? thresholdRaw
        : typeof thresholdRaw === 'string'
          ? Number(thresholdRaw)
          : NaN

    if (Number.isNaN(threshold)) {
      return { done: false, value: raw, target: null, missingData: true }
    }

    const done = compare(op, valueForCompare, threshold)
    return {
      done,
      value: field === 'stress_level' ? valueForCompare : raw,
      target: threshold,
      missingData: false,
    }
  }

  return null
}

/** Build set of YYYY-MM-DD (client tz) where client completed a workout */
export function workoutLogsToCompletedYmds(
  rows: { completed_at: string | null }[],
  clientTimezone: string
): Set<string> {
  const out = new Set<string>()
  for (const r of rows) {
    if (!r.completed_at) continue
    out.add(zonedYmdFromIsoTimestamp(r.completed_at, clientTimezone))
  }
  return out
}
