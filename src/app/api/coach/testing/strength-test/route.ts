/**
 * POST /api/coach/testing/strength-test
 *
 * Creates a real workout session (template + assignment + workout_log) marked as a
 * coach strength test, then logs each set through /api/log-set so PR + e1RM fire
 * on the normal path.
 *
 * Body: {
 *   clientId: string
 *   testedAt?: string (ISO)
 *   notes?: string
 *   sets: Array<{ exercise_id, weight_kg, reps, set_number?, notes? }>
 * }
 *
 * GET ?clientId=&exerciseIds=id1,id2 — recent maxes for the entry form (roster-gated).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getTrackedFetch } from '@/lib/supabaseQueryLogger'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createForbiddenResponse } from '@/lib/apiAuth'
import {
  buildCoachStrengthTestNotes,
  buildStrengthTestSessionName,
  type StrengthTestSetInput,
} from '@/lib/coachStrengthTest'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

async function coachAdminContext(): Promise<
  | { error: NextResponse }
  | { user: { id: string }; admin: any }
> {
  const supabaseAuth = await createSupabaseServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabaseAuth.auth.getUser()
  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey || !supabaseUrl) {
    return { error: NextResponse.json({ error: 'Server configuration error' }, { status: 503 }) }
  }
  // Untyped service client — matches other coach testing routes (no Database generics).
  const admin = createClient(supabaseUrl, serviceKey, {
    global: { fetch: getTrackedFetch() },
  }) as any

  const { data: profile } = await admin
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || (profile.role !== 'coach' && profile.role !== 'admin')) {
    return { error: createForbiddenResponse('Only coaches can record strength tests') }
  }

  return { user, admin }
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await coachAdminContext()
    if ('error' in ctx) return ctx.error
    const { user, admin } = ctx

    const clientId = request.nextUrl.searchParams.get('clientId')
    const rawIds = request.nextUrl.searchParams.get('exerciseIds') ?? ''
    const exerciseIds = rawIds
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    if (!clientId || exerciseIds.length === 0) {
      return NextResponse.json(
        { error: 'clientId and exerciseIds are required' },
        { status: 400 },
      )
    }

    const { data: link } = await admin
      .from('clients')
      .select('client_id')
      .eq('client_id', clientId)
      .eq('coach_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (!link) {
      return createForbiddenResponse('Client not on your roster')
    }

    const { data, error } = await admin
      .from('user_exercise_metrics')
      .select('exercise_id, best_weight, best_reps, estimated_1rm')
      .eq('user_id', clientId)
      .in('exercise_id', exerciseIds)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const metrics: Record<
      string,
      {
        best_weight: number | null
        best_reps: number | null
        estimated_1rm: number | null
      }
    > = {}
    for (const row of data ?? []) {
      metrics[row.exercise_id as string] = {
        best_weight:
          row.best_weight != null ? Number(row.best_weight) : null,
        best_reps: row.best_reps != null ? Number(row.best_reps) : null,
        estimated_1rm:
          row.estimated_1rm != null ? Number(row.estimated_1rm) : null,
      }
    }

    return NextResponse.json({ metrics })
  } catch (e) {
    console.error('[strength-test GET]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unexpected error' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await coachAdminContext()
    if ('error' in ctx) return ctx.error
    const { user, admin } = ctx

    let body: {
      clientId?: string
      testedAt?: string
      notes?: string
      sets?: StrengthTestSetInput[]
    }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const clientId = body.clientId
    const sets = Array.isArray(body.sets) ? body.sets : []
    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
    }
    if (sets.length === 0) {
      return NextResponse.json(
        { error: 'At least one set is required' },
        { status: 400 },
      )
    }

    for (const s of sets) {
      if (!s.exercise_id || !(Number(s.weight_kg) > 0) || !(Number(s.reps) > 0)) {
        return NextResponse.json(
          { error: 'Each set needs exercise_id, weight_kg > 0, and reps > 0' },
          { status: 400 },
        )
      }
    }

    const { data: link } = await admin
      .from('clients')
      .select('client_id')
      .eq('client_id', clientId)
      .eq('coach_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (!link) {
      return createForbiddenResponse('Client not on your roster')
    }

    const exerciseIds = [...new Set(sets.map((s) => s.exercise_id))]
    const { data: exercises, error: exErr } = await admin
      .from('exercises')
      .select('id, name')
      .in('id', exerciseIds)

    if (exErr) {
      return NextResponse.json({ error: exErr.message }, { status: 500 })
    }
    const nameById = new Map<string, string>(
      (exercises ?? []).map((e: { id: string; name: string }) => [
        e.id,
        e.name,
      ]),
    )
    for (const id of exerciseIds) {
      if (!nameById.has(id)) {
        return NextResponse.json(
          { error: `Unknown exercise: ${id}` },
          { status: 400 },
        )
      }
    }

    const testedAt = body.testedAt ? new Date(body.testedAt) : new Date()
    if (Number.isNaN(testedAt.getTime())) {
      return NextResponse.json({ error: 'Invalid testedAt' }, { status: 400 })
    }
    const testedIso = testedAt.toISOString()
    const testedDate = testedIso.slice(0, 10)

    const orderedNames = exerciseIds.map((id) => nameById.get(id)!)
    const sessionName = buildStrengthTestSessionName(orderedNames)
    const logNotes = buildCoachStrengthTestNotes(
      user.id,
      body.notes?.trim() || orderedNames.join(', '),
    )

    // 1) Ephemeral template (inactive so it doesn't clutter the library list)
    const { data: template, error: tplErr } = await admin
      .from('workout_templates')
      .insert({
        name: sessionName,
        description: logNotes,
        coach_id: user.id,
        kind: 'library',
        is_active: false,
        category: 'strength_test',
        estimated_duration: 30,
        difficulty_level: 'intermediate',
      })
      .select('id')
      .single()

    if (tplErr || !template) {
      console.error('[strength-test] template', tplErr)
      return NextResponse.json(
        { error: tplErr?.message ?? 'Failed to create template' },
        { status: 500 },
      )
    }

    // One set_entry per exercise (straight_set block)
    const setEntryIdsByExercise = new Map<string, string>()
    let order = 1
    for (const exerciseId of exerciseIds) {
      const exerciseSets = sets.filter((s) => s.exercise_id === exerciseId)
      const maxReps = Math.max(...exerciseSets.map((s) => Number(s.reps)))
      const { data: entry, error: entryErr } = await admin
        .from('workout_set_entries')
        .insert({
          template_id: template.id,
          set_order: order,
          set_type: 'straight_set',
          rounds_driver: 'fixed',
          total_sets: exerciseSets.length,
          reps_per_set: String(maxReps),
          set_name: nameById.get(exerciseId) ?? 'Test',
          is_optional: false,
        })
        .select('id')
        .single()

      if (entryErr || !entry) {
        console.error('[strength-test] set_entry', entryErr)
        return NextResponse.json(
          { error: entryErr?.message ?? 'Failed to create set entry' },
          { status: 500 },
        )
      }

      const { error: slotErr } = await admin
        .from('workout_set_entry_exercises')
        .insert({
          set_entry_id: entry.id,
          exercise_id: exerciseId,
          exercise_order: 1,
          measurement: 'reps',
          technique: 'none',
          sets: exerciseSets.length,
          reps: maxReps,
          weight_kg: Number(exerciseSets[0].weight_kg),
          is_optional: false,
        })

      if (slotErr) {
        console.error('[strength-test] slot', slotErr)
        return NextResponse.json({ error: slotErr.message }, { status: 500 })
      }

      setEntryIdsByExercise.set(exerciseId, entry.id)
      order += 1
    }

    // 2) Assignment (carries display name)
    const { data: assignment, error: asgErr } = await admin
      .from('workout_assignments')
      .insert({
        client_id: clientId,
        workout_template_id: template.id,
        coach_id: user.id,
        name: sessionName,
        notes: logNotes,
        scheduled_date: testedDate,
        assigned_date: testedDate,
        status: 'in_progress',
      })
      .select('id')
      .single()

    if (asgErr || !assignment) {
      console.error('[strength-test] assignment', asgErr)
      return NextResponse.json(
        { error: asgErr?.message ?? 'Failed to create assignment' },
        { status: 500 },
      )
    }

    // 3) Workout log (session shell) — completed after sets
    const { data: log, error: logErr } = await admin
      .from('workout_logs')
      .insert({
        client_id: clientId,
        workout_assignment_id: assignment.id,
        started_at: testedIso,
        completed_at: null,
        notes: logNotes,
        total_sets_completed: 0,
        total_reps_completed: 0,
        total_weight_lifted: 0,
      })
      .select('id')
      .single()

    if (logErr || !log) {
      console.error('[strength-test] workout_log', logErr)
      return NextResponse.json(
        { error: logErr?.message ?? 'Failed to create workout log' },
        { status: 500 },
      )
    }

    // 4) Log each set through /api/log-set (coach-authorised path → PR + e1RM)
    const cookie = request.headers.get('cookie') ?? ''
    const origin = request.nextUrl.origin
    const setLogIds: string[] = []
    const prHits: unknown[] = []

    // Preserve coach entry order; set_number per exercise
    const setNumberByExercise = new Map<string, number>()
    for (const s of sets) {
      const nextNum = (setNumberByExercise.get(s.exercise_id) ?? 0) + 1
      setNumberByExercise.set(s.exercise_id, nextNum)
      const setEntryId = setEntryIdsByExercise.get(s.exercise_id)!

      const res = await fetch(`${origin}/api/log-set`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie,
        },
        body: JSON.stringify({
          client_id: clientId,
          workout_log_id: log.id,
          workout_assignment_id: assignment.id,
          set_entry_id: setEntryId,
          set_type: 'straight_set',
          exercise_id: s.exercise_id,
          weight: Number(s.weight_kg),
          reps: Number(s.reps),
          set_number: s.set_number ?? nextNum,
          notes: s.notes ?? null,
        }),
      })

      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        console.error('[strength-test] log-set failed', res.status, payload)
        return NextResponse.json(
          {
            error: 'Failed to log test set via /api/log-set',
            details: payload?.error ?? payload?.details ?? res.statusText,
            workout_log_id: log.id,
          },
          { status: 502 },
        )
      }
      if (payload?.set_log_id) setLogIds.push(payload.set_log_id)
      if (payload?.pr_detected) prHits.push(payload.pr_detected)
    }

    // 5) Complete session + stamp totals
    const totalSets = sets.length
    const totalReps = sets.reduce((sum, s) => sum + Number(s.reps), 0)
    const totalWeight = sets.reduce(
      (sum, s) => sum + Number(s.weight_kg) * Number(s.reps),
      0,
    )

    await admin
      .from('workout_logs')
      .update({
        completed_at: testedIso,
        notes: logNotes,
        total_sets_completed: totalSets,
        total_reps_completed: totalReps,
        total_weight_lifted: totalWeight,
        total_duration_minutes: Math.max(5, totalSets * 3),
      })
      .eq('id', log.id)

    await admin
      .from('workout_assignments')
      .update({ status: 'completed' })
      .eq('id', assignment.id)

    try {
      const { notifyClientTestRecorded } = await import('@/lib/inAppNotificationEvents')
      notifyClientTestRecorded({
        clientId,
        actorId: user.id,
        testKind: 'strength',
        testId: log.id,
        admin,
      })
    } catch {
      /* non-blocking */
    }

    return NextResponse.json({
      success: true,
      workout_log_id: log.id,
      workout_assignment_id: assignment.id,
      template_id: template.id,
      session_name: sessionName,
      set_log_ids: setLogIds,
      pr_detected: prHits,
    })
  } catch (e) {
    console.error('[strength-test]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unexpected error' },
      { status: 500 },
    )
  }
}
