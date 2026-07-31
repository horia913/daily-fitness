import type { ProgramDraftState } from '@/types/programDraft'
import type { CanvasWorkout } from '@/lib/groupModel/canvasTypes'
import type { ProgramSchedule } from '@/lib/workoutTemplateService'
import type { StationProgram } from '@/types/programStation'
import type { TrainingBlock } from '@/types/trainingBlock'

export function cloneProgramDraft(state: ProgramDraftState): ProgramDraftState {
  return {
    ...state,
    program: { ...state.program },
    trainingBlocks: state.trainingBlocks.map((b) => ({ ...b })),
    schedule: state.schedule.map((s) => ({ ...s })),
    workouts: Object.fromEntries(
      Object.entries(state.workouts).map(([id, w]) => [id, cloneCanvasWorkout(w)]),
    ),
    dirtyWorkoutIds: [...state.dirtyWorkoutIds],
    pendingNewWorkoutIds: [...state.pendingNewWorkoutIds],
    pendingNewBlockIds: [...state.pendingNewBlockIds],
    pendingDeactivateWorkoutIds: [...state.pendingDeactivateWorkoutIds],
  }
}

export function cloneCanvasWorkout(workout: CanvasWorkout): CanvasWorkout {
  if (typeof structuredClone === 'function') {
    return structuredClone(workout)
  }
  return JSON.parse(JSON.stringify(workout)) as CanvasWorkout
}

export function scheduleSlotKey(week: number, programDay: number): string {
  return `${week}:${programDay}`
}

export function hasUnsavedChanges(draft: ProgramDraftState): boolean {
  return draft.structureDirty || draft.dirtyWorkoutIds.length > 0
}

export function markWorkoutDirty(draft: ProgramDraftState, templateId: string): ProgramDraftState {
  if (draft.dirtyWorkoutIds.includes(templateId)) return draft
  return {
    ...draft,
    dirtyWorkoutIds: [...draft.dirtyWorkoutIds, templateId],
  }
}

export function markStructureDirty(draft: ProgramDraftState): ProgramDraftState {
  if (draft.structureDirty) return draft
  return { ...draft, structureDirty: true }
}

export function clearDirtyFlags(draft: ProgramDraftState): ProgramDraftState {
  return {
    ...draft,
    structureDirty: false,
    dirtyWorkoutIds: [],
    pendingNewWorkoutIds: [],
    pendingNewBlockIds: [],
    pendingDeactivateWorkoutIds: [],
  }
}

export function programMetaChanged(a: StationProgram, b: StationProgram): boolean {
  return (
    a.name !== b.name ||
    a.description !== b.description ||
    a.difficulty_level !== b.difficulty_level ||
    a.target_audience !== b.target_audience ||
    a.is_active !== b.is_active ||
    a.type !== b.type ||
    a.periodization_style !== b.periodization_style
  )
}

export function blocksChanged(a: TrainingBlock[], b: TrainingBlock[]): boolean {
  if (a.length !== b.length) return true
  const byId = new Map(b.map((x) => [x.id, x]))
  for (const block of a) {
    const other = byId.get(block.id)
    if (!other) return true
    if (
      block.name !== other.name ||
      block.duration_weeks !== other.duration_weeks ||
      block.block_order !== other.block_order ||
      block.phase_label !== other.phase_label ||
      block.notes !== other.notes
    ) {
      return true
    }
  }
  return false
}

export function scheduleChanged(a: ProgramSchedule[], b: ProgramSchedule[]): boolean {
  const mapA = new Map(a.map((s) => [scheduleSlotKey(s.week_number, s.program_day), s]))
  const mapB = new Map(b.map((s) => [scheduleSlotKey(s.week_number, s.program_day), s]))
  if (mapA.size !== mapB.size) return true
  for (const [key, slotA] of mapA) {
    const slotB = mapB.get(key)
    if (!slotB) return true
    if (
      slotA.template_id !== slotB.template_id ||
      Boolean(slotA.is_optional) !== Boolean(slotB.is_optional) ||
      (slotA.training_block_id ?? null) !== (slotB.training_block_id ?? null)
    ) {
      return true
    }
  }
  return false
}

export function sortedDirtyWorkoutIds(ids: string[]): string[] {
  return [...ids].sort()
}
