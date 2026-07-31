/**
 * Client-facing program phase context — instance phases only (phase_label),
 * never master training_blocks / "Block N" framing.
 */

import type { InstancePhaseRow } from '@/lib/programInstance/instanceCanvasLoad'

export interface PhaseWeekRange {
  phase: InstancePhaseRow
  startWeek: number
  endWeek: number
  order: number
}

export interface PhasePosition {
  range: PhaseWeekRange
  weekWithinPhase: number
}

/** Cumulative week spans from ordered instance phases. */
export function buildPhaseWeekRanges(phases: InstancePhaseRow[]): PhaseWeekRange[] {
  const ordered = [...phases].sort((a, b) => a.phase_order - b.phase_order)
  let cursor = 1
  return ordered.map((phase, index) => {
    const dur = Math.max(0, Math.floor(Number(phase.duration_weeks) || 0))
    const startWeek = cursor
    const endWeek = dur > 0 ? cursor + dur - 1 : startWeek
    if (dur > 0) cursor += dur
    return {
      phase,
      startWeek,
      endWeek,
      order: index + 1,
    }
  })
}

/** Map absolute program week → containing phase + week index within that phase. */
export function resolvePhaseForAbsoluteWeek(
  absoluteWeek: number,
  ranges: PhaseWeekRange[],
): PhasePosition | null {
  if (!ranges.length || absoluteWeek < 1) return null
  for (const range of ranges) {
    if (absoluteWeek >= range.startWeek && absoluteWeek <= range.endWeek) {
      return {
        range,
        weekWithinPhase: absoluteWeek - range.startWeek + 1,
      }
    }
  }
  const last = ranges[ranges.length - 1]
  if (absoluteWeek > last.endWeek) {
    const span = Math.max(1, last.endWeek - last.startWeek + 1)
    return { range: last, weekWithinPhase: span }
  }
  return null
}

/** Coach-side legacy names copied from training_blocks — not shown to clients. */
export function isLegacyCoachBlockPhaseName(name: string | null | undefined): boolean {
  const trimmed = name?.trim()
  if (!trimmed) return false
  return /^block\s+\d+$/i.test(trimmed) || /^training\s+block\s+\d+$/i.test(trimmed)
}

/** Chip / headline label — phase_label first, then non-legacy name, else Phase N; never "Block N". */
export function clientPhaseChipLabel(phase: {
  phase_label?: string | null
  name?: string | null
  phase_order?: number | null
} | null | undefined): string | null {
  if (!phase) return null
  const label = phase.phase_label?.trim()
  if (label) return label
  const name = phase.name?.trim()
  if (name && !isLegacyCoachBlockPhaseName(name)) return name
  const order = Math.floor(Number(phase.phase_order) || 0)
  if (order > 0) return `Phase ${order}`
  return null
}

/** Optional subtitle when instance `name` adds detail beyond the chip (never legacy "Block N"). */
export function clientPhaseSecondaryLabel(phase: {
  phase_label?: string | null
  name?: string | null
  phase_order?: number | null
} | null | undefined): string | null {
  if (!phase) return null
  const chip = clientPhaseChipLabel(phase)
  const name = phase.name?.trim()
  if (!name || isLegacyCoachBlockPhaseName(name)) return null
  if (chip && name.toLowerCase() === chip.toLowerCase()) return null
  return name
}

export function formatPhaseWeekSpanLabel(
  phase: { phase_label?: string | null; name?: string | null },
  startWeek: number,
  endWeek: number,
): string {
  const typePart = clientPhaseChipLabel(phase) ?? 'Phase'
  if (startWeek === endWeek) return `${typePart} · Week ${startWeek}`
  return `${typePart} · Weeks ${startWeek}–${endWeek}`
}

export function formatClientWeekPositionLine(opts: {
  absoluteWeek: number
  totalWeeks: number
  weekWithinPhase: number | null
  phaseDurationWeeks: number | null
}): string {
  const { absoluteWeek, totalWeeks, weekWithinPhase, phaseDurationWeeks } = opts
  const overall =
    totalWeeks > 0
      ? `Week ${absoluteWeek} of ${totalWeeks}`
      : `Week ${absoluteWeek}`
  if (weekWithinPhase != null && phaseDurationWeeks != null && phaseDurationWeeks > 0) {
    return `${overall} · Week ${weekWithinPhase} of this phase`
  }
  return overall
}
