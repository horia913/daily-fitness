/**
 * Program Metrics Service
 * TASK 3: Derives program progress/completion metrics from program_day_assignments
 * (Source of truth: program_day_assignments, not program_assignment_progress or program_workout_completions)
 */

import { supabase } from './supabase'

export interface ProgramMetrics {
  program_assignment_id: string
  total_workouts: number
  completed_workouts: number
  current_day_number: number | null // min incomplete day_number, or max completed + 1
  completion_percentage: number
}

/**
 * Get program metrics from program_day_assignments for a specific program assignment
 * TASK 3: Derives completion count, total workouts, and current day from program_day_assignments
 */
export async function getProgramMetrics(
  programAssignmentId: string
): Promise<ProgramMetrics | null> {
  try {
    const { data: dayAssignments, error } = await supabase
      .from('program_day_assignments')
      .select('id, day_number, is_completed, day_type')
      .eq('program_assignment_id', programAssignmentId)
      .eq('day_type', 'workout') // Only count workout days
      .order('day_number', { ascending: true })

    if (error) {
      console.error('Error fetching program_day_assignments for metrics:', error)
      return null
    }

    if (!dayAssignments || dayAssignments.length === 0) {
      return null
    }

    const total_workouts = dayAssignments.length
    const completed_workouts = dayAssignments.filter(
      (day) => day.is_completed === true
    ).length

    // Find current day: min incomplete day_number, or max completed + 1
    const incompleteDays = dayAssignments.filter(
      (day) => day.is_completed !== true
    )
    const current_day_number =
      incompleteDays.length > 0
        ? Math.min(...incompleteDays.map((day) => day.day_number))
        : Math.max(...dayAssignments.map((day) => day.day_number)) + 1

    const completion_percentage =
      total_workouts > 0
        ? Math.round((completed_workouts / total_workouts) * 100)
        : 0

    return {
      program_assignment_id: programAssignmentId,
      total_workouts,
      completed_workouts,
      current_day_number,
      completion_percentage,
    }
  } catch (error) {
    console.error('Error in getProgramMetrics:', error)
    return null
  }
}

/**
 * TASK 4: Consistency check helper (dev-only)
 * Logs a warning if program_day_assignments shows progress but program_assignment_progress shows conflicting current_week/current_day
 * This is informational only - no DB writes
 */
export async function checkProgramProgressConsistency(
  clientId: string
): Promise<void> {
  // Only run in development/debug mode
  if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_DEBUG_HARNESS) {
    return
  }

  try {
    // Get active program assignment
    const { data: programAssignment, error: assignmentError } = await supabase
      .from('program_assignments')
      .select('id, program_id')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (assignmentError || !programAssignment) {
      return // No active program, nothing to check
    }

    // Get metrics from program_day_assignments (source of truth)
    const metrics = await getProgramMetrics(programAssignment.id)
    if (!metrics) {
      return // No day assignments, nothing to check
    }

    // Get program_assignment_progress (legacy/optional)
    const { data: progress, error: progressError } = await supabase
      .from('program_assignment_progress')
      .select('id, current_week, current_day')
      .eq('assignment_id', programAssignment.id)
      .eq('client_id', clientId)
      .maybeSingle()

    if (progressError || !progress) {
      // No progress record exists - this is OK, program_day_assignments is the source of truth
      return
    }

    // Check for conflicts
    // Note: We can't directly compare day_number to current_day without knowing week calculation
    // But we can check if progress shows a different state than what program_day_assignments indicates
    const hasIncompleteDays = metrics.completed_workouts < metrics.total_workouts
    const progressShowsCompletion = progress.current_week > 1 || progress.current_day > 7

    if (hasIncompleteDays && progressShowsCompletion) {
      console.warn(
        `[CONSISTENCY CHECK] program_assignment_progress shows completion (week ${progress.current_week}, day ${progress.current_day}) but program_day_assignments shows ${metrics.completed_workouts}/${metrics.total_workouts} completed. program_day_assignments is the source of truth.`
      )
    }

    // Log current state for debugging
    if (process.env.NEXT_PUBLIC_DEBUG_HARNESS === 'true') {
      console.log('[CONSISTENCY CHECK] Program progress state:', {
        program_assignment_id: programAssignment.id,
        program_day_assignments: {
          completed: metrics.completed_workouts,
          total: metrics.total_workouts,
          current_day: metrics.current_day_number,
        },
        program_assignment_progress: {
          current_week: progress.current_week,
          current_day: progress.current_day,
        },
        note: 'program_day_assignments is the source of truth',
      })
    }
  } catch (error) {
    console.error('Error in checkProgramProgressConsistency:', error)
    // Don't throw - this is a dev-only helper
  }
}
