export type WorkoutLogBlockType =
  | "straight_set"
  | "superset"
  | "drop_set"
  | "cluster_set"
  | "giant_set"
  | "rest_pause"
  | "pre_exhaustion"
  | "amrap"
  | "emom"
  | "tabata"
  | "for_time"
  | "speed_work"
  | "endurance";

export type WorkoutLogExercise = {
  id: string;
  name: string;
  category: string | null;
};

export type WorkoutLogSet = {
  id: string;
  workout_log_id: string;
  client_id: string;
  set_entry_id: string | null;
  set_type: WorkoutLogBlockType | string | null;
  exercise_id: string | null;
  set_number: number | null;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  completed_at: string | null;
  actual_time_seconds: number | null;
  actual_distance_meters: number | null;
  actual_hr_avg: number | null;
  actual_speed_kmh: number | null;
  dropset_initial_weight: number | null;
  dropset_initial_reps: number | null;
  dropset_final_weight: number | null;
  dropset_final_reps: number | null;
  dropset_percentage: number | null;
  dropset_drops: Array<{ weight?: number | null; reps?: number | null }> | null;
  superset_exercise_a_id: string | null;
  superset_weight_a: number | null;
  superset_reps_a: number | null;
  superset_exercise_b_id: string | null;
  superset_weight_b: number | null;
  superset_reps_b: number | null;
  giant_set_exercises:
    | Array<{
        exercise_id?: string | null;
        exercise_name?: string | null;
        exercise_letter?: string | null;
        weight?: number | null;
        reps?: number | null;
      }>
    | null;
  amrap_total_reps: number | null;
  amrap_duration_seconds: number | null;
  amrap_target_reps: number | null;
  fortime_total_reps: number | null;
  fortime_time_taken_sec: number | null;
  fortime_time_cap_sec: number | null;
  fortime_target_reps: number | null;
  emom_minute_number: number | null;
  emom_total_reps_this_min: number | null;
  emom_total_duration_sec: number | null;
  round_number: number | null;
  tabata_rounds_completed: number | null;
  tabata_total_duration_sec: number | null;
  cluster_number: number | null;
  rest_pause_initial_weight: number | null;
  rest_pause_initial_reps: number | null;
  rest_pause_reps_after: number | null;
  rest_pause_number: number | null;
  rest_pause_duration: number | null;
  max_rest_pauses: number | null;
  preexhaust_isolation_exercise_id: string | null;
  preexhaust_isolation_weight: number | null;
  preexhaust_isolation_reps: number | null;
  preexhaust_compound_exercise_id: string | null;
  preexhaust_compound_weight: number | null;
  preexhaust_compound_reps: number | null;
  /** RPC / PostgREST join alias (singular). */
  exercise?: WorkoutLogExercise | null;
  /** Legacy plural join shape; prefer `exercise` when present. */
  exercises?: WorkoutLogExercise | null;
};

export type WorkoutLogBlock = {
  setEntryId: string;
  setType: WorkoutLogBlockType;
  blockOrder: number;
  exerciseIds: string[];
  exerciseNames: string[];
  sets: WorkoutLogSet[];
  roundCount?: number;
};

export type WorkoutLogSession = {
  id: string;
  startedAt: string | null;
  completedAt: string | null;
  totalDurationMinutes: number | null;
  totalSetsCompleted: number;
  totalRepsCompleted: number;
  totalWeightLifted: number;
  notes: string | null;
  overallDifficultyRating: number | null;
  perceivedEffort: number | null;
  energyLevel: number | null;
  muscleFatigueLevel: number | null;
  averageHrPercentage: number | null;
  maxHrPercentage: number | null;
  workoutName: string;
  workoutAssignmentId: string;
  workoutTemplateId: string | null;
};

export type WorkoutLogPersonalRecord = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  recordType: string;
  recordValue: number;
  recordUnit: string | null;
  previousRecordValue: number | null;
  improvementPercentage: number | null;
  achievedAt: string;
};

/** Canonical shape after RPC normalization: `get_workout_log_full` returns flat `setLogs`; callers must run `groupSetsIntoBlocks` and omit `setLogs`. */
export type WorkoutLogFullPayload = {
  session: WorkoutLogSession;
  blocks: WorkoutLogBlock[];
  personalRecords: WorkoutLogPersonalRecord[];
  previousLog?:
    | {
        totalWeightLifted: number;
        totalSetsCompleted: number;
        completedAt: string;
      }
    | null;
};

export type PrescribedSetReference = {
  prescribedReps?: number | null;
  prescribedWeightKg?: number | null;
  /** Prescribed intensity from template `rir` column (shown as RIR in UI). */
  prescribedRir?: number | null;
  /** @deprecated use prescribedRir for display; kept for older payloads */
  prescribedRpe?: number | null;
  outcome?: "hit" | "under" | "over" | "miss" | "flag" | "neutral";
  /** Superset / multi-segment prescribed cell (each segment: weight × reps @ RIR). */
  prescribedParts?: Array<{
    weightKg: number | null;
    reps: number | null;
    rir: number | null;
  }>;
  /** Prescribed cell text for speed/endurance rows when not using weight×reps. */
  prescribedLine?: string | null;
};

export type PrescribedBlockReference = {
  setEntryId?: string;
  setType: WorkoutLogBlockType;
  /** One-line summary under exercise title (built server-side). */
  headerSummary?: string | null;
  setCount?: number | null;
  prescribedReps?: number | null;
  prescribedWeightKg?: number | null;
  prescribedLoadPercent?: number | null;
  prescribedRir?: number | null;
  sets?: PrescribedSetReference[];
  /** Speed / endurance header helpers */
  prescribedSpeedDurationSec?: number | null;
  prescribedSpeedKmh?: number | null;
  prescribedEnduranceMinutes?: number | null;
  prescribedEnduranceKmh?: number | null;
};

export type PrescribedTimeBlockReference = {
  setType: "amrap" | "emom" | "tabata" | "for_time";
  headerSummary?: string | null;
  prescribedDurationSeconds?: number | null;
  prescribedRounds?: number | null;
  prescribedRepsPerRound?: number | null;
  /** EMOM clock length in minutes (from protocol / entry). */
  prescribedEmomMinutes?: number | null;
  /** for_time target reps */
  prescribedTargetReps?: number | null;
  /** for_time cap in seconds */
  prescribedTimeCapSeconds?: number | null;
};

export type PrescribedWorkoutReference = {
  byBlockId: Record<string, PrescribedBlockReference | PrescribedTimeBlockReference>;
};
