"use client";

/**
 * LoggedSetsList — workout-exec-v6.
 *
 * Renders the per-exercise list of logged sets BELOW the rx-card:
 *   container → header (count + Show less/more) → rows
 *   each row  → checkmark + title (e.g. "Set 3: 23.5 kg × 4 reps")
 *               + overflow menu slot
 *               + (no rpe?) "How hard was that?" prompt
 *               + SetEffortPicker
 *
 * Generic on title/menu so each block executor can format its own row title
 * (straight set vs superset round vs giant-set round, etc.).
 *
 * The component does NOT call PATCH itself — block executors hold the data
 * (loggedSets state + onSetLogUpsert + fetch logic) and pass `onEffortChange`.
 */

import React, { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { SetEffortPicker } from "./SetEffortPicker";
import {
  clientEffortLabelFromStoredRpe,
  rpeToEffortTier,
  type EffortTier,
} from "@/lib/workoutEffortLabels";
import effortStyles from "./setEffortPicker.module.css";

export interface LoggedSetRow {
  /** Stable key (set_log id, including temp ids). */
  id: string;
  /** Human-readable title shown after the action checkmark. */
  title: React.ReactNode;
  /** Stored RPE for highlighting + prompt visibility. */
  rpe: number | null | undefined;
  /** Called when the user taps an effort button. */
  onEffortChange: (rpe: number) => void;
  /**
   * When set, the title/set-info area is tappable to enter edit mode.
   * Does NOT wrap the effort picker — RPE taps stay independent.
   */
  onTitleClick?: () => void;
  /** Optional right-aligned slot (typically the 3-dot menu). */
  menu?: React.ReactNode;
  /** When true, picker is disabled (e.g. set still syncing). */
  disabled?: boolean;
}

interface LoggedSetsListProps {
  rows: LoggedSetRow[];
  /** Header noun: "Logged sets" by default. */
  label?: string;
  /** Show toggle when more rows than this; default very high (no collapse in normal use). */
  collapseThreshold?: number;
  className?: string;
}

export function LoggedSetsList({
  rows,
  label = "Logged sets",
  collapseThreshold = 99,
  className,
}: LoggedSetsListProps) {
  const [showAll, setShowAll] = useState(false);
  const total = rows.length;
  const hasToggle = total > collapseThreshold;

  useEffect(() => {
    if (!hasToggle && showAll) setShowAll(false);
  }, [hasToggle, showAll]);

  const visibleRows = useMemo(() => {
    if (!hasToggle || showAll) return rows;
    return rows.slice(-collapseThreshold);
  }, [rows, hasToggle, showAll, collapseThreshold]);

  if (total === 0) return null;

  return (
    <div
      className={cn(
        "mx-4 rounded-[18px] border border-[color:var(--fc-hairline-strong)] bg-transparent px-4 py-3.5",
        className,
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-[color:var(--fc-text-dim)]">
          {label} · {total}
        </span>
        {hasToggle ? (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="inline-flex items-center gap-1 text-[11.5px] font-semibold normal-case tracking-normal text-[color:var(--fc-accent)] hover:opacity-90"
          >
            {showAll ? (
              <>
                Show less <ChevronUp className="h-3 w-3" aria-hidden />
              </>
            ) : (
              <>
                Show all {total} <ChevronDown className="h-3 w-3" aria-hidden />
              </>
            )}
          </button>
        ) : null}
      </div>

      <ul className="flex flex-col">
        {visibleRows.map((row) => {
          const effortTier: EffortTier | null = rpeToEffortTier(row.rpe ?? null);
          const hasEffort = effortTier != null;
          const effortLabel = hasEffort
            ? clientEffortLabelFromStoredRpe(row.rpe ?? null) ?? null
            : null;
          return (
            <li
              key={row.id}
              className="flex flex-col gap-1.5 border-b border-white/[0.04] py-2.5 last:border-b-0"
            >
              {/* Title row is always full width (no truncate). */}
              <div className="flex items-center justify-between gap-2">
                {row.onTitleClick ? (
                  <button
                    type="button"
                    onClick={row.onTitleClick}
                    disabled={row.disabled}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left text-[13px] font-semibold text-white transition-colors hover:bg-white/[0.04] active:bg-white/[0.06] disabled:opacity-60"
                    aria-label="Edit set"
                  >
                    <Check
                      className="h-3.5 w-3.5 shrink-0 text-[color:var(--fc-accent)]"
                      strokeWidth={3}
                      aria-hidden
                    />
                    <span className="min-w-0 font-medium text-[color:var(--fc-text-primary)] underline decoration-white/25 underline-offset-2">
                      {row.title}
                    </span>
                    <Pencil
                      className="h-3 w-3 shrink-0 text-[color:var(--fc-text-dim)]"
                      aria-hidden
                    />
                  </button>
                ) : (
                  <span className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-white">
                    <Check
                      className="h-3.5 w-3.5 shrink-0 text-[color:var(--fc-accent)]"
                      strokeWidth={3}
                      aria-hidden
                    />
                    <span className="min-w-0 font-medium text-[color:var(--fc-text-primary)]">
                      {row.title}
                    </span>
                  </span>
                )}

                {/* Rated set: small chip stays inline with the title row. */}
                {hasEffort ? (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide border shrink-0",
                      effortStyles[effortTier],
                    )}
                    style={{
                      backgroundColor:
                        "color-mix(in srgb, currentColor 14%, #050608)",
                      borderColor: "currentColor",
                    }}
                    aria-label={`Effort: ${effortLabel ?? ""}`}
                  >
                    {effortLabel}
                  </span>
                ) : null}
              </div>

              {/* Unrated set: picker goes on its own line below the title row. */}
              {!hasEffort ? (
                <div className="flex flex-col items-end gap-1">
                  <p className={effortStyles.promptLabel}>How hard was that?</p>
                  <SetEffortPicker
                    currentRPE={row.rpe ?? null}
                    onSelect={row.onEffortChange}
                    disabled={row.disabled}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default LoggedSetsList;
