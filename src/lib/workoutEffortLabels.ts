/**
 * Per-set effort tier — prescribed + logged RPE (6–10).
 *
 * Bands:
 *   - Easy   = 6
 *   - Medium = 7
 *   - Hard   = 8–9
 *   - Max    = 10
 *
 * RPE < 6 or null → no tier (blank). Logged picker writes band representatives
 * (easy:6, medium:7, hard:9, max:10) into workout_set_logs.rpe.
 */

export type EffortTier = "easy" | "medium" | "hard" | "max";

const EFFORT_TIER_LABEL: Record<EffortTier, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  max: "Max",
};

/** Stored RPE → tier key. NULL / < 6 / NaN → null. */
export function rpeToEffortTier(
  rpe: number | null | undefined,
): EffortTier | null {
  if (rpe == null || Number.isNaN(Number(rpe))) return null;
  const n = Math.round(Number(rpe));
  if (n < 6) return null;
  if (n === 6) return "easy";
  if (n === 7) return "medium";
  if (n <= 9) return "hard";
  return "max";
}

/** Stored RPE → display label ("Easy" / "Medium" / "Hard" / "Max" / null). */
export function clientEffortLabelFromStoredRpe(
  rpe: number | null | undefined,
): string | null {
  const tier = rpeToEffortTier(rpe);
  return tier ? EFFORT_TIER_LABEL[tier] : null;
}

/** " · Easy" / " · Hard" / null — for inline suffixes after weight × reps. */
export function formatEffortSuffix(
  rpe: number | null | undefined,
): string | null {
  const label = clientEffortLabelFromStoredRpe(rpe);
  return label ? ` · ${label}` : null;
}

/** Session-level average RPE → tier suffix; rounds before mapping. */
export function formatEffortSuffixFromAverage(
  avgRpe: number | null | undefined,
): string | null {
  if (avgRpe == null || Number.isNaN(Number(avgRpe))) return null;
  const n = Math.round(Number(avgRpe));
  if (n < 6) return null;
  return formatEffortSuffix(n);
}
