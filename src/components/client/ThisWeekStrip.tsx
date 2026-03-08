"use client";

import React from "react";
import { ClientGlassCard } from "@/components/client-ui";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

interface ThisWeekStripProps {
  /** Set of date strings (YYYY-MM-DD) that have a complete wellness check-in */
  loggedDates: Set<string>;
  /** Start of week (Monday) as YYYY-MM-DD */
  weekStart: string;
  /** X/7 count */
  loggedCount: number;
  totalDays?: number;
  /** Avg sleep hours this week */
  avgSleep?: number | null;
  /** Avg stress (1-5) this week */
  avgStress?: number | null;
}

function getWeekDays(weekStart: string): string[] {
  const start = new Date(weekStart + "T12:00:00");
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

export function ThisWeekStrip({
  loggedDates,
  weekStart,
  loggedCount,
  totalDays = 7,
  avgSleep,
  avgStress,
}: ThisWeekStripProps) {
  const weekDays = getWeekDays(weekStart);
  const today = new Date().toISOString().split("T")[0];

  return (
    <ClientGlassCard className="p-6">
      <h3 className="text-lg font-semibold fc-text-primary mb-4">This week</h3>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAY_LABELS.map((label, i) => (
          <div key={i} className="text-center text-xs font-medium fc-text-subtle py-1">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 mb-4">
        {weekDays.map((dateStr) => {
          const isLogged = loggedDates.has(dateStr);
          const isFuture = dateStr > today;
          return (
            <div
              key={dateStr}
              className={`
                aspect-square rounded-lg flex items-center justify-center text-xs font-medium
                ${isFuture ? "fc-text-subtle opacity-40" : isLogged ? "bg-[color:var(--fc-status-success)]/20 text-[color:var(--fc-status-success)] border border-[color:var(--fc-status-success)]/40" : "fc-glass-soft border border-[color:var(--fc-glass-border)]"}
              `}
            >
              {new Date(dateStr + "T12:00:00").getDate()}
            </div>
          );
        })}
      </div>
      <p className="text-sm fc-text-dim">
        {loggedCount}/{totalDays} days
        {avgSleep != null && ` · Avg sleep: ${avgSleep.toFixed(1)}h`}
        {avgStress != null && ` · Avg stress: ${avgStress.toFixed(1)}/5`}
      </p>
    </ClientGlassCard>
  );
}
