/**
 * Coach per-exercise diagnostic: weekly volume, avg load/set, est 1RM —
 * indexed to 100 at window start. No %1RM / moving-denominator intensity.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateOneRM,
  isEst1RmEligibleExercise,
  DEFAULT_TIME_RANGES,
  type StrengthTimeRange,
} from "@/lib/strengthAnalytics";
import {
  addCalendarDaysYmd,
  mondayYmdOfZonedWeekContaining,
  normalizeClientTimezone,
  zonedCalendarDateString,
} from "@/lib/clientZonedCalendar";

export type DiagnosticTimeRange = Extract<
  StrengthTimeRange,
  "3M" | "6M" | "1Y" | "ALL"
>;

export type DiagnosticExerciseOption = {
  id: string;
  name: string;
  lastTrained: string;
  sessionCount: number;
  category: string | null;
  primaryMuscleGroupId: string | null;
  strengthEligible: boolean;
};

export type DiagnosticWeekPoint = {
  weekStart: string;
  /** null = no sessions that week (gap) */
  volumeKg: number | null;
  avgLoadKg: number | null;
  estOneRmKg: number | null;
  volumeIndex: number | null;
  avgLoadIndex: number | null;
  strengthIndex: number | null;
  sets: number;
  sessions: number;
};

export type DiagnosticPrMarker = {
  date: string;
  weekStart: string;
  recordType: string;
  value: number;
};

export type CoachExerciseDiagnosticPayload = {
  exerciseId: string;
  exerciseName: string;
  strengthEligible: boolean;
  strengthOmitReason: string | null;
  timeRange: DiagnosticTimeRange;
  weeksWithData: number;
  enoughData: boolean;
  weeks: DiagnosticWeekPoint[];
  prMarkers: DiagnosticPrMarker[];
};

function bestEstimatedOneRMFromSets(
  sets: { weight: number; reps: number }[],
): number {
  let best = 0;
  for (const s of sets) {
    if (s.reps > 12) continue;
    const e1rm = calculateOneRM(s.weight, s.reps);
    if (e1rm > best) best = e1rm;
  }
  if (best > 0) return best;
  for (const s of sets) {
    const e1rm = calculateOneRM(s.weight, s.reps);
    if (e1rm > best) best = e1rm;
  }
  return best;
}

function dateKeyFromCompletedAt(iso: string | null, timeZone: string): string {
  if (!iso) {
    return zonedCalendarDateString(new Date(), timeZone);
  }
  return zonedCalendarDateString(new Date(iso), timeZone);
}

function indexFromBaseline(value: number, baseline: number): number {
  if (!(baseline > 0) || !Number.isFinite(baseline) || !Number.isFinite(value)) {
    return 100;
  }
  return Math.round((value / baseline) * 1000) / 10;
}

function firstPositive(
  weeks: { weekStart: string; value: number | null }[],
): number | null {
  for (const w of weeks) {
    if (w.value != null && w.value > 0) return w.value;
  }
  return null;
}

/** Pure: session rows → continuous weekly points with gaps + indexes. */
export function buildDiagnosticWeeks(args: {
  sessions: Array<{
    date: string;
    volumeKg: number;
    setCount: number;
    estOneRmKg: number;
  }>;
  timeZone: string;
  timeRange: DiagnosticTimeRange;
  now?: Date;
}): DiagnosticWeekPoint[] {
  const now = args.now ?? new Date();
  const tz = normalizeClientTimezone(args.timeZone);
  const days = DEFAULT_TIME_RANGES[args.timeRange];
  const todayYmd = zonedCalendarDateString(now, tz);
  const endMonday = mondayYmdOfZonedWeekContaining(now, tz);

  let startMonday: string;
  if (args.timeRange === "ALL" || days >= 9999) {
    if (args.sessions.length === 0) return [];
    const earliest = args.sessions.map((s) => s.date).sort()[0]!;
    startMonday = mondayYmdOfZonedWeekContaining(
      new Date(`${earliest}T12:00:00.000Z`),
      tz,
    );
  } else {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffYmd = zonedCalendarDateString(cutoff, tz);
    startMonday = mondayYmdOfZonedWeekContaining(
      new Date(`${cutoffYmd}T12:00:00.000Z`),
      tz,
    );
  }

  type Acc = {
    volumeKg: number;
    setCount: number;
    estOneRmKg: number;
    sessionDates: Set<string>;
  };
  const byWeek = new Map<string, Acc>();

  for (const s of args.sessions) {
    if (s.date < startMonday || s.date > todayYmd) continue;
    const weekStart = mondayYmdOfZonedWeekContaining(
      new Date(`${s.date}T12:00:00.000Z`),
      tz,
    );
    if (!byWeek.has(weekStart)) {
      byWeek.set(weekStart, {
        volumeKg: 0,
        setCount: 0,
        estOneRmKg: 0,
        sessionDates: new Set(),
      });
    }
    const acc = byWeek.get(weekStart)!;
    acc.volumeKg += s.volumeKg;
    acc.setCount += s.setCount;
    acc.estOneRmKg = Math.max(acc.estOneRmKg, s.estOneRmKg);
    acc.sessionDates.add(s.date);
  }

  const raw: Array<{
    weekStart: string;
    volumeKg: number | null;
    avgLoadKg: number | null;
    estOneRmKg: number | null;
    sets: number;
    sessions: number;
  }> = [];

  for (
    let cursor = startMonday;
    cursor <= endMonday;
    cursor = addCalendarDaysYmd(cursor, 7)
  ) {
    const acc = byWeek.get(cursor);
    if (!acc || acc.setCount <= 0) {
      raw.push({
        weekStart: cursor,
        volumeKg: null,
        avgLoadKg: null,
        estOneRmKg: null,
        sets: 0,
        sessions: 0,
      });
      continue;
    }
    const avgLoadKg =
      acc.setCount > 0
        ? Math.round((acc.volumeKg / acc.setCount) * 10) / 10
        : null;
    raw.push({
      weekStart: cursor,
      volumeKg: Math.round(acc.volumeKg * 10) / 10,
      avgLoadKg,
      estOneRmKg:
        acc.estOneRmKg > 0 ? Math.round(acc.estOneRmKg * 10) / 10 : null,
      sets: acc.setCount,
      sessions: acc.sessionDates.size,
    });
  }

  const volBase = firstPositive(raw.map((w) => ({ weekStart: w.weekStart, value: w.volumeKg })));
  const loadBase = firstPositive(
    raw.map((w) => ({ weekStart: w.weekStart, value: w.avgLoadKg })),
  );
  const strBase = firstPositive(
    raw.map((w) => ({ weekStart: w.weekStart, value: w.estOneRmKg })),
  );

  return raw.map((w) => ({
    weekStart: w.weekStart,
    volumeKg: w.volumeKg,
    avgLoadKg: w.avgLoadKg,
    estOneRmKg: w.estOneRmKg,
    volumeIndex:
      w.volumeKg != null && volBase != null
        ? indexFromBaseline(w.volumeKg, volBase)
        : null,
    avgLoadIndex:
      w.avgLoadKg != null && loadBase != null
        ? indexFromBaseline(w.avgLoadKg, loadBase)
        : null,
    strengthIndex:
      w.estOneRmKg != null && strBase != null
        ? indexFromBaseline(w.estOneRmKg, strBase)
        : null,
    sets: w.sets,
    sessions: w.sessions,
  }));
}

export async function listCoachDiagnosticExercises(
  supabase: SupabaseClient,
  clientId: string,
): Promise<DiagnosticExerciseOption[]> {
  const { data: setLogs, error } = await supabase
    .from("workout_set_logs")
    .select(
      `
      exercise_id,
      completed_at,
      exercises (
        id,
        name,
        category,
        primary_muscle_group_id
      )
    `,
    )
    .eq("client_id", clientId)
    .not("weight", "is", null)
    .gt("weight", 0);

  if (error || !setLogs?.length) return [];

  const byExercise = new Map<
    string,
    {
      name: string;
      lastDate: string;
      count: number;
      category: string | null;
      primaryMuscleGroupId: string | null;
    }
  >();

  for (const row of setLogs as Array<{
    exercise_id: string | null;
    completed_at: string | null;
    exercises:
      | {
          id?: string;
          name?: string;
          category?: string | null;
          primary_muscle_group_id?: string | null;
        }
      | Array<{
          id?: string;
          name?: string;
          category?: string | null;
          primary_muscle_group_id?: string | null;
        }>
      | null;
  }>) {
    const ex = Array.isArray(row.exercises) ? row.exercises[0] : row.exercises;
    const id = ex?.id ?? row.exercise_id;
    const name = ex?.name ?? "Unknown";
    if (!id) continue;
    const category = ex?.category ?? null;
    const primaryMuscleGroupId = ex?.primary_muscle_group_id ?? null;
    const dateStr = row.completed_at
      ? row.completed_at.split("T")[0]!
      : "";
    if (!byExercise.has(id)) {
      byExercise.set(id, {
        name,
        lastDate: dateStr,
        count: 0,
        category,
        primaryMuscleGroupId,
      });
    }
    const entry = byExercise.get(id)!;
    entry.count += 1;
    if (dateStr > entry.lastDate) entry.lastDate = dateStr;
  }

  return Array.from(byExercise.entries())
    .map(([id, e]) => ({
      id,
      name: e.name,
      lastTrained: e.lastDate,
      sessionCount: e.count,
      category: e.category,
      primaryMuscleGroupId: e.primaryMuscleGroupId,
      strengthEligible: isEst1RmEligibleExercise({
        category: e.category,
        primaryMuscleGroupId: e.primaryMuscleGroupId,
      }),
    }))
    .sort((a, b) => b.lastTrained.localeCompare(a.lastTrained));
}

export async function fetchCoachExerciseDiagnostic(
  supabase: SupabaseClient,
  args: {
    clientId: string;
    exerciseId: string;
    timeRange: DiagnosticTimeRange;
    timeZone?: string | null;
  },
): Promise<CoachExerciseDiagnosticPayload | null> {
  const tz = normalizeClientTimezone(args.timeZone ?? "UTC");

  const { data: setLogs, error } = await supabase
    .from("workout_set_logs")
    .select(
      `
      weight,
      reps,
      completed_at,
      exercises (
        id,
        name,
        category,
        primary_muscle_group_id
      )
    `,
    )
    .eq("client_id", args.clientId)
    .eq("exercise_id", args.exerciseId)
    .not("weight", "is", null)
    .gt("weight", 0)
    .order("completed_at", { ascending: true });

  if (error) throw new Error(error.message);
  if (!setLogs?.length) return null;

  const firstEx = (setLogs[0] as { exercises?: unknown }).exercises;
  const exObj = Array.isArray(firstEx) ? firstEx[0] : firstEx;
  const exerciseMeta = exObj as
    | {
        id?: string;
        name?: string;
        category?: string | null;
        primary_muscle_group_id?: string | null;
      }
    | undefined;

  const exerciseName = exerciseMeta?.name ?? "Unknown";
  const strengthEligible = isEst1RmEligibleExercise({
    category: exerciseMeta?.category ?? null,
    primaryMuscleGroupId: exerciseMeta?.primary_muscle_group_id ?? null,
  });

  const byDate = new Map<
    string,
    { weight: number; reps: number; volume: number }[]
  >();

  for (const row of setLogs as Array<{
    weight: number | null;
    reps: number | null;
    completed_at: string | null;
  }>) {
    const w = Number(row.weight) || 0;
    const r = Math.max(0, Math.floor(Number(row.reps) || 0));
    if (w <= 0) continue;
    const date = dateKeyFromCompletedAt(row.completed_at, tz);
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push({ weight: w, reps: r, volume: w * r });
  }

  const sessions = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, sets]) => {
      const volumeKg = sets.reduce((s, x) => s + x.volume, 0);
      const setCount = sets.length;
      const estOneRmKg = bestEstimatedOneRMFromSets(sets);
      return { date, volumeKg, setCount, estOneRmKg };
    });

  const weeks = buildDiagnosticWeeks({
    sessions,
    timeZone: tz,
    timeRange: args.timeRange,
  });

  const weeksWithData = weeks.filter((w) => w.sessions > 0).length;

  const { data: prRows } = await supabase
    .from("personal_records")
    .select("achieved_date, record_type, record_value")
    .eq("client_id", args.clientId)
    .eq("exercise_id", args.exerciseId)
    .order("achieved_date", { ascending: true });

  const weekStarts = new Set(weeks.map((w) => w.weekStart));
  const prMarkers: DiagnosticPrMarker[] = [];
  for (const pr of (prRows ?? []) as Array<{
    achieved_date: string;
    record_type: string;
    record_value: number;
  }>) {
    const date = String(pr.achieved_date).slice(0, 10);
    const weekStart = mondayYmdOfZonedWeekContaining(
      new Date(`${date}T12:00:00.000Z`),
      tz,
    );
    if (!weekStarts.has(weekStart)) continue;
    prMarkers.push({
      date,
      weekStart,
      recordType: String(pr.record_type ?? ""),
      value: Number(pr.record_value) || 0,
    });
  }

  return {
    exerciseId: args.exerciseId,
    exerciseName,
    strengthEligible,
    strengthOmitReason: strengthEligible
      ? null
      : "Est. 1RM needs a primary muscle tag and isn’t used for athletic-development moves.",
    timeRange: args.timeRange,
    weeksWithData,
    enoughData: weeksWithData >= 3,
    weeks: strengthEligible
      ? weeks
      : weeks.map((w) => ({
          ...w,
          estOneRmKg: null,
          strengthIndex: null,
        })),
    prMarkers,
  };
}
