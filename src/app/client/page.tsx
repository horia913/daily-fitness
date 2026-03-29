"use client";

/**
 * Dashboard Page - Client Home
 * 
 * APPROACH: Pages render immediately with empty/placeholder content, then populate when data arrives.
 * This ensures the page is always functional, even if data fetching hangs or fails.
 */

import React, { useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { ClientPageShell, ClientGlassCard } from "@/components/client-ui";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { AthleteScoreRing } from "@/components/client-ui/AthleteScoreRing";
import { ScoreBreakdown } from "@/components/client-ui/ScoreBreakdown";
import { AthleteScore } from "@/types/athleteScore";
import Link from "next/link";
import {
  Dumbbell,
  BarChart3,
  CheckCircle,
  ChevronRight,
  Loader2,
  Pencil,
  Trophy,
  Coffee,
} from "lucide-react";
import { dbToUiScale, DailyWellnessLog } from "@/lib/wellnessService";
import { getWellnessValueColor } from "@/lib/wellnessValueColors";
import { usePageData } from "@/hooks/usePageData";
import { supabase } from "@/lib/supabase";

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
  scoreHistory: { date: string; score: number }[];
  hasCheckInToday: boolean | null;
  todayWellnessLog: DailyWellnessLog | null;
  checkinStreak: number;
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
      <Link href={`/client/challenges/${challenge.id}`}>
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
      </Link>
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

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// Helper functions for wellness display
function getSleepQualityLabel(value: number | null | undefined): string {
  if (value == null) return "—";
  const labels = ["Terrible", "Poor", "Fair", "Good", "Great"];
  return labels[Math.min(4, Math.max(0, value - 1))] || "—";
}

function getStressLabel(dbValue: number | null | undefined): string {
  if (dbValue == null) return "—";
  const uiValue = dbToUiScale(dbValue);
  if (uiValue == null) return "—";
  const labels = ["Calm", "Mild", "Moderate", "High", "Extreme"];
  return labels[Math.min(4, Math.max(0, uiValue - 1))] || "—";
}

function getSorenessLabel(dbValue: number | null | undefined): string {
  if (dbValue == null) return "—";
  const uiValue = dbToUiScale(dbValue);
  if (uiValue == null) return "—";
  const labels = ["Fresh", "Mild", "Moderate", "Sore", "Severe"];
  return labels[Math.min(4, Math.max(0, uiValue - 1))] || "—";
}


/** Single source: one RPC returns everything the dashboard UI needs. */
async function fetchDashboardPageData(_userId: string): Promise<DashboardPageData> {
  const { data, error } = await supabase.rpc("get_client_dashboard");
  if (error) {
    if (error.message?.includes("Not authenticated")) {
      throw new Error("Unauthorized");
    }
    throw new Error(error.message || "Failed to load dashboard");
  }
  return mapDashboardRpcResponse((data ?? null) as Record<string, unknown> | null);
}

function mapDashboardRpcResponse(rpc: Record<string, unknown> | null): DashboardPageData {
  if (!rpc) {
    return {
      dashboard: null,
      athleteScore: null,
      scoreHistory: [],
      hasCheckInToday: null,
      todayWellnessLog: null,
      checkinStreak: 0,
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

  const rawHistory = rpc.scoreHistory;
  const scoreHistory: { date: string; score: number }[] = Array.isArray(rawHistory)
    ? (rawHistory as { date: string; score: number }[])
    : [];

  const todayWellnessLog = (rpc.todayWellnessLog as DailyWellnessLog | null) ?? null;
  const hasCheckInToday = todayWellnessLog != null;
  const checkinStreak = Number(rpc.checkinStreak) ?? 0;

  return {
    dashboard,
    athleteScore,
    scoreHistory,
    hasCheckInToday,
    todayWellnessLog,
    checkinStreak,
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
        scoreHistory: [],
        hasCheckInToday: null,
        todayWellnessLog: null,
        checkinStreak: 0,
        scoreError: null,
      };
    }
    return fetchDashboardPageData(user.id);
  }, [user?.id]);

  const { data: pageData, loading, error, refetch } = usePageData(fetchFn, [user?.id]);

  const dashboardData = pageData?.dashboard ?? null;
  const athleteScore = pageData?.athleteScore ?? null;
  const scoreHistory = pageData?.scoreHistory ?? [];
  const hasCheckInToday = pageData?.hasCheckInToday ?? null;
  const todayWellnessLog = pageData?.todayWellnessLog ?? null;
  const checkinStreak = pageData?.checkinStreak ?? 0;
  const scoreError = pageData?.scoreError ?? null;

  const userName = dashboardData?.firstName || profile?.first_name || "there";
  const streak = dashboardData?.streak ?? 0;
  const weeklyProgress = dashboardData?.weeklyProgress ?? { current: 0, goal: 0 };
  const todaysWorkout = dashboardData?.todaysWorkout;

  const programProgressData = dashboardData?.programProgress;

  const getAvatarUrl = () => {
    if (dashboardData?.avatarUrl) return dashboardData.avatarUrl;
    if (profile?.first_name) {
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.first_name}`;
    }
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || "User"}`;
  };

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        <ClientPageShell className="max-w-lg px-4 pb-32 pt-6">
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

              <section className="flex flex-col items-center justify-center mb-8 min-h-[30vh] sm:min-h-[50vh]">
                <AthleteScoreRing score={null} tier={null} animated={false} />
              </section>

              <section className="mb-6">
                <SkeletonCard />
              </section>
              <section className="mb-6">
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
            <Link href="/client/me">
              <div className="w-10 h-10 rounded-full border border-[var(--fc-glass-border)] overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity">
                <img
                  src={getAvatarUrl()}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
            </Link>
          </header>

          {/* Section 2: Athlete Score Ring (HERO) */}
          <section className="flex flex-col items-center justify-center mb-8 min-h-[30vh] sm:min-h-[50vh]">
            {scoreError ? (
              <div className="flex flex-col items-center justify-center">
                <AthleteScoreRing score={0} tier="benched" animated={false} />
                <p className="text-sm fc-text-dim mt-4 text-center">
                  {scoreError}
                </p>
              </div>
            ) : (
              <>
                <AthleteScoreRing
                  score={athleteScore?.score ?? null}
                  tier={athleteScore?.tier ?? null}
                  animated={true}
                  accentStroke
                />

                {/* Score Breakdown */}
                {athleteScore && (
                  <div className="mt-6 w-full max-w-sm">
                    <ScoreBreakdown
                      scores={{
                        workout: athleteScore.workout_completion_score,
                        program: athleteScore.program_adherence_score,
                        checkin: athleteScore.checkin_completion_score,
                        goals: athleteScore.goal_progress_score,
                        nutrition: athleteScore.nutrition_compliance_score,
                      }}
                    />
                  </div>
                )}

                {/* Score trend sparkline */}
                <div className="mt-4 w-full max-w-sm px-2">
                  {scoreHistory.length >= 2 ? (
                    <>
                      <div className="h-10 w-full flex items-end justify-between gap-0.5" aria-hidden>
                        {scoreHistory.map((point, i) => {
                          const minS = Math.min(...scoreHistory.map((p) => p.score));
                          const maxS = Math.max(...scoreHistory.map((p) => p.score));
                          const range = maxS - minS || 1;
                          const pct = ((point.score - minS) / range) * 100;
                          return (
                            <div
                              key={point.date}
                              className="flex-1 min-w-0 rounded-t bg-cyan-500/60 transition-all"
                              style={{ height: `${Math.max(pct, 8)}%` }}
                            />
                          );
                        })}
                      </div>
                      {scoreHistory.length >= 2 && (() => {
                        const first = scoreHistory[0].score;
                        const last = scoreHistory[scoreHistory.length - 1].score;
                        const diff = last - first;
                        if (diff > 0) {
                          return (
                            <p className="text-xs fc-text-success mt-1 text-center">
                              Up {diff} point{diff !== 1 ? "s" : ""} from 12 weeks ago
                            </p>
                          );
                        }
                        if (diff < 0) {
                          return (
                            <p className="text-xs fc-text-dim mt-1 text-center">
                              {Math.abs(diff)} point{Math.abs(diff) !== 1 ? "s" : ""} from 12 weeks ago
                            </p>
                          );
                        }
                        return null;
                      })()}
                    </>
                  ) : (
                    <p className="text-xs fc-text-dim text-center py-2">
                      Score tracking started — trend will appear after 2 weeks.
                    </p>
                  )}
                </div>
              </>
            )}
          </section>

          {/* Section 4: Today — flat row */}
          <section className="mb-6 border-b border-white/5 pb-4">
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
                  <Link href="/client/train">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold fc-text-primary hover:opacity-80">
                      Go to Training
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </Link>
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

          {/* Section 5: Daily Check-in Card */}
          {hasCheckInToday === false && (
            <section className="mb-6">
              <ClientGlassCard className="p-4 border-l-4 border-purple-500 bg-purple-50 dark:bg-purple-900/20">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium fc-text-primary">
                      How are you feeling today?
                    </p>
                    <p className="text-xs fc-text-dim mt-0.5">
                      {checkinStreak > 0
                        ? `🔥 Keep your ${checkinStreak}-day streak alive!`
                        : "Start your check-in streak today"}
                    </p>
                  </div>
                  <Link href="/client/check-ins">
                    <Button variant="fc-primary" className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
                      Check in
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </ClientGlassCard>
            </section>
          )}

          {hasCheckInToday === true && todayWellnessLog && (
            <section className="mb-6">
              <ClientGlassCard className="p-4 border-l-4 border-purple-500 bg-purple-50 dark:bg-purple-900/20">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 fc-text-success" />
                      <p className="text-sm font-medium fc-text-primary">Checked in today</p>
                    </div>
                    {todayWellnessLog.created_at && (
                      <p className="text-xs fc-text-subtle">
                        {formatTime(todayWellnessLog.created_at)}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs fc-text-subtle">
                    {todayWellnessLog.sleep_hours != null && (
                      <span>
                        Sleep: <span className={getWellnessValueColor(todayWellnessLog.sleep_hours, "sleep_hours")}>{todayWellnessLog.sleep_hours}h</span>
                        {todayWellnessLog.sleep_quality != null && (
                          <> (<span className={getWellnessValueColor(todayWellnessLog.sleep_quality, "sleep_quality")}>{getSleepQualityLabel(todayWellnessLog.sleep_quality)}</span>)</>
                        )}
                      </span>
                    )}
                    {todayWellnessLog.stress_level != null && (() => {
                      const uiValue = dbToUiScale(todayWellnessLog.stress_level);
                      return uiValue != null ? (
                        <span>
                          Stress: <span className={getWellnessValueColor(uiValue, "stress")}>{uiValue}/5</span>
                        </span>
                      ) : null;
                    })()}
                    {todayWellnessLog.soreness_level != null && (() => {
                      const uiValue = dbToUiScale(todayWellnessLog.soreness_level);
                      return uiValue != null ? (
                        <span>
                          Soreness: <span className={getWellnessValueColor(uiValue, "soreness")}>{uiValue}/5</span>
                        </span>
                      ) : null;
                    })()}
                    {todayWellnessLog.steps != null && (
                      <span className="fc-text-primary">
                        Steps: {(todayWellnessLog.steps / 1000).toFixed(1)}K
                      </span>
                    )}
                  </div>
                  {checkinStreak > 0 && (
                    <p className="text-xs font-semibold fc-text-primary">
                      🔥 {checkinStreak}-day streak
                    </p>
                  )}
                  <Link href="/client/check-ins">
                    <button className="text-xs font-medium fc-text-subtle hover:fc-text-primary transition-colors inline-flex items-center gap-1">
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                  </Link>
                </div>
              </ClientGlassCard>
            </section>
          )}

          {/* Section 6: Streak & Stats Row */}
          {dashboardData && (
            <section className="mb-6">
              <div className="flex gap-3">
                {/* Streak */}
                <ClientGlassCard className="flex-1 p-3 text-center border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-900/20">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <span className="text-base" aria-hidden>🔥</span>
                    <span className="text-lg font-bold text-amber-400 tabular-nums">
                      {streak}
                    </span>
                  </div>
                  <p className="text-xs fc-text-dim">day streak</p>
                </ClientGlassCard>

                {/* Weekly Progress */}
                <ClientGlassCard className="flex-1 p-3 text-center border-l-4 border-cyan-500/40 bg-cyan-950/20 dark:bg-cyan-950/30">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Dumbbell className="w-4 h-4 text-cyan-400" />
                    <span className="text-lg font-bold text-cyan-400 tabular-nums">
                      {weeklyProgress.current}/{weeklyProgress.goal || 0}
                    </span>
                  </div>
                  <p className="text-xs fc-text-dim">this week</p>
                </ClientGlassCard>

                {/* Program Progress */}
                {programProgressData && programProgressData.totalSlots > 0 && (
                  <ClientGlassCard className="flex-1 p-3 text-center min-w-0">
                    <div className="flex items-center justify-center mb-1">
                      <div className="relative w-12 h-12">
                        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                          <circle cx="24" cy="24" r="19" fill="none" stroke="var(--fc-glass-border)" strokeWidth="3.5" />
                          <circle cx="24" cy="24" r="19" fill="none" stroke="#06b6d4" strokeWidth="3.5" strokeLinecap="round"
                            strokeDasharray={`${Math.min(100, programProgressData.percent) * 1.194} 999`} />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black fc-text-primary">
                          {programProgressData.percent}%
                        </span>
                      </div>
                    </div>
                    <p className="text-xs fc-text-dim">
                      Week {programProgressData.currentWeek}/{programProgressData.totalWeeks}
                    </p>
                  </ClientGlassCard>
                )}
              </div>
            </section>
          )}

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
            <Link
              href="/client/progress"
              className="inline-flex items-center gap-2 text-sm font-medium fc-text-primary hover:fc-text-subtle transition-colors"
            >
              View full progress
              <ChevronRight className="w-4 h-4" />
            </Link>
          </section>

            </>
          )}
        </ClientPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
