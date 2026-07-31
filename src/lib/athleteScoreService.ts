/** Athlete Score — training-only (completion + execution, rolling 14 days). */

import { SupabaseClient } from "@supabase/supabase-js";
import type { AthleteScore, AthleteScoreCalculateResult, AthleteScoreTierKey } from "@/types/athleteScore";
import { nullIfStaleAthleteScore } from "@/lib/athleteScoreFreshness";
import { getActiveProgramAssignment } from "@/lib/programStateService";
import { computeProgramAthleteScore } from "@/lib/athleteScoreScoringPure";
import { getWorkoutAdherenceHistory } from "@/lib/workoutAdherenceHistoryService";
import { batchAdherenceForWorkoutLogs } from "@/lib/coachClientSummaryServer";

export function getTier(score: number): AthleteScoreTierKey {
  if (score >= 90) return "beast_mode";
  if (score >= 75) return "locked_in";
  if (score >= 55) return "showing_up";
  if (score >= 35) return "slipping";
  return "benched";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const SCORE_SELECT =
  "id, client_id, score, tier, training_score, training_completion_score, training_execution_score, window_start, window_end, calculated_at";

export async function calculateAthleteScore(
  clientId: string,
  supabaseAdmin: SupabaseClient
): Promise<AthleteScoreCalculateResult> {
  const assignment = await getActiveProgramAssignment(supabaseAdmin, clientId);
  if (!assignment?.id || !assignment.program_id) {
    return { skipped: true, reason: "no_program" };
  }

  if (assignment.pause_status === "paused") {
    return { skipped: true, reason: "paused" };
  }

  const endYmd = new Date().toISOString().slice(0, 10);
  const startDate = new Date(`${endYmd}T12:00:00Z`);
  startDate.setUTCDate(startDate.getUTCDate() - 13);
  const startYmd = startDate.toISOString().slice(0, 10);

  const history = await getWorkoutAdherenceHistory(clientId, {
    db: supabaseAdmin,
    startDate: startYmd,
    endDate: endYmd,
  });

  const windowDays = history.days.filter((d) => d.date >= startYmd && d.date <= endYmd);
  const scheduled = windowDays.reduce((sum, d) => sum + d.scheduled, 0);
  const completed = windowDays.reduce(
    (sum, d) => sum + (d.scheduled > 0 ? Math.min(d.completed, d.scheduled) : 0),
    0,
  );

  if (scheduled <= 0) {
    return { skipped: true, reason: "no_data" };
  }

  const completionPct = Math.round((completed / scheduled) * 100);

  const { data: logRows, error: logsErr } = await supabaseAdmin
    .from("workout_logs")
    .select("id")
    .eq("client_id", clientId)
    .eq("program_assignment_id", assignment.id)
    .not("completed_at", "is", null)
    .gte("completed_at", `${startYmd}T00:00:00.000Z`)
    .lte("completed_at", `${endYmd}T23:59:59.999Z`);

  if (logsErr) {
    throw new Error(`Failed to load workout logs for execution score: ${logsErr.message}`);
  }
  const workoutLogIds = (logRows ?? []).map((r) => r.id as string).filter(Boolean);
  let executionPct: number | null = null;
  if (workoutLogIds.length > 0) {
    const byLog = await batchAdherenceForWorkoutLogs(supabaseAdmin, clientId, workoutLogIds);
    const executionValues = Object.values(byLog)
      .map((row) => row.adherencePercent)
      .filter((v): v is number => v != null && Number.isFinite(v));
    if (executionValues.length > 0) {
      executionPct = Math.round(
        executionValues.reduce((sum, value) => sum + value, 0) / executionValues.length,
      );
    }
  }

  const completionScore = round2(completionPct);
  const executionScore = executionPct != null ? round2(executionPct) : null;
  const finalScore = computeProgramAthleteScore(completionPct, executionPct);
  const tier = getTier(finalScore);
  const calculatedAt = new Date().toISOString();

  const rowPayload = {
    client_id: clientId,
    score: finalScore,
    tier,
    /** Mirrors composite score for legacy readers. */
    training_score: finalScore,
    /** Adherence % (completed / scheduled required slots, canonical ledger). */
    training_completion_score: completionScore,
    /** Execution % (sets on target / prescribed, instance prescriptions). */
    training_execution_score: executionScore,
    window_start: startYmd,
    window_end: endYmd,
    calculated_at: calculatedAt,
  };

  const { data: saved, error } = await supabaseAdmin
    .from("athlete_scores")
    .upsert(rowPayload, { onConflict: "client_id,window_start,window_end" })
    .select(SCORE_SELECT)
    .single();

  if (error) {
    console.error("[athleteScoreService] upsert error:", error);
    throw new Error(`Failed to save athlete score: ${error.message}`);
  }

  return { skipped: false as const, ...(saved as AthleteScore) };
}

export async function getLatestAthleteScore(
  clientId: string,
  supabase: SupabaseClient
): Promise<AthleteScore | null> {
  const { data, error } = await supabase
    .from("athlete_scores")
    .select(SCORE_SELECT)
    .eq("client_id", clientId)
    .order("calculated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[athleteScoreService] getLatestAthleteScore:", error);
    return null;
  }
  return nullIfStaleAthleteScore(data as AthleteScore | null);
}

export async function getAthleteScoreHistory(
  clientId: string,
  supabase: SupabaseClient,
  limit = 4
): Promise<{ date: string; score: number }[]> {
  const { data, error } = await supabase
    .from("athlete_scores")
    .select("score, calculated_at")
    .eq("client_id", clientId)
    .order("window_start", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return [...data]
    .reverse()
    .map((row) => ({
      date: (row.calculated_at as string).split("T")[0],
      score: row.score as number,
    }));
}
