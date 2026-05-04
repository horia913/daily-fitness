/**
 * Coach adherence: aggregate client habit completion per calendar week.
 * Uses habits + habit_logs (stubs/manual) and deriveCompletion (auto) like the client app.
 */

import { addCalendarDaysYmd } from '@/lib/clientZonedCalendar'
import {
  deriveCompletion,
  STUB_SOURCE_TYPES,
  workoutLogsToCompletedYmds,
  type WellnessLogDay,
} from '@/lib/habitAutoTracking'
import type { ClientHabitWithTemplate } from '@/lib/habitTemplateService'
import { normalizeHabitRow } from '@/lib/habitTemplateService'

export type HabitLogRowLite = {
  habit_id: string
  client_id: string
  log_date: string
}

export type HabitDayStripCell = {
  day_of_week: number
  has_slot: boolean
  done: boolean
  completed: number
  expected: number
}

type SourceDataWithTz = {
  clientTimezone: string
  wellnessByYmd: Map<string, WellnessLogDay>
  workoutCompletedYmds: Set<string>
}

/** Single habit × day (coach client view + tests). */
export function isClientHabitCompleteOnDay(
  habit: ClientHabitWithTemplate,
  ymd: string,
  sourceData: SourceDataWithTz,
  logDateKeys: Set<string>
): boolean {
  const st = habit.template.source_type
  if (STUB_SOURCE_TYPES.has(st) || st === 'manual') {
    return logDateKeys.has(`${habit.id}|${ymd}`)
  }
  const d = deriveCompletion(habit, ymd, {
    clientTimezone: sourceData.clientTimezone,
    wellnessByYmd: sourceData.wellnessByYmd,
    workoutCompletedYmds: sourceData.workoutCompletedYmds,
  })
  return Boolean(d?.done)
}

/** Build log presence set keys `habitId|ymd` for this client. */
export function buildHabitLogKeySet(
  logs: HabitLogRowLite[],
  clientId: string,
  habitIds: Set<string>
): Map<string, Set<string>> {
  const byHabit = new Map<string, Set<string>>()
  for (const lg of logs) {
    if (lg.client_id !== clientId || !habitIds.has(lg.habit_id)) continue
    const set = byHabit.get(lg.habit_id) ?? new Set<string>()
    set.add(`${lg.habit_id}|${lg.log_date}`)
    byHabit.set(lg.habit_id, set)
  }
  return byHabit
}

export function parseHabitsJoinedRows(rows: unknown[]): ClientHabitWithTemplate[] {
  const out: ClientHabitWithTemplate[] = []
  for (const r of rows) {
    const h = normalizeHabitRow(r as Record<string, unknown>)
    if (h) out.push(h)
  }
  return out
}

export function wellnessRowsToMap(rows: WellnessLogDay[]): Map<string, WellnessLogDay> {
  const m = new Map<string, WellnessLogDay>()
  for (const r of rows) {
    if (r.log_date) m.set(r.log_date, r)
  }
  return m
}

/**
 * One row per calendar day: done if any active habit completed that day (auto or log).
 * expected = 1 per day when client has ≥1 active habit; habit_week_score = doneDays/7*100.
 */
export function computeHabitsWeekFromTemplates(
  clientId: string,
  weekStartMonYmd: string,
  clientTz: string,
  habitsAll: ClientHabitWithTemplate[],
  habitLogs: HabitLogRowLite[],
  wellnessRowsForClient: WellnessLogDay[],
  workoutRowsForClient: { completed_at: string | null }[]
): {
  habit_adherence: number
  habit_assigned_required: number
  habit_completed_required: number
  habit_day_strip: HabitDayStripCell[]
  habit_week_score: number | null
} {
  const habits = habitsAll.filter((h) => h.client_id === clientId && h.is_active !== false)
  const weekEnd = addCalendarDaysYmd(weekStartMonYmd, 6)
  const habitIds = new Set(habits.map((h) => h.id))
  const logsInWeek = habitLogs.filter(
    (lg) =>
      lg.client_id === clientId &&
      habitIds.has(lg.habit_id) &&
      lg.log_date >= weekStartMonYmd &&
      lg.log_date <= weekEnd
  )
  const logKeyByHabit = buildHabitLogKeySet(logsInWeek, clientId, habitIds)

  const wellnessInWeek = wellnessRowsForClient.filter(
    (w) => w.log_date >= weekStartMonYmd && w.log_date <= weekEnd
  )
  const wellnessByYmd = wellnessRowsToMap(wellnessInWeek)
  const workoutCompletedYmds = workoutLogsToCompletedYmds(workoutRowsForClient, clientTz)
  const sourceData: SourceDataWithTz = {
    clientTimezone: clientTz,
    wellnessByYmd,
    workoutCompletedYmds,
  }

  if (habits.length === 0) {
    const strip: HabitDayStripCell[] = []
    for (let dow = 0; dow < 7; dow++) {
      strip.push({
        day_of_week: dow,
        has_slot: false,
        done: false,
        completed: 0,
        expected: 0,
      })
    }
    return {
      habit_adherence: 0,
      habit_assigned_required: 0,
      habit_completed_required: 0,
      habit_day_strip: strip,
      habit_week_score: null,
    }
  }

  const strip: HabitDayStripCell[] = []
  let doneDays = 0
  for (let dow = 0; dow < 7; dow++) {
    const ymd = addCalendarDaysYmd(weekStartMonYmd, dow)
    let done = false
    for (const h of habits) {
      const keys = logKeyByHabit.get(h.id) ?? new Set<string>()
      if (isClientHabitCompleteOnDay(h, ymd, sourceData, keys)) {
        done = true
        break
      }
    }
    if (done) doneDays += 1
    strip.push({
      day_of_week: dow,
      has_slot: true,
      done,
      completed: done ? 1 : 0,
      expected: 1,
    })
  }

  const habit_week_score = Math.round((doneDays / 7) * 100)
  return {
    habit_adherence: habit_week_score,
    habit_assigned_required: 7,
    habit_completed_required: doneDays,
    habit_day_strip: strip,
    habit_week_score,
  }
}
