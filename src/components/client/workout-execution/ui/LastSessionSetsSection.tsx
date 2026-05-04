"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { LastSessionSetRow } from "@/lib/clientProgressionService";
import {
  clientEffortLabelFromStoredRpe,
  rpeToEffortTier,
  type EffortTier,
} from "@/lib/workoutEffortLabels";
import { cn } from "@/lib/utils";

function formatWeightKg(kg: number | null): string {
  if (kg == null || Number.isNaN(Number(kg))) return "—";
  const n = Math.round(Number(kg) * 10) / 10;
  return String(n);
}

const TIER_COLOR_VAR: Record<EffortTier, string> = {
  easy: "var(--fc-effort-easy)",
  medium: "var(--fc-effort-medium)",
  hard: "var(--fc-effort-hard)",
  max: "var(--fc-effort-max)",
};

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
 * Last-session card — workout-exec-v6 §History.
 * Each row's effort label is color-coded with a dot (tier color + glow).
 * Bands match SetEffortPicker / clientEffortLabelFromStoredRpe.
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

  const headerLeft = hasRows
    ? `Last session · ${totalSets} sets`
    : "Last session";

  return (
    <div className="mx-5 mb-6 rounded-[18px] border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-surface-card)] px-4 py-3.5">
      <div className="mb-3 flex items-center justify-between gap-2 text-[9.5px] font-bold uppercase tracking-[0.16em] text-[color:var(--fc-text-dim)]">
        <span>{headerLeft}</span>
        {hasMore ? (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="font-semibold normal-case tracking-normal text-[color:var(--fc-accent-cyan)] hover:opacity-90"
          >
            {showAll ? "Show less" : `Show all ${totalSets} →`}
          </button>
        ) : null}
      </div>

      {!lastWorkout ? (
        <p className="text-xs italic text-zinc-500">No previous data</p>
      ) : hasRows ? (
        <div className="flex flex-col">
          {visibleSets.map((set, i) => (
            <HistRow
              key={`${set.set_number}-${i}`}
              setNumber={set.set_number}
              weightKg={set.weight_kg}
              reps={set.reps_completed}
              rpe={set.rpe ?? null}
            />
          ))}
        </div>
      ) : (
        <HistRow
          setNumber={null}
          weightKg={lastWorkout.weight}
          reps={lastWorkout.reps}
          rpe={
            lastWorkout.avgRpe != null && lastWorkout.avgRpe > 0
              ? Math.round(lastWorkout.avgRpe)
              : null
          }
        />
      )}
      <div className="h-24 shrink-0" aria-hidden />
    </div>
  );
}

interface HistRowProps {
  setNumber: number | null;
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
}

function HistRow({ setNumber, weightKg, reps, rpe }: HistRowProps) {
  const tier = rpeToEffortTier(rpe);
  const label = clientEffortLabelFromStoredRpe(rpe);
  const color = tier ? TIER_COLOR_VAR[tier] : null;

  return (
    <div className="grid grid-cols-[24px_1fr_60px_84px] items-center border-b border-white/[0.04] py-2 text-[12.5px] last:border-b-0">
      <div className="font-mono text-[11px] text-[color:var(--fc-text-dim)]">
        {setNumber ?? "—"}
      </div>
      <div
        className="min-w-0 font-semibold text-white"
        style={{
          fontFamily:
            "var(--font-bricolage-grotesque, var(--font-sans))",
        }}
      >
        {formatWeightKg(weightKg)} kg
      </div>
      <div className="text-[color:var(--fc-text-dim)]">
        {reps ?? "—"}
      </div>
      <div
        className={cn(
          "flex items-center justify-end gap-1.5 text-right text-[11px] font-semibold",
          tier ? "" : "text-[color:var(--fc-text-quaternary)]",
        )}
        style={tier && color ? { color } : undefined}
      >
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={
            tier && color
              ? {
                  backgroundColor: color,
                  boxShadow: `0 0 6px ${color}`,
                }
              : { background: "transparent", boxShadow: "none" }
          }
          aria-hidden
        />
        <span>{label ?? "—"}</span>
      </div>
    </div>
  );
}
