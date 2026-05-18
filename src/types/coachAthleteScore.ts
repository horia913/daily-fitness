import type { AthleteScoreTierKey } from "@/types/athleteScore";

/** Coach dashboard list chip / summary (latest persisted row). */
export type CoachAthleteScoreSummary = {
  score: number;
  tier: AthleteScoreTierKey | string;
  paused: boolean;
};

export type CoachAthleteScoreBundle = {
  latest: import("@/types/athleteScore").AthleteScore | null;
  prior: import("@/types/athleteScore").AthleteScore | null;
  hasActiveProgram: boolean;
  paused: boolean;
  sleepTargetHours: number;
  stepsTarget: number;
  avgSleepHours: number | null;
  avgSteps: number | null;
};
