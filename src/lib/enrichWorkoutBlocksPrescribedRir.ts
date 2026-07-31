/**

 * Resolves prescribed RIR (displayed as "Target effort" / RPE) for standalone workout blocks.

 *

 * Program instance workouts load RIR from program_instance_set_prescriptions via

 * get_instance_workout_canvas — callers should skip this helper on that path.

 *

 * Standalone priority (first non-null 1–10 wins):

 * 1. existing `ex.rir` on the block (from get_workout_blocks RPC)

 * 2. workout_set_entry_exercises.rir (template row on set_entry_id)

 */



import type { SupabaseClient } from "@supabase/supabase-js";



type ExerciseLike = {

  exercise_id?: string;

  exercise_order?: number;

  rir?: number | null;

};



type BlockLike = {

  id: string;

  exercises?: ExerciseLike[];

};



function rirKey(blockId: string, exerciseOrder: number, exerciseId: string) {

  return `${blockId}|${exerciseOrder}|${exerciseId}`;

}



function normalizeRir(raw: unknown): number | undefined {

  if (raw === null || raw === undefined) return undefined;

  const n = Math.round(Number(raw));

  if (!Number.isFinite(n) || n < 1 || n > 10) return undefined;

  return n;

}



function firstRir(...candidates: unknown[]): number | undefined {

  for (const c of candidates) {

    const n = normalizeRir(c);

    if (n !== undefined) return n;

  }

  return undefined;

}



export type EnrichPrescribedRirContext = {

  /** workout_set_entries.id / block id */

  blockIds: string[];

  /** workout_assignments.id — reserved for future per-assignment block overlay */

  workoutAssignmentId?: string | null;

};



export async function enrichWorkoutBlocksPrescribedRir(

  supabase: SupabaseClient,

  blocks: BlockLike[],

  ctx: EnrichPrescribedRirContext,

): Promise<void> {

  const blockIds = ctx.blockIds.filter(Boolean);

  if (blockIds.length === 0 || blocks.length === 0) return;



  const templateMap = new Map<string, number>();



  const { data, error } = await supabase

    .from("workout_set_entry_exercises")

    .select("set_entry_id, exercise_id, exercise_order, rir")

    .in("set_entry_id", blockIds);



  if (error) {

    console.warn(

      "[enrichPrescribedRir] workout_set_entry_exercises:",

      error.message,

    );

  } else {

    for (const row of data || []) {

      const bid = row.set_entry_id as string | null;

      const eid = row.exercise_id as string | null;

      if (!bid || !eid) continue;

      const ord = Number(row.exercise_order ?? 1);

      const r = normalizeRir(row.rir);

      if (r !== undefined) templateMap.set(rirKey(bid, ord, eid), r);

    }

  }



  for (const block of blocks) {

    const bid = block.id;

    if (!bid) continue;

    const exercises = block.exercises || [];

    for (const ex of exercises) {

      const eid = ex.exercise_id;

      if (!eid) continue;

      const ord =

        typeof ex.exercise_order === "number" && Number.isFinite(ex.exercise_order)

          ? ex.exercise_order

          : 1;

      const key = rirKey(bid, ord, eid);

      const merged = firstRir(ex.rir, templateMap.get(key));

      if (merged !== undefined) {

        ex.rir = merged;

      }

    }

  }

}


