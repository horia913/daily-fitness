/**
 * Shared next-due resolution for Train, Home, and other surfaces.
 * Pure — no Supabase. Callers load assignment/slots/completions and pass them in.
 *
 * Identical foundation path: windows + effectiveToday + getNextDue.
 */

import { zonedCalendarDateString } from '@/lib/clientZonedCalendar'
import {
  getEffectiveToday,
  getNextDue,
  getProgramWeekWindows,
  type PauseState,
  type ProgramWeekWindow,
  type WorkoutRef,
} from '@/lib/progression/weekWindows'

export type ResolveNextDueInput = {
  startDate: string | null | undefined
  totalWeeks: number
  timeZone: string
  pauses: PauseState
  /** In-scope program workouts (weekNumber, programDay 1=Mon…7=Sun, isDone). */
  workouts: WorkoutRef[]
  /** Override for tests; defaults to zoned calendar today in timeZone. */
  actualTodayYmd?: string
  now?: Date
}

export type ResolveNextDueResult = {
  nextDue: WorkoutRef | null
  windows: ProgramWeekWindow[]
  effectiveToday: string
}

function ymdSlice(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null
  const t = raw.trim()
  if (!t) return null
  return t.length >= 10 ? t.slice(0, 10) : t
}

/**
 * Compute foundation next-due for an assignment.
 * Returns nextDue = null when start/totalWeeks missing or nothing today-or-future remains.
 */
export function resolveNextDue(input: ResolveNextDueInput): ResolveNextDueResult {
  const startDate = ymdSlice(input.startDate)
  const totalWeeks = Math.max(0, Math.floor(Number(input.totalWeeks) || 0))
  const timeZone = input.timeZone?.trim() || 'UTC'
  const pauses = input.pauses ?? {}

  const todayYmd =
    input.actualTodayYmd?.trim() ||
    zonedCalendarDateString(input.now ?? new Date(), timeZone)
  const effectiveToday = getEffectiveToday(todayYmd, timeZone, pauses)

  if (!startDate || totalWeeks <= 0) {
    return { nextDue: null, windows: [], effectiveToday }
  }

  const windows = getProgramWeekWindows(startDate, totalWeeks, timeZone, pauses)
  const nextDue = getNextDue(input.workouts, windows, startDate, effectiveToday)
  return { nextDue, windows, effectiveToday }
}
