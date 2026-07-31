/**
 * Workout group / exercise letter badges.
 * Group letter = position in the workout (0 → A, 1 → B, …).
 * Grouped exercises = letter + order (A1, A2 / B1, B2).
 *
 * DB `exercise_letter` is typically a within-block slot (A/B) or null — not used
 * as the group prefix, so two supersets don't both read as A1/A2.
 */

export function groupIndexToLetter(groupIndex: number): string {
  const i = ((Math.floor(groupIndex) % 26) + 26) % 26;
  return String.fromCharCode(65 + i);
}

/** Solo group header / single-exercise badge: `A`, `B`, … */
export function formatSoloGroupBadge(groupIndex: number): string {
  return groupIndexToLetter(groupIndex);
}

/**
 * One exercise inside a grouped set entry: `A1`, `B2`, …
 * Prefers exercise_order when present; else 1-based index.
 */
export function formatGroupedExerciseBadge(
  groupIndex: number,
  exerciseOrder: number | null | undefined,
  fallbackIndex: number,
): string {
  const letter = groupIndexToLetter(groupIndex);
  const n =
    exerciseOrder != null && Number.isFinite(Number(exerciseOrder))
      ? Math.max(1, Math.floor(Number(exerciseOrder)))
      : fallbackIndex + 1;
  return `${letter}${n}`;
}

/** Grouped header badge: range `A1–A2` (en-dash). */
export function formatGroupedHeaderBadge(
  groupIndex: number,
  exercises: Array<{ exercise_order?: number | null } | undefined>,
): string {
  if (exercises.length < 2) {
    return formatSoloGroupBadge(groupIndex);
  }
  return exercises
    .map((ex, i) =>
      formatGroupedExerciseBadge(groupIndex, ex?.exercise_order, i),
    )
    .join("\u2013");
}
