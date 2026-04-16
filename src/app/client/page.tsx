"use client";

/**
 * Dashboard Page - Client Home
 * 
 * APPROACH: Pages render immediately with empty/placeholder content, then populate when data arrives.
 * This ensures the page is always functional, even if data fetching hangs or fails.
 */

import React, { useCallback, useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { ClientPageShell, ClientGlassCard } from "@/components/client-ui";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { AthleteScoreRing } from "@/components/client-ui/AthleteScoreRing";
import {
  ScoreBreakdown,
  type ScoreBreakdownProps,
} from "@/components/client-ui/ScoreBreakdown";
import { BiggestWinCard } from "@/components/client/BiggestWinCard";
import { ATHLETE_TIERS, AthleteScore } from "@/types/athleteScore";
import {
  Dumbbell,
  CheckCircle,
  ChevronRight,
  Trophy,
  Coffee,
  Heart,
  Calendar,
} from "lucide-react";
import { DailyWellnessLog } from "@/lib/wellnessService";
import { usePageData } from "@/hooks/usePageData";
import { supabase } from "@/lib/supabase";
import { getWorkoutStreakDisplay } from "@/lib/workoutStreakDisplay";
import { isClientNutritionConfigured } from "@/lib/athleteScoreService";
import { getLatestMeasurement } from "@/lib/measurementService";
import { getClientCheckInConfig } from "@/lib/checkInConfigService";

interface DashboardData {
  avatarUrl: string | null;
  firstName: string | null;
  streak: number;
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
  };
  programProgress?: {
    currentWeek: number;
    totalWeeks: number;
    completedCount: number;
    totalSlots: number;
    percent: number;
  };
  highlights?: {
    prsThisMonth: number;
    latestAchievement: { name: string; icon: string | null; tier: string | null } | null;
    bestLeaderboardRank: { rank: number; exerciseName?: string | null } | null;
  };
}

interface DashboardPageData {
  dashboard: DashboardData | null;
  athleteScore: AthleteScore | null;
  hasCheckInToday: boolean | null;
  todayWellnessLog: DailyWellnessLog | null;
  checkinStreak: number;
  hasScheduledCheckInThisPeriod: boolean;
  scoreError: string | null;
}

function FeaturedChallengeBanner() {
  const [challenge, setChallenge] = React.useState<{
    id: string;
    name: string;
    end_date: string;
    reward_description?: string | null;
  } | null>(null);

  React.useEffect(() => {
    supabase
      .from("challenges")
      .select("id, name, end_date, reward_description")
      .eq("status", "active")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]) setChallenge(data[0]);
      });
  }, []);

  if (!challenge) return null;

  const daysLeft = Math.max(
    0,
    Math.ceil(
      (new Date(challenge.end_date).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24)
    )
  );

  return (
    <section className="mb-6">
      <button
        type="button"
        onClick={() => {
          window.location.href = `/client/challenges/${challenge.id}`;
        }}
        className="w-full text-left"
      >
        <ClientGlassCard className="p-4 border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-500/5 to-transparent hover:opacity-90 transition-opacity">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Active Challenge
              </p>
              <p className="text-sm font-semibold fc-text-primary truncate">
                {challenge.name}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold fc-text-primary">{daysLeft}d</p>
              <p className="text-[10px] fc-text-dim">left</p>
            </div>
            <ChevronRight className="w-4 h-4 fc-text-dim shrink-0" />
          </div>
        </ClientGlassCard>
      </button>
    </section>
  );
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

/** Single source: one RPC returns everything the dashboard UI needs. */
async function fetchDashboardPageData(userId: string): Promise<DashboardPageData> {
  const [{ data, error }, latestMeasurement, checkInConfig] = await Promise.all([
    supabase.rpc("get_client_dashboard"),
    getLatestMeasurement(userId),
    getClientCheckInConfig(userId),
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

  return mapDashboardRpcResponse(
    (data ?? null) as Record<string, unknown> | null,
    hasScheduledCheckInThisPeriod,
  );
}

/** Tier from API when valid; otherwise infer from score so the ring matches ATHLETE_TIERS bands. */
function tierForAthleteScoreRow(row: AthleteScore): string {
  const t = row.tier;
  if (t && ATHLETE_TIERS.some((x) => x.key === t)) return t;
  const band = ATHLETE_TIERS.find(
    (x) => row.score >= x.minScore && row.score <= x.maxScore,
  );
  return band?.key ?? "benched";
}

function mapDashboardRpcResponse(
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

function achievementHighlightClass(tier: string | null | undefined): string {
  if (!tier) {
    return "border border-amber-400/30 bg-amber-50 dark:bg-amber-900/20";
  }
  const t = tier.toLowerCase();
  if (t.includes("diamond")) {
    return "border border-cyan-300/35 bg-cyan-500/10 text-cyan-100 dark:text-cyan-200";
  }
  if (t.includes("gold") || t.includes("platinum")) {
    return "border border-amber-300/40 bg-amber-100/15 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200";
  }
  if (t.includes("silver")) {
    return "border border-slate-400/35 bg-slate-500/10 text-slate-800 dark:text-slate-200";
  }
  if (t.includes("bronze")) {
    return "border border-[#CD7F32]/45 bg-[#CD7F32]/12 text-amber-900 dark:text-amber-200";
  }
  return "border border-amber-400/30 bg-amber-50 dark:bg-amber-900/20";
}

export default function ClientDashboard() {
  const { user, profile } = useAuth();

  const fetchFn = useCallback(async (): Promise<DashboardPageData> => {
    if (!user?.id) {
      return {
        dashboard: null,
        athleteScore: null,
        hasCheckInToday: null,
        todayWellnessLog: null,
        checkinStreak: 0,
        hasScheduledCheckInThisPeriod: false,
        scoreError: null,
      };
    }
    return fetchDashboardPageData(user.id);
  }, [user?.id]);

  const { data: pageData, loading, error, refetch } = usePageData(fetchFn, [user?.id]);

  const dashboardData = pageData?.dashboard ?? null;
  const athleteScore = pageData?.athleteScore ?? null;
  const hasCheckInToday = pageData?.hasCheckInToday ?? null;
  const hasScheduledCheckInThisPeriod = pageData?.hasScheduledCheckInThisPeriod ?? false;
  const scoreError = pageData?.scoreError ?? null;

  const userName = dashboardData?.firstName || profile?.first_name || "there";
  const streak = dashboardData?.streak ?? 0;
  const weeklyProgress = dashboardData?.weeklyProgress ?? { current: 0, goal: 0 };
  const todaysWorkout = dashboardData?.todaysWorkout;

  const programProgressData = dashboardData?.programProgress;

  const [nutritionConfigured, setNutritionConfigured] = useState(false);
  const [breakdownTrends, setBreakdownTrends] = useState<
    ScoreBreakdownProps["trends"] | undefined
  >(undefined);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const nut = await isClientNutritionConfigured(user.id, supabase);
      const { data: rows } = await supabase
        .from("athlete_scores")
        .select(
          "workout_completion_score, checkin_completion_score, nutrition_compliance_score, calculated_at",
        )
        .eq("client_id", user.id)
        .order("calculated_at", { ascending: false })
        .limit(2);
      if (cancelled) return;
      setNutritionConfigured(nut);
      const r = rows ?? [];
      if (r.length >= 2) {
        const a = r[0] as {
          workout_completion_score?: number | null;
          checkin_completion_score?: number | null;
          nutrition_compliance_score?: number | null;
        };
        const b = r[1] as {
          workout_completion_score?: number | null;
          checkin_completion_score?: number | null;
          nutrition_compliance_score?: number | null;
        };
        setBreakdownTrends({
          programCompletion:
            (a.workout_completion_score ?? 0) - (b.workout_completion_score ?? 0),
          dailyCheckins:
            (a.checkin_completion_score ?? 0) - (b.checkin_completion_score ?? 0),
          nutrition: nut
            ? (a.nutrition_compliance_score ?? 0) -
              (b.nutrition_compliance_score ?? 0)
            : undefined,
        });
      } else {
        setBreakdownTrends(undefined);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, athleteScore?.calculated_at]);

  const getAvatarUrl = () => {
    if (dashboardData?.avatarUrl) return dashboardData.avatarUrl;
    if (profile?.first_name) {
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.first_name}`;
    }
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || "User"}`;
  };

  if (error) {
    return (
      <ProtectedRoute requiredRole="client">
        <AnimatedBackground>
          <ClientPageShell>
            <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
              <div className="text-4xl mb-3">⚠️</div>
              <h2 className="text-lg font-semibold text-white mb-2">
                Couldn't load this page
              </h2>
              <p className="text-sm text-gray-400 mb-4">
                Something went wrong. Please try again.
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-400 transition-colors"
              >
                Retry
              </button>
            </div>
          </ClientPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        <ClientPageShell className="max-w-lg px-4 pb-32 pt-6 overflow-x-visible">
          {loading ? (
            <>
              {/* Loading: skeleton layout */}
              <header className="flex items-center justify-between mb-8">
                <div className="space-y-2">
                  <Skeleton variant="text" className="h-6 w-32" />
                  <Skeleton variant="text" className="h-4 w-24" />
                </div>
                <Skeleton variant="circular" className="w-10 h-10 flex-shrink-0" />
              </header>

              <section className="mb-4 flex flex-col items-center py-2 sm:py-4">
                <div className="w-full max-w-[min(100%,20rem)] overflow-visible px-1 sm:px-2 flex justify-center mb-4">
                  <AthleteScoreRing score={null} tier={null} animated={false} size={200} />
                </div>
              </section>

              <section className="mb-4">
                <SkeletonCard />
              </section>
              <section className="mb-4">
                <SkeletonCard />
              </section>
            </>
          ) : (
            <>
          {/* Section 1: Header */}
          <header className="flex items-center justify-between mb-8">
            <div>
              <h1
                className="font-bold fc-text-primary mb-1"
                style={{ fontSize: "var(--fc-type-h2)" }}
              >
                Hey, {userName}
              </h1>
              <p
                className="fc-text-dim"
                style={{ fontSize: "var(--fc-type-caption)" }}
              >
                {formatDate()}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/client/me";
              }}
              className="w-10 h-10 rounded-full border border-[var(--fc-glass-border)] overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity p-0 bg-transparent"
              aria-label="Open profile"
            >
              <img
                src={getAvatarUrl()}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </button>
          </header>

          {/* Section 2: Athlete Score Ring (HERO) — same AthleteScoreRing as /client/test-athlete-score; overflow visible for tier glows */}
          <section className="mb-4 flex flex-col items-center py-2 sm:py-4">
            <div className="w-full max-w-[min(100%,20rem)] overflow-visible px-1 sm:px-2 flex flex-col items-center min-w-0 mb-4">
            {scoreError ? (
              <div className="flex flex-col items-center w-full">
                <div className="flex justify-center overflow-visible w-full">
                  <AthleteScoreRing score={0} tier="benched" animated={false} size={200} />
                </div>
                <p className="text-sm fc-text-dim mt-4 text-center px-1">
                  {scoreError}
                </p>
              </div>
            ) : (
              <>
                <div className="flex justify-center overflow-visible w-full">
                  <AthleteScoreRing
                    score={athleteScore?.score ?? null}
                    tier={
                      athleteScore != null
                        ? tierForAthleteScoreRow(athleteScore)
                        : null
                    }
                    animated={true}
                    size={200}
                  />
                </div>

                {athleteScore && (
                  <div className="w-full min-w-0 mt-6">
                    <ScoreBreakdown
                      programCompletion={athleteScore.workout_completion_score}
                      dailyCheckins={athleteScore.checkin_completion_score}
                      nutrition={athleteScore.nutrition_compliance_score}
                      nutritionConfigured={nutritionConfigured}
                      trends={breakdownTrends}
                    />
                  </div>
                )}
              </>
            )}

            <BiggestWinCard clientId={user?.id ?? null} />
            </div>

            {/* Hero: workout streak + program week X/Y + program progress */}
            {dashboardData && (() => {
              const streakDisp =
                getWorkoutStreakDisplay(streak) ?? {
                  tierKey: "starting" as const,
                  label: "Starting",
                  flames: "🔥",
                  flameClass: "text-amber-500/60 text-sm",
                  accentClass: "text-amber-500/80",
                  cardBorderClass: "border-l-amber-500/45",
                  cardBgClass: "bg-amber-500/5 dark:bg-amber-950/20",
                  pulseClass: "",
                };
              return (
                <section className="mb-4 w-full max-w-sm mx-auto">
                  <div className="flex gap-2">
                    <div
                      className="flex-1 min-w-0"
                      role="group"
                      aria-label={`${streak} day workout streak, ${streakDisp.label}`}
                    >
                    <ClientGlassCard
                      className={`py-2.5 px-1.5 text-center border-l-4 h-full ${streakDisp.cardBorderClass} ${streakDisp.cardBgClass}`}
                    >
                      <div
                        className={`flex items-center justify-center gap-0.5 mb-0.5 ${streakDisp.pulseClass}`}
                      >
                        <span className={streakDisp.flameClass} aria-hidden>
                          {streakDisp.flames}
                        </span>
                        <span
                          className={`text-base font-extrabold tabular-nums leading-none ${streakDisp.accentClass}`}
                        >
                          {streak}
                        </span>
                      </div>
                      <p className="text-[9px] font-semibold fc-text-primary leading-tight">
                        {streakDisp.label}
                      </p>
                      <p className="text-[10px] fc-text-dim leading-tight mt-0.5">day streak</p>
                    </ClientGlassCard>
                    </div>

                    <ClientGlassCard className="flex-1 min-w-0 py-2.5 px-1.5 text-center border-l-4 border-cyan-500/40 bg-cyan-950/20 dark:bg-cyan-950/30">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <Dumbbell className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="text-base font-extrabold text-cyan-400 tabular-nums leading-none">
                          {weeklyProgress.current}/{weeklyProgress.goal || 0}
                        </span>
                      </div>
                      <p className="text-[10px] fc-text-dim leading-tight">this program week</p>
                    </ClientGlassCard>

                    {programProgressData && programProgressData.totalSlots > 0 && (
                      <ClientGlassCard className="flex-1 min-w-0 py-2.5 px-1.5 text-center border-l-4 border-teal-500/45 bg-teal-950/20 dark:bg-teal-950/30">
                        <div className="flex items-center justify-center mb-0.5">
                          <div className="relative w-10 h-10">
                            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 48 48">
                              <circle cx="24" cy="24" r="19" fill="none" stroke="var(--fc-glass-border)" strokeWidth="3.5" />
                              <circle cx="24" cy="24" r="19" fill="none" stroke="#14b8a6" strokeWidth="3.5" strokeLinecap="round"
                                strokeDasharray={`${Math.min(100, programProgressData.percent) * 1.194} 999`} />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black fc-text-primary tabular-nums">
                              {programProgressData.percent}%
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] fc-text-dim leading-tight">
                          Week {programProgressData.currentWeek}/{programProgressData.totalWeeks}
                        </p>
                      </ClientGlassCard>
                    )}
                  </div>
                </section>
              );
            })()}
          </section>

          {/* Section 4: Today — flat row */}
          <section className="mb-4 border-b border-white/5 pb-4">
              {todaysWorkout?.hasWorkout ? (
                <div className="flex min-h-[48px] items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold fc-text-primary">
                      Today: {todaysWorkout.name || "Workout"}
                      {todaysWorkout.type === "program" &&
                        todaysWorkout.weekNumber &&
                        todaysWorkout.dayNumber &&
                        ` (Week ${todaysWorkout.weekNumber} Day ${todaysWorkout.dayNumber})`}
                    </p>
                    <p className="text-xs fc-text-dim">
                      {todaysWorkout.type === "program" ? "Program workout" : "Assigned workout"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = "/client/train";
                    }}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold fc-text-primary hover:opacity-80 bg-transparent border-0 p-0 cursor-pointer"
                  >
                    Go to Training
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="py-2 text-center">
                  <Coffee className="mx-auto mb-1 h-5 w-5 fc-text-dim" />
                  <p className="text-sm font-semibold fc-text-primary">Rest Day</p>
                  <p className="mt-0.5 text-xs fc-text-dim">
                    Recovery is when the magic happens. Stay hydrated.
                  </p>
                </div>
              )}
          </section>

          {/* Section 5: Check-in Status Cards */}
          <section className="mb-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/client/check-ins";
                }}
                className={`rounded-xl p-3 text-left transition-colors ${
                  hasCheckInToday === true
                    ? "bg-emerald-500/8 border border-emerald-500/15 opacity-75"
                    : "bg-cyan-500/10 border border-cyan-500/20"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-start">
                    {hasCheckInToday === true ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400/60" />
                    ) : (
                      <Heart className="w-4 h-4 text-cyan-400" />
                    )}
                  </div>
                  <p
                    className={`text-[10px] font-bold uppercase tracking-[0.15em] ${
                      hasCheckInToday === true ? "text-emerald-300/60" : "text-cyan-300/70"
                    }`}
                  >
                    DAILY
                  </p>
                  <p
                    className={`text-sm font-semibold ${
                      hasCheckInToday === true ? "text-emerald-300/70" : "text-white"
                    }`}
                  >
                    {hasCheckInToday === true ? "Done today" : "Not done"}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  window.location.href = "/client/check-ins/weekly";
                }}
                className={`rounded-xl p-3 text-left transition-colors ${
                  hasScheduledCheckInThisPeriod
                    ? "bg-emerald-500/8 border border-emerald-500/15 opacity-75"
                    : "bg-cyan-500/10 border border-cyan-500/20"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-start">
                    {hasScheduledCheckInThisPeriod ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400/60" />
                    ) : (
                      <Calendar className="w-4 h-4 text-cyan-400" />
                    )}
                  </div>
                  <p
                    className={`text-[10px] font-bold uppercase tracking-[0.15em] ${
                      hasScheduledCheckInThisPeriod ? "text-emerald-300/60" : "text-cyan-300/70"
                    }`}
                  >
                    CHECK-IN
                  </p>
                  <p
                    className={`text-sm font-semibold ${
                      hasScheduledCheckInThisPeriod ? "text-emerald-300/70" : "text-white"
                    }`}
                  >
                    {hasScheduledCheckInThisPeriod ? "Done this week" : "Not done"}
                  </p>
                </div>
              </button>
            </div>
          </section>

          {/* Highlights row: PRs this month, latest achievement, leaderboard rank */}
          {dashboardData?.highlights &&
            (dashboardData.highlights.prsThisMonth > 0 ||
              dashboardData.highlights.latestAchievement != null ||
              dashboardData.highlights.bestLeaderboardRank != null) && (
            <section className="mb-6">
              <div className="flex flex-wrap gap-2">
                {dashboardData.highlights.prsThisMonth > 0 && (
                  <span className="px-3 py-1.5 rounded-full text-xs font-medium fc-text-primary border border-amber-400/30 bg-amber-50 dark:bg-amber-900/20">
                    🏆 {dashboardData.highlights.prsThisMonth} PR{dashboardData.highlights.prsThisMonth === 1 ? '' : 's'} this month
                  </span>
                )}
                {dashboardData.highlights.latestAchievement != null && (
                  <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${achievementHighlightClass(dashboardData.highlights.latestAchievement.tier)}`}>
                    🎖️ Latest: {dashboardData.highlights.latestAchievement.name}
                    {dashboardData.highlights.latestAchievement.tier
                      ? ` — ${dashboardData.highlights.latestAchievement.tier}`
                      : ''}
                  </span>
                )}
                {dashboardData.highlights.bestLeaderboardRank != null && (
                  <span className={`px-3 py-1.5 rounded-full text-xs font-medium fc-text-primary border ${
                    dashboardData.highlights.bestLeaderboardRank.rank <= 3
                      ? "border-amber-400/40 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                      : "border-blue-400/30 bg-blue-50 dark:bg-blue-900/20"
                  }`}>
                    📊 #{dashboardData.highlights.bestLeaderboardRank.rank}
                    {dashboardData.highlights.bestLeaderboardRank.exerciseName
                      ? ` on ${dashboardData.highlights.bestLeaderboardRank.exerciseName} leaderboard`
                      : ' leaderboard'}
                  </span>
                )}
              </div>
            </section>
          )}

          {/* Featured Challenge Banner */}
          <FeaturedChallengeBanner />

          {/* View full progress link */}
          <section className="mb-6">
            <button
              type="button"
              onClick={() => {
                window.location.href = "/client/progress";
              }}
              className="inline-flex items-center gap-2 text-sm font-medium fc-text-primary hover:fc-text-subtle transition-colors bg-transparent border-0 p-0 cursor-pointer"
            >
              View full progress
              <ChevronRight className="w-4 h-4" />
            </button>
          </section>

            </>
          )}
        </ClientPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
