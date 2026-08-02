/**
 * Coach client list — training-based status (foundation missed / behind).
 * Batched queries only (no per-client DB round-trips).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  normalizeClientTimezone,
  zonedCalendarDateString,
} from "@/lib/clientZonedCalendar";
import { instanceTotalWeeks } from "@/lib/programInstanceResolver";
import { resolveAdherenceTotalWeeks } from "@/lib/progression/foundationAdherenceDays";
import { countFoundationMissed } from "@/lib/progression/countFoundationMissed";

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
  /** Foundation: any in-scope missed as of effective-today */
  hasMissed: boolean;
  missedCount: number;
  missedWeekNumbers: number[];
  /** Foundation: a fully past program week with scheduled > 0 and completed === 0 */
  hasFullyMissedPastWeek: boolean;
  /** Compat counts — foundation placement / slot-keyed completions */
  priorWeekScheduledCount: number;
  priorWeekCompletedCount: number;
  currentWeekCompletedCount: number;
  currentWeekScheduledPastCount: number;
  trainingStatus: ClientTrainingStatusKind;
};

export function computeClientTrainingStatus(fields: {
  pauseStatus: "active" | "paused";
  hasActiveProgram: boolean;
  hasMissed: boolean;
  hasFullyMissedPastWeek: boolean;
}): ClientTrainingStatusKind {
  if (fields.pauseStatus === "paused") return "paused";
  if (!fields.hasActiveProgram) return "no_program";
  if (fields.hasFullyMissedPastWeek) return "missed_week";
  if (fields.hasMissed) return "behind";
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
    hasMissed: false,
    missedCount: 0,
    missedWeekNumbers: [],
    hasFullyMissedPastWeek: false,
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

  const [pdaRes, compsRes, phasesRes] = await Promise.all([
    db
      .from("program_day_assignments")
      .select(
        "id, program_assignment_id, week_number, program_day, is_optional, day_type",
      )
      .in("program_assignment_id", assignmentIds),
    db
      .from("program_day_completions")
      .select("program_assignment_id, program_day_assignment_id, notes")
      .in("program_assignment_id", assignmentIds),
    db
      .from("program_instance_phases")
      .select("program_assignment_id, duration_weeks")
      .in("program_assignment_id", assignmentIds),
  ]);

  if (pdaRes.error) {
    console.error("[coachClientListTrainingStatus] program_day_assignments:", pdaRes.error);
  }
  if (compsRes.error) {
    console.error("[coachClientListTrainingStatus] program_day_completions:", compsRes.error);
  }
  if (phasesRes.error) {
    console.error("[coachClientListTrainingStatus] program_instance_phases:", phasesRes.error);
  }

  type PdaRow = {
    id: string;
    program_assignment_id: string;
    week_number: number;
    program_day: number | null;
    is_optional: boolean | null;
    day_type: string | null;
  };
  type CompRow = {
    program_assignment_id: string;
    program_day_assignment_id: string | null;
    notes: string | null;
  };

  const slotsByAssignment = new Map<string, PdaRow[]>();
  for (const raw of (pdaRes.data ?? []) as PdaRow[]) {
    const list = slotsByAssignment.get(raw.program_assignment_id) ?? [];
    list.push(raw);
    slotsByAssignment.set(raw.program_assignment_id, list);
  }

  const compsByAssignment = new Map<string, CompRow[]>();
  for (const raw of (compsRes.data ?? []) as CompRow[]) {
    const list = compsByAssignment.get(raw.program_assignment_id) ?? [];
    list.push(raw);
    compsByAssignment.set(raw.program_assignment_id, list);
  }

  const phasesByAssignment = new Map<string, Array<{ duration_weeks: number }>>();
  for (const row of phasesRes.data ?? []) {
    const aid = (row as { program_assignment_id: string }).program_assignment_id;
    if (!aid) continue;
    const list = phasesByAssignment.get(aid) ?? [];
    list.push({
      duration_weeks: Number((row as { duration_weeks: number }).duration_weeks),
    });
    phasesByAssignment.set(aid, list);
  }

  const totalWeeksByAssignment = new Map<string, number>();
  for (const id of assignmentIds) {
    const fromPhases = instanceTotalWeeks(phasesByAssignment.get(id) ?? []);
    totalWeeksByAssignment.set(
      id,
      resolveAdherenceTotalWeeks(fromPhases, slotsByAssignment.get(id) ?? []),
    );
  }

  const now = new Date();

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
    const wallTodayYmd = zonedCalendarDateString(now, tz);

    const missed = countFoundationMissed({
      assignment: {
        start_date: assignment.start_date,
        pause_accumulated_days: assignment.pause_accumulated_days,
        pause_status: assignment.pause_status,
        paused_at: assignment.paused_at,
        totalWeeks: totalWeeksByAssignment.get(assignment.id) ?? 0,
      },
      slots: slotsByAssignment.get(assignment.id) ?? [],
      completions: compsByAssignment.get(assignment.id) ?? [],
      wallTodayYmd,
      tz,
    });

    payload.hasMissed = missed.hasMissed;
    payload.missedCount = missed.missedCount;
    payload.missedWeekNumbers = missed.missedWeekNumbers;
    payload.hasFullyMissedPastWeek = missed.hasFullyMissedPastWeek;
    payload.priorWeekScheduledCount = missed.priorWeekScheduledCount;
    payload.priorWeekCompletedCount = missed.priorWeekCompletedCount;
    payload.currentWeekScheduledPastCount = missed.currentWeekScheduledPastCount;
    payload.currentWeekCompletedCount = missed.currentWeekCompletedCount;
    payload.trainingStatus = computeClientTrainingStatus(payload);
  }

  return out;
}
