/**
 * Athlete Score v2 — Mon–Sun client week; training core × recovery multiplier;
 * nutrition / extras bonuses scale with training adherence.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import type { AthleteScore, AthleteScoreCalculateResult, AthleteScoreTierKey } from "@/types/athleteScore";
import { getCurrentWeekBoundsForClient } from "@/lib/weekBounds";
import {
  computeCurrentProgramWeekForAssignment,
  zonedYmdFromIsoTimestamp,
} from "@/lib/programWeekCalendar";
import { normalizeClientTimezone } from "@/lib/clientZonedCalendar";
import {
  getActiveProgramAssignment,
  getProgramScheduleSlotsForAssignment,
  type ProgramAssignment,
} from "@/lib/programStateService";
import {
  averageNullable,
  computeRepsScore,
  computeRpeScore,
  computeWeightScore,
  intensityMultiplier,
} from "@/lib/athleteScoreScoringPure";

function assignmentWeekFields(pa: ProgramAssignment) {
  return {
    start_date: pa.start_date ?? null,
    duration_weeks: pa.duration_weeks ?? null,
    pause_accumulated_days: pa.pause_accumulated_days ?? null,
    pause_status: pa.pause_status ?? null,
    paused_at: pa.paused_at ?? null,
    timezone_snapshot: pa.timezone_snapshot ?? null,
  };
}

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

export async function calculateAthleteScore(
  clientId: string,
  supabaseAdmin: SupabaseClient
): Promise<AthleteScoreCalculateResult> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("timezone, sleep_target_hours, steps_target")
    .eq("id", clientId)
    .maybeSingle();

  const assignment = await getActiveProgramAssignment(supabaseAdmin, clientId);
  if (!assignment?.id || !assignment.program_id) {
    return { skipped: true, reason: "no_program" };
  }

  if (assignment.pause_status === "paused") {
    return { skipped: true, reason: "paused" };
  }

  const tz =
    normalizeClientTimezone((profile as { timezone?: string | null } | null)?.timezone) ||
    normalizeClientTimezone(assignment.timezone_snapshot) ||
    "UTC";

  const week = getCurrentWeekBoundsForClient(tz);
  const sleepTarget = Number((profile as { sleep_target_hours?: number | null } | null)?.sleep_target_hours);
  const sleepTargetH = Number.isFinite(sleepTarget) && sleepTarget > 0 ? sleepTarget : 7;
  const stepsTargetRaw = (profile as { steps_target?: number | null } | null)?.steps_target;
  const stepsTarget = typeof stepsTargetRaw === "number" && stepsTargetRaw > 0 ? stepsTargetRaw : 8000;

  const { week: ppWeek } = computeCurrentProgramWeekForAssignment(assignmentWeekFields(assignment), tz);

  const slots = await getProgramScheduleSlotsForAssignment(
    supabaseAdmin,
    assignment.program_id,
    assignment.id
  );

  const scheduledSlots = slots.filter(
    (s) =>
      s.week_number === ppWeek &&
      !s.is_optional &&
      s.id != null &&
      typeof s.template_id === "string" &&
      s.template_id.length > 0
  );

  const scheduledIds = scheduledSlots.map((s) => s.id as string);
  const scheduled = scheduledIds.length;

  if (scheduled === 0) {
    return { skipped: true, reason: "no_data" };
  }

  const { data: weekLogsRaw } = await supabaseAdmin
    .from("workout_logs")
    .select("id, program_schedule_id, completed_at")
    .eq("client_id", clientId)
    .eq("program_assignment_id", assignment.id)
    .not("completed_at", "is", null)
    .not("program_schedule_id", "is", null)
    .gte("completed_at", week.weekStartUtcIso)
    .lte("completed_at", week.weekEndUtcIso)
    .in("program_schedule_id", scheduledIds)
    .order("completed_at", { ascending: false });

  const latestBySchedule = new Map<string, { id: string; program_schedule_id: string }>();
  for (const row of weekLogsRaw ?? []) {
    const sid = row.program_schedule_id as string | null;
    if (!sid || latestBySchedule.has(sid)) continue;
    latestBySchedule.set(sid, {
      id: row.id as string,
      program_schedule_id: sid,
    });
  }

  const completed = latestBySchedule.size;
  const completionPct = Math.min(100, (completed / scheduled) * 100);

  const workoutLogIds = [...latestBySchedule.values()].map((r) => r.id);

  let executionPct: number | null = null;
  if (workoutLogIds.length > 0) {
    const { data: setRows } = await supabaseAdmin
      .from("workout_set_logs")
      .select("workout_log_id, set_entry_id, exercise_id, reps, weight, rpe, set_type")
      .in("workout_log_id", workoutLogIds)
      .eq("set_type", "straight_set");

    const straightSets = (setRows ?? []).filter((r) => r.set_entry_id && r.exercise_id) as {
      workout_log_id: string;
      set_entry_id: string;
      exercise_id: string;
      reps: number | null;
      weight: number | null;
      rpe: number | null;
    }[];

    const entryIds = [...new Set(straightSets.map((s) => s.set_entry_id))];
    let prescribeByKey = new Map<
      string,
      { reps: string | null; weight_kg: number | null; rir: number | null }
    >();
    if (entryIds.length > 0) {
      const { data: wseeRows } = await supabaseAdmin
        .from("workout_set_entry_exercises")
        .select("set_entry_id, exercise_id, reps, weight_kg, rir")
        .in("set_entry_id", entryIds);
      prescribeByKey = new Map(
        (wseeRows ?? []).map((r) => [
          `${r.set_entry_id}:${r.exercise_id}`,
          {
            reps: (r.reps as string | null) ?? null,
            weight_kg: r.weight_kg != null ? Number(r.weight_kg) : null,
            rir: r.rir != null ? Number(r.rir) : null,
          },
        ])
      );
    }

    const workoutQualities: number[] = [];
    const byLog = new Map<string, typeof straightSets>();
    for (const s of straightSets) {
      const arr = byLog.get(s.workout_log_id) ?? [];
      arr.push(s);
      byLog.set(s.workout_log_id, arr);
    }

    for (const wid of workoutLogIds) {
      const sets = byLog.get(wid) ?? [];
      const setQualities: number[] = [];
      for (const s of sets) {
        const pr = prescribeByKey.get(`${s.set_entry_id}:${s.exercise_id}`);
        if (!pr) continue;
        const repsS = computeRepsScore(s.reps, pr.reps);
        const wS = computeWeightScore(s.weight, pr.weight_kg);
        const rS = computeRpeScore(s.rpe, pr.rir);
        const parts = [repsS, wS, rS].filter((x): x is number => x != null);
        if (!parts.length) continue;
        setQualities.push(parts.reduce((a, b) => a + b, 0) / parts.length);
      }
      if (setQualities.length) {
        workoutQualities.push(
          setQualities.reduce((a, b) => a + b, 0) / setQualities.length
        );
      }
    }

    if (workoutQualities.length) {
      const avgQ =
        workoutQualities.reduce((a, b) => a + b, 0) / workoutQualities.length;
      executionPct = Math.round(avgQ * 100);
    }
  }

  const trainingCompletionScore = round2(completionPct);
  const trainingExecutionScore =
    executionPct != null ? round2(executionPct) : null;
  const trainingScore =
    executionPct == null
      ? round2(completionPct)
      : round2(completionPct * 0.6 + executionPct * 0.4);

  const { data: wellnessRows } = await supabaseAdmin
    .from("daily_wellness_logs")
    .select("log_date, sleep_hours, steps")
    .eq("client_id", clientId)
    .gte("log_date", week.mondayYmd)
    .lte("log_date", week.sundayYmd);

  const sleepScores: number[] = [];
  const stepScores: number[] = [];
  for (const row of wellnessRows ?? []) {
    const sh = row.sleep_hours != null ? Number(row.sleep_hours) : null;
    if (sh != null && Number.isFinite(sh)) {
      sleepScores.push(Math.min(100, (sh / sleepTargetH) * 100));
    }
    const st = row.steps != null ? Number(row.steps) : null;
    if (st != null && Number.isFinite(st) && stepsTarget > 0) {
      stepScores.push(Math.min(100, (st / stepsTarget) * 100));
    }
  }

  const sleepPct = averageNullable(sleepScores);
  const stepsPct = averageNullable(stepScores);

  let recoveryScore: number | null = null;
  if (sleepPct != null && stepsPct != null) {
    recoveryScore = round2(sleepPct * 0.7 + stepsPct * 0.3);
  } else if (sleepPct != null) {
    recoveryScore = round2(sleepPct);
  } else if (stepsPct != null) {
    recoveryScore = round2(stepsPct);
  }

  const recoverySleepScore = sleepPct != null ? round2(sleepPct) : null;
  const recoveryStepsScore = stepsPct != null ? round2(stepsPct) : null;

  const [{ data: mpa }, { data: amp }] = await Promise.all([
    supabaseAdmin
      .from("meal_plan_assignments")
      .select("id")
      .eq("client_id", clientId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from("assigned_meal_plans")
      .select("id")
      .eq("client_id", clientId)
      .limit(1)
      .maybeSingle(),
  ]);
  const nutritionOn = !!(mpa ?? amp);

  let nutritionScore = 0;
  if (nutritionOn) {
    const { data: meals } = await supabaseAdmin
      .from("meal_completions")
      .select("completed_at")
      .eq("client_id", clientId)
      .gte("completed_at", week.weekStartUtcIso)
      .lte("completed_at", week.weekEndUtcIso);

    const days = new Set<string>();
    for (const row of meals ?? []) {
      const iso = row.completed_at as string | null;
      if (!iso) continue;
      days.add(zonedYmdFromIsoTimestamp(iso, tz));
    }
    nutritionScore = Math.min(100, (days.size / 7) * 100);
  }

  const { data: acts } = await supabaseAdmin
    .from("client_activities")
    .select("duration_minutes, intensity")
    .eq("client_id", clientId)
    .gte("activity_date", week.mondayYmd)
    .lte("activity_date", week.sundayYmd);

  let weightedMinutes = 0;
  for (const a of acts ?? []) {
    const dm = Number(a.duration_minutes) || 0;
    weightedMinutes += dm * intensityMultiplier(a.intensity as string | null);
  }
  const extrasScore = Math.min(100, (weightedMinutes / 90) * 100);

  const trainingFactor = trainingScore / 100;
  const recoveryFactor =
    recoveryScore == null ? 1 : 0.7 + 0.3 * (recoveryScore / 100);

  const core = trainingScore * recoveryFactor;
  const nutritionBonus = nutritionScore * 0.1 * trainingFactor;
  const extrasBonus = extrasScore * 0.05 * trainingFactor;
  const finalScore = Math.round(Math.min(100, core + nutritionBonus + extrasBonus));
  const tier = getTier(finalScore);
  const calculatedAt = new Date().toISOString();

  const rowPayload = {
    client_id: clientId,
    score: finalScore,
    tier,
    training_score: trainingScore,
    training_completion_score: trainingCompletionScore,
    training_execution_score: trainingExecutionScore,
    recovery_score: recoveryScore,
    recovery_sleep_score: recoverySleepScore,
    recovery_steps_score: recoveryStepsScore,
    nutrition_score: round2(nutritionScore),
    extras_score: round2(extrasScore),
    window_start: week.mondayYmd,
    window_end: week.sundayYmd,
    calculated_at: calculatedAt,
  };

  const { data: saved, error } = await supabaseAdmin
    .from("athlete_scores")
    .upsert(rowPayload, { onConflict: "client_id,window_start,window_end" })
    .select(
      "id, client_id, score, tier, training_score, training_completion_score, training_execution_score, recovery_score, recovery_sleep_score, recovery_steps_score, nutrition_score, extras_score, window_start, window_end, calculated_at"
    )
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
    .select(
      "id, client_id, score, tier, training_score, training_completion_score, training_execution_score, recovery_score, recovery_sleep_score, recovery_steps_score, nutrition_score, extras_score, window_start, window_end, calculated_at"
    )
    .eq("client_id", clientId)
    .order("calculated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[athleteScoreService] getLatestAthleteScore:", error);
    return null;
  }
  return data as AthleteScore | null;
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
