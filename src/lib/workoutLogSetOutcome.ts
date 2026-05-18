import type { PrescribedSetReference } from "@/types/workoutLog";

export type DimensionOutcome = PrescribedSetReference["outcome"];

/** Reps: hit ≥0.95×P, under ≥0.80×P, miss <0.80×P, over >1.10×P */
export function repsOutcome(
  actual: number | null,
  prescribed: number | null
): DimensionOutcome {
  if (prescribed == null || prescribed <= 0 || actual == null) return "neutral";
  if (actual > prescribed * 1.1) return "over";
  if (actual >= prescribed * 0.95) return "hit";
  if (actual >= prescribed * 0.8) return "under";
  return "miss";
}

/** Weight: within ±max(2.5 kg, 5% of prescribed) → hit */
export function weightOutcome(
  actual: number | null,
  prescribed: number | null
): DimensionOutcome {
  if (prescribed == null || actual == null) return "neutral";
  const tol = Math.max(2.5, Math.abs(prescribed) * 0.05);
  if (Math.abs(actual - prescribed) <= tol) return "hit";
  if (actual < prescribed - tol) return "under";
  return "over";
}

/** RPE vs prescribed RIR: within ±1 → hit, else flag */
export function rpeVsPrescribedRirOutcome(
  actualRpe: number | null,
  prescribedRir: number | null
): DimensionOutcome {
  if (prescribedRir == null || actualRpe == null) return "neutral";
  if (Math.abs(actualRpe - prescribedRir) <= 1) return "hit";
  return "flag";
}

const PRIORITY: Record<NonNullable<DimensionOutcome>, number> = {
  miss: 5,
  flag: 4,
  over: 3,
  under: 2,
  hit: 1,
  neutral: 0,
};

/** Single row outcome for actual-side coloring (worst signal wins). */
export function consolidateRowOutcome(
  reps: DimensionOutcome,
  weight: DimensionOutcome,
  rpe: DimensionOutcome
): NonNullable<DimensionOutcome> {
  const dims = [reps, weight, rpe].filter((d): d is NonNullable<DimensionOutcome> => d != null);
  if (dims.length === 0) return "neutral";
  let best: NonNullable<DimensionOutcome> = "neutral";
  let bestP = -1;
  for (const d of dims) {
    const p = PRIORITY[d] ?? 0;
    if (p > bestP) {
      bestP = p;
      best = d;
    }
  }
  return best;
}

export function worstOfOutcomes(
  a: NonNullable<DimensionOutcome>,
  b: NonNullable<DimensionOutcome>
): NonNullable<DimensionOutcome> {
  return (PRIORITY[a] ?? 0) >= (PRIORITY[b] ?? 0) ? a : b;
}

export type StrengthSetScalars = {
  actualReps: number | null;
  prescribedReps: number | null;
  actualWeightKg: number | null;
  prescribedWeightKg: number | null;
  actualRpe: number | null;
  prescribedRir: number | null;
};

/**
 * Single source of truth for "on target" in aggregate adherence counts.
 * Aligns with prescribed-vs-actual row coloring (non-miss, non-flag outcomes
 * after consolidation: hit, under, or over).
 */
export function isSetOnTarget(s: StrengthSetScalars): boolean {
  const row = consolidateRowOutcome(
    repsOutcome(s.actualReps, s.prescribedReps),
    weightOutcome(s.actualWeightKg, s.prescribedWeightKg),
    rpeVsPrescribedRirOutcome(s.actualRpe, s.prescribedRir)
  );
  return row === "hit" || row === "under" || row === "over";
}
