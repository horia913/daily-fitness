"use client";

import React from "react";
import { Button } from "@/components/ui/button";

interface NavigationControlsProps {
  currentBlock: number;
  totalBlocks: number;
  onPrevious?: () => void;
  onNext?: () => void;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
}

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
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 py-2">
      <div className="text-xs font-medium tabular-nums fc-text-dim">
        Exercise {currentBlock} of {totalBlocks}
      </div>
      <div className="flex items-center gap-1.5">
        {onPrevious && (
          <Button
            variant="outline"
            size="sm"
            onClick={onPrevious}
            disabled={!canGoPrevious}
            className="h-8 px-2.5 text-xs fc-text-primary border-[color:var(--fc-surface-card-border)]"
          >
            ← Prev Exercise
          </Button>
        )}
        {onNext && (
          <Button
            variant="outline"
            size="sm"
            onClick={onNext}
            disabled={!canGoNext}
            className="h-8 px-2.5 text-xs fc-text-primary border-[color:var(--fc-surface-card-border)]"
          >
            Next Exercise →
          </Button>
        )}
      </div>
    </div>
  );
}
