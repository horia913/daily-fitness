"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import {
  ArrowLeft,
  Scale,
  TrendingUp,
  TrendingDown,
  Plus,
  Activity,
  Target,
  ListFilter,
  ChevronRight,
  Camera,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { LogMeasurementModal } from "@/components/client/LogMeasurementModal";
import { AchievementUnlockModal } from "@/components/ui/AchievementUnlockModal";
import type { Achievement } from "@/components/ui/AchievementCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BodyMeasurement } from "@/lib/measurementService";
import type { NewlyUnlockedAchievement } from "@/lib/achievementService";
import { MeasurementMiniChart } from "@/components/progress/MeasurementMiniChart";
import { EmptyState } from "@/components/ui/EmptyState";
import { getPhotosForDate } from "@/lib/progressPhotoService";
import { getNutritionComplianceTrend, parseNutritionGoalsFromRows } from "@/lib/nutritionLogService";

interface BodyMetric {
  date: string;
  weight: number;
  waist?: number;
  bodyFat?: number;
}

function formatTimeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffHours = Math.round((now.getTime() - d.getTime()) / (60 * 60 * 1000));
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function BodyMetricsPageContent() {
  const { user, loading: authLoading } = useAuth();
  const { performanceSettings } = useTheme();

  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [fullMeasurements, setFullMeasurements] = useState<BodyMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);
  const [newAchievementsQueue, setNewAchievementsQueue] = useState<Achievement[]>([]);
  const [achievementModalIndex, setAchievementModalIndex] = useState(0);
  const [chartRange, setChartRange] = useState<"12M" | "6M" | "1M">("12M");
  const [activeTab, setActiveTab] = useState<"weight-bf" | "measurements">("weight-bf");
  const [latestDatePhotos, setLatestDatePhotos] = useState<{ url: string; type: string }[]>([]);
  const [previousDatePhotos, setPreviousDatePhotos] = useState<{ url: string; type: string }[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingStartedAt, setLoadingStartedAt] = useState<number | null>(null);
  const [checkInGoals, setCheckInGoals] = useState<Array<{ id: string; title: string; target_value: number; target_unit: string | null }>>([]);
  const [hasNutritionGoals, setHasNutritionGoals] = useState(false);
  const [nutritionAdherence30, setNutritionAdherence30] = useState<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadMetricsData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setLoadError(null);
    setLoadingStartedAt(Date.now());
    try {
      // Load 12 months of data (for 12M range)
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      const dateFrom = twelveMonthsAgo.toISOString().split("T")[0];

      // Single body_metrics fetch (full columns); chart subset derived client-side
      const { data: fullData, error: fullError } = await supabase
        .from("body_metrics")
        .select("*")
        .eq("client_id", user.id)
        .gte("measured_date", dateFrom)
        .order("measured_date", { ascending: false });

      if (fullError) {
        console.error("Error loading body metrics:", fullError);
        setFullMeasurements([]);
        setMetrics([]);
      } else {
        setFullMeasurements(fullData || []);
        // Derive chart subset from full data (ascending by date for chart)
        const sorted = [...(fullData || [])].sort(
          (a, b) => a.measured_date.localeCompare(b.measured_date)
        );
        setMetrics(
          sorted.map((m) => ({
            date: m.measured_date,
            weight: m.weight_kg,
            waist: m.waist_circumference ?? undefined,
            bodyFat: m.body_fat_percentage ?? undefined,
          }))
        );
      }

      // Single goals fetch for both check-in and nutrition pillars
      const { data: goalsData } = await supabase
        .from("goals")
        .select("id, title, target_value, target_unit, pillar")
        .eq("client_id", user.id)
        .in("pillar", ["checkins", "nutrition"])
        .eq("status", "active")
        .not("target_value", "is", null);

      const allGoals = goalsData || [];
      const checkInGoalsRows = allGoals.filter((g) => g.pillar === "checkins");
      const nutritionGoalsRows = allGoals.filter((g) => g.pillar === "nutrition");

      setCheckInGoals(
        checkInGoalsRows.map((g) => ({
          id: g.id,
          title: g.title ?? "",
          target_value: Number(g.target_value),
          target_unit: g.target_unit ?? null,
        }))
      );

      const nutritionGoals = parseNutritionGoalsFromRows(nutritionGoalsRows);
      setHasNutritionGoals(nutritionGoals != null);
      if (nutritionGoals != null) {
        const end30 = new Date();
        const start30 = new Date();
        start30.setDate(start30.getDate() - 30);
        const startStr = start30.toISOString().split("T")[0];
        const endStr = end30.toISOString().split("T")[0];
        const trend = await getNutritionComplianceTrend(
          user.id,
          startStr,
          endStr,
          nutritionGoals
        );
        const daysWithData = trend.filter((d) => d.compliance > 0).length;
        const avgAdherence =
          trend.length > 0
            ? Math.round(
                trend.reduce((s, d) => s + d.compliance, 0) / trend.length
              )
            : 0;
        setNutritionAdherence30(daysWithData > 0 ? avgAdherence : null);
      } else {
        setNutritionAdherence30(null);
      }
    } catch (err) {
      console.error("Error loading body metrics:", err);
      setLoadError(err instanceof Error ? err.message : "Failed to load metrics");
      setMetrics([]);
      setFullMeasurements([]);
    } finally {
      setLoading(false);
      setLoadingStartedAt(null);
    }
  }, [user]);

  useEffect(() => {
    if (!user || authLoading) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setLoading(false);
      setLoadError("Loading took too long. Tap Retry to try again.");
    }, 20_000);
    loadMetricsData().finally(() => {
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
  }, [loadMetricsData, user, authLoading]);

  // Latest = most recent check-in, previous = one before that (for "last vs current" comparison)
  const { latest, previous } = useMemo(() => {
    if (fullMeasurements.length === 0) return { latest: null, previous: null };
    const latestEntry = fullMeasurements[0];
    const previousEntry = fullMeasurements.length >= 2 ? fullMeasurements[1] : null;
    return { latest: latestEntry, previous: previousEntry };
  }, [fullMeasurements]);

  const daysSincePrevious = useMemo(() => {
    if (!previous?.measured_date) return null;
    const prev = new Date(previous.measured_date + "T12:00:00Z");
    const now = new Date();
    return Math.floor((now.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000));
  }, [previous]);

  useEffect(() => {
    if (!user?.id || !latest?.measured_date) {
      setLatestDatePhotos([]);
      return;
    }
    let cancelled = false;
    getPhotosForDate(user.id, latest.measured_date).then((photos) => {
      if (!cancelled)
        setLatestDatePhotos(photos.map((p) => ({ url: p.photo_url, type: p.photo_type })));
    });
    return () => { cancelled = true; };
  }, [user?.id, latest?.measured_date]);
  useEffect(() => {
    if (!user?.id || !previous?.measured_date) {
      setPreviousDatePhotos([]);
      return;
    }
    let cancelled = false;
    getPhotosForDate(user.id, previous.measured_date).then((photos) => {
      if (!cancelled)
        setPreviousDatePhotos(photos.map((p) => ({ url: p.photo_url, type: p.photo_type })));
    });
    return () => { cancelled = true; };
  }, [user?.id, previous?.measured_date]);

  const { current, previous: previousMetric } = useMemo(() => {
    if (metrics.length === 0) return { current: null, previous: null };
    const latestM = metrics[0];
    const prevM = metrics.length >= 2 ? metrics[1] : null;
    return { current: latestM, previous: prevM };
  }, [metrics]);

  const currentWeight = latest?.weight_kg ?? current?.weight ?? 0;
  const currentWaist = latest?.waist_circumference ?? current?.waist ?? 0;
  const currentBodyFat = latest?.body_fat_percentage ?? current?.bodyFat ?? 0;
  const weightChange = previous ? (latest?.weight_kg ?? 0) - (previous.weight_kg ?? 0) : 0;
  const waistChange =
    previous && (latest?.waist_circumference != null) && (previous.waist_circumference != null)
      ? (latest.waist_circumference ?? 0) - (previous.waist_circumference ?? 0)
      : null;
  const bodyFatChange =
    previous && (latest?.body_fat_percentage != null) && (previous.body_fat_percentage != null)
      ? (latest.body_fat_percentage ?? 0) - (previous.body_fat_percentage ?? 0)
      : null;
  const muscleChange = previous && (latest?.muscle_mass_kg != null) && (previous.muscle_mass_kg != null)
    ? (latest.muscle_mass_kg ?? 0) - (previous.muscle_mass_kg ?? 0)
    : null;

  const historyNewestFirst = useMemo(
    () => [...metrics].reverse(),
    [metrics]
  );

  const latestDate = metrics.length > 0 ? metrics[metrics.length - 1].date : null;

  // Nutrition vs body composition: last 30 days body_metrics + adherence
  const bodyMetricsLast30 = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    return fullMeasurements
      .filter((m) => m.measured_date >= cutoffStr)
      .sort((a, b) => a.measured_date.localeCompare(b.measured_date));
  }, [fullMeasurements]);

  const nutritionVsBodyInsight = useMemo(() => {
    if (!hasNutritionGoals || bodyMetricsLast30.length < 2 || nutritionAdherence30 == null)
      return null;
    const first = bodyMetricsLast30[0];
    const last = bodyMetricsLast30[bodyMetricsLast30.length - 1];
    const weightChange =
      (last?.weight_kg ?? 0) - (first?.weight_kg ?? 0);
    const highAdherence = nutritionAdherence30 >= 70;
    const lowAdherence = nutritionAdherence30 < 50;
    // "Goal direction": assume weight loss is common goal; if weight went down, trending toward goal
    const weightTowardGoal = weightChange < 0;
    const weightStable = Math.abs(weightChange) < 0.5;
    const weightProgress = Math.abs(weightChange) >= 0.5;

    let message: string;
    if (highAdherence && weightTowardGoal)
      message =
        "Nutrition consistency is paying off — your body composition is moving in the right direction";
    else if (highAdherence && weightStable)
      message =
        "You're eating consistently but weight is stable — this could mean body recomposition. Check circumferences and photos for the full picture";
    else if (lowAdherence && !weightProgress)
      message =
        "Inconsistent nutrition may be limiting your results. Try hitting your targets more consistently this week";
    else if (lowAdherence && weightProgress)
      message =
        "You're making progress even with inconsistent nutrition — imagine what consistent eating could do";
    else
      message =
        "Nutrition consistency is paying off — your body composition is moving in the right direction";

    return { message, weightChange, adherence: nutritionAdherence30 };
  }, [
    hasNutritionGoals,
    bodyMetricsLast30,
    nutritionAdherence30,
  ]);

  // Check if there's circumference data to show Measurements tab
  const hasCircumferenceData = useMemo(() => {
    return fullMeasurements.some((m) => 
      m.left_arm_circumference != null ||
      m.right_arm_circumference != null ||
      m.torso_circumference != null ||
      m.hips_circumference != null ||
      m.left_thigh_circumference != null ||
      m.right_thigh_circumference != null ||
      m.left_calf_circumference != null ||
      m.right_calf_circumference != null
    );
  }, [fullMeasurements]);

  if (loadError && !loading) {
    return (
      <ProtectedRoute>
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-32 pt-6 sm:px-6 lg:px-8 fc-page">
            <div className="fc-surface p-8 rounded-2xl border border-[color:var(--fc-surface-card-border)] text-center">
              <p className="text-[color:var(--fc-text-dim)] mb-4">{loadError}</p>
              <button type="button" onClick={() => { setLoadError(null); loadMetricsData(); }} className="fc-btn fc-btn-secondary fc-press h-11 px-6 text-sm">Retry</button>
            </div>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  if (authLoading || loading) {
    return (
      <ProtectedRoute>
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-32 pt-6 sm:px-6 lg:px-8 fc-page">
            <div className="fc-surface p-8 rounded-2xl">
              <div className="animate-pulse space-y-6">
                <div className="h-24 rounded-2xl bg-[color:var(--fc-glass-highlight)]" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 h-56 rounded-2xl bg-[color:var(--fc-glass-highlight)]" />
                  <div className="h-56 rounded-2xl bg-[color:var(--fc-glass-highlight)]" />
                </div>
                <div className="h-72 rounded-2xl bg-[color:var(--fc-glass-highlight)]" />
              </div>
            </div>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}
      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-32 pt-6 sm:px-6 lg:px-8 fc-page">
        {/* Header */}
        <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6 sm:p-10 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <Link href="/client/progress" className="fc-surface w-11 h-11 flex items-center justify-center rounded-xl shrink-0 border border-[color:var(--fc-surface-card-border)]">
                <ArrowLeft className="w-5 h-5 text-[color:var(--fc-text-primary)]" />
              </Link>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--fc-aurora)]/20 text-[color:var(--fc-accent)] shrink-0">
                  <Scale className="w-6 h-6" />
                </div>
                <div>
                  <nav className="flex items-center gap-2 text-sm text-[color:var(--fc-text-dim)] mb-1">
                    <Link href="/client/progress" className="hover:text-[color:var(--fc-text-primary)]">Progress</Link>
                    <ChevronRight className="w-3 h-3 shrink-0" />
                    <span className="text-[color:var(--fc-text-primary)]">Body Metrics</span>
                  </nav>
                  <h1 className="text-2xl font-bold tracking-tight text-[color:var(--fc-text-primary)]">
                    Body Metrics
                  </h1>
                  <p className="text-sm text-[color:var(--fc-text-dim)] mt-1">
                    {latestDate ? (
                      <>Updated {formatTimeAgo(latestDate)}</>
                    ) : (
                      <>Weight and measurements over time</>
                    )}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {latestDate && (
                <div className="flex items-center gap-3 fc-glass-soft px-4 py-2 rounded-2xl border border-[color:var(--fc-glass-border)] shrink-0">
                  <div className="w-2 h-2 rounded-full bg-[color:var(--fc-status-success)] animate-pulse" />
                  <span className="text-sm fc-text-subtle">
                    <span className="font-mono fc-text-primary">{formatTimeAgo(latestDate)}</span>
                  </span>
                </div>
              )}
              <Link
                href="/client/progress/photos"
                className="fc-glass-soft px-4 py-2 rounded-2xl border border-[color:var(--fc-glass-border)] flex items-center gap-2 text-sm font-medium fc-text-primary hover:bg-[color:var(--fc-glass-highlight)] transition-colors"
              >
                <Camera className="w-4 h-4" />
                Photos
              </Link>
            </div>
          </div>
        </div>

        {/* Goal Progress (check-in goals with body-metric targets) */}
        {checkInGoals.length > 0 && (() => {
          const goalCards: React.ReactNode[] = [];
          for (const goal of checkInGoals) {
            const unit = (goal.target_unit || "").toLowerCase();
            let current: number | null = null;
            let label = "";
            let lowerIsBetter = true;
            if (unit === "kg" || unit === "weight") {
              current = latest?.weight_kg ?? null;
              label = "Weight";
              lowerIsBetter = true;
            } else if (unit === "%" || unit === "body_fat") {
              current = latest?.body_fat_percentage ?? null;
              label = "Body fat";
              lowerIsBetter = true;
            } else if (unit === "cm" || unit === "waist") {
              current = latest?.waist_circumference ?? null;
              label = "Waist";
              lowerIsBetter = true;
            } else continue;
            const target = goal.target_value;
            const reached = current != null && (lowerIsBetter ? current <= target : current >= target);
            const progressPct = current != null && target > 0
              ? (lowerIsBetter ? Math.min(100, (target / current) * 100) : Math.min(100, (current / target) * 100))
              : 0;
            const remaining = current != null && !reached
              ? (lowerIsBetter ? (current - target).toFixed(1) : (target - current).toFixed(1))
              : null;
            goalCards.push(
              <div key={goal.id} className="fc-surface p-4 rounded-2xl border border-[color:var(--fc-surface-card-border)]">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 fc-text-subtle" />
                  <span className="font-semibold fc-text-primary">{goal.title}</span>
                </div>
                {latest == null ? (
                  <p className="text-sm fc-text-dim">Log your first measurement to track progress toward your goal.</p>
                ) : (
                  <>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="fc-text-subtle">Current {label}</span>
                      <span className="font-mono fc-text-primary">{current != null ? (label === "Body fat" ? `${current.toFixed(1)}%` : `${current.toFixed(1)} ${label === "Weight" ? "kg" : "cm"}`) : "—"}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[color:var(--fc-glass-border)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[color:var(--fc-status-success)] transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
                      />
                    </div>
                    {reached ? (
                      <p className="text-sm font-medium fc-text-success mt-2">Goal reached!</p>
                    ) : remaining != null ? (
                      <p className="text-sm fc-text-dim mt-2">{remaining} {label === "Weight" ? "kg" : label === "Body fat" ? "%" : "cm"} to go</p>
                    ) : null}
                  </>
                )}
              </div>
            );
          }
          return goalCards.length > 0 ? (
            <section className="mb-8 space-y-4">
              <h2 className="text-lg font-semibold fc-text-primary mb-3">Goal Progress</h2>
              <div className="space-y-4">{goalCards}</div>
            </section>
          ) : null;
        })()}

        {/* Nutrition vs Body Composition insight — only if nutrition goals + ≥2 body metrics in 30d */}
        {nutritionVsBodyInsight && (
          <section className="mb-8">
            <div className="fc-surface p-6 rounded-2xl border border-[color:var(--fc-surface-card-border)]">
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-[0_10px_20px_rgba(245,158,11,0.25)]">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold fc-text-primary">Nutrition & Body Composition</h2>
                  <p className="text-sm fc-text-dim">Last 30 days</p>
                </div>
              </div>
              <p className="fc-text-primary">{nutritionVsBodyInsight.message}</p>
            </div>
          </section>
        )}

        {metrics.length === 0 ? (
          <div className="fc-surface p-10 rounded-2xl border border-[color:var(--fc-surface-card-border)]">
            <EmptyState
              icon={Scale}
              title="No measurements yet"
              description="Log your first measurement to start tracking"
              action={{ label: "Log Measurement", onClick: () => setShowLogModal(true) }}
            />
          </div>
        ) : (
          <main className="space-y-8">
            {/* Last vs current comparison */}
            <section className="fc-surface p-6 sm:p-8 rounded-2xl border border-[color:var(--fc-surface-card-border)]">
              <h2 className="text-lg font-semibold fc-text-primary mb-1">Body check-in</h2>
              {previous && daysSincePrevious != null && (
                <p className="text-sm fc-text-dim mb-6">
                  Last check-in: {new Date(previous.measured_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} ({daysSincePrevious} day{daysSincePrevious === 1 ? "" : "s"} ago)
                </p>
              )}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[280px] border-collapse">
                  <thead>
                    <tr className="border-b border-[color:var(--fc-glass-border)]">
                      <th className="text-left py-3 pr-4 text-xs font-semibold fc-text-subtle uppercase"></th>
                      {previous && (
                        <>
                          <th className="text-right py-3 px-2 text-xs font-semibold fc-text-subtle">{new Date(previous.measured_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</th>
                          <th className="text-right py-3 px-2 text-xs font-semibold fc-text-primary">Current</th>
                          <th className="text-right py-3 pl-2 text-xs font-semibold fc-text-subtle">Change</th>
                        </>
                      )}
                      {!previous && <th className="text-right py-3 px-2 text-xs font-semibold fc-text-primary">Current</th>}
                    </tr>
                  </thead>
                  <tbody className="fc-text-primary">
                    <tr className="border-b border-[color:var(--fc-glass-border)]">
                      <td className="py-3 pr-4 font-medium">Weight</td>
                      {previous && <td className="text-right py-3 px-2 font-mono">{(previous.weight_kg ?? 0).toFixed(1)} kg</td>}
                      <td className="text-right py-3 px-2 font-mono">{(latest?.weight_kg ?? 0).toFixed(1)} kg</td>
                      {previous && (
                        <td className="text-right py-3 pl-2">
                          {weightChange !== 0 ? (
                            <span className={`text-sm font-bold ${weightChange < 0 ? "fc-text-success" : "fc-text-warning"}`}>
                              {weightChange < 0 ? "▼" : "▲"} {weightChange > 0 ? "+" : ""}{weightChange.toFixed(1)} kg
                            </span>
                          ) : "—"}
                        </td>
                      )}
                    </tr>
                    {(latest?.body_fat_percentage != null || previous?.body_fat_percentage != null) && (
                      <tr className="border-b border-[color:var(--fc-glass-border)]">
                        <td className="py-3 pr-4 font-medium">Body fat</td>
                        {previous && <td className="text-right py-3 px-2 font-mono">{(previous.body_fat_percentage ?? "—")}%</td>}
                        <td className="text-right py-3 px-2 font-mono">{(latest?.body_fat_percentage ?? "—")}%</td>
                        {previous && (
                          <td className="text-right py-3 pl-2">
                            {bodyFatChange != null && bodyFatChange !== 0 ? (
                              <span className={`text-sm font-bold ${bodyFatChange < 0 ? "fc-text-success" : "fc-text-warning"}`}>
                                {bodyFatChange < 0 ? "▼" : "▲"} {bodyFatChange > 0 ? "+" : ""}{bodyFatChange.toFixed(1)}%
                              </span>
                            ) : "—"}
                          </td>
                        )}
                      </tr>
                    )}
                    {(latest?.muscle_mass_kg != null || previous?.muscle_mass_kg != null) && (
                      <tr className="border-b border-[color:var(--fc-glass-border)]">
                        <td className="py-3 pr-4 font-medium">Muscle mass</td>
                        {previous && <td className="text-right py-3 px-2 font-mono">{(previous.muscle_mass_kg ?? "—").toString()} kg</td>}
                        <td className="text-right py-3 px-2 font-mono">{(latest?.muscle_mass_kg ?? "—").toString()} kg</td>
                        {previous && (
                          <td className="text-right py-3 pl-2">
                            {muscleChange != null && muscleChange !== 0 ? (
                              <span className={`text-sm font-bold ${muscleChange > 0 ? "fc-text-success" : "fc-text-warning"}`}>
                                {muscleChange > 0 ? "▲" : "▼"} {muscleChange > 0 ? "+" : ""}{muscleChange.toFixed(1)} kg
                              </span>
                            ) : "—"}
                          </td>
                        )}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Weight trend sparkline (last 8–12 points) */}
              {metrics.length >= 2 && (() => {
                const sparkData = metrics.slice(-12);
                const minW = Math.min(...sparkData.map((x) => x.weight));
                const maxW = Math.max(...sparkData.map((x) => x.weight));
                const range = maxW - minW || 1;
                return (
                  <div className="mt-6 pt-6 border-t border-[color:var(--fc-glass-border)]">
                    <p className="text-xs font-semibold fc-text-subtle uppercase mb-2">Weight trend (last 3 months)</p>
                    <div className="flex items-end gap-0.5 h-12">
                      {sparkData.map((m, i) => {
                        const h = ((m.weight - minW) / range) * 100;
                        return (
                          <div
                            key={`${m.date}-${i}`}
                            className="flex-1 min-w-[4px] rounded-t bg-[color:var(--fc-accent)]/60"
                            style={{ height: `${Math.max(h, 4)}%` }}
                            title={`${m.weight.toFixed(1)} kg · ${new Date(m.date).toLocaleDateString()}`}
                          />
                        );
                      })}
                    </div>
                    <div className="flex justify-between mt-1 text-[10px] fc-text-subtle font-mono">
                      <span>{sparkData[0]?.weight.toFixed(1)} kg</span>
                      <span>{sparkData[sparkData.length - 1]?.weight.toFixed(1)} kg</span>
                    </div>
                    {hasNutritionGoals && (
                      <p className="mt-3 text-sm">
                        <Link href="/client/nutrition" className="text-[color:var(--fc-accent)] hover:underline">
                          How&apos;s your nutrition?
                        </Link>
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Measurements comparison (previous vs current) */}
              {previous && latest && hasCircumferenceData && (() => {
                const rows: { label: string; prev: number | null; curr: number | null }[] = [
                  { label: "Chest", prev: previous.torso_circumference ?? null, curr: latest.torso_circumference ?? null },
                  { label: "Waist", prev: previous.waist_circumference ?? null, curr: latest.waist_circumference ?? null },
                  { label: "Hips", prev: previous.hips_circumference ?? null, curr: latest.hips_circumference ?? null },
                  { label: "Bicep (L)", prev: previous.left_arm_circumference ?? null, curr: latest.left_arm_circumference ?? null },
                  { label: "Bicep (R)", prev: previous.right_arm_circumference ?? null, curr: latest.right_arm_circumference ?? null },
                  { label: "Thigh (L)", prev: previous.left_thigh_circumference ?? null, curr: latest.left_thigh_circumference ?? null },
                  { label: "Thigh (R)", prev: previous.right_thigh_circumference ?? null, curr: latest.right_thigh_circumference ?? null },
                ].filter((r) => r.prev != null || r.curr != null);
                if (rows.length === 0) return null;
                return (
                  <div className="mt-6 pt-6 border-t border-[color:var(--fc-glass-border)]">
                    <p className="text-xs font-semibold fc-text-subtle uppercase mb-3">Measurements</p>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[240px] text-sm">
                        <thead>
                          <tr className="border-b border-[color:var(--fc-glass-border)]">
                            <th className="text-left py-2 pr-2 fc-text-subtle font-medium"></th>
                            {previous && <th className="text-right py-2 px-2 fc-text-subtle">{new Date(previous.measured_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</th>}
                            <th className="text-right py-2 px-2 fc-text-subtle">Current</th>
                            <th className="text-right py-2 pl-2 fc-text-subtle">Change</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r) => {
                            const change = r.prev != null && r.curr != null ? r.curr - r.prev : null;
                            return (
                              <tr key={r.label} className="border-b border-[color:var(--fc-glass-border)]/50">
                                <td className="py-2 pr-2 fc-text-primary">{r.label}</td>
                                <td className="text-right py-2 px-2 font-mono">{r.prev != null ? `${r.prev} cm` : "—"}</td>
                                <td className="text-right py-2 px-2 font-mono">{r.curr != null ? `${r.curr} cm` : "—"}</td>
                                <td className="text-right py-2 pl-2 font-mono">
                                  {change != null && change !== 0 ? (
                                    <span className={change < 0 ? "fc-text-success" : "fc-text-warning"}>{change > 0 ? "+" : ""}{change} cm</span>
                                  ) : "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* Progress photos comparison */}
              {(latestDatePhotos.length > 0 || previousDatePhotos.length > 0) && (
                <div className="mt-6 pt-6 border-t border-[color:var(--fc-glass-border)]">
                  <p className="text-xs font-semibold fc-text-subtle uppercase mb-3">Progress photos</p>
                  <div className="grid grid-cols-2 gap-4">
                    {previous && previousDatePhotos.length > 0 && (
                      <div>
                        <p className="text-[10px] fc-text-subtle mb-1">{new Date(previous.measured_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} (Previous)</p>
                        <div className="aspect-[3/4] rounded-xl overflow-hidden bg-[color:var(--fc-glass-soft)]">
                          <img src={previousDatePhotos[0].url} alt="Previous" className="w-full h-full object-cover" />
                        </div>
                      </div>
                    )}
                    {latest && latestDatePhotos.length > 0 && (
                      <div>
                        <p className="text-[10px] fc-text-subtle mb-1">{new Date(latest.measured_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} (Current)</p>
                        <div className="aspect-[3/4] rounded-xl overflow-hidden bg-[color:var(--fc-glass-soft)]">
                          <img src={latestDatePhotos[0].url} alt="Current" className="w-full h-full object-cover" />
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] fc-text-subtle mt-2">Swipe or scroll for more views</p>
                </div>
              )}
            </section>

            {/* Tabs: Weight & BF and Measurements */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "weight-bf" | "measurements")} className="fc-surface p-6 sm:p-8 rounded-2xl border border-[color:var(--fc-surface-card-border)]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <TabsList className="fc-glass-soft border border-[color:var(--fc-glass-border)]">
                  <TabsTrigger value="weight-bf" className="data-[state=active]:fc-glass">
                    Weight & BF
                  </TabsTrigger>
                  {hasCircumferenceData && (
                    <TabsTrigger value="measurements" className="data-[state=active]:fc-glass">
                      Measurements
                    </TabsTrigger>
                  )}
                </TabsList>
                <div className="flex fc-glass-soft p-1 rounded-xl border border-[color:var(--fc-glass-border)]">
                  {(["12M", "6M", "1M"] as const).map((range) => (
                    <button
                      key={range}
                      type="button"
                      onClick={() => setChartRange(range)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        chartRange === range
                          ? "fc-glass fc-text-primary"
                          : "fc-text-subtle hover:fc-text-primary"
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>

              <TabsContent value="weight-bf" className="mt-0">
                {metrics.length > 0 ? (
                  <div className="relative">
                    <div className="flex items-end justify-between gap-1 sm:gap-2 h-64">
                      {metrics.slice(-12).map((metric, index) => {
                        const maxW = Math.max(...metrics.map((m) => m.weight));
                        const minW = Math.min(...metrics.map((m) => m.weight));
                        const range = maxW - minW || 1;
                        const height = ((metric.weight - minW) / range) * 100;
                        
                        // Body fat secondary indicator (if data exists)
                        const hasBodyFat = metrics.some((m) => m.bodyFat != null);
                        const maxBF = hasBodyFat ? Math.max(...metrics.map((m) => m.bodyFat || 0)) : 0;
                        const minBF = hasBodyFat ? Math.min(...metrics.map((m) => m.bodyFat || 0)) : 0;
                        const rangeBF = maxBF - minBF || 1;
                        const heightBF = metric.bodyFat != null ? ((metric.bodyFat - minBF) / rangeBF) * 100 : 0;
                        
                        return (
                          <div key={`${metric.date}-${index}`} className="flex-1 flex flex-col items-center min-w-0 relative h-full">
                            {/* Body fat indicator (positioned in chart area, above bar) */}
                            {metric.bodyFat != null && heightBF > 0 && (
                              <div
                                className="absolute w-2 h-2 rounded-full bg-[color:var(--fc-status-success)] border border-[color:var(--fc-glass-border)] z-10"
                                style={{
                                  bottom: `calc(${Math.max(heightBF, 2)}% + 2rem)`,
                                }}
                                title={`Body Fat: ${metric.bodyFat}%`}
                              />
                            )}
                            {/* Weight bar */}
                            <div
                              className="w-full rounded-t-lg min-h-[20px] transition-opacity hover:opacity-90 relative"
                              style={{
                                height: `${Math.max(height, 8)}%`,
                                background:
                                  "linear-gradient(135deg, var(--fc-status-error) 0%, var(--fc-accent-blue) 100%)",
                              }}
                            />
                            <div className="mt-2 text-center truncate w-full">
                              <p className="text-xs font-semibold fc-text-primary truncate">
                                {metric.weight.toFixed(1)}
                              </p>
                              <p className="text-[10px] fc-text-subtle truncate">
                                {new Date(metric.date).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {metrics.some((m) => m.bodyFat != null) && (
                      <div className="flex items-center gap-3 mt-4 text-xs fc-text-subtle">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-[color:var(--fc-status-error)] to-[color:var(--fc-accent-blue)]" />
                          <span>Weight</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[color:var(--fc-status-success)]" />
                          <span>Body Fat %</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-center py-12 text-sm fc-text-dim">
                    Not enough data to show chart
                  </p>
                )}
              </TabsContent>

              <TabsContent value="measurements" className="mt-0">
                {fullMeasurements.length > 0 ? (
                  <div className="space-y-6">
                    {/* Comparison Summary Card */}
                    {(() => {
                      const sortedMeasurements = [...fullMeasurements].sort(
                        (a, b) => a.measured_date.localeCompare(b.measured_date)
                      );
                      const firstMeasurement = sortedMeasurements[0];
                      const lastMeasurement = sortedMeasurements[sortedMeasurements.length - 1];

                      if (!firstMeasurement || !lastMeasurement) return null;

                      const comparisons: Array<{
                        label: string;
                        change: number;
                        isGood: boolean;
                        hasData: boolean;
                      }> = [];

                      // Waist
                      if (
                        firstMeasurement.waist_circumference != null &&
                        lastMeasurement.waist_circumference != null
                      ) {
                        const change = lastMeasurement.waist_circumference - firstMeasurement.waist_circumference;
                        comparisons.push({
                          label: "Waist",
                          change,
                          isGood: change < 0, // Decrease is good
                          hasData: true,
                        });
                      }

                      // Hips
                      if (
                        firstMeasurement.hips_circumference != null &&
                        lastMeasurement.hips_circumference != null
                      ) {
                        const change = lastMeasurement.hips_circumference - firstMeasurement.hips_circumference;
                        comparisons.push({
                          label: "Hips",
                          change,
                          isGood: change < 0, // Decrease is good
                          hasData: true,
                        });
                      }

                      // Arms (average of left/right)
                      const firstArms = [
                        firstMeasurement.left_arm_circumference,
                        firstMeasurement.right_arm_circumference,
                      ].filter((v) => v != null);
                      const lastArms = [
                        lastMeasurement.left_arm_circumference,
                        lastMeasurement.right_arm_circumference,
                      ].filter((v) => v != null);
                      if (firstArms.length > 0 && lastArms.length > 0) {
                        const firstAvg = firstArms.reduce((a, b) => a + b, 0) / firstArms.length;
                        const lastAvg = lastArms.reduce((a, b) => a + b, 0) / lastArms.length;
                        const change = lastAvg - firstAvg;
                        comparisons.push({
                          label: "Arms",
                          change,
                          isGood: change > 0, // Increase is good (muscle growth)
                          hasData: true,
                        });
                      }

                      // Thighs (average)
                      const firstThighs = [
                        firstMeasurement.left_thigh_circumference,
                        firstMeasurement.right_thigh_circumference,
                      ].filter((v) => v != null);
                      const lastThighs = [
                        lastMeasurement.left_thigh_circumference,
                        lastMeasurement.right_thigh_circumference,
                      ].filter((v) => v != null);
                      if (firstThighs.length > 0 && lastThighs.length > 0) {
                        const firstAvg = firstThighs.reduce((a, b) => a + b, 0) / firstThighs.length;
                        const lastAvg = lastThighs.reduce((a, b) => a + b, 0) / lastThighs.length;
                        const change = lastAvg - firstAvg;
                        comparisons.push({
                          label: "Thighs",
                          change,
                          isGood: change > 0, // Increase is good
                          hasData: true,
                        });
                      }

                      // Calves (average)
                      const firstCalves = [
                        firstMeasurement.left_calf_circumference,
                        firstMeasurement.right_calf_circumference,
                      ].filter((v) => v != null);
                      const lastCalves = [
                        lastMeasurement.left_calf_circumference,
                        lastMeasurement.right_calf_circumference,
                      ].filter((v) => v != null);
                      if (firstCalves.length > 0 && lastCalves.length > 0) {
                        const firstAvg = firstCalves.reduce((a, b) => a + b, 0) / firstCalves.length;
                        const lastAvg = lastCalves.reduce((a, b) => a + b, 0) / lastCalves.length;
                        const change = lastAvg - firstAvg;
                        comparisons.push({
                          label: "Calves",
                          change,
                          isGood: change > 0, // Increase is good
                          hasData: true,
                        });
                      }

                      if (comparisons.length === 0) return null;

                      return (
                        <div className="fc-glass-soft p-4 rounded-xl border border-[color:var(--fc-glass-border)]">
                          <h3 className="text-sm font-semibold fc-text-primary mb-3">
                            Since {new Date(firstMeasurement.measured_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </h3>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                            {comparisons.map((comp) => (
                              <div key={comp.label} className="text-center">
                                <p className="text-xs fc-text-subtle mb-1">{comp.label}</p>
                                <p
                                  className={`text-sm font-bold font-mono ${
                                    comp.isGood
                                      ? "fc-text-success"
                                      : comp.change === 0
                                        ? "fc-text-subtle"
                                        : "fc-text-warning"
                                  }`}
                                >
                                  {comp.change > 0 ? "+" : ""}
                                  {comp.change.toFixed(1)} cm
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Measurement Charts Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Waist */}
                      {fullMeasurements.filter((m) => m.waist_circumference != null).length >= 2 && (
                        <MeasurementMiniChart
                          title="Waist"
                          measurements={fullMeasurements}
                          getValue={(m) => m.waist_circumference ?? null}
                          timeRange={chartRange}
                          isDecreaseGood={true}
                        />
                      )}

                      {/* Hips */}
                      {fullMeasurements.filter((m) => m.hips_circumference != null).length >= 2 && (
                        <MeasurementMiniChart
                          title="Hips"
                          measurements={fullMeasurements}
                          getValue={(m) => m.hips_circumference ?? null}
                          timeRange={chartRange}
                          isDecreaseGood={true}
                        />
                      )}

                      {/* Torso/Chest */}
                      {fullMeasurements.filter((m) => m.torso_circumference != null).length >= 2 && (
                        <MeasurementMiniChart
                          title="Torso/Chest"
                          measurements={fullMeasurements}
                          getValue={(m) => m.torso_circumference ?? null}
                          timeRange={chartRange}
                          isDecreaseGood={false}
                        />
                      )}

                      {/* Arms (Left & Right) */}
                      {fullMeasurements.filter(
                        (m) => m.left_arm_circumference != null || m.right_arm_circumference != null
                      ).length >= 2 && (
                        <MeasurementMiniChart
                          title="Arms"
                          measurements={fullMeasurements}
                          getValue={(m) => m.left_arm_circumference ?? null}
                          getValue2={(m) => m.right_arm_circumference ?? null}
                          label2="Right"
                          timeRange={chartRange}
                          isDecreaseGood={false}
                        />
                      )}

                      {/* Thighs (Left & Right) */}
                      {fullMeasurements.filter(
                        (m) => m.left_thigh_circumference != null || m.right_thigh_circumference != null
                      ).length >= 2 && (
                        <MeasurementMiniChart
                          title="Thighs"
                          measurements={fullMeasurements}
                          getValue={(m) => m.left_thigh_circumference ?? null}
                          getValue2={(m) => m.right_thigh_circumference ?? null}
                          label2="Right"
                          timeRange={chartRange}
                          isDecreaseGood={false}
                        />
                      )}

                      {/* Calves (Left & Right) */}
                      {fullMeasurements.filter(
                        (m) => m.left_calf_circumference != null || m.right_calf_circumference != null
                      ).length >= 2 && (
                        <MeasurementMiniChart
                          title="Calves"
                          measurements={fullMeasurements}
                          getValue={(m) => m.left_calf_circumference ?? null}
                          getValue2={(m) => m.right_calf_circumference ?? null}
                          label2="Right"
                          timeRange={chartRange}
                          isDecreaseGood={false}
                        />
                      )}

                      {/* Muscle mass */}
                      {fullMeasurements.filter((m) => m.muscle_mass_kg != null).length >= 2 && (
                        <MeasurementMiniChart
                          title="Muscle mass"
                          measurements={fullMeasurements}
                          getValue={(m) => m.muscle_mass_kg ?? null}
                          timeRange={chartRange}
                          isDecreaseGood={false}
                        />
                      )}

                      {/* Visceral fat */}
                      {fullMeasurements.filter((m) => m.visceral_fat_level != null).length >= 2 && (
                        <MeasurementMiniChart
                          title="Visceral fat"
                          measurements={fullMeasurements}
                          getValue={(m) => m.visceral_fat_level ?? null}
                          timeRange={chartRange}
                          isDecreaseGood={true}
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-center py-12 text-sm fc-text-dim">
                    No measurement data available
                  </p>
                )}
              </TabsContent>
            </Tabs>

            {/* Log history */}
            <div
              className="fc-surface p-6 rounded-2xl border border-[color:var(--fc-surface-card-border)] flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold fc-text-primary">Log history</h3>
                <ListFilter className="w-5 h-5 fc-text-subtle" />
              </div>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {historyNewestFirst.map((metric, index) => {
                  const prev = historyNewestFirst[index + 1];
                  const delta = prev ? metric.weight - prev.weight : null;
                  const d = new Date(metric.date);
                  const full = fullMeasurements.find((m) => m.measured_date === metric.date);
                  return (
                    <div
                      key={metric.date}
                      className="flex items-center justify-between p-4 rounded-2xl fc-glass-soft border border-[color:var(--fc-glass-border)] hover:bg-[color:var(--fc-glass-highlight)] transition-colors"
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className="w-12 h-12 rounded-xl fc-glass flex flex-col items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold fc-text-subtle uppercase">
                            {d.toLocaleDateString("en-US", { month: "short" })}
                          </span>
                          <span className="text-lg font-bold leading-none fc-text-primary">
                            {d.getDate()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold font-mono fc-text-primary">
                            {metric.weight.toFixed(1)} kg
                          </p>
                          <p className="text-xs fc-text-subtle truncate">
                            {[metric.bodyFat != null && `${metric.bodyFat}% BF`, metric.waist != null && `${metric.waist} cm waist`]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </p>
                          {full?.notes?.trim() && (
                            <p className="text-xs fc-text-dim mt-1 whitespace-pre-wrap break-words">{full.notes.trim()}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {delta !== null && delta !== 0 && (
                          <>
                            <p
                              className={`text-sm font-bold ${
                                delta < 0 ? "fc-text-success" : "fc-text-warning"
                              }`}
                            >
                              {delta > 0 ? "+" : ""}
                              {delta.toFixed(1)} kg
                            </p>
                            <p className="text-[10px] fc-text-subtle uppercase">vs previous</p>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-sm font-semibold fc-text-subtle mt-6 pt-4 border-t border-[color:var(--fc-glass-border)] text-center">
                {metrics.length} entr{metrics.length === 1 ? "y" : "ies"} total
              </p>
            </div>
          </main>
        )}

        {/* FAB */}
        <button
          type="button"
          onClick={() => setShowLogModal(true)}
          className="fixed bottom-24 right-6 z-40 w-14 h-14 rounded-2xl fc-btn fc-btn-primary flex items-center justify-center shadow-lg"
          aria-label="Log metrics"
        >
          <Plus className="w-8 h-8" />
        </button>
      </div>

      {showLogModal && user && (
        <LogMeasurementModal
          clientId={user.id}
          onClose={() => setShowLogModal(false)}
          onSuccess={() => loadMetricsData()}
          lastMeasurement={latest ?? undefined}
          onAchievementsUnlocked={(raw) => {
            const tierToRarity = (tier: string | null): Achievement["rarity"] =>
              !tier ? "uncommon" : tier === "platinum" ? "epic" : tier === "gold" ? "rare" : tier === "silver" ? "uncommon" : "common";
            const mapped: Achievement[] = raw.map((a) => ({
              id: a.templateId,
              name: a.templateName,
              description: a.description ?? "",
              icon: a.templateIcon ?? "🏆",
              rarity: tierToRarity(a.tier),
              unlocked: true,
            }));
            setNewAchievementsQueue(mapped);
            setAchievementModalIndex(0);
          }}
        />
      )}

      {newAchievementsQueue.length > 0 && (
        <AchievementUnlockModal
          achievement={newAchievementsQueue[achievementModalIndex] ?? null}
          visible={achievementModalIndex < newAchievementsQueue.length}
          onClose={() => {
            if (achievementModalIndex < newAchievementsQueue.length - 1) {
              setAchievementModalIndex((i) => i + 1);
            } else {
              setNewAchievementsQueue([]);
              setAchievementModalIndex(0);
            }
          }}
        />
      )}
    </AnimatedBackground>
  );
}

export default function BodyMetricsPage() {
  return (
    <ProtectedRoute>
      <BodyMetricsPageContent />
    </ProtectedRoute>
  );
}
