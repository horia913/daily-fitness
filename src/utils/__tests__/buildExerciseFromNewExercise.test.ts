import { buildExerciseFromNewExercise } from '../buildExerciseFromNewExercise'

describe('buildExerciseFromNewExercise', () => {
  describe('straight_set validation', () => {
    test('returns success with valid straight set input', () => {
      const newExercise = {
        exercise_type: 'straight_set',
        exercise_id: 'test-uuid-123',
        sets: 3,
        reps: '10',
        rest_seconds: 60,
      }
      const availableExercises = [{ id: 'test-uuid-123', name: 'Bench Press' }]
      const result = buildExerciseFromNewExercise(
        newExercise,
        availableExercises,
        [],
        null
      )
      expect(result.success).toBe(true)
      expect(result.exercise).toBeDefined()
      expect(result.exercise.exercise_id).toBe('test-uuid-123')
      expect(result.exercise.exercise_type).toBe('straight_set')
      expect(typeof result.exercise.sets).toBe('string')
      expect(typeof result.exercise.reps).toBe('string')
      expect(typeof result.exercise.rest_seconds).toBe('string')
    })

    test('returns error when exercise_id is missing for straight set', () => {
      const newExercise = {
        exercise_type: 'straight_set',
        exercise_id: '',
        sets: 3,
        reps: '10',
      }
      const result = buildExerciseFromNewExercise(newExercise, [], [], null)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Please select an exercise')
    })

    test('returns error when selected exercise not in availableExercises', () => {
      const newExercise = {
        exercise_type: 'straight_set',
        exercise_id: 'missing-uuid',
        sets: 3,
        reps: '10',
      }
      const availableExercises = [{ id: 'other-uuid', name: 'Other' }]
      const result = buildExerciseFromNewExercise(
        newExercise,
        availableExercises,
        [],
        null
      )
      expect(result.success).toBe(false)
      expect(result.error).toBe('Selected exercise not found')
    })
  })

  describe('superset validation', () => {
    test('returns error when second exercise is missing for superset', () => {
      const newExercise = {
        exercise_type: 'superset',
        exercise_id: 'test-uuid-123',
        superset_exercise_id: '',
      }
      const result = buildExerciseFromNewExercise(
        newExercise,
        [{ id: 'test-uuid-123', name: 'Bench Press' }],
        [],
        null
      )
      expect(result.success).toBe(false)
      expect(result.error).toBe('Please select both exercises for your Superset')
    })

    test('returns error when first exercise is missing for superset', () => {
      const newExercise = {
        exercise_type: 'superset',
        exercise_id: '',
        superset_exercise_id: 'uuid-2',
      }
      const result = buildExerciseFromNewExercise(
        newExercise,
        [{ id: 'uuid-2', name: 'Row' }],
        [],
        null
      )
      expect(result.success).toBe(false)
      expect(result.error).toBe('Please select both exercises for your Superset')
    })

    test('returns success with valid superset (both exercises)', () => {
      const newExercise = {
        exercise_type: 'superset',
        exercise_id: 'uuid-1',
        superset_exercise_id: 'uuid-2',
        sets: 3,
        reps: '10',
      }
      const availableExercises = [
        { id: 'uuid-1', name: 'Bench Press' },
        { id: 'uuid-2', name: 'Bent Over Row' },
      ]
      const result = buildExerciseFromNewExercise(
        newExercise,
        availableExercises,
        [],
        null
      )
      expect(result.success).toBe(true)
      expect(result.exercise.exercise_id).toBe('uuid-1')
      expect(result.exercise.superset_exercise_id).toBe('uuid-2')
    })
  })

  describe('giant_set validation', () => {
    test('returns error when no exercises provided for giant set', () => {
      const newExercise = {
        exercise_type: 'giant_set',
        giant_set_exercises: [],
      }
      const result = buildExerciseFromNewExercise(newExercise, [], [], null)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Please add at least one exercise to your Giant Set')
    })

    test('returns error when no valid exercise_id in giant set', () => {
      const newExercise = {
        exercise_type: 'giant_set',
        giant_set_exercises: [{ exercise_id: '' }, {}],
      }
      const result = buildExerciseFromNewExercise(newExercise, [], [], null)
      expect(result.success).toBe(false)
      expect(result.error).toBe(
        'Please ensure at least one exercise is selected in your Giant Set'
      )
    })

    test('returns success with valid giant set', () => {
      const newExercise = {
        exercise_type: 'giant_set',
        giant_set_exercises: [
          { exercise_id: 'uuid-1' },
          { exercise_id: 'uuid-2' },
          { exercise_id: 'uuid-3' },
        ],
        sets: 3,
      }
      const availableExercises = [
        { id: 'uuid-1', name: 'Ex 1' },
        { id: 'uuid-2', name: 'Ex 2' },
        { id: 'uuid-3', name: 'Ex 3' },
      ]
      const result = buildExerciseFromNewExercise(
        newExercise,
        availableExercises,
        [],
        null
      )
      expect(result.success).toBe(true)
      expect(result.exercise.exercise_id).toBe('uuid-1')
      expect(result.exercise.giant_set_exercises).toHaveLength(3)
    })
  })

  describe('tabata validation', () => {
    test('returns error when tabata_sets is empty', () => {
      const newExercise = {
        exercise_type: 'tabata',
        tabata_sets: [],
      }
      const result = buildExerciseFromNewExercise(newExercise, [], [], null)
      expect(result.success).toBe(false)
      expect(result.error).toBe(
        'Please add at least one Tabata set with exercises'
      )
    })

    test('returns error when no exercises in tabata sets', () => {
      const newExercise = {
        exercise_type: 'tabata',
        tabata_sets: [{ exercises: [] }],
      }
      const result = buildExerciseFromNewExercise(newExercise, [], [], null)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Please add exercises to your Tabata sets')
    })

    test('returns success with valid tabata', () => {
      const newExercise = {
        exercise_type: 'tabata',
        tabata_sets: [
          {
            exercises: [{ exercise_id: 'uuid-1' }],
          },
        ],
      }
      const availableExercises = [{ id: 'uuid-1', name: 'Ex 1' }]
      const result = buildExerciseFromNewExercise(
        newExercise,
        availableExercises,
        [],
        null
      )
      expect(result.success).toBe(true)
      expect(result.exercise.exercise_id).toBe('uuid-1')
    })
  })

  describe('edit mode', () => {
    test('preserves editingExerciseId when provided', () => {
      const editingId = 'existing-exercise-id'
      const newExercise = {
        exercise_type: 'straight_set',
        exercise_id: 'test-uuid-123',
        sets: 3,
        reps: '10',
      }
      const existingExercises = [{ id: editingId, order_index: 2 }]
      const result = buildExerciseFromNewExercise(
        newExercise,
        [{ id: 'test-uuid-123', name: 'Bench Press' }],
        existingExercises,
        editingId
      )
      expect(result.success).toBe(true)
      expect(result.exercise.id).toBe(editingId)
    })

    test('generates temp id when not in edit mode', () => {
      const newExercise = {
        exercise_type: 'straight_set',
        exercise_id: 'test-uuid-123',
        sets: 3,
        reps: '10',
      }
      const result = buildExerciseFromNewExercise(
        newExercise,
        [{ id: 'test-uuid-123', name: 'Bench Press' }],
        [],
        null
      )
      expect(result.success).toBe(true)
      expect(result.exercise.id).toMatch(/^temp-/)
    })
  })

  describe('order_index', () => {
    test('sets order_index to existingExercises.length + 1 for new exercise', () => {
      const existing = [
        { id: 'a', order_index: 1 },
        { id: 'b', order_index: 2 },
      ]
      const newExercise = {
        exercise_type: 'straight_set',
        exercise_id: 'test-uuid-123',
        sets: 3,
        reps: '10',
      }
      const result = buildExerciseFromNewExercise(
        newExercise,
        [{ id: 'test-uuid-123', name: 'Bench Press' }],
        existing,
        null
      )
      expect(result.success).toBe(true)
      expect(result.exercise.order_index).toBe(3)
    })
  })
})
