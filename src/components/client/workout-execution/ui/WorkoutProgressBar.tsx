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

export function WorkoutProgressBar({
  currentBlockIndex,
  totalBlocks,
  currentSetNumber,
  totalSetsInBlock,
  overallProgress,
  blockName,
  setTypeName,
}: WorkoutProgressBarProps) {
  const [isPulsing, setIsPulsing] = useState(false);
  const [prevProgress, setPrevProgress] = useState(overallProgress);

  // Pulse animation when progress changes
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
      className="fixed top-0 left-0 right-0 z-[9999] transition-all duration-300"
      style={{
        paddingTop: "env(safe-area-inset-top, 0)",
        background: "color-mix(in srgb, var(--fc-app-bg) 95%, transparent)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        borderBottom: "1px solid color-mix(in srgb, var(--fc-surface-card-border) 30%, transparent)",
      }}
    >
      <div className="px-4 py-2">
        {/* Text row */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2 text-xs font-medium fc-text-dim">
            <span>
              {setTypeName ?? "Set"} ({currentBlockIndex + 1} of {totalBlocks})
            </span>
            <span>•</span>
            <span>
              Set {currentSetNumber} of {totalSetsInBlock}
            </span>
            {blockName && (
              <>
                <span>•</span>
                <span className="fc-text-primary">{blockName}</span>
              </>
            )}
          </div>
          <div
            className={`text-xs font-bold font-mono tabular-nums transition-transform duration-300 ${
              isPulsing ? "scale-110" : "scale-100"
            }`}
            style={{
              color: "var(--fc-domain-workouts)",
            }}
          >
            {Math.round(clampedProgress)}%
          </div>
        </div>

        {/* Progress bar */}
        <div
          className="h-1 rounded-full overflow-hidden"
          style={{
            background: "color-mix(in srgb, var(--fc-surface-card-border) 20%, transparent)",
          }}
        >
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{
              width: `${clampedProgress}%`,
              background: "var(--fc-domain-workouts)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
