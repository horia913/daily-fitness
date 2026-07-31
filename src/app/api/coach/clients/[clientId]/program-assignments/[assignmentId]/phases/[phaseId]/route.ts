/**
 * PATCH /api/coach/clients/[clientId]/program-assignments/[assignmentId]/phases/[phaseId]
 * Update one program_instance_phases row (this client's plan only).
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateApiAuth, createForbiddenResponse } from '@/lib/apiAuth'

type RouteCtx = {
  params: Promise<{
    clientId: string
    assignmentId: string
    phaseId: string
  }>
}

type PatchBody = {
  name?: string
  duration_weeks?: number
  notes?: string | null
  phase_label?: string | null
}

export async function PATCH(request: NextRequest, ctx: RouteCtx) {
  try {
    const { user, supabaseAuth, supabaseAdmin } = await validateApiAuth(request)
    const { clientId, assignmentId, phaseId } = await ctx.params

    let body: PatchBody = {}
    try {
      body = (await request.json()) as PatchBody
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { data: coachProfile } = await supabaseAuth
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!coachProfile || (coachProfile.role !== 'coach' && coachProfile.role !== 'admin')) {
      return createForbiddenResponse('Only coaches can update client program phases')
    }

    const { data: assignment } = await supabaseAdmin
      .from('program_assignments')
      .select('id, coach_id, client_id')
      .eq('id', assignmentId)
      .eq('client_id', clientId)
      .maybeSingle()

    if (!assignment || assignment.coach_id !== user.id) {
      return createForbiddenResponse('Assignment not found or access denied')
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim()
    if (typeof body.duration_weeks === 'number' && body.duration_weeks >= 1) {
      patch.duration_weeks = Math.floor(body.duration_weeks)
    }
    if (body.notes !== undefined) patch.notes = body.notes
    if (body.phase_label !== undefined) {
      patch.phase_label =
        typeof body.phase_label === 'string' && body.phase_label.trim()
          ? body.phase_label.trim()
          : null
    }

    if (Object.keys(patch).length <= 1) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: updated, error } = await supabaseAdmin
      .from('program_instance_phases')
      .update(patch)
      .eq('id', phaseId)
      .eq('program_assignment_id', assignmentId)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ phase: updated })
  } catch (e) {
    console.error('[instance phase PATCH]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
