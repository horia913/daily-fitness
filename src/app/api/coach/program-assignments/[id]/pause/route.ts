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
