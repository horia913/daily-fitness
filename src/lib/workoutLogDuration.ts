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

function wallMinutesBetween(
  startedAt: string | null | undefined,
  completedAt: string | null | undefined,
): number | null {
  if (!startedAt || !completedAt) return null;
  const a = Date.parse(startedAt);
  const b = Date.parse(completedAt);
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return null;
  return Math.round((b - a) / 60000);
}

/**
 * Display / persist duration: prefer set-span (coach parity), recover wall clock when
 * sets were stamped in a rapid burst during a longer sane session, ignore absurd
 * multi-day wall clocks (app left open).
 */
export function resolveWorkoutDisplayDurationMinutes(opts: {
  storedMinutes?: number | null;
  startedAt?: string | null;
  completedAt?: string | null;
  setCompletedAts?: Array<string | null | undefined>;
}): number | null {
  const fromSets = durationMinutesFromSetCompletedAts(opts.setCompletedAts ?? []);
  const storedRaw =
    opts.storedMinutes != null && Number.isFinite(Number(opts.storedMinutes))
      ? Math.round(Number(opts.storedMinutes))
      : null;
  const stored =
    storedRaw != null && storedRaw > 0
      ? Math.min(storedRaw, MAX_WALL_CLOCK_SESSION_MINUTES)
      : null;
  const wallRaw = wallMinutesBetween(opts.startedAt, opts.completedAt);
  const wallSane =
    wallRaw != null &&
    wallRaw >= 1 &&
    wallRaw <= MAX_WALL_CLOCK_SESSION_MINUTES
      ? wallRaw
      : null;

  const shortSignal = Math.max(fromSets ?? 0, stored ?? 0);
  // Rapid set stamps during a longer open session → trust wall clock.
  if (
    wallSane != null &&
    shortSignal > 0 &&
    wallSane >= Math.max(shortSignal * 2, shortSignal + 5)
  ) {
    return wallSane;
  }

  if (fromSets != null) return fromSets;
  if (stored != null) return Math.max(1, stored);
  if (wallSane != null) return wallSane;
  return null;
}

/**
 * Value to write on workout complete — same signals as display resolution.
 */
export function resolveWorkoutPersistDurationMinutes(opts: {
  clientPassedMinutes?: number | null;
  startedAt?: string | null;
  completedAt: Date;
  setCompletedAts: Array<string | null | undefined>;
}): number {
  const resolved = resolveWorkoutDisplayDurationMinutes({
    storedMinutes: opts.clientPassedMinutes,
    startedAt: opts.startedAt,
    completedAt: opts.completedAt.toISOString(),
    setCompletedAts: opts.setCompletedAts,
  });
  if (resolved != null && resolved > 0) return resolved;
  return clampedWallClockSessionMinutes(opts.startedAt, opts.completedAt);
}
