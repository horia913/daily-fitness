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
  exercises?: {
    id: string;
    name: string;
    category?: string | null;
  };
}

export default function WorkoutLogsPage() {
  const { user, loading: authLoading } = useAuth();
  const { performanceSettings } = useTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);

  // Reset state when user changes
  useEffect(() => {
    setLoading(true);
    setWorkoutLogs([]);
  }, [user]);

  useEffect(() => {
    if (user && !authLoading) {
      loadWorkoutLogs();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const loadWorkoutLogs = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Ensure user is authenticated before querying
      const { ensureAuthenticated } = await import('@/lib/supabase');
      await ensureAuthenticated();

      console.log("🔍 Loading workout logs for user:", user.id);

      // Get ALL workout_logs for this user (not grouped by assignment)
      const { data: workoutLogs, error } = await supabase
        .from("workout_logs")
        .select(
          `
          id,
          client_id,
          started_at,
          completed_at,
          total_duration_minutes,
          total_sets_completed,
          total_reps_completed,
          total_weight_lifted,
          workout_assignment_id
        `
        )
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
      const assignmentIds = [
        ...new Set(
          workoutLogs
            .map((log) => log.workout_assignment_id)
            .filter(Boolean) as string[]
        ),
      ];

      console.log("📋 Found assignment IDs:", assignmentIds.length);

      // Fetch workout template names via assignments
      const assignmentTemplateMap = new Map<string, string>();
      if (assignmentIds.length > 0) {
        const { data: assignments, error: assignmentsError } = await supabase
          .from("workout_assignments")
          .select(
            `
            id,
            workout_template_id,
            workout_templates (
              id,
              name
            )
          `
          )
          .in("id", assignmentIds);

        if (assignmentsError) {
          console.error("⚠️ Error fetching assignments:", assignmentsError);
        }

        if (assignments) {
          console.log("📋 Fetched assignments:", assignments.length);
          assignments.forEach((assignment: any) => {
            const templateName =
              assignment.workout_templates?.name || "Workout";
            assignmentTemplateMap.set(assignment.id, templateName);
            console.log(`  - Assignment ${assignment.id}: "${templateName}"`);
          });
        }
      }

      // OPTIMIZED: Batch fetch ALL sets for ALL logs at once instead of N+1 queries
      const logIds = workoutLogs.map(log => log.id);
      const { data: allSets, error: setsError } = await supabase
        .from("workout_set_logs")
        .select(
          `
          id,
          weight,
          reps,
          exercise_id,
          workout_log_id,
          exercises (
            id,
            name,
            category
          )
        `
        )
        .in("workout_log_id", logIds)
        .eq("client_id", user.id);

      if (setsError) {
        console.error("Error fetching sets:", setsError);
      }

      // Group sets by workout_log_id for quick lookup
      const setsByLogId = new Map<string, any[]>();
      (allSets || []).forEach((set: any) => {
        const logId = set.workout_log_id;
        if (!setsByLogId.has(logId)) {
          setsByLogId.set(logId, []);
        }
        setsByLogId.get(logId)!.push(set);
      });

      // Process each log with batched data
      const processedLogs: WorkoutLog[] = workoutLogs.map((log) => {
        // Get workout name from assignment -> template
        let workoutName = "Workout"; // Default fallback
        if (log.workout_assignment_id) {
          workoutName =
            assignmentTemplateMap.get(log.workout_assignment_id) || "Workout";
        }

        // Get sets for this log from map (no query needed!)
        const sets = setsByLogId.get(log.id) || [];

          const workoutSets = (sets || []) as any[];

          // Calculate totals from sets (or use database totals as fallback)
          const calculatedTotalSets = workoutSets.length;
          const calculatedTotalWeight = workoutSets.reduce(
            (sum, set) => sum + (set.weight || 0) * (set.reps || 0),
            0
          );
          const calculatedUniqueExercises = new Set(
            workoutSets.map((set) => set.exercise_id).filter(Boolean)
          ).size;

          // Use calculated values if available, otherwise use database totals
          const totalSets =
            calculatedTotalSets > 0
              ? calculatedTotalSets
              : log.total_sets_completed || 0;

          const totalWeight =
            calculatedTotalWeight > 0
              ? calculatedTotalWeight
              : log.total_weight_lifted || 0;

          const uniqueExercises =
            calculatedUniqueExercises > 0
              ? calculatedUniqueExercises
              : totalSets > 0
              ? 1
              : 0;

          return {
            ...log,
            workout_set_logs: workoutSets,
            totalSets,
            totalWeight,
            uniqueExercises,
            workoutName,
          } as WorkoutLog;
        });

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
          <div className="relative z-10 min-h-screen px-4 pb-24 pt-10 sm:px-6 lg:px-10">
            <div className="mx-auto w-full max-w-6xl">
              <div className="fc-glass fc-card p-8">
                <div className="animate-pulse space-y-4">
                  <div className="h-6 w-40 rounded-full bg-[color:var(--fc-glass-highlight)]" />
                  <div className="h-8 w-3/5 rounded-2xl bg-[color:var(--fc-glass-highlight)]" />
                  <div className="h-64 rounded-3xl bg-[color:var(--fc-glass-highlight)]" />
                </div>
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
        <div className="relative z-10 min-h-screen px-4 pb-24 pt-10 sm:px-6 lg:px-10">
          <div className="mx-auto w-full max-w-6xl space-y-8">
            <GlassCard elevation={2} className="fc-glass fc-card p-6 sm:p-10">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <Link href="/client/progress">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="fc-btn fc-btn-ghost h-10 w-10"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                  </Link>
                  <div>
                    <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                      Progress Hub
                    </span>
                    <h1 className="mt-3 text-3xl font-bold text-[color:var(--fc-text-primary)] sm:text-4xl">
                      Workout Logs
                    </h1>
                    <p className="text-sm text-[color:var(--fc-text-dim)]">
                      Your complete workout history
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="fc-glass-soft fc-card px-4 py-2 text-sm font-semibold text-[color:var(--fc-text-primary)]">
                    {workoutLogs.length} sessions
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Summary Stats */}
            {workoutLogs.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <GlassCard elevation={1} className="fc-glass fc-card p-4">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[color:var(--fc-text-subtle)]">
                    <span>Total Workouts</span>
                    <Activity className="h-4 w-4 text-[color:var(--fc-domain-workouts)]" />
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-[color:var(--fc-text-primary)]">
                    {workoutLogs.length}
                  </p>
                </GlassCard>
                <GlassCard elevation={1} className="fc-glass fc-card p-4">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[color:var(--fc-text-subtle)]">
                    <span>Total Sets</span>
                    <Dumbbell className="h-4 w-4 text-[color:var(--fc-domain-workouts)]" />
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-[color:var(--fc-text-primary)]">
                    {workoutLogs.reduce((sum, log) => sum + log.totalSets, 0)}
                  </p>
                </GlassCard>
                <GlassCard elevation={1} className="fc-glass fc-card p-4">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[color:var(--fc-text-subtle)]">
                    <span>Total Weight</span>
                    <TrendingUp className="h-4 w-4 text-[color:var(--fc-status-success)]" />
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-[color:var(--fc-text-primary)]">
                    {workoutLogs
                      .reduce((sum, log) => sum + log.totalWeight, 0)
                      .toLocaleString()}
                    <span className="ml-2 text-sm text-[color:var(--fc-text-dim)]">
                      kg
                    </span>
                  </p>
                </GlassCard>
                <GlassCard elevation={1} className="fc-glass fc-card p-4">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[color:var(--fc-text-subtle)]">
                    <span>Avg Duration</span>
                    <Clock className="h-4 w-4 text-[color:var(--fc-accent-cyan)]" />
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-[color:var(--fc-text-primary)]">
                    {workoutLogs.length > 0
                      ? Math.round(
                          workoutLogs.reduce(
                            (sum, log) =>
                              sum + (log.total_duration_minutes || 0),
                            0
                          ) / workoutLogs.length
                        )
                      : 0}
                    <span className="ml-2 text-sm text-[color:var(--fc-text-dim)]">
                      min
                    </span>
                  </p>
                </GlassCard>
              </div>
            )}

            {/* Workout Logs List */}
            {workoutLogs.length === 0 ? (
              <GlassCard elevation={2} className="fc-glass fc-card p-12">
                <div className="text-center">
                  <FileText className="mx-auto mb-4 h-16 w-16 text-[color:var(--fc-text-subtle)]" />
                  <h3 className="mb-2 text-xl font-bold text-[color:var(--fc-text-primary)]">
                    No Workout Logs Yet
                  </h3>
                  <p className="text-sm text-[color:var(--fc-text-dim)]">
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
                    <div
                      key={log.id}
                      onClick={() =>
                        router.push(`/client/progress/workout-logs/${log.id}`)
                      }
                      className="cursor-pointer"
                    >
                      <GlassCard
                        elevation={2}
                        className="fc-glass fc-card p-6 transition-all hover:-translate-y-1 hover:shadow-xl"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <h3 className="text-xl font-bold text-[color:var(--fc-text-primary)]">
                              {workoutName}
                            </h3>
                            <div className="mt-2 flex flex-wrap gap-4 text-sm text-[color:var(--fc-text-dim)]">
                              {completedDate && (
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  <span>
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
                                  <Clock className="h-4 w-4" />
                                  <span>{duration} min</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <Dumbbell className="h-4 w-4" />
                                <span>{log.totalSets} sets</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-[color:var(--fc-text-dim)]">
                            View details
                            <ChevronRight className="h-5 w-5" />
                          </div>
                        </div>

                        {log.workout_set_logs && log.workout_set_logs.length > 0 && (
                          <div className="mt-5 border-t border-[color:var(--fc-glass-border)] pt-4">
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                              <div>
                                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--fc-text-subtle)]">
                                  Exercises
                                </p>
                                <p className="text-lg font-bold text-[color:var(--fc-text-primary)]">
                                  {log.uniqueExercises}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--fc-text-subtle)]">
                                  Total Weight
                                </p>
                                <p className="text-lg font-bold text-[color:var(--fc-text-primary)]">
                                  {log.totalWeight.toLocaleString()} kg
                                </p>
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--fc-text-subtle)]">
                                  Sets
                                </p>
                                <p className="text-lg font-bold text-[color:var(--fc-text-primary)]">
                                  {log.totalSets}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </GlassCard>
                    </div>
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
