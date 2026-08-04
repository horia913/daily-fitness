import type { SetType, WorkoutSetEntry } from '@/types/workoutSetEntries'

export type RoundsDriver = 'fixed' | 'amrap' | 'interval' | 'for_time'
export type Measurement = 'reps' | 'time' | 'distance'
export type Technique = 'none' | 'drop_set' | 'cluster' | 'rest_pause'
export type WorkoutKind = 'library' | 'program_day' | 'client_day'

/** Per-set prescription row (workout_set_prescriptions). */
export interface Prescription {
  id?: string
  slot_id?: string
  set_number: number
  reps?: string | null
  weight_kg?: number | null
  load_percentage?: number | null
  /** Prescribed effort (RPE 6–10). */
  rpe?: number | null
  tempo?: string | null
  work_seconds?: number | null
  distance_meters?: number | null
}

export type SlotProperty =
  | 'load'
  | 'rpe'
  | 'tempo'
  | 'rest_after_exercise'
  | 'drop_set'
  | 'cluster'
  | 'rest_pause'

/** Parent row fields on workout_set_entries (Group model). */
export interface GroupModelEntry {
  id: string
  template_id: string
  set_order: number
  set_name?: string | null
  set_notes?: string | null
  rounds_driver: RoundsDriver
  interval_seconds?: number | null
  time_cap_seconds?: number | null
  total_sets?: number | null
  rest_seconds?: number | null
  duration_seconds?: number | null
  set_type: SetType
  reps_per_set?: string | null
  created_at: string
  updated_at: string
}

/** Slot row on workout_set_entry_exercises (Group model). */
export interface GroupModelSlot {
  id: string
  set_entry_id: string
  exercise_id: string
  exercise_order: number
  measurement: Measurement
  technique: Technique
  sets?: number | null
  reps?: string | null
  weight_kg?: number | null
  load_percentage?: number | null
  /** Prescribed effort (RPE 6–10). */
  rpe?: number | null
  tempo?: string | null
  rest_seconds?: number | null
  notes?: string | null
  work_seconds?: number | null
  distance_meters?: number | null
  target_time_seconds?: number | null
  target_pace_seconds_per_km?: number | null
  target_speed_pct?: number | null
  hr_zone?: number | null
  target_hr_pct?: number | null
  drop_percentage?: number | null
  max_drops?: number | null
  reps_per_cluster?: number | null
  clusters_per_set?: number | null
  intra_cluster_rest_seconds?: number | null
  rest_pause_seconds?: number | null
  max_rest_pauses?: number | null
  exercise_letter?: string | null
  exercise?: Record<string, unknown> | null
  prescriptions?: Prescription[]
  created_at?: string
  updated_at?: string
}

export type LegacyBlock = WorkoutSetEntry

export interface GroupModelWritePayload {
  rounds_driver: RoundsDriver
  interval_seconds?: number | null
  time_cap_seconds?: number | null
  total_sets?: number | null
  rest_seconds?: number | null
  duration_seconds?: number | null
  set_type: SetType
  reps_per_set?: string | null
  set_name?: string | null
  set_notes?: string | null
  slots: GroupModelSlotWrite[]
}

export interface GroupModelSlotWrite {
  exercise_id: string
  exercise_order: number
  measurement: Measurement
  technique: Technique
  sets?: number | null
  reps?: string | null
  weight_kg?: number | null
  load_percentage?: number | null
  /** Prescribed effort (RPE 6–10). */
  rpe?: number | null
  tempo?: string | null
  rest_seconds?: number | null
  notes?: string | null
  work_seconds?: number | null
  distance_meters?: number | null
  target_time_seconds?: number | null
  target_pace_seconds_per_km?: number | null
  target_speed_pct?: number | null
  hr_zone?: number | null
  target_hr_pct?: number | null
  drop_percentage?: number | null
  max_drops?: number | null
  reps_per_cluster?: number | null
  clusters_per_set?: number | null
  intra_cluster_rest_seconds?: number | null
  rest_pause_seconds?: number | null
  max_rest_pauses?: number | null
  exercise_letter?: string | null
}
