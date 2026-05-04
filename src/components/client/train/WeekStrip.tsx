"use client";

import React, { useMemo } from "react";
import { Check, AlertCircle } from "lucide-react";
import { ProgramWeekDayCard } from "@/lib/programWeekStateBuilder";
import { getCurrentWeekBounds } from "@/lib/clientActivityService";

interface WeekStripProps {
  days: ProgramWeekDayCard[];
  todaySlot: ProgramWeekDayCard | null;
  todayWeekday: number; // 0=Monday, 6=Sunday
  onDaySelect: (day: ProgramWeekDayCard | null, weekday: number) => void;
  selectedScheduleId: string | null;
  selectedRestWeekday: number | null;
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function calendarDatesForCurrentWeek(): number[] {
  const { start } = getCurrentWeekBounds();
  const base = new Date(`${start}T12:00:00`);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return d.getDate();
  });
}

function secondaryLabel(
  day: ProgramWeekDayCard | null,
  weekday: number,
  todayWeekday: number,
  todaySlot: ProgramWeekDayCard | null,
): string {
  if (!day) return "Rest";
  const isToday = weekday === todayWeekday;
  if (isToday && todaySlot?.scheduleId === day.scheduleId) return "Today";
  const raw = day.dayLabel?.trim() || day.workoutName;
  return raw.length > 8 ? `${raw.slice(0, 8)}…` : raw;
}

export function WeekStrip({
  days,
  todaySlot,
  todayWeekday,
  onDaySelect,
  selectedScheduleId,
  selectedRestWeekday,
}: WeekStripProps) {
  const dateNums = useMemo(() => calendarDatesForCurrentWeek(), []);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = days.find((d) => d.dayOfWeek === i);
    return {
      weekday: i,
      day: day || null,
      isToday: i === todayWeekday,
    };
  });

  return (
    <div className="mx-auto mb-[22px] max-w-lg px-4">
      <div
        className="flex gap-1.5 overflow-x-auto px-1 py-1 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="list"
        aria-label="This week"
      >
        {weekDays.map(({ weekday, day, isToday }, idx) => {
          const isSelected =
            (day && selectedScheduleId === day.scheduleId) ||
            (!day && selectedRestWeekday === weekday);

          const isCompleted = Boolean(day?.isCompleted);
          const isMissed =
            Boolean(day) &&
            !isCompleted &&
            weekday < todayWeekday &&
            !day!.isOptional;
          const isTodaySlot =
            Boolean(day) && isToday && todaySlot?.scheduleId === day!.scheduleId;
          const calNum = dateNums[idx] ?? weekday + 1;

          if (!day) {
            const isTodayRestColumn = isToday;
            return (
              <button
                key={weekday}
                type="button"
                role="listitem"
                onClick={() => onDaySelect(null, weekday)}
                className={`min-w-0 flex-1 rounded-[14px] border px-1.5 pt-2.5 pb-3 text-center transition-[box-shadow,border-color,background-color] ${
                  isTodayRestColumn
                    ? "border-[color:var(--fc-accent-cyan)] bg-[color:var(--fc-surface-elevated)] shadow-[0_0_0_3px_rgba(79,227,232,0.10)]"
                    : isSelected
                    ? "border-[color:var(--fc-accent-cyan)]/60 bg-[color:var(--fc-surface-card)] shadow-[0_0_0_2px_rgba(79,227,232,0.08)]"
                    : "border-[color:var(--fc-surface-card-border)] bg-[color:var(--fc-surface-card)]"
                }`}
              >
                <p className="mb-1 text-[9.5px] font-semibold uppercase tracking-[0.1em] fc-text-dim">
                  {WEEKDAY_LABELS[weekday]}
                </p>
                <p
                  className="mb-1 text-lg font-bold leading-none tracking-tight fc-text-primary"
                  style={{ fontFamily: "var(--f-display)" }}
                >
                  {calNum}
                </p>
                <div
                  className="mx-auto mt-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border-[1.5px] border-[color:var(--fc-surface-card-border)]"
                  aria-hidden
                />
                <p
                  className={`mt-1.5 text-[9.5px] font-medium leading-tight ${
                    isToday ? "text-[color:var(--fc-accent-cyan)]" : "fc-text-dim"
                  }`}
                >
                  Rest
                </p>
              </button>
            );
          }

          return (
            <button
              key={day.scheduleId ?? `wk-${weekday}-d${day.dayNumber}`}
              type="button"
              role="listitem"
              onClick={() => onDaySelect(day, weekday)}
              className={`min-w-0 flex-1 rounded-[14px] border px-1.5 pt-2.5 pb-3 text-center transition-[box-shadow,border-color,background-color] ${
                isMissed
                  ? "border-red-500/50 bg-[color-mix(in_srgb,#ef4444_8%,var(--fc-surface-card))]"
                  : isTodaySlot
                  ? "border-[color:var(--fc-accent-cyan)] bg-[color:var(--fc-surface-elevated)] shadow-[0_0_0_3px_rgba(79,227,232,0.10)]"
                  : isSelected
                  ? "border-[color:var(--fc-accent-cyan)]/60 bg-[color:var(--fc-surface-card)] shadow-[0_0_0_2px_rgba(79,227,232,0.08)]"
                  : "border-[color:var(--fc-surface-card-border)] bg-[color:var(--fc-surface-card)]"
              }`}
            >
              <p className="mb-1 text-[9.5px] font-semibold uppercase tracking-[0.1em] fc-text-dim">
                {WEEKDAY_LABELS[weekday]}
              </p>
              <p
                className="mb-1 text-lg font-bold leading-none tracking-tight fc-text-primary"
                style={{ fontFamily: "var(--f-display)" }}
              >
                {calNum}
              </p>
              <div
                className={`mx-auto mt-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border-[1.5px] ${
                  isCompleted
                    ? "border-[color:var(--fc-accent-lime)] bg-[color:var(--fc-accent-lime)] text-[#0e1f2e]"
                    : isMissed
                    ? "border-red-400/80 bg-transparent"
                    : "border-[color:var(--fc-surface-card-border)] bg-transparent"
                }`}
                aria-hidden
              >
                {isCompleted ? (
                  <Check className="h-2.5 w-2.5 stroke-[3]" stroke="currentColor" />
                ) : isMissed ? (
                  <AlertCircle className="h-3 w-3 text-red-400" />
                ) : null}
              </div>
              <p
                className={`mt-1.5 text-[9.5px] font-medium leading-tight ${
                  isTodaySlot ? "text-[color:var(--fc-accent-cyan)]" : "fc-text-dim"
                }`}
              >
                {secondaryLabel(day, weekday, todayWeekday, todaySlot)}
              </p>
              {day.isOptional ? (
                <span className="mt-0.5 block text-[8px] font-medium text-[color:var(--fc-accent-cyan)]">
                  Optional
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
