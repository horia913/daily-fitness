"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, ChevronLeft } from "lucide-react";
import { BaseSetEntryExecutorProps } from "../types";
import { useWorkoutExecutionChrome } from "../WorkoutExecutionChromeContext";
import { NavigationControls } from "../ui/NavigationControls";
import { ExerciseActionButtons } from "../ui/ExerciseActionButtons";
import { TabataTimerModal } from "../ui/TabataTimerModal";
import { LoggedSet } from "@/types/workoutSetEntries";
import { resolveSetPrescriptionTargets } from "../ui/set-rows/resolveSetPrescriptionTargets";
import {
  LiveCard,
  LiveCardExerciseName,
  LiveCardPrimary,
  LiveCardNote,
  LiveCardLog,
  LiveCardGlue,
  effortFromPrescribedRpe,
  groupIndexToHue,
  type LiveCardTarget,
} from "../live-card";

export function TabataExecutor({
  liveSetEntry,
  onSetEntryComplete,
  onNextSetEntry,
  e1rmMap = {},
  onE1rmUpdate,
  sessionId,
  assignmentId,
  allSetEntries = [],
  currentSetEntryIndex = 0,
  onSetEntryChange,
  currentExerciseIndex = 0,
  onExerciseIndexChange,
  logSetToDatabase,
  formatTime: formatTimeProp,
  calculateSuggestedWeight,
  onVideoClick,
  onAlternativesClick,
  onRestTimerClick,
  onWorkoutBack,
  previousPerformanceMap,
  progressionSuggestion,
}: BaseSetEntryExecutorProps) {
  const currentExercise = liveSetEntry.setEntry.exercises?.[currentExerciseIndex];
  const [showTimerModal, setShowTimerModal] = useState(false);

  const exerciseLookup: Record<string, { name: string }> = {};
  if (liveSetEntry.setEntry.exercises) {
    liveSetEntry.setEntry.exercises.forEach((ex) => {
      if (ex.exercise_id && ex.exercise) {
        exerciseLookup[ex.exercise_id] = { name: ex.exercise.name };
      }
    });
  }

  const tabataSets: any[] = [];
  const setsMap = new Map<number, any[]>();

  if (liveSetEntry.setEntry.exercises) {
    liveSetEntry.setEntry.exercises.forEach((ex) => {
      if (ex.time_protocols && Array.isArray(ex.time_protocols)) {
        ex.time_protocols.forEach((tp: any) => {
          if (tp.protocol_type === "tabata" && tp.set !== undefined && tp.set !== null) {
            const setNum = tp.set;
            if (!setsMap.has(setNum)) setsMap.set(setNum, []);
            setsMap.get(setNum)!.push({
              exercise_id: ex.exercise_id,
              work_seconds: tp.work_seconds || 20,
              rest_after: tp.rest_seconds || 10,
              target_reps: tp.target_reps,
            });
          }
        });
      }
    });
  }

  if (
    setsMap.size === 0 &&
    liveSetEntry.setEntry.time_protocols &&
    Array.isArray(liveSetEntry.setEntry.time_protocols)
  ) {
    liveSetEntry.setEntry.time_protocols.forEach((tp: any) => {
      if (
        tp.protocol_type === "tabata" &&
        tp.set !== undefined &&
        tp.set !== null &&
        tp.exercise_id
      ) {
        const setNum = tp.set;
        if (!setsMap.has(setNum)) setsMap.set(setNum, []);
        setsMap.get(setNum)!.push({
          exercise_id: tp.exercise_id,
          work_seconds: tp.work_seconds || 20,
          rest_after: tp.rest_seconds || 10,
          target_reps: tp.target_reps,
        });
      }
    });
  }

  const sortedSetNumbers = Array.from(setsMap.keys()).sort((a, b) => a - b);
  const firstTpFromBlock = liveSetEntry.setEntry.time_protocols?.[0];
  const firstTpFromExercise =
    liveSetEntry.setEntry.exercises?.[0]?.time_protocols?.[0];
  sortedSetNumbers.forEach((setNum) => {
    const exercises = setsMap.get(setNum) || [];
    const restAfterSet =
      firstTpFromExercise?.rest_after_set ??
      firstTpFromBlock?.rest_after_set ??
      null;
    tabataSets.push({
      exercises: exercises,
      rest_between_sets: restAfterSet,
    });
  });

  const rounds =
    liveSetEntry.setEntry.total_sets ||
    liveSetEntry.setEntry.exercises?.[0]?.time_protocols?.[0]?.rounds ||
    8;

  const firstTabataEx = tabataSets[0]?.exercises?.[0];
  const tabataWorkSec = firstTabataEx?.work_seconds ?? 20;
  const tabataRestSec = firstTabataEx?.rest_after ?? 10;

  const instructions =
    currentExercise?.notes ||
    liveSetEntry.setEntry.set_notes ||
    "Complete all exercises following the timer.";

  const handleComplete = () => {
    try {
      const loggedSetsArray: LoggedSet[] = [];
      onSetEntryComplete(liveSetEntry.setEntry.id, loggedSetsArray);
    } catch (error) {
      console.error("TabataExecutor: Error in handleComplete", error);
    }
  };

  const targets = resolveSetPrescriptionTargets(
    currentExercise,
    1,
    liveSetEntry.setEntry.reps_per_set,
  );
  const activeEffort = effortFromPrescribedRpe(targets.rpe);
  const liveTarget: LiveCardTarget = {
    kind: "time",
    seconds: tabataWorkSec,
    unit: "sec work",
  };

  const chrome = useWorkoutExecutionChrome();
  const hideCompactBack = chrome?.hideCompactBack ?? false;
  const totalSetEntries = allSetEntries.length || 1;
  const canGoPrevious = currentSetEntryIndex > 0;
  const canGoNext = currentSetEntryIndex < totalSetEntries - 1;

  /** Clock: static placeholder — live countdown lives in TabataTimerModal. */
  const glueClockPlaceholder = `0:${String(tabataWorkSec).padStart(2, "0")}`;

  return (
    <>
      <div className="flex flex-col border-b border-white/5">
        <div className="flex flex-col gap-3 px-0 pb-2 pt-1 sm:px-1">
          {onWorkoutBack && !hideCompactBack ? (
            <button
              type="button"
              onClick={onWorkoutBack}
              className="-ml-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white active:scale-95"
              aria-label="Back"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
          ) : null}

          <LiveCard
            hue={groupIndexToHue(currentSetEntryIndex)}
            heading={`Round 1 of ${rounds}`}
            status="logging"
            statusLabel="● Work"
          >
            <div>
              <LiveCardExerciseName
                name={currentExercise?.exercise?.name || "Tabata"}
                endSlot={
                  currentExercise ? (
                    <ExerciseActionButtons
                      exercise={currentExercise}
                      onVideoClick={onVideoClick}
                      onAlternativesClick={onAlternativesClick}
                    />
                  ) : undefined
                }
              />
            </div>
            <LiveCardPrimary target={liveTarget} effort={activeEffort} />
            {instructions ? (
              <LiveCardNote>{instructions}</LiveCardNote>
            ) : null}
            <LiveCardLog>
              <div className="flex flex-col gap-3">
                {tabataSets.length > 0 ? (
                  <Button
                    onClick={() => setShowTimerModal(true)}
                    variant="fc-primary"
                    className="w-full h-12 text-base font-bold uppercase tracking-wider rounded-xl"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Open Timer
                  </Button>
                ) : (
                  <p className="text-sm text-[color:var(--fc-text-dim)]">
                    No exercises configured for this Tabata block.
                  </p>
                )}
                <Button
                  onClick={handleComplete}
                  disabled={tabataSets.length === 0}
                  variant="fc-primary"
                  className="w-full h-12 text-base font-bold uppercase tracking-wider rounded-xl"
                >
                  Complete
                </Button>
              </div>
            </LiveCardLog>
            <LiveCardGlue timer={glueClockPlaceholder}>
              ↻ &nbsp;{tabataWorkSec} on · {tabataRestSec} off
            </LiveCardGlue>
          </LiveCard>

          <NavigationControls
            currentBlock={currentSetEntryIndex + 1}
            totalBlocks={totalSetEntries}
            onPrevious={() => {
              if (onSetEntryChange && canGoPrevious) {
                onSetEntryChange(currentSetEntryIndex - 1);
              }
            }}
            onNext={() => {
              if (onSetEntryChange && canGoNext) {
                onSetEntryChange(currentSetEntryIndex + 1);
              }
            }}
            canGoPrevious={canGoPrevious}
            canGoNext={canGoNext}
          />
        </div>
      </div>

      {showTimerModal && (
        <TabataTimerModal
          isOpen={showTimerModal}
          onClose={() => setShowTimerModal(false)}
          sets={tabataSets}
          totalRounds={rounds}
          exerciseLookup={exerciseLookup}
          onComplete={() => {
            setShowTimerModal(false);
            handleComplete();
          }}
        />
      )}
    </>
  );
}
