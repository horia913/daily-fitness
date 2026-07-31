/**
 * Canonical coach attention reason / level labels — single place for copy.
 * Classifier and UI both use these so surfaces cannot drift.
 */

import type {
  CoachAttentionLevel,
  CoachAttentionReason,
  CoachAttentionReasonCode,
} from "./classifyCoachClientAttention";

export const COACH_ATTENTION_LEVEL_LABELS: Record<CoachAttentionLevel, string> = {
  needs_attention: "Needs attention",
  monitor: "Monitor",
  on_track: "On track",
};

export function coachAttentionLevelLabel(level: CoachAttentionLevel): string {
  return COACH_ATTENTION_LEVEL_LABELS[level];
}

/** Short factual labels from code + value (classifier value when present). */
export function formatCoachAttentionReason(
  reason: Pick<CoachAttentionReason, "code" | "value">
): string {
  const code = reason.code;
  const value = reason.value;

  switch (code as CoachAttentionReasonCode) {
    case "missed_sessions": {
      const n = typeof value === "number" ? value : Number(value);
      if (Number.isFinite(n) && n > 0) {
        return n === 1
          ? "Missed 1 scheduled session"
          : `Missed ${n} scheduled sessions`;
      }
      return "Missed scheduled sessions";
    }
    case "training_inactive": {
      if (value == null) return "No training logged";
      const n = typeof value === "number" ? value : Number(value);
      if (Number.isFinite(n)) {
        return n === 1
          ? "1 day since last session"
          : `${n} days since last session`;
      }
      return "No recent training";
    }
    case "checkin_inactive": {
      if (value == null) return "Never checked in";
      const n = typeof value === "number" ? value : Number(value);
      if (Number.isFinite(n)) {
        return n === 1 ? "Check-in 1 day ago" : `Check-in ${n} days ago`;
      }
      return "Check-in inactive";
    }
    case "high_stress":
      return "High stress recently";
    case "wellness_decline":
      return "Wellness declining";
    case "low_execution": {
      const n = typeof value === "number" ? value : Number(value);
      if (Number.isFinite(n)) {
        return `Under prescribed load (${Math.round(n)}%)`;
      }
      return "Under prescribed load";
    }
    case "nutrition_low": {
      const n = typeof value === "number" ? value : Number(value);
      if (Number.isFinite(n)) {
        return `Nutrition adherence ~${Math.round(n)}%`;
      }
      return "Low nutrition adherence";
    }
    case "behind_schedule":
      return "Behind this week's schedule";
    case "prior_week_missed":
      return "Missed last week's scheduled work";
    case "paused":
      return "Program paused";
    default:
      return "Needs review";
  }
}

/** Prefer remapping from code/value so stored labels cannot drift. */
export function coachAttentionReasonDisplayLabel(
  reason: CoachAttentionReason
): string {
  return formatCoachAttentionReason(reason);
}

export function coachAttentionReasonsForCard(
  reasons: CoachAttentionReason[],
  max = 3
): string[] {
  return reasons.slice(0, max).map(coachAttentionReasonDisplayLabel);
}
