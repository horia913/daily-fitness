/**
 * Coach pause/resume for program_assignments — shared by assignment-id route and client-id routes.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  diffCalendarDaysYmd,
  zonedCalendarDateString,
  zonedYmdFromIsoTimestamp,
} from "@/lib/clientZonedCalendar";
import { getClientIanaTimezone } from "@/lib/programStateService";

export type PauseProgramResult =
  | { ok: true }
  | { ok: false; status: number; error: string; logId?: string };

export type ResumeProgramResult =
  | { ok: true; daysPaused: number; pause_accumulated_days: number }
  | { ok: false; status: number; error: string };

/**
 * POST /api/coach/program-assignments/[id]/pause — same behavior as original route.
 */
export async function coachPauseProgramAssignment(
  admin: SupabaseClient,
  coachUserId: string,
  assignmentId: string,
  opts?: { forcePause?: boolean; reason?: string | null },
): Promise<PauseProgramResult> {
  const forcePause = opts?.forcePause === true;
  const reason = opts?.reason ?? null;

  const { data: row, error: fetchErr } = await admin
    .from("program_assignments")
    .select("id, coach_id, client_id, pause_status, paused_at")
    .eq("id", assignmentId)
    .single();

  if (fetchErr || !row) {
    return { ok: false, status: 404, error: "Assignment not found" };
  }
  if (row.coach_id !== coachUserId) {
    return { ok: false, status: 403, error: "You are not the coach for this assignment" };
  }
  if (row.pause_status === "paused") {
    return { ok: false, status: 400, error: "Program is already paused" };
  }

  if (!forcePause) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: wipLogs } = await admin
      .from("workout_logs")
      .select("id")
      .eq("program_assignment_id", assignmentId)
      .is("completed_at", null)
      .gte("created_at", since)
      .limit(1);
    const logId = wipLogs?.[0]?.id as string | undefined;
    if (logId) {
      return {
        ok: false,
        status: 409,
        error: "in_progress_workout",
        logId,
      };
    }
  }

  const { error: upErr } = await admin
    .from("program_assignments")
    .update({
      pause_status: "paused",
      paused_at: new Date().toISOString(),
      pause_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", assignmentId)
    .eq("coach_id", coachUserId);

  if (upErr) {
    console.error("[coachPauseProgramAssignment]", upErr);
    return { ok: false, status: 500, error: "Failed to pause" };
  }

  return { ok: true };
}

/**
 * DELETE /api/coach/program-assignments/[id]/pause — same behavior as original route.
 */
export async function coachResumeProgramAssignment(
  admin: SupabaseClient,
  coachUserId: string,
  assignmentId: string,
): Promise<ResumeProgramResult> {
  const { data: row, error: fetchErr } = await admin
    .from("program_assignments")
    .select("id, coach_id, client_id, pause_status, paused_at, pause_accumulated_days")
    .eq("id", assignmentId)
    .single();

  if (fetchErr || !row) {
    return { ok: false, status: 404, error: "Assignment not found" };
  }
  if (row.coach_id !== coachUserId) {
    return { ok: false, status: 403, error: "You are not the coach for this assignment" };
  }
  if (row.pause_status !== "paused" || !row.paused_at) {
    return { ok: false, status: 400, error: "Program is not paused" };
  }

  const clientTz = await getClientIanaTimezone(admin, row.client_id as string);
  const pauseStartYmd = zonedYmdFromIsoTimestamp(row.paused_at as string, clientTz);
  const todayYmd = zonedCalendarDateString(new Date(), clientTz);
  const daysPaused = Math.max(0, diffCalendarDaysYmd(pauseStartYmd, todayYmd));
  const prevAccum = Math.max(0, Number(row.pause_accumulated_days) || 0);

  const { error: upErr } = await admin
    .from("program_assignments")
    .update({
      pause_status: "active",
      paused_at: null,
      pause_reason: null,
      pause_accumulated_days: prevAccum + daysPaused,
      updated_at: new Date().toISOString(),
    })
    .eq("id", assignmentId)
    .eq("coach_id", coachUserId);

  if (upErr) {
    console.error("[coachResumeProgramAssignment]", upErr);
    return { ok: false, status: 500, error: "Failed to resume" };
  }

  return {
    ok: true,
    daysPaused,
    pause_accumulated_days: prevAccum + daysPaused,
  };
}
