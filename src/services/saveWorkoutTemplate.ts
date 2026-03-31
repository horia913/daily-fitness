import type { SupabaseClient } from "@supabase/supabase-js";
import { WorkoutBlockService } from "@/lib/workoutBlockService";
import type { WorkoutBlock } from "@/types/workoutBlocks";

const SET_TYPES_REQUIRING_WSEE = new Set([
  "straight_set",
  "superset",
  "giant_set",
  "pre_exhaustion",
]);

/**
 * Warn if any set entry that should have workout_set_entry_exercises has none after save.
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

  for (const entry of entries) {
    if (!SET_TYPES_REQUIRING_WSEE.has(entry.set_type)) continue;

    const { count, error: countErr } = await supabase
      .from("workout_set_entry_exercises")
      .select("id", { count: "exact", head: true })
      .eq("set_entry_id", entry.id);

    if (countErr) continue;
    if (count === 0) {
      console.warn(
        "[saveWorkoutTemplate] Set entry has 0 workout_set_entry_exercises after save (bug).",
        { set_entry_id: entry.id, set_type: entry.set_type, template_id: templateId },
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

export interface SaveWorkoutTemplateParams {
  supabase: SupabaseClient;
  userId: string;
  formData: SaveWorkoutTemplateFormData;
  exercises: any[];
  template?: any;
  generateBlockName: (exerciseIds: string[], exerciseType: string) => string;
}

export interface SaveWorkoutTemplateResult {
  success: boolean;
  templateId?: string;
  error?: string;
}

export async function saveWorkoutTemplate(
  params: SaveWorkoutTemplateParams
): Promise<SaveWorkoutTemplateResult> {
  const { supabase, userId, formData, exercises, template, generateBlockName } = params;

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
    };

    let savedTemplateId: string;

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
    if (savedTemplateId) {
      console.log(
        "🔍 Saving blocks and exercises for template (SMART UPDATE):",
        savedTemplateId,
      );

      // Get existing blocks for this template
      const existingBlocks =
        await WorkoutBlockService.getWorkoutBlocks(savedTemplateId);
      const existingBlockIds = new Set(existingBlocks.map((b) => b.id));
      const newExerciseIds = new Set(
        exercises
          .map((e) => e.id)
          .filter((id): id is string => Boolean(id)),
      );

      // Delete blocks that were removed (exist in DB but not in new exercises) in parallel
      const blocksToDelete = existingBlocks.filter(
        (block) => !newExerciseIds.has(block.id),
      );
      if (blocksToDelete.length > 0) {
        await Promise.all(
          blocksToDelete.map((block) =>
            WorkoutBlockService.deleteWorkoutBlock(block.id),
          ),
        );
      }

      // Process each exercise: UPDATE if block exists, CREATE if new
      if (exercises.length > 0) {
        for (let i = 0; i < exercises.length; i++) {
          const exercise = exercises[i];
          const exerciseType = exercise.exercise_type || "straight_set";
          const isUpdate = exercise.id && existingBlockIds.has(exercise.id);

          // All block types now use relational tables - no block_parameters needed

          // SMART UPDATE: Create new block OR update existing block
          let block: WorkoutBlock | null = null;

          if (isUpdate && exercise.id) {
            // UPDATE existing block (preserves block ID for referential integrity)
            console.log(`🔄 Updating existing block: ${exercise.id}`);

            // Clear ALL child rows for this set entry in one transaction (RPC),
            // then reinsert from form. Type-specific delete missed rows on type
            // changes; timeout-based delete could leave stale workout_set_entry_exercises.
            await WorkoutBlockService.deleteAllRelatedDataForSetEntryStrict(
              exercise.id,
            );

            // Collect exercise IDs for block name generation
            const exerciseIds: string[] = [];
            if (exerciseType === "superset") {
              if (exercise.exercise_id)
                exerciseIds.push(exercise.exercise_id);
              if (exercise.superset_exercise_id)
                exerciseIds.push(exercise.superset_exercise_id);
            } else if (exerciseType === "giant_set") {
              if (
                exercise.giant_set_exercises &&
                Array.isArray(exercise.giant_set_exercises)
              ) {
                exercise.giant_set_exercises.forEach((gsEx: any) => {
                  if (gsEx.exercise_id) exerciseIds.push(gsEx.exercise_id);
                });
              }
            } else if (exerciseType === "pre_exhaustion") {
              if (exercise.exercise_id)
                exerciseIds.push(exercise.exercise_id);
              if (exercise.compound_exercise_id)
                exerciseIds.push(exercise.compound_exercise_id);
            } else if (exerciseType === "tabata") {
              if (
                exercise.tabata_sets &&
                Array.isArray(exercise.tabata_sets)
              ) {
                exercise.tabata_sets.forEach((set: any) => {
                  if (set.exercises && Array.isArray(set.exercises)) {
                    set.exercises.forEach((ex: any) => {
                      if (
                        ex.exercise_id &&
                        !exerciseIds.includes(ex.exercise_id)
                      ) {
                        exerciseIds.push(ex.exercise_id);
                      }
                    });
                  }
                });
              }
            } else {
              // For all other block types (straight_set, drop_set, cluster_set, rest_pause, amrap, emom, for_time)
              if (exercise.exercise_id)
                exerciseIds.push(exercise.exercise_id);
            }

            // Generate block name from exercise names
            const generatedBlockName = generateBlockName(
              exerciseIds,
              exerciseType,
            );
            console.log(
              `🔍 Generated block name for ${exerciseType}: "${generatedBlockName}" from ${exerciseIds.length} exercise IDs`,
            );

            // Update the block itself
            block = await WorkoutBlockService.updateWorkoutBlock(
              exercise.id,
              {
                set_type: exerciseType as any,
                set_order: i + 1,
                set_name: generatedBlockName || undefined,
                set_notes: exercise.notes || undefined,
                total_sets: exercise.sets
                  ? parseInt(exercise.sets)
                  : undefined,
                reps_per_set: exercise.reps || undefined,
                rest_seconds: exercise.rest_seconds
                  ? Math.round(parseFloat(exercise.rest_seconds))
                  : undefined,
                duration_seconds: exercise.amrap_duration
                  ? parseInt(exercise.amrap_duration) * 60
                  : exercise.emom_duration
                    ? parseInt(exercise.emom_duration) * 60
                    : undefined,
              },
            );
          } else {
            // CREATE new block
            console.log(`➕ Creating new block for exercise ${i + 1}`);

            // Collect exercise IDs for block name generation
            const exerciseIds: string[] = [];
            if (exerciseType === "superset") {
              if (exercise.exercise_id)
                exerciseIds.push(exercise.exercise_id);
              if (exercise.superset_exercise_id)
                exerciseIds.push(exercise.superset_exercise_id);
            } else if (exerciseType === "giant_set") {
              if (
                exercise.giant_set_exercises &&
                Array.isArray(exercise.giant_set_exercises)
              ) {
                exercise.giant_set_exercises.forEach((gsEx: any) => {
                  if (gsEx.exercise_id) exerciseIds.push(gsEx.exercise_id);
                });
              }
            } else if (exerciseType === "pre_exhaustion") {
              if (exercise.exercise_id)
                exerciseIds.push(exercise.exercise_id);
              if (exercise.compound_exercise_id)
                exerciseIds.push(exercise.compound_exercise_id);
            } else if (exerciseType === "tabata") {
              if (
                exercise.tabata_sets &&
                Array.isArray(exercise.tabata_sets)
              ) {
                exercise.tabata_sets.forEach((set: any) => {
                  if (set.exercises && Array.isArray(set.exercises)) {
                    set.exercises.forEach((ex: any) => {
                      if (
                        ex.exercise_id &&
                        !exerciseIds.includes(ex.exercise_id)
                      ) {
                        exerciseIds.push(ex.exercise_id);
                      }
                    });
                  }
                });
              }
            } else {
              // For all other block types (straight_set, drop_set, cluster_set, rest_pause, amrap, emom, for_time)
              if (exercise.exercise_id)
                exerciseIds.push(exercise.exercise_id);
            }

            // Generate block name from exercise names
            const generatedBlockName = generateBlockName(
              exerciseIds,
              exerciseType,
            );
            console.log(
              `🔍 Generated block name for ${exerciseType}: "${generatedBlockName}" from ${exerciseIds.length} exercise IDs`,
            );

            block = await WorkoutBlockService.createWorkoutBlock(
              savedTemplateId,
              exerciseType as any,
              i + 1, // set_order
              {
                set_name: generatedBlockName || undefined,
                set_notes: exercise.notes || undefined,
                total_sets: exercise.sets
                  ? parseInt(exercise.sets)
                  : undefined,
                reps_per_set: exercise.reps || undefined,
                rest_seconds: exercise.rest_seconds
                  ? Math.round(parseFloat(exercise.rest_seconds))
                  : undefined,
                duration_seconds: exercise.amrap_duration
                  ? parseInt(exercise.amrap_duration) * 60
                  : exercise.emom_duration
                    ? parseInt(exercise.emom_duration) * 60
                    : undefined,
              },
            );
          }

          if (block) {
            // Add main exercise to block
            let mainExerciseId: string | null = null;
            let mainExerciseOrder = 1;

            // For giant_set, don't add main exercise here - it will be added from giant_set_exercises array
            // For time-based blocks (amrap, emom, for_time, tabata), they don't use workout_set_entry_exercises,
            // only workout_time_protocols, so we just set mainExerciseId directly
            if (exercise.exercise_id) {
              if (exerciseType === "giant_set") {
                // Giant set exercises are added from giant_set_exercises array below
                // mainExerciseId will be set there
              } else if (
                exerciseType === "amrap" ||
                exerciseType === "emom" ||
                exerciseType === "for_time" ||
                exerciseType === "tabata"
              ) {
                // Time-based blocks don't use workout_set_entry_exercises, only workout_time_protocols
                // Set mainExerciseId directly for time protocol creation
                mainExerciseId = exercise.exercise_id;
              } else if (exerciseType === "pre_exhaustion") {
                // Isolation + compound are inserted in the pre_exhaustion section below
                // (do not add isolation here — that duplicated the A exercise)
              } else {
                // For all other block types, add exercise to workout_set_entry_exercises
                const addedExercise =
                  await WorkoutBlockService.addExerciseToBlock(
                    block.id,
                    exercise.exercise_id,
                    1, // exercise_order (block number)
                    {
                      exercise_letter:
                        exerciseType === "superset" ||
                        exerciseType === "pre_exhaustion"
                          ? "A"
                          : undefined,
                      sets: exercise.sets
                        ? parseInt(exercise.sets)
                        : undefined,
                      // For pre-exhaustion, use isolation_reps for the isolation exercise (exercise_letter "A")
                      reps:
                        exerciseType === "pre_exhaustion" &&
                        exercise.isolation_reps &&
                        exercise.isolation_reps.trim() !== ""
                          ? exercise.isolation_reps
                          : exercise.reps && exercise.reps.trim() !== ""
                            ? exercise.reps
                            : undefined,
                      // For superset and pre_exhaustion: NO rest_seconds for exercises (they're done back-to-back)
                      // rest_seconds in workout_set_entries is for rest AFTER completing the superset/pre-exhaustion
                      rest_seconds:
                        exerciseType === "superset" ||
                        exerciseType === "pre_exhaustion"
                          ? undefined
                          : exercise.rest_seconds
                            ? Math.round(parseFloat(exercise.rest_seconds))
                            : undefined,
                      rir: exercise.rir
                        ? parseInt(exercise.rir)
                        : undefined,
                      tempo: exercise.tempo || undefined,
                      notes: exercise.notes || undefined,
                      load_percentage: exercise.load_percentage
                        ? parseFloat(exercise.load_percentage)
                        : undefined,
                      weight_kg: exercise.weight_kg
                        ? parseFloat(exercise.weight_kg)
                        : undefined,
                    },
                  );
                if (addedExercise) {
                  mainExerciseId = exercise.exercise_id;
                }
              }
            }

            // Add additional exercises for complex types
            if (
              exerciseType === "superset" &&
              exercise.superset_exercise_id
            ) {
              // Superset exercises have NO rest between them (like giant set)
              // rest_seconds in workout_set_entries is for rest AFTER completing the superset
              // Second exercise uses SAME columns (reps, load_percentage, weight_kg) but exercise_letter = "B"
              await WorkoutBlockService.addExerciseToBlock(
                block.id,
                exercise.superset_exercise_id,
                1, // Same exercise_order as first exercise
                {
                  exercise_letter: "B",
                  sets: exercise.sets ? parseInt(exercise.sets) : undefined,
                  reps:
                    exercise.superset_reps || exercise.reps || undefined,
                  // NO rest_seconds for superset exercises (they're done back-to-back)
                  rest_seconds: undefined,
                  // Load percentage for second exercise - uses SAME column as first exercise
                  load_percentage: (exercise as any)
                    .superset_load_percentage
                    ? parseFloat((exercise as any).superset_load_percentage)
                    : undefined,
                  weight_kg: (exercise as any).superset_weight_kg
                    ? parseFloat((exercise as any).superset_weight_kg)
                    : undefined,
                  tempo:
                    (exercise as any).superset_tempo ||
                    exercise.tempo ||
                    undefined,
                  rir:
                    (exercise as any).superset_rir || exercise.rir
                      ? parseInt(
                          (exercise as any).superset_rir || exercise.rir,
                        )
                      : undefined,
                  notes:
                    (exercise as any).superset_notes ||
                    exercise.notes ||
                    undefined,
                },
              );
            }

            if (
              exerciseType === "giant_set" &&
              exercise.giant_set_exercises &&
              Array.isArray(exercise.giant_set_exercises)
            ) {
              // For giant_set, add ALL exercises from giant_set_exercises array
              // Set mainExerciseId to first exercise for time protocol creation
              for (
                let j = 0;
                j < exercise.giant_set_exercises.length;
                j++
              ) {
                const giantEx = exercise.giant_set_exercises[j];
                if (giantEx.exercise_id) {
                  // Each exercise in giant set gets exercise_letter A, B, C, D, etc.
                  const exerciseLetter = String.fromCharCode(65 + j); // A=65, B=66, C=67, etc.
                  const addedExercise =
                    await WorkoutBlockService.addExerciseToBlock(
                      block.id,
                      giantEx.exercise_id,
                      1, // Same exercise_order for all exercises in the block
                      {
                        exercise_letter: exerciseLetter,
                        sets:
                          giantEx.sets || exercise.sets
                            ? parseInt(giantEx.sets || exercise.sets)
                            : undefined,
                        reps:
                          giantEx.reps && giantEx.reps.trim() !== ""
                            ? giantEx.reps
                            : exercise.reps && exercise.reps.trim() !== ""
                              ? exercise.reps
                              : undefined,
                        rest_seconds: exercise.rest_seconds
                          ? parseInt(exercise.rest_seconds)
                          : undefined,
                        // Load percentage can be set individually for each exercise in giant set
                        load_percentage: giantEx.load_percentage
                          ? parseFloat(giantEx.load_percentage)
                          : exercise.load_percentage
                            ? parseFloat(exercise.load_percentage)
                            : undefined,
                        weight_kg: giantEx.weight_kg
                          ? parseFloat(giantEx.weight_kg)
                          : exercise.weight_kg
                            ? parseFloat(exercise.weight_kg)
                            : undefined,
                        tempo: giantEx.tempo || exercise.tempo || undefined,
                        rir:
                          giantEx.rir || exercise.rir
                            ? parseInt(giantEx.rir || exercise.rir)
                            : undefined,
                        notes: giantEx.notes || exercise.notes || undefined,
                      },
                    );
                  // Set mainExerciseId to first exercise (j=0) for time protocol creation
                  if (j === 0 && addedExercise) {
                    mainExerciseId = giantEx.exercise_id;
                  }
                }
              }
            }

            if (exerciseType === "pre_exhaustion") {
              // Isolation exercise (first) - exercise_letter = "A"
              if (exercise.exercise_id) {
                await WorkoutBlockService.addExerciseToBlock(
                  block.id,
                  exercise.exercise_id,
                  1, // exercise_order (block number)
                  {
                    exercise_letter: "A",
                    sets: exercise.sets
                      ? parseInt(exercise.sets)
                      : undefined,
                    reps:
                      exercise.isolation_reps &&
                      exercise.isolation_reps.trim() !== ""
                        ? exercise.isolation_reps
                        : exercise.reps && exercise.reps.trim() !== ""
                          ? exercise.reps
                          : undefined,
                    // NO rest_seconds for pre-exhaustion exercises (they're done back-to-back)
                    // rest_seconds in workout_set_entries is for rest AFTER completing the pre-exhaustion
                    rest_seconds: undefined,
                    load_percentage: exercise.load_percentage
                      ? parseFloat(exercise.load_percentage)
                      : undefined,
                    weight_kg: exercise.weight_kg
                      ? parseFloat(exercise.weight_kg)
                      : undefined,
                    tempo: exercise.tempo || undefined,
                    rir: exercise.rir ? parseInt(exercise.rir) : undefined,
                    notes: exercise.notes || undefined,
                  },
                );
              }
              // Compound exercise (second) - exercise_letter = "B"
              if (exercise.compound_exercise_id) {
                await WorkoutBlockService.addExerciseToBlock(
                  block.id,
                  exercise.compound_exercise_id,
                  1, // Same exercise_order as isolation exercise
                  {
                    exercise_letter: "B",
                    sets: exercise.sets
                      ? parseInt(exercise.sets)
                      : undefined,
                    reps:
                      exercise.compound_reps &&
                      exercise.compound_reps.trim() !== ""
                        ? exercise.compound_reps
                        : exercise.reps && exercise.reps.trim() !== ""
                          ? exercise.reps
                          : undefined,
                    // NO rest_seconds for pre-exhaustion exercises (they're done back-to-back)
                    rest_seconds: undefined,
                    // Uses SAME column as isolation exercise
                    load_percentage: (exercise as any)
                      .compound_load_percentage
                      ? parseFloat(
                          (exercise as any).compound_load_percentage,
                        )
                      : exercise.load_percentage
                        ? parseFloat(exercise.load_percentage)
                        : undefined,
                    // Uses SAME column as isolation exercise
                    weight_kg: (exercise as any).compound_weight_kg
                      ? parseFloat((exercise as any).compound_weight_kg)
                      : exercise.weight_kg
                        ? parseFloat(exercise.weight_kg)
                        : undefined,
                    tempo:
                      (exercise as any).compound_tempo ||
                      exercise.tempo ||
                      undefined,
                    rir:
                      (exercise as any).compound_rir || exercise.rir
                        ? parseInt(
                            (exercise as any).compound_rir || exercise.rir,
                          )
                        : undefined,
                    notes:
                      (exercise as any).compound_notes ||
                      exercise.notes ||
                      undefined,
                  },
                );
              }
            }

            // Create special table records for block types that need them
            if (mainExerciseId && exerciseType === "drop_set") {
              // Create drop set records
              // For drop_set, the initial weight/load_percentage is stored in the first drop_set record (drop_order=1)
              const initialWeight = exercise.weight_kg
                ? parseFloat(exercise.weight_kg)
                : null;
              const initialLoadPercentage = exercise.load_percentage
                ? parseFloat(exercise.load_percentage)
                : null;
              const dropPercentage = exercise.drop_percentage
                ? parseInt(exercise.drop_percentage)
                : 20;

              // First drop record stores the INITIAL weight/load_percentage (drop_order=1)
              await WorkoutBlockService.createDropSet(
                block.id,
                mainExerciseId,
                mainExerciseOrder,
                1, // drop_order
                initialWeight, // Initial weight (not the drop weight)
                exercise.drop_set_reps || exercise.reps || "8-10",
                initialLoadPercentage, // Initial load_percentage
                dropPercentage, // drop_percentage - percentage to reduce weight
                // rest_seconds removed - rest is stored in workout_set_entries.rest_seconds
              );

              // If there's a drop percentage, create a second drop record with the reduced weight
              if (initialWeight && dropPercentage > 0) {
                const firstDropWeight =
                  initialWeight * (1 - dropPercentage / 100);
                await WorkoutBlockService.createDropSet(
                  block.id,
                  mainExerciseId,
                  mainExerciseOrder,
                  2, // drop_order
                  firstDropWeight, // Drop weight
                  exercise.drop_set_reps || exercise.reps || "8-10",
                  null, // No load_percentage for drop weight (it's calculated from initial)
                  dropPercentage, // drop_percentage - percentage to reduce weight
                );
              }
            }

            if (mainExerciseId && exerciseType === "cluster_set") {
              // Create cluster set record
              const clusterWeight = exercise.weight_kg
                ? parseFloat(exercise.weight_kg)
                : null;
              const clusterLoadPercentage = exercise.load_percentage
                ? parseFloat(exercise.load_percentage)
                : null;
              await WorkoutBlockService.createClusterSet(
                block.id,
                mainExerciseId,
                mainExerciseOrder,
                exercise.cluster_reps
                  ? parseInt(exercise.cluster_reps)
                  : parseInt(exercise.reps || "10"),
                exercise.clusters_per_set
                  ? parseInt(exercise.clusters_per_set)
                  : 3,
                exercise.intra_cluster_rest
                  ? parseInt(exercise.intra_cluster_rest)
                  : 15,
                exercise.rest_seconds
                  ? Math.round(parseFloat(exercise.rest_seconds))
                  : 120,
                clusterWeight,
                clusterLoadPercentage,
              );
            }

            if (mainExerciseId && exerciseType === "rest_pause") {
              // Create rest pause record
              const restPauseWeight = exercise.weight_kg
                ? parseFloat(exercise.weight_kg)
                : null;
              const restPauseLoadPercentage = exercise.load_percentage
                ? parseFloat(exercise.load_percentage)
                : null;
              await WorkoutBlockService.createRestPauseSet(
                block.id,
                mainExerciseId,
                mainExerciseOrder,
                restPauseWeight,
                // initialReps removed - reps are tracked in workout_set_entries table
                exercise.rest_pause_duration
                  ? parseInt(exercise.rest_pause_duration)
                  : 15,
                exercise.max_rest_pauses
                  ? parseInt(exercise.max_rest_pauses)
                  : 3,
                restPauseLoadPercentage,
              );
            }

            // pyramid_set and ladder_set block types removed

            // Time-based protocols (AMRAP, EMOM, FOR_TIME)
            if (
              exerciseType === "amrap" ||
              exerciseType === "emom" ||
              exerciseType === "for_time"
            ) {
              if (!mainExerciseId) {
                throw new Error(
                  `Exercise ID is required for ${exerciseType} blocks`,
                );
              }
              const timeProtocolWeight = exercise.weight_kg
                ? parseFloat(exercise.weight_kg)
                : null;
              const timeProtocolLoadPercentage = exercise.load_percentage
                ? parseFloat(exercise.load_percentage)
                : null;

              await WorkoutBlockService.createTimeProtocol(
                block.id,
                mainExerciseId,
                mainExerciseOrder,
                exerciseType as "amrap" | "emom" | "for_time",
                {
                  total_duration_minutes:
                    exerciseType === "amrap"
                      ? exercise.amrap_duration
                        ? parseInt(exercise.amrap_duration)
                        : 10
                      : exerciseType === "emom"
                        ? exercise.emom_duration
                          ? parseInt(exercise.emom_duration)
                          : 10
                        : undefined,
                  work_seconds:
                    exerciseType === "emom"
                      ? exercise.work_seconds
                        ? parseInt(exercise.work_seconds)
                        : 30
                      : undefined,
                  rest_seconds:
                    exerciseType === "emom"
                      ? exercise.rest_after
                        ? parseInt(exercise.rest_after)
                        : 30
                      : undefined,
                  reps_per_round:
                    exerciseType === "emom" && exercise.emom_reps
                      ? parseInt(exercise.emom_reps)
                      : undefined,
                  emom_mode: exercise.emom_mode || undefined,
                  target_reps:
                    exercise.target_reps &&
                    exercise.target_reps !== "" &&
                    !isNaN(parseInt(exercise.target_reps))
                      ? parseInt(exercise.target_reps)
                      : undefined,
                  time_cap_minutes:
                    exerciseType === "for_time" &&
                    exercise.time_cap &&
                    exercise.time_cap !== "" &&
                    !isNaN(parseInt(exercise.time_cap))
                      ? parseInt(exercise.time_cap)
                      : undefined,
                  weight_kg: timeProtocolWeight,
                  load_percentage: timeProtocolLoadPercentage,
                },
              );
            }

            if (exerciseType === "tabata") {
              try {
                // Tabata uses tabata_sets
                // Structure: [{ exercises: [{ exercise_id, sets, reps, ... }], rest_between_sets: "..." }]
                const setsArray = Array.isArray(exercise.tabata_sets)
                  ? exercise.tabata_sets
                  : [];

                console.log(
                  `🔍 Processing tabata with ${setsArray.length} sets:`,
                  {
                    blockId: block.id,
                    exerciseType: "tabata",
                    setsCount: setsArray.length,
                    setsArray: setsArray.map((s: any) => ({
                      exercisesCount: s.exercises?.length || 0,
                      rest_between_sets: s.rest_between_sets,
                    })),
                  },
                );

                if (setsArray && setsArray.length > 0) {
                  // For tabata, use the block-level rest_after_set field that applies to ALL sets
                  let tabataRestAfterSet: string | undefined = undefined;
                  if (exerciseType === "tabata") {
                    // Use the block-level rest_after_set field (set at the same level as rounds and work time)
                    tabataRestAfterSet =
                      exercise.rest_after_set ||
                      exercise.rest_after ||
                      exercise.rest_seconds ||
                      "10";
                  }

                  // Collect all exercises from all sets
                  let exerciseOrder = 1;
                  for (
                    let setIdx = 0;
                    setIdx < setsArray.length;
                    setIdx++
                  ) {
                    const set = setsArray[setIdx];
                    const exercisesInSet = Array.isArray(set.exercises)
                      ? set.exercises
                      : [];

                    for (
                      let exIdx = 0;
                      exIdx < exercisesInSet.length;
                      exIdx++
                    ) {
                      const setEx = exercisesInSet[exIdx];
                      if (setEx.exercise_id) {
                        const currentExerciseOrder = exerciseOrder++;

                        // For tabata, we should NOT add to workout_set_entry_exercises
                        // Tabata uses ONLY workout_time_protocols (no workout_set_entry_exercises)
                        // Create time protocol for this exercise directly
                        const tabataWeight = setEx.weight_kg
                          ? parseFloat(String(setEx.weight_kg))
                          : null;
                        // Tabata does NOT use load_percentage (removed from this block type)
                        const timeProtocolResult =
                          await WorkoutBlockService.createTimeProtocol(
                            block.id,
                            setEx.exercise_id,
                            currentExerciseOrder,
                            exerciseType as "tabata",
                            {
                              work_seconds:
                                exerciseType === "tabata"
                                  ? exercise.work_seconds
                                    ? parseInt(exercise.work_seconds)
                                    : 20
                                  : setEx.work_seconds
                                    ? parseInt(setEx.work_seconds)
                                    : exercise.work_seconds
                                      ? parseInt(exercise.work_seconds)
                                      : undefined,
                              // rest_seconds = rest after THIS exercise (per exercise)
                              rest_seconds:
                                exerciseType === "tabata"
                                  ? setEx.rest_after
                                    ? parseInt(setEx.rest_after)
                                    : 10 // Tabata: short rest between exercises (typically 10s)
                                  : setEx.rest_after
                                    ? Math.round(
                                        parseFloat(
                                          String(setEx.rest_after),
                                        ),
                                      )
                                    : undefined,
                              // rest_after_set = rest after completing ALL exercises in the set (per set)
                              // For TABATA: use the general rest_after_set for ALL sets (same value)
                              // For CIRCUIT: use per-set rest_between_sets
                              rest_after_set:
                                exerciseType === "tabata" &&
                                tabataRestAfterSet
                                  ? Math.round(
                                      parseFloat(
                                        String(tabataRestAfterSet),
                                      ),
                                    )
                                  : undefined,
                              // For TABATA: rounds IS stored in time_protocols
                              rounds:
                                exerciseType === "tabata"
                                  ? exercise.rounds
                                    ? parseInt(exercise.rounds)
                                    : 8
                                  : undefined,
                              set: setIdx + 1, // Store set number (1-indexed)
                              // Tabata does NOT use load_percentage, but can use weight_kg
                              weight_kg: tabataWeight,
                              load_percentage: null, // Tabata does NOT use load_percentage
                            },
                          );

                        if (!timeProtocolResult) {
                          console.error(
                            `❌ Failed to create time protocol for ${exerciseType} exercise:`,
                            {
                              blockId: block.id,
                              exerciseId: setEx.exercise_id,
                              exerciseOrder: currentExerciseOrder,
                              setIndex: setIdx + 1,
                            },
                          );
                        }
                      }
                    }
                  }
                } else {
                  console.warn(`⚠️ tabata has no sets configured:`, {
                    blockId: block.id,
                    exerciseType: "tabata",
                    hasTabataSets: !!exercise.tabata_sets,
                  });
                }
              } catch (tabataError) {
                console.error(`❌ Error saving tabata block:`, {
                  blockId: block.id,
                  exerciseType: "tabata",
                  error: tabataError,
                  exercise: {
                    id: exercise.id,
                    exercise_id: exercise.exercise_id,
                    sets: exercise.sets,
                    tabata_sets: exercise.tabata_sets,
                  },
                });
                throw tabataError; // Re-throw to be caught by outer try-catch
              }
            }

            console.log(
              `🔍 ${isUpdate ? "Updated" : "Created"} block ${i + 1}/${
                exercises.length
              }:`,
              block.id,
            );
          } else {
            console.error(
              `❌ Failed to ${
                isUpdate ? "update" : "create"
              } block for exercise ${i + 1}`,
            );
          }
        }
        console.log(
          "🔍 Successfully saved all blocks and exercises (SMART UPDATE - preserves block IDs)",
        );
      } else {
        console.log("🔍 No exercises to save");
      }

      await warnIfAnySetEntryMissingExercises(supabase, savedTemplateId);
    }
    return { success: true, templateId: savedTemplateId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
