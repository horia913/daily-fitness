/**
 * Pure calendar-week (Mon–Sun) program window math — Phase 1 corrected.
 * No React, no Supabase — data in, results out.
 *
 * program_day convention (confirmed in codebase): Monday = 1 … Sunday = 7
 * (TrainHeroCard, adherence programDayFromLocalYmd, day_of_week+1 mapping).
 *
 * Pause semantics: fixed Mon–Sun windows anchored to start_date; position is
 * retarded via effective-today (today − accumulatedDays; freeze at paused_at
 * while pause_status === 'paused'). Program end Sunday extends by accumulatedDays.
 */

import {
  addCalendarDaysYmd,
  normalizeClientTimezone,
  weekdayMon0Sun6InTimezone,
  zonedCalendarDateString,
  zonedDayInclusiveUtcBounds,
  zonedYmdFromIsoTimestamp,
} from '@/lib/clientZonedCalendar'

export type WorkoutStatus =
  | 'completed'
  | 'missed'
  | 'due-today'
  | 'upcoming'
  | 'out-of-scope'

export type PauseState = {
  accumulatedDays?: number | null
  pauseStatus?: string | null
  /** ISO timestamp when currently paused */
  pausedAt?: string | null
}

export type ProgramWeekWindow = {
  weekNumber: number
  /** Monday YYYY-MM-DD of this program week (client TZ calendar) */
  mondayStart: string
  /** Sunday YYYY-MM-DD of this program week (inclusive) */
  sundayEnd: string
}

export type WorkoutRef = {
  id?: string
  weekNumber: number
  /** 1 = Monday … 7 = Sunday */
  programDay: number
  isDone: boolean
}

export type CompletionMath = {
  inScopeTotal: number
  inScopeDone: number
  /** 0–100, integer percent; 0 when inScopeTotal === 0 */
  completionPct: number
}

function ymd(raw: string): string {
  const t = raw.trim()
  return t.length >= 10 ? t.slice(0, 10) : t
}

function accumDays(pauses?: PauseState | null): number {
  return Math.max(0, Number(pauses?.accumulatedDays) || 0)
}

/** Monday YYYY-MM-DD of the calendar week containing civil date `dateYmd` in `timeZone`. */
export function mondayYmdContainingDate(dateYmd: string, timeZone: string): string {
  const tz = normalizeClientTimezone(timeZone)
  const day = ymd(dateYmd)
  const { startIso } = zonedDayInclusiveUtcBounds(day, tz)
  const instant = new Date(startIso)
  const dow = weekdayMon0Sun6InTimezone(instant, tz)
  const civil = zonedCalendarDateString(instant, tz)
  return addCalendarDaysYmd(civil, -dow)
}

/**
 * Program Week 1 = Mon–Sun calendar week containing start_date (client TZ).
 * Week N = Nth consecutive Mon–Sun week after that.
 *
 * Windows are anchored to the real calendar (not shifted). Pause adjusts
 * effective-today / program-end instead — see getEffectiveToday / getProgramEnd.
 * `pauses` is accepted for API symmetry with callers that always pass it.
 */
export function getProgramWeekWindows(
  startDate: string,
  totalWeeks: number,
  timeZone: string,
  _pauses?: PauseState | null,
): ProgramWeekWindow[] {
  const start = ymd(startDate)
  const n = Math.max(0, Math.floor(Number(totalWeeks) || 0))
  if (!start || n <= 0) return []

  const week1Monday = mondayYmdContainingDate(start, timeZone)
  const windows: ProgramWeekWindow[] = []
  for (let weekNumber = 1; weekNumber <= n; weekNumber++) {
    const mondayStart = addCalendarDaysYmd(week1Monday, (weekNumber - 1) * 7)
    const sundayEnd = addCalendarDaysYmd(mondayStart, 6)
    windows.push({ weekNumber, mondayStart, sundayEnd })
  }
  return windows
}

/**
 * Calendar date for (week N, program_day D) = that week's Monday + (D − 1).
 * program_day: 1=Mon … 7=Sun.
 */
export function getWorkoutDate(
  weekNumber: number,
  programDay: number,
  windows: ProgramWeekWindow[],
): string | null {
  const w = windows.find((x) => x.weekNumber === weekNumber)
  if (!w) return null
  const d = Math.floor(Number(programDay) || 0)
  if (d < 1 || d > 7) return null
  return addCalendarDaysYmd(w.mondayStart, d - 1)
}

/**
 * Effective today for status / current-week:
 * - while paused: freeze at paused_at (client-local YMD)
 * - then subtract closed pause_accumulated_days
 * so paused time does not advance the client through weeks/days.
 */
export function getEffectiveToday(
  actualTodayYmd: string,
  timeZone: string,
  pauses?: PauseState | null,
): string {
  const tz = normalizeClientTimezone(timeZone)
  let t = ymd(actualTodayYmd)
  if (pauses?.pauseStatus === 'paused' && pauses.pausedAt) {
    const pausedYmd = zonedYmdFromIsoTimestamp(pauses.pausedAt, tz)
    if (t > pausedYmd) t = pausedYmd
  }
  const back = accumDays(pauses)
  return back > 0 ? addCalendarDaysYmd(t, -back) : t
}

/** Week-1 pre-start exclusion: workout calendar date before assignment start_date. */
export function isInScope(workoutDate: string, startDate: string): boolean {
  return ymd(workoutDate) >= ymd(startDate)
}

export function getCurrentProgramWeek(
  windows: ProgramWeekWindow[],
  effectiveTodayYmd: string,
): ProgramWeekWindow | null {
  const t = ymd(effectiveTodayYmd)
  if (!windows.length) return null
  const hit = windows.find((w) => t >= w.mondayStart && t <= w.sundayEnd)
  return hit ?? null
}

export function getWorkoutStatus(
  workout: { weekNumber: number; programDay: number; isDone: boolean },
  windows: ProgramWeekWindow[],
  startDate: string,
  effectiveTodayYmd: string,
): WorkoutStatus {
  const date = getWorkoutDate(workout.weekNumber, workout.programDay, windows)
  if (!date) return 'upcoming'
  if (!isInScope(date, startDate)) return 'out-of-scope'

  const today = ymd(effectiveTodayYmd)
  if (workout.isDone) return 'completed'
  if (date < today) return 'missed'
  if (date === today) return 'due-today'
  return 'upcoming'
}

function workoutSortKey(a: WorkoutRef, b: WorkoutRef): number {
  if (a.weekNumber !== b.weekNumber) return a.weekNumber - b.weekNumber
  if (a.programDay !== b.programDay) return a.programDay - b.programDay
  return String(a.id ?? '').localeCompare(String(b.id ?? ''))
}

/**
 * Next-due = earliest in-scope incomplete with calendar date >= effectiveToday.
 * Missed incompletes are not next-due (null if nothing today-or-future remains).
 */
export function getNextDue(
  workouts: WorkoutRef[],
  windows: ProgramWeekWindow[],
  startDate: string,
  effectiveTodayYmd: string,
): WorkoutRef | null {
  const today = ymd(effectiveTodayYmd)
  const candidates: Array<WorkoutRef & { date: string }> = []
  for (const w of workouts) {
    if (w.isDone) continue
    const date = getWorkoutDate(w.weekNumber, w.programDay, windows)
    if (!date || !isInScope(date, startDate)) continue
    if (date < today) continue
    candidates.push({ ...w, date })
  }
  candidates.sort((a, b) => {
    const byDate = a.date.localeCompare(b.date)
    if (byDate !== 0) return byDate
    return workoutSortKey(a, b)
  })
  if (!candidates.length) return null
  const { date: _d, ...rest } = candidates[0]
  return rest
}

/**
 * Sunday of Program Week [totalWeeks], then + accumulated pause days
 * (calendar YMD of that end day; conceptual end-of-day is 23:59:59 client TZ).
 */
export function getProgramEnd(
  startDate: string,
  totalWeeks: number,
  timeZone: string,
  pauses?: PauseState | null,
): string | null {
  const windows = getProgramWeekWindows(startDate, totalWeeks, timeZone, pauses)
  if (!windows.length) return null
  const last = windows[windows.length - 1]
  const sunday = last.sundayEnd
  const extra = accumDays(pauses)
  return extra > 0 ? addCalendarDaysYmd(sunday, extra) : sunday
}

/**
 * Completion math: out-of-scope excluded from numerator and denominator.
 * Pass only workouts you have already classified as in-scope, OR pass all
 * with dates/start so this filters — here we take pre-filtered in-scope list.
 */
export function getCompletionMath(
  inScopeWorkouts: Array<{ isDone: boolean }>,
): CompletionMath {
  const inScopeTotal = inScopeWorkouts.length
  const inScopeDone = inScopeWorkouts.filter((w) => w.isDone).length
  const completionPct =
    inScopeTotal === 0 ? 0 : Math.round((inScopeDone / inScopeTotal) * 100)
  return { inScopeTotal, inScopeDone, completionPct }
}

/** Convenience: classify workouts then compute completion math. */
export function getCompletionMathFromWorkouts(
  workouts: WorkoutRef[],
  windows: ProgramWeekWindow[],
  startDate: string,
): CompletionMath {
  const inScope: Array<{ isDone: boolean }> = []
  for (const w of workouts) {
    const date = getWorkoutDate(w.weekNumber, w.programDay, windows)
    if (!date || !isInScope(date, startDate)) continue
    inScope.push({ isDone: w.isDone })
  }
  return getCompletionMath(inScope)
}
