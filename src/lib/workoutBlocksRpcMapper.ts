/**
 * Maps get_workout_blocks RPC response to WorkoutSetEntry[] shape expected by
 * WorkoutBlockService.getWorkoutBlocks() / the workout start page.
 *
 * Satellite arrays on the RPC payload are ignored — legacy shape is synthesized
 * from Group-model columns on workout_set_entries / workout_set_entry_exercises.
 */

import type { WorkoutSetEntry } from "@/types/workoutSetEntries";
import { adaptRpcBlockToLegacy } from "@/lib/groupModel/adaptBlockRow";

/**
 * Map get_workout_blocks RPC result (jsonb array) to WorkoutSetEntry[] so the
 * workout start page and other consumers see the same shape as getWorkoutBlocks().
 */
export function mapWorkoutBlocksRpcToSetEntries(rpcBlocks: unknown): WorkoutSetEntry[] {
  const blocks = Array.isArray(rpcBlocks) ? rpcBlocks : [];
  if (blocks.length === 0) return [];

  return (blocks as Record<string, unknown>[])
    .map((b) => adaptRpcBlockToLegacy(b))
    .sort((a, b) => (a.set_order ?? 0) - (b.set_order ?? 0));
}
