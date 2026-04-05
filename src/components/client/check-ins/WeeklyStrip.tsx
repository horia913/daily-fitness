"use client";

import { useState, useMemo } from "react";
import type { DailyWellnessLog } from "@/lib/wellnessService";
import { dbToUiScale } from "@/lib/wellnessService";

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

  return (
    <div className="pt-2 pb-1">
      <h3 className="text-sm font-semibold fc-text-primary mb-2">This Week</h3>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {DAY_LABELS.map((label, i) => (
          <div key={`h-${i}`} className="text-[10px] font-medium fc-text-subtle py-0.5">
            {label}
          </div>
        ))}
        {weekDays.map((dateStr) => {
          const isFuture = dateStr > todayStr;
          const log = byDate.get(dateStr);
          const done = isCompleteLog(log);
          const isToday = dateStr === todayStr;
          const symbol = isFuture ? "○" : done ? "✓" : isToday ? "●" : "○";
          const canTap = !isFuture;

          return (
            <button
              key={dateStr}
              type="button"
              disabled={!canTap}
              onClick={() => {
                if (!canTap) return;
                setExpandedDate((d) => (d === dateStr ? null : dateStr));
              }}
              className={`
                py-1.5 rounded-lg text-sm font-semibold transition-colors
                ${isFuture ? "fc-text-subtle opacity-35 cursor-default" : "fc-text-primary hover:bg-white/[0.06]"}
                ${done ? "text-[color:var(--fc-status-success)]" : ""}
                ${isToday && !done && !isFuture ? "text-[color:var(--fc-accent-cyan)]" : ""}
              `}
              aria-label={`${dateStr}${done ? ", check-in done" : isToday ? ", today" : ""}`}
            >
              {symbol}
            </button>
          );
        })}
      </div>

      {expandedDate && (
        <div className="mt-3 p-3 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)] text-sm">
          <p className="font-medium fc-text-primary mb-2">
            {new Date(expandedDate + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </p>
          {(() => {
            const el = byDate.get(expandedDate);
            if (!isCompleteLog(el)) {
              return <p className="fc-text-dim text-xs">No complete check-in for this day.</p>;
            }
            const stress = el!.stress_level != null ? dbToUiScale(el!.stress_level) : null;
            const sore = el!.soreness_level != null ? dbToUiScale(el!.soreness_level) : null;
            return (
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <span className="fc-text-subtle">Sleep</span>
                <span className="fc-text-primary text-right">
                  {el!.sleep_hours}h · Q{el!.sleep_quality}
                </span>
                <span className="fc-text-subtle">Stress</span>
                <span className="fc-text-primary text-right">{stress ?? "—"}</span>
                <span className="fc-text-subtle">Soreness</span>
                <span className="fc-text-primary text-right">{sore ?? "—"}</span>
                {el!.steps != null && (
                  <>
                    <span className="fc-text-subtle">Steps</span>
                    <span className="fc-text-primary text-right">{el!.steps.toLocaleString()}</span>
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
