/**
 * Client Report Service
 * Fetches all data needed for the PDF progress report for a single client over a date range.
 */

import { supabase } from "./supabase";
import { getClientMeasurements, getFirstMeasurement } from "./measurementService";
import { getLogRange, getCheckinStreak } from "./wellnessService";
import { dbToUiScale } from "./wellnessService";
import { getClientCheckInConfig } from "./checkInConfigService";
import { getNutritionComplianceTrend } from "./nutritionLogService";

export interface ReportData {
  cover: {
    clientFirstName: string;
    clientLastName: string;
    coachFirstName: string;
    coachLastName: string;
    startDate: string;
    endDate: string;
    overallAdherencePct: number | null;
    trainingDaysThisPeriod: number;
    checkinStreak: number;
    activeProgramName: string | null;
    programWeekOfTotal: string | null; // e.g. "Week 6 of 12"
  };
  body: {
    sinceStart: {
      weightStart: number | null;
      weightCurrent: number | null;
      weightChange: number | null;
      bodyFatStart: number | null;
      bodyFatCurrent: number | null;
      bodyFatChange: number | null;
      waistStart: number | null;
      waistCurrent: number | null;
      waistChange: number | null;
    };
    thisPeriod: {
      weightStart: number | null;
      weightEnd: number | null;
      weightChange: number | null;
      bodyFatStart: number | null;
      bodyFatEnd: number | null;
      bodyFatChange: number | null;
      waistStart: number | null;
      waistEnd: number | null;
      waistChange: number | null;
    };
    photoDatesInPeriod: string[];
  };
  training: {
    scheduledWorkouts: number;
    completedWorkouts: number;
    adherencePct: number | null;
    totalVolumeKg: number;
    volumeTrend: "up" | "down" | "stable"; // vs previous period of same length
    topExercises: Array<{ name: string; bestSet: string; volume: number }>;
    prsThisPeriod: Array<{ exerciseName: string; record: string; date: string }>;
  };
  wellness: {
    daysCheckedIn: number;
    totalDaysInPeriod: number;
    checkInPct: number;
    thisPeriod: { sleep: number; stress: number; soreness: number };
    previousPeriod: { sleep: number; stress: number; soreness: number };
    insight: string;
  };
  nutrition: {
    hasData: boolean;
    adherencePct: number | null;
    avgCalories: number | null;
    avgProtein: number | null;
    targetCalories: number | null;
    targetProtein: number | null;
  } | null;
}

function parseYmd(s: string): Date {
  return new Date(s + "T12:00:00Z");
}

function daysBetween(a: string, b: string): number {
  return Math.round((parseYmd(b).getTime() - parseYmd(a).getTime()) / (24 * 60 * 60 * 1000));
}

export async function getReportData(
  clientId: string,
  coachId: string,
  startDate: string,
  endDate: string
): Promise<ReportData> {
  const start = startDate.slice(0, 10);
  const end = endDate.slice(0, 10);
  const periodDays = Math.max(1, daysBetween(start, end) + 1);
  const prevEnd = parseYmd(start);
  prevEnd.setUTCDate(prevEnd.getUTCDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setUTCDate(prevStart.getUTCDate() - periodDays + 1);
  const prevStartStr = prevStart.toISOString().split("T")[0];
  const prevEndStr = prevEnd.toISOString().split("T")[0];

  const [
    clientProfile,
    coachProfile,
    bodyAll,
    firstMeasurement,
    wellnessLogs,
    wellnessPrev,
    checkinStreak,
    checkInConfig,
    assignmentRes,
    workoutLogsRes,
    prsRes,
    mealPlanRes,
    nutritionGoalsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("first_name, last_name").eq("id", clientId).single(),
    supabase.from("profiles").select("first_name, last_name").eq("id", coachId).single(),
    getClientMeasurements(clientId, 500),
    getFirstMeasurement(clientId),
    getLogRange(clientId, start, end),
    getLogRange(clientId, prevStartStr, prevEndStr),
    getCheckinStreak(clientId),
    getClientCheckInConfig(clientId),
    supabase
      .from("program_assignments")
      .select("id, program_id, duration_weeks")
      .eq("client_id", clientId)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("workout_logs")
      .select("id, completed_at")
      .eq("client_id", clientId)
      .not("completed_at", "is", null)
      .gte("completed_at", start + "T00:00:00")
      .lte("completed_at", end + "T23:59:59"),
    supabase
      .from("personal_records")
      .select("achieved_date, record_type, record_value, record_unit, exercises(name)")
      .eq("client_id", clientId)
      .gte("achieved_date", start)
      .lte("achieved_date", end)
      .order("achieved_date", { ascending: false }),
    supabase.from("meal_plan_assignments").select("id").eq("client_id", clientId).eq("is_active", true).limit(1),
    supabase.from("goals").select("id").eq("client_id", clientId).eq("pillar", "nutrition").eq("status", "active").limit(1),
  ]);

  const clientFirstName = (clientProfile.data?.first_name ?? "").trim() || "Client";
  const clientLastName = (clientProfile.data?.last_name ?? "").trim() || "";
  const coachFirstName = (coachProfile.data?.first_name ?? "").trim() || "Coach";
  const coachLastName = (coachProfile.data?.last_name ?? "").trim() || "";

  const measurementsInPeriod = bodyAll.filter((m) => m.measured_date >= start && m.measured_date <= end);
  const sortedInPeriod = [...measurementsInPeriod].sort(
    (a, b) => (a.measured_date > b.measured_date ? 1 : -1)
  );
  const firstInPeriod = sortedInPeriod[0];
  const lastInPeriod = sortedInPeriod[sortedInPeriod.length - 1];

  const weightStartPeriod = firstInPeriod?.weight_kg ?? null;
  const weightEndPeriod = lastInPeriod?.weight_kg ?? null;
  const weightChangePeriod =
    weightStartPeriod != null && weightEndPeriod != null ? weightEndPeriod - weightStartPeriod : null;
  const bodyFatStartPeriod = firstInPeriod?.body_fat_percentage ?? null;
  const bodyFatEndPeriod = lastInPeriod?.body_fat_percentage ?? null;
  const bodyFatChangePeriod =
    bodyFatStartPeriod != null && bodyFatEndPeriod != null ? bodyFatEndPeriod - bodyFatStartPeriod : null;
  const waistStartPeriod = firstInPeriod?.waist_circumference ?? null;
  const waistEndPeriod = lastInPeriod?.waist_circumference ?? null;
  const waistChangePeriod =
    waistStartPeriod != null && waistEndPeriod != null ? waistEndPeriod - waistStartPeriod : null;

  const weightStartEver = firstMeasurement?.weight_kg ?? null;
  const weightCurrent = lastInPeriod?.weight_kg ?? firstMeasurement?.weight_kg ?? null;
  const weightChangeEver =
    weightStartEver != null && weightCurrent != null ? weightCurrent - weightStartEver : null;
  const bodyFatStartEver = firstMeasurement?.body_fat_percentage ?? null;
  const bodyFatCurrent = lastInPeriod?.body_fat_percentage ?? firstMeasurement?.body_fat_percentage ?? null;
  const bodyFatChangeEver =
    bodyFatStartEver != null && bodyFatCurrent != null ? bodyFatCurrent - bodyFatStartEver : null;
  const waistStartEver = firstMeasurement?.waist_circumference ?? null;
  const waistCurrent = lastInPeriod?.waist_circumference ?? firstMeasurement?.waist_circumference ?? null;
  const waistChangeEver =
    waistStartEver != null && waistCurrent != null ? waistCurrent - waistStartEver : null;

  const { data: photoTimeline } = await supabase
    .from("progress_photos")
    .select("photo_date")
    .eq("client_id", clientId)
    .gte("photo_date", start)
    .lte("photo_date", end);
  const photoDatesInPeriod = [...new Set((photoTimeline ?? []).map((p: { photo_date: string }) => p.photo_date))];

  let programName: string | null = null;
  let programWeekOfTotal: string | null = null;
  const assignment = assignmentRes.data;
  if (assignment?.program_id) {
    const { data: programRow } = await supabase
      .from("workout_programs")
      .select("name")
      .eq("id", assignment.program_id)
      .single();
    programName = programRow?.name ?? null;
    const { data: progress } = await supabase
      .from("program_progress")
      .select("current_week_number")
      .eq("program_assignment_id", assignment.id)
      .single();
    const weekNum = progress?.current_week_number ?? 1;
    const totalWeeks = assignment.duration_weeks ?? 12;
    programWeekOfTotal = `Week ${weekNum} of ${totalWeeks}`;
  }

  const workoutLogs = workoutLogsRes.data ?? [];
  const logIds = workoutLogs.map((l: { id: string }) => l.id);
  const trainingDaysThisPeriod = new Set(workoutLogs.map((l: { completed_at: string }) => l.completed_at?.slice(0, 10))).size;

  let totalVolumeKg = 0;
  let topExercises: ReportData["training"]["topExercises"] = [];
  let scheduledWorkouts = 0;
  let completedWorkouts = 0;

  if (logIds.length > 0) {
    const { data: setLogs } = await supabase
      .from("workout_set_logs")
      .select("exercise_id, weight, reps, set_type, dropset_initial_weight, dropset_initial_reps, dropset_final_weight, dropset_final_reps, superset_weight_a, superset_reps_a, superset_weight_b, superset_reps_b")
      .in("workout_log_id", logIds);
    const setLogsList = setLogs ?? [];

    function vol(s: any): number {
      if (s.set_type === "drop_set") {
        return (s.dropset_initial_weight || 0) * (s.dropset_initial_reps || 0) + (s.dropset_final_weight || 0) * (s.dropset_final_reps || 0);
      }
      if (s.set_type === "superset") {
        return (s.superset_weight_a || 0) * (s.superset_reps_a || 0) + (s.superset_weight_b || 0) * (s.superset_reps_b || 0);
      }
      return (s.weight || 0) * (s.reps || 0);
    }

    setLogsList.forEach((s: any) => {
      totalVolumeKg += vol(s);
    });

    const byExercise = new Map<
      string,
      { volume: number; bestWeight: number; bestReps: number }
    >();
    setLogsList.forEach((s: any) => {
      const eid = s.exercise_id || "unknown";
      const v = vol(s);
      const w = s.weight ?? s.dropset_initial_weight ?? s.superset_weight_a ?? 0;
      const r = s.reps ?? s.dropset_initial_reps ?? s.superset_reps_a ?? 0;
      if (!byExercise.has(eid)) byExercise.set(eid, { volume: 0, bestWeight: 0, bestReps: 0 });
      const cur = byExercise.get(eid)!;
      cur.volume += v;
      if (w * r > cur.bestWeight * cur.bestReps) {
        cur.bestWeight = w;
        cur.bestReps = r;
      }
    });

    const exerciseIds = [...byExercise.keys()].filter((id) => id !== "unknown");
    if (exerciseIds.length > 0) {
      const { data: exercises } = await supabase
        .from("exercises")
        .select("id, name")
        .in("id", exerciseIds);
      const nameById = new Map((exercises ?? []).map((e: { id: string; name: string }) => [e.id, e.name]));
      topExercises = [...byExercise.entries()]
        .filter(([id]) => id !== "unknown")
        .sort((a, b) => b[1].volume - a[1].volume)
        .slice(0, 5)
        .map(([id, d]) => ({
          name: nameById.get(id) ?? "Exercise",
          bestSet: `${d.bestWeight} kg × ${d.bestReps} reps`,
          volume: Math.round(d.volume),
        }));
    }

    if (assignment?.id) {
      const { data: schedule } = await supabase
        .from("program_schedule")
        .select("id, week_number, is_optional")
        .eq("program_id", assignment.program_id);
      const scheduleInRange: { id: string; week_number: number; is_optional?: boolean }[] = schedule ?? [];
      const requiredScheduleInRange = scheduleInRange.filter((s) => !s.is_optional);
      const startTs = parseYmd(start).getTime();
      const endTs = parseYmd(end).getTime();
      const slotIdsInRange = new Set<string>();
      requiredScheduleInRange.forEach((s: { id: string }) => {
        slotIdsInRange.add(s.id);
      });
      scheduledWorkouts = requiredScheduleInRange.length;
      const { data: completions } = await supabase
        .from("program_day_completions")
        .select("program_schedule_id, completed_at")
        .eq("program_assignment_id", assignment.id)
        .gte("completed_at", start + "T00:00:00")
        .lte("completed_at", end + "T23:59:59");
      const completedInRange = (completions ?? []).filter((c: { program_schedule_id: string }) =>
        slotIdsInRange.has(c.program_schedule_id)
      ).length;
      completedWorkouts = completedInRange;
    }
  }

  const adherencePct =
    scheduledWorkouts > 0 ? Math.round((completedWorkouts / scheduledWorkouts) * 100) : null;

  let volumeTrend: "up" | "down" | "stable" = "stable";
  const prevVolumeRes = await supabase
    .from("workout_logs")
    .select("id")
    .eq("client_id", clientId)
    .not("completed_at", "is", null)
    .gte("completed_at", prevStartStr + "T00:00:00")
    .lte("completed_at", prevEndStr + "T23:59:59");
  const prevLogIds = (prevVolumeRes.data ?? []).map((l: { id: string }) => l.id);
  if (prevLogIds.length > 0) {
    const { data: prevSets } = await supabase
      .from("workout_set_logs")
      .select("weight, reps, set_type, dropset_initial_weight, dropset_initial_reps, dropset_final_weight, dropset_final_reps, superset_weight_a, superset_reps_a, superset_weight_b, superset_reps_b")
      .in("workout_log_id", prevLogIds);
    let prevVol = 0;
    (prevSets ?? []).forEach((s: any) => {
      if (s.set_type === "drop_set")
        prevVol += (s.dropset_initial_weight || 0) * (s.dropset_initial_reps || 0) + (s.dropset_final_weight || 0) * (s.dropset_final_reps || 0);
      else if (s.set_type === "superset")
        prevVol += (s.superset_weight_a || 0) * (s.superset_reps_a || 0) + (s.superset_weight_b || 0) * (s.superset_reps_b || 0);
      else prevVol += (s.weight || 0) * (s.reps || 0);
    });
    const pct = prevVol > 0 ? ((totalVolumeKg - prevVol) / prevVol) * 100 : 0;
    if (pct > 5) volumeTrend = "up";
    else if (pct < -5) volumeTrend = "down";
  }

  const prs = (prsRes.data ?? []).map((pr: any) => {
    const name = pr.exercises?.name ?? (Array.isArray(pr.exercises) ? pr.exercises[0]?.name : null) ?? "Exercise";
    const record =
      pr.record_type === "weight"
        ? `${pr.record_value ?? 0} ${pr.record_unit || "kg"}`
        : `${pr.record_value ?? 0} ${pr.record_unit || "reps"}`;
    return { exerciseName: name, record, date: pr.achieved_date };
  });

  const completeLogs = wellnessLogs.filter(
    (l) => l.sleep_hours != null && l.stress_level != null && l.soreness_level != null
  );
  const daysCheckedIn = completeLogs.length;
  const checkInPct = periodDays > 0 ? Math.round((daysCheckedIn / periodDays) * 100) : 0;

  const avg = (logs: typeof wellnessLogs) => {
    const withAll = logs.filter(
      (l) => l.sleep_hours != null && l.stress_level != null && l.soreness_level != null
    );
    if (withAll.length === 0) return { sleep: 0, stress: 0, soreness: 0 };
    const sleep = withAll.reduce((s, l) => s + (l.sleep_hours ?? 0), 0) / withAll.length;
    const stress = withAll.reduce((s, l) => s + (dbToUiScale(l.stress_level) ?? 0), 0) / withAll.length;
    const soreness = withAll.reduce((s, l) => s + (dbToUiScale(l.soreness_level) ?? 0), 0) / withAll.length;
    return { sleep, stress, soreness };
  };
  const thisPeriodAvg = avg(wellnessLogs);
  const previousPeriodAvg = avg(wellnessPrev);

  let insight = "Wellness data recorded for this period.";
  if (thisPeriodAvg.sleep > 0 && previousPeriodAvg.sleep > 0) {
    if (thisPeriodAvg.sleep > previousPeriodAvg.sleep + 0.2) insight = "Sleep improved this period — good recovery.";
    else if (thisPeriodAvg.stress < previousPeriodAvg.stress - 0.2) insight = "Stress decreased — positive trend.";
    else if (thisPeriodAvg.soreness > previousPeriodAvg.soreness + 0.2 && totalVolumeKg > 0) insight = "Soreness increased with training volume — monitor recovery.";
  }

  const frequencyDays = checkInConfig?.frequency_days ?? 30;
  const expectedCheckIns = Math.floor(periodDays / frequencyDays) || 1;
  const adherencePillars: number[] = [];
  if (adherencePct != null) adherencePillars.push(adherencePct);
  const hasMealPlan = (mealPlanRes.data?.length ?? 0) > 0;
  const hasNutritionGoals = (nutritionGoalsRes.data?.length ?? 0) > 0;
  let nutritionAdherencePct: number | null = null;
  let avgCalories: number | null = null;
  let avgProtein: number | null = null;
  let targetCalories: number | null = null;
  let targetProtein: number | null = null;
  if (hasMealPlan || hasNutritionGoals) {
    const trend = await getNutritionComplianceTrend(clientId, start, end);
    if (trend.length > 0)
      nutritionAdherencePct = Math.round(trend.reduce((s, d) => s + d.compliance, 0) / trend.length);
  }
  if (checkInConfig) adherencePillars.push(Math.min(100, checkInPct));
  const overallAdherencePct =
    adherencePillars.length > 0 ? Math.round(adherencePillars.reduce((a, b) => a + b, 0) / adherencePillars.length) : null;

  const nutritionSection: ReportData["nutrition"] =
    hasMealPlan || hasNutritionGoals
      ? {
          hasData: true,
          adherencePct: nutritionAdherencePct,
          avgCalories,
          avgProtein,
          targetCalories,
          targetProtein,
        }
      : null;

  return {
    cover: {
      clientFirstName,
      clientLastName,
      coachFirstName,
      coachLastName,
      startDate: start,
      endDate: end,
      overallAdherencePct,
      trainingDaysThisPeriod,
      checkinStreak,
      activeProgramName: programName,
      programWeekOfTotal,
    },
    body: {
      sinceStart: {
        weightStart: weightStartEver,
        weightCurrent,
        weightChange: weightChangeEver,
        bodyFatStart: bodyFatStartEver,
        bodyFatCurrent,
        bodyFatChange: bodyFatChangeEver,
        waistStart: waistStartEver,
        waistCurrent,
        waistChange: waistChangeEver,
      },
      thisPeriod: {
        weightStart: weightStartPeriod,
        weightEnd: weightEndPeriod,
        weightChange: weightChangePeriod,
        bodyFatStart: bodyFatStartPeriod,
        bodyFatEnd: bodyFatEndPeriod,
        bodyFatChange: bodyFatChangePeriod,
        waistStart: waistStartPeriod,
        waistEnd: waistEndPeriod,
        waistChange: waistChangePeriod,
      },
      photoDatesInPeriod,
    },
    training: {
      scheduledWorkouts,
      completedWorkouts,
      adherencePct,
      totalVolumeKg: Math.round(totalVolumeKg),
      volumeTrend,
      topExercises,
      prsThisPeriod: prs,
    },
    wellness: {
      daysCheckedIn,
      totalDaysInPeriod: periodDays,
      checkInPct,
      thisPeriod: thisPeriodAvg,
      previousPeriod: previousPeriodAvg,
      insight,
    },
    nutrition: nutritionSection,
  };
}
