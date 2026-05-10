import type { WorkoutSetLog } from "./workoutSetLogTypes";

export function repsFromSet(set: WorkoutSetLog): number {
  const r =
    set.reps ??
    set.amrap_total_reps ??
    set.fortime_total_reps ??
    0;
  return Math.round(Number(r) || 0);
}

export function weightFromSet(set: WorkoutSetLog): number {
  const w = set.weight;
  if (w == null || !Number.isFinite(Number(w))) return 0;
  return Number(w);
}

/**
 * Build ordered compressible lines for one exercise within a block.
 * Supports straight-style logs; supersets emit A then B for each set_number in file order.
 */
export function buildCompressLinesForExercise(
  blockType: string,
  sets: WorkoutSetLog[],
  exerciseId: string,
  isPrForLine: (weight: number, reps: number) => boolean
): import("./compressStrengthSets").CompressLine[] {
  const sorted = [...sets].sort((a, b) => {
    const an = a.set_number ?? 0;
    const bn = b.set_number ?? 0;
    if (an !== bn) return an - bn;
    return new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime();
  });

  const lines: import("./compressStrengthSets").CompressLine[] = [];

  const pushLine = (setIndex: number, weight: number, reps: number) => {
    lines.push({
      setIndex,
      weight,
      reps,
      isPR: isPrForLine(weight, reps),
    });
  };

  if (blockType === "superset") {
    for (const set of sorted) {
      const sn = set.set_number ?? lines.length + 1;
      if (set.superset_exercise_a_id === exerciseId) {
        const w = set.superset_weight_a != null ? Number(set.superset_weight_a) : 0;
        const r = set.superset_reps_a != null ? Math.round(Number(set.superset_reps_a)) : 0;
        pushLine(sn, w, r);
      }
      if (set.superset_exercise_b_id === exerciseId) {
        const w = set.superset_weight_b != null ? Number(set.superset_weight_b) : 0;
        const r = set.superset_reps_b != null ? Math.round(Number(set.superset_reps_b)) : 0;
        pushLine(sn, w, r);
      }
    }
    return lines;
  }

  for (const set of sorted) {
    if (set.exercise_id !== exerciseId) continue;
    const sn = set.set_number ?? lines.length + 1;
    const w = weightFromSet(set);
    const r = repsFromSet(set);
    pushLine(sn, w, r);
  }

  return lines;
}
