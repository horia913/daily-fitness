"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CloudLightning, Play, RotateCw, Zap, Timer } from "lucide-react";
import { BaseBlockExecutorLayout } from "../BaseBlockExecutor";
import { BaseBlockExecutorProps } from "../types";
import type { PrescriptionItem } from "../ui/PrescriptionCard";
import { ExerciseActionButtons } from "../ui/ExerciseActionButtons";
import { LogSetButton } from "../ui/LogSetButton";
import { TabataTimerModal } from "../ui/TabataTimerModal";
import { LoggedSet } from "@/types/workoutBlocks";
export function TabataExecutor({
  block,
  onBlockComplete,
  onNextBlock,
  e1rmMap = {},
  onE1rmUpdate,
  sessionId,
  assignmentId,
  allBlocks = [],
  currentBlockIndex = 0,
  onBlockChange,
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
}: BaseBlockExecutorProps) {
  const currentExercise = block.block.exercises?.[currentExerciseIndex];
  const [showTimerModal, setShowTimerModal] = useState(false);

  // Build exercise lookup from block.block.exercises
  const exerciseLookup: Record<string, { name: string }> = {};
  if (block.block.exercises) {
    block.block.exercises.forEach((ex) => {
      if (ex.exercise_id && ex.exercise) {
        exerciseLookup[ex.exercise_id] = { name: ex.exercise.name };
      }
    });
  }

  // Transform time_protocols data into tabataSets structure
  // For tabata, exercises are grouped by 'set' number in time_protocols
  const tabataSets: any[] = [];
  const setsMap = new Map<number, any[]>();

  // 1) Prefer exercise-level time_protocols
  if (block.block.exercises) {
    block.block.exercises.forEach((ex) => {
      if (ex.time_protocols && Array.isArray(ex.time_protocols)) {
        ex.time_protocols.forEach((tp: any) => {
          if (tp.protocol_type === 'tabata' && tp.set !== undefined && tp.set !== null) {
            const setNum = tp.set;
            if (!setsMap.has(setNum)) {
              setsMap.set(setNum, []);
            }
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

  // 2) Fallback: use block-level time_protocols (API often returns only block-level)
  if (setsMap.size === 0 && block.block.time_protocols && Array.isArray(block.block.time_protocols)) {
    block.block.time_protocols.forEach((tp: any) => {
      if (tp.protocol_type === 'tabata' && (tp.set !== undefined && tp.set !== null) && tp.exercise_id) {
        const setNum = tp.set;
        if (!setsMap.has(setNum)) {
          setsMap.set(setNum, []);
        }
        setsMap.get(setNum)!.push({
          exercise_id: tp.exercise_id,
          work_seconds: tp.work_seconds || 20,
          rest_after: tp.rest_seconds || 10,
          target_reps: tp.target_reps,
        });
      }
    });
  }

  // Convert setsMap to tabataSets array, sorted by set number
  const sortedSetNumbers = Array.from(setsMap.keys()).sort((a, b) => a - b);
  const firstTpFromBlock = block.block.time_protocols?.[0];
  const firstTpFromExercise = block.block.exercises?.[0]?.time_protocols?.[0];
  sortedSetNumbers.forEach((setNum) => {
    const exercises = setsMap.get(setNum) || [];
    const restAfterSet = firstTpFromExercise?.rest_after_set ?? firstTpFromBlock?.rest_after_set ?? null;
    tabataSets.push({
      exercises: exercises,
      rest_between_sets: restAfterSet,
    });
  });

  // Get rounds from block.total_sets or from time_protocols
  const rounds = block.block.total_sets || 
    (block.block.exercises?.[0]?.time_protocols?.[0]?.rounds) || 
    8;

  const firstTabataEx = tabataSets[0]?.exercises?.[0];
  const tabataWorkSec = firstTabataEx?.work_seconds ?? 20;
  const tabataRestSec = firstTabataEx?.rest_after ?? 10;

  const prescriptionItems: PrescriptionItem[] = [
    { icon: RotateCw, label: "Rounds", value: rounds },
    { icon: Zap, label: "Work", value: tabataWorkSec, unit: "s" },
    { icon: Timer, label: "Rest", value: tabataRestSec, unit: "s" },
  ];

  const instructions =
    currentExercise?.notes ||
    block.block.set_notes ||
    "Complete all exercises following the timer.";

  const handleComplete = () => {
    console.log("TabataExecutor: handleComplete called", {
      blockId: block.block.id,
      onBlockComplete: typeof onBlockComplete,
    });
    try {
      const loggedSetsArray: LoggedSet[] = [];
      onBlockComplete(block.block.id, loggedSetsArray);
      console.log("TabataExecutor: onBlockComplete called successfully");
    } catch (error) {
      console.error("TabataExecutor: Error in handleComplete", error);
    }
  };

  // Display exercise list
  const loggingInputs = (
    <div className="space-y-4">
      {/* Exercise List */}
      {tabataSets.length > 0 ? (
        <div className="space-y-4">
          {tabataSets.map((set: any, setIndex: number) => (
            <div
              key={setIndex}
              className="p-4 rounded-xl"
              style={{ background: "var(--fc-surface-sunken)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold fc-text-primary">
                  Set {setIndex + 1}
                </h3>
                {set.rest_between_sets && (
                  <div className="text-sm fc-text-dim">
                    Rest After: {set.rest_between_sets}s
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {set.exercises?.map((exercise: any, exIndex: number) => {
                  const exerciseMeta = block.block.exercises?.find(
                    (ex) => ex.exercise_id === exercise.exercise_id,
                  );
                  return (
                  <div
                    key={exIndex}
                    className="rounded-lg p-3 border border-[color:var(--fc-surface-card-border)]"
                    style={{ background: "var(--fc-surface-card)" }}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="min-w-0 flex-1 font-medium fc-text-primary">
                          {exerciseLookup[exercise.exercise_id]?.name ||
                            "Exercise"}
                        </span>
                        {exerciseMeta ? (
                          <div className="shrink-0 pt-0.5">
                            <ExerciseActionButtons
                              exercise={exerciseMeta}
                              onVideoClick={onVideoClick}
                              onAlternativesClick={onAlternativesClick}
                            />
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm fc-text-dim">
                        {exercise.work_seconds && (
                          <span>Work: {exercise.work_seconds}s</span>
                        )}
                        {exercise.rest_after && (
                          <span>Rest: {exercise.rest_after}s</span>
                        )}
                        {exercise.target_reps && (
                          <span>Reps: {exercise.target_reps}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 fc-text-dim">
          No exercises configured for this Tabata block.
        </div>
      )}

      {/* Open Timer Modal Button */}
      {tabataSets.length > 0 && (
        <Button
          onClick={() => setShowTimerModal(true)}
          variant="fc-primary"
          className="w-full h-12 text-base font-bold uppercase tracking-wider rounded-xl"
        >
          <Play className="w-5 h-5 mr-2" />
          Open Timer
        </Button>
      )}
    </div>
  );

  // Complete button (no set logging)
  const completeButton = (
    <LogSetButton
      onClick={handleComplete}
      ready={tabataSets.length > 0}
      label="Complete block"
    />
  );

  return (
    <>
      <BaseBlockExecutorLayout
        {...{
          block,
          onBlockComplete,
          onNextBlock,
          e1rmMap,
          onE1rmUpdate,
          sessionId,
          assignmentId,
          allBlocks,
          currentBlockIndex,
          onBlockChange,
          currentExerciseIndex,
          onExerciseIndexChange,
          logSetToDatabase,
          formatTime: formatTimeProp,
          calculateSuggestedWeight,
          onVideoClick,
          onAlternativesClick,
          onRestTimerClick,
          onWorkoutBack,
          previousPerformanceMap,
        }}
        exerciseName={currentExercise?.exercise?.name || "Tabata"}
        prescriptionItems={prescriptionItems}
        instructions={instructions}
        currentSet={1}
        totalSets={rounds}
        progressLabel="Round"
        loggingInputs={loggingInputs}
        logButton={completeButton}
        logSectionTitle="LOG BLOCK RESULT"
        showNavigation={true}
        currentExercise={currentExercise}
        showRestTimer={false}
      />

      {/* Timer Modal */}
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
