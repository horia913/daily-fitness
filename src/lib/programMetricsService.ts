/**
 * Program Metrics Service
 * 
 * UPDATED: Now derives program progress from the NEW system:
 * - program_progress (current_week_index, current_day_index, is_completed)
 * - program_day_completions (completed days)
 * - program_schedule (total days in program)
 * 
 * OLD: program_day_assignments.is_completed (no longer used)
 */

import { supabase } from './supabase'
import { SupabaseClient } from '@supabase/supabase-js'
import { buildScheduleStructure } from './programProgressService'

export interface ProgramMetrics {
  program_assignment_id: string
  total_workouts: number
  completed_workouts: number
  current_day_number: number | null // 1-based position in program
  completion_percentage: number
  current_week_index?: number
  current_day_index?: number
  is_completed?: boolean
}

/**
 * Get program metrics using the NEW program_progress system
 * 
 * @param programAssignmentId - The program_assignments.id
 * @param supabaseClient - Optional authenticated Supabase client (for server-side calls with RLS)
 * @returns ProgramMetrics with completion counts derived from program_day_completions
 */
export async function getProgramMetrics(
  programAssignmentId: string,
  supabaseClient?: SupabaseClient
): Promise<ProgramMetrics | null> {
  // Use provided client or fall back to default (anonymous)
  const db = supabaseClient || supabase
  
  try {
    // 1. Get the program_progress row
    const { data: progress, error: progressError } = await db
      .from('program_progress')
      .select('current_week_index, current_day_index, is_completed, program_assignment_id')
      .eq('program_assignment_id', programAssignmentId)
      .single()

    if (progressError && progressError.code !== 'PGRST116') {
      console.error('Error fetching program_progress:', progressError)
      // Fall back to legacy method if new table doesn't exist
      return getProgramMetricsLegacy(programAssignmentId, db)
    }

    // 2. Get the program_assignment to find program_id
    const { data: assignment, error: assignmentError } = await db
      .from('program_assignments')
      .select('program_id')
      .eq('id', programAssignmentId)
      .single()

    if (assignmentError || !assignment) {
      console.error('Error fetching program_assignment:', assignmentError)
      return null
    }

    // 3. Get the program_schedule to count total workout days
    const { data: scheduleRows, error: scheduleError } = await db
      .from('program_schedule')
      .select('id, week_number, day_of_week')
      .eq('program_id', assignment.program_id)

    if (scheduleError) {
      console.error('Error fetching program_schedule:', scheduleError)
      return null
    }

    const total_workouts = scheduleRows?.length || 0

    // 4. Get completed days from program_day_completions
    const { data: completions, error: completionsError } = await db
      .from('program_day_completions')
      .select('id')
      .eq('program_assignment_id', programAssignmentId)

    if (completionsError) {
      console.error('Error fetching program_day_completions:', completionsError)
    }

    const completed_workouts = completions?.length || 0

    // 5. Calculate current position (1-based for display)
    let current_day_number: number | null = null
    if (progress) {
      // Build schedule structure to get total days traversed
      const structure = buildScheduleStructure(scheduleRows as any[])
      
      // Count days up to current position
      let daysSoFar = 0
      for (let wIdx = 0; wIdx < progress.current_week_index; wIdx++) {
        const weekNum = structure.weekNumbers[wIdx]
        const daysInWeek = structure.daysByWeek.get(weekNum)?.length || 0
        daysSoFar += daysInWeek
      }
      daysSoFar += progress.current_day_index + 1 // +1 for 1-based display
      current_day_number = daysSoFar
    }

    // 6. Calculate completion percentage
    const completion_percentage = total_workouts > 0
      ? Math.round((completed_workouts / total_workouts) * 100)
      : 0

    return {
      program_assignment_id: programAssignmentId,
      total_workouts,
      completed_workouts,
      current_day_number,
      completion_percentage,
      current_week_index: progress?.current_week_index,
      current_day_index: progress?.current_day_index,
      is_completed: progress?.is_completed || false,
    }
  } catch (error) {
    console.error('Error in getProgramMetrics:', error)
    // Fall back to legacy method
    return getProgramMetricsLegacy(programAssignmentId, db)
  }
}

/**
 * LEGACY: Get program metrics from program_day_assignments
 * Used as fallback if new tables don't exist
 */
async function getProgramMetricsLegacy(
  programAssignmentId: string,
  db: SupabaseClient = supabase
): Promise<ProgramMetrics | null> {
  try {
    const { data: dayAssignments, error } = await db
      .from('program_day_assignments')
      .select('id, day_number, is_completed, day_type')
      .eq('program_assignment_id', programAssignmentId)
      .eq('day_type', 'workout')
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
    console.error('Error in getProgramMetricsLegacy:', error)
    return null
  }
}

/**
 * Consistency check helper (dev-only) - kept for debugging
 */
export async function checkProgramProgressConsistency(
  clientId: string
): Promise<void> {
  if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_DEBUG_HARNESS) {
    return
  }

  try {
    const { data: programAssignment } = await supabase
      .from('program_assignments')
      .select('id, program_id')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!programAssignment) {
      return
    }

    const metrics = await getProgramMetrics(programAssignment.id)
    if (!metrics) {
      return
    }

    if (process.env.NEXT_PUBLIC_DEBUG_HARNESS === 'true') {
      console.log('[PROGRAM METRICS] Current state:', {
        program_assignment_id: programAssignment.id,
        completed: metrics.completed_workouts,
        total: metrics.total_workouts,
        percentage: metrics.completion_percentage,
        current_week_index: metrics.current_week_index,
        current_day_index: metrics.current_day_index,
        is_completed: metrics.is_completed,
      })
    }
  } catch (error) {
    console.error('Error in checkProgramProgressConsistency:', error)
  }
}
