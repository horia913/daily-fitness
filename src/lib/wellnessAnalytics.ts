import { supabase } from "./supabase";
import { dbToUiScale } from "./wellnessService";

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
