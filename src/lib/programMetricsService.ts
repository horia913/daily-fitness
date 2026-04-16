/**
 * Program Metrics Service
 * 
 * REFACTORED: Now derives all program metrics from programStateService.
 * 
 * Reads from:
 *   - programStateService.getProgramScheduleSlotsForAssignment (total count)
 *   - programStateService.getCompletedSlots (completed count, workout_logs)
 * 
 * REMOVED: getProgramMetricsLegacy (no more fallback to program_day_assignments)
 */

import { supabase } from './supabase'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  getActiveProgramAssignment,
  getProgramScheduleSlotsForAssignment,
  getCompletedSlots,
} from './programStateService'

export interface ProgramMetrics {
  program_assignment_id: string
  total_workouts: number
  completed_workouts: number
  current_day_number: number | null // 1-based position in program
  completion_percentage: number
  current_week_number?: number     // 1-based
  current_day_in_week?: number     // 1-based position within week
  is_completed?: boolean
}

/**
 * Get program metrics using the canonical program_day_completions ledger.
 * 
 * @param programAssignmentId - The program_assignments.id
 * @param supabaseClient - Optional authenticated Supabase client
 * @returns ProgramMetrics with completion counts derived from ledger
 */
export async function getProgramMetrics(
  programAssignmentId: string,
  supabaseClient?: SupabaseClient
): Promise<ProgramMetrics | null> {
  const db = supabaseClient || supabase
  
  try {
    // 1. Get the program_assignment to find program_id
    const { data: assignment, error: assignmentError } = await db
      .from('program_assignments')
      .select('program_id')
      .eq('id', programAssignmentId)
      .single()

    if (assignmentError || !assignment) {
      console.error('[programMetricsService] Error fetching assignment:', assignmentError)
      return null
    }

    // 2. Get all slots and completed slots in parallel
    const [slots, completedSlots] = await Promise.all([
      getProgramScheduleSlotsForAssignment(db, assignment.program_id, programAssignmentId),
      getCompletedSlots(db, programAssignmentId),
    ])

    const total_workouts = slots.length
    const completed_workouts = completedSlots.length

    // 3. Find next uncompleted slot to determine current position
    const completedScheduleIds = new Set(completedSlots.map(c => c.program_schedule_id))
    const nextSlot = slots.find(slot => !completedScheduleIds.has(slot.id)) ?? null
    const isCompleted = nextSlot === null && completed_workouts > 0

    // 4. Calculate current position (1-based for display)
    let current_day_number: number | null = null
    let current_week_number: number | undefined
    let current_day_in_week: number | undefined

    if (nextSlot) {
      // Count total days up to and including next slot's position
      const idx = slots.findIndex(s => s.id === nextSlot.id)
      current_day_number = idx + 1  // 1-based overall position

      current_week_number = nextSlot.week_number
      const slotsInWeek = slots.filter(s => s.week_number === nextSlot.week_number)
      current_day_in_week = slotsInWeek.findIndex(s => s.id === nextSlot.id) + 1
    } else if (isCompleted) {
      current_day_number = total_workouts + 1 // Past the last day
      const lastSlot = slots[slots.length - 1]
      if (lastSlot) {
        current_week_number = lastSlot.week_number
      }
    }

    // 5. Calculate completion percentage
    const completion_percentage = total_workouts > 0
      ? Math.round((completed_workouts / total_workouts) * 100)
      : 0

    return {
      program_assignment_id: programAssignmentId,
      total_workouts,
      completed_workouts,
      current_day_number,
      completion_percentage,
      current_week_number,
      current_day_in_week,
      is_completed: isCompleted,
    }
  } catch (error) {
    console.error('[programMetricsService] Error in getProgramMetrics:', error)
    return null
  }
}

/**
 * Consistency check helper (dev-only) — preserved for debugging
 */
export async function checkProgramProgressConsistency(
  clientId: string
): Promise<void> {
  if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_DEBUG_HARNESS) {
    return
  }

  try {
    const assignment = await getActiveProgramAssignment(supabase, clientId)
    if (!assignment) return

    const metrics = await getProgramMetrics(assignment.id)
    if (!metrics) return

    if (process.env.NEXT_PUBLIC_DEBUG_HARNESS === 'true') {
      console.log('[PROGRAM METRICS] Current state:', {
        program_assignment_id: assignment.id,
        completed: metrics.completed_workouts,
        total: metrics.total_workouts,
        percentage: metrics.completion_percentage,
        current_week_number: metrics.current_week_number,
        current_day_in_week: metrics.current_day_in_week,
        is_completed: metrics.is_completed,
      })
    }
  } catch (error) {
    console.error('[programMetricsService] Error in consistency check:', error)
  }
}
