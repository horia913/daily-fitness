import { supabase } from "./supabase";

export interface WeeklyVolume {
  weekStart: string; // Monday of that week (ISO date string)
  totalVolume: number; // sum of (weight × reps) for all sets
  totalSets: number;
  totalReps: number;
  workoutCount: number;
  avgVolumePerWorkout: number;
}

export interface VolumeStats {
  weeklyData: WeeklyVolume[];
  currentWeekVolume: number;
  previousWeekVolume: number;
  weekOverWeekChange: number; // % change
  fourWeekAvg: number;
  trend: "increasing" | "stable" | "decreasing";
}

export interface VolumeByWorkout {
  date: string;
  workoutName: string | null;
  totalVolume: number;
  sets: number;
  duration: number | null;
}

/**
 * Get the Monday (start of ISO week) for a given date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  return new Date(d.setDate(diff));
}

/**
 * Format week start date for display
 */
function formatWeekLabel(weekStart: string): string {
  const date = new Date(weekStart + "T12:00:00");
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = date.getDate();
  return `${month} ${day}`;
}

/**
 * Calculate volume from a set log entry
 * Handles special block types (dropsets, supersets, etc.)
 */
export function calculateSetVolume(setLog: any): number {
  const blockType = setLog.set_type;

  // Straight sets, rest-pause, cluster sets
  if (
    blockType === "straight_set" ||
    blockType === "rest_pause" ||
    blockType === "cluster_set"
  ) {
    const weight = setLog.weight || 0;
    const reps = setLog.reps || 0;
    return weight * reps;
  }

  // Drop sets
  if (blockType === "drop_set") {
    const initial = (setLog.dropset_initial_weight || 0) * (setLog.dropset_initial_reps || 0);
    const final = (setLog.dropset_final_weight || 0) * (setLog.dropset_final_reps || 0);
    return initial + final;
  }

  // Supersets
  if (blockType === "superset") {
    const a = (setLog.superset_weight_a || 0) * (setLog.superset_reps_a || 0);
    const b = (setLog.superset_weight_b || 0) * (setLog.superset_reps_b || 0);
    return a + b;
  }

  // Giant sets (JSON array of exercises)
  if (blockType === "giant_set" && setLog.giant_set_exercises) {
    try {
      const exercises = Array.isArray(setLog.giant_set_exercises)
        ? setLog.giant_set_exercises
        : JSON.parse(setLog.giant_set_exercises);
      return exercises.reduce((sum: number, ex: any) => {
        return sum + ((ex.weight || 0) * (ex.reps || 0));
      }, 0);
    } catch {
      return 0;
    }
  }

  // Pre-exhaustion
  if (blockType === "pre_exhaustion") {
    const isolation = (setLog.preexhaust_isolation_weight || 0) * (setLog.preexhaust_isolation_reps || 0);
    const compound = (setLog.preexhaust_compound_weight || 0) * (setLog.preexhaust_compound_reps || 0);
    return isolation + compound;
  }

  // Time-based protocols (AMRAP, EMOM, etc.) - volume is reps-based, no weight
  if (
    blockType === "amrap" ||
    blockType === "emom" ||
    blockType === "for_time" ||
    blockType === "tabata"
  ) {
    // For time-based, we could use reps × bodyweight or just reps
    // For now, return 0 as volume is weight × reps
    return 0;
  }

  // Default: weight × reps
  return (setLog.weight || 0) * (setLog.reps || 0);
}

/**
 * Get weekly volume data for the specified number of weeks
 */
export async function getWeeklyVolume(
  clientId: string,
  weeks: number = 12
): Promise<VolumeStats> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - weeks * 7);

    // Get all workout logs in date range
    const { data: workoutLogs, error: logsError } = await supabase
      .from("workout_logs")
      .select("id, completed_at")
      .eq("client_id", clientId)
      .not("completed_at", "is", null)
      .gte("completed_at", startDate.toISOString())
      .lte("completed_at", endDate.toISOString())
      .order("completed_at", { ascending: true });

    if (logsError) throw logsError;
    if (!workoutLogs || workoutLogs.length === 0) {
      return {
        weeklyData: [],
        currentWeekVolume: 0,
        previousWeekVolume: 0,
        weekOverWeekChange: 0,
        fourWeekAvg: 0,
        trend: "stable",
      };
    }

    const logIds = workoutLogs.map((log) => log.id);

    // Get all set logs with workout log info
    const { data: setLogs, error: setsError } = await supabase
      .from("workout_set_logs")
      .select(
        `
        id,
        workout_log_id,
        set_type,
        weight,
        reps,
        completed_at,
        dropset_initial_weight,
        dropset_initial_reps,
        dropset_final_weight,
        dropset_final_reps,
        superset_weight_a,
        superset_reps_a,
        superset_weight_b,
        superset_reps_b,
        giant_set_exercises,
        preexhaust_isolation_weight,
        preexhaust_isolation_reps,
        preexhaust_compound_weight,
        preexhaust_compound_reps
      `
      )
      .in("workout_log_id", logIds)
      .order("completed_at", { ascending: true });

    if (setsError) throw setsError;

    // Group by week
    const weekMap = new Map<string, WeeklyVolume>();
    const workoutWeekMap = new Map<string, Set<string>>(); // week -> set of workout_log_ids

    // Initialize weeks
    const now = new Date();
    for (let i = weeks - 1; i >= 0; i--) {
      const weekDate = new Date(now);
      weekDate.setDate(weekDate.getDate() - i * 7);
      const weekStart = getWeekStart(weekDate);
      const weekKey = weekStart.toISOString().split("T")[0];
      weekMap.set(weekKey, {
        weekStart: weekKey,
        totalVolume: 0,
        totalSets: 0,
        totalReps: 0,
        workoutCount: 0,
        avgVolumePerWorkout: 0,
      });
      workoutWeekMap.set(weekKey, new Set());
    }

    // Process set logs
    setLogs?.forEach((setLog) => {
      const completedAt = new Date(setLog.completed_at);
      const weekStart = getWeekStart(completedAt);
      const weekKey = weekStart.toISOString().split("T")[0];

      if (!weekMap.has(weekKey)) {
        // Week outside our range, skip
        return;
      }

      const weekData = weekMap.get(weekKey)!;
      const volume = calculateSetVolume(setLog);
      weekData.totalVolume += volume;
      weekData.totalSets += 1;
      weekData.totalReps += (setLog.reps || 0);

      // Track unique workouts
      workoutWeekMap.get(weekKey)?.add(setLog.workout_log_id);
    });

    // Calculate workout counts and averages
    weekMap.forEach((weekData, weekKey) => {
      const workoutIds = workoutWeekMap.get(weekKey);
      weekData.workoutCount = workoutIds?.size || 0;
      weekData.avgVolumePerWorkout =
        weekData.workoutCount > 0 ? weekData.totalVolume / weekData.workoutCount : 0;
    });

    // Convert to sorted array
    const weeklyData = Array.from(weekMap.values()).sort(
      (a, b) => a.weekStart.localeCompare(b.weekStart)
    );

    // Calculate stats
    const currentWeek = weeklyData[weeklyData.length - 1];
    const previousWeek = weeklyData[weeklyData.length - 2];
    const currentWeekVolume = currentWeek?.totalVolume || 0;
    const previousWeekVolume = previousWeek?.totalVolume || 0;
    const weekOverWeekChange =
      previousWeekVolume > 0
        ? ((currentWeekVolume - previousWeekVolume) / previousWeekVolume) * 100
        : 0;

    // Four-week average (last 4 weeks)
    const lastFourWeeks = weeklyData.slice(-4);
    const fourWeekAvg =
      lastFourWeeks.length > 0
        ? lastFourWeeks.reduce((sum, w) => sum + w.totalVolume, 0) / lastFourWeeks.length
        : 0;

    // Determine trend (compare last 2 weeks vs previous 2 weeks)
    const lastTwoWeeks = weeklyData.slice(-2);
    const previousTwoWeeks = weeklyData.slice(-4, -2);
    const lastTwoAvg =
      lastTwoWeeks.length > 0
        ? lastTwoWeeks.reduce((sum, w) => sum + w.totalVolume, 0) / lastTwoWeeks.length
        : 0;
    const previousTwoAvg =
      previousTwoWeeks.length > 0
        ? previousTwoWeeks.reduce((sum, w) => sum + w.totalVolume, 0) / previousTwoWeeks.length
        : 0;

    let trend: "increasing" | "stable" | "decreasing" = "stable";
    if (previousTwoAvg > 0) {
      const change = ((lastTwoAvg - previousTwoAvg) / previousTwoAvg) * 100;
      if (change > 5) trend = "increasing";
      else if (change < -5) trend = "decreasing";
    }

    return {
      weeklyData,
      currentWeekVolume,
      previousWeekVolume,
      weekOverWeekChange,
      fourWeekAvg,
      trend,
    };
  } catch (error) {
    console.error("Error loading weekly volume:", error);
    return {
      weeklyData: [],
      currentWeekVolume: 0,
      previousWeekVolume: 0,
      weekOverWeekChange: 0,
      fourWeekAvg: 0,
      trend: "stable",
    };
  }
}

/**
 * Get volume by individual workout (for comparison)
 */
export async function getVolumeByWorkout(
  clientId: string,
  lastN: number = 10
): Promise<VolumeByWorkout[]> {
  try {
    const { data: workoutLogs, error: logsError } = await supabase
      .from("workout_logs")
      .select(
        `
        id,
        completed_at,
        total_duration_minutes,
        workout_assignments (
          name
        )
      `
      )
      .eq("client_id", clientId)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(lastN);

    if (logsError) throw logsError;
    if (!workoutLogs || workoutLogs.length === 0) {
      return [];
    }

    const logIds = workoutLogs.map((log) => log.id);

    const { data: setLogs, error: setsError } = await supabase
      .from("workout_set_logs")
      .select(
        `
        workout_log_id,
        set_type,
        weight,
        reps,
        dropset_initial_weight,
        dropset_initial_reps,
        dropset_final_weight,
        dropset_final_reps,
        superset_weight_a,
        superset_reps_a,
        superset_weight_b,
        superset_reps_b,
        giant_set_exercises,
        preexhaust_isolation_weight,
        preexhaust_isolation_reps,
        preexhaust_compound_weight,
        preexhaust_compound_reps
      `
      )
      .in("workout_log_id", logIds);

    if (setsError) throw setsError;

    // Group by workout
    const workoutMap = new Map<string, VolumeByWorkout>();

    workoutLogs.forEach((log: any) => {
      const date = new Date(log.completed_at).toISOString().split("T")[0];
      workoutMap.set(log.id, {
        date,
        workoutName: log.workout_assignments?.name || null,
        totalVolume: 0,
        sets: 0,
        duration: log.total_duration_minutes,
      });
    });

    setLogs?.forEach((setLog) => {
      const workout = workoutMap.get(setLog.workout_log_id);
      if (!workout) return;

      const volume = calculateSetVolume(setLog);
      workout.totalVolume += volume;
      workout.sets += 1;
    });

    return Array.from(workoutMap.values()).sort((a, b) =>
      b.date.localeCompare(a.date)
    );
  } catch (error) {
    console.error("Error loading volume by workout:", error);
    return [];
  }
}

export interface WorkoutWithVolumeForSleep {
  workoutDate: string;
  previousNightDate: string;
  volume: number;
}

/** Get workouts in last N days with volume per workout for sleep-vs-performance analysis. */
export async function getWorkoutsWithVolumeForSleepAnalysis(
  clientId: string,
  days: number = 30
): Promise<WorkoutWithVolumeForSleep[]> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: workoutLogs, error: logsError } = await supabase
      .from("workout_logs")
      .select("id, completed_at")
      .eq("client_id", clientId)
      .not("completed_at", "is", null)
      .gte("completed_at", startDate.toISOString())
      .lte("completed_at", endDate.toISOString())
      .order("completed_at", { ascending: true });

    if (logsError) throw logsError;
    if (!workoutLogs || workoutLogs.length === 0) return [];

    const logIds = workoutLogs.map((log) => log.id);

    const { data: setLogs, error: setsError } = await supabase
      .from("workout_set_logs")
      .select(
        "workout_log_id, set_type, weight, reps, dropset_initial_weight, dropset_initial_reps, dropset_final_weight, dropset_final_reps, superset_weight_a, superset_reps_a, superset_weight_b, superset_reps_b, giant_set_exercises, preexhaust_isolation_weight, preexhaust_isolation_reps, preexhaust_compound_weight, preexhaust_compound_reps"
      )
      .in("workout_log_id", logIds);

    if (setsError) throw setsError;

    const workoutVolumeMap = new Map<string, number>();
    const workoutDateMap = new Map<string, string>();

    workoutLogs.forEach((log: any) => {
      const d = new Date(log.completed_at);
      const dateStr = d.toISOString().split("T")[0];
      workoutDateMap.set(log.id, dateStr);
      workoutVolumeMap.set(log.id, 0);
    });

    setLogs?.forEach((setLog) => {
      const vol = workoutVolumeMap.get(setLog.workout_log_id);
      if (vol === undefined) return;
      workoutVolumeMap.set(setLog.workout_log_id, vol + calculateSetVolume(setLog));
    });

    const result: WorkoutWithVolumeForSleep[] = [];
    workoutDateMap.forEach((workoutDate, logId) => {
      const volume = workoutVolumeMap.get(logId) ?? 0;
      const prev = new Date(workoutDate + "T12:00:00");
      prev.setDate(prev.getDate() - 1);
      const previousNightDate = prev.toISOString().split("T")[0];
      result.push({ workoutDate, previousNightDate, volume });
    });

    return result.sort((a, b) => a.workoutDate.localeCompare(b.workoutDate));
  } catch (error) {
    console.error("Error loading workouts for sleep analysis:", error);
    return [];
  }
}
