"use client";

import React, { useMemo } from "react";
import { ClientGlassCard } from "@/components/client-ui";
import { dbToUiScale } from "@/lib/wellnessService";
import { getWellnessValueColor } from "@/lib/wellnessValueColors";
import type { DailyWellnessLog } from "@/lib/wellnessService";

interface WellnessTrendsCardProps {
  logRange: DailyWellnessLog[];
  weekStart: string;
  weekDays: string[];
  lastWeekStart: string;
  lastWeekDays: string[];
}

function avgSleep(logs: DailyWellnessLog[]): number | null {
  const withSleep = logs.filter((l) => l.sleep_hours != null);
  if (withSleep.length === 0) return null;
  return withSleep.reduce((s, l) => s + (l.sleep_hours ?? 0), 0) / withSleep.length;
}

function avgStress(logs: DailyWellnessLog[]): number | null {
  const withStress = logs.filter((l) => l.stress_level != null);
  if (withStress.length === 0) return null;
  const sum = withStress.reduce((s, l) => s + (dbToUiScale(l.stress_level) ?? 0), 0);
  return sum / withStress.length;
}

function avgSoreness(logs: DailyWellnessLog[]): number | null {
  const withSoreness = logs.filter((l) => l.soreness_level != null);
  if (withSoreness.length === 0) return null;
  const sum = withSoreness.reduce((s, l) => s + (dbToUiScale(l.soreness_level) ?? 0), 0);
  return sum / withSoreness.length;
}

export function WellnessTrendsCard({
  logRange,
  weekStart,
  weekDays,
  lastWeekStart,
  lastWeekDays,
}: WellnessTrendsCardProps) {
  const { periods, hasEnoughData, mode, sleepTrendLabel, stressTrendLabel, sorenessTrendLabel } = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const thisWeekLogs = logRange.filter((l) => weekDays.includes(l.log_date));
    const lastWeekLogs = logRange.filter((l) => lastWeekDays.includes(l.log_date));

    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const thisMonthStartStr = thisMonthStart.toISOString().split("T")[0];
    const thisMonthEndStr = thisMonthEnd.toISOString().split("T")[0];
    const thisMonthLogs = logRange.filter((l) => l.log_date >= thisMonthStartStr && l.log_date <= thisMonthEndStr);

    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const lastMonthStartStr = lastMonthStart.toISOString().split("T")[0];
    const lastMonthEndStr = lastMonthEnd.toISOString().split("T")[0];
    const lastMonthLogs = logRange.filter((l) => l.log_date >= lastMonthStartStr && l.log_date <= lastMonthEndStr);

    const threeMo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const threeMoEnd = new Date(now.getFullYear(), now.getMonth() - 2, 0);
    const threeMoStartStr = threeMo.toISOString().split("T")[0];
    const threeMoEndStr = threeMoEnd.toISOString().split("T")[0];
    const threeMonthsAgoLogs = logRange.filter((l) => l.log_date >= threeMoStartStr && l.log_date <= threeMoEndStr);

    const firstLogDate = logRange.length > 0 ? logRange.reduce((min, l) => (l.log_date < min ? l.log_date : min), logRange[0].log_date) : null;
    const daysOfData = firstLogDate ? Math.floor((new Date(todayStr).getTime() - new Date(firstLogDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const hasWeek = thisWeekLogs.length > 0 || lastWeekLogs.length > 0;
    const hasMonth = thisMonthLogs.length > 0 || lastMonthLogs.length > 0;
    const hasThreeMo = threeMonthsAgoLogs.length > 0;

    let mode: "none" | "week_only" | "month" | "three_month" = "none";
    if (!hasWeek && daysOfData < 7) mode = "none";
    else if (daysOfData < 30 || !hasMonth) mode = "week_only";
    else if (daysOfData < 90 || !hasThreeMo) mode = "month";
    else mode = "three_month";

    const thisWeekSleep = avgSleep(thisWeekLogs);
    const thisWeekStress = avgStress(thisWeekLogs);
    const thisWeekSoreness = avgSoreness(thisWeekLogs);
    const lastWeekSleep = avgSleep(lastWeekLogs);
    const lastWeekStress = avgStress(lastWeekLogs);
    const lastWeekSoreness = avgSoreness(lastWeekLogs);
    const thisMonthSleep = avgSleep(thisMonthLogs);
    const thisMonthStress = avgStress(thisMonthLogs);
    const thisMonthSoreness = avgSoreness(thisMonthLogs);
    const lastMonthSleep = avgSleep(lastMonthLogs);
    const lastMonthStress = avgStress(lastMonthLogs);
    const lastMonthSoreness = avgSoreness(lastMonthLogs);
    const threeMoSleep = avgSleep(threeMonthsAgoLogs);
    const threeMoStress = avgStress(threeMonthsAgoLogs);
    const threeMoSoreness = avgSoreness(threeMonthsAgoLogs);

    const sleepTrend = (recent: number | null, older: number | null): "improving" | "worsening" | "stable" => {
      if (recent == null || older == null || older === 0) return "stable";
      const change = ((recent - older) / older) * 100;
      if (change > 3) return "improving";
      if (change < -3) return "worsening";
      return "stable";
    };
    const stressSorenessTrend = (recent: number | null, older: number | null): "improving" | "worsening" | "stable" => {
      if (recent == null || older == null) return "stable";
      const change = recent - older;
      if (change < -0.2) return "improving";
      if (change > 0.2) return "worsening";
      return "stable";
    };

    const periods = {
      thisWeek: { sleep: thisWeekSleep, stress: thisWeekStress, soreness: thisWeekSoreness },
      lastWeek: { sleep: lastWeekSleep, stress: lastWeekStress, soreness: lastWeekSoreness },
      thisMonth: { sleep: thisMonthSleep, stress: thisMonthStress, soreness: thisMonthSoreness },
      lastMonth: { sleep: lastMonthSleep, stress: lastMonthStress, soreness: lastMonthSoreness },
      threeMonthsAgo: { sleep: threeMoSleep, stress: threeMoStress, soreness: threeMoSoreness },
    };

    let sleepTrendLabel: "improving" | "worsening" | "stable" = "stable";
    let stressTrendLabel: "improving" | "worsening" | "stable" = "stable";
    let sorenessTrendLabel: "improving" | "worsening" | "stable" = "stable";
    if (mode === "three_month" && periods.threeMonthsAgo.sleep != null && periods.thisWeek.sleep != null) {
      sleepTrendLabel = sleepTrend(periods.thisWeek.sleep, periods.threeMonthsAgo.sleep);
      stressTrendLabel = stressSorenessTrend(periods.thisWeek.stress, periods.threeMonthsAgo.stress);
      sorenessTrendLabel = stressSorenessTrend(periods.thisWeek.soreness, periods.threeMonthsAgo.soreness);
    } else if (mode === "month" && (periods.lastMonth.sleep != null || periods.thisMonth.sleep != null)) {
      const recent = periods.thisWeek.sleep ?? periods.thisMonth.sleep;
      const older = periods.lastMonth.sleep ?? periods.thisMonth.sleep;
      sleepTrendLabel = sleepTrend(recent ?? null, older ?? null);
      stressTrendLabel = stressSorenessTrend(periods.thisWeek.stress ?? periods.thisMonth.stress, periods.lastMonth.stress ?? periods.thisMonth.stress);
      sorenessTrendLabel = stressSorenessTrend(periods.thisWeek.soreness ?? periods.thisMonth.soreness, periods.lastMonth.soreness ?? periods.thisMonth.soreness);
    } else if (mode === "week_only") {
      sleepTrendLabel = sleepTrend(periods.thisWeek.sleep, periods.lastWeek.sleep);
      stressTrendLabel = stressSorenessTrend(periods.thisWeek.stress, periods.lastWeek.stress);
      sorenessTrendLabel = stressSorenessTrend(periods.thisWeek.soreness, periods.lastWeek.soreness);
    }

    return {
      periods,
      sleepTrendLabel,
      stressTrendLabel,
      sorenessTrendLabel,
      hasEnoughData: mode !== "none",
      mode,
    };
  }, [logRange, weekStart, weekDays, lastWeekStart, lastWeekDays]);

  if (!hasEnoughData) {
    return (
      <ClientGlassCard className="p-5">
        <h3 className="text-base font-semibold fc-text-primary mb-2">Wellness Trends</h3>
        <p className="text-sm fc-text-dim">Not enough data yet — keep checking in!</p>
      </ClientGlassCard>
    );
  }

  const fmt = (n: number | null) => (n != null ? n.toFixed(1) : "—");
  const trendClass = (t: string) =>
    t === "improving" ? "fc-text-success" : t === "worsening" ? "fc-text-warning" : "fc-text-subtle";
  const valueColor = (
    n: number | null,
    metric: "sleep_hours" | "sleep_quality" | "stress" | "soreness"
  ) => (n != null ? getWellnessValueColor(n, metric) : "fc-text-dim");

  if (mode === "week_only") {
    return (
      <ClientGlassCard className="p-5">
        <h3 className="text-base font-semibold fc-text-primary mb-3">Wellness Trends</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[240px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[color:var(--fc-glass-border)]">
                <th className="text-left py-2 pr-4 fc-text-subtle font-medium"></th>
                <th className="text-right py-2 px-2 fc-text-subtle">Last week</th>
                <th className="text-right py-2 px-2 fc-text-primary font-medium">This week</th>
                <th className="text-right py-2 pl-2 fc-text-subtle"></th>
              </tr>
            </thead>
            <tbody className="fc-text-primary">
              <tr className="border-b border-[color:var(--fc-glass-border)]/50">
                <td className="py-2 pr-4 font-medium">Avg Sleep</td>
                <td className={`text-right py-2 px-2 font-mono ${valueColor(periods.lastWeek.sleep, "sleep_hours")}`}>{fmt(periods.lastWeek.sleep)} hrs</td>
                <td className={`text-right py-2 px-2 font-mono ${valueColor(periods.thisWeek.sleep, "sleep_hours")}`}>{fmt(periods.thisWeek.sleep)} hrs</td>
                <td className={`text-right py-2 pl-2 text-xs ${trendClass(sleepTrendLabel)}`}>{sleepTrendLabel}</td>
              </tr>
              <tr className="border-b border-[color:var(--fc-glass-border)]/50">
                <td className="py-2 pr-4 font-medium">Avg Stress</td>
                <td className={`text-right py-2 px-2 font-mono ${valueColor(periods.lastWeek.stress, "stress")}`}>{fmt(periods.lastWeek.stress)}</td>
                <td className={`text-right py-2 px-2 font-mono ${valueColor(periods.thisWeek.stress, "stress")}`}>{fmt(periods.thisWeek.stress)}</td>
                <td className={`text-right py-2 pl-2 text-xs ${trendClass(stressTrendLabel)}`}>{stressTrendLabel}</td>
              </tr>
              <tr className="border-b border-[color:var(--fc-glass-border)]/50">
                <td className="py-2 pr-4 font-medium">Avg Soreness</td>
                <td className={`text-right py-2 px-2 font-mono ${valueColor(periods.lastWeek.soreness, "soreness")}`}>{fmt(periods.lastWeek.soreness)}</td>
                <td className={`text-right py-2 px-2 font-mono ${valueColor(periods.thisWeek.soreness, "soreness")}`}>{fmt(periods.thisWeek.soreness)}</td>
                <td className={`text-right py-2 pl-2 text-xs ${trendClass(sorenessTrendLabel)}`}>{sorenessTrendLabel}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </ClientGlassCard>
    );
  }

  const cols = mode === "three_month"
    ? [
        { label: "This week", sleep: periods.thisWeek.sleep, stress: periods.thisWeek.stress, soreness: periods.thisWeek.soreness },
        { label: "Last month", sleep: periods.lastMonth.sleep, stress: periods.lastMonth.stress, soreness: periods.lastMonth.soreness },
        { label: "3 months ago", sleep: periods.threeMonthsAgo.sleep, stress: periods.threeMonthsAgo.stress, soreness: periods.threeMonthsAgo.soreness },
      ]
    : [
        { label: "This week", sleep: periods.thisWeek.sleep, stress: periods.thisWeek.stress, soreness: periods.thisWeek.soreness },
        { label: "Last month", sleep: periods.lastMonth.sleep, stress: periods.lastMonth.stress, soreness: periods.lastMonth.soreness },
      ];

  return (
    <ClientGlassCard className="p-5">
      <h3 className="text-base font-semibold fc-text-primary mb-3">Wellness Trends</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[color:var(--fc-glass-border)]">
              <th className="text-left py-2 pr-4 fc-text-subtle font-medium"></th>
              {cols.map((c) => (
                <th key={c.label} className="text-right py-2 px-2 fc-text-subtle">{c.label}</th>
              ))}
              <th className="text-right py-2 pl-2 fc-text-subtle"></th>
            </tr>
          </thead>
          <tbody className="fc-text-primary">
            <tr className="border-b border-[color:var(--fc-glass-border)]/50">
              <td className="py-2 pr-4 font-medium">Avg Sleep</td>
              {cols.map((c) => (
                <td key={c.label} className={`text-right py-2 px-2 font-mono ${valueColor(c.sleep, "sleep_hours")}`}>{fmt(c.sleep)} hrs</td>
              ))}
              <td className={`text-right py-2 pl-2 text-xs ${trendClass(sleepTrendLabel)}`}>{sleepTrendLabel}</td>
            </tr>
            <tr className="border-b border-[color:var(--fc-glass-border)]/50">
              <td className="py-2 pr-4 font-medium">Avg Stress</td>
              {cols.map((c) => (
                <td key={c.label} className={`text-right py-2 px-2 font-mono ${valueColor(c.stress, "stress")}`}>{fmt(c.stress)}</td>
              ))}
              <td className={`text-right py-2 pl-2 text-xs ${trendClass(stressTrendLabel)}`}>{stressTrendLabel}</td>
            </tr>
            <tr className="border-b border-[color:var(--fc-glass-border)]/50">
              <td className="py-2 pr-4 font-medium">Avg Soreness</td>
              {cols.map((c) => (
                <td key={c.label} className={`text-right py-2 px-2 font-mono ${valueColor(c.soreness, "soreness")}`}>{fmt(c.soreness)}</td>
              ))}
              <td className={`text-right py-2 pl-2 text-xs ${trendClass(sorenessTrendLabel)}`}>{sorenessTrendLabel}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </ClientGlassCard>
  );
}
