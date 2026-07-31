import { createEmptyCanvasWorkout } from '@/lib/groupModel/canvasTypes'
import { newId } from '@/lib/groupModel/newId'
import {
  computeBlockStartWeek,
  computeBlockWeekRanges,
} from '@/lib/programs/stationBlockWeeks'
import { blockSequentialLabel } from '@/lib/programs/periodizationStyles'
import { getScheduleSlot, programDayLabel } from '@/lib/programs/stationScheduleUtils'
import type { ProgramDraftState } from '@/types/programDraft'
import type { ProgramSchedule } from '@/lib/workoutTemplateService'
import type { TrainingBlock } from '@/types/trainingBlock'
import type { StationProgram } from '@/types/programStation'
import type { CanvasWorkout, CanvasGroup } from '@/lib/groupModel/canvasTypes'
import { cloneCanvasWorkoutInMemory, cloneGroupInMemory, copyWorkoutInWorkingCopy } from './inMemoryWorkoutCopy'
import {
  cloneProgramDraft,
  markStructureDirty,
  markWorkoutDirty,
  scheduleSlotKey,
} from './programDraftUtils'

function registerNewWorkout(draft: ProgramDraftState, workout: CanvasWorkout): ProgramDraftState {
  let next = {
    ...draft,
    workouts: { ...draft.workouts, [workout.id]: workout },
    pendingNewWorkoutIds: draft.pendingNewWorkoutIds.includes(workout.id)
      ? draft.pendingNewWorkoutIds
      : [...draft.pendingNewWorkoutIds, workout.id],
  }
  next = markWorkoutDirty(next, workout.id)
  return markStructureDirty(next)
}

function deactivateTemplateIfPresent(
  draft: ProgramDraftState,
  templateId: string | null | undefined,
): ProgramDraftState {
  if (!templateId) return draft
  if (draft.pendingNewWorkoutIds.includes(templateId)) {
    const { [templateId]: _removed, ...rest } = draft.workouts
    return {
      ...draft,
      workouts: rest,
      pendingNewWorkoutIds: draft.pendingNewWorkoutIds.filter((id) => id !== templateId),
      dirtyWorkoutIds: draft.dirtyWorkoutIds.filter((id) => id !== templateId),
    }
  }
  if (draft.pendingDeactivateWorkoutIds.includes(templateId)) return draft
  return {
    ...draft,
    pendingDeactivateWorkoutIds: [...draft.pendingDeactivateWorkoutIds, templateId],
  }
}

function upsertScheduleSlot(
  draft: ProgramDraftState,
  week: number,
  programDay: number,
  templateId: string,
  trainingBlockId: string | null,
  isOptional = false,
): ProgramDraftState {
  const idx = draft.schedule.findIndex(
    (s) => s.week_number === week && s.program_day === programDay,
  )
  const row: ProgramSchedule = {
    id: idx >= 0 ? draft.schedule[idx].id : newId(),
    program_id: draft.programId,
    program_day: programDay,
    week_number: week,
    template_id: templateId,
    training_block_id: trainingBlockId,
    is_optional: isOptional,
    created_at: idx >= 0 ? draft.schedule[idx].created_at : new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  const schedule =
    idx >= 0
      ? draft.schedule.map((s, i) => (i === idx ? row : s))
      : [...draft.schedule, row]
  return { ...draft, schedule }
}

function removeScheduleSlot(draft: ProgramDraftState, week: number, programDay: number): ProgramDraftState {
  return {
    ...draft,
    schedule: draft.schedule.filter(
      (s) => !(s.week_number === week && s.program_day === programDay),
    ),
  }
}

function deepCopyDayToSlot(
  draft: ProgramDraftState,
  sourceTemplateId: string,
  week: number,
  programDay: number,
  trainingBlockId: string | null,
  isOptional: boolean,
): ProgramDraftState {
  const newTemplateId = newId()
  const copied = copyWorkoutInWorkingCopy(draft.workouts, sourceTemplateId, {
    newId: newTemplateId,
    kind: 'program_day',
    sourceWorkoutId: sourceTemplateId,
  })
  let next = registerNewWorkout(draft, copied)
  const existing = getScheduleSlot(next.schedule, week, programDay)
  if (existing?.template_id) {
    next = deactivateTemplateIfPresent(next, existing.template_id)
  }
  next = upsertScheduleSlot(next, week, programDay, newTemplateId, trainingBlockId, isOptional)
  return next
}

export function copyDayToSlotInDraft(
  draft: ProgramDraftState,
  sourceWeek: number,
  sourceDay: number,
  targetWeek: number,
  targetDay: number,
  trainingBlockId: string | null,
): ProgramDraftState {
  const sourceSlot = getScheduleSlot(draft.schedule, sourceWeek, sourceDay)
  if (!sourceSlot?.template_id) return draft
  let next = cloneProgramDraft(draft)
  const targetSlot = getScheduleSlot(next.schedule, targetWeek, targetDay)
  if (targetSlot?.template_id) {
    next = deactivateTemplateIfPresent(next, targetSlot.template_id)
  }
  return deepCopyDayToSlot(
    next,
    sourceSlot.template_id,
    targetWeek,
    targetDay,
    sourceSlot.training_block_id ?? trainingBlockId,
    Boolean(sourceSlot.is_optional),
  )
}

export function moveDayInDraft(
  draft: ProgramDraftState,
  sourceWeek: number,
  sourceDay: number,
  targetWeek: number,
  targetDay: number,
  trainingBlockId: string | null,
): ProgramDraftState {
  const sourceSlot = getScheduleSlot(draft.schedule, sourceWeek, sourceDay)
  if (!sourceSlot?.template_id) return draft
  if (sourceWeek === targetWeek && sourceDay === targetDay) return draft

  let next = markStructureDirty(cloneProgramDraft(draft))
  const templateId = sourceSlot.template_id
  const blockId = sourceSlot.training_block_id ?? trainingBlockId
  const isOptional = Boolean(sourceSlot.is_optional)

  const targetSlot = getScheduleSlot(next.schedule, targetWeek, targetDay)
  if (targetSlot?.template_id && targetSlot.template_id !== templateId) {
    next = deactivateTemplateIfPresent(next, targetSlot.template_id)
  }

  next = removeScheduleSlot(next, sourceWeek, sourceDay)
  next = upsertScheduleSlot(next, targetWeek, targetDay, templateId, blockId, isOptional)
  return next
}

export function duplicateGroupInDraft(
  draft: ProgramDraftState,
  templateId: string,
  groupId: string,
): ProgramDraftState {
  const workout = draft.workouts[templateId]
  if (!workout) return draft
  const groupIndex = workout.groups.findIndex((g) => g.id === groupId)
  if (groupIndex < 0) return draft

  const clonedGroup = cloneGroupInMemory(workout.groups[groupIndex])
  const groups = [...workout.groups]
  groups.splice(groupIndex + 1, 0, clonedGroup)
  const reindexed = groups.map((g, i) => ({ ...g, set_order: i + 1 }))
  return updateWorkoutInDraft(draft, templateId, { ...workout, groups: reindexed })
}

export function copyGroupToDayInDraft(
  draft: ProgramDraftState,
  sourceTemplateId: string,
  groupId: string,
  targetTemplateId: string,
): ProgramDraftState {
  const sourceWorkout = draft.workouts[sourceTemplateId]
  const targetWorkout = draft.workouts[targetTemplateId]
  if (!sourceWorkout || !targetWorkout) return draft
  const group = sourceWorkout.groups.find((g) => g.id === groupId)
  if (!group) return draft

  const clonedGroup = cloneGroupInMemory(group)
  clonedGroup.set_order = targetWorkout.groups.length + 1
  const groups = [...targetWorkout.groups, clonedGroup]
  return updateWorkoutInDraft(draft, targetTemplateId, { ...targetWorkout, groups })
}

/** Fill tool: splice a cloned group at groupIndex (reindex set_order). */
export function insertClonedGroupAtIndexInDraft(
  draft: ProgramDraftState,
  targetTemplateId: string,
  clonedGroup: CanvasGroup,
  groupIndex: number,
): ProgramDraftState {
  const workout = draft.workouts[targetTemplateId]
  if (!workout) return draft
  const groups = [...workout.groups]
  const insertAt = Math.min(Math.max(0, groupIndex), groups.length)
  groups.splice(insertAt, 0, { ...clonedGroup, set_order: insertAt + 1 })
  const reindexed = groups.map((g, i) => ({ ...g, set_order: i + 1 }))
  return updateWorkoutInDraft(draft, targetTemplateId, { ...workout, groups: reindexed })
}

/** Fill tool: create a new program_day workout with one group at groupIndex. */
export function createDayWithGroupInDraft(
  draft: ProgramDraftState,
  week: number,
  programDay: number,
  group: CanvasGroup,
  groupIndex: number,
  trainingBlockId: string | null,
  isOptional = false,
): ProgramDraftState {
  const workoutId = newId()
  const clonedGroup = { ...group, set_order: groupIndex + 1 }
  const workout = createEmptyCanvasWorkout({
    id: workoutId,
    name: `${programDayLabel(programDay)} workout`,
    kind: 'program_day',
    groups: [clonedGroup],
  })
  let next = registerNewWorkout(draft, workout)
  next = upsertScheduleSlot(next, week, programDay, workoutId, trainingBlockId, isOptional)
  return next
}

/** Fill tool: deep-copy a source day into an empty target weekday slot. */
export function placeDayCopyInDraft(
  draft: ProgramDraftState,
  sourceWeek: number,
  sourceDay: number,
  targetWeek: number,
  targetDay: number,
  trainingBlockId: string | null,
): ProgramDraftState {
  return copyDayToSlotInDraft(draft, sourceWeek, sourceDay, targetWeek, targetDay, trainingBlockId)
}

export function updateProgramMeta(
  draft: ProgramDraftState,
  patch: Partial<StationProgram>,
): ProgramDraftState {
  return markStructureDirty({
    ...draft,
    program: { ...draft.program, ...patch },
  })
}

export function updateCategoryId(draft: ProgramDraftState, categoryId: string): ProgramDraftState {
  return markStructureDirty({ ...draft, categoryId })
}

export function updateWorkoutInDraft(
  draft: ProgramDraftState,
  templateId: string,
  workout: CanvasWorkout,
): ProgramDraftState {
  return markWorkoutDirty(
    {
      ...draft,
      workouts: { ...draft.workouts, [templateId]: workout },
    },
    templateId,
  )
}

export function buildDayFromScratch(
  draft: ProgramDraftState,
  absoluteWeek: number,
  programDay: number,
  activeBlockId: string | null,
): ProgramDraftState {
  const workoutId = newId()
  const workout = createEmptyCanvasWorkout({
    id: workoutId,
    name: `${programDayLabel(programDay)} workout`,
    kind: 'program_day',
  })
  let next = registerNewWorkout(draft, workout)
  next = upsertScheduleSlot(next, absoluteWeek, programDay, workoutId, activeBlockId, false)
  return next
}

export function insertLibraryWorkoutIntoDraft(
  draft: ProgramDraftState,
  libraryWorkout: CanvasWorkout,
  absoluteWeek: number,
  programDay: number,
  activeBlockId: string | null,
  replaceExisting: boolean,
): ProgramDraftState {
  let next = cloneProgramDraft(draft)
  if (replaceExisting) {
    const existing = getScheduleSlot(next.schedule, absoluteWeek, programDay)
    if (existing?.template_id) {
      next = deactivateTemplateIfPresent(next, existing.template_id)
      next = removeScheduleSlot(next, absoluteWeek, programDay)
    }
  }
  const newTemplateId = newId()
  const copied = cloneCanvasWorkoutInMemory(libraryWorkout, {
    newId: newTemplateId,
    kind: 'program_day',
    name: libraryWorkout.name,
    sourceWorkoutId: libraryWorkout.id,
  })
  next = registerNewWorkout(next, copied)
  next = upsertScheduleSlot(next, absoluteWeek, programDay, newTemplateId, activeBlockId, false)
  return next
}

export function clearDayInDraft(
  draft: ProgramDraftState,
  absoluteWeek: number,
  programDay: number,
): ProgramDraftState {
  const existing = getScheduleSlot(draft.schedule, absoluteWeek, programDay)
  let next = markStructureDirty(cloneProgramDraft(draft))
  if (existing?.template_id) {
    next = deactivateTemplateIfPresent(next, existing.template_id)
  }
  next = removeScheduleSlot(next, absoluteWeek, programDay)
  return next
}

export function addTrainingBlockToDraft(
  draft: ProgramDraftState,
  payload: {
    name: string
    duration_weeks: number
    phase_label?: string | null
    notes?: string | null
  },
): { state: ProgramDraftState; newBlockId: string } {
  const blockId = newId()
  const blockOrder = draft.trainingBlocks.length + 1
  const block: TrainingBlock = {
    id: blockId,
    program_id: draft.programId,
    name: payload.name,
    duration_weeks: payload.duration_weeks,
    block_order: blockOrder,
    phase_label: payload.phase_label ?? null,
    notes: payload.notes ?? null,
  }
  const totalWeeks = draft.trainingBlocks.reduce((s, b) => s + b.duration_weeks, 0) + payload.duration_weeks
  return {
    state: markStructureDirty({
      ...draft,
      trainingBlocks: [...draft.trainingBlocks, block],
      pendingNewBlockIds: [...draft.pendingNewBlockIds, blockId],
      program: { ...draft.program, duration_weeks: totalWeeks },
    }),
    newBlockId: blockId,
  }
}

export function updateTrainingBlockInDraft(
  draft: ProgramDraftState,
  blockId: string,
  updates: Partial<Omit<TrainingBlock, 'id' | 'program_id'>>,
): ProgramDraftState {
  const blocks = draft.trainingBlocks.map((b) =>
    b.id === blockId ? { ...b, ...updates } : b,
  )
  let program = draft.program
  if (typeof updates.duration_weeks === 'number') {
    const totalWeeks = blocks.reduce((s, b) => s + b.duration_weeks, 0)
    program = { ...program, duration_weeks: totalWeeks }
  }
  return markStructureDirty({ ...draft, trainingBlocks: blocks, program })
}

export function deleteTrainingBlockFromDraft(
  draft: ProgramDraftState,
  blockId: string,
): ProgramDraftState {
  const ranges = computeBlockWeekRanges(draft.trainingBlocks)
  const range = ranges.find((r) => r.blockId === blockId)
  let next = markStructureDirty(cloneProgramDraft(draft))
  if (range) {
    for (let week = range.startWeek; week <= range.endWeek; week++) {
      for (let day = 1; day <= 7; day++) {
        const slot = getScheduleSlot(next.schedule, week, day)
        if (slot?.template_id) {
          next = deactivateTemplateIfPresent(next, slot.template_id)
        }
        next = removeScheduleSlot(next, week, day)
      }
    }
  }
  const blocks = next.trainingBlocks.filter((b) => b.id !== blockId)
  const reordered = blocks.map((b, i) => ({ ...b, block_order: i + 1 }))
  return {
    ...next,
    trainingBlocks: reordered,
    pendingNewBlockIds: next.pendingNewBlockIds.filter((id) => id !== blockId),
    program: {
      ...next.program,
      duration_weeks: reordered.reduce((s, b) => s + b.duration_weeks, 0),
    },
  }
}

export function reorderBlocksInDraft(
  draft: ProgramDraftState,
  orderedBlockIds: string[],
): ProgramDraftState {
  const byId = new Map(draft.trainingBlocks.map((b) => [b.id, b]))
  const reordered = orderedBlockIds
    .map((id, i) => {
      const b = byId.get(id)
      return b ? { ...b, block_order: i + 1 } : null
    })
    .filter(Boolean) as TrainingBlock[]
  return markStructureDirty({ ...draft, trainingBlocks: reordered })
}

export function duplicateTrainingBlockInDraft(
  draft: ProgramDraftState,
  sourceBlock: TrainingBlock,
): ProgramDraftState {
  const newBlockId = newId()
  const newBlockOrder = draft.trainingBlocks.length + 1
  const newBlock: TrainingBlock = {
    ...sourceBlock,
    id: newBlockId,
    name: `${sourceBlock.name} (copy)`,
    block_order: newBlockOrder,
    phase_label:
      draft.program.periodization_style === 'block'
        ? blockSequentialLabel(newBlockOrder)
        : sourceBlock.phase_label ?? null,
  }
  let next = markStructureDirty(cloneProgramDraft(draft))
  next = {
    ...next,
    trainingBlocks: [...next.trainingBlocks, newBlock],
    pendingNewBlockIds: [...next.pendingNewBlockIds, newBlockId],
    program: {
      ...next.program,
      duration_weeks: next.program.duration_weeks + sourceBlock.duration_weeks,
    },
  }

  const ranges = computeBlockWeekRanges(draft.trainingBlocks)
  const sourceRange = ranges.find((r) => r.blockId === sourceBlock.id)
  const newRange = {
    startWeek: (ranges[ranges.length - 1]?.endWeek ?? 0) + 1,
    endWeek: (ranges[ranges.length - 1]?.endWeek ?? 0) + sourceBlock.duration_weeks,
  }
  if (!sourceRange) return next

  for (let relWeek = 0; relWeek < sourceBlock.duration_weeks; relWeek++) {
    const sourceWeek = sourceRange.startWeek + relWeek
    const targetWeek = newRange.startWeek + relWeek
    for (let day = 1; day <= 7; day++) {
      const sourceSlot = getScheduleSlot(next.schedule, sourceWeek, day)
      if (!sourceSlot?.template_id) continue
      next = deepCopyDayToSlot(
        next,
        sourceSlot.template_id,
        targetWeek,
        day,
        newBlockId,
        Boolean(sourceSlot.is_optional),
      )
    }
  }
  return next
}

export function duplicateWeekInDraft(
  draft: ProgramDraftState,
  activeBlock: TrainingBlock,
  sourceAbsoluteWeek: number,
): ProgramDraftState {
  const blockStart = computeBlockStartWeek(draft.trainingBlocks, activeBlock.id)
  const blockEnd = blockStart + activeBlock.duration_weeks - 1
  let next = markStructureDirty(cloneProgramDraft(draft))

  for (let week = blockStart; week <= blockEnd; week++) {
    if (week === sourceAbsoluteWeek) continue
    for (let day = 1; day <= 7; day++) {
      const sourceSlot = getScheduleSlot(next.schedule, sourceAbsoluteWeek, day)
      if (!sourceSlot?.template_id) {
        const existing = getScheduleSlot(next.schedule, week, day)
        if (existing?.template_id) {
          next = deactivateTemplateIfPresent(next, existing.template_id)
          next = removeScheduleSlot(next, week, day)
        }
        continue
      }
      next = deepCopyDayToSlot(
        next,
        sourceSlot.template_id,
        week,
        day,
        activeBlock.id,
        Boolean(sourceSlot.is_optional),
      )
    }
  }
  return next
}

export function addWeekToBlockInDraft(
  draft: ProgramDraftState,
  blockId: string,
): ProgramDraftState {
  const block = draft.trainingBlocks.find((b) => b.id === blockId)
  if (!block) return draft
  return updateTrainingBlockInDraft(draft, blockId, {
    duration_weeks: block.duration_weeks + 1,
  })
}

export function scheduleSlotsInBaselineNotInWorking(
  baseline: ProgramDraftState,
  working: ProgramDraftState,
): ProgramSchedule[] {
  const workingKeys = new Set(
    working.schedule.map((s) => scheduleSlotKey(s.week_number, s.program_day)),
  )
  return baseline.schedule.filter(
    (s) => !workingKeys.has(scheduleSlotKey(s.week_number, s.program_day)),
  )
}

export function scheduleSlotsChangedOrNew(
  baseline: ProgramDraftState,
  working: ProgramDraftState,
): ProgramSchedule[] {
  const baseMap = new Map(
    baseline.schedule.map((s) => [scheduleSlotKey(s.week_number, s.program_day), s]),
  )
  return working.schedule.filter((slot) => {
    const key = scheduleSlotKey(slot.week_number, slot.program_day)
    const base = baseMap.get(key)
    if (!base) return true
    return (
      base.template_id !== slot.template_id ||
      Boolean(base.is_optional) !== Boolean(slot.is_optional) ||
      (base.training_block_id ?? null) !== (slot.training_block_id ?? null)
    )
  })
}

export function blocksRemovedSinceBaseline(
  baseline: ProgramDraftState,
  working: ProgramDraftState,
): TrainingBlock[] {
  const workingIds = new Set(working.trainingBlocks.map((b) => b.id))
  return baseline.trainingBlocks.filter((b) => !workingIds.has(b.id))
}

export function blocksNewSinceBaseline(
  baseline: ProgramDraftState,
  working: ProgramDraftState,
): TrainingBlock[] {
  const baseIds = new Set(baseline.trainingBlocks.map((b) => b.id))
  return working.trainingBlocks.filter((b) => !baseIds.has(b.id))
}

export function blocksUpdatedSinceBaseline(
  baseline: ProgramDraftState,
  working: ProgramDraftState,
): TrainingBlock[] {
  const baseMap = new Map(baseline.trainingBlocks.map((b) => [b.id, b]))
  return working.trainingBlocks.filter((b) => {
    const old = baseMap.get(b.id)
    if (!old) return false
    return (
      old.name !== b.name ||
      old.duration_weeks !== b.duration_weeks ||
      old.block_order !== b.block_order ||
      old.phase_label !== b.phase_label ||
      old.notes !== b.notes
    )
  })
}
