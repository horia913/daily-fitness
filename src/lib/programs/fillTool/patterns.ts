import type { FillPatternInputs, FillPatternKind } from './types'

/** weekIndex 0 = source week. */
export function linearPattern(baseline: number, step: number, weekIndex: number): number {
  return baseline + step * weekIndex
}

export function holdPattern(baseline: number, _weekIndex: number): number {
  return baseline
}

/** Hold `hold` weeks, then jump `jump`, repeating evenly. */
export function stepPattern(
  baseline: number,
  hold: number,
  jump: number,
  weekIndex: number,
): number {
  const h = Math.max(1, Math.floor(hold))
  return baseline + Math.floor(weekIndex / h) * jump
}

export function wavePattern(
  baseline: number,
  waveLength: number,
  withinStep: number,
  cycleStep: number,
  weekIndex: number,
): number {
  const length = Math.max(1, Math.floor(waveLength))
  const cycleIndex = Math.floor(weekIndex / length)
  const weekInCycle = weekIndex % length
  const cycleStart = baseline + cycleIndex * cycleStep
  return cycleStart + weekInCycle * withinStep
}

export function evaluatePattern(
  pattern: FillPatternKind,
  baseline: number,
  weekIndex: number,
  inputs: FillPatternInputs,
): number {
  switch (pattern) {
    case 'linear':
      return linearPattern(baseline, inputs.step ?? 0, weekIndex)
    case 'hold':
      return holdPattern(baseline, weekIndex)
    case 'step':
      return stepPattern(baseline, inputs.hold ?? 1, inputs.jump ?? 0, weekIndex)
    case 'wave':
      return wavePattern(
        baseline,
        inputs.waveLength ?? 1,
        inputs.withinStep ?? 0,
        inputs.cycleStep ?? 0,
        weekIndex,
      )
    default:
      return baseline
  }
}
