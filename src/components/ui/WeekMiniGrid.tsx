"use client";

/**
 * WeekMiniGrid — v4 Per-week mini-stat grid atomic
 *
 * Spec refs: design-system-v4 §6.30 (Per-week mini-stat grid — 7 small slots
 *             showing completion / activity per day), §15.2 (component
 *             conventions).
 *
 * Used by: Habit cards (last 7 days), Goal cards (week-by-week progress),
 * weekly check-in summaries.
 *
 * Phase 0a: additive only.
 * Phase 0b: citation corrected from §6.29 → §6.30 (Task 1 calibration).
 */

import React from "react";
import { cn } from "@/lib/utils";

export interface WeekMiniGridDay {
  /** Display label for the slot, typically "M","T","W","T","F","S","S". */
  label: string;
  /** Numeric or boolean value. 0/false renders as empty, otherwise filled. */
  value: number | boolean;
  /** Optional accessible description per slot (e.g. "Mon — completed"). */
  ariaLabel?: string;
}

export interface WeekMiniGridProps {
  days: ReadonlyArray<WeekMiniGridDay>;
  /**
   * Visual density:
   *  - "binary" (default): full / empty dot
   *  - "scale":            opacity scales by value / max(value)
   */
  mode?: "binary" | "scale";
  /** Override accent color (defaults to current pillar / cyan). */
  accent?: string;
  className?: string;
  /** ARIA label for the whole grid. */
  ariaLabel?: string;
}

export function WeekMiniGrid({
  days,
  mode = "binary",
  accent = "var(--fc-accent)",
  className,
  ariaLabel = "Last 7 days",
}: WeekMiniGridProps) {
  const max =
    mode === "scale"
      ? Math.max(
          1,
          ...days.map((d) =>
            typeof d.value === "number" ? d.value : d.value ? 1 : 0
          )
        )
      : 1;

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("flex items-end gap-1.5", className)}
    >
      {days.map((d, i) => {
        const numeric =
          typeof d.value === "number" ? d.value : d.value ? 1 : 0;
        const filled = numeric > 0;
        const intensity =
          mode === "scale" ? Math.min(1, numeric / max) : filled ? 1 : 0;
        return (
          <div
            key={i}
            className="flex flex-col items-center gap-1"
            aria-label={d.ariaLabel ?? `${d.label}: ${numeric}`}
          >
            <span
              className="block h-5 w-5 rounded-md"
              style={{
                background: filled
                  ? `color-mix(in srgb, ${accent} ${Math.round(
                      30 + intensity * 70
                    )}%, transparent)`
                  : "rgba(255, 255, 255, 0.05)",
                border: filled
                  ? `1px solid color-mix(in srgb, ${accent} 40%, transparent)`
                  : "1px solid var(--fc-glass-border)",
              }}
              aria-hidden="true"
            />
            <span
              className="text-[9px] font-bold tracking-[0.10em] uppercase"
              style={{ color: "var(--fc-text-subtle)" }}
            >
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default WeekMiniGrid;
