import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createErrorResponse, handleApiError, validateRequiredFields } from '@/lib/apiErrorHandler'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(req: NextRequest) {
  console.log("📥 /api/complete-workout called");
  
  try {
    const body = await req.json()
    console.log("📦 Request body:", body);
    
    const { workout_log_id, client_id, duration_minutes } = body

    console.log('📥 /api/complete-workout received:', {
      workout_assignment_id: body.workout_assignment_id, // In case it's passed
      workout_log_id,
      client_id,
      duration_minutes, // Simple duration from frontend (optional)
      has_workout_log_id: !!workout_log_id,
      has_client_id: !!client_id,
      has_duration_minutes: duration_minutes !== undefined,
    })

    // Validate required fields
    const validation = validateRequiredFields(body, ['workout_log_id', 'client_id'])
    if (!validation.valid) {
      return createErrorResponse(
        'Missing required fields',
        `Missing: ${validation.missing?.join(', ')}`,
        'VALIDATION_ERROR',
        400
      )
    }

    // Step 1: Get the workout_log to get started_at
    console.log('🔍 Fetching workout_log:', workout_log_id)
    const { data: workoutLog, error: logError } = await supabaseAdmin
      .from('workout_logs')
      .select('id, started_at, client_id')
      .eq('id', workout_log_id)
      .eq('client_id', client_id)
      .single()

    if (logError || !workoutLog) {
      console.error('❌ Error fetching workout_log:', logError)
      return createErrorResponse(
        'Workout log not found',
        logError?.message,
        'NOT_FOUND',
        404
      )
    }

    console.log('✅ Found workout_log:', {
      id: workoutLog.id,
      started_at: workoutLog.started_at,
    })

    // Step 2: Get workout_set_logs for THIS specific workout_log_id
    // ✅ CRITICAL: Since log-set API reuses the same active log, all sets are in this workout_log_id
    // Do NOT sum across multiple workout_logs - only sum sets for the log being completed
    console.log('🔍 Fetching workout_set_logs for workout_log_id:', workout_log_id)
    
    const { data: setLogs, error: setsError } = await supabaseAdmin
      .from('workout_set_logs')
      .select('id, weight, reps, exercise_id, completed_at, workout_log_id')
      .eq('workout_log_id', workout_log_id) // ✅ CRITICAL: Only sets for this specific log
      .eq('client_id', client_id)

    if (setsError) {
      console.error('❌ Error fetching workout_set_logs:', setsError)
      return createErrorResponse(
        'Failed to fetch set logs',
        setsError.message,
        'DATABASE_ERROR',
        500
      )
    }

    console.log('✅ Found workout_set_logs:', {
      count: setLogs?.length || 0,
      sample: setLogs?.[0] ? { weight: setLogs[0].weight, reps: setLogs[0].reps } : null,
    })

    // Step 3: Calculate totals from set logs
    const totalSetsCompleted = setLogs?.length || 0
    const totalRepsCompleted = setLogs?.reduce((sum, set) => sum + (set.reps || 0), 0) || 0
    const totalWeightLifted = setLogs?.reduce((sum, set) => sum + ((set.weight || 0) * (set.reps || 0)), 0) || 0

    console.log('📊 Calculated totals:', {
      totalSetsCompleted,
      totalRepsCompleted,
      totalWeightLifted,
    })

    // Step 4: Calculate duration
    // Use simple duration from frontend if provided, otherwise calculate from database
    let totalDurationMinutes: number;
    const completedAt = new Date();
    
    if (duration_minutes !== undefined && duration_minutes !== null) {
      // Use simple duration from frontend (from when workout screen opened to complete button clicked)
      totalDurationMinutes = Math.round(duration_minutes);
      console.log("🕐 [Simple Duration] Using frontend-provided duration:", {
        duration_minutes_from_frontend: duration_minutes,
        totalDurationMinutes,
      });
    } else {
      // Fallback: Calculate from database started_at (for backwards compatibility)
      const startedAt = workoutLog.started_at ? new Date(workoutLog.started_at) : new Date();
      const durationMs = completedAt.getTime() - startedAt.getTime();
      totalDurationMinutes = Math.round(durationMs / 1000 / 60);
      
      console.log("🕐 [Duration Debug] API duration calculation (fallback):", {
        started_at: workoutLog.started_at,
        started_at_ms: startedAt.getTime(),
        completed_at_ms: completedAt.getTime(),
        duration_ms: durationMs,
        duration_seconds: Math.floor(durationMs / 1000),
        duration_minutes: totalDurationMinutes,
      });
    }

    // Step 5: Update workout_logs with calculated totals
    console.log('🔍 About to update workout_logs:', {
      id: workout_log_id,
      client_id,
      with_values: {
        completed_at: completedAt.toISOString(),
        total_sets_completed: totalSetsCompleted,
        total_reps_completed: totalRepsCompleted,
        total_weight_lifted: totalWeightLifted,
        total_duration_minutes: totalDurationMinutes,
      }
    });
    
    const { data: updatedLog, error: updateError } = await supabaseAdmin
      .from('workout_logs')
      .update({
        completed_at: completedAt.toISOString(),
        total_duration_minutes: totalDurationMinutes,
        total_sets_completed: totalSetsCompleted,
        total_reps_completed: totalRepsCompleted,
        total_weight_lifted: totalWeightLifted,
      })
      .eq('id', workout_log_id)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Error updating workout_log:', {
        error: updateError,
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
      });
      return createErrorResponse(
        'Failed to update workout log',
        updateError.message,
        'DATABASE_ERROR',
        500
      )
    }

    console.log('✅ Updated workout_log:', {
      id: updatedLog?.id,
      completed_at: updatedLog?.completed_at,
      total_sets_completed: updatedLog?.total_sets_completed,
      total_reps_completed: updatedLog?.total_reps_completed,
      total_weight_lifted: updatedLog?.total_weight_lifted,
      total_duration_minutes: updatedLog?.total_duration_minutes,
    })

    // Sync workout consistency goals (non-blocking)
    try {
      const { syncWorkoutConsistencyGoal } = await import('@/lib/goalSyncService')
      
      // Find all workout consistency goals for this client
      const { data: consistencyGoals } = await supabaseAdmin
        .from('goals')
        .select('id')
        .eq('client_id', client_id)
        .eq('status', 'active')
        .or('title.ilike.%Workout Consistency%,title.ilike.%workouts per week%')

      if (consistencyGoals && consistencyGoals.length > 0) {
        for (const goal of consistencyGoals) {
          await syncWorkoutConsistencyGoal(goal.id, client_id)
        }
      }
    } catch (syncError) {
      console.error('Failed to sync workout consistency goals (non-blocking):', syncError)
      // Don't fail the request, just log error
    }

    // Check and unlock achievements (non-blocking)
    try {
      const { AchievementService } = await import('@/lib/achievementService')
      
      // Check workout_count achievements
      await AchievementService.checkAndUnlockAchievements(client_id, 'workout_count')
      
      // Check streak_weeks achievements (streak may have changed after completing this workout)
      await AchievementService.checkAndUnlockAchievements(client_id, 'streak_weeks')
    } catch (achievementError) {
      console.error('Failed to check/unlock achievements (non-blocking):', achievementError)
      // Don't fail the request, just log error
    }

    return NextResponse.json({
      success: true,
      workout_log: updatedLog,
      totals: {
        sets: totalSetsCompleted,
        reps: totalRepsCompleted,
        weight: totalWeightLifted,
        duration_minutes: totalDurationMinutes,
      },
    }, { status: 200 })
  } catch (error) {
    return handleApiError(error, 'Failed to complete workout')
  }
}

