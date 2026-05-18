/**
 * Coach-facing adherence: prescribed vs actual for workout_set_logs.
 * Aggregate counts and discriminated `AdherenceBlock` list share `isSetOnTarget` thresholds
 * with row coloring (`src/lib/workoutLogSetOutcome.ts`).
 */

import type { PrescribedWorkoutReference, WorkoutLogBlock, WorkoutLogSet } from "@/types/workoutLog";
import { groupSetsIntoBlocks } from "@/lib/workoutLog/groupSetsIntoBlocks";
import {
  buildAdherenceBlocks,
  sumBlockAdherence,
  type ProtocolSlice,
  type SpeedEndurancePresc,
} from "@/lib/workoutLog/adherenceFromBlocks";
import type { AdherenceBlock } from "@/lib/workoutLog/adherenceTypes";
import type { PrescribedExerciseRow } from "@/lib/workoutLog/prescribedExerciseHelpers";
export type { PrescribedExerciseRow } from "@/lib/workoutLog/prescribedExerciseHelpers";
export {
  buildPrescriptionMaps,
  hasAnyPrescription,
  prescribedRpe,
  prescribedWeightKg,
  repsTargetMin,
} from "@/lib/workoutLog/prescribedExerciseHelpers";

export type { AdherenceBlock } from "@/lib/workoutLog/adherenceTypes";
export type { ProtocolSlice } from "@/lib/workoutLog/adherenceFromBlocks";

export type CellOutcome = "green" | "red" | "neutral";

export type AdherenceTier = "green" | "amber" | "red";

/** Minimal row from workout_set_logs — extend as queries add columns. */
export type CoachSetLogRow = {
  workout_log_id?: string | null;
  set_entry_id?: string | null;
  set_type?: string | null;
  exercise_id?: string | null;
  set_number?: number | null;
  weight?: number | string | null;
  reps?: number | null;
  rpe?: number | string | null;
  superset_exercise_a_id?: string | null;
  superset_weight_a?: number | string | null;
  superset_reps_a?: number | null;
  superset_exercise_b_id?: string | null;
  superset_weight_b?: number | string | null;
  superset_reps_b?: number | null;
  actual_time_seconds?: number | null;
  actual_distance_meters?: number | null;
  actual_hr_avg?: number | null;
  actual_speed_kmh?: number | string | null;
  giant_set_exercises?: WorkoutLogSet["giant_set_exercises"];
  dropset_initial_weight?: number | null;
  dropset_initial_reps?: number | null;
  dropset_final_weight?: number | null;
  dropset_final_reps?: number | null;
  cluster_number?: number | null;
  rest_pause_initial_weight?: number | null;
  rest_pause_initial_reps?: number | null;
  rest_pause_reps_after?: number | null;
  rest_pause_number?: number | null;
  preexhaust_isolation_exercise_id?: string | null;
  preexhaust_isolation_weight?: number | null;
  preexhaust_isolation_reps?: number | null;
  preexhaust_compound_exercise_id?: string | null;
  preexhaust_compound_weight?: number | null;
  preexhaust_compound_reps?: number | null;
  amrap_total_reps?: number | null;
  amrap_duration_seconds?: number | null;
  emom_minute_number?: number | null;
  emom_total_reps_this_min?: number | null;
  emom_total_duration_sec?: number | null;
  round_number?: number | null;
  tabata_rounds_completed?: number | null;
  tabata_total_duration_sec?: number | null;
  fortime_total_reps?: number | null;
  fortime_time_taken_sec?: number | null;
  fortime_time_cap_sec?: number | null;
  completed_at?: string | null;
};

export type WorkoutLogTotals = {
  total_weight_lifted?: number | string | null;
  total_sets_completed?: number | null;
};

export type WorkoutAdherencePrescriptions = SpeedEndurancePresc;

export type WorkoutAdherenceResult = {
  setsOnTarget: number;
  totalPrescribedSets: number;
  adherencePercent: number | null;
  tier: AdherenceTier | null;
  blocks: AdherenceBlock[];
};

export function getSetEntryId(row: CoachSetLogRow): string | null {
  const id = row.set_entry_id;
  return id && String(id).length > 0 ? String(id) : null;
}

function num(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

function numInt(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

export function adherenceTierFromPercent(
  pct: number | null | undefined
): AdherenceTier | null {
  if (pct === null || pct === undefined || Number.isNaN(pct)) return null;
  if (pct >= 80) return "green";
  if (pct >= 50) return "amber";
  return "red";
}

export function totalVolumeNumber(
  v: number | string | null | undefined
): number | null {
  return num(v);
}

export function volumeDeltaKg(
  current: WorkoutLogTotals | null | undefined,
  previous: WorkoutLogTotals | null | undefined
): number | null {
  const c = totalVolumeNumber(current?.total_weight_lifted);
  const p = totalVolumeNumber(previous?.total_weight_lifted);
  if (c === null || p === null) return null;
  return Math.round((c - p) * 10) / 10;
}

export function setsDelta(
  current: WorkoutLogTotals | null | undefined,
  previous: WorkoutLogTotals | null | undefined
): number | null {
  const c = current?.total_sets_completed;
  const p = previous?.total_sets_completed;
  if (c === null || c === undefined || p === null || p === undefined) return null;
  return c - p;
}

/**
 * Compute adherence for one workout log.
 * Pass `prescribedReference` and `protocol` when available so headers and structural evaluators match the viewer.
 */
export function computeWorkoutAdherence(
  logs: CoachSetLogRow[],
  setEntries: Array<{ id: string; set_type: string }>,
  entryExercises: Array<PrescribedExerciseRow & { set_entry_id: string }>,
  exerciseNames?: Map<string, string>,
  presc?: WorkoutAdherencePrescriptions,
  protocol?: ProtocolSlice | null,
  prescribedReference?: PrescribedWorkoutReference | null,
  blocksInput?: WorkoutLogBlock[]
): WorkoutAdherenceResult {
  const blocks =
    blocksInput && blocksInput.length > 0
      ? blocksInput
      : groupSetsIntoBlocks(logs as unknown as WorkoutLogSet[]);

  const headerByBlockId = new Map<string, string | null>();
  if (prescribedReference?.byBlockId) {
    for (const [id, ref] of Object.entries(prescribedReference.byBlockId)) {
      if (ref && typeof ref === "object" && "headerSummary" in ref) {
        headerByBlockId.set(
          id,
          ref.headerSummary != null ? String(ref.headerSummary) : null
        );
      }
    }
  }

  const adherenceBlocks = buildAdherenceBlocks(
    blocks,
    setEntries,
    entryExercises,
    exerciseNames ?? new Map(),
    presc,
    protocol ?? null,
    headerByBlockId
  );

  const { setsOnTarget, totalPrescribedSets } = sumBlockAdherence(adherenceBlocks);
  const adherencePercent =
    totalPrescribedSets > 0
      ? Math.round((setsOnTarget / totalPrescribedSets) * 1000) / 10
      : null;

  return {
    setsOnTarget,
    totalPrescribedSets,
    adherencePercent,
    tier: adherenceTierFromPercent(adherencePercent),
    blocks: adherenceBlocks,
  };
}

export function averageStraightSetPerformanceByExercise(
  logs: CoachSetLogRow[]
): Map<string, { avgWeight: number | null; avgReps: number | null; count: number }> {
  const sums = new Map<string, { wSum: number; rSum: number; n: number }>();
  for (const log of logs) {
    const st = String(log.set_type || "").toLowerCase();
    if (st !== "straight_set") continue;
    const ex = log.exercise_id;
    if (!ex) continue;
    const w = num(log.weight);
    const r = numInt(log.reps);
    if (!sums.has(ex)) sums.set(ex, { wSum: 0, rSum: 0, n: 0 });
    const row = sums.get(ex)!;
    row.n += 1;
    if (w !== null) row.wSum += w;
    if (r !== null) row.rSum += r;
  }
  const out = new Map<
    string,
    { avgWeight: number | null; avgReps: number | null; count: number }
  >();
  for (const [ex, row] of sums) {
    out.set(ex, {
      avgWeight: row.n > 0 ? Math.round((row.wSum / row.n) * 10) / 10 : null,
      avgReps: row.n > 0 ? Math.round((row.rSum / row.n) * 10) / 10 : null,
      count: row.n,
    });
  }
  return out;
}

export function deltaTone(
  delta: number | null,
  lowerIsBetter?: boolean
): "green" | "red" | "neutral" {
  if (delta === null || delta === 0 || Number.isNaN(delta)) return "neutral";
  if (lowerIsBetter) return delta < 0 ? "green" : "red";
  return delta > 0 ? "green" : "red";
}

export { isSetOnTarget } from "@/lib/workoutLogSetOutcome";
