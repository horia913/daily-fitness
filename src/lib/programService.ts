/**
 * Program Service
 * Handles program-related queries: active programs, weekly goals, and streak calculations
 */

import { supabase } from './supabase'

export interface ActiveProgram {
  id: string
  program_id: string
  client_id: string
  start_date: string
  total_days: number
  duration_weeks: number
  workouts_per_week: number | null // Calculated: total_days / duration_weeks
  current_day_number: number
  completed_days: number
  status: string
}

export interface WeekCompletion {
  week_number: number
  total_workouts_in_week: number
  completed_workouts_in_week: number
  is_week_complete: boolean
}

/**
 * Get active program assignment for a client
 */
export async function getActiveProgram(clientId: string): Promise<ActiveProgram | null> {
  try {
    // Use limit(1) to handle cases where multiple active programs exist
    // Order by start_date DESC to get the most recent one
    const { data, error } = await supabase
      .from('program_assignments')
      .select('*')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .order('start_date', { ascending: false })
      .limit(1)

    if (error) {
      console.error('Error fetching active program:', error)
      return null
    }

    if (!data || data.length === 0) return null

    const program = data[0]

    // Calculate workouts_per_week with division by zero protection
    const workouts_per_week = 
      program.total_days > 0 && program.duration_weeks > 0
        ? (program.total_days / program.duration_weeks)
        : null

    return {
      ...program,
      workouts_per_week
    }
  } catch (error) {
    console.error('Error in getActiveProgram:', error)
    return null
  }
}

/**
 * Get weekly goal from active program
 * Returns the number of workouts per week, or null if no active program
 */
export async function getWeeklyGoal(clientId: string): Promise<number | null> {
  try {
    const activeProgram = await getActiveProgram(clientId)
    return activeProgram?.workouts_per_week ?? null
  } catch (error) {
    console.error('Error in getWeeklyGoal:', error)
    return null
  }
}

/**
 * Get complete weeks for a client's active program
 * Returns array of weeks with completion status
 */
export async function getCompleteWeeks(clientId: string): Promise<WeekCompletion[]> {
  try {
    // First get active program to ensure we have valid total_days and duration_weeks
    const activeProgram = await getActiveProgram(clientId)
    
    if (!activeProgram || !activeProgram.workouts_per_week) {
      // No active program or invalid configuration (total_days = 0 or duration_weeks = 0)
      return []
    }

    // Query program_day_assignments grouped by calculated week
    // Use raw SQL via RPC or calculate in application
    // Since Supabase doesn't easily support CEIL in select, we'll calculate in TypeScript
    const { data: dayAssignments, error } = await supabase
      .from('program_day_assignments')
      .select('*')
      .eq('program_assignment_id', activeProgram.id)

    if (error) {
      console.error('Error fetching program day assignments:', error)
      return []
    }

    if (!dayAssignments || dayAssignments.length === 0) {
      return []
    }

    // Calculate week_number for each day assignment
    const workoutsPerWeek = activeProgram.workouts_per_week
    const weeksMap = new Map<number, { total: number; completed: number }>()

    dayAssignments.forEach(day => {
      const weekNumber = Math.ceil(day.day_number / workoutsPerWeek)
      
      if (!weeksMap.has(weekNumber)) {
        weeksMap.set(weekNumber, { total: 0, completed: 0 })
      }

      const week = weeksMap.get(weekNumber)!
      week.total++
      if (day.is_completed) {
        week.completed++
      }
    })

    // Convert map to array of WeekCompletion
    const weeks: WeekCompletion[] = Array.from(weeksMap.entries())
      .map(([week_number, stats]) => ({
        week_number,
        total_workouts_in_week: stats.total,
        completed_workouts_in_week: stats.completed,
        is_week_complete: stats.completed === stats.total
      }))
      .sort((a, b) => a.week_number - b.week_number)

    return weeks
  } catch (error) {
    console.error('Error in getCompleteWeeks:', error)
    return []
  }
}

/**
 * Calculate streak (consecutive complete weeks)
 * Returns the number of consecutive complete weeks starting from the most recent week
 */
export async function getStreak(clientId: string): Promise<number> {
  try {
    const completeWeeks = await getCompleteWeeks(clientId)
    
    if (completeWeeks.length === 0) {
      return 0
    }

    // Sort by week_number DESC (most recent first)
    const sortedWeeks = [...completeWeeks].sort((a, b) => b.week_number - a.week_number)

    // Count consecutive complete weeks starting from most recent
    let streak = 0
    for (const week of sortedWeeks) {
      if (week.is_week_complete) {
        streak++
      } else {
        break // Stop at first incomplete week
      }
    }

    return streak
  } catch (error) {
    console.error('Error in getStreak:', error)
    return 0
  }
}

/**
 * Get completed workouts count for current week
 * Returns the number of completed workouts in the current week (based on active program)
 */
export async function getCurrentWeekCompletedWorkouts(clientId: string): Promise<number> {
  try {
    const activeProgram = await getActiveProgram(clientId)
    
    if (!activeProgram || !activeProgram.workouts_per_week) {
      return 0
    }

    const completeWeeks = await getCompleteWeeks(clientId)
    
    if (completeWeeks.length === 0) {
      return 0
    }

    // Find current week (highest week_number)
    const currentWeek = completeWeeks.reduce((max, week) => 
      week.week_number > max.week_number ? week : max
    )

    return currentWeek.completed_workouts_in_week
  } catch (error) {
    console.error('Error in getCurrentWeekCompletedWorkouts:', error)
    return 0
  }
}