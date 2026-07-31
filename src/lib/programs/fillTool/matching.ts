import type { CanvasExercise, CanvasGroup, CanvasWorkout } from '@/lib/groupModel/canvasTypes'
import { countCanvasExercises } from '@/lib/groupModel/canvasTypes'
import type { ProgramDraftState } from '@/types/programDraft'
import { getScheduleSlot } from '@/lib/programs/stationScheduleUtils'
import { computeBlockWeekRanges, sumTrainingBlockWeeks } from '@/lib/programs/stationBlockWeeks'
import { groupLetter } from '@/components/workout-canvas/formatSummary'
import { programDayLabel } from '@/lib/programs/stationScheduleUtils'
import type { ExerciseMatchKey, FillScope, FillStampConfig } from './types'

export const FILL_SOURCE_EMPTY_MESSAGE =
  'Nothing to fill — the source day/exercise is empty.'

/** Schedule row + workout with no usable exercise slots (ghost or malformed empty day). */
export function isEmptyShellWorkout(workout: CanvasWorkout): boolean {
  return countCanvasExercises(workout) === 0
}

export function sortedGroups(workout: CanvasWorkout): CanvasGroup[] {
  return [...workout.groups].sort((a, b) => a.set_order - b.set_order)
}

export function matchKeyForSlot(
  workout: CanvasWorkout,
  groupIndex: number,
  slot: CanvasExercise,
): ExerciseMatchKey {
  return {
    groupIndex,
    exerciseOrder: slot.exercise_order,
    exerciseId: slot.exercise_id,
  }
}

export function exerciseLabel(groupIndex: number, slot: CanvasExercise): string {
  const letter = groupLetter(groupIndex)
  const name = slot.exercise?.name?.trim() || 'Exercise'
  return `${letter} · ${name}`
}

export function findSlotByMatchKey(
  workout: CanvasWorkout,
  key: ExerciseMatchKey,
): { groupIndex: number; slot: CanvasExercise } | null {
  const groups = sortedGroups(workout)
  const group = groups[key.groupIndex]
  if (!group) return null
  const slot = group.slots.find(
    (s) => s.exercise_order === key.exerciseOrder && s.exercise_id === key.exerciseId,
  )
  if (!slot) return null
  return { groupIndex: key.groupIndex, slot }
}

export function resolveGroupIndex(workout: CanvasWorkout, groupId: string): number | null {
  const groups = sortedGroups(workout)
  const index = groups.findIndex((g) => g.id === groupId)
  return index >= 0 ? index : null
}

export function resolveMatchKeyForSlot(
  workout: CanvasWorkout,
  groupId: string,
  slotId: string,
): ExerciseMatchKey | null {
  const groupIndex = resolveGroupIndex(workout, groupId)
  if (groupIndex == null) return null
  const group = sortedGroups(workout)[groupIndex]
  const slot = group.slots.find((s) => s.id === slotId)
  if (!slot) return null
  return matchKeyForSlot(workout, groupIndex, slot)
}

export function getSourceWorkout(
  draft: ProgramDraftState,
  absoluteWeek: number,
  programDay: number,
): { templateId: string; workout: CanvasWorkout } | null {
  if (!draft.schedule?.length) return null
  const slot = getScheduleSlot(draft.schedule, absoluteWeek, programDay)
  if (!slot?.template_id) return null
  const workout = draft.workouts[slot.template_id]
  if (!workout) return null
  return { templateId: slot.template_id, workout }
}

export function hasSession(
  draft: ProgramDraftState,
  absoluteWeek: number,
  programDay: number,
): boolean {
  const slot = getScheduleSlot(draft.schedule ?? [], absoluteWeek, programDay)
  return Boolean(slot?.template_id && draft.workouts[slot.template_id])
}

export function weekHasAnySession(draft: ProgramDraftState, absoluteWeek: number): boolean {
  for (let day = 1; day <= 7; day++) {
    if (hasSession(draft, absoluteWeek, day)) return true
  }
  return false
}

export function sourceWeekSessionDays(
  draft: ProgramDraftState,
  sourceAbsoluteWeek: number,
): number[] {
  const days: number[] = []
  for (let day = 1; day <= 7; day++) {
    if (hasSession(draft, sourceAbsoluteWeek, day)) days.push(day)
  }
  return days
}

/** Session days in the source week that have at least one exercise (not empty shells). */
export function sourceWeekFillableDays(
  draft: ProgramDraftState,
  sourceAbsoluteWeek: number,
): number[] {
  const days: number[] = []
  for (let day = 1; day <= 7; day++) {
    if (!hasSession(draft, sourceAbsoluteWeek, day)) continue
    const source = getSourceWorkout(draft, sourceAbsoluteWeek, day)
    if (source && !isEmptyShellWorkout(source.workout)) days.push(day)
  }
  return days
}

export function isSourceScopeEmpty(draft: ProgramDraftState, config: FillStampConfig): boolean {
  switch (config.scope) {
    case 'day': {
      const source = getSourceWorkout(draft, config.sourceAbsoluteWeek, config.sourceProgramDay)
      return !source || isEmptyShellWorkout(source.workout)
    }
    case 'week':
      return sourceWeekFillableDays(draft, config.sourceAbsoluteWeek).length === 0
    case 'group': {
      const source = getSourceWorkout(draft, config.sourceAbsoluteWeek, config.sourceProgramDay)
      if (!source || isEmptyShellWorkout(source.workout)) return true
      const groupIndex = config.scopeMatchKeys[0]?.groupIndex
      if (groupIndex == null) return true
      return !sortedGroups(source.workout)[groupIndex]
    }
    case 'exercise': {
      const source = getSourceWorkout(draft, config.sourceAbsoluteWeek, config.sourceProgramDay)
      if (!source || isEmptyShellWorkout(source.workout)) return true
      const key = config.scopeMatchKeys[0]
      if (!key) return true
      return !findSlotByMatchKey(source.workout, key)
    }
    default:
      return true
  }
}

export function defaultEndWeek(
  draft: ProgramDraftState,
  _sourceAbsoluteWeek: number,
  activeBlockId: string | null,
): number {
  return blockEndWeek(draft, activeBlockId)
}

export function minEndWeek(sourceAbsoluteWeek: number): number {
  return sourceAbsoluteWeek + 1
}

export function absoluteWeeksForRange(
  sourceAbsoluteWeek: number,
  endAbsoluteWeek: number,
): number[] {
  const end = Math.max(sourceAbsoluteWeek, endAbsoluteWeek)
  return Array.from({ length: end - sourceAbsoluteWeek + 1 }, (_, i) => sourceAbsoluteWeek + i)
}

export function clampEndWeek(
  sourceAbsoluteWeek: number,
  endAbsoluteWeek: number,
  blockEnd: number,
): number {
  const min = minEndWeek(sourceAbsoluteWeek)
  const max = Math.max(min, blockEnd)
  return Math.max(min, Math.min(endAbsoluteWeek, max))
}

export function blockEndWeek(
  draft: ProgramDraftState,
  activeBlockId: string | null,
): number {
  const ranges = computeBlockWeekRanges(draft.trainingBlocks)
  const block =
    draft.trainingBlocks.find((b) => b.id === activeBlockId) ?? draft.trainingBlocks[0]
  const range = ranges.find((r) => r.blockId === block?.id)
  return range?.endWeek ?? sumTrainingBlockWeeks(draft.trainingBlocks)
}

export function buildInitialScopeMatchKeys(
  draft: ProgramDraftState,
  sourceAbsoluteWeek: number,
  sourceProgramDay: number,
  scope: FillScope,
  groupId?: string,
  slotId?: string,
): ExerciseMatchKey[] {
  const source = getSourceWorkout(draft, sourceAbsoluteWeek, sourceProgramDay)
  if (!source) return []

  if (scope === 'day' || scope === 'week') return []

  if (scope === 'group' && groupId) {
    const groupIndex = sortedGroups(source.workout).findIndex((g) => g.id === groupId)
    if (groupIndex < 0) return []
    return [{ groupIndex, exerciseOrder: 0, exerciseId: '' }]
  }

  if (scope === 'exercise' && groupId && slotId) {
    const groups = sortedGroups(source.workout)
    const groupIndex = groups.findIndex((g) => g.id === groupId)
    if (groupIndex < 0) return []
    const slot = groups[groupIndex]?.slots.find((s) => s.id === slotId)
    if (!slot) return []
    return [
      {
        groupIndex,
        exerciseOrder: slot.exercise_order,
        exerciseId: slot.exercise_id,
      },
    ]
  }

  return []
}

export function daySessionLabel(programDay: number, workoutName?: string | null): string {
  const name = workoutName?.trim()
  return name ? `${programDayLabel(programDay)} · ${name}` : programDayLabel(programDay)
}
