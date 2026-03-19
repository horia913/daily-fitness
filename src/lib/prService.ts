import { supabase as browserSupabase } from "./supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * PersonalRecord interface matching the ACTUAL database schema
 */
export interface PersonalRecord {
  id: string;
  client_id: string;
  exercise_id: string;
  record_type: "weight" | "reps" | "distance" | "time" | "score";
  record_value: number;
  record_unit: string;
  achieved_date: string; // DATE format YYYY-MM-DD
  workout_assignment_id: string | null;
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

export interface PRCheckResult {
  isNewPR: boolean;
  prType?: string;
  improvement?: number;
  pr?: PersonalRecord;
}

/**
 * Check if a set is a new PR and store it in personal_records table.
 * Accepts optional supabaseClient for server-side calls (bypasses RLS).
 * Falls back to browser client for client-side usage.
 */
export async function checkAndStorePR(
  clientId: string,
  setData: {
    exercise_id: string;
    weight: number;
    reps: number;
    workout_assignment_id?: string;
    completed_at?: string;
  },
  supabaseClient?: SupabaseClient
): Promise<PRCheckResult | null> {
  const supabase = supabaseClient || browserSupabase;
  try {
    if (!setData.weight || !setData.reps || setData.weight <= 0 || setData.reps <= 0) {
      return null;
    }

    const achievedDate = setData.completed_at
      ? new Date(setData.completed_at).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    let hasNewPR = false;
    let prType = "";
    let improvement = 0;
    let newPR: PersonalRecord | null = null;

    // 1. Check for max weight PR (record_type = 'weight')
    const { data: currentWeightPR, error: weightError } = await supabase
      .from("personal_records")
      .select("*")
      .eq("client_id", clientId)
      .eq("exercise_id", setData.exercise_id)
      .eq("record_type", "weight")
      .eq("is_current_record", true)
      .maybeSingle();

    if (weightError) {
      console.error("Error fetching current weight PR:", weightError);
    }

    const currentMaxWeight = currentWeightPR?.record_value || 0;
    if (setData.weight > currentMaxWeight) {
      // Mark old PR as not current
      if (currentWeightPR) {
        await supabase
          .from("personal_records")
          .update({ is_current_record: false, updated_at: new Date().toISOString() })
          .eq("id", currentWeightPR.id);
      }

      // Calculate improvement
      const previousValue = currentWeightPR?.record_value || null;
      const improvementPercent = previousValue
        ? ((setData.weight - previousValue) / previousValue) * 100
        : null;

      // Insert new weight PR
      const { data: insertedPR, error: insertError } = await supabase
        .from("personal_records")
        .insert({
          client_id: clientId,
          exercise_id: setData.exercise_id,
          record_type: "weight",
          record_value: setData.weight,
          record_unit: "kg",
          achieved_date: achievedDate,
          workout_assignment_id: setData.workout_assignment_id || null,
          previous_record_value: previousValue,
          improvement_percentage: improvementPercent,
          is_current_record: true,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error inserting weight PR:", insertError);
        return null;
      }

      hasNewPR = true;
      prType = "weight";
      improvement = improvementPercent || 0;
      newPR = insertedPR as PersonalRecord;
    }

    // 2. Check for max reps PR (record_type = 'reps')
    // Only create reps PR if this rep count is higher than current reps PR
    const { data: currentRepsPR, error: repsError } = await supabase
      .from("personal_records")
      .select("*")
      .eq("client_id", clientId)
      .eq("exercise_id", setData.exercise_id)
      .eq("record_type", "reps")
      .eq("is_current_record", true)
      .maybeSingle();

    if (repsError) {
      console.error("Error fetching current reps PR:", repsError);
    }

    const currentMaxReps = currentRepsPR?.record_value || 0;
    if (setData.reps > currentMaxReps) {
      // Mark old PR as not current
      if (currentRepsPR) {
        await supabase
          .from("personal_records")
          .update({ is_current_record: false, updated_at: new Date().toISOString() })
          .eq("id", currentRepsPR.id);
      }

      // Calculate improvement
      const previousValue = currentRepsPR?.record_value || null;
      const improvementPercent = previousValue
        ? ((setData.reps - previousValue) / previousValue) * 100
        : null;

      // Insert new reps PR
      const { data: insertedRepsPR, error: insertRepsError } = await supabase
        .from("personal_records")
        .insert({
          client_id: clientId,
          exercise_id: setData.exercise_id,
          record_type: "reps",
          record_value: setData.reps,
          record_unit: "reps",
          achieved_date: achievedDate,
          workout_assignment_id: setData.workout_assignment_id || null,
          previous_record_value: previousValue,
          improvement_percentage: improvementPercent,
          is_current_record: true,
        })
        .select()
        .single();

      if (insertRepsError) {
        console.error("Error inserting reps PR:", insertRepsError);
      } else {
        // If weight PR wasn't set but reps PR was, return that
        if (!hasNewPR) {
          hasNewPR = true;
          prType = "reps";
          improvement = improvementPercent || 0;
          newPR = insertedRepsPR as PersonalRecord;
        }
      }
    }

    return {
      isNewPR: hasNewPR,
      prType: hasNewPR ? prType : undefined,
      improvement: hasNewPR ? improvement : undefined,
      pr: newPR || undefined,
    };
  } catch (error) {
    console.error("Error checking PR:", error);
    return null;
  }
}

/**
 * Backfill PRs from historical workout_set_logs data
 * Processes chronologically and creates PR entries with correct schema columns
 */
export async function backfillPRs(clientId: string): Promise<number> {
  try {
    const supabase = browserSupabase;
    // Check if PRs already exist
    const { count: existingCount } = await supabase
      .from("personal_records")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId);

    if (existingCount && existingCount > 0) {
      // Already has PRs, skip backfill
      return 0;
    }

    // Get all workout logs for client
    const { data: workoutLogs, error: logsError } = await supabase
      .from("workout_logs")
      .select("id, workout_assignment_id")
      .eq("client_id", clientId)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: true });

    if (logsError || !workoutLogs || workoutLogs.length === 0) {
      return 0;
    }

    const logIds = workoutLogs.map((log) => log.id);
    const workoutAssignmentMap = new Map(
      workoutLogs.map((log) => [log.id, log.workout_assignment_id])
    );

    // Get all set logs with exercise info, ordered chronologically
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
      `
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

    // Track running maxes per exercise (chronologically)
    const exerciseMaxes = new Map<
      string,
      {
        exercise_id: string;
        maxWeight: { value: number; date: string; workout_assignment_id: string | null };
        maxReps: { value: number; date: string; workout_assignment_id: string | null };
      }
    >();

    // Process chronologically to track when each PR was first achieved
    setLogs.forEach((setLog: any) => {
      const exercise = setLog.exercises;
      if (!exercise || !exercise.id) return;

      const exerciseId = exercise.id;
      const weight = setLog.weight;
      const reps = setLog.reps;
      const date = new Date(setLog.completed_at).toISOString().split("T")[0];
      const workoutAssignmentId =
        workoutAssignmentMap.get(setLog.workout_log_id) || null;

      if (!exerciseMaxes.has(exerciseId)) {
        exerciseMaxes.set(exerciseId, {
          exercise_id: exerciseId,
          maxWeight: { value: weight, date, workout_assignment_id: workoutAssignmentId },
          maxReps: { value: reps, date, workout_assignment_id: workoutAssignmentId },
        });
      } else {
        const maxes = exerciseMaxes.get(exerciseId)!;
        // Update max weight if this is higher
        if (weight > maxes.maxWeight.value) {
          maxes.maxWeight = { value: weight, date, workout_assignment_id: workoutAssignmentId };
        }
        // Update max reps if this is higher
        if (reps > maxes.maxReps.value) {
          maxes.maxReps = { value: reps, date, workout_assignment_id: workoutAssignmentId };
        }
      }
    });

    // Insert PRs into database (only current records, no previous values for backfill)
    const prsToInsert: any[] = [];
    exerciseMaxes.forEach((maxes) => {
      // Weight PR
      prsToInsert.push({
        client_id: clientId,
        exercise_id: maxes.exercise_id,
        record_type: "weight",
        record_value: maxes.maxWeight.value,
        record_unit: "kg",
        achieved_date: maxes.maxWeight.date,
        workout_assignment_id: maxes.maxWeight.workout_assignment_id,
        previous_record_value: null,
        improvement_percentage: null,
        is_current_record: true,
      });

      // Reps PR
      prsToInsert.push({
        client_id: clientId,
        exercise_id: maxes.exercise_id,
        record_type: "reps",
        record_value: maxes.maxReps.value,
        record_unit: "reps",
        achieved_date: maxes.maxReps.date,
        workout_assignment_id: maxes.maxReps.workout_assignment_id,
        previous_record_value: null,
        improvement_percentage: null,
        is_current_record: true,
      });
    });

    if (prsToInsert.length > 0) {
      const { error: insertError } = await supabase.from("personal_records").insert(prsToInsert);
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

/**
 * Get PR timeline (chronological list of PRs)
 * Joins to exercises table to get exercise names
 */
export async function getPRTimeline(
  clientId: string,
  limit?: number,
  exerciseId?: string
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
      `
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

/**
 * Get PRs for a specific exercise
 */
export async function getExercisePRs(
  clientId: string,
  exerciseId: string
): Promise<PersonalRecord[]> {
  return getPRTimeline(clientId, undefined, exerciseId);
}

/**
 * Get PR statistics
 */
export async function getPRStats(clientId: string): Promise<{
  totalPRs: number;
  prsThisMonth: number;
  prsThisWeek: number;
  latestPR: PersonalRecord | null;
  mostImproved: PersonalRecord | null;
}> {
  try {
    const supabase = browserSupabase;
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - now.getDay()); // Monday
    thisWeekStart.setHours(0, 0, 0, 0);

    const monthStartStr = thisMonthStart.toISOString().split("T")[0];
    const weekStartStr = thisWeekStart.toISOString().split("T")[0];

    // Total PRs
    const { count: totalPRs } = await supabase
      .from("personal_records")
      .select("*", { count: "exact", head: true })
      .eq("client_id", clientId);

    // PRs this month
    const { count: prsThisMonth } = await supabase
      .from("personal_records")
      .select("*", { count: "exact", head: true })
      .eq("client_id", clientId)
      .gte("achieved_date", monthStartStr);

    // PRs this week
    const { count: prsThisWeek } = await supabase
      .from("personal_records")
      .select("*", { count: "exact", head: true })
      .eq("client_id", clientId)
      .gte("achieved_date", weekStartStr);

    // Latest PR
    const { data: latestPRData } = await supabase
      .from("personal_records")
      .select(
        `
        *,
        exercises (
          id,
          name
        )
      `
      )
      .eq("client_id", clientId)
      .order("achieved_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Most improved (highest improvement_percentage)
    const { data: allPRs } = await supabase
      .from("personal_records")
      .select(
        `
        *,
        exercises (
          id,
          name
        )
      `
      )
      .eq("client_id", clientId)
      .not("improvement_percentage", "is", null)
      .order("improvement_percentage", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      totalPRs: totalPRs || 0,
      prsThisMonth: prsThisMonth || 0,
      prsThisWeek: prsThisWeek || 0,
      latestPR: (latestPRData as PersonalRecord) || null,
      mostImproved: (allPRs as PersonalRecord) || null,
    };
  } catch (error) {
    console.error("Error fetching PR stats:", error);
    return {
      totalPRs: 0,
      prsThisMonth: 0,
      prsThisWeek: 0,
      latestPR: null,
      mostImproved: null,
    };
  }
}
