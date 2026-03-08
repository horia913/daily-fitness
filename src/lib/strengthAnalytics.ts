import { supabase } from "./supabase";

export interface ExerciseProgressionDataPoint {
  date: string;
  maxWeight: number;
  maxReps: number;
  estimatedOneRM: number;
  totalVolume: number;
  bestSetDisplay: string;
}

export interface ExerciseProgression {
  exerciseId: string;
  exerciseName: string;
  dataPoints: ExerciseProgressionDataPoint[];
  currentOneRM: number;
  allTimeMax: number;
  allTimeMaxReps: number;
  progressPercent: number;
  trend: "up" | "plateau" | "down";
}

export interface TrainedExercise {
  id: string;
  name: string;
  lastTrained: string;
  sessionCount: number;
}

const DEFAULT_TIME_RANGES = {
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
  ALL: 9999,
} as const;

/**
 * Epley formula: e1RM = weight × (1 + reps / 30)
 * If reps === 1, return weight.
 * For reps > 12, formula is less accurate; we still compute but callers may filter.
 */
export function calculateOneRM(weight: number, reps: number): number {
  if (weight <= 0) return 0;
  if (reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

/**
 * Best estimated 1RM from a list of (weight, reps) — uses sets with reps <= 12 for accuracy.
 */
function bestEstimatedOneRMFromSets(
  sets: { weight: number; reps: number }[]
): number {
  let best = 0;
  for (const s of sets) {
    if (s.reps > 12) continue;
    const e1rm = calculateOneRM(s.weight, s.reps);
    if (e1rm > best) best = e1rm;
  }
  if (best > 0) return best;
  // Fallback: use any set
  for (const s of sets) {
    const e1rm = calculateOneRM(s.weight, s.reps);
    if (e1rm > best) best = e1rm;
  }
  return best;
}

function getDateKey(iso: string): string {
  return iso.split("T")[0];
}

function computeTrend(
  dataPoints: ExerciseProgressionDataPoint[]
): "up" | "plateau" | "down" {
  const points = dataPoints.slice(-4).map((p) => p.estimatedOneRM);
  if (points.length < 2) return "plateau";
  const first = points[0];
  const last = points[points.length - 1];
  const diff = last - first;
  const threshold = first * 0.02;
  if (diff > threshold) return "up";
  if (diff < -threshold) return "down";
  return "plateau";
}

export type StrengthTimeRange = keyof typeof DEFAULT_TIME_RANGES;
export { DEFAULT_TIME_RANGES };

export function filterProgressionByTimeRange(
  dataPoints: ExerciseProgressionDataPoint[],
  timeRange: StrengthTimeRange
): ExerciseProgressionDataPoint[] {
  const days = DEFAULT_TIME_RANGES[timeRange];
  if (days >= 9999) return dataPoints;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffKey = getDateKey(cutoff.toISOString());
  return dataPoints.filter((p) => p.date >= cutoffKey);
}

/**
 * Get progression for a specific exercise.
 */
export async function getExerciseProgression(
  clientId: string,
  exerciseId: string,
  timeRange: keyof typeof DEFAULT_TIME_RANGES = "3M"
): Promise<ExerciseProgression | null> {
  const { ensureAuthenticated } = await import("./supabase");
  await ensureAuthenticated();

  const { data: setLogs, error } = await supabase
    .from("workout_set_logs")
    .select(
      `
      weight,
      reps,
      completed_at,
      exercises (
        id,
        name
      )
    `
    )
    .eq("client_id", clientId)
    .eq("exercise_id", exerciseId)
    .not("weight", "is", null)
    .gt("weight", 0)
    .order("completed_at", { ascending: true });

  if (error || !setLogs?.length) return null;

  const exercise = (setLogs[0] as any)?.exercises;
  const exerciseName =
    (exercise?.name as string) || "Unknown";
  const exerciseIdResolved = (exercise?.id as string) || exerciseId;

  const byDate = new Map<
    string,
    { weight: number; reps: number; volume: number }[]
  >();

  for (const row of setLogs as any[]) {
    const w = Number(row.weight) || 0;
    const r = Math.max(0, Math.floor(Number(row.reps) || 0));
    if (w <= 0) continue;
    const dateKey = getDateKey(
      row.completed_at ? new Date(row.completed_at).toISOString() : new Date().toISOString()
    );
    if (!byDate.has(dateKey)) byDate.set(dateKey, []);
    byDate.get(dateKey)!.push({
      weight: w,
      reps: r,
      volume: w * r,
    });
  }

  const dataPoints: ExerciseProgressionDataPoint[] = [];
  let allTimeMax = 0;
  let allTimeMaxReps = 0;

  const sortedDates = Array.from(byDate.keys()).sort();
  for (const dateKey of sortedDates) {
    const sets = byDate.get(dateKey)!;
    const bestSet = sets.reduce(
      (best, s) =>
        s.weight > best.weight ||
        (s.weight === best.weight && s.reps > best.reps)
          ? s
          : best,
      sets[0]
    );
    const maxWeight = bestSet.weight;
    const maxReps = bestSet.reps;
    const totalVolume = sets.reduce((sum, s) => sum + s.volume, 0);
    const estimatedOneRM = bestEstimatedOneRMFromSets(sets);
    const bestSetDisplay =
      maxWeight > 0
        ? `${maxWeight}kg × ${maxReps}`
        : `${maxReps} reps`;

    if (maxWeight > allTimeMax) {
      allTimeMax = maxWeight;
      allTimeMaxReps = maxReps;
    }

    dataPoints.push({
      date: dateKey,
      maxWeight,
      maxReps,
      estimatedOneRM,
      totalVolume,
      bestSetDisplay,
    });
  }

  const firstE1RM = dataPoints[0]?.estimatedOneRM ?? 0;
  const lastE1RM = dataPoints[dataPoints.length - 1]?.estimatedOneRM ?? 0;
  const progressPercent =
    firstE1RM > 0
      ? Math.round(((lastE1RM - firstE1RM) / firstE1RM) * 1000) / 10
      : 0;
  const trend = computeTrend(dataPoints);

  return {
    exerciseId: exerciseIdResolved,
    exerciseName,
    dataPoints,
    currentOneRM: lastE1RM,
    allTimeMax,
    allTimeMaxReps,
    progressPercent,
    trend,
  };
}

/**
 * Get all exercises the client has trained.
 */
export async function getTrainedExercises(
  clientId: string
): Promise<TrainedExercise[]> {
  const { ensureAuthenticated } = await import("./supabase");
  await ensureAuthenticated();

  const { data: workoutLogs, error: logsError } = await supabase
    .from("workout_logs")
    .select("id")
    .eq("client_id", clientId);

  if (logsError || !workoutLogs?.length) return [];

  const logIds = workoutLogs.map((l) => l.id);

  const { data: setLogs, error: setsError } = await supabase
    .from("workout_set_logs")
    .select(
      `
      exercise_id,
      completed_at,
      exercises (
        id,
        name
      )
    `
    )
    .in("workout_log_id", logIds)
    .not("weight", "is", null)
    .gt("weight", 0);

  if (setsError || !setLogs?.length) return [];

  const byExercise = new Map<
    string,
    { name: string; lastDate: string; count: number }
  >();

  for (const row of setLogs as any[]) {
    const ex = row.exercises;
    const id = ex?.id ?? row.exercise_id;
    const name = ex?.name ?? "Unknown";
    if (!id) continue;
    const dateStr = row.completed_at
      ? getDateKey(new Date(row.completed_at).toISOString())
      : "";
    if (!byExercise.has(id)) {
      byExercise.set(id, { name, lastDate: dateStr, count: 0 });
    }
    const entry = byExercise.get(id)!;
    entry.count += 1;
    if (dateStr > entry.lastDate) entry.lastDate = dateStr;
  }

  return Array.from(byExercise.entries())
    .map(([id, { name, lastDate, count }]) => ({
      id,
      name,
      lastTrained: lastDate,
      sessionCount: count,
    }))
    .sort((a, b) => b.lastTrained.localeCompare(a.lastTrained));
}

/**
 * Get progressions for all trained exercises (summary; one progression per exercise).
 */
export async function getAllExerciseProgressions(
  clientId: string,
  timeRange: keyof typeof DEFAULT_TIME_RANGES = "3M"
): Promise<ExerciseProgression[]> {
  const exercises = await getTrainedExercises(clientId);
  const results: ExerciseProgression[] = [];

  for (const ex of exercises) {
    const prog = await getExerciseProgression(clientId, ex.id, timeRange);
    if (prog && prog.dataPoints.length >= 2) results.push(prog);
  }

  return results.sort(
    (a, b) =>
      new Date(b.dataPoints[b.dataPoints.length - 1]?.date ?? 0).getTime() -
      new Date(a.dataPoints[a.dataPoints.length - 1]?.date ?? 0).getTime()
  );
}

/**
 * Get top N progressions by progress percent (biggest gains).
 */
export async function getTopProgressions(
  clientId: string,
  count: number,
  timeRange: keyof typeof DEFAULT_TIME_RANGES = "3M"
): Promise<ExerciseProgression[]> {
  const all = await getAllExerciseProgressions(clientId, timeRange);
  return all
    .filter((p) => p.dataPoints.length >= 2)
    .sort((a, b) => b.progressPercent - a.progressPercent)
    .slice(0, count);
}

/** Compound lift names for 1RM summary card (match case-insensitive). */
const COMPOUND_LIFT_NAMES = [
  "Bench Press",
  "Squat",
  "Deadlift",
  "Overhead Press",
];

export function isCompoundLift(name: string): boolean {
  const lower = name.toLowerCase();
  return COMPOUND_LIFT_NAMES.some(
    (lift) => lower.includes(lift.toLowerCase()) || lift.toLowerCase().includes(lower)
  );
}

export function getCompoundLiftDisplayName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("bench")) return "Bench Press";
  if (lower.includes("squat") && !lower.includes("front")) return "Squat";
  if (lower.includes("deadlift")) return "Deadlift";
  if (lower.includes("overhead") || lower.includes("press")) return "Overhead Press";
  return name;
}
