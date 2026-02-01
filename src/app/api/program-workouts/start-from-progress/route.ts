/**
 * POST /api/program-workouts/start-from-progress
 * 
 * IDEMPOTENT endpoint to start/resume the current program workout.
 * Idempotency is keyed by PROGRAM DAY (program_assignment_id + program_schedule_id),
 * NOT by template_id, because templates can repeat across weeks/days.
 * 
 * Flow:
 * 1. Get current program day via program_progress + program_schedule
 * 2. Check for existing in-progress workout FOR THIS EXACT PROGRAM DAY:
 *    - workout_sessions with status='in_progress' AND matching program day
 *    - workout_logs with completed_at IS NULL AND matching program day
 * 3. If found, return existing workout_assignment_id (REUSE)
 * 4. If not found, create new workout_assignment + workout_session (CREATE)
 *    and TAG them with program_assignment_id + program_schedule_id
 * 
 * Body: { client_id?: string } (optional - uses auth.uid() if not provided)
 * 
 * Returns: { workout_assignment_id, template_id, program_assignment_id, program_schedule_id, ... }
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateApiAuth, validateOwnership, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/apiAuth'
import { getCurrentWorkoutFromProgress } from '@/lib/programProgressService'

export async function POST(request: NextRequest) {
  try {
    // supabaseAuth = session client (for reads with RLS)
    // supabaseAdmin = service role (for inserts that bypass RLS - only after ownership validation)
    const { user, supabaseAuth, supabaseAdmin } = await validateApiAuth(request)
    
    // Parse optional body
    let body: { client_id?: string } = {}
    try {
      body = await request.json()
    } catch {
      // No body provided, use auth.uid()
    }
    
    const clientId = body.client_id || user.id
    
    // Security: Client can only start their own workout
    // (Coach flow uses different endpoint)
    validateOwnership(user.id, clientId)
    
    console.log('[start-from-progress] Starting for client:', clientId)
    
    // ========================================================================
    // STEP 1: Get current program day via program_progress + program_schedule
    // ========================================================================
    const workoutInfo = await getCurrentWorkoutFromProgress(supabaseAuth, clientId)
    
    console.log('[start-from-progress] Current program day:', {
      status: workoutInfo.status,
      program_assignment_id: workoutInfo.program_assignment_id,
      program_schedule_id: workoutInfo.schedule_row_id,
      template_id: workoutInfo.template_id,
      week_index: workoutInfo.current_week_index,
      day_index: workoutInfo.current_day_index,
      position: workoutInfo.position_label,
    })
    
    if (workoutInfo.status !== 'active') {
      console.log('[start-from-progress] Program not active:', workoutInfo.status)
      return NextResponse.json({
        error: workoutInfo.status === 'completed' ? 'Program completed' : 'No active program',
        message: workoutInfo.message,
        status: workoutInfo.status,
      }, { status: workoutInfo.status === 'completed' ? 409 : 404 })
    }
    
    if (!workoutInfo.template_id || !workoutInfo.schedule_row_id || !workoutInfo.program_assignment_id) {
      console.log('[start-from-progress] Missing required info:', {
        template_id: workoutInfo.template_id,
        schedule_row_id: workoutInfo.schedule_row_id,
        program_assignment_id: workoutInfo.program_assignment_id,
      })
      return NextResponse.json({
        error: 'Invalid program configuration',
        message: 'Current workout is missing template or schedule configuration',
      }, { status: 422 })
    }
    
    const templateId = workoutInfo.template_id
    const programAssignmentId = workoutInfo.program_assignment_id
    const programScheduleId = workoutInfo.schedule_row_id
    
    // ========================================================================
    // STEP 2: Check for existing in-progress workout FOR THIS EXACT PROGRAM DAY
    // Keyed by (client_id, program_assignment_id, program_schedule_id)
    // NOT by template_id (templates can repeat across days)
    // 
    // NOTE: If migration hasn't run yet (columns don't exist), fall back to
    // template-based matching with a warning.
    // ========================================================================
    
    let useProgramDayColumns = true
    
    // 2a. Check workout_sessions for in-progress session for this EXACT program day
    console.log('[start-from-progress] Checking for in-progress sessions by program day...')
    try {
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
        // Column doesn't exist yet - migration not run
        if (sessionError.message?.includes('program_assignment_id') || sessionError.message?.includes('program_schedule_id')) {
          console.warn('[start-from-progress] ⚠️ program_day columns not found - migration not run yet. Falling back to template-based matching.')
          useProgramDayColumns = false
        } else {
          console.error('[start-from-progress] Error checking sessions:', sessionError)
        }
      } else if (inProgressSession) {
        console.log('[start-from-progress] ✅ REUSED existing in-progress session (by program day):', {
          session_id: inProgressSession.id,
          workout_assignment_id: inProgressSession.assignment_id,
          started_at: inProgressSession.started_at,
          program_assignment_id: inProgressSession.program_assignment_id,
          program_schedule_id: inProgressSession.program_schedule_id,
        })
        
        return NextResponse.json({
          workout_assignment_id: inProgressSession.assignment_id,
          template_id: templateId,
          week_number: workoutInfo.actual_week_number,
          day_position: (workoutInfo.current_day_index || 0) + 1,
          position_label: workoutInfo.position_label,
          program_assignment_id: programAssignmentId,
          program_schedule_id: programScheduleId,
          reused_existing: true,
          reuse_reason: 'in_progress_session_by_program_day',
          session_id: inProgressSession.id,
        })
      }
    } catch (err) {
      console.warn('[start-from-progress] ⚠️ Error checking sessions - columns may not exist:', err)
      useProgramDayColumns = false
    }
    
    // 2b. Check workout_logs for incomplete log for this EXACT program day
    if (useProgramDayColumns) {
      console.log('[start-from-progress] Checking for incomplete workout_logs by program day...')
      try {
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
          if (logError.message?.includes('program_assignment_id') || logError.message?.includes('program_schedule_id')) {
            console.warn('[start-from-progress] ⚠️ program_day columns not found on workout_logs - migration not run yet.')
            useProgramDayColumns = false
          } else {
            console.error('[start-from-progress] Error checking logs:', logError)
          }
        } else if (incompleteLog) {
          console.log('[start-from-progress] ✅ REUSED existing incomplete log (by program day):', {
            log_id: incompleteLog.id,
            workout_assignment_id: incompleteLog.workout_assignment_id,
            started_at: incompleteLog.started_at,
            program_assignment_id: incompleteLog.program_assignment_id,
            program_schedule_id: incompleteLog.program_schedule_id,
          })
          
          return NextResponse.json({
            workout_assignment_id: incompleteLog.workout_assignment_id,
            template_id: templateId,
            week_number: workoutInfo.actual_week_number,
            day_position: (workoutInfo.current_day_index || 0) + 1,
            position_label: workoutInfo.position_label,
            program_assignment_id: programAssignmentId,
            program_schedule_id: programScheduleId,
            reused_existing: true,
            reuse_reason: 'incomplete_log_by_program_day',
          })
        }
      } catch (err) {
        console.warn('[start-from-progress] ⚠️ Error checking logs - columns may not exist:', err)
        useProgramDayColumns = false
      }
    }
    
    // 2c. FALLBACK: If columns don't exist, check by template_id (less precise but works)
    if (!useProgramDayColumns) {
      console.log('[start-from-progress] ⚠️ Using template-based fallback (run migration for program-day precision)')
      
      // Check for existing active assignment with same template
      const { data: existingAssignment } = await supabaseAuth
        .from('workout_assignments')
        .select('id, status, created_at')
        .eq('client_id', clientId)
        .eq('workout_template_id', templateId)
        .in('status', ['assigned', 'active'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (existingAssignment) {
        console.log('[start-from-progress] ✅ REUSED existing assignment (template-based fallback):', {
          workout_assignment_id: existingAssignment.id,
          status: existingAssignment.status,
        })
        
        return NextResponse.json({
          workout_assignment_id: existingAssignment.id,
          template_id: templateId,
          week_number: workoutInfo.actual_week_number,
          day_position: (workoutInfo.current_day_index || 0) + 1,
          position_label: workoutInfo.position_label,
          program_assignment_id: programAssignmentId,
          program_schedule_id: programScheduleId,
          reused_existing: true,
          reuse_reason: 'existing_assignment_template_fallback',
          migration_needed: true,
        })
      }
    }
    
    // ========================================================================
    // STEP 3: No existing workout for this program day - create new
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
    
    // 3a. Create workout_assignment
    // NOTE: Using supabaseAdmin because RLS on workout_assignments only allows coaches to INSERT.
    // Ownership was already validated above (client_id === user.id).
    const today = new Date().toISOString().split('T')[0]
    const workoutName = workoutInfo.position_label 
      ? `${workoutInfo.position_label}: ${template.name}`
      : template.name
    
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
        status: 'assigned',  // Valid values: 'assigned', 'in_progress', 'completed', 'skipped'
        is_customized: false,
        notes: `Program: ${workoutInfo.program_name || 'Program'} - ${workoutInfo.position_label || 'Workout'}`,
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
    
    console.log('[start-from-progress] Created workout_assignment:', newAssignment.id)
    
    // 3b. Create workout_session WITH program day tagging (if columns exist)
    // Using supabaseAdmin to ensure consistent insert behavior
    let newSession: any = null
    const sessionInsertData: any = {
      assignment_id: newAssignment.id,
      client_id: clientId,
      status: 'in_progress',
      started_at: new Date().toISOString(),
    }
    
    // Only add program day columns if migration has been run
    if (useProgramDayColumns) {
      sessionInsertData.program_assignment_id = programAssignmentId
      sessionInsertData.program_schedule_id = programScheduleId
    }
    
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('workout_sessions')
      .insert(sessionInsertData)
      .select()
      .single()
    
    if (sessionError) {
      console.error('[start-from-progress] Error creating workout_session:', sessionError)
      // Non-fatal - assignment was created, session creation is a secondary concern
      console.warn('[start-from-progress] Proceeding without session - will be created on workout start page')
    } else {
      newSession = sessionData
      console.log('[start-from-progress] Created workout_session:', newSession.id)
    }
    
    // 3c. Create workout_log WITH program day tagging (if columns exist)
    // Using supabaseAdmin to ensure consistent insert behavior
    let newLog: any = null
    const logInsertData: any = {
      workout_assignment_id: newAssignment.id,
      client_id: clientId,
      started_at: new Date().toISOString(),
      workout_session_id: newSession?.id || null,
    }
    
    // Only add program day columns if migration has been run
    if (useProgramDayColumns) {
      logInsertData.program_assignment_id = programAssignmentId
      logInsertData.program_schedule_id = programScheduleId
    }
    
    const { data: logData, error: logError } = await supabaseAdmin
      .from('workout_logs')
      .insert(logInsertData)
      .select()
      .single()
    
    if (logError) {
      console.error('[start-from-progress] Error creating workout_log:', logError)
      // Non-fatal - assignment was created, log creation is a secondary concern
      console.warn('[start-from-progress] Proceeding without log - will be created on workout completion')
    } else {
      newLog = logData
      console.log('[start-from-progress] Created workout_log:', newLog.id)
    }
    
    console.log('[start-from-progress] 🆕 CREATED new workout for program day:', {
      workout_assignment_id: newAssignment.id,
      workout_session_id: newSession?.id,
      workout_log_id: newLog?.id,
      template_id: templateId,
      program_assignment_id: programAssignmentId,
      program_schedule_id: programScheduleId,
      name: workoutName,
      program_day_columns_used: useProgramDayColumns,
    })
    
    // ========================================================================
    // STEP 4: Return the new assignment info
    // ========================================================================
    return NextResponse.json({
      workout_assignment_id: newAssignment.id,
      template_id: templateId,
      week_number: workoutInfo.actual_week_number,
      day_position: (workoutInfo.current_day_index || 0) + 1,
      position_label: workoutInfo.position_label,
      program_assignment_id: programAssignmentId,
      program_schedule_id: programScheduleId,
      reused_existing: false,
      reuse_reason: null,
      session_id: newSession?.id || null,
      log_id: newLog?.id || null,
      // Flag if migration needs to be run for full program-day idempotency
      migration_needed: !useProgramDayColumns,
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
