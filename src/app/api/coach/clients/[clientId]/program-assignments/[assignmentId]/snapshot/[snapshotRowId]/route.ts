/**
 * PATCH /api/coach/clients/[clientId]/program-assignments/[assignmentId]/snapshot/[snapshotRowId]
 *
 * Updates a single program_day_assignments row for the coach's client assignment.
 * Does not modify master program_schedule or workout_logs.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  validateApiAuth,
  createForbiddenResponse,
} from '@/lib/apiAuth'

type RouteCtx = {
  params: Promise<{
    clientId: string
    assignmentId: string
    snapshotRowId: string
  }>
}

type PatchBody = {
  workout_template_id?: string | null
  is_customized?: boolean
  day_type?: 'workout' | 'rest' | 'assessment'
  name?: string | null
  reset_to_template?: boolean
}

export async function PATCH(request: NextRequest, ctx: RouteCtx) {
  try {
    const { user, supabaseAuth, supabaseAdmin } = await validateApiAuth(request)
    const { clientId, assignmentId, snapshotRowId } = await ctx.params

    let body: PatchBody = {}
    try {
      body = (await request.json()) as PatchBody
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { data: coachProfile } = await supabaseAuth
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single()

    if (!coachProfile || (coachProfile.role !== 'coach' && coachProfile.role !== 'admin')) {
      return createForbiddenResponse('Only coaches can update client program snapshots')
    }

    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('program_assignments')
      .select('id, coach_id, client_id, program_id')
      .eq('id', assignmentId)
      .eq('client_id', clientId)
      .maybeSingle()

    if (assignmentError) {
      console.error('[snapshot PATCH] assignment:', assignmentError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!assignment || assignment.coach_id !== user.id) {
      return createForbiddenResponse('Assignment not found or access denied')
    }

    const { data: row, error: rowError } = await supabaseAdmin
      .from('program_day_assignments')
      .select('*')
      .eq('id', snapshotRowId)
      .eq('program_assignment_id', assignmentId)
      .maybeSingle()

    if (rowError) {
      console.error('[snapshot PATCH] snapshot row:', rowError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!row) {
      return NextResponse.json({ error: 'Snapshot row not found' }, { status: 404 })
    }

    const dayNum = Number(row.day_number) || 1
    const weekNum = Math.max(1, Math.ceil(dayNum / 7))
    const programDayRaw = row.program_day
    const programDay =
      typeof programDayRaw === 'number' && programDayRaw >= 1 && programDayRaw <= 7
        ? programDayRaw
        : Math.max(1, Math.min(7, dayNum - (weekNum - 1) * 7))

    let workout_template_id: string | null
    let is_customized: boolean
    let day_type: string
    let name: string

    if (body.reset_to_template) {
      const { data: ps, error: psErr } = await supabaseAdmin
        .from('program_schedule')
        .select('template_id')
        .eq('program_id', assignment.program_id)
        .eq('week_number', weekNum)
        .eq('day_number', programDay)
        .maybeSingle()

      if (psErr) {
        console.error('[snapshot PATCH] program_schedule:', psErr)
        return NextResponse.json({ error: 'Failed to load master slot' }, { status: 500 })
      }

      workout_template_id = ps?.template_id ?? null
      is_customized = false
      day_type = workout_template_id ? 'workout' : 'rest'
      const defaultName =
        day_type === 'workout'
          ? `Workout Day ${weekNum}-${programDay}`
          : `Rest Day ${weekNum}-${programDay}`

      if (workout_template_id) {
        const { data: tmpl } = await supabaseAdmin
          .from('workout_templates')
          .select('name')
          .eq('id', workout_template_id)
          .maybeSingle()
        name = (tmpl?.name as string) || defaultName
      } else {
        name = defaultName
      }
    } else {
      const wantsRest =
        body.day_type === 'rest' ||
        body.workout_template_id === null ||
        body.workout_template_id === ''

      if (wantsRest) {
        workout_template_id = null
        day_type = 'rest'
        is_customized = body.is_customized !== undefined ? Boolean(body.is_customized) : true
        name =
          typeof body.name === 'string' && body.name.trim().length > 0
            ? body.name.trim()
            : `Rest Day ${weekNum}-${programDay}`
      } else {
        const tid = body.workout_template_id
        if (typeof tid !== 'string' || tid.length === 0) {
          return NextResponse.json(
            { error: 'Provide workout_template_id, set rest, or reset_to_template' },
            { status: 400 }
          )
        }

        const { data: tmpl, error: tmplErr } = await supabaseAdmin
          .from('workout_templates')
          .select('id, name, coach_id')
          .eq('id', tid)
          .maybeSingle()

        if (tmplErr || !tmpl) {
          return NextResponse.json({ error: 'Template not found' }, { status: 404 })
        }

        if (tmpl.coach_id !== user.id) {
          return createForbiddenResponse('You can only assign templates you own')
        }

        workout_template_id = tid
        is_customized = body.is_customized !== undefined ? Boolean(body.is_customized) : true
        day_type = body.day_type === 'assessment' ? 'assessment' : 'workout'
        name =
          typeof body.name === 'string' && body.name.trim().length > 0
            ? body.name.trim()
            : ((tmpl.name as string) || `Workout Day ${weekNum}-${programDay}`)
      }
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('program_day_assignments')
      .update({
        workout_template_id,
        is_customized,
        day_type,
        name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', snapshotRowId)
      .eq('program_assignment_id', assignmentId)
      .select('*')
      .single()

    if (updateError) {
      console.error('[snapshot PATCH] update:', updateError)
      return NextResponse.json({ error: updateError.message || 'Update failed' }, { status: 400 })
    }

    return NextResponse.json({ row: updated })
  } catch (e) {
    console.error('[snapshot PATCH]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
