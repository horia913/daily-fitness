/**
 * POST /api/coach/pickup/mark-complete
 * 
 * Coach endpoint to mark the current training day as complete.
 * 
 * REFACTORED: Now uses the same unified pipeline as client completion.
 * 1. Auth: verify coach owns client
 * 2. Get client's current slot via programStateService
 * 3. Reuse or create workout_log for that slot
 * 4. Call completeWorkout() with completedBy = coach.id
 * 
 * Body: { clientId: UUID, notes?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateApiAuth, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/apiAuth'
import { getProgramState } from '@/lib/programStateService'
import { completeWorkout } from '@/lib/completeWorkoutService'
import {
  resolveProgramDayWorkoutMeta,
  fetchProgramDayAssignmentById,
} from '@/lib/resolveProgramDayWorkout'

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const { user, supabaseAuth, supabaseAdmin } = await validateApiAuth(request)
    
    // 2. Parse request body
    let body: { clientId?: string; notes?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }
    
    const { clientId, notes } = body
    
    if (!clientId) {
      return NextResponse.json(
        { error: 'Missing required field: clientId' },
        { status: 400 }
      )
    }
    
    // 3. Verify coach role
    const { data: coachProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single()
    
    if (profileError || !coachProfile) {
      return createUnauthorizedResponse('Profile not found')
    }
    
    if (coachProfile.role !== 'coach' && coachProfile.role !== 'admin') {
      return createForbiddenResponse('Only coaches can access this endpoint')
    }
    
    // 4. Verify client belongs to coach
    const { data: clientRelation, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('client_id')
      .eq('coach_id', user.id)
      .eq('client_id', clientId)
      .single()
    
    if (clientError || !clientRelation) {
      return createForbiddenResponse('Client not found or does not belong to this coach')
    }

    // ========================================================================
    // 5. Get client's program state using canonical resolver
    // ========================================================================
    const state = await getProgramState(supabaseAdmin, clientId)

    if (!state.assignment) {
      return NextResponse.json(
        { error: 'no_active_assignment', message: 'Client has no active program assignment' },
        { status: 404 }
      )
    }

    if (state.isCompleted) {
      return NextResponse.json(
        { error: 'Program already completed', message: 'All program workouts have been completed', is_completed: true },
        { status: 409 }
      )
    }

    if (!state.nextSlot) {
      return NextResponse.json(
        { error: 'No next slot', message: 'No uncompleted slots found' },
        { status: 409 }
      )
    }

    const programAssignmentId = state.assignment.id
    const programDayAssignmentId = state.nextSlot.id
    const templateId = state.nextSlot.template_id

    // ========================================================================
    // 6. Reuse or create workout_log for this slot
    //    Same logic as start-from-progress: check for existing incomplete log
    // ========================================================================
    let workoutLogId: string

    // Check for existing incomplete workout_log for this program day
    const { data: existingLog } = await supabaseAdmin
      .from('workout_logs')
      .select('id')
      .eq('client_id', clientId)
      .eq('program_assignment_id', programAssignmentId)
      .eq('program_day_assignment_id', programDayAssignmentId)
      .is('completed_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingLog) {
      workoutLogId = existingLog.id
    } else {
      // Need to create workout_assignment + workout_log
      const pdaRow = await fetchProgramDayAssignmentById(supabaseAdmin, programDayAssignmentId)
      const workoutMeta = pdaRow
        ? await resolveProgramDayWorkoutMeta(supabaseAdmin, pdaRow)
        : null

      if (!workoutMeta) {
        return NextResponse.json(
          { error: 'Workout not found', message: 'Could not resolve workout content for this program day' },
          { status: 404 }
        )
      }

      const today = new Date().toISOString().split('T')[0]
      const slotsInWeek = state.slots.filter(s => s.week_number === state.nextSlot!.week_number)
      const dayPosition = slotsInWeek.findIndex(s => s.id === state.nextSlot!.id) + 1
      const positionLabel = `Week ${state.nextSlot.week_number} • Day ${dayPosition}`

      const assignmentInsert: Record<string, unknown> = {
        client_id: clientId,
        coach_id: workoutMeta.coachId || user.id,
        name: `${positionLabel}: ${workoutMeta.displayName}`,
        description: workoutMeta.description,
        estimated_duration: workoutMeta.estimatedDuration || 60,
        assigned_date: today,
        scheduled_date: today,
        status: 'assigned',
        is_customized: workoutMeta.contentKind === 'instance_workout',
        notes: `Program: ${state.assignment.name || 'Program'} - ${positionLabel} (coach pickup)`,
        program_assignment_id: programAssignmentId,
      }
      if (workoutMeta.assignmentTemplateId) {
        assignmentInsert.workout_template_id = workoutMeta.assignmentTemplateId
      }

      const { data: newAssignment, error: assignmentError } = await supabaseAdmin
        .from('workout_assignments')
        .insert(assignmentInsert)
        .select()
        .single()

      if (assignmentError || !newAssignment) {
        console.error('[pickup/mark-complete] Error creating assignment:', assignmentError)
        return NextResponse.json(
          { error: 'Failed to create workout assignment', details: assignmentError?.message },
          { status: 500 }
        )
      }

      await supabaseAdmin
        .from('program_day_assignments')
        .update({ workout_assignment_id: newAssignment.id })
        .eq('id', programDayAssignmentId)
        .is('workout_assignment_id', null)

      const { data: newLog, error: logError } = await supabaseAdmin
        .from('workout_logs')
        .insert({
          workout_assignment_id: newAssignment.id,
          client_id: clientId,
          started_at: new Date().toISOString(),
          program_assignment_id: programAssignmentId,
          program_day_assignment_id: programDayAssignmentId,
        })
        .select()
        .single()

      if (logError || !newLog) {
        console.error('[pickup/mark-complete] Error creating log:', logError)
        return NextResponse.json(
          { error: 'Failed to create workout log', details: logError?.message },
          { status: 500 }
        )
      }

      workoutLogId = newLog.id
    }

    // ========================================================================
    // 7. Call unified completion pipeline
    // ========================================================================
    const result = await completeWorkout({
      supabaseAdmin,
      supabaseAuth,
      workoutLogId,
      clientId,
      completedBy: user.id, // Coach is completing on behalf of client
      notes: notes || undefined,
    })

    // Handle idempotent case
    if (result.alreadyCompleted) {
      return NextResponse.json({
        success: true,
        message: 'Day was already completed',
        already_completed: true,
      }, { status: 200 })
    }

    // ========================================================================
    // 8. Build response
    // ========================================================================
    const response: any = {
      success: true,
      message: result.programProgression?.status === 'program_completed'
        ? 'Program completed!'
        : 'Day marked complete',
      
      // What was just completed
      completed: {
        week_number: state.nextSlot.week_number,
        day_number: state.nextSlot.day_number,
      },
      
      // New state
      program_assignment_id: programAssignmentId,
      program_id: state.assignment.program_id,
      program_name: state.assignment.name || 'Program',
      
      current_week_number: result.programProgression?.currentWeekNumber,
      current_day_number: result.programProgression?.currentDayNumber,
      is_completed: result.programProgression?.isCompleted || false,
    }

    return NextResponse.json(response)
    
  } catch (error: any) {
    console.error('[pickup/mark-complete] Error:', error)
    
    if (error.message === 'User not authenticated') {
      return createUnauthorizedResponse('Not authenticated')
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
