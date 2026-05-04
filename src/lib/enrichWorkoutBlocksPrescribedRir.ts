/**
 * Resolves prescribed RIR (displayed as "Target effort" / RPE) for workout execution blocks.
 *
 * Priority (first non-null 1–10 wins):
 * 1. client_program_progression_rules.rir (client override; program assignments)
 * 2. program_progression_rules.rir (program default)
 * 3. client_workout_block_exercises.rir — skipped here (requires client_block_id → block mapping)
 * 4. workout_exercise_assignments.rir — skipped (requires workout_block_assignment_id chain)
 * 5. workout_set_entry_exercises.rir (template row on set_entry_id)
 *
 * Merge in code: (1), (2), then existing `ex.rir` (may reflect client copy / RPC),
 * then (5) from `workout_set_entry_exercises` so template fills gaps.
 * Does not modify migrations or RPCs — uses direct Supabase reads.
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
  /** Program day / program assignment path */
  programAssignmentId?: string | null;
  programScheduleId?: string | null;
  weekNumber?: number | null;
  /** workout_assignments.id — for client_workout_block_exercises (optional) */
  workoutAssignmentId?: string | null;
};

export async function enrichWorkoutBlocksPrescribedRir(
  supabase: SupabaseClient,
  blocks: BlockLike[],
  ctx: EnrichPrescribedRirContext,
): Promise<void> {
  const blockIds = ctx.blockIds.filter(Boolean);
  if (blockIds.length === 0 || blocks.length === 0) return;

  const clientMap = new Map<string, number>();
  const programMap = new Map<string, number>();
  const templateMap = new Map<string, number>();

  const tasks: Promise<void>[] = [];

  if (ctx.programAssignmentId && ctx.weekNumber != null) {
    tasks.push(
      (async () => {
        const { data, error } = await supabase
          .from("client_program_progression_rules")
          .select("block_id, exercise_id, exercise_order, rir")
          .eq("program_assignment_id", ctx.programAssignmentId)
          .eq("week_number", ctx.weekNumber)
          .in("block_id", blockIds);
        if (error) {
          console.warn("[enrichPrescribedRir] client_program_progression_rules:", error.message);
          return;
        }
        for (const row of data || []) {
          const bid = row.block_id as string | null;
          const eid = row.exercise_id as string | null;
          if (!bid || !eid) continue;
          const ord = Number(row.exercise_order ?? 1);
          const r = normalizeRir(row.rir);
          if (r !== undefined) clientMap.set(rirKey(bid, ord, eid), r);
        }
      })(),
    );
  }

  if (ctx.programScheduleId && ctx.weekNumber != null) {
    tasks.push(
      (async () => {
        const { data, error } = await supabase
          .from("program_progression_rules")
          .select("block_id, exercise_id, exercise_order, rir")
          .eq("program_schedule_id", ctx.programScheduleId)
          .eq("week_number", ctx.weekNumber)
          .in("block_id", blockIds);
        if (error) {
          console.warn("[enrichPrescribedRir] program_progression_rules:", error.message);
          return;
        }
        for (const row of data || []) {
          const bid = row.block_id as string | null;
          const eid = row.exercise_id as string | null;
          if (!bid || !eid) continue;
          const ord = Number(row.exercise_order ?? 1);
          const r = normalizeRir(row.rir);
          if (r !== undefined) programMap.set(rirKey(bid, ord, eid), r);
        }
      })(),
    );
  }

  tasks.push(
    (async () => {
      const { data, error } = await supabase
        .from("workout_set_entry_exercises")
        .select("set_entry_id, exercise_id, exercise_order, rir")
        .in("set_entry_id", blockIds);
      if (error) {
        console.warn(
          "[enrichPrescribedRir] workout_set_entry_exercises:",
          error.message,
        );
        return;
      }
      for (const row of data || []) {
        const bid = row.set_entry_id as string | null;
        const eid = row.exercise_id as string | null;
        if (!bid || !eid) continue;
        const ord = Number(row.exercise_order ?? 1);
        const r = normalizeRir(row.rir);
        if (r !== undefined) templateMap.set(rirKey(bid, ord, eid), r);
      }
    })(),
  );

  await Promise.all(tasks);

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
      const merged = firstRir(
        clientMap.get(key),
        programMap.get(key),
        ex.rir,
        templateMap.get(key),
      );
      if (merged !== undefined) {
        ex.rir = merged;
      }
    }
  }
}
