import type { WorkoutSetLog } from "./workoutSetLogTypes";

export type { WorkoutSetLog };

export type CompleteAccent = "lime" | "cyan" | "purple" | "warning";

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
};
