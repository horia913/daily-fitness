/**
 * Week-scoped working-set volume for the program station rail.
 *
 * Scope: resistance / hypertrophy volume only.
 * - athletic_development exercises are excluded from totals and per-muscle
 *   (sprint/plyo/drill — not sets-per-muscle).
 * - Untagged non-athletic exercises are excluded from per-muscle but surfaced
 *   in the footer as a data gap.
 *
 * Counting: each exercise slot credits workingSetCount to its primary muscle
 * (supersets/giant = per-exercise sets, not rounds-only).
 *
 * Targets: RP landmark MEV→MAV band (sanitized), else FALLBACK_MUSCLE_TARGETS.
 */

import { supabase } from "@/lib/supabase";
import { getRPVolumeLandmarks } from "@/lib/coachGuidelinesService";
import { deriveSetType } from "@/lib/groupModel/deriveSetType";
import type { CanvasExercise, CanvasGroup, CanvasWorkout } from "@/lib/groupModel/canvasTypes";
import type { SetType } from "@/types/workoutSetEntries";

/** Sensible defaults when RP landmarks are missing or degenerate (min===max / 0-band). */
export const FALLBACK_MUSCLE_TARGETS: Record<string, { min: number; max: number }> = {
  Quads: { min: 12, max: 18 },
  Hamstrings: { min: 10, max: 16 },
  Glutes: { min: 10, max: 16 },
  Calves: { min: 8, max: 12 },
  Chest: { min: 10, max: 16 },
  Back: { min: 10, max: 18 },
  Shoulders: { min: 8, max: 14 },
  "Side Delts": { min: 8, max: 14 },
  "Rear Delts": { min: 8, max: 14 },
  "Front Delts": { min: 0, max: 8 },
  Biceps: { min: 8, max: 14 },
  Triceps: { min: 8, max: 14 },
  Abs: { min: 0, max: 20 },
  Traps: { min: 0, max: 16 },
  Adductors: { min: 4, max: 12 },
};

export const ATHLETIC_DEVELOPMENT_CATEGORY = "athletic_development";

/** Open-ended protocols — no fixed prescribed set count for the rail. */
const OPEN_ENDED_SET_TYPES: SetType[] = ["amrap", "emom", "for_time", "tabata"];

export type StationWeekVolumeStatus = "ok" | "low" | "over";

export type StationMuscleVolumeRow = {
  muscleGroup: string;
  sets: number;
  min: number;
  max: number;
  status: StationWeekVolumeStatus;
  statusLabel: string;
  statusDetail: string | null;
};

export type ExerciseVolumeMeta = {
  id: string;
  name: string;
  muscle: string | null;
  category: string | null;
  isAthleticDevelopment: boolean;
  coachId: string | null;
  primaryMuscleGroupId: string | null;
  secondaryMuscleGroup1Id: string | null;
  secondaryMuscleGroup2Id: string | null;
};

/** Exercise listed under an excluded footer bucket (for inline tagging). */
export type StationExcludedExercise = {
  id: string;
  name: string;
  sets: number;
  category: string | null;
  coachId: string | null;
  primaryMuscleGroupId: string | null;
  secondaryMuscleGroup1Id: string | null;
  secondaryMuscleGroup2Id: string | null;
  reason: "athletic" | "untagged";
};

export type StationWeekVolumeSummary = {
  /** Tagged resistance working sets (matches sum of per-muscle rows). */
  totalWorkingSets: number;
  sessionCount: number;
  rows: StationMuscleVolumeRow[];
  empty: boolean;
  /** athletic_development — excluded from volume (speed/plyo/drills). */
  athleticExcludedSets: number;
  athleticExcludedExerciseCount: number;
  athleticExcludedExercises: StationExcludedExercise[];
  /** Non-athletic missing primary_muscle_group — data gap, not counted in total. */
  untaggedSets: number;
  untaggedExerciseCount: number;
  untaggedExercises: StationExcludedExercise[];
};

export type StationWeekVolumeAggregate = {
  byMuscle: Map<string, number>;
  /** Tagged resistance sets only. */
  totalWorkingSets: number;
  athleticExcludedSets: number;
  athleticExcludedExerciseCount: number;
  athleticExcludedExercises: StationExcludedExercise[];
  untaggedSets: number;
  untaggedExerciseCount: number;
  untaggedExercises: StationExcludedExercise[];
};

/** Existing exercise.category string values in this project — do not invent new ones. */
export const EXERCISE_CATEGORY_OPTIONS = [
  "Uncategorized",
  "Strength",
  "Cardio",
  "Sports",
  "athletic_development",
] as const;

/**
 * Prescribed set count for a group/slot.
 * Prefer group.total_sets; if missing/0, use prescription row count (e.g. 3 × 12/6/6 → 3).
 */
export function workingSetCount(group: CanvasGroup, slot?: CanvasExercise): number {
  const fromGroup = group.total_sets > 0 ? group.total_sets : 0;
  const fromRx = slot?.prescriptions?.length
    ? slot.prescriptions.length
    : Math.max(0, ...group.slots.map((s) => s.prescriptions?.length ?? 0));
  return Math.max(fromGroup, fromRx, 1);
}

function isCountableGroup(group: CanvasGroup): boolean {
  const setType = deriveSetType(group, group.slots);
  if (OPEN_ENDED_SET_TYPES.includes(setType)) return false;
  return true;
}

function isAthleticCategory(category: string | null | undefined): boolean {
  return (category ?? "").trim().toLowerCase() === ATHLETIC_DEVELOPMENT_CATEGORY;
}

/** Batch-resolve primary muscle + category + ownership for exercise IDs. */
export async function fetchExerciseVolumeMetaByIds(
  exerciseIds: string[],
): Promise<Map<string, ExerciseVolumeMeta>> {
  const unique = [...new Set(exerciseIds.filter(Boolean))];
  const out = new Map<string, ExerciseVolumeMeta>();
  if (unique.length === 0) return out;

  const { data: exercises, error } = await supabase
    .from("exercises")
    .select(
      "id, name, primary_muscle_group_id, secondary_muscle_group_1_id, secondary_muscle_group_2_id, category, coach_id",
    )
    .in("id", unique);

  if (error) {
    console.error("[stationWeekVolume] exercises:", error.message);
  }

  for (const id of unique) {
    out.set(id, {
      id,
      name: "Exercise",
      muscle: null,
      category: null,
      isAthleticDevelopment: false,
      coachId: null,
      primaryMuscleGroupId: null,
      secondaryMuscleGroup1Id: null,
      secondaryMuscleGroup2Id: null,
    });
  }

  const mgIds = [
    ...new Set(
      (exercises ?? [])
        .map((e) => e.primary_muscle_group_id as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const nameById = new Map<string, string>();
  if (mgIds.length > 0) {
    const { data: groups } = await supabase
      .from("muscle_groups")
      .select("id, name")
      .in("id", mgIds);
    for (const g of groups ?? []) {
      if (g.id && g.name) nameById.set(g.id as string, g.name as string);
    }
  }

  for (const ex of exercises ?? []) {
    const id = ex.id as string;
    const category = (ex.category as string | null) ?? null;
    const mgId = ex.primary_muscle_group_id as string | null;
    const muscle = mgId ? nameById.get(mgId) ?? null : null;
    out.set(id, {
      id,
      name: (ex.name as string) || "Exercise",
      muscle,
      category,
      isAthleticDevelopment: isAthleticCategory(category),
      coachId: (ex.coach_id as string | null) ?? null,
      primaryMuscleGroupId: mgId,
      secondaryMuscleGroup1Id: (ex.secondary_muscle_group_1_id as string | null) ?? null,
      secondaryMuscleGroup2Id: (ex.secondary_muscle_group_2_id as string | null) ?? null,
    });
  }

  // Fallback muscle from exercise_muscle_groups (never for athletic_development attribution)
  const missingMuscle = [...out.entries()]
    .filter(([, meta]) => !meta.muscle && !meta.isAthleticDevelopment)
    .map(([id]) => id);

  if (missingMuscle.length > 0) {
    const { data: links } = await supabase
      .from("exercise_muscle_groups")
      .select("exercise_id, muscle_group, is_primary")
      .in("exercise_id", missingMuscle);

    const best = new Map<string, string>();
    for (const row of links ?? []) {
      const eid = row.exercise_id as string;
      const name = (row.muscle_group as string | null)?.trim();
      if (!eid || !name) continue;
      if (row.is_primary || !best.has(eid)) best.set(eid, name);
    }
    for (const [eid, name] of best) {
      const prev = out.get(eid);
      if (prev) out.set(eid, { ...prev, muscle: name });
    }
  }

  return out;
}

/** @deprecated Prefer fetchExerciseVolumeMetaByIds — kept for call-site clarity. */
export async function fetchPrimaryMuscleByExerciseIds(
  exerciseIds: string[],
): Promise<Map<string, string>> {
  const meta = await fetchExerciseVolumeMetaByIds(exerciseIds);
  const out = new Map<string, string>();
  for (const [id, m] of meta) {
    if (m.muscle) out.set(id, m.muscle);
  }
  return out;
}

/**
 * Aggregate week volume from canvas workouts.
 * athletic_development → excluded (footer). Untagged non-athletic → footer data gap.
 * Header total = tagged resistance only.
 */
export function aggregateVolumeFromCanvasWorkouts(
  workouts: CanvasWorkout[],
  metaByExerciseId: Map<string, ExerciseVolumeMeta>,
): StationWeekVolumeAggregate {
  const byMuscle = new Map<string, number>();
  let totalWorkingSets = 0;
  let athleticExcludedSets = 0;
  let untaggedSets = 0;
  const athleticById = new Map<string, StationExcludedExercise>();
  const untaggedById = new Map<string, StationExcludedExercise>();

  for (const workout of workouts) {
    for (const group of workout.groups) {
      if (!isCountableGroup(group) || group.slots.length === 0) continue;

      for (const slot of group.slots) {
        const sets = workingSetCount(group, slot);
        const meta = metaByExerciseId.get(slot.exercise_id);
        const isAthletic =
          meta?.isAthleticDevelopment ?? isAthleticCategory(meta?.category);

        if (isAthletic) {
          athleticExcludedSets += sets;
          if (slot.exercise_id) {
            const prev = athleticById.get(slot.exercise_id);
            athleticById.set(slot.exercise_id, {
              id: slot.exercise_id,
              name: meta?.name || slot.exercise?.name || "Exercise",
              sets: (prev?.sets ?? 0) + sets,
              category: meta?.category ?? null,
              coachId: meta?.coachId ?? null,
              primaryMuscleGroupId: meta?.primaryMuscleGroupId ?? null,
              secondaryMuscleGroup1Id: meta?.secondaryMuscleGroup1Id ?? null,
              secondaryMuscleGroup2Id: meta?.secondaryMuscleGroup2Id ?? null,
              reason: "athletic",
            });
          }
          continue;
        }

        const muscle = meta?.muscle ?? null;
        if (muscle && muscle !== "Full Body") {
          byMuscle.set(muscle, (byMuscle.get(muscle) || 0) + sets);
          totalWorkingSets += sets;
        } else {
          untaggedSets += sets;
          if (slot.exercise_id) {
            const prev = untaggedById.get(slot.exercise_id);
            untaggedById.set(slot.exercise_id, {
              id: slot.exercise_id,
              name: meta?.name || slot.exercise?.name || "Exercise",
              sets: (prev?.sets ?? 0) + sets,
              category: meta?.category ?? null,
              coachId: meta?.coachId ?? null,
              primaryMuscleGroupId: meta?.primaryMuscleGroupId ?? null,
              secondaryMuscleGroup1Id: meta?.secondaryMuscleGroup1Id ?? null,
              secondaryMuscleGroup2Id: meta?.secondaryMuscleGroup2Id ?? null,
              reason: "untagged",
            });
          }
        }
      }
    }
  }

  const athleticExcludedExercises = [...athleticById.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const untaggedExercises = [...untaggedById.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return {
    byMuscle,
    totalWorkingSets,
    athleticExcludedSets,
    athleticExcludedExerciseCount: athleticExcludedExercises.length,
    athleticExcludedExercises,
    untaggedSets,
    untaggedExerciseCount: untaggedExercises.length,
    untaggedExercises,
  };
}

export type ExerciseVolumeTagPatch = {
  primaryMuscleGroupId: string;
  secondaryMuscleGroup1Id: string | null;
  secondaryMuscleGroup2Id: string | null;
  category: string;
};

/**
 * Persist light tags on an owned exercise. Returns error message on failure.
 * Scoped with `.eq('coach_id', coachId)` so shared/global rows cannot be updated.
 */
export async function saveExerciseVolumeTags(
  exerciseId: string,
  coachId: string,
  patch: ExerciseVolumeTagPatch,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!patch.primaryMuscleGroupId) {
    return { ok: false, error: "Primary muscle is required" };
  }
  if (!EXERCISE_CATEGORY_OPTIONS.includes(patch.category as (typeof EXERCISE_CATEGORY_OPTIONS)[number])) {
    return { ok: false, error: "Unknown category" };
  }

  const { data, error } = await supabase
    .from("exercises")
    .update({
      primary_muscle_group_id: patch.primaryMuscleGroupId,
      secondary_muscle_group_1_id: patch.secondaryMuscleGroup1Id,
      secondary_muscle_group_2_id: patch.secondaryMuscleGroup2Id,
      category: patch.category,
      updated_at: new Date().toISOString(),
    })
    .eq("id", exerciseId)
    .eq("coach_id", coachId)
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data) {
    return { ok: false, error: "You can only edit exercises you own" };
  }
  return { ok: true };
}

export async function fetchMuscleGroupOptions(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from("muscle_groups")
    .select("id, name")
    .order("name");
  if (error || !data) {
    if (error) console.error("[stationWeekVolume] muscle_groups:", error.message);
    return [];
  }
  return data
    .filter((g) => g.id && g.name && g.name !== "Full Body")
    .map((g) => ({ id: g.id as string, name: g.name as string }));
}

function statusFromSets(
  sets: number,
  min: number,
  max: number,
): { status: StationWeekVolumeStatus; statusLabel: string; statusDetail: string | null } {
  if (max <= 0 && min <= 0) {
    return { status: "ok", statusLabel: "On target", statusDetail: null };
  }
  if (sets < min) {
    const need = min - sets;
    return {
      status: "low",
      statusLabel: "Under",
      statusDetail: `+${need} set${need === 1 ? "" : "s"}`,
    };
  }
  if (sets > max) {
    const over = sets - max;
    return {
      status: "over",
      statusLabel: "Over",
      statusDetail: `−${over} set${over === 1 ? "" : "s"}`,
    };
  }
  const atTop = sets === max;
  return {
    status: "ok",
    statusLabel: "On target",
    statusDetail: atTop ? "top of range" : null,
  };
}

function fallbackRange(muscle: string): { min: number; max: number } {
  return FALLBACK_MUSCLE_TARGETS[muscle] ?? { min: 8, max: 16 };
}

/**
 * Landmark band for the rail: MEV → MAV (high). Never maintenance 6–6.
 * Degenerate RP rows fall back to FALLBACK.
 */
export async function resolveStationMuscleTargetRange(
  muscleGroup: string,
): Promise<{ min: number; max: number; source: "rp" | "fallback" }> {
  const fb = fallbackRange(muscleGroup);
  try {
    const landmarks = await getRPVolumeLandmarks(muscleGroup);
    if (!landmarks) return { ...fb, source: "fallback" };

    let min = landmarks.mev;
    let max = landmarks.mavHigh > 0 ? landmarks.mavHigh : landmarks.mavLow;

    if (min <= 0 && landmarks.mavLow > 0) {
      min = landmarks.mavLow;
      max = landmarks.mavHigh > landmarks.mavLow ? landmarks.mavHigh : landmarks.mrv || fb.max;
    }

    if (max < min) max = landmarks.mrv || fb.max;
    if (min === max || max <= 0) return { ...fb, source: "fallback" };

    return { min, max, source: "rp" };
  } catch {
    return { ...fb, source: "fallback" };
  }
}

export async function buildStationWeekVolumeRows(
  volumeByMuscle: Map<string, number>,
): Promise<StationMuscleVolumeRow[]> {
  if (volumeByMuscle.size === 0) return [];

  const entries = [...volumeByMuscle.entries()].sort((a, b) => b[1] - a[1]);
  const rows: StationMuscleVolumeRow[] = [];

  for (const [muscleGroup, sets] of entries) {
    const { min, max } = await resolveStationMuscleTargetRange(muscleGroup);
    const { status, statusLabel, statusDetail } = statusFromSets(sets, min, max);
    rows.push({
      muscleGroup,
      sets,
      min,
      max,
      status,
      statusLabel,
      statusDetail,
    });
  }
  return rows;
}

export function summarizeStationWeekVolume(
  rows: StationMuscleVolumeRow[],
  sessionCount: number,
  aggregate: StationWeekVolumeAggregate,
): StationWeekVolumeSummary {
  const hasAny =
    aggregate.totalWorkingSets > 0 ||
    aggregate.athleticExcludedSets > 0 ||
    aggregate.untaggedSets > 0;
  return {
    totalWorkingSets: aggregate.totalWorkingSets,
    sessionCount,
    rows,
    empty: sessionCount === 0 && !hasAny,
    athleticExcludedSets: aggregate.athleticExcludedSets,
    athleticExcludedExerciseCount: aggregate.athleticExcludedExerciseCount,
    athleticExcludedExercises: aggregate.athleticExcludedExercises,
    untaggedSets: aggregate.untaggedSets,
    untaggedExerciseCount: aggregate.untaggedExerciseCount,
    untaggedExercises: aggregate.untaggedExercises,
  };
}
