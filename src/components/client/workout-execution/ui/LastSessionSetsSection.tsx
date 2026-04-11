"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { LastSessionSetRow } from "@/lib/clientProgressionService";
import { clientEffortLabelFromStoredRpe } from "@/lib/workoutEffortLabels";

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

const tableClass =
  "w-full table-fixed border-separate border-spacing-0 text-sm text-gray-300";

const thClass =
  "pb-1.5 pr-1 text-left text-[10px] font-normal uppercase tracking-wider text-gray-500 sm:text-xs sm:tracking-wider";

const tdClass = "py-1.5 pr-1 align-middle tabular-nums";

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
      <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <p className="mb-2 text-xs uppercase tracking-wider text-gray-500">
          LAST SESSION
        </p>

        {!lastWorkout ? (
          <p className="text-xs text-gray-500 italic">No previous data</p>
        ) : hasRows ? (
          <>
            <div className="w-full min-w-0 overflow-x-auto">
              <table className={tableClass}>
                <colgroup>
                  <col className="w-[2.25rem] sm:w-8" />
                  <col className="min-w-0" />
                  <col className="min-w-0" />
                  <col className="w-[4.75rem] sm:w-[5.25rem]" />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col" className={thClass}>
                      #
                    </th>
                    <th scope="col" className={thClass}>
                      Weight
                    </th>
                    <th scope="col" className={thClass}>
                      Reps
                    </th>
                    <th scope="col" className={`${thClass} pr-0`}>
                      Effort
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleSets.map((set, i) => (
                    <tr
                      key={`${set.set_number}-${i}`}
                      className="border-b border-white/[0.06] last:border-b-0"
                    >
                      <td className={`${tdClass} text-gray-500`}>
                        {set.set_number}
                      </td>
                      <td className={`${tdClass} text-gray-300`}>
                        <span className="block min-w-0 break-words leading-tight">
                          {formatWeightKg(set.weight_kg)} kg
                        </span>
                      </td>
                      <td className={`${tdClass} text-gray-300`}>
                        <span className="block min-w-0 break-words leading-tight">
                          {set.reps_completed ?? "—"}
                        </span>
                      </td>
                      <td className={`${tdClass} pr-0 text-gray-400`}>
                        <span className="block text-[11px] leading-tight normal-case">
                          {clientEffortLabelFromStoredRpe(set.rpe) ?? "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {hasMore && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="mt-2 text-left text-xs font-medium text-cyan-400/90 transition-opacity hover:opacity-90"
              >
                {showAll ? "Show less" : `Show all ${totalSets} sets`}
              </button>
            )}
          </>
        ) : (
          <div className="w-full min-w-0 overflow-x-auto">
            <table className={tableClass}>
              <colgroup>
                <col className="w-[2.25rem] sm:w-8" />
                <col className="min-w-0" />
                <col className="min-w-0" />
                <col className="w-[4.75rem] sm:w-[5.25rem]" />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col" className={thClass}>
                    #
                  </th>
                  <th scope="col" className={thClass}>
                    Weight
                  </th>
                  <th scope="col" className={thClass}>
                    Reps
                  </th>
                  <th scope="col" className={`${thClass} pr-0`}>
                    Effort
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={`${tdClass} text-gray-500`}>—</td>
                  <td className={`${tdClass} text-gray-300`}>
                    <span className="block min-w-0 break-words leading-tight">
                      {formatWeightKg(lastWorkout.weight)} kg
                    </span>
                  </td>
                  <td className={`${tdClass} text-gray-300`}>
                    <span className="block min-w-0 break-words leading-tight">
                      {lastWorkout.reps ?? "—"}
                    </span>
                  </td>
                  <td className={`${tdClass} pr-0 text-gray-400`}>
                    <span className="block text-[11px] leading-tight normal-case">
                      {clientEffortLabelFromStoredRpe(
                        lastWorkout.avgRpe != null && lastWorkout.avgRpe > 0
                          ? Math.round(lastWorkout.avgRpe)
                          : null,
                      ) ?? "—"}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="h-44 shrink-0" aria-hidden />
    </div>
  );
}
