import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { validateApiAuth, createUnauthorizedResponse, createForbiddenResponse } from "@/lib/apiAuth";
import { createErrorResponse, handleApiError } from "@/lib/apiErrorHandler";
import { fetchCoachAthleteScoreBundle } from "@/lib/coachAthleteScoreData";

async function assertCoachHasClient(
  coachId: string,
  clientId: string,
  supabaseAdmin: SupabaseClient,
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
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  try {
    const { user, supabaseAdmin } = await validateApiAuth(req);
    const { clientId } = await params;
    if (!clientId) {
      return createErrorResponse("Missing clientId", undefined, "VALIDATION_ERROR", 400);
    }
    await assertCoachHasClient(user.id, clientId, supabaseAdmin);
    const bundle = await fetchCoachAthleteScoreBundle(supabaseAdmin, clientId);
    return NextResponse.json(bundle);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === "User not authenticated") {
      return createUnauthorizedResponse(msg);
    }
    if (msg.includes("Forbidden")) {
      return createForbiddenResponse(msg);
    }
    return handleApiError(error, "Failed to load athlete score");
  }
}
