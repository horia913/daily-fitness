/**
 * Batch calendar adherence for a coach roster — same math as
 * getWorkoutAdherenceHistory / program_day_completions calendars.
 * Fixed query count (not N×W per-client loops).
 * Day placement: foundation via buildFoundationAdherenceDays.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { toLocalDateString } from "@/lib/clientActivityService";
import { instanceTotalWeeks } from "@/lib/programInstanceResolver";
import { normalizeClientTimezone } from "@/lib/programWeekCalendar";
import {
  isCountableCompletedWorkoutLog,
  type WorkoutAdherenceDay,
} from "@/lib/workoutAdherenceHistoryService";
import { addCalendarDaysYmd } from "@/lib/clientZonedCalendar";
import {
  buildFoundationAdherenceDays,
  resolveAdherenceTotalWeeks,
  type FoundationAdherenceDay,
} from "@/lib/progression/foundationAdherenceDays";

type AssignmentRow = {
  id: string;
  client_id: string;
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
  client_id: string;
  started_at: string;
  completed_at: string | null;
  total_sets_completed: number | null;
  workout_session_id: string | null;
};

function eachYmd(start: string, end: string): string[] {
  const out: string[] = [];
  for (let ymd = start; ymd <= end; ymd = addCalendarDaysYmd(ymd, 1)) {
    out.push(ymd);
  }
  return out;
}

function pickAssignmentForDay(
  assignments: AssignmentRow[],
  dayYmd: string,
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

function buildDaysForClient(input: {
  startDate: string;
  endDate: string;
  profileTz: string;
  assignments: AssignmentRow[];
  slotsByAssignment: Map<string, SlotRow[]>;
  compsByAssignment: Map<string, CompletionRow[]>;
  totalWeeksByAssignment: Map<string, number>;
  logs: LogRow[];
  sessionStatusById: Map<string, string>;
}): WorkoutAdherenceDay[] {
  const {
    startDate,
    endDate,
    profileTz,
    assignments,
    slotsByAssignment,
    compsByAssignment,
    totalWeeksByAssignment,
    logs,
    sessionStatusById,
  } = input;

  const extrasByDate = new Map<string, number>();
  for (const log of logs) {
    if (!isCountableCompletedWorkoutLog(log, sessionStatusById)) continue;
    const ymd = toLocalDateString(new Date(log.completed_at!));
    if (ymd < startDate || ymd > endDate) continue;
    extrasByDate.set(ymd, (extrasByDate.get(ymd) ?? 0) + 1);
  }

  const emptyExtras = new Map<string, number>();
  const seriesByAssignment = new Map<string, Map<string, FoundationAdherenceDay>>();
  for (const a of assignments) {
    const tz =
      normalizeClientTimezone(a.timezone_snapshot) || profileTz || "UTC";
    const series = buildFoundationAdherenceDays({
      range: { startYmd: startDate, endYmd: endDate },
      assignment: {
        start_date: a.start_date,
        pause_accumulated_days: a.pause_accumulated_days,
        pause_status: a.pause_status,
        paused_at: a.paused_at,
        totalWeeks: totalWeeksByAssignment.get(a.id) ?? 0,
      },
      slots: slotsByAssignment.get(a.id) ?? [],
      completions: compsByAssignment.get(a.id) ?? [],
      extrasByDate: emptyExtras,
      tz,
    });
    seriesByAssignment.set(
      a.id,
      new Map(series.map((d) => [d.date, d])),
    );
  }

  const days: WorkoutAdherenceDay[] = [];
  for (const ymd of eachYmd(startDate, endDate)) {
    const assignment = pickAssignmentForDay(assignments, ymd);
    let scheduled = 0;
    let completed = 0;

    if (assignment) {
      const row = seriesByAssignment.get(assignment.id)?.get(ymd);
      scheduled = row?.scheduled ?? 0;
      completed = row?.completed ?? 0;
    }

    const extras = extrasByDate.get(ymd) ?? 0;
    let value: number | null = null;
    if (scheduled > 0) {
      value = Math.min(1, completed / scheduled);
    } else if (extras > 0) {
      completed = extras;
      value = 1;
    }
    days.push({ date: ymd, scheduled, completed, value });
  }
  return days;
}

/** Load adherence day series for many clients — O(1) query batches. */
export async function batchRosterAdherenceHistory(
  db: SupabaseClient,
  clientIds: string[],
  profilesById: Map<string, { timezone?: string | null }>,
  startDate: string,
  endDate: string,
): Promise<Map<string, WorkoutAdherenceDay[]>> {
  const out = new Map<string, WorkoutAdherenceDay[]>();
  if (clientIds.length === 0) return out;

  const [assignmentsRes, logsRes] = await Promise.all([
    db
      .from("program_assignments")
      .select(
        "id, client_id, start_date, status, created_at, pause_accumulated_days, pause_status, paused_at, timezone_snapshot",
      )
      .in("client_id", clientIds)
      .neq("status", "cancelled")
      .lte("start_date", endDate),
    db
      .from("workout_logs")
      .select(
        "id, client_id, started_at, completed_at, total_sets_completed, workout_session_id",
      )
      .in("client_id", clientIds)
      .not("completed_at", "is", null)
      .gte("completed_at", `${startDate}T00:00:00`)
      .lte("completed_at", `${endDate}T23:59:59.999`),
  ]);

  const assignments = (assignmentsRes.data ?? []) as AssignmentRow[];
  const logs = (logsRes.data ?? []) as LogRow[];

  const assignmentIds = assignments.map((a) => a.id);
  let slots: SlotRow[] = [];
  let completions: CompletionRow[] = [];
  if (assignmentIds.length > 0) {
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
    slots = (slotsRes.data ?? []) as SlotRow[];
    completions = (compsRes.data ?? []) as CompletionRow[];
  }

  const slotsByAssignment = new Map<string, SlotRow[]>();
  for (const s of slots) {
    const list = slotsByAssignment.get(s.program_assignment_id) ?? [];
    list.push(s);
    slotsByAssignment.set(s.program_assignment_id, list);
  }
  const compsByAssignment = new Map<string, CompletionRow[]>();
  for (const c of completions) {
    const list = compsByAssignment.get(c.program_assignment_id) ?? [];
    list.push(c);
    compsByAssignment.set(c.program_assignment_id, list);
  }

  const totalWeeksByAssignment = new Map<string, number>();
  if (assignmentIds.length > 0) {
    const { data: phaseRows } = await db
      .from("program_instance_phases")
      .select("program_assignment_id, duration_weeks")
      .in("program_assignment_id", assignmentIds);

    const phasesByAssignment = new Map<
      string,
      Array<{ duration_weeks: number }>
    >();
    for (const row of phaseRows ?? []) {
      const aid = (row as { program_assignment_id: string })
        .program_assignment_id;
      if (!aid) continue;
      const list = phasesByAssignment.get(aid) ?? [];
      list.push({
        duration_weeks: Number(
          (row as { duration_weeks: number }).duration_weeks,
        ),
      });
      phasesByAssignment.set(aid, list);
    }
    for (const id of assignmentIds) {
      const fromPhases = instanceTotalWeeks(phasesByAssignment.get(id) ?? []);
      totalWeeksByAssignment.set(
        id,
        resolveAdherenceTotalWeeks(fromPhases, slotsByAssignment.get(id) ?? []),
      );
    }
  }

  const sessionIds = [
    ...new Set(
      logs
        .map((l) => l.workout_session_id)
        .filter((id): id is string => !!id),
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
        (s as { id: string }).id,
        (s as { status: string }).status,
      );
    }
  }

  const assignmentsByClient = new Map<string, AssignmentRow[]>();
  for (const a of assignments) {
    const list = assignmentsByClient.get(a.client_id) ?? [];
    list.push(a);
    assignmentsByClient.set(a.client_id, list);
  }
  const logsByClient = new Map<string, LogRow[]>();
  for (const l of logs) {
    const list = logsByClient.get(l.client_id) ?? [];
    list.push(l);
    logsByClient.set(l.client_id, list);
  }

  for (const clientId of clientIds) {
    const profileTz = normalizeClientTimezone(
      profilesById.get(clientId)?.timezone,
    );
    const days = buildDaysForClient({
      startDate,
      endDate,
      profileTz,
      assignments: assignmentsByClient.get(clientId) ?? [],
      slotsByAssignment,
      compsByAssignment,
      totalWeeksByAssignment,
      logs: logsByClient.get(clientId) ?? [],
      sessionStatusById,
    });
    out.set(clientId, days);
  }
  return out;
}

export function sumAdherenceWindow(
  days: WorkoutAdherenceDay[],
  start: string,
  end: string,
): { scheduled: number; completed: number; pct: number | null } {
  let scheduled = 0;
  let completed = 0;
  for (const d of days) {
    if (d.date < start || d.date > end) continue;
    if (d.scheduled <= 0) continue;
    scheduled += d.scheduled;
    completed += Math.min(d.completed, d.scheduled);
  }
  if (scheduled <= 0) return { scheduled: 0, completed: 0, pct: null };
  return {
    scheduled,
    completed,
    pct: Math.round((completed / scheduled) * 100),
  };
}

/** Monday YYYY-MM-DD for a local calendar date. */
export function mondayOfYmd(ymd: string): string {
  const d = new Date(ymd + "T12:00:00");
  const dow = d.getDay(); // 0 Sun
  const back = dow === 0 ? 6 : dow - 1;
  d.setDate(d.getDate() - back);
  return toLocalDateString(d);
}

export type WeeklyAdherenceBar = {
  weekStart: string;
  label: string;
  pct: number;
  isCurrent: boolean;
};

/** Roster-pooled weekly % (completed÷scheduled across all clients). */
export function buildWeeklyRosterBars(
  daysByClient: Map<string, WorkoutAdherenceDay[]>,
  weekStarts: string[],
  todayYmd: string,
): WeeklyAdherenceBar[] {
  const currentMonday = mondayOfYmd(todayYmd);
  return weekStarts.map((weekStart, i) => {
    const weekEnd = addCalendarDaysYmd(weekStart, 6);
    let scheduled = 0;
    let completed = 0;
    for (const days of daysByClient.values()) {
      for (const d of days) {
        if (d.date < weekStart || d.date > weekEnd) continue;
        if (d.scheduled <= 0) continue;
        scheduled += d.scheduled;
        completed += Math.min(d.completed, d.scheduled);
      }
    }
    const pct = scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0;
    const isCurrent = weekStart === currentMonday;
    const label = isCurrent ? "Now" : `W${i + 1}`;
    return { weekStart, label, pct, isCurrent };
  });
}
