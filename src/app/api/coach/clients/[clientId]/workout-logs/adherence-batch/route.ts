/**
 * GET /api/coach/clients/[clientId]/workout-logs/adherence-batch?logIds=id1,id2,...
 * Batch adherence % for Training tab "Recent sessions" (bounded queries).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  validateApiAuth,
  createUnauthorizedResponse,
  createForbiddenResponse,
} from "@/lib/apiAuth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { batchAdherenceForWorkoutLogs } from "@/lib/coachClientSummaryServer";

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

const MAX_IDS = 24;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { user, supabaseAdmin } = await validateApiAuth(req);
    const coachId = user.id;
    const { clientId } = await params;
    if (!clientId) {
      return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
    }

    await assertCoachHasClient(coachId, clientId, supabaseAdmin);

    const raw = req.nextUrl.searchParams.get("logIds") ?? "";
    const logIds = [
      ...new Set(
        raw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      ),
    ].slice(0, MAX_IDS);

    if (logIds.length === 0) {
      return NextResponse.json({ byLogId: {} });
    }

    const byLogId = await batchAdherenceForWorkoutLogs(
      supabaseAdmin,
      clientId,
      logIds
    );

    return NextResponse.json({ byLogId });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "User not authenticated") {
      return createUnauthorizedResponse(error.message);
    }
    if (error instanceof Error && error.message?.includes("Forbidden")) {
      return createForbiddenResponse(error.message);
    }
    return handleApiError(error, "Failed to load adherence batch");
  }
}
