export type ExerciseGroupType = 
  | 'straight_set'
  | 'superset'
  | 'giant_set'
  | 'circuit'
  | 'tabata'
  | 'amrap'
  | 'emom'
  | 'drop_set'
  | 'cluster_set'
  | 'rest_pause'
  | 'pyramid_set'
  | 'pre_exhaustion'
  | 'for_time'
  | 'ladder'

export interface WorkoutExerciseGroup {
  id: string
  template_id: string
  group_type: ExerciseGroupType
  group_order: number
  rest_after_seconds?: number
  rounds?: number
  work_seconds?: number
  rest_seconds?: number
  duration_seconds?: number
  reps_per_minute?: number
  drop_percentage?: number
  target_reps?: number
  time_cap?: number
  rest_pause_duration?: number
  max_rest_pauses?: number
  clusters_per_set?: number
  intra_cluster_rest?: number
  inter_set_rest?: number
  group_parameters?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface ExerciseRow {
  template_id: string
  exercise_id: string
  group_id?: string
  group_letter?: string
  sets?: number
  reps?: string
  rest_seconds?: number
  work_seconds?: number
  weight_kg?: number
  rir?: number
  tempo?: string
  notes?: string
  order_index?: number
}

export interface ExerciseGroupDisplay {
  id: string
  group?: WorkoutExerciseGroup
  exercises: any[]
}

