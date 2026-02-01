import { NextRequest, NextResponse } from 'next/server'
import { createErrorResponse, handleApiError, validateRequiredFields } from '@/lib/apiErrorHandler'
import { validateApiAuth, validateOwnership, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/apiAuth'

export async function POST(req: NextRequest) {
  console.log("📥 /api/complete-workout called");
  
  try {
    // Validate authentication
    // supabaseAuth = session-based client (runs as authenticated user with RLS)
    // supabaseAdmin = service role client (bypasses RLS - use only when necessary)
    const { user, supabaseAuth, supabaseAdmin } = await validateApiAuth(req)
    const body = await req.json()
    console.log("📦 Request body:", body);
    
    const { workout_log_id, client_id, duration_minutes, session_id } = body

    console.log('📥 /api/complete-workout received:', {
      workout_assignment_id: body.workout_assignment_id, // In case it's passed
      workout_log_id,
      client_id,
      session_id, // workout_sessions.id
      duration_minutes, // Simple duration from frontend (optional)
      has_workout_log_id: !!workout_log_id,
      has_client_id: !!client_id,
      has_session_id: !!session_id,
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

    // SECURITY: Validate that client_id matches authenticated user
    validateOwnership(user.id, client_id)

    // Step 1: Get the workout_log to get started_at and program day info
    console.log('🔍 Fetching workout_log:', workout_log_id)
    const { data: workoutLog, error: logError } = await supabaseAdmin
      .from('workout_logs')
      .select('id, started_at, client_id, program_assignment_id, program_schedule_id')
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
      // Program day tracking (preserved on completion - NOT modified)
      program_assignment_id: workoutLog.program_assignment_id,
      program_schedule_id: workoutLog.program_schedule_id,
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

    // Step 6: Update workout_sessions status to 'completed' if session_id provided
    // Validate session_id is a valid UUID
    const isValidUuid = (value: string | null | undefined): boolean => {
      if (!value) return false;
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    };

    if (isValidUuid(session_id)) {
      console.log('🔍 Updating workout_sessions status to completed:', session_id);
      const { error: sessionUpdateError } = await supabaseAdmin
        .from('workout_sessions')
        .update({
          status: 'completed',
          completed_at: completedAt.toISOString(),
        })
        .eq('id', session_id)
        .eq('client_id', client_id);

      if (sessionUpdateError) {
        console.warn('⚠️ Failed to update workout_sessions (non-blocking):', sessionUpdateError);
        // Don't fail the request - workout_logs update succeeded
      } else {
        console.log('✅ Updated workout_sessions status to completed');
      }
    } else if (session_id) {
      console.log('⚠️ Skipping workout_sessions update - invalid session_id format:', session_id);
    }

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

    // ========================================================================
    // PROGRAM PROGRESSION: Advance the program progress via RPC (REQUIRED)
    // This is the CLIENT flow - client completes their own workout
    // Uses supabaseAuth (session client) so RLS is enforced and auth.uid() works
    // ========================================================================
    console.log('📈 [Program Progression] Calling advance_program_progress RPC...');
    const { data: rpcResult, error: rpcError } = await supabaseAuth.rpc(
      'advance_program_progress',
      {
        p_client_id: client_id,
        p_completed_by: user.id, // Client completing their own workout
        p_notes: null
      }
    );

    // RPC network/database error - fail the request
    if (rpcError) {
      console.error('❌ [Program Progression] RPC error:', rpcError);
      return createErrorResponse(
        'Failed to advance program progress',
        rpcError.message,
        'PROGRESSION_ERROR',
        500
      )
    }

    console.log('✅ [Program Progression] RPC result:', JSON.stringify(rpcResult, null, 2));

    // Handle RPC response statuses
    if (rpcResult?.status === 'error') {
      console.error('❌ [Program Progression] RPC returned error:', rpcResult.message);
      return createErrorResponse(
        'Failed to advance program progress',
        rpcResult.message,
        rpcResult.error || 'PROGRESSION_ERROR',
        500
      )
    }

    // 'already_completed' -> HTTP 409 (day was already marked complete)
    if (rpcResult?.status === 'already_completed') {
      console.log('ℹ️ [Program Progression] Day was already completed');
      return NextResponse.json({
        success: false,
        error: 'Day already completed',
        message: rpcResult.message,
        workout_log: updatedLog,
        program_progression: {
          status: rpcResult.status,
          current_week_index: rpcResult.current_week_index,
          current_day_index: rpcResult.current_day_index,
          is_completed: rpcResult.is_completed,
        },
      }, { status: 409 })
    }

    // 'completed' -> HTTP 409 (program was already fully finished)
    if (rpcResult?.status === 'completed') {
      console.log('🎉 [Program Progression] Program was already fully completed');
      return NextResponse.json({
        success: false,
        error: 'Program already completed',
        message: rpcResult.message,
        workout_log: updatedLog,
        program_progression: {
          status: rpcResult.status,
          current_week_index: rpcResult.current_week_index,
          current_day_index: rpcResult.current_day_index,
          is_completed: true,
        },
      }, { status: 409 })
    }

    // 'advanced' -> HTTP 200 (success)
    console.log(`📍 [Program Progression] Advanced to Week ${rpcResult?.current_week_index}, Day ${rpcResult?.current_day_index}`);
    
    // Log that program day columns were preserved (for audit)
    if (workoutLog.program_assignment_id || workoutLog.program_schedule_id) {
      console.log('📋 [Program Day Tracking] Completed workout had program day linkage:', {
        program_assignment_id: workoutLog.program_assignment_id,
        program_schedule_id: workoutLog.program_schedule_id,
      });
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
      program_progression: {
        status: rpcResult?.status,
        message: rpcResult?.message,
        current_week_index: rpcResult?.current_week_index,
        current_day_index: rpcResult?.current_day_index,
        is_completed: rpcResult?.is_completed,
      },
      // Include program day info for debugging
      program_day: {
        program_assignment_id: workoutLog.program_assignment_id,
        program_schedule_id: workoutLog.program_schedule_id,
      },
    }, { status: 200 })
  } catch (error: any) {
    // Handle auth errors specifically
    if (error.message === 'Missing authorization header' || error.message === 'Invalid or expired token' || error.message === 'User not authenticated') {
      return createUnauthorizedResponse(error.message)
    }
    if (error.message === 'Forbidden - Cannot access another user\'s resource') {
      return createForbiddenResponse(error.message)
    }
    return handleApiError(error, 'Failed to complete workout')
  }
}

