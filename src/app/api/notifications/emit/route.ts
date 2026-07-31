/**
 * POST /api/notifications/emit
 *
 * Browser entry for in-app notifications. Creates via service-role, but
 * authorization + copy are enforced here:
 * - Requires authenticated session
 * - Recipient is derived server-side (never from a free-form recipient_id)
 * - Title/body come from typed helpers + DB context (caller supplies event + ids)
 * - Event whitelist only; ownership / challenge-creator checks per event
 */

import { NextRequest, NextResponse } from "next/server";
import {
  validateApiAuth,
  createUnauthorizedResponse,
} from "@/lib/apiAuth";
import {
  notifyClientProgramAssigned,
  notifyClientWorkoutAssigned,
  notifyClientTestRecorded,
  notifyClientMeasurementRecorded,
  notifyClientChallengeInvite,
  notifyCoachCheckinLogged,
  notifyCoachPeriodicalCheckin,
  notifyCoachChallengeActivity,
} from "@/lib/inAppNotificationEvents";
import type { SupabaseClient } from "@supabase/supabase-js";

type EmitBody = {
  event?: string;
  clientId?: string;
  clientIds?: string[];
  assignmentId?: string;
  testKind?: "mobility" | "performance" | "strength";
  testId?: string;
  measurementId?: string;
  challengeId?: string;
  logDate?: string;
  periodKey?: string;
  activity?: "joined" | "completed";
};

const ALLOWED_EVENTS = new Set([
  "client_program_assigned",
  "client_workout_assigned",
  "client_test_recorded",
  "client_measurement_recorded",
  "client_challenge_invite",
  "coach_checkin_logged",
  "coach_periodical_checkin",
  "coach_challenge_activity",
]);

/** Simple per-process rate limit (best-effort on serverless). */
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 30;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function rateLimitOk(userId: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(userId);
  if (!bucket || now >= bucket.resetAt) {
    rateBuckets.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_MAX) return false;
  bucket.count += 1;
  return true;
}

async function assertCoachOwnsClient(
  admin: SupabaseClient,
  coachId: string,
  clientId: string
): Promise<boolean> {
  const { data } = await admin
    .from("clients")
    .select("client_id")
    .eq("client_id", clientId)
    .eq("coach_id", coachId)
    .eq("status", "active")
    .maybeSingle();
  return !!data;
}

async function assertCoachOwnsClients(
  admin: SupabaseClient,
  coachId: string,
  clientIds: string[]
): Promise<boolean> {
  if (clientIds.length === 0) return false;
  const { data } = await admin
    .from("clients")
    .select("client_id")
    .eq("coach_id", coachId)
    .eq("status", "active")
    .in("client_id", clientIds);
  const owned = new Set((data ?? []).map((r) => r.client_id as string));
  return clientIds.every((id) => owned.has(id));
}

export async function POST(request: NextRequest) {
  try {
    const { user, supabaseAdmin } = await validateApiAuth(request);

    if (!rateLimitOk(user.id)) {
      return NextResponse.json({ ok: false, error: "Rate limited" }, { status: 429 });
    }

    const body = (await request.json()) as EmitBody;
    const event = body.event;

    if (!event || !ALLOWED_EVENTS.has(event)) {
      return NextResponse.json({ ok: false, error: "Unknown event" }, { status: 400 });
    }

    switch (event) {
      case "client_program_assigned": {
        if (!body.clientId || !body.assignmentId) {
          return NextResponse.json({ ok: false }, { status: 400 });
        }
        if (!(await assertCoachOwnsClient(supabaseAdmin, user.id, body.clientId))) {
          return NextResponse.json({ ok: false }, { status: 403 });
        }
        const { data: assignment } = await supabaseAdmin
          .from("program_assignments")
          .select("id, client_id, coach_id, program_id")
          .eq("id", body.assignmentId)
          .maybeSingle();
        if (
          !assignment ||
          assignment.client_id !== body.clientId ||
          assignment.coach_id !== user.id
        ) {
          return NextResponse.json({ ok: false }, { status: 403 });
        }
        let programName = "Program";
        if (assignment.program_id) {
          const { data: program } = await supabaseAdmin
            .from("workout_programs")
            .select("name")
            .eq("id", assignment.program_id)
            .maybeSingle();
          if (program?.name) programName = program.name as string;
        }
        notifyClientProgramAssigned({
          clientId: body.clientId,
          actorId: user.id,
          programName,
          assignmentId: assignment.id as string,
          admin: supabaseAdmin,
        });
        break;
      }

      case "client_workout_assigned": {
        if (!body.clientId || !body.assignmentId) {
          return NextResponse.json({ ok: false }, { status: 400 });
        }
        if (!(await assertCoachOwnsClient(supabaseAdmin, user.id, body.clientId))) {
          return NextResponse.json({ ok: false }, { status: 403 });
        }
        const { data: assignment } = await supabaseAdmin
          .from("workout_assignments")
          .select("id, client_id, coach_id, name")
          .eq("id", body.assignmentId)
          .maybeSingle();
        if (
          !assignment ||
          assignment.client_id !== body.clientId ||
          assignment.coach_id !== user.id
        ) {
          return NextResponse.json({ ok: false }, { status: 403 });
        }
        notifyClientWorkoutAssigned({
          clientId: body.clientId,
          actorId: user.id,
          workoutName: (assignment.name as string) || "Workout",
          assignmentId: assignment.id as string,
          admin: supabaseAdmin,
        });
        break;
      }

      case "client_test_recorded": {
        if (!body.clientId || !body.testId || !body.testKind) {
          return NextResponse.json({ ok: false }, { status: 400 });
        }
        if (!(await assertCoachOwnsClient(supabaseAdmin, user.id, body.clientId))) {
          return NextResponse.json({ ok: false }, { status: 403 });
        }
        if (body.testKind === "mobility") {
          const { data: row } = await supabaseAdmin
            .from("mobility_assessments")
            .select("id, client_id, assessed_by")
            .eq("id", body.testId)
            .maybeSingle();
          if (
            !row ||
            row.client_id !== body.clientId ||
            row.assessed_by !== user.id
          ) {
            return NextResponse.json({ ok: false }, { status: 403 });
          }
        } else if (body.testKind === "performance") {
          const { data: row } = await supabaseAdmin
            .from("performance_test_results")
            .select("id, client_id, tested_by")
            .eq("id", body.testId)
            .maybeSingle();
          if (
            !row ||
            row.client_id !== body.clientId ||
            row.tested_by !== user.id
          ) {
            return NextResponse.json({ ok: false }, { status: 403 });
          }
        } else if (body.testKind === "strength") {
          // Strength tests go through the API route (server-side notify); emit only
          // if the log belongs to this coach's client.
          const { data: row } = await supabaseAdmin
            .from("workout_logs")
            .select("id, client_id")
            .eq("id", body.testId)
            .maybeSingle();
          if (!row || row.client_id !== body.clientId) {
            return NextResponse.json({ ok: false }, { status: 403 });
          }
        } else {
          return NextResponse.json({ ok: false }, { status: 400 });
        }
        notifyClientTestRecorded({
          clientId: body.clientId,
          actorId: user.id,
          testKind: body.testKind,
          testId: body.testId,
          admin: supabaseAdmin,
        });
        break;
      }

      case "client_measurement_recorded": {
        if (!body.clientId || !body.measurementId) {
          return NextResponse.json({ ok: false }, { status: 400 });
        }
        if (!(await assertCoachOwnsClient(supabaseAdmin, user.id, body.clientId))) {
          return NextResponse.json({ ok: false }, { status: 403 });
        }
        const { data: row } = await supabaseAdmin
          .from("body_metrics")
          .select("id, client_id, coach_id")
          .eq("id", body.measurementId)
          .maybeSingle();
        if (
          !row ||
          row.client_id !== body.clientId ||
          row.coach_id !== user.id
        ) {
          return NextResponse.json({ ok: false }, { status: 403 });
        }
        notifyClientMeasurementRecorded({
          clientId: body.clientId,
          actorId: user.id,
          measurementId: body.measurementId,
          admin: supabaseAdmin,
        });
        break;
      }

      case "client_challenge_invite": {
        if (!body.challengeId) {
          return NextResponse.json({ ok: false }, { status: 400 });
        }
        const ids = body.clientIds?.length
          ? [...new Set(body.clientIds)]
          : body.clientId
            ? [body.clientId]
            : [];
        if (!ids.length) {
          return NextResponse.json({ ok: false }, { status: 400 });
        }
        const { data: challenge } = await supabaseAdmin
          .from("challenges")
          .select("id, created_by, name")
          .eq("id", body.challengeId)
          .maybeSingle();
        if (!challenge || challenge.created_by !== user.id) {
          return NextResponse.json({ ok: false }, { status: 403 });
        }
        if (!(await assertCoachOwnsClients(supabaseAdmin, user.id, ids))) {
          return NextResponse.json({ ok: false }, { status: 403 });
        }
        const challengeName = (challenge.name as string) || "Challenge";
        for (const clientId of ids) {
          notifyClientChallengeInvite({
            clientId,
            actorId: user.id,
            challengeId: body.challengeId,
            challengeName,
            admin: supabaseAdmin,
          });
        }
        break;
      }

      case "coach_checkin_logged": {
        // Recipient = caller's coach; logDate validated as YYYY-MM-DD for this client.
        if (!body.logDate || !/^\d{4}-\d{2}-\d{2}$/.test(body.logDate)) {
          return NextResponse.json({ ok: false }, { status: 400 });
        }
        const { data: log } = await supabaseAdmin
          .from("daily_wellness_logs")
          .select("id, client_id, log_date")
          .eq("client_id", user.id)
          .eq("log_date", body.logDate)
          .maybeSingle();
        if (!log) {
          return NextResponse.json({ ok: false }, { status: 403 });
        }
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("first_name")
          .eq("id", user.id)
          .maybeSingle();
        await notifyCoachCheckinLogged({
          clientId: user.id,
          logDate: body.logDate,
          clientName: (profile as { first_name?: string | null } | null)?.first_name ?? undefined,
          admin: supabaseAdmin,
        });
        break;
      }

      case "coach_periodical_checkin": {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("first_name")
          .eq("id", user.id)
          .maybeSingle();
        await notifyCoachPeriodicalCheckin({
          clientId: user.id,
          periodKey: body.periodKey ?? null,
          clientName: (profile as { first_name?: string | null } | null)?.first_name ?? undefined,
          admin: supabaseAdmin,
        });
        break;
      }

      case "coach_challenge_activity": {
        // Only "joined" from the browser path; recipient = challenge.created_by.
        if (!body.challengeId || body.activity !== "joined") {
          return NextResponse.json({ ok: false }, { status: 400 });
        }
        const { data: challenge } = await supabaseAdmin
          .from("challenges")
          .select("id, created_by, name")
          .eq("id", body.challengeId)
          .maybeSingle();
        if (!challenge?.created_by) {
          return NextResponse.json({ ok: true });
        }
        const { data: participant } = await supabaseAdmin
          .from("challenge_participants")
          .select("id")
          .eq("challenge_id", body.challengeId)
          .eq("client_id", user.id)
          .maybeSingle();
        if (!participant) {
          return NextResponse.json({ ok: false }, { status: 403 });
        }
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("first_name")
          .eq("id", user.id)
          .maybeSingle();
        notifyCoachChallengeActivity({
          coachId: challenge.created_by as string,
          clientId: user.id,
          challengeId: body.challengeId,
          challengeName: (challenge.name as string) || "Challenge",
          activity: "joined",
          clientName: (profile as { first_name?: string | null } | null)?.first_name ?? undefined,
          admin: supabaseAdmin,
        });
        break;
      }

      default:
        return NextResponse.json({ ok: false, error: "Unknown event" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    if (msg === "User not authenticated") return createUnauthorizedResponse();
    console.error("[notifications/emit]", error);
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}
