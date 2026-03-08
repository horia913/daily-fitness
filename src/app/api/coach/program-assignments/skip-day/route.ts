/**
 * POST /api/coach/program-assignments/skip-day
 *
 * Allows a coach to skip a specific program day for a client without
 * requiring the client to perform the workout. Inserts a row into
 * program_day_completions so the week-unlock and progress logic treat
 * the day as done, then advances program_progress if needed.
 *
 * Body:
 *   programAssignmentId  — program_assignments.id (the client's assignment)
 *   programScheduleId    — program_schedule.id    (the exact day slot to skip)
 *   reason               — optional free-text reason stored in notes column
 *
 * Auth rules:
 *   - Caller must be authenticated with role 'coach'
 *   - The programAssignmentId must belong to one of the coach's clients
 *
 * Returns:
 *   200 — { success: true, message, already_skipped?: true }
 *   400 — missing / invalid fields
 *   403 — caller is not coach or does not own the assignment
 *   409 — day already completed / skipped (idempotent, treated as success)
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateApiAuth, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/apiAuth'
import { getNextSlot, updateProgressCache } from '@/lib/programStateService'

export async function POST(request: NextRequest) {
  try {
    // ── 1. Authenticate ──────────────────────────────────────────────────────
    const { user, supabaseAuth, supabaseAdmin } = await validateApiAuth(request)

    // ── 2. Parse body ────────────────────────────────────────────────────────
    let body: { programAssignmentId?: string; programScheduleId?: string; reason?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { programAssignmentId, programScheduleId, reason } = body

    if (!programAssignmentId || !programScheduleId) {
      return NextResponse.json(
        { error: 'Missing required fields: programAssignmentId, programScheduleId' },
        { status: 400 }
      )
    }

    // ── 3. Verify caller is a coach ──────────────────────────────────────────
    const { data: coachProfile } = await supabaseAuth
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single()

    if (!coachProfile || coachProfile.role !== 'coach') {
      return createForbiddenResponse('Only coaches can skip program days')
    }

    // ── 4. Verify coach owns the program assignment ──────────────────────────
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('program_assignments')
      .select('id, client_id, coach_id, program_id, status')
      .eq('id', programAssignmentId)
      .eq('coach_id', user.id)
      .maybeSingle()

    if (assignmentError) {
      console.error('[skip-day] Error fetching program assignment:', assignmentError)
      return NextResponse.json({ error: 'Database error verifying assignment' }, { status: 500 })
    }

    if (!assignment) {
      return createForbiddenResponse('Program assignment not found or does not belong to this coach')
    }

    if (assignment.status === 'completed' || assignment.status === 'cancelled') {
      return NextResponse.json(
        { error: `Cannot skip a day on a ${assignment.status} program` },
        { status: 400 }
      )
    }

    // ── 5. Verify the schedule slot belongs to the program ───────────────────
    const { data: scheduleSlot, error: slotError } = await supabaseAdmin
      .from('program_schedule')
      .select('id, week_number, day_of_week, template_id')
      .eq('id', programScheduleId)
      .eq('program_id', assignment.program_id)
      .maybeSingle()

    if (slotError) {
      console.error('[skip-day] Error fetching schedule slot:', slotError)
      return NextResponse.json({ error: 'Database error verifying schedule slot' }, { status: 500 })
    }

    if (!scheduleSlot) {
      return NextResponse.json(
        { error: 'Schedule slot not found or does not belong to this program' },
        { status: 400 }
      )
    }

    // ── 6. Check if already completed / skipped (idempotent) ────────────────
    const { data: existing } = await supabaseAdmin
      .from('program_day_completions')
      .select('id, notes')
      .eq('program_assignment_id', programAssignmentId)
      .eq('program_schedule_id', programScheduleId)
      .maybeSingle()

    if (existing) {
      const wasAlreadySkipped = existing.notes?.startsWith('Skipped by coach')
      return NextResponse.json({
        success: true,
        already_skipped: wasAlreadySkipped ?? false,
        already_completed: !wasAlreadySkipped,
        message: wasAlreadySkipped
          ? 'Day was already skipped by coach'
          : 'Day was already completed by client',
      })
    }

    // ── 7. Insert skip record into program_day_completions ───────────────────
    const notes = reason
      ? `Skipped by coach: ${reason}`
      : 'Skipped by coach'

    const { error: insertError } = await supabaseAdmin
      .from('program_day_completions')
      .insert({
        program_assignment_id: programAssignmentId,
        program_schedule_id: programScheduleId,
        completed_at: new Date().toISOString(),
        completed_by: user.id,
        notes,
      })

    if (insertError) {
      // Race condition: another request inserted between our check and insert
      if (insertError.code === '23505') {
        return NextResponse.json({
          success: true,
          already_skipped: true,
          message: 'Day already recorded (concurrent request)',
        })
      }
      console.error('[skip-day] Error inserting completion record:', insertError)
      return NextResponse.json({ error: 'Failed to record skip' }, { status: 500 })
    }

    console.log('[skip-day] Recorded skip:', {
      coachId: user.id,
      clientId: assignment.client_id,
      programAssignmentId,
      programScheduleId,
      week: scheduleSlot.week_number,
      day: scheduleSlot.day_of_week,
      reason: reason ?? null,
    })

    // ── 8. Advance progress cache so next slot + week-unlock are updated ─────
    try {
      const { data: allSlotsData } = await supabaseAdmin
        .from('program_schedule')
        .select('id, program_id, week_number, day_of_week, template_id')
        .eq('program_id', assignment.program_id)
        .order('week_number', { ascending: true })
        .order('day_of_week', { ascending: true })

      if (allSlotsData && allSlotsData.length > 0) {
        // Build ProgramScheduleSlot-compatible objects (day_number = day_of_week + 1)
        const slots = allSlotsData.map((s, i) => ({
          id: s.id,
          program_id: s.program_id,
          week_number: s.week_number,
          day_of_week: s.day_of_week,
          day_number: s.day_of_week + 1,
          template_id: s.template_id,
        }))
        const lastSlot = slots[slots.length - 1]
        const nextSlotResult = await getNextSlot(supabaseAdmin, programAssignmentId, assignment.program_id)
        await updateProgressCache(supabaseAdmin, programAssignmentId, nextSlotResult, lastSlot)
      }
    } catch (progressError) {
      // Non-fatal — progress cache will be corrected on next client load
      console.warn('[skip-day] Progress cache update failed (non-fatal):', progressError)
    }

    return NextResponse.json({
      success: true,
      message: `Week ${scheduleSlot.week_number} Day ${scheduleSlot.day_of_week + 1} has been marked as skipped`,
      skipped_slot: {
        program_schedule_id: programScheduleId,
        week_number: scheduleSlot.week_number,
        day_of_week: scheduleSlot.day_of_week,
      },
    })
  } catch (err) {
    console.error('[skip-day] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
