/**
 * PATCH /api/coach/clients/[clientId]/program-assignments/[assignmentId]/snapshot/[snapshotRowId]
 *
 * Updates a single program_day_assignments row — instance schedule only.
 * Never reads or writes master program_schedule / workout_templates for assignment.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  validateApiAuth,
  createForbiddenResponse,
} from '@/lib/apiAuth'
import {
  isWeekLocked,
  loadPastWeekLockSnapshot,
  PAST_WEEK_LOCK_REASON,
} from '@/lib/programInstance/instancePastWeekLock'

type RouteCtx = {
  params: Promise<{
    clientId: string
    assignmentId: string
    snapshotRowId: string
  }>
}

type PatchBody = {
  /** Assign an existing instance workout to this day. */
  program_instance_workout_id?: string | null
  /** Clone a coach library template into a new instance workout and assign it. */
  library_template_id?: string | null
  day_type?: 'workout' | 'rest' | 'assessment'
  name?: string | null
  is_optional?: boolean
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

    const weekNum = Number(row.week_number) || Math.max(1, Math.ceil((Number(row.day_number) || 1) / 7))
    const lock = await loadPastWeekLockSnapshot(supabaseAdmin, assignmentId)
    if (isWeekLocked(lock, weekNum)) {
      return NextResponse.json(
        { error: PAST_WEEK_LOCK_REASON, code: 'WEEK_LOCKED', week: weekNum },
        { status: 409 },
      )
    }

    const programDayRaw = row.program_day
    const programDay =
      typeof programDayRaw === 'number' && programDayRaw >= 1 && programDayRaw <= 7
        ? programDayRaw
        : Math.max(1, Math.min(7, (Number(row.day_number) || 1) - (weekNum - 1) * 7))

    let program_instance_workout_id: string | null =
      (row.program_instance_workout_id as string | null) ?? null
    let day_type: string
    let name: string
    let is_optional: boolean

    const wantsRest =
      body.day_type === 'rest' ||
      body.program_instance_workout_id === null ||
      body.program_instance_workout_id === ''

    if (wantsRest) {
      program_instance_workout_id = null
      day_type = 'rest'
      is_optional = body.is_optional ?? false
      name =
        typeof body.name === 'string' && body.name.trim().length > 0
          ? body.name.trim()
          : `Rest Day ${weekNum}-${programDay}`
    } else if (typeof body.library_template_id === 'string' && body.library_template_id.length > 0) {
      const { data: clonedId, error: cloneErr } = await supabaseAuth.rpc(
        'clone_template_to_instance_workout',
        {
          p_assignment_id: assignmentId,
          p_source_template_id: body.library_template_id,
        },
      )
      if (cloneErr) {
        console.error('[snapshot PATCH] clone:', cloneErr)
        return NextResponse.json({ error: cloneErr.message || 'Clone failed' }, { status: 400 })
      }
      program_instance_workout_id = clonedId as string

      const { data: piw } = await supabaseAdmin
        .from('program_instance_workouts')
        .select('name, estimated_duration')
        .eq('id', program_instance_workout_id)
        .maybeSingle()

      day_type = body.day_type === 'assessment' ? 'assessment' : 'workout'
      is_optional = body.is_optional ?? false
      name =
        typeof body.name === 'string' && body.name.trim().length > 0
          ? body.name.trim()
          : ((piw?.name as string) || `Workout Day ${weekNum}-${programDay}`)
    } else if (
      typeof body.program_instance_workout_id === 'string' &&
      body.program_instance_workout_id.length > 0
    ) {
      const iid = body.program_instance_workout_id
      const { data: piw, error: piwErr } = await supabaseAdmin
        .from('program_instance_workouts')
        .select('id, name, program_assignment_id')
        .eq('id', iid)
        .maybeSingle()

      if (piwErr || !piw || piw.program_assignment_id !== assignmentId) {
        return NextResponse.json({ error: 'Instance workout not found for this assignment' }, { status: 404 })
      }

      program_instance_workout_id = iid
      day_type = body.day_type === 'assessment' ? 'assessment' : 'workout'
      is_optional = body.is_optional ?? false
      name =
        typeof body.name === 'string' && body.name.trim().length > 0
          ? body.name.trim()
          : ((piw.name as string) || `Workout Day ${weekNum}-${programDay}`)
    } else {
      return NextResponse.json(
        { error: 'Provide program_instance_workout_id, library_template_id, or set rest' },
        { status: 400 },
      )
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('program_day_assignments')
      .update({
        program_instance_workout_id,
        workout_template_id: null,
        day_type,
        name,
        is_optional,
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
