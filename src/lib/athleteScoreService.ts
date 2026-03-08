/**
 * Athlete Score Service
 * Calculates a 0-100 score reflecting client engagement over a rolling 7-day window
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { AthleteScore } from '@/types/athleteScore'
import { getProgramState } from './programStateService'

/**
 * Calculate athlete score for a client over a rolling 7-day window
 * @param clientId - The client's user ID
 * @param supabaseAdmin - Supabase admin client (service role) for bypassing RLS
 * @returns The calculated athlete score
 */
export async function calculateAthleteScore(
  clientId: string,
  supabaseAdmin: SupabaseClient
): Promise<AthleteScore> {
  // Calculate rolling 7-day window (today minus 6 days to today)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const windowEnd = new Date(today)
  const windowStart = new Date(today)
  windowStart.setDate(windowStart.getDate() - 6)

  const windowStartStr = windowStart.toISOString().split('T')[0]
  const windowEndStr = windowEnd.toISOString().split('T')[0]
  const windowStartISO = windowStart.toISOString()
  const windowEndDate = new Date(windowEnd)
  windowEndDate.setHours(23, 59, 59, 999)
  const windowEndISO = windowEndDate.toISOString()

  // Calculate component scores
  const workoutScore = await calculateWorkoutCompletionScore(
    clientId,
    supabaseAdmin,
    windowStartISO,
    windowEndISO
  )

  const programScore = await calculateProgramAdherenceScore(
    clientId,
    supabaseAdmin,
    windowStartISO,
    windowEndISO
  )

  const checkinScore = await calculateCheckinCompletionScore(
    clientId,
    supabaseAdmin,
    windowStartStr,
    windowEndStr
  )

  const goalScore = await calculateGoalProgressScore(
    clientId,
    supabaseAdmin
  )

  const nutritionScore = await calculateNutritionComplianceScore(
    clientId,
    supabaseAdmin,
    windowStartISO,
    windowEndISO
  )

  // Calculate weighted total score
  const totalScore = Math.round(
    workoutScore * 0.40 +
    programScore * 0.20 +
    checkinScore * 0.15 +
    goalScore * 0.15 +
    nutritionScore * 0.10
  )

  // Determine tier
  const tier = getTier(totalScore)

  // Upsert into athlete_scores table
  const { data, error } = await supabaseAdmin
    .from('athlete_scores')
    .upsert({
      client_id: clientId,
      score: totalScore,
      tier,
      workout_completion_score: workoutScore,
      program_adherence_score: programScore,
      checkin_completion_score: checkinScore,
      goal_progress_score: goalScore,
      nutrition_compliance_score: nutritionScore,
      window_start: windowStartStr,
      window_end: windowEndStr,
      calculated_at: new Date().toISOString(),
    }, {
      onConflict: 'client_id,window_start,window_end',
    })
    .select()
    .single()

  if (error) {
    console.error('[athleteScoreService] Error upserting score:', error)
    throw new Error(`Failed to save athlete score: ${error.message}`)
  }

  return data as AthleteScore
}

/**
 * Get the latest athlete score for a client
 * @param clientId - The client's user ID
 * @param supabase - Supabase client (can be regular or admin)
 * @returns The latest athlete score or null if none exists
 */
export async function getLatestAthleteScore(
  clientId: string,
  supabase: SupabaseClient
): Promise<AthleteScore | null> {
  const { data, error } = await supabase
    .from('athlete_scores')
    .select('*')
    .eq('client_id', clientId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[athleteScoreService] Error fetching latest score:', error)
    return null
  }

  return data as AthleteScore | null
}

/**
 * Calculate workout completion score (40% weight)
 * Score = (completed workouts / expected workouts) * 100
 * If no workouts expected, score = 50 (neutral)
 */
async function calculateWorkoutCompletionScore(
  clientId: string,
  supabaseAdmin: SupabaseClient,
  windowStart: string,
  windowEnd: string
): Promise<number> {
  // Query completed workouts in the window
  const { data: completedWorkouts, error: logsError } = await supabaseAdmin
    .from('workout_logs')
    .select('id, completed_at')
    .eq('client_id', clientId)
    .not('completed_at', 'is', null)
    .gte('completed_at', windowStart)
    .lte('completed_at', windowEnd)

  if (logsError) {
    console.error('[athleteScoreService] Error fetching workout logs:', logsError)
    return 0
  }

  const completedCount = completedWorkouts?.length || 0

  // Query expected workouts (assignments scheduled/assigned in the window)
  // Fetch recent assignments and filter by date range in JavaScript
  const windowStartDate = windowStart.split('T')[0]
  const windowEndDate = windowEnd.split('T')[0]
  
  // Fetch assignments from the last 14 days to ensure we catch all relevant ones
  const widerStart = new Date(windowStart)
  widerStart.setDate(widerStart.getDate() - 7)
  const widerStartStr = widerStart.toISOString().split('T')[0]
  
  const { data: allAssignments, error: assignError } = await supabaseAdmin
    .from('workout_assignments')
    .select('id, scheduled_date, assigned_date')
    .eq('client_id', clientId)
  
  if (assignError) {
    console.error('[athleteScoreService] Error fetching workout assignments:', assignError)
    return 0
  }

  // Filter assignments that fall within the actual window
  const assignments = allAssignments?.filter((assignment: any) => {
    const date = assignment.scheduled_date || assignment.assigned_date
    if (!date) return false
    const dateStr = typeof date === 'string' ? date.split('T')[0] : date
    return dateStr >= windowStartDate && dateStr <= windowEndDate
  }) || []

  if (assignError) {
    console.error('[athleteScoreService] Error fetching workout assignments:', assignError)
    return 0
  }

  // Count unique days with assignments
  const assignmentDays = new Set<string>()
  assignments?.forEach((assignment: any) => {
    const date = assignment.scheduled_date || assignment.assigned_date
    if (date) {
      const dateStr = date.split('T')[0]
      if (dateStr >= windowStart.split('T')[0] && dateStr <= windowEnd.split('T')[0]) {
        assignmentDays.add(dateStr)
      }
    }
  })

  const expectedCount = assignmentDays.size

  // If no workouts expected, return neutral score
  if (expectedCount === 0) {
    return 50
  }

  // Calculate percentage (capped at 100)
  const score = Math.min(100, Math.round((completedCount / expectedCount) * 100))
  return score
}

/**
 * Calculate program adherence score (20% weight)
 * Checks if client is on track with their active program
 * Score = percentage of on-time completions in the window
 * If no active program, score = 50 (neutral)
 */
async function calculateProgramAdherenceScore(
  clientId: string,
  supabaseAdmin: SupabaseClient,
  windowStart: string,
  windowEnd: string
): Promise<number> {
  // Get active program assignment
  const { data: activeProgram, error: programError } = await supabaseAdmin
    .from('program_assignments')
    .select('id, program_id, start_date, status')
    .eq('client_id', clientId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (programError) {
    console.error('[athleteScoreService] Error fetching active program:', programError)
    return 50
  }

  if (!activeProgram) {
    return 50 // No active program = neutral score
  }

  // Use programStateService to get program state
  const programState = await getProgramState(supabaseAdmin, clientId)

  if (!programState.assignment || programState.slots.length === 0) {
    return 50 // No program state = neutral score
  }

  // Get completions in the window
  const { data: completions, error: completionsError } = await supabaseAdmin
    .from('program_day_completions')
    .select('id, completed_at, program_schedule_id')
    .eq('program_assignment_id', activeProgram.id)
    .gte('completed_at', windowStart)
    .lte('completed_at', windowEnd)

  if (completionsError) {
    console.error('[athleteScoreService] Error fetching program completions:', completionsError)
    return 50
  }

  // Calculate expected completions based on program schedule
  // For simplicity, we'll use the number of slots that should have been completed
  // based on the start date and current day
  const startDate = activeProgram.start_date ? new Date(activeProgram.start_date) : new Date(windowStart)
  const daysSinceStart = Math.floor((new Date(windowEnd).getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  
  // Expected completions = min(days since start, total slots)
  const expectedCompletions = Math.min(daysSinceStart + 1, programState.totalSlots)
  const actualCompletions = completions?.length || 0

  // If no expected completions, return neutral
  if (expectedCompletions === 0) {
    return 50
  }

  // Calculate percentage (capped at 100)
  const score = Math.min(100, Math.round((actualCompletions / expectedCompletions) * 100))
  return score
}

/**
 * Calculate check-in completion score (15% weight)
 * Score = (days with check-ins / 7) * 100
 */
async function calculateCheckinCompletionScore(
  clientId: string,
  supabaseAdmin: SupabaseClient,
  windowStart: string,
  windowEnd: string
): Promise<number> {
  const { data: wellnessLogs, error } = await supabaseAdmin
    .from('daily_wellness_logs')
    .select('log_date')
    .eq('client_id', clientId)
    .gte('log_date', windowStart)
    .lte('log_date', windowEnd)

  if (error) {
    console.error('[athleteScoreService] Error fetching wellness logs:', error)
    return 0
  }

  // Count unique days with check-ins
  const checkinDays = new Set<string>()
  wellnessLogs?.forEach((log: any) => {
    if (log.log_date) {
      checkinDays.add(log.log_date)
    }
  })

  const daysWithCheckins = checkinDays.size
  const score = Math.round((daysWithCheckins / 7) * 100)
  return score
}

/**
 * Calculate goal progress score (15% weight)
 * Score = average progress_percentage across all active goals
 * If no active goals, score = 50 (neutral)
 */
async function calculateGoalProgressScore(
  clientId: string,
  supabaseAdmin: SupabaseClient
): Promise<number> {
  const { data: goals, error } = await supabaseAdmin
    .from('goals')
    .select('progress_percentage')
    .eq('client_id', clientId)
    .eq('status', 'active')

  if (error) {
    console.error('[athleteScoreService] Error fetching goals:', error)
    return 50
  }

  if (!goals || goals.length === 0) {
    return 50 // No active goals = neutral score
  }

  // Calculate average progress percentage
  const validProgresses = goals
    .map((g: any) => g.progress_percentage)
    .filter((p: number | null | undefined) => p != null && p >= 0 && p <= 100) as number[]

  if (validProgresses.length === 0) {
    return 50
  }

  const averageProgress = validProgresses.reduce((sum, p) => sum + p, 0) / validProgresses.length
  return Math.round(averageProgress)
}

/**
 * Calculate nutrition compliance score (10% weight)
 * Score = (meals completed / meals expected) * 100
 * If no active meal plan, score = 50 (neutral)
 */
async function calculateNutritionComplianceScore(
  clientId: string,
  supabaseAdmin: SupabaseClient,
  windowStart: string,
  windowEnd: string
): Promise<number> {
  // Check for active meal plan assignment
  const { data: mealPlanAssignment, error: mealPlanError } = await supabaseAdmin
    .from('meal_plan_assignments')
    .select('id, is_active')
    .eq('client_id', clientId)
    .eq('is_active', true)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (mealPlanError) {
    console.error('[athleteScoreService] Error fetching meal plan assignment:', mealPlanError)
    return 50
  }

  if (!mealPlanAssignment) {
    return 50 // No active meal plan = neutral score
  }

  // Query meal completions in the window
  const { data: mealCompletions, error: completionsError } = await supabaseAdmin
    .from('meal_completions')
    .select('id, completed_at')
    .eq('client_id', clientId)
    .gte('completed_at', windowStart)
    .lte('completed_at', windowEnd)

  if (completionsError) {
    console.error('[athleteScoreService] Error fetching meal completions:', completionsError)
    return 50
  }

  const completedMeals = mealCompletions?.length || 0

  // Estimate expected meals: assume 3 meals per day for 7 days = 21 meals
  const expectedMeals = 21

  // Calculate percentage (capped at 100)
  const score = Math.min(100, Math.round((completedMeals / expectedMeals) * 100))
  return score
}

/**
 * Determine tier based on score
 */
function getTier(score: number): 'beast_mode' | 'locked_in' | 'showing_up' | 'slipping' | 'benched' {
  if (score >= 90) return 'beast_mode'
  if (score >= 75) return 'locked_in'
  if (score >= 55) return 'showing_up'
  if (score >= 35) return 'slipping'
  return 'benched'
}
