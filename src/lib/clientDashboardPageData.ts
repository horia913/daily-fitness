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
import { weekdayMon0Sun6InTimezone } from "@/lib/clientZonedCalendar";

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

type TrainRpcScheduleRow = {
  id: string;
  week_number: number;
  day_number: number;
  day_of_week: number;
  template_id: string | null;
  template_name?: string | null;
  estimated_duration?: number | null;
  exercise_count?: number | null;
};

type TrainRpcCompletionRow = {
  program_schedule_id: string;
};

type TrainRpcDashboardOverlay = {
  hasProgram?: boolean;
  currentProgramWeek?: number | null;
  timezoneSnapshot?: string | null;
  schedule?: TrainRpcScheduleRow[] | null;
  completions?: TrainRpcCompletionRow[] | null;
};

function buildDashboardOverlayFromTrainRpc(
  rpc: TrainRpcDashboardOverlay | null,
): Pick<DashboardData, "weeklyProgress" | "todaysWorkout"> | null {
  if (!rpc?.hasProgram) return null;
  const schedule = Array.isArray(rpc.schedule) ? rpc.schedule : [];
  const completions = Array.isArray(rpc.completions) ? rpc.completions : [];
  const completedIds = new Set(
    completions
      .map((c) => c.program_schedule_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0),
  );
  const currentWeek =
    typeof rpc.currentProgramWeek === "number" && rpc.currentProgramWeek >= 1
      ? rpc.currentProgramWeek
      : 1;

  const currentWeekSlots = schedule.filter(
    (s) => s.week_number === currentWeek && !!s.template_id,
  );
  const weeklyGoal = currentWeekSlots.length;
  const weeklyCurrent = currentWeekSlots.filter((s) => completedIds.has(s.id)).length;

  const tz = rpc.timezoneSnapshot?.trim() || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const todayWeekday = weekdayMon0Sun6InTimezone(new Date(), tz);
  const sortedUncompleted = currentWeekSlots
    .filter((s) => !completedIds.has(s.id))
    .sort((a, b) => {
      const byDay = a.day_of_week - b.day_of_week;
      return byDay !== 0 ? byDay : a.day_number - b.day_number;
    });
  const upcomingTodayOrLater = sortedUncompleted.find((s) => s.day_of_week >= todayWeekday);
  const nextSlot = upcomingTodayOrLater ?? sortedUncompleted[0] ?? null;

  return {
    weeklyProgress: { current: weeklyCurrent, goal: weeklyGoal },
    todaysWorkout: nextSlot
      ? {
          hasWorkout: true,
          type: "program",
          name: nextSlot.template_name ?? "Workout",
          weekNumber: nextSlot.week_number,
          dayNumber: nextSlot.day_number,
          templateId: nextSlot.template_id ?? undefined,
          scheduleId: nextSlot.id,
          estimatedDuration: nextSlot.estimated_duration ?? null,
          totalSets: nextSlot.exercise_count ?? null,
        }
      : { hasWorkout: false },
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
  const [{ data, error }, trainOverlayRes, latestMeasurement, checkInConfig, activePaRes] = await Promise.all([
    supabase.rpc("get_client_dashboard"),
    supabase.rpc("get_train_page_data", {
      p_client_id: userId,
      p_today_weekday: weekdayMon0Sun6InTimezone(
        new Date(),
        Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      ),
    }),
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
    const overlay = buildDashboardOverlayFromTrainRpc(
      (trainOverlayRes.data ?? null) as TrainRpcDashboardOverlay | null,
    );
    if (overlay) {
      pageData.dashboard.weeklyProgress = overlay.weeklyProgress;
      pageData.dashboard.todaysWorkout = overlay.todaysWorkout;
    }
    pageData.dashboard.activeProgramPauseStatus = activePaRes.data?.pause_status ?? null;
  }
  return pageData;
}
