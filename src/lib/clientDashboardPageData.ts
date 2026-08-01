/**
 * Shared dashboard page data: single RPC `get_client_dashboard` + mapping.
 * Used by `/client` and `/client/me` (score insights) so fetch logic stays one place.
 *
 * `todaysWorkout` is overwritten in TS with weekWindows foundation next-due
 * (same `resolveNextDue` as Train) — the RPC fill-gap field is not used for display.
 */

import { supabase } from "@/lib/supabase";
import { getLatestMeasurement } from "@/lib/measurementService";
import { getClientCheckInConfig } from "@/lib/checkInConfigService";
import { nullIfStaleAthleteScore } from "@/lib/athleteScoreFreshness";
import type { AthleteScore } from "@/types/athleteScore";
import { ATHLETE_TIERS } from "@/types/athleteScore";
import type { DailyWellnessLog } from "@/lib/wellnessService";
import { loadInstancePhases } from "@/lib/programInstance/instanceCanvasLoad";
import {
  buildPhaseWeekRanges,
  clientPhaseChipLabel,
  resolvePhaseForAbsoluteWeek,
} from "@/lib/clientInstancePhaseContext";
import { instanceTotalWeeks, isCoachSkipNote } from "@/lib/programInstanceResolver";
import { normalizeClientTimezone } from "@/lib/clientZonedCalendar";
import { resolveNextDue } from "@/lib/progression/resolveNextDue";
import type { PauseState, WorkoutRef } from "@/lib/progression/weekWindows";

export type AthleteScoreChipState = "default" | "paused" | "no_program";

/** Home chip: placeholder only when the client has no persisted athlete_scores row. */
export function resolveAthleteScoreChipState(
  athleteScore: AthleteScore | null,
  activeAssignmentPauseStatus: string | null | undefined,
): AthleteScoreChipState {
  if (athleteScore == null) return "no_program";
  if (activeAssignmentPauseStatus === "paused") return "paused";
  return "default";
}

export interface DashboardData {
  avatarUrl: string | null;
  firstName: string | null;
  streak: number;
  /**
   * Program-scoped “this week” workout counts from the active assignment only
   * (see RPC `get_client_dashboard` / migration `20260407_get_client_dashboard_program_counters.sql`):
   * - `goal` = number of `program_schedule` rows in the **current program week**
   *   (week resolved from `program_progress.current_week_number`).
   * - `current` = count of **completed** `workout_sessions` linked to that assignment
   *   and a `program_schedule_id` in that same week’s slots.
   * Not read from user_settings / arbitrary weekly goals when an active program exists.
   */
  weeklyProgress: {
    current: number;
    goal: number;
  };
  todaysWorkout: {
    hasWorkout: boolean;
    type?: "program" | "assignment";
    name?: string;
    weekNumber?: number;
    dayNumber?: number;
    /** Workout template UUID when assigned (RPC `templateId`). */
    templateId?: string;
    assignmentId?: string;
    scheduleId?: string;
    estimatedDuration?: number | null;
    totalSets?: number | null;
  };
  programProgress?: {
    currentWeek: number;
    totalWeeks: number;
    completedCount: number;
    totalSlots: number;
    percent: number;
    currentPhaseLabel?: string | null;
    weekWithinPhase?: number | null;
  };
  /** Latest active `program_assignments.pause_status` (parallel read; matches RPC active-assignment scope). */
  activeProgramPauseStatus?: string | null;
  /** Home / Me chip: no active program, paused program, or normal. */
  athleteScoreChipState?: AthleteScoreChipState;
  highlights?: {
    prsThisMonth: number;
    latestAchievement: { name: string; icon: string | null; tier: string | null } | null;
    bestLeaderboardRank: { rank: number; exerciseName?: string | null } | null;
  };
}

export interface DashboardPageData {
  dashboard: DashboardData | null;
  athleteScore: AthleteScore | null;
  hasCheckInToday: boolean | null;
  todayWellnessLog: DailyWellnessLog | null;
  checkinStreak: number;
  hasScheduledCheckInThisPeriod: boolean;
  scoreError: string | null;
}

/** Map `get_client_dashboard` athleteScore JSON (camelCase) or DB-shaped rows to AthleteScore. */
export function mapRpcAthleteScore(
  raw: Record<string, unknown> | null | undefined,
): AthleteScore | null {
  if (!raw || typeof raw.score !== "number") return null;

  const num = (camel: string, snake: string): number | null => {
    const v = raw[camel] ?? raw[snake];
    if (v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const tierRaw = typeof raw.tier === "string" ? raw.tier : "benched";
  const tier = (ATHLETE_TIERS.some((x) => x.key === tierRaw) ? tierRaw : "benched") as AthleteScore["tier"];

  return {
    id: typeof raw.id === "string" ? raw.id : undefined,
    score: raw.score as number,
    tier,
    training_score: num("trainingScore", "training_score"),
    training_completion_score: num("trainingCompletionScore", "training_completion_score"),
    training_execution_score: num("trainingExecutionScore", "training_execution_score"),
    window_start: String(raw.windowStart ?? raw.window_start ?? ""),
    window_end: String(raw.windowEnd ?? raw.window_end ?? ""),
    calculated_at: String(raw.calculatedAt ?? raw.calculated_at ?? ""),
  };
}

/** Tier from API when valid; otherwise infer from score so the ring matches ATHLETE_TIERS bands. */
export function tierForAthleteScoreRow(row: AthleteScore): string {
  const t = row.tier;
  if (t && ATHLETE_TIERS.some((x) => x.key === t)) return t;
  const band = ATHLETE_TIERS.find(
    (x) => row.score >= x.minScore && row.score <= x.maxScore,
  );
  return band?.key ?? "benched";
}

export function mapDashboardRpcResponse(
  rpc: Record<string, unknown> | null,
  hasScheduledCheckInThisPeriod: boolean,
): DashboardPageData {
  if (!rpc) {
    return {
      dashboard: null,
      athleteScore: null,
      hasCheckInToday: null,
      todayWellnessLog: null,
      checkinStreak: 0,
      hasScheduledCheckInThisPeriod,
      scoreError: null,
    };
  }

  const dashboard: DashboardData | null = {
    avatarUrl: (rpc.avatarUrl as string) ?? null,
    firstName: (rpc.firstName as string) ?? null,
    streak: Number(rpc.streak) ?? 0,
    weeklyProgress:
      (rpc.weeklyProgress as { current: number; goal: number }) ?? { current: 0, goal: 0 },
    todaysWorkout: (rpc.todaysWorkout as DashboardData["todaysWorkout"]) ?? { hasWorkout: false },
    programProgress: rpc.programProgress as DashboardData["programProgress"],
    highlights: rpc.highlights as DashboardData["highlights"],
  };

  const rawScore = rpc.athleteScore as Record<string, unknown> | null | undefined;
  /** Latest persisted row (any week); not gated on active program — see resolveAthleteScoreChipState. */
  const athleteScore: AthleteScore | null = nullIfStaleAthleteScore(
    mapRpcAthleteScore(rawScore),
  );

  const todayWellnessLog = (rpc.todayWellnessLog as DailyWellnessLog | null) ?? null;
  const hasCheckInToday = todayWellnessLog != null;
  const checkinStreak = Number(rpc.checkinStreak) ?? 0;

  return {
    dashboard,
    athleteScore,
    hasCheckInToday,
    todayWellnessLog,
    checkinStreak,
    hasScheduledCheckInThisPeriod,
    scoreError: null,
  };
}

type ActiveAssignmentRow = {
  id: string;
  program_id: string;
  client_id: string;
  start_date: string | null;
  pause_accumulated_days: number | null;
  pause_status: string | null;
  paused_at: string | null;
  timezone_snapshot: string | null;
};

/**
 * Foundation next-due → existing dashboard `todaysWorkout` shape (card + greeting).
 * Uses the same `resolveNextDue` helper as Train.
 */
async function computeFoundationTodaysWorkout(
  assignment: ActiveAssignmentRow,
  totalWeeks: number,
): Promise<DashboardData["todaysWorkout"]> {
  const [pdaRes, completionsRes, profileRes] = await Promise.all([
    supabase
      .from("program_day_assignments")
      .select(
        "id, week_number, program_day, workout_template_id, program_instance_workout_id, name, day_type, is_optional",
      )
      .eq("program_assignment_id", assignment.id)
      .order("week_number", { ascending: true })
      .order("program_day", { ascending: true }),
    supabase
      .from("program_day_completions")
      .select("program_day_assignment_id, notes")
      .eq("program_assignment_id", assignment.id),
    supabase
      .from("profiles")
      .select("timezone")
      .eq("id", assignment.client_id)
      .maybeSingle(),
  ]);

  if (pdaRes.error) {
    console.error("[fetchDashboardPageData] PDA:", pdaRes.error.message);
    return { hasWorkout: false };
  }
  if (completionsRes.error) {
    console.error("[fetchDashboardPageData] completions:", completionsRes.error.message);
    return { hasWorkout: false };
  }

  const completedIds = new Set<string>();
  for (const row of completionsRes.data ?? []) {
    if (isCoachSkipNote(row.notes)) continue;
    if (row.program_day_assignment_id) completedIds.add(row.program_day_assignment_id);
  }

  const slots = (pdaRes.data ?? []).filter((row) => row.day_type !== "rest");

  const snap = assignment.timezone_snapshot?.trim() || "";
  const prof =
    profileRes.data && typeof (profileRes.data as { timezone?: string }).timezone === "string"
      ? (profileRes.data as { timezone: string }).timezone.trim()
      : "";
  const timeZone = normalizeClientTimezone(snap || prof || "UTC");

  const pauses: PauseState = {
    accumulatedDays: Math.max(0, Number(assignment.pause_accumulated_days) || 0),
    pauseStatus: assignment.pause_status ?? "active",
    pausedAt: assignment.paused_at ?? null,
  };

  const workouts: WorkoutRef[] = slots
    .filter((s) => Boolean(s.workout_template_id || s.program_instance_workout_id))
    .map((s) => ({
      id: s.id,
      weekNumber: Number(s.week_number) || 1,
      programDay: Number(s.program_day) || 1,
      isDone: completedIds.has(s.id),
    }));

  const { nextDue } = resolveNextDue({
    startDate: assignment.start_date,
    totalWeeks,
    timeZone,
    pauses,
    workouts,
  });

  if (!nextDue?.id) {
    return { hasWorkout: false };
  }

  const slot = slots.find((s) => s.id === nextDue.id);
  if (!slot) {
    return { hasWorkout: false };
  }

  const templateId =
    (slot.workout_template_id && String(slot.workout_template_id)) ||
    (slot.program_instance_workout_id && String(slot.program_instance_workout_id)) ||
    undefined;

  let name =
    typeof slot.name === "string" && slot.name.trim() ? slot.name.trim() : "Workout";
  let estimatedDuration: number | null = 45;
  let totalSets: number | null = 0;

  if (slot.program_instance_workout_id) {
    const { data: iw } = await supabase
      .from("program_instance_workouts")
      .select("name, estimated_duration")
      .eq("id", slot.program_instance_workout_id)
      .maybeSingle();
    if (iw?.name) name = iw.name;
    if (iw?.estimated_duration != null) estimatedDuration = Number(iw.estimated_duration) || 45;
    const { count } = await supabase
      .from("program_instance_set_entries")
      .select("id", { count: "exact", head: true })
      .eq("program_instance_workout_id", slot.program_instance_workout_id);
    totalSets = count ?? 0;
  } else if (slot.workout_template_id) {
    const { data: wt } = await supabase
      .from("workout_templates")
      .select("name, estimated_duration")
      .eq("id", slot.workout_template_id)
      .maybeSingle();
    if (wt?.name) name = wt.name;
    if (wt?.estimated_duration != null) estimatedDuration = Number(wt.estimated_duration) || 45;
    const { count } = await supabase
      .from("workout_set_entries")
      .select("id", { count: "exact", head: true })
      .eq("template_id", slot.workout_template_id);
    totalSets = count ?? 0;
  }

  return {
    hasWorkout: true,
    type: "program",
    templateId,
    scheduleId: slot.id,
    name,
    weekNumber: nextDue.weekNumber,
    dayNumber: nextDue.programDay,
    totalSets,
    estimatedDuration,
  };
}

/**
 * Single source: `get_client_dashboard` returns streak / weekly / score / etc.
 * `todaysWorkout` is then overwritten with foundation next-due (shared with Train).
 */
export async function fetchDashboardPageData(userId: string): Promise<DashboardPageData> {
  const [{ data, error }, latestMeasurement, checkInConfig, activePaRes] = await Promise.all([
    supabase.rpc("get_client_dashboard"),
    getLatestMeasurement(userId),
    getClientCheckInConfig(userId),
    supabase
      .from("program_assignments")
      .select(
        "id, program_id, client_id, start_date, pause_accumulated_days, pause_status, paused_at, timezone_snapshot",
      )
      .eq("client_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (error) {
    if (error.message?.includes("Not authenticated")) {
      throw new Error("Unauthorized");
    }
    throw new Error(error.message || "Failed to load dashboard");
  }
  const frequencyDays = checkInConfig?.frequency_days ?? 30;
  const today = new Date();
  const hasScheduledCheckInThisPeriod =
    latestMeasurement?.measured_date != null
      ? Math.floor(
          (today.getTime() - new Date(latestMeasurement.measured_date + "T12:00:00").getTime()) /
            (1000 * 60 * 60 * 24),
        ) < frequencyDays
      : false;

  const pageData = mapDashboardRpcResponse(
    (data ?? null) as Record<string, unknown> | null,
    hasScheduledCheckInThisPeriod,
  );
  const athleteScoreChipState = resolveAthleteScoreChipState(
    pageData.athleteScore,
    activePaRes.data?.pause_status,
  );

  if (pageData.dashboard) {
    pageData.dashboard.activeProgramPauseStatus = activePaRes.data?.pause_status ?? null;
    pageData.dashboard.athleteScoreChipState = athleteScoreChipState;

    const assignment = activePaRes.data as ActiveAssignmentRow | null;
    const pp = pageData.dashboard.programProgress;

    if (assignment?.id) {
      const phases = await loadInstancePhases(supabase, assignment.id);
      const totalWeeks = instanceTotalWeeks(
        phases.map((p) => ({ duration_weeks: p.duration_weeks })),
      );

      // Overwrite RPC fill-gap todaysWorkout with foundation next-due (same as Train).
      pageData.dashboard.todaysWorkout = await computeFoundationTodaysWorkout(
        assignment,
        totalWeeks,
      );

      if (pp && pp.currentWeek >= 1) {
        const pos = resolvePhaseForAbsoluteWeek(
          pp.currentWeek,
          buildPhaseWeekRanges(phases),
        );
        if (pos) {
          pp.currentPhaseLabel = clientPhaseChipLabel(pos.range.phase);
          pp.weekWithinPhase = pos.weekWithinPhase;
        }
      }
    } else {
      pageData.dashboard.todaysWorkout = { hasWorkout: false };
    }
  }
  return pageData;
}
