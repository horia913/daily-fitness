"use client";

import React, { useState, useEffect, useRef } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
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
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import {
  getTopProgressions,
  getTrainedExercises,
  getExerciseProgression,
  isCompoundLift,
  getCompoundLiftDisplayName,
  type ExerciseProgression,
  type TrainedExercise,
} from "@/lib/strengthAnalytics";
import { ExerciseProgressionChart } from "@/components/progress/ExerciseProgressionChart";
import { ChevronDown, ChevronRight } from "lucide-react";
import { getWeeklyVolume, type VolumeStats } from "@/lib/volumeAnalytics";
import { getWellnessTrends, type WellnessStats } from "@/lib/wellnessAnalytics";
import { VolumeTrendChart } from "@/components/progress/VolumeTrendChart";
import { WellnessTrendChart } from "@/components/progress/WellnessTrendChart";

interface WorkoutFrequencyData {
  week: string;
  count: number;
}

interface BodyCompositionData {
  date: string;
  weight: number;
  bodyFat?: number;
}

function AnalyticsPageContent() {
  const { user } = useAuth();
  const { performanceSettings } = useTheme();

  const [loading, setLoading] = useState(true);
  const [workoutFrequency, setWorkoutFrequency] = useState<WorkoutFrequencyData[]>([]);
  const [bodyComposition, setBodyComposition] = useState<BodyCompositionData[]>([]);
  const [goalCompletion, setGoalCompletion] = useState({ completed: 0, total: 0 });
  const [timeRange, setTimeRange] = useState<"1M" | "3M" | "6M" | "1Y" | "ALL">("3M");
  
  // Volume and wellness state
  const [volumeStats, setVolumeStats] = useState<VolumeStats | null>(null);
  const [wellnessStats, setWellnessStats] = useState<WellnessStats | null>(null);

  // Strength progression state (1RM + charts)
  const [topProgressions, setTopProgressions] = useState<ExerciseProgression[]>([]);
  const [trainedExercises, setTrainedExercises] = useState<TrainedExercise[]>([]);
  const [compoundProgressions, setCompoundProgressions] = useState<ExerciseProgression[]>([]);
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
  const [progressionCache, setProgressionCache] = useState<Record<string, ExerciseProgression>>({});
  const [loadingProgression, setLoadingProgression] = useState<string | null>(null);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  }, [user]);

  const loadAnalyticsData = async () => {
      if (!user) {
      setWorkoutFrequency([]);
      setBodyComposition([]);
      setGoalCompletion({ completed: 0, total: 0 });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      await Promise.all([
        loadWorkoutFrequency(),
        loadStrengthProgressions(),
        loadBodyComposition(),
        loadGoalCompletion(),
        loadVolumeStats(),
        loadWellnessStats(),
      ]);
    } catch (error) {
      console.error("Error loading analytics data:", error);
    } finally {
      setLoading(false);
    }
  };

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
      const progressions = await Promise.all(
        compound.map((ex) => getExerciseProgression(user.id, ex.id, "3M"))
      );
      setCompoundProgressions(progressions.filter((p): p is ExerciseProgression => p != null && p.dataPoints.length >= 2));
    } catch (e) {
      console.error("Error loading strength progressions:", e);
      setTopProgressions([]);
      setTrainedExercises([]);
      setCompoundProgressions([]);
    }
  };

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

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-32 pt-8 sm:px-6 lg:px-10 fc-page">
        <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6 sm:p-10 mb-10">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <Link href="/client/progress" className="fc-surface w-10 h-10 flex items-center justify-center rounded-xl shrink-0 border border-[color:var(--fc-surface-card-border)]">
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
              </div>
            </div>
          </div>
        </div>

        {loadError ? (
          <div className="fc-surface p-8 rounded-2xl border border-[color:var(--fc-surface-card-border)] text-center">
            <p className="text-[color:var(--fc-text-dim)] mb-4">{loadError}</p>
            <button type="button" onClick={() => window.location.reload()} className="fc-btn fc-btn-secondary fc-press h-10 px-6 text-sm">Retry</button>
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
              <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-4">
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
              <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-4">
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
              <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-4">
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
              <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-4">
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
            <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[color:var(--fc-accent-cyan)] shadow-[0_10px_20px_rgba(59,130,246,0.25)]">
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
                <p className="py-12 text-center text-sm text-[color:var(--fc-text-dim)]">
                  No workout data available
                </p>
              )}
            </div>

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
                  <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-4 sm:p-6">
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
                            className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] overflow-hidden"
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

            {/* Body Composition Chart */}
            {bodyComposition.length > 0 ? (
              <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6">
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
              <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6">
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
                <p className="py-12 text-center text-sm text-[color:var(--fc-text-dim)]">
                  No body metrics data available
                </p>
              </div>
            )}

            {/* Goal Completion */}
            <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[color:var(--fc-accent-primary)] shadow-[0_10px_20px_rgba(124,58,237,0.3)]">
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

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                    {completionPercentage}%
                  </span>
                  <span className="text-sm text-[color:var(--fc-text-dim)]">
                    {goalCompletion.completed} of {goalCompletion.total} goals completed
                  </span>
                </div>

                <div className="relative h-6 rounded-full bg-[color:var(--fc-glass-soft)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[color:var(--fc-accent-primary)] transition-all duration-1000 ease-out"
                    style={{
                      width: `${completionPercentage}%`,
                      animation: "fadeInLeft 1s ease-out",
                    }}
                  />
                </div>
              </div>
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

