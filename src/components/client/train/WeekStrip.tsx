"use client";

import React from "react";
import { CheckCircle, AlertCircle, Circle } from "lucide-react";
import { ProgramWeekDayCard } from "@/lib/programWeekStateBuilder";

interface WeekStripProps {
  days: ProgramWeekDayCard[];
  todaySlot: ProgramWeekDayCard | null;
  todayWeekday: number; // 0=Monday, 6=Sunday
  onDaySelect: (day: ProgramWeekDayCard | null, weekday: number) => void;
  selectedScheduleId: string | null;
  selectedRestWeekday: number | null;
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WeekStrip({
  days,
  todaySlot,
  todayWeekday,
  onDaySelect,
  selectedScheduleId,
  selectedRestWeekday,
}: WeekStripProps) {
  const weekDays = Array.from({ length: 7 }, (_, i) => {
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
          const isSelected =
            (day && selectedScheduleId === day.scheduleId) ||
            (!day && selectedRestWeekday === weekday);

          if (!day) {
            return (
              <button
                key={weekday}
                type="button"
                onClick={() => onDaySelect(null, weekday)}
                className="flex-shrink-0 flex flex-col items-center gap-2 min-w-[60px] transition-opacity hover:opacity-80"
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                    isSelected
                      ? "ring-2 ring-blue-500 dark:ring-blue-400 ring-offset-2 ring-offset-[var(--fc-bg-deep)] border-[var(--fc-glass-border)]"
                      : "border-[var(--fc-glass-border)]"
                  }`}
                >
                  <Circle className="w-5 h-5 fc-text-dim" />
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-semibold fc-text-dim mb-0.5">
                    {WEEKDAY_LABELS[weekday]}
                  </p>
                  <p className="text-[9px] fc-text-subtle">-</p>
                </div>
              </button>
            );
          }

          const isCompleted = day.isCompleted;
          const isMissed = !isCompleted && weekday < todayWeekday;
          const isTodaySlot = isToday && todaySlot?.scheduleId === day.scheduleId;

          return (
            <button
              key={day.scheduleId}
              type="button"
              onClick={() => onDaySelect(day, weekday)}
              className="flex-shrink-0 flex flex-col items-center gap-2 min-w-[60px] transition-opacity hover:opacity-80"
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                  isSelected
                    ? "ring-2 ring-blue-500 dark:ring-blue-400 ring-offset-2 ring-offset-[var(--fc-bg-deep)]"
                    : ""
                } ${
                  isTodaySlot && !isSelected
                    ? "border-blue-500 dark:border-blue-400 bg-[color-mix(in_srgb,#0284c7_12%,transparent)] dark:bg-blue-900/10"
                    : isCompleted
                    ? "border-[var(--fc-status-success)] bg-[color-mix(in_srgb,var(--fc-status-success)_12%,transparent)]"
                    : isMissed
                    ? "border-amber-500 dark:border-amber-400 bg-[color-mix(in_srgb,#ca8a04_12%,transparent)] dark:bg-amber-900/10"
                    : "border-[var(--fc-glass-border)]"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle className="w-5 h-5 fc-text-success" />
                ) : isMissed ? (
                  <AlertCircle className="w-5 h-5 text-amber-500 dark:text-amber-400 animate-pulse" />
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
