/**
 * Map canonical classifier verdict → legacy UI AttentionLevel used by Overview chrome.
 */

import type { AttentionLevel } from "@/lib/coachClientAttention";
import type {
  CoachAttentionLevel,
  CoachAttentionReason,
  CoachAttentionVerdict,
} from "./classifyCoachClientAttention";
import { formatCoachAttentionReason } from "./reasonLabels";

export function coachAttentionLevelToUi(
  level: CoachAttentionLevel
): Exclude<AttentionLevel, "inactive"> {
  switch (level) {
    case "needs_attention":
      return "urgent";
    case "monitor":
      return "warning";
    case "on_track":
    default:
      return "good";
  }
}

export function coachAttentionReasonsToLabels(
  reasons: CoachAttentionReason[]
): string[] {
  return reasons.map((r) => formatCoachAttentionReason(r));
}

/** Overview / summary API shape (string reasons for existing UI). */
export function coachAttentionVerdictToUiPayload(
  verdict: CoachAttentionVerdict,
  rosterOverride?: "inactive" | "pending" | null
): { level: AttentionLevel; reasons: string[] } {
  if (rosterOverride === "pending") {
    return { level: "inactive", reasons: ["Pending onboarding"] };
  }
  if (rosterOverride === "inactive") {
    return { level: "inactive", reasons: ["Inactive client"] };
  }
  return {
    level: coachAttentionLevelToUi(verdict.level),
    reasons: coachAttentionReasonsToLabels(verdict.reasons),
  };
}
