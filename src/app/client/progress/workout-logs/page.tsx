"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { ClientPageShell } from "@/components/client-ui";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { FileText, Download, ChevronRight } from "lucide-react";
import { PsHero, PsSegmented } from "@/components/client/progress-suite";
import ps from "@/components/client/progress-suite/progressSuiteV1.module.css";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
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
  const router = useRouter();
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

  const groupedByMonth = useMemo(() => {
    const map = new Map<string, WorkoutLog[]>();
    for (const log of filteredLogs) {
      const d = log.completed_at ? new Date(log.completed_at) : new Date(log.started_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(log);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, logs]) => ({
        key,
        logs,
        label: new Date(`${key}-01T12:00:00`).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        }),
      }));
  }, [filteredLogs]);

  if (error && !loading) {
    return (
      <ProtectedRoute requiredRole="client">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <ClientPageShell className="max-w-lg mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6">
            <div className="flex flex-col items-center justify-center min-h-[40vh] px-2 text-center">
              <p className="text-sm fc-text-dim mb-3">{error}</p>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  loadWorkoutLogs();
                }}
                className="fc-btn fc-btn-primary fc-press h-10 px-5 text-sm"
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
      <ProtectedRoute requiredRole="client">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <ClientPageShell className="max-w-lg mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6">
            <PageSkeleton variant="list" />
          </ClientPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <ClientPageShell className="max-w-lg mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 overflow-x-hidden">
          <div className={ps.psV1}>
            <PsHero
              glow="cyan"
              onBack={() => router.push("/client/progress")}
              backAriaLabel="Back to progress hub"
              eyebrow="Progress · history"
              eyebrowColor="#4FE3E8"
              title="Workout history"
              subtitle="Every session you've logged"
            />

            {workoutLogs.length > 0 && (
              <section className="mb-3 mt-4">
                <div className={ps.psMonthSummary}>
                  <p
                    className={cn(ps.psFontMono, "text-[9.5px] uppercase")}
                    style={{ color: "var(--ps-t3)", letterSpacing: "0.16em" }}
                  >
                    This month
                  </p>
                  <p className={cn(ps.psFontBody, "text-sm leading-snug")} style={{ color: "var(--ps-t2)" }}>
                    <span className={cn(ps.psFontDisplay, "text-xl font-bold tabular-nums")} style={{ color: "var(--ps-t1)" }}>
                      {thisMonthCount} workout{thisMonthCount === 1 ? "" : "s"}
                    </span>
                    <span style={{ color: "var(--ps-t4)" }}> · </span>
                    <span>{formatDurationLabel(thisMonthDurationMinutes)}</span>
                    <span style={{ color: "var(--ps-t4)" }}> · </span>
                    <span className={cn(ps.psFontDisplay, "font-bold tabular-nums")} style={{ color: "var(--ps-t1)" }}>
                      {thisMonthWeight >= 1000
                        ? `${(thisMonthWeight / 1000).toFixed(1)}k`
                        : Math.round(thisMonthWeight)}
                    </span>
                    <span className={cn(ps.psFontBody, "text-[11.5px] font-normal")} style={{ color: "var(--ps-t2)" }}>
                      {" "}
                      kg vol
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push("/client/progress/personal-records")}
                    className={cn(ps.psFontBody, "mt-1 inline-flex items-center gap-1 border-0 bg-transparent p-0 text-[11px] font-medium")}
                    style={{ color: "var(--ps-cyan)" }}
                  >
                    View PRs
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </section>
            )}

            {workoutLogs.length > 0 && (
              <div className="sticky top-0 z-10 -mx-0 mb-3 bg-[color:var(--fc-bg-base)]/95 py-2 backdrop-blur-sm">
                <PsSegmented
                  ariaLabel="Time range"
                  options={[
                    { value: "all" as const, label: "All time" },
                    { value: "this_month" as const, label: "This month" },
                    { value: "this_week" as const, label: "This week" },
                  ]}
                  value={timeFilter}
                  onChange={setTimeFilter}
                />
              </div>
            )}

            {filteredLogs.length === 0 ? (
              <div className={cn(ps.psChartCard, "py-8 text-center")}>
                <FileText className="mx-auto mb-2 h-8 w-8 opacity-60" style={{ color: "var(--ps-t3)" }} aria-hidden />
                <p className={cn(ps.psFontBody, "mb-1 text-sm font-semibold")} style={{ color: "var(--ps-t1)" }}>
                  {workoutLogs.length === 0 ? "No workouts yet" : "No workouts in this range"}
                </p>
                <p className={cn(ps.psFontBody, "text-sm")} style={{ color: "var(--ps-t3)" }}>
                  {workoutLogs.length === 0
                    ? "Complete a workout and your history will show up here."
                    : "Try another time filter."}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {groupedByMonth.map((group) => (
                  <div key={group.key}>
                    <div className="mb-2 flex items-center gap-2 px-1 pt-1.5">
                      <span
                        className={cn(ps.psFontMono, "shrink-0 text-[10px] uppercase")}
                        style={{ color: "var(--ps-t3)", letterSpacing: "0.16em" }}
                      >
                        {group.label}
                      </span>
                      <div className="h-px min-w-0 flex-1" style={{ background: "var(--ps-line-2)" }} aria-hidden />
                      <span className={cn(ps.psFontMono, "shrink-0 text-[9.5px]")} style={{ color: "var(--ps-t4)", letterSpacing: "0.06em" }}>
                        {group.logs.length} session{group.logs.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {group.logs.map((log) => (
                        <WorkoutLogCard key={log.id} log={log} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

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
