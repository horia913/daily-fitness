/**
 * PATCH /api/sets/[id] — Edit a set log (in-progress workout only).
 * DELETE /api/sets/[id] — Delete a set log (in-progress workout only).
 *
 * Both require: set exists, workout_log.client_id === auth user, workout_log.completed_at IS NULL.
 * After edit/delete, user_exercise_metrics is recomputed for affected exercises.
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateApiAuth } from '@/lib/apiAuth'
import { recomputeUserExerciseMetrics } from '@/lib/recomputeUserExerciseMetrics'

const FORBIDDEN_KEYS = new Set([
  'client_id',
  'workout_log_id',
  'set_entry_id',
  'set_type',
  'completed_at',
  'created_at',
])

const WHITELIST: Record<string, Set<string>> = {
  straight_set: new Set(['weight', 'reps', 'set_number', 'rpe']),
  superset: new Set([
    'set_number',
    'superset_exercise_a_id',
    'superset_weight_a',
    'superset_reps_a',
    'superset_exercise_b_id',
    'superset_weight_b',
    'superset_reps_b',
    'rpe',
  ]),
  giant_set: new Set(['round_number', 'giant_set_exercises', 'rpe']),
  amrap: new Set(['exercise_id', 'weight', 'amrap_total_reps', 'amrap_duration_seconds', 'amrap_target_reps', 'rpe']),
  dropset: new Set([
    'set_number',
    'dropset_initial_weight',
    'dropset_initial_reps',
    'dropset_final_weight',
    'dropset_final_reps',
    'dropset_percentage',
    'exercise_id',
    'rpe',
  ]),
  cluster_set: new Set(['exercise_id', 'weight', 'reps', 'set_number', 'cluster_number', 'rpe']),
  rest_pause: new Set([
    'exercise_id',
    'rest_pause_initial_weight',
    'rest_pause_initial_reps',
    'rest_pause_reps_after',
    'rest_pause_number',
    'set_number',
    'rest_pause_duration',
    'max_rest_pauses',
    'rpe',
  ]),
  preexhaust: new Set([
    'set_number',
    'preexhaust_isolation_exercise_id',
    'preexhaust_isolation_weight',
    'preexhaust_isolation_reps',
    'preexhaust_compound_exercise_id',
    'preexhaust_compound_weight',
    'preexhaust_compound_reps',
    'rpe',
  ]),
  emom: new Set(['exercise_id', 'weight', 'emom_minute_number', 'emom_total_reps_this_min', 'emom_total_duration_sec', 'rpe']),
  tabata: new Set(['exercise_id', 'tabata_rounds_completed', 'tabata_total_duration_sec', 'rpe']),
  fortime: new Set([
    'exercise_id',
    'weight',
    'fortime_total_reps',
    'fortime_time_taken_sec',
    'fortime_time_cap_sec',
    'fortime_target_reps',
    'rpe',
  ]),
  hr_sets: new Set(['rpe']),
}

function parseNum(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const n = typeof value === 'number' ? value : parseFloat(String(value))
  return isNaN(n) ? null : n
}

function parseIntNum(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const n = typeof value === 'number' ? value : parseInt(String(value), 10)
  return isNaN(n) ? null : n
}

/** Build update payload from body: only whitelisted keys, with number parsing where needed */
function buildUpdatePayload(
  body: Record<string, unknown>,
  blockType: string,
  allowedKeys: Set<string>
): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  const numericKeys = new Set([
    'weight',
    'reps',
    'set_number',
    'superset_weight_a',
    'superset_reps_a',
    'superset_weight_b',
    'superset_reps_b',
    'round_number',
    'amrap_total_reps',
    'amrap_duration_seconds',
    'amrap_target_reps',
    'dropset_initial_weight',
    'dropset_initial_reps',
    'dropset_final_weight',
    'dropset_final_reps',
    'dropset_percentage',
    'cluster_number',
    'rest_pause_initial_weight',
    'rest_pause_initial_reps',
    'rest_pause_reps_after',
    'rest_pause_number',
    'rest_pause_duration',
    'max_rest_pauses',
    'preexhaust_isolation_weight',
    'preexhaust_isolation_reps',
    'preexhaust_compound_weight',
    'preexhaust_compound_reps',
    'emom_minute_number',
    'emom_total_reps_this_min',
    'emom_total_duration_sec',
    'tabata_rounds_completed',
    'tabata_total_duration_sec',
    'fortime_total_reps',
    'fortime_time_taken_sec',
    'fortime_time_cap_sec',
    'fortime_target_reps',
    'rpe',
  ])
  const intKeys = new Set([
    'reps',
    'set_number',
    'superset_reps_a',
    'superset_reps_b',
    'amrap_total_reps',
    'amrap_duration_seconds',
    'amrap_target_reps',
    'dropset_initial_reps',
    'dropset_final_reps',
    'rest_pause_initial_reps',
    'rest_pause_reps_after',
    'rest_pause_number',
    'rest_pause_duration',
    'max_rest_pauses',
    'preexhaust_isolation_reps',
    'preexhaust_compound_reps',
    'emom_minute_number',
    'emom_total_reps_this_min',
    'emom_total_duration_sec',
    'tabata_rounds_completed',
    'tabata_total_duration_sec',
    'fortime_total_reps',
    'fortime_time_taken_sec',
    'fortime_time_cap_sec',
    'fortime_target_reps',
    'cluster_number',
    'rpe',
  ])

  for (const key of Object.keys(body)) {
    if (!allowedKeys.has(key)) continue
    let val = body[key]
    if (intKeys.has(key) && (val !== null && val !== undefined)) {
      const parsed = parseIntNum(val)
      if (parsed !== null) payload[key] = parsed
      else payload[key] = val
    } else if (numericKeys.has(key) && (val !== null && val !== undefined)) {
      const parsed = parseNum(val)
      if (parsed !== null) payload[key] = parsed
      else payload[key] = val
    } else {
      payload[key] = val
    }
  }
  return payload
}

/** Get exercise IDs affected by this set row (for metrics recompute) */
function getAffectedExerciseIds(row: Record<string, unknown>, blockType: string): string[] {
  const ids: string[] = []
  const add = (id: unknown) => {
    if (id && typeof id === 'string') ids.push(id)
  }
  switch (blockType) {
    case 'straight_set':
    case 'dropset':
    case 'cluster_set':
    case 'rest_pause':
    case 'amrap':
    case 'emom':
    case 'tabata':
    case 'fortime':
      add(row.exercise_id)
      break
    case 'superset':
      add(row.superset_exercise_a_id)
      add(row.superset_exercise_b_id)
      break
    case 'preexhaust':
      add(row.preexhaust_isolation_exercise_id)
      add(row.preexhaust_compound_exercise_id)
      break
    case 'giant_set': {
      const arr = row.giant_set_exercises as Array<{ exercise_id?: string }> | null
      if (Array.isArray(arr)) arr.forEach((e) => add(e?.exercise_id))
      break
    }
    case 'hr_sets':
    default:
      break
  }
  return [...new Set(ids)]
}

async function getSetAndValidate(
  supabaseAdmin: import('@supabase/supabase-js').SupabaseClient,
  setId: string,
  userId: string
): Promise<{ set: Record<string, unknown>; workoutLog: { id: string; client_id: string; completed_at: string | null } } | NextResponse> {
  const { data: setRow, error } = await supabaseAdmin
    .from('workout_set_logs')
    .select(
      `
      *,
      workout_logs!inner (
        id,
        client_id,
        completed_at
      )
    `
    )
    .eq('id', setId)
    .single()

  if (error || !setRow) {
    return NextResponse.json({ success: false, error: 'Set log not found' }, { status: 404 })
  }

  const workoutLog = (setRow as any).workout_logs as { id: string; client_id: string; completed_at: string | null }
  if (workoutLog.client_id !== userId) {
    return NextResponse.json(
      { success: false, error: 'Not authorized to modify this set' },
      { status: 403 }
    )
  }
  if (workoutLog.completed_at != null) {
    return NextResponse.json(
      { success: false, error: 'Workout already completed; set cannot be modified' },
      { status: 403 }
    )
  }

  const { workout_logs: _, ...set } = setRow as any
  return { set: set as Record<string, unknown>, workoutLog }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { params } = context
    const { id: setLogId } = await params
    const { user, supabaseAdmin } = await validateApiAuth(request)

    const result = await getSetAndValidate(supabaseAdmin, setLogId, user.id)
    if (result instanceof NextResponse) return result
    const { set } = result

    const blockType = (set.set_type as string) || ''
    const allowed = WHITELIST[blockType] ?? WHITELIST.hr_sets
    const allowedKeys = Array.from(allowed)

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
    }

    const receivedKeys = Object.keys(body)
    const debugPayload = { set_type_from_db: blockType, receivedKeys, allowedKeys }

    for (const key of receivedKeys) {
      if (FORBIDDEN_KEYS.has(key)) {
        return NextResponse.json(
          { success: false, error: `Cannot update forbidden field: ${key}`, ...debugPayload },
          { status: 400 }
        )
      }
      if (!allowed.has(key)) {
        return NextResponse.json(
          { success: false, error: `Field not allowed for set_type ${blockType}: ${key}`, ...debugPayload },
          { status: 400 }
        )
      }
    }

    const payload = buildUpdatePayload(body, blockType, allowed)
    const updateData = payload as Record<string, unknown>

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ success: true })
    }

    const { error: updateError } = await supabaseAdmin
      .from('workout_set_logs')
      .update(payload)
      .eq('id', setLogId)

    if (updateError) {
      console.error('[sets PATCH]', { setId: setLogId, set_type_from_db: blockType, allowedKeys, receivedKeys, updateData, error: updateError.message })
      return NextResponse.json(
        { success: false, error: 'Failed to update set', ...debugPayload },
        { status: 500 }
      )
    }

    const rawIds = getAffectedExerciseIds(set, blockType)
    const exerciseIds = [...new Set(rawIds.filter((id): id is string => typeof id === 'string' && id.trim() !== ''))]
    if (exerciseIds.length > 0) {
      await recomputeUserExerciseMetrics(user.id, exerciseIds, supabaseAdmin)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Error && err.message === 'User not authenticated') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[sets PATCH] unexpected error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { params } = context
    const { id: setLogId } = await params
    const { user, supabaseAdmin } = await validateApiAuth(_request)

    const result = await getSetAndValidate(supabaseAdmin, setLogId, user.id)
    if (result instanceof NextResponse) return result
    const { set } = result

    const blockType = (set.set_type as string) || ''
    const exerciseIds = getAffectedExerciseIds(set, blockType)

    if (blockType === 'giant_set') {
      const { error: delGiantErr } = await supabaseAdmin
        .from('workout_giant_set_exercise_logs')
        .delete()
        .eq('workout_set_log_id', setLogId)
      if (delGiantErr) {
        console.error('[sets DELETE] workout_giant_set_exercise_logs delete error:', delGiantErr)
      }
    }

    const { error: deleteError } = await supabaseAdmin
      .from('workout_set_logs')
      .delete()
      .eq('id', setLogId)

    if (deleteError) {
      console.error('[sets DELETE] delete error:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete set' },
        { status: 500 }
      )
    }

    if (exerciseIds.length > 0) {
      await recomputeUserExerciseMetrics(user.id, exerciseIds, supabaseAdmin)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Error && err.message === 'User not authenticated') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[sets DELETE] unexpected error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
