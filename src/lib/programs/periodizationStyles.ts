/** Stored in `workout_programs.periodization_style`. */
export type PeriodizationStyleId =
  | 'block'
  | 'linear_4'
  | 'hsp_peak'
  | 'gpp_spp'
  | 'seasonal'
  | 'custom'

export const PERIODIZATION_STYLE_NONE = '__none__' as const

export const PERIODIZATION_STYLES: { id: PeriodizationStyleId; label: string }[] = [
  { id: 'block', label: 'Block' },
  {
    id: 'linear_4',
    label: 'Foundation / Accumulation / Intensification / Realization',
  },
  { id: 'hsp_peak', label: 'Hypertrophy / Strength / Power / Peak' },
  { id: 'gpp_spp', label: 'GPP / SPP / Competition' },
  { id: 'seasonal', label: 'Offseason / Preseason / In-season' },
  { id: 'custom', label: 'Custom' },
]

const PRESET_OPTIONS: Record<
  Exclude<PeriodizationStyleId, 'block' | 'custom'>,
  readonly string[]
> = {
  linear_4: ['Foundation', 'Accumulation', 'Intensification', 'Realization'],
  hsp_peak: ['Hypertrophy', 'Strength', 'Power', 'Peak'],
  gpp_spp: ['GPP', 'SPP', 'Competition'],
  seasonal: ['Offseason', 'Preseason', 'In-season'],
}

export function normalizePeriodizationStyle(
  value: string | null | undefined,
): PeriodizationStyleId | null {
  if (!value) return null
  const match = PERIODIZATION_STYLES.find((s) => s.id === value)
  return match?.id ?? null
}

export function periodizationStyleLabel(
  value: string | null | undefined,
): string | null {
  const id = normalizePeriodizationStyle(value)
  if (!id) return null
  return PERIODIZATION_STYLES.find((s) => s.id === id)?.label ?? null
}

export function usesPresetPhaseTypeDropdown(
  style: string | null | undefined,
): style is Exclude<PeriodizationStyleId, 'block' | 'custom'> {
  const id = normalizePeriodizationStyle(style)
  return id !== null && id !== 'block' && id !== 'custom'
}

export function usesBlockSequentialPhaseType(style: string | null | undefined): boolean {
  return normalizePeriodizationStyle(style) === 'block'
}

export function usesFreeTextPhaseType(style: string | null | undefined): boolean {
  const id = normalizePeriodizationStyle(style)
  return id === null || id === 'custom'
}

export function getPresetPhaseTypeOptions(
  style: string | null | undefined,
): string[] | null {
  const id = normalizePeriodizationStyle(style)
  if (!id || id === 'block' || id === 'custom') return null
  return [...PRESET_OPTIONS[id]]
}

export function blockSequentialLabel(blockOrder: number): string {
  return `Block ${blockOrder}`
}

export function blockSequentialOptions(blockCount: number): string[] {
  const n = Math.max(1, blockCount)
  return Array.from({ length: n }, (_, i) => blockSequentialLabel(i + 1))
}

export function formatPhaseDisplayName(
  name: string,
  phaseLabel: string | null | undefined,
  options?: {
    periodizationStyle?: string | null
    blockOrder?: number
  },
): string {
  let label = phaseLabel?.trim() ?? ''
  if (!label && options?.periodizationStyle && usesBlockSequentialPhaseType(options.periodizationStyle)) {
    const order = options.blockOrder ?? 0
    if (order > 0) label = blockSequentialLabel(order)
  }
  if (!label) return name
  return `${name} (${label})`
}

export function resolveBlockPhaseLabel(
  blockOrder: number,
  existing: string | null | undefined,
  periodizationStyle: string | null | undefined,
): string | null {
  if (existing?.trim()) return existing.trim()
  if (usesBlockSequentialPhaseType(periodizationStyle)) {
    return blockSequentialLabel(blockOrder)
  }
  return null
}

type PhaseLabelBlock = {
  name: string
  phase_label?: string | null
  block_order?: number
}

/** Periodization type for chips/subtitles (`phase_label` only — never goal). */
export function phaseTypeDisplayLabel(
  block: PhaseLabelBlock | null | undefined,
  options?: { periodizationStyle?: string | null },
): string | null {
  if (!block) return null
  return resolveBlockPhaseLabel(
    block.block_order ?? 0,
    block.phase_label,
    options?.periodizationStyle,
  )
}

/** Short uppercase label for nav chips; falls back to phase name when no phase type. */
export function phaseTypeAbbrevLabel(
  block: PhaseLabelBlock | null | undefined,
  options?: { periodizationStyle?: string | null },
): string {
  if (!block) return 'PROGRAM'
  const label = phaseTypeDisplayLabel(block, options)
  if (label) {
    const segment = label.split('/')[0]?.trim() ?? label
    return segment.length > 18 ? `${segment.slice(0, 16)}…` : segment.toUpperCase()
  }
  const name = block.name.trim()
  return name.length > 18 ? `${name.slice(0, 16)}…` : name.toUpperCase()
}
