"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Clock, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { BlockCardDisplay } from "@/components/WorkoutBlocks/BlockCardDisplay";
import type { WorkoutBlockDisplay } from "@/components/WorkoutBlocks/types";

interface AssignmentInfo {
  id: string;
  name: string;
  description: string | null;
  scheduledDate: string | null;
  status: string | null;
  workoutTemplateId: string | null;
}

interface ClientExerciseDisplay {
  id: string;
  name: string;
  description: string;
  sets: number | null;
  reps: string | null;
  restSeconds: number | null;
  weightGuidance: string | null;
  orderIndex: number;
  blockName: string | null;
  blockType: string | null;
  exerciseLetter: string | null;
  notes: string | null;
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
  block_parameters?: unknown;
  exercises?: ClientBlockExerciseRecord[] | null;
  [key: string]: any;
};

const safeParse = (value: unknown) => {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn("Failed to parse JSON value", value, error);
      return {};
    }
  }
  if (typeof value === "object") {
    return (value as Record<string, any>) || {};
  }
  return {};
};

export default function WorkoutDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [assignment, setAssignment] = useState<AssignmentInfo | null>(null);
  const [blocks, setBlocks] = useState<StructuredBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        });

        // Fetch original blocks using workout_template_id from assignment
        if (!assignmentRow.workout_template_id) {
          throw new Error("Workout template ID not found in assignment");
        }

        // Use WorkoutBlockService to fetch blocks (handles RLS properly)
        const { WorkoutBlockService } = await import("@/lib/workoutBlockService");
        const workoutBlocks = await WorkoutBlockService.getWorkoutBlocks(
          assignmentRow.workout_template_id
        );

        if (!workoutBlocks || workoutBlocks.length === 0) {
          setBlocks([]);
          return;
        }

        // Convert WorkoutBlock[] to ClientBlockRecord[] format
        const clientBlocks: ClientBlockRecord[] = workoutBlocks.map((block) => ({
          id: block.id,
          block_order: block.block_order,
          block_type: block.block_type,
          block_name: block.block_name ?? null,
          block_notes: block.block_notes ?? null,
          total_sets: block.total_sets ?? null,
          reps_per_set: block.reps_per_set ?? null,
          rest_seconds: block.rest_seconds ?? null,
          duration_seconds: block.duration_seconds ?? null,
          block_parameters: block.block_parameters ?? null,
          exercises: (block.exercises ?? []).map((ex) => ({
            id: ex.id,
            exercise_id: ex.exercise_id,
            exercise_order: ex.exercise_order,
            exercise_letter: ex.exercise_letter ?? null,
            sets: ex.sets ?? null,
            reps: ex.reps ?? null,
            weight_kg: ex.weight_kg ?? null,
            rir: ex.rir ?? null,
            tempo: ex.tempo ?? null,
            rest_seconds: ex.rest_seconds ?? null,
            notes: ex.notes ?? null,
          })) as any[],
        }));
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

                return {
                  id: exercise.id,
                  name:
                    meta?.name ||
                    exercise.exercise_letter ||
                    `Exercise ${orderIndex + 1}`,
                  description: meta?.description || "",
                  sets: exercise.sets ?? block.total_sets ?? null,
                  reps: exercise.reps ?? block.reps_per_set ?? null,
                  restSeconds:
                    exercise.rest_seconds ?? block.rest_seconds ?? null,
                  weightGuidance:
                    exercise.weight_kg !== null &&
                    exercise.weight_kg !== undefined
                      ? `${exercise.weight_kg} kg`
                      : null,
                  orderIndex,
                  blockName: block.block_name,
                  blockType: block.block_type,
                  exerciseLetter: exercise.exercise_letter,
                  notes: exercise.notes,
                  raw: exercise,
                  meta: parsedNotes,
                };
              })
              .sort((a, b) => a.orderIndex - b.orderIndex);

            return {
              id: block.id,
              blockName: block.block_name,
              blockType: block.block_type,
              blockOrder:
                typeof block.block_order === "number" &&
                Number.isFinite(block.block_order)
                  ? block.block_order
                  : Number.MAX_SAFE_INTEGER,
              notes: block.block_notes,
              exercises,
              rawBlock: block,
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

  const formattedBlocks: WorkoutBlockDisplay[] = useMemo(() => {
    return blocks.map((block) => ({
      ...block,
      displayType: block.blockType
        ? block.blockType
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")
        : "Straight Set",
    })) as WorkoutBlockDisplay[];
  }, [blocks]);

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
              <Button
                onClick={() => router.push("/client")}
                variant="outline"
                className="rounded-full px-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            </div>
          </div>
        </div>
      </AnimatedBackground>
    );
  }

  return (
    <AnimatedBackground>
      <div className="relative z-10 min-h-screen px-5 py-6 pb-32 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-4xl space-y-6">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => router.push("/client")}
              className="rounded-full px-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            {assignment.scheduledDate && (
              <Badge
                variant="outline"
                className="rounded-full text-sm px-4 py-2 bg-white/70 backdrop-blur-sm dark:bg-slate-800/70"
              >
                Scheduled:{" "}
                {new Date(assignment.scheduledDate).toLocaleDateString()}
              </Badge>
            )}
          </div>

          <Card className="border border-white/20 bg-white/90 shadow-lg rounded-3xl dark:bg-slate-800/80 dark:border-slate-700">
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <CardTitle className="text-3xl font-bold text-slate-900 dark:text-white">
                  {assignment.name}
                </CardTitle>
                <Badge className="flex items-center gap-2 rounded-full px-4 py-2 bg-purple-100 text-purple-700 border-none">
                  <Clock className="w-4 h-4" />
                  {formattedBlocks.reduce(
                    (acc, block) => acc + block.exercises.length,
                    0
                  )}{" "}
                  exercises
                </Badge>
              </div>
              {assignment.description && (
                <p className="mt-3 text-slate-600 text-sm leading-6 dark:text-slate-300">
                  {assignment.description}
                </p>
              )}
            </CardHeader>
          </Card>

          {formattedBlocks.length === 0 ? (
            <Card className="border border-white/20 bg-white/80 shadow-lg rounded-3xl dark:bg-slate-800/80 dark:border-slate-700">
              <CardContent className="py-12 text-center text-slate-600 dark:text-slate-300">
                No exercises found for this workout yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {formattedBlocks.map((block, blockIndex) => (
                <BlockCardDisplay
                  key={block.id}
                  block={block}
                  index={blockIndex}
                />
              ))}
            </div>
          )}

          <div className="pt-4 text-center">
            <Button
              onClick={() =>
                router.push(`/client/workouts/${assignment.id}/start`)
              }
              className="rounded-full px-6 py-3 text-base font-semibold shadow-lg"
            >
              <Play className="w-5 h-5 mr-2" />
              Start Workout
            </Button>
          </div>
        </div>
      </div>
    </AnimatedBackground>
  );
}
