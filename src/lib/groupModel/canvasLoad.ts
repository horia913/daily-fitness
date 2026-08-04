import type { SupabaseClient } from '@supabase/supabase-js'
import type { CanvasWorkout } from './canvasTypes'
import {
  mapWorkoutCanvasRpcToCanvasWorkout,
  type WorkoutCanvasRpcPayload,
} from './canvasLoadRpcMapper'
import { PRESCRIPTION_SELECT_COLUMNS } from './prescriptions'
import type { Prescription } from './types'

const inflightByTemplateId = new Map<string, Promise<CanvasWorkout | null>>()

function rowToPrescription(row: Record<string, unknown>): Prescription {
  return {
    id: row.id as string | undefined,
    slot_id: row.slot_id as string | undefined,
    set_number: Number(row.set_number) || 1,
    reps: row.reps as string | null | undefined,
    weight_kg: row.weight_kg as number | null | undefined,
    load_percentage: row.load_percentage as number | null | undefined,
    rpe: row.rpe as number | null | undefined,
    tempo: row.tempo as string | null | undefined,
    work_seconds: row.work_seconds as number | null | undefined,
    distance_meters: row.distance_meters as number | null | undefined,
  }
}

export interface LoadWorkoutForCanvasOptions {
  /** Skip in-flight dedupe (e.g. after save reload). */
  bypassCache?: boolean
}

/** One RPC round-trip — replaces multi-table REST fan-out. */
async function loadWorkoutForCanvasImpl(
  supabase: SupabaseClient,
  templateId: string,
): Promise<CanvasWorkout | null> {
  const { data, error } = await supabase.rpc('get_workout_canvas', {
    p_template_id: templateId,
  })

  if (error) {
    console.error('[loadWorkoutForCanvas] get_workout_canvas:', error.message)
    return null
  }

  return mapWorkoutCanvasRpcToCanvasWorkout(data as WorkoutCanvasRpcPayload | null)
}

export async function loadWorkoutForCanvas(
  supabase: SupabaseClient,
  templateId: string,
  options?: LoadWorkoutForCanvasOptions,
): Promise<CanvasWorkout | null> {
  if (!options?.bypassCache) {
    const inflight = inflightByTemplateId.get(templateId)
    if (inflight) return inflight
  }

  const promise = loadWorkoutForCanvasImpl(supabase, templateId).finally(() => {
    inflightByTemplateId.delete(templateId)
  })

  if (!options?.bypassCache) {
    inflightByTemplateId.set(templateId, promise)
  }
  return promise
}

/** Load prescriptions by slot id (batched IN query). Used outside canvas load. */
export async function fetchPrescriptionsBySlotIds(
  supabase: SupabaseClient,
  slotIds: string[],
): Promise<Map<string, Prescription[]>> {
  const out = new Map<string, Prescription[]>()
  if (slotIds.length === 0) return out
  const { data, error } = await supabase
    .from('workout_set_prescriptions')
    .select(PRESCRIPTION_SELECT_COLUMNS)
    .in('slot_id', slotIds)
    .order('set_number', { ascending: true })
  if (error) {
    console.warn('[fetchPrescriptionsBySlotIds]', error.message)
    return out
  }
  for (const row of data ?? []) {
    const slotId = String(row.slot_id)
    if (!out.has(slotId)) out.set(slotId, [])
    out.get(slotId)!.push(rowToPrescription(row))
  }
  return out
}

export { createDefaultExercise, createSoloGroup } from './canvasTypes'
