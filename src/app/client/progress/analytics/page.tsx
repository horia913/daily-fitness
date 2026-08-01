"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { ClientPageShell } from "@/components/client-ui";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  type StrengthTimeRange,
  countDistinctExercisesWithSetsInRange,
} from "@/lib/strengthAnalytics";
import { supabase } from "@/lib/supabase";
import { getWeeklyVolume, type VolumeStats } from "@/lib/volumeAnalytics";
import { resolveStatsTabTimezone } from "@/lib/clientAnalyticsService";
import { getWellnessTrends, type WellnessStats } from "@/lib/wellnessAnalytics";
import { cn } from "@/lib/utils";
import hub from "@/components/coach-analytics/coachAnalyticsHub.module.css";
import { withTimeout } from "@/lib/withTimeout";
import { fetchTrainingRhythmSummary, type TrainingRhythmSummary } from "@/lib/clientProgressAnalyticsRhythm";
import { AnalyticsV6UtilityBar } from "@/components/client-progress-analytics/AnalyticsV6UtilityBar";
import { ProgressAnalyticsHero } from "@/components/client-progress-analytics/ProgressAnalyticsHero";
import { TopStatsPaired } from "@/components/client-progress-analytics/TopStatsPaired";
import { TrainingRhythmSection } from "@/components/client-progress-analytics/TrainingRhythmSection";
import { TrainingVolumeSection } from "@/components/client-progress-analytics/TrainingVolumeSection";
import v6 from "@/components/client-progress-analytics/progressAnalyticsV6.module.css";
import type { VolumeWindowWeeks } from "@/components/client-progress-analytics/VolumeRangeTabs";
import { WellnessRecoverySection } from "@/components/client-progress-analytics/WellnessRecoverySection";
import { RecoveryInsightCard } from "@/components/client-progress-analytics/RecoveryInsightCard";
import { BodyCompositionSection } from "@/components/client-progress-analytics/BodyCompositionSection";
import { GoalCompletionSection } from "@/components/client-progress-analytics/GoalCompletionSection";

interface BodyCompositionData {
  date: string;
  weight: number;
  bodyFat?: number;
}

const RANGE_OPTIONS = ["1M", "3M", "6M", "1Y", "ALL"] as const;

function parseRangeParam(v: string | null): StrengthTimeRange {
  if (v && (RANGE_OPTIONS as readonly string[]).includes(v)) {
    return v as StrengthTimeRange;
  }
  return "3M";
}

function parseBodyFatPct(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = typeof raw === "number" ? raw : parseFloat(String(raw));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function weeksEyebrowForRange(tr: StrengthTimeRange): string {
  const d = analyticsRangeDays(tr);
  if (d == null) return "All time";
  const w = Math.max(1, Math.round(d / 7));
  return `${w} weeks`;
}

function analyticsRangeDays(tr: StrengthTimeRange): number | null {
  switch (tr) {
    case "1M":
      return 30;
    case "3M":
      return 90;
    case "6M":
      return 180;
    case "1Y":
      return 365;
    case "ALL":
      return null;
    default:
      return 90;
  }
}

function AnalyticsDrillLink({
  href,
  label,
  sub,
}: {
  href: string;
  label: string;
  sub: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-surface-card)] px-3 py-2.5 transition-colors hover:bg-white/[0.03]"
    >
      <div className="min-w-0">
        <p className="text-[13px] font-semibold fc-text-primary">{label}</p>
        <p className="mt-0.5 text-[11px] fc-text-dim">{sub}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 fc-text-dim" aria-hidden />
    </Link>
  );
}

function AnalyticsPageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [rhythmSummary, setRhythmSummary] = useState<TrainingRhythmSummary | null>(null);
  const [exercisesTrackedCount, setExercisesTrackedCount] = useState(0);
  const [latestBody, setLatestBody] = useState<{
    weightKg: number;
    bodyFatPct: number | null;
  } | null>(null);
  const [bodyComposition, setBodyComposition] = useState<BodyCompositionData[]>([]);
  const [goalCompletion, setGoalCompletion] = useState({ completed: 0, total: 0 });
  const [timeRange, setTimeRangeState] = useState<StrengthTimeRange>(() =>
    parseRangeParam(searchParams.get("range")),
  );
  const [rangeBusy, setRangeBusy] = useState(false);
  const [volumeChartWeeks, setVolumeChartWeeks] = useState<VolumeWindowWeeks>(12);
  const [volumeOnlyBusy, setVolumeOnlyBusy] = useState(false);

  const [volumeStats, setVolumeStats] = useState<VolumeStats | null>(null);
  const [wellnessStats, setWellnessStats] = useState<WellnessStats | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingStartedAt, setLoadingStartedAt] = useState<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clientTzRef = useRef<string>("UTC");
  const [sectionErr, setSectionErr] = useState<{ rhythm?: string; volume?: string }>({});

  const setTimeRange = useCallback(
    (tr: StrengthTimeRange) => {
      setTimeRangeState(tr);
      const q = new URLSearchParams();
      q.set("range", tr);
      const base = pathname || "/client/progress/analytics";
      router.replace(`${base}?${q.toString()}`, { scroll: false });
    },
    [pathname, router],
  );

  useEffect(() => {
    const r = parseRangeParam(searchParams.get("range"));
    setTimeRangeState((prev) => (prev === r ? prev : r));
  }, [searchParams]);

  const loadBodyComposition = async () => {
    if (!user?.id) return;
    try {
      const days = analyticsRangeDays(timeRange);
      const rangeStart = new Date();
      if (days != null) {
        rangeStart.setDate(rangeStart.getDate() - days);
      } else {
        rangeStart.setFullYear(rangeStart.getFullYear() - 3);
      }
      const startStr = rangeStart.toISOString().split("T")[0];

      const [latestRes, seriesRes] = await Promise.all([
        supabase
          .from("body_metrics")
          .select("measured_date, weight_kg, body_fat_percentage")
          .eq("client_id", user.id)
          .not("weight_kg", "is", null)
          .order("measured_date", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("body_metrics")
          .select("measured_date, weight_kg, body_fat_percentage")
          .eq("client_id", user.id)
          .not("weight_kg", "is", null)
          .gte("measured_date", startStr)
          .order("measured_date", { ascending: true })
          .limit(500),
      ]);

      if (latestRes.error) throw latestRes.error;
      if (seriesRes.error) throw seriesRes.error;

      const lr = latestRes.data;
      if (lr) {
        const w = parseFloat(String(lr.weight_kg)) || 0;
        setLatestBody({
          weightKg: w,
          bodyFatPct: parseBodyFatPct(lr.body_fat_percentage),
        });
      } else {
        setLatestBody(null);
      }

      const metrics = seriesRes.data;
      if (!metrics || metrics.length === 0) {
        setBodyComposition([]);
        return;
      }

      const compositionData: BodyCompositionData[] = metrics.map(
        (metric: {
          measured_date: string;
          weight_kg: unknown;
          body_fat_percentage?: unknown;
        }) => {
        const bf = parseBodyFatPct(metric.body_fat_percentage);
        return {
          date: new Date(metric.measured_date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          weight: parseFloat(String(metric.weight_kg)) || 0,
          bodyFat: bf ?? undefined,
        };
      });

      setBodyComposition(compositionData);
    } catch (error) {
      console.error("Error loading body composition:", error);
      setBodyComposition([]);
      setLatestBody(null);
    }
  };

  const loadGoalCompletion = async () => {
    if (!user) return;

    try {
      const { data: goals, error } = await supabase
        .from("goals")
        .select("status")
        .eq("client_id", user.id);

      if (error) throw error;

      const total = goals?.length || 0;
      const completed = goals?.filter((g: { status: string }) => g.status === "completed").length || 0;

      setGoalCompletion({ completed, total });
    } catch (error) {
      console.error("Error loading goal completion:", error);
      setGoalCompletion({ completed: 0, total: 0 });
    }
  };

  const loadWellnessStats = async () => {
    if (!user?.id) return;
    try {
      const days = analyticsRangeDays(timeRange) ?? 365;
      const stats = await getWellnessTrends(user.id, days);
      setWellnessStats(stats);
    } catch (error) {
      console.error("Error loading wellness stats:", error);
      setWellnessStats(null);
    }
  };

  const refetchVolumeWindow = useCallback(
    async (weeks: VolumeWindowWeeks) => {
      if (!user?.id) return;
      const tz = clientTzRef.current?.trim();
      if (!tz) return;
      setVolumeChartWeeks(weeks);
      setVolumeOnlyBusy(true);
      setSectionErr((e) => ({ ...e, volume: undefined }));
      try {
        const stats = await withTimeout(
          getWeeklyVolume(user.id, weeks, tz),
          14_000,
          "volume-local",
        );
        setVolumeStats(stats);
      } catch (e) {
        setSectionErr((prev) => ({
          ...prev,
          volume: e instanceof Error ? e.message : "Couldn't load volume",
        }));
      } finally {
        setVolumeOnlyBusy(false);
      }
    },
    [user?.id],
  );

  const volumeWeeksRef = useRef(volumeChartWeeks);
  volumeWeeksRef.current = volumeChartWeeks;

  const loadAnalyticsData = useCallback(
    async (opts?: { quiet?: boolean }) => {
      if (!user?.id) {
        setRhythmSummary(null);
        setBodyComposition([]);
        setLatestBody(null);
        setGoalCompletion({ completed: 0, total: 0 });
        setVolumeStats(null);
        setWellnessStats(null);
        setExercisesTrackedCount(0);
        setLoading(false);
        setRangeBusy(false);
        return;
      }

      if (opts?.quiet) setRangeBusy(true);
      else setLoading(true);
      setLoadError(null);
      setSectionErr({});
      setLoadingStartedAt(Date.now());

      const uid = user.id;
      const vw = volumeWeeksRef.current;
      const tr = timeRange;
      const T = 14_000;

      const msg = (reason: unknown) =>
        reason instanceof Error ? reason.message : "Request failed";

      try {
        const settled = await Promise.allSettled([
          withTimeout(fetchTrainingRhythmSummary(uid, tr), T, "rhythm"),
          withTimeout(
            (async () => {
              const [{ data: paRow }, { data: profRow }] = await Promise.all([
                supabase
                  .from("program_assignments")
                  .select("timezone_snapshot")
                  .eq("client_id", uid)
                  .eq("status", "active")
                  .maybeSingle(),
                supabase
                  .from("profiles")
                  .select("timezone")
                  .eq("id", uid)
                  .maybeSingle(),
              ]);
              const tz = resolveStatsTabTimezone(
                paRow?.timezone_snapshot as string | undefined,
                profRow?.timezone as string | undefined,
              );
              const resolved = (tz && tz.trim()) || "UTC";
              clientTzRef.current = resolved;
              return getWeeklyVolume(uid, vw, resolved);
            })(),
            T,
            "volume",
          ),
          withTimeout(loadBodyComposition(), T, "body"),
          withTimeout(loadGoalCompletion(), T, "goals"),
          withTimeout(loadWellnessStats(), T, "wellness"),
          withTimeout(countDistinctExercisesWithSetsInRange(uid, tr), T, "distinct"),
        ]);

        const [rRhythm, rVol, , , , rDistinct] = settled;

        if (rRhythm.status === "fulfilled") {
          setRhythmSummary(rRhythm.value);
          setSectionErr((e) => ({ ...e, rhythm: undefined }));
        } else {
          setRhythmSummary(null);
          setSectionErr((e) => ({ ...e, rhythm: msg(rRhythm.reason) }));
        }

        if (rVol.status === "fulfilled") {
          setVolumeStats(rVol.value);
          setSectionErr((e) => ({ ...e, volume: undefined }));
        } else {
          setVolumeStats(null);
          setSectionErr((e) => ({ ...e, volume: msg(rVol.reason) }));
        }

        if (rDistinct.status === "fulfilled") {
          setExercisesTrackedCount(rDistinct.value);
        } else {
          setExercisesTrackedCount(0);
        }
      } catch (error) {
        console.error("Error loading analytics data:", error);
        setLoadError(
          error instanceof Error ? error.message : "Failed to load analytics",
        );
      } finally {
        if (opts?.quiet) setRangeBusy(false);
        else setLoading(false);
        setLoadingStartedAt(null);
      }
    },
    // Loaders close over latest timeRange / user on each render; ref holds volume window.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- orchestrated parallel bundle
    [user?.id, timeRange],
  );

  const quietReloadRef = useRef(false);

  useEffect(() => {
    quietReloadRef.current = false;
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setLoading(false);
      setRangeBusy(false);
      setLoadError("Loading took too long. Tap Retry to try again.");
    }, 20_000);

    const quiet = quietReloadRef.current;
    quietReloadRef.current = true;

    void loadAnalyticsData({ quiet }).finally(() => {
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
  }, [loadAnalyticsData, user, timeRange]);

  const completionPercentage =
    goalCompletion.total > 0
      ? Math.round((goalCompletion.completed / goalCompletion.total) * 100)
      : 0;
  const latestBodyWeight = latestBody?.weightKg ?? null;
  const latestBodyFat = latestBody?.bodyFatPct ?? null;

  const noWorkoutsInRange =
    !loading &&
    !loadError &&
    (rhythmSummary?.workoutsLoggedInRange ?? 0) === 0;

  // Recovery insight: last 4 weeks volume + wellness (soreness/sleep) grouped by week
  const recoveryInsight = useMemo(() => {
    const fourWeeksVolume = volumeStats?.weeklyData?.slice(-4) ?? [];
    const dailyWellness = wellnessStats?.dailyData ?? [];
    if (fourWeeksVolume.length < 2) {
      return {
        insight: null as string | null,
        boldPhrases: [] as string[],
        chartData: [] as { weekStart: string; volume: number }[],
        notEnoughData: true,
      };
    }

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
    const boldPhrases: string[] = [];

    if (volumeUp && sorenessUp) {
      insight =
        "High training load with low recovery scores — consider a deload.";
      boldPhrases.push("low recovery scores");
    } else if (volumeUp && (sorenessDown || sorenessStable)) {
      insight =
        "Consistent training and recovery — you're in a good rhythm.";
      boldPhrases.push("good rhythm");
    } else if (volumeDown) {
      insight =
        "Recovery is good but training frequency is low — push a bit more.";
      boldPhrases.push("training frequency is low");
    } else if (volumeStable && sorenessStable) {
      insight =
        "Consistent training and recovery — you're in a good rhythm.";
      boldPhrases.push("good rhythm");
    } else {
      insight =
        "Consistent training and recovery — you're in a good rhythm.";
      boldPhrases.push("good rhythm");
    }

    const recoveryBars = fourWeeksVolume.map((w) => ({
      weekStart: w.weekStart,
      volume: w.totalVolume,
    }));

    return {
      insight,
      boldPhrases,
      chartData: recoveryBars,
      notEnoughData: false,
    };
  }, [volumeStats, wellnessStats]);

  return (
    <>
    <ClientPageShell className="max-w-xl mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 overflow-x-hidden">
        <div className={hub.hub}>
          <AnalyticsV6UtilityBar
            onBack={() => router.push("/client/progress")}
            onRefresh={() => {
              setLoadError(null);
              quietReloadRef.current = false;
              void loadAnalyticsData({ quiet: false });
            }}
            busy={loading || rangeBusy}
          />
          <ProgressAnalyticsHero
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            rangeDisabled={loading && !rangeBusy}
          />
          {rangeBusy && !loading ? (
            <p
              className="mt-2 text-center font-mono text-[9px] uppercase"
              style={{ color: "var(--t3)", letterSpacing: "0.12em" }}
            >
              Updating…
            </p>
          ) : null}
        </div>

        {loadError && !loading && !rangeBusy ? (
          <div className="fc-card-shell p-4 text-center">
            <p className="text-sm text-[color:var(--fc-text-dim)] mb-3">{loadError}</p>
            <Button
              variant="secondary"
              onClick={() => {
                setLoadError(null);
                quietReloadRef.current = false;
                void loadAnalyticsData({ quiet: false });
              }}
              className="h-10 px-4 text-sm"
            >
              Retry
            </Button>
          </div>
        ) : null}

        {loading && !rangeBusy ? (
          <div className={hub.hub} style={{ marginTop: 12 }}>
            <div className={v6.statsGrid}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={cn(v6.statPair, v6.shimmer, "h-[104px]")} />
              ))}
            </div>
            <div className={cn(v6.sectionCard, v6.shimmer, "mt-3 h-44")} />
            <div className={cn(v6.sectionCard, v6.shimmer, "mt-3 h-52")} />
          </div>
        ) : null}

        {!loading || rangeBusy ? (
          <div className={hub.hub} style={{ marginTop: 12 }}>
            {loading || rangeBusy ? (
              <>
                <div className={v6.statsGrid}>
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className={cn(v6.statPair, v6.shimmer, "h-[104px]")} />
                  ))}
                </div>
                <div className={cn(v6.sectionCard, v6.shimmer, "mt-3 h-44")} />
                <div className={cn(v6.sectionCard, v6.shimmer, "mt-3 h-52")} />
              </>
            ) : noWorkoutsInRange ? (
              <>
                <TopStatsPaired
                  weeksLabel={weeksEyebrowForRange(timeRange)}
                  workoutsLoggedInRange={0}
                  goalPct={completionPercentage}
                  goalsCompleted={goalCompletion.completed}
                  goalsTotal={goalCompletion.total}
                  latestWeightKg={latestBodyWeight}
                  bodyFatPct={latestBodyFat}
                  exercisesTracked={exercisesTrackedCount}
                />
                <div className="mt-3">
                  <EmptyState
                    title="No workouts yet"
                    description="Log a training session to see rhythm and volume for this range."
                    actionLabel="Train"
                    actionHref="/client/train"
                  />
                </div>
              </>
            ) : (
              <>
                <TopStatsPaired
                  weeksLabel={weeksEyebrowForRange(timeRange)}
                  workoutsLoggedInRange={rhythmSummary?.workoutsLoggedInRange ?? 0}
                  goalPct={completionPercentage}
                  goalsCompleted={goalCompletion.completed}
                  goalsTotal={goalCompletion.total}
                  latestWeightKg={latestBodyWeight}
                  bodyFatPct={latestBodyFat}
                  exercisesTracked={exercisesTrackedCount}
                />
                <div className="mt-3">
                  <TrainingRhythmSection
                    data={rhythmSummary}
                    error={sectionErr.rhythm}
                    onRetry={() => void loadAnalyticsData({ quiet: true })}
                    rangeMeta={`12-week view · ${weeksEyebrowForRange(timeRange)}`}
                  />
                </div>
                <div className="mt-3">
                  <TrainingVolumeSection
                    stats={volumeStats}
                    volumeWeeks={volumeChartWeeks}
                    onVolumeWeeksChange={refetchVolumeWindow}
                    busy={volumeOnlyBusy}
                    error={sectionErr.volume}
                    onRetry={() => void refetchVolumeWindow(volumeChartWeeks)}
                  />
                </div>
              </>
            )}
          </div>
        ) : null}

        {!loading ? (
          <div className={hub.hub} style={{ marginTop: 12 }}>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <AnalyticsDrillLink
                  href="/client/progress/strength"
                  label="Strength progress"
                  sub="Top lifts & all exercises"
                />
                <AnalyticsDrillLink
                  href="/client/progress/personal-records"
                  label="Personal records"
                  sub="Best lifts & timeline"
                />
                <AnalyticsDrillLink
                  href="/client/progress/performance"
                  label="Performance"
                  sub="Session scores over time"
                />
                <AnalyticsDrillLink
                  href="/client/activity?tab=trends"
                  label="Extra activities"
                  sub="Cardio, walks & other sessions"
                />
              </div>
              <WellnessRecoverySection timeRange={timeRange} wellnessStats={wellnessStats} />
              <RecoveryInsightCard
                notEnoughData={recoveryInsight.notEnoughData}
                insightText={recoveryInsight.insight}
                boldPhrases={recoveryInsight.boldPhrases}
                chartData={recoveryInsight.chartData}
              />
              <BodyCompositionSection bodyComposition={bodyComposition} goalIntent="unknown" />
              <GoalCompletionSection
                completed={goalCompletion.completed}
                total={goalCompletion.total}
              />
            </div>
          </div>
        ) : null}
      </ClientPageShell>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInLeft {
          from {
            opacity: 0;
            width: 0%;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}

export default function AnalyticsPage() {
  return (
    <ProtectedRoute requiredRole="client">
      <Suspense
        fallback={
          <ClientPageShell className="max-w-xl mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6">
              <PageSkeleton variant="dashboard" />
            </ClientPageShell>
        }
      >
        <AnalyticsPageContent />
      </Suspense>
    </ProtectedRoute>
  );
}
