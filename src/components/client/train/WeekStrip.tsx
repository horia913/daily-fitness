"use client";

import React from "react";
import { CheckCircle, AlertCircle, Circle, Zap } from "lucide-react";
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
                      ? "ring-2 ring-cyan-500/50 ring-offset-2 ring-offset-[var(--fc-bg-deep)] border-cyan-500/50"
                      : "border-cyan-500/50"
                  }`}
                >
                  <Circle className="w-5 h-5 fc-text-dim" />
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-semibold fc-text-dim mb-0.5">
                    {WEEKDAY_LABELS[weekday]}
                  </p>
                  <p className="text-[9px] fc-text-subtle">Rest</p>
                </div>
              </button>
            );
          }

          const isCompleted = day.isCompleted;
          const isMissed = !isCompleted && weekday < todayWeekday && !day.isOptional;
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
                    ? isCompleted
                      ? "ring-2 ring-cyan-400 ring-offset-2 ring-offset-[var(--fc-bg-deep)]"
                      : "ring-2 ring-cyan-500/60 ring-offset-2 ring-offset-[var(--fc-bg-deep)]"
                    : ""
                } ${
                  isCompleted
                    ? "border-cyan-500 bg-cyan-500"
                    : isTodaySlot && !isSelected
                    ? "border-cyan-500/50 bg-[color-mix(in_srgb,#06b6d4_12%,transparent)]"
                    : isMissed
                    ? "border-red-500/70 bg-[color-mix(in_srgb,#ef4444_10%,transparent)]"
                    : "border-cyan-500/50"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle className="w-5 h-5 text-white" />
                ) : isMissed ? (
                  <AlertCircle className="w-5 h-5 text-red-400 animate-pulse" />
                ) : isTodaySlot ? (
                  <Zap className="w-5 h-5 text-cyan-400" />
                ) : (
                  <Circle className="w-5 h-5 fc-text-dim" />
                )}
              </div>
              <div className="text-center">
                <p className={`text-[10px] font-semibold mb-0.5 ${
                  isTodaySlot ? "text-cyan-500 dark:text-cyan-400" : "fc-text-dim"
                }`}>
                  {WEEKDAY_LABELS[weekday]}
                </p>
                <p className={`text-[9px] line-clamp-1 ${
                  isCompleted
                    ? "text-cyan-400"
                    : isTodaySlot
                    ? "text-cyan-500 dark:text-cyan-400"
                    : "fc-text-subtle"
                }`}>
                  {day.workoutName.length > 10
                    ? day.workoutName.substring(0, 10) + "..."
                    : day.workoutName}
                </p>
                {day.isOptional && (
                  <span className="text-[8px] text-cyan-500 dark:text-cyan-400">Optional</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
