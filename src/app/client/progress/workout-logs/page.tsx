"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { ClientPageShell } from "@/components/client-ui";
import { ArrowLeft, FileText, Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { WorkoutLogCard } from "@/components/client/WorkoutLogCard";

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
  overall_difficulty_rating: number | null;
  workout_set_logs: WorkoutSet[];
  // Calculated fields
  totalSets: number;
  totalWeight: number;
  uniqueExercises: number;
  workoutName: string;
  programContext?: { dayNumber: number; programName: string } | null;
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

function logCompletedDate(log: WorkoutLog): Date {
  return log.completed_at ? new Date(log.completed_at) : new Date(log.started_at);
}

function durationMinutesForLog(log: WorkoutLog): number {
  if (log.total_duration_minutes != null) {
    return Math.round(log.total_duration_minutes);
  }
  if (log.completed_at && log.started_at) {
    return Math.round(
      (new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()) / 60000,
    );
  }
  return 0;
}

function formatDurationLabel(totalMinutes: number): string {
  if (totalMinutes <= 0) return "0m";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export default function WorkoutLogsPage() {
  const { user, loading: authLoading } = useAuth();
  const { performanceSettings } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [timeFilter, setTimeFilter] = useState<"all" | "this_month" | "this_week">("all");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset state when user changes
  useEffect(() => {
    setLoading(true);
    setWorkoutLogs([]);
    setError(null);
  }, [user]);

  const loadWorkoutLogs = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      // Ensure user is authenticated before querying
      const { ensureAuthenticated } = await import('@/lib/supabase');
      await ensureAuthenticated();

      // Only show completed workouts (abandoned sessions with 0 sets are noise)
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
          workout_assignment_id,
          overall_difficulty_rating
        `
        )
        .eq("client_id", user.id)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("❌ Error loading workout logs:", error);
        setError(error.message);
        setWorkoutLogs([]);
        return;
      }

      if (!workoutLogs || workoutLogs.length === 0) {
        setWorkoutLogs([]);
        return;
      }

      // Get unique assignment IDs to fetch template names
      const assignmentIds = [
        ...new Set(
          workoutLogs
            .map((log) => log.workout_assignment_id)
            .filter(Boolean) as string[]
        ),
      ];

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
          assignments.forEach((assignment: any) => {
            const templateName =
              assignment.workout_templates?.name || "Workout";
            assignmentTemplateMap.set(assignment.id, templateName);
          });
        }
      }

      // Fetch program context (day number + program name) for logs that are part of a program
      const programContextMap = new Map<string, { dayNumber: number; programName: string }>();
      if (assignmentIds.length > 0) {
        const { data: dayAssignments } = await supabase
          .from("program_day_assignments")
          .select("workout_assignment_id, day_number, program_assignment_id")
          .in("workout_assignment_id", assignmentIds);

        if (dayAssignments && dayAssignments.length > 0) {
          const progAssignmentIds = [...new Set(dayAssignments.map((d: any) => d.program_assignment_id).filter(Boolean))];
          const { data: progAssignments } = await supabase
            .from("program_assignments")
            .select("id, name")
            .in("id", progAssignmentIds);

          const progNameMap = new Map<string, string>();
          (progAssignments || []).forEach((pa: any) => {
            progNameMap.set(pa.id, pa.name || "Program");
          });

          dayAssignments.forEach((da: any) => {
            if (da.workout_assignment_id) {
              programContextMap.set(da.workout_assignment_id, {
                dayNumber: da.day_number,
                programName: progNameMap.get(da.program_assignment_id) || "Program",
              });
            }
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
            programContext: log.workout_assignment_id
              ? programContextMap.get(log.workout_assignment_id) ?? null
              : null,
          } as WorkoutLog;
        });

      setWorkoutLogs(processedLogs);
    } catch (err) {
      console.error("❌ Error loading workout logs:", err);
      setError(err instanceof Error ? err.message : "Failed to load workout logs");
      setWorkoutLogs([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && !authLoading) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        setLoading(false);
        setError("Loading took too long. Tap Retry to try again.");
      }, 20_000);
      loadWorkoutLogs().finally(() => {
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
    }
    if (!authLoading && !user) {
      setLoading(false);
    }
  }, [loadWorkoutLogs, user, authLoading]);

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

  const thisMonthDurationMinutes = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return workoutLogs
      .filter((log) => logCompletedDate(log) >= startOfMonth)
      .reduce((sum, log) => sum + durationMinutesForLog(log), 0);
  }, [workoutLogs]);

  const thisMonthSummaryLine = useMemo(() => {
    const vol =
      thisMonthWeight >= 1000
        ? `${(thisMonthWeight / 1000).toFixed(1)}k kg`
        : `${Math.round(thisMonthWeight)} kg`;
    return `${thisMonthCount} workout${thisMonthCount === 1 ? "" : "s"} · ${formatDurationLabel(thisMonthDurationMinutes)} · ${vol}`;
  }, [thisMonthCount, thisMonthDurationMinutes, thisMonthWeight]);

  if (error && !loading) {
    return (
      <ProtectedRoute>
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <ClientPageShell className="max-w-lg mx-auto px-4 pb-32 pt-6">
            <div className="flex flex-col items-center justify-center min-h-[40vh] px-2 text-center">
              <p className="text-sm fc-text-dim mb-3">{error}</p>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  loadWorkoutLogs();
                }}
                className="px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm font-medium hover:bg-cyan-400 transition-colors"
              >
                Retry
              </button>
            </div>
          </ClientPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  if (authLoading || loading) {
    return (
      <ProtectedRoute>
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <ClientPageShell className="max-w-lg mx-auto px-4 pb-32 pt-6">
            <div className="animate-pulse space-y-3">
              <div className="h-8 w-48 rounded-lg bg-[color:var(--fc-glass-highlight)]" />
              <div className="h-4 w-full rounded bg-[color:var(--fc-glass-highlight)]" />
              <div className="h-10 w-full rounded-full bg-[color:var(--fc-glass-highlight)]" />
              <div className="h-14 w-full rounded-lg bg-[color:var(--fc-glass-highlight)]" />
              <div className="h-14 w-full rounded-lg bg-[color:var(--fc-glass-highlight)]" />
            </div>
          </ClientPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <ClientPageShell className="max-w-lg mx-auto px-4 pb-32 pt-6 overflow-x-hidden">
          <header className="flex items-center gap-2 mb-4">
            <button
              type="button"
              onClick={() => {
                window.location.href = "/client/progress";
              }}
              className="shrink-0 p-2 -ml-2 rounded-xl fc-text-subtle hover:fc-text-primary hover:bg-white/[0.06] transition-colors"
              aria-label="Back to progress"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold tracking-tight fc-text-primary truncate">
              Workout History
            </h1>
          </header>

          {workoutLogs.length > 0 && (
            <section className="mb-4 border-b border-white/5 pb-4">
              <p className="text-sm uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                This month
              </p>
              <p className="text-sm font-medium fc-text-primary leading-snug">
                {thisMonthSummaryLine}
              </p>
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/client/progress/personal-records";
                }}
                className="mt-2 text-left text-xs font-medium fc-text-primary hover:opacity-80 bg-transparent border-0 p-0 cursor-pointer"
              >
                View PRs →
              </button>
            </section>
          )}

          {workoutLogs.length > 0 && (
            <nav
              className="sticky top-0 z-10 -mx-1 mb-3 flex flex-wrap items-center gap-1.5 bg-[color:var(--fc-bg-base)]/90 py-2 backdrop-blur-sm px-1"
              aria-label="Time range"
            >
              {(["all", "this_month", "this_week"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTimeFilter(key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide whitespace-nowrap transition-colors border ${
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

          {filteredLogs.length === 0 ? (
            <div className="py-8 px-2 text-center border-y border-white/5">
              <FileText className="mx-auto mb-2 h-8 w-8 fc-text-dim opacity-70" aria-hidden />
              <p className="text-sm font-semibold fc-text-primary mb-1">
                {workoutLogs.length === 0 ? "No workouts yet" : "No workouts in this range"}
              </p>
              <p className="text-sm fc-text-dim">
                {workoutLogs.length === 0
                  ? "Complete a workout and your history will show up here."
                  : "Try another time filter."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col border-y border-white/5">
              {filteredLogs.map((log) => (
                <WorkoutLogCard key={log.id} log={log} />
              ))}
            </div>
          )}

          {filteredLogs.length > 0 && (
            <button
              type="button"
              className="fixed bottom-24 right-4 w-12 h-12 rounded-full fc-glass border border-[color:var(--fc-glass-border)] flex items-center justify-center fc-text-primary hover:fc-glass-strong shadow-lg z-20 sm:right-6"
              aria-label="Download / export logs"
            >
              <Download className="w-5 h-5" />
            </button>
          )}
        </ClientPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
