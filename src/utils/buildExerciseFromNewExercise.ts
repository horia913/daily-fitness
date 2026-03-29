/**
 * Pure validation + build logic for adding/updating an exercise from the
 * "Add Exercise" form state. Used by WorkoutTemplateForm.addExercise.
 */

// ---------------------------------------------------------------------------
// Input types (form state from AddExercisePanel)
// ---------------------------------------------------------------------------

/** A single exercise entry in a Tabata set */
export interface TabataExerciseInput {
  exercise_id: string;
  [key: string]: unknown;
}

/** A Tabata set: list of exercises with optional rest */
export interface TabataSetInput {
  exercises: TabataExerciseInput[];
  rest_between_sets?: string | number;
  [key: string]: unknown;
}

/** A single exercise entry in a Giant Set */
export interface GiantSetExerciseInput {
  exercise_id: string;
  sets?: string | number;
  reps?: string | number;
  [key: string]: unknown;
}

/** The "new exercise" form state from AddExercisePanel */
export interface NewExerciseInput {
  exercise_type: string;
  exercise_id: string;
  sets?: string | number;
  reps?: string | number;
  rest_seconds?: string | number;
  /** Prescribed RPE (1–10); persisted in DB column `rir`. */
  rir?: string | number;
  tempo?: string;
  notes?: string;
  amrap_duration?: string | number;
  work_seconds?: string | number;
  emom_duration?: string | number;
  emom_mode?: string;
  emom_reps?: string | number;
  rounds?: string | number;
  rest_after?: string | number;
  rest_after_set?: string | number;
  drop_percentage?: string | number;
  drop_set_reps?: string | number;
  superset_exercise_id?: string;
  superset_reps?: string | number;
  superset_load_percentage?: string | number;
  giant_set_exercises?: GiantSetExerciseInput[];
  tabata_sets?: TabataSetInput[];
  cluster_reps?: string | number;
  clusters_per_set?: string | number;
  intra_cluster_rest?: string | number;
  rest_pause_duration?: string | number;
  max_rest_pauses?: string | number;
  compound_exercise_id?: string;
  isolation_reps?: string | number;
  compound_reps?: string | number;
  compound_load_percentage?: string | number;
  target_reps?: string | number;
  time_cap?: string | number;
  load_percentage?: string | number;
  [key: string]: unknown;
}

/** An exercise from the exercise library (used for lookup by id) */
export interface AvailableExercise {
  id: string;
  name: string;
  [key: string]: unknown;
}

/** An existing exercise already in the workout template (for order_index) */
export interface ExistingExercise {
  id: string;
  order_index?: number;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Output type (built exercise object)
// ---------------------------------------------------------------------------

/** The built exercise object returned on success (block-type-specific fields vary) */
export interface BuiltExercise {
  id: string;
  exercise_id: string;
  exercise_type: string;
  order_index: number;
  sets: string;
  reps: string;
  rest_seconds: string;
  /** Prescribed RPE (1–10); DB column name is `rir`. */
  rir: string;
  tempo: string;
  notes: string;
  amrap_duration: string;
  work_seconds: string;
  emom_duration: string;
  emom_mode: string;
  emom_reps: string;
  rounds: string;
  tabata_sets: TabataSetInput[];
  rest_after: string;
  rest_after_set: string;
  drop_percentage: string;
  drop_set_reps: string;
  superset_exercise_id: string;
  superset_reps: string;
  superset_load_percentage: string;
  giant_set_exercises: GiantSetExerciseInput[];
  cluster_reps: string;
  clusters_per_set: string;
  intra_cluster_rest: string;
  rest_pause_duration: string;
  max_rest_pauses: string;
  compound_exercise_id: string;
  isolation_reps: string;
  compound_reps: string;
  compound_load_percentage: string;
  target_reps: string;
  time_cap: string;
  load_percentage: string;
  exercise: AvailableExercise | null;
  [key: string]: unknown;
}

export interface BuildExerciseResult {
  success: boolean;
  error?: string;
  exercise?: BuiltExercise;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function cleanNumericForForm(value: string | number | null | undefined): string {
  if (value === "" || value === null || value === undefined) return "";
  const parsed = Math.round(parseFloat(String(value)));
  return isNaN(parsed) ? "" : parsed.toString();
}

function cleanStringForForm(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

export function buildExerciseFromNewExercise(
  newExercise: NewExerciseInput,
  availableExercises: AvailableExercise[],
  existingExercises: ExistingExercise[],
  editingExerciseId: string | null
): BuildExerciseResult {
  // --- Validation ---
  if (newExercise.exercise_type === "tabata") {
    if (!newExercise.tabata_sets || newExercise.tabata_sets.length === 0) {
      return { success: false, error: "Please add at least one Tabata set with exercises" };
    }
    const hasExercises = newExercise.tabata_sets.some(
      (set) => set.exercises && set.exercises.length > 0
    );
    if (!hasExercises) {
      return { success: false, error: "Please add exercises to your Tabata sets" };
    }
    const firstSet = newExercise.tabata_sets.find(
      (set) => set.exercises && set.exercises.length > 0
    );
    if (!firstSet?.exercises?.length) {
      return {
        success: false,
        error: "Please ensure at least one Tabata set has a valid exercise selected",
      };
    }
  } else if (newExercise.exercise_type === "giant_set") {
    if (
      !newExercise.giant_set_exercises ||
      newExercise.giant_set_exercises.length === 0
    ) {
      return { success: false, error: "Please add at least one exercise to your Giant Set" };
    }
    const firstEx = newExercise.giant_set_exercises.find((ex) => ex.exercise_id);
    if (!firstEx?.exercise_id) {
      return {
        success: false,
        error: "Please ensure at least one exercise is selected in your Giant Set",
      };
    }
  } else if (newExercise.exercise_type === "superset") {
    if (!newExercise.exercise_id || !newExercise.superset_exercise_id) {
      return { success: false, error: "Please select both exercises for your Superset" };
    }
  } else {
    if (!newExercise.exercise_id) {
      return { success: false, error: "Please select an exercise" };
    }
  }

  // Resolve main exercise_id for tabata/giant_set (no mutation of input)
  let mainExerciseId = newExercise.exercise_id;
  if (newExercise.exercise_type === "tabata") {
    const firstSet = newExercise.tabata_sets?.find(
      (set) => set.exercises && set.exercises.length > 0
    );
    if (firstSet?.exercises?.[0]) {
      mainExerciseId = firstSet.exercises[0].exercise_id;
    }
  } else if (newExercise.exercise_type === "giant_set") {
    const firstEx = newExercise.giant_set_exercises?.find((ex) => ex.exercise_id);
    if (firstEx) {
      mainExerciseId = firstEx.exercise_id;
    }
  }

  // For non-complex types, ensure selected exercise exists
  let selectedExercise: AvailableExercise | null = null;
  if (
    !["tabata", "giant_set", "superset"].includes(newExercise.exercise_type)
  ) {
    const found = availableExercises.find((ex) => ex.id === mainExerciseId);
    if (!found) {
      return { success: false, error: "Selected exercise not found" };
    }
    selectedExercise = found;
  }

  const orderIndex =
    editingExerciseId !== null
      ? (existingExercises.find((ex) => ex.id === editingExerciseId)?.order_index ?? existingExercises.length + 1)
      : existingExercises.length + 1;

  const exercise: BuiltExercise = {
    id: editingExerciseId ?? `temp-${Date.now()}`,
    exercise_id: mainExerciseId,
    exercise_type: newExercise.exercise_type || "",
    order_index: orderIndex,
    sets: cleanNumericForForm(newExercise.sets),
    reps: cleanStringForForm(newExercise.reps),
    rest_seconds: cleanNumericForForm(newExercise.rest_seconds),
    rir: cleanNumericForForm(newExercise.rir),
    tempo: cleanStringForForm(newExercise.tempo),
    notes: newExercise.notes ?? "",
    amrap_duration: cleanNumericForForm(newExercise.amrap_duration),
    work_seconds: cleanNumericForForm(newExercise.work_seconds),
    emom_duration: cleanNumericForForm(newExercise.emom_duration),
    emom_mode: newExercise.emom_mode ?? "",
    emom_reps: cleanNumericForForm(newExercise.emom_reps),
    rounds: cleanNumericForForm(newExercise.rounds),
    tabata_sets: newExercise.tabata_sets ?? [],
    rest_after: cleanNumericForForm(newExercise.rest_after),
    rest_after_set: cleanNumericForForm(newExercise.rest_after_set),
    drop_percentage: cleanNumericForForm(newExercise.drop_percentage),
    drop_set_reps: cleanStringForForm(newExercise.drop_set_reps),
    superset_exercise_id: newExercise.superset_exercise_id ?? "",
    superset_reps: cleanStringForForm(newExercise.superset_reps),
    superset_load_percentage: cleanNumericForForm(newExercise.superset_load_percentage),
    giant_set_exercises: newExercise.giant_set_exercises ?? [],
    cluster_reps: cleanNumericForForm(newExercise.cluster_reps),
    clusters_per_set: cleanNumericForForm(newExercise.clusters_per_set),
    intra_cluster_rest: cleanNumericForForm(newExercise.intra_cluster_rest),
    rest_pause_duration: cleanNumericForForm(newExercise.rest_pause_duration),
    max_rest_pauses: cleanNumericForForm(newExercise.max_rest_pauses),
    compound_exercise_id: newExercise.compound_exercise_id ?? "",
    isolation_reps: cleanStringForForm(newExercise.isolation_reps),
    compound_reps: cleanStringForForm(newExercise.compound_reps),
    compound_load_percentage: cleanNumericForForm(newExercise.compound_load_percentage),
    target_reps: cleanNumericForForm(newExercise.target_reps),
    time_cap: cleanNumericForForm(newExercise.time_cap),
    load_percentage: cleanNumericForForm(newExercise.load_percentage),
    exercise: selectedExercise ?? null,
  };

  return { success: true, exercise };
}
