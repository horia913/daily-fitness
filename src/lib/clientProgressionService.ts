/**
 * Client Progression Service
 * Compares previous week's logged workouts to current week's progression rules
 * and calculates progression suggestions for display in the workout executor
 */

import { supabase } from './supabase';

// ============================================================================
// INTERFACES
// ============================================================================

export interface ProgressionSuggestion {
  // Existing fields (unchanged)
  exerciseId: string;
  exerciseName: string;
  message: string;
  suggestedWeightIncrease?: number;
  suggestedWeightIncreaseKg?: number;
  currentWeight?: number;
  previousReps?: number;
  targetRepsMin?: number;
  targetRepsMax?: number;
  // New fields
  type?: 'progress' | 'repeat' | 'match' | 'plateau' | 'deload' | 'first_time';
  suggestedWeight?: number | null;
  suggestedReps?: number | null;
  confidence?: 'high' | 'medium' | 'low';
}

/** One row from the client’s most recent session that included this exercise */
export interface LastSessionSetRow {
  set_number: number;
  weight_kg: number | null;
  reps_completed: number | null;
  rpe: number | null;
  /** Populated for speed_work / endurance logs when present on workout_set_logs */
  actual_time_seconds?: number | null;
  actual_distance_meters?: number | null;
  actual_hr_avg?: number | null;
  actual_speed_kmh?: number | null;
}

export interface ExercisePreviousPerformance {
  lastWorkout: {
    weight: number | null;
    reps: number | null;
    sets: number;
    avgRpe: number | null;
    date: string;
    workout_log_id: string;
    /** Per-set log from that session, ordered by set_number */
    setDetails: LastSessionSetRow[];
    /** When the last session used speed_work / endurance logging */
    executionKind?: 'strength' | 'speed_work' | 'endurance';
  } | null;
  personalBest: {
    maxWeight: number | null;
    maxReps: number | null;
    date: string;
  } | null;
}

interface PreviousWeekData {
  averageReps: number;
  averageWeight: number;
  setsCompleted: number;
  maxReps: number;
  minReps: number;
  // New fields
  averageRpe: number | null;
  rpeCount: number;
  weeksAtSameWeight: number;
}

interface CurrentWeekRules {
  targetRepsMin: number;
  targetRepsMax: number;
  targetSets: number;
  targetWeight?: number;
}

// ============================================================================
// HELPER — round weight to nearest plate increment (2.5 kg)
// ============================================================================

function roundToPlate(weight: number): number {
  return Math.round(weight / 2.5) * 2.5;
}

type WorkoutLogRow = {
  id: string;
  completed_at: string;
  workout_assignment_id: string;
};

function buildLastWorkoutFromSetRows(
  lastSets: Array<{
    set_number: number;
    weight_kg: number | null;
    reps_completed: number | null;
    rpe: number | null;
    actual_time_seconds?: number | null;
    actual_distance_meters?: number | null;
    actual_hr_avg?: number | null;
    actual_speed_kmh?: number | null;
  }>,
  lastWorkoutLogId: string,
  completedAt: string
): ExercisePreviousPerformance['lastWorkout'] {
  if (lastSets.length === 0) return null;

  const weightsWithValues = lastSets.filter((s) => s.weight_kg !== null);
  const repsWithValues = lastSets.filter((s) => s.reps_completed !== null);
  const rpeValues = lastSets
    .filter((s) => s.rpe !== null)
    .map((s) => s.rpe as number);

  const avgWeight =
    weightsWithValues.length > 0
      ? weightsWithValues.reduce(
          (sum, s) => sum + (s.weight_kg as number),
          0
        ) / weightsWithValues.length
      : null;
  const avgReps =
    repsWithValues.length > 0
      ? repsWithValues.reduce(
          (sum, s) => sum + (s.reps_completed as number),
          0
        ) / repsWithValues.length
      : null;
  const avgRpe =
    rpeValues.length > 0
      ? rpeValues.reduce((sum, r) => sum + r, 0) / rpeValues.length
      : null;

  const setDetails: LastSessionSetRow[] = [...lastSets]
    .sort((a, b) => a.set_number - b.set_number)
    .map((s) => ({
      set_number: s.set_number,
      weight_kg: s.weight_kg,
      reps_completed: s.reps_completed,
      rpe: s.rpe,
      actual_time_seconds: s.actual_time_seconds ?? undefined,
      actual_distance_meters: s.actual_distance_meters ?? undefined,
      actual_hr_avg: s.actual_hr_avg ?? undefined,
      actual_speed_kmh: s.actual_speed_kmh ?? undefined,
    }));

  return {
    weight: avgWeight,
    reps: avgReps ? Math.round(avgReps) : null,
    sets: lastSets.length,
    avgRpe: avgRpe !== null ? Math.round(avgRpe * 10) / 10 : null,
    date: completedAt,
    workout_log_id: lastWorkoutLogId,
    setDetails,
  };
}

/**
 * Golden logging: sets are stored in workout_set_logs (POST /api/log-set).
 * Picks the most recent completed workout_log in logIds that has rows for this exercise.
 */
async function lastWorkoutFromWorkoutSetLogs(
  clientId: string,
  exerciseId: string,
  logIds: string[],
  logDateMap: Map<string, string>
): Promise<{
  lastWorkout: ExercisePreviousPerformance['lastWorkout'];
  maxWeight: number | null;
  maxReps: number | null;
}> {
  if (logIds.length === 0) {
    return { lastWorkout: null, maxWeight: null, maxReps: null };
  }

  const { data: rows, error } = await supabase
    .from('workout_set_logs')
    .select(
      'workout_log_id, set_number, weight, reps, rpe, set_type, actual_time_seconds, actual_distance_meters, actual_hr_avg, actual_speed_kmh'
    )
    .eq('client_id', clientId)
    .eq('exercise_id', exerciseId)
    .in('workout_log_id', logIds);

  if (error || !rows?.length) {
    return { lastWorkout: null, maxWeight: null, maxReps: null };
  }

  const byLog = new Map<string, typeof rows>();
  for (const r of rows) {
    const wid = String(r.workout_log_id);
    if (!byLog.has(wid)) byLog.set(wid, []);
    byLog.get(wid)!.push(r);
  }

  const logsWithSets = logIds.filter((id) => byLog.has(id));
  logsWithSets.sort((a, b) => {
    const da = new Date(logDateMap.get(a) || '').getTime();
    const db = new Date(logDateMap.get(b) || '').getTime();
    return db - da;
  });

  const lastLogId = logsWithSets[0];
  const lastRows = lastLogId ? byLog.get(lastLogId) || [] : [];
  if (!lastRows.length) {
    return { lastWorkout: null, maxWeight: null, maxReps: null };
  }

  const sortedLast = [...lastRows].sort((a, b) => {
    const sa = a.set_number != null ? Number(a.set_number) : 0;
    const sb = b.set_number != null ? Number(b.set_number) : 0;
    return sa - sb;
  });

  let fallbackNum = 1;
  const normalized = sortedLast.map((r: any) => {
    const sn =
      r.set_number != null && !Number.isNaN(Number(r.set_number))
        ? Number(r.set_number)
        : fallbackNum++;
    return {
      set_number: sn,
      weight_kg: r.weight != null ? Number(r.weight) : null,
      reps_completed: r.reps != null ? Number(r.reps) : null,
      rpe: r.rpe != null ? Number(r.rpe) : null,
      actual_time_seconds:
        r.actual_time_seconds != null ? Number(r.actual_time_seconds) : null,
      actual_distance_meters:
        r.actual_distance_meters != null ? Number(r.actual_distance_meters) : null,
      actual_hr_avg: r.actual_hr_avg != null ? Number(r.actual_hr_avg) : null,
      actual_speed_kmh:
        r.actual_speed_kmh != null ? Number(r.actual_speed_kmh) : null,
    };
  });

  const blockType = String(
    (sortedLast[0] as { set_type?: string | null })?.set_type || '',
  ).toLowerCase();
  let lastWorkout = buildLastWorkoutFromSetRows(
    normalized,
    lastLogId,
    logDateMap.get(lastLogId) || ''
  );
  if (lastWorkout && blockType === 'speed_work') {
    lastWorkout = {
      ...lastWorkout,
      executionKind: 'speed_work',
    };
  } else if (lastWorkout && blockType === 'endurance') {
    lastWorkout = {
      ...lastWorkout,
      executionKind: 'endurance',
    };
  }

  const allWeights = rows
    .filter((s) => s.weight != null)
    .map((s) => Number(s.weight));
  const allReps = rows
    .filter((s) => s.reps != null)
    .map((s) => Number(s.reps));
  const maxWeight = allWeights.length > 0 ? Math.max(...allWeights) : null;
  const maxReps = allReps.length > 0 ? Math.max(...allReps) : null;

  return { lastWorkout, maxWeight, maxReps };
}

/** When global “last session” has no rows, use the latest completed log for this assignment that includes the exercise. */
async function lastSessionForExerciseOnSameAssignment(
  clientId: string,
  exerciseId: string,
  workoutAssignmentId: string,
  logs: WorkoutLogRow[]
): Promise<ExercisePreviousPerformance['lastWorkout']> {
  const assignmentLogs = logs.filter(
    (l) => String(l.workout_assignment_id) === String(workoutAssignmentId)
  );
  if (assignmentLogs.length === 0) return null;

  const alIds = assignmentLogs.map((l) => l.id);
  const dateByLogId = new Map(
    assignmentLogs.map((l) => [l.id, l.completed_at as string])
  );

  const { lastWorkout } = await lastWorkoutFromWorkoutSetLogs(
    clientId,
    exerciseId,
    alIds,
    dateByLogId
  );
  return lastWorkout;
}

// ============================================================================
// NEW: Get previous performance for a single exercise (for PreviousPerformanceCard)
// Primary: workout_set_logs. Legacy: workout_exercise_logs → workout_set_details
// ============================================================================

export async function getExercisePreviousPerformance(
  clientId: string,
  exerciseId: string,
  currentWorkoutLogId?: string,
  workoutAssignmentId?: string | null
): Promise<ExercisePreviousPerformance> {
  try {
    // Step 1: Get recent completed workout logs for this client (cap at 100)
    let logsQuery = supabase
      .from('workout_logs')
      .select('id, completed_at, workout_assignment_id')
      .eq('client_id', clientId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(100);

    if (currentWorkoutLogId) {
      logsQuery = logsQuery.neq('id', currentWorkoutLogId);
    }

    const { data: logsRaw } = await logsQuery;
    if (!logsRaw || logsRaw.length === 0) {
      return { lastWorkout: null, personalBest: null };
    }

    const logs = logsRaw as WorkoutLogRow[];

    const logIds = logs.map((l) => l.id);
    const logDateMap = new Map<string, string>(
      logs.map((l) => [l.id, l.completed_at as string])
    );

    // Step 2: workout_set_logs — matches POST /api/log-set (primary)
    const fromSetLogs = await lastWorkoutFromWorkoutSetLogs(
      clientId,
      exerciseId,
      logIds,
      logDateMap
    );
    let lastWorkout = fromSetLogs.lastWorkout;
    let personalBest: ExercisePreviousPerformance['personalBest'] =
      fromSetLogs.maxWeight !== null || fromSetLogs.maxReps !== null
        ? {
            maxWeight: fromSetLogs.maxWeight,
            maxReps: fromSetLogs.maxReps,
            date: '',
          }
        : null;

    // Step 3: Legacy workout_exercise_logs + workout_set_details
    if (!lastWorkout) {
      const { data: exerciseLogs } = await supabase
        .from('workout_exercise_logs')
        .select('id, workout_log_id')
        .eq('exercise_id', exerciseId)
        .in('workout_log_id', logIds);

      if (exerciseLogs && exerciseLogs.length > 0) {
        const logIdsWithExercise = [
          ...new Set(exerciseLogs.map((el) => el.workout_log_id as string)),
        ];
        logIdsWithExercise.sort((a, b) => {
          const dateA = new Date(logDateMap.get(a) || '').getTime();
          const dateB = new Date(logDateMap.get(b) || '').getTime();
          return dateB - dateA;
        });

        const lastWorkoutLogId = logIdsWithExercise[0];
        const allExerciseLogIds = exerciseLogs.map((el) => el.id as string);
        const lastExerciseLogIds = exerciseLogs
          .filter((el) => el.workout_log_id === lastWorkoutLogId)
          .map((el) => el.id as string);

        const { data: allSetDetails } = await supabase
          .from('workout_set_details')
          .select(
            'workout_exercise_log_id, weight_kg, reps_completed, rpe, set_number'
          )
          .in('workout_exercise_log_id', allExerciseLogIds);

        if (allSetDetails && allSetDetails.length > 0) {
          const lastSets = allSetDetails.filter((s) =>
            lastExerciseLogIds.includes(s.workout_exercise_log_id as string)
          );

          const normalized = lastSets.map((s) => ({
            set_number: s.set_number as number,
            weight_kg: s.weight_kg as number | null,
            reps_completed: s.reps_completed as number | null,
            rpe: s.rpe as number | null,
          }));

          lastWorkout = buildLastWorkoutFromSetRows(
            normalized,
            lastWorkoutLogId,
            logDateMap.get(lastWorkoutLogId) || ''
          );

          const allWeights = allSetDetails
            .filter((s) => s.weight_kg !== null)
            .map((s) => s.weight_kg as number);
          const allReps = allSetDetails
            .filter((s) => s.reps_completed !== null)
            .map((s) => s.reps_completed as number);

          const maxWeight =
            allWeights.length > 0 ? Math.max(...allWeights) : null;
          const maxReps = allReps.length > 0 ? Math.max(...allReps) : null;

          personalBest =
            maxWeight !== null || maxReps !== null
              ? { maxWeight, maxReps, date: '' }
              : personalBest;
        }
      }
    }

    if (
      !lastWorkout &&
      workoutAssignmentId &&
      String(workoutAssignmentId).trim() !== ''
    ) {
      lastWorkout = await lastSessionForExerciseOnSameAssignment(
        clientId,
        exerciseId,
        workoutAssignmentId,
        logs
      );
    }

    return { lastWorkout, personalBest };
  } catch (error) {
    console.error('Error fetching exercise previous performance:', error);
    return { lastWorkout: null, personalBest: null };
  }
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Get previous week's workout data for an exercise.
 * Extended to also fetch RPE (via workout_exercise_logs → workout_set_details)
 * and compute weeksAtSameWeight by querying a 4-week lookback window.
 */
export async function getPreviousWeekWorkoutData(
  assignmentId: string,
  currentWeek: number,
  exerciseId: string
): Promise<PreviousWeekData | null> {
  try {
    const previousWeek = currentWeek - 1;
    if (previousWeek < 1) {
      return null;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    // Get all workout_assignment_ids for this program_assignment
    const { data: programDayAssignments } = await supabase
      .from('program_day_assignments')
      .select('workout_assignment_id')
      .eq('program_assignment_id', assignmentId);

    if (!programDayAssignments || programDayAssignments.length === 0) return null;

    const workoutAssignmentIds = programDayAssignments
      .map((pda) => pda.workout_assignment_id)
      .filter((id): id is string => !!id);

    // Cycle start date
    const { data: assignmentData } = await supabase
      .from('program_assignments')
      .select('start_date')
      .eq('id', assignmentId)
      .eq('client_id', user.id)
      .maybeSingle();

    if (!assignmentData?.start_date) return null;

    const cycleStart = new Date(assignmentData.start_date);

    // Extended lookback: up to 4 weeks back from currentWeek
    const maxBackWeek = Math.max(1, currentWeek - 4);
    const lookbackStart = new Date(cycleStart);
    lookbackStart.setDate(cycleStart.getDate() + (maxBackWeek - 1) * 7);

    // End of previous week
    const lookbackEnd = new Date(cycleStart);
    lookbackEnd.setDate(cycleStart.getDate() + previousWeek * 7);

    // All workout_logs for the lookback window
    const { data: allWorkoutLogs, error: logsError } = await supabase
      .from('workout_logs')
      .select('id, started_at')
      .in('workout_assignment_id', workoutAssignmentIds)
      .eq('client_id', user.id)
      .gte('started_at', lookbackStart.toISOString())
      .lt('started_at', lookbackEnd.toISOString());

    if (logsError || !allWorkoutLogs || allWorkoutLogs.length === 0) return null;

    const allLogIds = allWorkoutLogs.map((l) => l.id);

    // All set logs for the lookback window
    const { data: allSetLogs, error: setsError } = await supabase
      .from('workout_set_logs')
      .select('reps, weight, workout_log_id')
      .in('workout_log_id', allLogIds)
      .eq('exercise_id', exerciseId)
      .eq('client_id', user.id)
      .not('reps', 'is', null)
      .not('weight', 'is', null);

    if (setsError || !allSetLogs || allSetLogs.length === 0) return null;

    // Helper: get week number for a log date
    const getWeekForLog = (logId: string): number => {
      const log = allWorkoutLogs.find((l) => l.id === logId);
      if (!log) return 0;
      const logDate = new Date(log.started_at);
      const diffMs = logDate.getTime() - cycleStart.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      return Math.floor(diffDays / 7) + 1;
    };

    // Separate previous week sets
    const previousWeekLogIds = allWorkoutLogs
      .filter((l) => {
        const weekNum = (() => {
          const d = new Date(l.started_at);
          const diffMs = d.getTime() - cycleStart.getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          return Math.floor(diffDays / 7) + 1;
        })();
        return weekNum === previousWeek;
      })
      .map((l) => l.id);

    const previousWeekSets = allSetLogs.filter((s) =>
      previousWeekLogIds.includes(s.workout_log_id as string)
    );

    if (previousWeekSets.length === 0) return null;

    const validSets = previousWeekSets.filter(
      (set) => set.reps !== null && set.weight !== null
    );
    if (validSets.length === 0) return null;

    const totalReps = validSets.reduce(
      (sum, set) => sum + (set.reps as number),
      0
    );
    const totalWeight = validSets.reduce(
      (sum, set) => sum + (set.weight as number),
      0
    );
    const reps = validSets.map((set) => set.reps as number);
    const maxReps = Math.max(...reps);
    const minReps = Math.min(...reps);

    const averageWeight = totalWeight / validSets.length;

    // Compute average weight per week (for weeksAtSameWeight)
    const weekWeightMap = new Map<number, number[]>();
    for (const set of allSetLogs) {
      if (set.weight === null) continue;
      const weekNum = getWeekForLog(set.workout_log_id as string);
      if (!weekWeightMap.has(weekNum)) weekWeightMap.set(weekNum, []);
      weekWeightMap.get(weekNum)!.push(set.weight as number);
    }

    const weekAvgWeight = new Map<number, number>();
    for (const [week, weights] of weekWeightMap) {
      weekAvgWeight.set(
        week,
        weights.reduce((s, w) => s + w, 0) / weights.length
      );
    }

    // Count consecutive weeks at same weight as previousWeek (within ±2.5%)
    const prevAvg = weekAvgWeight.get(previousWeek);
    let weeksAtSameWeight = 0;
    if (prevAvg !== undefined && prevAvg > 0) {
      for (let week = previousWeek; week >= maxBackWeek; week--) {
        const weekAvg = weekAvgWeight.get(week);
        if (weekAvg === undefined) break;
        const diff = Math.abs(weekAvg - prevAvg) / prevAvg;
        if (diff <= 0.025) {
          weeksAtSameWeight++;
        } else {
          break;
        }
      }
    }

    // RPE: query workout_exercise_logs → workout_set_details for previous week
    let averageRpe: number | null = null;
    let rpeCount = 0;

    if (previousWeekLogIds.length > 0) {
      const { data: exerciseLogData } = await supabase
        .from('workout_exercise_logs')
        .select('id')
        .eq('exercise_id', exerciseId)
        .in('workout_log_id', previousWeekLogIds);

      if (exerciseLogData && exerciseLogData.length > 0) {
        const exerciseLogIds = exerciseLogData.map((el) => el.id as string);
        const { data: setDetails } = await supabase
          .from('workout_set_details')
          .select('rpe')
          .in('workout_exercise_log_id', exerciseLogIds)
          .not('rpe', 'is', null);

        if (setDetails && setDetails.length > 0) {
          rpeCount = setDetails.length;
          const rpeSum = setDetails.reduce(
            (sum, s) => sum + (s.rpe as number),
            0
          );
          averageRpe = rpeSum / rpeCount;
        }
      }
    }

    return {
      averageReps: totalReps / validSets.length,
      averageWeight,
      setsCompleted: validSets.length,
      maxReps,
      minReps,
      averageRpe,
      rpeCount,
      weeksAtSameWeight,
    };
  } catch (error) {
    console.error('Error fetching previous week data:', error);
    return null;
  }
}

/**
 * Get current week's progression rules for an exercise
 */
export async function getCurrentWeekProgressionRules(
  assignmentId: string,
  currentWeek: number,
  exerciseId: string
): Promise<CurrentWeekRules | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: rules, error } = await supabase
      .from('client_program_progression_rules')
      .select('reps, sets, weight_kg')
      .eq('program_assignment_id', assignmentId)
      .eq('week_number', currentWeek)
      .or(
        `exercise_id.eq.${exerciseId},override_exercise_id.eq.${exerciseId}`
      )
      .maybeSingle();

    if (error || !rules) return null;

    const repsRange = parseRepsRange(rules.reps);
    if (!repsRange) return null;

    return {
      targetRepsMin: repsRange.min,
      targetRepsMax: repsRange.max,
      targetSets: rules.sets || 0,
      targetWeight: rules.weight_kg || undefined,
    };
  } catch (error) {
    console.error('Error fetching current week rules:', error);
    return null;
  }
}

/**
 * Parse reps range string (e.g., "10-12" or "10") to min/max
 */
export function parseRepsRange(repsString: string | null | undefined): {
  min: number;
  max: number;
} | null {
  if (!repsString || typeof repsString !== 'string') return null;

  const trimmed = repsString.trim();

  if (trimmed.includes('-')) {
    const parts = trimmed.split('-').map((p) => p.trim());
    if (parts.length === 2) {
      const min = parseInt(parts[0], 10);
      const max = parseInt(parts[1], 10);
      if (!isNaN(min) && !isNaN(max) && min <= max) {
        return { min, max };
      }
    }
  }

  const single = parseInt(trimmed, 10);
  if (!isNaN(single) && single > 0) {
    return { min: single, max: single };
  }

  return null;
}

/**
 * Calculate progression suggestion using a priority-based decision tree.
 * Compares previous week's performance to current week targets.
 * Now synchronous — no external guideline lookup needed.
 */
export function calculateProgressionSuggestion(
  previousData: PreviousWeekData | null,
  currentRules: CurrentWeekRules | null,
  previousWeekRules: CurrentWeekRules | null,
  exerciseId: string,
  exerciseName: string
): ProgressionSuggestion {
  // 1. First-time exercise (no previous data)
  if (!previousData) {
    return {
      exerciseId,
      exerciseName,
      message: 'First time — start with the prescribed weight',
      type: 'first_time',
      suggestedWeight: currentRules?.targetWeight ?? null,
      suggestedReps: currentRules?.targetRepsMin ?? null,
      confidence: 'medium',
    };
  }

  const { averageWeight, averageReps, averageRpe, weeksAtSameWeight, minReps } =
    previousData;

  // allTargetsMet: true if the worst set still met the previous week's minimum target reps
  const allTargetsMet =
    previousWeekRules !== null
      ? minReps >= previousWeekRules.targetRepsMin
      : null;

  // 2. Deload week: current prescribed weight < 70% of previous week's average
  if (
    currentRules?.targetWeight !== undefined &&
    currentRules.targetWeight < averageWeight * 0.7
  ) {
    return {
      exerciseId,
      exerciseName,
      message: 'Recovery week — lighter today',
      type: 'deload',
      suggestedWeight: currentRules.targetWeight,
      suggestedReps: currentRules.targetRepsMin,
      confidence: 'high',
    };
  }

  // 3. Plateau: same weight for ≥ 2 consecutive weeks AND all targets were met
  if (weeksAtSameWeight >= 2 && allTargetsMet === true) {
    const plateauSuggestedWeight =
      averageWeight > 0
        ? roundToPlate(averageWeight * 1.025)
        : null;
    return {
      exerciseId,
      exerciseName,
      message: `Same weight for ${weeksAtSameWeight} week${weeksAtSameWeight > 1 ? 's' : ''} — try ${plateauSuggestedWeight !== null ? `${plateauSuggestedWeight}kg` : 'adding a rep'}`,
      type: 'plateau',
      suggestedWeight: plateauSuggestedWeight,
      suggestedReps: Math.round(averageReps),
      confidence: 'medium',
      currentWeight: averageWeight,
      previousReps: Math.round(averageReps),
    };
  }

  // 4. All targets met + RPE ≤ 8 → ready to progress
  if (allTargetsMet === true && averageRpe !== null && averageRpe <= 8) {
    const w = currentRules?.targetWeight ?? null;
    const r = currentRules?.targetRepsMin ?? Math.round(averageReps);
    return {
      exerciseId,
      exerciseName,
      message: `Strong last week — ready for ${w !== null ? `${w}kg × ` : ''}${r} reps`,
      type: 'progress',
      suggestedWeight: w,
      suggestedReps: r,
      confidence: 'high',
      currentWeight: averageWeight,
      previousReps: Math.round(averageReps),
      targetRepsMin: currentRules?.targetRepsMin,
      targetRepsMax: currentRules?.targetRepsMax,
    };
  }

  // 5. All targets met + RPE 9-10 → repeat same weight
  if (allTargetsMet === true && averageRpe !== null && averageRpe >= 9) {
    return {
      exerciseId,
      exerciseName,
      message: 'Hit your targets but it was tough — same weight, focus on form',
      type: 'repeat',
      suggestedWeight: averageWeight > 0 ? averageWeight : null,
      suggestedReps:
        previousWeekRules?.targetRepsMin ?? Math.round(averageReps),
      confidence: 'medium',
      currentWeight: averageWeight,
      previousReps: Math.round(averageReps),
    };
  }

  // 6. Targets not met (missed reps on any set)
  if (allTargetsMet === false) {
    return {
      exerciseId,
      exerciseName,
      message: "Didn't hit all reps last week — try same weight again",
      type: 'match',
      suggestedWeight: averageWeight > 0 ? averageWeight : null,
      suggestedReps:
        previousWeekRules?.targetRepsMin ?? Math.round(averageReps),
      confidence: 'medium',
      currentWeight: averageWeight,
      previousReps: Math.round(averageReps),
      targetRepsMin: previousWeekRules?.targetRepsMin,
      targetRepsMax: previousWeekRules?.targetRepsMax,
    };
  }

  // 7. Fallback: RPE not logged or no program context
  const fallbackWeight = currentRules?.targetWeight ?? (averageWeight > 0 ? averageWeight : null);
  const fallbackReps = currentRules?.targetRepsMin ?? Math.round(averageReps);
  return {
    exerciseId,
    exerciseName,
    message: `Last time: ${averageWeight > 0 ? `${averageWeight.toFixed(1)}kg × ` : ''}${Math.round(averageReps)} reps`,
    type: 'progress',
    suggestedWeight: fallbackWeight,
    suggestedReps: fallbackReps,
    confidence: 'low',
    currentWeight: averageWeight,
    previousReps: Math.round(averageReps),
    targetRepsMin: currentRules?.targetRepsMin,
    targetRepsMax: currentRules?.targetRepsMax,
  };
}

/**
 * Get progression suggestions for all exercises in a workout.
 * This is the main function called from the workout executor.
 * Always populates the map — including first-time exercises (type: 'first_time').
 */
export async function getProgressionSuggestionsForWorkout(
  assignmentId: string,
  currentWeek: number,
  exerciseIds: string[],
  exerciseNames: Map<string, string>,
  category?: string,
  difficulty?: string
): Promise<Map<string, ProgressionSuggestion>> {
  const suggestions = new Map<string, ProgressionSuggestion>();

  const promises = exerciseIds.map(async (exerciseId) => {
    const exerciseName = exerciseNames.get(exerciseId) || 'Exercise';

    // Fetch previous week data (now includes RPE and weeksAtSameWeight)
    const previousData = await getPreviousWeekWorkoutData(
      assignmentId,
      currentWeek,
      exerciseId
    );

    // Fetch current week targets
    const currentRules = await getCurrentWeekProgressionRules(
      assignmentId,
      currentWeek,
      exerciseId
    );

    // Fetch previous week targets (needed for allTargetsMet check)
    const previousWeekRules =
      currentWeek > 1
        ? await getCurrentWeekProgressionRules(
            assignmentId,
            currentWeek - 1,
            exerciseId
          )
        : null;

    // calculateProgressionSuggestion is now synchronous
    const suggestion = calculateProgressionSuggestion(
      previousData,
      currentRules,
      previousWeekRules,
      exerciseId,
      exerciseName
    );

    return { exerciseId, suggestion };
  });

  const results = await Promise.all(promises);

  results.forEach((result) => {
    if (result) {
      suggestions.set(result.exerciseId, result.suggestion);
    }
  });

  return suggestions;
}
