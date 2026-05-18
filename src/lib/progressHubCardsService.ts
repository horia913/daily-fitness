/**
 * Parallel aggregates for Progress Hub summary cards (single batched entry point).
 */

import { supabase } from "./supabase";
import { withTimeout } from "./withTimeout";
import { getTopProgressions, type ExerciseProgression } from "./strengthAnalytics";
import { fetchPersonalRecords } from "./personalRecords";
import { getLatestMeasurement, getWeightSeries } from "./measurementService";
import { getRecoveryHubPreview, getRecoveryInsight } from "./wellnessAnalytics";
import { AchievementService } from "./achievementService";
import {
  getActivitiesByDateRange,
  ACTIVITY_META,
} from "./clientActivityService";
import {
  getProgressStats,
  getProgressMonthHubSnapshot,
  getProgressWeekHubSnapshot,
  type ProgressMonthHubSnapshot,
  type ProgressWeekHubSnapshot,
} from "./progressStatsService";
import { getBodyMetricsSummary, type BodyMetricsSummary } from "./measurementService";

const FETCH_MS = 20_000;

export type HubCardStatus = "success" | "empty" | "error";

export interface HubCardBase {
  status: HubCardStatus;
  errorMessage?: string;
}

export interface StrengthHubCard extends HubCardBase {
  topExercise: string | null;
  pctIncrease: number | null;
  sparkline1RM: number[];
}

export interface WorkoutHistoryHubCard extends HubCardBase {
  recent: {
    name: string;
    completedAt: string;
    volumeKg: number;
    durationMin: number | null;
  }[];
}

export interface PrsHubCard extends HubCardBase {
  mostRecent: {
    exerciseName: string;
    weight: number;
    reps: number;
    date: string;
  } | null;
  total: number;
}

export interface BodyCompHubCard extends HubCardBase {
  currentWeightKg: number | null;
  delta30dKg: number | null;
  sparkline90d: { date: string; weightKg: number }[];
}

export interface RecoveryHubCard extends HubCardBase {
  insightText: string;
  sorenessAvg: number | null;
  sleepAvgHrs: number | null;
}

export interface GoalsHubCard extends HubCardBase {
  completed: number;
  total: number;
  nextDueGoalName: string | null;
}

export interface AchievementsHubCard extends HubCardBase {
  mostRecent: { name: string; icon: string | null; unlockedAt: string } | null;
  total: number;
}

export interface LeaderboardHubCard extends HubCardBase {
  currentRank: number | null;
  leaderboardName: string | null;
}

export interface ActivitiesHubCard extends HubCardBase {
  weeklyMinutes: number;
  topActivityType: string | null;
  topActivityMinutes: number;
}

export interface ProgressHubCardsPayload {
  strength: StrengthHubCard;
  workoutHistory: WorkoutHistoryHubCard;
  prs: PrsHubCard;
  bodyComp: BodyCompHubCard;
  recovery: RecoveryHubCard;
  goals: GoalsHubCard;
  achievements: AchievementsHubCard;
  leaderboard: LeaderboardHubCard;
  activities: ActivitiesHubCard;
  _meta: {
    elapsedMs: number;
    parallelBranches: number;
    cardStatuses: Record<string, HubCardStatus>;
  };
}

function mondayYmdLocal(d = new Date()): string {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(d);
  m.setHours(0, 0, 0, 0);
  m.setDate(d.getDate() + diff);
  return m.toISOString().split("T")[0];
}

function sundayYmdFromMonday(monYmd: string): string {
  const mon = new Date(monYmd + "T12:00:00");
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return sun.toISOString().split("T")[0];
}

export async function getProgressHubCards(
  userId: string,
): Promise<ProgressHubCardsPayload> {
  const t0 =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const parallelBranches = 9;
  const cardStatuses: Record<string, HubCardStatus> = {};

  const setCard = (key: string, s: HubCardStatus) => {
    cardStatuses[key] = s;
  };

  const [
    strengthR,
    workoutR,
    prsR,
    bodyR,
    recoveryR,
    goalsR,
    achR,
    lbR,
    actR,
  ] = await Promise.all([
    withTimeout(
      (async (): Promise<StrengthHubCard> => {
        try {
          const top = await getTopProgressions(userId, 1, "3M");
          const p: ExerciseProgression | undefined = top[0];
          if (!p || p.dataPoints.length < 2) {
            setCard("strength", "empty");
            return {
              status: "empty",
              topExercise: null,
              pctIncrease: null,
              sparkline1RM: [],
            };
          }
          setCard("strength", "success");
          const sparkline1RM = p.dataPoints
            .map((d) => d.estimatedOneRM)
            .slice(-14);
          return {
            status: "success",
            topExercise: p.exerciseName,
            pctIncrease: p.progressPercent,
            sparkline1RM,
          };
        } catch (e) {
          setCard("strength", "error");
          return {
            status: "error",
            errorMessage: e instanceof Error ? e.message : "Error",
            topExercise: null,
            pctIncrease: null,
            sparkline1RM: [],
          };
        }
      })(),
      FETCH_MS,
      "strength",
    ),
    withTimeout(
      (async (): Promise<WorkoutHistoryHubCard> => {
        try {
          const { data: logs, error } = await supabase
            .from("workout_logs")
            .select(
              "id, completed_at, total_duration_minutes, total_weight_lifted, workout_assignment_id",
            )
            .eq("client_id", userId)
            .not("completed_at", "is", null)
            .order("completed_at", { ascending: false })
            .limit(3);
          if (error) throw error;
          if (!logs?.length) {
            setCard("workoutHistory", "empty");
            return { status: "empty", recent: [] };
          }
          const assignmentIds = [
            ...new Set(
              logs
                .map((l) => l.workout_assignment_id)
                .filter(Boolean) as string[],
            ),
          ];
          const nameMap = new Map<string, string>();
          if (assignmentIds.length > 0) {
            const { data: asg } = await supabase
              .from("workout_assignments")
              .select(
                `id, workout_templates ( name )`,
              )
              .in("id", assignmentIds);
            (asg ?? []).forEach((a: any) => {
              nameMap.set(
                a.id,
                a.workout_templates?.name ?? "Workout",
              );
            });
          }
          const recent = logs.map((log: any) => {
            const nm = log.workout_assignment_id
              ? nameMap.get(log.workout_assignment_id) ?? "Workout"
              : "Workout";
            const vol =
              Number(log.total_weight_lifted) ||
              0;
            return {
              name: nm,
              completedAt: log.completed_at as string,
              volumeKg: Math.round(vol),
              durationMin: log.total_duration_minutes != null
                ? Number(log.total_duration_minutes)
                : null,
            };
          });
          setCard("workoutHistory", "success");
          return { status: "success", recent };
        } catch (e) {
          setCard("workoutHistory", "error");
          return {
            status: "error",
            errorMessage: e instanceof Error ? e.message : "Error",
            recent: [],
          };
        }
      })(),
      FETCH_MS,
      "workoutHistory",
    ),
    withTimeout(
      (async (): Promise<PrsHubCard> => {
        try {
          const [list, stats] = await Promise.all([
            fetchPersonalRecords(userId),
            getProgressStats(userId),
          ]);
          const pr = list[0];
          if (!pr) {
            setCard("prs", "empty");
            return { status: "empty", mostRecent: null, total: stats.personalRecords };
          }
          setCard("prs", "success");
          return {
            status: "success",
            mostRecent: {
              exerciseName: pr.exerciseName,
              weight: pr.weight,
              reps: pr.reps,
              date: pr.date,
            },
            total: stats.personalRecords,
          };
        } catch (e) {
          setCard("prs", "error");
          return {
            status: "error",
            errorMessage: e instanceof Error ? e.message : "Error",
            mostRecent: null,
            total: 0,
          };
        }
      })(),
      FETCH_MS,
      "prs",
    ),
    withTimeout(
      (async (): Promise<BodyCompHubCard> => {
        try {
          const [latest, series] = await Promise.all([
            getLatestMeasurement(userId),
            getWeightSeries(userId, 90),
          ]);
          const cur =
            latest?.weight_kg != null ? Number(latest.weight_kg) : null;
          let delta30dKg: number | null = null;
          if (cur != null && series.length >= 2) {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - 30);
            const ck = cutoff.toISOString().split("T")[0];
            const old = series.find((p) => p.measured_date <= ck);
            if (old?.weight_kg) {
              delta30dKg =
                Math.round((cur - old.weight_kg) * 10) / 10;
            }
          }
          if (cur == null && series.length === 0) {
            setCard("bodyComp", "empty");
            return {
              status: "empty",
              currentWeightKg: null,
              delta30dKg: null,
              sparkline90d: [],
            };
          }
          setCard("bodyComp", "success");
          return {
            status: "success",
            currentWeightKg: cur,
            delta30dKg,
            sparkline90d: series.map((p) => ({
              date: p.measured_date,
              weightKg: p.weight_kg,
            })),
          };
        } catch (e) {
          setCard("bodyComp", "error");
          return {
            status: "error",
            errorMessage: e instanceof Error ? e.message : "Error",
            currentWeightKg: null,
            delta30dKg: null,
            sparkline90d: [],
          };
        }
      })(),
      FETCH_MS,
      "bodyComp",
    ),
    withTimeout(
      (async (): Promise<RecoveryHubCard> => {
        try {
          const r = await getRecoveryHubPreview(userId);
          if (r.notEnoughData && !r.hasCheckins) {
            setCard("recovery", "empty");
            return {
              status: "empty",
              insightText: "",
              sorenessAvg: null,
              sleepAvgHrs: null,
            };
          }
          setCard("recovery", "success");
          return {
            status: "success",
            insightText: r.insightText || "Keep logging check-ins to unlock insights.",
            sorenessAvg: r.sorenessAvg,
            sleepAvgHrs: r.sleepAvgHrs,
          };
        } catch (e) {
          setCard("recovery", "error");
          return {
            status: "error",
            errorMessage: e instanceof Error ? e.message : "Error",
            insightText: "",
            sorenessAvg: null,
            sleepAvgHrs: null,
          };
        }
      })(),
      FETCH_MS,
      "recovery",
    ),
    withTimeout(
      (async (): Promise<GoalsHubCard> => {
        try {
          const { data: goals, error } = await supabase
            .from("goals")
            .select("id, title, target_date, status")
            .eq("client_id", userId);
          if (error) throw error;
          const rows = goals ?? [];
          const total = rows.length;
          const completed = rows.filter((g: any) => g.status === "completed").length;
          const open = rows
            .filter((g: any) => g.status !== "completed")
            .sort((a: any, b: any) => {
              if (!a.target_date) return 1;
              if (!b.target_date) return -1;
              return a.target_date.localeCompare(b.target_date);
            });
          const next = open[0] as { title?: string } | undefined;
          if (total === 0) {
            setCard("goals", "empty");
            return {
              status: "empty",
              completed: 0,
              total: 0,
              nextDueGoalName: null,
            };
          }
          setCard("goals", "success");
          const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
          return {
            status: "success",
            completed,
            total,
            nextDueGoalName:
              pct >= 100 ? null : (next?.title ?? null),
          };
        } catch (e) {
          setCard("goals", "error");
          return {
            status: "error",
            errorMessage: e instanceof Error ? e.message : "Error",
            completed: 0,
            total: 0,
            nextDueGoalName: null,
          };
        }
      })(),
      FETCH_MS,
      "goals",
    ),
    withTimeout(
      (async (): Promise<AchievementsHubCard> => {
        try {
          const { data: row, error } = await supabase
            .from("user_achievements")
            .select(
              `achieved_date, achievement_templates ( name, icon )`,
            )
            .eq("client_id", userId)
            .order("achieved_date", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (error) throw error;
          const total = await AchievementService.getUnlockedAchievementsCount(
            userId,
          );
          const tpl = (row as any)?.achievement_templates;
          if (!row || !tpl?.name) {
            setCard("achievements", "empty");
            return { status: "empty", mostRecent: null, total };
          }
          setCard("achievements", "success");
          return {
            status: "success",
            mostRecent: {
              name: tpl.name as string,
              icon: (tpl.icon as string) ?? null,
              unlockedAt: (row as any).achieved_date as string,
            },
            total,
          };
        } catch (e) {
          setCard("achievements", "error");
          return {
            status: "error",
            errorMessage: e instanceof Error ? e.message : "Error",
            mostRecent: null,
            total: 0,
          };
        }
      })(),
      FETCH_MS,
      "achievements",
    ),
    withTimeout(
      (async (): Promise<LeaderboardHubCard> => {
        try {
          const { data: rows, error } = await supabase
            .from("leaderboard_entries")
            .select("rank, display_name, leaderboard_type")
            .eq("client_id", userId)
            .order("rank", { ascending: true })
            .limit(1);
          if (error) throw error;
          const best = rows?.[0] as
            | { rank: number; display_name: string; leaderboard_type: string }
            | undefined;
          if (!best) {
            setCard("leaderboard", "empty");
            return { status: "empty", currentRank: null, leaderboardName: null };
          }
          setCard("leaderboard", "success");
          return {
            status: "success",
            currentRank: best.rank,
            leaderboardName: best.display_name || best.leaderboard_type,
          };
        } catch (e) {
          setCard("leaderboard", "error");
          return {
            status: "error",
            errorMessage: e instanceof Error ? e.message : "Error",
            currentRank: null,
            leaderboardName: null,
          };
        }
      })(),
      FETCH_MS,
      "leaderboard",
    ),
    withTimeout(
      (async (): Promise<ActivitiesHubCard> => {
        try {
          const mon = mondayYmdLocal();
          const sun = sundayYmdFromMonday(mon);
          const acts = await getActivitiesByDateRange(userId, mon, sun);
          if (!acts.length) {
            setCard("activities", "empty");
            return {
              status: "empty",
              weeklyMinutes: 0,
              topActivityType: null,
              topActivityMinutes: 0,
            };
          }
          const byLabel = new Map<string, number>();
          let totalMin = 0;
          for (const a of acts) {
            totalMin += a.duration_minutes;
            const label =
              a.activity_type === "custom"
                ? (a.custom_activity_name ?? "Custom")
                : (ACTIVITY_META[a.activity_type]?.label ?? a.activity_type);
            byLabel.set(label, (byLabel.get(label) ?? 0) + a.duration_minutes);
          }
          let topL: string | null = null;
          let topM = 0;
          for (const [l, m] of byLabel.entries()) {
            if (m > topM) {
              topM = m;
              topL = l;
            }
          }
          setCard("activities", "success");
          return {
            status: "success",
            weeklyMinutes: totalMin,
            topActivityType: topL,
            topActivityMinutes: topM,
          };
        } catch (e) {
          setCard("activities", "error");
          return {
            status: "error",
            errorMessage: e instanceof Error ? e.message : "Error",
            weeklyMinutes: 0,
            topActivityType: null,
            topActivityMinutes: 0,
          };
        }
      })(),
      FETCH_MS,
      "activities",
    ),
  ]);

  const t1 =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const elapsedMs = Math.round(t1 - t0);

  console.log("[hub-cards] resolved", {
    elapsedMs,
    parallelBranches,
    cardStatuses,
  });

  return {
    strength: strengthR,
    workoutHistory: workoutR,
    prs: prsR,
    bodyComp: bodyR,
    recovery: recoveryR,
    goals: goalsR,
    achievements: achR,
    leaderboard: lbR,
    activities: actR,
    _meta: {
      elapsedMs,
      parallelBranches,
      cardStatuses,
    },
  };
}

// --- Progress hub dashboard (single parallel entry point) ---

export type DashboardSectionStatus = "success" | "empty" | "error";

export interface SectionPayload<T> {
  data: T | null;
  hasData: boolean;
  error?: string;
}

export interface RecentWorkoutRow {
  name: string;
  completedAt: string;
  dateLabel: string;
  /** From `workout_logs.total_weight_lifted`; null/0 shown as "—". */
  volumeKg: number | null;
  /** From `workout_logs.total_duration_minutes`; null/0 shown as "—". */
  durationMin: number | null;
}

export interface GoalsDashboardData {
  completed: number;
  total: number;
  nextDueGoalName: string | null;
  nextDueDateLabel: string | null;
}

export interface StrengthRankDashboardData {
  totalPRs: number;
  bestRank: number | null;
}

export interface AchievementsDashboardData {
  unlockedCount: number;
  inProgressCount: number;
  latestName: string | null;
  latestUnlockedAt: string | null;
}

export interface RecoveryDashboardData {
  insightText: string;
  sorenessAvg: number | null;
  sleepAvgHrs: number | null;
}

export interface ActivitiesDashboardData {
  weeklyMinutes: number;
  topActivityType: string | null;
  topActivityMinutes: number;
}

export interface ProgressDashboardPayload {
  monthSnapshot: SectionPayload<ProgressMonthHubSnapshot>;
  weekSnapshot: SectionPayload<ProgressWeekHubSnapshot>;
  recentWorkouts: SectionPayload<RecentWorkoutRow[]>;
  body: SectionPayload<BodyMetricsSummary>;
  goals: SectionPayload<GoalsDashboardData>;
  strengthRank: SectionPayload<StrengthRankDashboardData>;
  achievements: SectionPayload<AchievementsDashboardData>;
  recovery: SectionPayload<RecoveryDashboardData>;
  activities: SectionPayload<ActivitiesDashboardData>;
  _meta: {
    elapsedMs: number;
    parallelBranches: number;
    supabaseCallsApprox: number;
    sectionStatuses: Record<string, DashboardSectionStatus>;
  };
}

const DASH_MS = 25_000;

function formatWorkoutDateLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export async function getProgressDashboard(
  userId: string,
): Promise<ProgressDashboardPayload> {
  const t0 =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const parallelBranches = 9;
  const supabaseCallsApprox = 9;
  const sectionStatuses: Record<string, DashboardSectionStatus> = {};
  const mark = (key: string, s: DashboardSectionStatus) => {
    sectionStatuses[key] = s;
  };

  const [
    monthSnapshot,
    weekSnapshot,
    recentWorkouts,
    body,
    goals,
    strengthRank,
    achievements,
    recovery,
    activities,
  ] = await Promise.all([
    withTimeout(
      (async (): Promise<SectionPayload<ProgressMonthHubSnapshot>> => {
        try {
          const data = await getProgressMonthHubSnapshot(userId);
          mark("monthSnapshot", "success");
          return { data, hasData: true };
        } catch (e) {
          mark("monthSnapshot", "error");
          return {
            data: null,
            hasData: false,
            error: e instanceof Error ? e.message : "Error",
          };
        }
      })(),
      DASH_MS,
      "dash-month",
    ),
    withTimeout(
      (async (): Promise<SectionPayload<ProgressWeekHubSnapshot>> => {
        try {
          const data = await getProgressWeekHubSnapshot(userId);
          mark("weekSnapshot", "success");
          return { data, hasData: true };
        } catch (e) {
          mark("weekSnapshot", "error");
          return {
            data: null,
            hasData: false,
            error: e instanceof Error ? e.message : "Error",
          };
        }
      })(),
      DASH_MS,
      "dash-week",
    ),
    withTimeout(
      (async (): Promise<SectionPayload<RecentWorkoutRow[]>> => {
        try {
          const { data: logs, error } = await supabase
            .from("workout_logs")
            .select(
              "id, completed_at, workout_assignment_id, total_weight_lifted, total_duration_minutes",
            )
            .eq("client_id", userId)
            .not("completed_at", "is", null)
            .order("completed_at", { ascending: false })
            .limit(3);
          if (error) throw error;
          if (!logs?.length) {
            mark("recentWorkouts", "empty");
            return { data: [], hasData: false };
          }
          const assignmentIds = [
            ...new Set(
              logs
                .map((l) => l.workout_assignment_id)
                .filter(Boolean) as string[],
            ),
          ];
          const nameMap = new Map<string, string>();
          if (assignmentIds.length > 0) {
            const { data: asg } = await supabase
              .from("workout_assignments")
              .select(`id, workout_templates ( name )`)
              .in("id", assignmentIds);
            (asg ?? []).forEach((a: any) => {
              nameMap.set(
                a.id,
                a.workout_templates?.name ?? "Workout",
              );
            });
          }
          const rows: RecentWorkoutRow[] = logs.map((log: any) => {
            const nm = log.workout_assignment_id
              ? nameMap.get(log.workout_assignment_id) ?? "Workout"
              : "Workout";
            const volRaw = log.total_weight_lifted;
            const durRaw = log.total_duration_minutes;
            const volumeKg =
              volRaw != null && Number(volRaw) > 0 ? Number(volRaw) : null;
            const durationMin =
              durRaw != null && Number(durRaw) > 0 ? Number(durRaw) : null;
            return {
              name: nm,
              completedAt: log.completed_at as string,
              dateLabel: formatWorkoutDateLabel(log.completed_at as string),
              volumeKg,
              durationMin,
            };
          });
          mark("recentWorkouts", "success");
          return { data: rows, hasData: true };
        } catch (e) {
          mark("recentWorkouts", "error");
          return {
            data: null,
            hasData: false,
            error: e instanceof Error ? e.message : "Error",
          };
        }
      })(),
      DASH_MS,
      "dash-recent",
    ),
    withTimeout(
      (async (): Promise<SectionPayload<BodyMetricsSummary>> => {
        try {
          const data = await getBodyMetricsSummary(userId);
          const has =
            data.currentWeightKg != null || data.sparkline90d.length > 0;
          mark("body", has ? "success" : "empty");
          return { data, hasData: has };
        } catch (e) {
          mark("body", "error");
          return {
            data: null,
            hasData: false,
            error: e instanceof Error ? e.message : "Error",
          };
        }
      })(),
      DASH_MS,
      "dash-body",
    ),
    withTimeout(
      (async (): Promise<SectionPayload<GoalsDashboardData>> => {
        try {
          const { data: goalRows, error } = await supabase
            .from("goals")
            .select("id, title, status, target_date")
            .eq("client_id", userId);
          if (error) throw error;
          const rows = goalRows ?? [];
          const total = rows.length;
          const completed = rows.filter(
            (g: { status: string }) => g.status === "completed",
          ).length;
          const active = rows
            .filter((g: { status: string }) =>
              g.status === "active" || g.status === "in_progress",
            )
            .sort((a: { target_date?: string }, b: { target_date?: string }) => {
              if (!a.target_date) return 1;
              if (!b.target_date) return -1;
              return a.target_date.localeCompare(b.target_date);
            });
          const next = active[0] as
            | { title?: string; target_date?: string }
            | undefined;
          const nextDate = next?.target_date
            ? new Date(next.target_date + "T12:00:00").toLocaleDateString(
                "en-US",
                { month: "short", day: "numeric", year: "numeric" },
              )
            : null;
          const data: GoalsDashboardData = {
            completed,
            total,
            nextDueGoalName: next?.title ?? null,
            nextDueDateLabel: nextDate,
          };
          mark("goals", total > 0 ? "success" : "empty");
          return { data, hasData: total > 0 };
        } catch (e) {
          mark("goals", "error");
          return {
            data: null,
            hasData: false,
            error: e instanceof Error ? e.message : "Error",
          };
        }
      })(),
      DASH_MS,
      "dash-goals",
    ),
    withTimeout(
      (async (): Promise<SectionPayload<StrengthRankDashboardData>> => {
        try {
          const stats = await getProgressStats(userId);
          mark("strengthRank", "success");
          return {
            data: {
              totalPRs: stats.personalRecords,
              bestRank: stats.bestLeaderboardRank,
            },
            hasData: true,
          };
        } catch (e) {
          mark("strengthRank", "error");
          return {
            data: null,
            hasData: false,
            error: e instanceof Error ? e.message : "Error",
          };
        }
      })(),
      DASH_MS,
      "dash-strength",
    ),
    withTimeout(
      (async (): Promise<SectionPayload<AchievementsDashboardData>> => {
        try {
          const [unlockedCount, inProgressCount, latestRes] = await Promise.all([
            AchievementService.getUnlockedAchievementsCount(userId),
            AchievementService.getAchievementsInProgressCount(userId),
            supabase
              .from("user_achievements")
              .select(
                `achieved_date, achievement_templates ( name )`,
              )
              .eq("client_id", userId)
              .order("achieved_date", { ascending: false })
              .limit(1)
              .maybeSingle(),
          ]);
          const tpl = (latestRes.data as any)?.achievement_templates;
          const data: AchievementsDashboardData = {
            unlockedCount,
            inProgressCount,
            latestName: tpl?.name ?? null,
            latestUnlockedAt:
              (latestRes.data as { achieved_date?: string } | null)
                ?.achieved_date ?? null,
          };
          mark(
            "achievements",
            unlockedCount + inProgressCount > 0 ? "success" : "empty",
          );
          return {
            data,
            hasData: unlockedCount + inProgressCount > 0,
          };
        } catch (e) {
          mark("achievements", "error");
          return {
            data: null,
            hasData: false,
            error: e instanceof Error ? e.message : "Error",
          };
        }
      })(),
      DASH_MS,
      "dash-ach",
    ),
    withTimeout(
      (async (): Promise<SectionPayload<RecoveryDashboardData>> => {
        try {
          const r = await getRecoveryInsight(userId);
          if (!r.hasData) {
            mark("recovery", "empty");
            return {
              data: null,
              hasData: false,
            };
          }
          mark("recovery", "success");
          return {
            data: {
              insightText: r.insightText,
              sorenessAvg: r.sorenessAvg,
              sleepAvgHrs: r.sleepAvgHrs,
            },
            hasData: true,
          };
        } catch (e) {
          mark("recovery", "error");
          return {
            data: null,
            hasData: false,
            error: e instanceof Error ? e.message : "Error",
          };
        }
      })(),
      DASH_MS,
      "dash-recovery",
    ),
    withTimeout(
      (async (): Promise<SectionPayload<ActivitiesDashboardData>> => {
        try {
          const end = new Date();
          const start = new Date();
          start.setDate(end.getDate() - 6);
          const endStr = end.toISOString().split("T")[0];
          const startStr = start.toISOString().split("T")[0];
          const acts = await getActivitiesByDateRange(userId, startStr, endStr);
          if (!acts.length) {
            mark("activities", "empty");
            return {
              data: {
                weeklyMinutes: 0,
                topActivityType: null,
                topActivityMinutes: 0,
              },
              hasData: false,
            };
          }
          let totalMin = 0;
          const byLabel = new Map<string, number>();
          for (const a of acts) {
            totalMin += a.duration_minutes;
            const label =
              a.activity_type === "custom"
                ? (a.custom_activity_name ?? "Custom")
                : (ACTIVITY_META[a.activity_type]?.label ?? a.activity_type);
            byLabel.set(label, (byLabel.get(label) ?? 0) + a.duration_minutes);
          }
          let topL: string | null = null;
          let topM = 0;
          for (const [l, m] of byLabel.entries()) {
            if (m > topM) {
              topM = m;
              topL = l;
            }
          }
          mark("activities", "success");
          return {
            data: {
              weeklyMinutes: totalMin,
              topActivityType: topL,
              topActivityMinutes: topM,
            },
            hasData: true,
          };
        } catch (e) {
          mark("activities", "error");
          return {
            data: null,
            hasData: false,
            error: e instanceof Error ? e.message : "Error",
          };
        }
      })(),
      DASH_MS,
      "dash-act",
    ),
  ]);

  const t1 =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const elapsedMs = Math.round(t1 - t0);

  console.log("[progress-dash] resolved", {
    elapsedMs,
    parallelBranches,
    supabaseCallsApprox,
    sectionStatuses,
  });

  return {
    monthSnapshot,
    weekSnapshot,
    recentWorkouts,
    body,
    goals,
    strengthRank,
    achievements,
    recovery,
    activities,
    _meta: {
      elapsedMs,
      parallelBranches,
      supabaseCallsApprox,
      sectionStatuses,
    },
  };
}
