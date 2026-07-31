import type { TrainingBlock } from '@/types/trainingBlock'
import type { ProgramType } from '@/types/programStation'

export function normalizeProgramType(raw: unknown): ProgramType {
  return raw === 'recurring' ? 'recurring' : 'fixed'
}

/** Block spine only when fixed program has 2+ blocks (progressive disclosure). */
export function shouldShowBlockSpine(type: ProgramType, blockCount: number): boolean {
  return type === 'fixed' && blockCount >= 2
}

export function sumTrainingBlockWeeks(blocks: TrainingBlock[]): number {
  return blocks.reduce((s, b) => s + Math.max(0, Number(b.duration_weeks) || 0), 0)
}

export function computeBlockStartWeek(
  blocks: TrainingBlock[],
  activeBlockId: string | null,
): number {
  let offset = 0
  for (const block of blocks) {
    if (block.id === activeBlockId) return offset + 1
    offset += Math.max(0, Number(block.duration_weeks) || 0)
  }
  return 1
}

export interface BlockWeekRange {
  blockId: string
  startWeek: number
  endWeek: number
  weekCount: number
}

export function computeBlockWeekRanges(blocks: TrainingBlock[]): BlockWeekRange[] {
  let offset = 0
  return blocks.map((block) => {
    const weekCount = Math.max(0, Number(block.duration_weeks) || 0)
    const startWeek = offset + 1
    const endWeek = offset + weekCount
    offset += weekCount
    return { blockId: block.id, startWeek, endWeek, weekCount }
  })
}

export function absoluteWeekFromRelative(blockStartWeek: number, relativeWeek: number): number {
  return blockStartWeek + relativeWeek - 1
}

export function relativeWeekFromAbsolute(blockStartWeek: number, absoluteWeek: number): number {
  return absoluteWeek - blockStartWeek + 1
}

/** Args for block-scoped `copy_week_schedule` RPC (§5 duplicate-week scope). */
export function buildCopyWeekScheduleArgs(
  programId: string,
  trainingBlocks: TrainingBlock[],
  activeBlock: TrainingBlock,
  absoluteWeek: number,
) {
  const blockStart = computeBlockStartWeek(trainingBlocks, activeBlock.id)
  return {
    p_program_id: programId,
    p_source_week: absoluteWeek,
    p_total_weeks: activeBlock.duration_weeks,
    p_block_start_week: blockStart,
    /** NULL — schedule rows are keyed by week range; FK is often unset on legacy rows. */
    p_training_block_id: null,
  }
}

/** Minimal 3-arg RPC (20260421 auto-detects block from source week). */
export function buildCopyWeekScheduleArgsMinimal(
  programId: string,
  absoluteWeek: number,
  blockWeekCount: number,
) {
  return {
    p_program_id: programId,
    p_source_week: absoluteWeek,
    p_total_weeks: blockWeekCount,
  }
}
