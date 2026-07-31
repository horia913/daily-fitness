"use client";

import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { Apple } from "lucide-react";
import { toLocalDateString } from "@/lib/clientActivityService";

export type NutritionComplianceTimeRange = "1W" | "2W" | "1M" | "3M";

const TIME_RANGE_DAYS: Record<NutritionComplianceTimeRange, number> = {
  "1W": 7,
  "2W": 14,
  "1M": 30,
  "3M": 90,
};

const TIME_RANGE_OPTIONS: {
  value: NutritionComplianceTimeRange;
  label: string;
}[] = [
  { value: "1W", label: "1W" },
  { value: "2W", label: "2W" },
  { value: "1M", label: "1M" },
  { value: "3M", label: "3M" },
];

export interface NutritionComplianceDay {
  date: string;
  compliance: number;
}

interface NutritionComplianceChartProps {
  /** Daily compliance data (0–100), sorted by date ascending */
  data: NutritionComplianceDay[];
  /** Optional: controlled time range (if not provided, use internal state) */
  timeRange?: NutritionComplianceTimeRange;
  onTimeRangeChange?: (range: NutritionComplianceTimeRange) => void;
  defaultTimeRange?: NutritionComplianceTimeRange;
  className?: string;
  title?: string;
  subtitle?: string;
}

function filterDataByTimeRange(
  data: NutritionComplianceDay[],
  timeRange: NutritionComplianceTimeRange
): NutritionComplianceDay[] {
  const days = TIME_RANGE_DAYS[timeRange];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = toLocalDateString(cutoff);
  return data.filter((d) => d.date >= cutoffStr);
}

export function NutritionComplianceChart({
  data,
  timeRange: controlledTimeRange,
  onTimeRangeChange,
  defaultTimeRange = "2W",
  className,
  title = "Nutrition adherence",
  subtitle = "Daily adherence to targets",
}: NutritionComplianceChartProps) {
  const [internalTimeRange, setInternalTimeRange] =
    useState<NutritionComplianceTimeRange>(defaultTimeRange);
  const [mounted, setMounted] = useState(false);

  const timeRange = controlledTimeRange ?? internalTimeRange;
  const setTimeRange = (value: NutritionComplianceTimeRange) => {
    if (onTimeRangeChange) onTimeRangeChange(value);
    else setInternalTimeRange(value);
  };

  const chartData = useMemo(
    () => filterDataByTimeRange(data, timeRange),
    [data, timeRange]
  );

  useEffect(() => setMounted(true), []);

  const padding = { top: 12, right: 12, bottom: 28, left: 40 };
  const width = 320;
  const height = 200;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const avgCompliance =
    chartData.length > 0
      ? Math.round(
          chartData.reduce((s, d) => s + d.compliance, 0) / chartData.length
        )
      : 0;

  const pathPoints = chartData
    .map((p, i) => {
      const x =
        padding.left +
        (chartData.length <= 1 ? 0 : (i / (chartData.length - 1)) * chartWidth);
      const y =
        padding.top +
        chartHeight -
        (p.compliance / 100) * chartHeight;
      return `${x},${y}`;
    })
    .join(" ");

  const avgY =
    padding.top + chartHeight - (avgCompliance / 100) * chartHeight;

  const showChart = chartData.length >= 2;

  if (data.length === 0) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-[color:var(--fc-glass-border)] bg-transparent p-6",
          className
        )}
      >
        <EmptyState
          icon={Apple}
          variant="compact"
          title="No nutrition data yet"
          description="Start logging meals to track adherence."
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-[color:var(--fc-glass-border)] bg-transparent p-4 sm:p-6",
        className
      )}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl border border-[color:var(--fc-glass-border)] bg-transparent text-[color:var(--fc-domain-meals)]">
            <Apple className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[color:var(--fc-text-primary)] [font-family:var(--f-headline)]">
              {title}
            </h2>
            <p className="text-xs text-[color:var(--fc-text-dim)] [font-family:var(--font-body)]">
              {subtitle}
            </p>
          </div>
        </div>
        <div className="flex gap-1 rounded-xl border border-[color:var(--fc-glass-border)] bg-transparent p-1">
          {TIME_RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTimeRange(opt.value)}
              className={cn(
                "min-h-[44px] min-w-[44px] px-2 sm:px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wide transition-colors [font-family:var(--f-mono)] bg-transparent",
                timeRange === opt.value
                  ? "text-[color:var(--fc-accent)] border border-[color-mix(in_srgb,var(--fc-accent)_40%,transparent)]"
                  : "text-[color:var(--fc-text-dim)] border border-transparent hover:text-[color:var(--fc-text-primary)]"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {showChart ? (
        <div className="relative">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full max-w-full"
            style={{ height: 200, minHeight: 200 }}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs />

            {/* Flat reference bands (token washes, no gradient) */}
            <rect
              x={padding.left}
              y={padding.top}
              width={chartWidth}
              height={(20 / 100) * chartHeight}
              fill="var(--fc-status-success)"
              fillOpacity="0.06"
            />
            <rect
              x={padding.left}
              y={padding.top + (20 / 100) * chartHeight}
              width={chartWidth}
              height={(30 / 100) * chartHeight}
              fill="var(--fc-status-warning)"
              fillOpacity="0.05"
            />
            <rect
              x={padding.left}
              y={padding.top + (50 / 100) * chartHeight}
              width={chartWidth}
              height={(50 / 100) * chartHeight}
              fill="var(--fc-status-error)"
              fillOpacity="0.04"
            />

            {/* Grid lines */}
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

            {/* Data line — no area fill / gradient */}
            {chartData.length >= 2 && (
              <polyline
                fill="none"
                stroke="var(--fc-domain-meals)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={pathPoints}
                className="transition-opacity duration-300"
                style={{ opacity: mounted ? 1 : 0 }}
              />
            )}

            {/* Average line (dashed) */}
            {chartData.length >= 2 && avgCompliance > 0 && avgCompliance < 100 && (
              <line
                x1={padding.left}
                y1={avgY}
                x2={padding.left + chartWidth}
                y2={avgY}
                stroke="var(--fc-text-dim)"
                strokeWidth="1"
                strokeDasharray="4 4"
                strokeOpacity="0.7"
              />
            )}

            {/* Data points */}
            {chartData.map((point, i) => {
              const x =
                padding.left +
                (chartData.length <= 1
                  ? 0
                  : (i / (chartData.length - 1)) * chartWidth);
              const y =
                padding.top +
                chartHeight -
                (point.compliance / 100) * chartHeight;
              return (
                <circle
                  key={`${point.date}-${point.compliance}`}
                  cx={x}
                  cy={y}
                  r={3}
                  fill="var(--fc-domain-meals)"
                  stroke="var(--fc-bg-deep)"
                  strokeWidth="1.5"
                />
              );
            })}
          </svg>

          {/* Average label */}
          {chartData.length >= 2 && (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs [font-family:var(--f-mono)]">
              <span className="text-[color:var(--fc-text-dim)]">
                Avg:{" "}
                <strong className="text-[color:var(--fc-text-primary)] [font-family:var(--f-display)]">
                  {avgCompliance}%
                </strong>
              </span>
              <span className="text-[color:var(--fc-text-dim)]">
                {chartData.length > 0 &&
                  new Date(chartData[0].date + "T12:00:00").toLocaleDateString(
                    "en",
                    { month: "short", day: "numeric" }
                  )}{" "}
                –{" "}
                {chartData.length > 0 &&
                  new Date(
                    chartData[chartData.length - 1].date + "T12:00:00"
                  ).toLocaleDateString("en", { month: "short", day: "numeric" })}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="py-8 text-center text-sm text-[color:var(--fc-text-dim)]">
          Need at least 2 days in this range to show the chart.
        </div>
      )}
    </div>
  );
}
