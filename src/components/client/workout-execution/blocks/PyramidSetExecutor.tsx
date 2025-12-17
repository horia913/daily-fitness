"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { TrendingUp, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import {
  BaseBlockExecutorLayout,
  formatLoadPercentage,
  calculateSuggestedWeightUtil,
} from "../BaseBlockExecutor";
import { LargeInput } from "../ui/LargeInput";
import { BlockDetail, BaseBlockExecutorProps } from "../types";
import { LoggedSet } from "@/types/workoutBlocks";

export function PyramidSetExecutor({
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
}: BaseBlockExecutorProps) {
  const { addToast } = useToast();
  const currentExercise = block.block.exercises?.[currentExerciseIndex];
  const totalSets = block.block.total_sets || 1;
  const currentSet = block.completedSets || 0;

  // Get progression from block parameters or use default
  const progression =
    (block.block.block_parameters as any)?.reps_progression ||
    Array.from({ length: totalSets }, (_, i) => (i + 1).toString());

  const [weights, setWeights] = useState<string[]>([]);
  const [reps, setReps] = useState<string[]>([]);
  const [isLoggingSet, setIsLoggingSet] = useState(false);

  // Initialize arrays with progression reps
  useEffect(() => {
    if (weights.length !== totalSets) {
      const suggestedWeight = currentExercise?.load_percentage
        ? calculateSuggestedWeightUtil(
            currentExercise.exercise_id,
            currentExercise.load_percentage,
            e1rmMap
          )
        : null;

      const initialWeights = new Array(totalSets).fill("");
      if (suggestedWeight) {
        for (let i = 0; i < totalSets; i++) {
          initialWeights[i] = suggestedWeight.toString();
        }
      }
      setWeights(initialWeights);

      // Pre-fill reps with progression values
      const initialReps = progression.map((val: string | number) =>
        val.toString()
      );
      setReps(initialReps);
    }
  }, [
    totalSets,
    progression,
    currentExercise?.exercise_id,
    currentExercise?.load_percentage,
    e1rmMap,
  ]);

  // Block details
  const blockDetails: BlockDetail[] = [
    {
      label: "STEPS",
      value: totalSets,
    },
    {
      label: "PROGRESSION",
      value: progression.join(", "),
    },
    {
      label: "REST",
      value: block.block.rest_seconds || currentExercise?.rest_seconds || 90,
      unit: "s",
    },
  ];

  if (currentExercise?.load_percentage) {
    const suggestedWeight = calculateSuggestedWeightUtil(
      currentExercise.exercise_id,
      currentExercise.load_percentage,
      e1rmMap
    );
    const loadDisplay = formatLoadPercentage(
      currentExercise.load_percentage,
      suggestedWeight
    );
    if (loadDisplay) {
      blockDetails.push({
        label: "LOAD",
        value: loadDisplay,
      });
    }
  }

  const instructions =
    currentExercise?.notes || block.block.block_notes || undefined;

  const handleLog = async () => {
    if (!currentExercise || isLoggingSet) return;

    const allValid = weights.every(
      (weight, index) => {
        const weightNum = parseFloat(weight || "");
        const repsStr = reps[index] || "";
        const repsNum = parseInt(repsStr);
        return weight &&
          weight.trim() !== "" &&
          !isNaN(weightNum) &&
          weightNum >= 0 &&
          repsStr &&
          repsStr.trim() !== "" &&
          !isNaN(repsNum) &&
          repsNum > 0;
      }
    );

    if (!allValid) {
      addToast({
        title: "Invalid Input",
        description: "Please enter valid weight and reps for all pyramid levels",
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

    // Log each pyramid level
    const loggedSetsArray: LoggedSet[] = [];
    let allSuccess = true;

    for (let idx = 0; idx < totalSets; idx++) {
      const weightNum = parseFloat(weights[idx]);
      const repsNum = parseInt(reps[idx]);

      const logData: any = {
        block_type: 'pyramid_set',
        pyramid_step_number: idx + 1,
      };
      
      // Only add fields if they're defined
      if (currentExercise?.exercise_id) logData.exercise_id = currentExercise.exercise_id;
      if (weightNum !== undefined && weightNum !== null && !isNaN(weightNum)) logData.weight = weightNum;
      if (repsNum !== undefined && repsNum !== null && !isNaN(repsNum)) logData.reps = repsNum;
      
      const result = await logSetToDatabase(logData);

      if (result.success) {
        loggedSetsArray.push({
          id: `temp-${idx}-${Date.now()}`,
          exercise_id: currentExercise.exercise_id,
          block_id: block.block.id,
          set_number: idx + 1,
          weight_kg: weightNum,
          reps_completed: repsNum,
          completed_at: new Date(),
        } as LoggedSet);

        if (result.e1rm && onE1rmUpdate && idx === 0) {
          onE1rmUpdate(currentExercise.exercise_id, result.e1rm);
        }
      } else {
        allSuccess = false;
      }
    }

    if (allSuccess) {
      addToast({
        title: "Pyramid Set Logged!",
        description: `${totalSets} levels completed`,
        variant: "success",
        duration: 2000,
      });

      // Clear inputs
      const suggestedWeight = currentExercise?.load_percentage
        ? calculateSuggestedWeightUtil(
            currentExercise.exercise_id,
            currentExercise.load_percentage,
            e1rmMap
          )
        : null;

      const newWeights = new Array(totalSets).fill("");
      if (suggestedWeight) {
        for (let i = 0; i < totalSets; i++) {
          newWeights[i] = suggestedWeight.toString();
        }
      }
      setWeights(newWeights);
      setReps(progression.map((val: string | number) => val.toString()));

      // Complete block
      onBlockComplete(block.block.id, loggedSetsArray);
    } else {
      addToast({
        title: "Failed to Save",
        description: "Some levels failed to save. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    }

    setIsLoggingSet(false);
  };

  const loggingInputs = (
    <div className="space-y-4">
      {Array.from({ length: totalSets }, (_, index) => (
        <div
          key={index}
          className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700"
        >
          <h4 className="font-semibold text-slate-800 dark:text-white mb-4 text-lg">
            Step {index + 1} of {totalSets} ({progression[index]} reps)
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <LargeInput
              label="Weight"
              value={weights[index] || ""}
              onChange={(value) => {
                const newWeights = [...weights];
                newWeights[index] = value;
                setWeights(newWeights);
              }}
              placeholder="0"
              step="0.5"
              unit="kg"
            />
            <LargeInput
              label="Reps"
              value={reps[index] || progression[index]?.toString() || ""}
              onChange={(value) => {
                const newReps = [...reps];
                newReps[index] = value;
                setReps(newReps);
              }}
              placeholder={progression[index]?.toString() || "0"}
              step="1"
            />
          </div>
        </div>
      ))}
    </div>
  );

  const logButton = (
    <Button
      onClick={handleLog}
      disabled={isLoggingSet}
      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-lg py-4"
    >
      <TrendingUp className="w-5 h-5 mr-2" />
      {isLoggingSet ? "Logging..." : "LOG PYRAMID SET"}
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
      exerciseName={currentExercise?.exercise?.name || "Exercise"}
      blockDetails={blockDetails}
      instructions={instructions}
      currentSet={currentSet}
      totalSets={totalSets}
      progressLabel="Step"
      loggingInputs={loggingInputs}
      logButton={logButton}
      showNavigation={true}
      currentExercise={currentExercise}
      showRestTimer={
        !!(block.block.rest_seconds || currentExercise?.rest_seconds)
      }
    />
  );
}
