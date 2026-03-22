"use client";

import React from "react";

interface TrainStatsRowProps {
  workoutsCompletedThisWeek: number;
  /** Total logged activity minutes this week (non-program activities + same source as Train page). */
  activityMinutesThisWeek: number;
  workoutStreakDays: number;
}

export function TrainStatsRow({
  workoutsCompletedThisWeek,
  activityMinutesThisWeek,
  workoutStreakDays,
}: TrainStatsRowProps) {
  const hours =
    activityMinutesThisWeek <= 0
      ? "0"
      : (activityMinutesThisWeek / 60).toFixed(1).replace(/\.0$/, "");

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
      <div className="rounded-xl fc-surface border border-[color:var(--fc-glass-border)] p-3 sm:p-4 text-center">
        <p className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
          {workoutsCompletedThisWeek}
        </p>
        <p className="text-[10px] sm:text-xs fc-text-dim mt-1 font-medium uppercase tracking-wide">
          Workouts
        </p>
      </div>
      <div className="rounded-xl fc-surface border border-[color:var(--fc-glass-border)] p-3 sm:p-4 text-center">
        <p className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
          {hours}
        </p>
        <p className="text-[10px] sm:text-xs fc-text-dim mt-1 font-medium uppercase tracking-wide">
          Hours
        </p>
      </div>
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 sm:p-4 text-center">
        <p className="text-2xl sm:text-3xl font-bold text-amber-400 tabular-nums inline-flex items-center justify-center gap-1">
          <span>{workoutStreakDays}</span>
          <span aria-hidden>🔥</span>
        </p>
        <p className="text-[10px] sm:text-xs text-amber-200/70 mt-1 font-medium uppercase tracking-wide">
          Streak
        </p>
      </div>
    </div>
  );
}
