/**
 * Resolves how many "program weeks" to show for progress UI and reports.
 * Matches the coach program editor: block weeks are authoritative when present.
 */

/** Sum of `training_blocks.duration_weeks` for the program; null if none or sum is 0. */
export function sumTrainingBlockWeeksFromRows(
  rows: { duration_weeks: number | null }[] | null | undefined
): number | null {
  if (!rows?.length) return null;
  const sum = rows.reduce((s, r) => s + Math.max(0, Number(r.duration_weeks) || 0), 0);
  return sum > 0 ? sum : null;
}

export type ResolveProgramTotalDisplayWeeksArgs = {
  sumTrainingBlockWeeks: number | null;
  assignmentDurationWeeks: number | null | undefined;
  assignmentTotalDays: number | null | undefined;
};

/**
 * Authoritative program length for coach/client UI and PDF reports.
 * Order: SUM(training_blocks.duration_weeks) → program_assignments.duration_weeks
 * → ceil(total_days / 7) → 1.
 */
export function resolveProgramTotalDisplayWeeks(
  args: ResolveProgramTotalDisplayWeeksArgs
): number {
  const fromBlocks = args.sumTrainingBlockWeeks;
  if (fromBlocks != null && fromBlocks > 0) return fromBlocks;
  const fromPa = args.assignmentDurationWeeks;
  if (fromPa != null && fromPa > 0) return fromPa;
  const td = args.assignmentTotalDays;
  if (td != null && td > 0) return Math.max(1, Math.ceil(Number(td) / 7));
  return 1;
}
