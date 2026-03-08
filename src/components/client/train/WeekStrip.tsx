"use client";

import React from "react";
import { CheckCircle, AlertCircle, Circle } from "lucide-react";
import { ProgramWeekDayCard } from "@/lib/programWeekStateBuilder";
import Link from "next/link";

interface WeekStripProps {
  days: ProgramWeekDayCard[];
  todaySlot: ProgramWeekDayCard | null;
  todayWeekday: number; // 0=Monday, 6=Sunday
  onDayClick: (scheduleId: string, isCompleted: boolean) => void;
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WeekStrip({ days, todaySlot, todayWeekday, onDayClick }: WeekStripProps) {
  // Map program days to calendar days using dayOfWeek property
  // Create array for all 7 days of the week (Mon-Sun)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    // Find the day that matches this weekday (0=Monday, 6=Sunday)
    const day = days.find((d) => d.dayOfWeek === i);
    return {
      weekday: i,
      day: day || null,
      isToday: i === todayWeekday,
    };
  });

  return (
    <div className="mb-6">
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
        {weekDays.map(({ weekday, day, isToday }) => {
          if (!day) {
            // No workout scheduled for this day
            return (
              <div
                key={weekday}
                className="flex-shrink-0 flex flex-col items-center gap-2 min-w-[60px]"
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-[var(--fc-glass-border)]">
                  <Circle className="w-5 h-5 fc-text-dim" />
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-semibold fc-text-dim mb-0.5">
                    {WEEKDAY_LABELS[weekday]}
                  </p>
                  <p className="text-[9px] fc-text-subtle">-</p>
                </div>
              </div>
            );
          }

          const isCompleted = day.isCompleted;
          const isMissed = !isCompleted && weekday < todayWeekday;
          const isTodaySlot = isToday && todaySlot?.scheduleId === day.scheduleId;

          return (
            <button
              key={day.scheduleId}
              onClick={() => onDayClick(day.scheduleId, isCompleted)}
              className="flex-shrink-0 flex flex-col items-center gap-2 min-w-[60px] transition-opacity hover:opacity-80"
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                  isTodaySlot
                    ? "border-[var(--fc-accent-cyan)] bg-[color-mix(in_srgb,var(--fc-accent-cyan)_12%,transparent)]"
                    : isCompleted
                    ? "border-[var(--fc-status-success)] bg-[color-mix(in_srgb,var(--fc-status-success)_12%,transparent)]"
                    : isMissed
                    ? "border-[var(--fc-status-error)] bg-[color-mix(in_srgb,var(--fc-status-error)_12%,transparent)]"
                    : "border-[var(--fc-glass-border)]"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle className="w-5 h-5 fc-text-success" />
                ) : isMissed ? (
                  <AlertCircle className="w-5 h-5 fc-text-error animate-pulse" />
                ) : (
                  <Circle className="w-5 h-5 fc-text-dim" />
                )}
              </div>
              <div className="text-center">
                <p className="text-[10px] font-semibold fc-text-dim mb-0.5">
                  {WEEKDAY_LABELS[weekday]}
                </p>
                <p className="text-[9px] fc-text-subtle line-clamp-1">
                  {day.workoutName.length > 10
                    ? day.workoutName.substring(0, 10) + "..."
                    : day.workoutName}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
