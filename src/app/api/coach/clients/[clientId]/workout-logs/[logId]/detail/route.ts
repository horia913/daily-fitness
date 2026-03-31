/**
 * GET /api/coach/clients/[clientId]/workout-logs/[logId]/detail
 * Prescribed vs actual adherence + vs-previous deltas for coach workout log detail.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  validateApiAuth,
  createUnauthorizedResponse,
  createForbiddenResponse,
} from "@/lib/apiAuth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { getCoachWorkoutLogDetail } from "@/lib/coachClientSummaryServer";

async function assertCoachHasClient(
  coachId: string,
  clientId: string,
  supabaseAdmin: any
): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("clients")
    .select("id")
    .eq("coach_id", coachId)
    .eq("client_id", clientId)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("Failed to verify client access");
  if (!data) throw new Error("Forbidden - Client not found or access denied");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string; logId: string }> }
) {
  try {
    const { user, supabaseAdmin } = await validateApiAuth(_req);
    const coachId = user.id;
    const { clientId, logId } = await params;
    if (!clientId || !logId) {
      return NextResponse.json(
        { error: "Missing clientId or logId" },
        { status: 400 }
      );
    }

    await assertCoachHasClient(coachId, clientId, supabaseAdmin);

    const payload = await getCoachWorkoutLogDetail(
      supabaseAdmin,
      clientId,
      logId
    );
    if (!payload) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(payload);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "User not authenticated") {
      return createUnauthorizedResponse(error.message);
    }
    if (error instanceof Error && error.message?.includes("Forbidden")) {
      return createForbiddenResponse(error.message);
    }
    return handleApiError(error, "Failed to load workout log detail");
  }
}
