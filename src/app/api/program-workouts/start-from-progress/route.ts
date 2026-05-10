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
 * 3a. Bridge-first: program_day_assignments.workout_assignment_id → reuse assignment / 409 if done.
 * 3b. Legacy: workout_sessions in_progress for this program day (24h stale guard).
 * 3c. Legacy: workout_logs incomplete for this program day (24h stale guard).
 * 4. If a reuse path matched, return existing workout_assignment_id (REUSE).
 * 5. Otherwise create new workout_assignment + session + log (CREATE)
 *    and TAG them with program_assignment_id + program_schedule_id
 * 
 * Body: { client_id?: string, program_schedule_id?: string }
 * 
 * Returns: { workout_assignment_id, template_id, program_assignment_id, program_schedule_id, ... }
 */

import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { validateApiAuth, validateOwnership, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/apiAuth'
import {
  getProgramState,
  getCompletedSlots,
  assertWeekUnlocked,
  ProgramScheduleSlot,
} from '@/lib/programStateService'

/**
 * Link program_day_assignments.workout_assignment_id when still null (same contract as
 * POST /api/program-workouts/start). Non-fatal on failure — workout still starts.
 */
async function linkProgramDayAssignmentWorkoutBridge(
  supabaseAdmin: SupabaseClient,
  programAssignmentId: string,
  programScheduleId: string | null,
  workoutAssignmentId: string | null | undefined,
): Promise<void> {
  if (!workoutAssignmentId) return
  if (!programScheduleId) {
    console.warn('[start-from-progress] bridge skipped: no program_schedule id on slot', {
      programAssignmentId,
    })
    return
  }

  const { data: scheduleRow, error: scheduleErr } = await supabaseAdmin
    .from('program_schedule')
    .select('day_number')
    .eq('id', programScheduleId)
    .maybeSingle()

  if (scheduleErr || scheduleRow?.day_number == null) {
    console.warn('[start-from-progress] could not resolve day_number for bridge', {
      programScheduleId,
      error: scheduleErr?.message ?? scheduleErr,
    })
    return
  }

  const dayNumber = Number(scheduleRow.day_number)
  if (!Number.isFinite(dayNumber)) {
    console.warn('[start-from-progress] could not resolve day_number for bridge', {
      programScheduleId,
      day_number: scheduleRow.day_number,
    })
    return
  }

  const { error: bridgeErr } = await supabaseAdmin
    .from('program_day_assignments')
    .update({ workout_assignment_id: workoutAssignmentId })
    .eq('program_assignment_id', programAssignmentId)
    .eq('day_number', dayNumber)
    .is('workout_assignment_id', null)

  if (bridgeErr) {
    console.warn('[start-from-progress] failed to set bridge', {
      programAssignmentId,
      dayNumber,
      workoutAssignmentId,
      error: bridgeErr.message ?? bridgeErr,
    })
  }
}

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

    // ========================================================================
    // STEP 1: Get program state from canonical resolver
    // ========================================================================
    const state = await getProgramState(supabaseAuth, clientId)

    console.log('[start-from-progress] STEP 1 — program state:', {
      requested_schedule_id: body.program_schedule_id ?? '(none — will use nextSlot)',
      has_assignment: !!state.assignment,
      assignment_id: state.assignment?.id ?? null,
      assignment_status: (state.assignment as any)?.status ?? null,
      total_slots: state.slots.length,
      completed_slots: state.completedSlots.length,
      is_completed: state.isCompleted,
      next_slot_id: state.nextSlot?.id ?? null,
      next_slot_week: state.nextSlot?.week_number ?? null,
      next_slot_day: state.nextSlot?.day_number ?? null,
      completed_schedule_ids: state.completedSlots.map(c => c.program_schedule_id),
    })
    
    if (!state.assignment) {
      console.warn('[start-from-progress] REJECTED — no active assignment')
      return NextResponse.json({
        error: 'No active program',
        message: 'No active program assignment found',
        status: 'no_program',
      }, { status: 404 })
    }
    
    if (state.isCompleted) {
      console.warn('[start-from-progress] REJECTED — program isCompleted=true (all slots in ledger)')
      return NextResponse.json({
        error: 'Program completed',
        message: 'All program workouts have been completed',
        status: 'completed',
      }, { status: 409 })
    }
    
    if (state.slots.length === 0) {
      console.warn('[start-from-progress] REJECTED — program has no schedule slots')
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

      console.log('[start-from-progress] STEP 2 — slot lookup:', {
        requested_id: body.program_schedule_id,
        found_in_slots: !!requestedSlot,
        slot_week: requestedSlot?.week_number ?? null,
        slot_day: requestedSlot?.day_number ?? null,
      })
      
      if (!requestedSlot) {
        console.warn('[start-from-progress] REJECTED — requested slot not found in program schedule')
        return NextResponse.json({
          error: 'Invalid slot',
          message: 'The selected schedule slot does not belong to this program',
        }, { status: 400 })
      }

      if (!requestedSlot.id) {
        console.warn('[start-from-progress] REJECTED — slot has no program_schedule id (master row missing)')
        return NextResponse.json({
          error: 'Invalid slot',
          message: 'Schedule slot is missing master program_schedule reference',
        }, { status: 400 })
      }
      
      // Check if already completed
      const completedScheduleIds = new Set(state.completedSlots.map(c => c.program_schedule_id))
      const alreadyCompleted = completedScheduleIds.has(requestedSlot.id)

      console.log('[start-from-progress] STEP 2 — completion ledger check:', {
        slot_id: requestedSlot.id,
        slot_week: requestedSlot.week_number,
        slot_day: requestedSlot.day_number,
        already_in_ledger: alreadyCompleted,
        ledger_ids: [...completedScheduleIds],
      })

      if (alreadyCompleted) {
        console.warn('[start-from-progress] REJECTED — slot is in program_day_completions ledger')
        return NextResponse.json({
          error: 'Slot already completed',
          message: 'This program day has already been completed',
        }, { status: 409 })
      }
      
      chosenSlot = requestedSlot
    } else {
      // Use next uncompleted slot (default)
      chosenSlot = state.nextSlot

      console.log('[start-from-progress] STEP 2 — using nextSlot (no schedule_id in body):', {
        next_slot_id: chosenSlot?.id ?? null,
        next_slot_week: chosenSlot?.week_number ?? null,
        next_slot_day: chosenSlot?.day_number ?? null,
      })
      
      if (!chosenSlot) {
        console.warn('[start-from-progress] REJECTED — nextSlot is null (all slots completed)')
        return NextResponse.json({
          error: 'Program completed',
          message: 'All program workouts have been completed',
          status: 'completed',
        }, { status: 409 })
      }
    }

    // ========================================================================
    // STEP 2b: WEEK LOCK — reject if the chosen slot is in a locked week
    // ========================================================================
    try {
      assertWeekUnlocked(
        chosenSlot.week_number,
        state.slots,
        state.completedSlots,
        state.assignment ?? undefined
      )
      console.log('[start-from-progress] STEP 2b — week lock OK, week', chosenSlot.week_number, 'is unlocked')
    } catch (lockErr: any) {
      if (lockErr.code === 'WEEK_LOCKED') {
        console.warn('[start-from-progress] REJECTED — WEEK_LOCKED:', lockErr.message)
        return NextResponse.json({
          error: 'WEEK_LOCKED',
          message: lockErr.message,
          unlocked_week_max: lockErr.unlockedWeekMax,
        }, { status: 403 })
      }
      throw lockErr
    }

    const templateId = chosenSlot.template_id
    const programScheduleId = chosenSlot.id
    
    // Compute position label
    const slotsInWeek = state.slots.filter(s => s.week_number === chosenSlot!.week_number)
    const dayPosition = slotsInWeek.findIndex(s => s.id === chosenSlot!.id) + 1
    const positionLabel = `Week ${chosenSlot.week_number} • Day ${dayPosition}`
    
    // ========================================================================
    // STEP 3a: Bridge-first reuse — program_day_assignments.workout_assignment_id
    // (No 24h staleness here; canonical program day + bridge wins over age.)
    // Falls through to STEP 3b/3c when bridge is null or unusable (legacy path).
    // ========================================================================
    const { data: bridgeScheduleRow, error: bridgeScheduleErr } = await supabaseAdmin
      .from('program_schedule')
      .select('day_number')
      .eq('id', programScheduleId)
      .maybeSingle()

    if (bridgeScheduleErr) {
      console.warn('[start-from-progress] STEP 3a — program_schedule lookup error, falling through', bridgeScheduleErr.message)
    } else if (bridgeScheduleRow?.day_number == null || !Number.isFinite(Number(bridgeScheduleRow.day_number))) {
      console.warn('[start-from-progress] STEP 3a — program_schedule day_number missing, falling through to session/log reuse', {
        programScheduleId,
        day_number: bridgeScheduleRow?.day_number ?? null,
      })
    } else {
      const bridgeDayNumber = Number(bridgeScheduleRow.day_number)
      const { data: pdaBridge, error: pdaBridgeErr } = await supabaseAdmin
        .from('program_day_assignments')
        .select('id, workout_assignment_id')
        .eq('program_assignment_id', programAssignmentId)
        .eq('day_number', bridgeDayNumber)
        .maybeSingle()

      if (pdaBridgeErr) {
        console.warn('[start-from-progress] STEP 3a — program_day_assignments lookup error, falling through', pdaBridgeErr.message)
      } else if (!pdaBridge?.workout_assignment_id) {
        console.log('[start-from-progress] STEP 3a: bridge null, falling through to session/log reuse')
      } else {
        const bridgeWaId = pdaBridge.workout_assignment_id
        const { data: bridgeWa, error: bridgeWaErr } = await supabaseAdmin
          .from('workout_assignments')
          .select('id, status, client_id')
          .eq('id', bridgeWaId)
          .maybeSingle()

        if (bridgeWaErr) {
          console.warn('[start-from-progress] STEP 3a — workout_assignments lookup error, falling through', bridgeWaErr.message)
        } else if (!bridgeWa || bridgeWa.client_id !== clientId) {
          console.log('[start-from-progress] STEP 3a: bridge points to missing assignment, falling through', {
            bridgeWaId,
            hasRow: !!bridgeWa,
          })
        } else if (bridgeWa.status === 'completed' || bridgeWa.status === 'skipped') {
          console.warn('[start-from-progress] STEP 3a: bridge workout already completed, returning 409', {
            workoutAssignmentId: bridgeWa.id,
          })
          return NextResponse.json({
            error: 'Slot already completed',
            message: 'This program day has already been completed',
          }, { status: 409 })
        } else {
          console.log('[start-from-progress] STEP 3a: bridge points to existing workout, reusing', {
            workoutAssignmentId: bridgeWa.id,
          })

          const { data: bridgeSession, error: bridgeSessionErr } = await supabaseAdmin
            .from('workout_sessions')
            .select('id, assignment_id, status, started_at, program_assignment_id, program_schedule_id')
            .eq('client_id', clientId)
            .eq('assignment_id', bridgeWa.id)
            .eq('program_assignment_id', programAssignmentId)
            .eq('program_schedule_id', programScheduleId)
            .eq('status', 'in_progress')
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (bridgeSessionErr) {
            console.error('[start-from-progress] STEP 3a — session check error:', bridgeSessionErr)
          }

          if (bridgeSession) {
            await linkProgramDayAssignmentWorkoutBridge(
              supabaseAdmin,
              programAssignmentId,
              programScheduleId,
              bridgeSession.assignment_id,
            )
            return NextResponse.json({
              workout_assignment_id: bridgeSession.assignment_id,
              template_id: templateId,
              week_number: chosenSlot.week_number,
              day_position: dayPosition,
              position_label: positionLabel,
              program_assignment_id: programAssignmentId,
              program_schedule_id: programScheduleId,
              reused_existing: true,
              reuse_reason: 'bridge_in_progress_session',
              session_id: bridgeSession.id,
            })
          }

          const { data: bridgeLog, error: bridgeLogErr } = await supabaseAdmin
            .from('workout_logs')
            .select('id, workout_assignment_id, started_at, workout_session_id, program_assignment_id, program_schedule_id, completed_at')
            .eq('client_id', clientId)
            .eq('workout_assignment_id', bridgeWa.id)
            .eq('program_assignment_id', programAssignmentId)
            .eq('program_schedule_id', programScheduleId)
            .is('completed_at', null)
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (bridgeLogErr) {
            console.error('[start-from-progress] STEP 3a — log check error:', bridgeLogErr)
          }

          if (bridgeLog) {
            await linkProgramDayAssignmentWorkoutBridge(
              supabaseAdmin,
              programAssignmentId,
              programScheduleId,
              bridgeLog.workout_assignment_id,
            )
            return NextResponse.json({
              workout_assignment_id: bridgeLog.workout_assignment_id,
              template_id: templateId,
              week_number: chosenSlot.week_number,
              day_position: dayPosition,
              position_label: positionLabel,
              program_assignment_id: programAssignmentId,
              program_schedule_id: programScheduleId,
              reused_existing: true,
              reuse_reason: 'bridge_incomplete_log',
              session_id: bridgeLog.workout_session_id ?? null,
            })
          }

          const { data: bridgeNewSession, error: bSessionInsErr } = await supabaseAdmin
            .from('workout_sessions')
            .insert({
              assignment_id: bridgeWa.id,
              client_id: clientId,
              status: 'in_progress',
              started_at: new Date().toISOString(),
              program_assignment_id: programAssignmentId,
              program_schedule_id: programScheduleId,
            })
            .select()
            .single()

          if (bSessionInsErr || !bridgeNewSession) {
            console.error('[start-from-progress] STEP 3a — error creating session for bridged assignment:', bSessionInsErr)
            return NextResponse.json({
              error: 'Failed to create workout session',
              details: bSessionInsErr?.message,
            }, { status: 500 })
          }

          const { data: bridgeNewLog, error: bLogInsErr } = await supabaseAdmin
            .from('workout_logs')
            .insert({
              workout_assignment_id: bridgeWa.id,
              client_id: clientId,
              started_at: new Date().toISOString(),
              workout_session_id: bridgeNewSession.id,
              program_assignment_id: programAssignmentId,
              program_schedule_id: programScheduleId,
            })
            .select()
            .single()

          if (bLogInsErr || !bridgeNewLog) {
            console.error('[start-from-progress] STEP 3a — error creating log for bridged assignment:', bLogInsErr)
            return NextResponse.json({
              error: 'Failed to create workout log',
              details: bLogInsErr?.message,
            }, { status: 500 })
          }

          await linkProgramDayAssignmentWorkoutBridge(
            supabaseAdmin,
            programAssignmentId,
            programScheduleId,
            bridgeWa.id,
          )

          return NextResponse.json({
            workout_assignment_id: bridgeWa.id,
            template_id: templateId,
            week_number: chosenSlot.week_number,
            day_position: dayPosition,
            position_label: positionLabel,
            program_assignment_id: programAssignmentId,
            program_schedule_id: programScheduleId,
            reused_existing: true,
            reuse_reason: 'bridge_recovered_session_log',
            session_id: bridgeNewSession.id,
            log_id: bridgeNewLog.id,
          })
        }
      }
    }

    // ========================================================================
    // STEP 3b: Check workout_sessions for in-progress session (legacy / null-bridge;
    // keeps 24h staleness guard.)
    // Keyed by (client_id, program_assignment_id, program_schedule_id)
    // ========================================================================
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

    console.log('[start-from-progress] STEP 3b — in-progress session check:', {
      program_schedule_id: programScheduleId,
      program_assignment_id: programAssignmentId,
      session_error: sessionError ?? null,
      found_session: !!inProgressSession,
      session_id: inProgressSession?.id ?? null,
      session_assignment_id: inProgressSession?.assignment_id ?? null,
      session_status: inProgressSession?.status ?? null,
      session_started_at: inProgressSession?.started_at ?? null,
    })
    
    if (sessionError) {
      console.error('[start-from-progress] Error checking sessions:', sessionError)
    } else if (inProgressSession) {
      // ── Stale session guard (Fix 4) ─────────────────────────────────────────
      // If the session is older than 24 hours it was abandoned. Close it and
      // let a fresh session be created. Do NOT write to program_day_completions
      // — an abandoned workout does not count as a real completion.
      const SESSION_STALE_MS = 24 * 60 * 60 * 1000 // 24 hours
      const sessionAge = Date.now() - new Date(inProgressSession.started_at).getTime()
      const isStale = sessionAge > SESSION_STALE_MS

      if (isStale) {
        const ageHours = (sessionAge / 1000 / 60 / 60).toFixed(1)
        console.log(
          `[start-from-progress] Auto-closing stale session ${inProgressSession.id}` +
          ` (started ${inProgressSession.started_at}, age: ${ageHours}h)`
        )

        // Close the session row
        await supabaseAdmin
          .from('workout_sessions')
          .update({ status: 'completed', completed_at: inProgressSession.started_at })
          .eq('id', inProgressSession.id)

        // Close the matching incomplete workout_log (mark as abandoned at start time)
        if (inProgressSession.assignment_id) {
          await supabaseAdmin
            .from('workout_logs')
            .update({ completed_at: inProgressSession.started_at })
            .eq('workout_assignment_id', inProgressSession.assignment_id)
            .eq('client_id', clientId)
            .is('completed_at', null)
        }
        // Fall through — create a fresh session below
      } else {
        console.log('[start-from-progress] STEP 3b REUSING in-progress session →', inProgressSession.assignment_id)
        await linkProgramDayAssignmentWorkoutBridge(
          supabaseAdmin,
          programAssignmentId,
          programScheduleId,
          inProgressSession.assignment_id,
        )
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
    }
    
    // ========================================================================
    // STEP 3c: Check workout_logs for incomplete log (legacy / null-bridge;
    // keeps 24h staleness guard.)
    // ========================================================================
    const { data: incompleteLog, error: logError } = await supabaseAuth
      .from('workout_logs')
      .select('id, workout_assignment_id, started_at, program_assignment_id, program_schedule_id, completed_at')
      .eq('client_id', clientId)
      .eq('program_assignment_id', programAssignmentId)
      .eq('program_schedule_id', programScheduleId)
      .is('completed_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    console.log('[start-from-progress] STEP 3c — incomplete log check:', {
      program_schedule_id: programScheduleId,
      program_assignment_id: programAssignmentId,
      log_error: logError ?? null,
      found_log: !!incompleteLog,
      log_id: incompleteLog?.id ?? null,
      log_workout_assignment_id: incompleteLog?.workout_assignment_id ?? null,
      log_started_at: incompleteLog?.started_at ?? null,
      log_completed_at: incompleteLog?.completed_at ?? null,
      log_program_assignment_id: incompleteLog?.program_assignment_id ?? null,
      log_program_schedule_id: incompleteLog?.program_schedule_id ?? null,
    })
    
    if (logError) {
      console.error('[start-from-progress] Error checking logs:', logError)
    } else if (incompleteLog) {
      // ── Stale log guard (Fix 4) ──────────────────────────────────────────────
      // Same 24-hour threshold applied to orphaned workout_logs that have no
      // matching in-progress session (session was already closed or never created).
      const LOG_STALE_MS = 24 * 60 * 60 * 1000
      const logAge = Date.now() - new Date(incompleteLog.started_at).getTime()
      const isLogStale = logAge > LOG_STALE_MS

      if (isLogStale) {
        const ageHours = (logAge / 1000 / 60 / 60).toFixed(1)
        console.log(
          `[start-from-progress] Auto-closing stale log ${incompleteLog.id}` +
          ` (started ${incompleteLog.started_at}, age: ${ageHours}h)`
        )
        await supabaseAdmin
          .from('workout_logs')
          .update({ completed_at: incompleteLog.started_at })
          .eq('id', incompleteLog.id)
        // Fall through — create fresh session/log below
      } else {
        console.log('[start-from-progress] STEP 3c REUSING incomplete log →', incompleteLog.workout_assignment_id)
        await linkProgramDayAssignmentWorkoutBridge(
          supabaseAdmin,
          programAssignmentId,
          programScheduleId,
          incompleteLog.workout_assignment_id,
        )
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
    }
    
    // ========================================================================
    // STEP 4: No existing workout for this program day — create new
    // ========================================================================
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

    await linkProgramDayAssignmentWorkoutBridge(
      supabaseAdmin,
      programAssignmentId,
      programScheduleId,
      newAssignment.id,
    )

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
