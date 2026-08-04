"use client";

/**
 * SetEffortPicker — workout-exec-v6.
 *
 * 4 options (Easy / Medium / Hard / Max) → write band-upper-bound RPE.
 * Highlights the band the current stored RPE falls into.
 *
 * Mapping is the source of truth for the picker UI; the display-side
 * mapping (RPE → tier label / dot color) lives in `lib/workoutEffortLabels.ts`.
 * Presentation-only: values / write path unchanged.
 */

import React from "react";
import { cn } from "@/lib/utils";
import { rpeToEffortTier, type EffortTier } from "@/lib/workoutEffortLabels";
import styles from "./setEffortPicker.module.css";

interface SetEffortPickerProps {
  currentRPE: number | null | undefined;
  onSelect: (rpe: number) => void;
  disabled?: boolean;
  className?: string;
}

interface EffortOption {
  key: EffortTier;
  label: string;
}

const EFFORT_OPTIONS: ReadonlyArray<EffortOption> = [
  { key: "easy", label: "Easy" },
  { key: "medium", label: "Medium" },
  { key: "hard", label: "Hard" },
  { key: "max", label: "Max" },
];

/** Button click → RPE value (band representative). */
const EFFORT_TO_RPE: Record<EffortTier, number> = {
  easy: 6,
  medium: 7,
  hard: 9,
  max: 10,
};

/** Re-export for callers that need the same mapping. */
export { EFFORT_TO_RPE };

const TIER_CLASS: Record<EffortTier, string> = {
  easy: styles.easy,
  medium: styles.medium,
  hard: styles.hard,
  max: styles.max,
};

export function SetEffortPicker({
  currentRPE,
  onSelect,
  disabled = false,
  className,
}: SetEffortPickerProps) {
  const selectedTier = rpeToEffortTier(currentRPE ?? null);

  return (
    <div
      className={cn(styles.wrap, className)}
      role="group"
      aria-label="Effort"
    >
      {EFFORT_OPTIONS.map((opt) => {
        const isSelected = selectedTier === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(EFFORT_TO_RPE[opt.key])}
            aria-pressed={isSelected}
            aria-label={`${opt.label} effort`}
            className={cn(
              styles.opt,
              TIER_CLASS[opt.key],
              isSelected && styles.optSelected,
            )}
          >
            <span className={styles.label}>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default SetEffortPicker;
