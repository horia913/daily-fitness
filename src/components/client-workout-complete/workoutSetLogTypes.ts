/** Minimal set-log shape used by workout complete summary (matches page loader fields). */
export interface WorkoutSetLog {
  id: string;
  workout_log_id: string;
  set_entry_id: string;
  set_type: string;
  exercise_id: string | null;
  weight: number | null;
  reps: number | null;
  set_number: number | null;
  completed_at: string;
  dropset_initial_weight?: number | null;
  dropset_initial_reps?: number | null;
  dropset_final_weight?: number | null;
  dropset_final_reps?: number | null;
  superset_exercise_a_id?: string | null;
  superset_weight_a?: number | null;
  superset_reps_a?: number | null;
  superset_exercise_b_id?: string | null;
  superset_weight_b?: number | null;
  superset_reps_b?: number | null;
  amrap_total_reps?: number | null;
  fortime_total_reps?: number | null;
  exercises?: { id: string; name: string };
}
