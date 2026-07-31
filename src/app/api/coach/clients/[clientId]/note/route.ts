/**
 * GET/PUT /api/coach/clients/[clientId]/note
 *
 * Private standing coach memo (coach_client_notes). Coach-only via ownership check.
 * Empty/whitespace note → delete the row (no empty rows left behind).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  validateApiAuth,
  createUnauthorizedResponse,
  createForbiddenResponse,
} from "@/lib/apiAuth";
import { createErrorResponse, handleApiError } from "@/lib/apiErrorHandler";

const NOTE_MAX_CHARS = 2000;

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
      return createErrorResponse(
        "Missing clientId",
        undefined,
        "VALIDATION_ERROR",
        400,
      );
    }
    await assertCoachHasClient(user.id, clientId, supabaseAdmin);

    const { data, error } = await supabaseAdmin
      .from("coach_client_notes")
      .select("note, updated_at")
      .eq("coach_id", user.id)
      .eq("client_id", clientId)
      .maybeSingle();
    if (error) throw error;

    return NextResponse.json({
      note: data?.note ?? null,
      updatedAt: data?.updated_at ?? null,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === "User not authenticated") return createUnauthorizedResponse(msg);
    if (msg.includes("Forbidden")) return createForbiddenResponse(msg);
    return handleApiError(error, "Failed to load coach note");
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
      return createErrorResponse(
        "Missing clientId",
        undefined,
        "VALIDATION_ERROR",
        400,
      );
    }
    await assertCoachHasClient(user.id, clientId, supabaseAdmin);

    let body: { note?: unknown } = {};
    try {
      body = await req.json();
    } catch {
      return createErrorResponse(
        "Invalid JSON body",
        undefined,
        "VALIDATION_ERROR",
        400,
      );
    }

    const raw = typeof body.note === "string" ? body.note : "";
    const trimmed = raw.trim();
    if (trimmed.length > NOTE_MAX_CHARS) {
      return createErrorResponse(
        `Note must be at most ${NOTE_MAX_CHARS} characters`,
        undefined,
        "VALIDATION_ERROR",
        400,
      );
    }

    // Clearing → delete row (empty standing note = no row).
    if (!trimmed) {
      const { error: delErr } = await supabaseAdmin
        .from("coach_client_notes")
        .delete()
        .eq("coach_id", user.id)
        .eq("client_id", clientId);
      if (delErr) throw delErr;
      return NextResponse.json({ note: null, updatedAt: null });
    }

    const { data, error } = await supabaseAdmin
      .from("coach_client_notes")
      .upsert(
        {
          coach_id: user.id,
          client_id: clientId,
          note: trimmed,
        },
        { onConflict: "coach_id,client_id" },
      )
      .select("note, updated_at")
      .single();
    if (error) throw error;

    return NextResponse.json({
      note: data.note as string,
      updatedAt: data.updated_at as string,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === "User not authenticated") return createUnauthorizedResponse(msg);
    if (msg.includes("Forbidden")) return createForbiddenResponse(msg);
    return handleApiError(error, "Failed to save coach note");
  }
}
