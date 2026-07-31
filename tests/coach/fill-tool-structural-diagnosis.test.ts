/**
 * Read-only structural diagnosis for "all Week 2 cells show Different exercise".
 * Documents decision paths — not a behavior-change suite.
 */
import { describe, expect, test } from '@jest/globals'
import {
  createDefaultExercise,
  createEmptyCanvasWorkout,
  createSoloGroup,
} from '@/lib/groupModel/canvasTypes'
import { newId } from '@/lib/groupModel/newId'
import { copyWorkoutInWorkingCopy } from '@/lib/programs/inMemoryWorkoutCopy'
import {
  countCanvasExercises,
  type CanvasExercise,
} from '@/lib/groupModel/canvasTypes'
import {
  isEmptyShellWorkout,
} from '@/lib/programs/fillTool/matching'
import { buildFillPreview } from '@/lib/programs/fillTool/preview'
import {
  groupStructureMatches,
  resolveDayTargetAction,
  workoutsStructurallyMatch,
} from '@/lib/programs/fillTool/slotDecision'
import type { FillStampConfig } from '@/lib/programs/fillTool/types'
import type { ProgramDraftState } from '@/types/programDraft'
import type { TrainingBlock } from '@/types/trainingBlock'

function makeNamedSlot(exerciseId: string, name: string, loadPct: number): CanvasExercise {
  const ex = createDefaultExercise(exerciseId, { id: exerciseId, name }, 1)
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
  groups: ReturnType<typeof createSoloGroup>[],
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
          groups,
        }),
      },
    },
  }
}

function fiveExerciseMonday(load = 70) {
  const ids = ['leg-press', 'bss', 'rdl', 'glute-kick', 'jump-rope']
  const names = ['Leg Press', 'Bulgarian Split Squat', 'Romanian Deadlift', 'Cable Glute Kickback', 'Jump Rope']
  return ids.map((id, i) => createSoloGroup(makeNamedSlot(id, names[i], load + i * 5), i + 1))
}

describe('fill tool structural diagnosis (read-only)', () => {
  test('day-scope preview: one day-level skip labels every exercise row "Different exercise"', () => {
    let draft = baseDraft()
    const w1 = addDay(draft, 1, 1, fiveExerciseMonday())
    draft = w1.draft
    // Stale W2 Mon: single wrong exercise (non-empty, structural mismatch)
    draft = addDay(draft, 2, 1, [createSoloGroup(makeNamedSlot('old-ex', 'Old Exercise', 50), 1)]).draft
    // W3+ rest (no slot) — will write

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
    const w2Cells = preview.rows.map((r) => r.cells.find((c) => c.absoluteWeek === 2)!)
    expect(w2Cells).toHaveLength(5)
    expect(w2Cells.every((c) => c.display === 'Different exercise')).toBe(true)
    expect(preview.skips.filter((s) => s.absoluteWeek === 2)).toHaveLength(5)

    const w3Cell = preview.rows[0].cells.find((c) => c.absoluteWeek === 3)!
    expect(w3Cell.status).toBe('write')
  })

  test('tool-placed copy of W1 Monday structurally matches source (Tue/Wed scenario)', () => {
    let draft = baseDraft()
    const w1 = addDay(draft, 1, 1, fiveExerciseMonday())
    draft = w1.draft
    const copied = copyWorkoutInWorkingCopy(draft.workouts, w1.templateId, {
      newId: newId(),
      kind: 'program_day',
    })
    const w2 = addDay(draft, 2, 1, copied.groups)
    draft = w2.draft

    const source = draft.workouts[w1.templateId]
    const target = draft.workouts[w2.templateId]
    expect(workoutsStructurallyMatch(source, target)).toBe(true)
    expect(resolveDayTargetAction(draft, 2, 1, source)).toBe('overwrite')

    const preview = buildFillPreview(draft, {
      sourceAbsoluteWeek: 1,
      sourceProgramDay: 1,
      scope: 'day',
      scopeMatchKeys: [],
      property: 'load_pct',
      pattern: 'linear',
      patternInputs: { step: 2.5 },
      endAbsoluteWeek: 2,
      activeBlockId: 'block-1',
    })!
    expect(preview.rows[0].cells[1].status).toBe('write')
    expect(preview.rows[0].cells[1].display).not.toBe('Different exercise')
  })

  test('true empty shell: isEmptyShellWorkout true → place, not skip', () => {
    let draft = baseDraft()
    const w1 = addDay(draft, 1, 1, fiveExerciseMonday())
    draft = w1.draft
    const shell = addDay(draft, 2, 1, [])
    draft = shell.draft

    const target = draft.workouts[shell.templateId]
    expect(countCanvasExercises(target)).toBe(0)
    expect(isEmptyShellWorkout(target)).toBe(true)
    expect(resolveDayTargetAction(draft, 2, 1, draft.workouts[w1.templateId])).toBe('place')
  })

  test('stale partial shell: non-zero exercises + structural mismatch → skip_different', () => {
    let draft = baseDraft()
    const w1 = addDay(draft, 1, 1, fiveExerciseMonday())
    draft = w1.draft
    const stale = addDay(draft, 2, 1, fiveExerciseMonday(40).slice(0, 3))
    draft = stale.draft

    const source = draft.workouts[w1.templateId]
    const target = draft.workouts[stale.templateId]
    expect(isEmptyShellWorkout(target)).toBe(false)
    expect(workoutsStructurallyMatch(source, target)).toBe(false)
    expect(source.groups.length).toBe(5)
    expect(target.groups.length).toBe(3)
    expect(resolveDayTargetAction(draft, 2, 1, source)).toBe('skip_different')
  })

  test('workoutsStructurallyMatch compares exercise_id + exercise_order only (not slot.id)', () => {
    const groups = fiveExerciseMonday()
    const source = createEmptyCanvasWorkout({ groups })
    const copied = copyWorkoutInWorkingCopy({ [source.id]: source }, source.id, {
      newId: newId(),
      kind: 'program_day',
    })
    expect(source.groups[0].slots[0].id).not.toBe(copied.groups[0].slots[0].id)
    expect(workoutsStructurallyMatch(source, copied)).toBe(true)
    expect(
      groupStructureMatches(source.groups[0], copied.groups[0]),
    ).toBe(true)
  })
})
