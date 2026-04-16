"use client";

import React from "react";
import {
  ChevronDown,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { BodyMeasurement } from "@/lib/measurementService";

/** Days since last measurement at which the check-in is considered due (e.g. 7→6, 14→12, 30→25). */
function getDueThreshold(frequencyDays: number): number {
  if (frequencyDays <= 7) return Math.max(1, frequencyDays - 1);
  if (frequencyDays <= 14) return frequencyDays - 2;
  return frequencyDays - 5;
}

interface WeeklyCheckInCardProps {
  daysSinceLast: number | null;
  lastMeasuredDate: string | null;
  frequencyDays: number;
  recentMeasurements: BodyMeasurement[];
  activeCheckInGoals: Array<{
    id: string;
    title: string | null;
    pillar: string | null;
    metric_type: string | null;
    target_value: number | null;
  }>;
}

type MetricKey =
  | "weight_kg"
  | "body_fat_percentage"
  | "waist_circumference"
  | "muscle_mass_kg";

interface MetricDef {
  key: MetricKey;
  label: string;
  unit: string;
}

const METRIC_DEFS: MetricDef[] = [
  { key: "weight_kg", label: "Weight", unit: "kg" },
  { key: "body_fat_percentage", label: "Body Fat", unit: "%" },
  { key: "waist_circumference", label: "Waist", unit: "cm" },
  { key: "muscle_mass_kg", label: "Muscle Mass", unit: "kg" },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatNumber(value: number, unit: string): string {
  const formatted = unit === "%" ? value.toFixed(1) : value.toFixed(1);
  return `${formatted} ${unit}`;
}

function formatDelta(delta: number, unit: string): string {
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)} ${unit}`;
}

function getDueDateText(lastMeasuredDate: string | null, frequencyDays: number): string | null {
  if (!lastMeasuredDate) return null;
  const dueDate = new Date(lastMeasuredDate + "T12:00:00");
  dueDate.setDate(dueDate.getDate() + frequencyDays);
  return dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function matchesMetricGoal(
  goal: WeeklyCheckInCardProps["activeCheckInGoals"][number],
  metric: MetricKey,
): boolean {
  const metricType = (goal.metric_type ?? "").toLowerCase();
  const title = (goal.title ?? "").toLowerCase();
  if (metric === "weight_kg") return metricType.includes("weight") || title.includes("weight");
  if (metric === "body_fat_percentage") {
    return metricType.includes("body_fat") || metricType.includes("fat") || title.includes("body fat");
  }
  if (metric === "waist_circumference") return metricType.includes("waist") || title.includes("waist");
  return metricType.includes("muscle") || metricType.includes("lean") || title.includes("muscle");
}

function getDeltaToneWithGoal(
  current: number,
  previous: number,
  target: number,
): "green" | "amber" | "gray" {
  const delta = current - previous;
  if (delta === 0) return "gray";
  const prevDistance = Math.abs(target - previous);
  const currentDistance = Math.abs(target - current);
  if (currentDistance === prevDistance) return "gray";
  return currentDistance < prevDistance ? "green" : "amber";
}

function getFallbackDeltaTone(metric: MetricKey, delta: number): "green" | "amber" | "gray" {
  if (delta === 0) return "gray";
  if (metric === "weight_kg") return "gray";
  if (metric === "body_fat_percentage" || metric === "waist_circumference") {
    return delta < 0 ? "green" : "amber";
  }
  return delta > 0 ? "green" : "amber";
}

function toneClasses(tone: "green" | "amber" | "gray"): string {
  if (tone === "green") return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30";
  if (tone === "amber") return "bg-amber-500/15 text-amber-300 border border-amber-500/30";
  return "bg-white/5 text-gray-400 border border-white/10";
}

export function WeeklyCheckInCard({
  daysSinceLast,
  lastMeasuredDate,
  frequencyDays,
  recentMeasurements,
  activeCheckInGoals,
}: WeeklyCheckInCardProps) {
  const [expanded, setExpanded] = React.useState(false);
  const dueThreshold = getDueThreshold(frequencyDays);
  const isDue = daysSinceLast != null && daysSinceLast >= dueThreshold;
  const isOverdue = daysSinceLast != null && daysSinceLast > dueThreshold;
  const daysUntilDue = daysSinceLast != null ? dueThreshold - daysSinceLast : null;
  const overdueDays = daysSinceLast != null && isOverdue ? daysSinceLast - dueThreshold : 0;
  const latestMeasurement = recentMeasurements[0] ?? null;
  const previousMeasurement = recentMeasurements[1] ?? null;
  const isDoneThisPeriod =
    daysSinceLast != null && latestMeasurement?.measured_date != null
      ? daysSinceLast < frequencyDays
      : false;
  const dueDateText = getDueDateText(lastMeasuredDate, frequencyDays);
  const isUpcoming = !isDoneThisPeriod && !isDue;
  const statusPill = isDoneThisPeriod
    ? { label: "COMPLETED", classes: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" }
    : isDue
      ? { label: "DUE", classes: "bg-amber-500/20 text-amber-300 border border-amber-500/30" }
      : {
          label: `IN ${Math.max(0, daysUntilDue ?? 0)} DAYS`,
          classes: "bg-white/5 text-gray-400 border border-white/10",
        };

  const currentMetricRows = METRIC_DEFS
    .map((def) => {
      const current = latestMeasurement?.[def.key];
      if (current == null || typeof current !== "number") return null;
      const previous = previousMeasurement?.[def.key];
      const hasPrevious = previous != null && typeof previous === "number";
      const delta = hasPrevious ? current - previous : null;
      const goal = activeCheckInGoals.find((g) => matchesMetricGoal(g, def.key));
      const tone =
        delta == null || delta === 0
          ? "gray"
          : goal?.target_value != null
            ? getDeltaToneWithGoal(current, previous as number, goal.target_value)
            : getFallbackDeltaTone(def.key, delta);
      return {
        ...def,
        current,
        previous: hasPrevious ? (previous as number) : null,
        delta,
        tone,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);

  return (
    <div
      className="rounded-xl border border-white/10 bg-white/[0.04] p-4 cursor-pointer"
      onClick={() => setExpanded((v) => !v)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setExpanded((v) => !v);
        }
      }}
      aria-expanded={expanded}
    >
      <div className="flex items-start justify-between gap-3"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-300/70">
          SCHEDULED CHECK-IN
        </p>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusPill.classes}`}>
          {statusPill.label}
        </span>
      </div>

      <div className="mt-3">
        {isDoneThisPeriod && latestMeasurement?.measured_date ? (
          <p className="text-sm text-gray-300">Completed {formatDate(latestMeasurement.measured_date)}</p>
        ) : isDue ? (
          <p className="text-sm text-white">
            {isOverdue && overdueDays > 0 ? `Overdue by ${overdueDays} day${overdueDays === 1 ? "" : "s"}` : "Due today"}
          </p>
        ) : (
          <p className="text-sm text-gray-300">{dueDateText ? `Due ${dueDateText}` : "No check-in data yet"}</p>
        )}
      </div>

      <div className="mt-3">
        {isDoneThisPeriod ? (
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Tap to see comparison</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </div>
        ) : isUpcoming ? (
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Tap for last week&apos;s data</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </div>
        ) : (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              window.location.href = "/client/check-ins/weekly";
            }}
            className="w-full fc-btn fc-btn-primary justify-center text-sm font-semibold py-2.5 rounded-xl"
          >
            Start check-in
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-4 border-t border-white/10 pt-4">
          {isDoneThisPeriod ? (
            <>
              {previousMeasurement == null ? (
                <p className="text-sm text-gray-400">No previous data to compare</p>
              ) : currentMetricRows.length === 0 ? (
                <p className="text-sm text-gray-400">No metrics available for comparison</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {currentMetricRows.map((metric) => (
                    <div key={metric.key} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">{metric.label}</p>
                      <p className="text-lg font-semibold text-white tabular-nums mt-1">
                        {formatNumber(metric.current, metric.unit)}
                      </p>
                      {metric.delta != null ? (
                        <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${toneClasses(metric.tone)}`}>
                          {metric.delta === 0 ? null : metric.delta > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {formatDelta(metric.delta, metric.unit)}
                        </span>
                      ) : (
                        <span className="mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-white/5 text-gray-400 border border-white/10">
                          No previous data
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">
                LAST CHECK-IN {latestMeasurement?.measured_date ? `· ${formatDate(latestMeasurement.measured_date)}` : ""}
              </p>
              {currentMetricRows.length === 0 ? (
                <p className="text-sm text-gray-400">No previous check-in data available</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {currentMetricRows.map((metric) => (
                    <div key={metric.key} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">{metric.label}</p>
                      <p className="text-lg font-semibold text-white tabular-nums mt-1">
                        {formatNumber(metric.current, metric.unit)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  window.location.href = "/client/check-ins/weekly";
                }}
                className="mt-3 w-full fc-btn fc-btn-primary justify-center text-sm font-semibold py-2.5 rounded-xl"
              >
                Start this week&apos;s check-in
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
