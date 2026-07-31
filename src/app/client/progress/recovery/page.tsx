"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { ClientPageShell } from "@/components/client-ui";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { BarChart3, Dumbbell } from "lucide-react";
import { PsHero } from "@/components/client/progress-suite";
import ps from "@/components/client/progress-suite/progressSuiteV1.module.css";
import {
  getWeeklyVolume,
  getWorkoutsWithVolumeForSleepAnalysis,
  type VolumeStats,
  type WorkoutWithVolumeForSleep,
} from "@/lib/volumeAnalytics";
import { resolveStatsTabTimezone } from "@/lib/clientAnalyticsService";
import { getWellnessTrends, type WellnessStats } from "@/lib/wellnessAnalytics";
import { WellnessTrendChart } from "@/components/progress/WellnessTrendChart";
import { supabase } from "@/lib/supabase";
import { EmptyState } from "@/components/ui/EmptyState";
import { progressBackHref } from "@/lib/clientProgressNav";

export default function RecoveryProgressPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [fromCheckIns, setFromCheckIns] = useState(false);
  const [volumeStats, setVolumeStats] = useState<VolumeStats | null>(null);
  const [wellnessStats, setWellnessStats] = useState<WellnessStats | null>(null);
  const [workoutsForSleepAnalysis, setWorkoutsForSleepAnalysis] = useState<
    WorkoutWithVolumeForSleep[]
  >([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFromCheckIns(params.get("from") === "check-ins");
  }, []);

  const backHref = progressBackHref(fromCheckIns);

  const loadData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [{ data: paRow }, { data: profRow }] = await Promise.all([
        supabase
          .from("program_assignments")
          .select("timezone_snapshot")
          .eq("client_id", user.id)
          .eq("status", "active")
          .maybeSingle(),
        supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle(),
      ]);
      const tz = resolveStatsTabTimezone(
        paRow?.timezone_snapshot as string | undefined,
        profRow?.timezone as string | undefined,
      );
      const [vs, ws, sleepList] = await Promise.all([
        getWeeklyVolume(user.id, 26, tz),
        getWellnessTrends(user.id, 60),
        getWorkoutsWithVolumeForSleepAnalysis(user.id, 30),
      ]);
      setVolumeStats(vs);
      setWellnessStats(ws);
      setWorkoutsForSleepAnalysis(sleepList);
    } catch (e) {
      console.error("recovery hub load:", e);
      setVolumeStats(null);
      setWellnessStats(null);
      setWorkoutsForSleepAnalysis([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setLoading(false);
    }, 20_000);
    void loadData().finally(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    });
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [user?.id, loadData]);

  const recoveryInsight = useMemo(() => {
    const fourWeeksVolume = volumeStats?.weeklyData?.slice(-4) ?? [];
    const dailyWellness = wellnessStats?.dailyData ?? [];
    if (fourWeeksVolume.length < 2)
      return { insight: null, chartData: [], notEnoughData: true };

    const getWeekStartStr = (dateStr: string): string => {
      const d = new Date(dateStr + "T12:00:00");
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      d.setDate(d.getDate() + diff);
      return d.toISOString().split("T")[0];
    };

    const weekWellnessMap = new Map<
      string,
      { sorenessSum: number; sorenessN: number; sleepSum: number; sleepN: number }
    >();
    dailyWellness.forEach((d) => {
      const key = getWeekStartStr(d.date);
      const cur = weekWellnessMap.get(key) ?? {
        sorenessSum: 0,
        sorenessN: 0,
        sleepSum: 0,
        sleepN: 0,
      };
      if (d.sorenessLevel != null) {
        cur.sorenessSum += d.sorenessLevel;
        cur.sorenessN += 1;
      }
      if (d.sleepQuality != null) {
        cur.sleepSum += d.sleepQuality;
        cur.sleepN += 1;
      }
      weekWellnessMap.set(key, cur);
    });

    const chartData = fourWeeksVolume.map((w) => {
      const ww = weekWellnessMap.get(w.weekStart);
      const avgSoreness =
        ww && ww.sorenessN > 0 ? ww.sorenessSum / ww.sorenessN : null;
      const avgSleep =
        ww && ww.sleepN > 0 ? ww.sleepSum / ww.sleepN : null;
      return {
        weekStart: w.weekStart,
        volume: w.totalVolume,
        avgSoreness,
        avgSleep,
      };
    });

    const week1 = chartData[0];
    const week4 = chartData[chartData.length - 1];
    const vol1 = week1?.volume ?? 0;
    const vol4 = week4?.volume ?? 0;
    const sore1 = week1?.avgSoreness ?? null;
    const sore4 = week4?.avgSoreness ?? null;

    const volChange = vol1 > 0 ? (vol4 - vol1) / vol1 : 0;
    const volumeUp = volChange > 0.05;
    const volumeDown = volChange < -0.05;
    const volumeStable = !volumeUp && !volumeDown;

    const sorenessUp =
      sore1 != null && sore4 != null && sore4 > sore1 + 0.2;
    const sorenessDown =
      sore1 != null && sore4 != null && sore4 < sore1 - 0.2;
    const sorenessStable =
      sore1 == null || sore4 == null || (!sorenessUp && !sorenessDown);

    let insight: string;
    if (volumeUp && (sorenessDown || sorenessStable))
      insight =
        "Great recovery adaptation — your body is handling the increased load well";
    else if (volumeUp && sorenessUp)
      insight =
        "Recovery may need attention — soreness is rising with volume. Consider a deload or extra rest";
    else if (volumeStable && sorenessStable)
      insight =
        "Consistent training and recovery — you're in a good rhythm";
    else if (volumeDown) insight = "Training volume decreased this week";
    else
      insight =
        "Consistent training and recovery — you're in a good rhythm";

    return {
      insight,
      chartData,
      notEnoughData: false,
    };
  }, [volumeStats, wellnessStats]);

  const sleepVsPerformanceInsight = useMemo(() => {
    const sleepByDate = new Map<string, number>();
    wellnessStats?.dailyData?.forEach((d) => {
      if (d.sleepQuality != null) sleepByDate.set(d.date, d.sleepQuality);
    });

    const withSleep = workoutsForSleepAnalysis.filter((w) =>
      sleepByDate.has(w.previousNightDate),
    );
    if (withSleep.length < 5)
      return {
        message:
          "Log more sleep data to see how it affects your training",
        percentDiff: null,
      };

    const goodSleep = withSleep.filter(
      (w) => (sleepByDate.get(w.previousNightDate) ?? 0) >= 4,
    );
    const poorSleep = withSleep.filter(
      (w) => (sleepByDate.get(w.previousNightDate) ?? 0) <= 2,
    );

    const avgVolume = (arr: WorkoutWithVolumeForSleep[]) =>
      arr.length > 0
        ? arr.reduce((s, w) => s + w.volume, 0) / arr.length
        : 0;

    const goodAvg = avgVolume(goodSleep);
    const poorAvg = avgVolume(poorSleep);
    const clearCorrelation = poorAvg > 0 && goodAvg >= poorAvg * 1.1;

    let message: string;
    if (goodSleep.length >= 5 && poorSleep.length >= 1 && clearCorrelation) {
      const pct = Math.round(((goodAvg - poorAvg) / poorAvg) * 100);
      message = `Your best workouts happen after quality sleep — averaging ${pct}% more volume on well-rested days`;
    } else if (withSleep.length >= 5) {
      message =
        "Your performance stays consistent regardless of sleep — impressive resilience";
    } else {
      message =
        "Log more sleep data to see how it affects your training";
    }

    return {
      message,
      percentDiff:
        poorAvg > 0 && goodAvg >= poorAvg * 1.1
          ? Math.round(((goodAvg - poorAvg) / poorAvg) * 100)
          : null,
    };
  }, [wellnessStats, workoutsForSleepAnalysis]);

  if (loading) {
    return (
      <ProtectedRoute requiredRole="client">
        <ClientPageShell className="max-w-lg lg:max-w-3xl mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 overflow-x-hidden">
            <PageSkeleton variant="dashboard" />
          </ClientPageShell>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="client">
      <ClientPageShell className="max-w-lg lg:max-w-3xl mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 overflow-x-hidden">
          <div className={ps.psV1}>
            <PsHero
              glow="purple"
              onBack={() => router.push(backHref)}
              backAriaLabel={
                fromCheckIns ? "Back to check-ins" : "Back to progress hub"
              }
              eyebrow={
                fromCheckIns ? "Check-in · recovery" : "Progress · recovery"
              }
              eyebrowColor="var(--fc-group-b)"
              title="Recovery & Wellness"
              subtitle="Training load, soreness, sleep, and trends"
            />

            <div className="fc-card-shell p-4 mt-4">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--fc-domain-habits)] shadow-[0_10px_20px_color-mix(in_srgb,var(--fc-domain-habits)_25%,transparent)]">
                  <Dumbbell className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white tracking-tight">
                    Recovery Insight
                  </h2>
                  <p className="text-xs fc-text-dim">
                    Training load vs recovery (last 4 weeks)
                  </p>
                </div>
              </div>
              {recoveryInsight.notEnoughData ? (
                <EmptyState
                  variant="compact"
                  title="Not enough data yet"
                  description="Keep logging workouts and check-ins to see recovery insights."
                  actionLabel="Go to check-ins"
                  actionHref="/client/check-ins"
                />
              ) : (
                <>
                  <p className="mb-4 text-[color:var(--fc-text-primary)]">
                    {recoveryInsight.insight}
                  </p>
                  {recoveryInsight.chartData.length > 0 && (
                    <div className="relative overflow-x-auto">
                      <svg
                        width="100%"
                        height={140}
                        viewBox="0 0 400 140"
                        className="min-w-[280px]"
                      >
                        <defs>
                          <linearGradient
                            id="recoveryBarRecoveryPage"
                            x1="0%"
                            y1="0%"
                            x2="0%"
                            y2="100%"
                          >
                            <stop
                              offset="0%"
                              stopColor="var(--fc-group-b)"
                              stopOpacity="0.9"
                            />
                            <stop
                              offset="100%"
                              stopColor="var(--fc-group-b)"
                              stopOpacity="0.55"
                            />
                          </linearGradient>
                        </defs>
                        {(() => {
                          const data = recoveryInsight.chartData;
                          const maxVol = Math.max(...data.map((w) => w.volume), 1);
                          const pad = { left: 40, right: 20, top: 20, bottom: 28 };
                          const w = 400 - pad.left - pad.right;
                          const h = 140 - pad.top - pad.bottom;
                          const barW = w / data.length - 8;
                          const maxSore = 5;
                          const hasSoreness = data.some((w) => w.avgSoreness != null);
                          return (
                            <>
                              {data.map((week, i) => {
                                const x = pad.left + (i / data.length) * w + 4;
                                const barH = (week.volume / maxVol) * h;
                                const y = pad.top + h - barH;
                                const weekLabel = new Date(
                                  week.weekStart + "T12:00:00",
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                });
                                return (
                                  <g key={week.weekStart}>
                                    <rect
                                      x={x}
                                      y={y}
                                      width={barW}
                                      height={Math.max(barH, 4)}
                                      fill="url(#recoveryBarRecoveryPage)"
                                      rx="4"
                                    />
                                    <text
                                      x={x + barW / 2}
                                      y={140 - 8}
                                      textAnchor="middle"
                                      className="text-xs fill-[color:var(--fc-text-dim)]"
                                    >
                                      {weekLabel}
                                    </text>
                                  </g>
                                );
                              })}
                              {hasSoreness && (
                                <polyline
                                  points={data
                                    .map((week, i) => {
                                      if (week.avgSoreness == null) return null;
                                      const x =
                                        pad.left + (i / data.length) * w + 4 + barW / 2;
                                      const y =
                                        pad.top +
                                        h -
                                        (week.avgSoreness / maxSore) * h;
                                      return `${x},${y}`;
                                    })
                                    .filter((p): p is string => p != null)
                                    .join(" ")}
                                  fill="none"
                                  stroke="var(--fc-effort-hard)"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              )}
                              {hasSoreness &&
                                data.map((week, i) => {
                                  if (week.avgSoreness == null) return null;
                                  const x =
                                    pad.left + (i / data.length) * w + 4 + barW / 2;
                                  const y =
                                    pad.top +
                                    h -
                                    (week.avgSoreness / maxSore) * h;
                                  return (
                                    <circle
                                      key={week.weekStart}
                                      cx={x}
                                      cy={y}
                                      r="4"
                                      fill="var(--fc-effort-hard)"
                                      stroke="var(--fc-bg-deep)"
                                      strokeWidth="1.5"
                                    />
                                  );
                                })}
                            </>
                          );
                        })()}
                      </svg>
                      <div className="mt-1 flex justify-center gap-4 text-xs text-[color:var(--fc-text-dim)]">
                        <span>Bar: volume</span>
                        <span>Line: avg soreness (1–5)</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="fc-card-shell p-4 mt-4">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--fc-accent)] shadow-[0_10px_20px_color-mix(in_srgb,var(--fc-accent)_25%,transparent)]">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white tracking-tight">
                    Sleep vs Performance
                  </h2>
                  <p className="text-xs fc-text-dim">
                    How rest affects your workouts (last 30 days)
                  </p>
                </div>
              </div>
              <p className="text-[color:var(--fc-text-primary)]">
                {sleepVsPerformanceInsight.message}
              </p>
            </div>

            {wellnessStats && wellnessStats.dailyData.length > 0 ? (
              <div className="mt-4">
                <WellnessTrendChart wellnessStats={wellnessStats} />
              </div>
            ) : (
              <div className="fc-card-shell p-4 mt-4">
                <EmptyState
                  variant="compact"
                  title="No wellness trend data"
                  description="Log daily check-ins to see mood, soreness, and sleep trends."
                  actionLabel="Go to check-ins"
                  actionHref="/client/check-ins"
                />
              </div>
            )}
          </div>
        </ClientPageShell>
    </ProtectedRoute>
  );
}
