/**
 * Types used by the workout execution start page (LiveWorkout).
 * Extracted for maintainability; do not change without updating page.tsx.
 */

export interface WorkoutAssignment {
  id: string;
  workout_template_id: string | null;
  status: string;
  notes?: string | null;
  name?: string | null;
  description?: string | null;
  scheduled_date?: string | null;
}

export interface TemplateExercise {
  id: string;
  exercise_id: string;
  order_index: number;
  sets: number;
  reps: string;
  rest_seconds: number;
  notes: string;
  exercise_type?: string;
  meta?: Record<string, unknown>;
  exercise?: {
    id: string;
    name: string;
    description: string;
    category: string;
    image_url?: string;
    video_url?: string;
  };
  completed_sets?: number;
  current_set?: number;
  [key: string]: unknown;
}

export type ClientBlockExerciseRecord = {
  id: string;
  exercise_id: string | null;
  exercise_order: number | null;
  exercise_letter: string | null;
  sets: number | null;
  reps: string | null;
  weight_kg: number | null;
  rir: number | null;
  tempo: string | null;
  rest_seconds: number | null;
  notes: string | null;
  time_protocols?: unknown[];
  drop_sets?: unknown[];
  cluster_sets?: unknown[];
  rest_pause_sets?: unknown[];
};

export type ClientBlockRecord = {
  id: string;
  set_order: number | null;
  set_type: string | null;
  set_name: string | null;
  set_notes: string | null;
  total_sets: number | null;
  reps_per_set: string | null;
  rest_seconds: number | null;
  duration_seconds?: number | null;
  block_parameters?: unknown;
  exercises?: ClientBlockExerciseRecord[] | null;
  time_protocols?: unknown[];
};
