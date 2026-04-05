"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  MoreHorizontal,
  Play,
  ChevronDown,
  History,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { useTheme } from "@/contexts/ThemeContext";
import { fetchPersonalRecords } from "@/lib/personalRecords";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClientPageShell, ClientGlassCard, SectionHeader, PrimaryButton, SecondaryButton } from "@/components/client-ui";
import { withTimeout } from "@/lib/withTimeout";
import { formatPaceMinSecPerKm } from "@/lib/enduranceFormUtils";

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
  set_order: number | null;
  set_type: string | null;
  set_name: string | null;
  set_notes: string | null;
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
  const [loadingStartedAt, setLoadingStartedAt] = useState<number | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([]);
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(
    new Set()
  );

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
                  rir: exercise.rir ?? null,
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
        <div className="relative z-10 min-h-screen fc-page" style={{ paddingLeft: "var(--fc-page-px)", paddingRight: "var(--fc-page-px)" }}>
          <div className="pt-6 space-y-6 max-w-3xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="fc-skeleton w-9 h-9 rounded-full" />
              <div className="fc-skeleton h-3 w-24 rounded" />
              <div className="flex-1" />
              <div className="fc-skeleton w-9 h-9 rounded-full" />
            </div>
            <div className="space-y-3">
              <div className="fc-skeleton h-4 w-20 rounded" />
              <div className="fc-skeleton h-10 w-3/4 rounded" />
              <div className="fc-skeleton h-16 w-full rounded-2xl" />
            </div>
            <div className="fc-skeleton h-16 w-full rounded-2xl" />
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="fc-skeleton h-20 w-full rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </AnimatedBackground>
    );
  }

  if (error || !assignment) {
    return (
      <AnimatedBackground>
        <div className="relative z-10 min-h-screen fc-page">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-4 fc-glass fc-card px-8 py-6">
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

  // Get block type badge color (design system tokens)
  const getBlockTypeBadgeColor = (blockType: string | null) => {
    const vars = {
      workouts: {
        bg: "color-mix(in srgb, var(--fc-domain-workouts) 20%, transparent)",
        text: "var(--fc-domain-workouts)",
        border: "color-mix(in srgb, var(--fc-domain-workouts) 30%, transparent)",
      },
      warning: {
        bg: "color-mix(in srgb, var(--fc-status-warning) 20%, transparent)",
        text: "var(--fc-status-warning)",
        border: "color-mix(in srgb, var(--fc-status-warning) 30%, transparent)",
      },
      purple: {
        bg: "color-mix(in srgb, var(--fc-accent-purple) 20%, transparent)",
        text: "var(--fc-accent-purple)",
        border: "color-mix(in srgb, var(--fc-accent-purple) 30%, transparent)",
      },
      error: {
        bg: "color-mix(in srgb, var(--fc-status-error) 20%, transparent)",
        text: "var(--fc-status-error)",
        border: "color-mix(in srgb, var(--fc-status-error) 30%, transparent)",
      },
      indigo: {
        bg: "color-mix(in srgb, var(--fc-accent-indigo) 20%, transparent)",
        text: "var(--fc-accent-indigo)",
        border: "color-mix(in srgb, var(--fc-accent-indigo) 30%, transparent)",
      },
      success: {
        bg: "color-mix(in srgb, var(--fc-status-success) 20%, transparent)",
        text: "var(--fc-status-success)",
        border: "color-mix(in srgb, var(--fc-status-success) 30%, transparent)",
      },
      cyan: {
        bg: "color-mix(in srgb, var(--fc-accent-cyan) 20%, transparent)",
        text: "var(--fc-accent-cyan)",
        border: "color-mix(in srgb, var(--fc-accent-cyan) 30%, transparent)",
      },
    };
    if (!blockType) return vars.workouts;
    const type = blockType.toLowerCase();
    if (type.includes("superset")) return vars.warning;
    if (type.includes("drop")) return vars.purple;
    if (type.includes("giant")) return vars.error;
    if (type.includes("cluster")) return vars.indigo;
    if (type.includes("rest_pause")) return vars.cyan;
    if (type.includes("amrap") || type.includes("emom") || type.includes("for_time") || type.includes("tabata")) return vars.warning;
    return vars.workouts;
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
      
      // OPTIONAL: prescribed RPE (`rir` column), tempo, notes (only if set)
      // For SUPERSET: RPE, tempo, notes only for exercise 1 (first exercise, orderIndex === 0)
      if (blockType === "superset") {
        if (exercise.orderIndex === 0) {
          // Only show RPE/tempo/notes for first exercise in superset
          if (exercise.rir !== null && exercise.rir !== undefined) {
            result.push({ label: "RPE", value: `${exercise.rir}` });
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
        if (exercise.rir !== null && exercise.rir !== undefined) {
          result.push({ label: "RPE", value: `${exercise.rir}` });
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

  return (
    <AnimatedBackground>
      <style
        dangerouslySetInnerHTML={{
          __html: `
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
        <ClientPageShell className="min-h-screen pb-32">
          {/* Navigation */}
          <nav className="flex justify-between items-center mb-6" style={{ paddingLeft: "var(--fc-page-px)", paddingRight: "var(--fc-page-px)" }}>
            <button
              onClick={() => router.push("/client/train")}
              className="w-9 h-9 flex items-center justify-center rounded-full fc-surface border border-[color:var(--fc-surface-card-border)] transition-all active:scale-95"
            >
              <ChevronLeft className="w-5 h-5 fc-text-primary" />
            </button>
            <div className="text-center">
              <span className="text-[10px] uppercase tracking-[0.3em] fc-text-dim font-bold">Workout Details</span>
            </div>
            <button className="w-9 h-9 flex items-center justify-center rounded-full fc-surface border border-[color:var(--fc-surface-card-border)] transition-all active:scale-95" aria-label="More options">
              <MoreHorizontal className="w-5 h-5 fc-text-primary" />
            </button>
          </nav>

          <main className="max-w-3xl mx-auto pb-40" style={{ paddingLeft: "var(--fc-page-px)", paddingRight: "var(--fc-page-px)" }}>
            {/* Header Section */}
            <header className="mb-10">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                {assignment.category && (
                  <Badge
                    variant="fc-outline"
                    className="px-3 py-1 text-xs font-bold uppercase tracking-wider"
                  >
                    {assignment.category}
                  </Badge>
                )}
                {assignment.currentWeek != null && (
                  <span className="text-xs font-mono fc-text-dim">
                    PHASE • WEEK {assignment.currentWeek}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold tracking-tight mb-6 fc-text-primary">
                {assignment.name}
              </h1>
              {assignment.description && (
                <div className="fc-surface p-4 rounded-2xl border-l-4 border-l-[color:var(--fc-domain-workouts)]">
                  <p className="text-sm fc-text-dim italic leading-relaxed">{assignment.description}</p>
                </div>
              )}
            </header>

            {/* Stats Strip */}
            <section className="mb-8">
              <div className="fc-stats-strip">
                <div className="fc-stats-strip-item">
                  <span className="fc-stats-strip-value">~{assignment.estimatedDuration ?? 0}</span>
                  <span className="fc-stats-strip-label">Minutes</span>
                </div>
                <div className="fc-stats-strip-item">
                  <span className="fc-stats-strip-value">{totalSets}</span>
                  <span className="fc-stats-strip-label">Sets</span>
                </div>
                <div className="fc-stats-strip-item">
                  <span className="fc-stats-strip-value">{totalExercises}</span>
                  <span className="fc-stats-strip-label">Exercises</span>
                </div>
                <div className="fc-stats-strip-item">
                  <span className="fc-stats-strip-value">{blocks.length}</span>
                  <span className="fc-stats-strip-label">Sets</span>
                </div>
              </div>
            </section>

          {/* Exercise List */}
          <section style={{ marginBottom: "var(--fc-page-pb)" }}>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] fc-text-dim mb-6">
              Workout Content
            </h2>
            <div className="flex flex-col border-y border-white/5">
              {blocks.map((block, blockIndex) => {
                const isExpanded = expandedExercises.has(block.id);
                const badgeColor = getBlockTypeBadgeColor(block.blockType);
                const blockParams = getBlockParameters(block);

                return (
                  <div
                    key={block.id}
                    className={`exercise-item border-b border-white/5 last:border-b-0 ${isExpanded ? "active" : ""}`}
                    onClick={() => toggleExercise(block.id)}
                  >
                    <div className="cursor-pointer overflow-hidden transition-colors hover:bg-white/[0.02]">
                    <div
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold font-mono text-sm fc-text-primary" style={{ background: badgeColor.bg, color: badgeColor.text }}>
                          {String(blockIndex + 1).padStart(2, "0")}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="fc-badge fc-pill"
                              style={{
                                background: badgeColor.bg,
                                color: badgeColor.text,
                                border: `1px solid ${badgeColor.border}`,
                              }}
                            >
                              {formatBlockTypeLabel(block.blockType, null)}
                            </span>
                          </div>
                          <h4 className="text-lg font-bold fc-text-primary m-0">
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
                          {!isExpanded && block.exercises.length > 0 && (
                            <p className="text-xs fc-text-dim mt-1 m-0">
                              {block.exercises.length} exercise{block.exercises.length !== 1 ? "s" : ""}
                              {(() => {
                                const sets = block.rawBlock?.total_sets;
                                const reps = block.exercises[0]?.reps || block.rawBlock?.reps_per_set;
                                if (sets != null && reps) return ` — ${sets}×${reps}`;
                                if (sets != null) return ` — ${sets} sets`;
                                if (reps) return ` — ${reps} reps`;
                                return "";
                              })()}
                            </p>
                          )}
                        </div>
                      </div>
                      <ChevronDown className="rotate-icon w-5 h-5 fc-text-dim" />
                    </div>
                    {isExpanded && (
                      <div className="border-t border-white/5 px-4 pb-3 pt-3">
                        {/* Block Notes */}
                        {block.notes && (
                          <div
                            className="p-3 rounded-xl mb-4"
                            style={{
                              background: "color-mix(in srgb, var(--fc-domain-workouts) 8%, var(--fc-surface-card))",
                              borderLeft: "3px solid var(--fc-domain-workouts)",
                            }}
                          >
                            <p className="text-sm fc-text-primary leading-relaxed m-0">
                              {block.notes}
                            </p>
                          </div>
                        )}

                        {/* Block Parameters */}
                        {blockParams.length > 0 && (
                          <div
                            data-block-type={block.blockType}
                            data-block-id={block.id}
                            className="flex flex-wrap gap-3 mb-4 relative z-[1]"
                          >
                            {blockParams.map((param, idx) => (
                              <div
                                key={`${block.id}-param-${idx}`}
                                data-param-label={param.label}
                                data-param-value={param.value}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl"
                                style={{ background: "var(--fc-surface-sunken)" }}
                              >
                                <span className="text-[10px] uppercase tracking-wider fc-text-dim font-semibold">
                                  {param.label}
                                </span>
                                <span className="font-mono font-bold text-sm fc-text-primary">
                                  {param.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Exercises in Block */}
                        <div className="flex flex-col border-t border-white/5">
                          {block.exercises.map((exercise, exerciseIndex) => {
                            const previousBest = getPreviousBest(exercise.name);
                            const exerciseBadgeColor = getBlockTypeBadgeColor(
                              block.blockType
                            );

                            return (
                              <div
                                key={exercise.id}
                                className="flex flex-col gap-3 border-b border-white/5 py-3 transition-all duration-200 last:border-b-0"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold font-mono text-xs fc-text-dim flex-shrink-0" style={{ background: "var(--fc-surface-card)" }}>
                                    {exercise.exerciseLetter || String(exerciseIndex + 1).padStart(2, "0")}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    {exercise.exerciseLetter && (
                                      <span className="fc-badge fc-pill fc-text-warning border border-[color:var(--fc-status-warning)] bg-[color-mix(in_srgb,var(--fc-status-warning)_15%,transparent)] mb-1 inline-block">
                                        {formatBlockTypeLabel(
                                          block.blockType,
                                          exercise.exerciseLetter
                                        )}
                                      </span>
                                    )}
                                    <h3 className="text-base font-semibold fc-text-primary mt-1">
                                      {exercise.name}
                                    </h3>
                                    {exercise.notes && (
                                      <p className="text-xs fc-text-dim mt-1 leading-relaxed">
                                        {exercise.notes}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Exercise Card Fields — primary (Sets/Reps/Rest) > secondary (Weight/Load) > tertiary (RPE/Tempo/Notes) */}
                                {(() => {
                                  const blockType = (block.blockType || "").toLowerCase();
                                  const isTimeBased = ["amrap", "emom", "for_time", "tabata"].includes(blockType);
                                  const primaryLabels = ["Sets", "Reps", "Rest"];
                                  const secondaryLabels = ["Weight", "Load %"];
                                  const tertiaryLabels = ["RPE", "Tempo", "Notes"];

                                  if (isTimeBased) {
                                    const timeParams = getTimeBasedParameters(block, exercise);
                                    if (timeParams.length > 0) {
                                      const primary = timeParams.filter((p) => ["Duration", "Work time", "Rest time", "Time cap", "Rounds"].includes(p.label));
                                      const rest = timeParams.filter((p) => !primary.some((x) => x.label === p.label));
                                      return (
                                        <div className="space-y-3 mt-3">
                                          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
                                            {timeParams.map((param, idx) => (
                                              <div key={idx} className="flex items-baseline gap-2">
                                                <span className="text-xs uppercase tracking-wider fc-text-dim">{param.label}</span>
                                                <span className="font-mono font-bold text-xl fc-text-primary">{param.value}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    }
                                    return null;
                                  }

                                  if (blockType === "speed_work" || blockType === "endurance") {
                                    const seParams = getSpeedEnduranceDisplayFields(block, exercise);
                                    if (seParams.length > 0) {
                                      return (
                                        <div className="space-y-3 mt-3">
                                          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
                                            {seParams.map((param, idx) => (
                                              <div key={idx} className="flex items-baseline gap-2">
                                                <span className="text-xs uppercase tracking-wider fc-text-dim">{param.label}</span>
                                                <span className="font-mono font-bold text-xl fc-text-primary">{param.value}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    }
                                  }

                                  const exerciseFields = getExerciseCardFields(block, exercise);
                                  if (exerciseFields.length === 0) return null;

                                  const primary = exerciseFields.filter((f) => primaryLabels.includes(f.label));
                                  const secondary = exerciseFields.filter((f) => secondaryLabels.includes(f.label));
                                  const tertiary = exerciseFields.filter((f) => tertiaryLabels.includes(f.label));
                                  const other = exerciseFields.filter((f) => !primaryLabels.includes(f.label) && !secondaryLabels.includes(f.label) && !tertiaryLabels.includes(f.label));

                                  return (
                                    <div className="space-y-3 mt-3">
                                      {/* Primary: Sets, Reps, Rest — gym-floor essentials, largest */}
                                      {primary.length > 0 && (
                                        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
                                          {primary.map((field, idx) => (
                                            <div key={idx} className="flex items-baseline gap-2">
                                              <span className="text-xs uppercase tracking-wider fc-text-dim">{field.label}</span>
                                              <span className={`font-mono font-bold text-xl ${field.label === "Rest" ? "text-[color:var(--fc-accent-cyan)]" : "fc-text-primary"}`}>
                                                {field.value || "—"}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {/* Secondary: Weight, Load % */}
                                      {(secondary.length > 0 || other.length > 0) && (
                                        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                                          {[...secondary, ...other].map((field, idx) => (
                                            <div key={idx} className="flex items-baseline gap-1.5">
                                              <span className="text-[10px] uppercase fc-text-dim">{field.label}</span>
                                              <span className="font-mono font-medium fc-text-primary">{field.value || "—"}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {/* Tertiary: RPE, Tempo, Notes — small, muted */}
                                      {tertiary.length > 0 && (
                                        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs fc-text-dim">
                                          {tertiary.map((field, idx) => (
                                            <div key={idx} className="flex items-baseline gap-1.5">
                                              <span className="uppercase">{field.label}</span>
                                              <span className="font-mono">{field.value || "—"}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}

                                {/* Previous Best */}
                                {previousBest && (
                                  <div className="flex items-center justify-between border-l-2 border-l-[color:var(--fc-status-success)] py-2 pl-3">
                                    <div className="flex items-center gap-2">
                                      <History className="w-3 h-3 fc-text-dim" />
                                      <span className="text-xs fc-text-dim">
                                        PR:{" "}
                                        <span className="fc-text-primary font-bold font-mono">
                                          {previousBest.record}
                                        </span>
                                      </span>
                                    </div>
                                    <TrendingUp className="w-3 h-3 fc-text-success" />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Spacer for bottom action bar */}
          <div className="h-20" />
        </main>

        {/* Fixed Bottom Action Bar */}
        <div className="fixed bottom-20 left-0 right-0 px-4 z-50">
          <div className="max-w-3xl mx-auto">
            <PrimaryButton
              className="h-14 rounded-2xl gap-3 text-base uppercase tracking-wider"
              onClick={() => { window.location.href = `/client/workouts/${assignment.id}/start`; }}
            >
              <Play className="w-5 h-5 fill-current" />
              Begin Workout
            </PrimaryButton>
          </div>
        </div>
      </ClientPageShell>
    </div>
    </AnimatedBackground>
  );
}
