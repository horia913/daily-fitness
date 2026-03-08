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
  // Don't render an empty card when there is no data and not loading
  if (
    !previousPerformance.loading &&
    !previousPerformance.lastWorkout &&
    !previousPerformance.personalBest
  ) {
    return null;
  }

  return (
    <div className="rounded-xl p-4 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-700">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-green-500 to-emerald-600">
          <TrendingUp className="w-4 h-4 text-white" />
        </div>
        <div className={`font-bold ${theme.text} text-base`}>
          Previous Performance
        </div>
      </div>

      {previousPerformance.loading ? (
        <div className="animate-pulse space-y-3 py-2">
          <div className="h-4 rounded-lg w-2/3 bg-[color:var(--fc-glass-highlight)]" />
          <div className="h-4 rounded-lg w-1/2 bg-[color:var(--fc-glass-highlight)]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Last Workout */}
          <div className="rounded-lg p-3 fc-glass-soft border border-[color:var(--fc-status-success)]">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className={`text-sm font-semibold ${theme.text}`}>
                Last Workout
              </span>
            </div>
            {previousPerformance.lastWorkout ? (
              <div className="space-y-1">
                <div className={`text-sm ${theme.text}`}>
                  {/* Weight × Reps · RPE on one line */}
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
                </div>
                {previousPerformance.lastWorkout.logged_at && (
                  <div className={`text-xs ${theme.textSecondary}`}>
                    {new Date(
                      previousPerformance.lastWorkout.logged_at,
                    ).toLocaleDateString()}
                  </div>
                )}
              </div>
            ) : (
              <div className={`text-sm ${theme.textSecondary}`}>
                No previous data
              </div>
            )}
          </div>

          {/* Personal Best */}
          <div className="rounded-lg p-3 fc-glass-soft border border-[color:var(--fc-status-success)]">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              <span className={`text-sm font-semibold ${theme.text}`}>
                Personal Best
              </span>
            </div>
            {previousPerformance.personalBest ? (
              <div className="space-y-1">
                <div className={`text-sm ${theme.text}`}>
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
