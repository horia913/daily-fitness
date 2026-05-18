/**
 * PATCH — pause active program for coach's client (resolves assignment server-side).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  validateApiAuth,
  createUnauthorizedResponse,
  createForbiddenResponse,
} from "@/lib/apiAuth";
import { coachPauseProgramAssignment } from "@/lib/programAssignmentCoachPause";

type RouteCtx = { params: Promise<{ clientId: string }> };

export async function PATCH(request: NextRequest, ctx: RouteCtx) {
  try {
    const { user, supabaseAdmin } = await validateApiAuth(request);
    const { clientId } = await ctx.params;
    if (!clientId) {
      return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
    }

    let forcePause = false;
    let reason: string | null = null;
    try {
      const body = await request.json();
      if (body && typeof body === "object") {
        if (body.force === true) forcePause = true;
        if (typeof body.reason === "string") reason = body.reason.trim() || null;
      }
    } catch {
      /* no body */
    }

    const { data: link } = await supabaseAdmin
      .from("clients")
      .select("client_id")
      .eq("coach_id", user.id)
      .eq("client_id", clientId)
      .eq("status", "active")
      .maybeSingle();

    const fb = link
      ? link
      : (
          await supabaseAdmin
            .from("clients")
            .select("client_id")
            .eq("coach_id", user.id)
            .eq("client_id", clientId)
            .limit(1)
            .maybeSingle()
        ).data;

    if (!fb?.client_id) {
      return createForbiddenResponse("Client not found or access denied");
    }

    const { data: pa } = await supabaseAdmin
      .from("program_assignments")
      .select("id")
      .eq("client_id", clientId)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!pa?.id) {
      return NextResponse.json({ error: "No active program assignment" }, { status: 400 });
    }

    const result = await coachPauseProgramAssignment(supabaseAdmin, user.id, pa.id, {
      forcePause,
      reason,
    });

    if (!result.ok) {
      if (result.status === 409 && result.logId) {
        return NextResponse.json(
          {
            error: "in_progress_workout",
            message:
              "Client has an in-progress workout. Resolve or force-pause.",
            logId: result.logId,
          },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, pause_status: "paused" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    if (msg === "User not authenticated") return createUnauthorizedResponse();
    console.error("[coach/clients/.../program/pause]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
