/**
 * Workout set logs store the client’s effort choice as discrete RPE values (6, 8, 9, 10)
 * matching the four buttons in InlineRPERow. Map those to plain-language labels for display.
 */
export function clientEffortLabelFromStoredRpe(
  rpe: number | null | undefined,
): string | null {
  if (rpe == null || Number.isNaN(Number(rpe)) || rpe <= 0) return null;
  const n = Math.round(Number(rpe));
  if (n <= 7) return "Easy";
  if (n === 8) return "Moderate";
  if (n === 9) return "Hard";
  if (n >= 10) return "Very hard";
  return null;
}

export function formatEffortSuffix(
  rpe: number | null | undefined,
): string | null {
  const label = clientEffortLabelFromStoredRpe(rpe);
  return label ? ` · ${label}` : null;
}

/** For session-level average stored RPE (round before mapping). */
export function formatEffortSuffixFromAverage(
  avgRpe: number | null | undefined,
): string | null {
  if (avgRpe == null || avgRpe <= 0) return null;
  return formatEffortSuffix(Math.round(avgRpe));
}
