"use client";

/**
 * TargetProgressBar — v4 Target-progress bar atomic
 * DEV-ONLY: currently consumed by development routes (`/dev/*`) for visual labs.
 *
 * Spec refs: design-system-v4 §6.11 (Target-progress bar with variance),
 *             §2.9 (macro variance tokens), §15.2 (component conventions).
 *             Class set: .target-bar / .target-bar-fill / .target-bar-target
 *             (ui-system.css 1.B.9). Variance variants via [data-variance].
 *
 * Used by: Macros (calories/protein/carbs/fat), water, calorie-budget displays —
 * anywhere a real value is compared against a target with a tolerance band.
 *
 * Phase 0a: additive only.
 */

import React from "react";
import { cn } from "@/lib/utils";

export type TargetVariance = "on-target" | "near-target" | "off-target";

export interface TargetProgressBarProps {
  /** Current value (consumed, achieved, etc.). */
  current: number;
  /** Target value. Must be > 0 for meaningful output. */
  target: number;
  /** Optional unit string for the aria-label only. */
  unit?: string;
  /**
   * Override the computed variance. If not provided, computed as:
   *   on-target:    |delta/target| <= 0.05  (within 5%)
   *   near-target:  |delta/target| <= 0.15  (within 15%)
   *   off-target:   otherwise
   */
  variance?: TargetVariance;
  /**
   * If true, render a tick mark at exactly the target position (only meaningful
   * when current can exceed target — e.g. macro tracking with possible overshoot).
   */
  showTargetTick?: boolean;
  /** Cap the visual width at this multiple of target (default 1.5 — i.e. up to 150%). */
  maxOvershoot?: number;
  className?: string;
  /** Accessibility label override. Defaults to "<current>/<target> <unit>". */
  ariaLabel?: string;
}

function computeVariance(current: number, target: number): TargetVariance {
  if (target <= 0) return "off-target";
  const ratio = Math.abs(current - target) / target;
  if (ratio <= 0.05) return "on-target";
  if (ratio <= 0.15) return "near-target";
  return "off-target";
}

export function TargetProgressBar({
  current,
  target,
  unit,
  variance,
  showTargetTick = false,
  maxOvershoot = 1.5,
  className,
  ariaLabel,
}: TargetProgressBarProps) {
  const safeTarget = target > 0 ? target : 1;
  const v: TargetVariance = variance ?? computeVariance(current, target);
  const visualMax = safeTarget * maxOvershoot;
  const fillPct = Math.max(
    0,
    Math.min(100, (current / visualMax) * 100)
  );
  const targetPct = Math.max(
    0,
    Math.min(100, (safeTarget / visualMax) * 100)
  );

  const computedAria =
    ariaLabel ??
    (unit
      ? `${current} of ${target} ${unit}`
      : `${current} of ${target}`);

  return (
    <div
      className={cn("target-bar", className)}
      data-variance={v}
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={0}
      aria-valuemax={target}
      aria-label={computedAria}
    >
      <div
        className="target-bar-fill"
        style={{ width: `${fillPct}%` }}
      />
      {showTargetTick && (
        <div
          className="target-bar-target"
          style={{ left: `${targetPct}%` }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export default TargetProgressBar;
