/**
 * Lifetime program completion % (in-scope done / in-scope total).
 * ONE formula for coach "% Progress" / "% complete" surfaces.
 * Completions credit the scheduled PDA (any non-skip completion), not calendar week.
 */

import { isCoachSkipNote } from '@/lib/programInstanceResolver'
import { normalizeClientTimezone } from '@/lib/clientZonedCalendar'
import {
  getCompletionMathFromWorkouts,
  getProgramWeekWindows,
  type CompletionMath,
  type PauseState,
  type WorkoutRef,
} from '@/lib/progression/weekWindows'

export type FoundationCompletionAssignment = {
  start_date: string | null
  pause_accumulated_days?: number | null
  pause_status?: string | null
  paused_at?: string | null
  totalWeeks: number
}

export type FoundationCompletionSlot = {
  id: string
  week_number: number
  program_day: number | null
  is_optional?: boolean | null
  day_type?: string | null
}

export type FoundationCompletionCompletion = {
  program_day_assignment_id: string | null
  notes: string | null
}

export type ResolveFoundationCompletionInput = {
  assignment: FoundationCompletionAssignment
  slots: FoundationCompletionSlot[]
  completions: FoundationCompletionCompletion[]
  tz: string
}

const EMPTY: CompletionMath = {
  inScopeTotal: 0,
  inScopeDone: 0,
  completionPct: 0,
}

function isRequiredSlot(s: FoundationCompletionSlot): boolean {
  if (s.is_optional) return false
  if ((s.day_type ?? '').toLowerCase() === 'rest') return false
  const pd = s.program_day
  return pd != null && pd >= 1 && pd <= 7
}

/**
 * Lifetime in-scope completion for an assignment.
 * Skipped (coach-skip) and optional/rest slots are excluded from the refs;
 * getCompletionMathFromWorkouts further drops out-of-scope / pre-start dates.
 */
export function resolveFoundationCompletion(
  input: ResolveFoundationCompletionInput,
): CompletionMath {
  const startDate = (input.assignment.start_date ?? '').slice(0, 10)
  if (!startDate || input.assignment.totalWeeks <= 0) return EMPTY

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
  if (windows.length === 0) return EMPTY

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

  const refs: WorkoutRef[] = []
  for (const s of input.slots) {
    if (!isRequiredSlot(s)) continue
    if (skippedIds.has(s.id)) continue
    refs.push({
      id: s.id,
      weekNumber: s.week_number,
      programDay: s.program_day as number,
      isDone: doneIds.has(s.id),
    })
  }

  return getCompletionMathFromWorkouts(refs, windows, startDate)
}
