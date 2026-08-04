"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, MoreHorizontal, Play } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { useTheme } from "@/contexts/ThemeContext";
import { fetchPersonalRecords } from "@/lib/personalRecords";
import { Button } from "@/components/ui/button";
import { ClientPageShell, IconButton, Eyebrow } from "@/components/client-ui";
import { cn } from "@/lib/utils";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { withTimeout } from "@/lib/withTimeout";
import { formatPaceMinSecPerKm } from "@/lib/enduranceFormUtils";
import { clientEffortLabelFromStoredRpe } from "@/lib/workoutEffortLabels";
import {
  WorkoutDetailsBlockSection,
  type DropSubRow,
} from "./WorkoutDetailsBlockSection";
import type {
  ClientBlockRecord,
  ClientExerciseDisplay,
  StructuredBlock,
} from "./workoutDetailsTypes";
import styles from "./WorkoutDetailsPage.module.css";

function formatClientSpeedPrescription(row: Record<string, unknown> | null | undefined): string | null {
  if (!row || typeof row !== "object") return null;
  const intervals = typeof row.intervals === "number" ? row.intervals : Number(row.intervals);
  const distanceM = typeof row.distance_meters === "number" ? row.distance_meters : Number(row.distance_meters);
  if (!Number.isFinite(intervals) || intervals < 1) return null;
  if (!Number.isFinite(distanceM) || distanceM <= 0) return null;
  const parts: string[] = [];
  const distStr =
    distanceM >= 1000 ? `${(distanceM / 1000).toFixed(1)} km` : `${Math.round(distanceM)}m`;
  parts.push(`${intervals} × ${distStr}`);
  const tsp = row.target_speed_pct;
  const thp = row.target_hr_pct;
  const speedPct = typeof tsp === "number" ? tsp : tsp != null ? Number(tsp) : NaN;
  const hrPct = typeof thp === "number" ? thp : thp != null ? Number(thp) : NaN;
  if (Number.isFinite(speedPct)) {
    parts.push(`${Math.round(speedPct)}% speed`);
  } else if (Number.isFinite(hrPct)) {
    parts.push(`${Math.round(hrPct)}% HR`);
  }
  const rs = row.rest_seconds;
  const restSec = typeof rs === "number" ? rs : rs != null ? Number(rs) : NaN;
  if (Number.isFinite(restSec)) {
    parts.push(`${restSec}s rest`);
  }
  const lbw = row.load_pct_bw;
  const loadBw = typeof lbw === "number" ? lbw : lbw != null ? Number(lbw) : NaN;
  if (Number.isFinite(loadBw)) {
    parts.push(`${loadBw}% BW`);
  }
  return parts.join(" · ");
}

function formatClientEndurancePrescription(row: Record<string, unknown> | null | undefined): string | null {
  if (!row || typeof row !== "object") return null;
  const td =
    typeof row.target_distance_meters === "number"
      ? row.target_distance_meters
      : Number(row.target_distance_meters);
  if (!Number.isFinite(td) || td <= 0) return null;
  const parts: string[] = [`${(td / 1000).toFixed(1)} km`];
  const paceRaw = row.target_pace_seconds_per_km;
  const pace =
    typeof paceRaw === "number" ? paceRaw : paceRaw != null ? Number(paceRaw) : NaN;
  if (Number.isFinite(pace) && pace > 0) {
    parts.push(formatPaceMinSecPerKm(pace));
  }
  const thp = row.target_hr_pct;
  const hrPct = typeof thp === "number" ? thp : thp != null ? Number(thp) : NaN;
  const hz = row.hr_zone;
  const zone = typeof hz === "number" ? hz : hz != null ? Number(hz) : NaN;
  if (Number.isFinite(hrPct)) {
    parts.push(`${Math.round(hrPct)}% HR`);
  } else if (Number.isFinite(zone)) {
    parts.push(`Zone ${zone}`);
  }
  return parts.join(" · ");
}

function normExerciseOrder(o: unknown): number {
  const n = typeof o === "number" ? o : Number(o);
  return Number.isFinite(n) ? n : 1;
}

function getSpeedEnduranceDisplayFields(
  block: StructuredBlock,
  exercise: ClientExerciseDisplay
): { label: string; value: string }[] {
  const blockType = (block.blockType || "").toLowerCase();
  const raw = exercise.raw as Record<string, unknown> | null | undefined;
  const rb = block.rawBlock as Record<string, unknown> | null | undefined;
  const exId = raw?.exercise_id as string | undefined;
  const exOrder = normExerciseOrder(raw?.exercise_order);

  if (blockType === "timed_set") {
    const rb = block.rawBlock as Record<string, unknown> | null | undefined;
    const sets = rb?.total_sets;
    const work = rb?.duration_seconds;
    const rest = rb?.rest_seconds;
    const parts: string[] = [];
    if (sets != null && Number(sets) > 0) parts.push(`${sets} sets`);
    if (work != null && Number(work) > 0) parts.push(`${work}s work`);
    if (rest != null && Number(rest) >= 0) parts.push(`${rest}s rest`);
    const s = parts.length > 0 ? parts.join(" · ") : "";
    return s ? [{ label: "Prescription", value: s }] : [];
  }

  if (blockType === "speed_work") {
    const fromEx = Array.isArray(raw?.speed_sets)
      ? (raw!.speed_sets as Record<string, unknown>[])
      : [];
    const fromBlock = Array.isArray(rb?.speed_sets)
      ? (rb!.speed_sets as Record<string, unknown>[])
      : [];
    const list = fromEx.length > 0 ? fromEx : fromBlock;
    const row =
      list.find(
        (s) =>
          String(s.exercise_id) === String(exId) &&
          normExerciseOrder(s.exercise_order) === exOrder,
      ) || list[0];
    const s = formatClientSpeedPrescription(row);
    return s ? [{ label: "Prescription", value: s }] : [];
  }

  if (blockType === "endurance") {
    const fromEx = Array.isArray(raw?.endurance_sets)
      ? (raw!.endurance_sets as Record<string, unknown>[])
      : [];
    const fromBlock = Array.isArray(rb?.endurance_sets)
      ? (rb!.endurance_sets as Record<string, unknown>[])
      : [];
    const list = fromEx.length > 0 ? fromEx : fromBlock;
    const row =
      list.find(
        (e) =>
          String(e.exercise_id) === String(exId) &&
          normExerciseOrder(e.exercise_order) === exOrder,
      ) || list[0];
    const s = formatClientEndurancePrescription(row);
    return s ? [{ label: "Prescription", value: s }] : [];
  }

  return [];
}
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
  /** Program instance preview — start from Train, not assignment /start. */
  isInstancePreview?: boolean;
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
  const [loadingStartedAt, setLoadingStartedAt] = useState<number | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([]);
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(
    new Set()
  );

  // Retired route: consolidate into the pre-start summary on `/start`.
  useEffect(() => {
    if (!id) return;
    router.replace(`/client/workouts/${id}/start`);
  }, [id, router]);

  // Expand all blocks by default when blocks load (client came to see the workout)
  useEffect(() => {
    if (blocks.length > 0) {
      setExpandedExercises((prev) => {
        const next = new Set(prev);
        blocks.forEach((b) => next.add(b.id));
        return next;
      });
    }
  }, [blocks.length]);

  useEffect(() => {
    if (!id) return;

    const load = async (assignmentId: string) => {
      setLoading(true);
      setLoadingStartedAt(Date.now());
      setError(null);

      try {
        await withTimeout(
          (async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("User not authenticated");
        }

        type AssignmentRow = {
          id: string;
          name: string;
          description: string | null;
          scheduled_date: string | null;
          status: string | null;
          workout_template_id: string | null;
        };

        let assignmentRow: AssignmentRow | null = null;
        let instanceWorkoutBlocks: Awaited<
          ReturnType<
            typeof import("@/lib/instanceWorkoutBlocksMapper")["mapInstanceCanvasToSetEntries"]
          >
        > | null = null;
        let instanceCategory: string | null = null;
        let instanceEstimatedDuration: number | null = null;
        let isInstancePreview = false;

        const { data: instanceRow } = await supabase
          .from("program_instance_workouts")
          .select("id, name, estimated_duration, program_assignment_id")
          .eq("id", assignmentId)
          .maybeSingle();

        if (instanceRow) {
          const { data: ownedAssignment, error: ownedErr } = await supabase
            .from("program_assignments")
            .select("id")
            .eq("id", instanceRow.program_assignment_id)
            .eq("client_id", user.id)
            .maybeSingle();

          if (ownedErr) {
            console.error("Error verifying instance ownership:", ownedErr);
            throw new Error("Failed to load workout details");
          }

          if (!ownedAssignment) {
            throw new Error("Workout not found");
          }

          const { loadInstanceWorkoutForCanvas } = await import(
            "@/lib/programInstance/instanceCanvasLoad"
          );
          const { mapInstanceCanvasToSetEntries } = await import(
            "@/lib/instanceWorkoutBlocksMapper"
          );
          const canvas = await loadInstanceWorkoutForCanvas(
            supabase,
            assignmentId,
          );

          if (!canvas) {
            throw new Error("Workout not found");
          }

          isInstancePreview = true;
          instanceWorkoutBlocks = mapInstanceCanvasToSetEntries(canvas);
          instanceCategory = canvas.category ?? null;
          instanceEstimatedDuration =
            canvas.estimated_duration ??
            instanceRow.estimated_duration ??
            null;
          assignmentRow = {
            id: instanceRow.id,
            name:
              canvas.name?.trim() ||
              instanceRow.name?.trim() ||
              "Workout",
            description: canvas.description ?? null,
            scheduled_date: null,
            status: "assigned",
            workout_template_id: null,
          };
        }

        if (!assignmentRow) {
        let { data: legacyAssignmentRow, error: assignmentError } = await supabase
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

        if (!legacyAssignmentRow) {
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
              .limit(1)
              .maybeSingle();

          if (fallbackError) {
            console.error(
              "WorkoutDetailsPage -> fallback assignment error",
              fallbackError
            );
            throw new Error("Failed to load workout details");
          }

          if (!fallbackAssignment) {
            throw new Error("Workout not found");
          }

          legacyAssignmentRow = fallbackAssignment;
        }

        assignmentRow = legacyAssignmentRow;
        }

        // Fetch workout template to get category and estimated_duration (legacy assignments only)
        let category: string | null = isInstancePreview ? instanceCategory : null;
        let estimatedDuration: number | null = isInstancePreview
          ? instanceEstimatedDuration
          : null;
        if (!isInstancePreview && assignmentRow.workout_template_id) {
          const { data: template } = await supabase
            .from("workout_templates")
            .select("category, estimated_duration")
            .eq("id", assignmentRow.workout_template_id)
            .maybeSingle();

          category = template?.category || null;
          estimatedDuration = template?.estimated_duration || null;
        }

        // Fetch current week from canonical programStateService
        let currentWeek: number | null = null;
        try {
          const { getProgramState } = await import("@/lib/programStateService");
          const programState = await getProgramState(supabase, user.id);
          if (programState.assignment && !programState.isCompleted) {
            currentWeek = programState.currentWeekNumber;
          }
        } catch (programErr) {
          // Silently fail - this is optional data
          console.warn(
            "Error fetching program state:",
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
          isInstancePreview,
        });

        let workoutBlocks: Awaited<
          ReturnType<
            typeof import("@/lib/workoutBlockService")["WorkoutBlockService"]["getWorkoutBlocks"]
          >
        >;

        if (instanceWorkoutBlocks) {
          workoutBlocks = instanceWorkoutBlocks;
        } else {
          if (!assignmentRow.workout_template_id) {
            throw new Error("Workout template ID not found in assignment");
          }

          const { WorkoutBlockService } = await import(
            "@/lib/workoutBlockService"
          );
          workoutBlocks = await WorkoutBlockService.getWorkoutBlocks(
            assignmentRow.workout_template_id
          );
        }

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
              set_type: workoutBlocks[0].set_type,
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
          speed_sets?: any[];
          endurance_sets?: any[];
          exercises?: Array<any & {
            drop_sets?: any[];
            cluster_sets?: any[];
            rest_pause_sets?: any[];
            speed_sets?: any[];
            endurance_sets?: any[];
          }>;
        })[] = workoutBlocks.map(
          (block) => ({
          id: block.id,
          set_order: block.set_order,
          set_type: block.set_type,
          set_name: block.set_name ?? null,
          set_notes: block.set_notes ?? null,
          total_sets: block.total_sets ?? null,
          reps_per_set: block.reps_per_set ?? null,
          rest_seconds: block.rest_seconds ?? null,
          duration_seconds: block.duration_seconds ?? null,
          // Preserve special table data - ensure time_protocols is preserved
          time_protocols: (block as any).time_protocols ?? [],
          speed_sets: (block as any).speed_sets ?? [],
          endurance_sets: (block as any).endurance_sets ?? [],
          exercises: (block.exercises ?? []).map((ex) => ({
            id: ex.id,
            exercise_id: ex.exercise_id,
            exercise_order: ex.exercise_order,
            exercise_letter: ex.exercise_letter ?? null,
            sets: ex.sets ?? null,
            reps: ex.reps ?? null,
            weight_kg: ex.weight_kg ?? null,
            load_percentage: ex.load_percentage ?? null,
            rpe: ex.rpe ?? null,
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
            time_protocols: (ex as any).time_protocols ?? [], // For tabata/amrap/emom/for_time blocks
            speed_sets: (ex as any).speed_sets ?? [],
            endurance_sets: (ex as any).endurance_sets ?? [],
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
                  blockName: block.set_name,
                  blockType: block.set_type,
                  exerciseLetter: exercise.exercise_letter,
                  notes: filterTestValue(exercise.notes), // Filter out "test"
                  tempo: exercise.tempo ?? null,
                  rpe: exercise.rpe ?? null,
                  raw: exercise,
                  meta: parsedNotes,
                };
              })
              .sort((a, b) => a.orderIndex - b.orderIndex);

            // Filter exercises for pre_exhaustion (only 2: isolation + compound)
            let finalExercises = exercises;
            if (block.set_type === "pre_exhaustion") {
              // Pre exhaustion should only have 2 exercises: isolation (order 1) and compound (order 2)
              finalExercises = exercises
                .filter((ex) => ex.orderIndex < 2) // Only first 2 exercises
                .slice(0, 2); // Ensure max 2
            }

            return {
              id: block.id,
              blockName: block.set_name,
              blockType: block.set_type,
              blockOrder:
                typeof block.set_order === "number" &&
                Number.isFinite(block.set_order)
                  ? block.set_order
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
                return filterTestValue(block.set_notes);
              })(),
              exercises: finalExercises,
              rawBlock: {
                ...block,
                // Ensure time_protocols are preserved
                time_protocols: (block as any).time_protocols || [],
                speed_sets: (block as any).speed_sets || [],
                endurance_sets: (block as any).endurance_sets || [],
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
        } catch {
          setPersonalRecords([]);
        }
      })(),
      30000,
      "timeout"
    );
  } catch (loadError: any) {
      console.error("Error loading workout details:", loadError);
      setError(loadError?.message === "timeout" ? "Loading took too long. Please try again." : (loadError?.message || "Failed to load workout details"));
  } finally {
      setLoading(false);
      setLoadingStartedAt(null);
  }
    };

    load(id as string).catch((loadError) => {
      console.error("Unexpected error loading workout details:", loadError);
      setError(loadError?.message === "timeout" ? "Loading took too long. Please try again." : "Failed to load workout details");
      setLoading(false);
      setLoadingStartedAt(null);
    });
  }, [id, retryTrigger]);

  const refetchDetails = useCallback(() => {
    setError(null);
    setLoading(true);
    setLoadingStartedAt(Date.now());
    setRetryTrigger((t) => t + 1);
  }, []);

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

  if (loading) {
    return (
      <AnimatedBackground>
        <div className="relative fc-app-bg isolate">
          <ClientPageShell className="min-h-screen pb-[var(--fc-bottom-safe-area)]">
            <main
              className="max-w-3xl mx-auto pt-6 pb-40"
              style={{ paddingLeft: "var(--fc-page-px)", paddingRight: "var(--fc-page-px)" }}
            >
              <PageSkeleton variant="dashboard" />
            </main>
          </ClientPageShell>
        </div>
      </AnimatedBackground>
    );
  }

  if (error || !assignment) {
    return (
      <AnimatedBackground>
        <div className="relative z-10 min-h-screen fc-page">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-4 fc-card-shell px-8 py-6">
              <p className="text-base font-semibold fc-text-error">
                {error || "Workout not found"}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  type="button"
                  variant="fc-secondary"
                  onClick={() => {
                    setError(null);
                    setLoading(true);
                    setRetryTrigger((t) => t + 1);
                  }}
                  className="gap-2 fc-btn"
                >
                  Retry
                </Button>
                <Button
                  variant="fc-secondary"
                  onClick={() => router.push("/client/train")}
                  className="gap-2 fc-btn"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Go Back
                </Button>
              </div>
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
    
    // 1. STRAIGHT SET, SUPERSET, GIANT SET, PRE-EXHAUSTION: from workout_set_entry_exercises
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
        const supersetReps = exerciseRaw?.superset_reps;
        if (typeof supersetReps === "string" && supersetReps) {
          result.push({ label: "Reps", value: formatReps(supersetReps) });
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
        const compoundReps = exerciseRaw?.compound_reps;
        if (typeof compoundReps === "string" && compoundReps) {
          result.push({ label: "Reps", value: formatReps(compoundReps) });
        }
        if (exerciseRaw?.compound_load_percentage !== null && exerciseRaw?.compound_load_percentage !== undefined) {
          result.push({ label: "Load %", value: `${exerciseRaw.compound_load_percentage}%` });
        } else if (exerciseRaw?.compound_weight_kg !== null && exerciseRaw?.compound_weight_kg !== undefined) {
          result.push({ label: "Weight", value: `${exerciseRaw.compound_weight_kg} kg` });
        }
      }
      
      // OPTIONAL: prescribed RPE, tempo, notes (only if set)
      // For SUPERSET: RPE, tempo, notes only for exercise 1 (first exercise, orderIndex === 0)
      if (blockType === "superset") {
        if (exercise.orderIndex === 0) {
          // Only show RPE/tempo/notes for first exercise in superset
          if (exercise.rpe !== null && exercise.rpe !== undefined) {
            result.push({ label: "RPE", value: `${exercise.rpe}` });
          }
          if (exercise.tempo) {
            result.push({ label: "Tempo", value: exercise.tempo });
          }
          if (exercise.notes) {
            result.push({ label: "Notes", value: exercise.notes });
          }
        }
      } else {
        // For all other block types, show RPE/tempo/notes for all exercises
        if (exercise.rpe !== null && exercise.rpe !== undefined) {
          result.push({ label: "RPE", value: `${exercise.rpe}` });
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
      const dropSetsRaw = exerciseRaw?.drop_sets;
      const dropSets = Array.isArray(dropSetsRaw) ? dropSetsRaw : [];
      if (dropSets.length > 0) {
        const dropSet = dropSets[0] as {
          weight_kg?: number;
          reps?: string | null;
          rest_seconds?: number | null;
          drop_order?: number;
          load_percentage?: number | null;
        };
        // Calculate drop percentage from initial weight vs drop weight
        const initialWeight = Number(exerciseRaw?.weight_kg) || 0;
        const dropWeight = Number(dropSet.weight_kg) || 0;
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
      const firstDropSet =
        dropSets.length > 0
          ? dropSets.find(
              (ds) => (ds as { drop_order?: number }).drop_order === 1,
            ) || dropSets[0]
          : null;
      if (firstDropSet) {
        const fd = firstDropSet as {
          load_percentage?: number | null;
        };
        if (fd.load_percentage !== null && fd.load_percentage !== undefined) {
          result.push({ label: "Load %", value: `${fd.load_percentage}%` });
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
    // 4. REST-PAUSE: from workout_rest_pause_sets (weight, duration, max_pauses) and workout_set_entries (reps)
    else if (blockType === "rest_pause") {
      // Check if rest_pause_sets data exists (must be array with at least one item)
      const restPauseSets = exerciseRaw?.rest_pause_sets;
      if (Array.isArray(restPauseSets) && restPauseSets.length > 0) {
        const restPauseSet = restPauseSets[0];
        // USED: weight_kg (from workout_rest_pause_sets), reps (from workout_set_entries.reps_per_set), rest_pause_duration, max_rest_pauses
        if (restPauseSet.weight_kg !== null && restPauseSet.weight_kg !== undefined) {
          result.push({ label: "Initial weight", value: `${restPauseSet.weight_kg} kg` });
        }
        // Reps are stored in workout_set_entries.reps_per_set, not in workout_rest_pause_sets
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
    // TIME-BASED BLOCKS: from workout_time_protocols (handled by getTimeBasedParameters)
    // These are handled separately below
    
    return result;
  };

  // Get block-specific parameters for display (shown in block header)
  // Shows ALL USED fields from workout_set_entries ONLY (except relational IDs: id, template_id, set_order)
  // OPTIONAL fields (set_name, set_notes) only if they have values
  // According to BLOCK_STORAGE_SCHEMA.md: Block header shows workout_set_entries data ONLY
  const getBlockParameters = (block: StructuredBlock) => {
    const blockType = (block.blockType || "").toLowerCase();
    const result: { label: string; value: string }[] = [];
    const rawBlock = block.rawBlock;
    
    // OPTIONAL: set_name (only if set)
    if (rawBlock?.set_name) {
      // set_name is displayed in the block title, not in parameters
    }
    
    // OPTIONAL: set_notes (only if set)
    // set_notes is displayed separately, not in parameters
    
    // USED: total_sets - for most blocks (except amrap, emom, for_time)
    if (rawBlock?.total_sets !== null && rawBlock?.total_sets !== undefined) {
      if (blockType === "tabata") {
        // For tabata, total_sets represents rounds
        result.push({ label: "Rounds", value: `${rawBlock.total_sets}` });
      } else if (blockType !== "amrap" && blockType !== "emom" && blockType !== "for_time") {
        result.push({ label: "Sets", value: `${rawBlock.total_sets}` });
      }
    }
    
    // USED: reps_per_set - for straight_set, drop_set
    if (rawBlock?.reps_per_set && (blockType === "straight_set" || blockType === "drop_set")) {
      result.push({ label: "Reps", value: formatReps(rawBlock.reps_per_set) });
    }
    
    // USED: rest_seconds - for most blocks (rest AFTER completing the set/block)
    if (rawBlock?.rest_seconds !== null && rawBlock?.rest_seconds !== undefined) {
      if (blockType === "superset" || blockType === "giant_set" || blockType === "pre_exhaustion") {
        result.push({ label: "Rest after set", value: `${rawBlock.rest_seconds}s` });
      } else if (blockType === "cluster_set" || blockType === "drop_set") {
        result.push({ label: "Rest after set", value: `${rawBlock.rest_seconds}s` });
      } else if (blockType === "straight_set") {
        result.push({ label: "Rest between sets", value: `${rawBlock.rest_seconds}s` });
      }
      // rest_pause: rest_seconds is NOT SET in workout_set_entries
      // amrap, emom, for_time: rest_seconds is NOT SET in workout_set_entries
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
    }

    return result;
  };

  const needsBlockConfigPanel = (block: StructuredBlock) => {
    const t = (block.blockType || "").toLowerCase();
    if (t === "drop_set") return true;
    return block.exercises.length > 1;
  };

  const isValidBlockExerciseName = (name: string | null | undefined) => {
    if (!name) return false;
    const trimmed = name.trim();
    if (trimmed.length === 0) return false;
    const lower = trimmed.toLowerCase();
    return lower !== "test" && lower !== "teest";
  };

  const getBlockHeadTitle = (block: StructuredBlock) => {
    if (isValidBlockExerciseName(block.blockName)) {
      return block.blockName!.trim();
    }
    if (block.exercises?.length > 0) {
      const exerciseNames = block.exercises
        .map((ex) => ex.name)
        .filter(isValidBlockExerciseName);
      if (exerciseNames.length > 0) {
        if (exerciseNames.length > 2) {
          const firstTwo = exerciseNames.slice(0, 2).join(" + ");
          const remaining = exerciseNames.length - 2;
          return `${firstTwo} + ${remaining} ${
            remaining === 1 ? "exercise" : "exercises"
          }`;
        }
        return exerciseNames.join(" + ");
      }
    }
    return formatBlockTypeLabel(block.blockType, null);
  };

  const mapFieldRowsToPrescription = (
    rows: { label: string; value: string }[],
    exercise: ClientExerciseDisplay,
  ): { label: string; value: string }[] =>
    rows.map((r) =>
      r.label === "RPE"
        ? {
            label: "Effort",
            value:
              clientEffortLabelFromStoredRpe(exercise.rpe) ??
              String(exercise.rpe ?? ""),
          }
        : r,
    );

  const computeExercisePrescriptionRows = (
    block: StructuredBlock,
    exercise: ClientExerciseDisplay,
    opts: { mode: "single" | "multi" },
  ): { label: string; value: string }[] => {
    const blockType = (block.blockType || "").toLowerCase();
    if (opts.mode === "single") {
      if (["amrap", "emom", "for_time", "tabata"].includes(blockType)) {
        return getTimeBasedParameters(block, exercise);
      }
      if (blockType === "speed_work" || blockType === "endurance") {
        return getSpeedEnduranceDisplayFields(block, exercise);
      }
      return mapFieldRowsToPrescription(
        getExerciseCardFields(block, exercise),
        exercise,
      );
    }
    let rows = getExerciseCardFields(block, exercise);
    if (blockType === "drop_set") {
      const ds = exercise.raw?.drop_sets;
      if (Array.isArray(ds) && ds.length > 0) {
        rows = rows.filter(
          (x) => x.label !== "Drop %" && x.label !== "Drop reps",
        );
      }
    }
    return mapFieldRowsToPrescription(rows, exercise);
  };

  const getDropSubrows = (exercise: ClientExerciseDisplay): DropSubRow[] => {
    const raw = exercise.raw as Record<string, unknown> | null | undefined;
    const drops = raw?.drop_sets;
    if (!Array.isArray(drops) || drops.length === 0) return [];
    const sorted = [...drops].sort(
      (a, b) =>
        (Number((a as { drop_order?: unknown }).drop_order) || 0) -
        (Number((b as { drop_order?: unknown }).drop_order) || 0),
    );
    return sorted.map((d, i) => {
      const row = d as {
        id?: string;
        drop_order?: number;
        reps?: string | null;
        drop_percentage?: number | null;
      };
      const n = Number(row.drop_order) || i + 1;
      const pct = row.drop_percentage;
      const pctStr =
        pct != null && Number.isFinite(Number(pct))
          ? `−${Math.round(Number(pct))}%`
          : null;
      const parts = (
        <>
          {row.reps != null && row.reps !== "" ? (
            <>
              <span className={styles.dropValNum}>{String(row.reps)}</span>
              <span> reps</span>
            </>
          ) : null}
          {pctStr ? (
            <>
              {row.reps != null && row.reps !== "" ? (
                <span className="text-[var(--fc-text-dim)]"> · </span>
              ) : null}
              <span className={styles.dropValNum}>{pctStr}</span>
            </>
          ) : null}
        </>
      );
      return {
        key: String(row.id ?? `drop-${n}`),
        label: `Drop ${n}`,
        parts,
      };
    });
  };

  return (
    <AnimatedBackground>
      <div className={cn("relative fc-app-bg isolate", styles.pageRoot)}>
        <ClientPageShell className="min-h-screen pb-[var(--fc-bottom-safe-area)]">
          <nav className={styles.topbar}>
            <IconButton
              variant="filled"
              size="md"
              className="active:scale-95"
              aria-label="Back to train"
              onClick={() => router.push("/client/train")}
            >
              <ChevronLeft className="h-5 w-5 fc-text-primary" />
            </IconButton>
            <div className={styles.topbarTitle}>
              <Eyebrow
                tone="dim"
                density="default"
                className="!mb-0 !justify-center !w-full text-[color:var(--fc-text-quaternary,rgba(255,255,255,0.42))]"
              >
                Workout Details
              </Eyebrow>
            </div>
            <IconButton
              variant="filled"
              size="md"
              className="active:scale-95"
              aria-label="More options"
            >
              <MoreHorizontal className="h-5 w-5 fc-text-primary" />
            </IconButton>
          </nav>

          <main
            className={cn("max-w-3xl mx-auto", styles.mainScroll)}
            style={{
              paddingLeft: "var(--fc-page-px)",
              paddingRight: "var(--fc-page-px)",
            }}
          >
            <header className={styles.header}>
              <div className={styles.headerEyebrow}>
                {assignment.category ? (
                  <span className={styles.pillPhase}>{assignment.category}</span>
                ) : null}
                {assignment.currentWeek != null ? (
                  <span className={styles.pillWeek}>
                    Phase · Week {assignment.currentWeek}
                  </span>
                ) : null}
              </div>
              <h1 className={styles.title}>{assignment.name}</h1>
              {assignment.description ? (
                <div className="fc-surface mb-6 rounded-2xl border-l-4 border-l-[color:var(--fc-domain-workouts)] p-4">
                  <p className="m-0 text-sm italic leading-relaxed fc-text-dim">
                    {assignment.description}
                  </p>
                </div>
              ) : null}
            </header>

            <section className="mb-6">
              <div className={styles.statStrip}>
                <div className={styles.statCol}>
                  <span className={styles.statValue}>
                    ~{assignment.estimatedDuration ?? 0}
                  </span>
                  <span className={styles.statLabel}>Minutes</span>
                </div>
                <div className={styles.statCol}>
                  <span className={styles.statValue}>{totalSets}</span>
                  <span className={styles.statLabel}>Sets</span>
                </div>
                <div className={styles.statCol}>
                  <span className={styles.statValue}>{totalExercises}</span>
                  <span className={styles.statLabel}>Exercises</span>
                </div>
              </div>
            </section>

            <WorkoutDetailsBlockSection
              blocks={blocks}
              expandedIds={expandedExercises}
              onToggleBlock={toggleExercise}
              getBlockHeadTitle={getBlockHeadTitle}
              formatBlockTypeLabel={formatBlockTypeLabel}
              needsBlockConfigPanel={needsBlockConfigPanel}
              getBlockParameters={getBlockParameters}
              getExercisePrescriptionRows={(block, exercise) =>
                computeExercisePrescriptionRows(block, exercise, {
                  mode: needsBlockConfigPanel(block) ? "multi" : "single",
                })
              }
              getDropSubrows={getDropSubrows}
              getPreviousBest={getPreviousBest}
            />
          </main>

          <div className={styles.stickyCta}>
            {assignment.isInstancePreview ? null : (
            <Button
              type="button"
              variant="btn-action"
              className={cn(
                styles.beginBtn,
                "h-auto min-h-[52px] w-full text-sm font-bold uppercase tracking-[0.06em]",
              )}
              onClick={() =>
                router.push(`/client/workouts/${assignment.id}/start`)
              }
            >
              <span className={styles.beginBtnInner}>
                <Play className="h-5 w-5 shrink-0 fill-current" />
                Begin Workout
              </span>
            </Button>
            )}
          </div>
        </ClientPageShell>
      </div>
    </AnimatedBackground>
  );
}
