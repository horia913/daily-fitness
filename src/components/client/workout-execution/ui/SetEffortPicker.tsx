"use client";

/**
 * SetEffortPicker — workout-exec-v6.
 *
 * 4 pill buttons (Easy / Medium / Hard / Max) → write band-upper-bound RPE.
 * Highlights the band the current stored RPE falls into.
 *
 * Mapping is the source of truth for the picker UI; the display-side
 * mapping (RPE → tier label / dot color) lives in `lib/workoutEffortLabels.ts`.
 */

import React from "react";
import { cn } from "@/lib/utils";
import { rpeToEffortTier, type EffortTier } from "@/lib/workoutEffortLabels";

interface SetEffortPickerProps {
  currentRPE: number | null | undefined;
  onSelect: (rpe: number) => void;
  disabled?: boolean;
  className?: string;
}

interface EffortOption {
  key: EffortTier;
  label: string;
  emoji: string;
}

const EFFORT_OPTIONS: ReadonlyArray<EffortOption> = [
  { key: "easy", label: "Easy", emoji: "😎" },
  { key: "medium", label: "Medium", emoji: "💪" },
  { key: "hard", label: "Hard", emoji: "😤" },
  { key: "max", label: "Max", emoji: "🔥" },
];

/** Button click → RPE value (band upper bound). */
const EFFORT_TO_RPE: Record<EffortTier, number> = {
  easy: 4,
  medium: 6,
  hard: 8,
  max: 10,
};

/** Re-export for callers that need the same mapping. */
export { EFFORT_TO_RPE };

const SELECTED_CLASSES: Record<EffortTier, string> = {
  easy: "bg-[color:var(--fc-effort-easy-soft)] border-[color:var(--fc-effort-easy-border)] text-[color:var(--fc-effort-easy)]",
  medium:
    "bg-[color:var(--fc-effort-medium-soft)] border-[color:var(--fc-effort-medium-border)] text-[color:var(--fc-effort-medium)]",
  hard: "bg-[color:var(--fc-effort-hard-soft)] border-[color:var(--fc-effort-hard-border)] text-[color:var(--fc-effort-hard)]",
  max: "bg-[color:var(--fc-effort-max-soft)] border-[color:var(--fc-effort-max-border)] text-[color:var(--fc-effort-max)]",
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
      className={cn("grid grid-cols-4 gap-1.5", className)}
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
              "flex items-center justify-center gap-1.5",
              "rounded-full border px-1 py-1.5",
              "text-[11.5px] font-semibold leading-none",
              "transition-[transform,background-color,border-color,color] duration-150",
              "active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100",
              isSelected
                ? SELECTED_CLASSES[opt.key]
                : "border-[color:var(--fc-glass-border)] bg-white/[0.025] text-[color:var(--fc-text-dim)] hover:-translate-y-px hover:bg-white/[0.04]",
            )}
          >
            <span className="text-[13px] leading-none" aria-hidden>
              {opt.emoji}
            </span>
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default SetEffortPicker;
