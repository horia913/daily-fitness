"use client";

import React, { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Dumbbell,
  Scale,
  Target,
  Activity,
  Calendar,
  Search,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ResponsiveModal from "@/components/ui/ResponsiveModal";
import { Input } from "@/components/ui/input";

interface WorkoutFrequencyData {
  week: string;
  count: number;
}

interface StrengthData {
  exercise: string;
  date: string;
  weight: number;
  percentIncrease: number;
}

interface BodyCompositionData {
  date: string;
  weight: number;
  bodyFat?: number;
}

function AnalyticsPageContent() {
  const { user } = useAuth();
  const { isDark, getSemanticColor, performanceSettings } = useTheme();

  const [loading, setLoading] = useState(true);
  const [workoutFrequency, setWorkoutFrequency] = useState<WorkoutFrequencyData[]>([]);
  const [strengthData, setStrengthData] = useState<StrengthData[]>([]);
  const [bodyComposition, setBodyComposition] = useState<BodyCompositionData[]>([]);
  const [goalCompletion, setGoalCompletion] = useState({ completed: 0, total: 0 });
  
  // Modal state
  const [showStrengthModal, setShowStrengthModal] = useState(false);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState("");
  const [availableExercises, setAvailableExercises] = useState<string[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [selectedExerciseData, setSelectedExerciseData] = useState<StrengthData[]>([]);
  const [loadingExerciseData, setLoadingExerciseData] = useState(false);

  useEffect(() => {
    if (user) {
      loadAnalyticsData();
    }
  }, [user]);

  useEffect(() => {
    if (showStrengthModal && user) {
      loadAvailableExercises();
    }
  }, [showStrengthModal, user]);

  const loadAnalyticsData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await Promise.all([
        loadWorkoutFrequency(),
        loadStrengthProgress(),
        loadBodyComposition(),
        loadGoalCompletion(),
      ]);
    } catch (error) {
      console.error("Error loading analytics data:", error);
    } finally {
      setLoading(false);
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

  const loadStrengthProgress = async () => {
    if (!user) return;

    try {
      // Get all workout logs (no time limit to find first vs highest)
      const { data: workoutLogs, error: logsError } = await supabase
        .from("workout_logs")
        .select("id, completed_at")
        .eq("client_id", user.id)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: true });

      if (logsError) throw logsError;
      if (!workoutLogs || workoutLogs.length === 0) {
        setStrengthData([]);
        return;
      }

      const logIds = workoutLogs.map((log) => log.id);

      // Get all set logs with exercise info, ordered by date
      const { data: setLogs, error: setsError } = await supabase
        .from("workout_set_logs")
        .select(`
          workout_log_id,
          weight,
          completed_at,
          exercises (
            id,
            name
          )
        `)
        .in("workout_log_id", logIds)
        .not("weight", "is", null)
        .gt("weight", 0)
        .order("completed_at", { ascending: true });

      if (setsError) throw setsError;
      if (!setLogs || setLogs.length === 0) {
        setStrengthData([]);
        return;
      }

      // Group by exercise: track all weights and dates
      const exerciseData = new Map<string, { weights: number[]; dates: string[] }>();

      setLogs.forEach((setLog: any) => {
        const exercise = setLog.exercises;
        if (!exercise || !exercise.name) return;

        const exerciseName = exercise.name;
        const weight = setLog.weight;
        const date = new Date(setLog.completed_at).toISOString().split("T")[0];

        if (!exerciseData.has(exerciseName)) {
          exerciseData.set(exerciseName, { weights: [], dates: [] });
        }

        const data = exerciseData.get(exerciseName)!;
        data.weights.push(weight);
        data.dates.push(date);
      });

      // Calculate % increase for each exercise: ((highest - first) / first) * 100
      const exercisesWithProgress = Array.from(exerciseData.entries())
        .map(([name, data]) => {
          if (data.weights.length === 0) return null;

          const firstWeight = data.weights[0];
          const highestWeight = Math.max(...data.weights);
          const percentIncrease = ((highestWeight - firstWeight) / firstWeight) * 100;

          // Create time series: group by date, take max weight per day
          const dateWeightMap = new Map<string, number>();
          data.dates.forEach((date, index) => {
            const currentMax = dateWeightMap.get(date) || 0;
            dateWeightMap.set(date, Math.max(currentMax, data.weights[index]));
          });

          return {
            name,
            firstWeight,
            highestWeight,
            percentIncrease,
            dateWeightMap,
          };
        })
        .filter((e) => e !== null && e!.percentIncrease > 0) as Array<{
        name: string;
        firstWeight: number;
        highestWeight: number;
        percentIncrease: number;
        dateWeightMap: Map<string, number>;
      }>;

      // Sort by % increase (descending) and take top 2
      exercisesWithProgress.sort((a, b) => b.percentIncrease - a.percentIncrease);
      const top2Exercises = exercisesWithProgress.slice(0, 2);

      // Convert to chart data format
      const strengthChartData: StrengthData[] = [];
      top2Exercises.forEach((exercise) => {
        Array.from(exercise.dateWeightMap.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .forEach(([date, weight]) => {
            strengthChartData.push({
              exercise: exercise.name,
              date: new Date(date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              }),
              weight: Math.round(weight * 10) / 10, // Round to 1 decimal
              percentIncrease: exercise.percentIncrease,
            });
          });
      });

      setStrengthData(strengthChartData);
    } catch (error) {
      console.error("Error loading strength progress:", error);
      setStrengthData([]);
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
        console.log("No body metrics found for user");
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

      console.log("Loaded body composition data:", compositionData.length, "entries");
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

  const loadAvailableExercises = async () => {
    if (!user) return;

    try {
      // Get all workout logs for this client
      const { data: workoutLogs, error: logsError } = await supabase
        .from("workout_logs")
        .select("id")
        .eq("client_id", user.id);

      if (logsError) throw logsError;
      if (!workoutLogs || workoutLogs.length === 0) {
        setAvailableExercises([]);
        return;
      }

      const logIds = workoutLogs.map((log) => log.id);

      // Get unique exercise names from set logs
      const { data: setLogs, error: setsError } = await supabase
        .from("workout_set_logs")
        .select(`
          exercises (
            name
          )
        `)
        .in("workout_log_id", logIds)
        .not("weight", "is", null)
        .gt("weight", 0);

      if (setsError) throw setsError;

      // Extract unique exercise names
      const exerciseNames = new Set<string>();
      setLogs?.forEach((setLog: any) => {
        if (setLog.exercises?.name) {
          exerciseNames.add(setLog.exercises.name);
        }
      });

      setAvailableExercises(Array.from(exerciseNames).sort());
    } catch (error) {
      console.error("Error loading available exercises:", error);
      setAvailableExercises([]);
    }
  };

  const loadExerciseProgression = async (exerciseName: string) => {
    if (!user) return;

    setLoadingExerciseData(true);
    try {
      // Get all workout logs
      const { data: workoutLogs, error: logsError } = await supabase
        .from("workout_logs")
        .select("id, completed_at")
        .eq("client_id", user.id)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: true });

      if (logsError) throw logsError;
      if (!workoutLogs || workoutLogs.length === 0) {
        setSelectedExerciseData([]);
        return;
      }

      const logIds = workoutLogs.map((log) => log.id);

      // Get set logs for this specific exercise
      const { data: setLogs, error: setsError } = await supabase
        .from("workout_set_logs")
        .select(`
          weight,
          completed_at,
          exercises (
            name
          )
        `)
        .in("workout_log_id", logIds)
        .not("weight", "is", null)
        .gt("weight", 0)
        .order("completed_at", { ascending: true });

      if (setsError) throw setsError;

      // Filter by exercise name and group by date
      const exerciseSetLogs = setLogs?.filter(
        (setLog: any) => setLog.exercises?.name === exerciseName
      ) || [];

      if (exerciseSetLogs.length === 0) {
        setSelectedExerciseData([]);
        return;
      }

      // Group by date, take max weight per day
      const dateWeightMap = new Map<string, number>();
      exerciseSetLogs.forEach((setLog: any) => {
        const date = new Date(setLog.completed_at).toISOString().split("T")[0];
        const currentMax = dateWeightMap.get(date) || 0;
        dateWeightMap.set(date, Math.max(currentMax, setLog.weight));
      });

      // Calculate % increase
      const weights = Array.from(dateWeightMap.values());
      const firstWeight = weights[0];
      const highestWeight = Math.max(...weights);
      const percentIncrease = ((highestWeight - firstWeight) / firstWeight) * 100;

      // Convert to chart data format
      const progressionData: StrengthData[] = Array.from(dateWeightMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, weight]) => ({
          exercise: exerciseName,
          date: new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          weight: Math.round(weight * 10) / 10,
          percentIncrease,
        }));

      setSelectedExerciseData(progressionData);
    } catch (error) {
      console.error("Error loading exercise progression:", error);
      setSelectedExerciseData([]);
    } finally {
      setLoadingExerciseData(false);
    }
  };

  const handleExerciseSelect = (exerciseName: string) => {
    setSelectedExercise(exerciseName);
    loadExerciseProgression(exerciseName);
  };

  const maxWorkouts = Math.max(...workoutFrequency.map((w) => w.count), 1);
  const maxBodyWeight = bodyComposition.length > 0 ? Math.max(...bodyComposition.map((b) => b.weight), 0) : 0;
  const minBodyWeight = bodyComposition.length > 0 ? Math.min(...bodyComposition.map((b) => b.weight), maxBodyWeight) : 0;
  const bodyWeightRange = maxBodyWeight - minBodyWeight || 1;

  // Group strength data by exercise for display
  const strengthByExercise = new Map<string, StrengthData[]>();
  strengthData.forEach((data) => {
    if (!strengthByExercise.has(data.exercise)) {
      strengthByExercise.set(data.exercise, []);
    }
    strengthByExercise.get(data.exercise)!.push(data);
  });

  const completionPercentage =
    goalCompletion.total > 0
      ? Math.round((goalCompletion.completed / goalCompletion.total) * 100)
      : 0;

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <GlassCard elevation={1} className="p-6">
            <div className="flex items-center gap-4">
              <Link href="/client/progress">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1
                  className="text-3xl font-bold mb-1"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  Analytics Dashboard
                </h1>
                <p
                  className="text-sm"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                  }}
                >
                  Track your fitness progress with detailed insights
                </p>
              </div>
            </div>
          </GlassCard>
        </div>

        {loading ? (
          <GlassCard elevation={2} className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
            <p
              className="mt-4 text-sm"
              style={{
                color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
              }}
            >
              Loading analytics...
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-8">
            {/* Workout Frequency Chart */}
            <GlassCard elevation={2} className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)",
                    boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
                  }}
                >
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2
                    className="text-xl font-bold"
                    style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                  >
                    Workout Frequency
                  </h2>
                  <p
                    className="text-sm"
                    style={{
                      color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                    }}
                  >
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
                            <span
                              className="text-sm font-bold mb-2"
                              style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                            >
                              {week.count}
                            </span>
                            <div
                              className="w-full bg-gradient-to-t from-blue-500 to-indigo-600 rounded-t-lg transition-all duration-500 hover:opacity-80"
                              style={{
                                height: `${Math.max(height, 5)}%`,
                                minHeight: "20px",
                              }}
                            />
                          </div>
                          <span
                            className="text-xs text-center"
                            style={{
                              color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                            }}
                          >
                            {week.week}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p
                  className="text-center py-12 text-sm"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                  }}
                >
                  No workout data available
                </p>
              )}
            </GlassCard>

            {/* Strength Progress Charts */}
            {strengthByExercise.size > 0 && (
              <GlassCard 
                elevation={2} 
                className="p-6 transition-all hover:scale-[1.02] hover:shadow-2xl"
                pressable={true}
                onPress={() => setShowStrengthModal(true)}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, #F97316 0%, #EA580C 100%)",
                      boxShadow: "0 4px 12px rgba(249, 115, 22, 0.3)",
                    }}
                  >
                    <Dumbbell className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2
                      className="text-xl font-bold"
                      style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                    >
                      Best Strength Progressions
                    </h2>
                    <p
                      className="text-sm"
                      style={{
                        color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                      }}
                    >
                      Top 2 exercises by weight increase % - Click to search more
                    </p>
                  </div>
                </div>

                <div className="space-y-8">
                  {Array.from(strengthByExercise.entries()).map(([exercise, data], exerciseIndex) => {
                    const maxWeight = Math.max(...data.map((d) => d.weight));
                    const minWeight = Math.min(...data.map((d) => d.weight));
                    const range = maxWeight - minWeight || 1;
                    const percentIncrease = data[0]?.percentIncrease || 0;

                    return (
                      <div key={exercise}>
                        <div className="flex items-center justify-between mb-4">
                          <h3
                            className="text-lg font-semibold"
                            style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                          >
                            {exercise}
                          </h3>
                          <div
                            className="px-3 py-1 rounded-full text-sm font-semibold"
                            style={{
                              background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                              color: "#fff",
                            }}
                          >
                            +{percentIncrease.toFixed(1)}%
                          </div>
                        </div>
                        <div className="relative h-48">
                          <div className="absolute inset-0 flex items-end justify-between gap-2">
                            {data.map((point, index) => {
                              const height = ((point.weight - minWeight) / range) * 100;
                              return (
                                <div
                                  key={index}
                                  className="flex-1 flex flex-col items-center gap-2"
                                  style={{
                                    animation: `fadeInUp 0.6s ease-out ${(exerciseIndex * 0.2 + index * 0.1)}s both`,
                                  }}
                                >
                                  <div className="w-full flex flex-col items-center">
                                    <span
                                      className="text-xs font-bold mb-1"
                                      style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                                    >
                                      {point.weight}kg
                                    </span>
                                    <div
                                      className="w-full bg-gradient-to-t from-orange-500 to-red-600 rounded-t-lg transition-all duration-500 hover:opacity-80"
                                      style={{
                                        height: `${Math.max(height, 10)}%`,
                                        minHeight: "30px",
                                      }}
                                    />
                                  </div>
                                  <span
                                    className="text-xs text-center"
                                    style={{
                                      color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                                    }}
                                  >
                                    {point.date}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            )}

            {/* Body Composition Chart */}
            {bodyComposition.length > 0 ? (
              <GlassCard elevation={2} className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                      boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                    }}
                  >
                    <Scale className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2
                      className="text-xl font-bold"
                      style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                    >
                      Body Composition
                    </h2>
                    <p
                      className="text-sm"
                      style={{
                        color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                      }}
                    >
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
                            <span
                              className="text-xs font-bold mb-1"
                              style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                            >
                              {point.weight.toFixed(1)}kg
                            </span>
                            <div
                              className="w-full bg-gradient-to-t from-green-500 to-emerald-600 rounded-t-lg transition-all duration-500 hover:opacity-80"
                              style={{
                                height: `${Math.max(height, 10)}%`,
                                minHeight: "30px",
                              }}
                            />
                          </div>
                          <span
                            className="text-xs text-center"
                            style={{
                              color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                            }}
                          >
                            {point.date}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {bodyComposition.length >= 2 && (
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <span
                        className="text-sm"
                        style={{
                          color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                        }}
                      >
                        Weight change
                      </span>
                      <div className="flex items-center gap-2">
                        {bodyComposition[bodyComposition.length - 1].weight >
                        bodyComposition[0].weight ? (
                          <TrendingUp
                            className="w-4 h-4"
                            style={{ color: getSemanticColor("warning").primary }}
                          />
                        ) : (
                          <TrendingDown
                            className="w-4 h-4"
                            style={{ color: getSemanticColor("success").primary }}
                          />
                        )}
                        <span
                          className="text-sm font-semibold"
                          style={{
                            color:
                              bodyComposition[bodyComposition.length - 1].weight >
                              bodyComposition[0].weight
                                ? getSemanticColor("warning").primary
                                : getSemanticColor("success").primary,
                          }}
                        >
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
              </GlassCard>
            ) : (
              <GlassCard elevation={2} className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                      boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                    }}
                  >
                    <Scale className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2
                      className="text-xl font-bold"
                      style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                    >
                      Body Composition
                    </h2>
                    <p
                      className="text-sm"
                      style={{
                        color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                      }}
                    >
                      Weight and body fat trends
                    </p>
                  </div>
                </div>
                <p
                  className="text-center py-12 text-sm"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                  }}
                >
                  No body metrics data available
                </p>
              </GlassCard>
            )}

            {/* Goal Completion */}
            <GlassCard elevation={2} className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
                    boxShadow: "0 4px 12px rgba(139, 92, 246, 0.3)",
                  }}
                >
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2
                    className="text-xl font-bold"
                    style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                  >
                    Goal Completion
                  </h2>
                  <p
                    className="text-sm"
                    style={{
                      color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                    }}
                  >
                    Track your goal achievements
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span
                    className="text-lg font-semibold"
                    style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                  >
                    {completionPercentage}%
                  </span>
                  <span
                    className="text-sm"
                    style={{
                      color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                    }}
                  >
                    {goalCompletion.completed} of {goalCompletion.total} goals completed
                  </span>
                </div>

                <div className="relative h-6 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${completionPercentage}%`,
                      animation: "fadeInLeft 1s ease-out",
                    }}
                  />
                </div>
              </div>
            </GlassCard>
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

      {/* Strength Progression Modal */}
      <ResponsiveModal
        isOpen={showStrengthModal}
        onClose={() => {
          setShowStrengthModal(false);
          setSelectedExercise(null);
          setSelectedExerciseData([]);
          setExerciseSearchQuery("");
        }}
        title="Exercise Progression Search"
        subtitle="Search and view progression for any exercise"
        icon={<Dumbbell className="w-6 h-6 text-white" />}
        maxWidth="4xl"
      >
        <div className="space-y-6">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search exercises by name..."
              value={exerciseSearchQuery}
              onChange={(e) => setExerciseSearchQuery(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>

          {/* Exercise List */}
          {availableExercises.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {availableExercises
                .filter((exercise) =>
                  exercise.toLowerCase().includes(exerciseSearchQuery.toLowerCase())
                )
                .map((exercise) => (
                  <div
                    key={exercise}
                    onClick={() => handleExerciseSelect(exercise)}
                    className={`p-4 rounded-xl cursor-pointer transition-all ${
                      selectedExercise === exercise
                        ? "bg-gradient-to-r from-orange-500 to-red-600 text-white"
                        : isDark
                        ? "bg-slate-700 hover:bg-slate-600"
                        : "bg-slate-100 hover:bg-slate-200"
                    }`}
                    style={{
                      color:
                        selectedExercise === exercise
                          ? "#fff"
                          : isDark
                          ? "#fff"
                          : "#1A1A1A",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{exercise}</span>
                      {selectedExercise === exercise && (
                        <span className="text-sm opacity-90">Selected</span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p
              className="text-center py-8 text-sm"
              style={{
                color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
              }}
            >
              No exercises found
            </p>
          )}

          {/* Selected Exercise Chart */}
          {selectedExercise && (
            <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
              {loadingExerciseData ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                  <p
                    className="mt-4 text-sm"
                    style={{
                      color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                    }}
                  >
                    Loading progression data...
                  </p>
                </div>
              ) : selectedExerciseData.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3
                      className="text-xl font-bold"
                      style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                    >
                      {selectedExercise}
                    </h3>
                    <div
                      className="px-4 py-2 rounded-full text-sm font-semibold"
                      style={{
                        background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                        color: "#fff",
                      }}
                    >
                      +{selectedExerciseData[0]?.percentIncrease.toFixed(1)}% increase
                    </div>
                  </div>

                  <div className="relative h-64">
                    <div className="absolute inset-0 flex items-end justify-between gap-2">
                      {selectedExerciseData.map((point, index) => {
                        const maxWeight = Math.max(...selectedExerciseData.map((d) => d.weight));
                        const minWeight = Math.min(...selectedExerciseData.map((d) => d.weight));
                        const range = maxWeight - minWeight || 1;
                        const height = ((point.weight - minWeight) / range) * 100;
                        return (
                          <div
                            key={index}
                            className="flex-1 flex flex-col items-center gap-2"
                            style={{
                              animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`,
                            }}
                          >
                            <div className="w-full flex flex-col items-center">
                              <span
                                className="text-xs font-bold mb-1"
                                style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                              >
                                {point.weight}kg
                              </span>
                              <div
                                className="w-full bg-gradient-to-t from-orange-500 to-red-600 rounded-t-lg transition-all duration-500 hover:opacity-80"
                                style={{
                                  height: `${Math.max(height, 10)}%`,
                                  minHeight: "30px",
                                }}
                              />
                            </div>
                            <span
                              className="text-xs text-center"
                              style={{
                                color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                              }}
                            >
                              {point.date}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <p
                  className="text-center py-8 text-sm"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                  }}
                >
                  No progression data available for this exercise
                </p>
              )}
            </div>
          )}
        </div>
      </ResponsiveModal>
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

