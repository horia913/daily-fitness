import type { ClientMetrics } from "@/lib/coachDashboardService";
import type { CoachAthleteScoreSummary } from "@/types/coachAthleteScore";
import type { ClientTrainingStatusKind } from "@/lib/coachClientListTrainingStatus";

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
  priorWeekScheduledCount: number;
  priorWeekCompletedCount: number;
  currentWeekCompletedCount: number;
  currentWeekScheduledPastCount: number;
  /** First name for dialogs (from profile when present). */
  firstName?: string | null;
}
