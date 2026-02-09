"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
    <div
      className="flex items-center justify-between p-3 rounded-xl"
      style={{ background: "var(--fc-surface-sunken)" }}
    >
      <div className="text-xs font-semibold fc-text-dim font-mono">
        Block {currentBlock}/{totalBlocks}
      </div>
      <div className="flex items-center gap-2">
        {onPrevious && (
          <Button
            variant="outline"
            size="sm"
            onClick={onPrevious}
            disabled={!canGoPrevious}
            className="flex items-center gap-1 h-8 px-3 text-xs fc-text-primary border-[color:var(--fc-surface-card-border)]"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Prev
          </Button>
        )}
        {onNext && (
          <Button
            variant="outline"
            size="sm"
            onClick={onNext}
            disabled={!canGoNext}
            className="flex items-center gap-1 h-8 px-3 text-xs fc-text-primary border-[color:var(--fc-surface-card-border)]"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
