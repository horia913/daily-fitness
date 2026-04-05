/**
 * Server-only helpers for GET /api/coach/clients/[clientId]/summary.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeWorkoutAdherence,
  volumeDeltaKg,
  setsDelta,
  type AdherenceTier,
  type CoachSetLogRow,
  type PrescribedExerciseRow,
  type WorkoutAdherencePrescriptions,
  type WorkoutAdherenceResult,
} from "@/lib/coachWorkoutAdherence";
import {
  addCalendarDaysYmd,
  mondayYmdOfZonedWeekContaining,
  weekdayMon0Sun6InTimezone,
  zonedDayInclusiveUtcBounds,
} from "@/lib/clientZonedCalendar";
import { getNextSlot } from "@/lib/programStateService";
import { dbToUiScale } from "@/lib/wellnessService";
import {
  durationMinutesFromSetCompletedAts,
  MAX_WALL_CLOCK_SESSION_MINUTES,
} from "@/lib/workoutLogDuration";

const DOW_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function mapEntryExercise(
  row: Record<string, unknown>
): PrescribedExerciseRow & { set_entry_id: string } {
  return {
    set_entry_id: String(row.set_entry_id ?? ""),
    exercise_id: String(row.exercise_id ?? ""),
    reps: row.reps != null ? String(row.reps) : null,
    weight_kg: row.weight_kg as number | string | null | undefined,
    load_percentage: row.load_percentage as number | string | null | undefined,
    rir: row.rir as number | string | null | undefined,
  };
}

function prescKey(setEntryId: string, exerciseId: string): string {
  return `${setEntryId}::${exerciseId}`;
}

async function loadSpeedEndurancePrescriptions(
  sb: SupabaseClient,
  entryIds: string[]
): Promise<WorkoutAdherencePrescriptions> {
  if (entryIds.length === 0) return {};
  const [speedRes, enduranceRes] = await Promise.all([
    sb
      .from("workout_speed_sets")
      .select("set_entry_id, exercise_id, intervals, distance_meters")
      .in("set_entry_id", entryIds),
    sb
      .from("workout_endurance_sets")
      .select(
        "set_entry_id, exercise_id, target_distance_meters, target_time_seconds, target_pace_seconds_per_km, hr_zone, target_hr_pct"
      )
      .in("set_entry_id", entryIds),
  ]);

  const speedByKey = new Map<
    string,
    { intervals: number; distance_meters: number }
  >();
  for (const row of speedRes.data ?? []) {
    const r = row as {
      set_entry_id: string;
      exercise_id: string;
      intervals: number;
      distance_meters: number;
    };
    if (!r.set_entry_id || !r.exercise_id) continue;
    speedByKey.set(prescKey(r.set_entry_id, r.exercise_id), {
      intervals: Number(r.intervals),
      distance_meters: Number(r.distance_meters),
    });
  }

  const enduranceByKey = new Map<
    string,
    {
      target_distance_meters: number;
      target_time_seconds: number | null;
      target_pace_seconds_per_km: number | null;
      hr_zone: number | null;
      target_hr_pct: number | null;
    }
  >();
  for (const row of enduranceRes.data ?? []) {
    const r = row as {
      set_entry_id: string;
      exercise_id: string;
      target_distance_meters: number;
      target_time_seconds: number | null;
      target_pace_seconds_per_km: number | null;
      hr_zone: number | null;
      target_hr_pct: number | null;
    };
    if (!r.set_entry_id || !r.exercise_id) continue;
    enduranceByKey.set(prescKey(r.set_entry_id, r.exercise_id), {
      target_distance_meters: Number(r.target_distance_meters),
      target_time_seconds:
        r.target_time_seconds != null ? Number(r.target_time_seconds) : null,
      target_pace_seconds_per_km:
        r.target_pace_seconds_per_km != null
          ? Number(r.target_pace_seconds_per_km)
          : null,
      hr_zone: r.hr_zone != null ? Number(r.hr_zone) : null,
      target_hr_pct:
        r.target_hr_pct != null ? Number(r.target_hr_pct) : null,
    });
  }

  return { speedByKey, enduranceByKey };
}

/**
 * Load template prescriptions and compute adherence for a completed workout log.
 */
export async function computeAdherenceForWorkoutLog(
  sb: SupabaseClient,
  workoutLogId: string,
  templateId: string
): Promise<WorkoutAdherenceResult> {
  const { data: setLogsRaw, error: slErr } = await sb
    .from("workout_set_logs")
    .select(
      "set_entry_id, block_id, block_type, set_type, exercise_id, set_number, weight, reps, rpe, superset_exercise_a_id, superset_weight_a, superset_reps_a, superset_exercise_b_id, superset_weight_b, superset_reps_b"
    )
    .eq("workout_log_id", workoutLogId);

  if (slErr) {
    console.error("[coachClientSummaryServer] workout_set_logs", slErr);
  }

  const setLogs = (setLogsRaw ?? []) as CoachSetLogRow[];

  const { data: entriesRaw } = await sb
    .from("workout_set_entries")
    .select("id, set_type")
    .eq("template_id", templateId);

  const setEntries = (entriesRaw ?? []) as Array<{ id: string; set_type: string }>;
  const entryIds = setEntries.map((e) => e.id);
  if (entryIds.length === 0) {
    return computeWorkoutAdherence([], [], []);
  }

  const { data: exRaw } = await sb
    .from("workout_set_entry_exercises")
    .select(
      "set_entry_id, exercise_id, reps, weight_kg, load_percentage, rir"
    )
    .in("set_entry_id", entryIds);

  const entryExercises = (exRaw ?? [])
    .map((r) => mapEntryExercise(r as Record<string, unknown>))
    .filter((r) => r.set_entry_id && r.exercise_id);

  const exIds = [
    ...new Set(entryExercises.map((e) => e.exercise_id).filter(Boolean)),
  ];
  const nameById = new Map<string, string>();
  if (exIds.length > 0) {
    const { data: exNames } = await sb
      .from("exercises")
      .select("id, name")
      .in("id", exIds);
    (exNames ?? []).forEach((r: { id: string; name: string }) => {
      if (r?.id && r?.name) nameById.set(r.id, r.name);
    });
  }

  return computeWorkoutAdherence(setLogs, setEntries, entryExercises, nameById);
}

/** Batch adherence for many logs: bounded queries (no per-log N+1). */
export async function batchAdherenceForWorkoutLogs(
  sb: SupabaseClient,
  clientId: string,
  logIds: string[]
): Promise<
  Record<string, { adherencePercent: number | null; tier: AdherenceTier | null }>
> {
  const out: Record<
    string,
    { adherencePercent: number | null; tier: AdherenceTier | null }
  > = {};
  if (logIds.length === 0) return out;

  const { data: logRows, error: logErr } = await sb
    .from("workout_logs")
    .select("id, workout_assignment_id")
    .eq("client_id", clientId)
    .in("id", logIds);

  if (logErr || !logRows?.length) {
    for (const id of logIds) {
      out[id] = { adherencePercent: null, tier: null };
    }
    return out;
  }

  const assignmentIds = [
    ...new Set(
      (logRows
        .map((r) => r.workout_assignment_id as string | null)
        .filter(Boolean) ?? []) as string[]
    ),
  ];

  const assignmentToTemplate = new Map<string, string>();
  if (assignmentIds.length > 0) {
    const { data: waRows } = await sb
      .from("workout_assignments")
      .select("id, workout_template_id")
      .in("id", assignmentIds);
    for (const w of waRows ?? []) {
      const row = w as { id: string; workout_template_id?: string | null };
      const tid = row.workout_template_id;
      if (tid) assignmentToTemplate.set(row.id, tid);
    }
  }

  const logIdToTemplate = new Map<string, string>();
  for (const r of logRows) {
    const aid = r.workout_assignment_id as string | null;
    if (aid && assignmentToTemplate.has(aid)) {
      logIdToTemplate.set(r.id as string, assignmentToTemplate.get(aid)!);
    }
  }

  const { data: allSetLogs } = await sb
    .from("workout_set_logs")
    .select(
      "workout_log_id, set_entry_id, block_id, block_type, set_type, exercise_id, set_number, weight, reps, rpe, superset_exercise_a_id, superset_weight_a, superset_reps_a, superset_exercise_b_id, superset_weight_b, superset_reps_b, actual_time_seconds, actual_distance_meters, actual_hr_avg, actual_speed_kmh"
    )
    .in("workout_log_id", logIds);

  const setLogsByLogId = new Map<string, CoachSetLogRow[]>();
  for (const row of allSetLogs ?? []) {
    const lid = (row as { workout_log_id: string }).workout_log_id;
    if (!setLogsByLogId.has(lid)) setLogsByLogId.set(lid, []);
    setLogsByLogId.get(lid)!.push(row as CoachSetLogRow);
  }

  const uniqueTemplates = [...new Set(logIdToTemplate.values())];
  if (uniqueTemplates.length === 0) {
    for (const id of logIds) {
      out[id] = { adherencePercent: null, tier: null };
    }
    return out;
  }

  const { data: entriesRaw } = await sb
    .from("workout_set_entries")
    .select("id, set_type, template_id")
    .in("template_id", uniqueTemplates);

  const setEntries = (entriesRaw ?? []) as Array<{
    id: string;
    set_type: string;
    template_id: string;
  }>;

  const entriesByTemplate = new Map<
    string,
    Array<{ id: string; set_type: string }>
  >();
  for (const e of setEntries) {
    const tid = e.template_id;
    if (!entriesByTemplate.has(tid)) entriesByTemplate.set(tid, []);
    entriesByTemplate.get(tid)!.push({ id: e.id, set_type: e.set_type });
  }

  const entryIds = setEntries.map((e) => e.id);
  if (entryIds.length === 0) {
    for (const id of logIds) {
      out[id] = { adherencePercent: null, tier: null };
    }
    return out;
  }

  const { data: exRaw } = await sb
    .from("workout_set_entry_exercises")
    .select(
      "set_entry_id, exercise_id, reps, weight_kg, load_percentage, rir"
    )
    .in("set_entry_id", entryIds);

  const entryExercises = (exRaw ?? [])
    .map((r) => mapEntryExercise(r as Record<string, unknown>))
    .filter((r) => r.set_entry_id && r.exercise_id);

  const exIds = [
    ...new Set(entryExercises.map((e) => e.exercise_id).filter(Boolean)),
  ];
  const nameById = new Map<string, string>();
  if (exIds.length > 0) {
    const { data: exNames } = await sb
      .from("exercises")
      .select("id, name")
      .in("id", exIds);
    (exNames ?? []).forEach((r: { id: string; name: string }) => {
      if (r?.id && r?.name) nameById.set(r.id, r.name);
    });
  }

  const presc = await loadSpeedEndurancePrescriptions(sb, entryIds);

  for (const logId of logIds) {
    const tid = logIdToTemplate.get(logId);
    if (!tid) {
      out[logId] = { adherencePercent: null, tier: null };
      continue;
    }
    const ents = entriesByTemplate.get(tid) ?? [];
    const entIdsForTemplate = new Set(ents.map((e) => e.id));
    const exForTemplate = entryExercises.filter((e) =>
      entIdsForTemplate.has(e.set_entry_id)
    );
    const logs = setLogsByLogId.get(logId) ?? [];
    const res = computeWorkoutAdherence(
      logs,
      ents,
      exForTemplate,
      nameById,
      presc
    );
    out[logId] = {
      adherencePercent: res.adherencePercent,
      tier: res.tier,
    };
  }

  return out;
}

export type CoachWorkoutLogDetailPayload = {
  log: {
    id: string;
    completed_at: string;
    started_at: string | null;
    total_duration_minutes: number | null;
    total_sets_completed: number | null;
    total_weight_lifted: number | string | null;
    workoutName: string;
    templateId: string | null;
  };
  adherence: WorkoutAdherenceResult;
  /** Same units as `log.total_weight_lifted`: Σ(weight×reps), not kg on the bar. */
  volumeDeltaKg: number | null;
  setsDelta: number | null;
  /** Prefer first→last set timestamp span; else capped stored minutes for coach UI. */
  displayDurationMinutes: number | null;
  durationDisplaySource: "set_span" | "stored" | "capped_stored" | null;
};

export async function getCoachWorkoutLogDetail(
  sb: SupabaseClient,
  clientId: string,
  logId: string
): Promise<CoachWorkoutLogDetailPayload | null> {
  const { data: dataRaw, error } = await sb
    .from("workout_logs")
    .select(
      `
      id,
      client_id,
      completed_at,
      started_at,
      total_duration_minutes,
      total_sets_completed,
      total_weight_lifted,
      workout_assignment_id,
      workout_assignments (
        workout_template_id,
        workout_templates ( id, name )
      )
    `
    )
    .eq("id", logId)
    .eq("client_id", clientId)
    .maybeSingle();

  if (error || !dataRaw) return null;

  type Row = {
    id: string;
    completed_at: string;
    started_at: string | null;
    total_duration_minutes: number | null;
    total_sets_completed: number | null;
    total_weight_lifted: number | string | null;
    workout_assignment_id?: string | null;
    workout_assignments?: {
      workout_template_id?: string | null;
      workout_templates?: { id?: string; name?: string } | null;
    } | null;
  };
  const row = dataRaw as Row;
  const wa = row.workout_assignments;
  const tpl = wa?.workout_templates;
  const templateId = tpl?.id ?? wa?.workout_template_id ?? null;
  const workoutName = tpl?.name?.trim() || "Workout";

  const stampsPromise = sb
    .from("workout_set_logs")
    .select("completed_at")
    .eq("workout_log_id", logId)
    .eq("client_id", clientId)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: true });

  const adherencePromise = templateId
    ? computeAdherenceForWorkoutLog(sb, logId, templateId)
    : Promise.resolve(computeWorkoutAdherence([], [], []));

  const [adherence, stampsRes] = await Promise.all([
    adherencePromise,
    stampsPromise,
  ]);

  const stampList =
    !stampsRes.error && stampsRes.data
      ? (stampsRes.data as Array<{ completed_at: string }>)
      : [];
  const derivedDuration = durationMinutesFromSetCompletedAts(
    stampList.map((r) => r.completed_at)
  );
  const storedMin =
    row.total_duration_minutes != null
      ? Number(row.total_duration_minutes)
      : NaN;
  let displayDurationMinutes: number | null = null;
  let durationDisplaySource: "set_span" | "stored" | "capped_stored" | null =
    null;
  if (derivedDuration != null) {
    displayDurationMinutes = derivedDuration;
    durationDisplaySource = "set_span";
  } else if (Number.isFinite(storedMin)) {
    if (storedMin > MAX_WALL_CLOCK_SESSION_MINUTES) {
      displayDurationMinutes = MAX_WALL_CLOCK_SESSION_MINUTES;
      durationDisplaySource = "capped_stored";
    } else {
      displayDurationMinutes = Math.max(1, Math.round(storedMin));
      durationDisplaySource = "stored";
    }
  }

  let volumeDelta: number | null = null;
  let setsDeltaVal: number | null = null;
  const assignmentId = row.workout_assignment_id;
  if (assignmentId && row.completed_at) {
    const { data: prev } = await sb
      .from("workout_logs")
      .select("total_weight_lifted, total_sets_completed, completed_at")
      .eq("client_id", clientId)
      .eq("workout_assignment_id", assignmentId)
      .not("completed_at", "is", null)
      .lt("completed_at", row.completed_at)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (prev) {
      volumeDelta = volumeDeltaKg(row, prev);
      setsDeltaVal = setsDelta(row, prev);
    }
  }

  return {
    log: {
      id: row.id,
      completed_at: row.completed_at,
      started_at: row.started_at,
      total_duration_minutes: row.total_duration_minutes,
      total_sets_completed: row.total_sets_completed,
      total_weight_lifted: row.total_weight_lifted,
      workoutName,
      templateId,
    },
    adherence,
    volumeDeltaKg: volumeDelta,
    setsDelta: setsDeltaVal,
    displayDurationMinutes,
    durationDisplaySource,
  };
}

export type TodayWorkoutSummary = {
  logId: string;
  workoutName: string;
  durationMinutes: number | null;
  totalSets: number | null;
  totalVolume: number | null;
  volumeDeltaKg: number | null;
  setsDelta: number | null;
  setsOnTarget: number;
  totalPrescribedSets: number;
  adherencePercent: number | null;
};

export async function buildTodayWorkoutSummary(
  sb: SupabaseClient,
  clientId: string,
  todayStart: string,
  todayEnd: string
): Promise<TodayWorkoutSummary | null> {
  const { data: logRow, error: logErr } = await sb
    .from("workout_logs")
    .select(
      "id, total_duration_minutes, total_sets_completed, total_weight_lifted, workout_assignment_id"
    )
    .eq("client_id", clientId)
    .gte("completed_at", todayStart)
    .lte("completed_at", todayEnd)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (logErr || !logRow) return null;

  let templateId: string | null = null;
  let workoutName = "Workout";
  const assignmentId = logRow.workout_assignment_id as string | undefined;
  if (assignmentId) {
    const { data: wa } = await sb
      .from("workout_assignments")
      .select("workout_template_id")
      .eq("id", assignmentId)
      .maybeSingle();
    const tid = wa?.workout_template_id as string | undefined;
    if (tid) {
      templateId = tid;
      const { data: tpl } = await sb
        .from("workout_templates")
        .select("name")
        .eq("id", tid)
        .maybeSingle();
      if (tpl?.name?.trim()) workoutName = tpl.name.trim();
    }
  }

  let adherence = computeWorkoutAdherence([], [], []);
  if (templateId) {
    adherence = await computeAdherenceForWorkoutLog(
      sb,
      logRow.id as string,
      templateId
    );
  }

  let volumeDelta: number | null = null;
  let setsDeltaVal: number | null = null;
  if (assignmentId) {
    const { data: prev } = await sb
      .from("workout_logs")
      .select(
        "id, total_weight_lifted, total_sets_completed, completed_at"
      )
      .eq("client_id", clientId)
      .eq("workout_assignment_id", assignmentId)
      .not("completed_at", "is", null)
      .lt("completed_at", todayStart)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (prev) {
      volumeDelta = volumeDeltaKg(
        {
          total_weight_lifted: logRow.total_weight_lifted as number | string | null,
          total_sets_completed: logRow.total_sets_completed as number | null,
        },
        {
          total_weight_lifted: prev.total_weight_lifted as number | string | null,
          total_sets_completed: prev.total_sets_completed as number | null,
        }
      );
      setsDeltaVal = setsDelta(
        {
          total_weight_lifted: logRow.total_weight_lifted as number | string | null,
          total_sets_completed: logRow.total_sets_completed as number | null,
        },
        {
          total_weight_lifted: prev.total_weight_lifted as number | string | null,
          total_sets_completed: prev.total_sets_completed as number | null,
        }
      );
    }
  }

  const tw = Number(logRow.total_weight_lifted);
  return {
    logId: logRow.id as string,
    workoutName,
    durationMinutes:
      logRow.total_duration_minutes != null
        ? Number(logRow.total_duration_minutes)
        : null,
    totalSets:
      logRow.total_sets_completed != null
        ? Number(logRow.total_sets_completed)
        : null,
    totalVolume: Number.isFinite(tw) ? tw : null,
    volumeDeltaKg: volumeDelta,
    setsDelta: setsDeltaVal,
    setsOnTarget: adherence.setsOnTarget,
    totalPrescribedSets: adherence.totalPrescribedSets,
    adherencePercent: adherence.adherencePercent,
  };
}

export type NextScheduledWorkout = { dayName: string; workoutName: string };

export async function buildNextScheduledWorkout(
  sb: SupabaseClient,
  clientId: string,
  programAssignmentId: string,
  programId: string
): Promise<NextScheduledWorkout | null> {
  const next = await getNextSlot(sb, programAssignmentId, programId);
  if (!next) return null;

  const { data: tpl } = await sb
    .from("workout_templates")
    .select("name")
    .eq("id", next.template_id)
    .maybeSingle();

  const dow =
    typeof next.day_of_week === "number" && next.day_of_week >= 0 && next.day_of_week <= 6
      ? next.day_of_week
      : 0;
  const dayName = DOW_SHORT[dow] ?? "—";

  return {
    dayName,
    workoutName: tpl?.name?.trim() || "Workout",
  };
}

export type LatestCheckInSummary = {
  date: string;
  sleepHours: number | null;
  stressLevel: number | null;
  sorenessLevel: number | null;
  sleepDelta: number | null;
  stressDelta: number | null;
  sorenessDelta: number | null;
};

function isCompleteWellness(row: {
  sleep_hours: number | null;
  sleep_quality: number | null;
  stress_level: number | null;
  soreness_level: number | null;
}): boolean {
  return (
    row.sleep_hours != null &&
    row.sleep_quality != null &&
    row.stress_level != null &&
    row.soreness_level != null
  );
}

export async function buildLatestCheckIn(
  sb: SupabaseClient,
  clientId: string
): Promise<LatestCheckInSummary | null> {
  const { data: rows } = await sb
    .from("daily_wellness_logs")
    .select(
      "log_date, sleep_hours, sleep_quality, stress_level, soreness_level"
    )
    .eq("client_id", clientId)
    .order("log_date", { ascending: false })
    .limit(14);

  const complete = (rows ?? []).filter((r) =>
    isCompleteWellness(
      r as {
        sleep_hours: number | null;
        sleep_quality: number | null;
        stress_level: number | null;
        soreness_level: number | null;
      }
    )
  ) as Array<{
    log_date: string;
    sleep_hours: number;
    sleep_quality: number;
    stress_level: number;
    soreness_level: number;
  }>;

  if (complete.length === 0) return null;

  const latest = complete[0];
  const prev = complete[1];

  const sleepHours = latest.sleep_hours ?? null;
  const stressUi = dbToUiScale(latest.stress_level);
  const soreUi = dbToUiScale(latest.soreness_level);

  let sleepDelta: number | null = null;
  let stressDelta: number | null = null;
  let sorenessDelta: number | null = null;

  if (prev) {
    sleepDelta =
      latest.sleep_hours != null && prev.sleep_hours != null
        ? Math.round((latest.sleep_hours - prev.sleep_hours) * 10) / 10
        : null;
    const ps = dbToUiScale(prev.stress_level);
    const pso = dbToUiScale(prev.soreness_level);
    if (stressUi != null && ps != null) stressDelta = stressUi - ps;
    if (soreUi != null && pso != null) sorenessDelta = soreUi - pso;
  }

  return {
    date: latest.log_date,
    sleepHours,
    stressLevel: stressUi,
    sorenessLevel: soreUi,
    sleepDelta,
    stressDelta,
    sorenessDelta,
  };
}

/** Mon–Sun flags for workouts completed this calendar week in the client's IANA timezone. */
export async function buildWeekWorkoutDots(
  sb: SupabaseClient,
  clientId: string,
  clientTimeZone: string
): Promise<boolean[]> {
  const dots = [false, false, false, false, false, false, false];
  const tz = clientTimeZone?.trim() || "UTC";
  const now = new Date();
  const monYmd = mondayYmdOfZonedWeekContaining(now, tz);
  const { startIso: weekStartIso } = zonedDayInclusiveUtcBounds(monYmd, tz);
  const sunYmd = addCalendarDaysYmd(monYmd, 6);
  const { endIso: weekEndIso } = zonedDayInclusiveUtcBounds(sunYmd, tz);

  const { data: logs } = await sb
    .from("workout_logs")
    .select("completed_at")
    .eq("client_id", clientId)
    .not("completed_at", "is", null)
    .gte("completed_at", weekStartIso)
    .lte("completed_at", weekEndIso);

  for (const row of logs ?? []) {
    const t = (row as { completed_at: string }).completed_at;
    if (!t) continue;
    const monIdx = weekdayMon0Sun6InTimezone(new Date(t), tz);
    if (monIdx >= 0 && monIdx <= 6) dots[monIdx] = true;
  }
  return dots;
}
