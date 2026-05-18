import type { AttentionLevel } from "@/lib/coachClientAttention";
import { daysSinceIsoDate } from "@/lib/coachClientAttention";
import type { ClientMetrics } from "@/lib/coachDashboardService";
import type { ClientAvatarSeverity } from "@/components/coach/dashboard/ClientAvatar";
import type { ClientTrainingStatusKind } from "@/lib/coachClientListTrainingStatus";
import type { Client } from "./coachClientsTypes";

export type CoachClientRosterStatus = Client["status"];

export type CoachClientVisualTier = "critical" | "warning" | "new" | "good";

/** Sort / bell / quick-filter: clients worth surfacing on the roster. */
export function coachClientNeedsTrainingAttention(
  trainingStatus: ClientTrainingStatusKind,
): boolean {
  return (
    trainingStatus === "missed_week" ||
    trainingStatus === "behind" ||
    trainingStatus === "paused" ||
    trainingStatus === "no_program"
  );
}

export function coachClientTrainingAttentionSortKey(
  trainingStatus: ClientTrainingStatusKind,
): number {
  switch (trainingStatus) {
    case "missed_week":
      return 0;
    case "behind":
      return 1;
    case "paused":
      return 2;
    case "no_program":
      return 3;
    default:
      return 10;
  }
}

/** List/grid row border + avatar severity from training + roster (not check-ins). */
export function coachClientListVisualTierFromTraining(
  rosterStatus: Client["status"],
  trainingStatus: ClientTrainingStatusKind,
): CoachClientVisualTier {
  if (rosterStatus === "pending") return "new";
  if (rosterStatus === "inactive") return "warning";
  if (trainingStatus === "paused") return "good";
  if (trainingStatus === "missed_week") return "critical";
  if (trainingStatus === "behind") return "warning";
  if (trainingStatus === "no_program") return "new";
  return "good";
}

/**
 * Maps existing `computeClientAttention` output + roster status to list/grid chrome tiers.
 * Does not change attention rules — only presentation grouping.
 */
export function coachClientVisualTier(
  status: CoachClientRosterStatus,
  attentionLevel: AttentionLevel,
  metrics: Pick<ClientMetrics, "lastActive" | "lastCheckinDate">
): CoachClientVisualTier {
  if (attentionLevel === "urgent") return "critical";
  if (attentionLevel === "warning") return "warning";
  if (attentionLevel === "good") return "good";
  if (attentionLevel === "inactive") {
    if (status === "pending") return "new";
    if (!metrics.lastCheckinDate && !metrics.lastActive) return "new";
    return "warning";
  }
  return "warning";
}

export function coachClientAvatarSeverity(tier: CoachClientVisualTier): ClientAvatarSeverity {
  switch (tier) {
    case "critical":
      return "critical";
    case "warning":
      return "warning";
    case "new":
      return "new";
    case "good":
    default:
      return "good";
  }
}

/** Optional pill on list/grid (hidden for `good`). */
export function coachClientSeverityTagLabel(
  tier: CoachClientVisualTier,
  attention: { reasons: string[] },
  metrics: ClientMetrics
): string | null {
  if (tier === "good") return null;
  if (tier === "new") return "New";
  if (tier === "critical") {
    if (!metrics.lastActive) return "No activity";
    const dc = daysSinceIsoDate(metrics.lastCheckinDate);
    if (dc != null && dc >= 14) return "Critical";
    const r = attention.reasons[0];
    return r && r.length <= 22 ? r : "Critical";
  }
  if (metrics.programStatus === "noProgram") return "No program";
  const da = daysSinceIsoDate(metrics.lastActive);
  if (da != null && da >= 7) return "Idle";
  const r = attention.reasons[0];
  return r && r.length <= 22 ? r : "Review";
}
