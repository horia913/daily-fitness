import { supabase } from "@/lib/supabase";
import type { StrengthTimeRange } from "@/lib/strengthAnalytics";

function daysForRange(tr: StrengthTimeRange): number | null {
  switch (tr) {
    case "1M":
      return 30;
    case "3M":
      return 90;
    case "6M":
      return 180;
    case "1Y":
      return 365;
    case "ALL":
      return null;
    default:
      return 90;
  }
}

export interface TrainingRhythmSummary {
  workoutsLoggedInRange: number;
  /** Oldest → newest, length 12 */
  weeklyWorkoutCounts: number[];
  /** Monday YYYY-MM-DD keys, same order as counts */
  weekKeys: string[];
  /** Average workouts per week over the last 5 completed buckets in the 12w window */
  workoutsPerWeek5Avg: number;
  /** Average session length (minutes) in the current calendar week */
  thisWeekAvgDurationMin: number;
}

/**
 * Single parallel-friendly bundle: in-range workout count + last-12-weeks rhythm buckets.
 */
export async function fetchTrainingRhythmSummary(
  clientId: string,
  timeRange: StrengthTimeRange,
): Promise<TrainingRhythmSummary> {
  const days = daysForRange(timeRange);
  const now = new Date();
  const rangeStart = new Date();
  if (days == null) {
    rangeStart.setFullYear(rangeStart.getFullYear() - 8);
  } else {
    rangeStart.setDate(now.getDate() - days);
  }
  const rangeStartIso = rangeStart.toISOString();

  const twelveWeeksAgo = new Date();
  twelveWeeksAgo.setDate(now.getDate() - 12 * 7);
  const twelveIso = twelveWeeksAgo.toISOString();

  const [countRes, logsRes] = await Promise.all([
    supabase
      .from("workout_logs")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .not("completed_at", "is", null)
      .gte("completed_at", rangeStartIso),
    supabase
      .from("workout_logs")
      .select("completed_at, total_duration_minutes")
      .eq("client_id", clientId)
      .not("completed_at", "is", null)
      .gte("completed_at", twelveIso)
      .order("completed_at", { ascending: true }),
  ]);

  if (logsRes.error) throw logsRes.error;

  const workoutsLoggedInRange = countRes.count ?? 0;

  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekKeys: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday - i * 7);
    monday.setHours(0, 0, 0, 0);
    weekKeys.push(monday.toISOString().split("T")[0]);
  }

  const weekMap = new Map<
    string,
    { sumDur: number; workoutCount: number }
  >();
  weekKeys.forEach((k) => weekMap.set(k, { sumDur: 0, workoutCount: 0 }));

  logsRes.data?.forEach((log) => {
    const d = new Date(log.completed_at as string);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const mon = new Date(d);
    mon.setDate(d.getDate() + diff);
    mon.setHours(0, 0, 0, 0);
    const key = mon.toISOString().split("T")[0];
    const e = weekMap.get(key);
    if (e) {
      e.workoutCount += 1;
      e.sumDur += Number(log.total_duration_minutes) || 0;
    }
  });

  const weeklyWorkoutCounts = weekKeys.map(
    (k) => weekMap.get(k)!.workoutCount,
  );
  const last5 = weeklyWorkoutCounts.slice(-5);
  const sum5 = last5.reduce((a, b) => a + b, 0);
  const workoutsPerWeek5Avg = sum5 / 5;

  const thisWeekKey = weekKeys[weekKeys.length - 1]!;
  const tw = weekMap.get(thisWeekKey)!;
  const thisWeekAvgDurationMin =
    tw.workoutCount > 0 ? Math.round(tw.sumDur / tw.workoutCount) : 0;

  return {
    workoutsLoggedInRange,
    weeklyWorkoutCounts,
    weekKeys,
    workoutsPerWeek5Avg,
    thisWeekAvgDurationMin,
  };
}
