/**
 * Program Progress Service
 * 
 * Shared logic for determining the current workout based on program_progress.
 * Used by BOTH client and coach flows to ensure consistency.
 * 
 * The key insight: current_week_index and current_day_index are INDICES into
 * sorted arrays, NOT the actual week_number/day_of_week values. This handles
 * gaps in the schedule (e.g., weeks 1, 3, 5 or days 1, 3, 5).
 */

import { SupabaseClient } from '@supabase/supabase-js'

export interface ProgramScheduleRow {
  id: string
  program_id: string
  week_number: number
  day_of_week: number
  template_id: string
}

export interface ScheduleStructure {
  weekNumbers: number[]  // Sorted distinct week numbers
  daysByWeek: Map<number, ProgramScheduleRow[]>  // week_number → ordered rows
}

export interface CurrentWorkoutInfo {
  status: 'active' | 'completed' | 'no_program' | 'no_schedule' | 'invalid_state'
  message: string
  
  // Program info (if active)
  program_assignment_id?: string
  program_id?: string
  program_name?: string
  
  // Progress indices (0-based)
  current_week_index?: number
  current_day_index?: number
  is_completed?: boolean
  
  // Human-readable labels
  week_label?: string  // e.g., "Week 1"
  day_label?: string   // e.g., "Day 2"
  position_label?: string  // e.g., "Week 1 • Day 2"
  
  // Workout template info
  template_id?: string
  schedule_row_id?: string  // program_schedule.id (for routing if needed)
  
  // Structure info
  total_weeks?: number
  days_in_current_week?: number
  actual_week_number?: number  // The real week_number from schedule
  actual_day_of_week?: number  // The real day_of_week from schedule
}

/**
 * Builds a structure from program_schedule rows that handles gaps
 */
export function buildScheduleStructure(rows: ProgramScheduleRow[]): ScheduleStructure {
  // Get sorted distinct week numbers
  const weekNumbersSet = new Set(rows.map(r => r.week_number))
  const weekNumbers = Array.from(weekNumbersSet).sort((a, b) => a - b)
  
  // Group and sort days by week
  const daysByWeek = new Map<number, ProgramScheduleRow[]>()
  for (const weekNum of weekNumbers) {
    const daysInWeek = rows
      .filter(r => r.week_number === weekNum)
      .sort((a, b) => a.day_of_week - b.day_of_week)
    daysByWeek.set(weekNum, daysInWeek)
  }
  
  return { weekNumbers, daysByWeek }
}

/**
 * Gets the schedule row for a given (week_index, day_index) using the structure
 */
export function getScheduleRow(
  structure: ScheduleStructure, 
  weekIndex: number, 
  dayIndex: number
): ProgramScheduleRow | null {
  if (weekIndex < 0 || weekIndex >= structure.weekNumbers.length) {
    return null
  }
  
  const weekNumber = structure.weekNumbers[weekIndex]
  const days = structure.daysByWeek.get(weekNumber)
  
  if (!days || dayIndex < 0 || dayIndex >= days.length) {
    return null
  }
  
  return days[dayIndex]
}

/**
 * Gets the current workout info for a client based on program_progress.
 * This is the SINGLE SOURCE OF TRUTH for determining which workout to show.
 * 
 * @param supabase - Supabase client (can be auth or admin)
 * @param clientId - The client's UUID
 * @returns CurrentWorkoutInfo with all relevant workout selection data
 */
export async function getCurrentWorkoutFromProgress(
  supabase: SupabaseClient,
  clientId: string
): Promise<CurrentWorkoutInfo> {
  // 1. Find active program assignment (most recent if multiple)
  const { data: assignments, error: assignmentError } = await supabase
    .from('program_assignments')
    .select('id, program_id, name, status, duration_weeks, total_days, created_at')
    .eq('client_id', clientId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  
  if (assignmentError) {
    console.error('[programProgressService] Error fetching assignments:', assignmentError)
    return {
      status: 'no_program',
      message: 'Failed to fetch program assignments',
    }
  }
  
  if (!assignments || assignments.length === 0) {
    return {
      status: 'no_program',
      message: 'No active program assignment',
    }
  }
  
  const assignment = assignments[0]
  
  // 2. Get or create program_progress
  let { data: progress, error: progressError } = await supabase
    .from('program_progress')
    .select('*')
    .eq('program_assignment_id', assignment.id)
    .single()
  
  if (progressError && progressError.code === 'PGRST116') {
    // Row not found - create it (starting at week 0, day 0)
    const { data: newProgress, error: insertError } = await supabase
      .from('program_progress')
      .insert({
        program_assignment_id: assignment.id,
        current_week_index: 0,
        current_day_index: 0,
        is_completed: false,
      })
      .select()
      .single()
    
    if (insertError) {
      console.error('[programProgressService] Error creating progress:', insertError)
      return {
        status: 'no_program',
        message: 'Failed to initialize program progress',
        program_assignment_id: assignment.id,
        program_id: assignment.program_id,
        program_name: assignment.name || 'Program',
      }
    }
    
    progress = newProgress
  } else if (progressError) {
    console.error('[programProgressService] Error fetching progress:', progressError)
    return {
      status: 'no_program',
      message: 'Failed to fetch program progress',
      program_assignment_id: assignment.id,
      program_id: assignment.program_id,
      program_name: assignment.name || 'Program',
    }
  }
  
  // 3. Check if program is completed
  if (progress.is_completed) {
    return {
      status: 'completed',
      message: 'Program completed',
      program_assignment_id: assignment.id,
      program_id: assignment.program_id,
      program_name: assignment.name || 'Program',
      current_week_index: progress.current_week_index,
      current_day_index: progress.current_day_index,
      is_completed: true,
    }
  }
  
  // 4. Fetch program schedule
  const { data: scheduleRows, error: scheduleError } = await supabase
    .from('program_schedule')
    .select('id, program_id, week_number, day_of_week, template_id')
    .eq('program_id', assignment.program_id)
  
  if (scheduleError) {
    console.error('[programProgressService] Error fetching schedule:', scheduleError)
    return {
      status: 'no_schedule',
      message: 'Failed to fetch program schedule',
      program_assignment_id: assignment.id,
      program_id: assignment.program_id,
      program_name: assignment.name || 'Program',
    }
  }
  
  if (!scheduleRows || scheduleRows.length === 0) {
    return {
      status: 'no_schedule',
      message: 'No training days configured in program schedule',
      program_assignment_id: assignment.id,
      program_id: assignment.program_id,
      program_name: assignment.name || 'Program',
    }
  }
  
  // 5. Build schedule structure (handles gaps in week/day numbers)
  const structure = buildScheduleStructure(scheduleRows as ProgramScheduleRow[])
  
  // 6. Get current day's schedule row using indices
  const currentRow = getScheduleRow(
    structure,
    progress.current_week_index,
    progress.current_day_index
  )
  
  if (!currentRow) {
    return {
      status: 'invalid_state',
      message: `Invalid progress state: week_index=${progress.current_week_index}, day_index=${progress.current_day_index}`,
      program_assignment_id: assignment.id,
      program_id: assignment.program_id,
      program_name: assignment.name || 'Program',
      current_week_index: progress.current_week_index,
      current_day_index: progress.current_day_index,
      total_weeks: structure.weekNumbers.length,
    }
  }
  
  // 7. Compute human-readable labels
  const weekLabel = `Week ${currentRow.week_number}`
  const daysInWeek = structure.daysByWeek.get(currentRow.week_number) || []
  const dayPosition = daysInWeek.findIndex(d => d.id === currentRow.id) + 1
  const dayLabel = `Day ${dayPosition}`
  
  return {
    status: 'active',
    message: 'Workout ready',
    
    program_assignment_id: assignment.id,
    program_id: assignment.program_id,
    program_name: assignment.name || 'Program',
    
    current_week_index: progress.current_week_index,
    current_day_index: progress.current_day_index,
    is_completed: false,
    
    week_label: weekLabel,
    day_label: dayLabel,
    position_label: `${weekLabel} • ${dayLabel}`,
    
    template_id: currentRow.template_id,
    schedule_row_id: currentRow.id,
    
    total_weeks: structure.weekNumbers.length,
    days_in_current_week: daysInWeek.length,
    actual_week_number: currentRow.week_number,
    actual_day_of_week: currentRow.day_of_week,
  }
}
