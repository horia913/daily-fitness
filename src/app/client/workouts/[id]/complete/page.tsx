"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Calendar as CalendarIcon,
  TrendingUp,
  Star,
  Home,
  Share2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import NotificationTriggers from "@/lib/notificationTriggers";
import { PersonalRecordsService } from "@/lib/progressTrackingService";
import { fetchApi } from "@/lib/apiClient";

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
  block_id: string;
  block_type: string;
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
  block_type: string;
  block_name?: string | null;
  block_order: number;
}

interface BlockGroup {
  block_id: string;
  block_type: string;
  block_name: string;
  block_order: number;
  sets: WorkoutSetLog[];
  exerciseNames: Map<string, string>;
  templateBlock?: any; // Store full template block data for blocks with no sets
}

export default function WorkoutComplete() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params.id as string;

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
  const [nextWorkout, setNextWorkout] = useState<any | null>(null);

  useEffect(() => {
    if (assignmentId) {
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
        });
    }
  }, [assignmentId]);

  useEffect(() => {
    const storedWorkoutLogId = localStorage.getItem("workoutLogIdForComplete");
    if (storedWorkoutLogId) {
      setWorkoutLogIdOverride(storedWorkoutLogId);
      localStorage.removeItem("workoutLogIdForComplete");
    }
    const storedWorkoutSessionId = localStorage.getItem(
      "workoutSessionIdForComplete"
    );
    if (storedWorkoutSessionId) {
      setWorkoutSessionIdOverride(storedWorkoutSessionId);
      localStorage.removeItem("workoutSessionIdForComplete");
    }
  }, []);

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

      let workoutLogId = workoutLog?.id;

      if (workoutLogId) {
        setWorkoutLogIdForSummary(workoutLogId);
      }

      if (!workoutLogId && effectiveAssignmentId) {
          const { data: newLog, error: createError } = await supabase
          .from("workout_logs")
          .insert([
            {
              client_id: user.id,
                workout_assignment_id: effectiveAssignmentId,
              started_at: new Date().toISOString(),
              completed_at: null,
            },
          ])
          .select("id")
          .single();

        if (!createError && newLog) {
          workoutLogId = newLog.id;
          setWorkoutLogIdForSummary(workoutLogId);
        }
      }

      if (workoutLogId) {
        // If workout is already completed, use existing data
        if (workoutLog?.completed_at) {
          setWorkoutStats({
            duration: workoutLog.total_duration_minutes || 0,
            totalSets: workoutLog.total_sets_completed || 0,
            totalReps: workoutLog.total_reps_completed || 0,
            totalWeight: workoutLog.total_weight_lifted || 0,
          });
          setWorkoutLog(workoutLog);
          await loadBlocksAndSets(workoutLogId, user.id);
              await loadBlocksAndSets(workoutLogId, user.id);
        } else {
          // Complete the workout
          const storedDuration = localStorage.getItem("workoutDurationMinutes");
          const durationMinutes = storedDuration
            ? parseInt(storedDuration, 10)
            : undefined;

          const completeResponse = await fetchApi("/api/complete-workout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              workout_log_id: workoutLogId,
              client_id: user.id,
              duration_minutes: durationMinutes,
              session_id: workoutSessionIdOverride, // M2: Link to workout_sessions for status update
            }),
          });

          if (storedDuration) {
            localStorage.removeItem("workoutDurationMinutes");
            localStorage.removeItem("workoutStartTime");
          }

          if (completeResponse.ok) {
            const result = await completeResponse.json();
            const updatedLog = result.workout_log || workoutLog;

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
              });

              setWorkoutLog(updatedLog);

              // Load blocks and sets
              await loadBlocksAndSets(workoutLogId, user.id);

              // Fetch personal records for this workout (optional)
              // Note: personal_records uses workout_assignment_id, not workout_log_id
              try {
                if (effectiveAssignmentId) {
                  const { data: prs } = await supabase
                    .from('personal_records')
                    .select(`
                      *,
                      exercise:exercises(id, name)
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
                console.log('Could not fetch personal records:', err);
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
                console.log('Could not fetch next workout:', err);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("❌ Error in updateWorkoutTotals:", error);
    }
  };

  const loadBlocksAndSets = async (workoutLogId: string, userId: string) => {
    try {
      console.log("📊 Loading blocks and sets for workout_log_id:", workoutLogId);
      // Get all set logs with special columns
      const { data: sets, error: setsError } = await supabase
        .from("workout_set_logs")
        .select(
          `
          id,
          workout_log_id,
          block_id,
          block_type,
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
        if (!set.block_id) return;
        let blockGroup = blocksMap.get(set.block_id);
        if (!blockGroup) {
          const fallbackOrder = blocksMap.size + 1;
          blockGroup = {
            block_id: set.block_id,
            block_type: set.block_type || "straight_set",
            block_name: `Block ${fallbackOrder}`,
            block_order: fallbackOrder,
            sets: [],
            exerciseNames: new Map<string, string>(),
            templateBlock: undefined,
          };
          blocksMap.set(set.block_id, blockGroup);
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
        .sort((a, b) => a.block_order - b.block_order);

      console.log("✅ Loaded blocks and sets:", {
        totalBlocks: blocksArray.length,
        blocks: blocksArray.map((b) => ({
          block_id: b.block_id,
          block_type: b.block_type,
          block_order: b.block_order,
          setCount: b.sets.length,
          exerciseCount: b.exerciseNames.size,
          hasTemplateBlock: !!b.templateBlock,
          templateExercisesCount: b.templateBlock?.exercises?.length || 0,
        })),
      });

      setBlockGroups(blocksArray);

      // Expand first block by default
      if (blocksArray.length > 0 && expandedBlocks.size === 0) {
        setExpandedBlocks(new Set([blocksArray[0].block_id]));
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

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
    } catch (error) {
      console.error("Error loading assignment:", error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const markWorkoutComplete = async () => {
    const targetAssignmentId = assignment?.id || resolvedAssignmentId || null;
    if (!assignment || !targetAssignmentId) return;

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

      // TASK C: If workout came from program_day_assignments, update it
      // Find program_day_assignments that references this workout_assignment_id
      const { data: programDayAssignment, error: programDayError } = await supabase
        .from("program_day_assignments")
        .select("id, program_assignment_id")
        .eq("workout_assignment_id", targetAssignmentId)
        .maybeSingle();

      if (programDayError) {
        console.warn("Error checking program_day_assignments:", programDayError);
      } else if (programDayAssignment) {
        // Verify this program_assignment belongs to the current user
        const { data: programAssignment, error: programAssignmentError } = await supabase
          .from("program_assignments")
          .select("id, client_id")
          .eq("id", programDayAssignment.program_assignment_id)
          .eq("client_id", user.id)
          .maybeSingle();

        if (programAssignmentError) {
          console.warn("Error verifying program_assignment ownership:", programAssignmentError);
        } else if (programAssignment) {
          // Update program_day_assignments.is_completed and completed_date
          const today = new Date().toISOString().split("T")[0]; // Date only, not timestamp
          const { error: programDayUpdateError } = await supabase
            .from("program_day_assignments")
            .update({
              is_completed: true,
              completed_date: today,
            })
            .eq("id", programDayAssignment.id);

          if (programDayUpdateError) {
            console.error("❌ Error updating program_day_assignments:", programDayUpdateError);
            // Don't throw - workout_assignments is already updated, this is secondary
          } else {
            console.log("✅ Updated program_day_assignments completion:", programDayAssignment.id);
          }
        }
      }

      if (assignment.name) {
        await NotificationTriggers.triggerWorkoutCompleted(
          assignment.name,
          workoutStats.duration || 45
        );
      }

      router.push("/client/workouts");
    } catch (error) {
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
    const blockType = templateBlock.block_type;

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
          <div className="relative z-10 min-h-screen px-4 pb-28 pt-20 sm:px-6 lg:px-10">
            <div className="mx-auto w-full max-w-4xl">
              <GlassCard elevation={1} className="fc-glass fc-card p-6 sm:p-10">
                <div className="animate-pulse space-y-4">
                  <div className="h-6 w-40 rounded-full bg-[color:var(--fc-glass-highlight)]" />
                  <div className="h-10 rounded-2xl bg-[color:var(--fc-glass-highlight)]" />
                  <div className="h-4 w-3/4 rounded-full bg-[color:var(--fc-glass-highlight)]" />
                </div>
              </GlassCard>
            </div>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  if (!assignment) {
    return (
      <ProtectedRoute requiredRole="client">
        <AnimatedBackground>
          <div className="relative z-10 min-h-screen px-4 pb-28 pt-20 sm:px-6 lg:px-10">
            <div className="mx-auto w-full max-w-4xl">
              <GlassCard
                elevation={1}
                className="fc-glass fc-card p-10 text-center"
              >
                <h3 className="text-xl font-semibold text-[color:var(--fc-text-primary)]">
                  Workout not found
                </h3>
                <p className="mt-2 text-sm text-[color:var(--fc-text-dim)]">
                  This workout does not exist or you do not have access to it.
                </p>
                <div className="mt-6 flex justify-center">
                  <Button
                    onClick={() => router.push("/client/workouts")}
                    variant="outline"
                    className="fc-btn fc-btn-secondary"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Workouts
                  </Button>
                </div>
              </GlassCard>
            </div>
          </div>
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

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        <div className="relative z-10 min-h-screen px-4 pb-28 pt-20 sm:px-6 lg:px-10">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
            <GlassCard elevation={2} className="fc-glass fc-card fc-card-hero p-6 sm:p-10">
              <div className="flex flex-col items-center text-center gap-4">
                <span className="fc-badge fc-glass-soft px-3 py-1 text-[color:var(--fc-text-primary)]">
                  Session verified
                </span>
                <h1 className="text-4xl sm:text-6xl font-black tracking-tight bg-[linear-gradient(180deg,var(--fc-text-primary),var(--fc-text-subtle))] text-transparent bg-clip-text">
                  {assignment.name || "Workout"}
                  <br />
                  Complete
                </h1>
                <div className="flex flex-wrap items-center justify-center gap-4 text-xs uppercase tracking-[0.2em] text-[color:var(--fc-text-subtle)]">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-[color:var(--fc-status-success)]" />
                    Session complete
                  </span>
                  {completedDate && (
                    <span className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-[color:var(--fc-text-dim)]" />
                      {formatDate(completedDate)}
                    </span>
                  )}
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[color:var(--fc-domain-workouts)]" />
                    {workoutStats.totalReps} reps
                  </span>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
                <GlassCard elevation={1} className="fc-glass fc-card p-4 sm:p-6">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[color:var(--fc-text-subtle)]">
                    <span>Duration</span>
                    <Clock className="h-4 w-4 text-[color:var(--fc-domain-workouts)]" />
                  </div>
                  <div className="mt-3 text-3xl font-semibold text-[color:var(--fc-accent-cyan)] font-mono">
                    {formatDuration(workoutStats.duration)}
                  </div>
                </GlassCard>
                <GlassCard elevation={1} className="fc-glass fc-card p-4 sm:p-6">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[color:var(--fc-text-subtle)]">
                    <span>Sets crushed</span>
                    <CheckCircle className="h-4 w-4 text-[color:var(--fc-domain-workouts)]" />
                  </div>
                  <div className="mt-3 text-3xl font-semibold text-[color:var(--fc-accent-cyan)] font-mono">
                    {workoutStats.totalSets}
                  </div>
                </GlassCard>
                <GlassCard elevation={1} className="fc-glass fc-card p-4 sm:p-6">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[color:var(--fc-text-subtle)]">
                    <span>Volume lifted</span>
                    <BarChart3 className="h-4 w-4 text-[color:var(--fc-domain-workouts)]" />
                  </div>
                  <div className="mt-3 text-3xl font-semibold text-[color:var(--fc-accent-cyan)] font-mono">
                    {formatVolume(workoutStats.totalWeight)}
                    <span className="ml-2 text-sm text-[color:var(--fc-text-dim)]">KG</span>
                  </div>
                </GlassCard>
              </div>
            </GlassCard>

            {personalRecords.length > 0 && (
              <GlassCard
                elevation={2}
                className="fc-glass fc-card p-6 sm:p-8 relative overflow-hidden"
              >
                <div
                  className="pointer-events-none absolute -top-10 right-0 h-40 w-40 rounded-full opacity-50 blur-3xl"
                  style={{
                    background:
                      "radial-gradient(circle at top right, rgba(255, 61, 252, 0.25), transparent 65%)",
                  }}
                />
                <div className="relative z-10">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[color:var(--fc-accent-purple)] text-black shadow-[0_0_24px_rgba(124,58,237,0.45)]">
                      <Star className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-[color:var(--fc-text-primary)]">
                        Personal records achieved
                      </h2>
                      <p className="text-sm text-[color:var(--fc-text-dim)]">
                        You are stronger than you were {workoutStats.duration} minutes ago.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    {personalRecords.slice(0, 5).map((pr: any) => {
                      const exerciseName =
                        pr.exercise?.name || pr.exerciseName || "Exercise";
                      const recordType =
                        pr.record_type === "max_weight"
                          ? "1RM Strength Bloom"
                          : pr.record_type === "max_reps"
                          ? "Peak Volume Capacity"
                          : "Record";
                      const deltaValue =
                        pr.record_type === "max_weight"
                          ? `+${pr.weight_kg || pr.value || 0} kg`
                          : pr.record_type === "max_reps"
                          ? `+${pr.reps || pr.value || 0} Reps`
                          : `+${pr.value || 0}`;

                      return (
                        <div
                          key={pr.id}
                          className="fc-list-row flex items-center justify-between gap-4 px-4 py-3"
                        >
                          <div>
                            <h4 className="text-base font-semibold text-[color:var(--fc-text-primary)]">
                              {exerciseName}
                            </h4>
                            <p className="text-sm text-[color:var(--fc-text-dim)]">
                              {recordType}
                            </p>
                          </div>
                          <div className="font-mono text-sm font-semibold text-[color:var(--fc-accent-cyan)]">
                            {deltaValue}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </GlassCard>
            )}

            {nextWorkout && (
              <GlassCard elevation={2} className="fc-glass fc-card p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-[color:var(--fc-text-dim)]">
                      Up next in schedule
                    </p>
                    <h3 className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                      {nextWorkout.name ||
                        (nextWorkout.template as any)?.name ||
                        "Workout"}
                    </h3>
                  </div>
                  {nextWorkout.scheduled_date && (
                    <div className="font-mono text-xs uppercase tracking-[0.2em] text-[color:var(--fc-accent-cyan)]">
                      Scheduled for {formatScheduledDate(nextWorkout.scheduled_date)}
                    </div>
                  )}
                </div>
              </GlassCard>
            )}

            {blockGroups.length > 0 && (
              <section className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-[color:var(--fc-text-primary)]">
                      Workout breakdown
                    </h2>
                    <p className="text-sm text-[color:var(--fc-text-dim)]">
                      Review every block and logged set from today.
                    </p>
                  </div>
                  <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                    {blockGroups.length} blocks
                  </span>
                </div>

                <div className="space-y-3">
                  {blockGroups.map((block) => {
                    const isExpanded = expandedBlocks.has(block.block_id);
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
                      <GlassCard
                        key={block.block_id}
                        elevation={2}
                        className="fc-glass fc-card overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => toggleBlock(block.block_id)}
                          className="w-full p-5 text-left sm:p-6"
                        >
                          <div className="flex items-start gap-3">
                            {isExpanded ? (
                              <ChevronDown className="mt-1 h-5 w-5 text-[color:var(--fc-text-dim)]" />
                            ) : (
                              <ChevronUp className="mt-1 h-5 w-5 rotate-180 text-[color:var(--fc-text-dim)]" />
                            )}
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                                Block {block.block_order} •{" "}
                                {formatBlockType(block.block_type).toUpperCase()}
                                {setCount > 0 &&
                                  ` (${setCount} ${setCount === 1 ? "set" : "sets"})`}
                              </h3>
                              <p className="text-sm text-[color:var(--fc-text-dim)]">
                                {exerciseNamesDisplay}
                              </p>
                            </div>
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="border-t border-[color:var(--fc-glass-border)] px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
                            <div className="flex flex-col gap-3">
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
                                      className="border-l-2 border-[color:var(--fc-glass-border)] pl-4"
                                    >
                                      {renderSetDisplay(
                                        set,
                                        block.block_type,
                                        block.exerciseNames
                                      )}
                                    </div>
                                  ))
                              )}
                            </div>
                          </div>
                        )}
                      </GlassCard>
                    );
                  })}
                </div>
              </section>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                onClick={() => router.push("/client")}
                className="fc-btn fc-btn-primary flex w-full items-center justify-center gap-3 px-6 py-4 text-sm uppercase tracking-[0.2em] sm:w-auto"
                disabled={completing}
              >
                Return to Dashboard
                <Home className="h-4 w-4" />
              </button>
              <button
                className="fc-btn fc-btn-secondary flex items-center justify-center gap-2 px-5 py-3 text-sm"
                type="button"
              >
                <Share2 className="h-4 w-4" />
                Share recap
              </button>
            </div>
          </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
