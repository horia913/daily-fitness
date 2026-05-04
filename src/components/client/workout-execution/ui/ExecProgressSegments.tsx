"use client";

import React from "react";
import { cn } from "@/lib/utils";

const SEGMENT_COUNT = 4;

export interface ExecProgressSegmentsProps {
  /** Number of sets completed in the current exercise (logged). */
  completedSets: number;
  /** Total prescribed sets for the current exercise. */
  totalSets: number;
  className?: string;
}

/**
 * Phone 3 mockup: four horizontal segments; active = lime + glow.
 * Maps set progress onto four segments when totalSets ≠ 4.
 */
export function ExecProgressSegments({
  completedSets,
  totalSets,
  className,
}: ExecProgressSegmentsProps) {
  const total = Math.max(1, Math.floor(totalSets) || 1);
  const done = Math.max(0, Math.min(completedSets, total));
  const progress = done / total;
  const activeIndex = Math.min(
    SEGMENT_COUNT - 1,
    Math.floor(progress * SEGMENT_COUNT),
  );
  const allComplete = done >= total;

  return (
    <div
      className={cn("flex items-center gap-1", className)}
      role="progressbar"
      aria-valuenow={done}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label="Set progress"
    >
      {Array.from({ length: SEGMENT_COUNT }).map((_, i) => {
        const isActive = !allComplete && i === activeIndex;
        return (
          <div
            key={i}
            className={cn(
              "h-[3px] w-[26px] rounded-sm transition-colors",
              allComplete
                ? "bg-[var(--fc-accent-lime)] shadow-[0_0_6px_color-mix(in_srgb,var(--fc-accent-lime)_40%,transparent)]"
                : isActive
                  ? "bg-[var(--fc-accent-lime)] shadow-[0_0_10px_var(--fc-accent-lime)]"
                  : "bg-white/10",
            )}
          />
        );
      })}
    </div>
  );
}
