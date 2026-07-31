"use client";

import React from "react";
import { AlertCircle, Info, Loader2 } from "lucide-react";
import { OverdueSlotCard } from "@/lib/programWeekStateBuilder";

interface OverdueWorkoutsProps {
  overdueSlots: OverdueSlotCard[];
  /** Explicit preview affordance */
  onOpenPreview: (slot: OverdueSlotCard) => void;
  /** Primary row action — start missed workout */
  onComplete: (scheduleId: string) => void;
  isStarting: boolean;
  startingScheduleId: string | null;
}

export function OverdueWorkouts({
  overdueSlots,
  onOpenPreview,
  onComplete,
  isStarting,
  startingScheduleId,
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
        {overdueSlots.map((slot) => {
          const isStartingThis =
            isStarting && startingScheduleId === slot.scheduleId;

          return (
            <div
              key={slot.scheduleId}
              className="flex w-full min-h-[52px] items-center gap-2 border-b border-white/5 py-3 last:border-b-0"
            >
              <button
                type="button"
                onClick={() => {
                  if (slot.scheduleId) onComplete(slot.scheduleId);
                }}
                disabled={isStartingThis || !slot.scheduleId}
                className="flex min-w-0 flex-1 items-center justify-between gap-4 text-left transition-colors hover:bg-white/[0.02] disabled:opacity-70"
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
                <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[color:var(--fc-accent)]">
                  {isStartingThis ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : null}
                  Start →
                </span>
              </button>
              <button
                type="button"
                onClick={() => onOpenPreview(slot)}
                className="shrink-0 rounded-lg border border-white/10 p-2 text-[color:var(--fc-text-dim)] transition-colors hover:bg-white/[0.04] hover:text-[color:var(--fc-accent)]"
                aria-label={`Preview ${slot.workoutName}`}
                title="Preview exercises"
              >
                <Info className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
