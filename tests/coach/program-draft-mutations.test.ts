import { describe, expect, test } from '@jest/globals'
import { createEmptyCanvasWorkout, createSoloGroup, createDefaultExercise } from '@/lib/groupModel/canvasTypes'
import { newId } from '@/lib/groupModel/newId'
import {
  buildDayFromScratch,
  copyDayToSlotInDraft,
  copyGroupToDayInDraft,
  duplicateGroupInDraft,
  duplicateWeekInDraft,
  moveDayInDraft,
  updateWorkoutInDraft,
} from '@/lib/programs/programDraftMutations'
import type { ProgramDraftState } from '@/types/programDraft'
import type { TrainingBlock } from '@/types/trainingBlock'

function emptyDraft(): ProgramDraftState {
  return {
    programId: 'prog-1',
    coachId: 'coach-1',
    program: {
      id: 'prog-1',
      name: 'Test',
      coach_id: 'coach-1',
      difficulty_level: 'intermediate',
      duration_weeks: 4,
      target_audience: 'general_fitness',
      is_active: true,
      type: 'fixed',
      created_at: '',
      updated_at: '',
    },
    categoryId: 'none',
    trainingBlocks: [
      {
        id: 'block-1',
        program_id: 'prog-1',
        name: 'Block 1',
        duration_weeks: 2,
        block_order: 1,
      } as TrainingBlock,
    ],
    schedule: [],
    workouts: {},
    structureDirty: false,
    dirtyWorkoutIds: [],
    pendingNewWorkoutIds: [],
    pendingNewBlockIds: [],
    pendingDeactivateWorkoutIds: [],
  }
}

describe('program draft mutations', () => {
  test('buildDayFromScratch adds workout + schedule without network', () => {
    const next = buildDayFromScratch(emptyDraft(), 1, 1, 'block-1')
    expect(next.structureDirty).toBe(true)
    expect(next.schedule).toHaveLength(1)
    expect(next.schedule[0].template_id).toBeTruthy()
    expect(next.pendingNewWorkoutIds).toHaveLength(1)
    expect(next.dirtyWorkoutIds).toHaveLength(1)
    const tid = next.schedule[0].template_id!
    expect(next.workouts[tid].kind).toBe('program_day')
  })

  test('updateWorkoutInDraft marks dirtyWorkoutIds only', () => {
    const tid = newId()
    const ex = createDefaultExercise('ex-1', { id: 'ex-1', name: 'Curl' }, 1)
    const draft = {
      ...emptyDraft(),
      workouts: {
        [tid]: createEmptyCanvasWorkout({ id: tid, kind: 'program_day', groups: [createSoloGroup(ex, 1)] }),
      },
    }
    const updated = updateWorkoutInDraft(draft, tid, {
      ...draft.workouts[tid],
      name: 'Changed',
    })
    expect(updated.dirtyWorkoutIds).toContain(tid)
    expect(updated.structureDirty).toBe(false)
  })

  test('duplicateWeekInDraft deep-copies workouts with new template ids', () => {
    const sourceTid = newId()
    const ex = createDefaultExercise('ex-1', { id: 'ex-1', name: 'Squat' }, 1)
    let draft: ProgramDraftState = {
      ...emptyDraft(),
      schedule: [
        {
          id: newId(),
          program_id: 'prog-1',
          program_day: 1,
          week_number: 1,
          template_id: sourceTid,
          training_block_id: 'block-1',
          created_at: '',
          updated_at: '',
        },
      ],
      workouts: {
        [sourceTid]: createEmptyCanvasWorkout({
          id: sourceTid,
          kind: 'program_day',
          groups: [createSoloGroup(ex, 1)],
        }),
      },
    }
    const block = draft.trainingBlocks[0]
    draft = duplicateWeekInDraft(draft, block, 1)
    const week2Slot = draft.schedule.find((s) => s.week_number === 2 && s.program_day === 1)
    expect(week2Slot?.template_id).toBeTruthy()
    expect(week2Slot?.template_id).not.toBe(sourceTid)
    expect(draft.pendingNewWorkoutIds).toContain(week2Slot!.template_id!)
    expect(draft.dirtyWorkoutIds).toContain(week2Slot!.template_id!)
  })

  test('copyDayToSlotInDraft deep-copies with independent template ids', () => {
    const sourceTid = newId()
    const ex = createDefaultExercise('ex-1', { id: 'ex-1', name: 'Bench' }, 1)
    let draft: ProgramDraftState = {
      ...emptyDraft(),
      schedule: [
        {
          id: newId(),
          program_id: 'prog-1',
          program_day: 1,
          week_number: 1,
          template_id: sourceTid,
          training_block_id: 'block-1',
          created_at: '',
          updated_at: '',
        },
      ],
      workouts: {
        [sourceTid]: createEmptyCanvasWorkout({
          id: sourceTid,
          kind: 'program_day',
          name: 'Monday',
          groups: [createSoloGroup(ex, 1)],
        }),
      },
    }
    draft = copyDayToSlotInDraft(draft, 1, 1, 1, 4, 'block-1')
    const thuSlot = draft.schedule.find((s) => s.week_number === 1 && s.program_day === 4)
    expect(thuSlot?.template_id).toBeTruthy()
    expect(thuSlot?.template_id).not.toBe(sourceTid)

    draft = updateWorkoutInDraft(draft, thuSlot!.template_id!, {
      ...draft.workouts[thuSlot!.template_id!],
      name: 'Thursday copy',
    })
    expect(draft.workouts[sourceTid].name).toBe('Monday')
  })

  test('moveDayInDraft reassigns slot without cloning workout', () => {
    const sourceTid = newId()
    let draft: ProgramDraftState = {
      ...emptyDraft(),
      schedule: [
        {
          id: newId(),
          program_id: 'prog-1',
          program_day: 1,
          week_number: 1,
          template_id: sourceTid,
          training_block_id: 'block-1',
          created_at: '',
          updated_at: '',
        },
      ],
      workouts: {
        [sourceTid]: createEmptyCanvasWorkout({ id: sourceTid, kind: 'program_day', name: 'Moved' }),
      },
    }
    draft = moveDayInDraft(draft, 1, 1, 1, 3, 'block-1')
    const mon = draft.schedule.find((s) => s.week_number === 1 && s.program_day === 1)
    const wed = draft.schedule.find((s) => s.week_number === 1 && s.program_day === 3)
    expect(mon).toBeUndefined()
    expect(wed?.template_id).toBe(sourceTid)
    expect(draft.workouts[sourceTid].name).toBe('Moved')
  })

  test('duplicateGroupInDraft and copyGroupToDayInDraft are independent', () => {
    const tid = newId()
    const targetTid = newId()
    const ex = createDefaultExercise('ex-1', { id: 'ex-1', name: 'Row' }, 1)
    const group = createSoloGroup(ex, 1)
    let draft: ProgramDraftState = {
      ...emptyDraft(),
      schedule: [
        {
          id: newId(),
          program_id: 'prog-1',
          program_day: 1,
          week_number: 1,
          template_id: tid,
          training_block_id: 'block-1',
          created_at: '',
          updated_at: '',
        },
        {
          id: newId(),
          program_id: 'prog-1',
          program_day: 2,
          week_number: 1,
          template_id: targetTid,
          training_block_id: 'block-1',
          created_at: '',
          updated_at: '',
        },
      ],
      workouts: {
        [tid]: createEmptyCanvasWorkout({ id: tid, kind: 'program_day', groups: [group] }),
        [targetTid]: createEmptyCanvasWorkout({ id: targetTid, kind: 'program_day', groups: [] }),
      },
    }
    const groupId = draft.workouts[tid].groups[0].id
    draft = duplicateGroupInDraft(draft, tid, groupId)
    expect(draft.workouts[tid].groups).toHaveLength(2)
    expect(draft.workouts[tid].groups[0].id).not.toBe(draft.workouts[tid].groups[1].id)

    draft = copyGroupToDayInDraft(draft, tid, groupId, targetTid)
    expect(draft.workouts[targetTid].groups).toHaveLength(1)
    expect(draft.workouts[targetTid].groups[0].id).not.toBe(groupId)

    draft = updateWorkoutInDraft(draft, targetTid, {
      ...draft.workouts[targetTid],
      name: 'Target changed',
    })
    expect(draft.workouts[tid].name).not.toBe('Target changed')
  })
})
