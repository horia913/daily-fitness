"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { Trophy, ChevronDown } from "lucide-react";
import {
  formatPersonalRecordCaption,
  prProgressOverTimeSubtitle,
} from "@/lib/personalRecordDisplay";

export type PRTimelineTimeRange = "3M" | "6M" | "1Y" | "ALL";

const TIME_RANGE_DAYS: Record<PRTimelineTimeRange, number> = {
  "3M": 90,
  "6M": 180,
  "1Y": 365,
  ALL: 9999,
};

const TIME_RANGE_OPTIONS: { value: PRTimelineTimeRange; label: string }[] = [
  { value: "3M", label: "3M" },
  { value: "6M", label: "6M" },
  { value: "1Y", label: "1Y" },
  { value: "ALL", label: "ALL" },
];

export interface PRMilestone {
  date: string;
  /** Y-axis value (weight, time, distance, reps, score, etc.) */
  value: number;
}

interface PRTimelineChartProps {
  milestones: PRMilestone[];
  exerciseName: string;
  /** personal_records.record_type — drives axis label and title */
  recordType?: string;
  /** record_unit from the series (e.g. kg, s, m) */
  valueUnit?: string | null;
  defaultTimeRange?: PRTimelineTimeRange;
  defaultExpanded?: boolean;
  className?: string;
}

export function filterMilestonesByTimeRange(
  milestones: PRMilestone[],
  timeRange: PRTimelineTimeRange
): PRMilestone[] {
  const days = TIME_RANGE_DAYS[timeRange];
  if (days >= 9999) return milestones;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  return milestones.filter((m) => m.date >= cutoffStr);
}

export function PRTimelineChart({
  milestones,
  exerciseName,
  recordType = "max_strength",
  valueUnit = null,
  defaultTimeRange = "3M",
  defaultExpanded = true,
  className,
}: PRTimelineChartProps) {
  const [timeRange, setTimeRange] = useState<PRTimelineTimeRange>(defaultTimeRange);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [lineLength, setLineLength] = useState(0);
  const [collapsed, setCollapsed] = useState(!defaultExpanded);
  const svgRef = useRef<SVGSVGElement>(null);

  const chartData = useMemo(
    () => filterMilestonesByTimeRange(milestones, timeRange),
    [milestones, timeRange]
  );

  useEffect(() => setMounted(true), []);

  const padding = { top: 12, right: 12, bottom: 28, left: 44 };
  const width = 320;
  const height = 200;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const values = chartData.map((m) => m.value);
  const minVal = Math.min(...values, 0);
  const maxVal = Math.max(...values, 1);
  const range = maxVal - minVal || 1;

  const xForIndex = (i: number, n: number) =>
    padding.left + (n <= 1 ? chartWidth / 2 : (i / (n - 1)) * chartWidth);

  const yForValue = (val: number) =>
    padding.top + chartHeight - ((val - minVal) / range) * chartHeight;

  const pathPoints = chartData
    .map((p, i) => {
      const x = xForIndex(i, chartData.length);
      const y = yForValue(p.value);
      return `${x},${y}`;
    })
    .join(" ");

  const showLine = chartData.length >= 2;
  const showChart = chartData.length >= 1;

  useEffect(() => {
    if (!mounted || !showLine) return;
    const t = setTimeout(() => {
      if (!svgRef.current) return;
      const pathEl = svgRef.current.querySelector(".pr-timeline-line") as SVGPolylineElement | null;
      if (pathEl) setLineLength(pathEl.getTotalLength());
    }, 50);
    return () => clearTimeout(t);
  }, [mounted, chartData.length, showLine]);

  if (milestones.length === 0) {
    return (
      <div
        className={cn(
          "rounded-[18px] border border-[color:var(--fc-hairline)] bg-transparent p-6",
          className,
        )}
      >
        <EmptyState
          icon={Trophy}
          variant="compact"
          title="No records yet"
          description="Complete workouts to start tracking PRs."
        />
      </div>
    );
  }

  const hoveredPoint = hoveredIndex != null ? chartData[hoveredIndex] : null;
  const subtitle = prProgressOverTimeSubtitle(recordType);

  return (
    <div
      className={cn(
        "rounded-[18px] border border-[color:var(--fc-hairline)] bg-transparent overflow-hidden",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between p-4 sm:p-5 text-left min-h-[44px] touch-manipulation"
      >
        <h3 className="font-[family-name:var(--f-display)] text-lg font-bold tracking-tight text-[color:var(--fc-text-primary)]">
          PR Progress
        </h3>
        <ChevronDown
          className={cn(
            "w-5 h-5 text-[color:var(--fc-text-dim)] transition-transform",
            collapsed ? "" : "rotate-180",
          )}
        />
      </button>

      {!collapsed && (
        <div className="px-4 sm:px-5 pb-5 border-t border-[color:var(--fc-hairline)]">
          <div className="mb-3">
            <p className="font-[family-name:var(--f-mono)] text-xs text-[color:var(--fc-text-dim)]">
              {exerciseName} — {subtitle}
            </p>
          </div>

          <div className="flex gap-1 flex-shrink-0 mb-4">
            {TIME_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTimeRange(opt.value)}
                className={cn(
                  "min-h-[44px] min-w-[44px] px-3 py-2 rounded-lg font-[family-name:var(--f-mono)] text-xs font-medium transition-colors",
                  timeRange === opt.value
                    ? "bg-[color:var(--fc-group-a)]/20 text-[color:var(--fc-group-a)]"
                    : "text-[color:var(--fc-text-dim)] hover:text-[color:var(--fc-text-primary)]",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {showChart ? (
            <div className="relative">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${width} ${height}`}
                className="w-full max-w-full"
                style={{ height: 200, minHeight: 200 }}
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <linearGradient
                    id="pr-timeline-area-fill"
                    x1="0"
                    x2="0"
                    y1="1"
                    y2="0"
                  >
                    <stop
                      offset="0%"
                      stopColor="var(--fc-status-success)"
                      stopOpacity="0.2"
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--fc-status-success)"
                      stopOpacity="0"
                    />
                  </linearGradient>
                  <filter id="pr-dot-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feMerge>
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                {[0.25, 0.5, 0.75].map((ratio) => (
                  <line
                    key={ratio}
                    x1={padding.left}
                    y1={padding.top + chartHeight * (1 - ratio)}
                    x2={padding.left + chartWidth}
                    y2={padding.top + chartHeight * (1 - ratio)}
                    stroke="var(--fc-hairline)"
                    strokeWidth="0.5"
                  />
                ))}
                {showLine &&
                  (() => {
                    const pts = chartData
                      .map((p, i) => {
                        const x = xForIndex(i, chartData.length);
                        const y = yForValue(p.value);
                        return `${x},${y}`;
                      })
                      .join(" L ");
                    const bottom = padding.top + chartHeight;
                    const left = padding.left;
                    const right = padding.left + chartWidth;
                    return (
                      <path
                        d={`M ${pts} L ${right},${bottom} L ${left},${bottom} Z`}
                        fill="url(#pr-timeline-area-fill)"
                        className="transition-opacity duration-300"
                        style={{ opacity: mounted ? 1 : 0 }}
                      />
                    );
                  })()}
                {showLine && (
                  <polyline
                    className="pr-timeline-line"
                    fill="none"
                    stroke="var(--fc-status-success)"
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
                {chartData.map((point, i) => {
                  const x = xForIndex(i, chartData.length);
                  const y = yForValue(point.value);
                  const isHovered = hoveredIndex === i;
                  const isLast = i === chartData.length - 1;
                  return (
                    <g key={`${point.date}-${point.value}-${i}`}>
                      <circle
                        cx={x}
                        cy={y}
                        r={isHovered ? 7 : 5}
                        fill="var(--fc-status-success)"
                        stroke="var(--fc-bg-deep)"
                        strokeWidth="2"
                        className="cursor-pointer"
                        style={isLast ? { filter: "url(#pr-dot-glow)" } : undefined}
                        onMouseEnter={() => setHoveredIndex(i)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        onClick={() => setHoveredIndex(i)}
                      />
                    </g>
                  );
                })}
              </svg>

              {hoveredPoint && (
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-xl border border-[color:var(--fc-hairline)] bg-[color:var(--fc-surface-float)] p-3 text-sm min-h-[44px] flex flex-col justify-center font-[family-name:var(--f-mono)]"
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
                    {formatPersonalRecordCaption(recordType, hoveredPoint.value, valueUnit)}
                  </p>
                </div>
              )}

              <div className="flex justify-between mt-1 px-1 font-[family-name:var(--f-mono)] text-xs text-[color:var(--fc-text-subtle)]">
                {chartData.length > 0 && (
                  <>
                    <span>
                      {new Date(chartData[0].date + "T12:00:00").toLocaleDateString("en", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span>
                      {new Date(
                        chartData[chartData.length - 1].date + "T12:00:00"
                      ).toLocaleDateString("en", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center font-[family-name:var(--f-mono)] text-sm text-[color:var(--fc-text-dim)]">
              No PR milestones in this time range.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
