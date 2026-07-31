/**
 * Pure coach attention classifier — single source of truth for Briefing, Clients list, Overview.
 * Takes precomputed signals; no I/O or side effects.
 */

import {
  COACH_ATTENTION_THRESHOLDS,
  type CoachAttentionThresholds,
} from "./thresholds";
import { formatCoachAttentionReason } from "./reasonLabels";

export type CoachAttentionLevel = "needs_attention" | "monitor" | "on_track";

export type CoachAttentionReasonCode =
  | "missed_sessions"
  | "training_inactive"
  | "checkin_inactive"
  | "high_stress"
  | "wellness_decline"
  | "low_execution"
  | "nutrition_low"
  | "behind_schedule"
  | "prior_week_missed"
  | "paused";

export type CoachAttentionReason = {
  code: CoachAttentionReasonCode;
  label: string;
  value?: string | number | null;
};

export type CoachAttentionVerdict = {
  level: CoachAttentionLevel;
  reasons: CoachAttentionReason[];
};

export type CoachAttentionSignals = {
  /** Active or paused program assignment. False → never flag. */
  hasActiveAssignment: boolean;
  assignmentPaused: boolean;
  /** Fully missed scheduled calendar days in rolling 7 (scheduled > 0 && incomplete). */
  missedScheduledDaysLast7: number;
  /** Calendar days since last trained day; null = never trained in window. */
  daysSinceLastSession: number | null;
  /** True if any scheduled (non-optional) day existed in the adherence window. */
  hadScheduledWorkInWindow: boolean;
  /** Avg sets-on-target % recent window; null = no scored logs. */
  executionPct: number | null;
  sleepTrend: "improving" | "stable" | "declining" | null;
  stressTrend: "improving" | "stable" | "worsening" | null;
  sorenessTrend: "improving" | "stable" | "worsening" | null;
  /** Latest stress UI ≥ threshold within lookback. */
  highStressRecent: boolean;
  hasMealPlan: boolean;
  /** 0–100 when known. */
  nutritionAdherencePct: number | null;
  daysSinceLastCheckIn: number | null;
  /** Softens low-execution-only flags. */
  prsLast7Days: number;
  priorWeekMissedEntirely: boolean;
  currentWeekBehindSchedule: boolean;
};

function reason(
  code: CoachAttentionReasonCode,
  value?: string | number | null
): CoachAttentionReason {
  return {
    code,
    value,
    label: formatCoachAttentionReason({ code, value }),
  };
}

/**
 * Wellness decline rule (stated):
 * Sleep trend is declining, OR both stress and soreness trends are worsening.
 * Trends are last-7 vs prior-7 (two weeks of data) from getWellnessTrends math.
 */
export function isWellnessDeclining(signals: CoachAttentionSignals): boolean {
  if (signals.sleepTrend === "declining") return true;
  return (
    signals.stressTrend === "worsening" &&
    signals.sorenessTrend === "worsening"
  );
}

export function classifyCoachClientAttention(
  signals: CoachAttentionSignals,
  thresholds: CoachAttentionThresholds = COACH_ATTENTION_THRESHOLDS
): CoachAttentionVerdict {
  if (!signals.hasActiveAssignment) {
    return { level: "on_track", reasons: [] };
  }

  const reasons: CoachAttentionReason[] = [];
  const needsCodes = new Set<CoachAttentionReasonCode>();
  const monitorCodes = new Set<CoachAttentionReasonCode>();

  const markNeeds = (r: CoachAttentionReason) => {
    needsCodes.add(r.code);
    if (!reasons.some((x) => x.code === r.code)) reasons.push(r);
  };
  const markMonitor = (r: CoachAttentionReason) => {
    monitorCodes.add(r.code);
    if (!reasons.some((x) => x.code === r.code)) reasons.push(r);
  };

  if (signals.assignmentPaused) {
    markMonitor(reason("paused"));
  }

  if (
    signals.missedScheduledDaysLast7 >=
    thresholds.missedScheduledDaysNeedsAttention
  ) {
    markNeeds(reason("missed_sessions", signals.missedScheduledDaysLast7));
  } else if (
    signals.missedScheduledDaysLast7 >= thresholds.missedScheduledDaysMonitor
  ) {
    markMonitor(reason("missed_sessions", signals.missedScheduledDaysLast7));
  }

  if (
    signals.daysSinceLastSession != null &&
    signals.daysSinceLastSession >= thresholds.inactiveTrainingDays
  ) {
    markNeeds(reason("training_inactive", signals.daysSinceLastSession));
  } else if (
    signals.daysSinceLastSession != null &&
    signals.daysSinceLastSession >= thresholds.inactiveTrainingDaysMonitor
  ) {
    markMonitor(reason("training_inactive", signals.daysSinceLastSession));
  } else if (
    signals.daysSinceLastSession == null &&
    signals.hadScheduledWorkInWindow
  ) {
    markNeeds(reason("training_inactive", null));
  }

  if (
    signals.daysSinceLastCheckIn == null ||
    signals.daysSinceLastCheckIn >= thresholds.checkInInactiveDays
  ) {
    markNeeds(reason("checkin_inactive", signals.daysSinceLastCheckIn));
  } else if (
    signals.daysSinceLastCheckIn >= thresholds.checkInInactiveDaysMonitor
  ) {
    markMonitor(reason("checkin_inactive", signals.daysSinceLastCheckIn));
  }

  if (signals.highStressRecent) {
    markNeeds(reason("high_stress"));
  }

  if (isWellnessDeclining(signals)) {
    markNeeds(reason("wellness_decline"));
  }

  const lowExecution =
    signals.executionPct != null &&
    signals.executionPct < thresholds.executionPctMin;
  // PRs soften a pure load-quality dip — don't flag on execution alone.
  if (lowExecution && signals.prsLast7Days <= 0) {
    markMonitor(reason("low_execution", signals.executionPct));
  }

  if (
    signals.hasMealPlan &&
    signals.nutritionAdherencePct != null &&
    signals.nutritionAdherencePct < thresholds.nutritionAdherencePctMin
  ) {
    markMonitor(reason("nutrition_low", signals.nutritionAdherencePct));
  }

  if (signals.priorWeekMissedEntirely) {
    markMonitor(reason("prior_week_missed"));
  }

  if (signals.currentWeekBehindSchedule) {
    markMonitor(reason("behind_schedule"));
  }

  if (needsCodes.size > 0) {
    const ordered = [
      ...reasons.filter((r) => needsCodes.has(r.code)),
      ...reasons.filter((r) => !needsCodes.has(r.code)),
    ];
    return { level: "needs_attention", reasons: ordered };
  }
  if (monitorCodes.size > 0) {
    return { level: "monitor", reasons };
  }
  return { level: "on_track", reasons: [] };
}

export function coachAttentionNeedsListFilter(
  verdict: CoachAttentionVerdict
): boolean {
  return (
    verdict.level === "needs_attention" || verdict.level === "monitor"
  );
}

export function coachAttentionSortKey(verdict: CoachAttentionVerdict): number {
  switch (verdict.level) {
    case "needs_attention":
      return 0;
    case "monitor":
      return 1;
    default:
      return 10;
  }
}
