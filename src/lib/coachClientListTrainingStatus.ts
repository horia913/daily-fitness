/**
 * Coach client list — training-based status (calendar Mon–Sun, client TZ).
 * Batched queries only (no per-client DB round-trips).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addCalendarDaysYmd,
  normalizeClientTimezone,
  zonedCalendarDateString,
  zonedDayInclusiveUtcBounds,
  zonedYmdFromIsoTimestamp,
} from "@/lib/clientZonedCalendar";
import { getCurrentWeekBoundsForClient } from "@/lib/weekBounds";

export type ClientTrainingStatusKind =
  | "on_track"
  | "behind"
  | "missed_week"
  | "paused"
  | "no_program";

export type CoachClientTrainingListPayload = {
  pauseStatus: "active" | "paused";
  hasActiveProgram: boolean;
  activeProgramAssignmentId: string | null;
  priorWeekScheduledCount: number;
  priorWeekCompletedCount: number;
  currentWeekCompletedCount: number;
  currentWeekScheduledPastCount: number;
  trainingStatus: ClientTrainingStatusKind;
};

function isoCompletedLocalYmdInRange(
  completedAt: string,
  tz: string,
  rangeStartYmd: string,
  rangeEndYmd: string,
): boolean {
  const ymd = zonedYmdFromIsoTimestamp(completedAt, tz);
  return ymd >= rangeStartYmd && ymd <= rangeEndYmd;
}

function isCountableWorkoutPda(row: {
  is_optional: boolean | null;
  day_type: string | null;
  workout_template_id: string | null;
  workout_assignment_id: string | null;
}): boolean {
  if (row.is_optional) return false;
  if ((row.day_type ?? "").toLowerCase() !== "workout") return false;
  const tid = row.workout_template_id;
  return typeof tid === "string" && tid.length > 0;
}

function pdaCalendarYmd(
  workoutAssignmentId: string | null,
  waById: Map<string, { scheduled_date: string | null; assigned_date: string | null }>,
): string | null {
  if (!workoutAssignmentId) return null;
  const wa = waById.get(workoutAssignmentId);
  if (!wa) return null;
  const raw = wa.scheduled_date ?? wa.assigned_date;
  if (!raw) return null;
  return String(raw).slice(0, 10);
}

export function computeClientTrainingStatus(fields: {
  pauseStatus: "active" | "paused";
  hasActiveProgram: boolean;
  priorWeekScheduledCount: number;
  priorWeekCompletedCount: number;
  currentWeekCompletedCount: number;
  currentWeekScheduledPastCount: number;
}): ClientTrainingStatusKind {
  if (fields.pauseStatus === "paused") return "paused";
  if (!fields.hasActiveProgram) return "no_program";
  const {
    priorWeekScheduledCount,
    priorWeekCompletedCount,
    currentWeekCompletedCount,
    currentWeekScheduledPastCount,
  } = fields;

  if (
    priorWeekScheduledCount > 0 &&
    priorWeekCompletedCount === 0 &&
    currentWeekCompletedCount === 0
  ) {
    return "missed_week";
  }
  if (currentWeekCompletedCount < currentWeekScheduledPastCount) {
    return "behind";
  }
  return "on_track";
}

export async function fetchCoachClientListTrainingPayload(
  db: SupabaseClient,
  clientIds: string[],
  profilesById: Map<string, { timezone?: string | null }>,
): Promise<Map<string, CoachClientTrainingListPayload>> {
  const out = new Map<string, CoachClientTrainingListPayload>();
  if (clientIds.length === 0) return out;

  const defaultPayload = (): CoachClientTrainingListPayload => ({
    pauseStatus: "active",
    hasActiveProgram: false,
    activeProgramAssignmentId: null,
    priorWeekScheduledCount: 0,
    priorWeekCompletedCount: 0,
    currentWeekCompletedCount: 0,
    currentWeekScheduledPastCount: 0,
    trainingStatus: "no_program",
  });

  for (const id of clientIds) {
    out.set(id, defaultPayload());
  }

  const { data: paRows, error: paErr } = await db
    .from("program_assignments")
    .select(
      "id, client_id, pause_status, timezone_snapshot, start_date, pause_accumulated_days, paused_at",
    )
    .in("client_id", clientIds)
    .eq("status", "active")
    .order("updated_at", { ascending: false });

  if (paErr) {
    console.error("[coachClientListTrainingStatus] program_assignments:", paErr);
    for (const id of clientIds) {
      const p = out.get(id)!;
      p.trainingStatus = computeClientTrainingStatus(p);
    }
    return out;
  }

  type PaRow = {
    id: string;
    client_id: string;
    pause_status: string | null;
    timezone_snapshot: string | null;
    start_date: string | null;
    pause_accumulated_days: number | null;
    paused_at: string | null;
  };

  const assignmentByClient = new Map<string, PaRow>();
  for (const row of (paRows ?? []) as PaRow[]) {
    if (!assignmentByClient.has(row.client_id)) {
      assignmentByClient.set(row.client_id, row);
    }
  }

  const assignmentIds = [...new Set([...assignmentByClient.values()].map((r) => r.id))];
  if (assignmentIds.length === 0) {
    for (const id of clientIds) {
      const p = out.get(id)!;
      p.trainingStatus = computeClientTrainingStatus(p);
    }
    return out;
  }

  const { data: pdaRows, error: pdaErr } = await db
    .from("program_day_assignments")
    .select(
      "program_assignment_id, is_optional, day_type, workout_template_id, workout_assignment_id",
    )
    .in("program_assignment_id", assignmentIds);

  if (pdaErr) {
    console.error("[coachClientListTrainingStatus] program_day_assignments:", pdaErr);
  }

  const waIds = new Set<string>();
  for (const r of pdaRows ?? []) {
    const wid = (r as { workout_assignment_id?: string | null }).workout_assignment_id;
    if (wid) waIds.add(wid);
  }

  const waById = new Map<string, { scheduled_date: string | null; assigned_date: string | null }>();
  if (waIds.size > 0) {
    const { data: waRows, error: waErr } = await db
      .from("workout_assignments")
      .select("id, scheduled_date, assigned_date")
      .in("id", [...waIds]);
    if (waErr) {
      console.error("[coachClientListTrainingStatus] workout_assignments:", waErr);
    } else {
      for (const w of waRows ?? []) {
        waById.set((w as { id: string }).id, {
          scheduled_date: (w as { scheduled_date?: string | null }).scheduled_date ?? null,
          assigned_date: (w as { assigned_date?: string | null }).assigned_date ?? null,
        });
      }
    }
  }

  const pdasByAssignment = new Map<
    string,
    Array<{
      is_optional: boolean | null;
      day_type: string | null;
      workout_template_id: string | null;
      workout_assignment_id: string | null;
    }>
  >();
  for (const raw of pdaRows ?? []) {
    const r = raw as {
      program_assignment_id: string;
      is_optional: boolean | null;
      day_type: string | null;
      workout_template_id: string | null;
      workout_assignment_id: string | null;
    };
    const list = pdasByAssignment.get(r.program_assignment_id) ?? [];
    list.push(r);
    pdasByAssignment.set(r.program_assignment_id, list);
  }

  /** Wide UTC window — filter per client TZ in memory */
  let globalMinUtc = Infinity;
  let globalMaxUtc = 0;
  const now = new Date();

  for (const cid of clientIds) {
    const assignment = assignmentByClient.get(cid);
    if (!assignment) continue;
    const tzRaw =
      profilesById.get(cid)?.timezone ?? assignment.timezone_snapshot ?? null;
    const tz = normalizeClientTimezone(tzRaw);
    const cur = getCurrentWeekBoundsForClient(tz, now);
    const priorMonday = addCalendarDaysYmd(cur.mondayYmd, -7);
    const priorSunday = addCalendarDaysYmd(priorMonday, 6);
    const pStart = Date.parse(zonedDayInclusiveUtcBounds(priorMonday, tz).startIso);
    const cEnd = Date.parse(cur.weekEndUtcIso);
    globalMinUtc = Math.min(globalMinUtc, pStart);
    globalMaxUtc = Math.max(globalMaxUtc, cEnd);
  }

  const logsByClient = new Map<
    string,
    Array<{
      program_assignment_id: string | null;
      program_day_assignment_id: string | null;
      completed_at: string;
    }>
  >();

  if (globalMinUtc !== Infinity && globalMaxUtc > 0) {
    const { data: logRows, error: logErr } = await db
      .from("workout_logs")
      .select("client_id, program_assignment_id, program_day_assignment_id, completed_at")
      .in("client_id", clientIds)
      .in("program_assignment_id", assignmentIds)
      .not("completed_at", "is", null)
      .not("program_day_assignment_id", "is", null)
      .gte("completed_at", new Date(globalMinUtc).toISOString())
      .lte("completed_at", new Date(globalMaxUtc).toISOString());

    if (logErr) {
      console.error("[coachClientListTrainingStatus] workout_logs:", logErr);
    } else {
      for (const row of logRows ?? []) {
        const cid = (row as { client_id: string }).client_id;
        const arr = logsByClient.get(cid) ?? [];
        arr.push({
          program_assignment_id:
            (row as { program_assignment_id?: string | null }).program_assignment_id ?? null,
          program_day_assignment_id:
            (row as { program_day_assignment_id?: string | null }).program_day_assignment_id ?? null,
          completed_at: (row as { completed_at: string }).completed_at,
        });
        logsByClient.set(cid, arr);
      }
    }
  }

  for (const cid of clientIds) {
    const payload = out.get(cid)!;
    const assignment = assignmentByClient.get(cid);
    if (!assignment) {
      payload.trainingStatus = computeClientTrainingStatus(payload);
      continue;
    }

    payload.hasActiveProgram = true;
    payload.activeProgramAssignmentId = assignment.id;
    payload.pauseStatus =
      (assignment.pause_status ?? "").toLowerCase() === "paused" ? "paused" : "active";

    const tzRaw =
      profilesById.get(cid)?.timezone ?? assignment.timezone_snapshot ?? null;
    const tz = normalizeClientTimezone(tzRaw);
    const cur = getCurrentWeekBoundsForClient(tz, now);
    const priorMonday = addCalendarDaysYmd(cur.mondayYmd, -7);
    const priorSunday = addCalendarDaysYmd(priorMonday, 6);
    const todayYmd = zonedCalendarDateString(now, tz);

    const pdas = pdasByAssignment.get(assignment.id) ?? [];

    let priorScheduled = 0;
    let currentPastScheduled = 0;
    for (const pda of pdas) {
      if (!isCountableWorkoutPda(pda)) continue;
      const ymd = pdaCalendarYmd(pda.workout_assignment_id ?? null, waById);
      if (!ymd) continue;
      if (ymd >= priorMonday && ymd <= priorSunday) priorScheduled++;
      if (
        ymd >= cur.mondayYmd &&
        ymd <= cur.sundayYmd &&
        ymd < todayYmd
      ) {
        currentPastScheduled++;
      }
    }

    payload.priorWeekScheduledCount = priorScheduled;
    payload.currentWeekScheduledPastCount = currentPastScheduled;

    const logs = logsByClient.get(cid) ?? [];
    const priorCompleted = new Set<string>();
    const currentCompleted = new Set<string>();
    for (const log of logs) {
      if (log.program_assignment_id !== assignment.id) continue;
      const sid = log.program_day_assignment_id;
      if (!sid || !log.completed_at) continue;
      if (isoCompletedLocalYmdInRange(log.completed_at, tz, priorMonday, priorSunday)) {
        priorCompleted.add(sid);
      }
      if (
        isoCompletedLocalYmdInRange(log.completed_at, tz, cur.mondayYmd, cur.sundayYmd)
      ) {
        currentCompleted.add(sid);
      }
    }
    payload.priorWeekCompletedCount = priorCompleted.size;
    payload.currentWeekCompletedCount = currentCompleted.size;

    payload.trainingStatus = computeClientTrainingStatus(payload);
  }

  return out;
}
