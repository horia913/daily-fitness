"use client";

import React from "react";
import { AlertCircle } from "lucide-react";
import { OverdueSlotCard } from "@/lib/programWeekStateBuilder";

interface OverdueWorkoutsProps {
  overdueSlots: OverdueSlotCard[];
  /** Called when user taps a slot — opens workout day preview (missed state) */
  onOpenPreview: (slot: OverdueSlotCard) => void;
  onComplete: (scheduleId: string) => void;
  isStarting: boolean;
  startingScheduleId: string | null;
}

export function OverdueWorkouts({
  overdueSlots,
  onOpenPreview,
  onComplete: _onComplete,
  isStarting: _isStarting,
  startingScheduleId: _startingScheduleId,
}: OverdueWorkoutsProps) {
  if (overdueSlots.length === 0) {
    return null;
  }

  const formatScheduledDate = (dayOfWeek: number) => {
    const today = new Date();
    const currentDay = (today.getDay() + 6) % 7;

    const daysDiff = dayOfWeek - currentDay;
    const scheduledDate = new Date(today);
    scheduledDate.setDate(today.getDate() + daysDiff);

    const daysAgo = Math.floor(
      (today.getTime() - scheduledDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysAgo === 0) {
      return "Today";
    } else if (daysAgo === 1) {
      return "Yesterday";
    } else if (daysAgo < 7) {
      return `${daysAgo} days ago`;
    } else {
      return scheduledDate.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    }
  };

  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center gap-2 border-l-[3px] border-l-[color:var(--fc-status-warning)] pl-2">
        <AlertCircle className="h-5 w-5 fc-text-warning" />
        <h3 className="text-base font-bold fc-text-primary">
          You have {overdueSlots.length} missed workout
          {overdueSlots.length > 1 ? "s" : ""}
        </h3>
      </div>

      <div className="flex flex-col border-y border-white/5">
        {overdueSlots.map((slot) => (
          <button
            key={slot.scheduleId}
            type="button"
            onClick={() => onOpenPreview(slot)}
            className="flex w-full min-h-[52px] items-center justify-between gap-4 border-b border-white/5 py-3 text-left transition-colors hover:bg-white/[0.02] last:border-b-0"
          >
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 flex items-center gap-2">
                <span className="text-lg" aria-hidden>
                  🔴
                </span>
                <span className="text-sm font-semibold fc-text-primary">
                  {slot.dayLabel}: {slot.workoutName}
                </span>
              </div>
              <p className="text-xs fc-text-dim">
                Was scheduled for {formatScheduledDate(slot.dayOfWeek)}
              </p>
            </div>
            <span className="shrink-0 text-xs font-medium fc-text-dim">View →</span>
          </button>
        ))}
      </div>
    </div>
  );
}
