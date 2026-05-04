"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavigationControlsProps {
  currentBlock: number;
  totalBlocks: number;
  onPrevious?: () => void;
  onNext?: () => void;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
}

/** Mock ex-nav-row: meta left, Prev / Next buttons right. */
export function NavigationControls({
  currentBlock,
  totalBlocks,
  onPrevious,
  onNext,
  canGoPrevious = true,
  canGoNext = true,
}: NavigationControlsProps) {
  if (totalBlocks <= 1) {
    return null;
  }

  return (
    <div className="mx-5 mb-4 flex items-center justify-between gap-3">
      <div className="text-[11.5px] font-medium text-zinc-500">
        Exercise {currentBlock} of {totalBlocks}
      </div>
      <div className="flex items-center gap-2">
        {onPrevious && (
          <button
            type="button"
            onClick={onPrevious}
            disabled={!canGoPrevious}
            className={cn(
              "flex items-center gap-1 rounded-[10px] border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-surface-card)] px-3 py-2 text-xs font-semibold text-white transition-colors",
              !canGoPrevious && "cursor-not-allowed text-zinc-600 opacity-50",
            )}
          >
            <ChevronLeft className="h-3 w-3" aria-hidden />
            Prev
          </button>
        )}
        {onNext && (
          <button
            type="button"
            onClick={onNext}
            disabled={!canGoNext}
            className={cn(
              "flex items-center gap-1 rounded-[10px] border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-surface-card)] px-3 py-2 text-xs font-semibold text-white transition-colors",
              !canGoNext && "cursor-not-allowed text-zinc-600 opacity-50",
            )}
          >
            Next
            <ChevronRight className="h-3 w-3" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}
