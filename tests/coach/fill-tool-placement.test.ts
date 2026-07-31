import { describe, expect, test } from '@jest/globals'
import {
  createDefaultExercise,
  createEmptyCanvasWorkout,
  createSoloGroup,
} from '@/lib/groupModel/canvasTypes'
import { newId } from '@/lib/groupModel/newId'
import { applyFillStamp } from '@/lib/programs/fillTool/apply'
import { buildFillPreview } from '@/lib/programs/fillTool/preview'
import type { FillStampConfig } from '@/lib/programs/fillTool/types'
import type { ProgramDraftState } from '@/types/programDraft'
import type { TrainingBlock } from '@/types/trainingBlock'
import type { CanvasExercise } from '@/lib/groupModel/canvasTypes'

function makeSquatSlot(loadPct: number): CanvasExercise {
  const ex = createDefaultExercise('ex-squat', { id: 'ex-squat', name: 'Squat' }, 1)
  ex.id = newId()
  ex.enabledProperties = ['load']
  ex.prescriptions = ex.prescriptions.map((row, index) => ({
    ...row,
    load_percentage: loadPct + index * 2.5,
    weight_kg: null,
  }))
  return ex
}

function baseDraft(): ProgramDraftState {
  return {
    programId: 'prog-1',
    coachId: 'coach-1',
    program: {
      id: 'prog-1',
      name: 'Test',
      coach_id: 'coach-1',
      difficulty_level: 'intermediate',
      duration_weeks: 8,
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
        duration_weeks: 8,
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

function addDay(
  draft: ProgramDraftState,
  week: number,
  programDay: number,
  slot: CanvasExercise,
): ProgramDraftState {
  const templateId = newId()
  return {
    ...draft,
    schedule: [
      ...draft.schedule,
      {
        id: newId(),
        program_id: 'prog-1',
        program_day: programDay,
        week_number: week,
        template_id: templateId,
        training_block_id: 'block-1',
        created_at: '',
        updated_at: '',
      },
    ],
    workouts: {
      ...draft.workouts,
      [templateId]: createEmptyCanvasWorkout({
        id: templateId,
        kind: 'program_day',
        name: 'Monday',
        groups: [createSoloGroup(slot, 1)],
      }),
    },
  }
}

describe('fill tool v3 placement', () => {
  test('fills empty weeks with day hold', () => {
    let draft = baseDraft()
    draft = addDay(draft, 1, 1, makeSquatSlot(70))

    const config: FillStampConfig = {
      sourceAbsoluteWeek: 1,
      sourceProgramDay: 1,
      scope: 'day',
      scopeMatchKeys: [],
      property: null,
      pattern: 'hold',
      patternInputs: {},
      endAbsoluteWeek: 4,
      activeBlockId: 'block-1',
    }

    const preview = buildFillPreview(draft, config)
    expect(preview).not.toBeNull()
    expect(preview!.summary.willWrite).toBe(3)
    expect(preview!.summary.skippedDifferent).toBe(0)

    const result = applyFillStamp(draft, preview!)
    expect(result.draft.schedule.filter((s) => s.week_number === 2 && s.program_day === 1)).toHaveLength(1)
    expect(result.draft.schedule.filter((s) => s.week_number === 4 && s.program_day === 1)).toHaveLength(1)
  })

  test('linear day fill ramps squat loads in placed copies', () => {
    let draft = baseDraft()
    draft = addDay(draft, 1, 1, makeSquatSlot(70))

    const config: FillStampConfig = {
      sourceAbsoluteWeek: 1,
      sourceProgramDay: 1,
      scope: 'day',
      scopeMatchKeys: [],
      property: 'load_pct',
      pattern: 'linear',
      patternInputs: { step: 2.5 },
      endAbsoluteWeek: 3,
      activeBlockId: 'block-1',
    }

    const result = applyFillStamp(draft, buildFillPreview(draft, config)!)
    const week2Id = result.draft.schedule.find((s) => s.week_number === 2 && s.program_day === 1)!
      .template_id!
    const week3Id = result.draft.schedule.find((s) => s.week_number === 3 && s.program_day === 1)!
      .template_id!

    expect(result.draft.workouts[week2Id].groups[0].slots[0].prescriptions.map((r) => r.load_percentage)).toEqual([
      72.5, 75, 77.5,
    ])
    expect(result.draft.workouts[week3Id].groups[0].slots[0].prescriptions.map((r) => r.load_percentage)).toEqual([
      75, 77.5, 80,
    ])
  })

  test('re-ramp overwrites same exercise instead of skipping', () => {
    let draft = baseDraft()
    draft = addDay(draft, 1, 1, makeSquatSlot(70))
    draft = addDay(draft, 2, 1, makeSquatSlot(72.5))

    const config: FillStampConfig = {
      sourceAbsoluteWeek: 1,
      sourceProgramDay: 1,
      scope: 'day',
      scopeMatchKeys: [],
      property: 'load_pct',
      pattern: 'linear',
      patternInputs: { step: 5 },
      endAbsoluteWeek: 2,
      activeBlockId: 'block-1',
    }

    const preview = buildFillPreview(draft, config)!
    expect(preview.summary.skippedDifferent).toBe(0)
    expect(preview.rows[0].cells[1].status).toBe('write')

    const result = applyFillStamp(draft, preview)
    const week2Load = result.draft.workouts[
      result.draft.schedule.find((s) => s.week_number === 2)!.template_id!
    ].groups[0].slots[0].prescriptions[0].load_percentage
    expect(week2Load).toBe(75)
  })

  test('re-ramp from source week 4 overwrites prior progression on weeks 5-8', () => {
    let draft = baseDraft()
    draft = addDay(draft, 4, 1, makeSquatSlot(70))
    for (const week of [5, 6, 7, 8]) {
      draft = addDay(draft, week, 1, makeSquatSlot(70 + (week - 4) * 2.5))
    }

    const config: FillStampConfig = {
      sourceAbsoluteWeek: 4,
      sourceProgramDay: 1,
      scope: 'day',
      scopeMatchKeys: [],
      property: 'load_pct',
      pattern: 'linear',
      patternInputs: { step: 5 },
      endAbsoluteWeek: 8,
      activeBlockId: 'block-1',
    }

    const preview = buildFillPreview(draft, config)!
    expect(preview.summary.willWrite).toBe(4)
    expect(preview.summary.skippedDifferent).toBe(0)

    const result = applyFillStamp(draft, preview)
    const week8Load = result.draft.workouts[
      result.draft.schedule.find((s) => s.week_number === 8)!.template_id!
    ].groups[0].slots[0].prescriptions[0].load_percentage
    expect(week8Load).toBe(90)
  })

  test('end week bounds ramp range; weeks after end untouched', () => {
    let draft = baseDraft()
    draft = addDay(draft, 1, 1, makeSquatSlot(70))

    const config: FillStampConfig = {
      sourceAbsoluteWeek: 1,
      sourceProgramDay: 1,
      scope: 'day',
      scopeMatchKeys: [],
      property: 'load_pct',
      pattern: 'linear',
      patternInputs: { step: 2.5 },
      endAbsoluteWeek: 5,
      activeBlockId: 'block-1',
    }

    const preview = buildFillPreview(draft, config)!
    expect(preview!.absoluteWeeks).toEqual([1, 2, 3, 4, 5])
    expect(preview!.summary.willWrite).toBe(4)

    const result = applyFillStamp(draft, preview!)
    expect(result.draft.schedule.filter((s) => s.week_number === 5 && s.program_day === 1)).toHaveLength(1)
    expect(result.draft.schedule.filter((s) => s.week_number === 6 && s.program_day === 1)).toHaveLength(0)
  })

  test('skips only different exercise at scoped slot', () => {
    const bench = createDefaultExercise('ex-bench', { id: 'ex-bench', name: 'Bench' }, 1)
    bench.id = newId()
    bench.prescriptions = bench.prescriptions.map((row) => ({
      ...row,
      reps: '8',
      load_percentage: 60,
    }))

    let draft = baseDraft()
    draft = addDay(draft, 1, 1, makeSquatSlot(70))
    draft = addDay(draft, 2, 1, bench)

    const config: FillStampConfig = {
      sourceAbsoluteWeek: 1,
      sourceProgramDay: 1,
      scope: 'day',
      scopeMatchKeys: [],
      property: null,
      pattern: 'hold',
      patternInputs: {},
      endAbsoluteWeek: 2,
      activeBlockId: 'block-1',
    }

    const preview = buildFillPreview(draft, config)!
    expect(preview.summary.skippedDifferent).toBe(1)
    expect(preview.rows[0].cells[1].status).toBe('skip_different')

    const week2Before = draft.workouts[
      draft.schedule.find((s) => s.week_number === 2)!.template_id!
    ].groups[0].slots[0].prescriptions[0].load_percentage

    const result = applyFillStamp(draft, preview)
    const week2After = result.draft.workouts[
      result.draft.schedule.find((s) => s.week_number === 2)!.template_id!
    ].groups[0].slots[0].prescriptions[0].load_percentage
    expect(week2After).toBe(week2Before)
  })

  test('exercise stamp places into empty slot and re-ramps same exercise', () => {
    const bench = createDefaultExercise('ex-bench', { id: 'ex-bench', name: 'Bench' }, 1)
    bench.id = newId()
    bench.prescriptions = bench.prescriptions.map((row) => ({
      ...row,
      reps: '8',
      load_percentage: 60,
    }))

    let draft = baseDraft()
    draft = addDay(draft, 1, 1, makeSquatSlot(70))
    draft = addDay(draft, 3, 1, bench)
    draft = addDay(draft, 4, 1, makeSquatSlot(72.5))

    const config: FillStampConfig = {
      sourceAbsoluteWeek: 1,
      sourceProgramDay: 1,
      scope: 'exercise',
      scopeMatchKeys: [{ groupIndex: 0, exerciseOrder: 1, exerciseId: 'ex-squat' }],
      property: 'load_pct',
      pattern: 'linear',
      patternInputs: { step: 2.5 },
      endAbsoluteWeek: 4,
      activeBlockId: 'block-1',
    }

    const preview = buildFillPreview(draft, config)!
    expect(preview.summary.skippedDifferent).toBe(1)
    expect(preview.summary.willWrite).toBe(2)

    const result = applyFillStamp(draft, preview)
    const week2Load = result.draft.workouts[
      result.draft.schedule.find((s) => s.week_number === 2)!.template_id!
    ].groups[0].slots[0].prescriptions[0].load_percentage
    expect(week2Load).toBe(72.5)

    const week4Load = result.draft.workouts[
      result.draft.schedule.find((s) => s.week_number === 4)!.template_id!
    ].groups[0].slots[0].prescriptions[0].load_percentage
    expect(week4Load).toBe(77.5)

    const week3Id = result.draft.schedule.find((s) => s.week_number === 3 && s.program_day === 1)!
      .template_id!
    const week3Workout = result.draft.workouts[week3Id]
    expect(week3Workout.groups.some((g) => g.slots.some((s) => s.exercise_id === 'ex-squat'))).toBe(false)
    expect(week3Workout.groups.some((g) => g.slots.some((s) => s.exercise_id === 'ex-bench'))).toBe(true)
  })
})

describe('fill tool v3 independence', () => {
  function snapshotLoad(draft: ProgramDraftState, week: number): number | null | undefined {
    const tid = draft.schedule.find((s) => s.week_number === week && s.program_day === 1)?.template_id
    if (!tid) return undefined
    return draft.workouts[tid]?.groups[0]?.slots[0]?.prescriptions[0]?.load_percentage
  }

  test('day scope: mutating a placed copy does not change source or other weeks', () => {
    let draft = baseDraft()
    draft = addDay(draft, 1, 1, makeSquatSlot(70))

    const config: FillStampConfig = {
      sourceAbsoluteWeek: 1,
      sourceProgramDay: 1,
      scope: 'day',
      scopeMatchKeys: [],
      property: 'load_pct',
      pattern: 'linear',
      patternInputs: { step: 2.5 },
      endAbsoluteWeek: 3,
      activeBlockId: 'block-1',
    }

    const sourceBefore = snapshotLoad(draft, 1)
    const result = applyFillStamp(draft, buildFillPreview(draft, config)!)
    const week2Id = result.draft.schedule.find((s) => s.week_number === 2)!.template_id!
    const week3Id = result.draft.schedule.find((s) => s.week_number === 3)!.template_id!
    result.draft.workouts[week2Id].groups[0].slots[0].prescriptions[0].load_percentage = 999

    expect(snapshotLoad(result.draft, 1)).toBe(sourceBefore)
    expect(snapshotLoad(result.draft, 3)).toBe(75)
    expect(snapshotLoad(result.draft, 2)).toBe(999)
  })

  test('exercise scope: mutating filled copy is independent', () => {
    let draft = baseDraft()
    draft = addDay(draft, 1, 1, makeSquatSlot(70))

    const config: FillStampConfig = {
      sourceAbsoluteWeek: 1,
      sourceProgramDay: 1,
      scope: 'exercise',
      scopeMatchKeys: [{ groupIndex: 0, exerciseOrder: 1, exerciseId: 'ex-squat' }],
      property: null,
      pattern: 'hold',
      patternInputs: {},
      endAbsoluteWeek: 3,
      activeBlockId: 'block-1',
    }

    const sourceBefore = snapshotLoad(draft, 1)
    const result = applyFillStamp(draft, buildFillPreview(draft, config)!)
    const week2Id = result.draft.schedule.find((s) => s.week_number === 2)!.template_id!
    result.draft.workouts[week2Id].groups[0].slots[0].prescriptions[0].load_percentage = 999

    expect(snapshotLoad(result.draft, 1)).toBe(sourceBefore)
    expect(snapshotLoad(result.draft, 2)).toBe(999)
  })
})
