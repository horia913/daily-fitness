/**
 * Shared dashboard page data: single RPC `get_client_dashboard` + mapping.
 * Used by `/client` and `/client/me` (score insights) so fetch logic stays one place.
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

/**
 * Single source: `get_client_dashboard` returns everything the dashboard UI
 * needs. Its weeklyProgress / programProgress / todaysWorkout are now computed
 * from the canonical resolver + instance-keyed adherence (see the step-6 RPC
 * rewrite), so the old train-RPC-over-dashboard-RPC overlay hack is removed —
 * every surface reads the same Week X of N and adherence.
 */
export async function fetchDashboardPageData(userId: string): Promise<DashboardPageData> {
  const [{ data, error }, latestMeasurement, checkInConfig, activePaRes] = await Promise.all([
    supabase.rpc("get_client_dashboard"),
    getLatestMeasurement(userId),
    getClientCheckInConfig(userId),
    supabase
      .from("program_assignments")
      .select("id, pause_status")
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

    const assignmentId = activePaRes.data?.id as string | undefined;
    const pp = pageData.dashboard.programProgress;
    if (assignmentId && pp && pp.currentWeek >= 1) {
      const phases = await loadInstancePhases(supabase, assignmentId);
      const pos = resolvePhaseForAbsoluteWeek(
        pp.currentWeek,
        buildPhaseWeekRanges(phases),
      );
      if (pos) {
        pp.currentPhaseLabel = clientPhaseChipLabel(pos.range.phase);
        pp.weekWithinPhase = pos.weekWithinPhase;
      }
    }
  }
  return pageData;
}
