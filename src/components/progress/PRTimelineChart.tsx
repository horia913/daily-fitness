"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { Trophy, ChevronDown } from "lucide-react";

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
  weight: number;
}

interface PRTimelineChartProps {
  /** Weight PR milestones: dates when a new PR was set, sorted by date ascending */
  milestones: PRMilestone[];
  exerciseName: string;
  /** Display unit for Y axis and tooltips */
  unit?: "kg" | "lbs";
  defaultTimeRange?: PRTimelineTimeRange;
  /** Collapsible: whether the chart section is collapsed (controlled by parent if provided) */
  defaultExpanded?: boolean;
  className?: string;
}

function filterMilestonesByTimeRange(
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
  unit = "kg",
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

  const values = chartData.map((m) => m.weight);
  const minVal = Math.min(...values, 0);
  const maxVal = Math.max(...values, 1);
  const range = maxVal - minVal || 1;

  const pathPoints = chartData
    .map((p, i) => {
      const x =
        padding.left +
        (chartData.length <= 1 ? 0 : (i / (chartData.length - 1)) * chartWidth);
      const y =
        padding.top +
        chartHeight -
        ((p.weight - minVal) / range) * chartHeight;
      return `${x},${y}`;
    })
    .join(" ");

  const showChart = chartData.length >= 2;

  useEffect(() => {
    if (!mounted || !showChart) return;
    const t = setTimeout(() => {
      if (!svgRef.current) return;
      const pathEl = svgRef.current.querySelector(".pr-timeline-line") as SVGPolylineElement | null;
      if (pathEl) setLineLength(pathEl.getTotalLength());
    }, 50);
    return () => clearTimeout(t);
  }, [mounted, chartData.length, showChart]);

  if (milestones.length === 0) {
    return (
      <div
        className={cn(
          "fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6",
          className
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

  return (
    <div
      className={cn(
        "fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] overflow-hidden",
        className
      )}
    >
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between p-4 sm:p-5 text-left min-h-[44px] touch-manipulation"
      >
        <h3 className="text-lg font-bold text-[color:var(--fc-text-primary)]">
          PR Progress
        </h3>
        <ChevronDown
          className={cn(
            "w-5 h-5 text-[color:var(--fc-text-dim)] transition-transform",
            collapsed ? "" : "rotate-180"
          )}
        />
      </button>

      {!collapsed && (
        <div className="px-4 sm:px-5 pb-5 border-t border-[color:var(--fc-glass-border)]">
          <div className="mb-3">
            <p className="text-sm text-[color:var(--fc-text-dim)]">
              {exerciseName} — weight PR over time
            </p>
          </div>

          <div className="flex gap-1 flex-shrink-0 mb-4">
            {TIME_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTimeRange(opt.value)}
                className={cn(
                  "min-h-[44px] min-w-[44px] px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                  timeRange === opt.value
                    ? "bg-[color:var(--fc-domain-workouts)]/20 text-[color:var(--fc-domain-workouts)]"
                    : "text-[color:var(--fc-text-dim)] hover:text-[color:var(--fc-text-primary)]"
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
                    <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
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
                {chartData.length >= 2 && (() => {
                  const pts = chartData
                    .map((p, i) => {
                      const x =
                        padding.left +
                        (i / (chartData.length - 1)) * chartWidth;
                      const y =
                        padding.top +
                        chartHeight -
                        ((p.weight - minVal) / range) * chartHeight;
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
                {/* Line */}
                {chartData.length >= 2 && (
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
                {/* Data point dots */}
                {chartData.map((point, i) => {
                  const x =
                    padding.left +
                    (chartData.length <= 1
                      ? 0
                      : (i / (chartData.length - 1)) * chartWidth);
                  const y =
                    padding.top +
                    chartHeight -
                    ((point.weight - minVal) / range) * chartHeight;
                  const isHovered = hoveredIndex === i;
                  const isLast = i === chartData.length - 1;
                  return (
                    <g key={`${point.date}-${point.weight}-${i}`}>
                      <circle
                        cx={x}
                        cy={y}
                        r={isHovered ? 7 : 5}
                        fill="var(--fc-status-success)"
                        stroke="var(--fc-bg-base)"
                        strokeWidth="2"
                        className="cursor-pointer"
                        style={
                          isLast
                            ? { filter: "url(#pr-dot-glow)" }
                            : undefined
                        }
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
                  className="absolute bottom-0 left-0 right-0 fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-xl p-3 text-sm min-h-[44px] flex flex-col justify-center"
                  style={{ zIndex: 10 }}
                >
                  <p className="font-semibold text-[color:var(--fc-text-primary)]">
                    {new Date(hoveredPoint.date + "T12:00:00").toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }
                    )}
                  </p>
                  <p className="text-[color:var(--fc-text-dim)]">
                    {hoveredPoint.weight} {unit}
                  </p>
                </div>
              )}

              <div className="flex justify-between mt-1 text-xs text-[color:var(--fc-text-dim)] px-1">
                {chartData.length > 0 && (
                  <>
                    <span>
                      {new Date(
                        chartData[0].date + "T12:00:00"
                      ).toLocaleDateString("en", {
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
            <div className="py-8 text-center text-sm text-[color:var(--fc-text-dim)]">
              Need at least 2 PR milestones in this range to show the chart.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
