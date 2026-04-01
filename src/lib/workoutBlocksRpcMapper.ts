/**
 * Maps get_workout_blocks RPC response to WorkoutSetEntry[] shape expected by
 * WorkoutBlockService.getWorkoutBlocks() / the workout start page.
 */

import type { WorkoutSetEntry, WorkoutTimeProtocol } from "@/types/workoutSetEntries";

type RpcBlock = {
  id: string;
  template_id: string;
  set_order: number;
  set_type: string;
  set_name?: string | null;
  set_notes?: string | null;
  total_sets?: number | null;
  reps_per_set?: string | null;
  rest_seconds?: number | null;
  duration_seconds?: number | null;
  created_at?: string;
  updated_at?: string;
  exercises?: RpcExercise[];
  drop_sets?: RpcDropSet[];
  cluster_sets?: RpcClusterSet[];
  rest_pause_sets?: RpcRestPauseSet[];
  pyramid_sets?: RpcPyramidRow[];
  ladder_sets?: RpcLadderRow[];
  time_protocols?: RpcTimeProtocol[];
  hr_sets?: RpcHRRow[];
};

type RpcPyramidRow = {
  id: string;
  set_entry_id?: string;
  exercise_id: string;
  exercise_order?: number;
  pyramid_order?: number;
  weight_kg?: number | null;
  load_percentage?: number | null;
  reps?: string | null;
  rest_seconds?: number | null;
};

type RpcLadderRow = {
  id: string;
  set_entry_id?: string;
  exercise_id: string;
  exercise_order?: number;
  ladder_order?: number;
  weight_kg?: number | null;
  load_percentage?: number | null;
  reps?: number | null;
  rest_seconds?: number | null;
};

type RpcHRRow = {
  id: string;
  set_entry_id?: string;
  exercise_id: string;
  exercise_order?: number;
};

type RpcExercise = {
  id: string;
  set_entry_id: string;
  exercise_id: string;
  exercise_order: number;
  exercise_letter?: string | null;
  sets?: number | null;
  reps?: string | null;
  weight_kg?: number | null;
  rest_seconds?: number | null;
  notes?: string | null;
  load_percentage?: number | null;
  exercise?: Record<string, unknown> | null;
};

type RpcDropSet = {
  id: string;
  set_entry_id?: string;
  exercise_id: string;
  exercise_order: number;
  drop_order: number;
  weight_kg?: number | null;
  reps?: string | null;
  load_percentage?: number | null;
};

type RpcClusterSet = {
  id: string;
  set_entry_id?: string;
  exercise_id: string;
  exercise_order: number;
  reps_per_cluster?: number;
  clusters_per_set?: number;
  intra_cluster_rest?: number | null;
  weight_kg?: number | null;
  load_percentage?: number | null;
};

type RpcRestPauseSet = {
  id: string;
  set_entry_id?: string;
  exercise_id: string;
  exercise_order: number;
  rest_pause_duration?: number | null;
  max_rest_pauses?: number | null;
  weight_kg?: number | null;
  load_percentage?: number | null;
};

type RpcTimeProtocol = {
  id: string;
  set_entry_id?: string;
  exercise_id: string;
  exercise_order: number;
  protocol_type?: string | null;
  created_at?: string | null;
  weight_kg?: number | null;
  load_percentage?: number | null;
  [key: string]: unknown;
};

function mapRpcTimeProtocolToWorkout(tp: RpcTimeProtocol): WorkoutTimeProtocol {
  const protocolType = (tp.protocol_type as WorkoutTimeProtocol['protocol_type']) ?? 'amrap';
  const validProtocolType: WorkoutTimeProtocol['protocol_type'] =
    ['amrap', 'emom', 'for_time', 'tabata'].includes(protocolType) ? protocolType : 'amrap';
  return {
    ...tp,
    set_entry_id: tp.set_entry_id ?? '',
    protocol_type: validProtocolType,
    created_at: tp.created_at ?? new Date().toISOString(),
  } as WorkoutTimeProtocol;
}

function exerciseKey(exerciseId: string, exerciseOrder: number): string {
  return `${exerciseId}:${exerciseOrder}`;
}

function filterByExercise<T extends { exercise_id?: string; exercise_order?: number }>(
  arr: T[],
  exerciseId: string,
  exerciseOrder: number
): T[] {
  return (arr || []).filter(
    (x) => x.exercise_id === exerciseId && x.exercise_order === exerciseOrder
  );
}

/**
 * Map get_workout_blocks RPC result (jsonb array) to WorkoutSetEntry[] so the
 * workout start page and other consumers see the same shape as getWorkoutBlocks().
 */
export function mapWorkoutBlocksRpcToSetEntries(rpcBlocks: unknown): WorkoutSetEntry[] {
  const blocks = Array.isArray(rpcBlocks) ? (rpcBlocks as RpcBlock[]) : [];
  if (blocks.length === 0) return [];

  const result: WorkoutSetEntry[] = [];

  for (const b of blocks) {
    const setType = b.set_type || "straight_set";
    const usesBlockExercises = ["straight_set", "superset", "giant_set", "pre_exhaustion"].includes(setType);
    const usesDropSets = setType === "drop_set";
    const usesClusterSets = setType === "cluster_set";
    const usesRestPause = setType === "rest_pause";
    const usesTimeProtocols = ["amrap", "emom", "for_time", "tabata", "circuit"].includes(setType);

    const block: WorkoutSetEntry = {
      id: b.id,
      template_id: b.template_id,
      set_type: setType as WorkoutSetEntry["set_type"],
      set_order: b.set_order ?? 0,
      set_name: b.set_name ?? undefined,
      set_notes: b.set_notes ?? undefined,
      total_sets: b.total_sets ?? undefined,
      reps_per_set: b.reps_per_set ?? undefined,
      rest_seconds: b.rest_seconds ?? undefined,
      duration_seconds: b.duration_seconds ?? undefined,
      created_at: b.created_at ?? new Date().toISOString(),
      updated_at: b.updated_at ?? new Date().toISOString(),
      time_protocols: (b.time_protocols ?? []).map(mapRpcTimeProtocolToWorkout),
      exercises: [],
    };

    if (usesBlockExercises && Array.isArray(b.exercises) && b.exercises.length > 0) {
      const dropSets = b.drop_sets ?? [];
      const clusterSets = b.cluster_sets ?? [];
      const restPauseSets = b.rest_pause_sets ?? [];
      block.exercises = b.exercises.map((ex) => {
        const drop = filterByExercise(dropSets, ex.exercise_id, ex.exercise_order).sort(
          (a, b) => (a.drop_order ?? 0) - (b.drop_order ?? 0)
        );
        const cluster = filterByExercise(clusterSets, ex.exercise_id, ex.exercise_order);
        const restPause = filterByExercise(restPauseSets, ex.exercise_id, ex.exercise_order);
        return {
          ...ex,
          drop_sets: drop,
          cluster_sets: cluster,
          rest_pause_sets: restPause,
          exercise: ex.exercise ?? null,
        } as any;
      });
      if (setType === "giant_set") {
        block.exercises.sort((a, b) => {
          const letterA = (a as any).exercise_letter || "A";
          const letterB = (b as any).exercise_letter || "A";
          return String(letterA).localeCompare(String(letterB));
        });
      }
    } else if (usesDropSets) {
      // Prefer RPC `exercises` when present (same shape as straight_set branch),
      // then attach drop set rows to each exercise. Fallback to grouping drop_sets.
      if (Array.isArray(b.exercises) && b.exercises.length > 0) {
        block.exercises = b.exercises.map((ex) => {
          const drop = filterByExercise(b.drop_sets ?? [], ex.exercise_id, ex.exercise_order).sort(
            (a, b) => (a.drop_order ?? 0) - (b.drop_order ?? 0)
          );
          return {
            ...ex,
            sets: ex.sets ?? b.total_sets,
            reps: ex.reps ?? b.reps_per_set,
            weight_kg: ex.weight_kg ?? drop[0]?.weight_kg,
            load_percentage: ex.load_percentage ?? drop[0]?.load_percentage,
            drop_sets: drop,
            exercise: ex.exercise ?? null,
          } as any;
        });
      } else if (Array.isArray(b.drop_sets) && b.drop_sets.length > 0) {
        const byKey = new Map<string, RpcDropSet[]>();
        for (const ds of b.drop_sets) {
          const key = exerciseKey(ds.exercise_id, ds.exercise_order);
          if (!byKey.has(key)) byKey.set(key, []);
          byKey.get(key)!.push(ds);
        }
        block.exercises = Array.from(byKey.entries()).map(([, dsList]) => {
          const first = dsList[0];
          const sorted = [...dsList].sort((a, b) => (a.drop_order ?? 0) - (b.drop_order ?? 0));
          return {
            id: first.id,
            set_entry_id: b.id,
            exercise_id: first.exercise_id,
            exercise_order: first.exercise_order,
            exercise: null,
            sets: b.total_sets,
            reps: b.reps_per_set,
            weight_kg: first.weight_kg,
            load_percentage: first.load_percentage,
            drop_sets: sorted,
          } as any;
        });
      }
      block.exercises?.sort((a, b) => (a.exercise_order ?? 0) - (b.exercise_order ?? 0));
    } else if (usesClusterSets && Array.isArray(b.cluster_sets) && b.cluster_sets.length > 0) {
      const csList = [...b.cluster_sets].sort((a, b) => (a.exercise_order ?? 0) - (b.exercise_order ?? 0));
      block.exercises = csList.map((cs) => ({
        id: cs.id,
        set_entry_id: b.id,
        exercise_id: cs.exercise_id,
        exercise_order: cs.exercise_order,
        exercise: null,
        sets: b.total_sets,
        reps_per_cluster: cs.reps_per_cluster,
        clusters_per_set: cs.clusters_per_set,
        intra_cluster_rest: cs.intra_cluster_rest,
        rest_seconds: b.rest_seconds,
        weight_kg: cs.weight_kg,
        load_percentage: cs.load_percentage,
        cluster_sets: [cs],
      })) as any;
    } else if (usesRestPause && Array.isArray(b.rest_pause_sets) && b.rest_pause_sets.length > 0) {
      const rpList = [...b.rest_pause_sets].sort((a, b) => (a.exercise_order ?? 0) - (b.exercise_order ?? 0));
      block.exercises = rpList.map((rp) => ({
        id: rp.id,
        set_entry_id: b.id,
        exercise_id: rp.exercise_id,
        exercise_order: rp.exercise_order,
        exercise: null,
        sets: b.total_sets,
        reps: b.reps_per_set,
        rest_pause_duration: rp.rest_pause_duration,
        max_rest_pauses: rp.max_rest_pauses,
        weight_kg: rp.weight_kg,
        load_percentage: rp.load_percentage,
        rest_pause_sets: [rp],
      })) as any;
    } else if (setType === "pyramid_set" && Array.isArray(b.pyramid_sets) && b.pyramid_sets.length > 0) {
      const psList = [...b.pyramid_sets].sort(
        (a, b) => (a.pyramid_order ?? 0) - (b.pyramid_order ?? 0),
      );
      block.exercises = psList.map((ps) => ({
        id: ps.id,
        set_entry_id: b.id,
        exercise_id: ps.exercise_id,
        exercise_order: ps.exercise_order ?? 1,
        exercise: null,
        sets: b.total_sets,
        reps: b.reps_per_set,
        rest_seconds: b.rest_seconds,
        weight_kg: ps.weight_kg,
        load_percentage: ps.load_percentage,
      })) as any;
    } else if (
      (setType === "ladder_set" || setType === "ladder") &&
      Array.isArray(b.ladder_sets) &&
      b.ladder_sets.length > 0
    ) {
      const lsList = [...b.ladder_sets].sort(
        (a, b) => (a.ladder_order ?? 0) - (b.ladder_order ?? 0),
      );
      block.exercises = lsList.map((ls) => ({
        id: ls.id,
        set_entry_id: b.id,
        exercise_id: ls.exercise_id,
        exercise_order: ls.exercise_order ?? 1,
        exercise: null,
        sets: b.total_sets,
        reps: ls.reps != null ? String(ls.reps) : b.reps_per_set,
        rest_seconds: ls.rest_seconds ?? b.rest_seconds,
        weight_kg: ls.weight_kg,
        load_percentage: ls.load_percentage,
      })) as any;
    } else if (setType === "hr_sets" && Array.isArray(b.hr_sets) && b.hr_sets.length > 0) {
      const hrList = [...b.hr_sets].sort((a, b) => (a.exercise_order ?? 0) - (b.exercise_order ?? 0));
      block.exercises = hrList.map((hr) => ({
        id: hr.id,
        set_entry_id: b.id,
        exercise_id: hr.exercise_id,
        exercise_order: hr.exercise_order ?? 1,
        exercise: null,
        sets: b.total_sets,
        hr_sets: [hr],
      })) as any;
    } else if (usesTimeProtocols && Array.isArray(b.time_protocols) && b.time_protocols.length > 0) {
      const byKey = new Map<string, RpcTimeProtocol[]>();
      for (const tp of b.time_protocols) {
        const key = exerciseKey(tp.exercise_id, tp.exercise_order);
        if (!byKey.has(key)) byKey.set(key, []);
        byKey.get(key)!.push(tp);
      }
      block.exercises = Array.from(byKey.entries()).map(([, tpList]) => {
        const first = tpList[0];
        return {
          id: first.id,
          set_entry_id: b.id,
          exercise_id: first.exercise_id,
          exercise_order: first.exercise_order,
          exercise: null,
          sets: b.total_sets,
          weight_kg: first.weight_kg,
          load_percentage: first.load_percentage,
          time_protocols: tpList,
        };
      }) as any;
      block.exercises?.sort((a, b) => (a.exercise_order ?? 0) - (b.exercise_order ?? 0));
    }

    result.push(block);
  }

  result.sort((a, b) => (a.set_order ?? 0) - (b.set_order ?? 0));
  return result;
}
