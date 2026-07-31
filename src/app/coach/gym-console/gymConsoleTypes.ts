export interface ClientForModal {
  client_id: string
  coach_id: string
  status: string
  profiles?: { id: string; first_name?: string; last_name?: string; email?: string }
}

export interface BlockExercise {
  id: string
  exercise_id: string
  exercise_name: string
  exercise_order?: number | null
  sets?: number
  reps?: string
  weight_kg?: number
  load_percentage?: number
  rir?: number
  tempo?: string
  rest_seconds?: number
  notes?: string | null
  set_notes?: string | null
}

export interface WorkoutBlock {
  id: string
  set_type?: string
  set_name?: string
  block_type?: string
  block_name?: string
  set_order?: number
  rest_seconds?: number | null
  exercises: BlockExercise[]
}

export interface NextWorkoutResponse {
  status: 'active' | 'completed' | 'no_program'
  client_name?: string
  program_name?: string
  position_label?: string
  workout_name?: string
  blocks?: WorkoutBlock[]
  template_id?: string
  [key: string]: unknown
}
