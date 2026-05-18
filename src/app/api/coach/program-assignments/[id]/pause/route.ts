/**
 * POST   — pause program assignment (coach only)
 * DELETE — resume; adds whole calendar days (client timezone) to pause_accumulated_days
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  validateApiAuth,
  createUnauthorizedResponse,
} from '@/lib/apiAuth'
import {
  coachPauseProgramAssignment,
  coachResumeProgramAssignment,
} from '@/lib/programAssignmentCoachPause'

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

    const result = await coachPauseProgramAssignment(
      supabaseAdmin,
      user.id,
      assignmentId,
      { forcePause, reason },
    )

    if (!result.ok) {
      if (result.status === 409 && result.logId) {
        return NextResponse.json(
          {
            error: 'in_progress_workout',
            message:
              'Client has an in-progress workout. Resolve or force-pause.',
            logId: result.logId,
          },
          { status: 409 },
        )
      }
      return NextResponse.json({ error: result.error }, { status: result.status })
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

    const result = await coachResumeProgramAssignment(
      supabaseAdmin,
      user.id,
      assignmentId,
    )

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({
      success: true,
      pause_status: 'active',
      daysPaused: result.daysPaused,
      daysAddedToAccumulated: result.daysPaused,
      pause_accumulated_days: result.pause_accumulated_days,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unauthorized'
    if (msg === 'User not authenticated') return createUnauthorizedResponse()
    console.error('[pause] DELETE', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
