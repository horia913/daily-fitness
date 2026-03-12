"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  MoreHorizontal,
  Clock,
  Target,
  TrendingUp,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Share2,
  FileText,
  Repeat2,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { WorkoutBlockService } from "@/lib/workoutBlockService";

interface WorkoutSet {
  id: string;
  set_entry_id: string;
  set_type: string;
  exercise_id: string;
  weight: number | null;
  reps: number | null;
  rpe?: number | null;
  set_number?: number | null;
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
  rest_pause_duration?: number | null;
  max_rest_pauses?: number | null;

  cluster_number?: number | null;

  tabata_rounds_completed?: number | null;
  tabata_total_duration_sec?: number | null;

  preexhaust_isolation_exercise_id?: string | null;
  preexhaust_isolation_weight?: number | null;
  preexhaust_isolation_reps?: number | null;
  preexhaust_compound_exercise_id?: string | null;
  preexhaust_compound_weight?: number | null;
  preexhaust_compound_reps?: number | null;

  exercise?: {
    id: string;
    name: string;
    category: string | null;
  };

  // For superset/pre-exhaustion exercise names
  exercise_a?: { id: string; name: string };
  exercise_b?: { id: string; name: string };
  isolation_exercise?: { id: string; name: string };
  compound_exercise?: { id: string; name: string };
}

interface BlockGroup {
  set_entry_id: string;
  set_type: string;
  set_name?: string;
  set_order?: number;
  sets: WorkoutSet[];
  exercises: Map<
    string,
    {
      exercise_id: string;
      exercise_name: string;
      sets: WorkoutSet[];
      totalReps: number;
      totalWeight: number;
    }
  >;
  totalSets: number;
  totalReps: number;
  totalWeight: number;
  exerciseNames: Map<string, string>; // For template exercise names
  exerciseLetterMap: Map<string, string>; // Maps exercise_id to letter (A, B, C, D)
  templateBlock?: any; // Store full template block data for blocks with no sets
}

export default function WorkoutLogDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { performanceSettings } = useTheme();
  const workoutLogId = useMemo(() => String(params?.id || ""), [params?.id]);

  const [loading, setLoading] = useState(true);
  const [workoutLog, setWorkoutLog] = useState<any>(null);
  const [workoutName, setWorkoutName] = useState<string>("Workout");
  const [blockGroups, setBlockGroups] = useState<BlockGroup[]>([]);
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [totalStats, setTotalStats] = useState({
    totalSets: 0,
    totalReps: 0,
    totalWeight: 0,
    uniqueExercises: 0,
    duration: 0,
  });

  // Reset state when workoutLogId changes or component mounts
  useEffect(() => {
    if (workoutLogId) {
      setLoading(true);
      setWorkoutLog(null);
      setWorkoutName("Workout");
      setBlockGroups([]);
      setExpandedBlocks(new Set());
      setTotalStats({
        totalSets: 0,
        totalReps: 0,
        totalWeight: 0,
        uniqueExercises: 0,
        duration: 0,
      });
    }
  }, [workoutLogId]);

  const [loadError, setLoadError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (user && !authLoading && workoutLogId) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        setLoading(false);
        setLoadError("Loading took too long. Tap Retry to try again.");
      }, 20_000);
      loadWorkoutLog().finally(() => {
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
  }, [user, authLoading, workoutLogId]);

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

  const loadWorkoutLog = async () => {
    if (!user?.id || !workoutLogId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get the workout_log with totals
      const { data: log, error: logError } = await supabase
        .from("workout_logs")
        .select(
          "id, started_at, completed_at, total_duration_minutes, total_sets_completed, total_reps_completed, total_weight_lifted, workout_assignment_id"
        )
        .eq("id", workoutLogId)
        .eq("client_id", user.id)
        .single();

      if (logError || !log) {
        console.error("Error loading workout log:", logError);
        setLoading(false);
        return;
      }

      // Get workout template name
      let templateName = "Workout";
      if (log.workout_assignment_id) {
        const { data: assignment } = await supabase
          .from("workout_assignments")
          .select(
            `
            workout_template_id,
            workout_templates (
              id,
              name
            )
          `
          )
          .eq("id", log.workout_assignment_id)
          .single();

        if (assignment?.workout_templates) {
          templateName =
            (assignment.workout_templates as any).name || "Workout";
        }
      }
      setWorkoutName(templateName);

      // Get the workout assignment to find the template_id
      const { data: assignment } = await supabase
        .from("workout_assignments")
        .select("workout_template_id")
        .eq("id", log.workout_assignment_id)
        .single();

      if (!assignment?.workout_template_id) {
        console.error("No template_id found for assignment");
        setLoading(false);
        return;
      }

      // Get ALL blocks from the template with full exercise data using WorkoutBlockService
      const templateBlocks = await WorkoutBlockService.getWorkoutBlocks(
        assignment.workout_template_id
      );

      if (!templateBlocks || templateBlocks.length === 0) {
        console.error("No blocks found for template");
      }

      // Query sets with ALL special columns
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
          rpe,
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
          rest_pause_duration,
          max_rest_pauses,
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
            name,
            category
          )
        `
        )
        .eq("workout_log_id", workoutLogId)
        .eq("client_id", user.id)
        .order("completed_at", { ascending: true });

      if (setsError) {
        console.error("Error loading sets:", setsError);
        // Still show blocks even if sets fail to load
      }

      // Get exercise names for superset/pre-exhaustion/giant_set
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
        // Handle giant_set_exercises
        if (set.giant_set_exercises && Array.isArray(set.giant_set_exercises)) {
          set.giant_set_exercises.forEach((ex: any) => {
            if (ex.exercise_id) exerciseIds.add(ex.exercise_id);
          });
        }
      });

      const exerciseMap = new Map<string, string>();
      if (exerciseIds.size > 0) {
        const { data: exercises } = await supabase
          .from("exercises")
          .select("id, name")
          .in("id", Array.from(exerciseIds));

        exercises?.forEach((ex: any) => {
          exerciseMap.set(ex.id, ex.name);
        });
      }

      // Group sets by set_entry_id and populate exercise names from template
      const blocksMap = new Map<string, BlockGroup>();

      // First, create block groups for all blocks in the template (even if no sets)
      templateBlocks?.forEach((block) => {
        // Initialize exercise names map from template exercises
        const templateExerciseNames = new Map<string, string>();
        const exerciseLetterMap = new Map<string, string>();

        // Add exercise names and letter mapping from template block exercises (for all block types)
        if (block.exercises && Array.isArray(block.exercises)) {
          // Sort exercises by exercise_letter or exercise_order
          const sortedExercises = [...block.exercises].sort((a: any, b: any) => {
            if (a.exercise_letter && b.exercise_letter) {
              return a.exercise_letter.localeCompare(b.exercise_letter);
            }
            return (a.exercise_order || 0) - (b.exercise_order || 0);
          });

          sortedExercises.forEach((ex: any, index: number) => {
            if (ex.exercise_id && ex.exercise?.name) {
              templateExerciseNames.set(ex.exercise_id, ex.exercise.name);
              // Map exercise_id to letter (A, B, C, D, etc.)
              const letter = ex.exercise_letter || String.fromCharCode(65 + index); // 65 = 'A'
              exerciseLetterMap.set(ex.exercise_id, letter);
            }
          });
        }

        blocksMap.set(block.id, {
          set_entry_id: block.id,
          set_type: block.set_type || "unknown",
          set_name: block.set_name || `Set ${block.set_order || ""}`,
          set_order: block.set_order || 0,
          sets: [],
          exercises: new Map(),
          totalSets: 0,
          totalReps: 0,
          totalWeight: 0,
          exerciseNames: templateExerciseNames, // Initialize with template exercise names
          exerciseLetterMap: exerciseLetterMap, // Map exercise_id to letter
          templateBlock: block, // Store full template block data for displaying exercises when no sets logged
        });
      });

      // Then, add sets to their respective blocks
      sets?.forEach((set: any) => {
        if (!set.set_entry_id) return;

        const blockGroup = blocksMap.get(set.set_entry_id);
        if (!blockGroup) {
          console.warn("Set found for block not in template:", set.set_entry_id);
          return;
        }

        // Add exercise names for superset/pre-exhaustion
        if (set.superset_exercise_a_id) {
          set.exercise_a = {
            id: set.superset_exercise_a_id,
            name: exerciseMap.get(set.superset_exercise_a_id) || "Exercise A",
          };
        }
        if (set.superset_exercise_b_id) {
          set.exercise_b = {
            id: set.superset_exercise_b_id,
            name: exerciseMap.get(set.superset_exercise_b_id) || "Exercise B",
          };
        }
        if (set.preexhaust_isolation_exercise_id) {
          set.isolation_exercise = {
            id: set.preexhaust_isolation_exercise_id,
            name:
              exerciseMap.get(set.preexhaust_isolation_exercise_id) ||
              "Isolation",
          };
        }
        if (set.preexhaust_compound_exercise_id) {
          set.compound_exercise = {
            id: set.preexhaust_compound_exercise_id,
            name:
              exerciseMap.get(set.preexhaust_compound_exercise_id) ||
              "Compound",
          };
        }

        // Add set to block
        blockGroup.sets.push(set);
        blockGroup.totalSets += 1;
        blockGroup.totalReps += set.reps || 0;
        blockGroup.totalWeight += (set.weight || 0) * (set.reps || 0);

        // Add exercise names from logged sets (don't override template names)
        if (set.exercise_id) {
          if (
            set.exercises?.name &&
            !blockGroup.exerciseNames.has(set.exercise_id)
          ) {
            blockGroup.exerciseNames.set(set.exercise_id, set.exercises.name);
          } else if (
            exerciseMap.has(set.exercise_id) &&
            !blockGroup.exerciseNames.has(set.exercise_id)
          ) {
            blockGroup.exerciseNames.set(
              set.exercise_id,
              exerciseMap.get(set.exercise_id)!
            );
          }
        }

        // Group by exercise within block (skip for giant_set, superset, pre_exhaustion - they handle multiple exercises)
        // For these block types, we'll display all sets directly without grouping by exercise
        if (
          set.exercise_id &&
          !["giant_set", "superset", "pre_exhaustion"].includes(
            blockGroup.set_type
          )
        ) {
          const exerciseName =
            blockGroup.exerciseNames.get(set.exercise_id) ||
            set.exercises?.name ||
            "Unknown Exercise";
          let exerciseGroup = blockGroup.exercises.get(set.exercise_id);
          if (!exerciseGroup) {
            exerciseGroup = {
              exercise_id: set.exercise_id,
              exercise_name: exerciseName,
              sets: [],
              totalReps: 0,
              totalWeight: 0,
            };
            blockGroup.exercises.set(set.exercise_id, exerciseGroup);
          }
          exerciseGroup.sets.push(set);
          exerciseGroup.totalReps += set.reps || 0;
          exerciseGroup.totalWeight += (set.weight || 0) * (set.reps || 0);
        }

        // For giant_set, superset, pre_exhaustion - add exercise names from their specific fields
        if (
          blockGroup.set_type === "giant_set" &&
          set.giant_set_exercises &&
          Array.isArray(set.giant_set_exercises)
        ) {
          set.giant_set_exercises.forEach((ex: any) => {
            if (
              ex.exercise_id &&
              !blockGroup.exerciseNames.has(ex.exercise_id) &&
              exerciseMap.has(ex.exercise_id)
            ) {
              blockGroup.exerciseNames.set(
                ex.exercise_id,
                exerciseMap.get(ex.exercise_id)!
              );
            }
          });
        }
      });

      // Convert to array and sort by set_order - SHOW ALL SET ENTRIES (even if no sets)
      const blocksArray = Array.from(blocksMap.values()).sort(
        (a, b) => (a.set_order || 0) - (b.set_order || 0)
      );

      // Use totals from workout_log
      const totalSets = log.total_sets_completed || sets?.length || 0;
      const totalReps =
        log.total_reps_completed ||
        sets?.reduce((sum: number, set: any) => sum + (set.reps || 0), 0) ||
        0;
      const totalWeight =
        log.total_weight_lifted ||
        sets?.reduce(
          (sum: number, set: any) => sum + (set.weight || 0) * (set.reps || 0),
          0
        ) ||
        0;
      const uniqueExercises = new Set(
        sets?.map((s: any) => s.exercise_id).filter(Boolean) || []
      ).size;
      const duration = log.total_duration_minutes || 0;

      setWorkoutLog(log);
      setBlockGroups(blocksArray);
      setTotalStats({
        totalSets,
        totalReps,
        totalWeight,
        uniqueExercises,
        duration,
      });

      // Expand first block by default
      if (blocksArray.length > 0) {
        setExpandedBlocks(new Set([blocksArray[0].set_entry_id]));
      }
    } catch (error) {
      console.error("Error loading workout log:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatBlockType = (blockType: string) => {
    return blockType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const renderSetDisplay = (
    set: WorkoutSet,
    blockType: string,
    exerciseNames: Map<string, string>,
    exerciseLetterMap?: Map<string, string>
  ) => {
    switch (blockType) {
      case "amrap":
        return (
          <div className="text-sm">
            <span className="font-semibold">
              • Set {set.set_number || 1}:{" "}
              {set.weight || 0} kg × {set.amrap_total_reps || set.reps || 0}{" "}
              reps
              {set.rpe != null && ` @ RPE ${set.rpe}`}
            </span>
            {set.amrap_target_reps && (
              <span className="ml-2 text-[color:var(--fc-text-dim)]">
                (target: {set.amrap_target_reps} reps)
              </span>
            )}
            {set.amrap_duration_seconds !== null &&
              set.amrap_duration_seconds !== undefined && (
                <span className="ml-2 text-[color:var(--fc-text-dim)]">
                  (completed in{" "}
                  {Math.floor(set.amrap_duration_seconds / 60)
                    .toString()
                    .padStart(2, "0")}
                  :
                  {(set.amrap_duration_seconds % 60)
                    .toString()
                    .padStart(2, "0")}
                  )
                </span>
              )}
          </div>
        );

      case "for_time":
        const forTimeTaken = set.fortime_time_taken_sec
          ? `${Math.floor(set.fortime_time_taken_sec / 60)
              .toString()
              .padStart(2, "0")}:${(set.fortime_time_taken_sec % 60)
              .toString()
              .padStart(2, "0")}`
          : null;
        const forTimeCap = set.fortime_time_cap_sec
          ? `${Math.floor(set.fortime_time_cap_sec / 60)
              .toString()
              .padStart(2, "0")}:${(set.fortime_time_cap_sec % 60)
              .toString()
              .padStart(2, "0")}`
          : null;
        return (
          <div className="text-sm">
            <span className="font-semibold">
              • Set {set.set_number || 1}:{" "}
              {set.weight || 0} kg × {set.fortime_total_reps || set.reps || 0}{" "}
              reps
              {set.rpe != null && ` @ RPE ${set.rpe}`}
            </span>
            {forTimeTaken && (
              <span className="ml-2 text-[color:var(--fc-text-dim)]">
                (completed in {forTimeTaken}
                {forTimeCap ? ` / ${forTimeCap} cap` : ""})
              </span>
            )}
            {set.fortime_target_reps && (
              <span className="ml-2 text-[color:var(--fc-text-dim)]">
                (Target: {set.fortime_target_reps} reps)
              </span>
            )}
          </div>
        );

      case "drop_set":
      case "dropset":
        return (
          <div className="text-sm">
            <span className="font-semibold">
              • Set {set.set_number || 1}:{" "}
              {set.dropset_initial_weight || set.weight || 0} kg ×{" "}
              {set.dropset_initial_reps || set.reps || 0}
              {set.rpe != null && ` @ RPE ${set.rpe}`}
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
                    <span className="ml-2 text-[color:var(--fc-text-dim)]">
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
              • Set {set.set_number || 1}:{" "}
              {set.weight || 0} kg × {set.reps || 0} reps
              {set.rpe != null && ` @ RPE ${set.rpe}`}
            </span>
          </div>
        );

      case "superset":
        return (
          <div className="text-sm">
            <span className="font-semibold">
              • Set {set.set_number || 1}:{" "}
              <span className="text-[color:var(--fc-domain-workouts)]">A:</span>{" "}
              {set.superset_weight_a || set.weight || 0} kg ×{" "}
              {set.superset_reps_a || set.reps || 0} reps
              {set.rpe != null && ` @ RPE ${set.rpe}`}
            </span>
            {set.superset_weight_b !== null &&
              set.superset_weight_b !== undefined && (
                <>
                  <span className="mx-2">+</span>
                  <span className="font-semibold">
                    <span className="text-[color:var(--fc-domain-workouts)]">B:</span>{" "}
                    {set.superset_weight_b} kg ×{" "}
                    {set.superset_reps_b || 0} reps
                  </span>
                </>
              )}
          </div>
        );

      case "giant_set":
        if (set.giant_set_exercises && Array.isArray(set.giant_set_exercises)) {
          const exerciseElements = set.giant_set_exercises.map((ex: any, index: number) => {
            // Use exercise_letter from data if available, otherwise assign based on order
            const letter = ex.exercise_letter || 
              (exerciseLetterMap && ex.exercise_id ? exerciseLetterMap.get(ex.exercise_id) : null) ||
              String.fromCharCode(65 + index); // 65 = 'A'
            return (
              <span key={index}>
                {index > 0 && <span className="mx-1">+</span>}
                <span className="text-[color:var(--fc-domain-workouts)]">
                  {letter}:
                </span>{" "}
                {ex.weight || 0}kg×{ex.reps || 0}
              </span>
            );
          });
          return (
            <div className="text-sm font-semibold">
              • Round {set.set_number || 1}: {exerciseElements}
            </div>
          );
        } else {
          return (
            <div className="text-sm font-semibold">
              • Round {set.set_number || 1}: {set.weight || 0} kg × {set.reps || 0} reps
              {set.rpe != null && ` @ RPE ${set.rpe}`}
            </div>
          );
        }

      case "cluster_set":
        return (
          <div className="text-sm">
            <span className="font-semibold">
              • Cluster {set.cluster_number || 1}, Set {set.set_number || 1}:{" "}
              {set.weight || 0} kg × {set.reps || 0} reps
              {set.rpe != null && ` @ RPE ${set.rpe}`}
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
              {set.rpe != null && ` @ RPE ${set.rpe}`}
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
        return (
          <div className="text-sm">
            <span className="font-semibold">
              • Set {set.set_number || 1}:{" "}
              <span className="text-[color:var(--fc-domain-workouts)]">A:</span>{" "}
              {set.preexhaust_isolation_weight || 0} kg ×{" "}
              {set.preexhaust_isolation_reps || 0} reps
              {set.rpe != null && ` @ RPE ${set.rpe}`}
            </span>
            <span className="mx-2">→</span>
            <span className="font-semibold">
              <span className="text-[color:var(--fc-domain-workouts)]">B:</span>{" "}
              {set.preexhaust_compound_weight || 0} kg ×{" "}
              {set.preexhaust_compound_reps || 0} reps
            </span>
          </div>
        );

      case "emom":
        const emomDuration = set.emom_total_duration_sec
          ? `${Math.floor(set.emom_total_duration_sec / 60)
              .toString()
              .padStart(2, "0")}:${(set.emom_total_duration_sec % 60)
              .toString()
              .padStart(2, "0")}`
          : null;
        return (
          <div className="text-sm">
            <span className="font-semibold">
              • Minute{" "}
              {set.emom_minute_number || set.set_number || 1}:{" "}
              {set.emom_total_reps_this_min || set.reps || 0} reps
              {set.rpe != null && ` @ RPE ${set.rpe}`}
            </span>
            {emomDuration && (
              <span className="ml-2 text-[color:var(--fc-text-dim)]">
                (Duration: {emomDuration})
              </span>
            )}
          </div>
        );

      case "tabata":
        const tabataDuration = set.tabata_total_duration_sec
          ? `${Math.floor(set.tabata_total_duration_sec / 60)
              .toString()
              .padStart(2, "0")}:${(set.tabata_total_duration_sec % 60)
              .toString()
              .padStart(2, "0")}`
          : null;
        return (
          <div className="text-sm">
            <span className="font-semibold">
              • Round {set.set_number || 1}:{" "}
              {set.tabata_rounds_completed || 0} rounds completed
            </span>
            {tabataDuration && (
              <span className="ml-2 text-[color:var(--fc-text-dim)]">
                (Duration: {tabataDuration})
              </span>
            )}
          </div>
        );

      default:
        return (
          <div className="text-sm">
            <span className="font-semibold">
              • Set {set.set_number || 1}:{" "}
              {set.weight || 0} kg × {set.reps || 0} reps
              {set.rpe != null && ` @ RPE ${set.rpe}`}
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
      const restAfterSet =
        timeProtocols.find(
          (tp: any) =>
            tp.rest_after_set !== null &&
            tp.rest_after_set !== undefined &&
            tp.rest_after_set > 0
        )?.rest_after_set ||
        templateBlock.rest_seconds ||
        null;

      // Always use exerciseNames as primary source - it's populated from template and shows in header
      if (exerciseNames.size > 0) {
        // Group exercises by set number (Tabata organizes exercises into sets/rounds)
        const setsMap = new Map<
          number,
          Array<{
            exerciseId: string;
            exerciseName: string;
            work_seconds: number;
            rest_seconds: number;
            exercise_order: number;
          }>
        >();

        // First, get all unique set numbers
        const allSetNumbers = new Set<number>();
        timeProtocols.forEach((tp: any) => {
          if (tp.set !== null && tp.set !== undefined) {
            allSetNumbers.add(tp.set);
          }
        });

        // If no set numbers found, treat all exercises as set 1
        const setNumbers =
          allSetNumbers.size > 0
            ? Array.from(allSetNumbers).sort((a, b) => a - b)
            : [1];

        // Group exercises by their set number
        setNumbers.forEach((setNum) => {
          if (!setsMap.has(setNum)) {
            setsMap.set(setNum, []);
          }

          // Find all exercises that belong to this set
          timeProtocols.forEach((tp: any) => {
            const tpSet = tp.set !== null && tp.set !== undefined ? tp.set : 1;
            if (tpSet === setNum) {
              const exerciseName =
                exerciseNames.get(tp.exercise_id) || "Exercise";
              const existingInSet = setsMap
                .get(setNum)!
                .find((e) => e.exerciseId === tp.exercise_id);

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
                    <div
                      key={ex.exerciseId || idx}
                      className="text-sm ml-2 mb-1"
                    >
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
        const allExercises = Array.from(exerciseNames.entries())
          .map(([exerciseId, exerciseName]) => {
            const tp = timeProtocols.find(
              (t: any) => t.exercise_id === exerciseId
            );
            return {
              exerciseId,
              exerciseName,
              work_seconds: tp?.work_seconds ?? 20,
              rest_seconds: tp?.rest_seconds ?? 10,
              exercise_order: tp?.exercise_order ?? 1,
            };
          })
          .sort((a, b) => a.exercise_order - b.exercise_order);

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

  if (loadError) {
    return (
      <ProtectedRoute>
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 min-h-screen px-4 pb-32 pt-10 sm:px-6 lg:px-10">
            <div className="mx-auto w-full max-w-6xl">
              <div className="fc-surface p-8 rounded-2xl border border-[color:var(--fc-surface-card-border)] text-center">
                <p className="text-[color:var(--fc-text-dim)] mb-4">{loadError}</p>
                <button type="button" onClick={() => window.location.reload()} className="fc-btn fc-btn-secondary fc-press h-11 px-6 text-sm">Retry</button>
              </div>
            </div>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  if (authLoading || loading) {
    return (
      <ProtectedRoute>
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 min-h-screen px-4 pb-32 pt-10 sm:px-6 lg:px-10">
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

  if (!workoutLog) {
    return (
      <ProtectedRoute>
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 min-h-screen px-4 pb-32 pt-10 sm:px-6 lg:px-10">
            <div className="mx-auto w-full max-w-6xl">
              <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-12">
                <div className="text-center">
                  <p className="text-sm fc-text-dim">Workout log not found</p>
                  <Button
                    onClick={() => router.push("/client/progress/workout-logs")}
                    className="fc-btn fc-btn-secondary mt-4"
                  >
                    Back to Logs
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  const completedDate = workoutLog.completed_at
    ? new Date(workoutLog.completed_at)
    : workoutLog.started_at
    ? new Date(workoutLog.started_at)
    : null;

  const durationM = totalStats.duration;
  const durationStr =
    durationM >= 60
      ? `${Math.floor(durationM / 60)}h ${durationM % 60}m`
      : `${durationM}m`;

  return (
    <ProtectedRoute>
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 min-h-screen px-4 pb-36 pt-8 sm:px-6 lg:px-10 fc-page">
          <div className="mx-auto w-full max-w-3xl space-y-8">
            {/* Header: back, Session Review + date, more */}
            <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-4 sm:p-6 mb-6">
              <div className="flex items-center justify-between gap-4">
                <Link
                  href="/client/progress/workout-logs"
                  className="fc-surface w-11 h-11 flex items-center justify-center rounded-xl shrink-0 border border-[color:var(--fc-surface-card-border)]"
                  aria-label="Back to logs"
                >
                  <ChevronLeft className="w-5 h-5 text-[color:var(--fc-text-primary)]" />
                </Link>
                <div className="flex items-center gap-3 flex-1 min-w-0 justify-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--fc-aurora)]/20 text-[color:var(--fc-accent)] shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="text-center min-w-0">
                    <h1 className="text-sm font-bold uppercase tracking-[0.2em] text-[color:var(--fc-text-dim)]">
                      Session Review
                    </h1>
                    <p className="text-lg font-bold font-mono text-[color:var(--fc-text-primary)]">
                      {completedDate
                        ? completedDate.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="p-3 rounded-xl fc-glass border border-[color:var(--fc-glass-border)] hover:bg-[color:var(--fc-glass-highlight)] transition-colors shrink-0"
                  aria-label="More options"
                >
                  <MoreHorizontal className="w-6 h-6 text-[color:var(--fc-text-primary)]" />
                </button>
              </div>
            </div>

            {/* Workout Hero */}
            <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row justify-between gap-6 items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wider fc-status-success bg-[color:var(--fc-status-success)]/10 border border-[color:var(--fc-status-success)]/30">
                      Completed
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight fc-text-primary mb-2">
                    {workoutName}
                  </h2>
                  <p className="fc-text-dim flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 fc-text-workouts" />
                    {completedDate
                      ? completedDate.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : "—"}
                    {durationM > 0 && ` • ${durationStr}`}
                  </p>
                </div>
              </div>
              {/* Major Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8 pt-8 border-t border-[color:var(--fc-glass-border)]">
                <div>
                  <p className="text-xs fc-text-subtle uppercase font-bold tracking-widest mb-1">
                    Total Volume
                  </p>
                  <p className="text-xl font-bold font-mono fc-text-primary">
                    {totalStats.totalWeight.toLocaleString()}
                    <span className="text-sm ml-1 fc-text-dim">kg</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs fc-text-subtle uppercase font-bold tracking-widest mb-1">
                    Sets
                  </p>
                  <p className="text-xl font-bold font-mono fc-text-primary">
                    {totalStats.totalSets}
                  </p>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-xs fc-text-subtle uppercase font-bold tracking-widest mb-1">
                    Exercises
                  </p>
                  <p className="text-xl font-bold font-mono fc-text-primary">
                    {totalStats.uniqueExercises}
                    <span className="text-sm ml-1 fc-text-dim">Total</span>
                  </p>
                  <div className="flex gap-1 mt-2">
                    {Array.from({ length: Math.min(totalStats.uniqueExercises, 6) }).map(
                      (_, i) => (
                        <div
                          key={i}
                          className="h-1 flex-1 rounded-full bg-[color:var(--fc-status-success)]"
                        />
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Exercise Breakdown */}
            <section className="space-y-6">
              <h3 className="text-xl font-bold flex items-center gap-3 px-2 fc-text-primary">
                Exercise Breakdown
                <span className="h-px flex-1 bg-[color:var(--fc-glass-border)]" />
              </h3>
              {blockGroups.map((block, blockIndex) => {
                const isExpanded = expandedBlocks.has(block.set_entry_id);
                const hasSets = block.totalSets > 0;

                const firstExerciseName =
                  block.exerciseNames.size > 0
                    ? Array.from(block.exerciseNames.values())[0]
                    : formatBlockType(block.set_type);
                return (
                  <div
                    key={block.set_entry_id}
                    className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] overflow-visible"
                  >
                    <div
                      className="flex items-center justify-between p-6 cursor-pointer transition-colors hover:bg-[color:var(--fc-glass-soft)]/50 rounded-t-2xl"
                      onClick={() => toggleBlock(block.set_entry_id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[color:var(--fc-domain-workouts)]/10 flex items-center justify-center border border-[color:var(--fc-domain-workouts)]/20">
                          <Dumbbell className="w-6 h-6 fc-text-workouts" />
                        </div>
                        <div>
                          <h4 className="font-bold text-lg fc-text-primary">
                            {firstExerciseName}
                          </h4>
                          <p className="text-sm fc-text-dim">
                            {block.totalSets} sets • {formatBlockType(block.set_type)}
                          </p>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 fc-text-subtle" />
                      ) : (
                        <ChevronDown className="w-5 h-5 fc-text-subtle" />
                      )}
                    </div>
                    {isExpanded && (
                      <div className="px-6 pb-6 border-t border-[color:var(--fc-glass-border)]">
                        <div className="mt-4 space-y-2">
                          {block.sets.length === 0 ? (
                            // Display template exercise data when no sets are logged
                            renderTemplateExercises(block, block.exerciseNames)
                          ) : (
                            <div className="space-y-4">
                              {/* For giant_set, superset, pre_exhaustion - display all sets directly without grouping by exercise */}
                              {[
                                "giant_set",
                                "superset",
                                "pre_exhaustion",
                              ].includes(block.set_type) ? (
                                <div className="space-y-1">
                                  {block.sets
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
                                        className="pl-4 border-l-2 border-[color:var(--fc-glass-border)]"
                                      >
                                        {renderSetDisplay(
                                          set,
                                          block.set_type,
                                          block.exerciseNames,
                                          block.exerciseLetterMap
                                        )}
                                      </div>
                                    ))}
                                </div>
                              ) : (
                                // For other block types - group by exercise
                                <>
                                  {Array.from(block.exercises.values()).map(
                                    (exercise) => (
                                      <div key={exercise.exercise_id}>
                                        <h4 className="mb-2 font-semibold text-[color:var(--fc-text-primary)]">
                                          {exercise.exercise_name}
                                          <Link
                                            href={`/client/progress/analytics?exerciseId=${exercise.exercise_id}#strength-exercises`}
                                            className="ml-2 text-xs font-normal text-[color:var(--fc-accent)] hover:underline"
                                          >
                                            View progression
                                          </Link>
                                        </h4>
                                        <div className="space-y-1 ml-4">
                                          {exercise.sets
                                            .sort((a, b) => {
                                              if (
                                                a.set_number &&
                                                b.set_number
                                              ) {
                                                return (
                                                  a.set_number - b.set_number
                                                );
                                              }
                                              if (a.set_number) return -1;
                                              if (b.set_number) return 1;
                                              return (
                                                new Date(
                                                  a.completed_at
                                                ).getTime() -
                                                new Date(
                                                  b.completed_at
                                                ).getTime()
                                              );
                                            })
                                            .map((set) => (
                                              <div
                                                key={set.id}
                                                className="pl-4 border-l-2 border-[color:var(--fc-glass-border)]"
                                              >
                                                {renderSetDisplay(
                                                  set,
                                                  block.set_type,
                                                  block.exerciseNames
                                                )}
                                              </div>
                                            ))}
                                        </div>
                                      </div>
                                    )
                                  )}
                                  {/* Handle sets that might not be in exercises map */}
                                  {block.sets.filter(
                                    (set) =>
                                      set.exercise_id &&
                                      !block.exercises.has(set.exercise_id)
                                  ).length > 0 && (
                                    <div className="space-y-1 ml-4">
                                      {block.sets
                                        .filter(
                                          (set) =>
                                            set.exercise_id &&
                                            !block.exercises.has(
                                              set.exercise_id
                                            )
                                        )
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
                                            className="pl-4 border-l-2 border-[color:var(--fc-glass-border)]"
                                          >
                                            {renderSetDisplay(
                                              set,
                                              block.set_type,
                                              block.exerciseNames
                                            )}
                                          </div>
                                        ))}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </section>

            {/* Sticky footer: Repeat, Share, Export */}
            <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 z-50 bg-gradient-to-t from-[color:var(--fc-bg-base)] via-[color:var(--fc-bg-base)]/95 to-transparent backdrop-blur-sm">
              <div className="max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Button
                  onClick={() => router.push("/client/progress/workout-logs")}
                  className="fc-btn rounded-2xl h-12 font-bold gap-2 bg-[color:var(--fc-status-error)] hover:opacity-90 text-white border-0"
                >
                  <Repeat2 className="w-5 h-5" />
                  Repeat
                </Button>
                <button
                  type="button"
                  className="rounded-2xl h-12 fc-glass border border-[color:var(--fc-glass-border)] flex items-center justify-center gap-2 font-bold fc-text-primary hover:fc-glass-soft"
                >
                  <Share2 className="w-5 h-5 fc-text-workouts" />
                  Share
                </button>
                <button
                  type="button"
                  className="rounded-2xl h-12 fc-glass border border-[color:var(--fc-glass-border)] hidden sm:flex items-center justify-center gap-2 font-bold fc-text-dim hover:fc-glass-soft col-span-2 sm:col-span-1"
                >
                  <FileText className="w-5 h-5" />
                  Export PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
