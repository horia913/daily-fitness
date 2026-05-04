/**
 * staleData — v4 Stale-data helper (§6.10)
 *
 * Spec ref: design-system-v4 §6.10 Stale-data text.
 *   fresh:  0–14 days        → --fc-text-subtle
 *   aging:  15–60 days       → --fc-status-warning
 *   stale:  60+ days, "Never"→ --fc-status-error
 *
 * Pure function. No React, no DB, no side effects. Returns a discriminator
 * the UI can pass to <span class="stale-data" data-staleness={staleness}>
 * and a formatted human-readable label.
 *
 * Phase 0a: additive only.
 */

export type Staleness = "fresh" | "aging" | "stale";

export interface StaleDataResult {
  staleness: Staleness;
  /** Whole-day delta from `lastSeen` to `now`. `null` if input is null/invalid (treated as "Never"). */
  daysSince: number | null;
  /** Human-readable label, e.g. "Today", "3 days ago", "2 weeks ago", "9w ago", "Never". */
  label: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function diffWholeDays(later: Date, earlier: Date): number {
  const a = startOfLocalDay(later).getTime();
  const b = startOfLocalDay(earlier).getTime();
  return Math.round((a - b) / MS_PER_DAY);
}

function formatRelativeLabel(days: number): string {
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks}w ago`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  }
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

/**
 * Compute staleness of a "last activity" / "last seen" date.
 *
 * @param lastSeen  Last activity timestamp. `null` / `undefined` → "stale" + "Never".
 *                  Strings are parsed via `new Date(...)`; invalid → "stale" + "Never".
 * @param now       Reference "now" date (default: current time). Useful for tests.
 */
export function staleData(
  lastSeen: Date | string | null | undefined,
  now: Date = new Date()
): StaleDataResult {
  if (lastSeen === null || lastSeen === undefined || lastSeen === "") {
    return { staleness: "stale", daysSince: null, label: "Never" };
  }

  const d = lastSeen instanceof Date ? lastSeen : new Date(lastSeen);
  if (Number.isNaN(d.getTime())) {
    return { staleness: "stale", daysSince: null, label: "Never" };
  }

  const days = Math.max(0, diffWholeDays(now, d));
  const label = formatRelativeLabel(days);

  if (days <= 14) return { staleness: "fresh", daysSince: days, label };
  if (days <= 60) return { staleness: "aging", daysSince: days, label };
  return { staleness: "stale", daysSince: days, label };
}
