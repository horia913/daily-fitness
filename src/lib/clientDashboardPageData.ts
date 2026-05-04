/**
 * Shared dashboard page data: single RPC `get_client_dashboard` + mapping.
 * Used by `/client` and `/client/me` (score insights) so fetch logic stays one place.
 */

import { supabase } from "@/lib/supabase";
import { getLatestMeasurement } from "@/lib/measurementService";
import { getClientCheckInConfig } from "@/lib/checkInConfigService";
import type { AthleteScore } from "@/types/athleteScore";
import { ATHLETE_TIERS } from "@/types/athleteScore";
import type { DailyWellnessLog } from "@/lib/wellnessService";

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
  };
  /** Latest active `program_assignments.pause_status` (parallel read; matches RPC active-assignment scope). */
  activeProgramPauseStatus?: string | null;
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
  const athleteScore: AthleteScore | null =
    rawScore && typeof rawScore.score === "number" ? (rawScore as unknown as AthleteScore) : null;

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

/** Single source: one RPC returns everything the dashboard UI needs. */
export async function fetchDashboardPageData(userId: string): Promise<DashboardPageData> {
  const [{ data, error }, latestMeasurement, checkInConfig, activePaRes] = await Promise.all([
    supabase.rpc("get_client_dashboard"),
    getLatestMeasurement(userId),
    getClientCheckInConfig(userId),
    supabase
      .from("program_assignments")
      .select("pause_status")
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
  if (pageData.dashboard) {
    pageData.dashboard.activeProgramPauseStatus = activePaRes.data?.pause_status ?? null;
  }
  return pageData;
}
