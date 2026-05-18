/**
 * GET /api/client/athlete-score
 *
 * Returns the latest athlete score for the authenticated client.
 * If no recent score exists (within last hour), recalculates it.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateApiAuth } from "@/lib/apiAuth";
import {
  calculateAthleteScore,
  getLatestAthleteScore,
  getAthleteScoreHistory,
} from "@/lib/athleteScoreService";

export async function GET(request: NextRequest) {
  try {
    const { user, supabaseAdmin } = await validateApiAuth(request);

    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const latestScore = await getLatestAthleteScore(user.id, supabaseAdmin);
    const scoreHistory = await getAthleteScoreHistory(user.id, supabaseAdmin, 4);

    if (latestScore && new Date(latestScore.calculated_at) >= oneHourAgo) {
      return NextResponse.json({ score: latestScore, scoreHistory });
    }

    const computed = await calculateAthleteScore(user.id, supabaseAdmin);
    const updatedScoreHistory = await getAthleteScoreHistory(user.id, supabaseAdmin, 4);

    if ("skipped" in computed && computed.skipped) {
      return NextResponse.json({
        score: latestScore,
        scoreHistory: updatedScoreHistory,
        computeSkipped: { reason: computed.reason },
      });
    }

    return NextResponse.json({ score: computed, scoreHistory: updatedScoreHistory });
  } catch (error: unknown) {
    console.error("[athlete-score API] Error:", error);

    if (error instanceof Error && error.message === "User not authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const message = error instanceof Error ? error.message : "Failed to fetch athlete score";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
