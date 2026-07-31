import { NextRequest, NextResponse } from "next/server";
import {
  validateApiAuth,
  createUnauthorizedResponse,
  createForbiddenResponse,
} from "@/lib/apiAuth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { buildCoachInsightsBundle } from "@/lib/coachInsightsBundle";

/** GET /api/coach/home/triage — Briefing queues (classifier levels) + today strip. */
export async function GET(request: NextRequest) {
  try {
    const { user, supabaseAdmin } = await validateApiAuth(request);
    const bundle = await buildCoachInsightsBundle(supabaseAdmin, user.id, {
      mode: "triage",
    });
    return NextResponse.json({
      briefing: bundle.briefing,
      triage: bundle.triage,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "User not authenticated") {
      return createUnauthorizedResponse(error.message);
    }
    if (error instanceof Error && error.message?.includes("Forbidden")) {
      return createForbiddenResponse(error.message);
    }
    return handleApiError(error, "Failed to load briefing triage");
  }
}
