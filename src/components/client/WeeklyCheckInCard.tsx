"use client";

import React from "react";
import { ChevronRight } from "lucide-react";
import type { BodyMeasurement } from "@/lib/measurementService";
import { CheckinStatusPill } from "@/components/client/check-ins/checkinSuite";
import checkinSuiteStyles from "@/components/client/check-ins/checkinSuite/checkinSuiteV1.module.css";
import { cn } from "@/lib/utils";

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

type MetricKey = "weight_kg" | "body_fat_percentage" | "waist_circumference" | "muscle_mass_kg";

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

function matchesMetricGoal(goal: WeeklyCheckInCardProps["activeCheckInGoals"][number], metric: MetricKey): boolean {
  const metricType = (goal.metric_type ?? "").toLowerCase();
  const title = (goal.title ?? "").toLowerCase();
  if (metric === "weight_kg") return metricType.includes("weight") || title.includes("weight");
  if (metric === "body_fat_percentage") {
    return metricType.includes("body_fat") || metricType.includes("fat") || title.includes("body fat");
  }
  if (metric === "waist_circumference") return metricType.includes("waist") || title.includes("waist");
  return metricType.includes("muscle") || metricType.includes("lean") || title.includes("muscle");
}

function getDeltaToneWithGoal(current: number, previous: number, target: number): "green" | "amber" | "gray" {
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

const metricNumClass =
  "tabular-nums [font-family:var(--f-display,var(--font-display,var(--font-number,var(--font-mono,ui-monospace,monospace))))]";

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
    daysSinceLast != null && latestMeasurement?.measured_date != null ? daysSinceLast < frequencyDays : false;
  const dueDateText = getDueDateText(lastMeasuredDate, frequencyDays);
  const isUpcoming = !isDoneThisPeriod && !isDue;

  const currentMetricRows = METRIC_DEFS.map((def) => {
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
  }).filter((row): row is NonNullable<typeof row> => row != null);

  const shellStyle: React.CSSProperties = isDoneThisPeriod
    ? {
        background: "linear-gradient(135deg, var(--cs-good-soft, rgba(52,211,153,0.12)), var(--cs-card, #0e1f2e))",
        borderColor: "var(--cs-good-dim, rgba(52,211,153,0.25))",
      }
    : isDue
      ? {
          background: "linear-gradient(135deg, var(--cs-warning-soft, rgba(245,194,66,0.12)), var(--cs-card, #0e1f2e))",
          borderColor: "var(--cs-warning-dim, rgba(245,194,66,0.25))",
        }
      : {
          background: "var(--cs-card, #0e1f2e)",
          borderColor: "var(--cs-line, rgba(255,255,255,0.08))",
        };

  return (
    <div
      className={cn(checkinSuiteStyles.root, checkinSuiteStyles.sectionCard, "cursor-pointer !gap-2")}
      style={{ ...shellStyle, position: "relative", overflow: "hidden" }}
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
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(checkinSuiteStyles.fontMono, "text-[9.5px] font-semibold uppercase tracking-[0.16em]")}
          style={{
            color: isDoneThisPeriod ? "var(--cs-good)" : isDue ? "var(--cs-warning)" : "var(--cs-cyan)",
          }}
        >
          Scheduled check-in
        </span>
        {isDoneThisPeriod ? (
          <CheckinStatusPill variant="completed" label="Completed" />
        ) : isDue ? (
          <CheckinStatusPill variant="due" label={isOverdue && overdueDays > 0 ? "Overdue" : "Due"} />
        ) : (
          <span
            className={cn(checkinSuiteStyles.fontMono, "shrink-0 rounded-[5px] border px-2 py-0.5 text-[8.5px] font-semibold uppercase tracking-[0.08em]")}
            style={{
              borderColor: "var(--cs-line-2)",
              background: "var(--cs-card-2)",
              color: "var(--cs-t4)",
            }}
          >
            In {Math.max(0, daysUntilDue ?? 0)} days
          </span>
        )}
      </div>

      <div className={cn(checkinSuiteStyles.fontBody, "text-[12.5px] font-medium")} style={{ color: "var(--cs-t1)" }}>
        {isDoneThisPeriod && latestMeasurement?.measured_date ? (
          <>Completed {formatDate(latestMeasurement.measured_date)}</>
        ) : isDue ? (
          <>Weekly review · 3 quick steps</>
        ) : dueDateText ? (
          <>Next review on {dueDateText}</>
        ) : (
          "No check-in data yet"
        )}
      </div>

      <div
        className="pt-1.5 mt-0.5 border-t flex items-center justify-between gap-2"
        style={{ borderColor: "var(--cs-line-2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {isDoneThisPeriod ? (
          <button
            type="button"
            className={cn(checkinSuiteStyles.fontBody, "flex flex-1 items-center justify-between text-left text-[11px] font-medium py-1")}
            style={{ color: "var(--cs-cyan)" }}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
          >
            Tap to see comparison
            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
          </button>
        ) : isDue ? (
          <button
            type="button"
            className={cn(checkinSuiteStyles.fontBody, "flex flex-1 items-center justify-between text-left text-[11px] font-medium py-1")}
            style={{ color: "var(--cs-cyan)" }}
            onClick={(e) => {
              e.stopPropagation();
              window.location.href = "/client/check-ins/weekly";
            }}
          >
            Start now
            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            className={cn(checkinSuiteStyles.fontBody, "flex flex-1 items-center justify-between text-left text-[11px] font-medium py-1")}
            style={{ color: "var(--cs-cyan)" }}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
          >
            View schedule
            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
          </button>
        )}
      </div>

      {isDue && isOverdue && overdueDays > 0 && (
        <p className={cn(checkinSuiteStyles.fontBody, "text-xs")} style={{ color: "var(--cs-warning)" }}>
          Overdue by {overdueDays} day{overdueDays === 1 ? "" : "s"}
        </p>
      )}

      {expanded && (
        <div className="mt-2 border-t pt-3 space-y-3" style={{ borderColor: "var(--cs-line-2)" }} onClick={(e) => e.stopPropagation()}>
          {isDoneThisPeriod ? (
            <>
              {previousMeasurement == null ? (
                <p className="text-sm" style={{ color: "var(--cs-t3)" }}>
                  No previous data to compare
                </p>
              ) : currentMetricRows.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--cs-t3)" }}>
                  No metrics available for comparison
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {currentMetricRows.map((metric) => (
                    <div
                      key={metric.key}
                      className="rounded-xl border p-3"
                      style={{ borderColor: "var(--cs-line)", background: "var(--cs-card-2)" }}
                    >
                      <span className={cn(checkinSuiteStyles.fontMono, "text-[10px] uppercase tracking-wide")} style={{ color: "var(--cs-t4)" }}>
                        {metric.label}
                      </span>
                      <p className={cn("mt-1 text-lg font-semibold text-white", metricNumClass)}>{formatNumber(metric.current, metric.unit)}</p>
                      {metric.delta != null ? (
                        <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${metricNumClass} ${toneClasses(metric.tone)}`}>
                          {metric.delta === 0 ? null : metric.delta > 0 ? "↑" : "↓"}
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
              <p className={cn(checkinSuiteStyles.fontMono, "text-[10px] uppercase mb-2")} style={{ color: "var(--cs-t4)" }}>
                LAST CHECK-IN {latestMeasurement?.measured_date ? `· ${formatDate(latestMeasurement.measured_date)}` : ""}
              </p>
              {currentMetricRows.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--cs-t3)" }}>
                  No previous check-in data available
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {currentMetricRows.map((metric) => (
                    <div
                      key={metric.key}
                      className="rounded-xl border p-3"
                      style={{ borderColor: "var(--cs-line)", background: "var(--cs-card-2)" }}
                    >
                      <span className={cn(checkinSuiteStyles.fontMono, "text-[10px] uppercase tracking-wide")} style={{ color: "var(--cs-t4)" }}>
                        {metric.label}
                      </span>
                      <p className={cn("mt-1 text-lg font-semibold text-white", metricNumClass)}>{formatNumber(metric.current, metric.unit)}</p>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = "/client/check-ins/weekly";
                }}
                className="w-full rounded-xl py-2.5 text-sm font-semibold"
                style={{
                  color: "var(--cs-lime-text)",
                  background: "linear-gradient(135deg, var(--cs-lime), var(--cs-lime-2))",
                }}
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
