/**
 * Goal Sync Service
 * Handles automatic goal updates from activity data
 */

import { createClient } from '@supabase/supabase-js'
import { getTrackedFetch } from '@/lib/supabaseQueryLogger'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Use service role key for admin operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  global: { fetch: getTrackedFetch() },
})

export interface GoalSyncResult {
  goalId: string
  oldValue: number
  newValue: number
  updated: boolean
  reason: string
}

// ============================================
// 1. STRENGTH GOALS SYNC
// ============================================

/**
 * Sync strength goal with latest e1RM
 * For goals: Bench Press, Squat, Deadlift, Hip Thrust
 * 
 * Gets highest e1RM from user_exercise_metrics for specific exercise
 * Updates goals.current_value with that e1RM
 */
export async function syncStrengthGoal(
  goalId: string,
  clientId: string,
  exerciseId: string
): Promise<GoalSyncResult> {
  try {
    // Step 1: Query user_exercise_metrics for highest e1RM
    const { data: metrics, error } = await supabaseAdmin
      .from('user_exercise_metrics')
      .select('estimated_1rm')
      .eq('user_id', clientId)
      .eq('exercise_id', exerciseId)
      .order('estimated_1rm', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching metrics:', error)
      return {
        goalId,
        oldValue: 0,
        newValue: 0,
        updated: false,
        reason: `Database error: ${error.message}`
      }
    }

    if (!metrics || !metrics.estimated_1rm) {
      return {
        goalId,
        oldValue: 0,
        newValue: 0,
        updated: false,
        reason: 'No metrics found for this exercise'
      }
    }

    const newValue = metrics.estimated_1rm

    // Step 2: Get current goal value
    const { data: goal, error: goalError } = await supabaseAdmin
      .from('goals')
      .select('current_value, progress_percentage, target_value, status, completed_date')
      .eq('id', goalId)
      .single()

    if (goalError || !goal) {
      return {
        goalId,
        oldValue: 0,
        newValue: 0,
        updated: false,
        reason: `Goal not found: ${goalError?.message}`
      }
    }

    const oldValue = goal.current_value || 0

    // Step 3: Only update if value changed
    if (Math.abs(newValue - oldValue) > 0.01) { // Allow small floating point differences
      const progressPercent = goal.target_value 
        ? Math.min(100, (newValue / goal.target_value) * 100)
        : 0
      const newStatus = progressPercent >= 100 ? 'completed' : (goal.status === 'completed' ? 'completed' : 'active')
      const completedDate = progressPercent >= 100 && !goal.completed_date 
        ? new Date().toISOString().split('T')[0] 
        : goal.completed_date || null

      const { error: updateError } = await supabaseAdmin
        .from('goals')
        .update({
          current_value: newValue,
          progress_percentage: progressPercent,
          status: newStatus,
          completed_date: completedDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', goalId)

      if (updateError) {
        console.error('Error updating goal:', updateError)
        return {
          goalId,
          oldValue,
          newValue,
          updated: false,
          reason: `Update failed: ${updateError.message}`
        }
      }

      return {
        goalId,
        oldValue,
        newValue,
        updated: true,
        reason: `Updated from ${oldValue.toFixed(2)} to ${newValue.toFixed(2)} kg`
      }
    }

    return {
      goalId,
      oldValue,
      newValue,
      updated: false,
      reason: 'Value unchanged'
    }
  } catch (error) {
    console.error('Error in syncStrengthGoal:', error)
    return {
      goalId,
      oldValue: 0,
      newValue: 0,
      updated: false,
      reason: `Exception: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}

// ============================================
// 2. BODY COMPOSITION GOALS SYNC
// ============================================

/**
 * Sync body composition goal with latest body metrics
 * For goals: Fat Loss, Weight Loss, Muscle Gain, Body Recomp
 * 
 * Gets latest body metric and updates goal based on goal type
 */
export async function syncBodyCompositionGoal(
  goalId: string,
  clientId: string,
  goalType: 'fat-loss' | 'weight-loss' | 'muscle-gain' | 'body-recomp'
): Promise<GoalSyncResult> {
  try {
    // Step 1: Get latest body metric
    const { data: metrics, error } = await supabaseAdmin
      .from('body_metrics')
      .select('*')
      .eq('client_id', clientId)
      .order('measured_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      return {
        goalId,
        oldValue: 0,
        newValue: 0,
        updated: false,
        reason: `Database error: ${error.message}`
      }
    }

    if (!metrics) {
      return {
        goalId,
        oldValue: 0,
        newValue: 0,
        updated: false,
        reason: 'No body metrics found'
      }
    }

    // Step 2: Get goal info
    const { data: goal, error: goalError } = await supabaseAdmin
      .from('goals')
      .select('current_value, progress_percentage, target_value, status, created_at, completed_date')
      .eq('id', goalId)
      .single()

    if (goalError || !goal) {
      return {
        goalId,
        oldValue: 0,
        newValue: 0,
        updated: false,
        reason: `Goal not found: ${goalError?.message}`
      }
    }

    // Get baseline metric (first metric after goal creation, or closest before)
    const goalStartDate = goal.created_at?.split('T')[0] || new Date().toISOString().split('T')[0]
    
    const { data: baselineMetrics } = await supabaseAdmin
      .from('body_metrics')
      .select('*')
      .eq('client_id', clientId)
      .lte('measured_date', goalStartDate)
      .order('measured_date', { ascending: false })
      .limit(1)

    // If no baseline before goal creation, use first metric ever
    const baselineMetric = baselineMetrics && baselineMetrics.length > 0 
      ? baselineMetrics[0]
      : metrics // Use current as baseline if no history

    let newValue = 0
    const oldValue = goal.current_value || 0
    const latestMetric = metrics // Latest body metric

    // Step 3: Calculate progress based on goal type
    if (goalType === 'fat-loss' && latestMetric.body_fat_percentage && baselineMetric?.body_fat_percentage) {
      // Fat Loss: Initial BF% - Current BF%
      newValue = baselineMetric.body_fat_percentage - latestMetric.body_fat_percentage
    } else if (goalType === 'weight-loss' && latestMetric.weight_kg && baselineMetric?.weight_kg) {
      // Weight Loss: Initial weight - Current weight
      newValue = baselineMetric.weight_kg - latestMetric.weight_kg
    } else if (goalType === 'muscle-gain' && latestMetric.muscle_mass_kg && baselineMetric?.muscle_mass_kg) {
      // Muscle Gain: Current muscle - Initial muscle
      newValue = latestMetric.muscle_mass_kg - baselineMetric.muscle_mass_kg
    } else if (goalType === 'body-recomp' && latestMetric.weight_kg && baselineMetric?.weight_kg) {
      // Body Recomp: Simplified - use weight change (could be enhanced with body fat %)
      newValue = baselineMetric.weight_kg - latestMetric.weight_kg
    }

    // Step 4: Only update if value changed
    if (Math.abs(newValue - oldValue) > 0.01 && newValue !== 0) {
      const progressPercent = goal.target_value 
        ? Math.min(100, (newValue / goal.target_value) * 100)
        : 0
      const newStatus = progressPercent >= 100 ? 'completed' : (goal.status === 'completed' ? 'completed' : 'active')
      const completedDate = progressPercent >= 100 && !goal.completed_date 
        ? new Date().toISOString().split('T')[0] 
        : goal.completed_date || null

      const { error: updateError } = await supabaseAdmin
        .from('goals')
        .update({
          current_value: newValue,
          progress_percentage: progressPercent,
          status: newStatus,
          completed_date: completedDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', goalId)

      if (updateError) {
        console.error('Error updating goal:', updateError)
        return {
          goalId,
          oldValue,
          newValue,
          updated: false,
          reason: `Update failed: ${updateError.message}`
        }
      }

      return {
        goalId,
        oldValue,
        newValue,
        updated: true,
        reason: `Updated from ${oldValue.toFixed(2)} to ${newValue.toFixed(2)}`
      }
    }

    return {
      goalId,
      oldValue,
      newValue,
      updated: false,
      reason: 'Value unchanged or no baseline'
    }
  } catch (error) {
    console.error('Error in syncBodyCompositionGoal:', error)
    return {
      goalId,
      oldValue: 0,
      newValue: 0,
      updated: false,
      reason: `Exception: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}

// ============================================
// 3. CONSISTENCY GOALS SYNC
// ============================================

/**
 * Sync workout consistency goal
 * Counts completed workouts in current week
 */
export async function syncWorkoutConsistencyGoal(
  goalId: string,
  clientId: string
): Promise<GoalSyncResult> {
  try {
    // Step 1: Get week boundaries (Monday to Sunday)
    const today = new Date()
    const dayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, etc.
    const monday = new Date(today)
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    monday.setHours(0, 0, 0, 0)
    
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)

    // Step 2: Count completed workouts this week
    const { data: workoutSessions, error } = await supabaseAdmin
      .from('workout_sessions')
      .select('id')
      .eq('client_id', clientId)
      .eq('status', 'completed')
      .gte('completed_at', monday.toISOString())
      .lte('completed_at', sunday.toISOString())

    if (error) {
      console.error('Error counting workouts:', error)
      return {
        goalId,
        oldValue: 0,
        newValue: 0,
        updated: false,
        reason: `Database error: ${error.message}`
      }
    }

    const newValue = workoutSessions?.length || 0

    // Step 3: Get goal info
    const { data: goal, error: goalError } = await supabaseAdmin
      .from('goals')
      .select('current_value, progress_percentage, target_value, status, completed_date')
      .eq('id', goalId)
      .single()

    if (goalError || !goal) {
      return {
        goalId,
        oldValue: 0,
        newValue: 0,
        updated: false,
        reason: `Goal not found: ${goalError?.message}`
      }
    }

    const oldValue = goal.current_value || 0

    // Step 4: Update if changed
    if (newValue !== oldValue) {
      const progressPercent = goal.target_value 
        ? Math.min(100, (newValue / goal.target_value) * 100)
        : 0
      const newStatus = progressPercent >= 100 ? 'completed' : (goal.status === 'completed' ? 'completed' : 'active')
      const completedDate = progressPercent >= 100 && !goal.completed_date 
        ? new Date().toISOString().split('T')[0] 
        : goal.completed_date || null

      const { error: updateError } = await supabaseAdmin
        .from('goals')
        .update({
          current_value: newValue,
          progress_percentage: progressPercent,
          status: newStatus,
          completed_date: completedDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', goalId)

      if (updateError) {
        console.error('Error updating goal:', updateError)
        return {
          goalId,
          oldValue,
          newValue,
          updated: false,
          reason: `Update failed: ${updateError.message}`
        }
      }

      return {
        goalId,
        oldValue,
        newValue,
        updated: true,
        reason: `Updated to ${newValue} workouts this week`
      }
    }

    return {
      goalId,
      oldValue,
      newValue,
      updated: false,
      reason: 'Count unchanged'
    }
  } catch (error) {
    console.error('Error in syncWorkoutConsistencyGoal:', error)
    return {
      goalId,
      oldValue: 0,
      newValue: 0,
      updated: false,
      reason: `Exception: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}

/**
 * Sync nutrition tracking goal
 * Counts days with meal logs in current week
 */
export async function syncNutritionTrackingGoal(
  goalId: string,
  clientId: string
): Promise<GoalSyncResult> {
  try {
    // Step 1: Get week boundaries
    const today = new Date()
    const dayOfWeek = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    monday.setHours(0, 0, 0, 0)
    
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)

    // Step 2: Count distinct days with meal logs
    const { data: mealLogs, error } = await supabaseAdmin
      .from('meal_logs')
      .select('logged_at')
      .eq('client_id', clientId)
      .gte('logged_at', monday.toISOString().split('T')[0])
      .lte('logged_at', sunday.toISOString().split('T')[0])

    if (error) {
      console.error('Error counting meal logs:', error)
      return {
        goalId,
        oldValue: 0,
        newValue: 0,
        updated: false,
        reason: `Database error: ${error.message}`
      }
    }

    // Count unique dates
    const uniqueDays = new Set(
      mealLogs?.map(m => {
        const date = m.logged_at
        return typeof date === 'string' ? date.split('T')[0] : date
      }).filter(Boolean) || []
    )
    const newValue = uniqueDays.size

    // Step 3: Get goal info
    const { data: goal, error: goalError } = await supabaseAdmin
      .from('goals')
      .select('current_value, progress_percentage, target_value, status, completed_date')
      .eq('id', goalId)
      .single()

    if (goalError || !goal) {
      return {
        goalId,
        oldValue: 0,
        newValue: 0,
        updated: false,
        reason: `Goal not found: ${goalError?.message}`
      }
    }

    const oldValue = goal.current_value || 0

    // Step 4: Update if changed
    if (newValue !== oldValue) {
      const progressPercent = goal.target_value 
        ? Math.min(100, (newValue / goal.target_value) * 100)
        : 0
      const newStatus = progressPercent >= 100 ? 'completed' : (goal.status === 'completed' ? 'completed' : 'active')
      const completedDate = progressPercent >= 100 && !goal.completed_date 
        ? new Date().toISOString().split('T')[0] 
        : goal.completed_date || null

      const { error: updateError } = await supabaseAdmin
        .from('goals')
        .update({
          current_value: newValue,
          progress_percentage: progressPercent,
          status: newStatus,
          completed_date: completedDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', goalId)

      if (updateError) {
        console.error('Error updating goal:', updateError)
        return {
          goalId,
          oldValue,
          newValue,
          updated: false,
          reason: `Update failed: ${updateError.message}`
        }
      }

      return {
        goalId,
        oldValue,
        newValue,
        updated: true,
        reason: `Updated to ${newValue} days logged this week`
      }
    }

    return {
      goalId,
      oldValue,
      newValue,
      updated: false,
      reason: 'Count unchanged'
    }
  } catch (error) {
    console.error('Error in syncNutritionTrackingGoal:', error)
    return {
      goalId,
      oldValue: 0,
      newValue: 0,
      updated: false,
      reason: `Exception: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}

/**
 * Sync water intake goal (daily)
 * Counts total liters logged today (manual entry for now)
 * When hydration_logs table exists, this will auto-count
 */
export async function syncWaterIntakeGoal(
  goalId: string,
  clientId: string
): Promise<GoalSyncResult> {
  // For now, this relies on manual entry
  // When hydration_logs table is created:
  // SELECT SUM(liters) FROM hydration_logs 
  //   WHERE client_id = $1 AND DATE(logged_at) = TODAY()
  
  return {
    goalId,
    oldValue: 0,
    newValue: 0,
    updated: false,
    reason: 'Water intake: manual entry only (awaiting hydration_logs table)'
  }
}

// ============================================
// 4. RESET LOGIC
// ============================================

/**
 * Reset weekly consistency goals
 * Called every Sunday night or Monday morning
 */
export async function resetWeeklyGoals(clientId: string): Promise<void> {
  try {
    // Get all weekly goals (workout consistency, nutrition tracking, etc)
    // Match by title keywords since we don't have a specific category field
    const { data: weeklyGoals, error } = await supabaseAdmin
      .from('goals')
      .select('id, title, category')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .or('title.ilike.%Workout Consistency%,title.ilike.%Nutrition Tracking%')

    if (error) {
      console.error('Error fetching weekly goals:', error)
      return
    }

    if (!weeklyGoals || weeklyGoals.length === 0) {
      return
    }

    // Reset each one
    for (const goal of weeklyGoals) {
      await supabaseAdmin
        .from('goals')
        .update({
          current_value: 0,
          progress_percentage: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', goal.id)
    }

    console.log(`Reset ${weeklyGoals.length} weekly goals for client ${clientId}`)
  } catch (error) {
    console.error('Error resetting weekly goals:', error)
  }
}

/**
 * Reset daily goals
 * Called every day at midnight for goals like water intake
 */
export async function resetDailyGoals(clientId: string): Promise<void> {
  try {
    // Get all daily goals (water intake only for now)
    const { data: dailyGoals, error } = await supabaseAdmin
      .from('goals')
      .select('id')
      .eq('client_id', clientId)
      .ilike('title', '%Water Intake%')
      .eq('status', 'active')

    if (error) {
      console.error('Error fetching daily goals:', error)
      return
    }

    if (!dailyGoals || dailyGoals.length === 0) {
      return
    }

    // Reset each one
    for (const goal of dailyGoals) {
      await supabaseAdmin
        .from('goals')
        .update({
          current_value: 0,
          progress_percentage: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', goal.id)
    }

    console.log(`Reset ${dailyGoals.length} daily goals for client ${clientId}`)
  } catch (error) {
    console.error('Error resetting daily goals:', error)
  }
}

// ============================================
// 5. MAIN SYNC FUNCTION
// ============================================

/**
 * Sync all goals for a specific client
 * Call this when activities are logged or on a schedule
 */
export async function syncAllClientGoals(clientId: string): Promise<GoalSyncResult[]> {
  try {
    const { data: goals, error } = await supabaseAdmin
      .from('goals')
      .select('id, title, category, metric_type')
      .eq('client_id', clientId)
      .eq('status', 'active')

    if (error) {
      console.error('Error fetching goals:', error)
      return []
    }

    if (!goals || goals.length === 0) {
      return []
    }

    const results: GoalSyncResult[] = []

    for (const goal of goals) {
      let result: GoalSyncResult | null = null
      const titleLower = goal.title.toLowerCase()

      // Match goal to sync function based on title
      if (titleLower.includes('bench') || titleLower.includes('bench press')) {
        // Find exercise ID for bench press
        const { data: exercise } = await supabaseAdmin
          .from('exercises')
          .select('id')
          .ilike('name', '%bench%press%')
          .limit(1)
          .maybeSingle()
        
        if (exercise) {
          result = await syncStrengthGoal(goal.id, clientId, exercise.id)
        }
      } else if (titleLower.includes('squat')) {
        const { data: exercise } = await supabaseAdmin
          .from('exercises')
          .select('id')
          .ilike('name', '%squat%')
          .limit(1)
          .maybeSingle()
        
        if (exercise) {
          result = await syncStrengthGoal(goal.id, clientId, exercise.id)
        }
      } else if (titleLower.includes('deadlift')) {
        const { data: exercise } = await supabaseAdmin
          .from('exercises')
          .select('id')
          .ilike('name', '%deadlift%')
          .limit(1)
          .maybeSingle()
        
        if (exercise) {
          result = await syncStrengthGoal(goal.id, clientId, exercise.id)
        }
      } else if (titleLower.includes('hip thrust')) {
        const { data: exercise } = await supabaseAdmin
          .from('exercises')
          .select('id')
          .ilike('name', '%hip%thrust%')
          .limit(1)
          .maybeSingle()
        
        if (exercise) {
          result = await syncStrengthGoal(goal.id, clientId, exercise.id)
        }
      } else if (titleLower.includes('fat loss') || titleLower.includes('lose fat')) {
        result = await syncBodyCompositionGoal(goal.id, clientId, 'fat-loss')
      } else if (titleLower.includes('weight loss') || titleLower.includes('lose weight')) {
        result = await syncBodyCompositionGoal(goal.id, clientId, 'weight-loss')
      } else if (titleLower.includes('muscle gain') || titleLower.includes('gain muscle')) {
        result = await syncBodyCompositionGoal(goal.id, clientId, 'muscle-gain')
      } else if (titleLower.includes('body recomp') || titleLower.includes('recomposition')) {
        result = await syncBodyCompositionGoal(goal.id, clientId, 'body-recomp')
      } else if (titleLower.includes('workout consistency') || titleLower.includes('workouts per week')) {
        result = await syncWorkoutConsistencyGoal(goal.id, clientId)
      } else if (titleLower.includes('nutrition tracking') || titleLower.includes('meal logging')) {
        result = await syncNutritionTrackingGoal(goal.id, clientId)
      } else if (titleLower.includes('water intake') || titleLower.includes('water goal')) {
        result = await syncWaterIntakeGoal(goal.id, clientId)
      }

      if (result) {
        results.push(result)
      }
    }

    return results
  } catch (error) {
    console.error('Error in syncAllClientGoals:', error)
    return []
  }
}

