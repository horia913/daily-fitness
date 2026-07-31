/**
 * Load workout blocks from master template RPC or program instance canvas.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { WorkoutSetEntry } from '@/types/workoutSetEntries'
import { mapWorkoutBlocksRpcToSetEntries } from '@/lib/workoutBlocksRpcMapper'
import { loadInstanceWorkoutForCanvas } from '@/lib/programInstance/instanceCanvasLoad'
import { mapInstanceCanvasToSetEntries } from '@/lib/instanceWorkoutBlocksMapper'

export async function loadWorkoutBlocksByContentId(
  supabase: SupabaseClient,
  contentId: string,
  options?: { preferInstance?: boolean },
): Promise<WorkoutSetEntry[]> {
  const id = contentId?.trim()
  if (!id) return []

  if (options?.preferInstance !== false) {
    const { data: instanceRow } = await supabase
      .from('program_instance_workouts')
      .select('id')
      .eq('id', id)
      .maybeSingle()

    if (instanceRow?.id) {
      const canvas = await loadInstanceWorkoutForCanvas(supabase, id)
      if (canvas?.groups?.length) {
        return mapInstanceCanvasToSetEntries(canvas)
      }
    }
  }

  const { data: rpcBlocks, error } = await supabase.rpc('get_workout_blocks', {
    p_template_id: id,
  })
  if (error) {
    console.error('[loadWorkoutBlocksByContentId] get_workout_blocks:', error.message)
    return []
  }
  return mapWorkoutBlocksRpcToSetEntries(rpcBlocks ?? [])
}
