/**
 * Batch load training_blocks for coach program list (structure strip).
 * Separate from getMasterProgramTotalWeeksBatch — do not merge.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export interface MasterProgramBlockRow {
  name: string
  phase_label: string | null
  duration_weeks: number
  block_order: number
}

export async function getMasterProgramBlocksBatch(
  supabase: SupabaseClient,
  programIds: string[],
): Promise<Map<string, MasterProgramBlockRow[]>> {
  const result = new Map<string, MasterProgramBlockRow[]>()
  const unique = [...new Set(programIds.filter(Boolean))]
  if (unique.length === 0) return result

  const { data, error } = await supabase
    .from('training_blocks')
    .select('program_id, name, phase_label, duration_weeks, block_order')
    .in('program_id', unique)
    .order('block_order', { ascending: true })

  if (error) {
    console.error('[masterProgramBlocksBatch] getMasterProgramBlocksBatch:', error.message)
    return result
  }

  for (const row of data ?? []) {
    const pid = String((row as { program_id: string }).program_id)
    const list = result.get(pid) ?? []
    list.push({
      name: String((row as { name: string }).name),
      phase_label: (row as { phase_label?: string | null }).phase_label ?? null,
      duration_weeks: Number((row as { duration_weeks: number }).duration_weeks) || 0,
      block_order: Number((row as { block_order: number }).block_order) || 0,
    })
    result.set(pid, list)
  }

  for (const [pid, list] of result) {
    list.sort((a, b) => {
      if (a.block_order !== b.block_order) return a.block_order - b.block_order
      return 0
    })
    result.set(pid, list)
  }

  return result
}
