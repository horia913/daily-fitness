import type { SupabaseClient } from '@supabase/supabase-js'
import type { TrainingBlock } from '@/types/trainingBlock'
import { computeBlockStartWeek } from './stationBlockWeeks'

type CopyWeekRpcArgs = Record<string, string | number | null>

function rpcFailureMessage(data: unknown, fallback: string): string | null {
  if (
    typeof data === 'object' &&
    data !== null &&
    'success' in data &&
    (data as { success: boolean }).success === false
  ) {
    const err = (data as { error?: string }).error
    return err?.trim() ? err : fallback
  }
  return null
}

async function tryCopyWeekRpc(
  supabase: SupabaseClient,
  args: CopyWeekRpcArgs,
): Promise<string | null> {
  const { data, error } = await supabase.rpc('copy_week_schedule', args)
  if (error?.message) return error.message
  return rpcFailureMessage(data, 'copy_week_schedule failed')
}

/**
 * Copy one week's schedule pattern across the other weeks in its training block.
 * Schedule rows are matched by absolute week range; `training_block_id` on rows is
 * often NULL (legacy), so we pass NULL and fall back to the 3-arg RPC when needed.
 */
export async function invokeCopyWeekSchedule(
  supabase: SupabaseClient,
  programId: string,
  trainingBlocks: TrainingBlock[],
  activeBlock: TrainingBlock,
  absoluteSourceWeek: number,
): Promise<void> {
  const blockStart = computeBlockStartWeek(trainingBlocks, activeBlock.id)
  const blockWeekCount = activeBlock.duration_weeks

  const scopedError = await tryCopyWeekRpc(supabase, {
    p_program_id: programId,
    p_source_week: absoluteSourceWeek,
    p_total_weeks: blockWeekCount,
    p_block_start_week: blockStart,
    p_training_block_id: null,
  })
  if (!scopedError) return

  const autoBlockError = await tryCopyWeekRpc(supabase, {
    p_program_id: programId,
    p_source_week: absoluteSourceWeek,
    p_total_weeks: blockWeekCount,
  })
  if (autoBlockError) {
    throw new Error(autoBlockError)
  }
}
