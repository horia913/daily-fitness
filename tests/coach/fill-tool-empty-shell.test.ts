import { describe, expect, test } from '@jest/globals'
import {
  createDefaultExercise,
  createEmptyCanvasWorkout,
  createSoloGroup,
} from '@/lib/groupModel/canvasTypes'
import { newId } from '@/lib/groupModel/newId'
import { applyFillStamp } from '@/lib/programs/fillTool/apply'
import {
  FILL_SOURCE_EMPTY_MESSAGE,
  isEmptyShellWorkout,
} from '@/lib/programs/fillTool/matching'
import { buildFillPreview } from '@/lib/programs/fillTool/preview'
import { resolveDayTargetAction } from '@/lib/programs/fillTool/slotDecision'
import type { FillStampConfig } from '@/lib/programs/fillTool/types'
import type { ProgramDraftState } from '@/types/programDraft'
import type { TrainingBlock } from '@/types/trainingBlock'
import type { CanvasExercise, CanvasGroup } from '@/lib/groupModel/canvasTypes'

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
  groups: CanvasGroup[],
): { draft: ProgramDraftState; templateId: string } {
  const templateId = newId()
  return {
    templateId,
    draft: {
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
          name: `W${week} D${programDay}`,
          groups,
        }),
      },
    },
  }
}

function dayConfig(overrides: Partial<FillStampConfig> = {}): FillStampConfig {
  return {
    sourceAbsoluteWeek: 1,
    sourceProgramDay: 1,
    scope: 'day',
    scopeMatchKeys: [],
    property: 'load_pct',
    pattern: 'linear',
    patternInputs: { step: 2.5 },
    endAbsoluteWeek: 2,
    activeBlockId: 'block-1',
    ...overrides,
  }
}

describe('fill tool empty-shell handling', () => {
  test('empty-shell target, day scope: places + ramps instead of skipping', () => {
    let draft = baseDraft()
    const w1 = addDay(draft, 1, 1, [createSoloGroup(makeSquatSlot(70), 1)])
    draft = w1.draft
    const w2Shell = addDay(draft, 2, 1, [])
    draft = w2Shell.draft

    expect(isEmptyShellWorkout(draft.workouts[w2Shell.templateId])).toBe(true)

    const sourceWorkout = draft.workouts[w1.templateId]
    expect(resolveDayTargetAction(draft, 2, 1, sourceWorkout)).toBe('place')

    const config = dayConfig()
    const preview = buildFillPreview(draft, config)!
    expect(preview.summary.skippedDifferent).toBe(0)
    expect(preview.rows[0].cells[1].status).toBe('write')
    expect(preview.rows[0].cells[1].display).not.toBe('Different exercise')

    const shellIdBefore = w2Shell.templateId
    const result = applyFillStamp(draft, preview)
    const week2Slot = result.draft.schedule.find((s) => s.week_number === 2 && s.program_day === 1)!
    expect(week2Slot.template_id).toBeTruthy()
    expect(week2Slot.template_id).not.toBe(shellIdBefore)

    const week2Load = result.draft.workouts[week2Slot.template_id!].groups[0].slots[0]
      .prescriptions[0].load_percentage
    expect(week2Load).toBe(72.5)
    expect(result.draft.workouts[week2Slot.template_id!].groups).toHaveLength(1)
  })

  test('empty-shell target, week scope: fills Monday shell; Tue/Wed still write (not skipped)', () => {
    let draft = baseDraft()
    draft = addDay(draft, 1, 1, [createSoloGroup(makeSquatSlot(70), 1)]).draft
    draft = addDay(draft, 1, 2, [createSoloGroup(makeSquatSlot(65), 1)]).draft
    draft = addDay(draft, 1, 3, [createSoloGroup(makeSquatSlot(60), 1)]).draft

    const w2MonShell = addDay(draft, 2, 1, [])
    draft = w2MonShell.draft
    const w2Tue = addDay(draft, 2, 2, [createSoloGroup(makeSquatSlot(80), 1)])
    draft = w2Tue.draft
    const w2Wed = addDay(draft, 2, 3, [createSoloGroup(makeSquatSlot(85), 1)])
    draft = w2Wed.draft

    const config: FillStampConfig = {
      sourceAbsoluteWeek: 1,
      sourceProgramDay: 1,
      scope: 'week',
      scopeMatchKeys: [],
      property: 'load_pct',
      pattern: 'linear',
      patternInputs: { step: 2.5 },
      endAbsoluteWeek: 2,
      activeBlockId: 'block-1',
    }

    const preview = buildFillPreview(draft, config)!
    expect(preview.summary.skippedDifferent).toBe(0)

    const monRow = preview.rows.find((r) => r.programDay === 1)!
    const tueRow = preview.rows.find((r) => r.programDay === 2)!
    const wedRow = preview.rows.find((r) => r.programDay === 3)!
    expect(monRow.cells[1].status).toBe('write')
    expect(monRow.cells[1].display).not.toBe('Different exercise')
    expect(tueRow.cells[1].status).toBe('write')
    expect(wedRow.cells[1].status).toBe('write')

    const result = applyFillStamp(draft, preview)
    const monTid = result.draft.schedule.find((s) => s.week_number === 2 && s.program_day === 1)!
      .template_id!
    expect(result.draft.workouts[monTid].groups[0].slots[0].prescriptions[0].load_percentage).toBe(
      72.5,
    )
    expect(monTid).not.toBe(w2MonShell.templateId)

    const tueTid = result.draft.schedule.find((s) => s.week_number === 2 && s.program_day === 2)!
      .template_id!
    const wedTid = result.draft.schedule.find((s) => s.week_number === 2 && s.program_day === 3)!
      .template_id!
    expect(result.draft.workouts[tueTid].groups[0].slots[0].prescriptions[0].load_percentage).toBe(
      67.5,
    )
    expect(result.draft.workouts[wedTid].groups[0].slots[0].prescriptions[0].load_percentage).toBe(
      62.5,
    )
  })

  test('empty source day: preview surfaces message and apply writes nothing', () => {
    let draft = baseDraft()
    const shell = addDay(draft, 1, 1, [])
    draft = shell.draft

    const config = dayConfig({ pattern: 'hold', property: null })
    const preview = buildFillPreview(draft, config)!
    expect(preview.summary.sourceEmpty).toBe(true)
    expect(preview.summary.sourceEmptyMessage).toBe(FILL_SOURCE_EMPTY_MESSAGE)
    expect(preview.summary.willWrite).toBe(0)

    const result = applyFillStamp(draft, preview)
    expect(result.writtenCount).toBe(0)
    expect(result.draft.schedule.filter((s) => s.week_number === 2)).toHaveLength(0)
  })

  test('preview: empty-shell target never labeled Different exercise', () => {
    let draft = baseDraft()
    draft = addDay(draft, 1, 1, [createSoloGroup(makeSquatSlot(70), 1)]).draft
    draft = addDay(draft, 2, 1, []).draft

    const preview = buildFillPreview(draft, dayConfig())!
    const w2Cell = preview.rows[0].cells[1]
    expect(w2Cell.status).toBe('write')
    expect(w2Cell.display).toBe('77.5%')
    expect(preview.summary.skippedDifferent).toBe(0)
  })

  test('placed copy from empty shell is independent deep clone', () => {
    let draft = baseDraft()
    const w1 = addDay(draft, 1, 1, [createSoloGroup(makeSquatSlot(70), 1)])
    draft = w1.draft
    draft = addDay(draft, 2, 1, []).draft

    const result = applyFillStamp(draft, buildFillPreview(draft, dayConfig())!)
    const w1Tid = w1.templateId
    const w2Tid = result.draft.schedule.find((s) => s.week_number === 2 && s.program_day === 1)!
      .template_id!

    expect(w2Tid).not.toBe(w1Tid)
    result.draft.workouts[w2Tid!].groups[0].slots[0].prescriptions[0].load_percentage = 999
    expect(draft.workouts[w1Tid].groups[0].slots[0].prescriptions[0].load_percentage).toBe(70)
  })

  test('malformed empty shell: group with zero slots routes to place and fills', () => {
    let draft = baseDraft()
    const w1 = addDay(draft, 1, 1, [createSoloGroup(makeSquatSlot(70), 1)])
    draft = w1.draft
    const malformedGroup = createSoloGroup(makeSquatSlot(50), 1)
    malformedGroup.slots = []
    draft = addDay(draft, 2, 1, [malformedGroup]).draft

    expect(isEmptyShellWorkout(draft.workouts[draft.schedule.find((s) => s.week_number === 2)!.template_id!])).toBe(
      true,
    )
    expect(resolveDayTargetAction(draft, 2, 1, draft.workouts[w1.templateId])).toBe('place')

    const preview = buildFillPreview(draft, dayConfig())!
    expect(preview.rows[0].cells[1].status).toBe('write')
    expect(preview.summary.skippedDifferent).toBe(0)

    const result = applyFillStamp(draft, preview)
    const tid = result.draft.schedule.find((s) => s.week_number === 2 && s.program_day === 1)!.template_id!
    expect(result.draft.workouts[tid].groups[0].slots[0].prescriptions[0].load_percentage).toBe(72.5)
  })

  test('malformed empty shell: slot with empty exercise_id routes to place and fills', () => {
    let draft = baseDraft()
    const w1 = addDay(draft, 1, 1, [createSoloGroup(makeSquatSlot(70), 1)])
    draft = w1.draft
    const ghost = createDefaultExercise('ex-ghost', { id: 'ex-ghost', name: 'Ghost' }, 1)
    ghost.exercise_id = ''
    draft = addDay(draft, 2, 1, [createSoloGroup(ghost, 1)]).draft

    expect(isEmptyShellWorkout(draft.workouts[draft.schedule.find((s) => s.week_number === 2)!.template_id!])).toBe(
      true,
    )

    const preview = buildFillPreview(draft, dayConfig())!
    expect(preview.rows[0].cells[1].display).not.toBe('Different exercise')
    expect(preview.rows[0].cells[1].status).toBe('write')

    const result = applyFillStamp(draft, preview)
    const tid = result.draft.schedule.find((s) => s.week_number === 2 && s.program_day === 1)!.template_id!
    expect(result.draft.workouts[tid].groups[0].slots[0].exercise_id).toBe('ex-squat')
  })
})
