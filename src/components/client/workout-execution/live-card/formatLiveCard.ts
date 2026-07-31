/**
 * Format rest seconds as m:ss for the live-card stats strip.
 * Empty / non-positive → null (caller shows —).
 */
export function formatLiveRest(seconds: number | null | undefined): string | null {
  if (seconds == null || !Number.isFinite(Number(seconds)) || Number(seconds) <= 0) {
    return null;
  }
  const s = Math.round(Number(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

/**
 * Prescribed rest only — first positive candidate wins.
 * No defaults (no 60 / 90 / 30). Null / 0 / missing → 0 (no rest).
 */
export function resolveRestSeconds(
  ...candidates: Array<number | null | undefined>
): number {
  for (const raw of candidates) {
    if (raw == null) continue;
    const n = Math.floor(Number(raw));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

/**
 * Format last-session hint as "reps × weight" (mockup grammar).
 * Date lives on the last-session card header — keep this one-line for the stats strip.
 */
export function formatLiveLast(
  reps: number | string | null | undefined,
  weight: number | string | null | undefined,
): string | null {
  const r =
    reps != null && String(reps).trim() !== "" && String(reps) !== "—"
      ? String(reps).trim()
      : null;
  const w =
    weight != null && String(weight).trim() !== "" && Number(weight) >= 0
      ? String(weight).trim()
      : null;
  if (r && w) return `${r} × ${w}`;
  if (r) return `${r} reps`;
  if (w) return `${w} kg`;
  return null;
}

/** Short date for Last stat — e.g. "Jul 10". */
export function formatLiveLastDate(
  date: string | null | undefined,
): string | null {
  if (!date || !String(date).trim()) return null;
  const d = new Date(date);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Last-session duration hint — e.g. "50 s". */
export function formatLiveLastDuration(
  seconds: number | null | undefined,
): string | null {
  if (seconds == null || !Number.isFinite(Number(seconds)) || Number(seconds) <= 0) {
    return null;
  }
  return `${Math.round(Number(seconds))} s`;
}

/** Last-session distance hint — e.g. "400 m". */
export function formatLiveLastDistance(
  meters: number | null | undefined,
): string | null {
  if (meters == null || !Number.isFinite(Number(meters)) || Number(meters) <= 0) {
    return null;
  }
  const m = Number(meters);
  if (m >= 1000) return `${Number((m / 1000).toFixed(2))} km`;
  return `${Math.round(m)} m`;
}
