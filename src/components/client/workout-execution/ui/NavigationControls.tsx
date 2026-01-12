"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/GlassCard";
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
    <GlassCard elevation={1} className="flex items-center justify-between p-4">
      <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
        Block {currentBlock} of {totalBlocks}
      </div>
      <div className="flex items-center gap-2">
        {onPrevious && (
          <Button
            variant="outline"
            size="sm"
            onClick={onPrevious}
            disabled={!canGoPrevious}
            className="flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
        )}
        {onNext && (
          <Button
            variant="outline"
            size="sm"
            onClick={onNext}
            disabled={!canGoNext}
            className="flex items-center gap-1"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </GlassCard>
  );
}
