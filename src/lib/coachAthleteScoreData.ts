import type { SupabaseClient } from "@supabase/supabase-js";
import type { AthleteScore } from "@/types/athleteScore";
import type { CoachAthleteScoreBundle } from "@/types/coachAthleteScore";
import { nullIfStaleAthleteScore } from "@/lib/athleteScoreFreshness";

const SCORE_SELECT =
  "id, client_id, score, tier, training_score, training_completion_score, training_execution_score, window_start, window_end, calculated_at";

function mapScoreRow(row: Record<string, unknown>): AthleteScore {
  const num = (k: string): number | null => {
    const v = row[k];
    if (v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  return {
    id: typeof row.id === "string" ? row.id : undefined,
    client_id: typeof row.client_id === "string" ? row.client_id : undefined,
    score: Number(row.score),
    tier: (typeof row.tier === "string" ? row.tier : "benched") as AthleteScore["tier"],
    training_score: num("training_score"),
    training_completion_score: num("training_completion_score"),
    training_execution_score: num("training_execution_score"),
    window_start: String(row.window_start ?? ""),
    window_end: String(row.window_end ?? ""),
    calculated_at: String(row.calculated_at ?? ""),
  };
}

export async function fetchCoachAthleteScoreBundle(
  supabaseAdmin: SupabaseClient,
  clientId: string,
): Promise<CoachAthleteScoreBundle> {
  const [{ data: scoreRows }, { data: assignment }] = await Promise.all([
    supabaseAdmin
      .from("athlete_scores")
      .select(SCORE_SELECT)
      .eq("client_id", clientId)
      .order("calculated_at", { ascending: false })
      .limit(2),
    supabaseAdmin
      .from("program_assignments")
      .select("pause_status, timezone_snapshot")
      .eq("client_id", clientId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const rows = (scoreRows ?? []) as Record<string, unknown>[];
  const latest = rows[0] ? nullIfStaleAthleteScore(mapScoreRow(rows[0])) : null;
  const prior = rows[1] ? mapScoreRow(rows[1]) : null;

  return {
    latest,
    prior,
    hasActiveProgram: assignment != null,
    paused: assignment?.pause_status === "paused",
  };
}
