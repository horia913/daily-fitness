/**
 * Program Progress Service
 * 
 * REFACTORED: Now delegates to programStateService for all program state reads.
 * 
 * Kept exports:
 *   - buildScheduleStructure (utility — still used by some callers)
 *   - getScheduleRow (utility — still used by some callers)
 *   - getCurrentWorkoutFromProgress (now delegates to programStateService.getProgramState)
 * 
 * CurrentWorkoutInfo interface is preserved for backward compatibility.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { getProgramState, ProgramScheduleSlot } from './programStateService'

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
  
  // Progress indices (0-based — kept for backward compat, derived from 1-based)
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
 * Builds a structure from program_schedule rows that handles gaps.
 * Kept as utility for callers that still need this format.
 */
export function buildScheduleStructure(rows: ProgramScheduleRow[]): ScheduleStructure {
  const weekNumbersSet = new Set(rows.map(r => r.week_number))
  const weekNumbers = Array.from(weekNumbersSet).sort((a, b) => a - b)
  
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
 * Gets the schedule row for a given (week_index, day_index) using the structure.
 * Kept as utility.
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
 * Gets the current workout info for a client.
 * 
 * REFACTORED: Delegates to programStateService.getProgramState() and maps
 * the result to the legacy CurrentWorkoutInfo shape for backward compatibility.
 */
export async function getCurrentWorkoutFromProgress(
  supabase: SupabaseClient,
  clientId: string
): Promise<CurrentWorkoutInfo> {
  const state = await getProgramState(supabase, clientId)

  // No active assignment
  if (!state.assignment) {
    return {
      status: 'no_program',
      message: 'No active program assignment',
    }
  }

  // No schedule slots
  if (state.slots.length === 0) {
    return {
      status: 'no_schedule',
      message: 'No training days configured in program schedule',
      program_assignment_id: state.assignment.id,
      program_id: state.assignment.program_id,
      program_name: state.assignment.name || 'Program',
    }
  }

  // Program completed
  if (state.isCompleted) {
    return {
      status: 'completed',
      message: 'Program completed',
      program_assignment_id: state.assignment.id,
      program_id: state.assignment.program_id,
      program_name: state.assignment.name || 'Program',
      is_completed: true,
      current_week_index: computeWeekIndex(state.slots, state.currentWeekNumber),
      current_day_index: computeDayIndex(state.slots, state.nextSlot ?? state.slots[state.slots.length - 1]),
    }
  }

  // Active — has a next slot
  const nextSlot = state.nextSlot!
  const weekIndex = computeWeekIndex(state.slots, nextSlot.week_number)
  const slotsInWeek = state.slots.filter(s => s.week_number === nextSlot.week_number)
  const dayIndex = slotsInWeek.findIndex(s => s.id === nextSlot.id)

  // Compute unique week count
  const uniqueWeeks = [...new Set(state.slots.map(s => s.week_number))].sort((a, b) => a - b)

  return {
    status: 'active',
    message: 'Workout ready',
    
    program_assignment_id: state.assignment.id,
    program_id: state.assignment.program_id,
    program_name: state.assignment.name || 'Program',
    
    current_week_index: weekIndex,
    current_day_index: dayIndex >= 0 ? dayIndex : 0,
    is_completed: false,
    
    week_label: state.weekLabel,
    day_label: state.dayLabel,
    position_label: state.positionLabel,
    
    template_id: nextSlot.template_id,
    schedule_row_id: nextSlot.id,
    
    total_weeks: uniqueWeeks.length,
    days_in_current_week: slotsInWeek.length,
    actual_week_number: nextSlot.week_number,
    actual_day_of_week: nextSlot.day_of_week,
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Compute 0-based week index from 1-based week_number and list of slots.
 */
function computeWeekIndex(slots: ProgramScheduleSlot[], weekNumber: number): number {
  const uniqueWeeks = [...new Set(slots.map(s => s.week_number))].sort((a, b) => a - b)
  const idx = uniqueWeeks.indexOf(weekNumber)
  return idx >= 0 ? idx : 0
}

/**
 * Compute 0-based day index within the week from a slot.
 */
function computeDayIndex(slots: ProgramScheduleSlot[], slot: ProgramScheduleSlot): number {
  const slotsInWeek = slots.filter(s => s.week_number === slot.week_number)
  const idx = slotsInWeek.findIndex(s => s.id === slot.id)
  return idx >= 0 ? idx : 0
}
