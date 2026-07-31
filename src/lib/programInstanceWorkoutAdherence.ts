/**
 * Program-instance workout execution (sets on target / prescribed).
 * Compares workout_set_logs to program_instance_set_prescriptions via the coach adherence engine.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeWorkoutAdherence,
  type CoachSetLogRow,
  type PrescribedExerciseRow,
} from "@/lib/coachWorkoutAdherence";
import { groupSetsIntoBlocks } from "@/lib/workoutLog/groupSetsIntoBlocks";
import {
  buildPrescribedWorkoutReference,
  type PrescriptionProtocolBundle,
  type SetEntryRow,
} from "@/lib/workoutLog/prescribedWorkoutReference";
import type { WorkoutLogSet } from "@/types/workoutLog";

function mapEntryExercise(
  row: Record<string, unknown>,
  setEntryId: string
): PrescribedExerciseRow & { set_entry_id: string } {
  return {
    set_entry_id: setEntryId,
    exercise_id: String(row.exercise_id ?? ""),
    reps: row.reps != null ? String(row.reps) : null,
    weight_kg: row.weight_kg as number | string | null | undefined,
    load_percentage: row.load_percentage as number | string | null | undefined,
    rir: row.rir as number | string | null | undefined,
  };
}

function pickPrescriptionFields(
  slot: Record<string, unknown>,
  rx: Record<string, unknown> | null
): { reps: string | null; weight_kg: unknown; rir: unknown; load_percentage: unknown } {
  if (rx) {
    return {
      reps: rx.reps != null ? String(rx.reps) : slot.reps != null ? String(slot.reps) : null,
      weight_kg: rx.weight_kg ?? slot.weight_kg,
      rir: rx.rir ?? slot.rir,
      load_percentage: rx.load_percentage ?? slot.load_percentage,
    };
  }
  return {
    reps: slot.reps != null ? String(slot.reps) : null,
    weight_kg: slot.weight_kg,
    rir: slot.rir,
    load_percentage: slot.load_percentage,
  };
}

/** Load instance prescriptions keyed by master set_entry_id (workout_set_logs.set_entry_id). */
export async function loadInstancePrescriptionProtocolBundle(
  sb: SupabaseClient,
  programInstanceWorkoutId: string
): Promise<PrescriptionProtocolBundle | null> {
  const { data: entriesRaw, error: entErr } = await sb
    .from("program_instance_set_entries")
    .select("id, source_set_entry_id, set_type, total_sets, reps_per_set")
    .eq("program_instance_workout_id", programInstanceWorkoutId);

  if (entErr || !entriesRaw?.length) return null;

  const instanceEntryIds = entriesRaw.map((e) => e.id as string);
  const masterIdByInstance = new Map<string, string>();
  const setEntries: SetEntryRow[] = [];

  for (const row of entriesRaw) {
    const masterId = row.source_set_entry_id as string | null;
    if (!masterId) continue;
    masterIdByInstance.set(row.id as string, masterId);
    setEntries.push({
      id: masterId,
      set_type: String(row.set_type ?? "straight_set"),
      total_sets: row.total_sets as number | null | undefined,
      reps_per_set: row.reps_per_set as string | null | undefined,
    });
  }

  if (setEntries.length === 0) return null;

  const [slotsRes, protocolsRes] = await Promise.all([
    sb
      .from("program_instance_set_entry_exercises")
      .select(
        "id, program_instance_set_entry_id, exercise_id, reps, weight_kg, load_percentage, rir"
      )
      .in("program_instance_set_entry_id", instanceEntryIds),
    sb
      .from("program_instance_set_entry_protocols")
      .select("program_instance_set_entry_id, protocol_type, protocol_config")
      .in("program_instance_set_entry_id", instanceEntryIds),
  ]);

  const slotIds = (slotsRes.data ?? []).map((s) => s.id as string);
  const rxBySlot = new Map<string, Record<string, unknown>>();
  if (slotIds.length > 0) {
    const { data: rxRows } = await sb
      .from("program_instance_set_prescriptions")
      .select("slot_id, reps, weight_kg, load_percentage, rir, set_number")
      .in("slot_id", slotIds)
      .order("set_number", { ascending: true });
    for (const rx of rxRows ?? []) {
      const sid = rx.slot_id as string;
      if (!rxBySlot.has(sid)) rxBySlot.set(sid, rx as Record<string, unknown>);
    }
  }

  const entryExercises: Array<PrescribedExerciseRow & { set_entry_id: string }> = [];
  for (const slot of slotsRes.data ?? []) {
    const instEntryId = slot.program_instance_set_entry_id as string;
    const masterSetEntryId = masterIdByInstance.get(instEntryId);
    if (!masterSetEntryId || !slot.exercise_id) continue;
    const fields = pickPrescriptionFields(
      slot as Record<string, unknown>,
      rxBySlot.get(slot.id as string) ?? null
    );
    entryExercises.push(
      mapEntryExercise(
        {
          exercise_id: slot.exercise_id,
          ...fields,
        },
        masterSetEntryId
      )
    );
  }

  const timeProtocols: PrescriptionProtocolBundle["timeProtocols"] = [];
  const dropSets: PrescriptionProtocolBundle["dropSets"] = [];
  const clusterSets: PrescriptionProtocolBundle["clusterSets"] = [];
  const restPauseSets: PrescriptionProtocolBundle["restPauseSets"] = [];
  const speedByKey = new Map<
    string,
    { intervals: number; distance_meters: number }
  >();
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

  for (const row of protocolsRes.data ?? []) {
    const instEntryId = row.program_instance_set_entry_id as string;
    const masterSetEntryId = masterIdByInstance.get(instEntryId);
    if (!masterSetEntryId) continue;
    const cfg = (row.protocol_config ?? {}) as Record<string, unknown>;
    const pType = String(row.protocol_type ?? "").toLowerCase();

    if (pType === "drop_set") {
      dropSets.push({
        set_entry_id: masterSetEntryId,
        drop_order: cfg.drop_order as number | null | undefined,
        reps: cfg.reps as string | null | undefined,
        weight_kg: cfg.weight_kg as number | string | null | undefined,
      });
    } else if (pType === "cluster_set") {
      clusterSets.push({
        set_entry_id: masterSetEntryId,
        reps_per_cluster: cfg.reps_per_cluster as number | null | undefined,
        clusters_per_set: cfg.clusters_per_set as number | null | undefined,
        weight_kg: cfg.weight_kg as number | string | null | undefined,
      });
    } else if (pType === "rest_pause") {
      restPauseSets.push({
        set_entry_id: masterSetEntryId,
        weight_kg: cfg.weight_kg as number | string | null | undefined,
        max_rest_pauses: cfg.max_rest_pauses as number | null | undefined,
        rest_pause_duration: (cfg.rest_pause_duration ?? cfg.rest_pause_seconds) as
          | number
          | null
          | undefined,
      });
    } else if (pType === "speed_work") {
      speedByKey.set(`${masterSetEntryId}::${String(cfg.exercise_id ?? "")}`, {
        intervals: Number(cfg.intervals) || 0,
        distance_meters: Number(cfg.distance_meters) || 0,
      });
    } else if (pType === "endurance") {
      enduranceByKey.set(`${masterSetEntryId}::${String(cfg.exercise_id ?? "")}`, {
        target_distance_meters: Number(cfg.target_distance_meters) || 0,
        target_time_seconds:
          cfg.target_time_seconds != null ? Number(cfg.target_time_seconds) : null,
        target_pace_seconds_per_km:
          cfg.target_pace_seconds_per_km != null
            ? Number(cfg.target_pace_seconds_per_km)
            : null,
        hr_zone: cfg.hr_zone != null ? Number(cfg.hr_zone) : null,
        target_hr_pct: cfg.target_hr_pct != null ? Number(cfg.target_hr_pct) : null,
      });
    } else {
      timeProtocols.push({
        set_entry_id: masterSetEntryId,
        protocol_type: (cfg.protocol_type as string | null) ?? pType,
        total_duration_minutes: cfg.total_duration_minutes as number | null | undefined,
        reps_per_round: cfg.reps_per_round as number | null | undefined,
        target_reps: cfg.target_reps as number | null | undefined,
        time_cap_minutes: cfg.time_cap_minutes as number | null | undefined,
        work_seconds: cfg.work_seconds as number | null | undefined,
        rest_seconds: cfg.rest_seconds as number | null | undefined,
        rounds: cfg.rounds as number | null | undefined,
      });
    }
  }

  const exIds = [...new Set(entryExercises.map((e) => e.exercise_id).filter(Boolean))];
  const nameById = new Map<string, string>();
  if (exIds.length > 0) {
    const { data: exNames } = await sb.from("exercises").select("id, name").in("id", exIds);
    (exNames ?? []).forEach((r: { id: string; name: string }) => {
      if (r?.id && r?.name) nameById.set(r.id, r.name);
    });
  }

  return {
    setEntries,
    entryExercises,
    exerciseNames: nameById,
    timeProtocols,
    dropSets,
    clusterSets,
    restPauseSets,
    speedByKey,
    enduranceByKey,
  };
}

const SET_LOG_SELECT =
  "set_entry_id, set_type, exercise_id, set_number, weight, reps, rpe, superset_exercise_a_id, superset_weight_a, superset_reps_a, superset_exercise_b_id, superset_weight_b, superset_reps_b, actual_time_seconds, actual_distance_meters, actual_hr_avg, actual_speed_kmh, dropset_drops, cluster_number, round_number, emom_minute_number, emom_total_reps_this_min, emom_total_duration_sec, dropset_initial_weight, dropset_initial_reps, dropset_final_weight, dropset_final_reps, rest_pause_initial_weight, rest_pause_initial_reps, rest_pause_reps_after, rest_pause_number, tabata_rounds_completed, tabata_total_duration_sec, fortime_time_taken_sec, fortime_time_cap_sec, fortime_total_reps, fortime_target_reps, amrap_duration_seconds, amrap_total_reps, amrap_target_reps, giant_set_exercises, preexhaust_isolation_exercise_id, preexhaust_isolation_weight, preexhaust_isolation_reps, preexhaust_compound_exercise_id, preexhaust_compound_weight, preexhaust_compound_reps, completed_at";

async function computeExecutionForProgramLog(
  sb: SupabaseClient,
  workoutLogId: string,
  programInstanceWorkoutId: string,
  bundle?: PrescriptionProtocolBundle | null
): Promise<number | null> {
  const { data: setLogsRaw, error: slErr } = await sb
    .from("workout_set_logs")
    .select(SET_LOG_SELECT)
    .eq("workout_log_id", workoutLogId);

  if (slErr) {
    console.error("[programInstanceWorkoutAdherence] workout_set_logs", slErr);
    return null;
  }

  const setLogs = (setLogsRaw ?? []) as CoachSetLogRow[];
  if (!setLogs.length) return null;

  const loadedBundle =
    bundle !== undefined
      ? bundle
      : await loadInstancePrescriptionProtocolBundle(sb, programInstanceWorkoutId);
  if (!loadedBundle?.setEntries.length) return null;

  const blocks = groupSetsIntoBlocks(setLogs as WorkoutLogSet[]);
  const prescribedRef = buildPrescribedWorkoutReference(blocks, loadedBundle);
  const protocolSlice = {
    timeProtocols: loadedBundle.timeProtocols,
    dropSets: loadedBundle.dropSets,
    clusterSets: loadedBundle.clusterSets,
    restPauseSets: loadedBundle.restPauseSets,
  };

  const res = computeWorkoutAdherence(
    setLogs,
    loadedBundle.setEntries,
    loadedBundle.entryExercises,
    loadedBundle.exerciseNames,
    {
      speedByKey: loadedBundle.speedByKey,
      enduranceByKey: loadedBundle.enduranceByKey,
    },
    protocolSlice,
    prescribedRef,
    blocks
  );

  return res.adherencePercent;
}

/**
 * Average execution % across program workout logs (instance prescriptions).
 * Returns null when no log has gradable set data.
 */
export async function batchExecutionForProgramWorkoutLogs(
  sb: SupabaseClient,
  logIds: string[]
): Promise<number | null> {
  if (logIds.length === 0) return null;

  const { data: logRows, error: logErr } = await sb
    .from("workout_logs")
    .select("id, program_day_assignment_id")
    .in("id", logIds);

  if (logErr || !logRows?.length) return null;

  const pdaIds = [
    ...new Set(
      (logRows.map((r) => r.program_day_assignment_id).filter(Boolean) ?? []) as string[]
    ),
  ];

  const pdaToInstanceWorkout = new Map<string, string>();
  if (pdaIds.length > 0) {
    const { data: pdaRows } = await sb
      .from("program_day_assignments")
      .select("id, program_instance_workout_id")
      .in("id", pdaIds);
    for (const row of pdaRows ?? []) {
      const wid = row.program_instance_workout_id as string | null;
      if (wid) pdaToInstanceWorkout.set(row.id as string, wid);
    }
  }

  const bundleByInstanceWorkout = new Map<string, PrescriptionProtocolBundle | null>();
  const pcts: number[] = [];

  for (const log of logRows) {
    const logId = log.id as string;
    const pdaId = log.program_day_assignment_id as string | null;
    if (!pdaId) continue;
    const instanceWorkoutId = pdaToInstanceWorkout.get(pdaId);
    if (!instanceWorkoutId) continue;

    if (!bundleByInstanceWorkout.has(instanceWorkoutId)) {
      bundleByInstanceWorkout.set(
        instanceWorkoutId,
        await loadInstancePrescriptionProtocolBundle(sb, instanceWorkoutId)
      );
    }

    const pct = await computeExecutionForProgramLog(
      sb,
      logId,
      instanceWorkoutId,
      bundleByInstanceWorkout.get(instanceWorkoutId)
    );
    if (pct != null && Number.isFinite(pct)) pcts.push(pct);
  }

  if (!pcts.length) return null;
  return Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
}
