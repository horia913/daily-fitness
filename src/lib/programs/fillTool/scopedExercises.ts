import type { CanvasExercise, CanvasWorkout } from '@/lib/groupModel/canvasTypes'
import { programDayLabel } from '@/lib/programs/stationScheduleUtils'
import { readBaselineValues } from './properties'
import type { ExerciseMatchKey, FillPropertyKey, FillScope, ScopedExercise } from './types'
import {
  exerciseLabel,
  findSlotByMatchKey,
  sortedGroups,
} from './matching'

export function expandScopedExercises(
  sourceWorkout: CanvasWorkout,
  scope: FillScope,
  scopeMatchKeys: ExerciseMatchKey[],
  property: FillPropertyKey | null,
  programDay: number,
): ScopedExercise[] {
  const groups = sortedGroups(sourceWorkout)
  const out: ScopedExercise[] = []

  const pushSlot = (groupIndex: number, slot: CanvasExercise) => {
    const matchKey = {
      groupIndex,
      exerciseOrder: slot.exercise_order,
      exerciseId: slot.exercise_id,
    }
    const baseline = property ? readBaselineValues(slot, property) : null
    const canRampProperty = Boolean(property && baseline && baseline.length > 0)
    const label =
      scope === 'week'
        ? `${programDayLabel(programDay)} · ${exerciseLabel(groupIndex, slot)}`
        : exerciseLabel(groupIndex, slot)
    out.push({
      programDay,
      matchKey,
      label,
      slot,
      groupIndex,
      canRampProperty,
    })
  }

  if (scope === 'day' || scope === 'week') {
    groups.forEach((group, groupIndex) => {
      group.slots.forEach((slot) => pushSlot(groupIndex, slot))
    })
    return out
  }

  if (scope === 'group') {
    const key = scopeMatchKeys[0]
    if (!key) return out
    const group = groups[key.groupIndex]
    if (!group) return out
    group.slots.forEach((slot) => pushSlot(key.groupIndex, slot))
    return out
  }

  for (const key of scopeMatchKeys) {
    const found = findSlotByMatchKey(sourceWorkout, key)
    if (found) pushSlot(found.groupIndex, found.slot)
  }

  return out
}
