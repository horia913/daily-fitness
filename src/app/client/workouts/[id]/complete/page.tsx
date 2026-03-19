"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import {
  ClientPageShell,
  ClientGlassCard,
  SectionHeader,
  PrimaryButton,
  SecondaryButton,
} from "@/components/client-ui";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  ChevronDown,
  Star,
  Trophy,
  LayoutDashboard,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AchievementUnlockModal } from "@/components/ui/AchievementUnlockModal";
import type { Achievement } from "@/components/ui/AchievementCard";
import NotificationTriggers from "@/lib/notificationTriggers";
import { PersonalRecordsService } from "@/lib/progressTrackingService";
import { fetchApi } from "@/lib/apiClient";
import { withTimeout } from "@/lib/withTimeout";
import { useToast } from "@/components/ui/toast-provider";

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

export default function WorkoutComplete() {
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
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
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
  useEffect(() => {
    if (!assignmentId) return;
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
            assignmentData.id
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
      });
    return () => {
      if (completeTimeoutRef.current) {
        clearTimeout(completeTimeoutRef.current);
        completeTimeoutRef.current = null;
      }
    };
  }, [assignmentId]);

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

  useEffect(() => {
    if (workoutLogIdOverride) {
      updateWorkoutTotals(
        assignment?.workout_template_id || null,
        assignment?.id || null,
        workoutLogIdOverride
      ).catch((error) => {
        console.error("Error loading workout totals from workout_log_id:", error);
      });
    }
  }, [workoutLogIdOverride, assignment]);

  const updateWorkoutTotals = async (
    templateId: string | null = null,
    assignmentIdOverride: string | null = null,
    workoutLogIdOverrideParam: string | null = null
  ) => {
    // Guard: only run once per page load to prevent state overwrites
    if (completionDoneRef.current) {
      return;
    }

    const effectiveAssignmentId =
      assignmentIdOverride || resolvedAssignmentId || assignment?.id || null;
    const effectiveWorkoutLogId =
      workoutLogIdOverrideParam || workoutLogIdOverride || null;
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
          .select(
            "id, started_at, completed_at, total_duration_minutes, total_sets_completed, total_reps_completed, total_weight_lifted"
          )
          .eq("id", effectiveWorkoutLogId)
          .eq("client_id", user.id)
          .maybeSingle();
        workoutLog = logById;
      }

      if (!workoutLog && workoutSessionIdOverride) {
        const { data: logBySession } = await supabase
          .from("workout_logs")
          .select(
            "id, started_at, completed_at, total_duration_minutes, total_sets_completed, total_reps_completed, total_weight_lifted"
          )
          .eq("workout_session_id", workoutSessionIdOverride)
          .eq("client_id", user.id)
          .maybeSingle();
        workoutLog = logBySession;
      }

      if (!workoutLog && effectiveAssignmentId) {
        const { data: completedLog } = await supabase
          .from("workout_logs")
          .select(
            "id, started_at, completed_at, total_duration_minutes, total_sets_completed, total_reps_completed, total_weight_lifted"
          )
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
            .select(
              "id, started_at, completed_at, total_duration_minutes, total_sets_completed, total_reps_completed, total_weight_lifted"
            )
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
          .select(
            "id, started_at, completed_at, total_duration_minutes, total_sets_completed, total_reps_completed, total_weight_lifted"
          )
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
          await loadBlocksAndSets(workoutLogId, user.id);
          completionDoneRef.current = true;
        } else {
          // Complete the workout — duration already captured in state from localStorage
          console.log("[COMPLETE-FLOW] calling /api/complete-workout", {
            workout_log_id: workoutLogId,
            duration_minutes: storedDurationMinutes,
            session_id: workoutSessionIdOverride,
          });
          const completeResponse = await withTimeout(
            fetchApi("/api/complete-workout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                workout_log_id: workoutLogId,
                client_id: user.id,
                duration_minutes: storedDurationMinutes,
                session_id: workoutSessionIdOverride,
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
              const tierToRarity = (tier: string | null): Achievement["rarity"] => {
                if (!tier) return "uncommon";
                if (tier === "platinum") return "legendary";
                if (tier === "gold") return "epic";
                if (tier === "silver") return "rare";
                if (tier === "bronze") return "uncommon";
                return "common";
              };
              const mapped: Achievement[] = rawNew.map((a: any) => ({
                id: a.templateId ?? a.template_id,
                name: a.templateName ?? a.template_name ?? "Achievement",
                description: a.description ?? (a.nextTier ? `Next: ${a.nextTier?.label} — ${a.currentMetricValue ?? 0}/${a.nextTier?.threshold ?? 0}` : ""),
                icon: a.templateIcon ?? a.template_icon ?? "🏆",
                rarity: tierToRarity(a.tier),
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

              // Load blocks and sets
              await loadBlocksAndSets(workoutLogId, user.id);

              // Mark completion as done so duplicate effects don't overwrite state
              completionDoneRef.current = true;

              // Fetch personal records for this workout (optional)
              // Note: personal_records uses workout_assignment_id, not workout_log_id
              try {
                if (effectiveAssignmentId) {
                  const { data: prs } = await supabase
                    .from('personal_records')
                    .select(`
                      *,
                      exercises(id, name)
                    `)
                    .eq('client_id', user.id)
                    .eq('workout_assignment_id', effectiveAssignmentId)
                    .order('achieved_date', { ascending: false });
                  
                  if (prs && prs.length > 0) {
                    setPersonalRecords(prs);
                  }
                }
              } catch (err) {
                // Silently fail - this is optional data
                // Could not fetch personal records
              }

              // Try to fetch next workout (optional - don't block if it fails)
              try {
                const today = new Date().toISOString().split('T')[0];
                const { data: nextAssignment } = await supabase
                  .from('workout_assignments')
                  .select(`
                    id,
                    name,
                    scheduled_date,
                    workout_template_id,
                    template:workout_templates(name, description)
                  `)
                  .eq('client_id', user.id)
                  .in('status', ['assigned', 'active'])
                  .gte('scheduled_date', today)
                  .order('scheduled_date', { ascending: true })
                  .limit(1)
                  .maybeSingle();
                
                if (nextAssignment) {
                  setNextWorkout(nextAssignment);
                }
              } catch (err) {
                // Silently fail - this is optional data
                // Could not fetch next workout
              }
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

      // Expand first block by default
      if (blocksArray.length > 0 && expandedBlocks.size === 0) {
        setExpandedBlocks(new Set([blocksArray[0].set_entry_id]));
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

          const { data: assignmentData, error: assignmentError } = await supabase
            .from("workout_assignments")
            .select("*")
            .eq("id", actualAssignmentId)
            .eq("client_id", user.id)
            .maybeSingle();

          if (assignmentError) throw assignmentError;
          if (!assignmentData) throw new Error("Workout assignment not found");

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
    } finally {
      setLoading(false);
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

  const toggleBlock = (blockId: string) => {
    setExpandedBlocks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(blockId)) {
        newSet.delete(blockId);
      } else {
        newSet.add(blockId);
      }
      return newSet;
    });
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

      case "hr_sets":
        const hrExerciseName = set.exercise_id
          ? exerciseNames.get(set.exercise_id) || "Exercise"
          : "Exercise";
        return (
          <div className="text-sm">
            <span className="font-semibold">
              • {hrExerciseName} - Set {set.set_number || 1}: {set.weight || 0} kg ×{" "}
              {set.reps || 0} reps
            </span>
          </div>
        );

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
          <ClientPageShell className="min-h-screen max-w-2xl pt-12">
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="fc-skeleton w-20 h-20 rounded-full mx-auto" />
                <div className="fc-skeleton h-8 w-64 rounded mx-auto" />
                <div className="fc-skeleton h-4 w-40 rounded mx-auto" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map(i => <div key={i} className="fc-skeleton h-28 rounded-2xl" />)}
              </div>
              <div className="fc-skeleton h-24 rounded-2xl" />
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
          <ClientPageShell className="min-h-screen max-w-2xl flex items-center justify-center min-h-[60vh]">
            <ClientGlassCard className="p-8 text-center w-full max-w-md">
              <p className="fc-text-dim mb-4">{loadError}</p>
              <div className="flex flex-wrap justify-center gap-3">
                <PrimaryButton
                  onClick={() => {
                    setLoadError(null);
                    setLoading(true);
                    loadAssignment()
                      .then(async (assignmentData: WorkoutAssignment | null) => {
                        if (assignmentData) {
                          await updateWorkoutTotals(
                            assignmentData.workout_template_id,
                            assignmentData.id
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
                >
                  Retry
                </PrimaryButton>
                <SecondaryButton
                  className="w-auto"
                  onClick={() => router.push("/client/train")}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Workouts
                </SecondaryButton>
              </div>
            </ClientGlassCard>
          </ClientPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  if (!assignment) {
    return (
      <ProtectedRoute requiredRole="client">
        <AnimatedBackground>
          <ClientPageShell className="min-h-screen max-w-2xl flex items-center justify-center min-h-[60vh]">
            <ClientGlassCard className="p-8 text-center w-full max-w-md">
              <h3 className="text-xl font-semibold fc-text-primary">
                Workout not found
              </h3>
              <p className="mt-2 text-sm fc-text-dim">
                This workout does not exist or you do not have access to it.
              </p>
              <div className="mt-6 flex justify-center">
                <SecondaryButton
                  className="w-auto"
                  onClick={() => router.push("/client/train")}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Workouts
                </SecondaryButton>
              </div>
            </ClientGlassCard>
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

  const totalExercises = blockGroups.reduce((s, g) => s + g.exerciseNames.size, 0);

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        <ClientPageShell className="min-h-screen max-w-2xl pb-40 flex flex-col gap-6">
            {/* Celebration Hero */}
            <header className="text-center pt-10 pb-6">
              <div className="mb-5 relative inline-block">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto" style={{ background: "color-mix(in srgb, var(--fc-status-success) 15%, transparent)" }}>
                  <Trophy className="w-10 h-10" style={{ color: "var(--fc-status-success)" }} />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "var(--fc-status-success)" }}>
                  <CheckCircle className="w-3.5 h-3.5 text-[color:var(--fc-text-primary)]" />
                </div>
              </div>
              <h1 className="text-2xl font-bold tracking-tight fc-text-primary mb-1">Workout Complete</h1>
              <div className="flex items-center justify-center gap-2 fc-text-dim font-mono text-sm">
                <Clock className="w-3.5 h-3.5" />
                <span>{Math.floor(workoutStats.duration || 0)}m {(Math.round(((workoutStats.duration || 0) % 1) * 60))}s</span>
              </div>
            </header>

            {/* Stats Strip */}
            <section>
              <div className="fc-stats-strip">
                <div className="fc-stats-strip-item">
                  <span className="fc-stats-strip-value" style={{ color: "var(--fc-status-error)" }}>{personalRecords.length}</span>
                  <span className="fc-stats-strip-label">PRs</span>
                </div>
                <div className="fc-stats-strip-item">
                  <span className="fc-stats-strip-value" style={{ color: "var(--fc-accent-cyan)" }}>{formatVolume(workoutStats.totalWeight)}</span>
                  <span className="fc-stats-strip-label">kg lifted</span>
                </div>
                <div className="fc-stats-strip-item">
                  <span className="fc-stats-strip-value" style={{ color: "var(--fc-status-success)" }}>{workoutStats.totalSets}</span>
                  <span className="fc-stats-strip-label">Sets</span>
                </div>
                <div className="fc-stats-strip-item">
                  <span className="fc-stats-strip-value" style={{ color: "var(--fc-status-warning)" }}>{workoutStats.totalReps}</span>
                  <span className="fc-stats-strip-label">Reps</span>
                </div>
              </div>
            </section>

            {/* Session Highlights Card */}
            {(personalRecords.length > 0 || newAchievementsQueue.length > 0) && (
              <div
                className="rounded-2xl p-[2px] overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, var(--fc-accent-purple), var(--fc-accent-cyan), var(--fc-status-warning))",
                }}
              >
                <ClientGlassCard className="p-5 !rounded-[14px]">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, var(--fc-accent-purple), var(--fc-accent-cyan))" }}
                    >
                      <Star className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold fc-text-primary">
                        Session Highlights
                      </h2>
                      <p className="text-xs fc-text-dim">
                        {[
                          personalRecords.length > 0 ? `${personalRecords.length} PR${personalRecords.length !== 1 ? "s" : ""}` : null,
                          newAchievementsQueue.length > 0 ? `${newAchievementsQueue.length} achievement${newAchievementsQueue.length !== 1 ? "s" : ""}` : null,
                        ].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {personalRecords.slice(0, 3).map((pr: any) => {
                      const exerciseName = pr.exercises?.name || pr.exercise?.name || "Exercise";
                      return (
                        <div
                          key={pr.id}
                          className="flex items-center gap-3 px-3 py-2 rounded-xl"
                          style={{ background: "var(--fc-surface-sunken)" }}
                        >
                          <Trophy className="h-4 w-4 flex-shrink-0" style={{ color: "var(--fc-status-warning)" }} />
                          <span className="text-sm font-semibold fc-text-primary truncate">{exerciseName}</span>
                          <span className="ml-auto text-sm font-bold font-mono flex-shrink-0" style={{ color: "var(--fc-status-success)" }}>
                            {pr.record_value} {pr.record_type === "weight" ? pr.record_unit || "kg" : "reps"}
                          </span>
                        </div>
                      );
                    })}
                    {personalRecords.length > 3 && (
                      <p className="text-xs fc-text-dim text-center">+{personalRecords.length - 3} more PRs</p>
                    )}
                    {newAchievementsQueue.map((ach) => (
                      <div
                        key={ach.id}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl"
                        style={{ background: "var(--fc-surface-sunken)" }}
                      >
                        <span className="text-lg flex-shrink-0">{ach.icon}</span>
                        <span className="text-sm font-semibold fc-text-primary truncate">{ach.name}</span>
                        <span
                          className="ml-auto text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                          style={{
                            background: "color-mix(in srgb, var(--fc-accent-purple) 15%, transparent)",
                            color: "var(--fc-accent-purple)",
                          }}
                        >
                          {ach.rarity}
                        </span>
                      </div>
                    ))}
                  </div>
                </ClientGlassCard>
              </div>
            )}

            {personalRecords.length > 0 && (
              <ClientGlassCard className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--fc-accent-purple) 20%, transparent)" }}>
                    <Trophy className="h-4 w-4" style={{ color: "var(--fc-accent-purple)" }} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold fc-text-primary">
                      PRs This Workout
                    </h2>
                    <p className="text-xs fc-text-dim">
                      {personalRecords.length} new {personalRecords.length === 1 ? "PR" : "PRs"} this session
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {personalRecords.slice(0, 5).map((pr: any) => {
                    const exerciseName =
                      pr.exercises?.name || pr.exercise?.name || "Exercise";
                    const improvement =
                      pr.previous_record_value != null
                        ? pr.record_value - pr.previous_record_value
                        : null;
                    const improvementStr =
                      improvement != null && improvement > 0
                        ? ` (+${improvement} ${pr.record_type === "weight" ? pr.record_unit || "kg" : "reps"})`
                        : "";
                    const valueStr =
                      pr.record_type === "weight"
                        ? `${pr.record_value || 0} ${pr.record_unit || "kg"}${improvementStr}`
                        : pr.record_type === "reps"
                        ? `${pr.record_value || 0} reps${improvementStr}`
                        : `${pr.record_value || 0} ${pr.record_unit || ""}${improvementStr}`;

                    return (
                      <div
                        key={pr.id}
                        className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl"
                        style={{ background: "var(--fc-surface-sunken)" }}
                      >
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold fc-text-primary truncate">
                            {exerciseName}
                          </h4>
                          <p className="text-xs fc-text-dim">
                            {pr.record_type === "weight" ? "Strength" : pr.record_type === "reps" ? "Volume" : "Record"}
                          </p>
                        </div>
                        <div className="font-mono text-sm font-bold flex-shrink-0 text-right" style={{ color: "var(--fc-status-success)" }}>
                          {valueStr}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ClientGlassCard>
            )}

            {programProgression &&
              (programProgression.current_week_number != null ||
                programProgression.current_day_number != null) && (
              <ClientGlassCard className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <LayoutDashboard className="w-4 h-4" style={{ color: "var(--fc-accent-cyan)" }} />
                  <p className="text-[10px] uppercase tracking-wider fc-text-dim font-bold">
                    Program
                  </p>
                </div>
                <p className="text-sm font-semibold fc-text-primary">
                  Week {programProgression.current_week_number ?? "?"} Day {programProgression.current_day_number ?? "?"}
                  {assignment?.name ? ` — ${assignment.name}` : ""} ✓
                </p>
                {programProgression.is_completed && (
                  <p className="text-xs fc-text-dim mt-1">
                    Week complete! Next week unlocked.
                  </p>
                )}
              </ClientGlassCard>
            )}

            {nextWorkout && (
              <ClientGlassCard className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider fc-text-dim font-bold mb-1">
                      Up Next
                    </p>
                    <h3 className="text-sm font-semibold fc-text-primary truncate">
                      {nextWorkout.name ||
                        (nextWorkout.template as any)?.name ||
                        "Workout"}
                    </h3>
                  </div>
                  {nextWorkout.scheduled_date && (
                    <div className="font-mono text-xs flex-shrink-0" style={{ color: "var(--fc-accent-cyan)" }}>
                      {formatScheduledDate(nextWorkout.scheduled_date)}
                    </div>
                  )}
                </div>
              </ClientGlassCard>
            )}

            {blockGroups.length > 0 && (
              <section className="space-y-3">
                <SectionHeader
                  title="Workout Summary"
                  action={
                    <span className="text-xs font-mono fc-text-dim">{totalExercises} exercises</span>
                  }
                />

                <div className="space-y-2">
                  {blockGroups.map((block) => {
                    const isExpanded = expandedBlocks.has(block.set_entry_id);
                    const setCount = block.sets.length;
                    const exerciseNamesList = Array.from(
                      block.exerciseNames.values()
                    );
                    const exerciseNamesDisplay =
                      exerciseNamesList.length > 0
                        ? exerciseNamesList.length === 1
                          ? exerciseNamesList[0]
                          : exerciseNamesList.join(" + ")
                        : "Exercise";

                    return (
                      <ClientGlassCard
                        key={block.set_entry_id}
                        className="overflow-hidden p-0"
                      >
                        <button
                          type="button"
                          onClick={() => toggleBlock(block.set_entry_id)}
                          className="w-full p-4 text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold fc-text-dim" style={{ background: "var(--fc-surface-sunken)" }}>
                              {String(block.set_order).padStart(2, "0")}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold fc-text-primary truncate">
                                  {formatBlockType(block.set_type)}
                                </h3>
                                {setCount > 0 && (
                                  <span className="text-xs fc-text-dim font-mono flex-shrink-0">
                                    {setCount} {setCount === 1 ? "set" : "sets"}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs fc-text-dim truncate">
                                {exerciseNamesDisplay}
                              </p>
                            </div>
                            <ChevronDown className={`w-4 h-4 fc-text-dim transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="border-t border-[color:var(--fc-surface-card-border)] px-4 pb-4 pt-3">
                            <div className="flex flex-col gap-2">
                              {block.sets.length === 0 ? (
                                renderTemplateExercises(block, block.exerciseNames)
                              ) : (
                                block.sets
                                  .sort((a, b) => {
                                    if (a.set_number && b.set_number) {
                                      return a.set_number - b.set_number;
                                    }
                                    if (a.set_number) return -1;
                                    if (b.set_number) return 1;
                                    return (
                                      new Date(a.completed_at).getTime() -
                                      new Date(b.completed_at).getTime()
                                    );
                                  })
                                  .map((set) => (
                                    <div
                                      key={set.id}
                                      className="border-l-2 pl-3" style={{ borderColor: "var(--fc-surface-card-border)" }}
                                    >
                                      {renderSetDisplay(
                                        set,
                                        block.set_type,
                                        block.exerciseNames
                                      )}
                                    </div>
                                  ))
                              )}
                            </div>
                          </div>
                        )}
                      </ClientGlassCard>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Spacer for floating button */}
            <div className="h-20" />

            {/* Floating Bottom Action */}
            <div className="fixed bottom-20 left-0 right-0 px-4 z-50">
              <div className="max-w-2xl mx-auto">
                <PrimaryButton
                  onClick={() => router.push("/client")}
                  disabled={completing}
                  className="h-14 rounded-2xl gap-3 font-bold text-base uppercase tracking-wider shadow-lg"
                >
                  <LayoutDashboard className="w-5 h-5" />
                  Back to Dashboard
                </PrimaryButton>
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
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
