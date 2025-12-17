"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { BlockDetailsGrid, BlockDetail } from "./ui/BlockDetailsGrid";
import { ProgressIndicator } from "./ui/ProgressIndicator";
import { InstructionsBox } from "./ui/InstructionsBox";
import { BlockTypeBadge } from "./ui/BlockTypeBadge";
import { NavigationControls } from "./ui/NavigationControls";
import { BaseBlockExecutorProps } from "./types";
import { WorkoutBlockType, WorkoutBlockExercise } from "@/types/workoutBlocks";
import { Youtube, Timer, RefreshCw } from "lucide-react";

interface BaseBlockExecutorLayoutProps extends BaseBlockExecutorProps {
  // Section 1: Exercise Name
  exerciseName: string;

  // Section 2: Block Details
  blockDetails: BlockDetail[];

  // Section 3: Instructions
  instructions?: string;

  // Section 4: Progress
  currentSet: number;
  totalSets: number;
  progressLabel?: string;

  // Section 5: Logging Inputs (rendered by child)
  loggingInputs: React.ReactNode;

  // Section 6: Log Button
  logButton: React.ReactNode;

  // Section 7: Navigation
  showNavigation?: boolean;

  // Optional: Exercise actions
  currentExercise?: WorkoutBlockExercise;
  showRestTimer?: boolean;
}

export function BaseBlockExecutorLayout({
  block,
  exerciseName,
  blockDetails,
  instructions,
  currentSet,
  totalSets,
  progressLabel = "Set",
  loggingInputs,
  logButton,
  showNavigation = true,
  currentExercise,
  showRestTimer = false,
  allBlocks = [],
  currentBlockIndex = 0,
  onBlockChange,
  onVideoClick,
  onAlternativesClick,
  onRestTimerClick,
}: BaseBlockExecutorLayoutProps) {
  const { getThemeStyles } = useTheme();
  const theme = getThemeStyles();

  const totalBlocks = allBlocks.length || 1;
  const canGoPrevious = currentBlockIndex > 0;
  const canGoNext = currentBlockIndex < totalBlocks - 1;

  // Check if this block has multiple exercises
  const hasMultipleExercises = (block.block.exercises?.length || 0) > 1;

  // Only show general buttons for single-exercise blocks
  const shouldShowGeneralButtons = currentExercise && !hasMultipleExercises;

  const handlePrevious = () => {
    if (onBlockChange && canGoPrevious) {
      onBlockChange(currentBlockIndex - 1);
    }
  };

  const handleNext = () => {
    if (onBlockChange && canGoNext) {
      onBlockChange(currentBlockIndex + 1);
    }
  };

  return (
    <Card className={`${theme.card} border ${theme.border} shadow-lg`}>
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <BlockTypeBadge
            blockType={block.block.block_type}
            blockName={block.block.block_name}
          />
          <div className="text-right">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Block {block.block.block_order}
            </div>
          </div>
        </div>

        {/* Section 1: Exercise Name */}
        <CardTitle className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">
          {exerciseName}
        </CardTitle>

        {/* Exercise Actions */}
        {shouldShowGeneralButtons && (
          <div className="flex items-center gap-2 mb-4">
            {showRestTimer && onRestTimerClick && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRestTimerClick}
                className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                title="Start Rest Timer"
              >
                <Timer className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </Button>
            )}
            {currentExercise?.exercise?.video_url && onVideoClick && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  onVideoClick(
                    currentExercise.exercise?.video_url || "",
                    currentExercise.exercise?.name
                  )
                }
                className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                title="Watch Exercise Video"
              >
                <Youtube className="w-5 h-5 text-red-600 dark:text-red-400" />
              </Button>
            )}
            {currentExercise?.exercise_id && onAlternativesClick && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAlternativesClick(currentExercise.exercise_id)}
                className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                title="View Exercise Alternatives"
              >
                <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Section 2: Block Details Grid */}
        <BlockDetailsGrid details={blockDetails} />

        {/* Section 3: Instructions */}
        {instructions && <InstructionsBox instructions={instructions} />}

        {/* Section 4: Progress Indicator */}
        <ProgressIndicator
          current={currentSet}
          total={totalSets}
          label={progressLabel}
          showBar={true}
        />

        {/* Section 5: Logging Inputs */}
        <div className="space-y-4">{loggingInputs}</div>

        {/* Section 6: Log Button */}
        {logButton}

        {/* Section 7: Navigation */}
        {showNavigation && (
          <NavigationControls
            currentBlock={currentBlockIndex + 1}
            totalBlocks={totalBlocks}
            onPrevious={handlePrevious}
            onNext={handleNext}
            canGoPrevious={canGoPrevious}
            canGoNext={canGoNext}
          />
        )}
      </CardContent>
    </Card>
  );
}

// Utility function to format time
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Utility function to calculate suggested weight
export function calculateSuggestedWeightUtil(
  exerciseId: string,
  loadPercentage: number | null | undefined,
  e1rmMap: Record<string, number>
): number | null {
  if (!loadPercentage || loadPercentage <= 0) {
    return null;
  }

  const e1rm = e1rmMap[exerciseId];
  if (!e1rm || e1rm <= 0) {
    return null;
  }

  const suggested = e1rm * (loadPercentage / 100);
  // Round to nearest 0.5 kg
  return Math.round(suggested * 2) / 2;
}

// Utility function to format load percentage display
export function formatLoadPercentage(
  loadPercentage: number | null | undefined,
  suggestedWeight: number | null
): string | null {
  if (!loadPercentage || loadPercentage <= 0) {
    return null;
  }

  if (suggestedWeight !== null && suggestedWeight > 0) {
    return `${loadPercentage}% / ${suggestedWeight}kg`;
  }

  return `${loadPercentage}%`;
}
