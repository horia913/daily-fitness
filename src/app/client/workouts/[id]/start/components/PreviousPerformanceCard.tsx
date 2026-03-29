"use client";

import React from "react";
import { TrendingUp, Calendar, Trophy } from "lucide-react";

export interface PreviousPerformanceItem {
  weight_used?: number | null;
  weight_kg?: number | null;
  reps_completed?: number | null;
  reps?: number | null;
  logged_at: string;
  avgRpe?: number | null;
}

export interface PreviousPerformanceCardProps {
  previousPerformance: {
    lastWorkout: PreviousPerformanceItem | null;
    personalBest: PreviousPerformanceItem | null;
    loading: boolean;
  };
  theme: {
    text: string;
    textSecondary: string;
  };
}

export function PreviousPerformanceCard({
  previousPerformance,
  theme,
}: PreviousPerformanceCardProps) {
  if (
    !previousPerformance.loading &&
    !previousPerformance.lastWorkout &&
    !previousPerformance.personalBest
  ) {
    return null;
  }

  return (
    <div className="border-y border-white/5">
      <div className="flex items-center gap-2 border-b border-white/5 px-1 py-2">
        <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
        <div className={`text-xs font-semibold uppercase tracking-wider fc-text-dim`}>
          Previous performance
        </div>
      </div>

      {previousPerformance.loading ? (
        <div className="animate-pulse space-y-2 px-1 py-3">
          <div className="h-4 w-2/3 rounded bg-[color:var(--fc-glass-highlight)]" />
          <div className="h-4 w-1/2 rounded bg-[color:var(--fc-glass-highlight)]" />
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="flex flex-col gap-1 border-b border-white/5 py-3 px-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="flex min-w-0 items-center gap-2">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400" />
              <span className={`text-xs font-semibold ${theme.text}`}>
                Last workout
              </span>
            </div>
            {previousPerformance.lastWorkout ? (
              <div className={`min-w-0 flex-1 text-sm sm:text-right ${theme.text}`}>
                {(() => {
                  const weight =
                    previousPerformance.lastWorkout.weight_used ??
                    previousPerformance.lastWorkout.weight_kg;
                  const reps =
                    previousPerformance.lastWorkout.reps_completed ??
                    previousPerformance.lastWorkout.reps;
                  const rpe = previousPerformance.lastWorkout.avgRpe;
                  const parts: string[] = [];
                  if (weight != null) parts.push(`${weight}kg`);
                  if (reps != null) parts.push(`× ${reps}`);
                  const weightReps = parts.join(" ");
                  return (
                    <span>
                      {weightReps || "—"}
                      {rpe != null && (
                        <span className={`ml-2 text-xs ${theme.textSecondary}`}>
                          · RPE {rpe}
                        </span>
                      )}
                    </span>
                  );
                })()}
                {previousPerformance.lastWorkout.logged_at && (
                  <div className={`mt-0.5 text-xs ${theme.textSecondary}`}>
                    {new Date(
                      previousPerformance.lastWorkout.logged_at,
                    ).toLocaleDateString()}
                  </div>
                )}
              </div>
            ) : (
              <div className={`text-sm ${theme.textSecondary}`}>No previous data</div>
            )}
          </div>

          <div className="flex flex-col gap-1 py-3 px-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-3.5 w-3.5 shrink-0 text-yellow-600 dark:text-yellow-400" />
              <span className={`text-xs font-semibold ${theme.text}`}>
                Personal best
              </span>
            </div>
            {previousPerformance.personalBest ? (
              <div className={`text-sm sm:text-right ${theme.text}`}>
                {(() => {
                  const weight =
                    previousPerformance.personalBest.weight_used ??
                    previousPerformance.personalBest.weight_kg;
                  const reps =
                    previousPerformance.personalBest.reps_completed ??
                    previousPerformance.personalBest.reps;
                  const parts: string[] = [];
                  if (weight != null) parts.push(`${weight}kg`);
                  if (reps != null) parts.push(`× ${reps}`);
                  return parts.join(" ") || "—";
                })()}
              </div>
            ) : (
              <div className={`text-sm ${theme.textSecondary}`}>
                No personal best yet
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
