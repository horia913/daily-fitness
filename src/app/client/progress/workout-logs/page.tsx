"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import {
  ArrowLeft,
  FileText,
  Clock,
  ChevronRight,
  TrendingUp,
  Search,
  Trophy,
  Layers,
  ChevronDown,
  Download,
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
  const [timeFilter, setTimeFilter] = useState<"all" | "this_month" | "this_week">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const filteredLogs = useMemo(() => {
    if (timeFilter === "all") return workoutLogs;
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return workoutLogs.filter((log) => {
      const date = log.completed_at ? new Date(log.completed_at) : new Date(log.started_at);
      if (timeFilter === "this_week") return date >= startOfWeek;
      if (timeFilter === "this_month") return date >= startOfMonth;
      return true;
    });
  }, [workoutLogs, timeFilter]);

  const thisMonthCount = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return workoutLogs.filter((log) => {
      const date = log.completed_at ? new Date(log.completed_at) : new Date(log.started_at);
      return date >= startOfMonth;
    }).length;
  }, [workoutLogs]);

  const thisMonthWeight = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return workoutLogs
      .filter((log) => {
        const date = log.completed_at ? new Date(log.completed_at) : new Date(log.started_at);
        return date >= startOfMonth;
      })
      .reduce((sum, log) => sum + log.totalWeight, 0);
  }, [workoutLogs]);

  if (authLoading || loading) {
    return (
      <ProtectedRoute>
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 min-h-screen px-4 pb-24 pt-10 sm:px-6 lg:px-10">
            <div className="mx-auto w-full max-w-6xl">
              <div className="fc-surface p-8">
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
        <div className="relative z-10 min-h-screen px-4 pb-28 pt-8 sm:px-6 lg:px-10 fc-page">
          <div className="mx-auto w-full max-w-6xl space-y-6">
            <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6 sm:p-10 mb-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <Link href="/client/progress" className="fc-surface w-10 h-10 flex items-center justify-center rounded-xl shrink-0 border border-[color:var(--fc-surface-card-border)]">
                    <ArrowLeft className="w-5 h-5 text-[color:var(--fc-text-primary)]" />
                  </Link>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--fc-aurora)]/20 text-[color:var(--fc-accent)] shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight text-[color:var(--fc-text-primary)]">
                        Workout Logs
                      </h1>
                      <p className="text-sm text-[color:var(--fc-text-dim)] mt-1">
                        Reflecting on the grind.
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="w-10 h-10 rounded-xl fc-glass border border-[color:var(--fc-glass-border)] flex items-center justify-center text-[color:var(--fc-text-primary)] hover:bg-[color:var(--fc-glass-highlight)] transition-colors shrink-0"
                  aria-label="Search"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Monthly summary hero */}
            {workoutLogs.length > 0 && (
              <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[10px] font-bold font-mono uppercase tracking-widest fc-text-warning">This month</span>
                    <h2 className="text-3xl font-black fc-text-primary mt-2">
                      {thisMonthCount} <span className="text-lg font-medium fc-text-subtle">workouts</span>
                    </h2>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-[color:var(--fc-status-warning)]/20 flex items-center justify-center">
                    <Trophy className="w-8 h-8 fc-text-warning" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="fc-glass-soft rounded-2xl p-4 border border-[color:var(--fc-glass-border)]">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 fc-text-success" />
                      <span className="text-xs fc-text-subtle font-medium">Volume this month</span>
                    </div>
                    <div className="text-xl font-bold font-mono fc-text-primary">
                      {(thisMonthWeight / 1000).toFixed(1)}k<span className="text-sm fc-text-subtle ml-1">kg</span>
                    </div>
                  </div>
                  <div className="fc-glass-soft rounded-2xl p-4 border border-[color:var(--fc-glass-border)]">
                    <div className="flex items-center gap-2 mb-1">
                      <Layers className="w-4 h-4 fc-text-workouts" />
                      <span className="text-xs fc-text-subtle font-medium">Total sets</span>
                    </div>
                    <div className="text-xl font-bold font-mono fc-text-primary">
                      {workoutLogs
                        .filter((log) => {
                          const d = log.completed_at ? new Date(log.completed_at) : new Date(log.started_at);
                          const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
                          return d >= start;
                        })
                        .reduce((s, log) => s + log.totalSets, 0)}
                    </div>
                  </div>
                  <Link
                    href="/client/progress/personal-records"
                    className="fc-glass-soft rounded-2xl p-4 border border-[color:var(--fc-glass-border)] flex items-center justify-center gap-2 fc-text-subtle hover:fc-text-primary transition-colors"
                  >
                    <span className="text-sm font-semibold">View all PRs</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}

            {/* Sticky filter bar */}
            {workoutLogs.length > 0 && (
              <nav className="sticky top-0 z-10 flex items-center gap-3 overflow-x-auto py-4 -mx-4 px-4 sm:mx-0 sm:px-0 mb-2 fc-glass-soft rounded-xl border-b border-[color:var(--fc-glass-border)] bg-[color:var(--fc-bg-base)]/80 backdrop-blur-xl">
                {(["all", "this_month", "this_week"] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTimeFilter(key)}
                    className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all border ${
                      timeFilter === key
                        ? "fc-glass border-[color:var(--fc-glass-border-strong)] fc-text-primary"
                        : "border-[color:var(--fc-glass-border)] fc-text-subtle hover:fc-text-primary"
                    }`}
                  >
                    {key === "all" ? "All time" : key === "this_month" ? "This month" : "This week"}
                  </button>
                ))}
              </nav>
            )}

            {/* Workout Logs List */}
            {filteredLogs.length === 0 ? (
              <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-12">
                <div className="text-center">
                  <FileText className="mx-auto mb-4 h-16 w-16 fc-text-subtle" />
                  <h3 className="mb-2 text-xl font-bold fc-text-primary">
                    No Workout Logs Yet
                  </h3>
                  <p className="text-sm fc-text-dim">
                    Complete your first workout to see it here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredLogs.map((log) => {
                  const workoutName = log.workoutName || "Workout";
                  const completedDate = log.completed_at
                    ? new Date(log.completed_at)
                    : log.started_at
                    ? new Date(log.started_at)
                    : null;
                  let duration: number | null = null;
                  if (log.total_duration_minutes) {
                    duration = Math.round(log.total_duration_minutes);
                  } else if (log.completed_at && log.started_at) {
                    const started = new Date(log.started_at);
                    const completed = new Date(log.completed_at);
                    duration = Math.round((completed.getTime() - started.getTime()) / 60000);
                  }
                  const isExpanded = expandedId === log.id;
                  const sets = (log.workout_set_logs || []) as { exercise_id?: string; weight?: number; reps?: number }[];

                  return (
                    <div
                      key={log.id}
                      className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] overflow-hidden transition-all hover:shadow-lg"
                    >
                      <div
                        className="flex items-stretch gap-4 p-4 sm:p-5 cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      >
                        {/* Date tile */}
                        {completedDate && (
                          <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)] flex flex-col items-center justify-center">
                            <span className="text-[10px] font-bold font-mono uppercase tracking-wider fc-text-subtle">
                              {completedDate.toLocaleDateString("en-US", { month: "short" })}
                            </span>
                            <span className="text-lg font-bold font-mono fc-text-primary leading-tight">
                              {completedDate.getDate()}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <h3 className="text-lg font-bold fc-text-primary truncate">
                            {workoutName}
                          </h3>
                          <div className="flex flex-wrap gap-3 mt-1 text-sm fc-text-dim">
                            {duration != null && <span>{duration} min</span>}
                            <span>{log.totalSets} sets</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/client/progress/workout-logs/${log.id}`);
                            }}
                            className="text-sm font-medium fc-text-subtle hover:fc-text-primary px-3 py-2 rounded-lg"
                          >
                            View
                          </button>
                          <ChevronDown
                            className={`w-5 h-5 fc-text-subtle transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          />
                        </div>
                      </div>

                      {/* Expanded: exercise rows */}
                      {isExpanded && sets.length > 0 && (
                        <div
                          className="border-t border-[color:var(--fc-glass-border)] bg-[color:var(--fc-bg-base)]/50 px-4 py-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <p className="text-xs font-semibold uppercase tracking-wider fc-text-subtle mb-2">
                            Exercises
                          </p>
                          <ul className="space-y-2">
                            {sets.slice(0, 10).map((set, i) => (
                              <li
                                key={i}
                                className="text-sm fc-text-dim flex justify-between"
                              >
                                <span>Set {i + 1}</span>
                                {set.weight != null && set.reps != null && (
                                  <span className="font-mono">
                                    {set.weight} kg × {set.reps} reps
                                  </span>
                                )}
                              </li>
                            ))}
                            {sets.length > 10 && (
                              <li className="text-sm fc-text-subtle">
                                +{sets.length - 10} more…
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* FAB: Download (export placeholder) */}
            {filteredLogs.length > 0 && (
              <button
                type="button"
                className="fixed bottom-24 right-6 w-14 h-14 rounded-full fc-glass border border-[color:var(--fc-glass-border)] flex items-center justify-center fc-text-primary hover:fc-glass-strong shadow-lg z-20"
                aria-label="Download / export logs"
              >
                <Download className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
