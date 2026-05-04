export interface ClientBlockExerciseRecord {
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
  [key: string]: unknown;
}

export interface ClientBlockRecord {
  id: string;
  set_order: number | null;
  set_type: string | null;
  set_name: string | null;
  set_notes: string | null;
  total_sets: number | null;
  reps_per_set: string | null;
  rest_seconds: number | null;
  duration_seconds: number | null;
  exercises?: ClientBlockExerciseRecord[] | null;
  [key: string]: unknown;
}

export interface ClientExerciseDisplay {
  id: string;
  name: string;
  description: string;
  sets: number | null;
  reps: string | null;
  restSeconds: number | null;
  weightGuidance: string | null;
  loadPercentage: number | null;
  weight: number | null;
  orderIndex: number;
  blockName: string | null;
  blockType: string | null;
  exerciseLetter: string | null;
  notes: string | null;
  tempo: string | null;
  rir: number | null;
  raw?: ClientBlockExerciseRecord | null;
  meta?: Record<string, unknown> | null;
}

export interface StructuredBlock {
  id: string;
  blockName: string | null;
  blockType: string | null;
  blockOrder: number;
  notes: string | null;
  exercises: ClientExerciseDisplay[];
  rawBlock: ClientBlockRecord;
  parameters?: Record<string, unknown> | null;
  displayType?: string;
}
