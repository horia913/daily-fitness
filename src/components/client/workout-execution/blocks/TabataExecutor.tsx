"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CloudLightning, CheckCircle, Play } from "lucide-react";
import { BaseBlockExecutorLayout } from "../BaseBlockExecutor";
import { BlockDetail, BaseBlockExecutorProps } from "../types";
import { TabataCircuitTimerModal } from "../ui/TabataCircuitTimerModal";
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
}: BaseBlockExecutorProps) {
  const currentExercise = block.block.exercises?.[currentExerciseIndex];
  const [showTimerModal, setShowTimerModal] = useState(false);

  // Get tabata_sets from block_parameters or exercise meta
  const tabataSets = 
    (block.block.block_parameters as any)?.tabata_sets ||
    (currentExercise as any)?.meta?.tabata_sets ||
    (currentExercise as any)?.tabata_sets ||
    [];

  // Get rounds from block_parameters
  const rounds = (block.block.block_parameters as any)?.rounds || 8;

  // Build exercise lookup
  const exerciseLookup: Record<string, { name: string }> = {};
  if (block.block.exercises) {
    block.block.exercises.forEach((ex) => {
      if (ex.exercise_id && ex.exercise) {
        exerciseLookup[ex.exercise_id] = { name: ex.exercise.name };
      }
    });
  }

  // Also add exercises from tabata_sets
  tabataSets.forEach((set: any) => {
    if (set.exercises) {
      set.exercises.forEach((ex: any) => {
        if (ex.exercise_id && !exerciseLookup[ex.exercise_id]) {
          // Try to find exercise name from block exercises
          const blockEx = block.block.exercises?.find(
            (be) => be.exercise_id === ex.exercise_id
          );
          if (blockEx?.exercise) {
            exerciseLookup[ex.exercise_id] = { name: blockEx.exercise.name };
          } else {
            exerciseLookup[ex.exercise_id] = { name: "Exercise" };
          }
        }
      });
    }
  });

  // Block details
  const blockDetails: BlockDetail[] = [
    {
      label: "ROUNDS",
      value: rounds,
    },
  ];

  const instructions =
    currentExercise?.notes ||
    block.block.block_notes ||
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
              className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Set {setIndex + 1}
                </h3>
                {set.rest_between_sets && (
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Rest After: {set.rest_between_sets}s
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {set.exercises?.map((exercise: any, exIndex: number) => (
                  <div
                    key={exIndex}
                    className="bg-white dark:bg-slate-700 rounded-lg p-3 border border-slate-200 dark:border-slate-600"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {exerciseLookup[exercise.exercise_id]?.name || "Exercise"}
                        </div>
                        <div className="flex gap-4 mt-1 text-sm text-slate-600 dark:text-slate-400">
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
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          No exercises configured for this Tabata block.
        </div>
      )}

      {/* Open Timer Modal Button */}
      {tabataSets.length > 0 && (
        <Button
          onClick={() => setShowTimerModal(true)}
          className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white text-lg py-4"
        >
          <Play className="w-5 h-5 mr-2" />
          Open Timer
        </Button>
      )}
    </div>
  );

  // Complete button (no set logging)
  const completeButton = (
    <Button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("TabataExecutor: Complete Block button clicked");
        handleComplete();
      }}
      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-lg py-4"
    >
      <CheckCircle className="w-5 h-5 mr-2" />
      Complete Block
    </Button>
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
        }}
        exerciseName={currentExercise?.exercise?.name || "Tabata"}
        blockDetails={blockDetails}
        instructions={instructions}
        currentSet={1}
        totalSets={rounds}
        progressLabel="Round"
        loggingInputs={loggingInputs}
        logButton={completeButton}
        showNavigation={true}
        currentExercise={currentExercise}
        showRestTimer={false}
      />

      {/* Timer Modal */}
      {showTimerModal && (
        <TabataCircuitTimerModal
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
