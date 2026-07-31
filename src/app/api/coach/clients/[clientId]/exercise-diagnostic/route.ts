import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  validateApiAuth,
  createForbiddenResponse,
  createUnauthorizedResponse,
} from "@/lib/apiAuth";
import { createErrorResponse, handleApiError } from "@/lib/apiErrorHandler";
import {
  fetchCoachExerciseDiagnostic,
  listCoachDiagnosticExercises,
  type DiagnosticTimeRange,
} from "@/lib/coachExerciseDiagnostic";

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

const RANGES = new Set<DiagnosticTimeRange>(["3M", "6M", "1Y", "ALL"]);

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

    const url = req.nextUrl;
    const listOnly = url.searchParams.get("list") === "1";
    const exerciseId = url.searchParams.get("exerciseId");
    const rangeRaw = (url.searchParams.get("range") ?? "1Y").toUpperCase();
    const timeRange = (
      RANGES.has(rangeRaw as DiagnosticTimeRange) ? rangeRaw : "1Y"
    ) as DiagnosticTimeRange;
    const timeZone = url.searchParams.get("tz");

    if (listOnly || !exerciseId) {
      const exercises = await listCoachDiagnosticExercises(supabaseAdmin, clientId);
      return NextResponse.json({ exercises });
    }

    const diagnostic = await fetchCoachExerciseDiagnostic(supabaseAdmin, {
      clientId,
      exerciseId,
      timeRange,
      timeZone,
    });

    if (!diagnostic) {
      return NextResponse.json({
        exerciseId,
        exerciseName: "Unknown",
        strengthEligible: false,
        strengthOmitReason: null,
        timeRange,
        weeksWithData: 0,
        enoughData: false,
        weeks: [],
        prMarkers: [],
      });
    }

    return NextResponse.json(diagnostic);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === "User not authenticated") {
      return createUnauthorizedResponse(msg);
    }
    if (msg.includes("Forbidden")) {
      return createForbiddenResponse(msg);
    }
    return handleApiError(error, "Failed to load exercise diagnostic");
  }
}
