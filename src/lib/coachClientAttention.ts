/**
 * Shared coach client attention levels for list, detail banner, and summary API.
 */

import type { CSSProperties } from "react";
import type { ClientMetrics } from "@/lib/coachDashboardService";

export type AttentionLevel = 'urgent' | 'warning' | 'good' | 'inactive';

export type ClientRosterStatus = 'active' | 'inactive' | 'pending' | 'at-risk';

function daysSinceIsoDate(isoDate: string | null): number | null {
  if (!isoDate) return null;
  const d = new Date(isoDate + 'T12:00:00Z');
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const t = new Date(today.toISOString().slice(0, 10) + 'T12:00:00Z');
  return Math.floor((t.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function computeClientAttention(
  status: ClientRosterStatus,
  metrics: ClientMetrics
): { level: AttentionLevel; reasons: string[] } {
  const reasons: string[] = [];

  if (status === 'at-risk') {
    reasons.push('Flagged at-risk (compliance)');
  }

  if (status === 'inactive' || status === 'pending') {
    return {
      level: 'inactive',
      reasons: [status === 'pending' ? 'Pending onboarding' : 'Inactive client'],
    };
  }

  if (metrics.programStatus === 'noProgram') {
    reasons.push('No program assigned');
  }

  const daysSinceWorkoutOrTouch = daysSinceIsoDate(metrics.lastActive);
  const daysSinceCheckin = daysSinceIsoDate(metrics.lastCheckinDate);

  if (!metrics.lastActive && status === 'active') {
    reasons.push('No recorded activity');
  }
  if (daysSinceWorkoutOrTouch != null && daysSinceWorkoutOrTouch >= 5) {
    reasons.push(`No activity in ${daysSinceWorkoutOrTouch}+ days`);
  }
  if (daysSinceCheckin != null && daysSinceCheckin >= 3) {
    reasons.push(`Check-in ${daysSinceCheckin}d ago`);
  }

  if (
    metrics.programStatus === 'active' &&
    metrics.workoutsThisWeek < 2 &&
    daysSinceWorkoutOrTouch != null &&
    daysSinceWorkoutOrTouch >= 2
  ) {
    reasons.push('Behind weekly workout target');
  }

  if (metrics.mealCompliance7dPct != null && metrics.mealCompliance7dPct < 60) {
    reasons.push(`Meals ~${metrics.mealCompliance7dPct}% (7d)`);
  }

  if (metrics.latestStress != null && metrics.latestStress >= 4) {
    reasons.push('High stress');
  }
  if (metrics.latestSoreness != null && metrics.latestSoreness >= 4) {
    reasons.push('High soreness');
  }

  const hasUrgent =
    (!metrics.lastActive && status === 'active') ||
    (daysSinceWorkoutOrTouch != null && daysSinceWorkoutOrTouch >= 5) ||
    (daysSinceCheckin != null && daysSinceCheckin >= 3);

  if (hasUrgent) {
    return { level: 'urgent', reasons: reasons.length ? reasons : ['Needs attention'] };
  }

  if (metrics.programStatus === 'noProgram' && reasons.length <= 1) {
    return { level: 'inactive', reasons };
  }

  if (
    reasons.some((r) => r.includes('Behind')) ||
    reasons.some((r) => r.startsWith('Meals')) ||
    reasons.includes('High stress') ||
    reasons.includes('High soreness')
  ) {
    return { level: 'warning', reasons: reasons.length ? reasons : ['Review client'] };
  }

  if (metrics.programStatus === 'noProgram') {
    return { level: 'inactive', reasons };
  }

  if (status === 'at-risk') {
    return { level: 'warning', reasons: reasons.length ? reasons : ['Review client'] };
  }

  return { level: 'good', reasons: [] };
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

/** Dashboard roster: same attention rules without weekly workout count (avoids false "behind target"). */
export function computeClientAttentionFromSummary(summary: {
  status: string;
  lastWorkoutDate: string | null;
  lastCheckinDate: string | null;
  checkinStreak: number;
  hasActiveProgram: boolean;
  latestStress: number | null;
  latestSoreness: number | null;
}): { level: AttentionLevel; reasons: string[] } {
  const lastActive = summary.lastWorkoutDate ?? summary.lastCheckinDate;
  const rosterStatus: ClientRosterStatus =
    summary.status === 'pending'
      ? 'pending'
      : summary.status === 'inactive'
        ? 'inactive'
        : summary.status === 'at-risk'
          ? 'at-risk'
          : 'active';

  const metrics: ClientMetrics = {
    clientId: '',
    lastActive,
    workoutsThisWeek: 99,
    checkinStreak: summary.checkinStreak,
    programStatus: summary.hasActiveProgram ? 'active' : 'noProgram',
    programEndDate: null,
    latestStress: summary.latestStress,
    latestSoreness: summary.latestSoreness,
    trainedToday: false,
    checkedInToday: false,
    activeProgramName: null,
    programCurrentWeek: null,
    programDurationWeeks: null,
    mealCompliance7dPct: null,
    lastCheckinDate: summary.lastCheckinDate,
    weekReviewNeeded: false,
    completedWeekNumber: null,
    activeProgramId: null,
    activeProgramAssignmentId: null,
    subscriptionEndDate: null,
    subscriptionExpiringSoon: false,
  };

  return computeClientAttention(rosterStatus, metrics);
}
