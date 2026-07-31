/**
 * Shared coach client attention UI chrome (levels, CSS helpers).
 * Attention *rules* live in `@/lib/coachAttention` — do not reintroduce logic here.
 */

import type { CSSProperties } from "react";

export type AttentionLevel = 'urgent' | 'warning' | 'good' | 'inactive';

export type ClientRosterStatus = 'active' | 'inactive' | 'pending' | 'at-risk';

/** Days since calendar date `isoDate` (YYYY-MM-DD), non-negative; null if invalid / missing. */
export function daysSinceIsoDate(isoDate: string | null): number | null {
  if (!isoDate) return null;
  const d = new Date(isoDate + 'T12:00:00Z');
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const t = new Date(today.toISOString().slice(0, 10) + 'T12:00:00Z');
  return Math.floor((t.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function attentionLevelClass(level: AttentionLevel): string {
  switch (level) {
    case 'urgent':
      return 'fc-attention-urgent';
    case 'warning':
      return 'fc-attention-warning';
    case 'inactive':
      return 'fc-attention-inactive';
    case 'good':
      return 'fc-attention-good';
    default:
      return '';
  }
}

/**
 * Tailwind tint for surfaces where inline style is not used (e.g. dashboard roster rows).
 */
export function attentionBackdropTailwind(level: AttentionLevel): string {
  switch (level) {
    case 'urgent':
      return 'bg-red-500/[0.09] dark:bg-red-500/[0.14] border-l-0';
    case 'warning':
      return 'bg-amber-500/[0.09] dark:bg-amber-500/[0.14] border-l-0';
    case 'good':
      return 'bg-emerald-500/[0.06] dark:bg-emerald-500/[0.10] border-l-0';
    case 'inactive':
      return 'bg-neutral-500/[0.07] dark:bg-white/[0.04] border-l-0';
  }
}

/** Flat list row: left accent + subtle tint (no card / rounded surface). */
export function attentionListRowClass(level: AttentionLevel): string {
  switch (level) {
    case 'urgent':
      return 'border-l-[3px] border-l-[color:var(--fc-status-error)] bg-red-500/[0.06] dark:bg-red-500/[0.10]';
    case 'warning':
      return 'border-l-[3px] border-l-[color:var(--fc-status-warning)] bg-amber-500/[0.06] dark:bg-amber-500/[0.10]';
    case 'good':
      return 'border-l-[3px] border-l-[color:var(--fc-status-success)] bg-emerald-500/[0.05] dark:bg-emerald-500/[0.08]';
    case 'inactive':
      return 'border-l-[3px] border-l-[color:var(--fc-status-inactive)] bg-neutral-500/[0.05] dark:bg-white/[0.03]';
  }
}

/** Frame via box-shadow so nothing can read as a thick left "stripe" (border utilities stack badly on some layouts). */
const attentionCardFrame: CSSProperties = {
  border: 'none',
  boxShadow:
    '0 0 0 1px var(--fc-surface-card-border), var(--fc-shadow-card)',
};

/** Inline background so tints win over `.fc-glass` / Tailwind order issues. Uses theme tokens. */
export function attentionCardSurfaceStyle(level: AttentionLevel): CSSProperties | undefined {
  const card = 'var(--fc-surface-card)';
  switch (level) {
    case 'urgent':
      return {
        ...attentionCardFrame,
        backgroundColor: `color-mix(in srgb, var(--fc-status-error) 18%, ${card})`,
      };
    case 'warning':
      return {
        ...attentionCardFrame,
        backgroundColor: `color-mix(in srgb, var(--fc-status-warning) 18%, ${card})`,
      };
    case 'good':
      return {
        ...attentionCardFrame,
        backgroundColor: `color-mix(in srgb, var(--fc-status-success) 10%, ${card})`,
      };
    case 'inactive':
      return {
        ...attentionCardFrame,
        backgroundColor: `color-mix(in srgb, var(--fc-status-inactive) 12%, ${card})`,
      };
    default:
      return undefined;
  }
}

export function attentionPriority(level: AttentionLevel): number {
  switch (level) {
    case 'urgent':
      return 0;
    case 'warning':
      return 1;
    case 'inactive':
      return 2;
    case 'good':
      return 3;
    default:
      return 4;
  }
}
