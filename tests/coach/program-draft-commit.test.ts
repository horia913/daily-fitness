import { describe, expect, test, beforeEach } from '@jest/globals'
import { createEmptyCanvasWorkout } from '@/lib/groupModel/canvasTypes'
import type { ProgramDraftState } from '@/types/programDraft'

jest.mock('@/lib/groupModel/canvasSave', () => ({
  saveWorkoutFromCanvas: jest.fn(async () => ({
    success: true,
    templateId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  })),
  formatSaveError: (e: unknown) => String(e),
}))

jest.mock('@/lib/workoutTemplateService', () => ({
  __esModule: true,
  default: {
    updateProgram: jest.fn(async () => ({})),
    setProgramSchedule: jest.fn(async () => undefined),
    removeProgramSchedule: jest.fn(async () => true),
  },
}))

jest.mock('@/lib/trainingBlockService', () => ({
  TrainingBlockService: {
    deleteTrainingBlock: jest.fn(async () => undefined),
    updateTrainingBlock: jest.fn(async () => ({})),
    reorderTrainingBlocks: jest.fn(async () => true),
  },
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { saveWorkoutFromCanvas } = require('@/lib/groupModel/canvasSave') as {
  saveWorkoutFromCanvas: jest.Mock
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { commitProgramDraft } = require('@/lib/programs/programDraftCommit') as typeof import('@/lib/programs/programDraftCommit')

function baseState(): ProgramDraftState {
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
    trainingBlocks: [],
    schedule: [],
    workouts: {},
    structureDirty: false,
    dirtyWorkoutIds: [],
    pendingNewWorkoutIds: [],
    pendingNewBlockIds: [],
    pendingDeactivateWorkoutIds: [],
  }
}

describe('commitProgramDraft diff', () => {
  beforeEach(() => {
    saveWorkoutFromCanvas.mockClear()
    saveWorkoutFromCanvas.mockResolvedValue({
      success: true,
      templateId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    })
  })

  test('commits only dirty workout ids — one RPC per dirty day', async () => {
    const dirtyA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const dirtyB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    const cleanC = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
    const baseline = baseState()
    const working: ProgramDraftState = {
      ...baseline,
      dirtyWorkoutIds: [dirtyA],
      workouts: {
        [dirtyA]: createEmptyCanvasWorkout({ id: dirtyA, kind: 'program_day', name: 'Day A' }),
        [dirtyB]: createEmptyCanvasWorkout({ id: dirtyB, kind: 'program_day', name: 'Day B' }),
        [cleanC]: createEmptyCanvasWorkout({ id: cleanC, kind: 'program_day', name: 'Day C' }),
      },
    }
    const supabase = { from: jest.fn() } as never
    const result = await commitProgramDraft(supabase, working, baseline, [])
    expect(result.success).toBe(true)
    expect(saveWorkoutFromCanvas).toHaveBeenCalledTimes(1)
    expect(result.contentCommittedIds).toEqual([dirtyA])
  })

  test('partial content failure drops saved ids from pendingNewWorkoutIds', async () => {
    const savedNew = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const failedNew = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    const baseline = baseState()
    const working: ProgramDraftState = {
      ...baseline,
      dirtyWorkoutIds: [savedNew, failedNew],
      pendingNewWorkoutIds: [savedNew, failedNew],
      workouts: {
        [savedNew]: createEmptyCanvasWorkout({ id: savedNew, kind: 'program_day', name: 'Saved' }),
        [failedNew]: createEmptyCanvasWorkout({ id: failedNew, kind: 'program_day', name: 'Fail' }),
      },
    }
    saveWorkoutFromCanvas.mockImplementation(async ({ workout }: { workout: { id: string } }) => {
      if (workout.id === failedNew) {
        return { success: false, error: 'rpc failed' }
      }
      return { success: true, templateId: workout.id }
    })
    const supabase = { from: jest.fn() } as never
    const result = await commitProgramDraft(supabase, working, baseline, [])
    expect(result.success).toBe(false)
    expect(result.contentCommittedIds).toEqual([savedNew])
    expect(result.pendingNewWorkoutIds).toEqual([failedNew])
    expect(result.failedContentId).toBe(failedNew)
  })
})
