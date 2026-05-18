/**
 * PATCH — resume paused program for coach's client (shifts timeline via pause_accumulated_days).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  validateApiAuth,
  createUnauthorizedResponse,
  createForbiddenResponse,
} from "@/lib/apiAuth";
import { coachResumeProgramAssignment } from "@/lib/programAssignmentCoachPause";

type RouteCtx = { params: Promise<{ clientId: string }> };

export async function PATCH(_request: NextRequest, ctx: RouteCtx) {
  try {
    const { user, supabaseAdmin } = await validateApiAuth(_request);
    const { clientId } = await ctx.params;
    if (!clientId) {
      return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
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

    const result = await coachResumeProgramAssignment(supabaseAdmin, user.id, pa.id);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      pause_status: "active",
      days_paused: result.daysPaused,
      pause_accumulated_days: result.pause_accumulated_days,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    if (msg === "User not authenticated") return createUnauthorizedResponse();
    console.error("[coach/clients/.../program/resume]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
