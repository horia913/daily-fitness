/**
 * POST /api/coach/gym-console/start-workout
 *
 * Coach starts a program workout on behalf of a client (next slot).
 * Body: { clientId: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateApiAuth, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/apiAuth'
import { getProgramState, assertWeekUnlocked } from '@/lib/programStateService'

export async function POST(request: NextRequest) {
  try {
    const { user, supabaseAuth, supabaseAdmin } = await validateApiAuth(request)

    let body: { clientId?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const clientId = body.clientId
    if (!clientId) {
      return NextResponse.json(
        { error: 'Missing required field: clientId' },
        { status: 400 }
      )
    }

    const { data: coachProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single()

    if (!coachProfile || (coachProfile.role !== 'coach' && coachProfile.role !== 'admin')) {
      return createForbiddenResponse('Only coaches can start a workout for a client')
    }

    const { data: clientRelation } = await supabaseAdmin
      .from('clients')
      .select('client_id')
      .eq('coach_id', user.id)
      .eq('client_id', clientId)
      .single()

    if (!clientRelation) {
      return createForbiddenResponse('Client not found or does not belong to this coach')
    }

    const state = await getProgramState(supabaseAdmin, clientId)

    if (!state.assignment) {
      return NextResponse.json(
        { error: 'No active program', message: 'No active program assignment found', status: 'no_program' },
        { status: 404 }
      )
    }

    if (state.isCompleted) {
      return NextResponse.json(
        { error: 'Program completed', message: 'All program workouts have been completed', status: 'completed' },
        { status: 409 }
      )
    }

    if (state.slots.length === 0) {
      return NextResponse.json(
        { error: 'No schedule', message: 'No training days configured in program schedule', status: 'no_schedule' },
        { status: 404 }
      )
    }

    const chosenSlot = state.nextSlot
    if (!chosenSlot) {
      return NextResponse.json(
        { error: 'Program completed', message: 'All program workouts have been completed', status: 'completed' },
        { status: 409 }
      )
    }

    try {
      assertWeekUnlocked(
        chosenSlot.week_number,
        state.slots,
        state.completedSlots,
        state.assignment ?? undefined
      )
    } catch (lockErr: unknown) {
      const err = lockErr as { code?: string; message?: string }
      if (err.code === 'WEEK_LOCKED') {
        return NextResponse.json({
          error: 'WEEK_LOCKED',
          message: err.message,
        }, { status: 403 })
      }
      throw lockErr
    }

    const programAssignmentId = state.assignment.id
    const templateId = chosenSlot.template_id
    const programScheduleId = chosenSlot.id
    const slotsInWeek = state.slots.filter((s) => s.week_number === chosenSlot.week_number)
    const dayPosition = slotsInWeek.findIndex((s) => s.id === chosenSlot.id) + 1
    const positionLabel = `Week ${chosenSlot.week_number} • Day ${dayPosition}`

    // Check existing in-progress session for this program day
    const { data: inProgressSession } = await supabaseAdmin
      .from('workout_sessions')
      .select('id, assignment_id, status, started_at')
      .eq('client_id', clientId)
      .eq('program_assignment_id', programAssignmentId)
      .eq('program_schedule_id', programScheduleId)
      .eq('status', 'in_progress')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (inProgressSession) {
      const SESSION_STALE_MS = 24 * 60 * 60 * 1000
      const sessionAge = Date.now() - new Date(inProgressSession.started_at).getTime()
      if (sessionAge <= SESSION_STALE_MS) {
        return NextResponse.json({
          workout_assignment_id: inProgressSession.assignment_id,
          template_id: templateId,
          week_number: chosenSlot.week_number,
          day_position: dayPosition,
          position_label: positionLabel,
          program_assignment_id: programAssignmentId,
          program_schedule_id: programScheduleId,
          reused_existing: true,
          session_id: inProgressSession.id,
        })
      }
      await supabaseAdmin
        .from('workout_sessions')
        .update({ status: 'completed', completed_at: inProgressSession.started_at })
        .eq('id', inProgressSession.id)
      if (inProgressSession.assignment_id) {
        await supabaseAdmin
          .from('workout_logs')
          .update({ completed_at: inProgressSession.started_at })
          .eq('workout_assignment_id', inProgressSession.assignment_id)
          .eq('client_id', clientId)
          .is('completed_at', null)
      }
    }

    const { data: incompleteLog } = await supabaseAdmin
      .from('workout_logs')
      .select('id, workout_assignment_id')
      .eq('client_id', clientId)
      .eq('program_assignment_id', programAssignmentId)
      .eq('program_schedule_id', programScheduleId)
      .is('completed_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (incompleteLog) {
      const LOG_STALE_MS = 24 * 60 * 60 * 1000
      const { data: logRow } = await supabaseAdmin
        .from('workout_logs')
        .select('started_at')
        .eq('id', incompleteLog.id)
        .single()
      const logAge = logRow?.started_at ? Date.now() - new Date(logRow.started_at).getTime() : 0
      if (logAge <= LOG_STALE_MS) {
        return NextResponse.json({
          workout_assignment_id: incompleteLog.workout_assignment_id,
          template_id: templateId,
          week_number: chosenSlot.week_number,
          day_position: dayPosition,
          position_label: positionLabel,
          program_assignment_id: programAssignmentId,
          program_schedule_id: programScheduleId,
          reused_existing: true,
        })
      }
      await supabaseAdmin
        .from('workout_logs')
        .update({ completed_at: logRow?.started_at ?? new Date().toISOString() })
        .eq('id', incompleteLog.id)
    }

    const { data: template, error: templateError } = await supabaseAdmin
      .from('workout_templates')
      .select('id, name, description, estimated_duration, coach_id')
      .eq('id', templateId)
      .single()

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Template not found', message: `Template ${templateId} not found` },
        { status: 404 }
      )
    }

    const today = new Date().toISOString().split('T')[0]
    const workoutName = `${positionLabel}: ${template.name}`

    const { data: newAssignment, error: assignmentError } = await supabaseAdmin
      .from('workout_assignments')
      .insert({
        workout_template_id: templateId,
        client_id: clientId,
        coach_id: template.coach_id ?? user.id,
        name: workoutName,
        description: template.description,
        estimated_duration: template.estimated_duration || 60,
        assigned_date: today,
        scheduled_date: today,
        status: 'assigned',
        is_customized: false,
        notes: `Program: ${state.assignment.name || 'Program'} - ${positionLabel} (coach gym console)`,
      })
      .select()
      .single()

    if (assignmentError || !newAssignment) {
      console.error('[gym-console/start-workout] Error creating assignment:', assignmentError)
      return NextResponse.json(
        { error: 'Failed to create workout assignment', details: assignmentError?.message },
        { status: 500 }
      )
    }

    const { data: newSession, error: sessionError } = await supabaseAdmin
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

    if (sessionError) {
      console.error('[gym-console/start-workout] Error creating session:', sessionError)
    }

    const { data: newLog, error: logError } = await supabaseAdmin
      .from('workout_logs')
      .insert({
        workout_assignment_id: newAssignment.id,
        client_id: clientId,
        started_at: new Date().toISOString(),
        workout_session_id: newSession?.id ?? null,
        program_assignment_id: programAssignmentId,
        program_schedule_id: programScheduleId,
      })
      .select()
      .single()

    if (logError) {
      console.error('[gym-console/start-workout] Error creating log:', logError)
    }

    return NextResponse.json({
      workout_assignment_id: newAssignment.id,
      template_id: templateId,
      week_number: chosenSlot.week_number,
      day_position: dayPosition,
      position_label: positionLabel,
      program_assignment_id: programAssignmentId,
      program_schedule_id: programScheduleId,
      reused_existing: false,
      session_id: newSession?.id ?? null,
      log_id: newLog?.id ?? null,
    })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'User not authenticated') {
      return createUnauthorizedResponse('Not authenticated')
    }
    console.error('[gym-console/start-workout] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
