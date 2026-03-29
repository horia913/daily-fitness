"use client";

import { useEffect, useState } from "react";

interface WorkoutProgressBarProps {
  currentBlockIndex: number;
  totalBlocks: number;
  currentSetNumber: number;
  totalSetsInBlock: number;
  overallProgress: number; // 0-100
  blockName?: string;
  /** Display name of the current set type, e.g. "Straight Set", "Superset" */
  setTypeName?: string;
}

/**
 * Thin fixed workout progress line only (no overlapping header text).
 * Block / set context lives in BaseBlockExecutorLayout.
 */
export function WorkoutProgressBar({
  overallProgress,
}: WorkoutProgressBarProps) {
  const [isPulsing, setIsPulsing] = useState(false);
  const [prevProgress, setPrevProgress] = useState(overallProgress);

  useEffect(() => {
    if (overallProgress !== prevProgress && overallProgress > prevProgress) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 300);
      setPrevProgress(overallProgress);
      return () => clearTimeout(timer);
    }
  }, [overallProgress, prevProgress]);

  const clampedProgress = Math.max(0, Math.min(100, overallProgress));

  return (
    <div
      className="pointer-events-none fixed left-0 right-0 z-[9999] transition-all duration-300"
      style={{
        paddingTop: "env(safe-area-inset-top, 0)",
        /* One bar only: avoid border + track edge reading as “double lines” */
        background: "color-mix(in srgb, var(--fc-app-bg) 92%, transparent)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
    >
      <div
        className={`h-1 overflow-hidden transition-transform duration-300 ${
          isPulsing ? "opacity-90" : "opacity-100"
        }`}
        style={{
          background:
            "color-mix(in srgb, var(--fc-surface-card-border) 18%, transparent)",
        }}
        role="progressbar"
        aria-valuenow={Math.round(clampedProgress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Workout progress"
      >
        <div
          className="h-full transition-all duration-500 ease-out bg-gradient-to-r from-cyan-600 to-cyan-400"
          style={{
            width: `${clampedProgress}%`,
          }}
        />
      </div>
    </div>
  );
}
