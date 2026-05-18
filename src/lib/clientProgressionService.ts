/**
 * Client Progression Service
 * Compares previous week's logged workouts to current week's progression rules
 * and calculates progression suggestions for display in the workout executor
 */

import { supabase } from './supabase';
import { calculateE1RM } from '@/lib/e1rmUtils';

// ============================================================================
// INTERFACES
// ============================================================================

export interface ProgressionSuggestion {
  exerciseId: string;
  exerciseName: string;
  message: string;
  type?: 'progress' | 'rpe_correction_up' | 'rpe_correction_down';
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

function toDateKey(value: string): string | null {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return null;
  return new Date(time).toISOString().slice(0, 10);
}

export interface PreviousWeekData {
  averageReps: number;
  averageWeight: number;
  setsCompleted: number;
  maxReps: number;
  minReps: number;
  averageRpe: number | null;
  rpeCount: number;
  weeksAtSameWeight: number;
  /** Per-set rows from the previous calendar week (golden `workout_set_logs`), same window as aggregates. */
  sets: Array<{
    weight: number | null;
    reps: number | null;
    rpe: number | null;
  }>;
}

/** Row shape from `client_program_progression_rules` (snake_case from PostgREST). */
type ProgressionRulesRow = {
  reps: string | null;
  sets: number | null;
  weight_kg: number | string | null;
  load_percentage: number | string | null;
  rir: number | null;
  tempo: string | null;
  rest_seconds: number | null;
  notes: string | null;
  block_type: string | null;
  reps_per_cluster: number | null;
  clusters_per_set: number | null;
  intra_cluster_rest: number | null;
  drop_set_reps: string | null;
  weight_reduction_percentage: number | null;
  rest_pause_duration: number | null;
  max_rest_pauses: number | null;
  compound_reps: string | null;
  isolation_reps: string | null;
  first_exercise_reps: string | null;
  second_exercise_reps: string | null;
  rest_between_pairs: number | null;
  rounds: number | null;
  work_seconds: number | null;
  duration_minutes: number | null;
  time_cap_minutes: number | null;
  target_reps: number | null;
  emom_mode: string | null;
  exercise_reps: string | null;
  rest_after_set: number | null;
  exercise_letter: string | null;
};

export interface CurrentWeekRules {
  // Tier 1
  targetSets: number | null;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  targetWeightKg: number | null;
  targetLoadPercentage: number | null;
  /** DB `reps` varchar when not parsed into min/max (e.g. "max", "AMRAP"). */
  repsVarchar: string | null;

  // Tier 2
  targetRir: number | null;
  tempo: string | null;
  restSeconds: number | null;

  // Tier 3
  notes: string | null;

  // Tier 4
  blockType: string | null;
  repsPerCluster: number | null;
  clustersPerSet: number | null;
  intraClusterRest: number | null;
  dropSetReps: string | null;
  weightReductionPercentage: number | null;
  restPauseDuration: number | null;
  maxRestPauses: number | null;
  compoundReps: string | null;
  isolationReps: string | null;
  firstExerciseReps: string | null;
  secondExerciseReps: string | null;
  restBetweenPairs: number | null;
  rounds: number | null;
  workSeconds: number | null;
  durationMinutes: number | null;
  timeCapMinutes: number | null;
  targetReps: number | null;
  emomMode: string | null;
  /** Drop-set main reps when not carried in `reps`. */
  exerciseReps: string | null;
  /** Tabata / protocol trailing rest after full set. */
  restAfterSet: number | null;
  /** Superset / giant station label (reserved for future display). */
  exerciseLetter: string | null;
}

function numOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function strOrNull(v: unknown): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t === "" ? null : t;
}

function mapProgressionRulesRow(rules: ProgressionRulesRow): CurrentWeekRules {
  const repsRange = parseRepsRange(rules.reps);
  const repsTrim = strOrNull(rules.reps);
  return {
    targetSets: numOrNull(rules.sets),
    targetRepsMin: repsRange?.min ?? null,
    targetRepsMax: repsRange?.max ?? null,
    targetWeightKg: numOrNull(rules.weight_kg),
    targetLoadPercentage: numOrNull(rules.load_percentage),
    repsVarchar: repsTrim,
    targetRir: numOrNull(rules.rir),
    tempo: strOrNull(rules.tempo),
    restSeconds: numOrNull(rules.rest_seconds),
    notes: strOrNull(rules.notes),
    blockType: strOrNull(rules.block_type),
    repsPerCluster: numOrNull(rules.reps_per_cluster),
    clustersPerSet: numOrNull(rules.clusters_per_set),
    intraClusterRest: numOrNull(rules.intra_cluster_rest),
    dropSetReps: strOrNull(rules.drop_set_reps),
    weightReductionPercentage: numOrNull(rules.weight_reduction_percentage),
    restPauseDuration: numOrNull(rules.rest_pause_duration),
    maxRestPauses: numOrNull(rules.max_rest_pauses),
    compoundReps: strOrNull(rules.compound_reps),
    isolationReps: strOrNull(rules.isolation_reps),
    firstExerciseReps: strOrNull(rules.first_exercise_reps),
    secondExerciseReps: strOrNull(rules.second_exercise_reps),
    restBetweenPairs: numOrNull(rules.rest_between_pairs),
    rounds: numOrNull(rules.rounds),
    workSeconds: numOrNull(rules.work_seconds),
    durationMinutes: numOrNull(rules.duration_minutes),
    timeCapMinutes: numOrNull(rules.time_cap_minutes),
    targetReps: numOrNull(rules.target_reps),
    emomMode: strOrNull(rules.emom_mode),
    exerciseReps: strOrNull(rules.exercise_reps),
    restAfterSet: numOrNull(rules.rest_after_set),
    exerciseLetter: strOrNull(rules.exercise_letter),
  };
}

export function isRuleEffectivelyEmpty(rule: CurrentWeekRules | null): boolean {
  if (!rule) return true;
  const nz = (s: string | null) => s != null && s.trim() !== "";
  const hasAnyValue =
    rule.targetSets != null ||
    rule.targetRepsMin != null ||
    rule.targetRepsMax != null ||
    rule.targetWeightKg != null ||
    rule.targetLoadPercentage != null ||
    nz(rule.repsVarchar) ||
    nz(rule.exerciseReps) ||
    rule.targetRir != null ||
    nz(rule.tempo) ||
    rule.restSeconds != null ||
    nz(rule.notes) ||
    rule.repsPerCluster != null ||
    rule.clustersPerSet != null ||
    rule.intraClusterRest != null ||
    nz(rule.dropSetReps) ||
    rule.weightReductionPercentage != null ||
    rule.restPauseDuration != null ||
    rule.maxRestPauses != null ||
    nz(rule.compoundReps) ||
    nz(rule.isolationReps) ||
    nz(rule.firstExerciseReps) ||
    nz(rule.secondExerciseReps) ||
    rule.restBetweenPairs != null ||
    rule.rounds != null ||
    rule.workSeconds != null ||
    rule.durationMinutes != null ||
    rule.timeCapMinutes != null ||
    rule.targetReps != null ||
    nz(rule.emomMode);
  return !hasAnyValue;
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

/**
 * Canonical last-session PR signal:
 * checkAndStorePR writes rows to personal_records with achieved_date.
 * This helper returns achieved_date keys by exercise for weight/reps records.
 */
export async function getPrDateKeysByExercise(
  clientId: string,
  exerciseIds: string[],
): Promise<Map<string, Set<string>>> {
  const out = new Map<string, Set<string>>();
  const uniqueExerciseIds = [...new Set(exerciseIds.filter(Boolean))];
  if (uniqueExerciseIds.length === 0) return out;

  const { data, error } = await supabase
    .from('personal_records')
    .select('exercise_id, achieved_date, record_type')
    .eq('client_id', clientId)
    .in('exercise_id', uniqueExerciseIds)
    .in('record_type', ['max_strength', 'strength_endurance']);

  if (error || !data) return out;

  for (const row of data as Array<{
    exercise_id: string | null;
    achieved_date: string | null;
  }>) {
    if (!row.exercise_id || !row.achieved_date) continue;
    const key = toDateKey(row.achieved_date);
    if (!key) continue;
    if (!out.has(row.exercise_id)) out.set(row.exercise_id, new Set<string>());
    out.get(row.exercise_id)!.add(key);
  }

  return out;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Get previous week's workout data for an exercise.
 * Fetches per-set golden `workout_set_logs` (weight, reps, rpe) for the previous
 * calendar week; RPE average prefers those rows, with legacy
 * `workout_exercise_logs` → `workout_set_details` only when no golden RPE exists.
 * Also computes weeksAtSameWeight via a 4-week lookback window.
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
      .select('reps, weight, rpe, set_number, workout_log_id')
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

    const sortedValidSets = [...validSets].sort((a, b) => {
      const sa =
        (a as { set_number?: number | null }).set_number != null
          ? Number((a as { set_number?: number | null }).set_number)
          : 0;
      const sb =
        (b as { set_number?: number | null }).set_number != null
          ? Number((b as { set_number?: number | null }).set_number)
          : 0;
      return sa - sb;
    });

    const sets: PreviousWeekData['sets'] = sortedValidSets.map((set) => {
      const r =
        (set as { rpe?: number | string | null }).rpe != null &&
        (set as { rpe?: number | string | null }).rpe !== ''
          ? Number((set as { rpe?: number | string | null }).rpe)
          : null;
      return {
        weight: set.weight != null ? Number(set.weight) : null,
        reps: set.reps != null ? Number(set.reps) : null,
        rpe: r != null && Number.isFinite(r) ? r : null,
      };
    });

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

    const goldenRpeVals = sets
      .map((s) => s.rpe)
      .filter((r): r is number => r != null && Number.isFinite(r));
    let averageRpe: number | null = null;
    let rpeCount = 0;

    if (goldenRpeVals.length > 0) {
      rpeCount = goldenRpeVals.length;
      averageRpe =
        goldenRpeVals.reduce((sum, r) => sum + r, 0) / goldenRpeVals.length;
    } else if (previousWeekLogIds.length > 0) {
      // Legacy: workout_exercise_logs → workout_set_details (only when no golden RPE)
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
      sets,
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
      .select(
        [
          'reps',
          'sets',
          'weight_kg',
          'load_percentage',
          'rir',
          'tempo',
          'rest_seconds',
          'notes',
          'block_type',
          'reps_per_cluster',
          'clusters_per_set',
          'intra_cluster_rest',
          'drop_set_reps',
          'weight_reduction_percentage',
          'rest_pause_duration',
          'max_rest_pauses',
          'compound_reps',
          'isolation_reps',
          'first_exercise_reps',
          'second_exercise_reps',
          'rest_between_pairs',
          'rounds',
          'work_seconds',
          'duration_minutes',
          'time_cap_minutes',
          'target_reps',
          'emom_mode',
          'exercise_reps',
          'rest_after_set',
          'exercise_letter',
        ].join(', ')
      )
      .eq('program_assignment_id', assignmentId)
      .eq('week_number', currentWeek)
      .or(
        `exercise_id.eq.${exerciseId},override_exercise_id.eq.${exerciseId}`
      )
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (error || !rules) return null;

    return mapProgressionRulesRow(rules as unknown as ProgressionRulesRow);
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

/** Rows index 0 = 1 rep … 9 = 10 reps. Columns RPE 6 … 10. */
const RPE_PERCENT_1RM_GRID: readonly (readonly number[])[] = [
  [0.78, 0.86, 0.92, 0.96, 1.0],
  [0.76, 0.84, 0.9, 0.94, 0.96],
  [0.74, 0.81, 0.87, 0.91, 0.93],
  [0.72, 0.79, 0.84, 0.88, 0.9],
  [0.69, 0.76, 0.81, 0.86, 0.87],
  [0.67, 0.73, 0.79, 0.83, 0.85],
  [0.65, 0.71, 0.76, 0.81, 0.83],
  [0.62, 0.69, 0.74, 0.78, 0.81],
  [0.6, 0.67, 0.71, 0.76, 0.79],
  [0.58, 0.65, 0.69, 0.73, 0.77],
] as const;

function percentAtIntegerRpe(repIndex0: number, integerRpe: number): number {
  const row = RPE_PERCENT_1RM_GRID[repIndex0];
  const col = Math.min(4, Math.max(0, integerRpe - 6));
  return row[col]!;
}

/**
 * RPE-to-%1RM at rep count. RPE clamped [6,10]; reps rounded; reps > 10 uses
 * row 10 then −0.015 per extra rep. Non-integer RPE interpolates between columns.
 */
function rpeToPercent(rpe: number, reps: number): number {
  const rpeClamped = Math.min(10, Math.max(6, rpe));
  let repN = Math.round(reps);
  let extraReps = 0;
  if (repN > 10) {
    extraReps = repN - 10;
    repN = 10;
  }
  if (repN < 1) repN = 1;
  const rowIdx = repN - 1;

  const rLow = Math.floor(rpeClamped);
  const rHigh = Math.ceil(rpeClamped);
  const rLo = Math.min(10, Math.max(6, rLow));
  const rHi = Math.min(10, Math.max(6, rHigh));
  const baseLow = percentAtIntegerRpe(rowIdx, rLo);
  let base: number;
  if (rLow === rHigh) {
    base = baseLow;
  } else {
    const baseHigh = percentAtIntegerRpe(rowIdx, rHi);
    base = baseLow + (baseHigh - baseLow) * (rpeClamped - rLow);
  }
  return Math.max(0.01, base - 0.015 * extraReps);
}

/** %1RM at RPE 8 for the given rep count (Case B overload path). */
function repsToPercent(reps: number): number {
  return rpeToPercent(8, reps);
}

function roundToNearest(value: number, increment: number): number {
  return Math.round(value / increment) * increment;
}

/**
 * Compares previous week's logged sets to current week progression rules.
 * Returns `null` when there is no actionable suggestion.
 */
export function calculateProgressionSuggestion(
  previousData: PreviousWeekData | null,
  currentRules: CurrentWeekRules | null,
  _previousWeekRules: CurrentWeekRules | null,
  exerciseId: string,
  exerciseName: string
): ProgressionSuggestion | null {
  if (!previousData?.sets?.length) {
    return null;
  }
  if (!currentRules) {
    return null;
  }

  const rpedSets = previousData.sets.filter(
    (s) => s.rpe != null && Number.isFinite(Number(s.rpe))
  );
  const avgLoggedRpe =
    rpedSets.length > 0
      ? rpedSets.reduce((sum, s) => sum + Number(s.rpe), 0) / rpedSets.length
      : null;

  const e1RMs = previousData.sets
    .filter(
      (s) =>
        s.weight != null &&
        s.reps != null &&
        s.weight > 0 &&
        s.reps > 0 &&
        Number.isFinite(s.weight) &&
        Number.isFinite(s.reps)
    )
    .map((s) => calculateE1RM(s.weight!, s.reps!));
  if (e1RMs.length === 0) return null;
  const e1RM = Math.max(...e1RMs);

  const loggedWeights = previousData.sets
    .map((s) => s.weight)
    .filter((w): w is number => w != null && Number.isFinite(w) && w > 0);
  if (loggedWeights.length === 0) return null;
  const maxLoggedWeight = Math.max(...loggedWeights);

  let completion = false;
  if (
    currentRules.targetSets != null &&
    currentRules.targetRepsMin != null &&
    currentRules.targetWeightKg != null
  ) {
    const enoughSets = previousData.sets.length >= currentRules.targetSets;
    const tw = currentRules.targetWeightKg;
    const tr = currentRules.targetRepsMin;
    const everySetMet = previousData.sets.every(
      (s) =>
        s.reps != null &&
        s.weight != null &&
        s.reps >= tr &&
        s.weight >= tw
    );
    completion = enoughSets && everySetMet;
  }

  const prescribedRpe = currentRules.targetRir;
  const targetReps = currentRules.targetRepsMin ?? 8;

  let suggestedWeight: number | null = null;
  let type: ProgressionSuggestion['type'];
  let message = '';

  if (prescribedRpe != null && avgLoggedRpe != null) {
    const gap = avgLoggedRpe - prescribedRpe;
    if (gap >= 2) {
      const pct = rpeToPercent(prescribedRpe, targetReps);
      suggestedWeight = e1RM * pct;
      type = 'rpe_correction_down';
      message = 'You logged harder than prescribed — try a lighter weight';
    } else if (gap <= -2) {
      const pct = rpeToPercent(prescribedRpe, targetReps);
      suggestedWeight = e1RM * pct;
      type = 'rpe_correction_up';
      message = 'You logged easier than prescribed — try a heavier weight';
    } else {
      return null;
    }
  } else {
    if (!completion) return null;
    const pct = repsToPercent(targetReps);
    suggestedWeight = e1RM * pct;
    type = 'progress';
    message = 'You hit every set — ready for a small bump';
  }

  if (suggestedWeight == null || !Number.isFinite(suggestedWeight)) return null;
  const rounded = roundToNearest(suggestedWeight, 2.5);
  if (rounded === maxLoggedWeight) return null;

  return {
    exerciseId,
    exerciseName,
    message,
    suggestedWeight: rounded,
    suggestedReps: currentRules.targetRepsMin ?? null,
    type,
    confidence: 'medium',
  };
}

/**
 * Get progression suggestions for all exercises in a workout.
 * This is the main function called from the workout executor.
 *
 * The returned Map only contains entries for exercises that produced a
 * suggestion. Exercises with no previous performance data (first-time) are
 * intentionally absent — consumers must look up via `.get()` and handle
 * `undefined` gracefully (no nudge is rendered for missing entries).
 */
export async function getProgressionSuggestionsForWorkout(
  assignmentId: string,
  currentWeek: number,
  exerciseIds: string[],
  exerciseNames: Map<string, string>
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

    // calculateProgressionSuggestion may return null (no actionable nudge).
    const suggestion = calculateProgressionSuggestion(
      previousData,
      currentRules,
      null,
      exerciseId,
      exerciseName
    );

    return { exerciseId, suggestion };
  });

  const results = await Promise.all(promises);

  results.forEach((result) => {
    if (result && result.suggestion) {
      suggestions.set(result.exerciseId, result.suggestion);
    }
  });

  return suggestions;
}
