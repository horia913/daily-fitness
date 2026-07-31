import { NextRequest, NextResponse } from "next/server";
import {
  validateApiAuth,
  createUnauthorizedResponse,
  createForbiddenResponse,
} from "@/lib/apiAuth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { buildTrainingHubStats } from "@/lib/coachTrainingHubStats";

/** GET /api/coach/training/hub-stats — one batched payload for training hub tiles. */
export async function GET(request: NextRequest) {
  try {
    const { user, supabaseAdmin } = await validateApiAuth(request);
    const stats = await buildTrainingHubStats(supabaseAdmin, user.id);
    return NextResponse.json(stats);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "User not authenticated") {
      return createUnauthorizedResponse(error.message);
    }
    if (error instanceof Error && error.message?.includes("Forbidden")) {
      return createForbiddenResponse(error.message);
    }
    return handleApiError(error, "Failed to load training hub stats");
  }
}
