/**
 * Maps training_blocks → collection-card structure strip segments.
 * Intensity proxy only — swappable when real phase tagging lands.
 */

import type { CollectionCardStructureSegment, CollectionPhaseLevel } from '@/components/ui/CollectionCard'
import type { MasterProgramBlockRow } from '@/lib/programs/masterProgramBlocksBatch'

export type BlockPhaseLevel = 'light' | 'mod' | 'hard' | 'deload'

export interface BlockPhaseSegment {
  label: string
  weeks: number
  level: BlockPhaseLevel
}

const DELOAD_KEYWORDS = [
  'deload',
  'taper',
  'recovery',
  'back-off',
  'backoff',
  'restoration',
  'unload',
  'rest',
] as const

const LIGHT_KEYWORDS = [
  'foundation',
  'base',
  'gpp',
  'accumulation',
  'prep',
  'intro',
  'general',
] as const

const MOD_KEYWORDS = ['hypertrophy', 'build', 'development'] as const

const HARD_KEYWORDS = [
  'strength',
  'intensity',
  'intensification',
  'peak',
  'power',
  'overreach',
  'competition',
  'realization',
] as const

function blockSearchText(block: MasterProgramBlockRow): string {
  return `${block.phase_label ?? ''} ${block.name}`.toLowerCase()
}

function containsKeyword(text: string, keywords: readonly string[]): boolean {
  return keywords.some((kw) => text.includes(kw))
}

function isDeloadBlock(block: MasterProgramBlockRow): boolean {
  return containsKeyword(blockSearchText(block), DELOAD_KEYWORDS)
}

function keywordLevel(block: MasterProgramBlockRow): BlockPhaseLevel | null {
  const text = blockSearchText(block)
  if (containsKeyword(text, DELOAD_KEYWORDS)) return 'deload'
  if (containsKeyword(text, LIGHT_KEYWORDS)) return 'light'
  if (containsKeyword(text, MOD_KEYWORDS)) return 'mod'
  if (containsKeyword(text, HARD_KEYWORDS)) return 'hard'
  return null
}

function orderRampLevel(index: number, totalNonDeload: number): BlockPhaseLevel {
  if (totalNonDeload <= 0) return 'mod'
  if (totalNonDeload === 1) return 'mod'
  if (totalNonDeload === 2) return index === 0 ? 'light' : 'mod'
  if (totalNonDeload === 3) {
    if (index === 0) return 'light'
    if (index === 1) return 'mod'
    return 'hard'
  }
  if (index === totalNonDeload - 1) return 'hard'
  const ratio = index / (totalNonDeload - 1)
  if (ratio < 0.34) return 'light'
  if (ratio < 0.67) return 'mod'
  return 'hard'
}

function toCollectionPhase(level: BlockPhaseLevel): CollectionPhaseLevel {
  if (level === 'mod') return 'moderate'
  return level
}

export function mapProgramBlocksToPhaseSegments(
  blocks: MasterProgramBlockRow[],
): BlockPhaseSegment[] {
  const sorted = [...blocks].sort((a, b) => a.block_order - b.block_order)
  const nonDeloadPositions = sorted
    .map((block, index) => ({ block, index }))
    .filter(({ block }) => !isDeloadBlock(block))

  return sorted.map((block, index) => {
    let level: BlockPhaseLevel

    if (isDeloadBlock(block)) {
      level = 'deload'
    } else {
      const fromKeyword = keywordLevel(block)
      if (fromKeyword && fromKeyword !== 'deload') {
        level = fromKeyword
      } else {
        const pos = nonDeloadPositions.findIndex((entry) => entry.index === index)
        level = orderRampLevel(pos, nonDeloadPositions.length)
      }
    }

    const label = block.phase_label?.trim() || block.name

    return {
      label,
      weeks: Math.max(1, block.duration_weeks),
      level,
    }
  })
}

/** Collection-card structure strip — only when caller passes multi-block programs. */
export function mapProgramBlocksToStructureSegments(
  blocks: MasterProgramBlockRow[],
): CollectionCardStructureSegment[] {
  return mapProgramBlocksToPhaseSegments(blocks).map((seg) => ({
    label: seg.label,
    duration: `${seg.weeks} week${seg.weeks !== 1 ? 's' : ''}`,
    flex: seg.weeks,
    phase: toCollectionPhase(seg.level),
  }))
}
