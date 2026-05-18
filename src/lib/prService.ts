import { supabase as browserSupabase } from "./supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Row shape aligned with `public.personal_records` (v2). */
export interface PersonalRecord {
  id: string;
  client_id: string;
  exercise_id: string;
  record_type: "max_strength" | "strength_endurance";
  record_value: number;
  record_unit: string;
  achieved_date: string;
  workout_assignment_id: string | null;
  workout_set_log_id?: string | null;
  weight_at_record?: number | null;
  reps_at_record?: number | null;
  previous_record_value: number | null;
  improvement_percentage: number | null;
  is_current_record: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  exercises?: {
    id: string;
    name: string;
  };
}

export type PRDetectionInput = {
  exercise_id: string;
  weight: number;
  reps: number;
  workout_assignment_id?: string | null;
  workout_log_id?: string | null;
  workout_set_log_id?: string | null;
  completed_at?: string;
};

export type PRDetectionResult = {
  max_strength?: {
    record_id: string;
    previous_value: number;
    new_value: number;
    improvement_pct: number | null;
  };
  strength_endurance?: {
    record_id: string;
    previous_value: number;
    new_value: number;
    improvement_pct: number | null;
    weight: number;
    reps: number;
    previous_weight?: number | null;
    previous_reps?: number | null;
  };
};

/** Pure helpers — unit-tested without DB. */
export function v2ShouldRecordMaxStrength(
  currentBest: number | null | undefined,
  weight: number,
): boolean {
  if (weight <= 0) return false;
  if (currentBest == null) return true;
  return weight > Number(currentBest);
}

export function v2ShouldRecordStrengthEndurance(
  currentBestVolume: number | null | undefined,
  volume: number,
): boolean {
  if (volume <= 0) return false;
  if (currentBestVolume == null) return true;
  return volume > Number(currentBestVolume);
}

export function prDetectionHasResult(r: PRDetectionResult): boolean {
  return !!(r.max_strength || r.strength_endurance);
}

/** One logged set = one PR moment; dual record_type rows share `workout_set_log_id`. */
export function countDistinctPrMoments(
  rows: ReadonlyArray<{ id: string; workout_set_log_id?: string | null }>,
): number {
  const keys = new Set<string>();
  for (const row of rows) {
    keys.add(row.workout_set_log_id ?? `legacy:${row.id}`);
  }
  return keys.size;
}

/** Client API / modal payload (POST /api/log-set `pr_detected`). */
export type PrDetectedPayload = {
  exercise_name: string;
  max_strength?: {
    weight: number;
    previous: number;
    improvement_pct: number | null;
  };
  strength_endurance?: {
    weight: number;
    reps: number;
    volume: number;
    previous_volume: number;
    /** Prior best lift when superseded (for volume PR modal). */
    previous_weight?: number | null;
    previous_reps?: number | null;
    improvement_pct: number | null;
  };
};

export function detectionResultToPrDetected(
  exerciseName: string,
  weight: number,
  reps: number,
  d: PRDetectionResult,
): PrDetectedPayload | null {
  if (!prDetectionHasResult(d)) return null;
  const out: PrDetectedPayload = { exercise_name: exerciseName };
  if (d.max_strength) {
    out.max_strength = {
      weight: d.max_strength.new_value,
      previous: d.max_strength.previous_value,
      improvement_pct: d.max_strength.improvement_pct,
    };
  }
  if (d.strength_endurance) {
    out.strength_endurance = {
      weight: d.strength_endurance.weight,
      reps: d.strength_endurance.reps,
      volume: d.strength_endurance.new_value,
      previous_volume: d.strength_endurance.previous_value,
      previous_weight: d.strength_endurance.previous_weight ?? null,
      previous_reps: d.strength_endurance.previous_reps ?? null,
      improvement_pct: d.strength_endurance.improvement_pct,
    };
  }
  return out;
}

function improvementPct(
  previous: number,
  next: number,
): number | null {
  if (previous <= 0) return null;
  return ((next - previous) / previous) * 100;
}

/**
 * v2 PR detection: max_strength + strength_endurance (independent).
 * Inserts new `personal_records` rows and flips prior `is_current_record`.
 */
export async function checkAndStorePR(
  clientId: string,
  setData: PRDetectionInput,
  supabase: SupabaseClient,
): Promise<PRDetectionResult> {
  const result: PRDetectionResult = {};
  try {
    if (setData.weight <= 0 || setData.reps <= 0) {
      return result;
    }

    const volume = setData.weight * setData.reps;
    const achievedDate = setData.completed_at
      ? new Date(setData.completed_at).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];
    const nowIso = new Date().toISOString();

    const baseInsert = {
      client_id: clientId,
      exercise_id: setData.exercise_id,
      achieved_date: achievedDate,
      workout_assignment_id: setData.workout_assignment_id ?? null,
      workout_set_log_id: setData.workout_set_log_id ?? null,
      weight_at_record: setData.weight,
      reps_at_record: setData.reps,
      is_current_record: true,
      notes: null as string | null,
    };

    // ----- Max strength -----
    const { data: curMs, error: msErr } = await supabase
      .from("personal_records")
      .select("*")
      .eq("client_id", clientId)
      .eq("exercise_id", setData.exercise_id)
      .eq("record_type", "max_strength")
      .eq("is_current_record", true)
      .maybeSingle();

    if (msErr) {
      console.error("Error fetching max_strength PR:", msErr);
    }

    const prevMs = curMs?.record_value != null ? Number(curMs.record_value) : null;
    if (v2ShouldRecordMaxStrength(prevMs, setData.weight)) {
      const previousValue = prevMs ?? 0;
      if (curMs?.id) {
        await supabase
          .from("personal_records")
          .update({ is_current_record: false, updated_at: nowIso })
          .eq("id", curMs.id);
      }
      const imp = improvementPct(previousValue, setData.weight);
      const { data: inserted, error: insErr } = await supabase
        .from("personal_records")
        .insert({
          ...baseInsert,
          record_type: "max_strength",
          record_value: setData.weight,
          record_unit: "kg",
          previous_record_value: curMs ? previousValue : null,
          improvement_percentage: imp,
        })
        .select("id")
        .single();

      if (insErr || !inserted?.id) {
        console.error("Error inserting max_strength PR:", insErr);
      } else {
        result.max_strength = {
          record_id: inserted.id,
          previous_value: previousValue,
          new_value: setData.weight,
          improvement_pct: imp,
        };
      }
    }

    // ----- Strength endurance -----
    const { data: curSe, error: seErr } = await supabase
      .from("personal_records")
      .select("*")
      .eq("client_id", clientId)
      .eq("exercise_id", setData.exercise_id)
      .eq("record_type", "strength_endurance")
      .eq("is_current_record", true)
      .maybeSingle();

    if (seErr) {
      console.error("Error fetching strength_endurance PR:", seErr);
    }

    const prevVol = curSe?.record_value != null ? Number(curSe.record_value) : null;
    if (v2ShouldRecordStrengthEndurance(prevVol, volume)) {
      const previousValue = prevVol ?? 0;
      if (curSe?.id) {
        await supabase
          .from("personal_records")
          .update({ is_current_record: false, updated_at: nowIso })
          .eq("id", curSe.id);
      }
      const imp = improvementPct(previousValue, volume);
      const { data: insertedSe, error: insSeErr } = await supabase
        .from("personal_records")
        .insert({
          ...baseInsert,
          record_type: "strength_endurance",
          record_value: volume,
          record_unit: "kg·reps",
          previous_record_value: curSe ? previousValue : null,
          improvement_percentage: imp,
        })
        .select("id")
        .single();

      if (insSeErr || !insertedSe?.id) {
        console.error("Error inserting strength_endurance PR:", insSeErr);
      } else {
        result.strength_endurance = {
          record_id: insertedSe.id,
          previous_value: previousValue,
          new_value: volume,
          improvement_pct: imp,
          weight: setData.weight,
          reps: setData.reps,
          previous_weight:
            curSe?.weight_at_record != null
              ? Number(curSe.weight_at_record)
              : null,
          previous_reps:
            curSe?.reps_at_record != null ? Number(curSe.reps_at_record) : null,
        };
      }
    }

    return result;
  } catch (error) {
    console.error("Error checking PR:", error);
    return result;
  }
}

/**
 * Rebuild `pr_detected` payload from rows stored for a set log (dedupe replay).
 */
export function personalRecordRowsToPrDetected(
  exerciseName: string,
  rows: Array<{
    record_type: string;
    record_value: number | string | null;
    previous_record_value?: number | string | null;
    improvement_percentage?: number | string | null;
    weight_at_record?: number | string | null;
    reps_at_record?: number | string | null;
  }>,
): PrDetectedPayload | null {
  const out: PrDetectedPayload = { exercise_name: exerciseName };
  let any = false;
  for (const r of rows) {
    const rv = Number(r.record_value);
    const pv = Number(r.previous_record_value ?? 0);
    const imp =
      r.improvement_percentage != null && r.improvement_percentage !== ""
        ? Number(r.improvement_percentage)
        : null;
    if (r.record_type === "max_strength" && Number.isFinite(rv)) {
      any = true;
      out.max_strength = {
        weight: rv,
        previous: Number.isFinite(pv) ? pv : 0,
        improvement_pct: Number.isFinite(imp!) ? imp : null,
      };
    }
    if (r.record_type === "strength_endurance" && Number.isFinite(rv)) {
      any = true;
      const w = Number(r.weight_at_record ?? 0);
      const reps = Number(r.reps_at_record ?? 0);
      out.strength_endurance = {
        weight: w,
        reps,
        volume: rv,
        previous_volume: Number.isFinite(pv) ? pv : 0,
        previous_weight: null,
        previous_reps: null,
        improvement_pct: Number.isFinite(imp!) ? imp : null,
      };
    }
  }
  return any ? out : null;
}

/**
 * Backfill PRs from historical workout_set_logs data (client browser; skips if any PR exists).
 */
export async function backfillPRs(clientId: string): Promise<number> {
  try {
    const supabase = browserSupabase;
    const { count: existingCount } = await supabase
      .from("personal_records")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId);

    if (existingCount && existingCount > 0) {
      return 0;
    }

    const { data: workoutLogs, error: logsError } = await supabase
      .from("workout_logs")
      .select("id, workout_assignment_id, completed_at")
      .eq("client_id", clientId)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: true });

    if (logsError || !workoutLogs || workoutLogs.length === 0) {
      return 0;
    }

    const logIds = workoutLogs.map((log) => log.id);
    const workoutAssignmentMap = new Map(
      workoutLogs.map((log) => [log.id, log.workout_assignment_id]),
    );

    const { data: setLogs, error: setsError } = await supabase
      .from("workout_set_logs")
      .select(
        `
        id,
        workout_log_id,
        exercise_id,
        weight,
        reps,
        completed_at,
        exercises (
          id,
          name
        )
      `,
      )
      .in("workout_log_id", logIds)
      .not("weight", "is", null)
      .not("reps", "is", null)
      .gt("weight", 0)
      .gt("reps", 0)
      .order("completed_at", { ascending: true });

    if (setsError || !setLogs || setLogs.length === 0) {
      return 0;
    }

    const exerciseMaxes = new Map<
      string,
      {
        exercise_id: string;
        maxWeight: { value: number; date: string; workout_assignment_id: string | null; setLogId: string | null; reps: number };
        maxVolume: { value: number; date: string; workout_assignment_id: string | null; setLogId: string | null; weight: number; reps: number };
      }
    >();

    for (const setLog of setLogs as any[]) {
      const exercise = setLog.exercises;
      if (!exercise?.id) continue;

      const exerciseId = exercise.id as string;
      const weight = Number(setLog.weight);
      const reps = Number(setLog.reps);
      const vol = weight * reps;
      const date = new Date(setLog.completed_at).toISOString().split("T")[0];
      const workoutAssignmentId =
        workoutAssignmentMap.get(setLog.workout_log_id) || null;
      const setLogId = setLog.id as string | null;

      if (!exerciseMaxes.has(exerciseId)) {
        exerciseMaxes.set(exerciseId, {
          exercise_id: exerciseId,
          maxWeight: {
            value: weight,
            date,
            workout_assignment_id: workoutAssignmentId,
            setLogId,
            reps,
          },
          maxVolume: {
            value: vol,
            date,
            workout_assignment_id: workoutAssignmentId,
            setLogId,
            weight,
            reps,
          },
        });
      } else {
        const maxes = exerciseMaxes.get(exerciseId)!;
        if (weight > maxes.maxWeight.value) {
          maxes.maxWeight = {
            value: weight,
            date,
            workout_assignment_id: workoutAssignmentId,
            setLogId,
            reps,
          };
        }
        if (vol > maxes.maxVolume.value) {
          maxes.maxVolume = {
            value: vol,
            date,
            workout_assignment_id: workoutAssignmentId,
            setLogId,
            weight,
            reps,
          };
        }
      }
    }

    const prsToInsert: Record<string, unknown>[] = [];
    exerciseMaxes.forEach((maxes) => {
      prsToInsert.push({
        client_id: clientId,
        exercise_id: maxes.exercise_id,
        record_type: "max_strength",
        record_value: maxes.maxWeight.value,
        record_unit: "kg",
        achieved_date: maxes.maxWeight.date,
        workout_assignment_id: maxes.maxWeight.workout_assignment_id,
        workout_set_log_id: maxes.maxWeight.setLogId,
        weight_at_record: maxes.maxWeight.value,
        reps_at_record: maxes.maxWeight.reps,
        previous_record_value: null,
        improvement_percentage: null,
        is_current_record: true,
      });

      prsToInsert.push({
        client_id: clientId,
        exercise_id: maxes.exercise_id,
        record_type: "strength_endurance",
        record_value: maxes.maxVolume.value,
        record_unit: "kg·reps",
        achieved_date: maxes.maxVolume.date,
        workout_assignment_id: maxes.maxVolume.workout_assignment_id,
        workout_set_log_id: maxes.maxVolume.setLogId,
        weight_at_record: maxes.maxVolume.weight,
        reps_at_record: maxes.maxVolume.reps,
        previous_record_value: null,
        improvement_percentage: null,
        is_current_record: true,
      });
    });

    if (prsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("personal_records")
        .insert(prsToInsert);
      if (insertError) {
        console.error("Error inserting backfilled PRs:", insertError);
        return 0;
      }
    }

    return prsToInsert.length;
  } catch (error) {
    console.error("Error backfilling PRs:", error);
    return 0;
  }
}

export async function getPRTimeline(
  clientId: string,
  limit?: number,
  exerciseId?: string,
): Promise<PersonalRecord[]> {
  try {
    const supabase = browserSupabase;
    let query = supabase
      .from("personal_records")
      .select(
        `
        *,
        exercises (
          id,
          name
        )
      `,
      )
      .eq("client_id", clientId)
      .order("achieved_date", { ascending: false });

    if (exerciseId) {
      query = query.eq("exercise_id", exerciseId);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching PR timeline:", error);
      return [];
    }

    return (data || []) as PersonalRecord[];
  } catch (error) {
    console.error("Error fetching PR timeline:", error);
    return [];
  }
}

export async function getExercisePRs(
  clientId: string,
  exerciseId: string,
): Promise<PersonalRecord[]> {
  return getPRTimeline(clientId, undefined, exerciseId);
}

export async function getPRStats(clientId: string): Promise<{
  totalPRs: number;
  /** Unique logged sets that earned a PR (dedupes dual max_strength + strength_endurance). */
  prsThisMonth: number;
  prsThisWeek: number;
  /** Raw `personal_records` rows in period (for dual-PR subtitle when > moment count). */
  prRecordRowsThisMonth: number;
  prRecordRowsThisWeek: number;
  latestPR: PersonalRecord | null;
  mostImproved: PersonalRecord | null;
}> {
  try {
    const supabase = browserSupabase;
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - now.getDay());
    thisWeekStart.setHours(0, 0, 0, 0);

    const monthStartStr = thisMonthStart.toISOString().split("T")[0];
    const weekStartStr = thisWeekStart.toISOString().split("T")[0];

    const { count: totalPRs } = await supabase
      .from("personal_records")
      .select("*", { count: "exact", head: true })
      .eq("client_id", clientId);

    const { data: monthPeriodRows } = await supabase
      .from("personal_records")
      .select("id, workout_set_log_id, achieved_date")
      .eq("client_id", clientId)
      .gte("achieved_date", monthStartStr);

    const monthRows = monthPeriodRows ?? [];
    const weekRows = monthRows.filter((r) => r.achieved_date >= weekStartStr);
    const prsThisMonth = countDistinctPrMoments(monthRows);
    const prsThisWeek = countDistinctPrMoments(weekRows);
    const prRecordRowsThisMonth = monthRows.length;
    const prRecordRowsThisWeek = weekRows.length;

    const { data: latestPRData } = await supabase
      .from("personal_records")
      .select(
        `
        *,
        exercises (
          id,
          name
        )
      `,
      )
      .eq("client_id", clientId)
      .order("achieved_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: allPRs } = await supabase
      .from("personal_records")
      .select(
        `
        *,
        exercises (
          id,
          name
        )
      `,
      )
      .eq("client_id", clientId)
      .not("improvement_percentage", "is", null)
      .order("improvement_percentage", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      totalPRs: totalPRs || 0,
      prsThisMonth,
      prsThisWeek,
      prRecordRowsThisMonth,
      prRecordRowsThisWeek,
      latestPR: (latestPRData as PersonalRecord) || null,
      mostImproved: (allPRs as PersonalRecord) || null,
    };
  } catch (error) {
    console.error("Error fetching PR stats:", error);
    return {
      totalPRs: 0,
      prsThisMonth: 0,
      prsThisWeek: 0,
      prRecordRowsThisMonth: 0,
      prRecordRowsThisWeek: 0,
      latestPR: null,
      mostImproved: null,
    };
  }
}
