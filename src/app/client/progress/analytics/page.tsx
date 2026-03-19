"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useSearchParams } from "next/navigation";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Dumbbell,
  Scale,
  Target,
  Calendar,
  Search,
  Timer,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import {
  getTopProgressions,
  getTrainedExercises,
  getExerciseProgression,
  getExerciseProgressionsBatch,
  isCompoundLift,
  getCompoundLiftDisplayName,
  type ExerciseProgression,
  type TrainedExercise,
} from "@/lib/strengthAnalytics";
import { ExerciseProgressionChart } from "@/components/progress/ExerciseProgressionChart";
import { ChevronDown, ChevronRight } from "lucide-react";
import { getWeeklyVolume, getWorkoutsWithVolumeForSleepAnalysis, type VolumeStats, type WorkoutWithVolumeForSleep } from "@/lib/volumeAnalytics";
import { getWellnessTrends, type WellnessStats } from "@/lib/wellnessAnalytics";
import { VolumeTrendChart } from "@/components/progress/VolumeTrendChart";
import { WellnessTrendChart } from "@/components/progress/WellnessTrendChart";
import {
  getActivitiesByDateRange,
  ACTIVITY_META,
  INTENSITY_META,
  type ClientActivity,
  type ActivityType,
} from "@/lib/clientActivityService";

interface WorkoutFrequencyData {
  week: string;
  count: number;
}

interface DurationTrendWeek {
  weekLabel: string;
  avgDuration: number;
  workoutCount: number;
}

interface DurationTrendData {
  weeklyData: DurationTrendWeek[];
  thisWeekAvg: number;
  overallAvg: number;
}

interface BodyCompositionData {
  date: string;
  weight: number;
  bodyFat?: number;
}

function AnalyticsPageContent() {
  const { user } = useAuth();
  const { performanceSettings } = useTheme();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [workoutFrequency, setWorkoutFrequency] = useState<WorkoutFrequencyData[]>([]);
  const [durationTrend, setDurationTrend] = useState<DurationTrendData | null>(null);
  const [bodyComposition, setBodyComposition] = useState<BodyCompositionData[]>([]);
  const [goalCompletion, setGoalCompletion] = useState({ completed: 0, total: 0 });
  const [timeRange, setTimeRange] = useState<"1M" | "3M" | "6M" | "1Y" | "ALL">("3M");
  
  // Volume and wellness state
  const [volumeStats, setVolumeStats] = useState<VolumeStats | null>(null);
  const [wellnessStats, setWellnessStats] = useState<WellnessStats | null>(null);
  const [workoutsForSleepAnalysis, setWorkoutsForSleepAnalysis] = useState<WorkoutWithVolumeForSleep[]>([]);

  // Strength progression state (1RM + charts)
  const [topProgressions, setTopProgressions] = useState<ExerciseProgression[]>([]);
  const [trainedExercises, setTrainedExercises] = useState<TrainedExercise[]>([]);
  const [compoundProgressions, setCompoundProgressions] = useState<ExerciseProgression[]>([]);
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
  const [progressionCache, setProgressionCache] = useState<Record<string, ExerciseProgression>>({});
  const [loadingProgression, setLoadingProgression] = useState<string | null>(null);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingStartedAt, setLoadingStartedAt] = useState<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Extra activities analytics state
  const [recentActivities, setRecentActivities] = useState<ClientActivity[]>([]);

  // Cross-link: open strength section with exercise expanded when ?exerciseId= is present
  const exerciseIdFromUrl = searchParams.get("exerciseId");
  useEffect(() => {
    if (!exerciseIdFromUrl || !user?.id) return;
    setExpandedExerciseId(exerciseIdFromUrl);
    loadExerciseProgressionForExpand(exerciseIdFromUrl);
    const el = document.getElementById("strength-exercises");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [exerciseIdFromUrl, user?.id]);

  const loadStrengthProgressions = async () => {
    if (!user?.id) return;
    try {
      const [top, trained] = await Promise.all([
        getTopProgressions(user.id, 3, "3M"),
        getTrainedExercises(user.id),
      ]);
      setTopProgressions(top);
      setTrainedExercises(trained);
      const compound = trained.filter((ex) => isCompoundLift(ex.name));
      const compoundIds = compound.map((ex) => ex.id);
      const progressions = compoundIds.length > 0
        ? await getExerciseProgressionsBatch(user.id, compoundIds, "3M")
        : [];
      setCompoundProgressions(progressions.filter((p): p is ExerciseProgression => p != null && p.dataPoints.length >= 2));
    } catch (e) {
      console.error("Error loading strength progressions:", e);
      setTopProgressions([]);
      setTrainedExercises([]);
      setCompoundProgressions([]);
    }
  };

  const loadAnalyticsData = useCallback(async () => {
    if (!user) {
      setWorkoutFrequency([]);
      setBodyComposition([]);
      setGoalCompletion({ completed: 0, total: 0 });
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    setLoadingStartedAt(Date.now());
    try {
      await Promise.all([
        loadWorkoutFrequency(),
        loadDurationTrend(),
        loadStrengthProgressions(),
        loadBodyComposition(),
        loadGoalCompletion(),
        loadVolumeStats(),
        loadWellnessStats(),
        loadWorkoutsForSleepAnalysis(),
        loadRecentActivities(),
      ]);
    } catch (error) {
      console.error("Error loading analytics data:", error);
      setLoadError(error instanceof Error ? error.message : "Failed to load analytics");
    } finally {
      setLoading(false);
      setLoadingStartedAt(null);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setLoading(false);
      setLoadError("Loading took too long. Tap Retry to try again.");
    }, 20_000);
    loadAnalyticsData().finally(() => {
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
  }, [loadAnalyticsData, user]);

  const loadExerciseProgressionForExpand = async (exerciseId: string) => {
    if (!user?.id || progressionCache[exerciseId]) {
      setExpandedExerciseId(exerciseId);
      return;
    }
    setLoadingProgression(exerciseId);
    try {
      const prog = await getExerciseProgression(user.id, exerciseId, "3M");
      if (prog) {
        setProgressionCache((prev) => ({ ...prev, [exerciseId]: prog }));
        setExpandedExerciseId(exerciseId);
      }
    } catch (e) {
      console.error("Error loading progression:", e);
    } finally {
      setLoadingProgression(null);
    }
  };

  const loadWorkoutFrequency = async () => {
    if (!user) return;

    try {
      // Get last 5 weeks of workout logs
      const fiveWeeksAgo = new Date();
      fiveWeeksAgo.setDate(fiveWeeksAgo.getDate() - 35);

      const { data: workoutLogs, error } = await supabase
        .from("workout_logs")
        .select("completed_at")
        .eq("client_id", user.id)
        .not("completed_at", "is", null)
        .gte("completed_at", fiveWeeksAgo.toISOString())
        .order("completed_at", { ascending: false });

      if (error) throw error;

      // Group by week
      const weekGroups = new Map<string, number>();
      const now = new Date();
      
      // Initialize last 5 weeks
      for (let i = 4; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - (i * 7 + now.getDay() - 1));
        weekStart.setHours(0, 0, 0, 0);
        const weekKey = weekStart.toISOString().split("T")[0];
        weekGroups.set(weekKey, 0);
      }

      // Count workouts per week
      workoutLogs?.forEach((log) => {
        const logDate = new Date(log.completed_at);
        const weekStart = new Date(logDate);
        weekStart.setDate(logDate.getDate() - logDate.getDay() + 1);
        weekStart.setHours(0, 0, 0, 0);
        const weekKey = weekStart.toISOString().split("T")[0];
        
        if (weekGroups.has(weekKey)) {
          weekGroups.set(weekKey, (weekGroups.get(weekKey) || 0) + 1);
        }
      });

      // Convert to array format
      const frequencyData: WorkoutFrequencyData[] = Array.from(weekGroups.entries())
        .map(([date, count]) => ({
          week: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          count,
        }))
        .slice(0, 5); // Last 5 weeks

      setWorkoutFrequency(frequencyData);
    } catch (error) {
      console.error("Error loading workout frequency:", error);
      setWorkoutFrequency([]);
    }
  };

  const loadBodyComposition = async () => {
    if (!user) return;

    try {
      const { data: metrics, error } = await supabase
        .from("body_metrics")
        .select("measured_date, weight_kg, body_fat_percentage")
        .eq("client_id", user.id)
        .not("weight_kg", "is", null)
        .order("measured_date", { ascending: true })
        .limit(30);

      if (error) {
        console.error("Body metrics query error:", error);
        throw error;
      }

      if (!metrics || metrics.length === 0) {
        setBodyComposition([]);
        return;
      }

      const compositionData: BodyCompositionData[] = metrics.map((metric) => ({
        date: new Date(metric.measured_date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        weight: parseFloat(metric.weight_kg) || 0,
        bodyFat: metric.body_fat_percentage ? parseFloat(metric.body_fat_percentage) : undefined,
      }));

      setBodyComposition(compositionData);
    } catch (error) {
      console.error("Error loading body composition:", error);
      setBodyComposition([]);
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
      const completed = goals?.filter((g) => g.status === "completed").length || 0;

      setGoalCompletion({ completed, total });
    } catch (error) {
      console.error("Error loading goal completion:", error);
      setGoalCompletion({ completed: 0, total: 0 });
    }
  };

  const loadRecentActivities = async () => {
    if (!user?.id) return;
    try {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);
      const data = await getActivitiesByDateRange(
        user.id,
        threeMonthsAgo.toISOString().split("T")[0],
        new Date().toISOString().split("T")[0]
      );
      setRecentActivities(data);
    } catch {
      setRecentActivities([]);
    }
  };

  const loadDurationTrend = async () => {
    if (!user?.id) return;
    try {
      const twelveWeeksAgo = new Date();
      twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 12 * 7);
      const { data: logs, error } = await supabase
        .from("workout_logs")
        .select("total_duration_minutes, completed_at")
        .eq("client_id", user.id)
        .not("completed_at", "is", null)
        .gte("completed_at", twelveWeeksAgo.toISOString())
        .order("completed_at", { ascending: true });
      if (error) throw error;
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const weekKeys: string[] = [];
      const weekMap = new Map<string, { sum: number; count: number }>();
      for (let i = 11; i >= 0; i--) {
        const monday = new Date(now);
        monday.setDate(now.getDate() + diffToMonday - i * 7);
        monday.setHours(0, 0, 0, 0);
        const key = monday.toISOString().split("T")[0];
        weekKeys.push(key);
        weekMap.set(key, { sum: 0, count: 0 });
      }
      logs?.forEach((log) => {
        const d = new Date(log.completed_at);
        const day = d.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        const mon = new Date(d);
        mon.setDate(d.getDate() + diff);
        mon.setHours(0, 0, 0, 0);
        const key = mon.toISOString().split("T")[0];
        const entry = weekMap.get(key);
        if (entry) {
          entry.sum += Number(log.total_duration_minutes) || 0;
          entry.count += 1;
        }
      });
      const weeklyData: DurationTrendWeek[] = weekKeys.map((key) => {
        const e = weekMap.get(key)!;
        const avg = e.count > 0 ? Math.round(e.sum / e.count) : 0;
        const monday = new Date(key);
        const weekLabel = monday.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        return { weekLabel, avgDuration: avg, workoutCount: e.count };
      });
      const thisWeekKey = weekKeys[weekKeys.length - 1];
      const thisWeekEntry = weekMap.get(thisWeekKey)!;
      const thisWeekAvg = thisWeekEntry.count > 0 ? Math.round(thisWeekEntry.sum / thisWeekEntry.count) : 0;
      const totalSum = weeklyData.reduce((s, w) => s + w.avgDuration * w.workoutCount, 0);
      const totalCount = weeklyData.reduce((s, w) => s + w.workoutCount, 0);
      const overallAvg = totalCount > 0 ? Math.round(totalSum / totalCount) : 0;
      setDurationTrend({ weeklyData, thisWeekAvg, overallAvg });
    } catch (error) {
      console.error("Error loading duration trend:", error);
      setDurationTrend(null);
    }
  };

  const loadVolumeStats = async () => {
    if (!user?.id) return;
    try {
      const stats = await getWeeklyVolume(user.id, 26); // 6 months = 26 weeks
      setVolumeStats(stats);
    } catch (error) {
      console.error("Error loading volume stats:", error);
      setVolumeStats(null);
    }
  };

  const loadWellnessStats = async () => {
    if (!user?.id) return;
    try {
      const stats = await getWellnessTrends(user.id, 60); // 60 days default
      setWellnessStats(stats);
    } catch (error) {
      console.error("Error loading wellness stats:", error);
      setWellnessStats(null);
    }
  };

  const loadWorkoutsForSleepAnalysis = async () => {
    if (!user?.id) return;
    try {
      const list = await getWorkoutsWithVolumeForSleepAnalysis(user.id, 30);
      setWorkoutsForSleepAnalysis(list);
    } catch (error) {
      console.error("Error loading workouts for sleep analysis:", error);
      setWorkoutsForSleepAnalysis([]);
    }
  };

  const maxWorkouts = Math.max(...workoutFrequency.map((w) => w.count), 1);
  const maxBodyWeight = bodyComposition.length > 0 ? Math.max(...bodyComposition.map((b) => b.weight), 0) : 0;
  const minBodyWeight = bodyComposition.length > 0 ? Math.min(...bodyComposition.map((b) => b.weight), maxBodyWeight) : 0;
  const bodyWeightRange = maxBodyWeight - minBodyWeight || 1;

  const completionPercentage =
    goalCompletion.total > 0
      ? Math.round((goalCompletion.completed / goalCompletion.total) * 100)
      : 0;
  const recentWorkoutTotal = workoutFrequency.reduce(
    (sum, week) => sum + week.count,
    0
  );
  const latestBodyWeight =
    bodyComposition.length > 0
      ? bodyComposition[bodyComposition.length - 1].weight
      : null;
  const latestBodyFat =
    bodyComposition.length > 0
      ? bodyComposition[bodyComposition.length - 1].bodyFat
      : null;

  // Recovery insight: last 4 weeks volume + wellness (soreness/sleep) grouped by week
  const recoveryInsight = useMemo(() => {
    const fourWeeksVolume = volumeStats?.weeklyData?.slice(-4) ?? [];
    const dailyWellness = wellnessStats?.dailyData ?? [];
    if (fourWeeksVolume.length < 2) return { insight: null, chartData: [], notEnoughData: true };

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
    else if (volumeDown)
      insight = "Training volume decreased this week";
    else
      insight =
        "Consistent training and recovery — you're in a good rhythm";

    return {
      insight,
      chartData,
      notEnoughData: false,
    };
  }, [volumeStats, wellnessStats]);

  // Sleep vs Performance: last 30 days, good sleep (≥4) vs poor (≤2), avg volume per workout
  const sleepVsPerformanceInsight = useMemo(() => {
    const sleepByDate = new Map<string, number>();
    wellnessStats?.dailyData?.forEach((d) => {
      if (d.sleepQuality != null) sleepByDate.set(d.date, d.sleepQuality);
    });

    const withSleep = workoutsForSleepAnalysis.filter(
      (w) => sleepByDate.has(w.previousNightDate)
    );
    if (withSleep.length < 5)
      return {
        message:
          "Log more sleep data to see how it affects your training",
        percentDiff: null,
      };

    const goodSleep = withSleep.filter(
      (w) => (sleepByDate.get(w.previousNightDate) ?? 0) >= 4
    );
    const poorSleep = withSleep.filter(
      (w) => (sleepByDate.get(w.previousNightDate) ?? 0) <= 2
    );

    const avgVolume = (arr: WorkoutWithVolumeForSleep[]) =>
      arr.length > 0
        ? arr.reduce((s, w) => s + w.volume, 0) / arr.length
        : 0;

    const goodAvg = avgVolume(goodSleep);
    const poorAvg = avgVolume(poorSleep);
    const clearCorrelation =
      poorAvg > 0 && goodAvg >= poorAvg * 1.1;

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

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-32 pt-8 sm:px-6 lg:px-10 fc-page">
        <div className="fc-surface rounded-2xl border border-[color:var(--fc-glass-border)] backdrop-blur-[8px] shadow-[var(--fc-shadow-card)] p-6 sm:p-10 mb-10">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <Link href="/client/progress" className="fc-surface w-11 h-11 flex items-center justify-center rounded-xl shrink-0 border border-[color:var(--fc-glass-border)]">
                  <ArrowLeft className="w-5 h-5 text-[color:var(--fc-text-primary)]" />
                </Link>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--fc-domain-workouts)]/20 text-[color:var(--fc-domain-workouts)] shrink-0">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-[color:var(--fc-domain-workouts)] mb-1">
                      <BarChart3 className="w-4 h-4" />
                      <span className="text-xs font-bold tracking-[0.2em] uppercase">Performance</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-[color:var(--fc-text-primary)]">
                      Analytics <span className="text-[color:var(--fc-text-dim)]">Overview</span>
                    </h1>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex bg-[color:var(--fc-glass-highlight)] p-1 rounded-2xl border border-[color:var(--fc-glass-border)] overflow-x-auto">
                  {(["1M", "3M", "6M", "1Y", "ALL"] as const).map((range) => (
                    <button
                      key={range}
                      type="button"
                      onClick={() => setTimeRange(range)}
                      className={`px-4 sm:px-6 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                        timeRange === range
                          ? "fc-surface fc-text-primary shadow-sm"
                          : "text-[color:var(--fc-text-dim)] hover:text-[color:var(--fc-text-primary)]"
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
                <a href="#strength-exercises" className="fc-btn fc-btn-primary shrink-0 inline-flex items-center">
                  <Search className="mr-2 h-4 w-4" />
                  All Exercises
                </a>
                <Link
                  href="/client/progress/personal-records"
                  className="fc-btn fc-btn-ghost shrink-0 inline-flex items-center"
                >
                  View all PRs
                </Link>
              </div>
            </div>
          </div>
        </div>

        {loadError && !loading ? (
          <div className="fc-surface p-8 rounded-2xl border border-[color:var(--fc-glass-border)] text-center">
            <p className="text-[color:var(--fc-text-dim)] mb-4">{loadError}</p>
            <Button variant="secondary" onClick={() => { setLoadError(null); loadAnalyticsData(); }} className="h-11 px-6">
              Retry
            </Button>
          </div>
        ) : loading ? (
          <div className="animate-pulse space-y-4 p-4 pb-32">
            <div className="h-6 w-32 rounded-full bg-[color:var(--fc-glass-highlight)]" />
            <div className="h-8 w-64 rounded-2xl bg-[color:var(--fc-glass-highlight)]" />
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 rounded-2xl bg-[color:var(--fc-glass-highlight)]" />
              ))}
            </div>
            <div className="h-48 rounded-2xl bg-[color:var(--fc-glass-highlight)]" />
            <div className="h-48 rounded-2xl bg-[color:var(--fc-glass-highlight)]" />
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="fc-surface rounded-2xl border border-[color:var(--fc-glass-border)] backdrop-blur-[8px] shadow-[var(--fc-shadow-card)] p-4">
                <div className="flex items-center justify-between">
                  <Calendar className="h-5 w-5 text-[color:var(--fc-domain-workouts)]" />
                  <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                    5 Weeks
                  </span>
                </div>
                <p className="mt-3 text-2xl font-semibold text-[color:var(--fc-text-primary)]">
                  {recentWorkoutTotal}
                </p>
                <p className="text-sm text-[color:var(--fc-text-dim)]">
                  Workouts logged
                </p>
              </div>
              <div className="fc-surface rounded-2xl border border-[color:var(--fc-glass-border)] backdrop-blur-[8px] shadow-[var(--fc-shadow-card)] p-4">
                <div className="flex items-center justify-between">
                  <Target className="h-5 w-5 text-[color:var(--fc-status-success)]" />
                  <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                    Goals
                  </span>
                </div>
                <p className="mt-3 text-2xl font-semibold text-[color:var(--fc-text-primary)]">
                  {completionPercentage}%
                </p>
                <p className="text-sm text-[color:var(--fc-text-dim)]">
                  {goalCompletion.completed} of {goalCompletion.total} completed
                </p>
              </div>
              <div className="fc-surface rounded-2xl border border-[color:var(--fc-glass-border)] backdrop-blur-[8px] shadow-[var(--fc-shadow-card)] p-4">
                <div className="flex items-center justify-between">
                  <Scale className="h-5 w-5 text-[color:var(--fc-domain-meals)]" />
                  <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                    Latest
                  </span>
                </div>
                <p className="mt-3 text-2xl font-semibold text-[color:var(--fc-text-primary)]">
                  {latestBodyWeight !== null ? `${latestBodyWeight} kg` : "—"}
                </p>
                <p className="text-sm text-[color:var(--fc-text-dim)]">
                  {latestBodyFat !== null
                    ? `${latestBodyFat}% body fat`
                    : "Body composition"}
                </p>
              </div>
              <div className="fc-surface rounded-2xl border border-[color:var(--fc-glass-border)] backdrop-blur-[8px] shadow-[var(--fc-shadow-card)] p-4">
                <div className="flex items-center justify-between">
                  <Dumbbell className="h-5 w-5 text-[color:var(--fc-domain-workouts)]" />
                  <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                    Strength
                  </span>
                </div>
                <p className="mt-3 text-2xl font-semibold text-[color:var(--fc-text-primary)]">
                  {trainedExercises.length}
                </p>
                <p className="text-sm text-[color:var(--fc-text-dim)]">
                  Exercises tracked
                </p>
              </div>
            </div>
            {/* Workout Frequency Chart */}
            <div className="fc-surface rounded-2xl border border-[color:var(--fc-glass-border)] backdrop-blur-[8px] shadow-[var(--fc-shadow-card)] p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[color:var(--fc-accent-cyan)] shadow-[0_10px_20px_color-mix(in_srgb,var(--fc-accent-cyan)_25%,transparent)]">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[color:var(--fc-text-primary)]">
                    Workout Frequency
                  </h2>
                  <p className="text-sm text-[color:var(--fc-text-dim)]">
                    Last 5 weeks
                  </p>
                </div>
              </div>

              {workoutFrequency.length > 0 ? (
                <div className="relative h-64">
                  <div className="absolute inset-0 flex items-end justify-between gap-3">
                    {workoutFrequency.map((week, index) => {
                      const height = (week.count / maxWorkouts) * 100;
                      return (
                        <div
                          key={index}
                          className="flex-1 flex flex-col items-center gap-3"
                          style={{
                            animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`,
                          }}
                        >
                          <div className="w-full flex flex-col items-center">
                            <span className="mb-2 text-sm font-bold text-[color:var(--fc-text-primary)]">
                              {week.count}
                            </span>
                            <div
                              className="w-full rounded-t-lg bg-[color:var(--fc-accent-cyan)] transition-all duration-500 hover:opacity-80"
                              style={{
                                height: `${Math.max(height, 5)}%`,
                                minHeight: "20px",
                              }}
                            />
                          </div>
                          <span className="text-center text-xs text-[color:var(--fc-text-dim)]">
                            {week.week}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <p className="text-sm font-semibold fc-text-primary mb-1">No workout data yet</p>
                  <p className="text-xs fc-text-dim">Start training to see your frequency trends here.</p>
                </div>
              )}
            </div>

            {/* Workout Duration Trend */}
            {durationTrend && durationTrend.weeklyData.length > 0 && (
              <div className="fc-surface rounded-2xl border border-[color:var(--fc-glass-border)] backdrop-blur-[8px] shadow-[var(--fc-shadow-card)] p-6">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[color:var(--fc-domain-workouts)]/80">
                    <Timer className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[color:var(--fc-text-primary)]">
                      Avg Workout Duration
                    </h2>
                    <p className="text-sm text-[color:var(--fc-text-dim)]">
                      This week: {durationTrend.thisWeekAvg} min (avg: {durationTrend.overallAvg} min)
                    </p>
                  </div>
                </div>
                <div className="relative h-48">
                  <div className="absolute inset-0 flex items-end justify-between gap-1">
                    {durationTrend.weeklyData.map((week, index) => {
                      const maxDur = Math.max(...durationTrend.weeklyData.map((w) => w.avgDuration), 1);
                      const height = (week.avgDuration / maxDur) * 100;
                      return (
                        <div
                          key={index}
                          className="flex-1 flex flex-col items-center gap-2 min-w-0"
                        >
                          <div className="w-full flex flex-col items-center">
                            <span className="mb-1 text-xs font-medium text-[color:var(--fc-text-primary)]">
                              {week.avgDuration}
                            </span>
                            <div
                              className="w-full rounded-t-md bg-[color:var(--fc-domain-workouts)] transition-all duration-300 hover:opacity-80"
                              style={{
                                height: `${Math.max(height, week.avgDuration > 0 ? 8 : 0)}%`,
                                minHeight: week.avgDuration > 0 ? "16px" : "0",
                              }}
                            />
                          </div>
                          <span className="text-center text-[10px] text-[color:var(--fc-text-dim)] truncate w-full">
                            {week.weekLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Strength Progress — Top 3 + 1RM card + Exercise browser */}
            {(topProgressions.length > 0 || trainedExercises.length > 0) && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[color:var(--fc-domain-workouts)] shadow-[0_10px_20px_rgba(249,115,22,0.3)]">
                    <Dumbbell className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[color:var(--fc-text-primary)]">
                      Strength Progress
                    </h2>
                    <p className="text-sm text-[color:var(--fc-text-dim)]">
                      Estimated 1RM and progression over time
                    </p>
                  </div>
                </div>

                {topProgressions.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-[color:var(--fc-text-dim)] uppercase tracking-wider mb-3">
                      Biggest Gains
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {topProgressions.map((prog) => (
                        <ExerciseProgressionChart
                          key={prog.exerciseId}
                          progression={prog}
                          compact
                          defaultTimeRange="3M"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {compoundProgressions.length > 0 && (
                  <div className="fc-surface rounded-2xl border border-[color:var(--fc-glass-border)] backdrop-blur-[8px] shadow-[var(--fc-shadow-card)] p-4 sm:p-6">
                    <h3 className="text-sm font-semibold text-[color:var(--fc-text-dim)] uppercase tracking-wider mb-3">
                      Estimated 1RM — Compound Lifts
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {compoundProgressions.map((prog) => (
                        <div
                          key={prog.exerciseId}
                          className="fc-glass-soft rounded-xl p-3 border border-[color:var(--fc-glass-border)]"
                        >
                          <p className="text-xs text-[color:var(--fc-text-dim)] truncate">
                            {getCompoundLiftDisplayName(prog.exerciseName)}
                          </p>
                          <p className="text-lg font-bold text-[color:var(--fc-text-primary)]">
                            {prog.currentOneRM > 0 ? `${Math.round(prog.currentOneRM * 10) / 10} kg` : "—"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div id="strength-exercises">
                  <h3 className="text-sm font-semibold text-[color:var(--fc-text-dim)] uppercase tracking-wider mb-3">
                    All Exercises
                  </h3>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-[color:var(--fc-text-dim)]" />
                    <Input
                      type="text"
                      placeholder="Search exercises..."
                      value={exerciseSearchQuery}
                      onChange={(e) => setExerciseSearchQuery(e.target.value)}
                      className="fc-input pl-9 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    {trainedExercises
                      .filter(
                        (ex) =>
                          !exerciseSearchQuery ||
                          ex.name.toLowerCase().includes(exerciseSearchQuery.toLowerCase())
                      )
                      .map((ex) => {
                        const isExpanded = expandedExerciseId === ex.id;
                        const cached = progressionCache[ex.id];
                        const loading = loadingProgression === ex.id;
                        return (
                          <div
                            key={ex.id}
                            className="fc-surface rounded-2xl border border-[color:var(--fc-glass-border)] backdrop-blur-[8px] shadow-[var(--fc-shadow-card)] overflow-hidden"
                          >
                            <button
                              type="button"
                              className="w-full flex items-center justify-between p-4 text-left hover:bg-[color:var(--fc-glass-highlight)] transition-colors"
                              onClick={() =>
                                isExpanded
                                  ? setExpandedExerciseId(null)
                                  : loadExerciseProgressionForExpand(ex.id)
                              }
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {isExpanded ? (
                                  <ChevronDown className="w-5 h-5 text-[color:var(--fc-text-dim)] flex-shrink-0" />
                                ) : (
                                  <ChevronRight className="w-5 h-5 text-[color:var(--fc-text-dim)] flex-shrink-0" />
                                )}
                                <span className="font-semibold text-[color:var(--fc-text-primary)] truncate">
                                  {ex.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0 text-sm text-[color:var(--fc-text-dim)]">
                                <span>{ex.sessionCount} sessions</span>
                                <span>
                                  {ex.lastTrained
                                    ? new Date(ex.lastTrained + "T12:00:00").toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                      })
                                    : "—"}
                                </span>
                              </div>
                            </button>
                            {isExpanded && (
                              <div className="border-t border-[color:var(--fc-glass-border)] p-4 bg-[color:var(--fc-bg-base)]/50">
                                {loading && (
                                  <div className="flex items-center justify-center py-12">
                                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--fc-domain-workouts)] border-t-transparent" />
                                  </div>
                                )}
                                {!loading && cached && (
                                  <ExerciseProgressionChart
                                    progression={cached}
                                    defaultTimeRange="3M"
                                  />
                                )}
                                {!loading && !cached && (
                                  <p className="py-8 text-center text-sm text-[color:var(--fc-text-dim)]">
                                    Need at least 2 sessions to show chart.
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}

            {/* Training Volume Chart */}
            {volumeStats && volumeStats.weeklyData.length > 0 && (
              <VolumeTrendChart volumeStats={volumeStats} />
            )}

            {/* Recovery & Wellness Chart */}
            {wellnessStats && wellnessStats.dailyData.length > 0 && (
              <WellnessTrendChart wellnessStats={wellnessStats} />
            )}

            {/* Recovery Insight Card — last 4 weeks volume vs soreness */}
            <div className="fc-surface rounded-2xl border border-[color:var(--fc-glass-border)] backdrop-blur-[8px] shadow-[var(--fc-shadow-card)] p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--fc-domain-habits)] shadow-[0_10px_20px_color-mix(in_srgb,var(--fc-domain-habits)_25%,transparent)]">
                  <Dumbbell className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[color:var(--fc-text-primary)]">
                    Recovery Insight
                  </h2>
                  <p className="text-sm text-[color:var(--fc-text-dim)]">
                    Training load vs recovery (last 4 weeks)
                  </p>
                </div>
              </div>
              {recoveryInsight.notEnoughData ? (
                <p className="py-4 text-sm text-[color:var(--fc-text-dim)]">
                  Not enough data yet — keep logging to see recovery insights.
                </p>
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
                          <linearGradient id="recoveryBar" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="rgb(139, 92, 246)" stopOpacity="0.9" />
                            <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0.6" />
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
                                const weekLabel = new Date(week.weekStart + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
                                return (
                                  <g key={week.weekStart}>
                                    <rect
                                      x={x}
                                      y={y}
                                      width={barW}
                                      height={Math.max(barH, 4)}
                                      fill="url(#recoveryBar)"
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
                                      const x = pad.left + (i / data.length) * w + 4 + barW / 2;
                                      const y = pad.top + h - (week.avgSoreness / maxSore) * h;
                                      return `${x},${y}`;
                                    })
                                    .filter((p): p is string => p != null)
                                    .join(" ")}
                                  fill="none"
                                  stroke="rgb(245, 158, 11)"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              )}
                              {hasSoreness && data.map((week, i) => {
                                if (week.avgSoreness == null) return null;
                                const x = pad.left + (i / data.length) * w + 4 + barW / 2;
                                const y = pad.top + h - (week.avgSoreness / maxSore) * h;
                                return (
                                  <circle
                                    key={week.weekStart}
                                    cx={x}
                                    cy={y}
                                    r="4"
                                    fill="rgb(245, 158, 11)"
                                    stroke="white"
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

            {/* Sleep vs Performance Insight Card */}
            <div className="fc-surface rounded-2xl border border-[color:var(--fc-glass-border)] backdrop-blur-[8px] shadow-[var(--fc-shadow-card)] p-6">
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--fc-accent-primary)] shadow-[0_10px_20px_color-mix(in_srgb,var(--fc-accent-primary)_25%,transparent)]">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[color:var(--fc-text-primary)]">
                    Sleep vs Performance
                  </h2>
                  <p className="text-sm text-[color:var(--fc-text-dim)]">
                    How rest affects your workouts (last 30 days)
                  </p>
                </div>
              </div>
              <p className="text-[color:var(--fc-text-primary)]">
                {sleepVsPerformanceInsight.message}
              </p>
            </div>

            {/* Body Composition Chart */}
            {bodyComposition.length > 0 ? (
              <div className="fc-surface rounded-2xl border border-[color:var(--fc-glass-border)] backdrop-blur-[8px] shadow-[var(--fc-shadow-card)] p-6">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-[0_10px_20px_rgba(16,185,129,0.3)]">
                    <Scale className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[color:var(--fc-text-primary)]">
                      Body Composition
                    </h2>
                    <p className="text-sm text-[color:var(--fc-text-dim)]">
                      Weight and body fat trends
                    </p>
                  </div>
                </div>

                <div className="relative h-64 mb-6">
                  <div className="absolute inset-0 flex items-end justify-between gap-2">
                    {bodyComposition.map((point, index) => {
                      const height = bodyWeightRange > 0 ? ((point.weight - minBodyWeight) / bodyWeightRange) * 100 : 50;
                      return (
                        <div
                          key={index}
                          className="flex-1 flex flex-col items-center gap-2"
                          style={{
                            animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`,
                          }}
                        >
                          <div className="w-full flex flex-col items-center">
                            <span className="mb-1 text-xs font-bold text-[color:var(--fc-text-primary)]">
                              {point.weight.toFixed(1)}kg
                            </span>
                            <div
                              className="w-full rounded-t-lg bg-gradient-to-t from-emerald-500 to-green-600 transition-all duration-500 hover:opacity-80"
                              style={{
                                height: `${Math.max(height, 10)}%`,
                                minHeight: "30px",
                              }}
                            />
                          </div>
                          <span className="text-center text-xs text-[color:var(--fc-text-subtle)]">
                            {point.date}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {bodyComposition.length >= 2 && (
                  <div className="border-t border-[color:var(--fc-glass-border)] pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[color:var(--fc-text-dim)]">
                        Weight change
                      </span>
                      <div className="flex items-center gap-2">
                        {bodyComposition[bodyComposition.length - 1].weight >
                        bodyComposition[0].weight ? (
                          <TrendingUp className="h-4 w-4 text-[color:var(--fc-status-warning)]" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-[color:var(--fc-status-success)]" />
                        )}
                        <span className="text-sm font-semibold text-[color:var(--fc-text-primary)]">
                          {Math.abs(
                            bodyComposition[bodyComposition.length - 1].weight -
                              bodyComposition[0].weight
                          ).toFixed(1)}{" "}
                          kg
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="fc-surface rounded-2xl border border-[color:var(--fc-glass-border)] backdrop-blur-[8px] shadow-[var(--fc-shadow-card)] p-6">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-[0_10px_20px_rgba(16,185,129,0.3)]">
                    <Scale className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[color:var(--fc-text-primary)]">
                      Body Composition
                    </h2>
                    <p className="text-sm text-[color:var(--fc-text-dim)]">
                      Weight and body fat trends
                    </p>
                  </div>
                </div>
                <div className="py-12 text-center">
                  <p className="text-sm font-semibold fc-text-primary mb-1">No body metrics yet</p>
                  <p className="text-xs fc-text-dim">Log your weight and measurements to track progress.</p>
                </div>
              </div>
            )}

            {/* Goal Completion */}
            <div className="fc-surface rounded-2xl border border-[color:var(--fc-glass-border)] backdrop-blur-[8px] shadow-[var(--fc-shadow-card)] p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[color:var(--fc-accent-primary)] shadow-[0_10px_20px_color-mix(in_srgb,var(--fc-accent-primary)_25%,transparent)]">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[color:var(--fc-text-primary)]">
                    Goal Completion
                  </h2>
                  <p className="text-sm text-[color:var(--fc-text-dim)]">
                    Track your goal achievements
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="relative w-20 h-20 flex-shrink-0">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="33" fill="none" stroke="var(--fc-glass-border)" strokeWidth="5" />
                    <circle cx="40" cy="40" r="33" fill="none" stroke="var(--fc-accent-primary)" strokeWidth="5" strokeLinecap="round"
                      strokeDasharray={`${completionPercentage * 2.073} 999`} />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-lg font-black text-[color:var(--fc-text-primary)]">
                    {completionPercentage}%
                  </span>
                </div>
                <div>
                  <p className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                    {goalCompletion.completed} of {goalCompletion.total}
                  </p>
                  <p className="text-sm text-[color:var(--fc-text-dim)]">goals completed</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Extra Activities Summary */}
        {!loading && recentActivities.length > 0 && (
          <div className="space-y-6" style={{ animation: "fadeInUp 0.8s ease-out 0.6s both" }}>
            <div className="fc-surface rounded-2xl border border-[color:var(--fc-glass-border)] backdrop-blur-[8px] shadow-[var(--fc-shadow-card)] p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--fc-accent-cyan)] shadow-[0_10px_20px_color-mix(in_srgb,var(--fc-accent-cyan)_25%,transparent)]">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[color:var(--fc-text-primary)]">
                    Extra Activities
                  </h2>
                  <p className="text-sm text-[color:var(--fc-text-dim)]">
                    Your logged activities beyond workouts
                  </p>
                </div>
              </div>

              {(() => {
                const byWeek: Record<string, { count: number; minutes: number }> = {};
                const byType: Record<string, number> = {};

                for (const a of recentActivities) {
                  const d = new Date(a.activity_date + "T00:00:00");
                  const dayOfWeek = d.getDay();
                  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                  const monday = new Date(d);
                  monday.setDate(d.getDate() + mondayOffset);
                  const weekKey = monday.toISOString().split("T")[0];

                  if (!byWeek[weekKey]) byWeek[weekKey] = { count: 0, minutes: 0 };
                  byWeek[weekKey].count++;
                  byWeek[weekKey].minutes += a.duration_minutes;

                  const label = a.activity_type === "custom"
                    ? (a.custom_activity_name ?? "Custom")
                    : (ACTIVITY_META[a.activity_type]?.label ?? a.activity_type);
                  byType[label] = (byType[label] || 0) + 1;
                }

                const weekKeys = Object.keys(byWeek).sort();
                const last8Weeks = weekKeys.slice(-8);
                const maxMinutes = Math.max(...last8Weeks.map((w) => byWeek[w].minutes), 1);

                const sortedTypes = Object.entries(byType)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5);
                const totalByType = sortedTypes.reduce((s, [, c]) => s + c, 0);

                return (
                  <div className="space-y-6">
                    {/* Weekly duration bar chart */}
                    <div>
                      <p className="text-sm font-semibold text-[color:var(--fc-text-primary)] mb-3">
                        Weekly Duration (minutes)
                      </p>
                      <div className="flex items-end gap-1.5 h-24">
                        {last8Weeks.map((w) => {
                          const pct = (byWeek[w].minutes / maxMinutes) * 100;
                          const weekDate = new Date(w + "T00:00:00");
                          const label = `${weekDate.getMonth() + 1}/${weekDate.getDate()}`;
                          return (
                            <div key={w} className="flex-1 flex flex-col items-center gap-1">
                              <span className="text-[10px] fc-text-dim">
                                {byWeek[w].minutes}
                              </span>
                              <div
                                className="w-full rounded-t-md bg-gradient-to-t from-cyan-500 to-cyan-400 transition-all duration-500"
                                style={{ height: `${Math.max(pct, 4)}%` }}
                              />
                              <span className="text-[9px] fc-text-dim">{label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Activity type distribution */}
                    <div>
                      <p className="text-sm font-semibold text-[color:var(--fc-text-primary)] mb-3">
                        Activity Types
                      </p>
                      <div className="space-y-2">
                        {sortedTypes.map(([label, count]) => {
                          const pct = Math.round((count / totalByType) * 100);
                          return (
                            <div key={label} className="flex items-center gap-3">
                              <span className="text-sm fc-text-primary w-24 truncate">
                                {label}
                              </span>
                              <div className="flex-1 h-2 rounded-full bg-[color:var(--fc-glass-soft)] overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-cyan-500 transition-all duration-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs fc-text-dim w-8 text-right">
                                {count}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Total stats */}
                    <div className="flex gap-4 pt-2 border-t border-[color:var(--fc-glass-border)]">
                      <div className="flex-1 text-center">
                        <p className="text-lg font-bold text-[color:var(--fc-text-primary)]">
                          {recentActivities.length}
                        </p>
                        <p className="text-[10px] uppercase tracking-wide text-[color:var(--fc-text-dim)]">
                          Total Activities
                        </p>
                      </div>
                      <div className="flex-1 text-center">
                        <p className="text-lg font-bold text-[color:var(--fc-text-primary)]">
                          {recentActivities.reduce((s, a) => s + a.duration_minutes, 0)}
                        </p>
                        <p className="text-[10px] uppercase tracking-wide text-[color:var(--fc-text-dim)]">
                          Total Minutes
                        </p>
                      </div>
                      <div className="flex-1 text-center">
                        <p className="text-lg font-bold text-[color:var(--fc-text-primary)]">
                          {Object.keys(byType).length}
                        </p>
                        <p className="text-[10px] uppercase tracking-wide text-[color:var(--fc-text-dim)]">
                          Activity Types
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

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
      `}      </style>
    </AnimatedBackground>
  );
}

export default function AnalyticsPage() {
  return (
    <ProtectedRoute>
      <AnalyticsPageContent />
    </ProtectedRoute>
  );
}

