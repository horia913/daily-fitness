import type { WorkoutSetLog } from "./workoutSetLogTypes";

export type { WorkoutSetLog };

export type CompleteAccent = "action" | "cyan" | "purple" | "warning";

export type BlockGroupLite = {
  set_entry_id: string;
  set_type: string;
  set_order: number;
  sets: WorkoutSetLog[];
  exerciseNames: Map<string, string>;
};

export type SetGroup = {
  range: { start: number; end: number };
  reps: number;
  weight: number;
  count: number;
  containsPR: boolean;
  /** set_log ids in this collapsed group (for rating). */
  setLogIds: string[];
  prescribedRpe: number | null;
  loggedRpe: number | null;
};

export type ExerciseSummaryModel = {
  key: string;
  order: number;
  exerciseId: string | null;
  name: string;
  setTypeKey: string;
  setTypeLabel: string;
  setTypeVariant: "straight" | "cluster" | "drop" | "other";
  sets: WorkoutSetLog[];
  blockType: string;
  exerciseNames: Map<string, string>;
  /** Footnote for technique (e.g. drop set note). */
  techniqueNote?: string | null;
};

/** Prescribed RPE keyed by `${set_entry_id}:${exercise_id}:${set_number}` */
export type PrescribedRpeMap = Map<string, number | null>;
