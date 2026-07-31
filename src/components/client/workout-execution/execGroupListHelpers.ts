/**
 * Display helpers for the one-page execution group list.
 * Targets use the same per-set path as the live card.
 */

import { resolveSetPrescriptionTargets } from "@/components/client/workout-execution/ui/set-rows/resolveSetPrescriptionTargets";
import {
  formatGroupedExerciseBadge,
  formatGroupedHeaderBadge,
  formatSoloGroupBadge,
} from "@/components/client/workout-execution/groupLetterBadges";
import {
  WORKOUT_SET_TYPE_CONFIGS,
  type LiveWorkoutSetEntry,
  type SetType,
  type WorkoutSetEntryExercise,
} from "@/types/workoutSetEntries";

const GROUPED_TYPES: SetType[] = [
  "superset",
  "giant_set",
  "pre_exhaustion",
];

export function isGroupedSetType(setType: SetType | string | undefined): boolean {
  return GROUPED_TYPES.includes((setType ?? "straight_set") as SetType);
}

export function getGroupTotalSets(entry: LiveWorkoutSetEntry): number {
  const fromEntry = entry.setEntry.total_sets;
  if (fromEntry != null && fromEntry > 0) return fromEntry;
  const fromEx = entry.setEntry.exercises?.[0]?.sets;
  if (fromEx != null && fromEx > 0) return fromEx;
  return 1;
}

/** Header badge label: solo `A`; grouped `A1–A2`. */
export function formatExecGroupHeaderBadge(
  entry: LiveWorkoutSetEntry,
  groupIndex: number,
): string {
  const setType = (entry.setEntry.set_type ?? "straight_set") as SetType;
  const exercises = entry.setEntry.exercises ?? [];
  if (isGroupedSetType(setType) && exercises.length >= 2) {
    return formatGroupedHeaderBadge(groupIndex, exercises);
  }
  return formatSoloGroupBadge(groupIndex);
}

/**
 * Group title beside the badge: exercise name (solo), or type name (grouped)
 * — range lives on the badge so it isn’t duplicated.
 */
export function formatExecGroupName(
  entry: LiveWorkoutSetEntry,
  _groupIndex?: number,
): string {
  const setType = (entry.setEntry.set_type ?? "straight_set") as SetType;
  const exercises = entry.setEntry.exercises ?? [];
  const typeName = WORKOUT_SET_TYPE_CONFIGS[setType]?.name ?? "Set";

  if (isGroupedSetType(setType) && exercises.length >= 2) {
    return typeName;
  }

  const first = exercises[0];
  return (
    first?.exercise?.name ||
    (first as { name?: string } | undefined)?.name ||
    typeName
  );
}

function formatSoloTargetLine(
  exercise: WorkoutSetEntryExercise | undefined,
  setNumber: number,
  repsPerSet: string | null | undefined,
): string {
  const t = resolveSetPrescriptionTargets(exercise, setNumber, repsPerSet);
  if (t.work_seconds != null && t.work_seconds > 0) {
    return `${t.work_seconds} sec`;
  }
  if (t.distance_meters != null && t.distance_meters > 0) {
    return `${t.distance_meters} m`;
  }
  const reps = t.reps?.trim() || "—";
  if (t.weight_kg != null) {
    return `${reps} × ${t.weight_kg} kg`;
  }
  return `${reps} reps`;
}

function formatGroupedExercisePiece(
  groupIndex: number,
  exercise: WorkoutSetEntryExercise,
  index: number,
  setNumber: number,
  repsPerSet: string | null | undefined,
): string {
  const badge = formatGroupedExerciseBadge(
    groupIndex,
    exercise.exercise_order,
    index,
  );
  const t = resolveSetPrescriptionTargets(exercise, setNumber, repsPerSet);
  if (t.work_seconds != null && t.work_seconds > 0) {
    return `${badge} ${t.work_seconds}s`;
  }
  if (t.distance_meters != null && t.distance_meters > 0) {
    return `${badge} ${t.distance_meters}m`;
  }
  const reps = t.reps?.trim() || "—";
  if (t.weight_kg != null) {
    return `${badge} ${reps}×${t.weight_kg}`;
  }
  return `${badge} ${reps}`;
}

/** One upcoming set line, e.g. `8 × 60 kg` or `B1 4×100 · B2 8×68`. */
export function formatUpcomingSetTargetSummary(
  entry: LiveWorkoutSetEntry,
  setNumber: number,
  groupIndex = 0,
): string {
  const setType = (entry.setEntry.set_type ?? "straight_set") as SetType;
  const exercises = entry.setEntry.exercises ?? [];
  const repsPerSet = entry.setEntry.reps_per_set;

  if (isGroupedSetType(setType) && exercises.length >= 2) {
    return exercises
      .map((ex, i) =>
        formatGroupedExercisePiece(
          groupIndex,
          ex,
          i,
          setNumber,
          repsPerSet,
        ),
      )
      .join(" · ");
  }

  return formatSoloTargetLine(exercises[0], setNumber, repsPerSet);
}

/** Tick state for collapsed/prior group headers — one slot per set/round. */
export function getGroupTickState(entry: LiveWorkoutSetEntry): {
  completed: number;
  total: number;
} {
  const total = Math.max(1, getGroupTotalSets(entry));
  const completed = entry.completedSets ?? 0;
  if (completed > 0) return { completed: Math.min(completed, total), total };
  if (entry.isCompleted) return { completed: total, total };
  // Prior group with no counter — treat as fully done (legacy path).
  return { completed: total, total };
}

/** ✓ count for a done (prior) group — prefer completedSets, else full total. */
export function getDoneCheckCount(entry: LiveWorkoutSetEntry): number {
  return getGroupTickState(entry).completed;
}
