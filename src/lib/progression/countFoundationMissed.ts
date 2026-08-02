/**
 * Foundation missed / behind helpers for coach status.
 * Completions credit the SCHEDULED slot (isDone = any completion on that PDA),
 * not the completion calendar week.
 */

import {
  getCurrentProgramWeek,
  getEffectiveToday,
  getProgramWeekWindows,
  getWorkoutDate,
  getWorkoutStatus,
  isInScope,
  type PauseState,
} from '@/lib/progression/weekWindows'
import { normalizeClientTimezone } from '@/lib/clientZonedCalendar'
import { isCoachSkipNote } from '@/lib/programInstanceResolver'

export type FoundationMissedSlot = {
  id: string
  week_number: number
  program_day: number | null
  is_optional?: boolean | null
  day_type?: string | null
}

export type FoundationMissedCompletion = {
  program_day_assignment_id: string | null
  notes: string | null
}

export type FoundationMissedAssignment = {
  start_date: string | null
  pause_accumulated_days?: number | null
  pause_status?: string | null
  paused_at?: string | null
  totalWeeks: number
}

export type FoundationWeekBucket = {
  weekNumber: number
  mondayStart: string
  sundayEnd: string
  /** In-scope required slots in this week */
  scheduled: number
  /** Those slots with a non-skip completion (any time) */
  completed: number
  /** In-scope required slots with status === missed */
  missed: number
  /** True when week is fully past (all in-scope slot dates < effectiveToday) */
  isFullyPast: boolean
}

export type CountFoundationMissedResult = {
  missedCount: number
  hasMissed: boolean
  missedWeekNumbers: number[]
  /** Past program weeks with in-scope scheduled > 0 and completed === 0 */
  fullyMissedPastWeekNumbers: number[]
  hasFullyMissedPastWeek: boolean
  effectiveTodayYmd: string
  currentWeekNumber: number | null
  /** Compat counts for list UI / optimistic resume (foundation placement) */
  priorWeekScheduledCount: number
  priorWeekCompletedCount: number
  currentWeekScheduledPastCount: number
  currentWeekCompletedCount: number
  weeks: FoundationWeekBucket[]
}

function isRequiredSlot(s: FoundationMissedSlot): boolean {
  if (s.is_optional) return false
  if ((s.day_type ?? '').toLowerCase() === 'rest') return false
  const pd = s.program_day
  return pd != null && pd >= 1 && pd <= 7
}

/**
 * Count in-scope missed workouts and fully-unattempted past weeks.
 */
export function countFoundationMissed(input: {
  assignment: FoundationMissedAssignment
  slots: FoundationMissedSlot[]
  completions: FoundationMissedCompletion[]
  wallTodayYmd: string
  tz: string
}): CountFoundationMissedResult {
  const empty: CountFoundationMissedResult = {
    missedCount: 0,
    hasMissed: false,
    missedWeekNumbers: [],
    fullyMissedPastWeekNumbers: [],
    hasFullyMissedPastWeek: false,
    effectiveTodayYmd: input.wallTodayYmd,
    currentWeekNumber: null,
    priorWeekScheduledCount: 0,
    priorWeekCompletedCount: 0,
    currentWeekScheduledPastCount: 0,
    currentWeekCompletedCount: 0,
    weeks: [],
  }

  const startDate = (input.assignment.start_date ?? '').slice(0, 10)
  if (!startDate || input.assignment.totalWeeks <= 0) return empty

  const timeZone = normalizeClientTimezone(input.tz) || 'UTC'
  const pauses: PauseState = {
    accumulatedDays: input.assignment.pause_accumulated_days,
    pauseStatus: input.assignment.pause_status,
    pausedAt: input.assignment.paused_at,
  }

  const windows = getProgramWeekWindows(
    startDate,
    input.assignment.totalWeeks,
    timeZone,
    pauses,
  )
  if (windows.length === 0) return empty

  const effectiveTodayYmd = getEffectiveToday(
    input.wallTodayYmd,
    timeZone,
    pauses,
  )

  const skippedIds = new Set(
    input.completions
      .filter((c) => isCoachSkipNote(c.notes) && c.program_day_assignment_id)
      .map((c) => c.program_day_assignment_id as string),
  )

  const doneIds = new Set(
    input.completions
      .filter(
        (c) =>
          !isCoachSkipNote(c.notes) && Boolean(c.program_day_assignment_id),
      )
      .map((c) => c.program_day_assignment_id as string),
  )

  type SlotEval = {
    id: string
    weekNumber: number
    programDay: number
    date: string
    isDone: boolean
    status: ReturnType<typeof getWorkoutStatus>
  }

  const evaluated: SlotEval[] = []
  for (const s of input.slots) {
    if (!isRequiredSlot(s)) continue
    if (skippedIds.has(s.id)) continue
    const programDay = s.program_day as number
    const date = getWorkoutDate(s.week_number, programDay, windows)
    if (!date || !isInScope(date, startDate)) continue
    const isDone = doneIds.has(s.id)
    const status = getWorkoutStatus(
      { weekNumber: s.week_number, programDay, isDone },
      windows,
      startDate,
      effectiveTodayYmd,
    )
    evaluated.push({
      id: s.id,
      weekNumber: s.week_number,
      programDay,
      date,
      isDone,
      status,
    })
  }

  const missedSlots = evaluated.filter((e) => e.status === 'missed')
  const missedWeekNumbers = [
    ...new Set(missedSlots.map((e) => e.weekNumber)),
  ].sort((a, b) => a - b)

  const weeks: FoundationWeekBucket[] = []
  for (const w of windows) {
    const inWeek = evaluated.filter((e) => e.weekNumber === w.weekNumber)
    if (inWeek.length === 0) continue
    const scheduled = inWeek.length
    const completed = inWeek.filter((e) => e.isDone).length
    const missed = inWeek.filter((e) => e.status === 'missed').length
    const isFullyPast = inWeek.every((e) => e.date < effectiveTodayYmd)
    weeks.push({
      weekNumber: w.weekNumber,
      mondayStart: w.mondayStart,
      sundayEnd: w.sundayEnd,
      scheduled,
      completed,
      missed,
      isFullyPast,
    })
  }

  const fullyMissedPastWeekNumbers = weeks
    .filter((w) => w.isFullyPast && w.scheduled > 0 && w.completed === 0)
    .map((w) => w.weekNumber)

  const currentWin = getCurrentProgramWeek(windows, effectiveTodayYmd)
  const currentWeekNumber = currentWin?.weekNumber ?? null
  const priorWeekNumber =
    currentWeekNumber != null && currentWeekNumber > 1
      ? currentWeekNumber - 1
      : null

  const currentBucket = weeks.find((w) => w.weekNumber === currentWeekNumber)
  const priorBucket = weeks.find((w) => w.weekNumber === priorWeekNumber)

  // Current-week "past scheduled" = in-scope slots in current week with date < effectiveToday
  let currentWeekScheduledPastCount = 0
  let currentWeekCompletedCount = 0
  if (currentWeekNumber != null) {
    const pastInCurrent = evaluated.filter(
      (e) =>
        e.weekNumber === currentWeekNumber && e.date < effectiveTodayYmd,
    )
    currentWeekScheduledPastCount = pastInCurrent.length
    currentWeekCompletedCount = pastInCurrent.filter((e) => e.isDone).length
  }

  return {
    missedCount: missedSlots.length,
    hasMissed: missedSlots.length > 0,
    missedWeekNumbers,
    fullyMissedPastWeekNumbers,
    hasFullyMissedPastWeek: fullyMissedPastWeekNumbers.length > 0,
    effectiveTodayYmd,
    currentWeekNumber,
    priorWeekScheduledCount: priorBucket?.scheduled ?? 0,
    priorWeekCompletedCount: priorBucket?.completed ?? 0,
    currentWeekScheduledPastCount,
    currentWeekCompletedCount,
    weeks,
  }
}
