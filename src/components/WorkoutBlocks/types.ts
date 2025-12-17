export interface WorkoutBlockExerciseDisplay {
  id: string;
  name: string;
  description: string;
  sets: number | null;
  reps: string | null;
  restSeconds: number | null;
  weightGuidance: string | null;
  orderIndex: number;
  exerciseLetter: string | null;
  notes: string | null;
  raw?: Record<string, any> | null;
  meta?: Record<string, any> | null;
}

export interface WorkoutBlockDisplay {
  id: string;
  blockName: string | null;
  blockType: string | null;
  blockOrder: number;
  displayType: string;
  notes: string | null;
  exercises: WorkoutBlockExerciseDisplay[];
  rawBlock?: Record<string, any> | null;
  parameters?: Record<string, any> | null;
}

export interface BlockVariantProps {
  block: WorkoutBlockDisplay;
  index: number;
}

