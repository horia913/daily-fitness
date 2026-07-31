"use client";

import { useState, useMemo } from "react";
import type { DailyWellnessLog } from "@/lib/wellnessService";
import { dbToUiScale } from "@/lib/wellnessService";
import { Check } from "lucide-react";
import checkinSuiteStyles from "@/components/client/check-ins/checkinSuite/checkinSuiteV1.module.css";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function weekDatesFromStart(weekStart: string): string[] {
  const start = new Date(weekStart + "T12:00:00");
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

function isCompleteLog(l: DailyWellnessLog | undefined): boolean {
  return !!(
    l &&
    l.sleep_hours != null &&
    l.sleep_quality != null &&
    l.stress_level != null &&
    l.soreness_level != null
  );
}

interface WeeklyStripProps {
  weekStart: string;
  todayStr: string;
  logsThisWeek: DailyWellnessLog[];
}

export function WeeklyStrip({ weekStart, todayStr, logsThisWeek }: WeeklyStripProps) {
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const weekDays = useMemo(() => weekDatesFromStart(weekStart), [weekStart]);
  const byDate = useMemo(() => new Map(logsThisWeek.map((l) => [l.log_date, l])), [logsThisWeek]);
  const loggedCount = useMemo(
    () => weekDays.filter((d) => isCompleteLog(byDate.get(d))).length,
    [weekDays, byDate],
  );

  return (
    <div className={cn(checkinSuiteStyles.root, checkinSuiteStyles.weekTrackerCard)}>
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(checkinSuiteStyles.fontMono, "text-[10px] font-semibold uppercase tracking-[0.16em]")}
          style={{ color: "var(--fc-accent)" }}
        >
          This week
        </span>
        <span className={cn(checkinSuiteStyles.fontMono, "text-[9.5px] tracking-[0.06em]")} style={{ color: "var(--cs-t4)" }}>
          {loggedCount} of 7 logged
        </span>
      </div>
      <div className="grid grid-cols-7 gap-[5px] text-center">
        {weekDays.map((dateStr, col) => {
          const label = DAY_LABELS[col];
          const isFuture = dateStr > todayStr;
          const log = byDate.get(dateStr);
          const done = isCompleteLog(log);
          const isToday = dateStr === todayStr;
          const canTap = !isFuture;

          return (
            <div key={dateStr} className="flex flex-col items-center gap-1">
              <div
                className={cn(checkinSuiteStyles.fontMono, "text-[9px] font-medium uppercase tracking-[0.1em]")}
                style={{ color: isToday ? "var(--fc-accent)" : "var(--cs-t3)" }}
              >
                {label}
              </div>
              <button
                type="button"
                disabled={!canTap}
                onClick={() => {
                  if (!canTap) return;
                  setExpandedDate((d) => (d === dateStr ? null : dateStr));
                }}
                className="flex h-6 w-6 items-center justify-center rounded-full border transition-colors"
                style={
                  isFuture
                    ? {
                        opacity: 0.28,
                        cursor: "default",
                        background: "var(--cs-card-2)",
                        borderColor: "var(--cs-line-2)",
                      }
                    : done
                      ? {
                          cursor: "pointer",
                          background: "var(--cs-good-soft)",
                          borderColor: "var(--cs-good-dim)",
                        }
                      : isToday
                        ? {
                            cursor: "pointer",
                            background: "var(--cs-card-2)",
                            borderColor: "var(--fc-accent)",
                            boxShadow: "0 0 0 2px var(--fc-accent-dim)",
                          }
                        : {
                            cursor: "pointer",
                            background: "var(--cs-card-2)",
                            borderColor: "var(--cs-line-2)",
                          }
                }
                aria-label={`${dateStr}${done ? ", check-in done" : isToday ? ", today" : ""}`}
              >
                {done ? <Check className="h-2.5 w-2.5" strokeWidth={3} style={{ color: "var(--cs-good)" }} aria-hidden /> : null}
              </button>
            </div>
          );
        })}
      </div>

      {expandedDate && (
        <div
          className="mt-2 p-3 rounded-[11px] border"
          style={{
            background: "var(--cs-card-2)",
            borderColor: "var(--cs-line)",
          }}
        >
          <p className={cn(checkinSuiteStyles.fontBody, "text-sm font-medium mb-2")} style={{ color: "var(--cs-t1)" }}>
            {new Date(expandedDate + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </p>
          {(() => {
            const el = byDate.get(expandedDate);
            if (!isCompleteLog(el)) {
              return (
                <p className={cn(checkinSuiteStyles.fontBody, "text-xs")} style={{ color: "var(--cs-t3)" }}>
                  No complete check-in for this day.
                </p>
              );
            }
            const stress = el!.stress_level != null ? dbToUiScale(el!.stress_level) : null;
            const sore = el!.soreness_level != null ? dbToUiScale(el!.soreness_level) : null;
            return (
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <span style={{ color: "var(--cs-t3)" }}>Sleep</span>
                <span className="text-right" style={{ color: "var(--cs-t1)" }}>
                  {el!.sleep_hours}h · Q{el!.sleep_quality}
                </span>
                <span style={{ color: "var(--cs-t3)" }}>Stress</span>
                <span className="text-right" style={{ color: "var(--cs-t1)" }}>
                  {stress ?? "—"}
                </span>
                <span style={{ color: "var(--cs-t3)" }}>Soreness</span>
                <span className="text-right" style={{ color: "var(--cs-t1)" }}>
                  {sore ?? "—"}
                </span>
                {el!.steps != null && (
                  <>
                    <span style={{ color: "var(--cs-t3)" }}>Steps</span>
                    <span className="text-right" style={{ color: "var(--cs-t1)" }}>
                      {el!.steps.toLocaleString()}
                    </span>
                  </>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
