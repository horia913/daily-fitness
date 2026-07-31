import type { SupabaseClient } from "@supabase/supabase-js";
import { WorkoutSetEntryService } from "@/lib/workoutBlockService";
import { formExerciseToGroupModel } from "@/lib/groupModel/formToGroupModel";
import type { WorkoutSetEntry } from "@/types/workoutSetEntries";

function collectExerciseIdsForBlockName(
  exercise: Record<string, unknown>,
  exerciseType: string,
): string[] {
  const exerciseIds: string[] = [];
  if (exerciseType === "superset") {
    if (exercise.exercise_id) exerciseIds.push(String(exercise.exercise_id));
    if (exercise.superset_exercise_id) {
      exerciseIds.push(String(exercise.superset_exercise_id));
    }
  } else if (exerciseType === "giant_set") {
    const giant = exercise.giant_set_exercises as { exercise_id?: string }[] | undefined;
    giant?.forEach((gsEx) => {
      if (gsEx.exercise_id) exerciseIds.push(gsEx.exercise_id);
    });
  } else if (exerciseType === "pre_exhaustion") {
    if (exercise.exercise_id) exerciseIds.push(String(exercise.exercise_id));
    if (exercise.compound_exercise_id) {
      exerciseIds.push(String(exercise.compound_exercise_id));
    }
  } else if (exerciseType === "tabata") {
    const setsArray = Array.isArray(exercise.tabata_sets) ? exercise.tabata_sets : [];
    setsArray.forEach((set: { exercises?: { exercise_id?: string }[] }) => {
      set.exercises?.forEach((ex) => {
        if (ex.exercise_id && !exerciseIds.includes(ex.exercise_id)) {
          exerciseIds.push(ex.exercise_id);
        }
      });
    });
  } else if (exercise.exercise_id) {
    exerciseIds.push(String(exercise.exercise_id));
  }
  return exerciseIds;
}

/**
 * Warn if any set entry that should have workout_set_entry_exercises has none after save.
 * Uses one batched SELECT (HEAD+count per row was slow and returned 500 from PostgREST).
 */
async function warnIfAnySetEntryMissingExercises(
  supabase: SupabaseClient,
  templateId: string,
): Promise<void> {
  const { data: entries, error } = await supabase
    .from("workout_set_entries")
    .select("id, set_type")
    .eq("template_id", templateId);

  if (error || !entries?.length) return;

  const setEntryIds = entries.map((e) => e.id);
  if (setEntryIds.length === 0) return;
  const { data: wseeRows, error: wseeErr } = await supabase
    .from("workout_set_entry_exercises")
    .select("set_entry_id")
    .in("set_entry_id", setEntryIds);

  if (wseeErr) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[saveWorkoutTemplate] Could not verify set entry exercises:",
        wseeErr.message,
      );
    }
    return;
  }

  const countBySetEntry = new Map<string, number>();
  for (const row of wseeRows ?? []) {
    if (!row.set_entry_id) continue;
    countBySetEntry.set(
      row.set_entry_id,
      (countBySetEntry.get(row.set_entry_id) ?? 0) + 1,
    );
  }

  for (const entry of entries) {
    if ((countBySetEntry.get(entry.id) ?? 0) === 0) {
      console.warn(
        "[saveWorkoutTemplate] Set entry has 0 workout_set_entry_exercises after save (bug).",
        {
          set_entry_id: entry.id,
          set_type: entry.set_type,
          template_id: templateId,
        },
      );
    }
  }
}

export interface SaveWorkoutTemplateFormData {
  name: string;
  description: string;
  category: string;
  categoryId?: string;
  estimated_duration: number;
  difficulty_level: string;
}

export type SaveWorkoutTemplateProgress = {
  phase: "template" | "delete" | "block";
  current: number;
  total: number;
};

/** Stable JSON for comparing exercise lists (skip block DB work when unchanged). */
export function serializeExercisesForSaveCompare(exercises: unknown[]): string {
  return JSON.stringify(exercises);
}

export interface SaveWorkoutTemplateParams {
  supabase: SupabaseClient;
  userId: string;
  formData: SaveWorkoutTemplateFormData;
  exercises: any[];
  template?: any;
  generateBlockName: (exerciseIds: string[], exerciseType: string) => string;
  /** When false, only workout_templates row is updated (e.g. title-only edit). Default true. */
  saveBlocks?: boolean;
  /** Optional progress for UI (sequential save — one block at a time). */
  onProgress?: (progress: SaveWorkoutTemplateProgress) => void;
}

export interface SaveWorkoutTemplateResult {
  success: boolean;
  templateId?: string;
  error?: string;
}

export async function saveWorkoutTemplate(
  params: SaveWorkoutTemplateParams
): Promise<SaveWorkoutTemplateResult> {
  const {
    supabase,
    userId,
    formData,
    exercises,
    template,
    generateBlockName,
    saveBlocks = true,
    onProgress,
  } = params;

  try {
    if (!formData.name || formData.name.trim() === "") {
      return { success: false, error: "Workout name is required" };
    }

    const cleanFormData = {
      name: formData.name.trim(),
      description: formData.description || "",
      difficulty_level: (formData.difficulty_level || "intermediate").toLowerCase(),
      estimated_duration:
        formData.estimated_duration === 0 || !formData.estimated_duration ? 60 : formData.estimated_duration || 60,
      category: formData.category || "general",
    };

    const templateData = {
      ...cleanFormData,
      coach_id: userId,
      is_active: true,
      kind: 'library',
    };

    let savedTemplateId: string;

    onProgress?.({ phase: "template", current: 1, total: 1 });

    if (template) {
      const { data, error } = await supabase
        .from("workout_templates")
        .update(templateData)
        .eq("id", template.id)
        .select("id");

      if (error) {
        console.error("🚨 Update error details:", error);
        throw error;
      }
      savedTemplateId = data[0].id;
    } else {
      const { data, error } = await supabase
        .from("workout_templates")
        .insert(templateData)
        .select("id");

      if (error) {
        console.error("🚨 Insert error details:", error);
        console.error("🚨 Insert error message:", error.message);
        console.error("🚨 Insert error details:", error.details);
        console.error("🚨 Insert error hint:", error.hint);
        throw error;
      }
      savedTemplateId = data[0].id;
    }

    // Save workout blocks and exercises using SMART UPDATE strategy
    // This preserves block IDs to maintain referential integrity with historical workout data
    if (savedTemplateId && saveBlocks) {
      console.log(
        "🔍 Saving blocks and exercises for template (SMART UPDATE):",
        savedTemplateId,
      );

      // IDs only — full getWorkoutSetEntrys enrichment is expensive and unnecessary for save.
      const { data: existingRows, error: existingRowsError } = template
        ? await supabase
            .from("workout_set_entries")
            .select("id, set_type")
            .eq("template_id", savedTemplateId)
        : { data: [] as { id: string; set_type: string }[], error: null };

      if (existingRowsError) {
        throw existingRowsError;
      }

      const existingBlockIds = new Set(
        (existingRows ?? []).map((row) => row.id),
      );
      const newExerciseIds = new Set(
        exercises
          .map((e) => e.id)
          .filter((id): id is string => Boolean(id)),
      );

      // Delete blocks that were removed (exist in DB but not in new exercises) in parallel
      const blocksToDelete = (existingRows ?? []).filter(
        (row) => !newExerciseIds.has(row.id),
      );
      // One delete at a time — parallel deletes overload hosted Supabase (500/504).
      for (let d = 0; d < blocksToDelete.length; d++) {
        onProgress?.({
          phase: "delete",
          current: d + 1,
          total: blocksToDelete.length,
        });
        const deleted = await WorkoutSetEntryService.deleteWorkoutBlock(
          blocksToDelete[d].id,
        );
        if (!deleted) {
          throw new Error(
            `Failed to remove exercise block ${d + 1} of ${blocksToDelete.length}. Try again in a moment.`,
          );
        }
      }

      // Process each exercise: UPDATE if block exists, CREATE if new
      if (exercises.length > 0) {
        const processExerciseAtIndex = async (i: number) => {
          const exercise = exercises[i];
          const exerciseType = exercise.exercise_type || "straight_set";
          const isUpdate = exercise.id && existingBlockIds.has(exercise.id);

          const groupPayload = formExerciseToGroupModel(exercise, exerciseType);
          const exerciseIds = collectExerciseIdsForBlockName(exercise, exerciseType);
          const generatedBlockName = generateBlockName(exerciseIds, exerciseType);

          if (exerciseType === "speed_work") {
            const slot = groupPayload.slots[0];
            if (!groupPayload.total_sets || groupPayload.total_sets < 1) {
              throw new Error("Speed work: intervals must be at least 1");
            }
            if (!slot?.distance_meters || slot.distance_meters <= 0) {
              throw new Error("Speed work: distance in meters is required");
            }
          }
          if (exerciseType === "endurance") {
            const slot = groupPayload.slots[0];
            if (!slot?.distance_meters || slot.distance_meters <= 0) {
              throw new Error("Endurance: target distance is required");
            }
          }
          if (groupPayload.slots.length === 0) {
            throw new Error(`Exercise ID is required for ${exerciseType} blocks`);
          }

          const blockFields: Record<string, unknown> = {
            set_type: groupPayload.set_type,
            set_order: i + 1,
            set_name: generatedBlockName || undefined,
            set_notes: groupPayload.set_notes || undefined,
            total_sets: groupPayload.total_sets ?? undefined,
            reps_per_set: groupPayload.reps_per_set ?? undefined,
            rest_seconds: groupPayload.rest_seconds ?? undefined,
            duration_seconds: groupPayload.duration_seconds ?? undefined,
            rounds_driver: groupPayload.rounds_driver,
            interval_seconds: groupPayload.interval_seconds ?? null,
            time_cap_seconds: groupPayload.time_cap_seconds ?? null,
          };

          let block: WorkoutSetEntry | null = null;

          if (isUpdate && exercise.id) {
            console.log(`🔄 Updating existing block: ${exercise.id}`);
            await WorkoutSetEntryService.deleteAllChildTablesSequential(exercise.id);
            block = await WorkoutSetEntryService.updateWorkoutBlock(
              exercise.id,
              blockFields as any,
            );
          } else {
            console.log(`➕ Creating new block for exercise ${i + 1}`);
            block = await WorkoutSetEntryService.createWorkoutBlock(
              savedTemplateId,
              groupPayload.set_type as any,
              i + 1,
              blockFields as any,
            );
          }

          if (block) {
            await WorkoutSetEntryService.persistGroupModelSlots(
              block.id,
              groupPayload.slots,
            );
            console.log(
              `🔍 ${isUpdate ? "Updated" : "Created"} block ${i + 1}/${exercises.length}:`,
              block.id,
            );
          } else {
            console.error(
              `❌ Failed to ${isUpdate ? "update" : "create"} block for exercise ${i + 1}`,
            );
          }
        };

        // Sequential saves: hosted Supabase times out with concurrent block writes.
        for (let i = 0; i < exercises.length; i++) {
          onProgress?.({
            phase: "block",
            current: i + 1,
            total: exercises.length,
          });
          await processExerciseAtIndex(i);
          if (i < exercises.length - 1) {
            await new Promise((r) => setTimeout(r, 200));
          }
        }
        console.log(
          "🔍 Successfully saved all blocks and exercises (SMART UPDATE - preserves block IDs)",
        );
      } else {
        console.log("🔍 No exercises to save");
      }

      void warnIfAnySetEntryMissingExercises(supabase, savedTemplateId);
    } else if (savedTemplateId && !saveBlocks) {
      if (process.env.NODE_ENV !== "production") {
        console.log(
          "[saveWorkoutTemplate] Skipping block save — exercises unchanged:",
          savedTemplateId,
        );
      }
    }
    return { success: true, templateId: savedTemplateId };
  } catch (err: unknown) {
    const code =
      err &&
      typeof err === "object" &&
      "code" in err &&
      typeof (err as { code: unknown }).code === "string"
        ? (err as { code: string }).code
        : "";
    if (code === "57014") {
      return {
        success: false,
        error:
          "Save timed out — the database is busy. Wait a minute, refresh, and try again without tapping Update multiple times.",
      };
    }
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
