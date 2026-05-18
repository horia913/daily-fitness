import type { SupabaseClient } from "@supabase/supabase-js";
import type { AthleteScore } from "@/types/athleteScore";
import type { CoachAthleteScoreBundle } from "@/types/coachAthleteScore";
import { getCurrentWeekBoundsForClient } from "@/lib/weekBounds";
import { normalizeClientTimezone } from "@/lib/clientZonedCalendar";

const SCORE_SELECT =
  "id, client_id, score, tier, training_score, training_completion_score, training_execution_score, recovery_score, recovery_sleep_score, recovery_steps_score, nutrition_score, extras_score, window_start, window_end, calculated_at";

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
    recovery_score: num("recovery_score"),
    recovery_sleep_score: num("recovery_sleep_score"),
    recovery_steps_score: num("recovery_steps_score"),
    nutrition_score: num("nutrition_score") ?? 0,
    extras_score: num("extras_score") ?? 0,
    window_start: String(row.window_start ?? ""),
    window_end: String(row.window_end ?? ""),
    calculated_at: String(row.calculated_at ?? ""),
  };
}

export async function fetchCoachAthleteScoreBundle(
  supabaseAdmin: SupabaseClient,
  clientId: string,
): Promise<CoachAthleteScoreBundle> {
  const [{ data: scoreRows }, { data: assignment }, { data: profile }] = await Promise.all([
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
    supabaseAdmin
      .from("profiles")
      .select("timezone, sleep_target_hours, steps_target")
      .eq("id", clientId)
      .maybeSingle(),
  ]);

  const rows = (scoreRows ?? []) as Record<string, unknown>[];
  const latest = rows[0] ? mapScoreRow(rows[0]) : null;
  const prior = rows[1] ? mapScoreRow(rows[1]) : null;

  const tz =
    normalizeClientTimezone(profile?.timezone) ||
    normalizeClientTimezone(assignment?.timezone_snapshot) ||
    "UTC";
  const week = getCurrentWeekBoundsForClient(tz);

  const sleepTarget =
    profile?.sleep_target_hours != null && Number(profile.sleep_target_hours) > 0
      ? Number(profile.sleep_target_hours)
      : 7;
  const stepsTarget =
    profile?.steps_target != null && Number(profile.steps_target) > 0
      ? Number(profile.steps_target)
      : 8000;

  const { data: wellnessRows } = await supabaseAdmin
    .from("daily_wellness_logs")
    .select("sleep_hours, steps")
    .eq("client_id", clientId)
    .gte("log_date", week.mondayYmd)
    .lte("log_date", week.sundayYmd);

  let sleepSum = 0;
  let sleepCount = 0;
  let stepsSum = 0;
  let stepsCount = 0;
  for (const w of wellnessRows ?? []) {
    const sh = w.sleep_hours != null ? Number(w.sleep_hours) : null;
    if (sh != null && Number.isFinite(sh)) {
      sleepSum += sh;
      sleepCount += 1;
    }
    const st = w.steps != null ? Number(w.steps) : null;
    if (st != null && Number.isFinite(st)) {
      stepsSum += st;
      stepsCount += 1;
    }
  }

  return {
    latest,
    prior,
    hasActiveProgram: assignment != null,
    paused: assignment?.pause_status === "paused",
    sleepTargetHours: sleepTarget,
    stepsTarget,
    avgSleepHours: sleepCount > 0 ? sleepSum / sleepCount : null,
    avgSteps: stepsCount > 0 ? stepsSum / stepsCount : null,
  };
}
