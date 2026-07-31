/**
 * Load CoachAttentionSignals for a roster (service-role or user client).
 * Reuses adherence history math (same as notifications cron) without sending notifications.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getWorkoutAdherenceHistory } from "@/lib/workoutAdherenceHistoryService";
import {
  addCalendarDaysYmd,
  diffCalendarDaysYmd,
  normalizeClientTimezone,
  zonedCalendarDateString,
} from "@/lib/clientZonedCalendar";
import { fetchCoachClientListTrainingPayload } from "@/lib/coachClientListTrainingStatus";
import { batchAdherenceForWorkoutLogs } from "@/lib/coachClientSummaryServer";
import { dbToUiScale } from "@/lib/wellnessService";
import {
  COACH_ATTENTION_THRESHOLDS,
} from "./thresholds";
import type { CoachAttentionSignals } from "./classifyCoachClientAttention";

type ProfileLite = { timezone?: string | null };

function dayWasTrained(d: {
  scheduled: number;
  completed: number;
  value: number | null;
}): boolean {
  return (d.value != null && d.value > 0) || d.completed > 0;
}

function dayWasMissed(
  d: { date: string; scheduled: number; completed: number; value: number | null },
  todayYmd: string
): boolean {
  return (
    d.date < todayYmd &&
    d.scheduled > 0 &&
    d.completed < d.scheduled &&
    (d.value == null || d.value < 1)
  );
}

function avg(
  nums: number[]
): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function trendHigherBetter(
  recent: number | null,
  prior: number | null,
  pctThreshold: number
): "improving" | "stable" | "declining" | null {
  if (recent == null || prior == null || prior === 0) return null;
  const change = ((recent - prior) / prior) * 100;
  if (change > pctThreshold) return "improving";
  if (change < -pctThreshold) return "declining";
  return "stable";
}

function trendLowerBetter(
  recent: number | null,
  prior: number | null,
  pctThreshold: number
): "improving" | "stable" | "worsening" | null {
  if (recent == null || prior == null || prior === 0) return null;
  const change = ((recent - prior) / prior) * 100;
  if (change < -pctThreshold) return "improving";
  if (change > pctThreshold) return "worsening";
  return "stable";
}

/**
 * Derive adherence-based fields for one client (pure).
 */
export function signalsFromAdherenceHistory(
  days: Array<{
    date: string;
    scheduled: number;
    completed: number;
    value: number | null;
  }>,
  todayYmd: string,
  rollingMissedDays = COACH_ATTENTION_THRESHOLDS.rollingMissedDays
): Pick<
  CoachAttentionSignals,
  | "missedScheduledDaysLast7"
  | "daysSinceLastSession"
  | "hadScheduledWorkInWindow"
> {
  const rollingStart = addCalendarDaysYmd(todayYmd, -rollingMissedDays);
  let missed = 0;
  let hadScheduled = false;
  let lastTrainYmd: string | null = null;

  for (const d of days) {
    if (d.scheduled > 0) hadScheduled = true;
    if (d.date >= rollingStart && d.date < todayYmd && dayWasMissed(d, todayYmd)) {
      missed += 1;
    }
    if (d.date <= todayYmd && dayWasTrained(d)) {
      if (!lastTrainYmd || d.date > lastTrainYmd) lastTrainYmd = d.date;
    }
  }

  const daysSinceLastSession =
    lastTrainYmd != null ? diffCalendarDaysYmd(lastTrainYmd, todayYmd) : null;

  return {
    missedScheduledDaysLast7: missed,
    daysSinceLastSession,
    hadScheduledWorkInWindow: hadScheduled,
  };
}

export async function fetchCoachAttentionSignalsBatch(
  db: SupabaseClient,
  clientIds: string[],
  profilesById?: Map<string, ProfileLite>
): Promise<Map<string, CoachAttentionSignals>> {
  const out = new Map<string, CoachAttentionSignals>();
  if (clientIds.length === 0) return out;

  const empty = (): CoachAttentionSignals => ({
    hasActiveAssignment: false,
    assignmentPaused: false,
    missedScheduledDaysLast7: 0,
    daysSinceLastSession: null,
    hadScheduledWorkInWindow: false,
    executionPct: null,
    sleepTrend: null,
    stressTrend: null,
    sorenessTrend: null,
    highStressRecent: false,
    hasMealPlan: false,
    nutritionAdherencePct: null,
    daysSinceLastCheckIn: null,
    prsLast7Days: 0,
    priorWeekMissedEntirely: false,
    currentWeekBehindSchedule: false,
  });

  for (const id of clientIds) out.set(id, empty());

  const profiles =
    profilesById ??
    (await (async () => {
      const { data } = await db
        .from("profiles")
        .select("id, timezone")
        .in("id", clientIds);
      return new Map(
        (data ?? []).map((p) => [
          p.id as string,
          { timezone: (p as { timezone?: string | null }).timezone },
        ])
      );
    })());

  const training = await fetchCoachClientListTrainingPayload(
    db,
    clientIds,
    profiles
  );

  const todayUtc = new Date().toISOString().slice(0, 10);
  const wellnessStart = addCalendarDaysYmd(todayUtc, -14);
  const prStart = addCalendarDaysYmd(todayUtc, -7);

  const [
    { data: mealPlans },
    { data: wellnessLogs },
    { data: prRows },
    { data: recentLogs },
  ] = await Promise.all([
    db
      .from("meal_plan_assignments")
      .select("client_id")
      .in("client_id", clientIds)
      .eq("is_active", true),
    db
      .from("daily_wellness_logs")
      .select(
        "client_id, log_date, sleep_hours, stress_level, soreness_level"
      )
      .in("client_id", clientIds)
      .gte("log_date", wellnessStart)
      .order("log_date", { ascending: true }),
    db
      .from("personal_records")
      .select("client_id, achieved_date")
      .in("client_id", clientIds)
      .gte("achieved_date", prStart),
    db
      .from("workout_logs")
      .select("id, client_id, completed_at")
      .in("client_id", clientIds)
      .not("completed_at", "is", null)
      .gte("completed_at", `${prStart}T00:00:00`),
  ]);

  const mealPlanClients = new Set(
    (mealPlans ?? []).map((r) => r.client_id as string)
  );

  const prCount = new Map<string, number>();
  for (const row of prRows ?? []) {
    const cid = (row as { client_id: string }).client_id;
    prCount.set(cid, (prCount.get(cid) ?? 0) + 1);
  }

  type WRow = {
    client_id: string;
    log_date: string;
    sleep_hours: number | null;
    stress_level: number | null;
    soreness_level: number | null;
  };
  const wellnessByClient = new Map<string, WRow[]>();
  for (const row of (wellnessLogs ?? []) as WRow[]) {
    const list = wellnessByClient.get(row.client_id) ?? [];
    list.push(row);
    wellnessByClient.set(row.client_id, list);
  }

  // Execution: up to 4 most recent logs per client in last 7d
  const logIdsByClient = new Map<string, string[]>();
  const logsSorted = [...(recentLogs ?? [])].sort((a, b) =>
    String(b.completed_at).localeCompare(String(a.completed_at))
  );
  for (const row of logsSorted) {
    const cid = row.client_id as string;
    const list = logIdsByClient.get(cid) ?? [];
    if (list.length >= 4) continue;
    list.push(row.id as string);
    logIdsByClient.set(cid, list);
  }

  const executionPctByClient = new Map<string, number | null>();
  const clientsWithLogs = clientIds.filter(
    (id) => (logIdsByClient.get(id)?.length ?? 0) > 0
  );
  const EXEC_CHUNK = 8;
  for (let i = 0; i < clientsWithLogs.length; i += EXEC_CHUNK) {
    const chunk = clientsWithLogs.slice(i, i + EXEC_CHUNK);
    await Promise.all(
      chunk.map(async (cid) => {
        const logIds = logIdsByClient.get(cid) ?? [];
        try {
          const byLog = await batchAdherenceForWorkoutLogs(db, cid, logIds);
          const pcts = Object.values(byLog)
            .map((v) => v.adherencePercent)
            .filter((p): p is number => p != null && Number.isFinite(p));
          executionPctByClient.set(
            cid,
            pcts.length > 0
              ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
              : null
          );
        } catch {
          executionPctByClient.set(cid, null);
        }
      })
    );
  }

  // Nutrition 7d: unique days with a meal completion / 7
  const nutritionPct = new Map<string, number | null>();
  if (mealPlanClients.size > 0) {
    const mealClientIds = [...mealPlanClients];
    const { data: completions } = await db
      .from("meal_completions")
      .select("client_id, date, completed_at")
      .in("client_id", mealClientIds)
      .gte("completed_at", `${prStart}T00:00:00`);
    const daysWithMeal = new Map<string, Set<string>>();
    for (const row of completions ?? []) {
      const cid = row.client_id as string;
      const day =
        (row.date as string | null)?.slice(0, 10) ||
        (row.completed_at
          ? String(row.completed_at).slice(0, 10)
          : null);
      if (!day) continue;
      const set = daysWithMeal.get(cid) ?? new Set();
      set.add(day);
      daysWithMeal.set(cid, set);
    }
    for (const cid of mealClientIds) {
      const n = daysWithMeal.get(cid)?.size ?? 0;
      nutritionPct.set(cid, Math.round((n / 7) * 100));
    }
  }

  // Adherence history per client with assignment (bounded parallelism)
  const withAssignment = clientIds.filter((id) => {
    const t = training.get(id);
    return t?.hasActiveProgram === true;
  });

  const CONCURRENCY = 4;
  for (let i = 0; i < withAssignment.length; i += CONCURRENCY) {
    const slice = withAssignment.slice(i, i + CONCURRENCY);
    await Promise.all(
      slice.map(async (clientId) => {
        const profile = profiles.get(clientId);
        const tz = normalizeClientTimezone(profile?.timezone);
        const todayYmd = zonedCalendarDateString(new Date(), tz);
        const startDate = addCalendarDaysYmd(
          todayYmd,
          -COACH_ATTENTION_THRESHOLDS.adherenceHistoryDays
        );
        try {
          const history = await getWorkoutAdherenceHistory(clientId, {
            startDate,
            endDate: todayYmd,
            db,
          });
          const derived = signalsFromAdherenceHistory(
            history.days,
            todayYmd
          );
          const t = training.get(clientId)!;
          const base = out.get(clientId)!;

          const wRows = wellnessByClient.get(clientId) ?? [];
          const lastCheckIn = wRows.length
            ? wRows[wRows.length - 1]!.log_date
            : null;
          const daysSinceLastCheckIn = lastCheckIn
            ? diffCalendarDaysYmd(lastCheckIn, todayYmd)
            : null;

          let highStressRecent = false;
          for (const w of wRows) {
            const stressUi =
              w.stress_level != null ? dbToUiScale(w.stress_level) : null;
            if (
              stressUi != null &&
              stressUi >= COACH_ATTENTION_THRESHOLDS.highStressUiMin
            ) {
              const age = diffCalendarDaysYmd(w.log_date, todayYmd);
              if (
                age <= COACH_ATTENTION_THRESHOLDS.highStressLookbackDays
              ) {
                highStressRecent = true;
                break;
              }
            }
          }

          // Trends: last 7 vs prior 7 by log_date relative to today
          const last7Start = addCalendarDaysYmd(todayYmd, -6);
          const prev7Start = addCalendarDaysYmd(todayYmd, -13);
          const prev7End = addCalendarDaysYmd(todayYmd, -7);
          const inLast7 = wRows.filter(
            (w) => w.log_date >= last7Start && w.log_date <= todayYmd
          );
          const inPrev7 = wRows.filter(
            (w) => w.log_date >= prev7Start && w.log_date <= prev7End
          );
          const sleepTrend = trendHigherBetter(
            avg(
              inLast7
                .map((w) =>
                  w.sleep_hours != null ? Number(w.sleep_hours) : null
                )
                .filter((n): n is number => n != null)
            ),
            avg(
              inPrev7
                .map((w) =>
                  w.sleep_hours != null ? Number(w.sleep_hours) : null
                )
                .filter((n): n is number => n != null)
            ),
            3
          );
          const stressTrend = trendLowerBetter(
            avg(
              inLast7
                .map((w) =>
                  w.stress_level != null
                    ? dbToUiScale(w.stress_level) ?? null
                    : null
                )
                .filter((n): n is number => n != null)
            ),
            avg(
              inPrev7
                .map((w) =>
                  w.stress_level != null
                    ? dbToUiScale(w.stress_level) ?? null
                    : null
                )
                .filter((n): n is number => n != null)
            ),
            5
          );
          const sorenessTrend = trendLowerBetter(
            avg(
              inLast7
                .map((w) =>
                  w.soreness_level != null
                    ? dbToUiScale(w.soreness_level) ?? null
                    : null
                )
                .filter((n): n is number => n != null)
            ),
            avg(
              inPrev7
                .map((w) =>
                  w.soreness_level != null
                    ? dbToUiScale(w.soreness_level) ?? null
                    : null
                )
                .filter((n): n is number => n != null)
            ),
            5
          );

          out.set(clientId, {
            ...base,
            hasActiveAssignment: true,
            assignmentPaused: t.pauseStatus === "paused",
            ...derived,
            executionPct: executionPctByClient.get(clientId) ?? null,
            sleepTrend,
            stressTrend,
            sorenessTrend,
            highStressRecent,
            hasMealPlan: mealPlanClients.has(clientId),
            nutritionAdherencePct: nutritionPct.get(clientId) ?? null,
            daysSinceLastCheckIn,
            prsLast7Days: prCount.get(clientId) ?? 0,
            priorWeekMissedEntirely:
              t.priorWeekScheduledCount > 0 &&
              t.priorWeekCompletedCount === 0 &&
              t.currentWeekCompletedCount === 0,
            currentWeekBehindSchedule:
              t.currentWeekCompletedCount < t.currentWeekScheduledPastCount,
          });
        } catch (e) {
          console.error(
            `[coachAttention] adherence load failed for ${clientId}:`,
            e
          );
        }
      })
    );
  }

  return out;
}
