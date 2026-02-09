/**
 * POST /api/program-workouts/start-from-progress
 * 
 * IDEMPOTENT endpoint to start/resume a program workout.
 * 
 * REFACTORED: Now uses programStateService for canonical slot resolution.
 * 
 * Flow:
 * 1. Accept optional program_schedule_id (for user-selected slot).
 *    If not provided, use programStateService.getNextSlot() as default.
 * 2. Validate the chosen slot belongs to the program and is NOT already completed.
 * 3. Check for existing in-progress workout FOR THIS EXACT PROGRAM DAY:
 *    - workout_sessions with status='in_progress' AND matching program day
 *    - workout_logs with completed_at IS NULL AND matching program day
 * 4. If found, return existing workout_assignment_id (REUSE)
 * 5. If not found, create new workout_assignment + session + log (CREATE)
 *    and TAG them with program_assignment_id + program_schedule_id
 * 
 * Body: { client_id?: string, program_schedule_id?: string }
 * 
 * Returns: { workout_assignment_id, template_id, program_assignment_id, program_schedule_id, ... }
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateApiAuth, validateOwnership, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/apiAuth'
import {
  getProgramState,
  getCompletedSlots,
  ProgramScheduleSlot,
} from '@/lib/programStateService'

export async function POST(request: NextRequest) {
  try {
    const { user, supabaseAuth, supabaseAdmin } = await validateApiAuth(request)
    
    // Parse body
    let body: { client_id?: string; program_schedule_id?: string } = {}
    try {
      body = await request.json()
    } catch {
      // No body provided, use auth.uid()
    }
    
    const clientId = body.client_id || user.id
    
    // Security: Client can only start their own workout
    validateOwnership(user.id, clientId)
    
    console.log('[start-from-progress] Starting for client:', clientId)
    
    // ========================================================================
    // STEP 1: Get program state from canonical resolver
    // ========================================================================
    const state = await getProgramState(supabaseAuth, clientId)
    
    if (!state.assignment) {
      return NextResponse.json({
        error: 'No active program',
        message: 'No active program assignment found',
        status: 'no_program',
      }, { status: 404 })
    }
    
    if (state.isCompleted) {
      return NextResponse.json({
        error: 'Program completed',
        message: 'All program workouts have been completed',
        status: 'completed',
      }, { status: 409 })
    }
    
    if (state.slots.length === 0) {
      return NextResponse.json({
        error: 'No schedule',
        message: 'No training days configured in program schedule',
        status: 'no_schedule',
      }, { status: 404 })
    }
    
    const programAssignmentId = state.assignment.id
    
    // ========================================================================
    // STEP 2: Determine which slot to start
    // ========================================================================
    let chosenSlot: ProgramScheduleSlot | null = null
    
    if (body.program_schedule_id) {
      // User selected a specific slot — validate it
      const requestedSlot = state.slots.find(s => s.id === body.program_schedule_id)
      
      if (!requestedSlot) {
        return NextResponse.json({
          error: 'Invalid slot',
          message: 'The selected schedule slot does not belong to this program',
        }, { status: 400 })
      }
      
      // Check if already completed
      const completedScheduleIds = new Set(state.completedSlots.map(c => c.program_schedule_id))
      if (completedScheduleIds.has(requestedSlot.id)) {
        return NextResponse.json({
          error: 'Slot already completed',
          message: 'This program day has already been completed',
        }, { status: 409 })
      }
      
      chosenSlot = requestedSlot
      console.log('[start-from-progress] User selected specific slot:', {
        schedule_id: chosenSlot.id,
        week: chosenSlot.week_number,
        day: chosenSlot.day_number,
      })
    } else {
      // Use next uncompleted slot (default)
      chosenSlot = state.nextSlot
      
      if (!chosenSlot) {
        return NextResponse.json({
          error: 'Program completed',
          message: 'All program workouts have been completed',
          status: 'completed',
        }, { status: 409 })
      }
      
      console.log('[start-from-progress] Using next slot:', {
        schedule_id: chosenSlot.id,
        week: chosenSlot.week_number,
        day: chosenSlot.day_number,
      })
    }
    
    const templateId = chosenSlot.template_id
    const programScheduleId = chosenSlot.id
    
    // Compute position label
    const slotsInWeek = state.slots.filter(s => s.week_number === chosenSlot!.week_number)
    const dayPosition = slotsInWeek.findIndex(s => s.id === chosenSlot!.id) + 1
    const positionLabel = `Week ${chosenSlot.week_number} • Day ${dayPosition}`
    
    // ========================================================================
    // STEP 3: Check for existing in-progress workout FOR THIS EXACT PROGRAM DAY
    // Keyed by (client_id, program_assignment_id, program_schedule_id)
    // ========================================================================
    
    // 3a. Check workout_sessions for in-progress session
    console.log('[start-from-progress] Checking for in-progress sessions by program day...')
    const { data: inProgressSession, error: sessionError } = await supabaseAuth
      .from('workout_sessions')
      .select('id, assignment_id, status, started_at, program_assignment_id, program_schedule_id')
      .eq('client_id', clientId)
      .eq('program_assignment_id', programAssignmentId)
      .eq('program_schedule_id', programScheduleId)
      .eq('status', 'in_progress')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (sessionError) {
      console.error('[start-from-progress] Error checking sessions:', sessionError)
    } else if (inProgressSession) {
      console.log('[start-from-progress] REUSED existing in-progress session:', inProgressSession.id)
      
      return NextResponse.json({
        workout_assignment_id: inProgressSession.assignment_id,
        template_id: templateId,
        week_number: chosenSlot.week_number,
        day_position: dayPosition,
        position_label: positionLabel,
        program_assignment_id: programAssignmentId,
        program_schedule_id: programScheduleId,
        reused_existing: true,
        reuse_reason: 'in_progress_session_by_program_day',
        session_id: inProgressSession.id,
      })
    }
    
    // 3b. Check workout_logs for incomplete log
    console.log('[start-from-progress] Checking for incomplete workout_logs by program day...')
    const { data: incompleteLog, error: logError } = await supabaseAuth
      .from('workout_logs')
      .select('id, workout_assignment_id, started_at, program_assignment_id, program_schedule_id')
      .eq('client_id', clientId)
      .eq('program_assignment_id', programAssignmentId)
      .eq('program_schedule_id', programScheduleId)
      .is('completed_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (logError) {
      console.error('[start-from-progress] Error checking logs:', logError)
    } else if (incompleteLog) {
      console.log('[start-from-progress] REUSED existing incomplete log:', incompleteLog.id)
      
      return NextResponse.json({
        workout_assignment_id: incompleteLog.workout_assignment_id,
        template_id: templateId,
        week_number: chosenSlot.week_number,
        day_position: dayPosition,
        position_label: positionLabel,
        program_assignment_id: programAssignmentId,
        program_schedule_id: programScheduleId,
        reused_existing: true,
        reuse_reason: 'incomplete_log_by_program_day',
      })
    }
    
    // ========================================================================
    // STEP 4: No existing workout for this program day — create new
    // ========================================================================
    console.log('[start-from-progress] No existing workout for this program day, creating new...')
    
    // Get template info for naming
    const { data: template, error: templateError } = await supabaseAuth
      .from('workout_templates')
      .select('id, name, description, estimated_duration, coach_id')
      .eq('id', templateId)
      .single()
    
    if (templateError || !template) {
      console.error('[start-from-progress] Template not found:', templateId, templateError)
      return NextResponse.json({
        error: 'Template not found',
        message: `Template ${templateId} not found`,
      }, { status: 404 })
    }
    
    // 4a. Create workout_assignment
    const today = new Date().toISOString().split('T')[0]
    const workoutName = `${positionLabel}: ${template.name}`
    
    const { data: newAssignment, error: assignmentError } = await supabaseAdmin
      .from('workout_assignments')
      .insert({
        workout_template_id: templateId,
        client_id: clientId,
        coach_id: template.coach_id,
        name: workoutName,
        description: template.description,
        estimated_duration: template.estimated_duration || 60,
        assigned_date: today,
        scheduled_date: today,
        status: 'assigned',
        is_customized: false,
        notes: `Program: ${state.assignment.name || 'Program'} - ${positionLabel}`,
      })
      .select()
      .single()
    
    if (assignmentError || !newAssignment) {
      console.error('[start-from-progress] Error creating workout_assignment:', assignmentError)
      return NextResponse.json({
        error: 'Failed to create workout assignment',
        details: assignmentError?.message,
      }, { status: 500 })
    }
    
    // 4b. Create workout_session WITH program day tagging
    let newSession: any = null
    const { data: sessionData, error: sessionCreateError } = await supabaseAdmin
      .from('workout_sessions')
      .insert({
        assignment_id: newAssignment.id,
        client_id: clientId,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        program_assignment_id: programAssignmentId,
        program_schedule_id: programScheduleId,
      })
      .select()
      .single()
    
    if (sessionCreateError) {
      console.error('[start-from-progress] Error creating workout_session:', sessionCreateError)
    } else {
      newSession = sessionData
    }
    
    // 4c. Create workout_log WITH program day tagging
    let newLog: any = null
    const { data: logData, error: logCreateError } = await supabaseAdmin
      .from('workout_logs')
      .insert({
        workout_assignment_id: newAssignment.id,
        client_id: clientId,
        started_at: new Date().toISOString(),
        workout_session_id: newSession?.id || null,
        program_assignment_id: programAssignmentId,
        program_schedule_id: programScheduleId,
      })
      .select()
      .single()
    
    if (logCreateError) {
      console.error('[start-from-progress] Error creating workout_log:', logCreateError)
    } else {
      newLog = logData
    }
    
    console.log('[start-from-progress] CREATED new workout for program day:', {
      workout_assignment_id: newAssignment.id,
      workout_session_id: newSession?.id,
      workout_log_id: newLog?.id,
      template_id: templateId,
      program_assignment_id: programAssignmentId,
      program_schedule_id: programScheduleId,
      name: workoutName,
    })
    
    // ========================================================================
    // STEP 5: Return the new assignment info
    // ========================================================================
    return NextResponse.json({
      workout_assignment_id: newAssignment.id,
      template_id: templateId,
      week_number: chosenSlot.week_number,
      day_position: dayPosition,
      position_label: positionLabel,
      program_assignment_id: programAssignmentId,
      program_schedule_id: programScheduleId,
      reused_existing: false,
      reuse_reason: null,
      session_id: newSession?.id || null,
      log_id: newLog?.id || null,
    })
    
  } catch (error: any) {
    console.error('[start-from-progress] Error:', error)
    
    if (error.message === 'User not authenticated') {
      return createUnauthorizedResponse('Not authenticated')
    }
    if (error.message === 'Forbidden - Cannot access another user\'s resource') {
      return createForbiddenResponse(error.message)
    }
    
    return NextResponse.json({
      error: error.message || 'Internal server error',
    }, { status: 500 })
  }
}
