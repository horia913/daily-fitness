import { NextRequest, NextResponse } from "next/server";
import {
  validateApiAuth,
  createUnauthorizedResponse,
  createForbiddenResponse,
} from "@/lib/apiAuth";
import { handleApiError } from "@/lib/apiErrorHandler";
import {
  buildCoachInsightsBundle,
  type InsightsPeriod,
} from "@/lib/coachInsightsBundle";

function parsePeriod(raw: string | null): InsightsPeriod {
  if (raw === "4wk" || raw === "12wk" || raw === "6mo") return raw;
  return "12wk";
}

/** GET /api/coach/insights/roster?period=4wk|12wk|6mo */
export async function GET(request: NextRequest) {
  try {
    const { user, supabaseAdmin } = await validateApiAuth(request);
    const period = parsePeriod(request.nextUrl.searchParams.get("period"));
    const bundle = await buildCoachInsightsBundle(supabaseAdmin, user.id, {
      period,
      mode: "insights",
    });
    return NextResponse.json(bundle);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "User not authenticated") {
      return createUnauthorizedResponse(error.message);
    }
    if (error instanceof Error && error.message?.includes("Forbidden")) {
      return createForbiddenResponse(error.message);
    }
    return handleApiError(error, "Failed to load insights roster");
  }
}
