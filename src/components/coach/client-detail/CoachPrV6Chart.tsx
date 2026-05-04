"use client";

import React, { useMemo } from "react";
import {
  filterMilestonesByTimeRange,
  type PRMilestone,
  type PRTimelineTimeRange,
} from "@/components/progress/PRTimelineChart";
import styles from "./CoachPrV6Chart.module.css";

type Props = {
  milestones: PRMilestone[];
  timeRange: PRTimelineTimeRange;
};

export default function CoachPrV6Chart({ milestones, timeRange }: Props) {
  const chartData = useMemo(
    () => filterMilestonesByTimeRange(milestones, timeRange),
    [milestones, timeRange]
  );

  const padding = { top: 10, right: 8, bottom: 22, left: 8 };
  const width = 360;
  const height = 124;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const values = chartData.map((m) => m.value);
  const minVal = values.length ? Math.min(...values) : 0;
  const maxVal = values.length ? Math.max(...values, minVal + 1e-6) : 1;
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
  const n = chartData.length;

  const startLabel =
    chartData.length > 0
      ? new Date(chartData[0]!.date + "T12:00:00").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : "";

  const endLabel =
    chartData.length > 0
      ? new Date(chartData[chartData.length - 1]!.date + "T12:00:00").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : "";

  const todayStr = new Date().toISOString().split("T")[0]!;
  const endIsToday =
    chartData.length > 0 && chartData[chartData.length - 1]!.date === todayStr;

  if (chartData.length === 0) {
    return (
      <div className={styles.chartShell}>
        <p className={styles.empty}>No PR milestones in this time range.</p>
      </div>
    );
  }

  return (
    <div className={styles.chartShell}>
      <span className={styles.entryBadge}>
        {n} {n === 1 ? "entry" : "entries"}
      </span>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={styles.svg}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={ratio}
            x1={padding.left}
            y1={padding.top + chartHeight * (1 - ratio)}
            x2={padding.left + chartWidth}
            y2={padding.top + chartHeight * (1 - ratio)}
            className={styles.gridLine}
          />
        ))}
        {showLine && (
          <polyline
            fill="none"
            stroke="var(--fc-effort-easy)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={pathPoints}
          />
        )}
        {chartData.map((point, i) => {
          const x = xForIndex(i, chartData.length);
          const y = yForValue(point.value);
          return (
            <g key={`${point.date}-${i}`}>
              <circle cx={x} cy={y} r={4.5} fill="var(--fc-effort-easy)" opacity={0.2} />
              <circle cx={x} cy={y} r={2.5} fill="var(--fc-effort-easy)" />
            </g>
          );
        })}
      </svg>
      <div className={styles.dateAxis}>
        <span>{startLabel}</span>
        <span>{endIsToday ? "Today" : endLabel}</span>
      </div>
    </div>
  );
}
