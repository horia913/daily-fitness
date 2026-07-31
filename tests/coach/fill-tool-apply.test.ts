import { describe, expect, test, jest } from '@jest/globals'
import { buildFillPreview } from '@/lib/programs/fillTool/preview'
import type { FillStampConfig } from '@/lib/programs/fillTool/types'
import {
  createDefaultExercise,
  createEmptyCanvasWorkout,
  createSoloGroup,
} from '@/lib/groupModel/canvasTypes'
import { newId } from '@/lib/groupModel/newId'
import type { ProgramDraftState } from '@/types/programDraft'

describe('fill tool zero-network discipline', () => {
  test('buildFillPreview does not call fetch', () => {
    const fetchSpy = jest.spyOn(global, 'fetch')

    const slot = createDefaultExercise('ex-1', { id: 'ex-1', name: 'Squat' }, 1)
    slot.prescriptions = slot.prescriptions.map((row) => ({
      ...row,
      load_percentage: 70,
      weight_kg: null,
    }))
    const templateId = newId()
    const draft: ProgramDraftState = {
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
      trainingBlocks: [],
      schedule: [
        {
          id: newId(),
          program_id: 'prog-1',
          program_day: 1,
          week_number: 1,
          template_id: templateId,
          created_at: '',
          updated_at: '',
        },
      ],
      workouts: {
        [templateId]: createEmptyCanvasWorkout({
          id: templateId,
          kind: 'program_day',
          groups: [createSoloGroup(slot, 1)],
        }),
      },
      structureDirty: false,
      dirtyWorkoutIds: [],
      pendingNewWorkoutIds: [],
      pendingNewBlockIds: [],
      pendingDeactivateWorkoutIds: [],
    }

    const config: FillStampConfig = {
      sourceAbsoluteWeek: 1,
      sourceProgramDay: 1,
      scope: 'day',
      scopeMatchKeys: [],
      property: null,
      pattern: 'hold',
      patternInputs: {},
      endAbsoluteWeek: 1,
      activeBlockId: null,
    }

    buildFillPreview(draft, config)
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
