/**
 * Program Service
 * Handles program-related queries: active programs, weekly goals, and streak calculations
 * 
 * REFACTORED: Now uses programStateService for canonical program state reads.
 * Weekly goals and complete weeks derived from the canonical ledger.
 */

import { supabase } from './supabase'
import {
  getProgramState,
  getActiveProgramAssignment,
  getProgramSlots,
  getCompletedSlots,
} from './programStateService'

export interface ActiveProgram {
  id: string
  program_id: string
  client_id: string
  start_date: string
  total_days: number
  duration_weeks: number
  workouts_per_week: number | null
  current_week_number: number   // 1-based (refactored from 0-based index)
  current_day_number: number    // 1-based (refactored from 0-based index)
  is_completed: boolean
  status: string
}

export interface WeekCompletion {
  week_number: number
  total_workouts_in_week: number
  completed_workouts_in_week: number
  is_week_complete: boolean
}

/**
 * Get active program assignment for a client.
 * Now uses programStateService for canonical state.
 */
export async function getActiveProgram(clientId: string): Promise<ActiveProgram | null> {
  try {
    const state = await getProgramState(supabase, clientId)
    
    if (!state.assignment) return null

    // Calculate average workouts per week from slots
    let workouts_per_week: number | null = null
    if (state.slots.length > 0) {
      const uniqueWeeks = [...new Set(state.slots.map(s => s.week_number))]
      workouts_per_week = state.slots.length / uniqueWeeks.length
    }

    return {
      id: state.assignment.id,
      program_id: state.assignment.program_id,
      client_id: state.assignment.client_id,
      start_date: state.assignment.start_date || '',
      total_days: state.assignment.total_days || state.totalSlots,
      duration_weeks: state.assignment.duration_weeks || 0,
      workouts_per_week,
      current_week_number: state.currentWeekNumber,
      current_day_number: state.currentDayNumber,
      is_completed: state.isCompleted,
      status: state.assignment.status,
    }
  } catch (error) {
    console.error('Error in getActiveProgram:', error)
    return null
  }
}

/**
 * Get weekly workout goal for a client.
 * Derived from the number of schedule slots in the current week.
 */
export async function getWeeklyGoal(clientId: string): Promise<number | null> {
  try {
    const clientWeeklyGoal = 0 // Placeholder until profiles.weekly_workout_goal is added

    const state = await getProgramState(supabase, clientId)
    
    if (!state.assignment || state.slots.length === 0) {
      return clientWeeklyGoal > 0 ? clientWeeklyGoal : null
    }

    // Count slots in the current week
    const currentWeekSlots = state.slots.filter(
      s => s.week_number === state.currentWeekNumber
    ).length

    return Math.max(currentWeekSlots, clientWeeklyGoal)
  } catch (error) {
    console.error('Error in getWeeklyGoal:', error)
    return null
  }
}

/**
 * Get complete weeks for a client's active program.
 * Derived from ledger completions grouped by week_number.
 */
export async function getCompleteWeeks(clientId: string): Promise<WeekCompletion[]> {
  try {
    const state = await getProgramState(supabase, clientId)
    if (!state.assignment || state.slots.length === 0) return []

    // Group slots by week
    const uniqueWeeks = [...new Set(state.slots.map(s => s.week_number))].sort((a, b) => a - b)
    
    // Build set of completed schedule IDs for fast lookup
    const completedScheduleIds = new Set(state.completedSlots.map(c => c.program_schedule_id))

    return uniqueWeeks.map(weekNum => {
      const slotsInWeek = state.slots.filter(s => s.week_number === weekNum)
      const completedInWeek = slotsInWeek.filter(s => completedScheduleIds.has(s.id)).length

      return {
        week_number: weekNum,
        total_workouts_in_week: slotsInWeek.length,
        completed_workouts_in_week: completedInWeek,
        is_week_complete: completedInWeek >= slotsInWeek.length,
      }
    })
  } catch (error) {
    console.error('Error in getCompleteWeeks:', error)
    return []
  }
}

/**
 * Calculate streak (consecutive days with completed workouts).
 * Uses workout_logs — unchanged from before.
 */
export async function getStreak(clientId: string): Promise<number> {
  try {
    const { data: logs, error } = await supabase
      .from('workout_logs')
      .select('completed_at')
      .eq('client_id', clientId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })

    if (error || !logs || logs.length === 0) {
      return 0
    }

    const uniqueDates = Array.from(
      new Set(
        logs.map(log => new Date(log.completed_at!).toISOString().split('T')[0])
      )
    ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

    if (uniqueDates.length === 0) return 0

    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    
    if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
      return 0
    }

    let streak = 1
    let expectedDate = new Date(uniqueDates[0])
    
    for (let i = 1; i < uniqueDates.length; i++) {
      expectedDate.setDate(expectedDate.getDate() - 1)
      const expectedDateStr = expectedDate.toISOString().split('T')[0]
      
      if (uniqueDates[i] === expectedDateStr) {
        streak++
      } else {
        break
      }
    }

    return streak
  } catch (error) {
    console.error('Error in getStreak:', error)
    return 0
  }
}

/**
 * Get completed workouts count for current CALENDAR week (Mon-Sun).
 * Uses workout_logs — unchanged.
 */
export async function getCurrentWeekCompletedWorkouts(clientId: string): Promise<number> {
  try {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    
    const monday = new Date(now)
    monday.setDate(now.getDate() + diffToMonday)
    monday.setHours(0, 0, 0, 0)
    
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)

    const { count, error } = await supabase
      .from('workout_logs')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .not('completed_at', 'is', null)
      .gte('completed_at', monday.toISOString())
      .lte('completed_at', sunday.toISOString())

    if (error) {
      console.error('Error fetching current week completions:', error)
      return 0
    }

    return count ?? 0
  } catch (error) {
    console.error('Error in getCurrentWeekCompletedWorkouts:', error)
    return 0
  }
}
