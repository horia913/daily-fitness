"use client";

import React from "react";

interface TrainStatsRowProps {
  workoutsCompletedThisWeek: number;
  workoutStreakDays: number;
}

export function TrainStatsRow({
  workoutsCompletedThisWeek,
  workoutStreakDays,
}: TrainStatsRowProps) {
  return (
    <div className="mb-6 flex items-stretch border-y border-white/5">
      <div className="flex flex-1 flex-col items-center justify-center py-3 text-center">
        <p className="text-2xl font-bold tabular-nums text-cyan-400 sm:text-3xl">
          {workoutsCompletedThisWeek}
        </p>
        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-cyan-400/70 sm:text-xs">
          Workouts this week
        </p>
      </div>
      <div className="h-auto w-px shrink-0 bg-white/10" aria-hidden />
      <div className="flex flex-1 flex-col items-center justify-center py-3 text-center">
        <p className="inline-flex items-center justify-center gap-1 text-2xl font-bold tabular-nums text-amber-400 sm:text-3xl">
          <span>{workoutStreakDays}</span>
          <span aria-hidden>🔥</span>
        </p>
        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-200/70 sm:text-xs">
          Day streak
        </p>
      </div>
    </div>
  );
}
