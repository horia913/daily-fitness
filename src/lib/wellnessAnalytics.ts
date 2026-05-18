import { supabase } from "./supabase";
import { dbToUiScale } from "./wellnessService";
import type { VolumeStats } from "./volumeAnalytics";
import { getWeeklyVolume } from "./volumeAnalytics";
import { resolveStatsTabTimezone } from "./clientAnalyticsService";

export interface WellnessTrend {
  date: string;
  sleepHours: number | null;
  sleepQuality: number | null; // 1-5 (converted from DB scale)
  stressLevel: number | null; // 1-5 (converted from DB scale)
  sorenessLevel: number | null; // 1-5 (converted from DB scale)
  steps: number | null;
}

export interface WellnessStats {
  dailyData: WellnessTrend[];
  averages: {
    sleepHours: number;
    sleepQuality: number;
    stress: number;
    soreness: number;
    steps: number;
  };
  trends: {
    sleep: "improving" | "stable" | "declining";
    stress: "improving" | "stable" | "worsening"; // lower is better
    soreness: "improving" | "stable" | "worsening"; // lower is better
  };
}

/**
 * Get wellness trends for the specified number of days
 */
export async function getWellnessTrends(
  clientId: string,
  days: number = 30
): Promise<WellnessStats> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    // Query daily_wellness_logs (contains sleep_hours, sleep_quality, stress_level, soreness_level, steps)
    const { data: wellnessLogs, error } = await supabase
      .from("daily_wellness_logs")
      .select("log_date, sleep_hours, sleep_quality, stress_level, soreness_level, steps")
      .eq("client_id", clientId)
      .gte("log_date", startDateStr)
      .lte("log_date", endDateStr)
      .order("log_date", { ascending: true });

    if (error) throw error;

    // Convert to WellnessTrend format
    const dailyData: WellnessTrend[] = (wellnessLogs || []).map((log: any) => ({
      date: log.log_date,
      sleepHours: log.sleep_hours ? parseFloat(log.sleep_hours) : null,
      sleepQuality: dbToUiScale(log.sleep_quality),
      stressLevel: dbToUiScale(log.stress_level),
      sorenessLevel: dbToUiScale(log.soreness_level),
      steps: log.steps ? parseInt(log.steps, 10) : null,
    }));

    // Calculate averages (only for days with data)
    const daysWithSleep = dailyData.filter((d) => d.sleepHours != null);
    const daysWithSleepQuality = dailyData.filter((d) => d.sleepQuality != null);
    const daysWithStress = dailyData.filter((d) => d.stressLevel != null);
    const daysWithSoreness = dailyData.filter((d) => d.sorenessLevel != null);
    const daysWithSteps = dailyData.filter((d) => d.steps != null);

    const averages = {
      sleepHours:
        daysWithSleep.length > 0
          ? Math.round(
              (daysWithSleep.reduce((sum, d) => sum + (d.sleepHours || 0), 0) /
                daysWithSleep.length) *
                10
            ) / 10
          : 0,
      sleepQuality:
        daysWithSleepQuality.length > 0
          ? Math.round(
              (daysWithSleepQuality.reduce((sum, d) => sum + (d.sleepQuality || 0), 0) /
                daysWithSleepQuality.length) *
                10
            ) / 10
          : 0,
      stress:
        daysWithStress.length > 0
          ? Math.round(
              (daysWithStress.reduce((sum, d) => sum + (d.stressLevel || 0), 0) /
                daysWithStress.length) *
                10
            ) / 10
          : 0,
      soreness:
        daysWithSoreness.length > 0
          ? Math.round(
              (daysWithSoreness.reduce((sum, d) => sum + (d.sorenessLevel || 0), 0) /
                daysWithSoreness.length) *
                10
            ) / 10
          : 0,
      steps:
        daysWithSteps.length > 0
          ? Math.round(
              daysWithSteps.reduce((sum, d) => sum + (d.steps || 0), 0) / daysWithSteps.length
            )
          : 0,
    };

    // Calculate trends (compare last 7 days vs previous 7 days)
    const last7Days = dailyData.slice(-7);
    const previous7Days = dailyData.slice(-14, -7);

    const last7Sleep = last7Days.filter((d) => d.sleepHours != null);
    const prev7Sleep = previous7Days.filter((d) => d.sleepHours != null);
    const last7SleepAvg =
      last7Sleep.length > 0
        ? last7Sleep.reduce((sum, d) => sum + (d.sleepHours || 0), 0) / last7Sleep.length
        : 0;
    const prev7SleepAvg =
      prev7Sleep.length > 0
        ? prev7Sleep.reduce((sum, d) => sum + (d.sleepHours || 0), 0) / prev7Sleep.length
        : 0;

    let sleepTrend: "improving" | "stable" | "declining" = "stable";
    if (prev7SleepAvg > 0) {
      const change = ((last7SleepAvg - prev7SleepAvg) / prev7SleepAvg) * 100;
      if (change > 3) sleepTrend = "improving";
      else if (change < -3) sleepTrend = "declining";
    }

    const last7Stress = last7Days.filter((d) => d.stressLevel != null);
    const prev7Stress = previous7Days.filter((d) => d.stressLevel != null);
    const last7StressAvg =
      last7Stress.length > 0
        ? last7Stress.reduce((sum, d) => sum + (d.stressLevel || 0), 0) / last7Stress.length
        : 0;
    const prev7StressAvg =
      prev7Stress.length > 0
        ? prev7Stress.reduce((sum, d) => sum + (d.stressLevel || 0), 0) / prev7Stress.length
        : 0;

    let stressTrend: "improving" | "stable" | "worsening" = "stable";
    if (prev7StressAvg > 0) {
      const change = ((last7StressAvg - prev7StressAvg) / prev7StressAvg) * 100;
      // Lower stress is better, so negative change is improving
      if (change < -5) stressTrend = "improving";
      else if (change > 5) stressTrend = "worsening";
    }

    const last7Soreness = last7Days.filter((d) => d.sorenessLevel != null);
    const prev7Soreness = previous7Days.filter((d) => d.sorenessLevel != null);
    const last7SorenessAvg =
      last7Soreness.length > 0
        ? last7Soreness.reduce((sum, d) => sum + (d.sorenessLevel || 0), 0) / last7Soreness.length
        : 0;
    const prev7SorenessAvg =
      prev7Soreness.length > 0
        ? prev7Soreness.reduce((sum, d) => sum + (d.sorenessLevel || 0), 0) / prev7Soreness.length
        : 0;

    let sorenessTrend: "improving" | "stable" | "worsening" = "stable";
    if (prev7SorenessAvg > 0) {
      const change = ((last7SorenessAvg - prev7SorenessAvg) / prev7SorenessAvg) * 100;
      // Lower soreness is better
      if (change < -5) sorenessTrend = "improving";
      else if (change > 5) sorenessTrend = "worsening";
    }

    return {
      dailyData,
      averages,
      trends: {
        sleep: sleepTrend,
        stress: stressTrend,
        soreness: sorenessTrend,
      },
    };
  } catch (error) {
    console.error("Error loading wellness trends:", error);
    return {
      dailyData: [],
      averages: {
        sleepHours: 0,
        sleepQuality: 0,
        stress: 0,
        soreness: 0,
        steps: 0,
      },
      trends: {
        sleep: "stable",
        stress: "stable",
        soreness: "stable",
      },
    };
  }
}

export interface RecoveryChartWeek {
  weekStart: string;
  volume: number;
  avgSoreness: number | null;
  avgSleep: number | null;
}

/** Same narrative logic as `/client/progress/analytics` recovery block (volume vs soreness, last 4 weeks). */
export function buildRecoveryInsight(
  volumeStats: VolumeStats | null,
  wellnessStats: WellnessStats | null,
): { insightText: string; chartData: RecoveryChartWeek[]; notEnoughData: boolean } {
  const fourWeeksVolume = volumeStats?.weeklyData?.slice(-4) ?? [];
  const dailyWellness = wellnessStats?.dailyData ?? [];
  if (fourWeeksVolume.length < 2) {
    return { insightText: "", chartData: [], notEnoughData: true };
  }

  const getWeekStartStr = (dateStr: string): string => {
    const d = new Date(dateStr + "T12:00:00");
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d.toISOString().split("T")[0];
  };

  const weekWellnessMap = new Map<
    string,
    { sorenessSum: number; sorenessN: number; sleepSum: number; sleepN: number }
  >();
  dailyWellness.forEach((d) => {
    const key = getWeekStartStr(d.date);
    const cur = weekWellnessMap.get(key) ?? {
      sorenessSum: 0,
      sorenessN: 0,
      sleepSum: 0,
      sleepN: 0,
    };
    if (d.sorenessLevel != null) {
      cur.sorenessSum += d.sorenessLevel;
      cur.sorenessN += 1;
    }
    if (d.sleepQuality != null) {
      cur.sleepSum += d.sleepQuality;
      cur.sleepN += 1;
    }
    weekWellnessMap.set(key, cur);
  });

  const chartData: RecoveryChartWeek[] = fourWeeksVolume.map((w) => {
    const ww = weekWellnessMap.get(w.weekStart);
    const avgSoreness =
      ww && ww.sorenessN > 0 ? ww.sorenessSum / ww.sorenessN : null;
    const avgSleep =
      ww && ww.sleepN > 0 ? ww.sleepSum / ww.sleepN : null;
    return {
      weekStart: w.weekStart,
      volume: w.totalVolume,
      avgSoreness,
      avgSleep,
    };
  });

  const week1 = chartData[0];
  const week4 = chartData[chartData.length - 1];
  const vol1 = week1?.volume ?? 0;
  const vol4 = week4?.volume ?? 0;
  const sore1 = week1?.avgSoreness ?? null;
  const sore4 = week4?.avgSoreness ?? null;

  const volChange = vol1 > 0 ? (vol4 - vol1) / vol1 : 0;
  const volumeUp = volChange > 0.05;
  const volumeDown = volChange < -0.05;
  const volumeStable = !volumeUp && !volumeDown;

  const sorenessUp =
    sore1 != null && sore4 != null && sore4 > sore1 + 0.2;
  const sorenessDown =
    sore1 != null && sore4 != null && sore4 < sore1 - 0.2;
  const sorenessStable =
    sore1 == null || sore4 == null || (!sorenessUp && !sorenessDown);

  let insightText: string;
  if (volumeUp && (sorenessDown || sorenessStable))
    insightText =
      "Great recovery adaptation — your body is handling the increased load well";
  else if (volumeUp && sorenessUp)
    insightText =
      "Recovery may need attention — soreness is rising with volume. Consider a deload or extra rest";
  else if (volumeStable && sorenessStable)
    insightText = "Consistent training and recovery — you're in a good rhythm";
  else if (volumeDown) insightText = "Training volume decreased this week";
  else insightText = "Consistent training and recovery — you're in a good rhythm";

  return { insightText, chartData, notEnoughData: false };
}

function calendarMondayYmdLocal(d = new Date()): string {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(d);
  m.setHours(0, 0, 0, 0);
  m.setDate(d.getDate() + diff);
  return m.toISOString().split("T")[0];
}

function dateInInclusiveWeek(dateStr: string, monYmd: string): boolean {
  const mon = new Date(monYmd + "T00:00:00");
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const d = new Date(dateStr + "T12:00:00");
  return d >= mon && d <= sun;
}

/** Hub card + recovery route: insight + this-calendar-week soreness / sleep hours averages when logs exist. */
export async function getRecoveryHubPreview(clientId: string): Promise<{
  insightText: string;
  sorenessAvg: number | null;
  sleepAvgHrs: number | null;
  hasCheckins: boolean;
  chartData: RecoveryChartWeek[];
  notEnoughData: boolean;
}> {
  const [{ data: paRow }, { data: profRow }, wellnessStats] = await Promise.all([
    supabase
      .from("program_assignments")
      .select("timezone_snapshot")
      .eq("client_id", clientId)
      .eq("status", "active")
      .maybeSingle(),
    supabase.from("profiles").select("timezone").eq("id", clientId).maybeSingle(),
    getWellnessTrends(clientId, 60),
  ]);
  const tz = resolveStatsTabTimezone(
    paRow?.timezone_snapshot as string | undefined,
    profRow?.timezone as string | undefined,
  );
  const volumeStats = await getWeeklyVolume(clientId, 26, tz);
  const { insightText, chartData, notEnoughData } = buildRecoveryInsight(
    volumeStats,
    wellnessStats,
  );

  const monYmd = calendarMondayYmdLocal();
  const weekDays = wellnessStats.dailyData.filter((d) =>
    dateInInclusiveWeek(d.date, monYmd),
  );
  const sorenessVals = weekDays
    .map((d) => d.sorenessLevel)
    .filter((v): v is number => v != null);
  const sleepVals = weekDays
    .map((d) => d.sleepHours)
    .filter((v): v is number => v != null);
  const sorenessAvg =
    sorenessVals.length > 0
      ? Math.round((sorenessVals.reduce((a, b) => a + b, 0) / sorenessVals.length) * 10) / 10
      : null;
  const sleepAvgHrs =
    sleepVals.length > 0
      ? Math.round((sleepVals.reduce((a, b) => a + b, 0) / sleepVals.length) * 10) / 10
      : null;
  const hasCheckins = weekDays.length > 0;

  return {
    insightText: notEnoughData ? "" : insightText,
    sorenessAvg,
    sleepAvgHrs,
    hasCheckins,
    chartData,
    notEnoughData,
  };
}

/** Progress dashboard: show recovery section only if any wellness log in last 30 days. */
export async function getRecoveryInsight(clientId: string): Promise<{
  insightText: string;
  sorenessAvg: number | null;
  sleepAvgHrs: number | null;
  hasData: boolean;
}> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const ymd = cutoff.toISOString().split("T")[0];
  const { count, error } = await supabase
    .from("daily_wellness_logs")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .gte("log_date", ymd);
  if (error || !count) {
    return {
      hasData: false,
      insightText: "",
      sorenessAvg: null,
      sleepAvgHrs: null,
    };
  }
  const preview = await getRecoveryHubPreview(clientId);
  const fallback = "Consistent training and recovery — you're in a good rhythm";
  return {
    hasData: true,
    insightText:
      preview.notEnoughData || !preview.insightText
        ? fallback
        : preview.insightText,
    sorenessAvg: preview.sorenessAvg,
    sleepAvgHrs: preview.sleepAvgHrs,
  };
}
