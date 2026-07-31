/**
 * POST — delete run-scoped rows for a program assignment (coach only, service role).
 * Used when re-assigning the same program reuses `program_assignments.id`; client-side
 * deletes would be blocked by RLS on the client's workout_logs.
 *
 * Also removes `workout_sessions` for this assignment — `get_client_dashboard` weeklyProgress
 * counts completed sessions linked to the active assignment, not workout_logs alone.
 */

import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  validateApiAuth,
  createUnauthorizedResponse,
  createForbiddenResponse,
} from '@/lib/apiAuth'

type RouteCtx = { params: Promise<{ id: string }> }

async function assertCoachCanResetAssignment(
  supabaseAdmin: SupabaseClient,
  coachUserId: string,
  assignmentId: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { data: row, error } = await supabaseAdmin
    .from('program_assignments')
    .select('id, coach_id, client_id')
    .eq('id', assignmentId)
    .single()

  if (error || !row) {
    return { ok: false, status: 404, error: 'Assignment not found' }
  }
  if (row.coach_id === coachUserId) {
    return { ok: true }
  }
  if (row.coach_id) {
    return { ok: false, status: 403, error: 'You are not the coach for this assignment' }
  }
  const { data: clientRow } = await supabaseAdmin
    .from('clients')
    .select('id')
    .eq('id', row.client_id)
    .eq('coach_id', coachUserId)
    .maybeSingle()
  if (!clientRow) {
    return { ok: false, status: 403, error: 'You are not the coach for this assignment' }
  }
  return { ok: true }
}

async function clearRunDataForAssignment(
  supabaseAdmin: SupabaseClient,
  assignmentId: string
): Promise<{ ok: true } | { ok: false; step: string; message: string }> {
  const { data: logs, error: selErr } = await supabaseAdmin
    .from('workout_logs')
    .select('id')
    .eq('program_assignment_id', assignmentId)

  if (selErr) {
    return { ok: false, step: 'list_workout_logs', message: selErr.message }
  }

  const logIds = (logs ?? []).map((r: { id: string }) => r.id).filter(Boolean)
  if (logIds.length > 0) {
    const { error: setErr } = await supabaseAdmin
      .from('workout_set_logs')
      .delete()
      .in('workout_log_id', logIds)
    if (setErr) {
      return { ok: false, step: 'workout_set_logs', message: setErr.message }
    }
  }

  const { error: logDelErr } = await supabaseAdmin
    .from('workout_logs')
    .delete()
    .eq('program_assignment_id', assignmentId)
  if (logDelErr) {
    return { ok: false, step: 'workout_logs', message: logDelErr.message }
  }

  const { error: sessErr } = await supabaseAdmin
    .from('workout_sessions')
    .delete()
    .eq('program_assignment_id', assignmentId)
  if (sessErr) {
    return { ok: false, step: 'workout_sessions', message: sessErr.message }
  }

  const { error: pdcErr } = await supabaseAdmin
    .from('program_day_completions')
    .delete()
    .eq('program_assignment_id', assignmentId)
  if (pdcErr) {
    return { ok: false, step: 'program_day_completions', message: pdcErr.message }
  }

  const { error: reviewErr } = await supabaseAdmin
    .from('coach_week_reviews')
    .delete()
    .eq('program_assignment_id', assignmentId)
  if (reviewErr) {
    return { ok: false, step: 'coach_week_reviews', message: reviewErr.message }
  }

  const { error: overrideErr } = await supabaseAdmin
    .from('program_week_time_override')
    .delete()
    .eq('program_assignment_id', assignmentId)
  if (overrideErr) {
    return { ok: false, step: 'program_week_time_override', message: overrideErr.message }
  }

  return { ok: true }
}

export async function POST(request: NextRequest, ctx: RouteCtx) {
  try {
    const { user, supabaseAdmin } = await validateApiAuth(request)
    const { id: assignmentId } = await ctx.params

    const gate = await assertCoachCanResetAssignment(supabaseAdmin, user.id, assignmentId)
    if (!gate.ok) {
      if (gate.status === 403) {
        return createForbiddenResponse(gate.error)
      }
      return NextResponse.json({ error: gate.error }, { status: gate.status })
    }

    const cleared = await clearRunDataForAssignment(supabaseAdmin, assignmentId)
    if (!cleared.ok) {
      console.error('[reset-run-data]', cleared.step, cleared.message)
      return NextResponse.json(
        { error: 'Failed to clear run data', step: cleared.step, detail: cleared.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unauthorized'
    if (msg === 'User not authenticated') return createUnauthorizedResponse()
    console.error('[reset-run-data] POST', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
