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
    console.log(`[pickup/mark-complete] Getting program state for client: ${clientId}`)
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
    const programScheduleId = state.nextSlot.id
    const templateId = state.nextSlot.template_id

    console.log(`[pickup/mark-complete] Next slot:`, {
      schedule_id: programScheduleId,
      week: state.nextSlot.week_number,
      day: state.nextSlot.day_number,
      template_id: templateId,
    })

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
      .eq('program_schedule_id', programScheduleId)
      .is('completed_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingLog) {
      workoutLogId = existingLog.id
      console.log(`[pickup/mark-complete] Reusing existing incomplete log: ${workoutLogId}`)
    } else {
      // Need to create workout_assignment + workout_log
      // Get template info
      const { data: template } = await supabaseAdmin
        .from('workout_templates')
        .select('id, name, description, estimated_duration, coach_id')
        .eq('id', templateId)
        .single()

      if (!template) {
        return NextResponse.json(
          { error: 'Template not found', message: `Template ${templateId} not found` },
          { status: 404 }
        )
      }

      const today = new Date().toISOString().split('T')[0]
      const slotsInWeek = state.slots.filter(s => s.week_number === state.nextSlot!.week_number)
      const dayPosition = slotsInWeek.findIndex(s => s.id === state.nextSlot!.id) + 1
      const positionLabel = `Week ${state.nextSlot.week_number} • Day ${dayPosition}`

      // Create workout_assignment
      const { data: newAssignment, error: assignmentError } = await supabaseAdmin
        .from('workout_assignments')
        .insert({
          workout_template_id: templateId,
          client_id: clientId,
          coach_id: template.coach_id || user.id,
          name: `${positionLabel}: ${template.name}`,
          description: template.description,
          estimated_duration: template.estimated_duration || 60,
          assigned_date: today,
          scheduled_date: today,
          status: 'assigned',
          is_customized: false,
          notes: `Program: ${state.assignment.name || 'Program'} - ${positionLabel} (coach pickup)`,
        })
        .select()
        .single()

      if (assignmentError || !newAssignment) {
        console.error('[pickup/mark-complete] Error creating assignment:', assignmentError)
        return NextResponse.json(
          { error: 'Failed to create workout assignment', details: assignmentError?.message },
          { status: 500 }
        )
      }

      // Create workout_log
      const { data: newLog, error: logError } = await supabaseAdmin
        .from('workout_logs')
        .insert({
          workout_assignment_id: newAssignment.id,
          client_id: clientId,
          started_at: new Date().toISOString(),
          program_assignment_id: programAssignmentId,
          program_schedule_id: programScheduleId,
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
      console.log(`[pickup/mark-complete] Created new assignment + log: ${workoutLogId}`)
    }

    // ========================================================================
    // 7. Call unified completion pipeline
    // ========================================================================
    console.log(`[pickup/mark-complete] Calling completeWorkout for log: ${workoutLogId}`)
    
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

    console.log(`[pickup/mark-complete] Success:`, response)
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
