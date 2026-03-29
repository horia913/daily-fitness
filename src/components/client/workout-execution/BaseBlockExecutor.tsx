"use client";

import React from "react";
import { ChevronLeft } from "lucide-react";
import { BlockDetailsGrid, BlockDetail } from "./ui/BlockDetailsGrid";
import { InstructionsBox } from "./ui/InstructionsBox";
import { NavigationControls } from "./ui/NavigationControls";
import { ProgressionNudge } from "./ui/ProgressionNudge";
import { ExerciseActionButtons } from "./ui/ExerciseActionButtons";
import { LastSessionSetsSection } from "./ui/LastSessionSetsSection";
import { BaseBlockExecutorProps } from "./types";
import { WorkoutBlockType, WorkoutBlockExercise, WORKOUT_BLOCK_CONFIGS } from "@/types/workoutBlocks";

interface BaseBlockExecutorLayoutProps extends BaseBlockExecutorProps {
  exerciseName: string;
  blockDetails: BlockDetail[];
  instructions?: string;
  currentSet: number;
  totalSets: number;
  progressLabel?: string;
  /** Set navigator + weight/reps (sticky at bottom). */
  loggingInputs: React.ReactNode;
  logButton: React.ReactNode;
  showNavigation?: boolean;
  currentExercise?: WorkoutBlockExercise;
  showRestTimer?: boolean;
  progressionSuggestion?: import("@/lib/clientProgressionService").ProgressionSuggestion | null;
  onApplySuggestion?: (weight: number | null, reps: number | null) => void;
  /** Renders after prescription, before exercise nav (e.g. logged set history). */
  aboveStickyContent?: React.ReactNode;
}

export function BaseBlockExecutorLayout({
  block,
  exerciseName,
  blockDetails,
  instructions,
  currentSet: _currentSet,
  totalSets: _totalSets,
  progressLabel: _progressLabel = "Set",
  loggingInputs,
  logButton,
  showNavigation = true,
  currentExercise,
  showRestTimer: _showRestTimer = false,
  allBlocks = [],
  currentBlockIndex = 0,
  currentExerciseIndex = 0,
  onBlockChange,
  onVideoClick,
  onAlternativesClick,
  onRestTimerClick: _onRestTimerClick,
  progressionSuggestion,
  previousPerformanceMap,
  onApplySuggestion,
  onWorkoutBack,
  aboveStickyContent,
}: BaseBlockExecutorLayoutProps) {
  const totalBlocks = allBlocks.length || 1;
  const canGoPrevious = currentBlockIndex > 0;
  const canGoNext = currentBlockIndex < totalBlocks - 1;
  const hasMultipleExercises = (block.block.exercises?.length || 0) > 1;
  const shouldShowHeaderActions = currentExercise && !hasMultipleExercises;

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

  const setType =
    (block.block.set_type as WorkoutBlockType) || "straight_set";
  const typeDisplay =
    (WORKOUT_BLOCK_CONFIGS[setType]?.name ?? "Straight Set").toUpperCase();
  const exerciseCount = block.block.exercises?.length ?? 1;
  const exercisePos = (currentExerciseIndex ?? 0) + 1;

  const previousPerfEntry =
    currentExercise?.exercise_id && previousPerformanceMap
      ? previousPerformanceMap.get(currentExercise.exercise_id)
      : undefined;
  const lastWorkoutForLastWeek = previousPerfEntry?.lastWorkout ?? null;

  return (
    <div className="flex flex-col border-b border-white/5">
      {/* Scroll is the app <main>; avoid nested overflow-y here or the middle pane gets no height and won’t scroll. */}
      {/* ~56px two-line header; set index lives only in bottom set navigator */}
      <header className="shrink-0 border-b border-white/5 px-4 pb-1 pt-2">
        <div className="flex h-7 items-center gap-2">
          {onWorkoutBack ? (
            <button
              type="button"
              onClick={onWorkoutBack}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full fc-surface border border-[color:var(--fc-surface-card-border)] fc-text-dim transition-all active:scale-95"
              aria-label="Back"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : (
            <span className="w-9 shrink-0" aria-hidden />
          )}
          <h1 className="min-w-0 flex-1 truncate text-base font-semibold fc-text-primary">
            {exerciseName}
          </h1>
          <span className="min-w-[3.25rem] shrink-0" aria-hidden />
        </div>
        <p className="mt-0.5 pl-[2.75rem] text-xs uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
          {typeDisplay}
          {exerciseCount > 1
            ? ` · Exercise ${exercisePos} of ${exerciseCount}`
            : ""}
        </p>
      </header>

      <div className="flex flex-col gap-3 px-4 pb-2 pt-2">
        <ProgressionNudge
          suggestion={progressionSuggestion}
          previousPerformance={
            currentExercise?.exercise_id && previousPerformanceMap
              ? previousPerformanceMap.get(currentExercise.exercise_id) ?? null
              : null
          }
          onApplySuggestion={onApplySuggestion}
        />

        {shouldShowHeaderActions && (
          <div className="flex items-center gap-2">
            <ExerciseActionButtons
              exercise={currentExercise as WorkoutBlockExercise}
              onVideoClick={onVideoClick}
              onAlternativesClick={onAlternativesClick}
            />
          </div>
        )}

        <BlockDetailsGrid details={blockDetails} />

        {instructions && <InstructionsBox instructions={instructions} />}

        {aboveStickyContent}

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
      </div>

      <div className="workout-input-area shrink-0">
        <div className="mx-auto w-full max-w-lg space-y-3 sm:max-w-none">
          {loggingInputs}
          {logButton}
        </div>
      </div>

      <LastSessionSetsSection lastWorkout={lastWorkoutForLastWeek} />
    </div>
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
