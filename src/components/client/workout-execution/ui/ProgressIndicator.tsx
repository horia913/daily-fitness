"use client";

import React from "react";
import { Progress } from "@/components/ui/progress";

interface ProgressIndicatorProps {
  current: number;
  total: number;
  label?: string;
  showBar?: boolean;
  /** When true, bar is split into as many segments as total (e.g. 4 sets = 4 segments). Default true. */
  segmented?: boolean;
}

export function ProgressIndicator({
  current,
  total,
  label = "Set",
  showBar = true,
  segmented = true,
}: ProgressIndicatorProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold fc-text-dim uppercase tracking-wider">
          {label} {current} of {total}
        </span>
        <span className="text-xs font-bold font-mono text-cyan-400 tabular-nums">
          {Math.round(percentage)}%
        </span>
      </div>
      {showBar &&
        (segmented && total > 0 ? (
          <div
            className="flex gap-0.5 w-full h-2 rounded-full overflow-hidden"
            style={{ background: "var(--fc-surface-sunken)" }}
            role="progressbar"
            aria-valuenow={current}
            aria-valuemin={0}
            aria-valuemax={total}
          >
            {Array.from({ length: total }, (_, i) => {
              const completed = current - 1;
              const filled = i < completed;
              return (
                <div
                  key={i}
                  className="flex-1 h-full min-w-0 rounded-sm first:rounded-l-full last:rounded-r-full transition-colors"
                  style={{ background: filled ? "#06b6d4" : "transparent" }}
                />
              );
            })}
          </div>
        ) : (
          <Progress
            value={percentage}
            className="h-2 bg-[color:var(--fc-surface-sunken)]"
            indicatorClassName="bg-gradient-to-r from-cyan-600 to-cyan-400"
          />
        ))}
    </div>
  );
}
