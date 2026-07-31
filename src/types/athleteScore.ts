export type AthleteScoreTierKey =
  | "beast_mode"
  | "locked_in"
  | "showing_up"
  | "slipping"
  | "benched";

/**
 * Latest `athlete_scores` row. Training-only score over rolling 14 days:
 * `training_completion_score` (70%) + `training_execution_score` (30%).
 */
export interface AthleteScore {
  id?: string;
  client_id?: string;
  score: number;
  tier: AthleteScoreTierKey;
  training_score: number | null;
  training_completion_score: number | null;
  training_execution_score: number | null;
  window_start: string;
  window_end: string;
  calculated_at: string;
}

export type AthleteScoreCalculateResult =
  | ({ skipped: false } & AthleteScore)
  | {
      skipped: true;
      reason: "paused" | "no_program" | "no_data";
    };

export interface AthleteScoreTier {
  key: string;
  label: string;
  minScore: number;
  maxScore: number;
  color: string;
  colorEnd: string;
  emoji: string;
}

export const ATHLETE_TIERS: AthleteScoreTier[] = [
  { key: "beast_mode", label: "Beast Mode", minScore: 90, maxScore: 100, color: "#0369A1", colorEnd: "#BEF264", emoji: "🏆" },
  { key: "locked_in", label: "Locked In", minScore: 75, maxScore: 89, color: "#EA580C", colorEnd: "#EF4444", emoji: "🔥" },
  { key: "showing_up", label: "Showing Up", minScore: 55, maxScore: 74, color: "#06B6D4", colorEnd: "#0EA5E9", emoji: "⚡" },
  { key: "slipping", label: "Slipping", minScore: 35, maxScore: 54, color: "#F59E0B", colorEnd: "#D97706", emoji: "⚠️" },
  { key: "benched", label: "Benched", minScore: 0, maxScore: 34, color: "#374151", colorEnd: "#4B5563", emoji: "💤" },
];
