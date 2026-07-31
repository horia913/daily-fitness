/**
 * POST /api/workouts/discard
 *
 * Erases an unfinished workout session as if it never happened: atomic delete
 * (PR rows + workout_logs cascade + orphaned workout_sessions) followed by an
 * idempotent recompute of the client's derived values.
 *
 * Body: { workoutLogId: string }
 *
 * Ownership: the client_id is ALWAYS the authenticated user (never trusted from
 * the body). The underlying RPC re-validates auth.uid() = client_id and that the
 * log is unfinished, as defense-in-depth.
 *
 * Not wired to any UI trigger yet — callable directly for isolated testing.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateApiAuth } from "@/lib/apiAuth";
import { discardWorkoutSession } from "@/lib/discardWorkoutSession";

export async function POST(request: NextRequest) {
  try {
    const { user, supabaseAuth, supabaseAdmin } = await validateApiAuth(request);

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const workoutLogId = body.workoutLogId;
    if (typeof workoutLogId !== "string" || workoutLogId.trim() === "") {
      return NextResponse.json(
        { success: false, error: "workoutLogId is required" },
        { status: 400 },
      );
    }

    const result = await discardWorkoutSession(workoutLogId, user.id, {
      supabaseAuth,
      supabaseAdmin,
    });

    if (!result.success) {
      const status =
        result.errorCode === "forbidden"
          ? 403
          : result.errorCode === "not_found"
            ? 404
            : result.errorCode === "already_completed"
              ? 409
              : result.errorCode === "unauthenticated"
                ? 401
                : 500;
      return NextResponse.json(
        { success: false, error: result.error ?? "Failed to discard session" },
        { status },
      );
    }

    return NextResponse.json({
      success: true,
      affectedExerciseIds: result.affectedExerciseIds ?? [],
      recomputeWarnings: result.recomputeWarnings,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "User not authenticated") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    console.error("[workouts/discard] unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
