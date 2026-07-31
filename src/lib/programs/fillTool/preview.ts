import type { ProgramDraftState } from '@/types/programDraft'
import { readBaselineValues, formatPropertyPreviewValue } from './properties'
import {
  absoluteWeeksForRange,
  daySessionLabel,
  FILL_SOURCE_EMPTY_MESSAGE,
  getSourceWorkout,
  isSourceScopeEmpty,
  sortedGroups,
  sourceWeekFillableDays,
} from './matching'
import { collectScopedExercises, displayForScopedExercise } from './placement'
import {
  resolveDayTargetAction,
  resolveExerciseTargetAction,
  resolveGroupTargetAction,
  type FillTargetAction,
} from './slotDecision'
import type {
  FillPreview,
  FillPreviewCell,
  FillPreviewRow,
  FillSkipEntry,
  FillStampConfig,
} from './types'

function rowIdFor(scoped: {
  programDay: number
  matchKey: { groupIndex: number; exerciseOrder: number; exerciseId: string }
}): string {
  return `${scoped.programDay}-${scoped.matchKey.groupIndex}-${scoped.matchKey.exerciseOrder}-${scoped.matchKey.exerciseId}`
}

export function buildFillPreview(
  draft: ProgramDraftState,
  config: FillStampConfig,
): FillPreview | null {
  const scopedExercises = collectScopedExercises(draft, config)
  if (scopedExercises.length === 0 && config.scope !== 'day') {
    const source = getSourceWorkout(draft, config.sourceAbsoluteWeek, config.sourceProgramDay)
    if (!source && config.scope !== 'week') return null
  }

  const absoluteWeeks = absoluteWeeksForRange(config.sourceAbsoluteWeek, config.endAbsoluteWeek)
  const weekLabels = absoluteWeeks.map((week, index) =>
    index === 0 ? `Wk ${week} (source)` : `Wk ${week}`,
  )

  if (isSourceScopeEmpty(draft, config)) {
    return {
      config,
      weekLabels,
      absoluteWeeks,
      rows: [],
      skips: [],
      summary: {
        willWrite: 0,
        skippedDifferent: 0,
        sourceEmpty: true,
        sourceEmptyMessage: FILL_SOURCE_EMPTY_MESSAGE,
      },
    }
  }

  const rows: FillPreviewRow[] = []
  const skips: FillSkipEntry[] = []
  let willWrite = 0
  let skippedDifferent = 0

  if (config.scope === 'week' && (config.pattern === 'hold' || !config.property)) {
    const sessionDays = sourceWeekFillableDays(draft, config.sourceAbsoluteWeek)
    for (const programDay of sessionDays) {
      const source = getSourceWorkout(draft, config.sourceAbsoluteWeek, programDay)
      if (!source) continue
      const label = daySessionLabel(programDay, source.workout.name)
      const cells = buildDayRowCells(
        draft,
        config,
        absoluteWeeks,
        programDay,
        label,
        source.workout,
        skips,
        () => skippedDifferent++,
        () => willWrite++,
      )
      rows.push({
        rowId: `week-day-${programDay}`,
        programDay,
        label,
        baselineDisplay: 'Copy day',
        cells,
        canRampProperty: false,
      })
    }
  } else if (config.scope === 'day' && (config.pattern === 'hold' || !config.property)) {
    const source = getSourceWorkout(draft, config.sourceAbsoluteWeek, config.sourceProgramDay)
    if (!source) return null
    const label = daySessionLabel(config.sourceProgramDay, source.workout.name)
    const cells = buildDayRowCells(
      draft,
      config,
      absoluteWeeks,
      config.sourceProgramDay,
      label,
      source.workout,
      skips,
      () => skippedDifferent++,
      () => willWrite++,
    )
    rows.push({
      rowId: 'day-hold',
      programDay: config.sourceProgramDay,
      label,
      baselineDisplay: 'Copy day',
      cells,
      canRampProperty: false,
    })
  } else {
    for (const scoped of scopedExercises) {
      const baseline =
        config.property && scoped.canRampProperty
          ? formatPropertyPreviewValue(config.property, readBaselineValues(scoped.slot, config.property)!)
          : 'Copy'

      const cells: FillPreviewCell[] = []

      for (let weekIndex = 0; weekIndex < absoluteWeeks.length; weekIndex++) {
        const absoluteWeek = absoluteWeeks[weekIndex]
        const programDay = scoped.programDay

        if (weekIndex === 0) {
          cells.push({
            weekIndex,
            absoluteWeek,
            programDay,
            display: baseline,
            status: 'source',
          })
          continue
        }

        const action = resolveActionForScopedRow(config, draft, absoluteWeek, programDay, scoped)
        if (action === 'skip_different') {
          cells.push({
            weekIndex,
            absoluteWeek,
            programDay,
            display: 'Different exercise',
            status: 'skip_different',
            skipReason: 'different_exercise',
          })
          skips.push({
            absoluteWeek,
            weekIndex,
            programDay,
            label: scoped.label,
            reason: 'different_exercise',
          })
          skippedDifferent++
          continue
        }

        cells.push({
          weekIndex,
          absoluteWeek,
          programDay,
          display: displayForScopedExercise(config, scoped, weekIndex),
          status: 'write',
        })
        willWrite++
      }

      rows.push({
        rowId: rowIdFor(scoped),
        programDay: scoped.programDay,
        matchKey: scoped.matchKey,
        label: scoped.label,
        baselineDisplay: baseline,
        cells,
        canRampProperty: scoped.canRampProperty,
      })
    }
  }

  if (rows.length === 0) return null

  return {
    config,
    weekLabels,
    absoluteWeeks,
    rows,
    skips,
    summary: { willWrite, skippedDifferent },
  }
}

function resolveActionForScopedRow(
  config: FillStampConfig,
  draft: ProgramDraftState,
  targetAbsoluteWeek: number,
  programDay: number,
  scoped: { matchKey: { groupIndex: number; exerciseOrder: number; exerciseId: string } },
): FillTargetAction {
  if (config.scope === 'exercise') {
    return resolveExerciseTargetAction(draft, targetAbsoluteWeek, programDay, scoped.matchKey)
  }
  if (config.scope === 'group') {
    const source = getSourceWorkout(draft, config.sourceAbsoluteWeek, config.sourceProgramDay)
    if (!source) return 'skip_different'
    const sourceGroup = sortedGroups(source.workout)[scoped.matchKey.groupIndex]
    if (!sourceGroup) return 'skip_different'
    return resolveGroupTargetAction(
      draft,
      targetAbsoluteWeek,
      programDay,
      scoped.matchKey.groupIndex,
      sourceGroup,
    )
  }
  const source = getSourceWorkout(draft, config.sourceAbsoluteWeek, programDay)
  if (!source) return 'skip_different'
  return resolveDayTargetAction(draft, targetAbsoluteWeek, programDay, source.workout)
}

function buildDayRowCells(
  draft: ProgramDraftState,
  config: FillStampConfig,
  absoluteWeeks: number[],
  programDay: number,
  label: string,
  sourceWorkout: import('@/lib/groupModel/canvasTypes').CanvasWorkout,
  skips: FillSkipEntry[],
  onSkip: () => void,
  onWrite: () => void,
): FillPreviewCell[] {
  const cells: FillPreviewCell[] = []

  for (let weekIndex = 0; weekIndex < absoluteWeeks.length; weekIndex++) {
    const absoluteWeek = absoluteWeeks[weekIndex]
    if (weekIndex === 0) {
      cells.push({
        weekIndex,
        absoluteWeek,
        programDay,
        display: 'Copy day',
        status: 'source',
      })
      continue
    }

    const action = resolveDayTargetAction(draft, absoluteWeek, programDay, sourceWorkout)
    if (action === 'skip_different') {
      cells.push({
        weekIndex,
        absoluteWeek,
        programDay,
        display: 'Different exercise',
        status: 'skip_different',
        skipReason: 'different_exercise',
      })
      skips.push({
        absoluteWeek,
        weekIndex,
        programDay,
        label,
        reason: 'different_exercise',
      })
      onSkip()
      continue
    }

    cells.push({
      weekIndex,
      absoluteWeek,
      programDay,
      display: 'Copy day',
      status: 'write',
    })
    onWrite()
  }
  return cells
}
