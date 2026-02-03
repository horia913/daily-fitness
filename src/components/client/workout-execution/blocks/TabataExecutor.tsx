"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CloudLightning, CheckCircle, Play } from "lucide-react";
import { BaseBlockExecutorLayout } from "../BaseBlockExecutor";
import { BlockDetail, BaseBlockExecutorProps } from "../types";
import { TabataCircuitTimerModal } from "../ui/TabataCircuitTimerModal";
import { ExerciseActionButtons } from "../ui/ExerciseActionButtons";
import { LoggedSet } from "@/types/workoutBlocks";
import { GlassCard } from "@/components/ui/GlassCard";

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
  
  // Group by set number; allow same exercise multiple times (e.g. Side Plank left + right as one exercise, added twice)
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

  // Convert setsMap to tabataSets array, sorted by set number
  const sortedSetNumbers = Array.from(setsMap.keys()).sort((a, b) => a - b);
  sortedSetNumbers.forEach((setNum) => {
    const exercises = setsMap.get(setNum) || [];
    // Get rest_after_set from first time_protocol (it's block-level, same for all)
    const firstTp = block.block.exercises?.[0]?.time_protocols?.[0];
    const restAfterSet = firstTp?.rest_after_set || null;
    
    tabataSets.push({
      exercises: exercises,
      rest_between_sets: restAfterSet,
    });
  });

  // Get rounds from block.total_sets or from time_protocols
  const rounds = block.block.total_sets || 
    (block.block.exercises?.[0]?.time_protocols?.[0]?.rounds) || 
    8;

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
            <GlassCard
              key={setIndex}
              elevation={1}
              className="p-4"
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
                {set.exercises?.map((exercise: any, exIndex: number) => {
                  const exerciseMeta = block.block.exercises?.find(
                    (ex) => ex.exercise_id === exercise.exercise_id
                  );
                  return (
                  <div
                    key={exIndex}
                    className="bg-white dark:bg-slate-700 rounded-lg p-3 border border-slate-200 dark:border-slate-600"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {exerciseLookup[exercise.exercise_id]?.name || "Exercise"}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
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
                      {exerciseMeta && (
                        <ExerciseActionButtons
                          exercise={exerciseMeta}
                          onVideoClick={onVideoClick}
                          onAlternativesClick={onAlternativesClick}
                        />
                      )}
                    </div>
                  </div>
                );
                })}
              </div>
            </GlassCard>
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
