"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  type ExerciseProgression,
  type ExerciseProgressionDataPoint,
  filterProgressionByTimeRange,
  type StrengthTimeRange,
} from "@/lib/strengthAnalytics";
import { TrendingUp, Minus, TrendingDown, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const TIME_RANGE_OPTIONS: { value: StrengthTimeRange; label: string }[] = [
  { value: "1M", label: "1M" },
  { value: "3M", label: "3M" },
  { value: "6M", label: "6M" },
  { value: "1Y", label: "1Y" },
  { value: "ALL", label: "ALL" },
];

interface ExerciseProgressionChartProps {
  progression: ExerciseProgression;
  /** Compact mode for top-3 hero cards (smaller chart, less padding) */
  compact?: boolean;
  /** Default time range */
  defaultTimeRange?: StrengthTimeRange;
  className?: string;
}

export function ExerciseProgressionChart({
  progression,
  compact = false,
  defaultTimeRange = "3M",
  className,
}: ExerciseProgressionChartProps) {
  const [timeRange, setTimeRange] = useState<StrengthTimeRange>(defaultTimeRange);
  const [hoveredPoint, setHoveredPoint] = useState<ExerciseProgressionDataPoint | null>(null);
  const [mounted, setMounted] = useState(false);
  const [lineLength, setLineLength] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);

  const chartData = useMemo(
    () => filterProgressionByTimeRange(progression.dataPoints, timeRange),
    [progression.dataPoints, timeRange]
  );

  useEffect(() => setMounted(true), []);

  const trendIcon =
    progression.trend === "up" ? (
      <TrendingUp className="w-4 h-4 text-[color:var(--fc-status-success)]" />
    ) : progression.trend === "down" ? (
      <TrendingDown className="w-4 h-4 text-[color:var(--fc-status-error)]" />
    ) : (
      <Minus className="w-4 h-4 text-[color:var(--fc-text-dim)]" />
    );

  const progressLabel =
    progression.progressPercent > 0
      ? `+${progression.progressPercent}% since first session`
      : progression.progressPercent < 0
        ? `${progression.progressPercent}% since first session`
        : "No change yet";

  const allTimeBestDate =
    progression.dataPoints.length > 0
      ? progression.dataPoints.find(
          (p) => p.maxWeight === progression.allTimeMax && p.maxReps === progression.allTimeMaxReps
        )?.date ?? progression.dataPoints[progression.dataPoints.length - 1]?.date
      : null;
  const allTimeBestFormatted = allTimeBestDate
    ? new Date(allTimeBestDate + "T12:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const padding = { top: 12, right: 12, bottom: 28, left: 40 };
  const width = 320;
  const height = compact ? 140 : 200;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const values = chartData.map((p) => p.estimatedOneRM);
  const minVal = Math.min(...values, 0);
  const maxVal = Math.max(...values, 1);
  const range = maxVal - minVal || 1;

  const pathPoints = chartData
    .map((p, i) => {
      const x = padding.left + (chartData.length <= 1 ? 0 : (i / (chartData.length - 1)) * chartWidth);
      const y = padding.top + chartHeight - ((p.estimatedOneRM - minVal) / range) * chartHeight;
      return `${x},${y}`;
    })
    .join(" ");

  const areaPath =
    chartData.length >= 2
      ? (() => {
          const pts = chartData
            .map((p, i) => {
              const x = padding.left + (i / (chartData.length - 1)) * chartWidth;
              const y = padding.top + chartHeight - ((p.estimatedOneRM - minVal) / range) * chartHeight;
              return `${x},${y}`;
            })
            .join(" L ");
          const bottom = padding.top + chartHeight;
          const left = padding.left;
          const right = padding.left + chartWidth;
          return `M ${pts} L ${right},${bottom} L ${left},${bottom} Z`;
        })()
      : "";

  const showChart = chartData.length >= 2;

  useEffect(() => {
    if (!mounted || !showChart) return;
    const t = setTimeout(() => {
      if (!svgRef.current) return;
      const pathEl = svgRef.current.querySelector(".progression-line") as SVGPolylineElement | null;
      if (pathEl) setLineLength(pathEl.getTotalLength());
    }, 50);
    return () => clearTimeout(t);
  }, [mounted, chartData.length, showChart]);

  return (
    <div
      className={cn(
        "fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] overflow-hidden",
        compact ? "p-4" : "p-6",
        className
      )}
    >
      <div className={cn("flex items-start justify-between gap-2", compact ? "mb-3" : "mb-4")}>
        <div className="flex items-center gap-2 min-w-0">
          <h3 className={cn("font-bold text-[color:var(--fc-text-primary)] truncate", compact ? "text-base" : "text-lg")}>
            {progression.exerciseName}
          </h3>
          {trendIcon}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {TIME_RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTimeRange(opt.value)}
              className={cn(
                "px-2 py-1 rounded-lg text-xs font-medium transition-colors",
                timeRange === opt.value
                  ? "bg-[color:var(--fc-domain-workouts)]/20 text-[color:var(--fc-domain-workouts)]"
                  : "text-[color:var(--fc-text-dim)] hover:text-[color:var(--fc-text-primary)]"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className={cn("flex flex-wrap items-end gap-4", compact ? "mb-3" : "mb-4")}>
        <div>
          <p className="text-xs text-[color:var(--fc-text-dim)] uppercase tracking-wider">Est. 1RM</p>
          <p className={cn("font-bold text-[color:var(--fc-text-primary)]", compact ? "text-2xl" : "text-3xl")}>
            {progression.currentOneRM > 0 ? `${Math.round(progression.currentOneRM * 10) / 10} kg` : "—"}
          </p>
        </div>
        <div
          className={cn(
            "rounded-full px-3 py-1 text-sm font-medium",
            progression.progressPercent > 0 && "bg-[color:var(--fc-status-success)]/15 text-[color:var(--fc-status-success)]",
            progression.progressPercent < 0 && "bg-[color:var(--fc-status-error)]/15 text-[color:var(--fc-status-error)]",
            progression.progressPercent === 0 && "bg-[color:var(--fc-glass-highlight)] text-[color:var(--fc-text-dim)]"
          )}
        >
          {progressLabel}
        </div>
      </div>

      {showChart ? (
        <div className="relative">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            className="w-full max-w-full"
            style={{ height: compact ? 140 : 200, minHeight: 140 }}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id={`area-fill-${progression.exerciseId}`} x1="0" x2="0" y1="1" y2="0">
                <stop offset="0%" stopColor="var(--fc-domain-workouts)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--fc-domain-workouts)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Grid lines */}
            {[0.25, 0.5, 0.75].map((ratio) => (
              <line
                key={ratio}
                x1={padding.left}
                y1={padding.top + chartHeight * (1 - ratio)}
                x2={padding.left + chartWidth}
                y2={padding.top + chartHeight * (1 - ratio)}
                stroke="var(--fc-glass-border)"
                strokeWidth="0.5"
              />
            ))}
            {/* Area fill */}
            {areaPath && (
              <path
                d={areaPath}
                fill={`url(#area-fill-${progression.exerciseId})`}
                className="transition-opacity duration-300"
                style={{
                  opacity: mounted ? 1 : 0,
                }}
              />
            )}
            {/* Line */}
            {chartData.length >= 2 && (
              <polyline
                className="progression-line"
                fill="none"
                stroke="var(--fc-domain-workouts)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={pathPoints}
                style={{
                  strokeDasharray: lineLength,
                  strokeDashoffset: mounted ? 0 : lineLength,
                  transition: "stroke-dashoffset 500ms ease-out",
                }}
              />
            )}
            {/* Data points */}
            {chartData.map((point, i) => {
              const x = padding.left + (chartData.length <= 1 ? 0 : (i / (chartData.length - 1)) * chartWidth);
              const y = padding.top + chartHeight - ((point.estimatedOneRM - minVal) / range) * chartHeight;
              const isHovered = hoveredPoint === point;
              const isAllTimeMax =
                point.maxWeight === progression.allTimeMax && point.maxReps === progression.allTimeMaxReps;
              return (
                <g key={point.date}>
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? 6 : 4}
                    fill="var(--fc-domain-workouts)"
                    stroke="var(--fc-bg-base)"
                    strokeWidth="2"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredPoint(point)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    onClick={() => setHoveredPoint(point)}
                  />
                  {isAllTimeMax && (
                    <circle cx={x} cy={y} r="10" fill="none" stroke="var(--fc-status-warning)" strokeWidth="1.5" />
                  )}
                </g>
              );
            })}
          </svg>

          {hoveredPoint && (
            <div
              className="absolute bottom-0 left-0 right-0 fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-xl p-3 text-sm"
              style={{ zIndex: 10 }}
            >
              <p className="font-semibold text-[color:var(--fc-text-primary)]">
                {new Date(hoveredPoint.date + "T12:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <p className="text-[color:var(--fc-text-dim)]">
                {hoveredPoint.bestSetDisplay} → Est. 1RM: {Math.round(hoveredPoint.estimatedOneRM * 10) / 10} kg
              </p>
            </div>
          )}

          <div className="flex justify-between mt-1 text-xs text-[color:var(--fc-text-dim)] px-1">
            {chartData.length > 0 && (
              <>
                <span>
                  {new Date(chartData[0].date + "T12:00:00").toLocaleDateString("en", { month: "short", day: "numeric" })}
                </span>
                <span>
                  {new Date(chartData[chartData.length - 1].date + "T12:00:00").toLocaleDateString("en", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="py-8 text-center text-sm text-[color:var(--fc-text-dim)]">
          Need at least 2 sessions to show progression chart.
        </div>
      )}

      {progression.allTimeMax > 0 && (
        <div className={cn("flex items-center gap-2 mt-3 pt-3 border-t border-[color:var(--fc-glass-border)]", compact && "mt-2 pt-2")}>
          <Star className="w-4 h-4 text-[color:var(--fc-status-warning)] flex-shrink-0" />
          <span className="text-sm text-[color:var(--fc-text-dim)]">
            All-time best: {progression.allTimeMax} kg × {progression.allTimeMaxReps}
            {allTimeBestFormatted && ` (${allTimeBestFormatted})`}
          </span>
        </div>
      )}
    </div>
  );
}
