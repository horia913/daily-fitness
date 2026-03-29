"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { LastSessionSetRow } from "@/lib/clientProgressionService";

function formatWeightKg(kg: number | null): string {
  if (kg == null || Number.isNaN(Number(kg))) return "—";
  const n = Math.round(Number(kg) * 10) / 10;
  return String(n);
}

export interface LastSessionWorkoutSummary {
  weight: number | null;
  reps: number | null;
  avgRpe: number | null;
  setDetails?: LastSessionSetRow[] | null;
}

interface LastSessionSetsSectionProps {
  lastWorkout: LastSessionWorkoutSummary | null | undefined;
}

/**
 * Below the sticky LOG SET area: last time this exercise was logged (any session),
 * or if none, the last time on this same workout assignment.
 */
export function LastSessionSetsSection({ lastWorkout }: LastSessionSetsSectionProps) {
  const details = lastWorkout?.setDetails;
  const hasRows = Array.isArray(details) && details.length > 0;
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setShowAll(false);
  }, [lastWorkout]);

  const sortedSets = useMemo(() => {
    if (!hasRows || !details) return [];
    return [...details].sort((a, b) => a.set_number - b.set_number);
  }, [details, hasRows]);

  const totalSets = sortedSets.length;
  const visibleSets =
    !showAll && totalSets > 5 ? sortedSets.slice(0, 5) : sortedSets;
  const hasMore = totalSets > 5;

  return (
    <div className="px-4 pb-1">
      <div className="mt-3 border-t border-white/5 pt-3">
        <p className="mb-2 text-xs text-neutral-500 uppercase tracking-wide dark:text-neutral-400">
          Last session
        </p>

        {!lastWorkout ? (
          <p className="text-sm leading-6 text-neutral-400 dark:text-neutral-500">
            No previous data for this exercise
          </p>
        ) : hasRows ? (
          <>
            <div className="mb-1 grid grid-cols-4 gap-1 px-1 text-xs text-neutral-500 uppercase tracking-wide dark:text-neutral-500">
              <span>#</span>
              <span>Weight</span>
              <span>Reps</span>
              <span>RPE</span>
            </div>
            {visibleSets.map((set, i) => (
              <div
                key={`${set.set_number}-${i}`}
                className="grid min-h-6 grid-cols-4 gap-1 border-b border-white/[0.06] px-1 py-1 text-sm last:border-b-0"
              >
                <span className="tabular-nums text-neutral-500 dark:text-neutral-400">
                  {set.set_number}
                </span>
                <span className="fc-text-primary tabular-nums">
                  {formatWeightKg(set.weight_kg)} kg
                </span>
                <span className="fc-text-primary tabular-nums">
                  {set.reps_completed ?? "—"}
                </span>
                <span className="tabular-nums text-neutral-400 dark:text-neutral-500">
                  {set.rpe != null && set.rpe > 0 ? set.rpe : "—"}
                </span>
              </div>
            ))}
            {hasMore && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="mt-2 text-left text-xs font-medium transition-opacity hover:opacity-90"
                style={{ color: "var(--fc-accent-cyan)" }}
              >
                {showAll ? "Show less" : `Show all ${totalSets} sets`}
              </button>
            )}
          </>
        ) : (
          <>
            <div className="mb-1 grid grid-cols-4 gap-1 px-1 text-xs text-neutral-500 uppercase tracking-wide dark:text-neutral-500">
              <span>#</span>
              <span>Weight</span>
              <span>Reps</span>
              <span>RPE</span>
            </div>
            <div className="grid min-h-6 grid-cols-4 gap-1 border-b border-white/[0.06] px-1 py-1 text-sm">
              <span className="text-neutral-500 dark:text-neutral-400">—</span>
              <span className="fc-text-primary tabular-nums">
                {formatWeightKg(lastWorkout.weight)} kg
              </span>
              <span className="fc-text-primary tabular-nums">
                {lastWorkout.reps ?? "—"}
              </span>
              <span className="tabular-nums text-neutral-400 dark:text-neutral-500">
                {lastWorkout.avgRpe != null && lastWorkout.avgRpe > 0
                  ? lastWorkout.avgRpe
                  : "—"}
              </span>
            </div>
          </>
        )}
      </div>
      <div className="h-44 shrink-0" aria-hidden />
    </div>
  );
}
