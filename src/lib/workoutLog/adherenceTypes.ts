import type { WorkoutLogBlockType } from "@/types/workoutLog";
import type { DimensionOutcome } from "@/lib/workoutLogSetOutcome";

/** Per-dimension + consolidated row outcome for log viewer rows. */
export type SetOutcome = {
  setNumber: number;
  reps: DimensionOutcome;
  weight: DimensionOutcome;
  rpe: DimensionOutcome;
  row: NonNullable<DimensionOutcome>;
  /** When false, the row is shown without hit/miss coloring (e.g. drop completions). */
  applyRowColor: boolean;
  /**
   * Coach log: rest-pause continuation (or other non-graded) rows — muted row + badge in UI.
   * Does not affect adherence counts.
   */
  informationalRowBadge?: string | null;
};

export type PrescribedSetReferenceLite = {
  prescribedReps: number | null;
  prescribedWeightKg: number | null;
  prescribedRpe: number | null;
};

export type ActualSetReferenceLite = {
  setNumber: number;
  actualReps: number | null;
  actualWeightKg: number | null;
  actualRpe: number | null;
};

export interface PerSetAdherenceBlock {
  kind: "per_set";
  setEntryId: string;
  setType: WorkoutLogBlockType;
  exerciseIds: string[];
  exerciseNames: string[];
  headerSummary: string | null;
  /** Parallel to `block.sets` — row-level outcomes for the card / aggregate. */
  setOutcomes: SetOutcome[];
  setsOnTargetCount: number;
  totalPrescribedSets: number;
}

export interface TimeBlockAdherenceBlock {
  kind: "time_block";
  setEntryId: string;
  setType: "amrap" | "emom" | "tabata" | "for_time";
  exerciseIds: string[];
  exerciseNames: string[];
  headerSummary: string | null;
  prescribedDurationSeconds: number | null;
  prescribedRounds: number | null;
  prescribedRepsPerRound: number | null;
  prescribedTargetReps: number | null;
  prescribedTimeCapSeconds: number | null;
  prescribedEmomMinutes: number | null;
  actualRounds: number;
  actualReps: number;
  actualDurationSeconds: number | null;
  completed: boolean;
  dnf: boolean;
  /** Per-minute or per-round outcomes for EMOM / Tabata when applicable */
  intervalOutcomes: SetOutcome[];
  setsOnTargetCount: number;
  totalPrescribedSets: number;
}

export interface SpeedEnduranceAdherenceBlock {
  kind: "speed_endurance";
  setEntryId: string;
  setType: "speed_work" | "endurance";
  exerciseIds: string[];
  exerciseNames: string[];
  headerSummary: string | null;
  prescribedDurationSeconds: number | null;
  prescribedDistanceMeters: number | null;
  prescribedSpeedKmh: number | null;
  prescribedHrPercentage: number | null;
  actualDurationSeconds: number | null;
  actualDistanceMeters: number | null;
  actualSpeedKmh: number | null;
  actualHrPercentage: number | null;
  intervalOutcomes: SetOutcome[];
  setsOnTargetCount: number;
  totalPrescribedSets: number;
}

export type AdherenceBlock =
  | PerSetAdherenceBlock
  | TimeBlockAdherenceBlock
  | SpeedEnduranceAdherenceBlock;
