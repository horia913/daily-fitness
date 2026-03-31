/**
 * Workout session duration: prefer time between first/last logged set (active time),
 * not wall clock from workout_logs.started_at (often hours if the app was left open).
 */

/** Cap wall-clock fallback when set timestamps are missing (guards absurd DB values). */
export const MAX_WALL_CLOCK_SESSION_MINUTES = 300;

/**
 * Minutes from first to last set `completed_at` (inclusive). Null if fewer than 2 timestamps.
 */
export function durationMinutesFromSetCompletedAts(
  completedAts: Array<string | null | undefined>
): number | null {
  const ms = completedAts
    .map((s) => (s ? Date.parse(s) : NaN))
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => a - b);
  if (ms.length >= 2) {
    return Math.max(1, Math.round((ms[ms.length - 1] - ms[0]) / 60000));
  }
  return null;
}

/**
 * Wall-clock minutes from started_at → completedAt, clamped (for fallback only).
 */
export function clampedWallClockSessionMinutes(
  startedAt: string | null | undefined,
  completedAt: Date
): number {
  const startMs = startedAt ? Date.parse(startedAt) : completedAt.getTime();
  const raw = Math.round((completedAt.getTime() - startMs) / 60000);
  return Math.min(Math.max(raw, 1), MAX_WALL_CLOCK_SESSION_MINUTES);
}
