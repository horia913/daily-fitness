"use client";

import React from "react";
import { ClientGlassCard } from "@/components/client-ui";
import { AlertCircle, Loader2 } from "lucide-react";
import { OverdueSlotCard } from "@/lib/programWeekStateBuilder";

interface OverdueWorkoutsProps {
  overdueSlots: OverdueSlotCard[];
  onComplete: (scheduleId: string) => void;
  isStarting: boolean;
  startingScheduleId: string | null;
}

export function OverdueWorkouts({
  overdueSlots,
  onComplete,
  isStarting,
  startingScheduleId,
}: OverdueWorkoutsProps) {
  if (overdueSlots.length === 0) {
    return null;
  }

  const formatScheduledDate = (dayOfWeek: number) => {
    // Calculate the date for this day of week in the current week
    const today = new Date();
    const currentDay = (today.getDay() + 6) % 7; // Convert to Mon=0, Sun=6
    
    // Calculate days difference (overdue means dayOfWeek < currentDay)
    const daysDiff = dayOfWeek - currentDay;
    const scheduledDate = new Date(today);
    scheduledDate.setDate(today.getDate() + daysDiff);

    // If the scheduled date is in the past (overdue), show it
    // Otherwise show relative date
    const daysAgo = Math.floor((today.getTime() - scheduledDate.getTime()) / (1000 * 60 * 60 * 24));
    
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
      <ClientGlassCard
        className="p-4"
        style={{
          background: "color-mix(in srgb, var(--fc-status-warning) 8%, var(--fc-glass-base))",
          borderColor: "color-mix(in srgb, var(--fc-status-warning) 30%, var(--fc-glass-border))",
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-5 h-5 fc-text-warning" />
          <h3 className="text-base font-bold fc-text-primary">
            You have {overdueSlots.length} missed workout{overdueSlots.length > 1 ? "s" : ""}
          </h3>
        </div>

        <div className="space-y-3">
          {overdueSlots.map((slot) => {
            const isStartingThis = isStarting && startingScheduleId === slot.scheduleId;
            return (
              <div
                key={slot.scheduleId}
                className="flex items-center justify-between gap-4 p-3 rounded-lg"
                style={{ background: "var(--fc-surface-sunken)" }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">🔴</span>
                    <span className="text-sm font-semibold fc-text-primary">
                      {slot.dayLabel}: {slot.workoutName}
                    </span>
                  </div>
                  <p className="text-xs fc-text-dim">
                    Was scheduled for {formatScheduledDate(slot.dayOfWeek)}
                  </p>
                </div>
                <button
                  onClick={() => onComplete(slot.scheduleId)}
                  disabled={isStartingThis}
                  className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold fc-text-primary hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: "color-mix(in srgb, var(--fc-status-warning) 15%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--fc-status-warning) 30%, transparent)",
                  }}
                >
                  {isStartingThis ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Complete Now →"
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </ClientGlassCard>
    </div>
  );
}
