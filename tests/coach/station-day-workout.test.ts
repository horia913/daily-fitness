import { describe, expect, test } from '@jest/globals'
import {
  createEmptyCanvasWorkout,
  countCanvasExercises,
  createDefaultExercise,
  createSoloGroup,
} from '@/lib/groupModel/canvasTypes'

describe('countCanvasExercises', () => {
  test('counts slots across groups', () => {
    const ex1 = createDefaultExercise('ex-1', { id: 'ex-1', name: 'Ex 1' }, 1)
    const ex2 = createDefaultExercise('ex-2', { id: 'ex-2', name: 'Ex 2' }, 1)
    const w = createEmptyCanvasWorkout({
      groups: [createSoloGroup(ex1, 1), createSoloGroup(ex2, 2)],
    })
    expect(countCanvasExercises(w)).toBe(2)
  })

  test('returns zero for empty workout', () => {
    expect(countCanvasExercises(createEmptyCanvasWorkout())).toBe(0)
  })

  test('ignores groups with no slots and slots without exercise_id', () => {
    const valid = createDefaultExercise('ex-1', { id: 'ex-1', name: 'Squat' }, 1)
    const emptyId = createDefaultExercise('ex-2', { id: 'ex-2', name: 'Ghost' }, 1)
    emptyId.exercise_id = ''
    const w = createEmptyCanvasWorkout({
      groups: [
        { ...createSoloGroup(valid, 1), slots: [] },
        createSoloGroup(emptyId, 2),
        createSoloGroup(valid, 3),
      ],
    })
    expect(countCanvasExercises(w)).toBe(1)
  })
})
