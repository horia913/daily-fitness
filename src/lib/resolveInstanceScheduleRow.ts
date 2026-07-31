/**
 * Resolve the client's INSTANCE schedule row id (`program_day_assignments.id`)
 * for a program workout. This is the stable history/completion key introduced by
 * the Program Spine Rebuild — every workout_logs / workout_sessions /
 * program_day_completions row for a program workout must carry it. It is NEVER
 * the mutable master `program_schedule.id`.
 *
 * Two resolution strategies:
 *  - by day: (program_assignment_id, week, within-week day). Instance day_number
 *    is absolute = (week - 1) * 7 + withinWeekDay, matching how
 *    assign_program_instance copies program_schedule into program_day_assignments.
 *  - by bridge: program_day_assignments.workout_assignment_id (set by the start
 *    routes). Used by paths that only know the workout_assignment_id
 *    (e.g. /api/log-set and /api/block-complete first-set create).
 *
 * Both return null for standalone (non-program) workouts — callers leave the
 * stamp null in that case.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export async function resolveProgramDayAssignmentIdByDay(
  supabase: SupabaseClient,
  programAssignmentId: string | null | undefined,
  weekNumber: number | null | undefined,
  withinWeekDay: number | null | undefined,
): Promise<string | null> {
  if (!programAssignmentId) return null
  const week = Number(weekNumber)
  const day = Number(withinWeekDay)
  if (!Number.isFinite(week) || !Number.isFinite(day)) return null

  const absoluteDayNumber = (week - 1) * 7 + day
  const { data, error } = await supabase
    .from('program_day_assignments')
    .select('id')
    .eq('program_assignment_id', programAssignmentId)
    .eq('day_number', absoluteDayNumber)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.warn('[resolveInstanceScheduleRow] by-day lookup failed:', error.message)
    return null
  }
  return ((data as { id?: string } | null)?.id) ?? null
}

export async function resolveProgramDayAssignmentIdByWorkoutAssignment(
  supabase: SupabaseClient,
  workoutAssignmentId: string | null | undefined,
): Promise<string | null> {
  if (!workoutAssignmentId) return null

  const { data, error } = await supabase
    .from('program_day_assignments')
    .select('id')
    .eq('workout_assignment_id', workoutAssignmentId)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.warn('[resolveInstanceScheduleRow] by-workout-assignment lookup failed:', error.message)
    return null
  }
  return ((data as { id?: string } | null)?.id) ?? null
}
