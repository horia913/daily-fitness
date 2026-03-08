"use client";

/**
 * Dashboard Page - Client Home
 * 
 * APPROACH: Pages render immediately with empty/placeholder content, then populate when data arrives.
 * This ensures the page is always functional, even if data fetching hangs or fails.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { ClientPageShell, ClientGlassCard } from "@/components/client-ui";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { AthleteScoreRing } from "@/components/client-ui/AthleteScoreRing";
import { ScoreBreakdown } from "@/components/client-ui/ScoreBreakdown";
import { AthleteScore } from "@/types/athleteScore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Flame,
  Dumbbell,
  BarChart3,
  CheckCircle,
  ChevronRight,
  Loader2,
  Pencil,
} from "lucide-react";
import {
  getTodayLog,
  getCheckinStreak,
  dbToUiScale,
  DailyWellnessLog,
} from "@/lib/wellnessService";

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


export default function ClientDashboard() {
  const { user, profile } = useAuth();
  const { performanceSettings } = useTheme();
  const router = useRouter();

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [athleteScore, setAthleteScore] = useState<AthleteScore | null>(null);
  const [hasCheckInToday, setHasCheckInToday] = useState<boolean | null>(null);
  const [todayWellnessLog, setTodayWellnessLog] = useState<DailyWellnessLog | null>(null);
  const [checkinStreak, setCheckinStreak] = useState<number>(0);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);

  const checkTodayCheckIn = useCallback(async () => {
    if (!user?.id) return;

    try {
      const [log, streak] = await Promise.all([
        getTodayLog(user.id),
        getCheckinStreak(user.id),
      ]);
      setTodayWellnessLog(log);
      setHasCheckInToday(!!log);
      setCheckinStreak(streak);
    } catch (err) {
      // Non-fatal - just don't show check-in prompt
      console.warn("Error checking check-in (non-critical):", err);
      setHasCheckInToday(null);
      setTodayWellnessLog(null);
      setCheckinStreak(0);
    }
  }, [user?.id]);

  const fetchAthleteScore = useCallback(async () => {
    const fetchWithRetry = async (): Promise<any> => {
      const response = await fetch("/api/client/athlete-score", {
        credentials: "include",
      });

      // Handle auth errors by refreshing session and retrying once
      if (response.status === 401 || response.status === 403) {
        const { supabase } = await import("@/lib/supabase");
        await supabase.auth.getSession(); // Force session refresh
        // Retry once
        const retryResponse = await fetch("/api/client/athlete-score", {
          credentials: "include",
        });
        if (!retryResponse.ok) {
          throw new Error("Failed to fetch athlete score after retry");
        }
        return retryResponse.json();
      }

      if (!response.ok) {
        throw new Error("Failed to fetch athlete score");
      }

      return response.json();
    };

    const data = await fetchWithRetry();
    setAthleteScore(data.score || null);
  }, []);

  const fetchDashboardData = async () => {
    const fetchWithRetry = async (): Promise<any> => {
      const response = await fetch("/api/client/dashboard", {
        credentials: "include",
      });

      // Handle auth errors by refreshing session and retrying once
      if (response.status === 401 || response.status === 403) {
        const { supabase } = await import("@/lib/supabase");
        await supabase.auth.getSession(); // Force session refresh
        // Retry once
        const retryResponse = await fetch("/api/client/dashboard", {
          credentials: "include",
        });
        if (!retryResponse.ok) {
          const errorData = await retryResponse.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to fetch dashboard data after retry");
        }
        return retryResponse.json();
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch dashboard data");
      }

      return response.json();
    };

    const data = await fetchWithRetry();
    setDashboardData(data);
  };

  const fetchAllData = async () => {
    // Fetch dashboard data and athlete score in parallel
    // Use Promise.allSettled so one failure doesn't block others
    const [dashResult, scoreResult, checkInResult] = await Promise.allSettled([
      fetchDashboardData(),
      fetchAthleteScore(),
      checkTodayCheckIn(),
    ]);

    // Process results — the fetch functions set state directly, but we handle errors here
    if (dashResult.status === "rejected") {
      setError(dashResult.reason?.message || "Failed to load dashboard");
    }

    if (scoreResult.status === "rejected") {
      setScoreError("Couldn't load score");
      console.warn("Athlete score error (non-critical):", scoreResult.reason);
    }

    if (checkInResult.status === "rejected") {
      // Non-fatal, just don't show check-in prompt
      setHasCheckInToday(null);
    }
  };

  const dashboardTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    if (dashboardTimeoutRef.current) clearTimeout(dashboardTimeoutRef.current);
    dashboardTimeoutRef.current = setTimeout(() => {
      dashboardTimeoutRef.current = null;
      setDataLoaded(true);
      setError("Loading took too long. Tap Retry to try again.");
    }, 20_000);

    (async () => {
      try {
        await fetchAllData();
      } catch (err: any) {
        console.error('Dashboard fetch error:', err);
        setError(err?.message || "Failed to load data");
      } finally {
        if (dashboardTimeoutRef.current) {
          clearTimeout(dashboardTimeoutRef.current);
          dashboardTimeoutRef.current = null;
        }
        setDataLoaded(true);
      }
    })();

    return () => {
      if (dashboardTimeoutRef.current) {
        clearTimeout(dashboardTimeoutRef.current);
        dashboardTimeoutRef.current = null;
      }
    };
  }, [user?.id]);

  const userName = dashboardData?.firstName || profile?.first_name || "there";
  const streak = dashboardData?.streak ?? 0;
  const weeklyProgress = dashboardData?.weeklyProgress ?? { current: 0, goal: 0 };
  const todaysWorkout = dashboardData?.todaysWorkout;

  // Calculate program progress (simplified - would need program state)
  const programProgress = 0; // TODO: Calculate from program state if available

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
          {!dataLoaded ? (
            /* Loading: skeleton layout */
            <>
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
              </>
            )}
          </section>

          {/* Section 4: Today's Quick Actions */}
          <section className="mb-6">
            <ClientGlassCard className="p-4">
              {todaysWorkout?.hasWorkout ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold fc-text-primary mb-1">
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
                    <button className="flex items-center gap-1.5 text-sm font-semibold fc-text-primary hover:opacity-80 transition-opacity">
                      Go to Training
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-2">
                  <p className="text-sm fc-text-dim">Rest day</p>
                  <p className="text-xs fc-text-dim mt-1">
                    No workout scheduled for today
                  </p>
                </div>
              )}
            </ClientGlassCard>
          </section>

          {/* Section 5: Daily Check-in Card */}
          {hasCheckInToday === false && (
            <section className="mb-6">
              <ClientGlassCard className="p-4">
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
                    <button className="w-full fc-btn fc-btn-primary py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
                      Check in
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </Link>
                </div>
              </ClientGlassCard>
            </section>
          )}

          {hasCheckInToday === true && todayWellnessLog && (
            <section className="mb-6">
              <ClientGlassCard className="p-4">
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
                      <span className="fc-text-primary">
                        Sleep: {todayWellnessLog.sleep_hours}h ({getSleepQualityLabel(todayWellnessLog.sleep_quality)})
                      </span>
                    )}
                    {todayWellnessLog.stress_level != null && (() => {
                      const uiValue = dbToUiScale(todayWellnessLog.stress_level);
                      const stressColor = uiValue && uiValue >= 4 ? "fc-text-error" : "fc-text-primary";
                      return (
                        <span className={stressColor}>
                          Stress: {uiValue}/5
                        </span>
                      );
                    })()}
                    {todayWellnessLog.soreness_level != null && (() => {
                      const uiValue = dbToUiScale(todayWellnessLog.soreness_level);
                      const sorenessColor = uiValue && uiValue >= 4 ? "fc-text-error" : "fc-text-primary";
                      return (
                        <span className={sorenessColor}>
                          Soreness: {uiValue}/5
                        </span>
                      );
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
                <ClientGlassCard className="flex-1 p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Flame className="w-4 h-4 fc-text-warning" />
                    <span className="text-lg font-bold fc-text-primary">
                      {streak}
                    </span>
                  </div>
                  <p className="text-xs fc-text-dim">day streak</p>
                </ClientGlassCard>

                {/* Weekly Progress */}
                <ClientGlassCard className="flex-1 p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Dumbbell className="w-4 h-4 fc-text-primary" />
                    <span className="text-lg font-bold fc-text-primary">
                      {weeklyProgress.current}/{weeklyProgress.goal || 0}
                    </span>
                  </div>
                  <p className="text-xs fc-text-dim">this week</p>
                </ClientGlassCard>

                {/* Program Progress */}
                {programProgress > 0 && (
                  <ClientGlassCard className="flex-1 p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <BarChart3 className="w-4 h-4 fc-text-primary" />
                      <span className="text-lg font-bold fc-text-primary">
                        {programProgress}%
                      </span>
                    </div>
                    <p className="text-xs fc-text-dim">program</p>
                  </ClientGlassCard>
                )}
              </div>
            </section>
          )}

            </>
          )}

          {/* Error State */}
          {error && (
            <ClientGlassCard className="p-6 text-center">
              <p className="text-sm fc-text-dim mb-4">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  fetchAllData().then(() => setDataLoaded(true)).catch((err) => setError(err?.message || "Failed to load data"));
                }}
                className="fc-btn fc-btn-secondary fc-press h-10 px-6 text-sm"
              >
                Retry
              </button>
            </ClientGlassCard>
          )}
        </ClientPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
