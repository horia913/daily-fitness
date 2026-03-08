import { NextRequest, NextResponse } from 'next/server'
import { createErrorResponse, handleApiError, validateRequiredFields } from '@/lib/apiErrorHandler'
import { validateApiAuth, validateOwnership, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/apiAuth'

export async function POST(req: NextRequest) {
  try {
    const { user, supabaseAdmin } = await validateApiAuth(req)
    const body = await req.json()
    const { program_day_assignment_id } = body

    // Validate required fields
    const validation = validateRequiredFields(body, ['program_day_assignment_id'])
    if (!validation.valid) {
      return createErrorResponse(
        'Missing required fields',
        `Missing: ${validation.missing?.join(', ')}`,
        'VALIDATION_ERROR',
        400
      )
    }

    const { data: programDayAssignment, error: programDayError } = await supabaseAdmin
      .from('program_day_assignments')
      .select('id, program_assignment_id, day_type, workout_assignment_id, workout_template_id, name, description, day_number')
      .eq('id', program_day_assignment_id)
      .maybeSingle()

    if (programDayError) {
      console.error('❌ Error loading program_day_assignments:', programDayError)
      return createErrorResponse(
        'Failed to load program day assignment',
        programDayError.message || 'Unknown error',
        'DATABASE_ERROR',
        500
      )
    }

    if (!programDayAssignment) {
      return createErrorResponse(
        'Program day assignment not found',
        'The specified program day assignment does not exist',
        'NOT_FOUND',
        404
      )
    }

    // Step c) Reject if day_type != 'workout'
    if (programDayAssignment.day_type !== 'workout') {
      return createErrorResponse(
        'Invalid workout type',
        'This program day is not a workout day',
        'VALIDATION_ERROR',
        400
      )
    }

    // Step d) Verify ownership and active status — must happen before completion check
    // so we have program_id for the canonical ledger query below.
    const { data: programAssignment, error: programAssignmentError } = await supabaseAdmin
      .from('program_assignments')
      .select('id, program_id, client_id, coach_id, status')
      .eq('id', programDayAssignment.program_assignment_id)
      .eq('client_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (programAssignmentError) {
      console.error('❌ Error loading program_assignment:', programAssignmentError)
      return createErrorResponse(
        'Failed to verify program assignment',
        programAssignmentError.message || 'Unknown error',
        'DATABASE_ERROR',
        500
      )
    }

    if (!programAssignment) {
      return createForbiddenResponse('Program assignment not found or access denied')
    }

    // Step e) Guardrail: check canonical program_day_completions ledger.
    // DO NOT use program_day_assignments.is_completed — that field is a stale legacy
    // flag no longer written by the completion pipeline. The ledger is the single
    // source of truth. See programStateService.ts.
    const { data: scheduleSlot } = await supabaseAdmin
      .from('program_schedule')
      .select('id')
      .eq('program_id', programAssignment.program_id)
      .eq('day_number', programDayAssignment.day_number)
      .maybeSingle()

    if (scheduleSlot) {
      const { data: completionEntry } = await supabaseAdmin
        .from('program_day_completions')
        .select('id')
        .eq('program_assignment_id', programDayAssignment.program_assignment_id)
        .eq('program_schedule_id', scheduleSlot.id)
        .maybeSingle()

      if (completionEntry) {
        return createErrorResponse(
          'Workout already completed',
          'This program workout has already been completed',
          'VALIDATION_ERROR',
          400
        )
      }
    }

    if (programDayAssignment.workout_assignment_id) {
      return NextResponse.json({
        success: true,
        workout_assignment_id: programDayAssignment.workout_assignment_id,
      }, { status: 200 })
    }

    // Step f) Insert workout_assignments using supabaseAdmin
    if (!programDayAssignment.workout_template_id) {
      return createErrorResponse(
        'Missing workout template',
        'The program day assignment does not have a workout_template_id',
        'VALIDATION_ERROR',
        400
      )
    }

    const today = new Date().toISOString().split('T')[0]
    const workoutName = programDayAssignment.name || `Program Workout Day ${programDayAssignment.day_number || 'X'}`
    const workoutDescription = programDayAssignment.description || null

    const { data: newWorkoutAssignment, error: createError } = await supabaseAdmin
      .from('workout_assignments')
      .insert({
        client_id: user.id,
        coach_id: programAssignment.coach_id,
        workout_template_id: programDayAssignment.workout_template_id,
        scheduled_date: today,
        status: 'in_progress',
        name: workoutName,
        description: workoutDescription,
      })
      .select('id')
      .single()

    if (createError) {
      console.error('❌ Error creating workout_assignment:', createError)
      return createErrorResponse(
        'Failed to create workout assignment',
        createError.message || 'Unknown error',
        'DATABASE_ERROR',
        500
      )
    }

    if (!newWorkoutAssignment) {
      return createErrorResponse(
        'Failed to create workout assignment',
        'Insert succeeded but no data returned',
        'DATABASE_ERROR',
        500
      )
    }

    // Step g) Update program_day_assignments.workout_assignment_id
    const { error: updateError } = await supabaseAdmin
      .from('program_day_assignments')
      .update({ workout_assignment_id: newWorkoutAssignment.id })
      .eq('id', programDayAssignment.id)

    if (updateError) {
      console.error('❌ Error updating program_day_assignments:', updateError)
      // Don't fail the request - workout_assignment was created successfully
      // Log warning but return success
      console.warn('⚠️ Warning: Failed to link workout_assignment to program_day_assignments, but workout_assignment was created')
    }

    return NextResponse.json({
      success: true,
      workout_assignment_id: newWorkoutAssignment.id,
    }, { status: 200 })
  } catch (error: any) {
    // Handle auth errors specifically
    if (error.message === 'User not authenticated') {
      return createUnauthorizedResponse('User not authenticated')
    }
    if (error.message?.includes('Forbidden')) {
      return createForbiddenResponse(error.message)
    }
    return handleApiError(error, 'Failed to start program workout')
  }
}
