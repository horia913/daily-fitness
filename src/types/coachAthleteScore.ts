import type { AthleteScoreTierKey } from "@/types/athleteScore";

/** Coach dashboard list chip / summary (latest persisted row). */
export type CoachAthleteScoreSummary = {
  score: number;
  tier: AthleteScoreTierKey | string;
  paused: boolean;
  /** Latest row timestamp — used for list staleness (additive). */
  calculated_at?: string;
};

export type CoachAthleteScoreBundle = {
  latest: import("@/types/athleteScore").AthleteScore | null;
  prior: import("@/types/athleteScore").AthleteScore | null;
  hasActiveProgram: boolean;
  paused: boolean;
};
