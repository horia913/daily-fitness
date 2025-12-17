"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import NotificationTriggers from "@/lib/notificationTriggers";

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
}

export default function WorkoutComplete() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params.id as string;

  const [assignment, setAssignment] = useState<WorkoutAssignment | null>(null);
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

  useEffect(() => {
    if (assignmentId) {
      loadAssignment()
        .then(async (assignmentData: WorkoutAssignment | null) => {
          if (assignmentData) {
            await updateWorkoutTotals(assignmentData.workout_template_id);
          }
        })
        .catch((error) => {
          console.error("Error loading assignment:", error);
        });
    }
  }, [assignmentId]);

  const updateWorkoutTotals = async (templateId: string | null = null) => {
    if (!assignmentId) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.error("❌ User not authenticated");
        return;
      }

      // Find workout_log_id - first try completed, then active
      let workoutLog = null;
      const { data: completedLog } = await supabase
        .from("workout_logs")
        .select(
          "id, started_at, completed_at, total_duration_minutes, total_sets_completed, total_reps_completed, total_weight_lifted"
        )
        .eq("workout_assignment_id", assignmentId)
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
          .eq("workout_assignment_id", assignmentId)
          .eq("client_id", user.id)
          .is("completed_at", null)
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        workoutLog = activeLog;
      }

      let workoutLogId = workoutLog?.id;

      if (workoutLogId) {
        setWorkoutLogIdForSummary(workoutLogId);
      }

      if (!workoutLogId) {
        const { data: newLog, error: createError } = await supabase
          .from("workout_logs")
          .insert([
            {
              client_id: user.id,
              workout_assignment_id: assignmentId,
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
          await loadBlocksAndSets(
            workoutLogId,
            templateId || assignment?.workout_template_id || null,
            user.id
          );
        } else {
          // Complete the workout
          const storedDuration = localStorage.getItem("workoutDurationMinutes");
          const durationMinutes = storedDuration
            ? parseInt(storedDuration, 10)
            : undefined;

          const completeResponse = await fetch("/api/complete-workout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              workout_log_id: workoutLogId,
              client_id: user.id,
              duration_minutes: durationMinutes,
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
              await loadBlocksAndSets(
                workoutLogId,
                assignment?.workout_template_id || null,
                user.id
              );
            }
          }
        }
      }
    } catch (error) {
      console.error("❌ Error in updateWorkoutTotals:", error);
    }
  };

  const loadBlocksAndSets = async (
    workoutLogId: string,
    templateId: string | null,
    userId: string
  ) => {
    if (!templateId) {
      console.warn("⚠️ No template_id available, cannot load blocks and sets");
      return;
    }

    try {
      console.log(
        "📊 Loading blocks and sets for workout_log_id:",
        workoutLogId,
        "template_id:",
        templateId
      );
      // Get all blocks from template
      const { data: templateBlocks, error: blocksError } = await supabase
        .from("workout_blocks")
        .select("id, block_type, block_name, block_order")
        .eq("template_id", templateId)
        .order("block_order", { ascending: true });

      if (blocksError) {
        console.error("Error loading blocks:", blocksError);
        return;
      }

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

      // Group sets by block
      const blocksMap = new Map<string, BlockGroup>();

      templateBlocks?.forEach((block) => {
        blocksMap.set(block.id, {
          block_id: block.id,
          block_type: block.block_type || "straight_set",
          block_name: block.block_name || `Block ${block.block_order}`,
          block_order: block.block_order || 0,
          sets: [],
          exerciseNames: new Map(),
        });
      });

      sets?.forEach((set: any) => {
        if (!set.block_id) return;
        const blockGroup = blocksMap.get(set.block_id);
        if (!blockGroup) return;

        blockGroup.sets.push(set as WorkoutSetLog);
        if (set.exercise_id && set.exercises?.name) {
          blockGroup.exerciseNames.set(set.exercise_id, set.exercises.name);
        }
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
      });

      const blocksArray = Array.from(blocksMap.values())
        .filter((block) => block.sets.length > 0)
        .sort((a, b) => a.block_order - b.block_order);

      console.log("✅ Loaded blocks and sets:", {
        totalBlocks: blocksArray.length,
        blocks: blocksArray.map((b) => ({
          block_id: b.block_id,
          block_type: b.block_type,
          block_order: b.block_order,
          setCount: b.sets.length,
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

  const loadAssignment = async (): Promise<WorkoutAssignment | null> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: assignmentData, error: assignmentError } = await supabase
        .from("workout_assignments")
        .select("*")
        .eq("id", assignmentId)
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
    if (!assignment) return;

    setCompleting(true);
    try {
      await updateWorkoutTotals();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { error } = await supabase
        .from("workout_assignments")
        .update({
          status: "completed",
        })
        .eq("id", assignmentId);

      if (error) {
        console.error("❌ Error updating assignment status:", error);
        throw error;
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
        return (
          <div className="text-sm">
            <span className="font-semibold">
              • Set {set.set_number || 1}: {set.weight || 0} kg ×{" "}
              {set.amrap_total_reps || set.reps || 0} reps
            </span>
            {set.amrap_duration_seconds !== null &&
              set.amrap_duration_seconds !== undefined && (
                <span className="text-gray-600 ml-2">
                  (completed in {set.amrap_duration_seconds} sec)
                </span>
              )}
          </div>
        );

      case "for_time":
        return (
          <div className="text-sm">
            <span className="font-semibold">
              • Set {set.set_number || 1}: {set.weight || 0} kg ×{" "}
              {set.fortime_total_reps || set.reps || 0} reps
            </span>
            {set.fortime_time_taken_sec !== null &&
              set.fortime_time_taken_sec !== undefined && (
                <span className="text-gray-600 ml-2">
                  (completed in {set.fortime_time_taken_sec} sec
                  {set.fortime_time_cap_sec
                    ? ` / ${set.fortime_time_cap_sec} sec cap`
                    : ""}
                  )
                </span>
              )}
          </div>
        );

      case "drop_set":
        return (
          <div className="text-sm">
            <span className="font-semibold">
              • Set {set.set_number || 1}:{" "}
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
                  {set.dropset_percentage && (
                    <span className="text-gray-600 ml-2">
                      ({set.dropset_percentage}% drop)
                    </span>
                  )}
                </>
              )}
          </div>
        );

      case "straight_set":
        return (
          <div className="text-sm">
            <span className="font-semibold">
              • Set {set.set_number || 1}: {set.weight || 0} kg ×{" "}
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
            return `${ex.weight || 0}kg×${ex.reps || 0}`;
          });
          giantSetDisplay += `[${exercises.join(", ")}]`;
        } else {
          giantSetDisplay += `${set.weight || 0} kg × ${set.reps || 0} reps`;
        }
        return <div className="text-sm font-semibold">{giantSetDisplay}</div>;

      case "cluster_set":
        return (
          <div className="text-sm">
            <span className="font-semibold">
              • Cluster {set.rest_pause_number || 1}, Set {set.set_number || 1}:{" "}
              {set.weight || 0} kg × {set.reps || 0} reps
            </span>
          </div>
        );

      case "rest_pause":
        return (
          <div className="text-sm">
            <span className="font-semibold">
              • Set {set.set_number || 1}:{" "}
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
                  <span className="text-gray-600 ml-2">(after rest)</span>
                </>
              )}
          </div>
        );

      case "pre_exhaustion":
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
        return (
          <div className="text-sm">
            <span className="font-semibold">
              • Minute {set.emom_minute_number || set.set_number || 1}:{" "}
              {set.emom_total_reps_this_min || set.reps || 0} reps
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

  if (loading) {
    return (
      <ProtectedRoute requiredRole="client">
        <div className="p-4">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="animate-pulse">
                <div className="h-8 bg-slate-200 rounded mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!assignment) {
    return (
      <ProtectedRoute requiredRole="client">
        <div className="p-4">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
              <h3 className="text-lg font-medium text-slate-800 mb-2">
                Workout not found
              </h3>
              <p className="text-slate-500 mb-6">
                This workout doesn't exist or you don't have access to it.
              </p>
              <Button
                onClick={() => router.push("/client/workouts")}
                variant="outline"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Workouts
              </Button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const completedDate = workoutLog?.completed_at || workoutLog?.started_at;
  const completedDateFormatted = completedDate ? formatDate(completedDate) : "";

  return (
    <ProtectedRoute requiredRole="client">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="p-4">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Back Button */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/client/workouts")}
                className="rounded-2xl"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </div>

            {/* Header Card */}
            <GlassCard
              elevation={2}
              className="p-8 bg-gradient-to-br from-green-500 via-emerald-600 to-teal-700 border-0"
            >
              <div className="text-center text-white">
                <h1 className="text-3xl font-bold mb-2">
                  {assignment.name || "Workout"}
                </h1>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-lg">
                    Completed - {completedDateFormatted}
                  </span>
                </div>
                <div className="text-lg">
                  Duration: {workoutStats.duration} minutes
                </div>
              </div>
            </GlassCard>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <GlassCard elevation={2} className="p-6 text-center">
                <div className="text-3xl font-bold text-slate-800 mb-1">
                  {workoutStats.totalSets}
                </div>
                <div className="text-sm text-slate-500">SETS</div>
              </GlassCard>
              <GlassCard elevation={2} className="p-6 text-center">
                <div className="text-3xl font-bold text-slate-800 mb-1">
                  {workoutStats.totalReps}
                </div>
                <div className="text-sm text-slate-500">REPS</div>
              </GlassCard>
              <GlassCard elevation={2} className="p-6 text-center">
                <div className="text-3xl font-bold text-slate-800 mb-1">
                  {workoutStats.totalWeight}
                </div>
                <div className="text-sm text-slate-500">WEIGHT (kg)</div>
              </GlassCard>
              <GlassCard elevation={2} className="p-6 text-center">
                <div className="text-3xl font-bold text-slate-800 mb-1">
                  {workoutStats.duration}
                </div>
                <div className="text-sm text-slate-500">MINUTES</div>
              </GlassCard>
            </div>

            {/* Blocks Section */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-800 mb-4">
                Workout Blocks
              </h2>
              {blockGroups.length === 0 ? (
                <GlassCard elevation={2} className="p-8 text-center">
                  <p className="text-slate-500">
                    No sets logged for this workout.
                  </p>
                </GlassCard>
              ) : (
                blockGroups.map((block, index) => {
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
                      className="overflow-hidden"
                    >
                      <div
                        className="p-6 cursor-pointer hover:bg-slate-50/50 transition-colors"
                        onClick={() => toggleBlock(block.block_id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {isExpanded ? (
                                <ChevronDown className="w-5 h-5 text-slate-500" />
                              ) : (
                                <ChevronUp className="w-5 h-5 text-slate-500 rotate-180" />
                              )}
                              <h3 className="text-lg font-bold text-slate-800">
                                Block {block.block_order} -{" "}
                                {formatBlockType(
                                  block.block_type
                                ).toUpperCase()}{" "}
                                ({setCount} {setCount === 1 ? "set" : "sets"})
                              </h3>
                            </div>
                            <p className="text-sm text-gray-600 ml-8">
                              {exerciseNamesDisplay}
                            </p>
                          </div>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="px-6 pb-6 pt-0 border-t border-slate-200">
                          <div className="mt-4 space-y-2">
                            {block.sets
                              .sort((a, b) => {
                                // Sort by set_number first, then by completed_at
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
                              .map((set, setIndex) => (
                                <div
                                  key={set.id}
                                  className="pl-4 border-l-2 border-slate-200"
                                >
                                  {renderSetDisplay(
                                    set,
                                    block.block_type,
                                    block.exerciseNames
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </GlassCard>
                  );
                })
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
              <Button
                onClick={() => {
                  const logId = workoutLogIdForSummary;
                  if (logId) {
                    router.push(`/client/progress/workout-logs/${logId}`);
                  } else {
                    router.push("/client/progress");
                  }
                }}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl h-14 text-lg font-semibold shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-6 h-6" />
                  View Workout Log
                </div>
              </Button>

              <Button
                onClick={markWorkoutComplete}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-2xl h-14 text-lg font-semibold shadow-lg disabled:opacity-50"
                disabled={completing}
              >
                <div className="flex items-center gap-3">
                  {completing ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckCircle className="w-6 h-6" />
                  )}
                  {completing ? "Updating..." : "Back to Dashboard"}
                </div>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
