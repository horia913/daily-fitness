import type { ScoreBreakdownComponent } from "@/components/client-ui/ScoreBreakdown";
import type { AthleteScore } from "@/types/athleteScore";
import { supabase } from "@/lib/supabase";

export type AthleteScoreWeekTrends = {
  adherence: number;
  execution: number;
};

export function buildAthleteScoreBreakdownComponents(
  athleteScore: AthleteScore,
  trends?: AthleteScoreWeekTrends,
): ScoreBreakdownComponent[] {
  return [
    {
      label: "Adherence",
      value:
        athleteScore.training_completion_score != null
          ? Math.round(athleteScore.training_completion_score)
          : null,
      delta: trends?.adherence,
      hint: "Program workouts completed vs scheduled in rolling 14 days",
    },
    {
      label: "Execution",
      value:
        athleteScore.training_execution_score != null
          ? Math.round(athleteScore.training_execution_score)
          : null,
      delta: trends?.execution,
      hint:
        athleteScore.training_execution_score != null
          ? "Sets on target vs prescribed in the rolling 14-day window"
          : "Shows after logged sets",
    },
  ];
}

/** Week-over-week deltas from the two most recent athlete_scores rows. */
export async function fetchAthleteScoreWeekTrends(
  userId: string,
): Promise<AthleteScoreWeekTrends | undefined> {
  const { data: rows } = await supabase
    .from("athlete_scores")
    .select("training_completion_score, training_execution_score, calculated_at")
    .eq("client_id", userId)
    .order("window_start", { ascending: false })
    .limit(2);

  const r = rows ?? [];
  if (r.length < 2) return undefined;

  const a = r[0] as Record<string, unknown>;
  const b = r[1] as Record<string, unknown>;
  const d = (k: string) => {
    const av = a[k];
    const bv = b[k];
    if (av == null || bv == null) return 0;
    return Math.round(Number(av) - Number(bv));
  };

  return {
    adherence: d("training_completion_score"),
    execution: d("training_execution_score"),
  };
}
