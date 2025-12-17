"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Calendar,
  Clock,
  Dumbbell,
  ArrowLeft,
  ChevronRight,
  Activity,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface WorkoutLog {
  id: string;
  client_id: string;
  started_at: string;
  completed_at: string | null;
  total_duration_minutes: number | null;
  total_sets_completed: number | null;
  total_reps_completed: number | null;
  total_weight_lifted: number | null;
  workout_assignment_id: string | null;
  workout_set_logs: WorkoutSet[];
  // Calculated fields
  totalSets: number;
  totalWeight: number;
  uniqueExercises: number;
  workoutName: string; // Actual workout template name
}

interface WorkoutSet {
  id: string;
  workout_log_id: string;
  exercise_id: string;
  weight: number | null;
  reps: number | null;
  notes: string | null;
  completed_at: string;
  exercise?: {
    id: string;
    name: string;
    category: string | null;
  };
}

export default function WorkoutLogsPage() {
  const { user, loading: authLoading } = useAuth();
  const { isDark, getThemeStyles, getSemanticColor, performanceSettings } =
    useTheme();
  const theme = getThemeStyles();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);

  useEffect(() => {
    if (user && !authLoading) {
      loadWorkoutLogs();
    }
  }, [user, authLoading]);

  const loadWorkoutLogs = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      console.log("🔍 Loading workout logs for user:", user.id);

      // Get ALL workout_logs for this user (not grouped by assignment)
      const { data: workoutLogs, error } = await supabase
        .from("workout_logs")
        .select(`
          id,
          client_id,
          started_at,
          completed_at,
          total_duration_minutes,
          total_sets_completed,
          total_reps_completed,
          total_weight_lifted,
          workout_assignment_id
        `)
        .eq("client_id", user.id)
        .order("started_at", { ascending: false })
        .limit(100); // Increased limit to show more logs

      if (error) {
        console.error("❌ Error loading workout logs:", error);
        setWorkoutLogs([]);
        return;
      }

      if (!workoutLogs || workoutLogs.length === 0) {
        console.log("ℹ️ No workout logs found for user");
        setWorkoutLogs([]);
        return;
      }

      console.log("✅ Found workout logs:", workoutLogs.length);

      // Get unique assignment IDs to fetch template names
      const assignmentIds = [...new Set(
        workoutLogs
          .map(log => log.workout_assignment_id)
          .filter(Boolean) as string[]
      )];

      console.log("📋 Found assignment IDs:", assignmentIds.length);

      // Fetch workout template names via assignments
      const assignmentTemplateMap = new Map<string, string>();
      if (assignmentIds.length > 0) {
        const { data: assignments, error: assignmentsError } = await supabase
          .from("workout_assignments")
          .select(`
            id,
            workout_template_id,
            workout_templates (
              id,
              name
            )
          `)
          .in("id", assignmentIds);

        if (assignmentsError) {
          console.error("⚠️ Error fetching assignments:", assignmentsError);
        }

        if (assignments) {
          console.log("📋 Fetched assignments:", assignments.length);
          assignments.forEach((assignment: any) => {
            const templateName = assignment.workout_templates?.name || "Workout";
            assignmentTemplateMap.set(assignment.id, templateName);
            console.log(`  - Assignment ${assignment.id}: "${templateName}"`);
          });
        }
      }

      // Process each log individually (show ALL logs, not grouped)
      const processedLogs: WorkoutLog[] = await Promise.all(
        workoutLogs.map(async (log) => {
          // Get workout name from assignment -> template
          let workoutName = "Workout"; // Default fallback
          if (log.workout_assignment_id) {
            workoutName = assignmentTemplateMap.get(log.workout_assignment_id) || "Workout";
          }

          // Get sets for THIS specific workout_log_id only
          const { data: sets, error: setsError } = await supabase
            .from("workout_set_logs")
            .select(`
              id,
              weight,
              reps,
              exercise_id,
              exercises (
                id,
                name,
                category
              )
            `)
            .eq("workout_log_id", log.id)
            .eq("client_id", user.id);

          if (setsError) {
            console.error("Error fetching sets for log:", log.id, setsError);
          }

          const workoutSets = (sets || []) as WorkoutSet[];
          
          // Calculate totals from sets (or use database totals as fallback)
          const calculatedTotalSets = workoutSets.length;
          const calculatedTotalWeight = workoutSets.reduce(
            (sum, set) => sum + ((set.weight || 0) * (set.reps || 0)),
            0
          );
          const calculatedUniqueExercises = new Set(
            workoutSets.map((set) => set.exercise_id).filter(Boolean)
          ).size;

          // Use calculated values if available, otherwise use database totals
          const totalSets = calculatedTotalSets > 0 
            ? calculatedTotalSets 
            : (log.total_sets_completed || 0);
          
          const totalWeight = calculatedTotalWeight > 0 
            ? calculatedTotalWeight 
            : (log.total_weight_lifted || 0);
          
          const uniqueExercises = calculatedUniqueExercises > 0 
            ? calculatedUniqueExercises 
            : (totalSets > 0 ? 1 : 0);

          return {
            ...log,
            workout_set_logs: workoutSets,
            totalSets,
            totalWeight,
            uniqueExercises,
            workoutName,
          } as WorkoutLog;
        })
      );

      console.log("✅ Processed workout logs:", processedLogs.length);
      setWorkoutLogs(processedLogs);
    } catch (error) {
      console.error("❌ Error loading workout logs:", error);
      setWorkoutLogs([]);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <ProtectedRoute>
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className={`min-h-screen ${theme.background}`}>
            <div className="max-w-7xl mx-auto p-4 sm:p-6">
              <div className="animate-pulse">
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-4"></div>
                <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded"></div>
              </div>
            </div>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className={`min-h-screen ${theme.background}`}>
          <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
              <Link href="/client/progress">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div className="flex items-center gap-3 flex-1">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 shadow-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1
                    className={`text-2xl sm:text-3xl font-bold ${theme.text}`}
                  >
                    Workout Logs
                  </h1>
                  <p className={`text-sm ${theme.textSecondary}`}>
                    Your complete workout history
                  </p>
                </div>
              </div>
            </div>

            {/* Summary Stats */}
            {workoutLogs.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <GlassCard elevation={2} className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Activity
                      className="w-5 h-5"
                      style={{ color: getSemanticColor("trust").primary }}
                    />
                    <span
                      className="text-sm font-semibold"
                      style={{
                        color: isDark
                          ? "rgba(255,255,255,0.6)"
                          : "rgba(0,0,0,0.6)",
                      }}
                    >
                      Total Workouts
                    </span>
                  </div>
                  <p
                    className="text-3xl font-bold"
                    style={{ color: getSemanticColor("trust").primary }}
                  >
                    {workoutLogs.length}
                  </p>
                </GlassCard>

                <GlassCard elevation={2} className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Dumbbell
                      className="w-5 h-5"
                      style={{ color: getSemanticColor("energy").primary }}
                    />
                    <span
                      className="text-sm font-semibold"
                      style={{
                        color: isDark
                          ? "rgba(255,255,255,0.6)"
                          : "rgba(0,0,0,0.6)",
                      }}
                    >
                      Total Sets
                    </span>
                  </div>
                  <p
                    className="text-3xl font-bold"
                    style={{ color: getSemanticColor("energy").primary }}
                  >
                    {workoutLogs.reduce((sum, log) => sum + log.totalSets, 0)}
                  </p>
                </GlassCard>

                <GlassCard elevation={2} className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp
                      className="w-5 h-5"
                      style={{ color: getSemanticColor("success").primary }}
                    />
                    <span
                      className="text-sm font-semibold"
                      style={{
                        color: isDark
                          ? "rgba(255,255,255,0.6)"
                          : "rgba(0,0,0,0.6)",
                      }}
                    >
                      Total Weight
                    </span>
                  </div>
                  <p
                    className="text-3xl font-bold"
                    style={{ color: getSemanticColor("success").primary }}
                  >
                    {workoutLogs
                      .reduce((sum, log) => sum + log.totalWeight, 0)
                      .toLocaleString()}
                    <span className="text-lg ml-1">kg</span>
                  </p>
                </GlassCard>

                <GlassCard elevation={2} className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock
                      className="w-5 h-5"
                      style={{ color: getSemanticColor("trust").primary }}
                    />
                    <span
                      className="text-sm font-semibold"
                      style={{
                        color: isDark
                          ? "rgba(255,255,255,0.6)"
                          : "rgba(0,0,0,0.6)",
                      }}
                    >
                      Avg Duration
                    </span>
                  </div>
                  <p
                    className="text-3xl font-bold"
                    style={{ color: getSemanticColor("trust").primary }}
                  >
                    {workoutLogs.length > 0
                      ? Math.round(
                          workoutLogs.reduce(
                            (sum, log) =>
                              sum + (log.total_duration_minutes || 0),
                            0
                          ) / workoutLogs.length
                        )
                      : 0}
                    <span className="text-lg ml-1">min</span>
                  </p>
                </GlassCard>
              </div>
            )}

            {/* Workout Logs List */}
            {workoutLogs.length === 0 ? (
              <GlassCard elevation={2} className="p-12">
                <div className="text-center">
                  <FileText
                    className="w-16 h-16 mx-auto mb-4"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.4)"
                        : "rgba(0,0,0,0.4)",
                    }}
                  />
                  <h3
                    className={`text-xl font-bold mb-2 ${theme.text}`}
                  >
                    No Workout Logs Yet
                  </h3>
                  <p className={theme.textSecondary}>
                    Complete your first workout to see it here!
                  </p>
                </div>
              </GlassCard>
            ) : (
              <div className="space-y-4">
                {workoutLogs.map((log) => {
                  // Use the actual workout name from the log
                  const workoutName = log.workoutName || "Workout";
                  
                  // Use completed_at if available, otherwise use started_at for date display
                  const completedDate = log.completed_at
                    ? new Date(log.completed_at)
                    : log.started_at
                    ? new Date(log.started_at)
                    : null;
                  
                  // Calculate duration: use total_duration_minutes if available,
                  // otherwise calculate from started_at and completed_at
                  let duration: number | null = null;
                  if (log.total_duration_minutes) {
                    duration = Math.round(log.total_duration_minutes);
                  } else if (log.completed_at && log.started_at) {
                    const started = new Date(log.started_at);
                    const completed = new Date(log.completed_at);
                    const durationMs = completed.getTime() - started.getTime();
                    duration = Math.round(durationMs / 1000 / 60);
                  }

                  return (
                    <GlassCard
                      key={log.id}
                      elevation={2}
                      className="p-6 transition-all hover:scale-[1.01] cursor-pointer hover:shadow-xl"
                      onClick={() => router.push(`/client/progress/workout-logs/${log.id}`)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3
                            className={`text-xl font-bold mb-2 ${theme.text}`}
                          >
                            {workoutName}
                          </h3>
                          <div className="flex flex-wrap gap-4 text-sm">
                            {completedDate && (
                              <div className="flex items-center gap-2">
                                <Calendar
                                  className="w-4 h-4"
                                  style={{
                                    color: isDark
                                      ? "rgba(255,255,255,0.6)"
                                      : "rgba(0,0,0,0.6)",
                                  }}
                                />
                                <span className={theme.textSecondary}>
                                  {completedDate.toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </span>
                              </div>
                            )}
                            {duration && (
                              <div className="flex items-center gap-2">
                                <Clock
                                  className="w-4 h-4"
                                  style={{
                                    color: isDark
                                      ? "rgba(255,255,255,0.6)"
                                      : "rgba(0,0,0,0.6)",
                                  }}
                                />
                                <span className={theme.textSecondary}>
                                  {duration} min
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Dumbbell
                                className="w-4 h-4"
                                style={{
                                  color: isDark
                                    ? "rgba(255,255,255,0.6)"
                                    : "rgba(0,0,0,0.6)",
                                }}
                              />
                              <span className={theme.textSecondary}>
                                {log.totalSets} sets
                              </span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight
                          className="w-6 h-6 flex-shrink-0"
                          style={{
                            color: isDark
                              ? "rgba(255,255,255,0.4)"
                              : "rgba(0,0,0,0.4)",
                          }}
                        />
                      </div>

                      {/* Exercise Summary */}
                      {log.workout_set_logs && log.workout_set_logs.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <div>
                              <p
                                className="text-xs font-semibold mb-1"
                                style={{
                                  color: isDark
                                    ? "rgba(255,255,255,0.5)"
                                    : "rgba(0,0,0,0.5)",
                                }}
                              >
                                EXERCISES
                              </p>
                              <p
                                className="text-lg font-bold"
                                style={{
                                  color: getSemanticColor("trust").primary,
                                }}
                              >
                                {log.uniqueExercises}
                              </p>
                            </div>
                            <div>
                              <p
                                className="text-xs font-semibold mb-1"
                                style={{
                                  color: isDark
                                    ? "rgba(255,255,255,0.5)"
                                    : "rgba(0,0,0,0.5)",
                                }}
                              >
                                TOTAL WEIGHT
                              </p>
                              <p
                                className="text-lg font-bold"
                                style={{
                                  color: getSemanticColor("success").primary,
                                }}
                              >
                                {log.totalWeight.toLocaleString()} kg
                              </p>
                            </div>
                            <div>
                              <p
                                className="text-xs font-semibold mb-1"
                                style={{
                                  color: isDark
                                    ? "rgba(255,255,255,0.5)"
                                    : "rgba(0,0,0,0.5)",
                                }}
                              >
                                SETS
                              </p>
                              <p
                                className="text-lg font-bold"
                                style={{
                                  color: getSemanticColor("energy").primary,
                                }}
                              >
                                {log.totalSets}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </GlassCard>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}

