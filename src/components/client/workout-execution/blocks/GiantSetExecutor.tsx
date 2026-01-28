"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Flame, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import {
  BaseBlockExecutorLayout,
  formatLoadPercentage,
  calculateSuggestedWeightUtil,
} from "../BaseBlockExecutor";
import { LargeInput } from "../ui/LargeInput";
import { ExerciseActionButtons } from "../ui/ExerciseActionButtons";
import { BlockDetail, BaseBlockExecutorProps } from "../types";
import { LoggedSet } from "@/types/workoutBlocks";
import { GlassCard } from "@/components/ui/GlassCard";
import { useLoggingReset } from "../hooks/useLoggingReset";

export function GiantSetExecutor({
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
  formatTime,
  calculateSuggestedWeight,
  onVideoClick,
  onAlternativesClick,
  onRestTimerClick,
  onSetComplete,
}: BaseBlockExecutorProps) {
  const { addToast } = useToast();
  const exercises = block.block.exercises || [];
  const totalSets = block.block.total_sets || 1;
  const completedSets = block.completedSets || 0;
  const currentSet = completedSets;

  const [weights, setWeights] = useState<string[]>([]);
  const [reps, setReps] = useState<string[]>([]);
  const [isLoggingSet, setIsLoggingSet] = useState(false);
  useLoggingReset(isLoggingSet, setIsLoggingSet);

  // Initialize arrays and recalculate suggested weights when exercises or e1rmMap changes
  useEffect(() => {
    if (exercises.length > 0) {
      // Only update if weights array is empty or length doesn't match
      const shouldInitialize = weights.length === 0 || weights.length !== exercises.length;
      
      if (shouldInitialize) {
        const initialWeights = exercises.map((ex) => {
          // Only set suggested weight if e1rmMap has data
          const hasE1rm = ex.exercise_id && e1rmMap[ex.exercise_id] && e1rmMap[ex.exercise_id] > 0;
          
          if (hasE1rm && ex.load_percentage) {
            const suggested = calculateSuggestedWeightUtil(
              ex.exercise_id,
              ex.load_percentage,
              e1rmMap
            );
            if (suggested && suggested > 0) {
              return suggested.toString();
            }
          }
          return "";
        });
        setWeights(initialWeights);
        setReps(new Array(exercises.length).fill(""));
      }
    }
  }, [exercises, e1rmMap]); // Removed 'weights' from dependencies to prevent infinite loop

  // Block details
  const blockDetails: BlockDetail[] = [
    {
      label: "ROUNDS",
      value: totalSets,
    },
    {
      label: "REST BETWEEN",
      value: block.block.rest_seconds || 90,
      unit: "s",
    },
  ];

  // Add exercises list
  exercises.forEach((ex, idx) => {
    if (ex.reps) {
      blockDetails.push({
        label: `${idx + 1}. ${ex.exercise?.name || `Exercise ${idx + 1}`}`,
        value: `${ex.reps} reps`,
      });
      if (ex.load_percentage) {
        const suggestedWeight = calculateSuggestedWeightUtil(
          ex.exercise_id,
          ex.load_percentage,
          e1rmMap
        );
        const loadDisplay = formatLoadPercentage(
          ex.load_percentage,
          suggestedWeight
        );
        if (loadDisplay) {
          blockDetails.push({
            label: `LOAD (${idx + 1})`,
            value: loadDisplay,
          });
        }
      }
    }
  });

  const instructions = block.block.block_notes || undefined;

  const handleLog = async () => {
    if (exercises.length === 0 || isLoggingSet) return;

    const allValid = exercises.every((_, idx) => {
      const weightStr = weights[idx];
      const repsStr = reps[idx];
      
      // Check weight: must be entered (not empty or undefined), valid number, and >= 0
      // Allow "0" as a valid weight value
      if (weightStr === undefined || weightStr === null || String(weightStr).trim() === "") {
        console.log(`GiantSet: Exercise ${idx} weight invalid:`, weightStr);
        return false;
      }
      const weight = parseFloat(String(weightStr));
      if (isNaN(weight) || weight < 0) {
        console.log(`GiantSet: Exercise ${idx} weight parse failed:`, weightStr, weight);
        return false;
      }
      
      // Check reps: must be entered (not empty or undefined), valid number, and > 0
      if (repsStr === undefined || repsStr === null || String(repsStr).trim() === "") {
        console.log(`GiantSet: Exercise ${idx} reps invalid:`, repsStr);
        return false;
      }
      const repsNum = parseInt(String(repsStr));
      if (isNaN(repsNum) || repsNum <= 0) {
        console.log(`GiantSet: Exercise ${idx} reps parse failed:`, repsStr, repsNum);
        return false;
      }
      
      return true;
    });

    if (!allValid) {
      addToast({
        title: "Invalid Input",
        description: "Please enter valid weight and reps for all exercises",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    setIsLoggingSet(true);

    try {
      if ("vibrate" in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
    } catch (e) {}

    try {
      // Build giant_set_exercises array - only include valid exercises
      const giantSetExercises = exercises
        .map((exercise, idx) => {
          const weightNum = parseFloat(weights[idx] || "0");
          const repsNum = parseInt(reps[idx] || "0");
          if (!exercise?.exercise_id || isNaN(weightNum) || isNaN(repsNum)) {
            return null;
          }
          return {
            exercise_id: exercise.exercise_id,
            weight: weightNum,
            reps: repsNum,
            order: idx + 1,
          };
        })
        .filter(Boolean);

      // Log giant set as a single call
      const logData: any = {
        block_type: 'giant_set',
        round_number: completedSets + 1,
      };
      
      if (giantSetExercises.length > 0) {
        logData.giant_set_exercises = giantSetExercises;
      }
      
      const result = await logSetToDatabase(logData);

      // Build logged sets array for UI
      const loggedSetsArray: LoggedSet[] = exercises.map((exercise, idx) => ({
        id: `temp-${idx}-${Date.now()}`,
        exercise_id: exercise.exercise_id,
        block_id: block.block.id,
        set_number: completedSets + 1,
        weight_kg: parseFloat(weights[idx] || "0"),
        reps_completed: parseInt(reps[idx] || "0"),
        completed_at: new Date(),
      } as LoggedSet));

      const allSuccess = result.success;

      if (allSuccess) {
        addToast({
          title: "Giant Set Logged!",
          description: `${exercises.length} exercises completed`,
          variant: "success",
          duration: 2000,
        });

        // Update parent with new completed sets count
        const newCompletedSets = completedSets + 1;
        onSetComplete?.(newCompletedSets);

        // Complete block if last set
        if (newCompletedSets >= totalSets) {
          onBlockComplete(block.block.id, loggedSetsArray);
        } else {
          // Check if rest timer will show - if so, don't clear inputs yet
          const currentExercise = exercises[currentExerciseIndex || 0];
          const restSeconds = currentExercise?.rest_seconds || block.block.rest_seconds || 0;
          if (restSeconds === 0) {
            // No rest timer, clear inputs immediately
            const newWeights = exercises.map((ex) => {
              if (ex.load_percentage) {
                const suggested = calculateSuggestedWeightUtil(
                  ex.exercise_id,
                  ex.load_percentage,
                  e1rmMap
                );
                return suggested ? suggested.toString() : "";
              }
              return "";
            });
            setWeights(newWeights);
            setReps(new Array(exercises.length).fill(""));
          }
          // If restSeconds > 0, rest timer will show and inputs will be cleared
          // when the timer completes and completedSets updates
        }
      } else {
        addToast({
          title: "Failed to Save",
          description: "Some exercises failed to save. Please try again.",
          variant: "destructive",
          duration: 5000,
        });
      }
    } finally {
      setIsLoggingSet(false);
    }
  };

  const loggingInputs = (
    <div className="space-y-4">
      {exercises.map((exercise, idx) => (
        <GlassCard
          key={exercise.id || idx}
          elevation={1}
          className="p-4"
        >
          <div className="mb-4">
            <h4 className="font-semibold text-slate-800 dark:text-white text-lg">
              {idx + 1}. {exercise.exercise?.name || `Exercise ${idx + 1}`}
              {exercise.exercise_letter && ` (${exercise.exercise_letter})`}
            </h4>
            <ExerciseActionButtons
              exercise={exercise}
              onVideoClick={onVideoClick}
              onAlternativesClick={onAlternativesClick}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <LargeInput
              label="Weight"
              value={weights[idx] || ""}
              onChange={(value) => {
                const newWeights = [...weights];
                newWeights[idx] = value;
                setWeights(newWeights);
              }}
              placeholder="0"
              step="0.5"
              unit="kg"
              showStepper
              stepAmount={2.5}
            />
            <LargeInput
              label="Reps"
              value={reps[idx] || ""}
              onChange={(value) => {
                const newReps = [...reps];
                newReps[idx] = value;
                setReps(newReps);
              }}
              placeholder="0"
              step="1"
              showStepper
              stepAmount={1}
            />
          </div>
        </GlassCard>
      ))}
    </div>
  );

  const logButton = (
    <Button
      onClick={handleLog}
      disabled={isLoggingSet}
      className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white text-lg py-4"
    >
      <Flame className="w-5 h-5 mr-2" />
      {isLoggingSet ? "Logging..." : "LOG GIANT SET"}
    </Button>
  );

  return (
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
        formatTime,
        calculateSuggestedWeight,
        onVideoClick,
        onAlternativesClick,
        onRestTimerClick,
      }}
      exerciseName={`Giant Set: ${exercises.length} Exercises`}
      blockDetails={blockDetails}
      instructions={instructions}
      currentSet={currentSet}
      totalSets={totalSets}
      progressLabel="Round"
      loggingInputs={loggingInputs}
      logButton={logButton}
      showNavigation={true}
      currentExercise={exercises[0]}
      showRestTimer={!!block.block.rest_seconds}
    />
  );
}
