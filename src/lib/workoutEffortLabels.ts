/**
 * Per-set effort tier — UI-1 / BE-1 (workout-exec-v6).
 *
 * Stored RPE (1-10) maps to one of four buttons (Easy / Medium / Hard / Max).
 * Bands use RPE upper bounds:
 *   - Easy   ≤ 4   (button writes RPE 4)
 *   - Medium ≤ 6   (button writes RPE 6)
 *   - Hard   ≤ 8   (button writes RPE 8)
 *   - Max    ≤ 10  (button writes RPE 10)
 *
 * Existing logged data (RPE values across full 1-10 from old UI) stays as-is.
 * The new band mapping just changes how stored values display.
 */

export type EffortTier = "easy" | "medium" | "hard" | "max";

const EFFORT_TIER_LABEL: Record<EffortTier, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  max: "Max",
};

/** Stored RPE → tier key. NULL / non-positive / NaN → null. */
export function rpeToEffortTier(
  rpe: number | null | undefined,
): EffortTier | null {
  if (rpe == null || Number.isNaN(Number(rpe))) return null;
  const n = Math.round(Number(rpe));
  if (n <= 0) return null;
  if (n <= 4) return "easy";
  if (n <= 6) return "medium";
  if (n <= 8) return "hard";
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
  if (avgRpe == null || avgRpe <= 0) return null;
  return formatEffortSuffix(Math.round(avgRpe));
}
