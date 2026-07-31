/**
 * Consolidated coach roster insights: triage queues + period-scoped analysis.
 * Single batch of queries — used by /api/coach/insights/roster and /api/coach/home/triage.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  resolveInstanceWeeksForAssignments,
} from "@/lib/programInstanceResolver";
import {
  fetchCoachClientListTrainingPayload,
  type ClientTrainingStatusKind,
} from "@/lib/coachClientListTrainingStatus";
import { batchAdherenceForWorkoutLogs } from "@/lib/coachClientSummaryServer";
import { addCalendarDaysYmd } from "@/lib/clientZonedCalendar";
import {
  classifyCoachClientAttention,
  fetchCoachAttentionSignalsBatch,
  type CoachAttentionLevel,
  type CoachAttentionReason,
} from "@/lib/coachAttention";
import {
  batchRosterAdherenceHistory,
  buildWeeklyRosterBars,
  mondayOfYmd,
  sumAdherenceWindow,
  type WeeklyAdherenceBar,
} from "@/lib/coachInsightsAdherenceBatch";

export type InsightsPeriod = "4wk" | "12wk" | "6mo";

export type CoachTriageClient = {
  id: string;
  name: string;
  avatarUrl: string | null;
  level: CoachAttentionLevel;
  reasons: CoachAttentionReason[];
};

export type CoachInsightsRow = {
  clientId: string;
  name: string;
  avatarUrl: string | null;
  /** Period calendar adherence (completed ÷ scheduled) */
  adherencePct: number | null;
  adherenceCompleted: number;
  adherenceScheduled: number;
  /** Sets on target avg over period logs */
  executionPct: number | null;
  progressWeek: number | null;
  progressTotalWeeks: number | null;
  progressPct: number | null;
  prsThisWeek: number;
  volumeKg: number;
  trainingStatus: ClientTrainingStatusKind;
  hasActiveProgram: boolean;
};

export type StatDelta = {
  label: string;
  tone: "up" | "down" | "flat";
};

export type CoachInsightsSummary = {
  avgAdherencePct: number;
  onTrackCount: number;
  behindCount: number;
  prsThisWeek: number;
  activeClientCount: number;
  /** Insights strip (period-aware) */
  sessionsLogged?: number;
  onTrackOfTotal?: string;
  withoutProgramCount?: number;
  deltas?: {
    avgAdherence: StatDelta;
    sessionsLogged: StatDelta;
    onTrack: StatDelta;
    prs: StatDelta;
    active: StatDelta;
  };
};

export type CoachInsightsDistribution = {
  onTrack: number;
  slipping: number;
  behind: number;
  noProgram: number;
  total: number;
};

export type CoachInsightsTriage = {
  needsAttention: CoachTriageClient[];
  monitor: CoachTriageClient[];
  onTrack: CoachTriageClient[];
  counts: {
    needsAttention: number;
    monitor: number;
    onTrack: number;
  };
};

export type CoachInsightsBriefing = {
  clientsTrainedToday: number;
  activeClients: number;
  clientsCheckedInToday: number;
};

export type CoachInsightsBundle = {
  period: InsightsPeriod;
  summary: CoachInsightsSummary;
  rows: CoachInsightsRow[];
  weeklyTrend: WeeklyAdherenceBar[];
  distribution: CoachInsightsDistribution;
  triage: CoachInsightsTriage;
  briefing: CoachInsightsBriefing;
};

type WellnessRow = {
  client_id: string;
  log_date: string;
  energy_level: number | null;
  stress_level: number | null;
};

function clientName(p: {
  first_name?: string | null;
  last_name?: string | null;
}): string {
  return `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Client";
}

const emptyTriage = (): CoachInsightsTriage => ({
  needsAttention: [],
  monitor: [],
  onTrack: [],
  counts: { needsAttention: 0, monitor: 0, onTrack: 0 },
});

function weeksForPeriod(period: InsightsPeriod): number {
  if (period === "4wk") return 4;
  if (period === "12wk") return 12;
  return 26;
}

function periodLabel(period: InsightsPeriod): string {
  if (period === "4wk") return "4 wk";
  if (period === "12wk") return "12 wk";
  return "6 mo";
}

function deltaPts(curr: number, prev: number): StatDelta {
  const d = curr - prev;
  if (d === 0) return { label: "— same as prev", tone: "flat" };
  if (d > 0) return { label: `▲ ${d} pts vs prev`, tone: "up" };
  return { label: `▼ ${Math.abs(d)} pts vs prev`, tone: "down" };
}

function deltaCount(curr: number, prev: number, unit = ""): StatDelta {
  const d = curr - prev;
  const suffix = unit ? ` ${unit}` : "";
  if (d === 0) return { label: "— same as prev", tone: "flat" };
  if (d > 0) return { label: `▲ ${d}${suffix} vs prev`, tone: "up" };
  return { label: `▼ ${Math.abs(d)}${suffix} vs prev`, tone: "down" };
}

export async function buildCoachInsightsBundle(
  supabase: SupabaseClient,
  coachId: string,
  options?: { period?: InsightsPeriod; mode?: "insights" | "triage" },
): Promise<CoachInsightsBundle> {
  const period: InsightsPeriod = options?.period ?? "12wk";
  const mode = options?.mode ?? (options?.period ? "insights" : "triage");
  const insightsMode = mode === "insights";
  const empty: CoachInsightsBundle = {
    period,
    summary: {
      avgAdherencePct: 0,
      onTrackCount: 0,
      behindCount: 0,
      prsThisWeek: 0,
      activeClientCount: 0,
      sessionsLogged: 0,
      onTrackOfTotal: "0/0",
      withoutProgramCount: 0,
    },
    rows: [],
    weeklyTrend: [],
    distribution: { onTrack: 0, slipping: 0, behind: 0, noProgram: 0, total: 0 },
    triage: emptyTriage(),
    briefing: { clientsTrainedToday: 0, activeClients: 0, clientsCheckedInToday: 0 },
  };

  const { data: clientsRows, error: clientsError } = await supabase
    .from("clients")
    .select("id, client_id, status")
    .eq("coach_id", coachId);

  if (clientsError) {
    console.error("[coachInsightsBundle] clients query failed:", clientsError.message);
    return empty;
  }
  if (!clientsRows?.length) {
    return empty;
  }

  const clientIds = clientsRows.map((c) => c.client_id as string);
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const weekCount = weeksForPeriod(period);
  const currentMonday = mondayOfYmd(today);
  const periodStart = addCalendarDaysYmd(currentMonday, -((weekCount - 1) * 7));
  const periodEnd = today;
  const prevEnd = addCalendarDaysYmd(periodStart, -1);
  const prevStart = addCalendarDaysYmd(prevEnd, -(weekCount * 7 - 1));
  const historyStart = prevStart;

  const weekStarts: string[] = [];
  for (let i = 0; i < weekCount; i++) {
    weekStarts.push(addCalendarDaysYmd(periodStart, i * 7));
  }

  const [
    { data: profiles },
    { data: wellnessLogs },
    { data: workoutLogs },
    { data: programAssignmentsRows },
    { data: prRows },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, first_name, last_name, timezone, avatar_url")
      .in("id", clientIds),
    supabase
      .from("daily_wellness_logs")
      .select("client_id, log_date, energy_level, stress_level")
      .in("client_id", clientIds),
    supabase
      .from("workout_logs")
      .select("id, client_id, completed_at")
      .in("client_id", clientIds)
      .not("completed_at", "is", null)
      .gte("completed_at", `${historyStart}T00:00:00`),
    supabase
      .from("program_assignments")
      .select(
        "id, client_id, program_id, start_date, pause_accumulated_days, pause_status, paused_at, timezone_snapshot, status, updated_at",
      )
      .in("client_id", clientIds)
      .eq("status", "active")
      .order("updated_at", { ascending: false }),
    supabase
      .from("personal_records")
      .select("client_id, achieved_at")
      .in("client_id", clientIds)
      .gte("achieved_at", `${historyStart}T00:00:00`),
  ]);

  type ProfileRow = {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    timezone?: string | null;
    avatar_url?: string | null;
  };
  const profileMap = new Map<string, ProfileRow>(
    (profiles ?? []).map((p) => [p.id as string, p as ProfileRow]),
  );

  const wellnessByClient: Record<string, WellnessRow[]> = {};
  for (const row of wellnessLogs ?? []) {
    const r = row as WellnessRow;
    if (!wellnessByClient[r.client_id]) wellnessByClient[r.client_id] = [];
    wellnessByClient[r.client_id].push(r);
  }

  type WorkoutRow = { id: string; client_id: string; completed_at: string };
  const workoutsByClient: Record<string, WorkoutRow[]> = {};
  for (const row of workoutLogs ?? []) {
    const r = row as WorkoutRow;
    if (!workoutsByClient[r.client_id]) workoutsByClient[r.client_id] = [];
    workoutsByClient[r.client_id].push(r);
  }

  type ActiveAssignment = {
    id: string;
    client_id: string;
    program_id: string;
    start_date: string | null;
    pause_accumulated_days: number | null;
    pause_status: string | null;
    paused_at: string | null;
    timezone_snapshot: string | null;
  };
  const assignmentByClientId = new Map<string, ActiveAssignment>();
  for (const row of programAssignmentsRows ?? []) {
    const cid = (row as ActiveAssignment).client_id;
    if (!assignmentByClientId.has(cid)) {
      assignmentByClientId.set(cid, row as ActiveAssignment);
    }
  }

  const assignmentIdsAll = [...assignmentByClientId.values()].map((pa) => pa.id);
  const weekByAssign = await resolveInstanceWeeksForAssignments(
    supabase,
    assignmentIdsAll,
  );

  const trainingPayload = await fetchCoachClientListTrainingPayload(
    supabase,
    clientIds,
    profileMap,
  );

  const attentionSignals = await fetchCoachAttentionSignalsBatch(
    supabase,
    clientIds,
    profileMap,
  );

  const daysByClient = insightsMode
    ? await batchRosterAdherenceHistory(
        supabase,
        clientIds,
        profileMap,
        historyStart,
        periodEnd,
      )
    : new Map();

  const weeklyTrend = insightsMode
    ? buildWeeklyRosterBars(daysByClient, weekStarts, today)
    : [];

  // Period log ids (for volume + execution) — cap 24 most recent per client
  const periodLogIdsByClient = new Map<string, string[]>();
  let sessionsLogged = 0;
  let sessionsPrev = 0;
  if (insightsMode) {
    for (const cid of clientIds) {
      const logs = (workoutsByClient[cid] ?? [])
        .filter((l) => {
          const ymd = l.completed_at.slice(0, 10);
          return ymd >= periodStart && ymd <= periodEnd;
        })
        .sort((a, b) => b.completed_at.localeCompare(a.completed_at));
      sessionsLogged += logs.length;
      const prevLogs = (workoutsByClient[cid] ?? []).filter((l) => {
        const ymd = l.completed_at.slice(0, 10);
        return ymd >= prevStart && ymd <= prevEnd;
      });
      sessionsPrev += prevLogs.length;
      periodLogIdsByClient.set(
        cid,
        logs.slice(0, 24).map((l) => l.id),
      );
    }
  }

  const allPeriodLogIds = [...periodLogIdsByClient.values()].flat();
  const volumeByClient = new Map<string, number>();
  clientIds.forEach((id) => volumeByClient.set(id, 0));

  if (insightsMode && allPeriodLogIds.length > 0) {
    const { data: setRows } = await supabase
      .from("workout_set_logs")
      .select("workout_log_id, weight, reps")
      .in("workout_log_id", allPeriodLogIds);

    const logToClient = new Map<string, string>();
    for (const cid of clientIds) {
      for (const lid of periodLogIdsByClient.get(cid) ?? []) {
        logToClient.set(lid, cid);
      }
    }
    for (const row of setRows ?? []) {
      const lid = (row as { workout_log_id: string }).workout_log_id;
      const cid = logToClient.get(lid);
      if (!cid) continue;
      const w = Number((row as { weight?: number }).weight) || 0;
      const r = Number((row as { reps?: number }).reps) || 0;
      volumeByClient.set(cid, (volumeByClient.get(cid) ?? 0) + w * r);
    }
  }

  const executionByClient = new Map<string, number | null>();
  if (insightsMode) {
    const clientsWithLogs = clientIds.filter(
      (id) => (periodLogIdsByClient.get(id)?.length ?? 0) > 0,
    );
    const EXEC_CHUNK = 8;
    for (let i = 0; i < clientsWithLogs.length; i += EXEC_CHUNK) {
      const chunk = clientsWithLogs.slice(i, i + EXEC_CHUNK);
      await Promise.all(
        chunk.map(async (cid) => {
          const logIds = periodLogIdsByClient.get(cid) ?? [];
          try {
            const byLog = await batchAdherenceForWorkoutLogs(supabase, cid, logIds);
            const pcts = Object.values(byLog)
              .map((v) => v.adherencePercent)
              .filter((p): p is number => p != null && Number.isFinite(p));
            executionByClient.set(
              cid,
              pcts.length > 0
                ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
                : null,
            );
          } catch {
            executionByClient.set(cid, null);
          }
        }),
      );
    }
  }
  for (const cid of clientIds) {
    if (!executionByClient.has(cid)) executionByClient.set(cid, null);
  }

  const prCountPeriod = new Map<string, number>();
  const prCountPrev = new Map<string, number>();
  let totalPrs = 0;
  let totalPrsPrev = 0;
  for (const row of prRows ?? []) {
    const cid = (row as { client_id: string }).client_id;
    const at = String((row as { achieved_at: string }).achieved_at).slice(0, 10);
    if (at >= periodStart && at <= periodEnd) {
      prCountPeriod.set(cid, (prCountPeriod.get(cid) ?? 0) + 1);
      totalPrs += 1;
    } else if (at >= prevStart && at <= prevEnd) {
      prCountPrev.set(cid, (prCountPrev.get(cid) ?? 0) + 1);
      totalPrsPrev += 1;
    }
  }

  const rows: CoachInsightsRow[] = [];
  const triageNeedsAttention: CoachTriageClient[] = [];
  const triageMonitor: CoachTriageClient[] = [];
  const triageOnTrack: CoachTriageClient[] = [];

  let trainedToday = 0;
  let checkedInToday = 0;
  let adherenceSum = 0;
  let adherenceN = 0;
  let prevAdherenceSum = 0;
  let prevAdherenceN = 0;
  let onTrackBucket = 0;
  let slippingBucket = 0;
  let behindBucket = 0;
  let noProgramBucket = 0;
  let behindAttention = 0;
  let prevOnTrack = 0;

  for (const client of clientsRows) {
    const clientId = client.client_id as string;
    const profile = profileMap.get(clientId);
    const name = profile ? clientName(profile) : "Client";
    const avatarUrl = profile?.avatar_url ?? null;
    const assignment = assignmentByClientId.get(clientId);
    const hasActiveProgram = !!assignment;
    const training = trainingPayload.get(clientId);
    const trainingStatus = training?.trainingStatus ?? "no_program";

    const days = daysByClient.get(clientId) ?? [];
    const periodAdh = sumAdherenceWindow(days, periodStart, periodEnd);
    const prevAdh = sumAdherenceWindow(days, prevStart, prevEnd);

    if (hasActiveProgram && periodAdh.pct != null) {
      adherenceSum += periodAdh.pct;
      adherenceN += 1;
    }
    if (hasActiveProgram && prevAdh.pct != null) {
      prevAdherenceSum += prevAdh.pct;
      prevAdherenceN += 1;
    }

    if (!hasActiveProgram) {
      noProgramBucket += 1;
    } else if (periodAdh.pct == null) {
      behindBucket += 1;
    } else if (periodAdh.pct >= 80) {
      onTrackBucket += 1;
    } else if (periodAdh.pct >= 50) {
      slippingBucket += 1;
    } else {
      behindBucket += 1;
    }

    if (hasActiveProgram && prevAdh.pct != null && prevAdh.pct >= 80) {
      prevOnTrack += 1;
    }

    const weekInfo = assignment ? weekByAssign.get(assignment.id) : null;
    const progressWeek = weekInfo?.currentWeek ?? null;
    const progressTotalWeeks = weekInfo?.totalWeeks ?? null;
    const progressPct =
      progressWeek != null && progressTotalWeeks != null && progressTotalWeeks > 0
        ? Math.min(100, Math.round((progressWeek / progressTotalWeeks) * 100))
        : null;

    const prs = prCountPeriod.get(clientId) ?? 0;
    const volumeKg = Math.round(volumeByClient.get(clientId) ?? 0);

    rows.push({
      clientId,
      name,
      avatarUrl,
      adherencePct: hasActiveProgram ? periodAdh.pct : null,
      adherenceCompleted: periodAdh.completed,
      adherenceScheduled: periodAdh.scheduled,
      executionPct: executionByClient.get(clientId) ?? null,
      progressWeek,
      progressTotalWeeks,
      progressPct,
      prsThisWeek: prs,
      volumeKg,
      trainingStatus,
      hasActiveProgram,
    });

    const wellness = wellnessByClient[clientId] ?? [];
    const sortedWellness = [...wellness].sort((a, b) =>
      a.log_date < b.log_date ? 1 : a.log_date > b.log_date ? -1 : 0,
    );
    const todaysLog = sortedWellness.find((w) => w.log_date === today);
    if (todaysLog) checkedInToday += 1;

    const wls = workoutsByClient[clientId] ?? [];
    if (wls.some((l) => l.completed_at?.slice(0, 10) === today)) {
      trainedToday += 1;
    }

    const signals = attentionSignals.get(clientId);
    const verdict = signals
      ? classifyCoachClientAttention(signals)
      : { level: "on_track" as const, reasons: [] };

    if (
      verdict.reasons.some(
        (r) =>
          r.code === "missed_sessions" ||
          r.code === "behind_schedule" ||
          r.code === "prior_week_missed",
      )
    ) {
      behindAttention += 1;
    }

    const triageRow: CoachTriageClient = {
      id: clientId,
      name,
      avatarUrl,
      level: verdict.level,
      reasons: verdict.reasons,
    };

    if (verdict.level === "needs_attention") {
      triageNeedsAttention.push(triageRow);
    } else if (verdict.level === "monitor") {
      triageMonitor.push(triageRow);
    } else if (hasActiveProgram) {
      triageOnTrack.push(triageRow);
    }
  }

  const byName = (a: CoachTriageClient, b: CoachTriageClient) =>
    a.name.localeCompare(b.name);
  triageNeedsAttention.sort(byName);
  triageMonitor.sort(byName);
  triageOnTrack.sort(byName);

  const activeClients = clientsRows.filter((c) => c.status === "active").length;
  const avgAdherence =
    adherenceN > 0 ? Math.round(adherenceSum / adherenceN) : 0;
  const prevAvgAdherence =
    prevAdherenceN > 0 ? Math.round(prevAdherenceSum / prevAdherenceN) : 0;

  const distTotal =
    onTrackBucket + slippingBucket + behindBucket + noProgramBucket;

  void periodLabel;

  return {
    period,
    summary: {
      avgAdherencePct: avgAdherence,
      onTrackCount: onTrackBucket,
      behindCount: behindAttention,
      prsThisWeek: totalPrs,
      activeClientCount: activeClients,
      sessionsLogged,
      onTrackOfTotal: `${onTrackBucket}/${clientIds.length}`,
      withoutProgramCount: noProgramBucket,
      deltas: {
        avgAdherence: deltaPts(avgAdherence, prevAvgAdherence),
        sessionsLogged: deltaCount(sessionsLogged, sessionsPrev),
        onTrack: deltaCount(onTrackBucket, prevOnTrack),
        prs: deltaCount(totalPrs, totalPrsPrev),
        active: {
          label:
            noProgramBucket > 0
              ? `${noProgramBucket} without a program`
              : "— same as prev",
          tone: "flat",
        },
      },
    },
    rows,
    weeklyTrend,
    distribution: {
      onTrack: onTrackBucket,
      slipping: slippingBucket,
      behind: behindBucket,
      noProgram: noProgramBucket,
      total: distTotal,
    },
    triage: {
      needsAttention: triageNeedsAttention.slice(0, 24),
      monitor: triageMonitor.slice(0, 24),
      onTrack: triageOnTrack.slice(0, 24),
      counts: {
        needsAttention: triageNeedsAttention.length,
        monitor: triageMonitor.length,
        onTrack: triageOnTrack.length,
      },
    },
    briefing: {
      clientsTrainedToday: trainedToday,
      activeClients,
      clientsCheckedInToday: checkedInToday,
    },
  };
}
