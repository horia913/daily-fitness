import type { WorkoutLogBlock, WorkoutLogBlockType, WorkoutLogSet } from "@/types/workoutLog";

const TIME_BLOCKS = new Set<WorkoutLogBlockType>(["amrap", "emom", "tabata", "for_time"]);
const MULTI_EXERCISE_BLOCKS = new Set<WorkoutLogBlockType>([
  "superset",
  "giant_set",
  "pre_exhaustion",
]);

function normalizeBlockType(v: string | null | undefined): WorkoutLogBlockType {
  const t = String(v ?? "").toLowerCase().trim();
  if (t === "dropset") return "drop_set";
  if (t === "fortime") return "for_time";
  if (t === "preexhaust") return "pre_exhaustion";
  return (t || "straight_set") as WorkoutLogBlockType;
}

function setTimeMs(setLog: WorkoutLogSet): number {
  if (!setLog.completed_at) return Number.MAX_SAFE_INTEGER;
  const ts = Date.parse(setLog.completed_at);
  return Number.isNaN(ts) ? Number.MAX_SAFE_INTEGER : ts;
}

export function groupSetsIntoBlocks(setLogs: WorkoutLogSet[]): WorkoutLogBlock[] {
  const grouped = new Map<string, WorkoutLogSet[]>();
  for (const setLog of setLogs) {
    const setEntryId = setLog.set_entry_id ?? setLog.id;
    if (!grouped.has(setEntryId)) grouped.set(setEntryId, []);
    grouped.get(setEntryId)!.push(setLog);
  }

  const blocks: WorkoutLogBlock[] = [];

  for (const [setEntryId, sets] of grouped.entries()) {
    const first = sets[0];
    const setType = normalizeBlockType(first.set_type);
    const sortedSets = [...sets].sort((a, b) => {
      const setNumberCmp = (a.set_number ?? Number.MAX_SAFE_INTEGER) - (b.set_number ?? Number.MAX_SAFE_INTEGER);
      if (setNumberCmp !== 0) return setNumberCmp;
      const roundCmp = (a.round_number ?? Number.MAX_SAFE_INTEGER) - (b.round_number ?? Number.MAX_SAFE_INTEGER);
      if (roundCmp !== 0) return roundCmp;
      return setTimeMs(a) - setTimeMs(b);
    });

    const orderedExerciseIds: string[] = [];
    const seenExerciseId = new Set<string>();
    const nameByExerciseId = new Map<string, string>();

    function addExercise(id: string | null | undefined, name: string | null | undefined) {
      if (!id) return;
      if (!seenExerciseId.has(id)) {
        seenExerciseId.add(id);
        orderedExerciseIds.push(id);
      }
      const n = name?.trim();
      if (n) nameByExerciseId.set(id, n);
    }

    for (const setLog of sortedSets) {
      const primaryId = setLog.exercise_id ?? setLog.exercise?.id ?? null;
      const primaryName =
        setLog.exercise?.name ?? setLog.exercises?.name ?? null;
      addExercise(primaryId, primaryName);

      if (MULTI_EXERCISE_BLOCKS.has(setType)) {
        addExercise(setLog.superset_exercise_a_id, undefined);
        addExercise(setLog.superset_exercise_b_id, undefined);
        for (const giantExercise of setLog.giant_set_exercises ?? []) {
          addExercise(
            giantExercise.exercise_id,
            giantExercise.exercise_name ?? undefined
          );
        }
      }
    }

    const roundCount = TIME_BLOCKS.has(setType)
      ? Math.max(0, ...sortedSets.map((setLog) => setLog.round_number ?? 0)) || undefined
      : undefined;

    blocks.push({
      setEntryId,
      setType,
      blockOrder: 0,
      exerciseIds: orderedExerciseIds,
      exerciseNames: orderedExerciseIds.map(
        (id) => nameByExerciseId.get(id) ?? "Exercise"
      ),
      sets: sortedSets,
      roundCount,
    });
  }

  const ordered = blocks.sort((a, b) => {
    const earliestA = Math.min(...a.sets.map((setLog) => setTimeMs(setLog)));
    const earliestB = Math.min(...b.sets.map((setLog) => setTimeMs(setLog)));
    return earliestA - earliestB;
  });

  return ordered.map((block, index) => ({
    ...block,
    blockOrder: index + 1,
  }));
}
