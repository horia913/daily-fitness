/**
 * Foundation Mon–Sun current week for an assignment.
 * Shared by client overwrites and coach surfaces — replaces elapsed÷7
 * (resolveInstanceProgramWeek / get_program_instance_week) for display + this-week adherence.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  normalizeClientTimezone,
  zonedCalendarDateString,
} from '@/lib/clientZonedCalendar'
import { loadInstancePhases } from '@/lib/programInstance/instanceCanvasLoad'
import { instanceTotalWeeks, isCoachSkipNote } from '@/lib/programInstanceResolver'
import {
  computeFoundationWeeklyProgress,
  type FoundationWeeklyProgress,
} from '@/lib/progression/foundationNextDueLoad'
import {
  getCurrentProgramWeek,
  getEffectiveToday,
  getProgramWeekWindows,
  type PauseState,
} from '@/lib/progression/weekWindows'

export type FoundationWeekAssignmentFields = {
  id: string
  client_id?: string | null
  start_date: string | null
  pause_accumulated_days?: number | null
  pause_status?: string | null
  paused_at?: string | null
  timezone_snapshot?: string | null
}

/**
 * Pure: Mon–Sun program week containing effective-today (pause-aware).
 * Returns null when startDate / totalWeeks cannot form windows.
 */
export function resolveFoundationCurrentWeek(input: {
  startDate: string | null | undefined
  totalWeeks: number
  timeZone: string
  pauses?: PauseState | null
  /** Override wall-clock today (YYYY-MM-DD); defaults to now in timeZone. */
  actualTodayYmd?: string
}): number | null {
  const startDate =
    typeof input.startDate === 'string' && input.startDate.trim()
      ? input.startDate.trim().slice(0, 10)
      : ''
  const totalWeeks = Math.max(0, Math.floor(Number(input.totalWeeks) || 0))
  if (!startDate || totalWeeks <= 0) return null

  const tz = normalizeClientTimezone(input.timeZone) || 'UTC'
  const pauses: PauseState = input.pauses ?? {}
  const windows = getProgramWeekWindows(startDate, totalWeeks, tz, pauses)
  if (windows.length === 0) return null

  const wallToday =
    input.actualTodayYmd?.trim().slice(0, 10) ||
    zonedCalendarDateString(new Date(), tz)
  const effectiveTodayYmd = getEffectiveToday(wallToday, tz, pauses)
  const hit = getCurrentProgramWeek(windows, effectiveTodayYmd)
  if (hit) return hit.weekNumber
  if (effectiveTodayYmd < windows[0].mondayStart) return 1
  return windows[windows.length - 1].weekNumber
}

export type LoadFoundationWeekResult = {
  foundationWeek: number
  totalWeeks: number
  timeZone: string
  weeklyProgress: FoundationWeeklyProgress | null
}

/**
 * Load foundation current week (+ optional this-week adherence) for one assignment.
 * Reuses PDA/completions already needed for weekly progress when requested.
 */
export async function loadFoundationWeekForAssignment(
  supabase: SupabaseClient,
  assignment: FoundationWeekAssignmentFields,
  options?: {
    totalWeeks?: number
    /** When true (default), also compute foundation this-week adherence. */
    includeWeeklyProgress?: boolean
    profileTimezone?: string | null
  },
): Promise<LoadFoundationWeekResult | null> {
  const includeProgress = options?.includeWeeklyProgress !== false

  const phasesPromise =
    options?.totalWeeks != null && options.totalWeeks > 0
      ? Promise.resolve(null)
      : loadInstancePhases(supabase, assignment.id)

  const clientId = assignment.client_id ?? null
  const profilePromise =
    options?.profileTimezone != null || !clientId
      ? Promise.resolve(null)
      : supabase.from('profiles').select('timezone').eq('id', clientId).maybeSingle()

  const [phases, profileRes, pdaRes, completionsRes] = await Promise.all([
    phasesPromise,
    profilePromise,
    includeProgress
      ? supabase
          .from('program_day_assignments')
          .select(
            'id, week_number, program_day, workout_template_id, program_instance_workout_id, day_type, is_optional',
          )
          .eq('program_assignment_id', assignment.id)
      : Promise.resolve({ data: null, error: null }),
    includeProgress
      ? supabase
          .from('program_day_completions')
          .select('program_day_assignment_id, notes')
          .eq('program_assignment_id', assignment.id)
      : Promise.resolve({ data: null, error: null }),
  ])

  const totalWeeks =
    options?.totalWeeks != null && options.totalWeeks > 0
      ? options.totalWeeks
      : instanceTotalWeeks(
          (phases ?? []).map((p) => ({ duration_weeks: p.duration_weeks })),
        )
  if (totalWeeks <= 0) return null

  const snap = assignment.timezone_snapshot?.trim() || ''
  const profFromOpt = options?.profileTimezone?.trim() || ''
  const profFromDb =
    profileRes?.data &&
    typeof (profileRes.data as { timezone?: string }).timezone === 'string'
      ? (profileRes.data as { timezone: string }).timezone.trim()
      : ''
  const timeZone = normalizeClientTimezone(snap || profFromOpt || profFromDb || 'UTC')

  const pauses: PauseState = {
    accumulatedDays: Math.max(0, Number(assignment.pause_accumulated_days) || 0),
    pauseStatus: assignment.pause_status ?? 'active',
    pausedAt: assignment.paused_at ?? null,
  }

  const foundationWeek = resolveFoundationCurrentWeek({
    startDate: assignment.start_date,
    totalWeeks,
    timeZone,
    pauses,
  })
  if (foundationWeek == null) return null

  let weeklyProgress: FoundationWeeklyProgress | null = null
  if (includeProgress && !pdaRes.error && !completionsRes.error) {
    const completedIds = new Set<string>()
    const skippedIds = new Set<string>()
    for (const row of completionsRes.data ?? []) {
      if (!row.program_day_assignment_id) continue
      if (isCoachSkipNote(row.notes)) {
        skippedIds.add(row.program_day_assignment_id)
        continue
      }
      completedIds.add(row.program_day_assignment_id)
    }
    weeklyProgress = computeFoundationWeeklyProgress({
      startDate: assignment.start_date,
      totalWeeks,
      timeZone,
      pauses,
      slots: (pdaRes.data ?? []) as Parameters<
        typeof computeFoundationWeeklyProgress
      >[0]['slots'],
      completedIds,
      skippedIds,
    })
  }

  return { foundationWeek, totalWeeks, timeZone, weeklyProgress }
}
