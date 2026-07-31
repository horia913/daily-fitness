import type { CanvasGroup, CanvasWorkout } from '@/lib/groupModel/canvasTypes'
import type { ProgramDraftState } from '@/types/programDraft'
import {
  findSlotByMatchKey,
  getSourceWorkout,
  hasSession,
  isEmptyShellWorkout,
  sortedGroups,
} from './matching'
import type { ExerciseMatchKey } from './types'

export type FillTargetAction = 'place' | 'overwrite' | 'skip_different'

function getTargetWorkout(
  draft: ProgramDraftState,
  absoluteWeek: number,
  programDay: number,
): CanvasWorkout | null {
  return getSourceWorkout(draft, absoluteWeek, programDay)?.workout ?? null
}

export function groupStructureMatches(source: CanvasGroup, target: CanvasGroup): boolean {
  if (source.slots.length !== target.slots.length) return false
  for (let i = 0; i < source.slots.length; i++) {
    const s = source.slots[i]
    const t = target.slots[i]
    if (s.exercise_id !== t.exercise_id) return false
    if (s.exercise_order !== t.exercise_order) return false
  }
  return true
}

export function workoutsStructurallyMatch(source: CanvasWorkout, target: CanvasWorkout): boolean {
  const sourceGroups = sortedGroups(source)
  const targetGroups = sortedGroups(target)
  if (sourceGroups.length !== targetGroups.length) return false
  for (let i = 0; i < sourceGroups.length; i++) {
    if (!groupStructureMatches(sourceGroups[i], targetGroups[i])) return false
  }
  return true
}

export function resolveExerciseTargetAction(
  draft: ProgramDraftState,
  absoluteWeek: number,
  programDay: number,
  matchKey: ExerciseMatchKey,
): FillTargetAction {
  if (!hasSession(draft, absoluteWeek, programDay)) return 'place'
  const workout = getTargetWorkout(draft, absoluteWeek, programDay)
  if (!workout || isEmptyShellWorkout(workout)) return 'place'
  if (findSlotByMatchKey(workout, matchKey)) return 'overwrite'

  const groups = sortedGroups(workout)
  const group = groups[matchKey.groupIndex]
  if (!group) return 'place'
  const slotAtOrder = group.slots.find((s) => s.exercise_order === matchKey.exerciseOrder)
  if (!slotAtOrder) return 'place'
  if (slotAtOrder.exercise_id !== matchKey.exerciseId) return 'skip_different'
  return 'overwrite'
}

export function resolveGroupTargetAction(
  draft: ProgramDraftState,
  absoluteWeek: number,
  programDay: number,
  groupIndex: number,
  sourceGroup: CanvasGroup,
): FillTargetAction {
  if (!hasSession(draft, absoluteWeek, programDay)) return 'place'
  const workout = getTargetWorkout(draft, absoluteWeek, programDay)
  if (!workout || isEmptyShellWorkout(workout)) return 'place'
  const groups = sortedGroups(workout)
  if (groups.length <= groupIndex) return 'place'
  if (groupStructureMatches(sourceGroup, groups[groupIndex])) return 'overwrite'
  return 'skip_different'
}

export function resolveDayTargetAction(
  draft: ProgramDraftState,
  absoluteWeek: number,
  programDay: number,
  sourceWorkout: CanvasWorkout,
): FillTargetAction {
  if (!hasSession(draft, absoluteWeek, programDay)) return 'place'
  const target = getSourceWorkout(draft, absoluteWeek, programDay)
  if (!target || isEmptyShellWorkout(target.workout)) return 'place'
  if (workoutsStructurallyMatch(sourceWorkout, target.workout)) return 'overwrite'
  return 'skip_different'
}
