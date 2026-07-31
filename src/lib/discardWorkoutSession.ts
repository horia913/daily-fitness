/**
 * Discard an unfinished workout session — "erase it as if it never happened".
 *
 * Two-part operation (the whole correctness story):
 *   Part 1 — Delete (atomic, in one Postgres transaction via the
 *     `discard_workout_session` RPC): PR rows by id → workout_logs (cascade) →
 *     workout_sessions (conditional). The RPC re-validates ownership and that
 *     the log is unfinished. It MUST be called with the authenticated client so
 *     auth.uid() resolves (service role makes it NULL).
 *   Part 2 — Recompute (idempotent, best-effort): re-run every derived value
 *     for the client from the SURVIVING workout_set_logs. A failure here leaves
 *     data stale, never corrupt, and is safely re-runnable — so we do not roll
 *     back the (already-committed) delete; we surface warnings instead.
 *
 * Reused by both future triggers (in-workout discard button + unfinished-session
 * gate) through the POST /api/workouts/discard endpoint. One action, two callers.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { recomputeUserExerciseMetrics } from "@/lib/recomputeUserExerciseMetrics";
import { updateLeaderboardForClient } from "@/lib/leaderboardPopulationService";
import { calculateAthleteScore } from "@/lib/athleteScoreService";
import { syncGoalsForClient } from "@/lib/goalSyncService";

const PR_RECORD_TYPES = ["max_strength", "strength_endurance"] as const;

export interface DiscardWorkoutSessionResult {
  success: boolean;
  /** Present on success. */
  affectedExerciseIds?: string[];
  /** Non-fatal recompute failures; the delete already succeeded. */
  recomputeWarnings: string[];
  /** Present on failure (RPC/ownership/validation error). */
  error?: string;
  /** Machine-readable failure reason for endpoint status mapping. */
  errorCode?: "not_found" | "forbidden" | "already_completed" | "unauthenticated" | "rpc_error";
}

/**
 * Re-resolve the current PR per (exercise, record_type) after the session's PR
 * rows were deleted. Because a new PR only flips the prior row to
 * is_current_record=false (never deletes it), promoting the surviving best row
 * restores the previous PR exactly. No-op for any (exercise, type) that still
 * has a current record (its PR was not part of the discarded session).
 *
 * Batched: 2 selects + at most 1 update (no per-exercise N+1).
 */
async function reResolveCurrentPRs(
  clientId: string,
  exerciseIds: string[],
  supabaseAdmin: SupabaseClient,
): Promise<void> {
  if (exerciseIds.length === 0) return;

  // Which (exercise, type) still have a current record → leave them alone.
  const { data: currentRows, error: curErr } = await supabaseAdmin
    .from("personal_records")
    .select("exercise_id, record_type")
    .eq("client_id", clientId)
    .eq("is_current_record", true)
    .in("exercise_id", exerciseIds);
  if (curErr) throw new Error(`PR current-scan failed: ${curErr.message}`);

  const hasCurrent = new Set(
    (currentRows ?? []).map((r) => `${r.exercise_id}|${r.record_type}`),
  );

  // All surviving rows for the affected exercises (to pick the new best).
  const { data: survivorRows, error: survErr } = await supabaseAdmin
    .from("personal_records")
    .select("id, exercise_id, record_type, record_value, achieved_date")
    .eq("client_id", clientId)
    .in("exercise_id", exerciseIds);
  if (survErr) throw new Error(`PR survivor-scan failed: ${survErr.message}`);

  // Per (exercise, type) missing a current record, choose the best survivor:
  // highest record_value, tie-break on most recent achieved_date.
  const bestByKey = new Map<
    string,
    { id: string; record_value: number; achieved_date: string }
  >();
  for (const row of survivorRows ?? []) {
    const key = `${row.exercise_id}|${row.record_type}`;
    if (hasCurrent.has(key)) continue;
    const value = Number(row.record_value);
    const existing = bestByKey.get(key);
    if (
      !existing ||
      value > existing.record_value ||
      (value === existing.record_value &&
        String(row.achieved_date) > existing.achieved_date)
    ) {
      bestByKey.set(key, {
        id: row.id as string,
        record_value: value,
        achieved_date: String(row.achieved_date),
      });
    }
  }

  const idsToPromote = [...bestByKey.values()].map((b) => b.id);
  if (idsToPromote.length === 0) return;

  const { error: updErr } = await supabaseAdmin
    .from("personal_records")
    .update({ is_current_record: true, updated_at: new Date().toISOString() })
    .in("id", idsToPromote);
  if (updErr) throw new Error(`PR promote failed: ${updErr.message}`);
}

function mapRpcError(message: string): DiscardWorkoutSessionResult["errorCode"] {
  const m = message.toLowerCase();
  if (m.includes("not authenticated")) return "unauthenticated";
  if (m.includes("forbidden")) return "forbidden";
  if (m.includes("not found")) return "not_found";
  if (m.includes("already completed")) return "already_completed";
  return "rpc_error";
}

/**
 * @param workoutLogId  The unfinished workout_logs.id to erase.
 * @param clientId      The owning client (auth user id from the endpoint).
 * @param clients       authenticated client (RPC, for auth.uid()) + admin
 *                      client (recompute helpers).
 */
export async function discardWorkoutSession(
  workoutLogId: string,
  clientId: string,
  clients: { supabaseAuth: SupabaseClient; supabaseAdmin: SupabaseClient },
): Promise<DiscardWorkoutSessionResult> {
  const { supabaseAuth, supabaseAdmin } = clients;
  const recomputeWarnings: string[] = [];

  // ---- Part 1: atomic delete (RPC, authenticated client for auth.uid()) ----
  const { data: affected, error: rpcError } = await supabaseAuth.rpc(
    "discard_workout_session",
    { p_workout_log_id: workoutLogId },
  );

  if (rpcError) {
    return {
      success: false,
      recomputeWarnings,
      error: rpcError.message,
      errorCode: mapRpcError(rpcError.message),
    };
  }

  const affectedExerciseIds: string[] = Array.isArray(affected)
    ? (affected as string[]).filter((id) => typeof id === "string" && id.length > 0)
    : [];

  // ---- Part 2: recompute (idempotent; each step isolated, never rolls back) ----
  try {
    await recomputeUserExerciseMetrics(clientId, affectedExerciseIds, supabaseAdmin);
  } catch (e) {
    recomputeWarnings.push(`metrics: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    await reResolveCurrentPRs(clientId, affectedExerciseIds, supabaseAdmin);
  } catch (e) {
    recomputeWarnings.push(`pr_reresolve: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    await updateLeaderboardForClient(clientId, undefined, supabaseAdmin);
  } catch (e) {
    recomputeWarnings.push(`leaderboard: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    // Self-skips when the client has no active program (no athlete_scores row).
    await calculateAthleteScore(clientId, supabaseAdmin);
  } catch (e) {
    recomputeWarnings.push(`athlete_score: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    await syncGoalsForClient(clientId);
  } catch (e) {
    recomputeWarnings.push(`goals: ${e instanceof Error ? e.message : String(e)}`);
  }

  return { success: true, affectedExerciseIds, recomputeWarnings };
}
