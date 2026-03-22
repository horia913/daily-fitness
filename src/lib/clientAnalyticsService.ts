/**
 * Client Analytics Service
 * Bundles all data needed for the coach's Client Analytics page (single client command center).
 * Uses parallel fetches to avoid N+1 and long load times.
 */

import { supabase } from "./supabase";
import { getClientMeasurements, getFirstMeasurement } from "./measurementService";
import type { BodyMeasurement } from "./measurementService";
import { getLogRange, getCheckinStreak, getBestStreak } from "./wellnessService";
import type { DailyWellnessLog } from "./wellnessService";
import { getWeeklyVolume } from "./volumeAnalytics";
import { getPhotoTimelineWithPreviews } from "./progressPhotoService";
import { getClientCheckInConfig } from "./checkInConfigService";
import { getPeriodBounds } from "./metrics/period";
import { getNutritionCompliance } from "./metrics/nutrition";
import { getNutritionComplianceTrend } from "./nutritionLogService";
import { dbToUiScale } from "./wellnessService";

const TODAY = new Date().toISOString().split("T")[0];
const THIRTY_DAYS_AGO = new Date();
THIRTY_DAYS_AGO.setDate(THIRTY_DAYS_AGO.getDate() - 30);
const THIRTY_DAYS_AGO_STR = THIRTY_DAYS_AGO.toISOString().split("T")[0];
const NINETY_DAYS_AGO = new Date();
NINETY_DAYS_AGO.setDate(NINETY_DAYS_AGO.getDate() - 89);
const NINETY_DAYS_AGO_STR = NINETY_DAYS_AGO.toISOString().split("T")[0];

export interface ClientAnalyticsData {
  overview: {
    overallAdherencePct: number | null;
    overallAdherenceTrend: "up" | "down" | "same";
    trainingVolumeThisWeek: number;
    trainingVolumeLastWeek: number;
    trainingVolumeTrend: "up" | "down" | "same";
    checkinStreak: number;
    bestStreak: number;
    bodyCompositionTrend: { label: string; deltaKg: number | null };
    programProgress: { weekNum: number; totalWeeks: number; pct: number } | null;
    daysActiveLast30: number;
    totalDays30: number;
  };
  goals: {
    active: Array<{
      id: string;
      title: string;
      pillar: string;
      target_value: number | null;
      current_value: number | null;
      progress_percentage: number | null;
      target_unit: string | null;
      created_at: string;
    }>;
    completedCount: number;
  };
  workout: {
    weeklyVolume: Array<{ weekStart: string; totalVolume: number }>;
    programAdherenceThisWeek: number | null;
    scheduledThisWeek: number;
    completedThisWeek: number;
  };
  body: {
    measurements: BodyMeasurement[];
    firstMeasurement: BodyMeasurement | null;
    weightGoal: number | null;
  };
  wellness: {
    logs: DailyWellnessLog[];
    weeklyAverages: Array<{ weekStart: string; sleep: number; stress: number; soreness: number }>;
  };
  photos: { date: string; types: string[]; weight_kg?: number | null; previewUrl?: string | null }[];
  nutrition: {
    hasGoalsOrPlan: boolean;
    adherencePct: number | null;
    complianceThisWeek: number | null;
    complianceThisMonth: number | null;
  };
  habits: {
    hasHabits: boolean;
    assignments: Array<{ id: string; habit_id: string; name?: string }>;
    completionByHabit: Record<string, { completed: number; total: number; streak: number }>;
  };
}

export async function getClientAnalytics(clientId: string): Promise<ClientAnalyticsData> {
  const [
    goalsRes,
    bodyMeasurements,
    firstMeasurement,
    wellnessLogs,
    volumeStats,
    photoTimeline,
    checkinStreak,
    bestStreak,
    checkInConfig,
    programAssignment,
    mealPlanRes,
    nutritionGoalsRes,
    habitAssignmentsRes,
  ] = await Promise.all([
    supabase.from("goals").select("id, title, pillar, target_value, current_value, progress_percentage, target_unit, status, created_at").eq("client_id", clientId).order("created_at", { ascending: false }),
    getClientMeasurements(clientId, 90),
    getFirstMeasurement(clientId),
    getLogRange(clientId, NINETY_DAYS_AGO_STR, TODAY),
    getWeeklyVolume(clientId, 12),
    getPhotoTimelineWithPreviews(clientId, 12),
    getCheckinStreak(clientId),
    getBestStreak(clientId),
    getClientCheckInConfig(clientId),
    supabase.from("program_assignments").select("id, program_id, start_date, duration_weeks").eq("client_id", clientId).eq("status", "active").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("meal_plan_assignments").select("id").eq("client_id", clientId).eq("is_active", true).limit(1),
    supabase.from("goals").select("id").eq("client_id", clientId).eq("pillar", "nutrition").eq("status", "active").limit(1),
    supabase.from("habit_assignments").select("id, habit_id").eq("client_id", clientId).eq("is_active", true),
  ]);

  const goals = (goalsRes.data ?? []) as Array<{
    id: string;
    title: string;
    pillar: string;
    target_value: number | null;
    current_value: number | null;
    progress_percentage: number | null;
    target_unit: string | null;
    status: string;
    created_at: string;
  }>;
  const activeGoals = goals.filter((g) => g.status === "active");
  const completedCount = goals.filter((g) => g.status === "completed").length;

  const assignment = programAssignment.data;
  let programProgress: ClientAnalyticsData["overview"]["programProgress"] = null;
  let programAdherenceThisWeek: number | null = null;
  let scheduledThisWeek = 0;
  let completedThisWeek = 0;
  let programAdherencePriorWeek: number | null = null;

  if (assignment?.id) {
    const [{ data: progress }, { data: schedule }, { data: completions }] = await Promise.all([
      supabase.from("program_progress").select("current_week_number").eq("program_assignment_id", assignment.id).single(),
      supabase.from("program_schedule").select("id, week_number, is_optional").eq("program_id", assignment.program_id),
      supabase.from("program_day_completions").select("program_schedule_id, program_schedule(week_number)").eq("program_assignment_id", assignment.id),
    ]);
    const weekNum = progress?.current_week_number ?? 1;
    const durationWeeks = assignment.duration_weeks ?? 12;
    programProgress = { weekNum, totalWeeks: durationWeeks, pct: durationWeeks > 0 ? Math.round((weekNum / durationWeeks) * 100) : 0 };
    const slotsThisWeek = (schedule ?? []).filter((s: { week_number: number }) => s.week_number === weekNum);
    const requiredSlotsThisWeek = slotsThisWeek.filter((s: { is_optional?: boolean }) => !s.is_optional);
    scheduledThisWeek = requiredSlotsThisWeek.length;
    const slotIds = new Set(requiredSlotsThisWeek.map((s: { id: string }) => s.id));
    completedThisWeek = (completions ?? []).filter((c: { program_schedule_id: string }) => slotIds.has(c.program_schedule_id)).length;
    programAdherenceThisWeek = scheduledThisWeek > 0 ? Math.round((completedThisWeek / scheduledThisWeek) * 100) : null;

    if (weekNum > 1) {
      const prevWeek = weekNum - 1;
      const slotsPrev = (schedule ?? []).filter((s: { week_number: number }) => s.week_number === prevWeek);
      const requiredPrev = slotsPrev.filter((s: { is_optional?: boolean }) => !s.is_optional);
      const prevIds = new Set(requiredPrev.map((s: { id: string }) => s.id));
      const donePrev = (completions ?? []).filter((c: { program_schedule_id: string }) => prevIds.has(c.program_schedule_id)).length;
      programAdherencePriorWeek =
        requiredPrev.length > 0 ? Math.round((donePrev / requiredPrev.length) * 100) : null;
    }
  }

  const hasMealPlan = (mealPlanRes.data?.length ?? 0) > 0;
  const hasNutritionGoals = (nutritionGoalsRes.data?.length ?? 0) > 0;
  let nutritionAdherencePct: number | null = null;
  let complianceThisWeek: number | null = null;
  let complianceThisMonth: number | null = null;
  if (hasMealPlan || hasNutritionGoals) {
    const periodWeek = getPeriodBounds("this_week");
    const periodMonth = getPeriodBounds("this_month");
    if (hasMealPlan) {
      const [w, m] = await Promise.all([
        getNutritionCompliance(clientId, periodWeek, "this_week"),
        getNutritionCompliance(clientId, periodMonth, "this_month"),
      ]);
      nutritionAdherencePct = w.ratePercent;
      complianceThisWeek = w.ratePercent;
      complianceThisMonth = m.ratePercent;
    } else {
      const startWeek = periodWeek.start.slice(0, 10);
      const endWeek = new Date(periodWeek.end);
      endWeek.setUTCDate(endWeek.getUTCDate() - 1);
      const endWeekStr = endWeek.toISOString().slice(0, 10);
      const trend = await getNutritionComplianceTrend(clientId, startWeek, endWeekStr);
      if (trend.length > 0) {
        nutritionAdherencePct = Math.round(trend.reduce((s, d) => s + d.compliance, 0) / trend.length);
        complianceThisWeek = nutritionAdherencePct;
      }
    }
  }

  const frequencyDays = checkInConfig?.frequency_days ?? 30;
  const expectedCheckIns30 = Math.floor(30 / frequencyDays) || 1;
  const checkInDates30 = new Set(
    wellnessLogs.filter((l) => l.sleep_hours != null && l.stress_level != null && l.soreness_level != null).map((l) => l.log_date)
  );
  const checkInAdherence30 = expectedCheckIns30 > 0 ? Math.round((checkInDates30.size / expectedCheckIns30) * 100) : 0;

  const adherencePillars: number[] = [];
  if (programAdherenceThisWeek != null) adherencePillars.push(programAdherenceThisWeek);
  if (nutritionAdherencePct != null) adherencePillars.push(nutritionAdherencePct);
  if (checkInConfig) adherencePillars.push(Math.min(100, checkInAdherence30));
  const overallAdherencePct =
    adherencePillars.length > 0 ? Math.round(adherencePillars.reduce((a, b) => a + b, 0) / adherencePillars.length) : null;

  const weightIn30 = bodyMeasurements.filter((m) => m.measured_date >= THIRTY_DAYS_AGO_STR && m.weight_kg != null);
  const firstIn30 = weightIn30[weightIn30.length - 1];
  const lastIn30 = weightIn30[0];
  let bodyCompositionTrend: ClientAnalyticsData["overview"]["bodyCompositionTrend"] = { label: "—", deltaKg: null };
  if (firstIn30?.weight_kg != null && lastIn30?.weight_kg != null) {
    const delta = lastIn30.weight_kg - firstIn30.weight_kg;
    if (delta < 0) bodyCompositionTrend = { label: `↓ ${Math.abs(delta).toFixed(1)} kg this month`, deltaKg: delta };
    else if (delta > 0) bodyCompositionTrend = { label: `↑ ${delta.toFixed(1)} kg this month`, deltaKg: delta };
    else bodyCompositionTrend = { label: "→ Stable", deltaKg: 0 };
  }

  const workoutDates30 = new Set<string>();
  const wellnessDates30 = new Set(wellnessLogs.map((l) => l.log_date));
  const { data: workoutLogs30 } = await supabase
    .from("workout_logs")
    .select("completed_at")
    .eq("client_id", clientId)
    .not("completed_at", "is", null)
    .gte("completed_at", THIRTY_DAYS_AGO_STR)
    .lte("completed_at", TODAY);
  (workoutLogs30 ?? []).forEach((r: { completed_at: string }) => workoutDates30.add(r.completed_at.split("T")[0]));
  const { data: mealCompletions30 } = await supabase
    .from("meal_completions")
    .select("completed_at")
    .eq("client_id", clientId)
    .gte("completed_at", THIRTY_DAYS_AGO_STR)
    .lte("completed_at", TODAY + "T23:59:59");
  const mealDates30 = new Set<string>();
  (mealCompletions30 ?? []).forEach((r: { completed_at: string }) => mealDates30.add(r.completed_at.split("T")[0]));
  const allActiveDates = new Set([...workoutDates30, ...wellnessDates30, ...mealDates30]);
  const daysActiveLast30 = allActiveDates.size;

  const weeklyAverages: ClientAnalyticsData["wellness"]["weeklyAverages"] = [];
  for (let w = 11; w >= 0; w--) {
    const end = new Date();
    end.setDate(end.getDate() - w * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];
    const weekLogs = wellnessLogs.filter((l) => l.log_date >= startStr && l.log_date <= endStr);
    const withAll = weekLogs.filter((l) => l.sleep_hours != null && l.stress_level != null && l.soreness_level != null);
    const sleep = withAll.length ? withAll.reduce((s, l) => s + (l.sleep_hours ?? 0), 0) / withAll.length : 0;
    const stress = withAll.length ? withAll.reduce((s, l) => s + (dbToUiScale(l.stress_level) ?? 0), 0) / withAll.length : 0;
    const soreness = withAll.length ? withAll.reduce((s, l) => s + (dbToUiScale(l.soreness_level) ?? 0), 0) / withAll.length : 0;
    weeklyAverages.push({ weekStart: startStr, sleep, stress, soreness });
  }

  const weightGoal = activeGoals.find((g) => g.target_unit === "kg" || g.title?.toLowerCase().includes("weight"))?.target_value ?? null;

  // habit_assignments can 500 (e.g. RLS); treat as empty so analytics page still loads
  const habitAssignmentsRaw = (habitAssignmentsRes.error ? [] : (habitAssignmentsRes.data ?? [])) as Array<{ id: string; habit_id: string }>;
  const habitIds = [...new Set(habitAssignmentsRaw.map((a) => a.habit_id))];
  let habitNames: Record<string, string> = {};
  if (habitIds.length > 0) {
    const { data: habitsData } = await supabase.from("habits").select("id, name").in("id", habitIds);
    if (habitsData) {
      habitNames = Object.fromEntries(habitsData.map((h) => [h.id, h.name ?? ""]));
    }
  }
  const habitAssignments = habitAssignmentsRaw.map((a) => ({
    id: a.id,
    habit_id: a.habit_id,
    name: habitNames[a.habit_id],
  }));
  let completionByHabit: Record<string, { completed: number; total: number; streak: number }> = {};
  if (habitAssignments.length > 0) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: habitLogs } = await supabase
      .from("habit_logs")
      .select("assignment_id, log_date")
      .in("assignment_id", habitAssignments.map((a) => a.id))
      .gte("log_date", thirtyDaysAgo.toISOString().split("T")[0]);
    const byAssignment = new Map<string, string[]>();
    (habitLogs ?? []).forEach((l: { assignment_id: string; log_date: string }) => {
      if (!byAssignment.has(l.assignment_id)) byAssignment.set(l.assignment_id, []);
      byAssignment.get(l.assignment_id)!.push(l.log_date);
    });
    habitAssignments.forEach((a) => {
      const dates = byAssignment.get(a.id) ?? [];
      const unique = new Set(dates);
      const total = 30;
      let streak = 0;
      const d = new Date(TODAY + "T12:00:00Z");
      for (let i = 0; i < 365; i++) {
        const s = d.toISOString().split("T")[0];
        if (!unique.has(s)) break;
        streak++;
        d.setUTCDate(d.getUTCDate() - 1);
      }
      completionByHabit[a.id] = { completed: unique.size, total, streak };
    });
  }

  const vol = volumeStats.weeklyData ?? [];
  const currentWeekVol = vol.length > 0 ? vol[vol.length - 1].totalVolume : 0;
  const previousWeekVol = vol.length > 1 ? vol[vol.length - 2].totalVolume : 0;

  let overallAdherenceTrend: "up" | "down" | "same" = "same";
  if (
    programAdherenceThisWeek != null &&
    programAdherencePriorWeek != null
  ) {
    const d = programAdherenceThisWeek - programAdherencePriorWeek;
    if (d >= 5) overallAdherenceTrend = "up";
    else if (d <= -5) overallAdherenceTrend = "down";
  }

  return {
    overview: {
      overallAdherencePct,
      overallAdherenceTrend,
      trainingVolumeThisWeek: currentWeekVol,
      trainingVolumeLastWeek: previousWeekVol,
      trainingVolumeTrend: currentWeekVol > previousWeekVol ? "up" : currentWeekVol < previousWeekVol ? "down" : "same",
      checkinStreak,
      bestStreak,
      bodyCompositionTrend,
      programProgress,
      daysActiveLast30,
      totalDays30: 30,
    },
    goals: {
      active: activeGoals.map((g) => ({
        id: g.id,
        title: g.title,
        pillar: g.pillar,
        target_value: g.target_value,
        current_value: g.current_value,
        progress_percentage: g.progress_percentage,
        target_unit: g.target_unit,
        created_at: g.created_at,
      })),
      completedCount,
    },
    workout: {
      weeklyVolume: (volumeStats.weeklyData ?? []).map((w) => ({ weekStart: w.weekStart, totalVolume: w.totalVolume })),
      programAdherenceThisWeek,
      scheduledThisWeek,
      completedThisWeek,
    },
    body: {
      measurements: bodyMeasurements,
      firstMeasurement,
      weightGoal,
    },
    wellness: { logs: wellnessLogs, weeklyAverages },
    photos: photoTimeline,
    nutrition: {
      hasGoalsOrPlan: hasMealPlan || hasNutritionGoals,
      adherencePct: nutritionAdherencePct,
      complianceThisWeek,
      complianceThisMonth,
    },
    habits: {
      hasHabits: habitAssignments.length > 0,
      assignments: habitAssignments.map((a) => ({ id: a.id, habit_id: a.habit_id, name: a.name })),
      completionByHabit,
    },
  };
}
