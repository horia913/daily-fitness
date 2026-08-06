/**
 * Per-phase-NAME colors for the periodization ribbon (not intensity buckets).
 */

import { ribbonBlockColor } from '@/lib/programs/periodizationRibbonColors'
import {
  normalizePeriodizationStyle,
  type PeriodizationStyleId,
} from '@/lib/programs/periodizationStyles'

export const PHASE_COLOR_DELOAD = '#5EC8FF'

/** linear_4 */
const LINEAR_4_COLORS: Record<string, string> = {
  foundation: '#2EF2C6',
  accumulation: '#B4FF3D',
  intensification: '#FFD426',
  realization: '#FF5A4D',
  deload: PHASE_COLOR_DELOAD,
}

/** hsp_peak */
const HSP_PEAK_COLORS: Record<string, string> = {
  hypertrophy: '#B4FF3D',
  strength: '#FFD426',
  power: '#FF8A1F',
  peak: '#FF5A4D',
  deload: PHASE_COLOR_DELOAD,
}

/** gpp_spp */
const GPP_SPP_COLORS: Record<string, string> = {
  gpp: '#2EF2C6',
  spp: '#FFD426',
  competition: '#FF5A4D',
  deload: PHASE_COLOR_DELOAD,
}

/** seasonal */
const SEASONAL_COLORS: Record<string, string> = {
  offseason: '#2EF2C6',
  preseason: '#FFD426',
  'in-season': '#FF5A4D',
  inseason: '#FF5A4D',
  deload: PHASE_COLOR_DELOAD,
}

const STYLE_PHASE_COLORS: Partial<
  Record<Exclude<PeriodizationStyleId, 'block' | 'custom'>, Record<string, string>>
> = {
  linear_4: LINEAR_4_COLORS,
  hsp_peak: HSP_PEAK_COLORS,
  gpp_spp: GPP_SPP_COLORS,
  seasonal: SEASONAL_COLORS,
}

/** Union of all named phase colors (for free-text / mismatched style). */
const ALL_NAMED_PHASE_COLORS: Record<string, string> = {
  ...LINEAR_4_COLORS,
  ...HSP_PEAK_COLORS,
  ...GPP_SPP_COLORS,
  ...SEASONAL_COLORS,
}

function normalizePhaseKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*\/\s*/g, '/')
}

function isDeloadLabel(label: string): boolean {
  const key = normalizePhaseKey(label)
  if (key === 'deload') return true
  // keyword anywhere in free-text / compound labels
  return /\bdeload\b/.test(key)
}

function lookupInMap(map: Record<string, string>, label: string): string | null {
  const key = normalizePhaseKey(label)
  if (map[key]) return map[key]
  // "In-season" variants already covered; also try without spaces/hyphens
  const compact = key.replace(/[\s-]+/g, '')
  for (const [k, v] of Object.entries(map)) {
    if (k.replace(/[\s-]+/g, '') === compact) return v
  }
  return null
}

/**
 * Resolve a ribbon segment color by phase name.
 * 1) Deload (any style) → baby blue
 * 2) Style-specific phase_label map
 * 3) Global named-phase map (free text that matches a known name)
 * 4) RIBBON_RAMP by block index (Block N / unmatched)
 */
export function phaseColorFor(
  phaseLabel: string | null | undefined,
  periodizationStyle: string | null | undefined,
  blockIndex: number,
  blockCount: number,
): string {
  const label = phaseLabel?.trim() ?? ''
  if (label && isDeloadLabel(label)) return PHASE_COLOR_DELOAD

  if (label) {
    const style = normalizePeriodizationStyle(periodizationStyle)
    if (style && style !== 'block' && style !== 'custom') {
      const styleMap = STYLE_PHASE_COLORS[style]
      if (styleMap) {
        const hit = lookupInMap(styleMap, label)
        if (hit) return hit
      }
    }
    const globalHit = lookupInMap(ALL_NAMED_PHASE_COLORS, label)
    if (globalHit) return globalHit
  }

  return ribbonBlockColor(blockIndex, Math.max(1, blockCount))
}

export type PhaseColorBlock = {
  name: string
  phase_label?: string | null
  block_order?: number
}

/**
 * One hex color per block for the ribbon / week ticks / day accents.
 * Prefers phase_label; falls back to name for matching (e.g. free-text Deload in name).
 */
export function ribbonPhaseHexColors(
  blocks: PhaseColorBlock[],
  periodizationStyle: string | null | undefined,
): string[] {
  const n = blocks.length
  return blocks.map((b, i) => {
    const label = b.phase_label?.trim() || b.name?.trim() || ''
    return phaseColorFor(label, periodizationStyle, i, n)
  })
}
