/** Server marks `idle_session` after this many minutes (see gym-console/status route). */
export const SERVER_IDLE_MINUTES = 15;

/** UI “stalled” chrome: lifting client idle longer than this since last set (client-side). */
export const STALLED_MINUTES_UI = 5;

export function minutesSinceIso(iso: string | null | undefined, nowMs: number = Date.now()): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return (nowMs - t) / 60_000;
}

/**
 * Stalled when actively lifting and either server says idle_session (≥ SERVER_IDLE_MINUTES)
 * or last set was more than STALLED_MINUTES_UI ago. Prescribed rest is not available on this payload.
 */
export function isLiftingStalled(
  status: "active_session" | "idle_session" | "no_session" | "no_program" | "program_completed",
  lastSetLoggedAt: string | null | undefined,
  serverIsIdle?: boolean,
  nowMs: number = Date.now()
): boolean {
  if (status !== "active_session" && status !== "idle_session") return false;
  if (status === "idle_session") return true;
  const mins = minutesSinceIso(lastSetLoggedAt ?? null, nowMs);
  if (mins != null && mins > STALLED_MINUTES_UI) return true;
  if (serverIsIdle === true) return true;
  return false;
}

export function formatShortRelative(iso: string | null | undefined, nowMs: number = Date.now()): string {
  if (!iso) return "—";
  const mins = minutesSinceIso(iso, nowMs);
  if (mins == null) return "—";
  if (mins < 1) return `${Math.max(0, Math.floor(mins * 60))}s`;
  if (mins < 60) return `${Math.floor(mins)}m`;
  const h = Math.floor(mins / 60);
  const m = Math.floor(mins % 60);
  return `${h}h ${m}m`;
}

export function formatUpdatedLabel(secondsAgo: number | null): string {
  if (secondsAgo == null) return "Updated —";
  if (secondsAgo < 5) return "Updated just now";
  if (secondsAgo < 60) return `Updated ${secondsAgo}s ago`;
  const m = Math.floor(secondsAgo / 60);
  return `Updated ${m}m ago`;
}

export function formatNameFirstLastInitial(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "Client";
  if (parts.length === 1) return parts[0];
  const last = parts[parts.length - 1];
  return `${parts[0]} ${last.charAt(0)}.`;
}
