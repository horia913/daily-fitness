import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import { canvasGroupToWritePayload } from './canvasActions'
import type { CanvasGroup, CanvasWorkout } from './canvasTypes'
import type { GroupModelSlotWrite, Prescription, WorkoutKind } from './types'
import { newId } from './newId'

export interface SaveCanvasWorkoutParams {
  supabase: SupabaseClient
  userId: string
  workout: CanvasWorkout
  isNew?: boolean
}

export interface SaveCanvasWorkoutResult {
  success: boolean
  templateId?: string
  error?: string
}

const SLOT_OPTIONAL_COLUMNS: (keyof GroupModelSlotWrite)[] = [
  'exercise_letter',
  'sets',
  'reps',
  'weight_kg',
  'load_percentage',
  'rir',
  'tempo',
  'rest_seconds',
  'notes',
  'work_seconds',
  'distance_meters',
  'target_time_seconds',
  'target_pace_seconds_per_km',
  'target_speed_pct',
  'hr_zone',
  'target_hr_pct',
  'drop_percentage',
  'max_drops',
  'reps_per_cluster',
  'clusters_per_set',
  'intra_cluster_rest_seconds',
  'rest_pause_seconds',
  'max_rest_pauses',
]

function throwIfError(error: PostgrestError | null): void {
  if (error) throw error
}

export function formatSaveError(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const pg = err as PostgrestError
    if (typeof pg.message === 'string') {
      return pg.code ? `[${pg.code}] ${pg.message}` : pg.message
    }
  }
  return String(err)
}

function buildSlotRpcRow(
  setEntryId: string,
  slotId: string,
  slot: GroupModelSlotWrite,
): Record<string, unknown> {
  const row: Record<string, unknown> = {
    id: slotId,
    set_entry_id: setEntryId,
    exercise_id: slot.exercise_id,
    exercise_order: slot.exercise_order,
    measurement: slot.measurement,
    technique: slot.technique,
    is_optional: false,
  }
  for (const key of SLOT_OPTIONAL_COLUMNS) {
    const val = slot[key]
    if (val !== undefined && val !== null && val !== '') {
      row[key] = val
    }
  }
  return row
}

function buildPrescriptionRpcRow(slotId: string, rx: Prescription): Record<string, unknown> {
  return {
    id: rx.id ?? newId(),
    slot_id: slotId,
    set_number: rx.set_number,
    reps: rx.reps ?? null,
    weight_kg: rx.weight_kg ?? null,
    load_percentage: rx.load_percentage ?? null,
    rir: rx.rir ?? null,
    tempo: rx.tempo ?? null,
    work_seconds: rx.work_seconds ?? null,
    distance_meters: rx.distance_meters ?? null,
  }
}

/**
 * Serializes canvas groups → `p_groups` for `save_workout_canvas`.
 * Column names match the per-table writes the legacy save path used.
 */
export function buildCanvasGroupsRpcPayload(workout: CanvasWorkout): Record<string, unknown>[] {
  return workout.groups.map((group) => groupToRpcPayload(group))
}

function groupToRpcPayload(group: CanvasGroup): Record<string, unknown> {
  const payload = canvasGroupToWritePayload(group)
  const entryRow: Record<string, unknown> = {
    id: group.id,
    set_type: payload.set_type,
    set_order: payload.set_order,
    total_sets: payload.total_sets,
    reps_per_set: payload.reps_per_set,
    rest_seconds: payload.rest_seconds,
    duration_seconds: payload.duration_seconds,
    rounds_driver: payload.rounds_driver,
    interval_seconds: payload.interval_seconds,
    time_cap_seconds: payload.time_cap_seconds,
    is_optional: false,
  }

  const prescriptionsBySlotId = new Map(
    group.slots.map((slot) => [slot.id, slot.prescriptions] as const),
  )

  const seen = new Set<string>()
  const slotWrites = payload.slots
    .map(({ prescriptions: _p, clientSlotId, ...slot }) => ({ ...slot, clientSlotId }))
    .filter((slot) => {
      if (seen.has(slot.exercise_id)) return false
      seen.add(slot.exercise_id)
      return true
    })
    .map((slot, index) => ({ ...slot, exercise_order: index + 1 }))

  const slots = slotWrites.map(({ clientSlotId, ...slot }) => {
    const slotRow = buildSlotRpcRow(group.id, clientSlotId, slot)
    const prescriptions = (prescriptionsBySlotId.get(clientSlotId) ?? []).map((rx) =>
      buildPrescriptionRpcRow(clientSlotId, rx),
    )
    return { ...slotRow, prescriptions }
  })

  return { ...entryRow, slots }
}

export async function saveWorkoutFromCanvas(
  params: SaveCanvasWorkoutParams,
): Promise<SaveCanvasWorkoutResult> {
  const { supabase, userId, workout } = params
  try {
    if (!workout.name?.trim()) {
      return { success: false, error: 'Workout name is required' }
    }

    const templateData = {
      name: workout.name.trim(),
      description: workout.description ?? '',
      category: workout.category ?? 'general',
      difficulty_level: (workout.difficulty_level ?? 'intermediate').toLowerCase(),
      estimated_duration: workout.estimated_duration ?? 60,
      coach_id: userId,
      is_active: true,
      kind: workout.kind ?? ('library' as WorkoutKind),
      source_workout_id: workout.source_workout_id ?? null,
    }

    const templateId = workout.id

    const { error } = await supabase
      .from('workout_templates')
      .upsert({ id: templateId, ...templateData }, { onConflict: 'id' })
    throwIfError(error)

    const p_groups = buildCanvasGroupsRpcPayload(workout)
    const { error: rpcError } = await supabase.rpc('save_workout_canvas', {
      p_workout_id: templateId,
      p_groups,
    })
    throwIfError(rpcError)

    return { success: true, templateId }
  } catch (err: unknown) {
    const message = formatSaveError(err)
    console.error('[saveWorkoutFromCanvas]', message, err)
    return { success: false, error: message }
  }
}

export function prescriptionsMatch(a: Prescription[], b: Prescription[]): boolean {
  if (a.length !== b.length) return false
  const sa = [...a].sort((x, y) => x.set_number - y.set_number)
  const sb = [...b].sort((x, y) => x.set_number - y.set_number)
  return JSON.stringify(sa) === JSON.stringify(sb)
}
