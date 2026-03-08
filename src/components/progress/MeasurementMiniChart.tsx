"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { BodyMeasurement } from "@/lib/measurementService";

interface MeasurementMiniChartProps {
  title: string;
  measurements: BodyMeasurement[];
  getValue: (m: BodyMeasurement) => number | null;
  getValue2?: (m: BodyMeasurement) => number | null; // For paired measurements (left/right)
  label2?: string; // Label for second line
  timeRange: "12M" | "6M" | "1M";
  isDecreaseGood?: boolean; // true for waist/hips (decrease = good), false for arms/thighs/calves (increase = good)
  className?: string;
}

const MONTHS_MAP: Record<"12M" | "6M" | "1M", number> = {
  "12M": 12,
  "6M": 6,
  "1M": 1,
};

export function MeasurementMiniChart({
  title,
  measurements,
  getValue,
  getValue2,
  label2,
  timeRange,
  isDecreaseGood = false,
  className,
}: MeasurementMiniChartProps) {
  // Filter by time range
  const filteredMeasurements = useMemo(() => {
    const monthsAgo = MONTHS_MAP[timeRange];
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsAgo);
    const cutoffStr = cutoffDate.toISOString().split("T")[0];

    return measurements
      .filter((m) => m.measured_date >= cutoffStr)
      .sort((a, b) => a.measured_date.localeCompare(b.measured_date))
      .slice(-10); // Last 10 data points
  }, [measurements, timeRange]);

  // Get data points with values
  const dataPoints = useMemo(() => {
    return filteredMeasurements
      .map((m) => ({
        date: m.measured_date,
        value: getValue(m),
        value2: getValue2 ? getValue2(m) : null,
      }))
      .filter((d) => d.value != null || d.value2 != null);
  }, [filteredMeasurements, getValue, getValue2]);

  if (dataPoints.length < 2) {
    return null; // Don't show chart if less than 2 data points
  }

  const values = dataPoints.map((d) => d.value).filter((v) => v != null) as number[];
  const values2 = getValue2
    ? dataPoints.map((d) => d.value2).filter((v) => v != null) as number[]
    : [];

  const allValues = [...values, ...values2];
  const maxValue = Math.max(...allValues, 1);
  const minValue = Math.min(...allValues, 0);
  const range = maxValue - minValue || 1;

  // Calculate change from first to last
  const firstValue = values[0];
  const lastValue = values[values.length - 1];
  const change = lastValue - firstValue;
  const changePercent = firstValue > 0 ? (change / firstValue) * 100 : 0;

  // Determine trend color
  const isGoodTrend =
    isDecreaseGood
      ? change < 0 // Decrease is good (waist/hips)
      : change > 0; // Increase is good (arms/thighs/calves)

  const trendColor = isGoodTrend
    ? "text-[color:var(--fc-status-success)]"
    : change === 0
      ? "text-[color:var(--fc-text-dim)]"
      : "text-[color:var(--fc-status-warning)]";

  const lineColor = isGoodTrend
    ? "rgb(34, 197, 94)" // green
    : change === 0
      ? "rgb(156, 163, 175)" // gray
      : "rgb(234, 179, 8)"; // yellow

  const lineColor2 = getValue2
    ? "rgb(59, 130, 246)" // blue for second line
    : lineColor;

  const trendIcon =
    change > 0 ? (
      <TrendingUp className="w-3 h-3" />
    ) : change < 0 ? (
      <TrendingDown className="w-3 h-3" />
    ) : (
      <Minus className="w-3 h-3" />
    );

  // Chart dimensions
  const padding = { top: 8, right: 8, bottom: 24, left: 40 };
  const width = 300;
  const height = 150;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Generate path for line chart
  const generatePath = (vals: number[]): string => {
    if (vals.length === 0) return "";
    const points = vals.map((val, idx) => {
      const x = padding.left + (idx / (vals.length - 1 || 1)) * chartWidth;
      const y =
        padding.top +
        chartHeight -
        ((val - minValue) / range) * chartHeight;
      return `${x},${y}`;
    });
    return `M ${points.join(" L ")}`;
  };

  const path = generatePath(values);
  const path2 = getValue2 && values2.length > 0 ? generatePath(values2) : null;

  // Y-axis labels
  const yAxisLabels = [maxValue, (maxValue + minValue) / 2, minValue].map((val) => ({
    value: val,
    y: padding.top + chartHeight - ((val - minValue) / range) * chartHeight,
  }));

  return (
    <div
      className={cn(
        "fc-surface rounded-xl border border-[color:var(--fc-surface-card-border)] p-4",
        className
      )}
    >
      <div className="mb-2">
        <h3 className="text-sm font-semibold fc-text-primary mb-1">{title}</h3>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold font-mono fc-text-primary">
            {lastValue.toFixed(1)}
            <span className="text-xs font-normal fc-text-subtle ml-1">cm</span>
          </span>
          {change !== 0 && (
            <div className={cn("flex items-center gap-1 text-xs font-semibold", trendColor)}>
              {trendIcon}
              <span>
                {change > 0 ? "+" : ""}
                {change.toFixed(1)} cm
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="relative">
        <svg width={width} height={height} className="overflow-visible">
          {/* Y-axis labels */}
          {yAxisLabels.map((label, idx) => (
            <text
              key={idx}
              x={padding.left - 8}
              y={label.y + 4}
              className="text-[10px] fc-text-subtle fill-current"
              textAnchor="end"
            >
              {label.value.toFixed(1)}
            </text>
          ))}

          {/* Grid lines */}
          {yAxisLabels.map((label, idx) => (
            <line
              key={idx}
              x1={padding.left}
              y1={label.y}
              x2={padding.left + chartWidth}
              y2={label.y}
              stroke="currentColor"
              strokeWidth={0.5}
              opacity={0.1}
            />
          ))}

          {/* First line */}
          {path && (
            <path
              d={path}
              fill="none"
              stroke={lineColor}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Second line (for paired measurements) */}
          {path2 && (
            <path
              d={path2}
              fill="none"
              stroke={lineColor2}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="4 4"
            />
          )}

          {/* Data points */}
          {values.map((val, idx) => {
            const x = padding.left + (idx / (values.length - 1 || 1)) * chartWidth;
            const y = padding.top + chartHeight - ((val - minValue) / range) * chartHeight;
            return (
              <circle
                key={idx}
                cx={x}
                cy={y}
                r={3}
                fill={lineColor}
                stroke="white"
                strokeWidth={1}
              />
            );
          })}

          {/* Data points for second line */}
          {values2.map((val, idx) => {
            const x = padding.left + (idx / (values2.length - 1 || 1)) * chartWidth;
            const y = padding.top + chartHeight - ((val - minValue) / range) * chartHeight;
            return (
              <circle
                key={`2-${idx}`}
                cx={x}
                cy={y}
                r={3}
                fill={lineColor2}
                stroke="white"
                strokeWidth={1}
              />
            );
          })}
        </svg>
      </div>

      {/* Legend for paired measurements */}
      {getValue2 && (
        <div className="flex items-center gap-3 mt-2 text-xs fc-text-subtle">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5" style={{ backgroundColor: lineColor }} />
            <span>Left</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 border-dashed border-t-2" style={{ borderColor: lineColor2 }} />
            <span>Right</span>
          </div>
        </div>
      )}
    </div>
  );
}
