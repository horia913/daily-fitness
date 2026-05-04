/**
 * deadlineUrgency — v4 Deadline-urgency helper (§6.9)
 *
 * Spec ref: design-system-v4 §6.9 Deadline urgency text.
 *   overdue:  days < 0       → --fc-status-error
 *   imminent: 0–3 days       → --fc-status-warning
 *   soon:     4–14 days      → --fc-text-dim
 *   distant:  >14 days       → --fc-text-subtle
 *   none:     no deadline    → --fc-text-subtle
 *
 * Pure function. No React, no DB, no side effects. Returns a discriminator
 * the UI can pass to <span class="deadline" data-urgency={urgency}> and a
 * formatted human-readable label.
 *
 * Phase 0a: additive only.
 */

export type DeadlineUrgency =
  | "overdue"
  | "imminent"
  | "soon"
  | "distant"
  | "none";

export interface DeadlineUrgencyResult {
  urgency: DeadlineUrgency;
  /** Whole-day delta. Negative = past, 0 = today, positive = future. */
  daysRemaining: number | null;
  /** Human-readable label, e.g. "3 days left", "Today", "2 days overdue", "No deadline". */
  label: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function diffWholeDays(target: Date, now: Date): number {
  const t = startOfLocalDay(target).getTime();
  const n = startOfLocalDay(now).getTime();
  return Math.round((t - n) / MS_PER_DAY);
}

/**
 * Compute deadline urgency for a target date.
 *
 * @param deadline  The deadline. `null` / `undefined` → "none".
 *                  Strings are parsed via `new Date(...)`; invalid → "none".
 * @param now       Reference "now" date (default: current time). Useful for tests.
 */
export function deadlineUrgency(
  deadline: Date | string | null | undefined,
  now: Date = new Date()
): DeadlineUrgencyResult {
  if (deadline === null || deadline === undefined || deadline === "") {
    return { urgency: "none", daysRemaining: null, label: "No deadline" };
  }

  const d = deadline instanceof Date ? deadline : new Date(deadline);
  if (Number.isNaN(d.getTime())) {
    return { urgency: "none", daysRemaining: null, label: "No deadline" };
  }

  const days = diffWholeDays(d, now);

  if (days < 0) {
    const abs = Math.abs(days);
    return {
      urgency: "overdue",
      daysRemaining: days,
      label: abs === 1 ? "1 day overdue" : `${abs} days overdue`,
    };
  }
  if (days === 0) {
    return { urgency: "imminent", daysRemaining: 0, label: "Due today" };
  }
  if (days <= 3) {
    return {
      urgency: "imminent",
      daysRemaining: days,
      label: days === 1 ? "1 day left" : `${days} days left`,
    };
  }
  if (days <= 14) {
    return {
      urgency: "soon",
      daysRemaining: days,
      label: `${days} days left`,
    };
  }
  return {
    urgency: "distant",
    daysRemaining: days,
    label: `${days} days left`,
  };
}
