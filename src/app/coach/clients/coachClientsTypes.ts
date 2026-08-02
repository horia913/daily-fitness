import type { ClientMetrics } from "@/lib/coachDashboardService";
import type { CoachAthleteScoreSummary } from "@/types/coachAthleteScore";
import type { ClientTrainingStatusKind } from "@/lib/coachClientListTrainingStatus";
import type {
  CoachAttentionLevel,
  CoachAttentionReason,
} from "@/lib/coachAttention";

export interface Client {
  id: string;
  client_id?: string;
  name: string;
  email: string;
  avatar?: string;
  status: "active" | "inactive" | "pending" | "at-risk";
  metrics: ClientMetrics;
  athleteScore: CoachAthleteScoreSummary | null;
  pauseStatus: "active" | "paused";
  hasActiveProgram: boolean;
  activeProgramAssignmentId: string | null;
  trainingStatus: ClientTrainingStatusKind;
  /** Foundation: any in-scope missed (list API). */
  hasMissed?: boolean;
  hasFullyMissedPastWeek?: boolean;
  priorWeekScheduledCount: number;
  priorWeekCompletedCount: number;
  currentWeekCompletedCount: number;
  currentWeekScheduledPastCount: number;
  /** Canonical attention from classifyCoachClientAttention (list API). */
  attention?: {
    level: CoachAttentionLevel;
    reasons: CoachAttentionReason[];
  };
  /** First name for dialogs (from profile when present). */
  firstName?: string | null;
  /** Active meal plan display name (list API additive). */
  mealPlanName?: string | null;
  /** True when persisted score predates last activity (list API additive). */
  scoreIsStale?: boolean;
  /** Private standing coach note (list API; never exposed to client apps). */
  standingNote?: string | null;
  /** Earliest upcoming workout session date (YYYY-MM-DD) for active assignment. */
  nextSessionDate?: string | null;
}
