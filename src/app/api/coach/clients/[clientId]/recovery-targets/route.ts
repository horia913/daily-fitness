import { NextRequest, NextResponse } from "next/server";
import { validateApiAuth, createUnauthorizedResponse, createForbiddenResponse } from "@/lib/apiAuth";
import { createErrorResponse, handleApiError } from "@/lib/apiErrorHandler";

async function assertCoachHasClient(
  coachId: string,
  clientId: string,
  supabaseAdmin: any,
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

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("sleep_target_hours, steps_target")
      .eq("id", clientId)
      .maybeSingle();
    if (error) throw error;

    return NextResponse.json({
      sleep_target_hours:
        data?.sleep_target_hours != null ? Number(data.sleep_target_hours) : null,
      steps_target: data?.steps_target != null ? Number(data.steps_target) : null,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === "User not authenticated") return createUnauthorizedResponse(msg);
    if (msg.includes("Forbidden")) return createForbiddenResponse(msg);
    return handleApiError(error, "Failed to load recovery targets");
  }
}

export async function PUT(
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

    let body: { sleep_target_hours?: number; steps_target?: number } = {};
    try {
      body = await req.json();
    } catch {
      return createErrorResponse("Invalid JSON body", undefined, "VALIDATION_ERROR", 400);
    }

    const sleep = Number(body.sleep_target_hours);
    const steps = Number(body.steps_target);
    if (!Number.isFinite(sleep) || sleep < 4 || sleep > 12) {
      return createErrorResponse(
        "sleep_target_hours must be between 4 and 12",
        undefined,
        "VALIDATION_ERROR",
        400,
      );
    }
    if (!Number.isFinite(steps) || steps < 1000 || steps > 30000) {
      return createErrorResponse(
        "steps_target must be between 1000 and 30000",
        undefined,
        "VALIDATION_ERROR",
        400,
      );
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        sleep_target_hours: sleep,
        steps_target: Math.round(steps),
        updated_at: new Date().toISOString(),
      })
      .eq("id", clientId);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === "User not authenticated") return createUnauthorizedResponse(msg);
    if (msg.includes("Forbidden")) return createForbiddenResponse(msg);
    return handleApiError(error, "Failed to save recovery targets");
  }
}
