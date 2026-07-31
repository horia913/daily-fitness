import {
  addCalendarDaysYmd,
  diffCalendarDaysYmd,
  mondayYmdOfZonedWeekContaining,
  normalizeClientTimezone,
  weekdayMon0Sun6InTimezone,
  zonedCalendarDateString,
  zonedDayInclusiveUtcBounds,
  zonedYmdFromIsoTimestamp,
} from '@/lib/clientZonedCalendar'

export {
  addCalendarDaysYmd,
  diffCalendarDaysYmd,
  mondayYmdOfZonedWeekContaining,
  normalizeClientTimezone,
  weekdayMon0Sun6InTimezone,
  zonedCalendarDateString,
  zonedDayInclusiveUtcBounds,
  zonedYmdFromIsoTimestamp,
}

export type ComputeCurrentProgramWeekArgs = {
  assignmentStartDate: string | null
  pauseAccumulatedDays: number | null | undefined
  pauseStatus: string | null | undefined
  pausedAt: string | null | undefined
  targetYmd: string
  clientTimezone: string
}

export type AssignmentWeekFields = {
  start_date: string | null
  pause_accumulated_days: number | null
  pause_status: string | null
  paused_at: string | null
  timezone_snapshot: string | null
}

export type ComputeCurrentProgramWeekForAssignmentOptions = {
  targetYmdOverride?: string
  /** N from resolver (instance phases) or master block sum — caps calendar week X. */
  totalWeeksCap?: number | null
}

export function computeCurrentProgramWeek(args: ComputeCurrentProgramWeekArgs): number {
  const startRaw =
    typeof args.assignmentStartDate === 'string' ? args.assignmentStartDate.trim() : ''
  const startYmd = startRaw.length >= 10 ? startRaw.slice(0, 10) : startRaw
  if (!startYmd) return 1

  const pauseAccum = Math.max(0, Number(args.pauseAccumulatedDays) || 0)
  const effectiveStartYmd = addCalendarDaysYmd(startYmd, pauseAccum)
  const pausedYmd =
    args.pauseStatus === 'paused' && args.pausedAt
      ? zonedYmdFromIsoTimestamp(args.pausedAt, args.clientTimezone)
      : null
  const effectiveTargetYmd =
    pausedYmd && args.targetYmd > pausedYmd ? pausedYmd : args.targetYmd
  const elapsed = Math.max(0, diffCalendarDaysYmd(effectiveStartYmd, effectiveTargetYmd))
  return Math.floor(elapsed / 7) + 1
}

// Backward-compatible alias while call sites migrate.
export const computeProgramWeekForCalendarYmd = computeCurrentProgramWeek

export function computeCurrentProgramWeekForAssignment(
  assignment: AssignmentWeekFields,
  clientTimezoneFallback: string,
  options?: string | ComputeCurrentProgramWeekForAssignmentOptions,
): { week: number; clamped: boolean } {
  const opts: ComputeCurrentProgramWeekForAssignmentOptions =
    typeof options === 'string' ? { targetYmdOverride: options } : (options ?? {})

  const tz =
    normalizeClientTimezone(assignment.timezone_snapshot) ||
    normalizeClientTimezone(clientTimezoneFallback) ||
    'UTC'
  const targetYmd = opts.targetYmdOverride ?? zonedCalendarDateString(new Date(), tz)
  const raw = computeCurrentProgramWeek({
    assignmentStartDate: assignment.start_date,
    pauseAccumulatedDays: assignment.pause_accumulated_days,
    pauseStatus: assignment.pause_status,
    pausedAt: assignment.paused_at,
    targetYmd,
    clientTimezone: tz,
  })
  const floored = Math.max(1, raw)
  const capRaw = opts.totalWeeksCap
  const cap =
    typeof capRaw === 'number' && Number.isFinite(capRaw) && capRaw > 0
      ? Math.floor(capRaw)
      : Number.POSITIVE_INFINITY
  if (floored > cap) return { week: cap, clamped: true }
  return { week: floored, clamped: false }
}
