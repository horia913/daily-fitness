/**
 * Pure foundation-based calendar adherence day builder.
 * Places PDAs by getWorkoutDate / isInScope (Mon–Sun weekWindows), not
 * computeCurrentProgramWeek. Output shape matches WorkoutAdherenceDay.
 */

import { isCoachSkipNote } from '@/lib/programInstanceResolver'
import {
  getProgramWeekWindows,
  getWorkoutDate,
  isInScope,
  type PauseState,
} from '@/lib/progression/weekWindows'
import {
  addCalendarDaysYmd,
  normalizeClientTimezone,
} from '@/lib/clientZonedCalendar'

export type FoundationAdherenceDay = {
  date: string
  scheduled: number
  completed: number
  /** 0–1 when scheduled > 0 (or credited extra); null when nothing scheduled and no credit */
  value: number | null
}

export type FoundationAdherenceAssignment = {
  start_date: string | null
  pause_accumulated_days?: number | null
  pause_status?: string | null
  paused_at?: string | null
  /** Cap for getProgramWeekWindows; must be > 0 or no slots index. */
  totalWeeks: number
}

export type FoundationAdherenceSlot = {
  id: string
  week_number: number
  program_day: number | null
  is_optional: boolean | null
}

export type FoundationAdherenceCompletion = {
  program_day_assignment_id: string | null
  notes: string | null
}

function eachYmd(start: string, end: string): string[] {
  const out: string[] = []
  for (let ymd = start; ymd <= end; ymd = addCalendarDaysYmd(ymd, 1)) {
    out.push(ymd)
  }
  return out
}

export type BuildFoundationAdherenceDaysInput = {
  range: { startYmd: string; endYmd: string }
  assignment: FoundationAdherenceAssignment
  slots: FoundationAdherenceSlot[]
  completions: FoundationAdherenceCompletion[]
  /** Countable unscheduled logs keyed by local YMD. */
  extrasByDate: Map<string, number>
  tz: string
}

/**
 * Build adherence days for one assignment over [startYmd, endYmd].
 * Out-of-scope / pre-start slots are omitted from the index → scheduled=0.
 */
export function buildFoundationAdherenceDays(
  input: BuildFoundationAdherenceDaysInput,
): FoundationAdherenceDay[] {
  const { range, assignment, slots, completions, extrasByDate, tz } = input
  const timeZone = normalizeClientTimezone(tz) || 'UTC'
  const startDate = (assignment.start_date ?? '').slice(0, 10)

  const pauses: PauseState = {
    accumulatedDays: assignment.pause_accumulated_days,
    pauseStatus: assignment.pause_status,
    pausedAt: assignment.paused_at,
  }

  const windows =
    startDate && assignment.totalWeeks > 0
      ? getProgramWeekWindows(startDate, assignment.totalWeeks, timeZone, pauses)
      : []

  const skippedIds = new Set(
    completions
      .filter((c) => isCoachSkipNote(c.notes) && c.program_day_assignment_id)
      .map((c) => c.program_day_assignment_id as string),
  )

  /** YMD → required in-scope slot ids */
  const slotsByDate = new Map<string, string[]>()
  if (windows.length > 0 && startDate) {
    for (const s of slots) {
      if (s.is_optional) continue
      if (skippedIds.has(s.id)) continue
      const programDay = s.program_day
      if (programDay == null || programDay < 1 || programDay > 7) continue
      const date = getWorkoutDate(s.week_number, programDay, windows)
      if (!date || !isInScope(date, startDate)) continue
      const list = slotsByDate.get(date) ?? []
      list.push(s.id)
      slotsByDate.set(date, list)
    }
  }

  const donePdaIds = new Set(
    completions
      .filter(
        (c) =>
          !isCoachSkipNote(c.notes) && Boolean(c.program_day_assignment_id),
      )
      .map((c) => c.program_day_assignment_id as string),
  )

  const days: FoundationAdherenceDay[] = []
  for (const ymd of eachYmd(range.startYmd, range.endYmd)) {
    const daySlotIds = slotsByDate.get(ymd) ?? []
    let scheduled = daySlotIds.length
    let completed = 0
    if (scheduled > 0) {
      const requiredIds = new Set(daySlotIds)
      for (const id of requiredIds) {
        if (donePdaIds.has(id)) completed += 1
      }
    }

    const extras = extrasByDate.get(ymd) ?? 0
    let value: number | null = null
    if (scheduled > 0) {
      value = Math.min(1, completed / scheduled)
    } else if (extras > 0) {
      completed = extras
      value = 1
    }

    days.push({ date: ymd, scheduled, completed, value })
  }

  return days
}

/** Prefer phase sum; else max PDA week_number (at least 1 if any slots). */
export function resolveAdherenceTotalWeeks(
  phaseTotalWeeks: number,
  slots: Array<{ week_number: number }>,
): number {
  if (phaseTotalWeeks > 0) return phaseTotalWeeks
  let max = 0
  for (const s of slots) {
    const w = Number(s.week_number)
    if (Number.isFinite(w) && w > max) max = Math.floor(w)
  }
  return max
}
