/**
 * Program Service
 * Handles program-related queries: active programs, weekly goals, and streak calculations
 * 
 * UPDATED: Now uses the new program_progress + program_day_completions + program_schedule tables
 * instead of the legacy program_day_assignments table.
 */

import { supabase } from './supabase'

export interface ActiveProgram {
  id: string
  program_id: string
  client_id: string
  start_date: string
  total_days: number
  duration_weeks: number
  workouts_per_week: number | null // Calculated from program_schedule
  current_week_index: number
  current_day_index: number
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
 * Get active program assignment for a client
 * Now includes program_progress data for current position
 */
export async function getActiveProgram(clientId: string): Promise<ActiveProgram | null> {
  try {
    // Get active program assignment
    const { data: assignments, error: assignError } = await supabase
      .from('program_assignments')
      .select('*')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)

    if (assignError) {
      console.error('Error fetching active program:', assignError)
      return null
    }

    if (!assignments || assignments.length === 0) return null

    const assignment = assignments[0]

    // Get program_progress for current position
    const { data: progress } = await supabase
      .from('program_progress')
      .select('current_week_index, current_day_index, is_completed')
      .eq('program_assignment_id', assignment.id)
      .maybeSingle()

    // Get program_schedule to calculate workouts_per_week
    const { data: scheduleRows } = await supabase
      .from('program_schedule')
      .select('week_number')
      .eq('program_id', assignment.program_id)

    // Calculate average workouts per week from schedule
    let workouts_per_week: number | null = null
    if (scheduleRows && scheduleRows.length > 0) {
      const uniqueWeeks = [...new Set(scheduleRows.map(r => r.week_number))]
      workouts_per_week = scheduleRows.length / uniqueWeeks.length
    }

    return {
      ...assignment,
      workouts_per_week,
      current_week_index: progress?.current_week_index ?? 0,
      current_day_index: progress?.current_day_index ?? 0,
      is_completed: progress?.is_completed ?? false
    }
  } catch (error) {
    console.error('Error in getActiveProgram:', error)
    return null
  }
}

/**
 * Get weekly workout goal for a client
 * 
 * LOGIC: Returns MAX(program_week_workouts, client_personal_goal)
 * - If client has a personal weekly goal higher than program, use that
 * - This allows clients to do extra standalone workouts beyond their program
 * 
 * Currently: Only program_schedule is used (no client weekly goal field yet)
 * Future: Add profiles.weekly_workout_goal column and use MAX of both
 */
export async function getWeeklyGoal(clientId: string): Promise<number | null> {
  try {
    // TODO: When profiles.weekly_workout_goal is added, fetch it here:
    // const { data: profile } = await supabase
    //   .from('profiles')
    //   .select('weekly_workout_goal')
    //   .eq('id', clientId)
    //   .maybeSingle()
    // const clientWeeklyGoal = profile?.weekly_workout_goal || 0
    const clientWeeklyGoal = 0 // Placeholder until field is added

    const activeProgram = await getActiveProgram(clientId)
    
    // If no active program, return client's personal goal (or null if none set)
    if (!activeProgram) {
      return clientWeeklyGoal > 0 ? clientWeeklyGoal : null
    }

    // Get current week index from program_progress
    const currentWeekIndex = activeProgram.current_week_index

    // Get program_schedule to find current week's workout count
    const { data: scheduleRows } = await supabase
      .from('program_schedule')
      .select('week_number')
      .eq('program_id', activeProgram.program_id)

    if (!scheduleRows || scheduleRows.length === 0) {
      return clientWeeklyGoal > 0 ? clientWeeklyGoal : null
    }

    // Get unique week numbers sorted
    const uniqueWeeks = [...new Set(scheduleRows.map(r => r.week_number))].sort((a, b) => a - b)
    
    // Get the actual week_number for current index
    const actualWeekNumber = uniqueWeeks[currentWeekIndex] || uniqueWeeks[0] || 1
    
    // Count days in this week from program_schedule
    const programWeekDays = scheduleRows.filter(r => r.week_number === actualWeekNumber).length
    
    // Return MAX of program week days and client personal goal
    // This allows clients to set a higher goal and do extra standalone workouts
    return Math.max(programWeekDays, clientWeeklyGoal)
  } catch (error) {
    console.error('Error in getWeeklyGoal:', error)
    return null
  }
}

/**
 * Get complete weeks for a client's active program
 * Now uses program_day_completions table
 */
export async function getCompleteWeeks(clientId: string): Promise<WeekCompletion[]> {
  try {
    const activeProgram = await getActiveProgram(clientId)
    if (!activeProgram) return []

    // Get program_schedule to understand structure
    const { data: scheduleRows } = await supabase
      .from('program_schedule')
      .select('week_number')
      .eq('program_id', activeProgram.program_id)

    if (!scheduleRows || scheduleRows.length === 0) return []

    // Get completions from program_day_completions
    const { data: completions } = await supabase
      .from('program_day_completions')
      .select('week_index, day_index')
      .eq('program_assignment_id', activeProgram.id)

    // Get unique week numbers sorted
    const uniqueWeeks = [...new Set(scheduleRows.map(r => r.week_number))].sort((a, b) => a - b)

    // Build week completion data
    const weeks: WeekCompletion[] = uniqueWeeks.map((weekNum, weekIndex) => {
      const daysInWeek = scheduleRows.filter(r => r.week_number === weekNum).length
      const completedInWeek = completions?.filter(c => c.week_index === weekIndex).length || 0
      
      return {
        week_number: weekNum,
        total_workouts_in_week: daysInWeek,
        completed_workouts_in_week: completedInWeek,
        is_week_complete: completedInWeek >= daysInWeek
      }
    })

    return weeks
  } catch (error) {
    console.error('Error in getCompleteWeeks:', error)
    return []
  }
}

/**
 * Calculate streak (consecutive days with completed workouts)
 * Uses workout_logs table for accurate day-based streak calculation
 */
export async function getStreak(clientId: string): Promise<number> {
  try {
    // Get all completed workout logs, ordered by completion date descending
    const { data: logs, error } = await supabase
      .from('workout_logs')
      .select('completed_at')
      .eq('client_id', clientId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })

    if (error || !logs || logs.length === 0) {
      return 0
    }

    // Extract unique dates (YYYY-MM-DD)
    const uniqueDates = Array.from(
      new Set(
        logs.map(log => new Date(log.completed_at!).toISOString().split('T')[0])
      )
    ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

    if (uniqueDates.length === 0) return 0

    // Check if streak is current (most recent date should be today or yesterday)
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    
    if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
      return 0 // Streak broken
    }

    // Count consecutive days
    let streak = 1
    let expectedDate = new Date(uniqueDates[0])
    
    for (let i = 1; i < uniqueDates.length; i++) {
      expectedDate.setDate(expectedDate.getDate() - 1)
      const expectedDateStr = expectedDate.toISOString().split('T')[0]
      
      if (uniqueDates[i] === expectedDateStr) {
        streak++
      } else {
        break // Streak broken
      }
    }

    return streak
  } catch (error) {
    console.error('Error in getStreak:', error)
    return 0
  }
}

/**
 * Get completed workouts count for current CALENDAR week (Mon-Sun)
 * Uses workout_logs for consistency with dashboard
 */
export async function getCurrentWeekCompletedWorkouts(clientId: string): Promise<number> {
  try {
    // Get start and end of current calendar week (Monday to Sunday)
    const now = new Date()
    const dayOfWeek = now.getDay()
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    
    const monday = new Date(now)
    monday.setDate(now.getDate() + diffToMonday)
    monday.setHours(0, 0, 0, 0)
    
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)

    // Count completed workouts this calendar week from workout_logs
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