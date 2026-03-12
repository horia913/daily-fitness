"use client";

import React from "react";
import { ClientGlassCard } from "@/components/client-ui";
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
          {overdueSlots.map((slot) => (
            <button
              key={slot.scheduleId}
              type="button"
              onClick={() => onOpenPreview(slot)}
              className="w-full flex items-center justify-between gap-4 p-3 rounded-lg text-left hover:opacity-90 transition-opacity"
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
              <span className="text-xs font-medium fc-text-dim shrink-0">View →</span>
            </button>
          ))}
        </div>
      </ClientGlassCard>
    </div>
  );
}
