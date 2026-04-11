"use client";

import React from "react";
import { ChevronLeft } from "lucide-react";
import type { PrescriptionItem } from "./ui/PrescriptionCard";
import { PrescriptionCard } from "./ui/PrescriptionCard";
import { InstructionsBox } from "./ui/InstructionsBox";
import { NavigationControls } from "./ui/NavigationControls";
import { ProgressionNudge } from "./ui/ProgressionNudge";
import { ExerciseActionButtons } from "./ui/ExerciseActionButtons";
import { LastSessionSetsSection } from "./ui/LastSessionSetsSection";
import { BaseBlockExecutorProps } from "./types";
import {
  WorkoutBlockType,
  WorkoutBlockExercise,
  WORKOUT_BLOCK_CONFIGS,
} from "@/types/workoutBlocks";

interface BaseBlockExecutorLayoutProps extends BaseBlockExecutorProps {
  exerciseName: string;
  prescriptionItems?: PrescriptionItem[];
  /** Keep 2 columns even with 5+ items (e.g. speed work). */
  prescriptionGridMode?: "default" | "two-column-only";
  instructions?: string;
  /** Set-entry specific coach notes (higher priority). */
  coachNotes?: string;
  /** Exercise-level general cues/instructions. */
  formCues?: string;
  currentSet: number;
  totalSets: number;
  progressLabel?: string;
  loggingInputs: React.ReactNode;
  logButton: React.ReactNode;
  /** Second region header inside unified PrescriptionCard (e.g. LOG SET 2). */
  logSectionTitle: string;
  showNavigation?: boolean;
  currentExercise?: WorkoutBlockExercise;
  showRestTimer?: boolean;
  progressionSuggestion?:
    | import("@/lib/clientProgressionService").ProgressionSuggestion
    | null;
  onApplySuggestion?: (weight: number | null, reps: number | null) => void;
  /** Renders after prescription/log card, before exercise nav (e.g. logged set history). */
  aboveStickyContent?: React.ReactNode;
}

export function BaseBlockExecutorLayout({
  block,
  exerciseName,
  prescriptionItems = [],
  prescriptionGridMode = "default",
  instructions,
  coachNotes,
  formCues,
  currentSet,
  totalSets: _totalSets,
  progressLabel: _progressLabel = "Set",
  loggingInputs,
  logButton,
  logSectionTitle,
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
  const normalizeNoteValue = (value: unknown): string | undefined => {
    if (value == null) return undefined;
    if (typeof value === "string") {
      const t = value.trim();
      return t.length > 0 ? t : undefined;
    }
    if (Array.isArray(value)) {
      const lines = value
        .map((v) => (typeof v === "string" ? v.trim() : ""))
        .filter(Boolean);
      return lines.length > 0 ? lines.join("\n") : undefined;
    }
    if (typeof value === "object") {
      try {
        const asRecord = value as Record<string, unknown>;
        const candidate = asRecord.instructions ?? asRecord.text ?? asRecord.value;
        if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
        return JSON.stringify(value);
      } catch {
        return undefined;
      }
    }
    return undefined;
  };

  const totalBlocks = allBlocks.length || 1;
  const canGoPrevious = currentBlockIndex > 0;
  const canGoNext = currentBlockIndex < totalBlocks - 1;
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

  const setType = (block.block.set_type as WorkoutBlockType) || "straight_set";
  const typeDisplay = (
    WORKOUT_BLOCK_CONFIGS[setType]?.name ?? "Straight Set"
  ).toUpperCase();
  const blockExercises = block.block.exercises ?? [];
  const exerciseCount = blockExercises.length || 1;
  const exercisePos = (currentExerciseIndex ?? 0) + 1;
  const multiExerciseHint =
    exerciseCount > 1
      ? `${typeDisplay} · EXERCISE ${exercisePos} OF ${exerciseCount}`
      : undefined;

  const compoundPrescriptionTitle =
    exerciseCount > 1
      ? (() => {
          const names = blockExercises.map(
            (e) => e.exercise?.name?.trim() || "Exercise",
          );
          if (names.length <= 1) return names[0] ?? exerciseName;
          if (names.length === 2) return `${names[0]} + ${names[1]}`;
          const more = names.length - 2;
          return `${names[0]} + ${names[1]} + ${more} more`;
        })()
      : exerciseName;

  const previousPerfEntry =
    currentExercise?.exercise_id && previousPerformanceMap
      ? previousPerformanceMap.get(currentExercise.exercise_id)
      : undefined;
  const lastWorkoutForLastWeek = previousPerfEntry?.lastWorkout ?? null;

  const resolvedPrescriptionItems = prescriptionItems;
  const resolvedCoachNotes = normalizeNoteValue(
    coachNotes ?? block.block.set_notes ?? instructions,
  );
  const resolvedFormCues = normalizeNoteValue(
    formCues ??
      (currentExercise as any)?.exercise?.instructions ??
      (currentExercise as any)?.exercise?.tips ??
      undefined,
  );

  const prescriptionGridClassName =
    prescriptionGridMode === "two-column-only"
      ? undefined
      : resolvedPrescriptionItems.length >= 5
        ? "sm:grid-cols-3"
        : undefined;

  const logSectionContent = (
    <>
      {loggingInputs}
      {logButton}
    </>
  );

  return (
    <div className="flex flex-col border-b border-white/5">
      {/* Scroll is the app <main>; avoid nested overflow-y here or the middle pane gets no height and won’t scroll. */}
      <div className="flex flex-col gap-3 px-4 pb-2 pt-1">
        {onWorkoutBack ? (
          <button
            type="button"
            onClick={onWorkoutBack}
            className="-ml-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white active:scale-95"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
        ) : null}
        {exerciseCount !== 1 ? (
          <ProgressionNudge
            suggestion={progressionSuggestion}
            previousPerformance={
              currentExercise?.exercise_id && previousPerformanceMap
                ? (previousPerformanceMap.get(currentExercise.exercise_id) ??
                  null)
                : null
            }
            previousSessionSetNumber={currentSet}
            showPreviousSession={false}
            onApplySuggestion={onApplySuggestion}
          />
        ) : null}

        <PrescriptionCard
          exerciseTitle={
            exerciseCount > 1 ? compoundPrescriptionTitle : exerciseName
          }
          setType={setType}
          multiExerciseHint={multiExerciseHint}
          titleActions={
            exerciseCount === 1 && currentExercise ? (
              <ExerciseActionButtons
                exercise={currentExercise as WorkoutBlockExercise}
                onVideoClick={onVideoClick}
                onAlternativesClick={onAlternativesClick}
              />
            ) : null
          }
          topAccessory={
            exerciseCount === 1 ? (
              <ProgressionNudge
                className="mb-0"
                suggestion={progressionSuggestion}
                previousPerformance={
                  currentExercise?.exercise_id && previousPerformanceMap
                    ? (previousPerformanceMap.get(
                        currentExercise.exercise_id,
                      ) ?? null)
                    : null
                }
                previousSessionSetNumber={currentSet}
                showPreviousSession
                onApplySuggestion={onApplySuggestion}
              />
            ) : undefined
          }
          prescriptionItems={resolvedPrescriptionItems}
          prescriptionGridClassName={prescriptionGridClassName}
          coachNotes={resolvedCoachNotes}
          formCues={resolvedFormCues}
          logSectionTitle={logSectionTitle}
          logSectionContent={logSectionContent}
        />

        {instructions && !resolvedCoachNotes && !resolvedFormCues ? (
          <InstructionsBox instructions={instructions} />
        ) : null}

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

      <LastSessionSetsSection lastWorkout={lastWorkoutForLastWeek} />
    </div>
  );
}

/** Rest duration for prescription display (numeric seconds + unit in card). */
export function formatRestSeconds(restSeconds: number): number {
  return restSeconds;
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
  e1rmMap: Record<string, number>,
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
  suggestedWeight: number | null,
): string | null {
  if (!loadPercentage || loadPercentage <= 0) {
    return null;
  }

  if (suggestedWeight !== null && suggestedWeight > 0) {
    return `${loadPercentage}% / ${suggestedWeight}kg`;
  }

  return `${loadPercentage}%`;
}
