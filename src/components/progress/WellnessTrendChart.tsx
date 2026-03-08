"use client";

import { useState, useMemo, useEffect } from "react";
import { type WellnessStats, type WellnessTrend } from "@/lib/wellnessAnalytics";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export type WellnessTimeRange = "14D" | "30D" | "60D";

const TIME_RANGE_OPTIONS: { value: WellnessTimeRange; label: string }[] = [
  { value: "14D", label: "14D" },
  { value: "30D", label: "30D" },
  { value: "60D", label: "60D" },
];

const DAYS_MAP: Record<WellnessTimeRange, number> = {
  "14D": 14,
  "30D": 30,
  "60D": 60,
};

interface WellnessTrendChartProps {
  wellnessStats: WellnessStats;
  defaultTimeRange?: WellnessTimeRange;
  className?: string;
}

export function WellnessTrendChart({
  wellnessStats,
  defaultTimeRange = "30D",
  className,
}: WellnessTrendChartProps) {
  const [timeRange, setTimeRange] = useState<WellnessTimeRange>(defaultTimeRange);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const daysToShow = DAYS_MAP[timeRange];
  const chartData = useMemo(() => {
    return wellnessStats.dailyData.slice(-daysToShow);
  }, [wellnessStats.dailyData, daysToShow]);

  const sleepData = chartData.filter((d) => d.sleepHours != null);
  const stressData = chartData.filter((d) => d.stressLevel != null);
  const sorenessData = chartData.filter((d) => d.sorenessLevel != null);

  const maxSleep = Math.max(...sleepData.map((d) => d.sleepHours || 0), 1);
  const minSleep = Math.min(...sleepData.map((d) => d.sleepHours || 0), 0);
  const maxStress = Math.max(...stressData.map((d) => d.stressLevel || 0), 1);
  const minStress = Math.min(...stressData.map((d) => d.stressLevel || 0), 0);
  const maxSoreness = Math.max(...sorenessData.map((d) => d.sorenessLevel || 0), 1);
  const minSoreness = Math.min(...sorenessData.map((d) => d.sorenessLevel || 0), 0);

  const getSleepColor = (hours: number | null): string => {
    if (hours == null) return "rgb(156, 163, 175)"; // gray
    if (hours >= 7) return "rgb(34, 197, 94)"; // green
    if (hours >= 6) return "rgb(234, 179, 8)"; // yellow
    return "rgb(239, 68, 68)"; // red
  };

  const getStressSorenessColor = (level: number | null): string => {
    if (level == null) return "rgb(156, 163, 175)"; // gray
    if (level <= 2) return "rgb(34, 197, 94)"; // green (good)
    if (level <= 3) return "rgb(234, 179, 8)"; // yellow
    return "rgb(239, 68, 68)"; // red (bad)
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr + "T12:00:00");
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const sleepTrendIcon =
    wellnessStats.trends.sleep === "improving" ? (
      <TrendingUp className="w-3 h-3 text-[color:var(--fc-status-success)]" />
    ) : wellnessStats.trends.sleep === "declining" ? (
      <TrendingDown className="w-3 h-3 text-[color:var(--fc-status-error)]" />
    ) : (
      <Minus className="w-3 h-3 text-[color:var(--fc-text-dim)]" />
    );

  const stressTrendIcon =
    wellnessStats.trends.stress === "improving" ? (
      <TrendingUp className="w-3 h-3 text-[color:var(--fc-status-success)]" />
    ) : wellnessStats.trends.stress === "worsening" ? (
      <TrendingDown className="w-3 h-3 text-[color:var(--fc-status-error)]" />
    ) : (
      <Minus className="w-3 h-3 text-[color:var(--fc-text-dim)]" />
    );

  const sorenessTrendIcon =
    wellnessStats.trends.soreness === "improving" ? (
      <TrendingUp className="w-3 h-3 text-[color:var(--fc-status-success)]" />
    ) : wellnessStats.trends.soreness === "worsening" ? (
      <TrendingDown className="w-3 h-3 text-[color:var(--fc-status-error)]" />
    ) : (
      <Minus className="w-3 h-3 text-[color:var(--fc-text-dim)]" />
    );

  const chartHeight = 80;
  const chartWidth = 1000;
  const padding = { top: 8, right: 12, bottom: 24, left: 50 };
  const chartAreaWidth = chartWidth - padding.left - padding.right;
  const chartAreaHeight = chartHeight - padding.top - padding.bottom;

  return (
    <div className={cn("fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6", className)}>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-[0_10px_20px_rgba(16,185,129,0.25)]">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[color:var(--fc-text-primary)]">
              Recovery & Wellness
            </h2>
            <p className="text-sm text-[color:var(--fc-text-dim)]">
              Sleep, stress, and soreness trends
            </p>
          </div>
        </div>
        <div className="flex bg-[color:var(--fc-glass-highlight)] p-1 rounded-xl border border-[color:var(--fc-glass-border)]">
          {TIME_RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTimeRange(option.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                timeRange === option.value
                  ? "fc-surface fc-text-primary shadow-sm"
                  : "text-[color:var(--fc-text-dim)] hover:text-[color:var(--fc-text-primary)]"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-[color:var(--fc-text-dim)]">
            Complete your daily check-ins to see recovery trends
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Sleep Chart */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[color:var(--fc-text-primary)]">
                  Sleep Hours
                </span>
                <span className="text-xs text-[color:var(--fc-text-dim)]">
                  (Avg: {wellnessStats.averages.sleepHours.toFixed(1)}h)
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                {sleepTrendIcon}
                <span className="text-[color:var(--fc-text-dim)] capitalize">
                  {wellnessStats.trends.sleep}
                </span>
              </div>
            </div>
            <div className="relative overflow-x-auto">
              <svg width={chartWidth} height={chartHeight} className="w-full" style={{ minWidth: `${chartWidth}px` }}>
                {/* Grid lines */}
                {[0, 0.5, 1].map((ratio) => {
                  const y = padding.top + chartAreaHeight * (1 - ratio);
                  return (
                    <line
                      key={ratio}
                      x1={padding.left}
                      y1={y}
                      x2={chartWidth - padding.right}
                      y2={y}
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeOpacity="0.1"
                      className="text-[color:var(--fc-text-dim)]"
                    />
                  );
                })}
                {/* Y-axis labels */}
                {[0, 0.5, 1].map((ratio) => {
                  const value = minSleep + (maxSleep - minSleep) * ratio;
                  const y = padding.top + chartAreaHeight * (1 - ratio);
                  return (
                    <text
                      key={ratio}
                      x={padding.left - 8}
                      y={y + 4}
                      textAnchor="end"
                      className="text-xs fill-[color:var(--fc-text-dim)]"
                    >
                      {value.toFixed(1)}h
                    </text>
                  );
                })}
                {/* Bars */}
                {chartData.map((day, i) => {
                  if (day.sleepHours == null) return null;
                  const barWidth = chartAreaWidth / chartData.length - 2;
                  const x = padding.left + (i / chartData.length) * chartAreaWidth + 1;
                  const barHeight = ((day.sleepHours - minSleep) / (maxSleep - minSleep || 1)) * chartAreaHeight;
                  const y = padding.top + chartAreaHeight - barHeight;
                  return (
                    <rect
                      key={day.date}
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(barHeight, 2)}
                      fill={getSleepColor(day.sleepHours)}
                      rx="2"
                      className={cn(
                        "transition-all duration-300",
                        mounted && "animate-[fadeInUp_0.6s_ease-out]"
                      )}
                      style={{
                        animationDelay: `${i * 0.02}s`,
                      }}
                    />
                  );
                })}
                {/* X-axis labels (every 5th day) */}
                {chartData.map((day, i) => {
                  if (i % 5 !== 0 && i !== chartData.length - 1) return null;
                  const x = padding.left + (i / chartData.length) * chartAreaWidth + chartAreaWidth / chartData.length / 2;
                  return (
                    <text
                      key={day.date}
                      x={x}
                      y={chartHeight - padding.bottom + 14}
                      textAnchor="middle"
                      className="text-xs fill-[color:var(--fc-text-dim)]"
                    >
                      {formatDate(day.date)}
                    </text>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Stress Chart */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[color:var(--fc-text-primary)]">
                  Stress Level
                </span>
                <span className="text-xs text-[color:var(--fc-text-dim)]">
                  (Avg: {wellnessStats.averages.stress.toFixed(1)}/5)
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                {stressTrendIcon}
                <span className="text-[color:var(--fc-text-dim)] capitalize">
                  {wellnessStats.trends.stress}
                </span>
              </div>
            </div>
            <div className="relative overflow-x-auto">
              <svg width={chartWidth} height={chartHeight} className="w-full" style={{ minWidth: `${chartWidth}px` }}>
                {/* Grid lines */}
                {[0, 0.5, 1].map((ratio) => {
                  const y = padding.top + chartAreaHeight * (1 - ratio);
                  return (
                    <line
                      key={ratio}
                      x1={padding.left}
                      y1={y}
                      x2={chartWidth - padding.right}
                      y2={y}
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeOpacity="0.1"
                      className="text-[color:var(--fc-text-dim)]"
                    />
                  );
                })}
                {/* Y-axis labels (inverted: 5 at top, 1 at bottom) */}
                {[0, 0.5, 1].map((ratio) => {
                  const value = maxStress - (maxStress - minStress) * ratio; // Inverted
                  const y = padding.top + chartAreaHeight * ratio;
                  return (
                    <text
                      key={ratio}
                      x={padding.left - 8}
                      y={y + 4}
                      textAnchor="end"
                      className="text-xs fill-[color:var(--fc-text-dim)]"
                    >
                      {value.toFixed(1)}
                    </text>
                  );
                })}
                {/* Line */}
                {stressData.length >= 2 && (
                  <polyline
                    points={stressData
                      .map((day, i) => {
                        const globalIndex = chartData.findIndex((d) => d.date === day.date);
                        const x = padding.left + (globalIndex / chartData.length) * chartAreaWidth + chartAreaWidth / chartData.length / 2;
                        // Inverted: higher stress = lower on chart
                        const y = padding.top + chartAreaHeight - ((day.stressLevel! - minStress) / (maxStress - minStress || 1)) * chartAreaHeight;
                        return `${x},${y}`;
                      })
                      .join(" ")}
                    fill="none"
                    stroke="rgb(239, 68, 68)"
                    strokeWidth="2"
                    className={cn(
                      "transition-all duration-500",
                      mounted && "animate-[fadeIn_0.8s_ease-out]"
                    )}
                  />
                )}
                {/* Data points */}
                {stressData.map((day, i) => {
                  const globalIndex = chartData.findIndex((d) => d.date === day.date);
                  const x = padding.left + (globalIndex / chartData.length) * chartAreaWidth + chartAreaWidth / chartData.length / 2;
                  const y = padding.top + chartAreaHeight - ((day.stressLevel! - minStress) / (maxStress - minStress || 1)) * chartAreaHeight;
                  return (
                    <circle
                      key={day.date}
                      cx={x}
                      cy={y}
                      r="4"
                      fill={getStressSorenessColor(day.stressLevel)}
                      stroke="white"
                      strokeWidth="2"
                      className={cn(
                        "transition-all duration-300",
                        mounted && "animate-[fadeIn_0.8s_ease-out]"
                      )}
                      style={{
                        animationDelay: `${i * 0.02}s`,
                      }}
                    />
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Soreness Chart */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[color:var(--fc-text-primary)]">
                  Soreness Level
                </span>
                <span className="text-xs text-[color:var(--fc-text-dim)]">
                  (Avg: {wellnessStats.averages.soreness.toFixed(1)}/5)
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                {sorenessTrendIcon}
                <span className="text-[color:var(--fc-text-dim)] capitalize">
                  {wellnessStats.trends.soreness}
                </span>
              </div>
            </div>
            <div className="relative overflow-x-auto">
              <svg width={chartWidth} height={chartHeight} className="w-full" style={{ minWidth: `${chartWidth}px` }}>
                {/* Grid lines */}
                {[0, 0.5, 1].map((ratio) => {
                  const y = padding.top + chartAreaHeight * (1 - ratio);
                  return (
                    <line
                      key={ratio}
                      x1={padding.left}
                      y1={y}
                      x2={chartWidth - padding.right}
                      y2={y}
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeOpacity="0.1"
                      className="text-[color:var(--fc-text-dim)]"
                    />
                  );
                })}
                {/* Y-axis labels (inverted) */}
                {[0, 0.5, 1].map((ratio) => {
                  const value = maxSoreness - (maxSoreness - minSoreness) * ratio;
                  const y = padding.top + chartAreaHeight * ratio;
                  return (
                    <text
                      key={ratio}
                      x={padding.left - 8}
                      y={y + 4}
                      textAnchor="end"
                      className="text-xs fill-[color:var(--fc-text-dim)]"
                    >
                      {value.toFixed(1)}
                    </text>
                  );
                })}
                {/* Line */}
                {sorenessData.length >= 2 && (
                  <polyline
                    points={sorenessData
                      .map((day, i) => {
                        const globalIndex = chartData.findIndex((d) => d.date === day.date);
                        const x = padding.left + (globalIndex / chartData.length) * chartAreaWidth + chartAreaWidth / chartData.length / 2;
                        const y = padding.top + chartAreaHeight - ((day.sorenessLevel! - minSoreness) / (maxSoreness - minSoreness || 1)) * chartAreaHeight;
                        return `${x},${y}`;
                      })
                      .join(" ")}
                    fill="none"
                    stroke="rgb(249, 115, 22)"
                    strokeWidth="2"
                    className={cn(
                      "transition-all duration-500",
                      mounted && "animate-[fadeIn_0.8s_ease-out]"
                    )}
                  />
                )}
                {/* Data points */}
                {sorenessData.map((day, i) => {
                  const globalIndex = chartData.findIndex((d) => d.date === day.date);
                  const x = padding.left + (globalIndex / chartData.length) * chartAreaWidth + chartAreaWidth / chartData.length / 2;
                  const y = padding.top + chartAreaHeight - ((day.sorenessLevel! - minSoreness) / (maxSoreness - minSoreness || 1)) * chartAreaHeight;
                  return (
                    <circle
                      key={day.date}
                      cx={x}
                      cy={y}
                      r="4"
                      fill={getStressSorenessColor(day.sorenessLevel)}
                      stroke="white"
                      strokeWidth="2"
                      className={cn(
                        "transition-all duration-300",
                        mounted && "animate-[fadeIn_0.8s_ease-out]"
                      )}
                      style={{
                        animationDelay: `${i * 0.02}s`,
                      }}
                    />
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Averages summary */}
          <div className="mt-4 rounded-xl bg-[color:var(--fc-glass-highlight)] p-4 border border-[color:var(--fc-glass-border)]">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="text-[color:var(--fc-text-dim)]">
                Avg sleep: <strong className="text-[color:var(--fc-text-primary)]">{wellnessStats.averages.sleepHours.toFixed(1)}h</strong>
              </span>
              <span className="text-[color:var(--fc-text-dim)]">
                Avg stress: <strong className="text-[color:var(--fc-text-primary)]">{wellnessStats.averages.stress.toFixed(1)}/5</strong>
              </span>
              <span className="text-[color:var(--fc-text-dim)]">
                Avg soreness: <strong className="text-[color:var(--fc-text-primary)]">{wellnessStats.averages.soreness.toFixed(1)}/5</strong>
              </span>
              {wellnessStats.averages.steps > 0 && (
                <span className="text-[color:var(--fc-text-dim)]">
                  Avg steps: <strong className="text-[color:var(--fc-text-primary)]">{wellnessStats.averages.steps.toLocaleString()}</strong>
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
