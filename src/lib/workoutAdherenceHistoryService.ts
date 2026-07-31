/**
 * Client workout adherence history — completed ÷ scheduled (program_day_completions).
 * Days with nothing scheduled are neutral (`value: null`), not misses.
 * Unscheduled-but-completed workouts are credited as `value: 1`.
 * Abandoned sessions are never counted as completed.
 */

import { supabase } from "./supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toLocalDateString } from "./clientActivityService";
import { isCoachSkipNote } from "./programInstanceResolver";
import {
  computeCurrentProgramWeek,
  normalizeClientTimezone,
} from "./programWeekCalendar";

export type WorkoutAdherenceDay = {
  date: string;
  scheduled: number;
  completed: number;
  /** 0–1 when scheduled > 0 (or credited extra); null when nothing scheduled and no credit */
  value: number | null;
};

export type WorkoutAdherenceHistory = {
  hasAnyAssignment: boolean;
  days: WorkoutAdherenceDay[];
};

type AssignmentRow = {
  id: string;
  start_date: string | null;
  status: string;
  created_at: string;
  pause_accumulated_days: number | null;
  pause_status: string | null;
  paused_at: string | null;
  timezone_snapshot: string | null;
};

type SlotRow = {
  id: string;
  program_assignment_id: string;
  week_number: number;
  program_day: number | null;
  is_optional: boolean | null;
};

type CompletionRow = {
  program_assignment_id: string;
  program_day_assignment_id: string | null;
  notes: string | null;
};

type LogRow = {
  id: string;
  started_at: string;
  completed_at: string | null;
  total_sets_completed: number | null;
  workout_session_id: string | null;
};

function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(ymd + "T12:00:00");
  d.setDate(d.getDate() + days);
  return toLocalDateString(d);
}

function eachYmd(start: string, end: string): string[] {
  const out: string[] = [];
  for (let ymd = start; ymd <= end; ymd = addDaysYmd(ymd, 1)) {
    out.push(ymd);
  }
  return out;
}

/** Local Mon=1…Sun=7 for a YYYY-MM-DD (noon local, mirrors nutrition date keys). */
function programDayFromLocalYmd(ymd: string): number {
  const d = new Date(ymd + "T12:00:00");
  const js = d.getDay(); // 0=Sun
  return js === 0 ? 7 : js;
}

/**
 * Abandoned ≠ completed:
 * - workout_sessions.status === 'abandoned', or
 * - completed_at === started_at with zero sets (legacy abandon close).
 * Instant completions (e.g. strength tests) may share started/completed timestamps
 * but still have sets — those count.
 */
export function isCountableCompletedWorkoutLog(
  log: LogRow,
  sessionStatusById?: Map<string, string>
): boolean {
  if (!log.completed_at) return false;
  const sessionStatus = log.workout_session_id
    ? sessionStatusById?.get(log.workout_session_id)
    : undefined;
  if (sessionStatus === "abandoned") return false;
  const sets = log.total_sets_completed ?? 0;
  if (log.completed_at === log.started_at && sets <= 0) return false;
  if (sessionStatus === "completed") return true;
  return sets > 0;
}

function pickAssignmentForDay(
  assignments: AssignmentRow[],
  dayYmd: string
): AssignmentRow | null {
  const matches = assignments.filter((a) => {
    const start = (a.start_date ?? "").slice(0, 10);
    if (!start || start > dayYmd) return false;
    if (a.status === "cancelled") return false;
    return true;
  });
  if (matches.length === 0) return null;

  matches.sort((a, b) => {
    const statusRank = (s: string) =>
      s === "active" || s === "paused" ? 2 : s === "completed" ? 1 : 0;
    const rankDiff = statusRank(b.status) - statusRank(a.status);
    if (rankDiff !== 0) return rankDiff;
    const startDiff = (b.start_date ?? "").localeCompare(a.start_date ?? "");
    if (startDiff !== 0) return startDiff;
    return b.created_at.localeCompare(a.created_at);
  });
  return matches[0] ?? null;
}

/**
 * Load adherence history for the client workout-logs calendar.
 * Range covers ~4 months so month navigation has data.
 */
export async function getWorkoutAdherenceHistory(
  clientId: string,
  options?: {
    endDate?: string;
    startDate?: string;
    /** Service-role or user client; defaults to browser supabase. */
    db?: SupabaseClient;
  }
): Promise<WorkoutAdherenceHistory> {
  const db = options?.db ?? supabase;
  const endDate = options?.endDate ?? toLocalDateString(new Date());
  const startDefault = addDaysYmd(endDate, -120);
  const startDate = options?.startDate ?? startDefault;

  const emptyDays = eachYmd(startDate, endDate).map((date) => ({
    date,
    scheduled: 0,
    completed: 0,
    value: null as number | null,
  }));

  const { data: profile } = await db
    .from("profiles")
    .select("timezone")
    .eq("id", clientId)
    .maybeSingle();
  const profileTz = normalizeClientTimezone(
    (profile as { timezone?: string | null } | null)?.timezone
  );

  const [assignmentsRes, logsRes] = await Promise.all([
    db
      .from("program_assignments")
      .select(
        "id, start_date, status, created_at, pause_accumulated_days, pause_status, paused_at, timezone_snapshot"
      )
      .eq("client_id", clientId)
      .neq("status", "cancelled")
      .lte("start_date", endDate),
    db
      .from("workout_logs")
      .select(
        "id, started_at, completed_at, total_sets_completed, workout_session_id"
      )
      .eq("client_id", clientId)
      .not("completed_at", "is", null)
      .gte("completed_at", `${startDate}T00:00:00`)
      .lte("completed_at", `${endDate}T23:59:59.999`),
  ]);

  if (assignmentsRes.error) throw assignmentsRes.error;
  if (logsRes.error) throw logsRes.error;

  const assignments = (assignmentsRes.data ?? []) as AssignmentRow[];
  const logs = (logsRes.data ?? []) as LogRow[];

  const sessionIds = [
    ...new Set(
      logs
        .map((l) => l.workout_session_id)
        .filter((id): id is string => !!id)
    ),
  ];
  const sessionStatusById = new Map<string, string>();
  if (sessionIds.length > 0) {
    const { data: sessions } = await db
      .from("workout_sessions")
      .select("id, status")
      .in("id", sessionIds);
    for (const s of sessions ?? []) {
      sessionStatusById.set(
        (s as { id: string; status: string }).id,
        (s as { id: string; status: string }).status
      );
    }
  }

  const extrasByDate = new Map<string, number>();
  for (const log of logs) {
    if (!isCountableCompletedWorkoutLog(log, sessionStatusById)) continue;
    const ymd = toLocalDateString(new Date(log.completed_at!));
    if (ymd < startDate || ymd > endDate) continue;
    extrasByDate.set(ymd, (extrasByDate.get(ymd) ?? 0) + 1);
  }

  if (assignments.length === 0) {
    const days = emptyDays.map((d) => {
      const extras = extrasByDate.get(d.date) ?? 0;
      if (extras > 0) {
        return { ...d, completed: extras, value: 1 };
      }
      return d;
    });
    return { hasAnyAssignment: false, days };
  }

  const assignmentIds = assignments.map((a) => a.id);
  const [slotsRes, compsRes] = await Promise.all([
    db
      .from("program_day_assignments")
      .select("id, program_assignment_id, week_number, program_day, is_optional")
      .in("program_assignment_id", assignmentIds),
    db
      .from("program_day_completions")
      .select("program_assignment_id, program_day_assignment_id, notes")
      .in("program_assignment_id", assignmentIds),
  ]);

  if (slotsRes.error) throw slotsRes.error;
  if (compsRes.error) throw compsRes.error;

  const slots = (slotsRes.data ?? []) as SlotRow[];
  const completions = (compsRes.data ?? []) as CompletionRow[];

  const slotsByAssignment = new Map<string, SlotRow[]>();
  for (const s of slots) {
    if (!slotsByAssignment.has(s.program_assignment_id)) {
      slotsByAssignment.set(s.program_assignment_id, []);
    }
    slotsByAssignment.get(s.program_assignment_id)!.push(s);
  }

  const compsByAssignment = new Map<string, CompletionRow[]>();
  for (const c of completions) {
    if (!compsByAssignment.has(c.program_assignment_id)) {
      compsByAssignment.set(c.program_assignment_id, []);
    }
    compsByAssignment.get(c.program_assignment_id)!.push(c);
  }

  const days: WorkoutAdherenceDay[] = [];
  for (const ymd of eachYmd(startDate, endDate)) {
    const assignment = pickAssignmentForDay(assignments, ymd);
    let scheduled = 0;
    let completed = 0;

    if (assignment) {
      const tz =
        normalizeClientTimezone(assignment.timezone_snapshot) ||
        profileTz ||
        "UTC";
      const week = computeCurrentProgramWeek({
        assignmentStartDate: assignment.start_date,
        pauseAccumulatedDays: assignment.pause_accumulated_days,
        pauseStatus: assignment.pause_status,
        pausedAt: assignment.paused_at,
        targetYmd: ymd,
        clientTimezone: tz,
      });
      // Local calendar weekday for the same YMD keys as toLocalDateString (not UTC).
      const programDay = programDayFromLocalYmd(ymd);

      const assignmentSlots = slotsByAssignment.get(assignment.id) ?? [];
      const assignmentComps = compsByAssignment.get(assignment.id) ?? [];
      const skippedIds = new Set(
        assignmentComps
          .filter((c) => isCoachSkipNote(c.notes) && c.program_day_assignment_id)
          .map((c) => c.program_day_assignment_id as string)
      );
      const daySlots = assignmentSlots.filter(
        (s) =>
          s.week_number === week &&
          s.program_day === programDay &&
          !s.is_optional &&
          !skippedIds.has(s.id)
      );
      scheduled = daySlots.length;
      if (scheduled > 0) {
        const requiredIds = new Set(daySlots.map((s) => s.id));
        const doneIds = new Set(
          assignmentComps
            .filter(
              (c) =>
                !isCoachSkipNote(c.notes) &&
                c.program_day_assignment_id &&
                requiredIds.has(c.program_day_assignment_id)
            )
            .map((c) => c.program_day_assignment_id as string)
        );
        completed = doneIds.size;
      }
    }

    const extras = extrasByDate.get(ymd) ?? 0;
    let value: number | null = null;
    if (scheduled > 0) {
      value = Math.min(1, completed / scheduled);
    } else if (extras > 0) {
      // Unscheduled-but-completed: credit the day (client trained).
      completed = extras;
      value = 1;
    }

    days.push({ date: ymd, scheduled, completed, value });
  }

  return { hasAnyAssignment: true, days };
}

/** Calendar days for AdherenceCalendar: value 0–1 or null. */
export function toWorkoutCalendarDays(
  days: WorkoutAdherenceDay[]
): { date: string; value: number | null }[] {
  return days.map((d) => ({ date: d.date, value: d.value }));
}
