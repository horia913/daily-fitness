import type { WorkoutSetLog } from "./workoutSetLogTypes";
import type { PrescribedRpeMap } from "./types";

export function repsFromSet(set: WorkoutSetLog): number {
  const r = set.reps ?? set.amrap_total_reps ?? set.fortime_total_reps ?? 0;
  return Math.round(Number(r) || 0);
}

export function weightFromSet(set: WorkoutSetLog): number {
  const w = set.weight;
  if (w == null || !Number.isFinite(Number(w))) return 0;
  return Number(w);
}

export function prescribedKey(
  setEntryId: string,
  exerciseId: string,
  setNumber: number,
): string {
  return `${setEntryId}:${exerciseId}:${setNumber}`;
}

/**
 * Build ordered compressible lines for one exercise within a block.
 */
export function buildCompressLinesForExercise(
  blockType: string,
  sets: WorkoutSetLog[],
  exerciseId: string,
  isPrForLine: (weight: number, reps: number) => boolean,
  prescribed?: PrescribedRpeMap,
): import("./compressStrengthSets").CompressLine[] {
  const sorted = [...sets].sort((a, b) => {
    const an = a.set_number ?? 0;
    const bn = b.set_number ?? 0;
    if (an !== bn) return an - bn;
    return new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime();
  });

  const lines: import("./compressStrengthSets").CompressLine[] = [];

  const pushLine = (
    set: WorkoutSetLog,
    setIndex: number,
    weight: number,
    reps: number,
    eid: string,
  ) => {
    const rpe =
      set.rpe != null && Number(set.rpe) > 0 ? Number(set.rpe) : null;
    const rx =
      prescribed?.get(prescribedKey(set.set_entry_id, eid, setIndex)) ?? null;
    lines.push({
      setIndex,
      weight,
      reps,
      isPR: isPrForLine(weight, reps),
      setLogId: set.id,
      prescribedRpe: rx != null && Number(rx) > 0 ? Number(rx) : null,
      loggedRpe: rpe,
    });
  };

  if (blockType === "superset") {
    for (const set of sorted) {
      const sn = set.set_number ?? lines.length + 1;
      if (set.superset_exercise_a_id === exerciseId) {
        const w =
          set.superset_weight_a != null ? Number(set.superset_weight_a) : 0;
        const r =
          set.superset_reps_a != null
            ? Math.round(Number(set.superset_reps_a))
            : 0;
        pushLine(set, sn, w, r, exerciseId);
      }
      if (set.superset_exercise_b_id === exerciseId) {
        const w =
          set.superset_weight_b != null ? Number(set.superset_weight_b) : 0;
        const r =
          set.superset_reps_b != null
            ? Math.round(Number(set.superset_reps_b))
            : 0;
        pushLine(set, sn, w, r, exerciseId);
      }
    }
    return lines;
  }

  for (const set of sorted) {
    if (set.exercise_id !== exerciseId) continue;
    const sn = set.set_number ?? lines.length + 1;
    pushLine(set, sn, weightFromSet(set), repsFromSet(set), exerciseId);
  }

  return lines;
}

export function dropTechniqueNote(sets: WorkoutSetLog[]): string | null {
  const withDrop = sets.find(
    (s) =>
      s.set_type === "drop_set" ||
      (s.dropset_final_weight != null && Number(s.dropset_final_weight) > 0),
  );
  if (!withDrop) return null;
  const finalW = withDrop.dropset_final_weight;
  if (finalW != null && Number(finalW) > 0) {
    const w = Number(finalW);
    const label = Math.abs(w - Math.round(w)) < 0.01 ? String(Math.round(w)) : String(w);
    return `↳ drop set · dropped to ${label} kg`;
  }
  return `↳ drop set`;
}
