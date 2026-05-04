"use client";

/**
 * FrequencySelector — v4 Frequency selector atomic
 *
 * Spec refs: design-system-v4 §6.26 (Frequency selector — picks "x times per
 *             week/month") and §6.22 (input-cell style backbone), §15.2
 *             (component conventions).
 *
 * Used by: Habits creation/edit, Goals frequency, Coach plan recurrence.
 *
 * Phase 0a: additive only — thin wrapper over <select> with input-cell styling.
 */

import React from "react";
import { cn } from "@/lib/utils";

export type FrequencyPeriod = "day" | "week" | "month";

export interface FrequencySelectorValue {
  count: number;
  period: FrequencyPeriod;
}

export interface FrequencySelectorProps {
  value: FrequencySelectorValue;
  onChange: (next: FrequencySelectorValue) => void;
  /** Label rendered above the cell. Defaults to "FREQUENCY". */
  label?: React.ReactNode;
  /** Min count (inclusive). Default 1. */
  minCount?: number;
  /** Max count (inclusive). Default 30. */
  maxCount?: number;
  /** Restrict which periods are selectable. Default: all three. */
  periods?: ReadonlyArray<FrequencyPeriod>;
  className?: string;
  disabled?: boolean;
}

const PERIOD_LABEL: Record<FrequencyPeriod, string> = {
  day: "per day",
  week: "per week",
  month: "per month",
};

export function FrequencySelector({
  value,
  onChange,
  label = "Frequency",
  minCount = 1,
  maxCount = 30,
  periods = ["day", "week", "month"],
  className,
  disabled = false,
}: FrequencySelectorProps) {
  const counts: number[] = [];
  for (let i = minCount; i <= maxCount; i++) counts.push(i);

  return (
    <div className={cn("input-cell", className)}>
      <div className="label">{label}</div>
      <div className="flex items-center gap-2">
        <select
          aria-label="Count"
          disabled={disabled}
          value={value.count}
          onChange={(e) =>
            onChange({ ...value, count: Number(e.target.value) })
          }
          className="bg-transparent text-[var(--fc-text-primary)] font-semibold text-[18px] outline-none cursor-pointer"
          style={{
            fontFamily:
              "var(--font-display, var(--font-number, var(--font-mono, ui-monospace, monospace)))",
          }}
        >
          {counts.map((c) => (
            <option key={c} value={c} className="bg-[var(--fc-surface-card)]">
              {c}
            </option>
          ))}
        </select>
        <span className="text-[var(--fc-text-dim)] text-[13px]">times</span>
        <select
          aria-label="Period"
          disabled={disabled}
          value={value.period}
          onChange={(e) =>
            onChange({
              ...value,
              period: e.target.value as FrequencyPeriod,
            })
          }
          className="bg-transparent text-[var(--fc-text-primary)] font-semibold text-[13px] outline-none cursor-pointer"
        >
          {periods.map((p) => (
            <option key={p} value={p} className="bg-[var(--fc-surface-card)]">
              {PERIOD_LABEL[p]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default FrequencySelector;
