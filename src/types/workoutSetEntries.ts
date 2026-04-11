// Workout Set Entry TypeScript Interfaces
// This implements the flexible "Set Entry" system for advanced training protocols.
// (Formerly called "Workout Blocks" — renamed in Phase 1 to free "block" for
//  its correct coaching meaning: Training Blocks / mesocycles.)

export type SetType =
  | 'straight_set'      // Traditional sets with rest
  | 'superset'          // Two exercises back-to-back
  | 'giant_set'         // Three or more exercises back-to-back
  | 'drop_set'          // Reduce weight and continue
  | 'cluster_set'       // Short rests between clusters
  | 'rest_pause'        // Brief rest-pause between efforts
  | 'pre_exhaustion'    // Isolation then compound
  | 'amrap'             // As Many Rounds As Possible
  | 'emom'              // Every Minute On the Minute
  | 'tabata'            // 20s work / 10s rest protocol
  | 'for_time'          // Complete as fast as possible
  | 'speed_work'        // Sprint intervals with full recovery
  | 'endurance'         // Distance or time-based continuous work

export interface WorkoutSetEntry {
  id: string
  template_id: string
  set_type: SetType
  set_order: number
  set_name?: string
  set_notes?: string

  // Time-based parameters
  duration_seconds?: number           // For AMRAP, EMOM, Tabata
  rest_seconds?: number               // Main rest between sets/set entries

  // Set/Rep parameters
  total_sets?: number                 // Total sets for the set entry
  reps_per_set?: string               // Reps for each set (can be ranges like "10-12")

  // Relations
  exercises?: WorkoutSetEntryExercise[]
  drop_sets?: WorkoutDropSet[]
  cluster_sets?: WorkoutClusterSet[]
  rest_pause_sets?: WorkoutRestPauseSet[]
  time_protocols?: WorkoutTimeProtocol[]  // One per exercise for time-based set entries
  speed_sets?: WorkoutSpeedSet[]          // workout_speed_sets (RPC key: speed_sets)
  endurance_sets?: WorkoutEnduranceSet[]  // workout_endurance_sets (RPC key: endurance_sets)

  created_at: string
  updated_at: string
}

export interface WorkoutSetEntryExercise {
  id: string
  set_entry_id: string
  exercise_id: string
  exercise_order: number              // Order within the set entry (1A, 1B, 1C, etc.)
  exercise_letter?: string            // A, B, C, etc. for supersets

  // Exercise-specific parameters
  sets?: number
  reps?: string
  weight_kg?: number
  load_percentage?: number            // Percentage of 1RM for suggested weight
  rir?: number                        // Prescribed RPE (1–10); DB column name is legacy
  tempo?: string                      // Tempo notation
  rest_seconds?: number               // Exercise-specific rest
  notes?: string

  // Relations
  exercise?: Exercise
  drop_sets?: WorkoutDropSet[]
  cluster_sets?: WorkoutClusterSet[]
  rest_pause_sets?: WorkoutRestPauseSet[]
  time_protocols?: WorkoutTimeProtocol[]  // For time-based set entries (amrap, emom, for_time, tabata)
  speed_sets?: WorkoutSpeedSet[]
  endurance_sets?: WorkoutEnduranceSet[]

  created_at: string
  updated_at: string
}

export interface Exercise {
  id: string
  name: string
  description?: string
  primary_muscle_group?: string | null
  primary_muscle_group_id?: string | null
  muscle_groups?: string[]
  equipment?: string[]
  difficulty_level?: string
  image_url?: string
  video_url?: string
  instructions?: string
  tips?: string
  created_at: string
  updated_at: string
}

// Drop Set Configuration
export interface WorkoutDropSet {
  id: string
  set_entry_id: string                 // Links to workout set entry
  exercise_id: string                   // Links to exercise from library
  exercise_order: number                // Order of exercise within set entry
  drop_order: number                    // 1st drop, 2nd drop, etc.
  weight_kg?: number
  reps?: string
  drop_percentage?: number              // Percentage reduction from previous weight
  rest_seconds?: number                 // Usually 0 for drop sets
  created_at: string
}

// Cluster Set Configuration
export interface WorkoutClusterSet {
  id: string
  set_entry_id: string                 // Links to workout set entry
  exercise_id: string                   // Links to exercise from library
  exercise_order: number                // Order of exercise within set entry
  reps_per_cluster: number
  clusters_per_set: number
  intra_cluster_rest: number            // Rest between clusters (seconds)
  inter_set_rest: number                // Rest after full set (seconds)
  created_at: string
}

// Rest-Pause Configuration
export interface WorkoutRestPauseSet {
  id: string
  set_entry_id: string                 // Links to workout set entry
  exercise_id: string                   // Links to exercise from library
  exercise_order: number                // Order of exercise within set entry
  weight_kg?: number                    // Renamed from initial_weight_kg
  // initial_reps was dropped - reps are tracked in workout_set_entries table
  rest_pause_duration: number          // Seconds between efforts
  max_rest_pauses: number              // Max number of rest-pause attempts
  created_at: string
}

// Time Protocol Configuration (AMRAP, EMOM, Tabata, For Time)
export interface WorkoutTimeProtocol {
  id: string
  set_entry_id: string                 // Links to workout set entry
  exercise_id: string                   // Links to exercise from library
  exercise_order: number                // Order of exercise within set entry
  protocol_type: 'amrap' | 'emom' | 'for_time' | 'tabata'
  total_duration_minutes?: number       // For AMRAP, EMOM
  work_seconds?: number                 // For Tabata, EMOM work periods
  rest_seconds?: number                 // For Tabata, EMOM rest periods (rest after exercise)
  rest_after_set?: number               // For Tabata: rest after completing all exercises in the set
  rounds?: number                       // For Tabata (usually 8)
  target_reps?: number                  // For AMRAP, For Time
  time_cap_minutes?: number             // For For Time
  reps_per_round?: number               // For EMOM (reps per minute/round)
  emom_mode?: string                    // For EMOM (target_reps or target_time)
  set?: number                          // Set number (for Tabata only)
  weight_kg?: number | null             // Weight for time-based set entries (amrap, emom, for_time)
  load_percentage?: number | null       // Load percentage for time-based set entries (amrap, emom, for_time, NOT tabata)
  created_at: string
}

/** workout_speed_sets — must match database columns */
export interface WorkoutSpeedSet {
  id: string
  set_entry_id: string
  exercise_id: string
  exercise_order: number
  intervals: number
  distance_meters: number
  load_pct_bw?: number | null
  target_speed_pct?: number | null
  target_hr_pct?: number | null
  rest_seconds: number
  notes?: string | null
  created_at: string
  updated_at?: string
}

/** workout_endurance_sets — must match database columns */
export interface WorkoutEnduranceSet {
  id: string
  set_entry_id: string
  exercise_id: string
  exercise_order: number
  target_distance_meters: number
  target_time_seconds?: number | null
  target_pace_seconds_per_km?: number | null
  hr_zone?: number | null
  target_hr_pct?: number | null
  notes?: string | null
  created_at: string
  updated_at?: string
}

// UI Helper Types
export interface SetTypeConfig {
  type: SetType
  name: string
  description: string
  icon: string
  color: string
  requiresMultipleExercises: boolean
  supportsTimeProtocols: boolean
  supportsDropSets: boolean
  supportsClusterSets: boolean
  supportsRestPause: boolean
}

// Live Workout Execution Types
export interface LiveWorkoutSetEntry {
  block: WorkoutSetEntry              // the WorkoutSetEntry object (field kept as 'block' for internal compat)
  currentExerciseIndex: number
  currentSetIndex: number
  isCompleted: boolean
  startTime?: Date
  endTime?: Date
  completedSets: number
  totalSets: number
  /** Set logs already persisted for this set entry (from restore); used to hydrate executor so arrows and edit work */
  existingSetLogs?: LoggedSet[]
}

export interface LiveWorkoutExercise {
  exercise: WorkoutSetEntryExercise
  currentSet: number
  completedSets: number
  totalSets: number
  isCompleted: boolean
  loggedSets: LoggedSet[]
}

export interface LoggedSet {
  id: string
  exercise_id: string
  set_entry_id: string
  set_number: number
  weight_kg?: number
  reps_completed?: number
  rir?: number
  rpe?: number // Rate of Perceived Exertion (1-10)
  tempo?: string
  rest_seconds?: number
  notes?: string
  completed_at: Date
  /** Logged performance — speed / endurance / HR-capable blocks */
  actual_time_seconds?: number
  actual_distance_meters?: number
  actual_hr_avg?: number
  actual_speed_kmh?: number
}

// Set Type Configurations
export const WORKOUT_SET_TYPE_CONFIGS: Record<SetType, SetTypeConfig> = {
  straight_set: {
    type: 'straight_set',
    name: 'Straight Set',
    description: 'Traditional sets with rest between each set',
    icon: '📋',
    color: 'blue',
    requiresMultipleExercises: false,
    supportsTimeProtocols: false,
    supportsDropSets: false,
    supportsClusterSets: false,
    supportsRestPause: false
  },
  superset: {
    type: 'superset',
    name: 'Superset',
    description: 'Two exercises performed back-to-back with rest after the pair',
    icon: '⚡',
    color: 'orange',
    requiresMultipleExercises: true,
    supportsTimeProtocols: false,
    supportsDropSets: true,
    supportsClusterSets: true,
    supportsRestPause: false
  },
  giant_set: {
    type: 'giant_set',
    name: 'Giant Set',
    description: 'Three or more exercises performed back-to-back',
    icon: '🔥',
    color: 'red',
    requiresMultipleExercises: true,
    supportsTimeProtocols: false,
    supportsDropSets: false,
    supportsClusterSets: false,
    supportsRestPause: false
  },
  drop_set: {
    type: 'drop_set',
    name: 'Drop Set',
    description: 'Reduce weight and continue without rest',
    icon: '📉',
    color: 'purple',
    requiresMultipleExercises: false,
    supportsTimeProtocols: false,
    supportsDropSets: true,
    supportsClusterSets: false,
    supportsRestPause: false
  },
  cluster_set: {
    type: 'cluster_set',
    name: 'Cluster Set',
    description: 'Short rests between clusters within a set',
    icon: '🔗',
    color: 'indigo',
    requiresMultipleExercises: false,
    supportsTimeProtocols: false,
    supportsDropSets: false,
    supportsClusterSets: true,
    supportsRestPause: false
  },
  rest_pause: {
    type: 'rest_pause',
    name: 'Rest-Pause Set',
    description: 'Brief rest-pause between efforts with same weight',
    icon: '⏸️',
    color: 'teal',
    requiresMultipleExercises: false,
    supportsTimeProtocols: false,
    supportsDropSets: false,
    supportsClusterSets: false,
    supportsRestPause: true
  },
  pre_exhaustion: {
    type: 'pre_exhaustion',
    name: 'Pre-Exhaustion',
    description: 'Isolation exercise followed by compound movement',
    icon: '🎯',
    color: 'pink',
    requiresMultipleExercises: true,
    supportsTimeProtocols: false,
    supportsDropSets: false,
    supportsClusterSets: false,
    supportsRestPause: false
  },
  amrap: {
    type: 'amrap',
    name: 'AMRAP',
    description: 'As Many Rounds As Possible in given time',
    icon: '🚀',
    color: 'yellow',
    requiresMultipleExercises: false,
    supportsTimeProtocols: true,
    supportsDropSets: false,
    supportsClusterSets: false,
    supportsRestPause: false
  },
  emom: {
    type: 'emom',
    name: 'EMOM',
    description: 'Every Minute On the Minute protocol',
    icon: '⏰',
    color: 'cyan',
    requiresMultipleExercises: false,
    supportsTimeProtocols: true,
    supportsDropSets: false,
    supportsClusterSets: false,
    supportsRestPause: false
  },
  tabata: {
    type: 'tabata',
    name: 'Tabata',
    description: '20 seconds work, 10 seconds rest protocol',
    icon: '⚡',
    color: 'amber',
    requiresMultipleExercises: false,
    supportsTimeProtocols: true,
    supportsDropSets: false,
    supportsClusterSets: false,
    supportsRestPause: false
  },
  for_time: {
    type: 'for_time',
    name: 'For Time',
    description: 'Complete all exercises as fast as possible',
    icon: '🏃',
    color: 'rose',
    requiresMultipleExercises: false,
    supportsTimeProtocols: true,
    supportsDropSets: false,
    supportsClusterSets: false,
    supportsRestPause: false
  },
  speed_work: {
    type: 'speed_work',
    name: 'Speed Work',
    description: 'Sprint intervals with full recovery',
    icon: '⚡',
    color: 'amber',
    requiresMultipleExercises: false,
    supportsTimeProtocols: false,
    supportsDropSets: false,
    supportsClusterSets: false,
    supportsRestPause: false
  },
  endurance: {
    type: 'endurance',
    name: 'Endurance',
    description: 'Distance or time-based continuous work',
    icon: '🏃',
    color: 'emerald',
    requiresMultipleExercises: false,
    supportsTimeProtocols: false,
    supportsDropSets: false,
    supportsClusterSets: false,
    supportsRestPause: false
  },
}
