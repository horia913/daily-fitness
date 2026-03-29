/**
 * Converts WorkoutSetEntry[] into the exercise format used by WorkoutTemplateForm.
 * Extracted from WorkoutTemplateForm.tsx loadWorkoutBlocks function (lines 972-1326).
 * This is a pure function with no React dependencies.
 */
export function convertBlocksToExercises(blocks: any[]): any[] {
  if (!blocks || blocks.length === 0) {
    return [];
  }

  const convertedExercises: any[] = [];

  blocks.forEach((block, blockIndex) => {
    // Get first exercise and its special table data
    // For time-based blocks, exercises might be in time_protocols instead of block.exercises
    const isTimeBasedBlock = [
      "amrap",
      "emom",
      "for_time",
      "tabata",
    ].includes(block.set_type);
    let firstExercise = block.exercises?.[0];
    let firstExerciseId = firstExercise?.exercise_id;
    let firstExerciseOrder = firstExercise?.exercise_order || 1;

    // For time-based blocks, exercises are created from time_protocols in workoutBlockService
    // So block.exercises should have the exercise data, but if it's empty or missing exercise_id, get from time_protocols
    if (isTimeBasedBlock) {
      console.log(`🔍 Loading time-based set entry ${block.set_type}:`, {
        hasExercises: !!block.exercises && block.exercises.length > 0,
        exercisesCount: block.exercises?.length || 0,
        firstExerciseId: block.exercises?.[0]?.exercise_id,
        timeProtocolsCount: block.time_protocols?.length || 0,
        firstTimeProtocol: block.time_protocols?.[0],
      });

      if (
        block.exercises &&
        block.exercises.length > 0 &&
        block.exercises[0]?.exercise_id
      ) {
        // Exercises are loaded, use the first one
        firstExercise = block.exercises[0];
        firstExerciseId = firstExercise.exercise_id;
        firstExerciseOrder = firstExercise.exercise_order || 1;
        console.log(
          `✅ Using exercise from block.exercises: ${firstExerciseId}`,
        );
      } else {
        // No exercises loaded or missing exercise_id, get from time_protocols
        const timeProtocol = block.time_protocols?.[0];
        if (timeProtocol) {
          firstExerciseId = timeProtocol.exercise_id;
          firstExerciseOrder = timeProtocol.exercise_order || 1;
          console.log(
            `✅ Using exercise from time_protocols: ${firstExerciseId}`,
          );
        } else {
          console.warn(
            `⚠️ No exercises or time_protocols found for ${block.set_type} set entry ${block.id}`,
          );
        }
      }
    }

    // Get time protocol for this block/exercise (for time-based blocks)
    const timeProtocol = isTimeBasedBlock
      ? block.time_protocols?.find(
          (tp: any) =>
            tp.exercise_id === firstExerciseId &&
            tp.exercise_order === firstExerciseOrder,
        ) || block.time_protocols?.[0] // Fallback to first if not found
      : null;

    // Get special table data from first exercise
    const dropSet = firstExercise?.drop_sets?.[0];
    const clusterSet = firstExercise?.cluster_sets?.[0];
    const restPauseSet = firstExercise?.rest_pause_sets?.[0];
    // Deprecated: pyramid_set and ladder block types removed

    // Create exercise object from block
    // IMPORTANT: Preserve block.id so we can update existing blocks instead of deleting/recreating
    const exercise: any = {
      id: block.id, // Preserve original block ID for smart updates
      originalBlockId: block.id, // Keep reference to original block ID
      exercise_type: block.set_type,
      exercise_id: isTimeBasedBlock
        ? firstExerciseId ||
          timeProtocol?.exercise_id ||
          block.time_protocols?.[0]?.exercise_id
        : firstExerciseId,
      order_index: blockIndex + 1, // Add order_index for uniqueness
      sets: block.total_sets?.toString() || "",
      reps: block.reps_per_set || "",
      rest_seconds: block.rest_seconds?.toString() || "",
      notes: block.set_notes || "",
      set_name: block.set_name,
      // Prescribed RPE (`rir`), tempo, notes from first exercise (for blocks that support these)
      rir: firstExercise?.rir?.toString() || "",
      // Tempo: for time-based blocks, not stored in time_protocols (not in schema)
      // For other blocks, get from first exercise
      tempo: (!isTimeBasedBlock && firstExercise?.tempo) || "",
      // Time protocol data (from special table)
      rounds: timeProtocol?.rounds?.toString() || undefined,
      work_seconds: timeProtocol?.work_seconds?.toString() || undefined,
      rest_after: timeProtocol?.rest_seconds?.toString() || undefined,
      amrap_duration:
        timeProtocol?.total_duration_minutes?.toString() || undefined,
      emom_duration:
        timeProtocol?.total_duration_minutes?.toString() || undefined,
      emom_reps: timeProtocol?.reps_per_round?.toString() || undefined,
      emom_mode: timeProtocol?.emom_mode || "",
      target_reps: timeProtocol?.target_reps?.toString() || undefined,
      time_cap: timeProtocol?.time_cap_minutes?.toString() || undefined,
      // Drop set specific (from special table)
      drop_percentage:
        (dropSet as any)?.drop_percentage?.toString() || "",
      drop_set_reps: dropSet?.reps || "",
      // Load percentage and weight from time protocol or exercise (for time-based blocks, use time protocol)
      load_percentage:
        (timeProtocol as any)?.load_percentage?.toString() ||
        firstExercise?.load_percentage?.toString() ||
        "",
      weight_kg:
        (timeProtocol as any)?.weight_kg?.toString() ||
        firstExercise?.weight_kg?.toString() ||
        "",
    };

    // Handle complex block types with nested exercises
    const blockType = block.set_type as string;

    // Handle time-based blocks (amrap, emom, for_time) - ensure exercise_id is loaded from time_protocols if missing
    if (isTimeBasedBlock && timeProtocol && !exercise.exercise_id) {
      exercise.exercise_id = timeProtocol.exercise_id;
    }
    if (blockType === "tabata") {
      // Convert exercises to proper set structure
      // Each exercise in the block becomes an exercise in the sets
      // Get time protocols for each exercise (for individual work_seconds, rest_after)
      const exerciseProtocols =
        block.time_protocols?.filter(
          (tp: any) => tp.protocol_type === blockType,
        ) || [];

      const exercisesArray =
        block.exercises?.map((ex: any, idx: number) => {
          // Find protocol for this specific exercise
          const exProtocol = exerciseProtocols.find(
            (tp: any) =>
              tp.exercise_id === ex.exercise_id &&
              tp.exercise_order === idx + 1,
          );

          return {
            exercise_id: ex.exercise_id,
            // For tabata: don't set individual sets - rounds are in block.total_sets
            sets: ex.sets?.toString() || "",
            reps: ex.reps || block.reps_per_set || "",
            // Use individual exercise rest_seconds, not block rest
            rest_seconds: ex.rest_seconds?.toString() || "",
            // Get work_seconds from time protocol for this exercise
            work_seconds: exProtocol?.work_seconds?.toString() || "",
            // Get rest_after from time protocol for this exercise
            rest_after: exProtocol?.rest_seconds?.toString() || "",
            // Load individual load_percentage for each exercise
            load_percentage: ex.load_percentage?.toString() || "",
          };
        }) || [];

      if (blockType === "tabata") {
        // Tabata uses tabata_sets - structure: [{ exercises: [...], rest_between_sets: "..." }]
        // Get time protocol data for tabata (use first exercise's protocol as default)
        const tabataProtocol =
          block.time_protocols?.find(
            (tp: any) => tp.protocol_type === "tabata",
          ) || timeProtocol;

        const restAfter =
          tabataProtocol?.rest_seconds?.toString() ||
          block.rest_seconds?.toString() ||
          "10";
        exercise.rest_after = String(restAfter);

        // Load rest_after_set from time_protocols (block-level field)
        // Use the first protocol's rest_after_set value (should be the same for all)
        const restAfterSet =
          tabataProtocol?.rest_after_set?.toString() || "10";
        (exercise as any).rest_after_set = String(restAfterSet);

        exercise.rounds =
          tabataProtocol?.rounds?.toString() ||
          block.total_sets?.toString() ||
          "8";
        exercise.work_seconds =
          tabataProtocol?.work_seconds?.toString() || "20";

        // Build tabata_sets from exercises and their time protocols
        // Group exercises by set number from time_protocols
        const exerciseProtocols =
          block.time_protocols?.filter(
            (tp: any) => tp.protocol_type === "tabata",
          ) || [];

        // Group exercises by set number
        const setsMap = new Map<number, any[]>();
        exercisesArray.forEach((ex: any, exIdx: number) => {
          const exProtocol = exerciseProtocols.find(
            (tp: any) =>
              tp.exercise_id === ex.exercise_id &&
              tp.exercise_order === exIdx + 1,
          );
          const setNumber = exProtocol?.set || 1; // Default to set 1 if not found
          if (!setsMap.has(setNumber)) {
            setsMap.set(setNumber, []);
          }
          setsMap.get(setNumber)!.push({
            ...ex,
            work_seconds:
              exProtocol?.work_seconds?.toString() ||
              exercise.work_seconds,
            rest_after: exProtocol?.rest_seconds?.toString() || restAfter,
          });
        });

        // Convert map to array of sets
        exercise.tabata_sets = Array.from(setsMap.entries())
          .sort(([a], [b]) => a - b)
          .map(([setNum, exercises]) => ({
            exercises,
            rest_between_sets: String(restAfter),
          }));

        // Circuit block type removed - no longer needed
      }
      // Circuit removed - skip loading circuit blocks
    } else if (block.set_type === "drop_set") {
      // For dropset, main reps come from block.reps_per_set (initial/main set reps)
      // Form expects exercise.exercise_reps for "Main Reps" field
      exercise.reps = block.reps_per_set || "";
      exercise.exercise_reps = block.reps_per_set || "";
      // Load drop set data from special table
      if (dropSet) {
        // drop_percentage is stored directly in workout_drop_sets.drop_percentage
        exercise.drop_percentage =
          (dropSet as any)?.drop_percentage?.toString() || "";
        exercise.drop_set_reps = dropSet.reps || "";
      }
      // Load weight_kg and load_percentage from first drop set (drop_order = 1)
      const initialDropSet =
        firstExercise?.drop_sets?.find(
          (ds: any) => ds.drop_order === 1,
        ) || dropSet;
      if (initialDropSet) {
        exercise.weight_kg =
          (initialDropSet as any)?.weight_kg?.toString() || "";
        exercise.load_percentage =
          (initialDropSet as any)?.load_percentage?.toString() || "";
      }
    } else if (block.set_type === "cluster_set") {
      // Load cluster set data from special table
      if (clusterSet) {
        exercise.cluster_reps =
          clusterSet.reps_per_cluster?.toString() || exercise.reps || "";
        exercise.clusters_per_set =
          clusterSet.clusters_per_set?.toString() || "";
        exercise.intra_cluster_rest =
          clusterSet.intra_cluster_rest?.toString() || "15";
      }
    } else if (block.set_type === "rest_pause") {
      // Load rest pause data from special table
      if (restPauseSet) {
        exercise.rest_pause_duration =
          restPauseSet.rest_pause_duration?.toString() || "15";
        exercise.max_rest_pauses =
          restPauseSet.max_rest_pauses?.toString() || "3";
      }
    } else if (block.set_type === "giant_set") {
      // Sort exercises by exercise_letter (A, B, C, D) to ensure correct order
      const sortedExercises = [...(block.exercises || [])].sort(
        (a, b) => {
          const letterA = a.exercise_letter || "A";
          const letterB = b.exercise_letter || "A";
          return letterA.localeCompare(letterB);
        },
      );
      exercise.giant_set_exercises =
        sortedExercises.map((ex) => ({
          exercise_id: ex.exercise_id,
          sets: ex.sets?.toString() || block.total_sets?.toString() || "",
          // reps is stored in ex.reps (workout_set_entry_exercises.reps column)
          reps: ex.reps || "",
          load_percentage: ex.load_percentage?.toString() || "",
          weight_kg: ex.weight_kg?.toString() || "",
          tempo: ex.tempo || "",
          rir: ex.rir?.toString() || "",
          notes: ex.notes || "",
        })) || [];
    } else if (block.set_type === "superset") {
      // Find exercises by exercise_letter (A = first, B = second)
      const firstEx =
        block.exercises?.find((ex: any) => ex.exercise_letter === "A") ||
        block.exercises?.[0];
      const secondEx =
        block.exercises?.find((ex: any) => ex.exercise_letter === "B") ||
        block.exercises?.[1];

      if (firstEx) {
        // First exercise data is already loaded above, but ensure load_percentage and weight_kg are correct
        exercise.load_percentage =
          firstEx.load_percentage?.toString() || "";
        exercise.weight_kg = firstEx.weight_kg?.toString() || "";
      }

      if (secondEx) {
        exercise.superset_exercise_id = secondEx.exercise_id;
        exercise.superset_reps = secondEx.reps || "";
        // Load percentage and weight for second exercise (uses SAME columns but stored in separate row)
        (exercise as any).superset_load_percentage =
          secondEx.load_percentage?.toString() || "";
        (exercise as any).superset_weight_kg =
          secondEx.weight_kg?.toString() || "";
        (exercise as any).superset_tempo = secondEx.tempo || "";
        (exercise as any).superset_rir = secondEx.rir?.toString() || "";
      }
    } else if (block.set_type === "pre_exhaustion") {
      // Find isolation (letter A) and compound (letter B) exercises
      const isolationExercise =
        block.exercises?.find((ex: any) => ex.exercise_letter === "A") ||
        block.exercises?.[0];
      const compoundExercise =
        block.exercises?.find((ex: any) => ex.exercise_letter === "B") ||
        block.exercises?.[1];

      if (isolationExercise) {
        exercise.isolation_reps = isolationExercise.reps || "";
        exercise.load_percentage =
          isolationExercise.load_percentage?.toString() || "";
        exercise.weight_kg =
          isolationExercise.weight_kg?.toString() || "";
        exercise.tempo = isolationExercise.tempo || "";
        exercise.rir = isolationExercise.rir?.toString() || "";
        exercise.notes = isolationExercise.notes || "";
      }

      if (compoundExercise) {
        exercise.compound_exercise_id = compoundExercise.exercise_id;
        exercise.compound_reps = compoundExercise.reps || "";
        (exercise as any).compound_load_percentage =
          compoundExercise.load_percentage?.toString() || "";
        (exercise as any).compound_weight_kg =
          compoundExercise.weight_kg?.toString() || "";
        (exercise as any).compound_tempo = compoundExercise.tempo || "";
        (exercise as any).compound_rir =
          compoundExercise.rir?.toString() || "";
      }
    }

    convertedExercises.push(exercise);
  });

  return convertedExercises;
}
