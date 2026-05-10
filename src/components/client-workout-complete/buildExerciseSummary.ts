import type { BlockGroupLite, ExerciseSummaryModel } from "./types";
import type { WorkoutSetLog } from "./workoutSetLogTypes";

function formatBlockLabel(blockType: string): string {
  return blockType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function pillVariant(
  blockType: string
): ExerciseSummaryModel["setTypeVariant"] {
  const t = blockType.toLowerCase();
  if (t === "straight_set" || t === "straight") return "straight";
  if (t.includes("cluster")) return "cluster";
  if (t.includes("drop")) return "drop";
  return "other";
}

function collectExerciseIds(block: BlockGroupLite): string[] {
  const ids = new Set<string>();
  for (const s of block.sets) {
    if (s.exercise_id) ids.add(s.exercise_id);
    if (s.superset_exercise_a_id) ids.add(s.superset_exercise_a_id);
    if (s.superset_exercise_b_id) ids.add(s.superset_exercise_b_id);
  }
  return Array.from(ids);
}

function nameFor(
  exerciseNames: Map<string, string>,
  exerciseId: string | null
): string {
  if (!exerciseId) return "Exercise";
  return exerciseNames.get(exerciseId) || "Exercise";
}

function setsForExercise(
  block: BlockGroupLite,
  exerciseId: string
): WorkoutSetLog[] {
  if (block.set_type === "superset") {
    return block.sets.filter(
      (s) =>
        s.superset_exercise_a_id === exerciseId ||
        s.superset_exercise_b_id === exerciseId
    );
  }
  return block.sets.filter((s) => s.exercise_id === exerciseId);
}

function totalsForSets(sets: WorkoutSetLog[], exerciseId: string | null) {
  let totalReps = 0;
  let totalKg = 0;
  for (const s of sets) {
    if (s.set_type === "superset" && exerciseId) {
      if (s.superset_exercise_a_id === exerciseId) {
        totalReps += s.superset_reps_a != null ? Math.round(Number(s.superset_reps_a)) : 0;
        totalKg +=
          s.superset_weight_a != null ? Number(s.superset_weight_a) * (s.superset_reps_a ?? 0) : 0;
      }
      if (s.superset_exercise_b_id === exerciseId) {
        totalReps += s.superset_reps_b != null ? Math.round(Number(s.superset_reps_b)) : 0;
        totalKg +=
          s.superset_weight_b != null ? Number(s.superset_weight_b) * (s.superset_reps_b ?? 0) : 0;
      }
      continue;
    }
    const r =
      s.reps ??
      s.amrap_total_reps ??
      s.fortime_total_reps ??
      0;
    const w = s.weight != null ? Number(s.weight) : 0;
    totalReps += Math.round(Number(r) || 0);
    totalKg += w * Math.round(Number(r) || 0);
  }
  return { totalReps, totalKg, setCount: sets.length };
}

export function buildExerciseSummaryRows(
  blockGroups: BlockGroupLite[]
): ExerciseSummaryModel[] {
  const sorted = [...blockGroups].sort((a, b) => a.set_order - b.set_order);
  const rows: ExerciseSummaryModel[] = [];
  let order = 0;

  for (const block of sorted) {
    const ids = collectExerciseIds(block);
    if (ids.length === 0 && block.sets.length > 0) {
      const first = block.sets[0];
      const eid = first.exercise_id;
      const subset = block.sets;
      const label = formatBlockLabel(block.set_type);
      order += 1;
      rows.push({
        key: `${block.set_entry_id}::${eid ?? "na"}`,
        order,
        exerciseId: eid,
        name: nameFor(block.exerciseNames, eid),
        setTypeKey: block.set_type,
        setTypeLabel: label,
        setTypeVariant: pillVariant(block.set_type),
        sets: subset,
        blockType: block.set_type,
        exerciseNames: block.exerciseNames,
      });
      continue;
    }

    for (const eid of ids) {
      const subset = setsForExercise(block, eid);
      if (subset.length === 0) continue;
      order += 1;
      rows.push({
        key: `${block.set_entry_id}::${eid}`,
        order,
        exerciseId: eid,
        name: nameFor(block.exerciseNames, eid),
        setTypeKey: block.set_type,
        setTypeLabel: formatBlockLabel(block.set_type),
        setTypeVariant: pillVariant(block.set_type),
        sets: subset,
        blockType: block.set_type,
        exerciseNames: block.exerciseNames,
      });
    }
  }

  return rows;
}

export function rowTotals(row: ExerciseSummaryModel) {
  return totalsForSets(row.sets, row.exerciseId);
}
