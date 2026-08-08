/**
 * Client-mode Station progress coloring (done / missed / current / upcoming).
 * Built on foundation week windows + getWorkoutStatus / countFoundationMissed.
 * Master mode never loads this.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { zonedCalendarDateString } from '@/lib/clientZonedCalendar'
import { isCoachSkipNote, instanceTotalWeeks } from '@/lib/programInstanceResolver'
import { loadInstancePhases } from '@/lib/programInstance/instanceCanvasLoad'
import { countFoundationMissed } from '@/lib/progression/countFoundationMissed'
import {
  getEffectiveToday,
  getProgramWeekWindows,
  getWorkoutStatus,
  type PauseState,
  type WorkoutStatus,
} from '@/lib/progression/weekWindows'
import { normalizeClientTimezone } from '@/lib/clientZonedCalendar'
import { loadFoundationWeekForAssignment } from '@/lib/progression/resolveFoundationWeek'
import type { PastWeekLockSnapshot } from '@/lib/programInstance/instancePastWeekLock'

/** Coach-facing progress status for Station coloring. */
export type ClientProgressStatus = 'done' | 'missed' | 'current' | 'upcoming'

export type ClientProgressSnapshot = {
  foundationWeek: number
  effectiveTodayYmd: string
  weekStatus: ReadonlyMap<number, ClientProgressStatus>
  /** Key: `${weekNumber}:${programDay}` (1–7). Rest / empty days omitted or upcoming. */
  dayStatus: ReadonlyMap<string, ClientProgressStatus>
}

export const CLIENT_PROGRESS_STATUS_LABEL: Record<ClientProgressStatus, string> = {
  done: 'Done',
  missed: 'Missed',
  current: 'Current',
  upcoming: 'Upcoming',
}

export function clientProgressDayKey(week: number, programDay: number): string {
  return `${week}:${programDay}`
}

function mapWorkoutStatusToProgress(
  status: WorkoutStatus,
): ClientProgressStatus {
  if (status === 'completed') return 'done'
  if (status === 'missed') return 'missed'
  if (status === 'due-today') return 'current'
  return 'upcoming'
}

/**
 * Derive week-level progress from foundation missed buckets.
 * Current week always "current"; fully completed past weeks "done";
 * past weeks with incomplete required work "missed"; else "upcoming".
 */
export function deriveWeekProgressStatus(
  foundationWeek: number,
  bucket: {
    weekNumber: number
    scheduled: number
    completed: number
    missed: number
    isFullyPast: boolean
  } | undefined,
): ClientProgressStatus {
  if (bucket?.weekNumber === foundationWeek || foundationWeek === bucket?.weekNumber) {
    // handled below with explicit week number
  }
  return 'upcoming'
}

export function weekProgressFromBucket(
  weekNumber: number,
  foundationWeek: number,
  bucket:
    | {
        scheduled: number
        completed: number
        missed: number
        isFullyPast: boolean
      }
    | undefined,
): ClientProgressStatus {
  if (weekNumber === foundationWeek) return 'current'
  if (!bucket || bucket.scheduled === 0) {
    // Past empty week → neutral; future empty → upcoming
    if (weekNumber < foundationWeek) return 'upcoming'
    return 'upcoming'
  }
  if (weekNumber > foundationWeek) return 'upcoming'
  // Past week with required sessions
  if (bucket.completed >= bucket.scheduled && bucket.scheduled > 0) return 'done'
  if (bucket.missed > 0 || bucket.completed < bucket.scheduled) return 'missed'
  return 'upcoming'
}

/**
 * Load lock + progress in one round-trip (shared assignment / PDA / completions).
 */
export async function loadClientInstanceEditorContext(
  supabase: SupabaseClient,
  assignmentId: string,
): Promise<{ lock: PastWeekLockSnapshot; progress: ClientProgressSnapshot } | null> {
  const { data: assignment, error: assignErr } = await supabase
    .from('program_assignments')
    .select(
      'id, client_id, start_date, pause_accumulated_days, pause_status, paused_at, timezone_snapshot',
    )
    .eq('id', assignmentId)
    .maybeSingle()

  if (assignErr || !assignment?.id) {
    console.error('[loadClientInstanceEditorContext] assignment:', assignErr?.message)
    return null
  }

  const phases = await loadInstancePhases(supabase, assignmentId)
  const totalWeeks = instanceTotalWeeks(phases)

  const foundation = await loadFoundationWeekForAssignment(
    supabase,
    {
      id: assignment.id,
      client_id: assignment.client_id,
      start_date: assignment.start_date,
      pause_accumulated_days: assignment.pause_accumulated_days,
      pause_status: assignment.pause_status,
      paused_at: assignment.paused_at,
      timezone_snapshot: assignment.timezone_snapshot,
    },
    { totalWeeks: totalWeeks > 0 ? totalWeeks : undefined, includeWeeklyProgress: false },
  )

  if (!foundation?.foundationWeek) return null

  const [{ data: pdas }, { data: comps }] = await Promise.all([
    supabase
      .from('program_day_assignments')
      .select('id, week_number, program_day, is_optional, day_type')
      .eq('program_assignment_id', assignmentId),
    supabase
      .from('program_day_completions')
      .select('program_day_assignment_id, notes')
      .eq('program_assignment_id', assignmentId),
  ])

  const slots = (pdas ?? []).map((row) => ({
    id: String(row.id),
    week_number: Number(row.week_number) || 1,
    program_day:
      row.program_day == null ? null : Number(row.program_day),
    is_optional: Boolean(row.is_optional),
    day_type: (row.day_type as string | null) ?? null,
  }))

  const completions = (comps ?? []).map((c) => ({
    program_day_assignment_id: c.program_day_assignment_id as string | null,
    notes: c.notes as string | null,
  }))

  const weekByPda = new Map<string, number>()
  for (const s of slots) weekByPda.set(s.id, s.week_number)

  const weeksWithCompletions = new Set<number>()
  for (const c of completions) {
    if (isCoachSkipNote(c.notes)) continue
    if (!c.program_day_assignment_id) continue
    const week = weekByPda.get(c.program_day_assignment_id)
    if (week != null) weeksWithCompletions.add(week)
  }

  const foundationWeek = foundation.foundationWeek
  const lockedWeeks = new Set<number>()
  for (const week of weeksWithCompletions) {
    if (week !== foundationWeek) lockedWeeks.add(week)
  }

  const lock: PastWeekLockSnapshot = {
    foundationWeek,
    weeksWithCompletions,
    lockedWeeks,
    currentWeekHasCompletions: weeksWithCompletions.has(foundationWeek),
  }

  const tz =
    normalizeClientTimezone(assignment.timezone_snapshot) ||
    foundation.timeZone ||
    'UTC'
  const wallTodayYmd = zonedCalendarDateString(new Date(), tz)

  const missed = countFoundationMissed({
    assignment: {
      start_date: assignment.start_date,
      pause_accumulated_days: assignment.pause_accumulated_days,
      pause_status: assignment.pause_status,
      paused_at: assignment.paused_at,
      totalWeeks: totalWeeks > 0 ? totalWeeks : foundation.totalWeeks,
    },
    slots,
    completions,
    wallTodayYmd,
    tz,
  })

  const weekStatus = new Map<number, ClientProgressStatus>()
  const maxWeek = Math.max(
    foundationWeek,
    totalWeeks,
    foundation.totalWeeks,
    ...slots.map((s) => s.week_number),
    0,
  )
  const bucketByWeek = new Map(missed.weeks.map((w) => [w.weekNumber, w]))
  for (let w = 1; w <= maxWeek; w++) {
    weekStatus.set(w, weekProgressFromBucket(w, foundationWeek, bucketByWeek.get(w)))
  }

  // Day-level status via getWorkoutStatus
  const pauses: PauseState = {
    accumulatedDays: assignment.pause_accumulated_days,
    pauseStatus: assignment.pause_status,
    pausedAt: assignment.paused_at,
  }
  const startDate = (assignment.start_date ?? '').slice(0, 10)
  const windows = startDate
    ? getProgramWeekWindows(
        startDate,
        totalWeeks > 0 ? totalWeeks : foundation.totalWeeks,
        tz,
        pauses,
      )
    : []
  const effectiveTodayYmd = getEffectiveToday(wallTodayYmd, tz, pauses)

  const skippedIds = new Set(
    completions
      .filter((c) => isCoachSkipNote(c.notes) && c.program_day_assignment_id)
      .map((c) => c.program_day_assignment_id as string),
  )
  const doneIds = new Set(
    completions
      .filter((c) => !isCoachSkipNote(c.notes) && c.program_day_assignment_id)
      .map((c) => c.program_day_assignment_id as string),
  )

  const dayStatus = new Map<string, ClientProgressStatus>()
  for (const s of slots) {
    if (s.is_optional) continue
    if ((s.day_type ?? '').toLowerCase() === 'rest') continue
    if (s.program_day == null || s.program_day < 1 || s.program_day > 7) continue
    if (skippedIds.has(s.id)) continue
    const isDone = doneIds.has(s.id)
    const ws = getWorkoutStatus(
      {
        weekNumber: s.week_number,
        programDay: s.program_day,
        isDone,
      },
      windows,
      startDate,
      effectiveTodayYmd,
    )
    dayStatus.set(
      clientProgressDayKey(s.week_number, s.program_day),
      mapWorkoutStatusToProgress(ws),
    )
  }

  const progress: ClientProgressSnapshot = {
    foundationWeek,
    effectiveTodayYmd: missed.effectiveTodayYmd || effectiveTodayYmd,
    weekStatus,
    dayStatus,
  }

  return { lock, progress }
}
