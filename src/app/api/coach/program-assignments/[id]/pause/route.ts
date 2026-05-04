/**
 * POST   — pause program assignment (coach only)
 * DELETE — resume; adds whole calendar days (client timezone) to pause_accumulated_days
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  validateApiAuth,
  createUnauthorizedResponse,
  createForbiddenResponse,
} from '@/lib/apiAuth'
import {
  diffCalendarDaysYmd,
  zonedCalendarDateString,
  zonedYmdFromIsoTimestamp,
} from '@/lib/clientZonedCalendar'
import { getClientIanaTimezone } from '@/lib/programStateService'

type RouteCtx = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, ctx: RouteCtx) {
  try {
    const { user, supabaseAdmin } = await validateApiAuth(request)
    const { id: assignmentId } = await ctx.params
    const forcePause =
      new URL(request.url).searchParams.get('force') === 'true'
    let reason: string | null = null
    try {
      const body = await request.json()
      if (body && typeof body.reason === 'string') reason = body.reason.trim() || null
    } catch {
      // no body
    }

    const { data: row, error: fetchErr } = await supabaseAdmin
      .from('program_assignments')
      .select('id, coach_id, client_id, pause_status, paused_at')
      .eq('id', assignmentId)
      .single()

    if (fetchErr || !row) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }
    if (row.coach_id !== user.id) {
      return createForbiddenResponse('You are not the coach for this assignment')
    }
    if (row.pause_status === 'paused') {
      return NextResponse.json({ error: 'Program is already paused' }, { status: 400 })
    }

    if (!forcePause) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data: wipLogs } = await supabaseAdmin
        .from('workout_logs')
        .select('id')
        .eq('program_assignment_id', assignmentId)
        .is('completed_at', null)
        .gte('created_at', since)
        .limit(1)
      const logId = wipLogs?.[0]?.id as string | undefined
      if (logId) {
        return NextResponse.json(
          {
            error: 'in_progress_workout',
            message:
              'Client has an in-progress workout. Resolve or force-pause.',
            logId,
          },
          { status: 409 },
        )
      }
    }

    const { error: upErr } = await supabaseAdmin
      .from('program_assignments')
      .update({
        pause_status: 'paused',
        paused_at: new Date().toISOString(),
        pause_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assignmentId)
      .eq('coach_id', user.id)

    if (upErr) {
      console.error('[pause] POST', upErr)
      return NextResponse.json({ error: 'Failed to pause' }, { status: 500 })
    }

    return NextResponse.json({ success: true, pause_status: 'paused' })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unauthorized'
    if (msg === 'User not authenticated') return createUnauthorizedResponse()
    console.error('[pause] POST', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, ctx: RouteCtx) {
  // Pause math operates on whole calendar days in the client's timezone.
  // A pause and resume within the same client-local calendar day adds 0 days
  // to pause_accumulated_days. This is intentional — the calendar-week unlock
  // model is day-aligned and sub-day arithmetic would create off-by-one drift
  // at week boundaries. To represent "skip a day," the coach must pause for
  // at least 24 hours of wall-clock time spanning a client-local midnight.
  try {
    const { user, supabaseAdmin } = await validateApiAuth(request)
    const { id: assignmentId } = await ctx.params

    const { data: row, error: fetchErr } = await supabaseAdmin
      .from('program_assignments')
      .select('id, coach_id, client_id, pause_status, paused_at, pause_accumulated_days')
      .eq('id', assignmentId)
      .single()

    if (fetchErr || !row) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }
    if (row.coach_id !== user.id) {
      return createForbiddenResponse('You are not the coach for this assignment')
    }
    if (row.pause_status !== 'paused' || !row.paused_at) {
      return NextResponse.json({ error: 'Program is not paused' }, { status: 400 })
    }

    const clientTz = await getClientIanaTimezone(supabaseAdmin, row.client_id as string)
    const pauseStartYmd = zonedYmdFromIsoTimestamp(row.paused_at as string, clientTz)
    const todayYmd = zonedCalendarDateString(new Date(), clientTz)
    const daysPaused = Math.max(0, diffCalendarDaysYmd(pauseStartYmd, todayYmd))
    const prevAccum = Math.max(0, Number(row.pause_accumulated_days) || 0)

    const { error: upErr } = await supabaseAdmin
      .from('program_assignments')
      .update({
        pause_status: 'active',
        paused_at: null,
        pause_reason: null,
        pause_accumulated_days: prevAccum + daysPaused,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assignmentId)
      .eq('coach_id', user.id)

    if (upErr) {
      console.error('[pause] DELETE', upErr)
      return NextResponse.json({ error: 'Failed to resume' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      pause_status: 'active',
      daysPaused,
      daysAddedToAccumulated: daysPaused,
      pause_accumulated_days: prevAccum + daysPaused,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unauthorized'
    if (msg === 'User not authenticated') return createUnauthorizedResponse()
    console.error('[pause] DELETE', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
