"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { ClientPageShell, Eyebrow } from "@/components/client-ui";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  LayoutDashboard,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AchievementUnlockModal } from "@/components/ui/AchievementUnlockModal";
import type { Achievement } from "@/components/ui/AchievementCard";
import NotificationTriggers from "@/lib/notificationTriggers";
import { fetchApi } from "@/lib/apiClient";
import { withTimeout } from "@/lib/withTimeout";
import { useToast } from "@/components/ui/toast-provider";
import {
  formatPaceMinSecPerKm,
  formatDurationFromSeconds,
} from "@/lib/enduranceFormUtils";
import {
  formatPersonalRecordCaption,
  formatPersonalRecordImprovementSuffix,
} from "@/lib/personalRecordDisplay";
import {
  CelebrationHero,
  CoachNoteBlock,
  CompleteStatsRow,
  getCompleteAccent,
  PrBanner,
  StickyActionBar,
  titleForAccent,
  WorkoutSummarySection,
  type TileStat,
} from "@/components/client-workout-complete";
import completeStyles from "@/components/client-workout-complete/clientWorkoutCompleteV6.module.css";
import type { PrescribedRpeMap } from "@/components/client-workout-complete/types";
import { prescribedKey } from "@/components/client-workout-complete/setLinesFromLogs";

const WORKOUT_LOG_COMPLETION_SELECT =
  "id, started_at, completed_at, total_duration_minutes, total_sets_completed, total_reps_completed, total_weight_lifted, workout_assignment_id, workout_session_id, notes, workout_sessions ( notes )";

/** Read completion handoff synchronously (effect order: assignment load runs before the effect that clears localStorage). */
function readCompletionHandoff(searchParams: { get: (key: string) => string | null }) {
  const logIdFromUrl = searchParams.get("logId");
  const sessionIdFromUrl = searchParams.get("sessionId");
  const durationFromUrl = searchParams.get("duration");
  let log = logIdFromUrl;
  let session = sessionIdFromUrl;
  let durationStr = durationFromUrl;
  if (typeof window !== "undefined") {
    log = log || localStorage.getItem("workoutLogIdForComplete");
    session = session || localStorage.getItem("workoutSessionIdForComplete");
    durationStr = durationStr || localStorage.getItem("workoutDurationMinutes");
  }
  const parsed = durationStr ? parseInt(durationStr, 10) : NaN;
  return {
    logId: log || null,
    sessionId: session || null,
    durationMinutes: Number.isFinite(parsed) ? parsed : undefined,
  };
}

async function fetchPersonalRecordsForAssignment(
  assignmentId: string,
  clientId: string
): Promise<any[]> {
  const { data: prs } = await supabase
    .from("personal_records")
    .select(`*, exercises(id, name)`)
    .eq("client_id", clientId)
    .eq("workout_assignment_id", assignmentId)
    .order("achieved_date", { ascending: false });
  return prs ?? [];
}

async function fetchPreviousSameTemplateTotals(
  clientId: string,
  templateId: string,
  currentLogId: string
): Promise<{
  total_weight_lifted: number;
  total_sets_completed: number;
  total_reps_completed: number;
} | null> {
  const { data: prev, error } = await supabase
    .from("workout_logs")
    .select(
      "total_weight_lifted, total_sets_completed, total_reps_completed, workout_assignments!inner(workout_template_id)"
    )
    .eq("client_id", clientId)
    .neq("id", currentLogId)
    .not("completed_at", "is", null)
    .eq("workout_assignments.workout_template_id", templateId)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !prev) return null;
  return {
    total_weight_lifted: Number(prev.total_weight_lifted) || 0,
    total_sets_completed: Number(prev.total_sets_completed) || 0,
    total_reps_completed: Number(prev.total_reps_completed) || 0,
  };
}

async function fetchCompletedLogCount(clientId: string): Promise<number> {
  const { count, error } = await supabase
    .from("workout_logs")
    .select("*", { count: "exact", head: true })
    .eq("client_id", clientId)
    .not("completed_at", "is", null);
  if (error) return 0;
  return count ?? 0;
}

function coachNoteFromWorkoutLog(log: Record<string, unknown> | null): string | null {
  if (!log) return null;
  const row = log as Record<string, any>;
  const ws = row.workout_sessions;
  const sessionNote = (Array.isArray(ws) ? ws[0]?.notes : ws?.notes) ?? null;
  const logNote = row.notes ?? null;
  const pick = [sessionNote, logNote]
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .find((v) => v.length > 0);
  return pick ?? null;
}

interface WorkoutAssignment {
  id: string;
  workout_template_id: string | null;
  client_id: string;
  status: string;
  notes?: string | null;
  name?: string | null;
  description?: string | null;
  scheduled_date?: string | null;
}

interface WorkoutSetLog {
  id: string;
  workout_log_id: string;
  set_entry_id: string;
  set_type: string;
  exercise_id: string;
  weight: number | null;
  reps: number | null;
  set_number: number | null;
  completed_at: string;
  rpe?: number | null;

  // Special type columns
  dropset_initial_weight?: number | null;
  dropset_initial_reps?: number | null;
  dropset_final_weight?: number | null;
  dropset_final_reps?: number | null;
  dropset_percentage?: number | null;

  superset_exercise_a_id?: string | null;
  superset_weight_a?: number | null;
  superset_reps_a?: number | null;
  superset_exercise_b_id?: string | null;
  superset_weight_b?: number | null;
  superset_reps_b?: number | null;

  giant_set_exercises?: any; // JSON array

  amrap_total_reps?: number | null;
  amrap_duration_seconds?: number | null;
  amrap_target_reps?: number | null;

  fortime_total_reps?: number | null;
  fortime_time_taken_sec?: number | null;
  fortime_time_cap_sec?: number | null;
  fortime_target_reps?: number | null;

  emom_minute_number?: number | null;
  emom_total_reps_this_min?: number | null;
  emom_total_duration_sec?: number | null;

  rest_pause_initial_weight?: number | null;
  rest_pause_initial_reps?: number | null;
  rest_pause_reps_after?: number | null;
  rest_pause_number?: number | null;
  cluster_number?: number | null;
  tabata_rounds_completed?: number | null;
  tabata_total_duration_sec?: number | null;

  preexhaust_isolation_exercise_id?: string | null;
  preexhaust_isolation_weight?: number | null;
  preexhaust_isolation_reps?: number | null;
  preexhaust_compound_exercise_id?: string | null;
  preexhaust_compound_weight?: number | null;
  preexhaust_compound_reps?: number | null;

  actual_time_seconds?: number | null;
  actual_duration_seconds?: number | null;
  actual_distance_meters?: number | null;
  actual_hr_avg?: number | null;
  actual_speed_kmh?: number | null;

  exercises?: {
    id: string;
    name: string;
  };
}

interface WorkoutBlock {
  id: string;
  set_type: string;
  set_name?: string | null;
  set_order: number;
}

interface BlockGroup {
  set_entry_id: string;
  set_type: string;
  set_name: string;
  set_order: number;
  sets: WorkoutSetLog[];
  exerciseNames: Map<string, string>;
  templateBlock?: any; // Store full template block data for blocks with no sets
}

function WorkoutCompleteContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const assignmentId = params.id as string;
  const { addToast } = useToast();

  const [assignment, setAssignment] = useState<WorkoutAssignment | null>(null);
  const [resolvedAssignmentId, setResolvedAssignmentId] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [workoutLog, setWorkoutLog] = useState<any>(null);
  const [blockGroups, setBlockGroups] = useState<BlockGroup[]>([]);
  const [workoutStats, setWorkoutStats] = useState({
    duration: 0,
    totalSets: 0,
    totalReps: 0,
    totalWeight: 0,
    rating: null as number | null,
    notes: null as string | null,
  });
  const [workoutLogIdForSummary, setWorkoutLogIdForSummary] = useState<
    string | null
  >(null);
  const [workoutLogIdOverride, setWorkoutLogIdOverride] = useState<string | null>(
    null
  );
  const [workoutSessionIdOverride, setWorkoutSessionIdOverride] = useState<
    string | null
  >(null);
  const [personalRecords, setPersonalRecords] = useState<any[]>([]);
  const [prescribedRpeMap, setPrescribedRpeMap] = useState<PrescribedRpeMap>(
    new Map(),
  );
  const [previousLogTotals, setPreviousLogTotals] = useState<{
    total_weight_lifted: number;
    total_sets_completed: number;
    total_reps_completed: number;
  } | null>(null);
  const [isFirstEverWorkout, setIsFirstEverWorkout] = useState(false);
  const [coachFirstName, setCoachFirstName] = useState<string | null>(null);
  const [programProgression, setProgramProgression] = useState<{
    current_week_number?: number;
    current_day_number?: number;
    is_completed?: boolean;
    status?: string;
  } | null>(null);
  const [nextWorkout, setNextWorkout] = useState<any | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [storedDurationMinutes, setStoredDurationMinutes] = useState<number | undefined>(undefined);
  const [newAchievementsQueue, setNewAchievementsQueue] = useState<Achievement[]>([]);
  const [achievementModalIndex, setAchievementModalIndex] = useState(0);

  // Guard: prevent updateWorkoutTotals from running more than once per page load
  const completionDoneRef = useRef(false);

  const completeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // DIAGNOSTIC: Tab return loading audit
  const completionQueryKey = searchParams.toString();
  useEffect(() => {
    if (!assignmentId) return;
    const handoff = readCompletionHandoff(searchParams);
    if (completeTimeoutRef.current) clearTimeout(completeTimeoutRef.current);
    completeTimeoutRef.current = setTimeout(() => {
      completeTimeoutRef.current = null;
      setLoading(false);
    }, 20_000);
    loadAssignment()
      .then(async (assignmentData: WorkoutAssignment | null) => {
        if (assignmentData) {
          await updateWorkoutTotals(
            assignmentData.workout_template_id,
            assignmentData.id,
            handoff.logId,
            handoff.sessionId,
            handoff.durationMinutes
          );
        }
      })
      .catch((error) => {
        console.error("Error loading assignment:", error);
      })
      .finally(() => {
        if (completeTimeoutRef.current) {
          clearTimeout(completeTimeoutRef.current);
          completeTimeoutRef.current = null;
        }
        setLoading(false);
      });
    return () => {
      if (completeTimeoutRef.current) {
        clearTimeout(completeTimeoutRef.current);
        completeTimeoutRef.current = null;
      }
    };
  }, [assignmentId, completionQueryKey]);

  useEffect(() => {
    // Primary: URL params (survives reload, works when navigation used window.location.href).
    // Fallback: localStorage for backward compatibility.
    const logIdFromUrl = searchParams.get("logId");
    const sessionIdFromUrl = searchParams.get("sessionId");
    const durationFromUrl = searchParams.get("duration");
    const effectiveLogId =
      logIdFromUrl ||
      (typeof window !== "undefined" ? localStorage.getItem("workoutLogIdForComplete") : null);
    const effectiveSessionId =
      sessionIdFromUrl ||
      (typeof window !== "undefined" ? localStorage.getItem("workoutSessionIdForComplete") : null);
    const effectiveDuration =
      durationFromUrl ||
      (typeof window !== "undefined" ? localStorage.getItem("workoutDurationMinutes") : null);

    if (effectiveLogId) setWorkoutLogIdOverride(effectiveLogId);
    if (effectiveSessionId) setWorkoutSessionIdOverride(effectiveSessionId);
    if (effectiveDuration) {
      setStoredDurationMinutes(parseInt(effectiveDuration, 10) || undefined);
    }

    try {
      localStorage.removeItem("workoutLogIdForComplete");
      localStorage.removeItem("workoutSessionIdForComplete");
      localStorage.removeItem("workoutDurationMinutes");
      localStorage.removeItem("workoutStartTime");
    } catch (e) {
      console.warn("⚠️ Could not clear localStorage completion keys:", e);
    }
  }, [searchParams]);

  const updateWorkoutTotals = async (
    templateId: string | null = null,
    assignmentIdOverride: string | null = null,
    workoutLogIdOverrideParam: string | null | undefined = undefined,
    sessionIdOverrideParam: string | null | undefined = undefined,
    durationMinutesOverrideParam: number | undefined = undefined
  ) => {
    // Guard: only run once per page load to prevent state overwrites
    if (completionDoneRef.current) {
      return;
    }

    const effectiveAssignmentId =
      assignmentIdOverride || resolvedAssignmentId || assignment?.id || null;
    const effectiveWorkoutLogId =
      workoutLogIdOverrideParam !== undefined
        ? workoutLogIdOverrideParam || null
        : workoutLogIdOverride || null;
    const effectiveSessionId =
      sessionIdOverrideParam !== undefined
        ? sessionIdOverrideParam || null
        : workoutSessionIdOverride;
    const effectiveDurationMinutes =
      durationMinutesOverrideParam !== undefined
        ? durationMinutesOverrideParam
        : storedDurationMinutes;
    if (!effectiveAssignmentId && !effectiveWorkoutLogId) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.error("❌ User not authenticated");
        return;
      }

      // Find workout_log_id - prefer explicit workout_log_id override
      let workoutLog = null;
      if (effectiveWorkoutLogId) {
        const { data: logById } = await supabase
          .from("workout_logs")
          .select(WORKOUT_LOG_COMPLETION_SELECT)
          .eq("id", effectiveWorkoutLogId)
          .eq("client_id", user.id)
          .maybeSingle();
        workoutLog = logById;
      }

      if (!workoutLog && effectiveSessionId) {
        const { data: logBySession } = await supabase
          .from("workout_logs")
          .select(WORKOUT_LOG_COMPLETION_SELECT)
          .eq("workout_session_id", effectiveSessionId)
          .eq("client_id", user.id)
          .maybeSingle();
        workoutLog = logBySession;
      }

      if (!workoutLog && effectiveAssignmentId) {
        const { data: completedLog } = await supabase
          .from("workout_logs")
          .select(WORKOUT_LOG_COMPLETION_SELECT)
          .eq("workout_assignment_id", effectiveAssignmentId)
          .eq("client_id", user.id)
          .not("completed_at", "is", null)
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (completedLog) {
          workoutLog = completedLog;
        } else {
          const { data: activeLog } = await supabase
            .from("workout_logs")
            .select(WORKOUT_LOG_COMPLETION_SELECT)
            .eq("workout_assignment_id", effectiveAssignmentId)
            .eq("client_id", user.id)
            .is("completed_at", null)
            .order("started_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          workoutLog = activeLog;
        }
      }

      // Last resort: if handoff failed (e.g. URL params lost on reload), use most recent incomplete log for this client
      if (!workoutLog) {
        const { data: recentLog } = await supabase
          .from("workout_logs")
          .select(WORKOUT_LOG_COMPLETION_SELECT)
          .eq("client_id", user.id)
          .is("completed_at", null)
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (recentLog) workoutLog = recentLog;
      }

      let workoutLogId = workoutLog?.id;

      if (workoutLogId) {
        setWorkoutLogIdForSummary(workoutLogId);
      }

      // If no workout_log found at all, show error instead of creating a new one.
      // workout_logs are created by the set-logging flow (/api/log-set) during the
      // workout. Creating one here would cause duplicates on refresh/retry.
      if (!workoutLogId) {
        console.error("❌ No workout_log found for assignment:", effectiveAssignmentId);
        setLoadError("Could not find workout data. Your sets may already be saved — try Retry or go back to Training.");
        setLoading(false);
        return;
      }

      if (workoutLogId) {
        // If workout is already completed, use existing data
        if (workoutLog?.completed_at) {
          setWorkoutStats({
            duration: workoutLog.total_duration_minutes || 0,
            totalSets: workoutLog.total_sets_completed || 0,
            totalReps: workoutLog.total_reps_completed || 0,
            totalWeight: workoutLog.total_weight_lifted || 0,
            rating: (workoutLog as any).rating ?? null,
            notes: (workoutLog as any).notes ?? null,
          });
          setWorkoutLog(workoutLog);
          const tid = templateId;
          const tasks: Promise<unknown>[] = [];
          if (tid && workoutLogId) {
            tasks.push(
              fetchPreviousSameTemplateTotals(user.id, tid, workoutLogId).then(
                setPreviousLogTotals
              )
            );
            tasks.push(
              fetchCompletedLogCount(user.id).then((c) =>
                setIsFirstEverWorkout(c === 1)
              )
            );
          } else {
            setPreviousLogTotals(null);
            setIsFirstEverWorkout(false);
          }
          if (effectiveAssignmentId) {
            tasks.push(
              fetchPersonalRecordsForAssignment(
                effectiveAssignmentId,
                user.id
              ).then(setPersonalRecords)
            );
          }
          tasks.push(loadBlocksAndSets(workoutLogId, user.id));
          await Promise.all(tasks);
          completionDoneRef.current = true;
        } else {
          // Complete the workout — duration already captured in state from localStorage
          console.log("[COMPLETE-FLOW] calling /api/complete-workout", {
            workout_log_id: workoutLogId,
            duration_minutes: effectiveDurationMinutes,
            session_id: effectiveSessionId,
          });
          const completeResponse = await withTimeout(
            fetchApi("/api/complete-workout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                workout_log_id: workoutLogId,
                client_id: user.id,
                duration_minutes: effectiveDurationMinutes,
                session_id: effectiveSessionId,
              }),
            }),
            30000,
            "timeout"
          );

          if (completeResponse.ok) {
            const result = await completeResponse.json();
            const updatedLog = result.workout_log || workoutLog;

            if (result.program_progression) {
              setProgramProgression(result.program_progression);
            }

            const rawNew = result.new_achievements ?? [];
            if (rawNew.length > 0) {
              const mapped: Achievement[] = rawNew.map((a: any) => ({
                id: a.templateId ?? a.template_id,
                name: a.templateName ?? a.template_name ?? "Achievement",
                description: a.description ?? (a.nextTier ? `Next: ${a.nextTier?.label} — ${a.currentMetricValue ?? 0}/${a.nextTier?.threshold ?? 0}` : ""),
                icon: a.templateIcon ?? a.template_icon ?? "🏆",
                tier: (a.tier ?? null) as Achievement["tier"],
                unlocked: true,
              }));
              setNewAchievementsQueue(mapped);
              setAchievementModalIndex(0);
            }

            const rankChanges = result.leaderboard_rank_changes ?? [];
            if (rankChanges.length > 0) {
              const typeLabel = (t: string) => {
                if (t === "pr_1rm") return "1RM";
                if (t === "pr_3rm") return "3RM";
                if (t === "pr_5rm") return "5RM";
                if (t === "bw_multiple") return "BW Multiple";
                if (t === "tonnage_week") return "Weekly Tonnage";
                if (t === "tonnage_month") return "Monthly Tonnage";
                if (t === "tonnage_all_time") return "All-Time Tonnage";
                return t;
              };
              for (const c of rankChanges) {
                const label = [c.exercise_name, typeLabel(c.type)].filter(Boolean).join(" ");
                addToast({
                  title: "Leaderboard",
                  description: `You moved up to #${c.new_rank} in ${label}!`,
                  variant: "success",
                  duration: 4000,
                });
              }
            }

            if (updatedLog) {
              const apiTotals = result.totals || {
                sets: updatedLog.total_sets_completed || 0,
                reps: updatedLog.total_reps_completed || 0,
                weight: updatedLog.total_weight_lifted || 0,
                duration_minutes: updatedLog.total_duration_minutes || 0,
              };

              setWorkoutStats({
                duration:
                  apiTotals.duration_minutes ||
                  updatedLog.total_duration_minutes ||
                  0,
                totalSets: apiTotals.sets,
                totalReps: apiTotals.reps,
                totalWeight: apiTotals.weight,
                rating: (updatedLog as any)?.rating ?? null,
                notes: (updatedLog as any)?.notes ?? null,
              });

              setWorkoutLog(updatedLog);

              const tid = templateId;
              const tasks: Promise<unknown>[] = [];
              if (tid && workoutLogId) {
                tasks.push(
                  fetchPreviousSameTemplateTotals(user.id, tid, workoutLogId).then(
                    setPreviousLogTotals
                  )
                );
                tasks.push(
                  fetchCompletedLogCount(user.id).then((c) =>
                    setIsFirstEverWorkout(c === 1)
                  )
                );
              } else {
                setPreviousLogTotals(null);
                setIsFirstEverWorkout(false);
              }
              if (effectiveAssignmentId) {
                tasks.push(
                  fetchPersonalRecordsForAssignment(
                    effectiveAssignmentId,
                    user.id
                  ).then(setPersonalRecords)
                );
              }
              tasks.push(loadBlocksAndSets(workoutLogId, user.id));
              tasks.push(
                (async () => {
                  try {
                    const today = new Date().toISOString().split("T")[0];
                    const { data: nextAssignment } = await supabase
                      .from("workout_assignments")
                      .select(
                        `
                    id,
                    name,
                    scheduled_date,
                    workout_template_id,
                    template:workout_templates(name, description)
                  `
                      )
                      .eq("client_id", user.id)
                      .in("status", ["assigned", "active"])
                      .gte("scheduled_date", today)
                      .order("scheduled_date", { ascending: true })
                      .limit(1)
                      .maybeSingle();

                    if (nextAssignment) {
                      setNextWorkout(nextAssignment);
                    }
                  } catch {
                    /* optional */
                  }
                })()
              );
              await Promise.all(tasks);

              completionDoneRef.current = true;
            }
          } else {
            // API returned non-ok status
            console.error("❌ complete-workout API error:", completeResponse.status);
            setLoadError("Failed to complete workout. Please try again.");
            setLoading(false);
            return;
          }
        }
      }
    } catch (error: any) {
      console.error("❌ Error in updateWorkoutTotals:", error);
      const isTimeout =
        error?.message === "timeout" || error?.message?.includes("Timeout") || error?.message?.includes("took longer than");
      setLoadError(
        isTimeout
          ? "Completing workout took too long. Your sets are saved — try Retry or go back to Training."
          : (error?.message || "Failed to complete workout")
      );
      setLoading(false);
    }
  };

  const loadBlocksAndSets = async (workoutLogId: string, userId: string) => {
    try {
      // Get all set logs with special columns
      const { data: sets, error: setsError } = await supabase
        .from("workout_set_logs")
        .select(
          `
          id,
          workout_log_id,
          set_entry_id,
          set_type,
          exercise_id,
          weight,
          reps,
          set_number,
          completed_at,
          rpe,
          dropset_initial_weight,
          dropset_initial_reps,
          dropset_final_weight,
          dropset_final_reps,
          dropset_percentage,
          superset_exercise_a_id,
          superset_weight_a,
          superset_reps_a,
          superset_exercise_b_id,
          superset_weight_b,
          superset_reps_b,
          giant_set_exercises,
          amrap_total_reps,
          amrap_duration_seconds,
          amrap_target_reps,
          fortime_total_reps,
          fortime_time_taken_sec,
          fortime_time_cap_sec,
          fortime_target_reps,
          emom_minute_number,
          emom_total_reps_this_min,
          emom_total_duration_sec,
          rest_pause_initial_weight,
          rest_pause_initial_reps,
          rest_pause_reps_after,
          rest_pause_number,
          cluster_number,
          tabata_rounds_completed,
          tabata_total_duration_sec,
          preexhaust_isolation_exercise_id,
          preexhaust_isolation_weight,
          preexhaust_isolation_reps,
          preexhaust_compound_exercise_id,
          preexhaust_compound_weight,
          preexhaust_compound_reps,
          actual_time_seconds,
          actual_duration_seconds,
          actual_distance_meters,
          actual_hr_avg,
          actual_speed_kmh,
          exercises (
            id,
            name
          )
        `
        )
        .eq("workout_log_id", workoutLogId)
        .eq("client_id", userId)
        .order("completed_at", { ascending: true });

      if (setsError) {
        console.error("Error loading sets:", setsError);
        return;
      }

      // Get exercise names for all exercise IDs
      const exerciseIds = new Set<string>();
      sets?.forEach((set: any) => {
        if (set.exercise_id) exerciseIds.add(set.exercise_id);
        if (set.superset_exercise_a_id)
          exerciseIds.add(set.superset_exercise_a_id);
        if (set.superset_exercise_b_id)
          exerciseIds.add(set.superset_exercise_b_id);
        if (set.preexhaust_isolation_exercise_id)
          exerciseIds.add(set.preexhaust_isolation_exercise_id);
        if (set.preexhaust_compound_exercise_id)
          exerciseIds.add(set.preexhaust_compound_exercise_id);
        if (set.giant_set_exercises && Array.isArray(set.giant_set_exercises)) {
          set.giant_set_exercises.forEach((ex: any) => {
            if (ex.exercise_id) exerciseIds.add(ex.exercise_id);
          });
        }
      });

      const { data: exercises } = await supabase
        .from("exercises")
        .select("id, name")
        .in("id", Array.from(exerciseIds));

      const exerciseMap = new Map<string, string>();
      exercises?.forEach((ex) => {
        exerciseMap.set(ex.id, ex.name);
      });

      // Group sets by block using workout_set_logs only
      const blocksMap = new Map<string, BlockGroup>();

      sets?.forEach((set: any) => {
        if (!set.set_entry_id) return;
        let blockGroup = blocksMap.get(set.set_entry_id);
        if (!blockGroup) {
          const fallbackOrder = blocksMap.size + 1;
          blockGroup = {
    set_entry_id: set.set_entry_id,
            set_type: set.set_type || "straight_set",
            set_name: `Set ${fallbackOrder}`,
            set_order: fallbackOrder,
            sets: [],
            exerciseNames: new Map<string, string>(),
            templateBlock: undefined,
          };
          blocksMap.set(set.set_entry_id, blockGroup);
        }

        blockGroup.sets.push(set as WorkoutSetLog);
        
        // Add main exercise_id to exerciseNames (from join or exerciseMap)
        // Don't override if already set from template
        if (set.exercise_id) {
          if (set.exercises?.name) {
            blockGroup.exerciseNames.set(set.exercise_id, set.exercises.name);
          } else if (exerciseMap.has(set.exercise_id) && !blockGroup.exerciseNames.has(set.exercise_id)) {
            blockGroup.exerciseNames.set(
              set.exercise_id,
              exerciseMap.get(set.exercise_id)!
            );
          }
        }
        
        // Add superset exercise names
        if (
          set.superset_exercise_a_id &&
          exerciseMap.has(set.superset_exercise_a_id)
        ) {
          blockGroup.exerciseNames.set(
            set.superset_exercise_a_id,
            exerciseMap.get(set.superset_exercise_a_id)!
          );
        }
        if (
          set.superset_exercise_b_id &&
          exerciseMap.has(set.superset_exercise_b_id)
        ) {
          blockGroup.exerciseNames.set(
            set.superset_exercise_b_id,
            exerciseMap.get(set.superset_exercise_b_id)!
          );
        }
        
        // Add pre-exhaustion exercise names
        if (
          set.preexhaust_isolation_exercise_id &&
          exerciseMap.has(set.preexhaust_isolation_exercise_id)
        ) {
          blockGroup.exerciseNames.set(
            set.preexhaust_isolation_exercise_id,
            exerciseMap.get(set.preexhaust_isolation_exercise_id)!
          );
        }
        if (
          set.preexhaust_compound_exercise_id &&
          exerciseMap.has(set.preexhaust_compound_exercise_id)
        ) {
          blockGroup.exerciseNames.set(
            set.preexhaust_compound_exercise_id,
            exerciseMap.get(set.preexhaust_compound_exercise_id)!
          );
        }
        
        // Add giant set exercise names
        if (set.giant_set_exercises && Array.isArray(set.giant_set_exercises)) {
          set.giant_set_exercises.forEach((ex: any) => {
            if (ex.exercise_id && exerciseMap.has(ex.exercise_id)) {
              blockGroup.exerciseNames.set(
                ex.exercise_id,
                exerciseMap.get(ex.exercise_id)!
              );
            }
          });
        }
      });

      // Show all blocks from template, even if they have no sets logged
      // This ensures blocks like Tabata (which may not log sets) are still displayed
      const blocksArray = Array.from(blocksMap.values())
        .sort((a, b) => a.set_order - b.set_order);

      setBlockGroups(blocksArray);

      // Prescribed effort (RPE) for target / yours pairs
      try {
        const entryIds = [
          ...new Set(
            (sets ?? [])
              .map((s: any) => s.set_entry_id as string | null)
              .filter(Boolean) as string[],
          ),
        ];
        const map: PrescribedRpeMap = new Map();
        if (entryIds.length > 0) {
          // Standalone template path: workout_set_entry_exercises → workout_set_prescriptions
          const { data: slots } = await supabase
            .from("workout_set_entry_exercises")
            .select("id, set_entry_id, exercise_id, rpe")
            .in("set_entry_id", entryIds);
          const slotIds = (slots ?? []).map((s) => s.id);
          if (slotIds.length > 0) {
            const { data: rxRows } = await supabase
              .from("workout_set_prescriptions")
              .select("slot_id, set_number, rpe")
              .in("slot_id", slotIds);
            const slotById = new Map(
              (slots ?? []).map((s) => [s.id, s] as const),
            );
            for (const rx of rxRows ?? []) {
              const slot = slotById.get(rx.slot_id);
              if (!slot?.set_entry_id || !slot.exercise_id) continue;
              const sn = Number(rx.set_number);
              if (!Number.isFinite(sn)) continue;
              // DB columns are `rpe`; local value feeds Phase 2 display map.
              const prescribed =
                rx.rpe != null && Number(rx.rpe) > 0
                  ? Number(rx.rpe)
                  : slot.rpe != null && Number(slot.rpe) > 0
                    ? Number(slot.rpe)
                    : null;
              map.set(
                prescribedKey(slot.set_entry_id, slot.exercise_id, sn),
                prescribed,
              );
            }
            // Slot-level prescribed-effort fallback when no per-set prescriptions
            for (const slot of slots ?? []) {
              if (!slot.set_entry_id || !slot.exercise_id) continue;
              if (slot.rpe == null || Number(slot.rpe) <= 0) continue;
              // Only fill gaps — don't overwrite per-set values
              for (let sn = 1; sn <= 20; sn++) {
                const k = prescribedKey(
                  slot.set_entry_id,
                  slot.exercise_id,
                  sn,
                );
                if (!map.has(k)) map.set(k, Number(slot.rpe));
              }
            }
          }

          // Program instance path
          const { data: pSlots } = await supabase
            .from("program_instance_set_entry_exercises")
            .select("id, program_instance_set_entry_id, exercise_id, rpe")
            .in("program_instance_set_entry_id", entryIds);
          const pSlotIds = (pSlots ?? []).map((s) => s.id);
          if (pSlotIds.length > 0) {
            const { data: pRx } = await supabase
              .from("program_instance_set_prescriptions")
              .select("slot_id, set_number, rpe")
              .in("slot_id", pSlotIds);
            const pById = new Map((pSlots ?? []).map((s) => [s.id, s] as const));
            for (const rx of pRx ?? []) {
              const slot = pById.get(rx.slot_id);
              if (!slot?.program_instance_set_entry_id || !slot.exercise_id)
                continue;
              const sn = Number(rx.set_number);
              if (!Number.isFinite(sn)) continue;
              const prescribed =
                rx.rpe != null && Number(rx.rpe) > 0
                  ? Number(rx.rpe)
                  : slot.rpe != null && Number(slot.rpe) > 0
                    ? Number(slot.rpe)
                    : null;
              map.set(
                prescribedKey(
                  slot.program_instance_set_entry_id,
                  slot.exercise_id,
                  sn,
                ),
                prescribed,
              );
            }
            for (const slot of pSlots ?? []) {
              if (
                !slot.program_instance_set_entry_id ||
                !slot.exercise_id ||
                slot.rpe == null ||
                Number(slot.rpe) <= 0
              )
                continue;
              for (let sn = 1; sn <= 20; sn++) {
                const k = prescribedKey(
                  slot.program_instance_set_entry_id,
                  slot.exercise_id,
                  sn,
                );
                if (!map.has(k)) map.set(k, Number(slot.rpe));
              }
            }
          }
        }
        setPrescribedRpeMap(map);
      } catch (e) {
        console.warn("[complete] prescribed RPE load failed", e);
      }

    } catch (error) {
      console.error("❌ Error loading blocks and sets:", error);
    }
  };

  const resolveWorkoutAssignmentId = async (
    inputId: string,
    userId: string
  ): Promise<string | null> => {
    try {
      // TASK B: Support program_day_assignments.id
      // First check if inputId is a program_day_assignments.id
      const { data: programDayAssignment } = await supabase
        .from("program_day_assignments")
        .select("id, workout_assignment_id, program_assignment_id")
        .eq("id", inputId)
        .maybeSingle();

      if (programDayAssignment) {
        // Verify ownership through program_assignment
        const { data: programAssignment } = await supabase
          .from("program_assignments")
          .select("id, client_id")
          .eq("id", programDayAssignment.program_assignment_id)
          .eq("client_id", userId)
          .maybeSingle();

        if (programAssignment && programDayAssignment.workout_assignment_id) {
          return programDayAssignment.workout_assignment_id;
        }
      }

      // Check if it's a workout_assignments.id
      const { data: workoutAssignment } = await supabase
        .from("workout_assignments")
        .select("id")
        .eq("id", inputId)
        .eq("client_id", userId)
        .maybeSingle();

      if (workoutAssignment) {
        return workoutAssignment.id;
      }

      // TASK 3: No legacy fallbacks - only support program_day_assignments.id and workout_assignments.id

      return null;
    } catch (error) {
      console.warn("Error resolving workout assignment id:", error);
      return null;
    }
  };

  const loadAssignment = async (): Promise<WorkoutAssignment | null> => {
    try {
      setLoadError(null);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return null;
      }

      const result = await withTimeout(
        (async (): Promise<WorkoutAssignment> => {
          const actualAssignmentId = await resolveWorkoutAssignmentId(
            assignmentId,
            user.id
          );

          if (!actualAssignmentId) {
            throw new Error("Workout assignment not found");
          }

          setResolvedAssignmentId(actualAssignmentId);

          const withCoach = await supabase
            .from("workout_assignments")
            .select(
              "*, coach:profiles!workout_assignments_coach_id_fkey(first_name)"
            )
            .eq("id", actualAssignmentId)
            .eq("client_id", user.id)
            .maybeSingle();

          let assignmentData: any = withCoach.data;
          let assignmentError = withCoach.error;

          if (assignmentError) {
            const fb = await supabase
              .from("workout_assignments")
              .select("*")
              .eq("id", actualAssignmentId)
              .eq("client_id", user.id)
              .maybeSingle();
            assignmentData = fb.data;
            assignmentError = fb.error;
          }

          if (assignmentError) throw assignmentError;
          if (!assignmentData) throw new Error("Workout assignment not found");

          const coachFn = assignmentData.coach?.first_name;
          setCoachFirstName(
            typeof coachFn === "string" && coachFn.trim()
              ? coachFn.trim()
              : null
          );

          setAssignment(assignmentData as WorkoutAssignment);
          return assignmentData as WorkoutAssignment;
        })(),
        30000,
        "timeout"
      );
      return result;
    } catch (error: any) {
      console.error("Error loading assignment:", error);
      const isTimeoutErr = error?.message === "timeout" || error?.message?.includes("Timeout") || error?.message?.includes("took longer than");
      setLoadError(isTimeoutErr ? "Loading took too long. Please try again." : (error?.message || "Failed to load workout"));
      return null;
    }
  };

  const markWorkoutComplete = async () => {
    const targetAssignmentId = assignment?.id || resolvedAssignmentId || null;
    if (!assignment || !targetAssignmentId) return;

    console.log("[COMPLETE-FLOW] submit handler called");
    console.log("[COMPLETE-FLOW] sending to API", {
      workoutLogId: workoutLogIdOverride ?? workoutLogIdForSummary,
      assignmentId: targetAssignmentId,
      duration: workoutStats.duration,
      rating: workoutStats.rating,
      notes: workoutStats.notes,
    });

    const {
      data: { session },
    } = await supabase.auth.getSession();
    console.log("[COMPLETE-FLOW] auth session", {
      hasSession: !!session,
      expiresAt: session?.expires_at,
      isExpired: session ? Date.now() / 1000 > (session.expires_at ?? 0) : "no session",
    });

    // Idempotent: if assignment is already completed, just navigate
    if (assignment.status === "completed") {
      console.log("[COMPLETE-FLOW] navigating after completion (already completed)");
      router.push("/client/train");
      return;
    }

    setCompleting(true);
    try {
      await updateWorkoutTotals();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // TASK C: Update workout_assignments.status to 'completed'
      const { error: assignmentUpdateError } = await supabase
        .from("workout_assignments")
        .update({
          status: "completed",
        })
        .eq("id", targetAssignmentId);

      if (assignmentUpdateError) {
        console.error("❌ Error updating assignment status:", assignmentUpdateError);
        throw assignmentUpdateError;
      }

      // REMOVED: Legacy program_day_assignments.is_completed update.
      // Program completion is now handled entirely by the /api/complete-workout
      // unified pipeline which writes to the canonical program_day_completions ledger.

      if (assignment.name) {
        await NotificationTriggers.triggerWorkoutCompleted(
          assignment.name,
          workoutStats.duration || 45
        );
      }

      console.log("[COMPLETE-FLOW] API response", { status: "success" });
      console.log("[COMPLETE-FLOW] navigating after completion");
      router.push("/client/train");
    } catch (error) {
      console.log("[COMPLETE-FLOW] API response", { status: "error", error: (error as Error)?.message });
      console.error("❌ Error completing workout:", error);
    } finally {
      setCompleting(false);
    }
  };

  const formatBlockType = (blockType: string) => {
    return blockType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const renderSetDisplay = (
    set: WorkoutSetLog,
    blockType: string,
    exerciseNames: Map<string, string>
  ) => {
    switch (blockType) {
      case "amrap":
        const amrapExerciseName = set.exercise_id
          ? exerciseNames.get(set.exercise_id) || "Exercise"
          : "Exercise";
        return (
          <div className="text-sm">
            <span className="font-semibold">
              • {amrapExerciseName} - Set {set.set_number || 1}: {set.weight || 0} kg ×{" "}
              {set.amrap_total_reps || set.reps || 0} reps
            </span>
            {set.amrap_target_reps && (
              <span className="ml-2 text-[color:var(--fc-text-dim)]">
                (target: {set.amrap_target_reps} reps)
              </span>
            )}
            {set.amrap_duration_seconds !== null &&
              set.amrap_duration_seconds !== undefined && (
                <span className="ml-2 text-[color:var(--fc-text-dim)]">
                  (completed in {set.amrap_duration_seconds} sec)
                </span>
              )}
          </div>
        );

      case "for_time":
      case "fortime":
        const fortimeExerciseName = set.exercise_id
          ? exerciseNames.get(set.exercise_id) || "Exercise"
          : "Exercise";
        return (
          <div className="text-sm">
            <span className="font-semibold">
              • {fortimeExerciseName} - Set {set.set_number || 1}: {set.weight || 0} kg ×{" "}
              {set.fortime_total_reps || set.reps || 0} reps
            </span>
            {set.fortime_target_reps && (
              <span className="ml-2 text-[color:var(--fc-text-dim)]">
                (target: {set.fortime_target_reps} reps)
              </span>
            )}
            {set.fortime_time_taken_sec !== null &&
              set.fortime_time_taken_sec !== undefined && (
                <span className="ml-2 text-[color:var(--fc-text-dim)]">
                  (completed in {Math.floor(set.fortime_time_taken_sec / 60)}:{(set.fortime_time_taken_sec % 60).toString().padStart(2, '0')}
                  {set.fortime_time_cap_sec
                    ? ` / cap: ${Math.floor(set.fortime_time_cap_sec / 60)}:${(set.fortime_time_cap_sec % 60).toString().padStart(2, '0')}`
                    : ""}
                  )
                </span>
              )}
          </div>
        );

      case "drop_set":
      case "dropset":
        const dropsetExerciseName = set.exercise_id
          ? exerciseNames.get(set.exercise_id) || "Exercise"
          : "Exercise";
        return (
          <div className="text-sm">
            <span className="font-semibold">
              • {dropsetExerciseName} - Set {set.set_number || 1}:{" "}
              {set.dropset_initial_weight || set.weight || 0} kg ×{" "}
              {set.dropset_initial_reps || set.reps || 0}
            </span>
            {set.dropset_final_weight !== null &&
              set.dropset_final_weight !== undefined && (
                <>
                  <span className="mx-2">→</span>
                  <span className="font-semibold">
                    {set.dropset_final_weight} kg ×{" "}
                    {set.dropset_final_reps || 0}
                  </span>
                  {set.dropset_percentage !== null &&
                    set.dropset_percentage !== undefined && (
                      <span className="ml-2 text-[color:var(--fc-text-dim)]">
                        ({Math.round(set.dropset_percentage)}% drop)
                      </span>
                    )}
                </>
              )}
          </div>
        );

      case "straight_set":
        const straightExerciseName = set.exercise_id
          ? exerciseNames.get(set.exercise_id) || "Exercise"
          : "Exercise";
        return (
          <div className="text-sm">
            <span className="font-semibold">
              • {straightExerciseName} - Set {set.set_number || 1}: {set.weight || 0} kg ×{" "}
              {set.reps || 0} reps
            </span>
          </div>
        );

      case "superset":
        const exerciseA = set.superset_exercise_a_id
          ? exerciseNames.get(set.superset_exercise_a_id)
          : "Exercise A";
        const exerciseB = set.superset_exercise_b_id
          ? exerciseNames.get(set.superset_exercise_b_id)
          : "Exercise B";
        return (
          <div className="text-sm">
            <span className="font-semibold">
              • Set {set.set_number || 1}:{" "}
              {set.superset_weight_a || set.weight || 0} kg ×{" "}
              {set.superset_reps_a || set.reps || 0} reps
            </span>
            {set.superset_weight_b !== null &&
              set.superset_weight_b !== undefined && (
                <>
                  <span className="mx-2">+</span>
                  <span className="font-semibold">
                    {set.superset_weight_b} kg × {set.superset_reps_b || 0} reps
                  </span>
                </>
              )}
          </div>
        );

      case "giant_set":
        let giantSetDisplay = `• Round ${set.set_number || 1}: `;
        if (set.giant_set_exercises && Array.isArray(set.giant_set_exercises)) {
          const exercises = set.giant_set_exercises.map((ex: any) => {
            const exerciseName = ex.exercise_id
              ? exerciseNames.get(ex.exercise_id) || "Exercise"
              : "Exercise";
            return `${exerciseName} ${ex.weight || 0}kg×${ex.reps || 0}`;
          });
          giantSetDisplay += exercises.join(" + ");
        } else {
          const exerciseName = set.exercise_id
            ? exerciseNames.get(set.exercise_id) || "Exercise"
            : "Exercise";
          giantSetDisplay += `${exerciseName}: ${set.weight || 0} kg × ${set.reps || 0} reps`;
        }
        return <div className="text-sm font-semibold">{giantSetDisplay}</div>;

      case "cluster_set":
        const clusterExerciseName = set.exercise_id
          ? exerciseNames.get(set.exercise_id) || "Exercise"
          : "Exercise";
        return (
          <div className="text-sm">
            <span className="font-semibold">
              • {clusterExerciseName} - Cluster {set.cluster_number || 1}, Set {set.set_number || 1}:{" "}
              {set.weight || 0} kg × {set.reps || 0} reps
            </span>
          </div>
        );

      case "rest_pause":
        const restPauseExerciseName = set.exercise_id
          ? exerciseNames.get(set.exercise_id) || "Exercise"
          : "Exercise";
        return (
          <div className="text-sm">
            <span className="font-semibold">
              • {restPauseExerciseName} - Set {set.set_number || 1}:{" "}
              {set.rest_pause_initial_weight || set.weight || 0} kg ×{" "}
              {set.rest_pause_initial_reps || set.reps || 0} reps
            </span>
            {set.rest_pause_reps_after !== null &&
              set.rest_pause_reps_after !== undefined && (
                <>
                  <span className="mx-2">→</span>
                  <span className="font-semibold">
                    {set.rest_pause_initial_weight || set.weight || 0} kg ×{" "}
                    {set.rest_pause_reps_after} reps
                  </span>
                  <span className="ml-2 text-[color:var(--fc-text-dim)]">
                    (after rest-pause #{set.rest_pause_number || 1})
                  </span>
                </>
              )}
          </div>
        );

      case "pre_exhaustion":
      case "preexhaust":
        const isolationName = set.preexhaust_isolation_exercise_id
          ? exerciseNames.get(set.preexhaust_isolation_exercise_id)
          : "Isolation";
        const compoundName = set.preexhaust_compound_exercise_id
          ? exerciseNames.get(set.preexhaust_compound_exercise_id)
          : "Compound";
        return (
          <div className="text-sm">
            <span className="font-semibold">
              • Set {set.set_number || 1}: [Isolation:{" "}
              {set.preexhaust_isolation_weight || 0} kg ×{" "}
              {set.preexhaust_isolation_reps || 0}]
            </span>
            <span className="mx-2">→</span>
            <span className="font-semibold">
              [Compound: {set.preexhaust_compound_weight || 0} kg ×{" "}
              {set.preexhaust_compound_reps || 0}]
            </span>
          </div>
        );

      case "emom":
        const emomExerciseName = set.exercise_id
          ? exerciseNames.get(set.exercise_id) || "Exercise"
          : "Exercise";
        return (
          <div className="text-sm">
            <span className="font-semibold">
              • {emomExerciseName} - Minute {set.emom_minute_number || set.set_number || 1}:{" "}
              {set.emom_total_reps_this_min || set.reps || 0} reps
            </span>
            {set.emom_total_duration_sec && (
              <span className="ml-2 text-[color:var(--fc-text-dim)]">
                (duration: {Math.floor(set.emom_total_duration_sec / 60)}:{(set.emom_total_duration_sec % 60).toString().padStart(2, '0')})
              </span>
            )}
          </div>
        );

      case "tabata":
        const tabataExerciseName = set.exercise_id
          ? exerciseNames.get(set.exercise_id) || "Exercise"
          : "Exercise";
        return (
          <div className="text-sm">
            <span className="font-semibold">
              • {tabataExerciseName} - Round {set.set_number || 1}
            </span>
            {set.tabata_rounds_completed && (
              <span className="ml-2 text-[color:var(--fc-text-dim)]">
                ({set.tabata_rounds_completed} rounds completed)
              </span>
            )}
            {set.tabata_total_duration_sec && (
              <span className="ml-2 text-[color:var(--fc-text-dim)]">
                (duration: {Math.floor(set.tabata_total_duration_sec / 60)}:{(set.tabata_total_duration_sec % 60).toString().padStart(2, '0')})
              </span>
            )}
          </div>
        );

      case "timed_set": {
        const timedName = set.exercise_id
          ? exerciseNames.get(set.exercise_id) || "Exercise"
          : "Exercise";
        const actual = set.actual_duration_seconds;
        const sec =
          actual != null && Number.isFinite(Number(actual))
            ? `${Math.round(Number(actual))}s`
            : "—";
        return (
          <span className="text-sm font-semibold block">
            • {timedName} — Set {set.set_number || 1}: {sec}
          </span>
        );
      }

      case "speed_work": {
        const speedName = set.exercise_id
          ? exerciseNames.get(set.exercise_id) || "Exercise"
          : "Exercise";
        const t = set.actual_time_seconds;
        const timeStr =
          t != null && Number.isFinite(t)
            ? `${(Math.round(Number(t) * 10) / 10).toFixed(1)}s`
            : "—";
        const hr = set.actual_hr_avg;
        const hrPart =
          hr != null && Number.isFinite(Number(hr))
            ? ` · ${Math.round(Number(hr))} bpm`
            : "";
        const intervalNum = set.set_number || 1;
        return (
          <div className="text-sm">
            <span className="font-semibold">
              • {speedName} — Interval {intervalNum}: {timeStr}
              {hrPart}
            </span>
          </div>
        );
      }

      case "endurance": {
        const endName = set.exercise_id
          ? exerciseNames.get(set.exercise_id) || "Exercise"
          : "Exercise";
        const distM = set.actual_distance_meters;
        const timeSec = set.actual_time_seconds;
        const parts: string[] = [];
        if (distM != null && Number.isFinite(Number(distM)) && Number(distM) > 0) {
          parts.push(`${(Number(distM) / 1000).toFixed(1)} km`);
        }
        if (timeSec != null && Number.isFinite(Number(timeSec)) && Number(timeSec) > 0) {
          parts.push(formatDurationFromSeconds(Math.floor(Number(timeSec))));
        }
        const km = distM != null ? Number(distM) / 1000 : 0;
        const ts = timeSec != null ? Number(timeSec) : 0;
        if (km > 0 && ts > 0) {
          const secPerKm = ts / km;
          if (Number.isFinite(secPerKm) && secPerKm > 0) {
            parts.push(formatPaceMinSecPerKm(secPerKm));
          }
        }
        const hrE = set.actual_hr_avg;
        if (hrE != null && Number.isFinite(Number(hrE))) {
          parts.push(`${Math.round(Number(hrE))} bpm`);
        }
        const summary = parts.length > 0 ? parts.join(" · ") : "—";
        return (
          <div className="text-sm">
            <span className="font-semibold">
              • {endName} — {summary}
            </span>
          </div>
        );
      }

      default:
        return (
          <div className="text-sm">
            <span className="font-semibold">
              • Set {set.set_number || 1}: {set.weight || 0} kg ×{" "}
              {set.reps || 0} reps
            </span>
          </div>
        );
    }
  };

  const renderTemplateExercises = (
    block: BlockGroup,
    exerciseNames: Map<string, string>
  ) => {
    if (!block.templateBlock) {
      return (
        <div className="pl-4 border-l-2 border-[color:var(--fc-glass-border)] text-sm text-[color:var(--fc-text-subtle)] italic">
          No template data available for this block.
        </div>
      );
    }

    const templateBlock = block.templateBlock;
    const blockType = templateBlock.set_type;

    // For Tabata, show exercises with their time protocol data
    // Use exerciseNames as primary source since it's guaranteed to be populated (header shows it)
    if (blockType === "tabata") {
      const exercises = templateBlock.exercises || [];
      const timeProtocols = templateBlock.time_protocols || [];
      const rounds = templateBlock.total_sets || 8;
      
      // Get rest_after_set from any time protocol (it's block-level, same for all exercises in tabata)
      // It might also be stored in block.rest_seconds
      const restAfterSet = timeProtocols.find((tp: any) => 
        tp.rest_after_set !== null && tp.rest_after_set !== undefined && tp.rest_after_set > 0
      )?.rest_after_set || templateBlock.rest_seconds || null;

      // Always use exerciseNames as primary source - it's populated from template and shows in header
      if (exerciseNames.size > 0) {
        // Group exercises by set number (Tabata organizes exercises into sets/rounds)
        const setsMap = new Map<number, Array<{exerciseId: string, exerciseName: string, work_seconds: number, rest_seconds: number, exercise_order: number}>>();
        
        // First, get all unique set numbers
        const allSetNumbers = new Set<number>();
        timeProtocols.forEach((tp: any) => {
          if (tp.set !== null && tp.set !== undefined) {
            allSetNumbers.add(tp.set);
          }
        });
        
        // If no set numbers found, treat all exercises as set 1
        const setNumbers = allSetNumbers.size > 0 ? Array.from(allSetNumbers).sort((a, b) => a - b) : [1];
        
        // Group exercises by their set number
        setNumbers.forEach((setNum) => {
          if (!setsMap.has(setNum)) {
            setsMap.set(setNum, []);
          }
          
          // Find all exercises that belong to this set
          timeProtocols.forEach((tp: any) => {
            const tpSet = tp.set !== null && tp.set !== undefined ? tp.set : 1;
            if (tpSet === setNum) {
              const exerciseName = exerciseNames.get(tp.exercise_id) || "Exercise";
              const existingInSet = setsMap.get(setNum)!.find(e => e.exerciseId === tp.exercise_id);
              
              if (!existingInSet) {
                setsMap.get(setNum)!.push({
                  exerciseId: tp.exercise_id,
                  exerciseName,
                  work_seconds: tp.work_seconds ?? 20,
                  rest_seconds: tp.rest_seconds ?? 10,
                  exercise_order: tp.exercise_order ?? 1,
                });
              }
            }
          });
        });
        
        // Sort exercises within each set by exercise_order
        setsMap.forEach((exercises, setNum) => {
          exercises.sort((a, b) => a.exercise_order - b.exercise_order);
        });

        // If we have sets, display them grouped by set
        if (setsMap.size > 0) {
          return (
            <div className="space-y-3">
              <div className="mb-2 text-sm font-semibold text-[color:var(--fc-text-primary)]">
                Rounds: {rounds}
              </div>
              {Array.from(setsMap.entries()).map(([setNum, setExercises]) => (
                <div
                  key={setNum}
                  className="pl-4 border-l-2 border-[color:var(--fc-glass-border)]"
                >
                  <div className="mb-1 text-xs font-semibold text-[color:var(--fc-text-subtle)]">
                    Set {setNum}:
                  </div>
                  {setExercises.map((ex, idx) => (
                    <div key={ex.exerciseId || idx} className="text-sm ml-2 mb-1">
                      <span className="font-medium">{ex.exerciseName}</span>
                      <span className="ml-2 text-[color:var(--fc-text-dim)]">
                        Work: {ex.work_seconds}s • Rest: {ex.rest_seconds}s
                      </span>
                    </div>
                  ))}
                </div>
              ))}
              {restAfterSet && (
                <div className="mt-2 text-xs text-[color:var(--fc-text-subtle)]">
                  Rest after set: {restAfterSet}s
                </div>
              )}
              <div className="mt-2 text-xs italic text-[color:var(--fc-text-subtle)]">
                (No sets logged for this block)
              </div>
            </div>
          );
        }
        
        // Fallback: If no sets found, display all exercises in a single group
        const allExercises = Array.from(exerciseNames.entries()).map(([exerciseId, exerciseName]) => {
          const tp = timeProtocols.find((t: any) => t.exercise_id === exerciseId);
          return {
            exerciseId,
            exerciseName,
            work_seconds: tp?.work_seconds ?? 20,
            rest_seconds: tp?.rest_seconds ?? 10,
            exercise_order: tp?.exercise_order ?? 1,
          };
        }).sort((a, b) => a.exercise_order - b.exercise_order);

        return (
          <div className="space-y-3">
            <div className="mb-2 text-sm font-semibold text-[color:var(--fc-text-primary)]">
              Rounds: {rounds}
            </div>
            <div className="pl-4 border-l-2 border-[color:var(--fc-glass-border)]">
              <div className="mb-1 text-xs font-semibold text-[color:var(--fc-text-subtle)]">
                Exercises:
              </div>
              {allExercises.map((ex, idx) => (
                <div key={ex.exerciseId || idx} className="text-sm ml-2 mb-1">
                  <span className="font-medium">{ex.exerciseName}</span>
                  <span className="ml-2 text-[color:var(--fc-text-dim)]">
                    Work: {ex.work_seconds}s • Rest: {ex.rest_seconds}s
                  </span>
                </div>
              ))}
            </div>
            {restAfterSet && (
              <div className="mt-2 text-xs text-[color:var(--fc-text-subtle)]">
                Rest after set: {restAfterSet}s
              </div>
            )}
            <div className="mt-2 text-xs italic text-[color:var(--fc-text-subtle)]">
              (No sets logged for this block)
            </div>
          </div>
        );
      }

      // Fallback if no exercise names found
      return (
        <div className="pl-4 border-l-2 border-[color:var(--fc-glass-border)] text-sm text-[color:var(--fc-text-subtle)] italic">
          No exercises configured for this Tabata block.
        </div>
      );
    }

    // For other block types, show basic exercise information
    const exercises = templateBlock.exercises || [];
    if (exercises.length === 0) {
      return (
        <div className="pl-4 border-l-2 border-[color:var(--fc-glass-border)] text-sm text-[color:var(--fc-text-subtle)] italic">
          No exercises configured for this block.
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {exercises.map((ex: any, idx: number) => {
          const exerciseName = exerciseNames.get(ex.exercise_id) || "Exercise";
          return (
            <div
              key={idx}
              className="pl-4 border-l-2 border-[color:var(--fc-glass-border)] text-sm"
            >
              <span className="font-semibold">{exerciseName}</span>
              {ex.reps && (
                <span className="ml-2 text-[color:var(--fc-text-dim)]">
                  • Reps: {ex.reps}
                </span>
              )}
              {ex.load_percentage && (
                <span className="ml-2 text-[color:var(--fc-text-dim)]">
                  • Load: {ex.load_percentage}%
                </span>
              )}
              {ex.weight_kg && (
                <span className="ml-2 text-[color:var(--fc-text-dim)]">
                  • Weight: {ex.weight_kg} kg
                </span>
              )}
            </div>
          );
        })}
        <div className="pl-4 border-l-2 border-[color:var(--fc-glass-border)] mt-2 text-xs italic text-[color:var(--fc-text-subtle)]">
          (No sets logged for this block)
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="client">
        <AnimatedBackground>
          <ClientPageShell className="min-h-screen max-w-lg lg:max-w-3xl mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 overflow-x-hidden">
            <div className="space-y-3 animate-pulse">
              <div className="h-20 w-20 rounded-full mx-auto bg-[color:var(--fc-glass-highlight)]" />
              <div className="h-7 max-w-[200px] rounded-lg mx-auto bg-[color:var(--fc-glass-highlight)]" />
              <div className="h-4 max-w-[120px] rounded mx-auto bg-[color:var(--fc-glass-highlight)]" />
              <div className="rounded-xl border border-[color:var(--fc-glass-border)] fc-glass-soft p-3 space-y-2 mt-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 rounded-lg bg-[color:var(--fc-glass-highlight)]" />
                ))}
              </div>
            </div>
          </ClientPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  if (loadError) {
    return (
      <ProtectedRoute requiredRole="client">
        <AnimatedBackground>
          <ClientPageShell className="min-h-screen max-w-lg lg:max-w-3xl mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 overflow-x-hidden flex items-center justify-center min-h-[60vh]">
            <div className="w-full py-8 px-4 text-center">
              <p className="mb-1 text-sm fc-text-dim">{loadError}</p>
              <p className="mb-4 text-xs fc-text-subtle">Try again or return to your workouts.</p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button
                  type="button"
                  variant="btn-action"
                  onClick={() => {
                    completionDoneRef.current = false;
                    setLoadError(null);
                    setLoading(true);
                    const handoff = readCompletionHandoff(searchParams);
                    loadAssignment()
                      .then(async (assignmentData: WorkoutAssignment | null) => {
                        if (assignmentData) {
                          await updateWorkoutTotals(
                            assignmentData.workout_template_id,
                            assignmentData.id,
                            handoff.logId,
                            handoff.sessionId,
                            handoff.durationMinutes
                          );
                        }
                      })
                      .catch((err) => {
                        console.error("Error loading assignment:", err);
                        const isTimeoutErr = err?.message === "timeout" || err?.message?.includes("Timeout") || err?.message?.includes("took longer than");
                        setLoadError(isTimeoutErr ? "Loading took too long. Please try again." : (err?.message || "Failed to load workout"));
                      })
                      .finally(() => {
                        setLoading(false);
                      });
                  }}
                  className="h-10 w-full min-w-[140px] sm:w-auto"
                >
                  Retry
                </Button>
                <Button
                  type="button"
                  variant="fc-secondary"
                  className="h-10 w-auto"
                  onClick={() => router.push("/client/train")}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Workouts
                </Button>
              </div>
            </div>
          </ClientPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  if (!assignment) {
    return (
      <ProtectedRoute requiredRole="client">
        <AnimatedBackground>
          <ClientPageShell className="min-h-screen max-w-lg lg:max-w-3xl mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 overflow-x-hidden flex items-center justify-center min-h-[60vh]">
            <div className="w-full py-8 px-4 text-center">
              <h3 className="text-sm fc-text-dim font-medium">Workout not found</h3>
              <p className="mt-1 text-xs fc-text-subtle">
                This workout does not exist or you do not have access to it.
              </p>
              <div className="mt-6 flex justify-center">
                <Button
                  type="button"
                  variant="fc-secondary"
                  className="h-10 w-auto"
                  onClick={() => router.push("/client/train")}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Workouts
                </Button>
              </div>
            </div>
          </ClientPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  const completedDate = workoutLog?.completed_at || workoutLog?.started_at;
  
  // Format duration as MM:SS
  const formatDuration = (minutes: number): string => {
    const mins = Math.floor(minutes);
    const secs = Math.round((minutes - mins) * 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Format volume with comma separator
  const formatVolume = (kg: number): string => {
    return kg.toLocaleString();
  };


  // Format scheduled date to show weekday
  const formatScheduledDate = (dateString: string | null): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
    });
  };

  const allLoggedSets = blockGroups.flatMap((g) => g.sets);
  const isCardioSet = (s: WorkoutSetLog) =>
    s.set_type === "speed_work" || s.set_type === "endurance";
  const cardioLoggedSets = allLoggedSets.filter(isCardioSet);
  const strengthLoggedSets = allLoggedSets.filter((s) => !isCardioSet(s));

  const prCount = personalRecords.length;
  const skippedExerciseCount = 0;
  const accent = getCompleteAccent({
    prCount,
    isFirstEverWorkout,
    skippedExerciseCount,
  });
  const heroTitle = titleForAccent(accent);
  const dm = Math.floor(Number(workoutStats.duration) || 0);
  const ds = Math.round(
    Math.max(0, (Number(workoutStats.duration) || 0) - dm) * 60
  );

  const dayLabelShort = (() => {
    const iso = completedDate as string | undefined;
    if (!iso) return "Today";
    const d = new Date(iso);
    const t0 = new Date();
    t0.setHours(0, 0, 0, 0);
    const d0 = new Date(d);
    d0.setHours(0, 0, 0, 0);
    const diff = Math.round((t0.getTime() - d0.getTime()) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  })();

  const hasPrev = previousLogTotals != null;
  const curW = Number(workoutStats.totalWeight) || 0;
  const prevW = hasPrev
    ? Number(previousLogTotals!.total_weight_lifted) || 0
    : 0;
  const dW = hasPrev ? curW - prevW : null;
  let volDeltaTier: "up" | "same" | "down" | "baseline" = "baseline";
  if (!hasPrev) volDeltaTier = "baseline";
  else if (dW != null) {
    if (dW > 0) volDeltaTier = "up";
    else if (dW < 0) volDeltaTier = "down";
    else volDeltaTier = "same";
  }

  const volDeltaNode =
    volDeltaTier === "baseline" ? (
      "Your first one — baseline set"
    ) : volDeltaTier === "same" ? (
      "Same volume as last session"
    ) : (
      <>
        {volDeltaTier === "up" ? (
          <ArrowUpRight size={12} aria-hidden />
        ) : (
          <ArrowDownRight size={12} aria-hidden />
        )}
        {dW != null && dW > 0 ? "+" : dW != null && dW < 0 ? "−" : ""}
        {dW != null ? `${formatVolume(Math.abs(dW))} kg` : ""} vs last session
      </>
    );

  const headlineMode =
    strengthLoggedSets.length > 0 && curW > 0 ? "volume" : "reps";
  const headlineNumber =
    headlineMode === "volume"
      ? formatVolume(curW)
      : formatVolume(workoutStats.totalReps || 0);
  const headlineUnit = headlineMode === "volume" ? "kg" : null;
  const headlineLabel =
    headlineMode === "volume" ? "Total volume lifted" : "Total reps";

  const prNames = personalRecords
    .map((pr: any) => pr.exercises?.name || pr.exercise?.name)
    .filter(Boolean) as string[];
  const prBannerTitle =
    prNames.length <= 2
      ? prNames.join(" & ")
      : `${prNames[0]}, ${prNames[1]} + ${prNames.length - 2} more`;

  const dSets =
    hasPrev && previousLogTotals
      ? workoutStats.totalSets - (previousLogTotals.total_sets_completed || 0)
      : null;
  const dReps =
    hasPrev && previousLogTotals
      ? workoutStats.totalReps - (previousLogTotals.total_reps_completed || 0)
      : null;

  const tierFrom = (d: number | null): "up" | "same" | "down" =>
    d == null || !hasPrev ? "same" : d > 0 ? "up" : d < 0 ? "down" : "same";

  const fmtSigned = (n: number) => (n > 0 ? `+${n}` : `${n}`);

  const prTile: TileStat = {
    value: prCount >= 1 ? prCount : "—",
    valueTone: prCount >= 1 ? "warn" : "muted",
    deltaTier: prCount >= 1 ? "up" : "none",
    deltaLabel: prCount >= 1 ? "new" : "none",
  };

  const setsTile: TileStat = {
    value: workoutStats.totalSets,
    valueTone: "default",
    deltaTier: !hasPrev ? "none" : tierFrom(dSets),
    deltaLabel:
      !hasPrev || dSets == null ? "none" : dSets === 0 ? "same" : fmtSigned(dSets),
  };

  const repsTile: TileStat = {
    value: workoutStats.totalReps,
    valueTone: "default",
    deltaTier: !hasPrev ? "none" : tierFrom(dReps),
    deltaLabel:
      !hasPrev || dReps == null ? "none" : dReps === 0 ? "same" : fmtSigned(dReps),
  };

  const coachNoteText = coachNoteFromWorkoutLog(
    workoutLog as Record<string, unknown> | null
  );

  const handleSetRpeUpdated = (setLogId: string, rpe: number) => {
    setBlockGroups((prev) =>
      prev.map((g) => ({
        ...g,
        sets: g.sets.map((s) => (s.id === setLogId ? { ...s, rpe } : s)),
      })),
    );
  };

  return (
    <ProtectedRoute requiredRole="client">
      <div
        className="relative min-h-screen w-full"
        style={{ background: "var(--fc-bg-deep)" }}
      >
        <ClientPageShell
          backdrop="none"
          className="min-h-screen max-w-lg lg:max-w-3xl mx-auto px-0 pt-0 overflow-x-hidden"
        >
          <div className={completeStyles.root}>
            <div className={completeStyles.pageStack}>
              <CelebrationHero
                accent={accent}
                title={heroTitle}
                workoutName={assignment?.name || "Workout"}
                durationParts={{ mins: dm, secs: ds }}
                dayLabel={dayLabelShort}
                headlineNumber={headlineNumber}
                headlineUnit={headlineUnit}
                headlineLabel={headlineLabel}
                deltaTier={volDeltaTier}
                deltaNode={volDeltaNode}
              />

              <CompleteStatsRow
                prTile={prTile}
                setsTile={setsTile}
                repsTile={repsTile}
                prHighlight={prCount >= 1}
              />

              {prCount >= 1 ? (
                <PrBanner
                  prCount={prCount}
                  titleLine={prBannerTitle}
                  onPress={() =>
                    router.push("/client/progress/personal-records")
                  }
                />
              ) : null}

              {coachNoteText ? (
                <CoachNoteBlock
                  coachFirstName={coachFirstName}
                  note={coachNoteText}
                />
              ) : null}

              {newAchievementsQueue.length > 0 ? (
                <div className={completeStyles.programCompact}>
                  <p className="text-xs font-semibold fc-text-primary">
                    New unlocks
                  </p>
                  <ul className="mt-1 space-y-1">
                    {newAchievementsQueue.map((ach) => (
                      <li
                        key={ach.id}
                        className="flex items-center gap-2 text-xs fc-text-dim"
                      >
                        <span>{ach.icon}</span>
                        <span className="fc-text-primary font-medium">
                          {ach.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {programProgression &&
                (programProgression.current_week_number != null ||
                  programProgression.current_day_number != null) && (
                  <div className={completeStyles.programCompact}>
                    <div className="mb-1 flex items-center gap-2">
                      <LayoutDashboard
                        className="w-4 h-4"
                        style={{ color: "var(--fc-accent)" }}
                      />
                      <Eyebrow
                        tone="dim"
                        density="section"
                        className="!mb-0 !font-bold"
                      >
                        Program
                      </Eyebrow>
                    </div>
                    <p className="text-sm font-semibold fc-text-primary">
                      Week {programProgression.current_week_number ?? "?"} Day{" "}
                      {programProgression.current_day_number ?? "?"}
                      {assignment?.name ? ` — ${assignment.name}` : ""} ✓
                    </p>
                    {programProgression.is_completed ? (
                      <p className="text-xs fc-text-dim mt-1">
                        Week complete! Next week unlocked.
                      </p>
                    ) : null}
                  </div>
                )}

              {nextWorkout ? (
                <div className={completeStyles.programCompact}>
                  <Eyebrow
                    tone="dim"
                    density="section"
                    className="!mb-1 !font-bold"
                  >
                    Up next
                  </Eyebrow>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold fc-text-primary truncate">
                      {nextWorkout.name ||
                        (nextWorkout.template as any)?.name ||
                        "Workout"}
                    </h3>
                    {nextWorkout.scheduled_date ? (
                      <div
                        className="font-mono text-xs flex-shrink-0"
                        style={{ color: "var(--fc-accent)" }}
                      >
                        {formatScheduledDate(nextWorkout.scheduled_date)}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {blockGroups.length > 0 ? (
                <WorkoutSummarySection
                  blockGroups={blockGroups}
                  prs={personalRecords}
                  prescribed={prescribedRpeMap}
                  onSetRpeUpdated={handleSetRpeUpdated}
                />
              ) : null}

              <StickyActionBar
                onDone={() => router.push("/client")}
                onViewPrHistory={() =>
                  router.push("/client/progress/personal-records")
                }
                disabled={completing}
              />
            </div>
          </div>
        </ClientPageShell>

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
      </div>
    </ProtectedRoute>
  );
}

export default function WorkoutComplete() {
  return (
    <Suspense
      fallback={
        <ProtectedRoute requiredRole="client">
          <div
            className="min-h-screen"
            style={{ background: "var(--fc-bg-deep)" }}
          >
            <ClientPageShell
              backdrop="none"
              className="max-w-lg lg:max-w-3xl mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 overflow-x-hidden"
            >
              <PageSkeleton variant="dashboard" />
            </ClientPageShell>
          </div>
        </ProtectedRoute>
      }
    >
      <WorkoutCompleteContent />
    </Suspense>
  );
}
