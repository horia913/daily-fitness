import type {
  WorkoutSetEntry as WorkoutBlock,
  WorkoutSetEntryExercise as WorkoutBlockExercise,
  SetType as WorkoutBlockType,
} from "@/types/workoutSetEntries";

/**
 * Converts the exercises array from WorkoutTemplateForm into WorkoutSetEntry[]
 * format for the volume calculator widget.
 */
export function exercisesToWorkoutBlocks(
  exercises: any[],
  templateId?: string,
  availableExercises?: any[]
): WorkoutBlock[] {
  if (exercises.length === 0) return [];

  const list = availableExercises ?? [];
  const now = new Date().toISOString();
  const tid = templateId || "temp-template";

  return exercises.map((exercise: any, index: number) => {
    const blockType = (exercise.exercise_type ||
      exercise.set_type ||
      exercise.block_type ||  // backward-compat: accept old field name from callers
      "straight_set") as WorkoutBlockType;

    let fullExerciseData =
      exercise.exercise ||
      (exercise.exercise_id
        ? list.find((ex: any) => ex.id === exercise.exercise_id)
        : null);

    if (!fullExerciseData && exercise.exercise_id) {
      fullExerciseData = {
        id: exercise.exercise_id,
        name: "Unknown Exercise",
        primary_muscle_group_id: null,
        primary_muscle_group: null,
      };
    }

    const createBlockExercise = (
      exerciseId: string,
      exerciseLetter: string,
      exerciseOrder: number,
      sets?: number,
      reps?: string
    ): WorkoutBlockExercise | null => {
      if (!exerciseId) return null;

      const exerciseData = list.find((ex: any) => ex.id === exerciseId);
      if (!exerciseData) return null;

      return {
        id: `temp-exercise-${index}-${exerciseLetter}`,
        set_entry_id: exercise.id || `temp-block-${index}`,
        exercise_id: exerciseId,
        exercise_order: exerciseOrder,
        exercise_letter: exerciseLetter,
        sets: sets,
        reps: reps,
        weight_kg: undefined,
        load_percentage: undefined,
        rir: undefined,
        tempo: undefined,
        rest_seconds: undefined,
        notes: undefined,
        exercise: {
          id: exerciseData.id,
          name: exerciseData.name,
          description: exerciseData.description,
          primary_muscle_group: exerciseData.primary_muscle_group || null,
          primary_muscle_group_id: exerciseData.primary_muscle_group_id,
          muscle_groups:
            exerciseData.muscle_groups ||
            (exerciseData.primary_muscle_group
              ? [exerciseData.primary_muscle_group]
              : []),
          created_at: exerciseData.created_at || now,
          updated_at: exerciseData.updated_at || now,
        } as any,
        created_at: now,
        updated_at: now,
      };
    };

    const blockExercises: WorkoutBlockExercise[] = [];

    if (blockType === "superset") {
      if (exercise.exercise_id) {
        const exA = createBlockExercise(
          exercise.exercise_id,
          "A",
          1,
          exercise.sets ? parseInt(exercise.sets) : undefined,
          exercise.reps || undefined
        );
        if (exA) blockExercises.push(exA);
      }
      if (exercise.superset_exercise_id) {
        const exB = createBlockExercise(
          exercise.superset_exercise_id,
          "B",
          1,
          exercise.sets ? parseInt(exercise.sets) : undefined,
          exercise.superset_reps || exercise.reps || undefined
        );
        if (exB) blockExercises.push(exB);
      }
    } else if (blockType === "giant_set") {
      if (
        exercise.giant_set_exercises &&
        Array.isArray(exercise.giant_set_exercises)
      ) {
        exercise.giant_set_exercises.forEach((gsEx: any, gsIndex: number) => {
          if (gsEx.exercise_id) {
            const ex = createBlockExercise(
              gsEx.exercise_id,
              String.fromCharCode(65 + gsIndex),
              1,
              gsEx.sets
                ? parseInt(gsEx.sets)
                : exercise.sets
                  ? parseInt(exercise.sets)
                  : undefined,
              gsEx.reps || exercise.reps || undefined
            );
            if (ex) blockExercises.push(ex);
          }
        });
      }
    } else if (blockType === "pre_exhaustion") {
      if (exercise.exercise_id) {
        const isolationEx = createBlockExercise(
          exercise.exercise_id,
          "A",
          1,
          exercise.sets ? parseInt(exercise.sets) : undefined,
          exercise.isolation_reps || exercise.reps || undefined
        );
        if (isolationEx) blockExercises.push(isolationEx);
      }
      if (exercise.compound_exercise_id) {
        const compoundEx = createBlockExercise(
          exercise.compound_exercise_id,
          "B",
          1,
          exercise.sets ? parseInt(exercise.sets) : undefined,
          exercise.compound_reps || exercise.reps || undefined
        );
        if (compoundEx) blockExercises.push(compoundEx);
      }
    } else {
      if (fullExerciseData) {
        const singleEx: WorkoutBlockExercise = {
          id: exercise.id || `temp-exercise-${index}`,
          set_entry_id: exercise.id || `temp-block-${index}`,
          exercise_id: exercise.exercise_id || "",
          exercise_order: 1,
          exercise_letter: exercise.exercise_letter || "A",
          sets: exercise.sets ? parseInt(exercise.sets) : undefined,
          reps: exercise.reps || exercise.isolation_reps || undefined,
          weight_kg: exercise.weight_kg
            ? parseFloat(exercise.weight_kg)
            : undefined,
          load_percentage: exercise.load_percentage
            ? parseFloat(exercise.load_percentage)
            : undefined,
          rir: exercise.rir ? parseInt(exercise.rir) : undefined,
          tempo: exercise.tempo || undefined,
          rest_seconds: exercise.rest_seconds
            ? parseInt(exercise.rest_seconds)
            : undefined,
          notes: exercise.notes || undefined,
          exercise: {
            id: fullExerciseData.id,
            name: fullExerciseData.name,
            description: fullExerciseData.description,
            primary_muscle_group:
              fullExerciseData.primary_muscle_group ||
              (fullExerciseData.primary_muscle_group_id &&
                list.find((ex: any) => ex.id === fullExerciseData.id)
                  ?.primary_muscle_group) ||
              null,
            primary_muscle_group_id: fullExerciseData.primary_muscle_group_id,
            muscle_groups:
              fullExerciseData.muscle_groups ||
              (fullExerciseData.primary_muscle_group
                ? [fullExerciseData.primary_muscle_group]
                : []),
            created_at: fullExerciseData.created_at || now,
            updated_at: fullExerciseData.updated_at || now,
          } as any,
          created_at: now,
          updated_at: now,
        };
        blockExercises.push(singleEx);
      }
    }

    const block: WorkoutBlock = {
      id: exercise.id || `temp-block-${index}`,
      template_id: tid,
      set_type: blockType,
      set_order: exercise.order_index || index + 1,
      set_name: exercise.set_name || exercise.block_name || undefined,
      set_notes: exercise.notes || undefined,
      rest_seconds: exercise.rest_seconds
        ? parseInt(exercise.rest_seconds)
        : undefined,
      total_sets: exercise.sets ? parseInt(exercise.sets) : undefined,
      reps_per_set: exercise.reps || exercise.isolation_reps || undefined,
      exercises: blockExercises,
      drop_sets: [],
      cluster_sets: [],
      rest_pause_sets: [],
      time_protocols: [],
      hr_sets: [],
      created_at: now,
      updated_at: now,
    };

    if (blockType === "hr_sets") {
      const hrExercises =
        exercise.hr_set_exercises && Array.isArray(exercise.hr_set_exercises)
          ? exercise.hr_set_exercises
          : exercise.exercise_id
            ? [exercise]
            : [];

      block.hr_sets = hrExercises
        .filter((ex: any) => ex.exercise_id)
        .map((ex: any, idx: number) => ({
          id: ex.id || `temp-hr-${index}-${idx}`,
          set_entry_id: block.id,
          exercise_id: ex.exercise_id,
          exercise_order: idx + 1,
          hr_zone: ex.hr_zone ? parseInt(ex.hr_zone) : undefined,
          hr_percentage_min: ex.hr_percentage_min
            ? parseFloat(ex.hr_percentage_min)
            : undefined,
          hr_percentage_max: ex.hr_percentage_max
            ? parseFloat(ex.hr_percentage_max)
            : undefined,
          is_intervals: ex.hr_is_intervals ?? false,
          duration_seconds: ex.hr_duration_minutes
            ? ex.hr_duration_minutes * 60
            : undefined,
          work_duration_seconds: ex.hr_work_duration_minutes
            ? ex.hr_work_duration_minutes * 60
            : undefined,
          rest_duration_seconds: ex.hr_rest_duration_minutes
            ? ex.hr_rest_duration_minutes * 60
            : undefined,
          target_rounds: ex.hr_target_rounds
            ? parseInt(ex.hr_target_rounds)
            : undefined,
          distance_meters: ex.hr_distance_meters
            ? parseFloat(ex.hr_distance_meters)
            : undefined,
          created_at: now,
        }));
    }

    return block;
  });
}
