"use client";

import { useState, useMemo, useEffect } from "react";
import { type VolumeStats, type WeeklyVolume } from "@/lib/volumeAnalytics";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export type VolumeTimeRange = "8W" | "12W" | "6M";

const TIME_RANGE_OPTIONS: { value: VolumeTimeRange; label: string }[] = [
  { value: "8W", label: "8W" },
  { value: "12W", label: "12W" },
  { value: "6M", label: "6M" },
];

const WEEKS_MAP: Record<VolumeTimeRange, number> = {
  "8W": 8,
  "12W": 12,
  "6M": 26, // ~6 months
};

interface VolumeTrendChartProps {
  volumeStats: VolumeStats;
  defaultTimeRange?: VolumeTimeRange;
  className?: string;
}

export function VolumeTrendChart({
  volumeStats,
  defaultTimeRange = "12W",
  className,
}: VolumeTrendChartProps) {
  const [timeRange, setTimeRange] = useState<VolumeTimeRange>(defaultTimeRange);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const weeksToShow = WEEKS_MAP[timeRange];
  const chartData = useMemo(() => {
    return volumeStats.weeklyData.slice(-weeksToShow);
  }, [volumeStats.weeklyData, weeksToShow]);

  const maxVolume = Math.max(...chartData.map((w) => w.totalVolume), 1);
  const minVolume = Math.min(...chartData.map((w) => w.totalVolume), 0);

  const trendIcon =
    volumeStats.trend === "increasing" ? (
      <TrendingUp className="w-4 h-4 text-[color:var(--fc-status-success)]" />
    ) : volumeStats.trend === "decreasing" ? (
      <TrendingDown className="w-4 h-4 text-[color:var(--fc-status-error)]" />
    ) : (
      <Minus className="w-4 h-4 text-[color:var(--fc-text-dim)]" />
    );

  const weekOverWeekChange = volumeStats.weekOverWeekChange;
  const changeLabel =
    weekOverWeekChange > 0
      ? `+${weekOverWeekChange.toFixed(1)}%`
      : weekOverWeekChange < 0
        ? `${weekOverWeekChange.toFixed(1)}%`
        : "No change";

  const formatVolume = (volume: number): string => {
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}k`;
    }
    return Math.round(volume).toString();
  };

  const formatWeekLabel = (weekStart: string): string => {
    const date = new Date(weekStart + "T12:00:00");
    const month = date.toLocaleDateString("en-US", { month: "short" });
    const day = date.getDate();
    return `${month} ${day}`;
  };

  const padding = { top: 12, right: 12, bottom: 32, left: 50 };
  const width = 1000;
  const height = 280;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const currentWeekIndex = chartData.length - 1;

  return (
    <div className={cn("fc-card-shell p-6", className)}>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-[0_10px_20px_rgba(139,92,246,0.25)]">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[color:var(--fc-text-primary)]">
              Training Volume
            </h2>
            <p className="text-sm text-[color:var(--fc-text-dim)]">
              Weekly total volume (weight × reps)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="flex items-center gap-2 text-2xl font-bold text-[color:var(--fc-text-primary)]">
              {formatVolume(volumeStats.currentWeekVolume)}
              <span className="text-sm font-normal text-[color:var(--fc-text-dim)]">kg</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              {trendIcon}
              <span
                className={cn(
                  "font-medium",
                  weekOverWeekChange > 0 && "text-[color:var(--fc-status-success)]",
                  weekOverWeekChange < 0 && "text-[color:var(--fc-status-error)]",
                  weekOverWeekChange === 0 && "text-[color:var(--fc-text-dim)]"
                )}
              >
                {changeLabel} vs last week
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Time range selector */}
      <div className="mb-4 flex justify-end">
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
            No volume data available for this period
          </p>
        </div>
      ) : (
        <>
          {/* SVG Chart */}
          <div className="relative overflow-x-auto">
            <svg
              width={width}
              height={height}
              className="w-full"
              style={{ minWidth: `${width}px` }}
            >
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = padding.top + chartHeight * (1 - ratio);
                return (
                  <line
                    key={ratio}
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeOpacity="0.1"
                    className="text-[color:var(--fc-text-dim)]"
                  />
                );
              })}

              {/* Y-axis labels */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const value = minVolume + (maxVolume - minVolume) * ratio;
                const y = padding.top + chartHeight * (1 - ratio);
                return (
                  <text
                    key={ratio}
                    x={padding.left - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="text-xs fill-[color:var(--fc-text-dim)]"
                  >
                    {formatVolume(value)}
                  </text>
                );
              })}

              {/* 4-week moving average line */}
              {chartData.length >= 4 && (
                <polyline
                  points={chartData
                    .map((week, i) => {
                      if (i < 3) return null; // Need at least 4 weeks
                      const avg =
                        chartData
                          .slice(i - 3, i + 1)
                          .reduce((sum, w) => sum + w.totalVolume, 0) / 4;
                      const x = padding.left + (i / (chartData.length - 1)) * chartWidth;
                      const y =
                        padding.top +
                        chartHeight -
                        ((avg - minVolume) / (maxVolume - minVolume || 1)) * chartHeight;
                      return `${x},${y}`;
                    })
                    .filter((p): p is string => p !== null)
                    .join(" ")}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  strokeOpacity="0.4"
                  className="text-[color:var(--fc-text-dim)]"
                />
              )}

              {/* Bars */}
              {chartData.map((week, i) => {
                const barWidth = chartWidth / chartData.length - 4;
                const x = padding.left + (i / chartData.length) * chartWidth + 2;
                const barHeight = ((week.totalVolume - minVolume) / (maxVolume - minVolume || 1)) * chartHeight;
                const y = padding.top + chartHeight - barHeight;
                const isCurrentWeek = i === currentWeekIndex;

                return (
                  <g key={week.weekStart}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(barHeight, 2)}
                      fill={
                        isCurrentWeek
                          ? "url(#volumeGradientCurrent)"
                          : "url(#volumeGradient)"
                      }
                      rx="4"
                      className={cn(
                        "transition-all duration-300",
                        mounted && "animate-[fadeInUp_0.6s_ease-out]"
                      )}
                      style={{
                        animationDelay: `${i * 0.05}s`,
                      }}
                    />
                    {isCurrentWeek && (
                      <rect
                        x={x - 2}
                        y={y - 2}
                        width={barWidth + 4}
                        height={barHeight + 4}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeOpacity="0.3"
                        rx="6"
                        className="text-[color:var(--fc-accent-purple)]"
                      />
                    )}
                  </g>
                );
              })}

              {/* Gradient definitions */}
              <defs>
                <linearGradient id="volumeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgb(139, 92, 246)" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0.6" />
                </linearGradient>
                <linearGradient id="volumeGradientCurrent" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgb(168, 85, 247)" stopOpacity="1" />
                  <stop offset="100%" stopColor="rgb(139, 92, 246)" stopOpacity="0.9" />
                </linearGradient>
              </defs>

              {/* X-axis labels */}
              {chartData.map((week, i) => {
                // Show every 2nd week label to avoid crowding
                if (i % 2 !== 0 && i !== chartData.length - 1) return null;
                const x = padding.left + (i / chartData.length) * chartWidth + chartWidth / chartData.length / 2;
                return (
                  <text
                    key={week.weekStart}
                    x={x}
                    y={height - padding.bottom + 16}
                    textAnchor="middle"
                    className="text-xs fill-[color:var(--fc-text-dim)]"
                  >
                    {formatWeekLabel(week.weekStart)}
                  </text>
                );
              })}
            </svg>
          </div>

          {/* Stats below chart */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[color:var(--fc-text-dim)]">
            <span>
              Workouts this week: <strong className="text-[color:var(--fc-text-primary)]">{chartData[currentWeekIndex]?.workoutCount || 0}</strong>
            </span>
            <span>
              Sets: <strong className="text-[color:var(--fc-text-primary)]">{chartData[currentWeekIndex]?.totalSets || 0}</strong>
            </span>
            <span>
              Avg volume/workout: <strong className="text-[color:var(--fc-text-primary)]">{formatVolume(chartData[currentWeekIndex]?.avgVolumePerWorkout || 0)} kg</strong>
            </span>
            {chartData.length >= 4 && (
              <span>
                4-week avg: <strong className="text-[color:var(--fc-text-primary)]">{formatVolume(volumeStats.fourWeekAvg)} kg</strong>
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
