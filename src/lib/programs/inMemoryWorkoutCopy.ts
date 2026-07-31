import { newId } from '@/lib/groupModel/newId'
import type { CanvasGroup, CanvasWorkout } from '@/lib/groupModel/canvasTypes'
import type { WorkoutKind } from '@/lib/groupModel/types'

export interface InMemoryWorkoutCopyOptions {
  newId: string
  kind?: WorkoutKind
  name?: string
  sourceWorkoutId?: string | null
}

/**
 * Deep-clone a canvas workout with fresh group/slot/prescription UUIDs.
 * Copy-never-link: independent program_day instance in the working copy.
 */
export function cloneCanvasWorkoutInMemory(
  source: CanvasWorkout,
  options: InMemoryWorkoutCopyOptions,
): CanvasWorkout {
  const cloned = typeof structuredClone === 'function'
    ? structuredClone(source)
    : (JSON.parse(JSON.stringify(source)) as CanvasWorkout)
  cloned.id = options.newId
  cloned.kind = options.kind ?? source.kind
  cloned.name = options.name ?? source.name
  cloned.source_workout_id = options.sourceWorkoutId ?? source.id

  for (const group of cloned.groups) {
    group.id = newId()
    for (const slot of group.slots) {
      slot.id = newId()
      for (const rx of slot.prescriptions) {
        rx.id = newId()
        rx.slot_id = slot.id
      }
    }
  }

  return cloned
}

/** Deep-clone a single group with fresh slot/prescription UUIDs. */
export function cloneGroupInMemory(group: CanvasGroup): CanvasGroup {
  const cloned =
    typeof structuredClone === 'function'
      ? structuredClone(group)
      : (JSON.parse(JSON.stringify(group)) as CanvasGroup)
  cloned.id = newId()
  for (const slot of cloned.slots) {
    slot.id = newId()
    for (const rx of slot.prescriptions) {
      rx.id = newId()
      rx.slot_id = slot.id
    }
  }
  return cloned
}

/** Clone from working-copy workout record (already loaded). */
export function copyWorkoutInWorkingCopy(
  workouts: Record<string, CanvasWorkout>,
  sourceTemplateId: string,
  options: InMemoryWorkoutCopyOptions,
): CanvasWorkout {
  const source = workouts[sourceTemplateId]
  if (!source) {
    throw new Error(`Source workout ${sourceTemplateId} not in working copy`)
  }
  return cloneCanvasWorkoutInMemory(source, options)
}
