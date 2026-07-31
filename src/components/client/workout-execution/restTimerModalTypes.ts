export interface RestTimerLastSet {
  weight: number;
  reps: number;
  setNumber: number;
  totalSets: number;
  isPr?: boolean;
}

export interface RestTimerNextSetPreview {
  setNumber: number;
  totalSets: number;
  targetWeight: number | null;
  targetReps: string | null;
}
