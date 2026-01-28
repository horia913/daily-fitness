// Workout Blocks TypeScript Interfaces
// This implements the flexible "Workout Block" system for advanced training protocols

export type WorkoutBlockType = 
  | 'straight_set'      // Traditional sets with rest
  | 'superset'          // Two exercises back-to-back
  | 'giant_set'         // Three or more exercises back-to-back
  | 'drop_set'          // Reduce weight and continue
  | 'cluster_set'       // Short rests between clusters
  | 'rest_pause'        // Brief rest-pause between efforts
  | 'pyramid_set'       // Ascending/descending pyramid
  | 'ladder'            // Ladder progression
  | 'pre_exhaustion'    // Isolation then compound
  | 'amrap'            // As Many Rounds As Possible
  | 'emom'             // Every Minute On the Minute
  | 'tabata'           // 20s work / 10s rest protocol
  | 'circuit'          // Circuit training with variable timing
  | 'for_time'         // Complete as fast as possible
  | 'hr_sets'          // Heart rate zone training for aerobic endurance

export interface WorkoutBlock {
  id: string
  template_id: string
  block_type: WorkoutBlockType
  block_order: number
  block_name?: string
  block_notes?: string
  
  // Time-based parameters
  duration_seconds?: number           // For AMRAP, EMOM, Tabata
  rest_seconds?: number               // Main rest between sets/blocks
  
  // Set/Rep parameters
  total_sets?: number                 // Total sets for the block
  reps_per_set?: string               // Reps for each set (can be ranges like "10-12")
  
  // HR-specific parameters (for hr_sets block type)
  hr_zone_target?: number                 // Optional block-level HR zone target (1-5)
  hr_percentage_min?: number             // Optional block-level HR percentage min (50-100)
  hr_percentage_max?: number             // Optional block-level HR percentage max (50-100)
  
  // Relations
  exercises?: WorkoutBlockExercise[]
  drop_sets?: WorkoutDropSet[]
  cluster_sets?: WorkoutClusterSet[]
  rest_pause_sets?: WorkoutRestPauseSet[]
  pyramid_sets?: WorkoutPyramidSet[]
  ladder_sets?: WorkoutLadderSet[]
  time_protocols?: WorkoutTimeProtocol[]  // One per exercise for time-based blocks
  hr_sets?: WorkoutHRSet[]                // One per exercise for HR-based blocks
  
  created_at: string
  updated_at: string
}

export interface WorkoutBlockExercise {
  id: string
  block_id: string
  exercise_id: string
  exercise_order: number              // Order within the block (1A, 1B, 1C, etc.)
  exercise_letter?: string            // A, B, C, etc. for supersets
  
  // Exercise-specific parameters
  sets?: number
  reps?: string
  weight_kg?: number
  load_percentage?: number            // Percentage of 1RM for suggested weight
  rir?: number                        // Reps in reserve
  tempo?: string                      // Tempo notation
  rest_seconds?: number               // Exercise-specific rest
  notes?: string
  
  // Relations
  exercise?: Exercise
  drop_sets?: WorkoutDropSet[]
  cluster_sets?: WorkoutClusterSet[]
  rest_pause_sets?: WorkoutRestPauseSet[]
  pyramid_sets?: WorkoutPyramidSet[]
  ladder_sets?: WorkoutLadderSet[]
  time_protocols?: WorkoutTimeProtocol[]  // For time-based blocks (amrap, emom, for_time, tabata)
  hr_sets?: WorkoutHRSet[]                 // For HR-based blocks (hr_sets)
  
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
  block_id: string                     // Links to workout block
  exercise_id: string                   // Links to exercise from library
  exercise_order: number                // Order of exercise within block
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
  block_id: string                     // Links to workout block
  exercise_id: string                   // Links to exercise from library
  exercise_order: number                // Order of exercise within block
  reps_per_cluster: number
  clusters_per_set: number
  intra_cluster_rest: number            // Rest between clusters (seconds)
  inter_set_rest: number                // Rest after full set (seconds)
  created_at: string
}

// Pyramid Set Configuration
export interface WorkoutPyramidSet {
  id: string
  block_id: string                     // Links to workout block
  exercise_id: string                   // Links to exercise from library
  exercise_order: number                // Order of exercise within block
  pyramid_order: number                 // Order in the pyramid
  weight_kg?: number
  reps?: string
  rest_seconds?: number
  created_at: string
}

// Rest-Pause Configuration
export interface WorkoutRestPauseSet {
  id: string
  block_id: string                     // Links to workout block
  exercise_id: string                   // Links to exercise from library
  exercise_order: number                // Order of exercise within block
  weight_kg?: number                    // Renamed from initial_weight_kg
  // initial_reps was dropped - reps are tracked in workout_blocks table
  rest_pause_duration: number          // Seconds between efforts
  max_rest_pauses: number              // Max number of rest-pause attempts
  created_at: string
}

// Time Protocol Configuration (AMRAP, EMOM, Tabata, For Time, Circuit)
export interface WorkoutTimeProtocol {
  id: string
  block_id: string                     // Links to workout block
  exercise_id: string                   // Links to exercise from library
  exercise_order: number                // Order of exercise within block
  protocol_type: 'amrap' | 'emom' | 'for_time' | 'tabata' | 'circuit'
  total_duration_minutes?: number       // For AMRAP, EMOM
  work_seconds?: number                 // For Tabata, EMOM work periods
  rest_seconds?: number                 // For Tabata, EMOM rest periods (rest after exercise)
  rest_after_set?: number               // For Circuit/Tabata: rest after completing all exercises in the set
  rounds?: number                       // For Tabata (usually 8)
  target_reps?: number                 // For AMRAP, For Time
  time_cap_minutes?: number            // For For Time
  reps_per_round?: number              // For EMOM (reps per minute/round)
  emom_mode?: string                   // For EMOM (target_reps or target_time)
  set?: number                          // Set number (for Tabata/Circuit only)
  weight_kg?: number | null            // Weight for time-based blocks (amrap, emom, for_time)
  load_percentage?: number | null      // Load percentage for time-based blocks (amrap, emom, for_time, NOT tabata)
  created_at: string
}

// Ladder Configuration
export interface WorkoutLadderSet {
  id: string
  block_id: string                     // Links to workout block
  exercise_id: string                   // Links to exercise from library
  exercise_order: number                // Order of exercise within block
  ladder_order: number                  // Order in the ladder
  weight_kg?: number
  reps?: number
  rest_seconds?: number
  created_at: string
}

// HR Set Configuration (Heart Rate Zone Training)
export interface WorkoutHRSet {
  id: string
  block_id: string                     // Links to workout block
  exercise_id: string                   // Links to exercise from library
  exercise_order: number                // Order of exercise within block
  hr_zone?: number                      // Heart rate zone (1-5). Either hr_zone OR hr_percentage_min/max must be set
  hr_percentage_min?: number            // Minimum heart rate percentage (50-100)
  hr_percentage_max?: number            // Maximum heart rate percentage (50-100)
  is_intervals: boolean                 // True for interval training, false for continuous
  duration_seconds?: number             // Duration for continuous sessions (required when is_intervals = false)
  work_duration_seconds?: number        // Work duration for interval rounds (required when is_intervals = true)
  rest_duration_seconds?: number        // Rest duration for interval rounds (required when is_intervals = true)
  target_rounds?: number                // Target number of intervals (required when is_intervals = true)
  rounds_completed?: number             // Actual rounds completed during workout execution
  distance_meters?: number               // Distance covered (optional, for running/cycling/rowing)
  average_hr_percentage?: number        // Average heart rate percentage for the session/interval
  created_at: string
  updated_at?: string
}

// UI Helper Types
export interface WorkoutBlockConfig {
  type: WorkoutBlockType
  name: string
  description: string
  icon: string
  color: string
  requiresMultipleExercises: boolean
  supportsTimeProtocols: boolean
  supportsHRSets: boolean              // NEW: Supports HR sets
  supportsDropSets: boolean
  supportsClusterSets: boolean
  supportsPyramidSets: boolean
  supportsRestPause: boolean
  supportsLadder: boolean
}

// Live Workout Execution Types
export interface LiveWorkoutBlock {
  block: WorkoutBlock
  currentExerciseIndex: number
  currentSetIndex: number
  isCompleted: boolean
  startTime?: Date
  endTime?: Date
  completedSets: number
  totalSets: number
}

export interface LiveWorkoutExercise {
  exercise: WorkoutBlockExercise
  currentSet: number
  completedSets: number
  totalSets: number
  isCompleted: boolean
  loggedSets: LoggedSet[]
}

export interface LoggedSet {
  id: string
  exercise_id: string
  block_id: string
  set_number: number
  weight_kg?: number
  reps_completed?: number
  rir?: number
  tempo?: string
  rest_seconds?: number
  notes?: string
  completed_at: Date
}

// Block Type Configurations
export const WORKOUT_BLOCK_CONFIGS: Record<WorkoutBlockType, WorkoutBlockConfig> = {
  straight_set: {
    type: 'straight_set',
    name: 'Straight Set',
    description: 'Traditional sets with rest between each set',
    icon: '📋',
    color: 'blue',
    requiresMultipleExercises: false,
    supportsTimeProtocols: false,
    supportsHRSets: false,
    supportsDropSets: false,
    supportsClusterSets: false,
    supportsPyramidSets: false,
    supportsRestPause: false,
    supportsLadder: false
  },
  superset: {
    type: 'superset',
    name: 'Superset',
    description: 'Two exercises performed back-to-back with rest after the pair',
    icon: '⚡',
    color: 'orange',
    requiresMultipleExercises: true,
    supportsTimeProtocols: false,
    supportsHRSets: false,
    supportsDropSets: true,
    supportsClusterSets: true,
    supportsPyramidSets: true,
    supportsRestPause: false,
    supportsLadder: false
  },
  giant_set: {
    type: 'giant_set',
    name: 'Giant Set',
    description: 'Three or more exercises performed back-to-back',
    icon: '🔥',
    color: 'red',
    requiresMultipleExercises: true,
    supportsTimeProtocols: false,
    supportsHRSets: false,
    supportsDropSets: false,
    supportsClusterSets: false,
    supportsPyramidSets: false,
    supportsRestPause: false,
    supportsLadder: false
  },
  drop_set: {
    type: 'drop_set',
    name: 'Drop Set',
    description: 'Reduce weight and continue without rest',
    icon: '📉',
    color: 'purple',
    requiresMultipleExercises: false,
    supportsTimeProtocols: false,
    supportsHRSets: false,
    supportsDropSets: true,
    supportsClusterSets: false,
    supportsPyramidSets: false,
    supportsRestPause: false,
    supportsLadder: false
  },
  cluster_set: {
    type: 'cluster_set',
    name: 'Cluster Set',
    description: 'Short rests between clusters within a set',
    icon: '🔗',
    color: 'indigo',
    requiresMultipleExercises: false,
    supportsTimeProtocols: false,
    supportsHRSets: false,
    supportsDropSets: false,
    supportsClusterSets: true,
    supportsPyramidSets: false,
    supportsRestPause: false,
    supportsLadder: false
  },
  rest_pause: {
    type: 'rest_pause',
    name: 'Rest-Pause Set',
    description: 'Brief rest-pause between efforts with same weight',
    icon: '⏸️',
    color: 'teal',
    requiresMultipleExercises: false,
    supportsTimeProtocols: false,
    supportsHRSets: false,
    supportsDropSets: false,
    supportsClusterSets: false,
    supportsPyramidSets: false,
    supportsRestPause: true,
    supportsLadder: false
  },
  pyramid_set: {
    type: 'pyramid_set',
    name: 'Pyramid Set',
    description: 'Progressive weight/rep schemes',
    icon: '🔺',
    color: 'green',
    requiresMultipleExercises: false,
    supportsTimeProtocols: false,
    supportsHRSets: false,
    supportsDropSets: false,
    supportsClusterSets: false,
    supportsPyramidSets: true,
    supportsRestPause: false,
    supportsLadder: false
  },
  pre_exhaustion: {
    type: 'pre_exhaustion',
    name: 'Pre-Exhaustion',
    description: 'Isolation exercise followed by compound movement',
    icon: '🎯',
    color: 'pink',
    requiresMultipleExercises: true,
    supportsTimeProtocols: false,
    supportsHRSets: false,
    supportsDropSets: false,
    supportsClusterSets: false,
    supportsPyramidSets: false,
    supportsRestPause: false,
    supportsLadder: false
  },
  amrap: {
    type: 'amrap',
    name: 'AMRAP',
    description: 'As Many Rounds As Possible in given time',
    icon: '🚀',
    color: 'yellow',
    requiresMultipleExercises: false,
    supportsTimeProtocols: true,
    supportsHRSets: false,
    supportsDropSets: false,
    supportsClusterSets: false,
    supportsPyramidSets: false,
    supportsRestPause: false,
    supportsLadder: false
  },
  emom: {
    type: 'emom',
    name: 'EMOM',
    description: 'Every Minute On the Minute protocol',
    icon: '⏰',
    color: 'cyan',
    requiresMultipleExercises: false,
    supportsTimeProtocols: true,
    supportsHRSets: false,
    supportsDropSets: false,
    supportsClusterSets: false,
    supportsPyramidSets: false,
    supportsRestPause: false,
    supportsLadder: false
  },
  tabata: {
    type: 'tabata',
    name: 'Tabata',
    description: '20 seconds work, 10 seconds rest protocol',
    icon: '⚡',
    color: 'amber',
    requiresMultipleExercises: false,
    supportsTimeProtocols: true,
    supportsHRSets: false,
    supportsDropSets: false,
    supportsClusterSets: false,
    supportsPyramidSets: false,
    supportsRestPause: false,
    supportsLadder: false
  },
  circuit: {
    type: 'circuit',
    name: 'Circuit',
    description: 'Circuit training with variable timing per exercise',
    icon: '🔄',
    color: 'violet',
    requiresMultipleExercises: true,
    supportsTimeProtocols: true,
    supportsHRSets: false,
    supportsDropSets: false,
    supportsClusterSets: false,
    supportsPyramidSets: false,
    supportsRestPause: false,
    supportsLadder: false
  },
  for_time: {
    type: 'for_time',
    name: 'For Time',
    description: 'Complete all exercises as fast as possible',
    icon: '🏃',
    color: 'rose',
    requiresMultipleExercises: false,
    supportsTimeProtocols: true,
    supportsHRSets: false,
    supportsDropSets: false,
    supportsClusterSets: false,
    supportsPyramidSets: false,
    supportsRestPause: false,
    supportsLadder: false
  },
  hr_sets: {
    type: 'hr_sets',
    name: 'HR Sets',
    description: 'Heart rate zone training for aerobic endurance',
    icon: '❤️',
    color: 'red',
    requiresMultipleExercises: false,
    supportsTimeProtocols: false,
    supportsHRSets: true,
    supportsDropSets: false,
    supportsClusterSets: false,
    supportsPyramidSets: false,
    supportsRestPause: false,
    supportsLadder: false
  },
  ladder: {
    type: 'ladder',
    name: 'Ladder',
    description: 'Ascending or descending rep schemes',
    icon: '🪜',
    color: 'emerald',
    requiresMultipleExercises: false,
    supportsTimeProtocols: false,
    supportsHRSets: false,
    supportsDropSets: false,
    supportsClusterSets: false,
    supportsPyramidSets: false,
    supportsRestPause: false,
    supportsLadder: true
  }
}
