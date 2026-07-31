/**
 * Master program N = SUM(training_blocks.duration_weeks).
 * Do not read workout_programs.duration_weeks (stale legacy column).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { sumTrainingBlockWeeks } from '@/lib/programs/stationBlockWeeks'
import type { TrainingBlock } from '@/types/trainingBlock'

export async function getMasterProgramTotalWeeks(
  supabase: SupabaseClient,
  programId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from('training_blocks')
    .select('id, duration_weeks')
    .eq('program_id', programId)
    .order('block_order', { ascending: true })

  if (error) {
    console.error('[masterProgramWeeks] getMasterProgramTotalWeeks:', error.message)
    return 0
  }

  return sumTrainingBlockWeeks((data ?? []) as TrainingBlock[])
}

/** Batch load phase sums for many master programs (e.g. coach program list). */
export async function getMasterProgramTotalWeeksBatch(
  supabase: SupabaseClient,
  programIds: string[],
): Promise<Map<string, number>> {
  const result = new Map<string, number>()
  const unique = [...new Set(programIds.filter(Boolean))]
  if (unique.length === 0) return result

  const { data, error } = await supabase
    .from('training_blocks')
    .select('program_id, duration_weeks')
    .in('program_id', unique)

  if (error) {
    console.error('[masterProgramWeeks] getMasterProgramTotalWeeksBatch:', error.message)
    return result
  }

  const byProgram = new Map<string, TrainingBlock[]>()
  for (const row of data ?? []) {
    const pid = String((row as { program_id: string }).program_id)
    const list = byProgram.get(pid) ?? []
    list.push(row as TrainingBlock)
    byProgram.set(pid, list)
  }

  for (const pid of unique) {
    result.set(pid, sumTrainingBlockWeeks(byProgram.get(pid) ?? []))
  }
  return result
}
