"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  MoreHorizontal,
  Clock,
  Layers,
  Dumbbell,
  Play,
  ChevronDown,
  History,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { useTheme } from "@/contexts/ThemeContext";
import { fetchPersonalRecords } from "@/lib/personalRecords";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/badge";

interface AssignmentInfo {
  id: string;
  name: string;
  description: string | null;
  scheduledDate: string | null;
  status: string | null;
  workoutTemplateId: string | null;
  category?: string | null;
  estimatedDuration?: number | null;
  currentWeek?: number | null;
}

interface PersonalRecord {
  id: string;
  exerciseName: string;
  record: string;
  date: string;
  weight: number;
  reps: number;
  isRecent: boolean;
}

interface ExerciseWithPR extends ClientExerciseDisplay {
  previousBest?: {
    weight: number;
    reps: number;
    record: string;
  } | null;
}

interface ClientExerciseDisplay {
  id: string;
  name: string;
  description: string;
  sets: number | null;
  reps: string | null;
  restSeconds: number | null;
  weightGuidance: string | null;
  loadPercentage: number | null;
  weight: number | null;
  orderIndex: number;
  blockName: string | null;
  blockType: string | null;
  exerciseLetter: string | null;
  notes: string | null;
  tempo: string | null;
  rir: number | null;
  raw?: ClientBlockExerciseRecord | null;
  meta?: Record<string, any> | null;
}

interface StructuredBlock {
  id: string;
  blockName: string | null;
  blockType: string | null;
  blockOrder: number;
  notes: string | null;
  exercises: ClientExerciseDisplay[];
  rawBlock: ClientBlockRecord;
  parameters?: Record<string, any> | null;
  displayType?: string;
}

type ClientBlockExerciseRecord = {
  id: string;
  exercise_id: string | null;
  exercise_order: number | null;
  exercise_letter: string | null;
  sets: number | null;
  reps: string | null;
  weight_kg: number | null;
  rir: number | null;
  tempo: string | null;
  rest_seconds: number | null;
  notes: string | null;
  [key: string]: any;
};

type ClientBlockRecord = {
  id: string;
  block_order: number | null;
  block_type: string | null;
  block_name: string | null;
  block_notes: string | null;
  total_sets: number | null;
  reps_per_set: string | null;
  rest_seconds: number | null;
  duration_seconds: number | null;
  exercises?: ClientBlockExerciseRecord[] | null;
  [key: string]: any;
};

const safeParse = (value: unknown) => {
  if (!value) return {};
  if (typeof value === "string") {
    // Skip parsing if it's clearly not JSON (like "test", "teest", etc.)
    const trimmed = value.trim();
    if (trimmed.length === 0) return {};
    // Only try to parse if it looks like JSON (starts with { or [)
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn("Failed to parse JSON value", value, error);
      return {};
    }
    }
    // If it's not JSON-like, return empty object
    return {};
  }
  if (typeof value === "object") {
    return (value as Record<string, any>) || {};
  }
  return {};
};

export default function WorkoutDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { isDark } = useTheme();
  const [assignment, setAssignment] = useState<AssignmentInfo | null>(null);
  const [blocks, setBlocks] = useState<StructuredBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([]);
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    if (!id) return;

    const load = async (assignmentId: string) => {
      setLoading(true);
      setError(null);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("User not authenticated");
        }

        console.log("WorkoutDetailsPage -> assignmentId param", assignmentId);
        console.log("WorkoutDetailsPage -> authenticated user", user?.id);

        let { data: assignmentRow, error: assignmentError } = await supabase
          .from("workout_assignments")
          .select(
            `
            id,
            name,
            description,
            scheduled_date,
            status,
            workout_template_id
          `
          )
          .eq("id", assignmentId)
          .eq("client_id", user.id)
          .maybeSingle();

        if (assignmentError) {
          console.error("Error fetching assignment:", assignmentError);
          throw new Error("Failed to load workout details");
        }

        if (!assignmentRow) {
          console.warn(
            "WorkoutDetailsPage -> assignment not found by ID, trying template fallback"
          );
          const { data: fallbackAssignment, error: fallbackError } =
            await supabase
              .from("workout_assignments")
              .select(
                `
              id,
              name,
              description,
              scheduled_date,
              status,
              workout_template_id
            `
              )
              .eq("workout_template_id", assignmentId)
              .eq("client_id", user.id)
              .order("created_at", { ascending: false })
              .maybeSingle();

          if (fallbackError) {
            console.error(
              "WorkoutDetailsPage -> fallback assignment error",
              fallbackError
            );
            throw new Error("Failed to load workout details");
          }

          if (!fallbackAssignment) {
            throw new Error("Workout assignment not found");
          }

          assignmentRow = fallbackAssignment;
        }

        // Fetch workout template to get category and estimated_duration
        let category: string | null = null;
        let estimatedDuration: number | null = null;
        if (assignmentRow.workout_template_id) {
          const { data: template } = await supabase
            .from("workout_templates")
            .select("category, estimated_duration")
            .eq("id", assignmentRow.workout_template_id)
            .maybeSingle();

          category = template?.category || null;
          estimatedDuration = template?.estimated_duration || null;
        }

        // Fetch program assignment progress to get current_week if part of a program
        let currentWeek: number | null = null;
        try {
          const { data: programProgress, error: programError } = await supabase
            .from("program_assignment_progress")
            .select("current_week")
            .eq("client_id", user.id)
            .eq("is_program_completed", false)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (programError) {
            // Silently fail - this is optional data
            console.warn(
              "Error fetching program assignment progress:",
              programError
            );
          } else {
            currentWeek = programProgress?.current_week || null;
          }
        } catch (programErr) {
          // Silently fail - this is optional data
          console.warn(
            "Error fetching program assignment progress:",
            programErr
          );
        }

        setAssignment({
          id: assignmentRow.id,
          name:
            assignmentRow.name && assignmentRow.name.trim().length > 0
              ? assignmentRow.name
              : "Workout",
          description: assignmentRow.description,
          scheduledDate: assignmentRow.scheduled_date,
          status: assignmentRow.status,
          workoutTemplateId: assignmentRow.workout_template_id,
          category,
          estimatedDuration,
          currentWeek,
        });

        // Fetch original blocks using workout_template_id from assignment
        if (!assignmentRow.workout_template_id) {
          throw new Error("Workout template ID not found in assignment");
        }

        // Use WorkoutBlockService to fetch blocks (handles RLS properly)
        const { WorkoutBlockService } = await import(
          "@/lib/workoutBlockService"
        );
        const workoutBlocks = await WorkoutBlockService.getWorkoutBlocks(
          assignmentRow.workout_template_id
        );

        if (!workoutBlocks || workoutBlocks.length === 0) {
          setBlocks([]);
          return;
        }

        // Debug: Log what WorkoutBlockService returns
        if (process.env.NODE_ENV !== "production") {
          console.log("WorkoutBlockService.getWorkoutBlocks() returned:", {
            blocksCount: workoutBlocks.length,
            firstBlock: workoutBlocks[0] ? {
              id: workoutBlocks[0].id,
              block_type: workoutBlocks[0].block_type,
              exercisesCount: workoutBlocks[0].exercises?.length || 0,
              firstExercise: workoutBlocks[0].exercises?.[0] ? {
                id: workoutBlocks[0].exercises[0].id,
                exercise_id: workoutBlocks[0].exercises[0].exercise_id,
                exercise_order: workoutBlocks[0].exercises[0].exercise_order,
                hasDropSets: !!workoutBlocks[0].exercises[0].drop_sets,
                dropSetsLength: workoutBlocks[0].exercises[0].drop_sets?.length || 0,
                hasClusterSets: !!workoutBlocks[0].exercises[0].cluster_sets,
                clusterSetsLength: workoutBlocks[0].exercises[0].cluster_sets?.length || 0,
                hasRestPauseSets: !!workoutBlocks[0].exercises[0].rest_pause_sets,
                restPauseSetsLength: workoutBlocks[0].exercises[0].rest_pause_sets?.length || 0,
                allKeys: Object.keys(workoutBlocks[0].exercises[0])
              } : null,
              timeProtocolsCount: workoutBlocks[0].time_protocols?.length || 0,
              timeProtocols: workoutBlocks[0].time_protocols
            } : null
          });
        }

        // Convert WorkoutBlock[] to ClientBlockRecord[] format, preserving special table data
        const clientBlocks: (ClientBlockRecord & { 
          time_protocols?: any[];
          exercises?: Array<any & {
            drop_sets?: any[];
            cluster_sets?: any[];
            rest_pause_sets?: any[];
            pyramid_sets?: any[];
            ladder_sets?: any[];
          }>;
        })[] = workoutBlocks.map(
          (block) => ({
          id: block.id,
          block_order: block.block_order,
          block_type: block.block_type,
          block_name: block.block_name ?? null,
          block_notes: block.block_notes ?? null,
          total_sets: block.total_sets ?? null,
          reps_per_set: block.reps_per_set ?? null,
          rest_seconds: block.rest_seconds ?? null,
          duration_seconds: block.duration_seconds ?? null,
          // Preserve special table data - ensure time_protocols is preserved
          time_protocols: (block as any).time_protocols ?? [],
          exercises: (block.exercises ?? []).map((ex) => ({
            id: ex.id,
            exercise_id: ex.exercise_id,
            exercise_order: ex.exercise_order,
            exercise_letter: ex.exercise_letter ?? null,
            sets: ex.sets ?? null,
            reps: ex.reps ?? null,
            weight_kg: ex.weight_kg ?? null,
            load_percentage: ex.load_percentage ?? null,
            rir: ex.rir ?? null,
            tempo: ex.tempo ?? null,
            rest_seconds: ex.rest_seconds ?? null,
            notes: ex.notes ?? null,
            // Superset and pre-exhaustion specific fields
            superset_reps: (ex as any).superset_reps ?? null,
            superset_load_percentage: (ex as any).superset_load_percentage ?? null,
            compound_reps: (ex as any).compound_reps ?? null,
            compound_load_percentage: (ex as any).compound_load_percentage ?? null,
            // Preserve special table data for each exercise
            drop_sets: ex.drop_sets ?? [],
            cluster_sets: ex.cluster_sets ?? [],
            rest_pause_sets: ex.rest_pause_sets ?? [],
            pyramid_sets: (ex as any).pyramid_sets ?? [],
            ladder_sets: (ex as any).ladder_sets ?? [],
            time_protocols: (ex as any).time_protocols ?? [], // For tabata/amrap/emom/for_time blocks
          })) as any[],
          })
        );
        if (clientBlocks.length === 0) {
          setBlocks([]);
          return;
        }

        const exerciseIds = Array.from(
          new Set(
            clientBlocks.flatMap((block) =>
              ((block.exercises ?? []) as any[])
                .map((exercise) => exercise.exercise_id)
                .filter((id): id is string => Boolean(id))
            )
          )
        );

        const exerciseMeta = new Map<
          string,
          { name: string; description: string }
        >();

        if (exerciseIds.length > 0) {
          const { data: exerciseDetails, error: exerciseDetailsError } =
            await supabase
              .from("exercises")
              .select("id, name, description")
              .in("id", exerciseIds);

          if (exerciseDetailsError) {
            console.error(
              "Error loading exercise metadata:",
              exerciseDetailsError
            );
          } else if (exerciseDetails) {
            exerciseDetails.forEach((detail) => {
              exerciseMeta.set(detail.id, {
                name: detail.name,
                description: detail.description ?? "",
              });
            });
          }
        }

        const structuredBlocks: StructuredBlock[] = clientBlocks
          .map((block) => {
            const blockParameters = safeParse(block.block_parameters);


            // Helper to filter out "test" values
            const filterTestValue = (
              value: string | null | undefined
            ): string | null => {
              if (!value) return null;
              const trimmed = value.trim();
              if (
                trimmed.toLowerCase() === "test" ||
                trimmed.toLowerCase() === "teest"
              ) {
                return null;
              }
              return trimmed;
            };

            // getWorkoutBlocks already creates exercises from time_protocols for time-based blocks
            // So we can use block.exercises for ALL block types
            const exercises = ((block.exercises ?? []) as any[])
              .map((exercise, index): ClientExerciseDisplay => {
                const meta = exercise.exercise_id
                  ? exerciseMeta.get(exercise.exercise_id)
                  : undefined;
                const parsedNotes = safeParse(exercise.notes);
                const orderIndex = Math.max(
                  0,
                  (typeof exercise.exercise_order === "number" &&
                  Number.isFinite(exercise.exercise_order)
                    ? exercise.exercise_order
                    : index + 1) - 1
                );

                // Get exercise name with filtering
                const exerciseName =
                  filterTestValue(meta?.name) ||
                  filterTestValue(exercise.exercise_letter) ||
                  `Exercise ${orderIndex + 1}`;

                return {
                  id: exercise.id,
                  name: exerciseName,
                  description: meta?.description || "",
                  sets: exercise.sets ?? block.total_sets ?? null,
                  reps: exercise.reps ?? block.reps_per_set ?? null,
                  restSeconds:
                    exercise.rest_seconds ?? block.rest_seconds ?? null,
                  weightGuidance:
                    exercise.weight_kg !== null &&
                    exercise.weight_kg !== undefined
                      ? `${exercise.weight_kg} kg`
                      : exercise.load_percentage !== null &&
                        exercise.load_percentage !== undefined
                      ? `${exercise.load_percentage}%`
                      : null,
                  loadPercentage: exercise.load_percentage ?? null,
                  weight: exercise.weight_kg ?? null,
                  orderIndex,
                  blockName: block.block_name,
                  blockType: block.block_type,
                  exerciseLetter: exercise.exercise_letter,
                  notes: filterTestValue(exercise.notes), // Filter out "test"
                  tempo: exercise.tempo ?? null,
                  rir: exercise.rir ?? null,
                  raw: exercise,
                  meta: parsedNotes,
                };
              })
              .sort((a, b) => a.orderIndex - b.orderIndex);

            // Filter exercises for pre_exhaustion (only 2: isolation + compound)
            let finalExercises = exercises;
            if (block.block_type === "pre_exhaustion") {
              // Pre exhaustion should only have 2 exercises: isolation (order 1) and compound (order 2)
              finalExercises = exercises
                .filter((ex) => ex.orderIndex < 2) // Only first 2 exercises
                .slice(0, 2); // Ensure max 2
            }

            return {
              id: block.id,
              blockName: block.block_name,
              blockType: block.block_type,
              blockOrder:
                typeof block.block_order === "number" &&
                Number.isFinite(block.block_order)
                  ? block.block_order
                  : Number.MAX_SAFE_INTEGER,
              notes: (() => {
                const filterTestValue = (
                  value: string | null | undefined
                ): string | null => {
                  if (!value) return null;
                  const trimmed = value.trim();
                  if (
                    trimmed.toLowerCase() === "test" ||
                    trimmed.toLowerCase() === "teest"
                  ) {
                    return null;
                  }
                  return trimmed;
                };
                return filterTestValue(block.block_notes);
              })(),
              exercises: finalExercises,
              rawBlock: {
                ...block,
                // Ensure time_protocols are preserved
                time_protocols: (block as any).time_protocols || [],
              },
              parameters: blockParameters,
            };
          })
          .sort((a, b) => a.blockOrder - b.blockOrder);

        if (process.env.NODE_ENV !== "production") {
          console.log(
            "WorkoutDetailsPage -> structuredBlocks",
            structuredBlocks
          );
        }

        setBlocks(structuredBlocks);

        // Fetch personal records for previous best performance
        try {
          const records = await fetchPersonalRecords(user.id);
          setPersonalRecords(records);
        } catch (prError) {
          console.log("Error loading personal records:", prError);
          setPersonalRecords([]);
        }
      } catch (loadError: any) {
        console.error("Error loading workout details:", loadError);
        setError(loadError?.message || "Failed to load workout details");
      } finally {
        setLoading(false);
      }
    };

    load(id as string).catch((loadError) => {
      console.error("Unexpected error loading workout details:", loadError);
      setError("Failed to load workout details");
      setLoading(false);
    });
  }, [id]);

  // Calculate stats
  const totalSets = useMemo(() => {
    return blocks.reduce((sum, block) => {
      return (
        sum +
        block.exercises.reduce((blockSum, ex) => blockSum + (ex.sets || 0), 0)
      );
    }, 0);
  }, [blocks]);

  const totalExercises = useMemo(() => {
    return blocks.reduce((sum, block) => sum + block.exercises.length, 0);
  }, [blocks]);

  // Get previous best for an exercise
  const getPreviousBest = (exerciseName: string) => {
    const record = personalRecords.find(
      (pr) => pr.exerciseName.toLowerCase() === exerciseName.toLowerCase()
    );
    if (record && record.weight > 0) {
      return {
        weight: record.weight,
        reps: record.reps,
        record: `${record.weight}kg × ${record.reps}`,
      };
    }
    return null;
  };

  // Toggle exercise expansion
  const toggleExercise = (exerciseId: string) => {
    setExpandedExercises((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(exerciseId)) {
        newSet.delete(exerciseId);
      } else {
        newSet.add(exerciseId);
      }
      return newSet;
    });
  };

  // Glass card style (matching mockup)
  const glassCardStyle: React.CSSProperties = {
    background: isDark
      ? "rgba(255, 255, 255, 0.03)"
      : "rgba(255, 255, 255, 0.4)",
    backdropFilter: "blur(12px) saturate(180%)",
    WebkitBackdropFilter: "blur(12px) saturate(180%)",
    border: `1px solid ${
      isDark ? "rgba(255, 255, 255, 0.125)" : "rgba(255, 255, 255, 0.2)"
    }`,
    borderRadius: "24px",
    boxShadow: isDark
      ? "0 4px 24px -1px rgba(0, 0, 0, 0.2), inset 0 0 20px 0 rgba(255, 255, 255, 0.02)"
      : "0 4px 24px -1px rgba(0, 0, 0, 0.1), inset 0 0 20px 0 rgba(255, 255, 255, 0.05)",
    transition: "all 0.4s cubic-bezier(0.23, 1, 0.32, 1)",
    position: "relative",
    overflow: "hidden",
  };

  if (loading) {
    return (
      <AnimatedBackground>
        <div className="relative z-10 min-h-screen px-5 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center rounded-3xl border border-white/20 bg-white/80 px-8 py-6 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/80">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4" />
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Loading workout details...
              </p>
            </div>
          </div>
        </div>
      </AnimatedBackground>
    );
  }

  if (error || !assignment) {
    return (
      <AnimatedBackground>
        <div className="relative z-10 min-h-screen px-5 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-4 rounded-3xl border border-white/20 bg-white/80 px-8 py-6 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/80">
              <p className="text-base font-semibold text-red-500">
                {error || "Workout not found"}
              </p>
              <button
                onClick={() => router.push("/client/workouts")}
                style={{
                  padding: "8px 16px",
                  borderRadius: "999px",
                  background: isDark
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.02)",
                  border: `1px solid ${
                    isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
                  }`,
                  color: isDark ? "#FFFFFF" : "#1A1A1A",
                  cursor: "pointer",
                }}
              >
                <ChevronLeft className="w-4 h-4 inline mr-2" />
                Go Back
              </button>
            </div>
          </div>
        </div>
      </AnimatedBackground>
    );
  }

  // Format reps for display
  const formatReps = (reps: string | null | undefined): string => {
    if (!reps) return "—";
    return reps;
  };

  // Get block type badge color (inline styles)
  const getBlockTypeBadgeColor = (blockType: string | null) => {
    if (!blockType) {
      return {
        bg: "rgba(59, 130, 246, 0.2)",
        text: "#3B82F6",
        border: "rgba(59, 130, 246, 0.2)",
      };
    }
    const type = blockType.toLowerCase();
    if (type.includes("superset")) {
      return {
        bg: "rgba(249, 115, 22, 0.2)",
        text: "#F97316",
        border: "rgba(249, 115, 22, 0.2)",
      };
    }
    if (type.includes("drop")) {
      return {
        bg: "rgba(168, 85, 247, 0.2)",
        text: "#A855F7",
        border: "rgba(168, 85, 247, 0.2)",
      };
    }
    if (type.includes("giant")) {
      return {
        bg: "rgba(239, 68, 68, 0.2)",
        text: "#EF4444",
        border: "rgba(239, 68, 68, 0.2)",
      };
    }
    if (type.includes("cluster")) {
      return {
        bg: "rgba(99, 102, 241, 0.2)",
        text: "#6366F1",
        border: "rgba(99, 102, 241, 0.2)",
      };
    }
    if (type.includes("rest_pause")) {
      return {
        bg: "rgba(20, 184, 166, 0.2)",
        text: "#14B8A6",
        border: "rgba(20, 184, 166, 0.2)",
      };
    }
    if (type.includes("pyramid")) {
      return {
        bg: "rgba(34, 197, 94, 0.2)",
        text: "#22C55E",
        border: "rgba(34, 197, 94, 0.2)",
      };
    }
    if (
      type.includes("amrap") ||
      type.includes("emom") ||
      type.includes("for_time") ||
      type.includes("tabata")
    ) {
      return {
        bg: "rgba(234, 179, 8, 0.2)",
        text: "#EAB308",
        border: "rgba(234, 179, 8, 0.2)",
      };
    }
    return {
      bg: "rgba(59, 130, 246, 0.2)",
      text: "#3B82F6",
      border: "rgba(59, 130, 246, 0.2)",
    };
  };

  // Format block type label
  const formatBlockTypeLabel = (
    blockType: string | null,
    exerciseLetter: string | null
  ): string => {
    if (!blockType) return "Straight Set";
    const formatted = blockType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    if (
      exerciseLetter &&
      (blockType === "superset" || blockType === "giant_set")
    ) {
      return `${formatted} ${exerciseLetter}`;
    }
    return formatted;
  };

  // Determine if block type uses Sets/Reps/Rest cards
  // Get exercise card fields based on block type and special table data
  // According to BLOCK_STORAGE_SCHEMA.md: Exercise cards show ALL USED fields from the relevant special table
  const getExerciseCardFields = (
    block: StructuredBlock,
    exercise: ClientExerciseDisplay
  ): { label: string; value: string }[] => {
    const blockType = (block.blockType || "").toLowerCase();
    const result: { label: string; value: string }[] = [];
    const exerciseRaw = exercise.raw;
    
    // 1. STRAIGHT SET, SUPERSET, GIANT SET, PRE-EXHAUSTION: from workout_block_exercises
    if (blockType === "straight_set" || blockType === "superset" || blockType === "giant_set" || blockType === "pre_exhaustion") {
      // USED: sets, reps
      // NOTE: rest_seconds is NOT shown on exercise cards for superset/giant_set/pre_exhaustion
      // because there's no rest between exercises - they're done back-to-back
      // Rest is shown in the block header (rest AFTER completing all exercises in the set)
      if (exercise.sets !== null && exercise.sets !== undefined) {
        result.push({ label: "Sets", value: `${exercise.sets}` });
      }
      if (exercise.reps) {
        result.push({ label: "Reps", value: formatReps(exercise.reps) });
      }
      // Only show rest_seconds for straight_set (rest between sets)
      if (blockType === "straight_set" && exercise.restSeconds !== null && exercise.restSeconds !== undefined) {
        result.push({ label: "Rest", value: `${exercise.restSeconds}s` });
      }
      
      // Show load_percentage or weight_kg
      // For SUPERSET/GIANT_SET/PRE_EXHAUSTION: Only show for FIRST exercise (orderIndex 0)
      // For second exercise, we show the specific load (superset_load_percentage/compound_load_percentage) below
      if (blockType === "straight_set" || 
          (blockType === "superset" && exercise.orderIndex === 0) ||
          (blockType === "giant_set" && exercise.orderIndex === 0) ||
          (blockType === "pre_exhaustion" && exercise.orderIndex === 0)) {
        if (exercise.loadPercentage !== null && exercise.loadPercentage !== undefined) {
          result.push({ label: "Load %", value: `${exercise.loadPercentage}%` });
        } else if (exercise.weight !== null && exercise.weight !== undefined) {
          result.push({ label: "Weight", value: `${exercise.weight} kg` });
        } else if (exerciseRaw?.load_percentage !== null && exerciseRaw?.load_percentage !== undefined) {
          result.push({ label: "Load %", value: `${exerciseRaw.load_percentage}%` });
        } else if (exerciseRaw?.weight_kg !== null && exerciseRaw?.weight_kg !== undefined) {
          result.push({ label: "Weight", value: `${exerciseRaw.weight_kg} kg` });
        }
      }
      
      // For SUPERSET: Show second exercise reps and load % (NOT the main load_percentage/weight_kg)
      if (blockType === "superset" && exercise.orderIndex === 1) {
        // Second exercise in superset
        if (exerciseRaw?.superset_reps) {
          result.push({ label: "Reps", value: formatReps(exerciseRaw.superset_reps) });
        }
        if (exerciseRaw?.superset_load_percentage !== null && exerciseRaw?.superset_load_percentage !== undefined) {
          result.push({ label: "Load %", value: `${exerciseRaw.superset_load_percentage}%` });
        } else if (exerciseRaw?.superset_weight_kg !== null && exerciseRaw?.superset_weight_kg !== undefined) {
          result.push({ label: "Weight", value: `${exerciseRaw.superset_weight_kg} kg` });
        }
      }
      
      // For GIANT_SET: Show load for each exercise (each has its own load_percentage/weight_kg)
      if (blockType === "giant_set" && exercise.orderIndex > 0) {
        // For exercises after the first one, show their individual load
        if (exercise.loadPercentage !== null && exercise.loadPercentage !== undefined) {
          result.push({ label: "Load %", value: `${exercise.loadPercentage}%` });
        } else if (exercise.weight !== null && exercise.weight !== undefined) {
          result.push({ label: "Weight", value: `${exercise.weight} kg` });
        } else if (exerciseRaw?.load_percentage !== null && exerciseRaw?.load_percentage !== undefined) {
          result.push({ label: "Load %", value: `${exerciseRaw.load_percentage}%` });
        } else if (exerciseRaw?.weight_kg !== null && exerciseRaw?.weight_kg !== undefined) {
          result.push({ label: "Weight", value: `${exerciseRaw.weight_kg} kg` });
        }
      }
      
      // For PRE_EXHAUSTION: Show compound exercise reps and load % (NOT the main load_percentage/weight_kg)
      if (blockType === "pre_exhaustion" && exercise.orderIndex === 1) {
        // Compound exercise (second exercise)
        if (exerciseRaw?.compound_reps) {
          result.push({ label: "Reps", value: formatReps(exerciseRaw.compound_reps) });
        }
        if (exerciseRaw?.compound_load_percentage !== null && exerciseRaw?.compound_load_percentage !== undefined) {
          result.push({ label: "Load %", value: `${exerciseRaw.compound_load_percentage}%` });
        } else if (exerciseRaw?.compound_weight_kg !== null && exerciseRaw?.compound_weight_kg !== undefined) {
          result.push({ label: "Weight", value: `${exerciseRaw.compound_weight_kg} kg` });
        }
      }
      
      // OPTIONAL: rir, tempo, notes (only if set)
      // For SUPERSET: RIR, tempo, notes only for exercise 1 (first exercise, orderIndex === 0)
      if (blockType === "superset") {
        if (exercise.orderIndex === 0) {
          // Only show RIR/tempo/notes for first exercise in superset
          if (exercise.rir !== null && exercise.rir !== undefined) {
            result.push({ label: "RIR", value: `${exercise.rir}` });
          }
          if (exercise.tempo) {
            result.push({ label: "Tempo", value: exercise.tempo });
          }
          if (exercise.notes) {
            result.push({ label: "Notes", value: exercise.notes });
          }
        }
      } else {
        // For all other block types, show RIR/tempo/notes for all exercises
        if (exercise.rir !== null && exercise.rir !== undefined) {
          result.push({ label: "RIR", value: `${exercise.rir}` });
        }
        if (exercise.tempo) {
          result.push({ label: "Tempo", value: exercise.tempo });
        }
        if (exercise.notes) {
          result.push({ label: "Notes", value: exercise.notes });
        }
      }
    }
    // 2. DROP SET: from workout_drop_sets
    else if (blockType === "drop_set") {
      // Show main exercise sets/reps first
      if (exercise.sets !== null && exercise.sets !== undefined) {
        result.push({ label: "Sets", value: `${exercise.sets}` });
      }
      if (exercise.reps) {
        result.push({ label: "Reps", value: formatReps(exercise.reps) });
      }
      
      // Check if drop_sets data exists (must be array with at least one item)
      const dropSets = exerciseRaw?.drop_sets;
      if (Array.isArray(dropSets) && dropSets.length > 0) {
        const dropSet = dropSets[0];
        // Calculate drop percentage from initial weight vs drop weight
        const initialWeight = exerciseRaw?.weight_kg || 0;
        const dropWeight = dropSet.weight_kg || 0;
        if (initialWeight > 0 && dropWeight > 0) {
          const dropPercentage = Math.round(((initialWeight - dropWeight) / initialWeight) * 100);
          result.push({ label: "Drop %", value: `${dropPercentage}%` });
        }
        // Drop set reps
        if (dropSet.reps) {
          result.push({ label: "Drop reps", value: formatReps(dropSet.reps) });
        }
        if (dropSet.rest_seconds !== null && dropSet.rest_seconds !== undefined) {
          result.push({ label: "Rest", value: `${dropSet.rest_seconds}s` });
        }
      }
      
      // Show load_percentage or weight_kg from workout_drop_sets (initial weight in drop_order=1)
      const firstDropSet = dropSets && dropSets.length > 0 
        ? dropSets.find((ds: any) => ds.drop_order === 1) || dropSets[0]
        : null;
      if (firstDropSet) {
        if (firstDropSet.load_percentage !== null && firstDropSet.load_percentage !== undefined) {
          result.push({ label: "Load %", value: `${firstDropSet.load_percentage}%` });
        } else if (exerciseRaw?.weight_kg !== null && exerciseRaw?.weight_kg !== undefined) {
          result.push({ label: "Weight", value: `${exerciseRaw.weight_kg} kg` });
        }
      }
      
      // If drop_sets is empty array or missing, just show the main sets/reps (no warning needed)
    }
    // 3. CLUSTER SET: from workout_cluster_sets
    else if (blockType === "cluster_set") {
      // Show main sets first
      if (exercise.sets !== null && exercise.sets !== undefined) {
        result.push({ label: "Sets", value: `${exercise.sets}` });
      }
      
      // Check if cluster_sets data exists (must be array with at least one item)
      const clusterSets = exerciseRaw?.cluster_sets;
      if (Array.isArray(clusterSets) && clusterSets.length > 0) {
        const clusterSet = clusterSets[0];
        // USED: reps_per_cluster, clusters_per_set, intra_cluster_rest
        if (clusterSet.reps_per_cluster !== null && clusterSet.reps_per_cluster !== undefined) {
          result.push({ label: "Reps/cluster", value: `${clusterSet.reps_per_cluster}` });
        }
        if (clusterSet.clusters_per_set !== null && clusterSet.clusters_per_set !== undefined) {
          result.push({ label: "Clusters/set", value: `${clusterSet.clusters_per_set}` });
        }
        if (clusterSet.intra_cluster_rest !== null && clusterSet.intra_cluster_rest !== undefined) {
          result.push({ label: "Intra-cluster rest", value: `${clusterSet.intra_cluster_rest}s` });
        }
        // Rest after set is shown in block header, not here
      }
      
      // Show load_percentage or weight_kg from workout_cluster_sets
      if (Array.isArray(clusterSets) && clusterSets.length > 0) {
        const clusterSet = clusterSets[0];
        if (clusterSet.load_percentage !== null && clusterSet.load_percentage !== undefined) {
          result.push({ label: "Load %", value: `${clusterSet.load_percentage}%` });
        } else if (clusterSet.weight_kg !== null && clusterSet.weight_kg !== undefined) {
          result.push({ label: "Weight", value: `${clusterSet.weight_kg} kg` });
        }
      }
      
      // If cluster_sets is empty array or missing, just show the main sets (no warning needed)
    }
    // 4. REST-PAUSE: from workout_rest_pause_sets (weight, duration, max_pauses) and workout_blocks (reps)
    else if (blockType === "rest_pause") {
      // Check if rest_pause_sets data exists (must be array with at least one item)
      const restPauseSets = exerciseRaw?.rest_pause_sets;
      if (Array.isArray(restPauseSets) && restPauseSets.length > 0) {
        const restPauseSet = restPauseSets[0];
        // USED: weight_kg (from workout_rest_pause_sets), reps (from workout_blocks.reps_per_set), rest_pause_duration, max_rest_pauses
        if (restPauseSet.weight_kg !== null && restPauseSet.weight_kg !== undefined) {
          result.push({ label: "Initial weight", value: `${restPauseSet.weight_kg} kg` });
        }
        // Reps are stored in workout_blocks.reps_per_set, not in workout_rest_pause_sets
        const rawBlock = block.rawBlock;
        if (rawBlock?.reps_per_set) {
          result.push({ label: "Initial reps", value: formatReps(rawBlock.reps_per_set) });
        }
        if (restPauseSet.rest_pause_duration !== null && restPauseSet.rest_pause_duration !== undefined) {
          result.push({ label: "Rest-pause", value: `${restPauseSet.rest_pause_duration}s` });
        }
        if (restPauseSet.max_rest_pauses !== null && restPauseSet.max_rest_pauses !== undefined) {
          result.push({ label: "Max pauses", value: `${restPauseSet.max_rest_pauses}` });
        }
        
        // Show load_percentage or weight_kg from workout_rest_pause_sets
        if (restPauseSet.load_percentage !== null && restPauseSet.load_percentage !== undefined) {
          result.push({ label: "Load %", value: `${restPauseSet.load_percentage}%` });
        } else if (restPauseSet.weight_kg !== null && restPauseSet.weight_kg !== undefined) {
          result.push({ label: "Weight", value: `${restPauseSet.weight_kg} kg` });
        }
      }
      // If rest_pause_sets is empty array or missing, show basic info from block (no warning needed)
    }
    // 5. PYRAMID SET: from workout_pyramid_sets (N rows - show all steps)
    else if (blockType === "pyramid_set" && exerciseRaw?.pyramid_sets && exerciseRaw.pyramid_sets.length > 0) {
      const pyramidSets = exerciseRaw.pyramid_sets;
      // Sort by pyramid_order
      const sortedSteps = [...pyramidSets].sort((a: any, b: any) => 
        (a.pyramid_order || 0) - (b.pyramid_order || 0)
      );
      // Show all pyramid steps
      sortedSteps.forEach((pyramidStep: any) => {
        // USED: pyramid_order, weight_kg, reps, rest_seconds
        if (pyramidStep.pyramid_order !== null && pyramidStep.pyramid_order !== undefined) {
          result.push({ label: `Step ${pyramidStep.pyramid_order}`, value: "" });
        }
        if (pyramidStep.weight_kg !== null && pyramidStep.weight_kg !== undefined) {
          result.push({ label: `Weight`, value: `${pyramidStep.weight_kg} kg` });
        }
        if (pyramidStep.reps) {
          result.push({ label: `Reps`, value: formatReps(pyramidStep.reps) });
        }
        if (pyramidStep.rest_seconds !== null && pyramidStep.rest_seconds !== undefined) {
          result.push({ label: `Rest`, value: `${pyramidStep.rest_seconds}s` });
        }
      });
    }
    // 6. LADDER SET: from workout_ladder_sets (N rows - show all steps)
    else if (blockType === "ladder" && exerciseRaw?.ladder_sets && exerciseRaw.ladder_sets.length > 0) {
      const ladderSets = exerciseRaw.ladder_sets;
      // Sort by ladder_order
      const sortedSteps = [...ladderSets].sort((a: any, b: any) => 
        (a.ladder_order || 0) - (b.ladder_order || 0)
      );
      // Show all ladder steps
      sortedSteps.forEach((ladderStep: any) => {
        // USED: ladder_order, weight_kg, reps, rest_seconds
        if (ladderStep.ladder_order !== null && ladderStep.ladder_order !== undefined) {
          result.push({ label: `Step ${ladderStep.ladder_order}`, value: "" });
        }
        if (ladderStep.weight_kg !== null && ladderStep.weight_kg !== undefined) {
          result.push({ label: `Weight`, value: `${ladderStep.weight_kg} kg` });
        }
        if (ladderStep.reps) {
          result.push({ label: `Reps`, value: formatReps(ladderStep.reps) });
        }
        if (ladderStep.rest_seconds !== null && ladderStep.rest_seconds !== undefined) {
          result.push({ label: `Rest`, value: `${ladderStep.rest_seconds}s` });
        }
      });
    }
    // 7-12. TIME-BASED BLOCKS: from workout_time_protocols (handled by getTimeBasedParameters)
    // These are handled separately below
    
    return result;
  };

  // Get block-specific parameters for display (shown in block header)
  // Shows ALL USED fields from workout_blocks ONLY (except relational IDs: id, template_id, block_order)
  // OPTIONAL fields (block_name, block_notes) only if they have values
  // According to BLOCK_STORAGE_SCHEMA.md: Block header shows workout_blocks data ONLY
  const getBlockParameters = (block: StructuredBlock) => {
    const blockType = (block.blockType || "").toLowerCase();
    const result: { label: string; value: string }[] = [];
    const rawBlock = block.rawBlock;
    
    // OPTIONAL: block_name (only if set)
    if (rawBlock?.block_name) {
      // block_name is displayed in the block title, not in parameters
    }
    
    // OPTIONAL: block_notes (only if set)
    // block_notes is displayed separately, not in parameters
    
    // USED: total_sets - for most blocks (except amrap, emom, for_time)
    if (rawBlock?.total_sets !== null && rawBlock?.total_sets !== undefined) {
      if (blockType === "tabata") {
        // For tabata, total_sets represents rounds
        result.push({ label: "Rounds", value: `${rawBlock.total_sets}` });
      } else if (blockType === "circuit") {
        result.push({ label: "Rounds", value: `${rawBlock.total_sets}` });
      } else if (blockType !== "amrap" && blockType !== "emom" && blockType !== "for_time") {
        result.push({ label: "Sets", value: `${rawBlock.total_sets}` });
      }
    }
    
    // USED: reps_per_set - for straight_set, drop_set, pyramid_set
    if (rawBlock?.reps_per_set && (blockType === "straight_set" || blockType === "drop_set" || blockType === "pyramid_set")) {
      result.push({ label: "Reps", value: formatReps(rawBlock.reps_per_set) });
    }
    
    // USED: rest_seconds - for most blocks (rest AFTER completing the set/block)
    if (rawBlock?.rest_seconds !== null && rawBlock?.rest_seconds !== undefined) {
      if (blockType === "superset" || blockType === "giant_set" || blockType === "pre_exhaustion") {
        result.push({ label: "Rest after set", value: `${rawBlock.rest_seconds}s` });
      } else if (blockType === "cluster_set" || blockType === "drop_set") {
        result.push({ label: "Rest after set", value: `${rawBlock.rest_seconds}s` });
      } else if (blockType === "straight_set" || blockType === "pyramid_set" || blockType === "ladder") {
        result.push({ label: "Rest between sets", value: `${rawBlock.rest_seconds}s` });
      } else if (blockType === "circuit") {
        result.push({ label: "Rest between rounds", value: `${rawBlock.rest_seconds}s` });
      }
      // rest_pause: rest_seconds is NOT SET in workout_blocks
      // amrap, emom, for_time: rest_seconds is NOT SET in workout_blocks
    }
    
    // For TABATA: Show rest_after_set from time_protocols (block-level field)
    if (blockType === "tabata") {
      const rawBlockWithProtocols = rawBlock as any;
      const tabataProtocol = rawBlockWithProtocols?.time_protocols?.find(
        (tp: any) => tp.protocol_type === 'tabata'
      );
      const restAfterSet = tabataProtocol?.rest_after_set;
      if (restAfterSet !== null && restAfterSet !== undefined) {
        result.push({ label: "Rest after set", value: `${restAfterSet}s` });
      }
    }
    
    // USED: duration_seconds - for amrap, emom
    if (rawBlock?.duration_seconds && (blockType === "amrap" || blockType === "emom")) {
      const durationMinutes = Math.floor(rawBlock.duration_seconds / 60);
      result.push({ label: "Duration", value: `${durationMinutes} min` });
    }

    return result;
  };

  // Get time-based parameters for display in exercise cards (for time-based blocks)
  // Reads from exercise-specific workout_time_protocols (one per exercise)
  // According to BLOCK_STORAGE_SCHEMA.md: Exercise cards show ALL USED fields from workout_time_protocols
  const getTimeBasedParameters = (
    block: StructuredBlock,
    exercise: ClientExerciseDisplay
  ) => {
    const params = block.parameters || {};
    const blockType = (block.blockType || "").toLowerCase();
    const result: { label: string; value: string }[] = [];

    // Get exercise-specific time protocol from workout_time_protocols
    const rawBlockWithProtocols = block.rawBlock as any;
    const allTimeProtocols = rawBlockWithProtocols?.time_protocols || [];
    
    // Find protocol matching exercise_id and exercise_order (1-indexed)
    const exerciseProtocol = allTimeProtocols.find(
      (tp: any) => {
        const matchesType = tp.protocol_type === blockType;
        const matchesExerciseId = tp.exercise_id === exercise.raw?.exercise_id;
        // exercise.orderIndex is 0-indexed, but exercise_order in DB is 1-indexed
        const matchesOrder = tp.exercise_order === (exercise.orderIndex + 1);
        return matchesType && matchesExerciseId && matchesOrder;
      }
    ) || allTimeProtocols.find(
      // Fallback: try to find by exercise_id only (for blocks with single exercise)
      (tp: any) => tp.protocol_type === blockType && tp.exercise_id === exercise.raw?.exercise_id
    ) || allTimeProtocols.find(
      // Final fallback: first protocol of matching type
      (tp: any) => tp.protocol_type === blockType
    );

    // Fallback for old data in block_parameters
    if (blockType === "amrap") {
      // USED: total_duration_minutes
      // OPTIONAL: target_reps (only if set)
      const duration = exerciseProtocol?.total_duration_minutes ||
          (block.rawBlock?.duration_seconds
            ? Math.floor(block.rawBlock.duration_seconds / 60)
          : null) ||
        params.amrap_duration ||
        params.duration_minutes;
      if (duration) {
        result.push({
          label: "Duration",
          value: `${duration} min`,
        });
      }
      // OPTIONAL: target_reps
      const targetReps = exerciseProtocol?.target_reps || params.target_reps;
      if (targetReps) {
        result.push({ label: "Target reps", value: `${targetReps}` });
      }
      
      // Show load_percentage or weight_kg from workout_time_protocols (for amrap)
      if (exerciseProtocol) {
        if (exerciseProtocol.load_percentage !== null && exerciseProtocol.load_percentage !== undefined) {
          result.push({ label: "Load %", value: `${exerciseProtocol.load_percentage}%` });
        } else if (exerciseProtocol.weight_kg !== null && exerciseProtocol.weight_kg !== undefined) {
          result.push({ label: "Weight", value: `${exerciseProtocol.weight_kg} kg` });
        }
      }
    } else if (blockType === "emom") {
      // USED: total_duration_minutes, work_seconds, rest_seconds, emom_mode
      // OPTIONAL: reps_per_round (only if set)
      const duration = exerciseProtocol?.total_duration_minutes ||
          (block.rawBlock?.duration_seconds
            ? Math.floor(block.rawBlock.duration_seconds / 60)
          : null) ||
        params.emom_duration ||
        params.duration_minutes;
      if (duration) {
        result.push({
          label: "Duration",
          value: `${duration} min`,
        });
      }
      
      // USED: emom_mode (time_based or rep_based)
      const emomMode = exerciseProtocol?.emom_mode;
      if (emomMode) {
        const modeLabel = emomMode === "rep_based" ? "Rep-based" : "Time-based";
        result.push({ label: "Mode", value: modeLabel });
      }
      
      // USED: work_seconds (for time-based EMOM)
      const workSeconds = exerciseProtocol?.work_seconds || params.work_seconds;
      if (workSeconds) {
        result.push({
          label: "Work interval",
          value: `${workSeconds}s`,
        });
      }
      // USED: rest_seconds
      const restSeconds = exerciseProtocol?.rest_seconds || params.rest_after;
      if (restSeconds) {
        result.push({
          label: "Rest interval",
          value: `${restSeconds}s`,
        });
      }
      // OPTIONAL: reps_per_round (for rep-based EMOM)
      const repsPerRound = exerciseProtocol?.reps_per_round || params.emom_reps;
      if (repsPerRound) {
        result.push({ label: "Reps per minute", value: `${repsPerRound}` });
      }
      
      // Show load_percentage or weight_kg from workout_time_protocols (for emom)
      if (exerciseProtocol) {
        if (exerciseProtocol.load_percentage !== null && exerciseProtocol.load_percentage !== undefined) {
          result.push({ label: "Load %", value: `${exerciseProtocol.load_percentage}%` });
        } else if (exerciseProtocol.weight_kg !== null && exerciseProtocol.weight_kg !== undefined) {
          result.push({ label: "Weight", value: `${exerciseProtocol.weight_kg} kg` });
        }
      }
    } else if (blockType === "for_time") {
      // OPTIONAL: time_cap_minutes (only if set)
      // OPTIONAL: target_reps (only if set)
      const timeCap = exerciseProtocol?.time_cap_minutes || 
        params.time_cap || 
        params.time_cap_minutes;
      if (timeCap) {
        result.push({
          label: "Time cap",
          value: `${timeCap} min`,
        });
      }
      const targetReps = exerciseProtocol?.target_reps || params.target_reps;
      if (targetReps) {
        result.push({ label: "Target reps", value: `${targetReps}` });
      }
      
      // Show load_percentage or weight_kg from workout_time_protocols (for for_time)
      if (exerciseProtocol) {
        if (exerciseProtocol.load_percentage !== null && exerciseProtocol.load_percentage !== undefined) {
          result.push({ label: "Load %", value: `${exerciseProtocol.load_percentage}%` });
        } else if (exerciseProtocol.weight_kg !== null && exerciseProtocol.weight_kg !== undefined) {
          result.push({ label: "Weight", value: `${exerciseProtocol.weight_kg} kg` });
        }
      }
    } else if (blockType === "tabata") {
      // USED: work_seconds, rest_seconds, set, rounds
      // NOTE: rounds is shown here per exercise, rest_after_set is shown in block header
      const workSeconds = exerciseProtocol?.work_seconds || params.work_seconds;
      if (workSeconds !== null && workSeconds !== undefined) {
        result.push({
          label: "Work time",
          value: `${workSeconds}s`,
        });
      }
      // For Tabata: rest_seconds is rest AFTER each individual exercise (from workout_time_protocols)
      const restSeconds = exerciseProtocol?.rest_seconds || params.rest_after;
      if (restSeconds !== null && restSeconds !== undefined) {
        result.push({
          label: "Rest time",
          value: `${restSeconds}s`,
        });
      }
      // USED: rounds (from time_protocols)
      const rounds = exerciseProtocol?.rounds;
      if (rounds !== null && rounds !== undefined) {
        result.push({
          label: "Rounds",
          value: `${rounds}`,
        });
      }
      // USED: set (which set/round this exercise belongs to)
      const setNumber = exerciseProtocol?.set;
      if (setNumber !== null && setNumber !== undefined) {
        result.push({
          label: "Set",
          value: `${setNumber}`,
        });
      }
    } else if (blockType === "circuit") {
      // OPTIONAL: work_seconds (only if set)
      // OPTIONAL: rest_seconds (only if set)
      // USED: set
      // NOTE: rounds is shown in block header as total_sets
      const workSeconds = exerciseProtocol?.work_seconds || 
        params.work_seconds;
      if (workSeconds !== null && workSeconds !== undefined) {
        result.push({
          label: "Work time",
          value: `${workSeconds}s`,
        });
      }
      const restSeconds = exerciseProtocol?.rest_seconds ||
        params.rest_after_exercise ||
        params.rest_after_set ||
        params.rest_after;
      if (restSeconds !== null && restSeconds !== undefined) {
        result.push({
          label: "Rest time",
          value: `${restSeconds}s`,
        });
      }
      // USED: set (which set/round this exercise belongs to)
      const setNumber = exerciseProtocol?.set;
      if (setNumber !== null && setNumber !== undefined) {
        result.push({
          label: "Set",
          value: `${setNumber}`,
        });
      }
    }

    return result;
  };

  return (
    <AnimatedBackground>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes shine {
          to { background-position: 200% center; }
        }
        .shimmer-text {
          background: linear-gradient(90deg, ${
            isDark ? "#fff" : "#1A1A1A"
          } 0%, #3B82F6 50%, ${isDark ? "#fff" : "#1A1A1A"} 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shine 8s linear infinite;
        }
        .exercise-item {
          max-height: 120px;
          overflow: hidden;
          transition: max-height 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .exercise-item.active {
          max-height: 5000px;
        }
        .rotate-icon {
          transition: transform 0.3s ease;
        }
        .exercise-item.active .rotate-icon {
          transform: rotate(180deg);
        }
      `,
        }}
      />
      <div className="relative fc-app-bg isolate">
        <div className="fc-muted-overlay" />
        <div className="fc-grain-layer" />
        <div className="fc-vignette-layer" />
        <div className="relative z-10 min-h-screen pb-32">
          {/* Navigation */}
          <nav className="mb-12 px-6">
            <button
              onClick={() => router.push("/client/workouts")}
              className="group inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] font-mono fc-text-dim hover:fc-text-primary transition-colors"
            >
              <ChevronLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
              Back to Program
            </button>
          </nav>

          <main className="max-w-4xl mx-auto px-6 pb-40">
            {/* Header Section */}
            <header className="mb-14">
              <p className="text-xs uppercase tracking-[0.3em] fc-text-dim mb-3">
                Workout Detail
              </p>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                {assignment.category && (
                  <Badge
                    variant="fc-outline"
                    className="px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.2em]"
                  >
                    {assignment.category}
                  </Badge>
                )}
                <span className="text-[11px] uppercase tracking-[0.22em] font-mono fc-text-dim">
                  {assignment.estimatedDuration || 0} mins
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight fc-text-primary mb-4">
                {assignment.name}
              </h1>
              {assignment.description && (
                <p className="text-base md:text-lg leading-relaxed fc-text-dim max-w-2xl">
                  {assignment.description}
                </p>
              )}
            </header>

          {/* Exercise List */}
          <section style={{ marginBottom: "128px" }}>
            <h2
              style={{
                fontFamily: "monospace",
                fontSize: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.3em",
                color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
                marginBottom: "32px",
              }}
            >
              Workout Protocol
            </h2>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              {blocks.map((block, blockIndex) => {
                const isExpanded = expandedExercises.has(block.id);
                const badgeColor = getBlockTypeBadgeColor(block.blockType);
                const blockParams = getBlockParameters(block);

                return (
                  <div
                    key={block.id}
                    className={`exercise-item ${isExpanded ? "active" : ""}`}
                    onClick={() => toggleExercise(block.id)}
                  >
                    <GlassCard
                      elevation={2}
                      className="overflow-hidden cursor-pointer"
                    >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "24px 32px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "16px",
                        }}
                      >
                        <div
                          style={{
                            width: "48px",
                            height: "48px",
                            borderRadius: "100%",
                            background: isDark
                              ? "rgba(255,255,255,0.03)"
                              : "rgba(255,255,255,0.4)",
                            backdropFilter: "blur(12px) saturate(180%)",
                            WebkitBackdropFilter: "blur(12px) saturate(180%)",
                            border: `1px solid ${
                              isDark
                                ? "rgba(255,255,255,0.125)"
                                : "rgba(255,255,255,0.2)"
                            }`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontFamily: "monospace",
                            fontSize: "18px",
                            color: isDark ? "rgba(255,255,255,0.8)" : "#1A1A1A",
                            boxShadow: "0 4px 24px -1px rgba(0, 0, 0, 0.2), inset 0 0 20px 0 rgba(255, 255, 255, 0.02)",
                          }}
                        >
                          {String(blockIndex + 1).padStart(2, "0")}
                        </div>
                        <div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              marginBottom: "4px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "10px",
                                letterSpacing: "0.1em",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                textTransform: "uppercase",
                                fontWeight: 700,
                                background: badgeColor.bg,
                                color: badgeColor.text,
                                border: `1px solid ${badgeColor.border}`,
                              }}
                            >
                              {formatBlockTypeLabel(block.blockType, null)}
                            </span>
                          </div>
                          <h4
                            style={{
                              fontSize: "18px",
                              fontWeight: 700,
                              color: isDark ? "#FFFFFF" : "#1A1A1A",
                              margin: 0,
                            }}
                          >
                            {(() => {
                              // Helper to filter out "test" values
                              const isValidName = (
                                name: string | null | undefined
                              ): boolean => {
                                if (!name) return false;
                                const trimmed = name.trim();
                                if (trimmed.length === 0) return false;
                                const lower = trimmed.toLowerCase();
                                return lower !== "test" && lower !== "teest";
                              };

                              // Use block name if available and not empty
                              if (isValidName(block.blockName)) {
                                return block.blockName!.trim();
                              }
                              // If block has exercises, try to construct a meaningful title
                              if (
                                block.exercises &&
                                block.exercises.length > 0
                              ) {
                                // Get all unique exercise names (excluding "test")
                                const exerciseNames = block.exercises
                                  .map((ex) => ex.name)
                                  .filter(isValidName);

                                if (exerciseNames.length > 0) {
                                  // If more than 2 exercises, show first 2 + count
                                  if (exerciseNames.length > 2) {
                                    const firstTwo = exerciseNames
                                      .slice(0, 2)
                                      .join(" + ");
                                    const remaining = exerciseNames.length - 2;
                                    return `${firstTwo} + ${remaining} ${
                                      remaining === 1 ? "exercise" : "exercises"
                                    }`;
                                  }
                                  // For 2 or fewer exercises, show all names
                                  return exerciseNames.join(" + ");
                                }
                              }
                              // Final fallback: use block type
                              return formatBlockTypeLabel(
                                block.blockType,
                                null
                              );
                            })()}
                          </h4>
                        </div>
                      </div>
                      <ChevronDown
                        className="rotate-icon"
                        style={{
                          width: "20px",
                          height: "20px",
                          color: isDark ? "rgba(255,255,255,0.5)" : "#6B7280",
                        }}
                      />
                    </div>
                    {isExpanded && (
                      <div style={{ padding: "0 32px 32px" }}>
                        {/* Block Notes */}
                        {block.notes && (
                          <div
                            style={{
                              padding: "12px 16px",
                              background: isDark
                                ? "rgba(59, 130, 246, 0.1)"
                                : "rgba(59, 130, 246, 0.05)",
                              borderRadius: "12px",
                              border: `1px solid ${
                                isDark
                                  ? "rgba(59, 130, 246, 0.2)"
                                  : "rgba(59, 130, 246, 0.1)"
                              }`,
                              marginBottom: "20px",
                            }}
                          >
                            <p
                              style={{
                                fontSize: "14px",
                                color: isDark
                                  ? "rgba(255,255,255,0.8)"
                                  : "#1A1A1A",
                                lineHeight: "1.5",
                                margin: 0,
                              }}
                            >
                              {block.notes}
                            </p>
                          </div>
                        )}

                        {/* Block Parameters */}
                        {blockParams.length > 0 && (
                          <div
                            data-block-type={block.blockType}
                            data-block-id={block.id}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(2, 1fr)",
                              gap: "12px",
                              marginBottom: "20px",
                              // Force visibility for debugging
                              visibility: "visible",
                              opacity: 1,
                              position: "relative",
                              zIndex: 1,
                            }}
                          >
                            {blockParams.map((param, idx) => (
                              <div
                                key={`${block.id}-param-${idx}`}
                                data-param-label={param.label}
                                data-param-value={param.value}
                                style={{
                                  background: isDark
                                    ? "rgba(0,0,0,0.4)"
                                    : "rgba(0,0,0,0.02)",
                                  borderRadius: "12px",
                                  padding: "12px",
                                  border: `1px solid ${
                                    isDark
                                      ? "rgba(255,255,255,0.05)"
                                      : "rgba(0,0,0,0.05)"
                                  }`,
                                  // Force visibility
                                  visibility: "visible",
                                  opacity: 1,
                                  display: "block",
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: "10px",
                                    color: isDark
                                      ? "rgba(255,255,255,0.5)"
                                      : "#6B7280",
                                    textTransform: "uppercase",
                                    fontWeight: 700,
                                    marginBottom: "4px",
                                  }}
                                >
                                  {param.label}
                                </div>
                                <div
                                  style={{
                                    fontFamily: "monospace",
                                    fontWeight: 700,
                                    fontSize: "16px",
                                    color: isDark ? "#FFFFFF" : "#1A1A1A",
                                  }}
                                >
                                  {param.value}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Exercises in Block */}
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                          }}
                        >
                          {block.exercises.map((exercise, exerciseIndex) => {
                            const previousBest = getPreviousBest(exercise.name);
                            const exerciseBadgeColor = getBlockTypeBadgeColor(
                              block.blockType
                            );

                            return (
                              <div
                                key={exercise.id}
                                style={{
                                  background: isDark
                                    ? "rgba(255, 255, 255, 0.03)"
                                    : "rgba(255, 255, 255, 0.4)",
                                  backdropFilter: "blur(12px) saturate(180%)",
                                  WebkitBackdropFilter: "blur(12px) saturate(180%)",
                                  borderRadius: "16px",
                                  padding: "16px",
                                  border: `1px solid ${
                                    isDark
                                      ? "rgba(255,255,255,0.125)"
                                      : "rgba(255,255,255,0.2)"
                                  }`,
                                  boxShadow: "0 4px 24px -1px rgba(0, 0, 0, 0.2), inset 0 0 20px 0 rgba(255, 255, 255, 0.02)",
                                  transition: "all 0.4s cubic-bezier(0.23, 1, 0.32, 1)",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "16px",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = "translateY(-4px) scale(1.01)";
                                  e.currentTarget.style.background = isDark
                                    ? "rgba(255, 255, 255, 0.05)"
                                    : "rgba(255, 255, 255, 0.5)";
                                  e.currentTarget.style.borderColor = isDark
                                    ? "rgba(255,255,255,0.2)"
                                    : "rgba(255,255,255,0.3)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = "translateY(0) scale(1)";
                                  e.currentTarget.style.background = isDark
                                    ? "rgba(255, 255, 255, 0.03)"
                                    : "rgba(255, 255, 255, 0.4)";
                                  e.currentTarget.style.borderColor = isDark
                                    ? "rgba(255,255,255,0.125)"
                                    : "rgba(255,255,255,0.2)";
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "start", gap: "12px" }}>
                                  <div
                                    style={{
                                      width: "40px",
                                      height: "40px",
                                      borderRadius: "100%",
                                      background: isDark
                                        ? "rgba(255,255,255,0.03)"
                                        : "rgba(255,255,255,0.4)",
                                      backdropFilter: "blur(12px) saturate(180%)",
                                      WebkitBackdropFilter: "blur(12px) saturate(180%)",
                                      border: `1px solid ${
                                        isDark
                                          ? "rgba(255,255,255,0.125)"
                                          : "rgba(255,255,255,0.2)"
                                      }`,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontWeight: 700,
                                      fontFamily: "monospace",
                                      fontSize: "14px",
                                      color: isDark ? "rgba(255,255,255,0.8)" : "#1A1A1A",
                                      flexShrink: 0,
                                      boxShadow: "0 4px 24px -1px rgba(0, 0, 0, 0.2), inset 0 0 20px 0 rgba(255, 255, 255, 0.02)",
                                    }}
                                  >
                                    {exercise.exerciseLetter || String(exerciseIndex + 1).padStart(2, "0")}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    {exercise.exerciseLetter && (
                                      <span
                                        style={{
                                          fontSize: "9px",
                                          letterSpacing: "0.1em",
                                          padding: "2px 8px",
                                          borderRadius: "100px",
                                          textTransform: "uppercase",
                                          fontWeight: 800,
                                          background: isDark
                                            ? "rgba(251, 191, 36, 0.15)"
                                            : "rgba(251, 191, 36, 0.15)",
                                          color: isDark ? "#FBBF24" : "#FBBF24",
                                          border: `1px solid ${isDark ? "rgba(251, 191, 36, 0.3)" : "rgba(251, 191, 36, 0.3)"}`,
                                          marginBottom: "4px",
                                          display: "inline-block",
                                        }}
                                      >
                                        {formatBlockTypeLabel(
                                          block.blockType,
                                          exercise.exerciseLetter
                                        )}
                                      </span>
                                    )}
                                    <h3
                                      style={{
                                        fontSize: "16px",
                                        fontWeight: 600,
                                        color: isDark ? "#FFFFFF" : "#1A1A1A",
                                        margin: "4px 0 0 0",
                                      }}
                                    >
                                      {exercise.name}
                                    </h3>
                                    {exercise.notes && (
                                      <p
                                        style={{
                                          fontSize: "12px",
                                          color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
                                          margin: "4px 0 0 0",
                                          lineHeight: "1.5",
                                        }}
                                      >
                                        {exercise.notes}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Exercise Card Fields - from special tables based on block type */}
                                {(() => {
                                  const blockType = (block.blockType || "").toLowerCase();
                                  const isTimeBased = ["amrap", "emom", "for_time", "tabata", "circuit"].includes(blockType);
                                  
                                  // For time-based blocks, use getTimeBasedParameters
                                  if (isTimeBased) {
                                    const timeParams = getTimeBasedParameters(block, exercise);
                                    if (timeParams.length > 0) {
                                      return (
                                        <div
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "16px 24px",
                                            flexWrap: "wrap",
                                          }}
                                        >
                                          {timeParams.map((param, idx) => (
                                            <div key={idx} style={{ textAlign: "center", minWidth: "60px" }}>
                                              <div
                                                style={{
                                                  fontSize: "9px",
                                                  color: isDark
                                                    ? "rgba(255,255,255,0.3)"
                                                    : "rgba(0,0,0,0.3)",
                                                  textTransform: "uppercase",
                                                  fontFamily: "monospace",
                                                  letterSpacing: "0.1em",
                                                  marginBottom: "2px",
                                                }}
                                              >
                                                {param.label}
                                              </div>
                                              <div
                                                style={{
                                                  fontFamily: "monospace",
                                                  fontWeight: 500,
                                                  fontSize: "20px",
                                                  color: isDark ? "#FFFFFF" : "#1A1A1A",
                                                }}
                                              >
                                                {param.value}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    }
                                    return null;
                                  }
                                  
                                  // For all other blocks, use getExerciseCardFields
                                  const exerciseFields = getExerciseCardFields(block, exercise);
                                  if (exerciseFields.length > 0) {
                                      return (
                                        <div
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "16px 24px",
                                            flexWrap: "wrap",
                                          }}
                                        >
                                          {exerciseFields.map((field, idx) => (
                                            <div key={idx} style={{ textAlign: "center", minWidth: "60px" }}>
                                              <div
                                                style={{
                                                  fontSize: "9px",
                                                  color: isDark
                                                    ? "rgba(255,255,255,0.3)"
                                                    : "rgba(0,0,0,0.3)",
                                                  textTransform: "uppercase",
                                                  fontFamily: "monospace",
                                                  letterSpacing: "0.1em",
                                                  marginBottom: "2px",
                                                }}
                                              >
                                                {field.label}
                                              </div>
                                              <div
                                                style={{
                                                  fontFamily: "monospace",
                                                  fontWeight: 500,
                                                  fontSize: "20px",
                                                  color: field.label === "Rest" ? (isDark ? "#22D3EE" : "#0891B2") : (isDark ? "#FFFFFF" : "#1A1A1A"),
                                                }}
                                              >
                                                {field.value || "—"}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      );
                                  }
                                  return null;
                                })()}
                                
                                {/* Optional fields: Weight, Load % (only for blocks that support them) */}
                                {(() => {
                                  const blockType = (block.blockType || "").toLowerCase();
                                  // Show weight/load% for blocks that support them
                                  const supportsWeight = ["straight_set", "superset", "giant_set", "pre_exhaustion", "tabata", "circuit"].includes(blockType);
                                  if (!supportsWeight) return null;
                                  
                                  const optionalFields: { label: string; value: string }[] = [];
                                  
                                  // Weight (from workout_block_exercises.weight_kg) - OPTIONAL
                                  if (exercise.raw?.weight_kg !== null && exercise.raw?.weight_kg !== undefined) {
                                    optionalFields.push({
                                      label: "Weight",
                                      value: `${exercise.raw.weight_kg} kg`
                                    });
                                  }
                                  
                                  // Load Percentage (from workout_block_exercises.load_percentage) - OPTIONAL
                                  // Show for: giant_set, tabata, circuit (individual per exercise)
                                  // For superset: shown in getExerciseCardFields for second exercise
                                  // For pre_exhaustion: shown in getExerciseCardFields for compound exercise
                                  if (blockType === "giant_set" || blockType === "tabata" || blockType === "circuit") {
                                    if (exercise.raw?.load_percentage !== null && exercise.raw?.load_percentage !== undefined) {
                                      optionalFields.push({
                                        label: "Load %",
                                        value: `${exercise.raw.load_percentage}%`
                                      });
                                    }
                                  } else if (blockType === "straight_set" || blockType === "superset" || blockType === "pre_exhaustion") {
                                    // For straight_set, superset (first exercise), pre_exhaustion (isolation exercise)
                                    if (exercise.raw?.load_percentage !== null && exercise.raw?.load_percentage !== undefined) {
                                      optionalFields.push({
                                        label: "Load %",
                                        value: `${exercise.raw.load_percentage}%`
                                      });
                                    }
                                  }
                                  
                                  if (optionalFields.length > 0) {
                                    return (
                                      <div
                                        style={{
                                          display: "grid",
                                          gridTemplateColumns: `repeat(${Math.min(optionalFields.length, 3)}, 1fr)`,
                                          gap: "12px",
                                          marginTop: "12px",
                                          marginBottom: previousBest ? "12px" : "0",
                                        }}
                                      >
                                        {optionalFields.map((field, idx) => (
                                          <div key={idx}>
                                            <div
                                              style={{
                                                fontSize: "10px",
                                                color: isDark
                                                  ? "rgba(255,255,255,0.5)"
                                                  : "#6B7280",
                                                textTransform: "uppercase",
                                                fontWeight: 700,
                                                marginBottom: "4px",
                                              }}
                                            >
                                              {field.label}
                                            </div>
                                            <div
                                              style={{
                                                fontFamily: "monospace",
                                                fontWeight: 700,
                                                fontSize: "16px",
                                                color: isDark
                                                  ? "#FFFFFF"
                                                  : "#1A1A1A",
                                              }}
                                            >
                                              {field.value}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}

                                {/* Previous Best */}
                                {previousBest && (
                                  <div
                                    style={{
                                      padding: "12px",
                                      background: isDark
                                        ? "rgba(255,255,255,0.05)"
                                        : "rgba(0,0,0,0.02)",
                                      borderRadius: "12px",
                                      marginTop: "12px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                      }}
                                    >
                                      <History
                                        style={{
                                          width: "14px",
                                          height: "14px",
                                          color: isDark
                                            ? "rgba(255,255,255,0.5)"
                                            : "#6B7280",
                                        }}
                                      />
                                      <span
                                        style={{
                                          fontSize: "13px",
                                          color: isDark
                                            ? "rgba(255,255,255,0.6)"
                                            : "#6B7280",
                                        }}
                                      >
                                        Previous best:{" "}
                                        <span
                                          style={{
                                            color: isDark
                                              ? "#FFFFFF"
                                              : "#1A1A1A",
                                            fontWeight: 700,
                                            fontFamily: "monospace",
                                          }}
                                        >
                                          {previousBest.record}
                                        </span>
                                      </span>
                                    </div>
                                    <TrendingUp
                                      style={{
                                        width: "14px",
                                        height: "14px",
                                        color: "#10B981",
                                      }}
                                    />
            </div>
          )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    </GlassCard>
                  </div>
                );
              })}
            </div>
          </section>
        </main>

        {/* Fixed Bottom Action Button */}
        <div
          style={{
            position: "fixed",
            bottom: "80px",
            left: 0,
            width: "100%",
            padding: "16px 24px",
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none",
            zIndex: 50,
          }}
        >
          <button
            onClick={() =>
              router.push(`/client/workouts/${assignment.id}/start`)
            }
            style={{
              pointerEvents: "auto",
              background: "#FFFFFF",
              borderRadius: "100px",
              padding: "12px 24px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              color: "#000000",
              transition: "all 0.3s ease",
              cursor: "pointer",
              border: "none",
              boxShadow: "0 4px 24px -1px rgba(0, 0, 0, 0.2)",
              position: "relative",
              overflow: "hidden",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 0 30px rgba(255, 255, 255, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 24px -1px rgba(0, 0, 0, 0.2), inset 0 0 20px 0 rgba(255, 255, 255, 0.02)";
            }}
          >
            <span
              style={{
                fontFamily: "monospace",
                fontWeight: 700,
                letterSpacing: "0.1em",
                fontSize: "12px",
                textTransform: "uppercase",
                color: "#000000",
              }}
            >
              Initialize Session
            </span>
            <div
              className="button-icon-container"
              style={{
                background: "#000000",
                color: "#FFFFFF",
                borderRadius: "100px",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "transform 0.3s ease",
              }}
            >
              <ChevronLeft
                style={{
                  width: "20px",
                  height: "20px",
                  transform: "rotate(180deg)",
                  strokeWidth: 3,
                }}
              />
            </div>
          </button>
        </div>
      </div>
    </div>
    </AnimatedBackground>
  );
}
