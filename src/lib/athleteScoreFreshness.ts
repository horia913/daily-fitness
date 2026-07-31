/** Freshness guard for consumers that read latest athlete_scores rows. */
export const ATHLETE_SCORE_MAX_AGE_DAYS = 7;
const ATHLETE_SCORE_MAX_AGE_MS = ATHLETE_SCORE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

export function isAthleteScoreCurrent(
  calculatedAt: string | null | undefined,
  nowMs = Date.now(),
): boolean {
  if (!calculatedAt) return false;
  const ts = Date.parse(calculatedAt);
  if (!Number.isFinite(ts)) return false;
  return nowMs - ts <= ATHLETE_SCORE_MAX_AGE_MS;
}

export function nullIfStaleAthleteScore<T extends { calculated_at?: string | null }>(
  score: T | null | undefined,
  nowMs = Date.now(),
): T | null {
  if (!score) return null;
  return isAthleteScoreCurrent(score.calculated_at, nowMs) ? score : null;
}
