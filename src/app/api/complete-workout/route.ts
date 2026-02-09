/**
 * POST /api/complete-workout
 * 
 * Client endpoint for completing a workout.
 * 
 * REFACTORED: Now delegates to completeWorkoutService for the unified pipeline.
 * The advance_program_progress RPC is no longer called.
 * Program completion is handled via the canonical ledger (program_day_completions).
 * 
 * Body: { workout_log_id, client_id, duration_minutes?, session_id? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createErrorResponse, handleApiError, validateRequiredFields } from '@/lib/apiErrorHandler'
import { validateApiAuth, validateOwnership, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/apiAuth'
import { completeWorkout } from '@/lib/completeWorkoutService'

export async function POST(req: NextRequest) {
  console.log("📥 /api/complete-workout called");
  
  try {
    // Validate authentication
    const { user, supabaseAuth, supabaseAdmin } = await validateApiAuth(req)
    const body = await req.json()
    
    const { workout_log_id, client_id, duration_minutes, session_id } = body

    console.log('📥 /api/complete-workout received:', {
      workout_log_id,
      client_id,
      session_id,
      duration_minutes,
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

    // ========================================================================
    // UNIFIED PIPELINE: Delegate to completeWorkoutService
    // ========================================================================
    const result = await completeWorkout({
      supabaseAdmin,
      supabaseAuth,
      workoutLogId: workout_log_id,
      clientId: client_id,
      completedBy: user.id,
      durationMinutes: duration_minutes,
      sessionId: session_id,
    })

    // Handle idempotent case (already completed)
    if (result.alreadyCompleted) {
      console.log('ℹ️ Workout was already completed (idempotent no-op)')
      return NextResponse.json({
        success: true,
        already_completed: true,
        message: 'Workout was already completed',
        workout_log: result.workoutLog,
      }, { status: 200 })
    }

    // Build response
    const response: any = {
      success: true,
      workout_log: result.workoutLog,
      totals: result.totals,
    }

    // Include program progression info if available
    if (result.programProgression) {
      response.program_progression = {
        status: result.programProgression.status,
        current_week_number: result.programProgression.currentWeekNumber,
        current_day_number: result.programProgression.currentDayNumber,
        is_completed: result.programProgression.isCompleted,
      }
      response.program_day = {
        program_assignment_id: result.programProgression.programAssignmentId,
        program_schedule_id: result.programProgression.programScheduleId,
      }
    }

    console.log('✅ Workout completed successfully via unified pipeline')
    return NextResponse.json(response, { status: 200 })

  } catch (error: any) {
    // Handle auth errors specifically
    if (error.message === 'Missing authorization header' || error.message === 'Invalid or expired token' || error.message === 'User not authenticated') {
      return createUnauthorizedResponse(error.message)
    }
    if (error.message === 'Forbidden - Cannot access another user\'s resource') {
      return createForbiddenResponse(error.message)
    }

    // Handle workout-not-found specifically
    if (error.message?.startsWith('Workout log not found')) {
      return createErrorResponse(
        'Workout log not found',
        error.message,
        'NOT_FOUND',
        404
      )
    }

    return handleApiError(error, 'Failed to complete workout')
  }
}
