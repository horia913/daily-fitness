/**
 * POST /api/coach/week-review
 *
 * Saves a coach week note to coach_week_reviews (action = 'note').
 * Does not modify program_assignments, coach_unlocked_week, or program_progress.
 *
 * Body: { programAssignmentId: string, weekNumber: number, coachNotes?: string, performanceSummary?: unknown }
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateApiAuth, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/apiAuth'
import { sendPushNotification } from '@/lib/notifications'

export async function POST(request: NextRequest) {
  try {
    const { user, supabaseAdmin } = await validateApiAuth(request)

    const body = await request.json()
    const { programAssignmentId, weekNumber, coachNotes, performanceSummary } = body as {
      programAssignmentId?: string
      weekNumber?: number
      coachNotes?: string
      performanceSummary?: unknown
    }

    if (!programAssignmentId || weekNumber == null || Number.isNaN(Number(weekNumber))) {
      return NextResponse.json(
        { error: 'Missing required fields: programAssignmentId, weekNumber' },
        { status: 400 }
      )
    }

    const { data: assignment, error: assignErr } = await supabaseAdmin
      .from('program_assignments')
      .select('id, coach_id, client_id')
      .eq('id', programAssignmentId)
      .single()

    if (assignErr || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    if (assignment.coach_id !== user.id) {
      return createForbiddenResponse('You are not the coach for this assignment')
    }

    const { error: reviewErr } = await supabaseAdmin.from('coach_week_reviews').insert({
      program_assignment_id: programAssignmentId,
      week_number: weekNumber,
      coach_id: user.id,
      action: 'note',
      coach_notes: coachNotes?.trim() || null,
      performance_summary: performanceSummary ?? null,
    })

    if (reviewErr) {
      console.error('[week-review] insert:', reviewErr)
      return NextResponse.json({ error: 'Failed to save week note' }, { status: 500 })
    }

    try {
      await sendPushNotification({
        userIds: [assignment.client_id],
        title: 'Coach left you a note',
        message:
          coachNotes?.trim() ?
            `Week ${weekNumber}: ${coachNotes.trim().slice(0, 120)}${coachNotes.trim().length > 120 ? '…' : ''}`
          : `Your coach added a note for week ${weekNumber}.`,
        url: '/client/train',
      })
    } catch {
      // best-effort
    }

    return NextResponse.json({ success: true, weekNumber })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    if (msg === 'User not authenticated') return createUnauthorizedResponse()
    console.error('[week-review]', error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
