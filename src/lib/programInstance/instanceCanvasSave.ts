import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import {
  buildCanvasGroupsRpcPayload,
  formatSaveError,
  type SaveCanvasWorkoutResult,
} from '@/lib/groupModel/canvasSave'
import type { CanvasWorkout } from '@/lib/groupModel/canvasTypes'

export interface SaveInstanceWorkoutParams {
  supabase: SupabaseClient
  assignmentId: string
  workout: CanvasWorkout
}

function throwIfError(error: PostgrestError | null): void {
  if (error) throw error
}

/**
 * Upsert instance workout metadata + atomic replace of instance group model via RPC.
 * Idempotent on retry (upsert header + replace children in one RPC transaction).
 */
export async function saveInstanceWorkoutFromCanvas(
  params: SaveInstanceWorkoutParams,
): Promise<SaveCanvasWorkoutResult> {
  const { supabase, assignmentId, workout } = params
  try {
    if (!workout.name?.trim()) {
      return { success: false, error: 'Workout name is required' }
    }
    if (!workout.id) {
      return { success: false, error: 'Instance workout id is required' }
    }

    const header = {
      id: workout.id,
      program_assignment_id: assignmentId,
      name: workout.name.trim(),
      description: workout.description ?? '',
      category: workout.category ?? 'general',
      estimated_duration: workout.estimated_duration ?? 60,
      updated_at: new Date().toISOString(),
    }

    const { error: upsertError } = await supabase
      .from('program_instance_workouts')
      .upsert(header, { onConflict: 'id' })
    throwIfError(upsertError)

    const p_groups = buildCanvasGroupsRpcPayload(workout)
    const { error: rpcError } = await supabase.rpc('save_instance_workout_canvas', {
      p_instance_workout_id: workout.id,
      p_groups,
    })
    throwIfError(rpcError)

    return { success: true, templateId: workout.id }
  } catch (err: unknown) {
    const message = formatSaveError(err)
    console.error('[saveInstanceWorkoutFromCanvas]', message, err)
    return { success: false, error: message }
  }
}

export { formatSaveError }
