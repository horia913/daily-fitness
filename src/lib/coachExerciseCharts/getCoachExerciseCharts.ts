/**
 * Coach per-exercise Adherence + Progression aggregates.
 * One workout_set_logs pull per exercise; weeks rolled in memory.
 * No load / %1RM on adherence. Progression indexes to first in-window week = 100.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isEst1RmEligibleExercise,
  type StrengthTimeRange,
} from "@/lib/strengthAnalytics";
import {
  addCalendarDaysYmd,
  mondayYmdOfZonedWeekContaining,
  normalizeClientTimezone,
  zonedCalendarDateString,
} from "@/lib/clientZonedCalendar";
import {
  classifyRepsPrescription,
  emptyBucketCounts,
  repsMeetPrescription,
  type RepsBucketCounts,
} from "./parseRepsPrescription";

export type CoachExerciseChartRange = Extract<
  StrengthTimeRange,
  "3M" | "6M" | "1Y" | "ALL"
>;

export type CoachExerciseChartOption = {
  id: string;
  name: string;
  /** Earliest logged calendar date (YYYY-MM-DD) for this exercise. */
  firstTrained: string;
  lastTrained: string;
  sessionCount: number;
  category: string | null;
  primaryMuscleGroupId: string | null;
  /** Same rule as est-1RM eligibility — athletic_dev / missing MG. */
  strengthEligible: boolean;
};

export type CoachExercisePhaseBand = {
  id: string;
  name: string;
  color: string;
  weekStart: string;
  weekEnd: string;
};

export type CoachExerciseAdherencePoint = {
  weekStart: string;
  setsPct: number | null;
  repsPct: number | null;
  setsCompleted: number;
  setsPrescribed: number;
  repsMet: number;
  repsPrescribed: number;
  sessions: number;
  phaseName: string | null;
};

export type CoachExerciseProgressionPoint = {
  weekStart: string;
  topSetKg: number | null;
  setVolume: number | null;
  loadVolumeKg: number | null;
  topSetIndexed: number | null;
  setVolumeIndexed: number | null;
  loadVolumeIndexed: number | null;
  /** Heaviest set’s reps that week (for hover absolute). */
  topSetReps: number | null;
  sessions: number;
  phaseName: string | null;
};

export type CoachExercisePrMarker = {
  weekStart: string;
  achievedDate: string;
  weightKg: number;
  reps: number | null;
  topSetIndexed: number | null;
};

export type CoachExerciseChartsPayload = {
  exercise: CoachExerciseChartOption;
  range: CoachExerciseChartRange;
  /** Selected range’s calendar start (before clamp). */
  rangeStart: string;
  windowStart: string;
  windowEnd: string;
  /** True when leading empty weeks were trimmed from the selected range. */
  axisClamped: boolean;
  /** e.g. "Showing 7 weeks — no earlier data for this exercise." */
  axisNote: string | null;
  enoughData: boolean;
  weeksWithData: number;
  phaseBands: CoachExercisePhaseBand[];
  adherence: {
    available: boolean;
    unavailableReason: string | null;
    points: CoachExerciseAdherencePoint[];
    kpi: {
      currentSetsPct: number | null;
      currentRepsPct: number | null;
      deltaSetsPct: number | null;
      deltaRepsPct: number | null;
      sessionsMissed: number;
      sessionsScheduled: number;
    };
    repsBuckets: RepsBucketCounts;
  };
  progression: {
    available: boolean;
    unavailableReason: string | null;
    points: CoachExerciseProgressionPoint[];
    prMarkers: CoachExercisePrMarker[];
    kpi: {
      currentTopSetKg: number | null;
      deltaTopSetPct: number | null;
      baselineTopSetKg: number | null;
      currentSetVolume: number | null;
      deltaSetVolumePct: number | null;
      baselineSetVolume: number | null;
      currentLoadVolumeKg: number | null;
      deltaLoadVolumePct: number | null;
      baselineLoadVolumeKg: number | null;
      recordsSet: number;
      lastPrWeekLabel: string | null;
    };
  };
};

const PHASE_COLORS = ["#14B8A6", "#F97316", "#8B5CF6", "#2E7BFF", "#EC4899"];

const RANGE_MONTHS: Record<"3M" | "6M" | "1Y", number> = {
  "3M": 3,
  "6M": 6,
  "1Y": 12,
};

/** Shortest range whose start is still ≤ the exercise’s first data week. */
export function shortestFittingChartRange(
  firstDataYmd: string,
  now: Date = new Date(),
  timeZone = "UTC",
): CoachExerciseChartRange {
  const tz = normalizeClientTimezone(timeZone);
  const raw = firstDataYmd.slice(0, 10);
  if (!raw) return "3M";
  const firstMonday = mondayYmdOfZonedWeekContaining(
    new Date(`${raw}T12:00:00.000Z`),
    tz,
  );
  for (const r of ["3M", "6M", "1Y"] as const) {
    const startDate = new Date(now);
    startDate.setUTCMonth(startDate.getUTCMonth() - RANGE_MONTHS[r]);
    const rangeStart = mondayYmdOfZonedWeekContaining(startDate, tz);
    if (firstMonday >= rangeStart) return r;
  }
  return "ALL";
}

function mean(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function phaseNameAt(
  weekStart: string,
  bands: CoachExercisePhaseBand[],
): string | null {
  for (const b of bands) {
    if (weekStart >= b.weekStart && weekStart <= b.weekEnd) return b.name;
  }
  return null;
}

function weekKeysInclusive(fromYmd: string, toYmd: string): string[] {
  const keys: string[] = [];
  let cur = fromYmd;
  while (cur <= toYmd) {
    keys.push(cur);
    cur = addCalendarDaysYmd(cur, 7);
  }
  return keys;
}

function dateKeyFromCompletedAt(iso: string | null, timeZone: string): string {
  if (!iso) return zonedCalendarDateString(new Date(), timeZone);
  return zonedCalendarDateString(new Date(iso), timeZone);
}

type RxRow = { set_number: number; reps: string | null };

async function loadPhaseBands(
  supabase: SupabaseClient,
  clientId: string,
  windowStartYmd: string,
  windowEndYmd: string,
  timeZone: string,
): Promise<CoachExercisePhaseBand[]> {
  const { data: assignments } = await supabase
    .from("program_assignments")
    .select("id, start_date, status")
    .eq("client_id", clientId)
    .in("status", ["active", "completed", "paused"])
    .order("start_date", { ascending: false })
    .limit(8);

  if (!assignments?.length) return [];

  const ordered = [
    ...assignments.filter((a) => a.status === "active"),
    ...assignments.filter((a) => a.status !== "active"),
  ];

  for (const a of ordered) {
    const { data: phases } = await supabase
      .from("program_instance_phases")
      .select("id, name, phase_label, phase_order, duration_weeks")
      .eq("program_assignment_id", a.id)
      .order("phase_order", { ascending: true });

    if (!phases?.length) continue;

    const startRaw = a.start_date as string | null;
    if (!startRaw) continue;

    let cursorYmd = mondayYmdOfZonedWeekContaining(
      new Date(`${String(startRaw).slice(0, 10)}T12:00:00.000Z`),
      timeZone,
    );

    const bands: CoachExercisePhaseBand[] = [];
    for (let i = 0; i < phases.length; i++) {
      const p = phases[i]!;
      const weeks = Math.max(1, Number(p.duration_weeks) || 1);
      const weekStart = cursorYmd;
      const weekEnd = addCalendarDaysYmd(cursorYmd, (weeks - 1) * 7);
      if (weekEnd >= windowStartYmd && weekStart <= windowEndYmd) {
        const clippedStart =
          weekStart < windowStartYmd ? windowStartYmd : weekStart;
        const clippedEnd = weekEnd > windowEndYmd ? windowEndYmd : weekEnd;
        bands.push({
          id: p.id as string,
          name:
            (p.name as string) ||
            (p.phase_label as string | null) ||
            `Phase ${i + 1}`,
          color: PHASE_COLORS[i % PHASE_COLORS.length]!,
          weekStart: clippedStart,
          weekEnd: clippedEnd,
        });
      }
      cursorYmd = addCalendarDaysYmd(cursorYmd, weeks * 7);
    }
    if (bands.length > 0) return bands;
  }
  return [];
}

/** Map master set_entry_id → set_number → reps prescription. */
async function fetchPrescriptionsByMasterEntry(
  supabase: SupabaseClient,
  masterEntryIds: string[],
): Promise<Map<string, Map<number, RxRow>>> {
  const out = new Map<string, Map<number, RxRow>>();
  if (masterEntryIds.length === 0) return out;

  const chunk = 200;
  const instanceEntryIds: string[] = [];
  const masterByInstance = new Map<string, string>();

  for (let i = 0; i < masterEntryIds.length; i += chunk) {
    const slice = masterEntryIds.slice(i, i + chunk);
    const { data: instEntries } = await supabase
      .from("program_instance_set_entries")
      .select("id, source_set_entry_id")
      .in("source_set_entry_id", slice);
    for (const e of instEntries ?? []) {
      const id = e.id as string;
      const src = e.source_set_entry_id as string | null;
      if (src) {
        instanceEntryIds.push(id);
        masterByInstance.set(id, src);
      }
    }
  }

  const instanceSlotToMaster = new Map<string, string>();
  for (let i = 0; i < instanceEntryIds.length; i += chunk) {
    const slice = instanceEntryIds.slice(i, i + chunk);
    const { data: slots } = await supabase
      .from("program_instance_set_entry_exercises")
      .select("id, program_instance_set_entry_id")
      .in("program_instance_set_entry_id", slice);
    for (const s of slots ?? []) {
      const master = masterByInstance.get(
        s.program_instance_set_entry_id as string,
      );
      if (master) instanceSlotToMaster.set(s.id as string, master);
    }
  }

  const instSlotIds = [...instanceSlotToMaster.keys()];
  for (let i = 0; i < instSlotIds.length; i += chunk) {
    const slice = instSlotIds.slice(i, i + chunk);
    const { data: rx } = await supabase
      .from("program_instance_set_prescriptions")
      .select("slot_id, set_number, reps")
      .in("slot_id", slice);
    for (const r of rx ?? []) {
      const master = instanceSlotToMaster.get(r.slot_id as string);
      if (!master) continue;
      const sn = Number(r.set_number) || 0;
      if (!out.has(master)) out.set(master, new Map());
      out.get(master)!.set(sn, {
        set_number: sn,
        reps: r.reps != null ? String(r.reps) : null,
      });
    }
  }

  // Template fallback for masters still missing
  const missing = masterEntryIds.filter((id) => !out.has(id));
  const templateSlotToMaster = new Map<string, string>();
  for (let i = 0; i < missing.length; i += chunk) {
    const slice = missing.slice(i, i + chunk);
    const { data: slots } = await supabase
      .from("workout_set_entry_exercises")
      .select("id, set_entry_id")
      .in("set_entry_id", slice);
    for (const s of slots ?? []) {
      templateSlotToMaster.set(s.id as string, s.set_entry_id as string);
    }
  }
  const tSlotIds = [...templateSlotToMaster.keys()];
  for (let i = 0; i < tSlotIds.length; i += chunk) {
    const slice = tSlotIds.slice(i, i + chunk);
    const { data: rx } = await supabase
      .from("workout_set_prescriptions")
      .select("slot_id, set_number, reps")
      .in("slot_id", slice);
    for (const r of rx ?? []) {
      const master = templateSlotToMaster.get(r.slot_id as string);
      if (!master) continue;
      if (out.has(master)) continue;
      const sn = Number(r.set_number) || 0;
      if (!out.has(master)) out.set(master, new Map());
      out.get(master)!.set(sn, {
        set_number: sn,
        reps: r.reps != null ? String(r.reps) : null,
      });
    }
  }

  return out;
}

type ScheduledWeekRx = {
  setsPrescribed: number;
  repsPrescribed: number;
};

/**
 * Calendar weeks where this exercise appears on the client's program schedule
 * (program_day_assignments → instance workout → slots), with prescribed set/rep counts.
 * Used to distinguish "never programmed" (gap) from "programmed but not done" (0%).
 */
async function loadScheduledPrescriptionsByCalendarWeek(
  supabase: SupabaseClient,
  clientId: string,
  exerciseId: string,
  timeZone: string,
): Promise<Map<string, ScheduledWeekRx>> {
  const byWeek = new Map<string, ScheduledWeekRx>();

  const { data: assignments } = await supabase
    .from("program_assignments")
    .select("id, start_date, status")
    .eq("client_id", clientId)
    .in("status", ["active", "completed", "paused"])
    .order("start_date", { ascending: false })
    .limit(8);

  if (!assignments?.length) return byWeek;

  for (const a of assignments) {
    const startRaw = a.start_date as string | null;
    if (!startRaw) continue;
    const startMonday = mondayYmdOfZonedWeekContaining(
      new Date(`${String(startRaw).slice(0, 10)}T12:00:00.000Z`),
      timeZone,
    );

    const { data: days } = await supabase
      .from("program_day_assignments")
      .select("week_number, program_instance_workout_id, is_optional")
      .eq("program_assignment_id", a.id)
      .not("program_instance_workout_id", "is", null)
      .limit(2000);

    if (!days?.length) continue;

    const workoutIds = [
      ...new Set(
        days
          .map((d) => d.program_instance_workout_id as string | null)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    if (workoutIds.length === 0) continue;

    // Instance entries for these workouts that include this exercise
    const entryIds: string[] = [];
    const workoutByEntry = new Map<string, string>();
    for (let i = 0; i < workoutIds.length; i += 200) {
      const slice = workoutIds.slice(i, i + 200);
      const { data: entries } = await supabase
        .from("program_instance_set_entries")
        .select("id, program_instance_workout_id")
        .in("program_instance_workout_id", slice);
      for (const e of entries ?? []) {
        entryIds.push(e.id as string);
        workoutByEntry.set(
          e.id as string,
          e.program_instance_workout_id as string,
        );
      }
    }
    if (entryIds.length === 0) continue;

    const slotIds: string[] = [];
    const workoutBySlot = new Map<string, string>();
    for (let i = 0; i < entryIds.length; i += 200) {
      const slice = entryIds.slice(i, i + 200);
      const { data: slots } = await supabase
        .from("program_instance_set_entry_exercises")
        .select("id, program_instance_set_entry_id")
        .eq("exercise_id", exerciseId)
        .in("program_instance_set_entry_id", slice);
      for (const s of slots ?? []) {
        const wid = workoutByEntry.get(s.program_instance_set_entry_id as string);
        if (!wid) continue;
        slotIds.push(s.id as string);
        workoutBySlot.set(s.id as string, wid);
      }
    }
    if (slotIds.length === 0) continue;

    const workoutsWithExercise = new Set(workoutBySlot.values());

    // Per-set prescriptions for those slots
    const rxByWorkout = new Map<
      string,
      { sets: number; repsCountable: number }
    >();
    for (let i = 0; i < slotIds.length; i += 200) {
      const slice = slotIds.slice(i, i + 200);
      const { data: rxRows } = await supabase
        .from("program_instance_set_prescriptions")
        .select("slot_id, set_number, reps")
        .in("slot_id", slice);
      for (const r of rxRows ?? []) {
        const wid = workoutBySlot.get(r.slot_id as string);
        if (!wid) continue;
        const cur = rxByWorkout.get(wid) ?? { sets: 0, repsCountable: 0 };
        cur.sets += 1;
        const parsed = classifyRepsPrescription(
          r.reps != null ? String(r.reps) : null,
        );
        if (parsed.targetReps != null) cur.repsCountable += 1;
        rxByWorkout.set(wid, cur);
      }
    }

    for (const d of days) {
      const wid = d.program_instance_workout_id as string | null;
      if (!wid || !workoutsWithExercise.has(wid)) continue;
      if (d.is_optional) continue;
      const wn = Number(d.week_number);
      if (!Number.isFinite(wn) || wn < 1) continue;
      const calWeek = addCalendarDaysYmd(startMonday, (wn - 1) * 7);
      const rx = rxByWorkout.get(wid) ?? { sets: 1, repsCountable: 0 };
      const prev = byWeek.get(calWeek) ?? {
        setsPrescribed: 0,
        repsPrescribed: 0,
      };
      prev.setsPrescribed += Math.max(1, rx.sets);
      prev.repsPrescribed += rx.repsCountable;
      byWeek.set(calWeek, prev);
    }
  }

  return byWeek;
}

export async function listCoachChartExercises(
  supabase: SupabaseClient,
  clientId: string,
): Promise<CoachExerciseChartOption[]> {
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
      firstDate: string;
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
    if (!id) continue;
    const name = ex?.name ?? "Unknown";
    const category = ex?.category ?? null;
    const primaryMuscleGroupId = ex?.primary_muscle_group_id ?? null;
    const dateStr = row.completed_at ? row.completed_at.split("T")[0]! : "";
    if (!byExercise.has(id)) {
      byExercise.set(id, {
        name,
        firstDate: dateStr,
        lastDate: dateStr,
        count: 0,
        category,
        primaryMuscleGroupId,
      });
    }
    const entry = byExercise.get(id)!;
    entry.count += 1;
    if (dateStr && (!entry.firstDate || dateStr < entry.firstDate)) {
      entry.firstDate = dateStr;
    }
    if (dateStr > entry.lastDate) entry.lastDate = dateStr;
  }

  return Array.from(byExercise.entries())
    .map(([id, e]) => ({
      id,
      name: e.name,
      firstTrained: e.firstDate,
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

export async function getCoachExerciseCharts(
  supabase: SupabaseClient,
  args: {
    clientId: string;
    exerciseId: string;
    range: CoachExerciseChartRange;
    timeZone?: string | null;
  },
): Promise<CoachExerciseChartsPayload | null> {
  const tz = normalizeClientTimezone(args.timeZone ?? "UTC");
  const now = new Date();
  const todayYmd = zonedCalendarDateString(now, tz);
  const windowEndYmd = mondayYmdOfZonedWeekContaining(now, tz);

  // ONE set-log pull for this exercise
  const { data: setLogs, error } = await supabase
    .from("workout_set_logs")
    .select(
      `
      id,
      workout_log_id,
      set_entry_id,
      set_number,
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
    .order("completed_at", { ascending: true });

  if (error) throw new Error(error.message);

  const firstEx = (setLogs?.[0] as { exercises?: unknown } | undefined)?.exercises;
  const exObj = Array.isArray(firstEx) ? firstEx[0] : firstEx;
  const exerciseMeta = exObj as
    | {
        id?: string;
        name?: string;
        category?: string | null;
        primary_muscle_group_id?: string | null;
      }
    | undefined;

  let exerciseName = exerciseMeta?.name;
  let category = exerciseMeta?.category ?? null;
  let primaryMuscleGroupId = exerciseMeta?.primary_muscle_group_id ?? null;

  if (!exerciseName) {
    const { data: exRow } = await supabase
      .from("exercises")
      .select("id, name, category, primary_muscle_group_id")
      .eq("id", args.exerciseId)
      .maybeSingle();
    if (!exRow) return null;
    exerciseName = (exRow.name as string) || "Exercise";
    category = (exRow.category as string | null) ?? null;
    primaryMuscleGroupId =
      (exRow.primary_muscle_group_id as string | null) ?? null;
  }

  const strengthEligible = isEst1RmEligibleExercise({
    category,
    primaryMuscleGroupId,
  });

  const exercise: CoachExerciseChartOption = {
    id: args.exerciseId,
    name: exerciseName || "Exercise",
    firstTrained: "",
    lastTrained: "",
    sessionCount: 0,
    category,
    primaryMuscleGroupId,
    strengthEligible,
  };

  type FlatLog = {
    workoutLogId: string;
    setEntryId: string | null;
    setNumber: number;
    weight: number;
    reps: number;
    dateYmd: string;
    weekStart: string;
  };

  const flat: FlatLog[] = [];
  for (const row of (setLogs ?? []) as Array<{
    workout_log_id: string;
    set_entry_id: string | null;
    set_number: number | null;
    weight: number | null;
    reps: number | null;
    completed_at: string | null;
  }>) {
    const dateYmd = dateKeyFromCompletedAt(row.completed_at, tz);
    const weekStart = mondayYmdOfZonedWeekContaining(
      new Date(`${dateYmd}T12:00:00.000Z`),
      tz,
    );
    flat.push({
      workoutLogId: row.workout_log_id,
      setEntryId: row.set_entry_id,
      setNumber: Number(row.set_number) || 0,
      weight: Number(row.weight) || 0,
      reps: Math.max(0, Math.floor(Number(row.reps) || 0)),
      dateYmd,
      weekStart,
    });
  }

  // Selected range window (before clamp)
  let rangeStartYmd: string;
  if (args.range === "ALL") {
    const earliestLog = flat[0]?.weekStart;
    rangeStartYmd = earliestLog ?? addCalendarDaysYmd(windowEndYmd, -7 * 12);
  } else {
    const months = RANGE_MONTHS[args.range];
    const startDate = new Date(now);
    startDate.setUTCMonth(startDate.getUTCMonth() - months);
    rangeStartYmd = mondayYmdOfZonedWeekContaining(startDate, tz);
  }

  const scheduledByWeek = await loadScheduledPrescriptionsByCalendarWeek(
    supabase,
    args.clientId,
    args.exerciseId,
    tz,
  );

  // Expand ALL range start if schedule has earlier prescriptions than first log
  if (args.range === "ALL") {
    for (const wk of scheduledByWeek.keys()) {
      if (wk < rangeStartYmd) rangeStartYmd = wk;
    }
  }

  const filtered = flat.filter(
    (r) => r.weekStart >= rangeStartYmd && r.weekStart <= windowEndYmd,
  );

  let weekKeys = weekKeysInclusive(rangeStartYmd, windowEndYmd);

  const masterIds = [
    ...new Set(
      filtered
        .map((r) => r.setEntryId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const rxByMaster = await fetchPrescriptionsByMasterEntry(supabase, masterIds);

  // Bucket counts from prescriptions actually encountered in logged slots
  const buckets = emptyBucketCounts();
  const seenBucketKey = new Set<string>();
  for (const [masterId, bySet] of rxByMaster) {
    if (!masterIds.includes(masterId)) continue;
    for (const [sn, rx] of bySet) {
      const key = `${masterId}:${sn}:${rx.reps ?? ""}`;
      if (seenBucketKey.has(key)) continue;
      seenBucketKey.add(key);
      buckets[classifyRepsPrescription(rx.reps).bucket] += 1;
    }
  }

  type WeekAgg = {
    sessions: Set<string>;
    setsCompleted: number;
    setsPrescribed: number;
    repsMet: number;
    repsPrescribed: number;
    topSetKg: number;
    topSetReps: number;
    setVolume: number;
    loadVolumeKg: number;
    hasSession: boolean;
  };

  const byWeek = new Map<string, WeekAgg>();
  for (const wk of weekKeys) {
    byWeek.set(wk, {
      sessions: new Set(),
      setsCompleted: 0,
      setsPrescribed: 0,
      repsMet: 0,
      repsPrescribed: 0,
      topSetKg: 0,
      topSetReps: 0,
      setVolume: 0,
      loadVolumeKg: 0,
      hasSession: false,
    });
  }

  type SessEntry = {
    week: string;
    logId: string;
    entryId: string;
    completedSets: Map<number, { weight: number; reps: number }>;
  };
  const sessionEntries = new Map<string, SessEntry>();

  for (const r of filtered) {
    const agg = byWeek.get(r.weekStart);
    if (!agg) continue;
    agg.hasSession = true;
    agg.sessions.add(r.workoutLogId);

    if (r.weight > 0) {
      if (r.weight > agg.topSetKg) {
        agg.topSetKg = r.weight;
        agg.topSetReps = r.reps;
      } else if (r.weight === agg.topSetKg && r.reps > agg.topSetReps) {
        agg.topSetReps = r.reps;
      }
    }
    if (r.weight > 0 || r.reps > 0) {
      agg.setVolume += 1;
      if (r.weight > 0 && r.reps > 0) {
        agg.loadVolumeKg += r.weight * r.reps;
      }
    }

    if (!r.setEntryId) continue;
    const key = `${r.weekStart}|${r.workoutLogId}|${r.setEntryId}`;
    let se = sessionEntries.get(key);
    if (!se) {
      se = {
        week: r.weekStart,
        logId: r.workoutLogId,
        entryId: r.setEntryId,
        completedSets: new Map(),
      };
      sessionEntries.set(key, se);
    }
    se.completedSets.set(r.setNumber, { weight: r.weight, reps: r.reps });
  }

  for (const se of sessionEntries.values()) {
    const agg = byWeek.get(se.week);
    if (!agg) continue;
    const rxMap = rxByMaster.get(se.entryId);
    if (!rxMap || rxMap.size === 0) continue;

    const rxList = [...rxMap.values()];
    agg.setsPrescribed += rxList.length;
    let completedMatching = 0;
    for (const rx of rxList) {
      if (se.completedSets.has(rx.set_number)) completedMatching += 1;
      const parsed = classifyRepsPrescription(rx.reps);
      if (parsed.targetReps == null) continue;
      agg.repsPrescribed += 1;
      const logged = se.completedSets.get(rx.set_number);
      if (logged && repsMeetPrescription(logged.reps, parsed)) {
        agg.repsMet += 1;
      }
    }
    agg.setsCompleted += completedMatching;
  }

  // Build points for full selected range, then clamp leading emptiness
  let adherencePoints: CoachExerciseAdherencePoint[] = weekKeys.map((wk) => {
    const agg = byWeek.get(wk)!;
    const scheduled = scheduledByWeek.get(wk);

    if (agg.hasSession) {
      return {
        weekStart: wk,
        setsPct:
          agg.setsPrescribed > 0
            ? Math.min(
                100,
                Math.round((100 * agg.setsCompleted) / agg.setsPrescribed),
              )
            : scheduled && scheduled.setsPrescribed > 0
              ? Math.min(
                  100,
                  Math.round(
                    (100 * agg.setsCompleted) / scheduled.setsPrescribed,
                  ),
                )
              : null,
        repsPct:
          agg.repsPrescribed > 0
            ? Math.min(
                100,
                Math.round((100 * agg.repsMet) / agg.repsPrescribed),
              )
            : scheduled && scheduled.repsPrescribed > 0
              ? 0
              : null,
        setsCompleted: agg.setsCompleted,
        setsPrescribed:
          agg.setsPrescribed > 0
            ? agg.setsPrescribed
            : (scheduled?.setsPrescribed ?? 0),
        repsMet: agg.repsMet,
        repsPrescribed:
          agg.repsPrescribed > 0
            ? agg.repsPrescribed
            : (scheduled?.repsPrescribed ?? 0),
        sessions: agg.sessions.size,
        phaseName: null,
      };
    }

    // No session: prescribed that week → 0% failure; else genuine gap
    if (scheduled && scheduled.setsPrescribed > 0) {
      return {
        weekStart: wk,
        setsPct: 0,
        repsPct: scheduled.repsPrescribed > 0 ? 0 : null,
        setsCompleted: 0,
        setsPrescribed: scheduled.setsPrescribed,
        repsMet: 0,
        repsPrescribed: scheduled.repsPrescribed,
        sessions: 0,
        phaseName: null,
      };
    }

    return {
      weekStart: wk,
      setsPct: null,
      repsPct: null,
      setsCompleted: 0,
      setsPrescribed: 0,
      repsMet: 0,
      repsPrescribed: 0,
      sessions: 0,
      phaseName: null,
    };
  });

  let absProg = weekKeys.map((wk) => {
    const agg = byWeek.get(wk)!;
    return {
      weekStart: wk,
      topSetKg: agg.hasSession && agg.topSetKg > 0 ? agg.topSetKg : null,
      topSetReps: agg.hasSession && agg.topSetKg > 0 ? agg.topSetReps : null,
      setVolume: agg.hasSession ? agg.setVolume : null,
      loadVolumeKg:
        agg.hasSession && agg.loadVolumeKg > 0 ? agg.loadVolumeKg : null,
      sessions: agg.sessions.size,
    };
  });

  // First week with logged OR prescribed data (0% counts) inside the selected range
  let firstDataIdx = -1;
  for (let i = 0; i < weekKeys.length; i++) {
    const a = adherencePoints[i]!;
    const p = absProg[i]!;
    const hasAdh = a.setsPct != null || a.repsPct != null;
    const hasProg = p.sessions > 0;
    if (hasAdh || hasProg) {
      firstDataIdx = i;
      break;
    }
  }

  const axisClamped = firstDataIdx > 0;
  const windowStartYmd =
    firstDataIdx >= 0 ? weekKeys[firstDataIdx]! : rangeStartYmd;

  if (firstDataIdx > 0) {
    weekKeys = weekKeys.slice(firstDataIdx);
    adherencePoints = adherencePoints.slice(firstDataIdx);
    absProg = absProg.slice(firstDataIdx);
  }

  const phaseBands = await loadPhaseBands(
    supabase,
    args.clientId,
    windowStartYmd,
    windowEndYmd,
    tz,
  );

  adherencePoints = adherencePoints.map((p) => ({
    ...p,
    phaseName: phaseNameAt(p.weekStart, phaseBands),
  }));

  const firstTop =
    absProg.find((p) => p.topSetKg != null)?.topSetKg ?? null;
  const firstSets =
    absProg.find((p) => p.setVolume != null && p.setVolume > 0)?.setVolume ??
    null;
  const firstLoad =
    absProg.find((p) => p.loadVolumeKg != null)?.loadVolumeKg ?? null;

  const progressionPoints: CoachExerciseProgressionPoint[] = absProg.map(
    (p) => ({
      weekStart: p.weekStart,
      topSetKg: p.topSetKg,
      setVolume: p.setVolume,
      loadVolumeKg: p.loadVolumeKg,
      topSetReps: p.topSetReps,
      topSetIndexed:
        p.topSetKg != null && firstTop && firstTop > 0
          ? Math.round((100 * p.topSetKg) / firstTop)
          : null,
      setVolumeIndexed:
        p.setVolume != null && firstSets && firstSets > 0
          ? Math.round((100 * p.setVolume) / firstSets)
          : null,
      loadVolumeIndexed:
        p.loadVolumeKg != null && firstLoad && firstLoad > 0
          ? Math.round((100 * p.loadVolumeKg) / firstLoad)
          : null,
      sessions: p.sessions,
      phaseName: phaseNameAt(p.weekStart, phaseBands),
    }),
  );

  const { data: prRows } = await supabase
    .from("personal_records")
    .select(
      "achieved_date, record_type, record_value, weight_at_record, reps_at_record",
    )
    .eq("client_id", args.clientId)
    .eq("exercise_id", args.exerciseId)
    .order("achieved_date", { ascending: true });

  const weekStartSet = new Set(weekKeys);
  const prMarkers: CoachExercisePrMarker[] = [];
  for (const pr of (prRows ?? []) as Array<{
    achieved_date: string;
    record_type: string | null;
    record_value: number | null;
    weight_at_record: number | null;
    reps_at_record: number | null;
  }>) {
    const date = String(pr.achieved_date).slice(0, 10);
    const weekStart = mondayYmdOfZonedWeekContaining(
      new Date(`${date}T12:00:00.000Z`),
      tz,
    );
    if (!weekStartSet.has(weekStart)) continue;
    const pt = progressionPoints.find((p) => p.weekStart === weekStart);
    const weightKg =
      Number(pr.weight_at_record) ||
      Number(pr.record_value) ||
      0;
    prMarkers.push({
      weekStart,
      achievedDate: date,
      weightKg,
      reps: pr.reps_at_record != null ? Number(pr.reps_at_record) : null,
      topSetIndexed: pt?.topSetIndexed ?? null,
    });
  }

  const weeksWithData = progressionPoints.filter((p) => p.sessions > 0).length;
  const enoughData = weeksWithData >= 3;

  const hasRxInWindow = adherencePoints.some(
    (p) => p.setsPrescribed > 0 || p.repsPrescribed > 0 || p.setsPct != null,
  );
  const adherenceAvailable = hasRxInWindow;
  const adherenceReason = !hasRxInWindow
    ? "No prescriptions for this exercise in the selected window — adherence unavailable."
    : null;

  const progressionAvailable = weeksWithData > 0;
  const progressionReason = !progressionAvailable
    ? "No logged sets for this exercise in the selected range."
    : null;

  const mid = Math.floor(weekKeys.length / 2);
  const midKey = weekKeys[mid] ?? "";

  const adhSets = adherencePoints.filter((p) => p.setsPct != null);
  const adhReps = adherencePoints.filter((p) => p.repsPct != null);
  const firstHalfSets = adhSets
    .filter((p) => p.weekStart < midKey)
    .map((p) => p.setsPct!);
  const secondHalfSets = adhSets
    .filter((p) => p.weekStart >= midKey)
    .map((p) => p.setsPct!);
  const firstHalfReps = adhReps
    .filter((p) => p.weekStart < midKey)
    .map((p) => p.repsPct!);
  const secondHalfReps = adhReps
    .filter((p) => p.weekStart >= midKey)
    .map((p) => p.repsPct!);

  const currentSets =
    [...adhSets].reverse().find((p) => p.setsPct != null)?.setsPct ?? null;
  const currentReps =
    [...adhReps].reverse().find((p) => p.repsPct != null)?.repsPct ?? null;
  const m1s = mean(firstHalfSets);
  const m2s = mean(
    secondHalfSets.length ? secondHalfSets : adhSets.map((p) => p.setsPct!),
  );
  const m1r = mean(firstHalfReps);
  const m2r = mean(
    secondHalfReps.length ? secondHalfReps : adhReps.map((p) => p.repsPct!),
  );

  const sessionsMissed = adherencePoints.filter(
    (p) => p.setsPrescribed > 0 && p.sessions === 0,
  ).length;
  const sessionsScheduled = adherencePoints.filter(
    (p) => p.setsPrescribed > 0,
  ).length;

  const progTop = progressionPoints.filter((p) => p.topSetKg != null);
  const currentTop =
    [...progTop].reverse().find((p) => p.topSetKg != null)?.topSetKg ?? null;
  const currentSetVol =
    [...progressionPoints]
      .reverse()
      .find((p) => p.setVolume != null)?.setVolume ?? null;
  const currentLoad =
    [...progressionPoints]
      .reverse()
      .find((p) => p.loadVolumeKg != null)?.loadVolumeKg ?? null;

  const pctDelta = (cur: number | null, base: number | null): number | null => {
    if (cur == null || base == null || !(base > 0)) return null;
    return Math.round(((cur - base) / base) * 100);
  };

  const lastPr = prMarkers.length > 0 ? prMarkers[prMarkers.length - 1]! : null;
  let lastPrWeekLabel: string | null = null;
  if (lastPr) {
    const idx = weekKeys.indexOf(lastPr.weekStart);
    lastPrWeekLabel = idx >= 0 ? `week ${idx + 1}` : lastPr.weekStart;
  }

  exercise.sessionCount = new Set(filtered.map((r) => r.workoutLogId)).size;
  exercise.firstTrained = flat.length ? flat[0]!.dateYmd : "";
  exercise.lastTrained = filtered.length
    ? filtered[filtered.length - 1]!.dateYmd
    : flat.length
      ? flat[flat.length - 1]!.dateYmd
      : "";

  const weeksShown = weekKeys.length;
  const axisNote = axisClamped
    ? `Showing ${weeksShown} week${weeksShown === 1 ? "" : "s"} — no earlier data for this exercise.`
    : null;

  return {
    exercise,
    range: args.range,
    rangeStart: rangeStartYmd,
    windowStart: windowStartYmd,
    windowEnd: todayYmd,
    axisClamped,
    axisNote,
    enoughData,
    weeksWithData,
    phaseBands,
    adherence: {
      available: adherenceAvailable,
      unavailableReason: adherenceReason,
      points: adherencePoints,
      kpi: {
        currentSetsPct: currentSets,
        currentRepsPct: currentReps,
        deltaSetsPct:
          m1s != null && m2s != null ? Math.round(m2s - m1s) : null,
        deltaRepsPct:
          m1r != null && m2r != null ? Math.round(m2r - m1r) : null,
        sessionsMissed,
        sessionsScheduled: sessionsScheduled || weekKeys.length,
      },
      repsBuckets: buckets,
    },
    progression: {
      available: progressionAvailable,
      unavailableReason: progressionReason,
      points: progressionPoints,
      prMarkers,
      kpi: {
        currentTopSetKg: currentTop,
        deltaTopSetPct: pctDelta(currentTop, firstTop),
        baselineTopSetKg: firstTop,
        currentSetVolume: currentSetVol,
        deltaSetVolumePct: pctDelta(currentSetVol, firstSets),
        baselineSetVolume: firstSets,
        currentLoadVolumeKg: currentLoad,
        deltaLoadVolumePct: pctDelta(currentLoad, firstLoad),
        baselineLoadVolumeKg: firstLoad,
        recordsSet: prMarkers.length,
        lastPrWeekLabel,
      },
    },
  };
}
