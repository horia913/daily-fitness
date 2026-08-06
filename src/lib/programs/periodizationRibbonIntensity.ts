/**
 * @deprecated Ribbon colors moved to periodizationPhaseColors (per-phase-name).
 * Re-exports batch helpers for any leftover imports. Collection-card intensity
 * mapping stays in mapProgramBlockPhaseSegments — do not use this for cards.
 */

import {
  ribbonPhaseHexColors,
  type PhaseColorBlock,
} from '@/lib/programs/periodizationPhaseColors'

export type RibbonColorBlock = PhaseColorBlock & {
  duration_weeks: number
  block_order: number
}

/** @deprecated Use ribbonPhaseHexColors(blocks, style) */
export function ribbonIntensityCssVars(
  blocks: RibbonColorBlock[],
  periodizationStyle?: string | null,
): string[] {
  return ribbonPhaseHexColors(blocks, periodizationStyle ?? null)
}

/** @deprecated Use ribbonPhaseHexColors(blocks, style) */
export function ribbonIntensityHexColors(
  blocks: RibbonColorBlock[],
  periodizationStyle?: string | null,
): string[] {
  return ribbonPhaseHexColors(blocks, periodizationStyle ?? null)
}
