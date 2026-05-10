/**
 * GET /api/client/workout-logs/[logId]/prescribed-reference
 * Prescribed-vs-actual reference map for the workout log viewer (same shape as coach detail).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  validateApiAuth,
  createUnauthorizedResponse,
  createForbiddenResponse,
} from "@/lib/apiAuth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { loadPrescriptionProtocolBundle } from "@/lib/coachClientSummaryServer";
import { buildPrescribedWorkoutReference } from "@/lib/workoutLog/prescribedWorkoutReference";
import { groupSetsIntoBlocks } from "@/lib/workoutLog/groupSetsIntoBlocks";
import type { WorkoutLogSet } from "@/types/workoutLog";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ logId: string }> }
) {
  try {
    const { user, supabaseAdmin } = await validateApiAuth(_req);
    const { logId } = await params;
    if (!logId) {
      return NextResponse.json({ error: "Missing logId" }, { status: 400 });
    }

    const { data: logRow, error: logErr } = await supabaseAdmin
      .from("workout_logs")
      .select("id, client_id, workout_assignment_id")
      .eq("id", logId)
      .maybeSingle();

    if (logErr || !logRow) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (logRow.client_id !== user.id) {
      return createForbiddenResponse("You can only view your own workout logs.");
    }

    const assignmentId = logRow.workout_assignment_id as string | null;
    if (!assignmentId) {
      return NextResponse.json({ prescribedReference: null });
    }

    const { data: wa } = await supabaseAdmin
      .from("workout_assignments")
      .select("workout_template_id")
      .eq("id", assignmentId)
      .maybeSingle();

    const templateId = wa?.workout_template_id as string | undefined;
    if (!templateId) {
      return NextResponse.json({ prescribedReference: null });
    }

    const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc("get_workout_log_full", {
      p_log_id: logId,
      p_viewer_id: user.id,
    });

    if (rpcErr || !rpcData) {
      return NextResponse.json({ prescribedReference: null });
    }

    const candidate = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    if (!candidate || typeof candidate !== "object") {
      return NextResponse.json({ prescribedReference: null });
    }

    const obj = candidate as Record<string, unknown>;
    const rawSetLogs = obj.setLogs;
    const setLogsArray: WorkoutLogSet[] = Array.isArray(rawSetLogs)
      ? (rawSetLogs as WorkoutLogSet[])
      : rawSetLogs && typeof rawSetLogs === "object"
        ? (Object.values(rawSetLogs as Record<string, unknown>) as WorkoutLogSet[])
        : [];
    const blocks = groupSetsIntoBlocks(setLogsArray);

    const bundle = await loadPrescriptionProtocolBundle(supabaseAdmin, templateId);
    if (!bundle) {
      return NextResponse.json({ prescribedReference: null });
    }

    const prescribedReference = buildPrescribedWorkoutReference(blocks, bundle);
    return NextResponse.json({ prescribedReference });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "User not authenticated") {
      return createUnauthorizedResponse(error.message);
    }
    return handleApiError(error, "Failed to load prescribed reference");
  }
}
