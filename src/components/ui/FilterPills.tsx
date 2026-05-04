"use client";

/**
 * FilterPills — v4 Filter pill row atomic
 *
 * Spec refs: design-system-v4 §6.34 (Filter pill row), §15.2 (component
 *             conventions). Class set: .filter-pills / .filter-pill (with
 *             .active state) — ui-system.css 1.B.14.
 *
 * Used by: Coach client list filters, Achievement filters, Library filters,
 * any horizontal categorical filter bar.
 *
 * Phase 0a: additive only.
 */

import React from "react";
import { cn } from "@/lib/utils";

export interface FilterPillOption<TValue extends string = string> {
  value: TValue;
  label: React.ReactNode;
  /** Optional small count rendered after the label. */
  count?: number;
  disabled?: boolean;
}

export interface FilterPillsProps<TValue extends string = string> {
  options: ReadonlyArray<FilterPillOption<TValue>>;
  /** Currently selected pill value. */
  value: TValue;
  onChange: (value: TValue) => void;
  /** ARIA group label for the pill row. */
  ariaLabel?: string;
  className?: string;
}

export function FilterPills<TValue extends string = string>({
  options,
  value,
  onChange,
  ariaLabel = "Filters",
  className,
}: FilterPillsProps<TValue>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("filter-pills", className)}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={opt.disabled}
            onClick={() => onChange(opt.value)}
            className={cn("filter-pill", isActive && "active")}
          >
            <span>{opt.label}</span>
            {typeof opt.count === "number" ? (
              <span
                className="ml-1.5 text-[11px]"
                style={{
                  color: isActive
                    ? "var(--fc-accent-cyan)"
                    : "var(--fc-text-subtle)",
                }}
              >
                {opt.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export default FilterPills;
