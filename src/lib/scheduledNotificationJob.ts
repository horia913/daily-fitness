/**
 * Daily scheduled notifications: workout due, missed (client + coach threshold), inactive.
 * Uses the same adherence math as the train calendar (`getWorkoutAdherenceHistory` /
 * `program_day_completions`). Failures are per-client — one bad row never aborts the run.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getWorkoutAdherenceHistory } from "@/lib/workoutAdherenceHistoryService";
import {
  addCalendarDaysYmd,
  diffCalendarDaysYmd,
  normalizeClientTimezone,
  zonedCalendarDateString,
} from "@/lib/clientZonedCalendar";
import {
  notifyClientWorkoutDue,
  notifyClientWorkoutMissed,
  notifyCoachWorkoutMissedThreshold,
  notifyCoachClientInactive,
} from "@/lib/inAppNotificationEvents";

/** Days without a completed session before coach gets inactive. */
export const INACTIVE_DAYS = 7;
/** Missed scheduled days in a rolling week before coach alert. */
export const COACH_MISSED_THRESHOLD = 2;
/** How far back to scan for missed days (covers a missed cron day). */
const MISS_LOOKBACK_DAYS = 7;
/** History window for inactive + rolling missed. */
const HISTORY_LOOKBACK_DAYS = 21;

export type ScheduledNotificationRunResult = {
  clientsScanned: number;
  due: number;
  clientMissed: number;
  coachMissed: number;
  inactive: number;
  errors: number;
};

function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase admin env for scheduled notifications");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function dayWasTrained(d: {
  scheduled: number;
  completed: number;
  value: number | null;
}): boolean {
  return (d.value != null && d.value > 0) || d.completed > 0;
}

function dayWasMissed(d: {
  date: string;
  scheduled: number;
  completed: number;
  value: number | null;
}, todayYmd: string): boolean {
  return (
    d.date < todayYmd &&
    d.scheduled > 0 &&
    d.completed < d.scheduled &&
    (d.value == null || d.value < 1)
  );
}

async function processClient(
  admin: SupabaseClient,
  client: { client_id: string; coach_id: string; first_name: string | null; timezone: string | null }
): Promise<{
  due: number;
  clientMissed: number;
  coachMissed: number;
  inactive: number;
}> {
  const counts = { due: 0, clientMissed: 0, coachMissed: 0, inactive: 0 };
  const clientId = client.client_id;
  const coachId = client.coach_id;
  const clientName = client.first_name?.trim() || "Client";
  const tz = normalizeClientTimezone(client.timezone);

  const todayYmd = zonedCalendarDateString(new Date(), tz);
  const yesterdayYmd = addCalendarDaysYmd(todayYmd, -1);
  const historyStart = addCalendarDaysYmd(todayYmd, -HISTORY_LOOKBACK_DAYS);

  // Active program assignment required (paused still counts as assigned).
  const { data: activeAssignment } = await admin
    .from("program_assignments")
    .select("id")
    .eq("client_id", clientId)
    .in("status", ["active", "paused"])
    .limit(1)
    .maybeSingle();

  if (!activeAssignment) {
    return counts;
  }

  const history = await getWorkoutAdherenceHistory(clientId, {
    startDate: historyStart,
    endDate: todayYmd,
    db: admin,
  });

  const byDate = new Map(history.days.map((d) => [d.date, d]));

  // ── Due today (one max) ──────────────────────────────────────────────
  const today = byDate.get(todayYmd);
  if (
    today &&
    today.scheduled > 0 &&
    today.completed < today.scheduled
  ) {
    const created = await notifyClientWorkoutDue({
      clientId,
      dateYmd: todayYmd,
      admin,
    });
    if (created) counts.due += 1;
  }

  // ── Client missed: each past scheduled incomplete day (lookback) ─────
  const missStart = addCalendarDaysYmd(todayYmd, -MISS_LOOKBACK_DAYS);
  const rollingStart = addCalendarDaysYmd(todayYmd, -7);
  const missedInRollingWeek: string[] = [];
  for (const d of history.days) {
    if (d.date < missStart || d.date >= todayYmd) continue;
    if (!dayWasMissed(d, todayYmd)) continue;
    const created = await notifyClientWorkoutMissed({
      clientId,
      dateYmd: d.date,
      admin,
    });
    if (created) counts.clientMissed += 1;
    if (d.date >= rollingStart && d.date <= yesterdayYmd) {
      missedInRollingWeek.push(d.date);
    }
  }

  // ── Coach missed threshold (2+ in rolling 7 ending yesterday) ────────
  if (missedInRollingWeek.length >= COACH_MISSED_THRESHOLD) {
    const created = await notifyCoachWorkoutMissedThreshold({
      coachId,
      clientId,
      clientName,
      missedCount: missedInRollingWeek.length,
      weekEndYmd: yesterdayYmd,
      admin,
    });
    if (created) counts.coachMissed += 1;
  }

  // ── Inactive: no trained day in N days → one per spell ───────────────
  let lastTrainYmd: string | null = null;
  for (let i = history.days.length - 1; i >= 0; i--) {
    const d = history.days[i]!;
    if (d.date > yesterdayYmd) continue;
    if (dayWasTrained(d)) {
      lastTrainYmd = d.date;
      break;
    }
  }

  const daysInactive = lastTrainYmd
    ? diffCalendarDaysYmd(lastTrainYmd, todayYmd)
    : HISTORY_LOOKBACK_DAYS;

  if (daysInactive >= INACTIVE_DAYS) {
    const created = await notifyCoachClientInactive({
      coachId,
      clientId,
      clientName,
      inactiveDays: INACTIVE_DAYS,
      lastTrainYmd,
      admin,
    });
    if (created) counts.inactive += 1;
  }

  return counts;
}

/**
 * Run once daily. Safe to call repeatedly — de-dupe keys prevent duplicates.
 */
export async function runScheduledNotificationJob(
  adminClient?: SupabaseClient
): Promise<ScheduledNotificationRunResult> {
  const admin = adminClient ?? getAdminClient();
  const result: ScheduledNotificationRunResult = {
    clientsScanned: 0,
    due: 0,
    clientMissed: 0,
    coachMissed: 0,
    inactive: 0,
    errors: 0,
  };

  const { data: rows, error } = await admin
    .from("clients")
    .select("client_id, coach_id")
    .eq("status", "active");

  if (error) {
    console.error("[scheduledNotifications] list clients:", error);
    throw error;
  }

  const roster = rows ?? [];
  if (roster.length === 0) return result;

  const clientIds = roster.map((r) => r.client_id as string);
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, first_name, timezone")
    .in("id", clientIds);

  const profileById = new Map(
    (profiles ?? []).map((p) => [
      p.id as string,
      p as { id: string; first_name: string | null; timezone: string | null },
    ])
  );

  for (const row of roster) {
    const clientId = row.client_id as string;
    const coachId = row.coach_id as string;
    if (!clientId || !coachId) continue;
    result.clientsScanned += 1;
    try {
      const profile = profileById.get(clientId);
      const counts = await processClient(admin, {
        client_id: clientId,
        coach_id: coachId,
        first_name: profile?.first_name ?? null,
        timezone: profile?.timezone ?? null,
      });
      result.due += counts.due;
      result.clientMissed += counts.clientMissed;
      result.coachMissed += counts.coachMissed;
      result.inactive += counts.inactive;
    } catch (e) {
      result.errors += 1;
      console.error(
        `[scheduledNotifications] client ${clientId} failed:`,
        e
      );
    }
  }

  return result;
}
