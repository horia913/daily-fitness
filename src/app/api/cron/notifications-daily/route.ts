import { NextRequest, NextResponse } from "next/server";
import { runScheduledNotificationJob } from "@/lib/scheduledNotificationJob";
import { runScheduledAthleteScoreJob } from "@/lib/scheduledAthleteScoreJob";

/**
 * GET /api/cron/notifications-daily
 *
 * Generates due / missed / inactive in-app notifications
 * and computes daily athlete scores for active roster clients.
 * Schedule: once daily at 06:00 UTC (see vercel.json).
 * Auth: Authorization: Bearer ${CRON_SECRET}
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error(
      "[cron][notifications-daily] CRON_SECRET not configured. Refusing to run."
    );
    return NextResponse.json({ error: "Cron not configured" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const failClientId = req.nextUrl.searchParams.get("failClientId");
    const [notificationResult, athleteScoreResult] = await Promise.all([
      runScheduledNotificationJob(),
      runScheduledAthleteScoreJob(undefined, { failClientId }),
    ]);
    console.log("[cron][notifications-daily] done", {
      notificationResult,
      athleteScoreResult,
    });
    return NextResponse.json({
      success: true,
      notificationResult,
      athleteScoreResult,
    });
  } catch (error) {
    console.error("[cron][notifications-daily]", error);
    return NextResponse.json(
      {
        error: "Failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
