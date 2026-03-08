import type {
  WorkoutAssignment,
  TemplateExercise,
  ClientBlockRecord,
  ClientBlockExerciseRecord,
} from '../types'

describe('Type definitions', () => {
  test('WorkoutAssignment can be constructed with required fields', () => {
    const assignment: WorkoutAssignment = {
      id: 'wa-1',
      workout_template_id: 'tpl-1',
      status: 'scheduled',
    }
    expect(assignment).toBeDefined()
    expect(assignment.id).toBe('wa-1')
    expect(assignment.status).toBe('scheduled')
  })

  test('TemplateExercise can be constructed with required fields', () => {
    const exercise: TemplateExercise = {
      id: 'ex-1',
      exercise_id: 'ex-id',
      order_index: 1,
      sets: 3,
      reps: '10',
      rest_seconds: 60,
      notes: '',
    }
    expect(exercise).toBeDefined()
    expect(exercise.order_index).toBe(1)
  })

  test('ClientBlockRecord can be constructed', () => {
    const record: ClientBlockRecord = {
      id: 'block-1',
      set_order: 1,
      set_type: 'straight_set',
      set_name: null,
      set_notes: null,
      total_sets: 3,
      reps_per_set: '10',
      rest_seconds: 60,
    }
    expect(record).toBeDefined()
    expect(record.set_type).toBe('straight_set')
  })

  test('ClientBlockExerciseRecord can be constructed', () => {
    const record: ClientBlockExerciseRecord = {
      id: 'cbe-1',
      exercise_id: 'ex-1',
      exercise_order: 1,
      exercise_letter: null,
      sets: 3,
      reps: '10',
      weight_kg: null,
      rir: null,
      tempo: null,
      rest_seconds: null,
      notes: null,
    }
    expect(record).toBeDefined()
    expect(record.exercise_id).toBe('ex-1')
  })
})
