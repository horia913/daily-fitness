"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import { LargeInput } from "../ui/LargeInput";
import { BlockDetail, BaseBlockExecutorProps } from "../types";
import {
  BaseBlockExecutorLayout,
  formatLoadPercentage,
  calculateSuggestedWeightUtil,
} from "../BaseBlockExecutor";
import { LoggedSet } from "@/types/workoutBlocks";

interface StraightSetExecutorProps extends BaseBlockExecutorProps {}

export function StraightSetExecutor({
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
}: StraightSetExecutorProps) {
  const { addToast } = useToast();
  const currentExercise = block.block.exercises?.[currentExerciseIndex];
  const totalSets = block.block.total_sets || 1;
  const completedSets = block.completedSets || 0;

  // Use block.completedSets for progress display (1-indexed)
  const currentSetNumber = completedSets + 1;
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [isLoggingSet, setIsLoggingSet] = useState(false);
  const [loggedSetsArray, setLoggedSetsArray] = useState<LoggedSet[]>([]);

  // Pre-fill with suggested weight when set number or exercise changes
  useEffect(() => {
    if (currentExercise?.load_percentage && currentExercise?.exercise_id) {
      const suggestedWeight = calculateSuggestedWeightUtil(
        currentExercise.exercise_id,
        currentExercise.load_percentage,
        e1rmMap
      );
      if (suggestedWeight && suggestedWeight > 0) {
        setWeight(suggestedWeight.toString());
      } else {
        setWeight("");
      }
    } else {
      setWeight("");
    }
    setReps("");
  }, [
    completedSets,
    currentExerciseIndex,
    currentExercise?.exercise_id,
    currentExercise?.load_percentage,
    e1rmMap,
  ]);

  // Get block details for display
  const blockDetails: BlockDetail[] = [
    {
      label: "SETS",
      value: totalSets,
    },
    {
      label: "REPS",
      value: currentExercise?.reps || block.block.reps_per_set || "-",
    },
    {
      label: "REST",
      value: currentExercise?.rest_seconds || block.block.rest_seconds || 60,
      unit: "s",
    },
  ];

  // Add LOAD if available
  const loadPercentage = currentExercise?.load_percentage;
  if (
    loadPercentage !== null &&
    loadPercentage !== undefined &&
    currentExercise?.exercise_id
  ) {
    const suggestedWeight = calculateSuggestedWeightUtil(
      currentExercise.exercise_id,
      loadPercentage,
      e1rmMap
    );
    const loadDisplay = formatLoadPercentage(loadPercentage, suggestedWeight);
    if (loadDisplay) {
      blockDetails.push({
        label: "LOAD",
        value: loadDisplay,
      });
    }
  }

  // Add TEMPO if available
  if (currentExercise?.tempo) {
    blockDetails.push({
      label: "TEMPO",
      value: currentExercise.tempo,
    });
  }

  // Add RIR if available
  if (currentExercise?.rir !== null && currentExercise?.rir !== undefined) {
    blockDetails.push({
      label: "RIR",
      value: currentExercise.rir,
    });
  }

  // Instructions
  const instructions =
    currentExercise?.notes || block.block.block_notes || undefined;

  // Handle logging one set at a time
  const handleLog = async () => {
    if (!currentExercise || isLoggingSet) return;

    const weightNum = parseFloat(weight);
    const repsNum = parseInt(reps);

    // Validate input - weight can be 0, reps must be > 0
    if (
      !weight ||
      weight.trim() === "" ||
      isNaN(weightNum) ||
      weightNum < 0 ||
      !reps ||
      reps.trim() === "" ||
      isNaN(repsNum) ||
      repsNum <= 0
    ) {
      addToast({
        title: "Invalid Input",
        description: "Please enter valid weight and reps",
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

    // Log the current set
    const logData: any = {
      block_type: "straight_set",
      set_number: currentSetNumber,
    };

    // Only add fields if they're defined
    if (currentExercise?.exercise_id)
      logData.exercise_id = currentExercise.exercise_id;
    if (weightNum !== undefined && weightNum !== null && !isNaN(weightNum))
      logData.weight = weightNum;
    if (repsNum !== undefined && repsNum !== null && !isNaN(repsNum))
      logData.reps = repsNum;

    const result = await logSetToDatabase(logData);

    if (result.success) {
      const loggedSet: LoggedSet = {
        id: `temp-${currentSetNumber}-${Date.now()}`,
        exercise_id: currentExercise.exercise_id,
        block_id: block.block.id,
        set_number: currentSetNumber,
        weight_kg: weightNum,
        reps_completed: repsNum,
        completed_at: new Date(),
      } as LoggedSet;

      const updatedLoggedSets = [...loggedSetsArray, loggedSet];
      setLoggedSetsArray(updatedLoggedSets);

      if (result.e1rm && onE1rmUpdate) {
        onE1rmUpdate(currentExercise.exercise_id, result.e1rm);
      }

      addToast({
        title: "Set Logged!",
        description: `Set ${currentSetNumber} of ${totalSets}: ${weightNum}kg × ${repsNum} reps`,
        variant: "success",
        duration: 2000,
      });

      // Update parent with new completed sets count
      const newCompletedSets = currentSetNumber;
      onSetComplete?.(newCompletedSets);

      // Check if this was the last set
      if (currentSetNumber >= totalSets) {
        // Complete the block
        onBlockComplete(block.block.id, updatedLoggedSets);
      } else {
        // Check if rest timer will show - if so, don't clear inputs yet
        const restSeconds =
          currentExercise?.rest_seconds || block.block.rest_seconds || 0;
        if (restSeconds === 0) {
          // No rest timer, clear inputs immediately (will be pre-filled by useEffect)
          setWeight("");
          setReps("");
        }
        // If restSeconds > 0, rest timer will show and inputs will be cleared
        // when the timer completes and completedSets updates (via useEffect)
      }
    } else {
      addToast({
        title: "Failed to Save",
        description: "Failed to save set. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    }

    setIsLoggingSet(false);
  };

  // Logging inputs - show only current set
  const loggingInputs = (
    <div className="space-y-4">
      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
          Set {currentSetNumber} of {totalSets}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <LargeInput
            label="Weight"
            value={weight}
            onChange={setWeight}
            placeholder="0"
            step="0.5"
            unit="kg"
          />
          <LargeInput
            label="Reps"
            value={reps}
            onChange={setReps}
            placeholder="0"
            step="1"
          />
        </div>
      </div>
    </div>
  );

  // Log button
  const logButton = (
    <Button
      onClick={handleLog}
      disabled={
        isLoggingSet ||
        !weight ||
        weight.trim() === "" ||
        isNaN(parseFloat(weight)) ||
        parseFloat(weight) < 0 ||
        !reps ||
        reps.trim() === "" ||
        isNaN(parseInt(reps)) ||
        parseInt(reps) <= 0
      }
      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <CheckCircle className="w-5 h-5 mr-2" />
      {isLoggingSet ? "Logging..." : "LOG SET"}
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
      currentSet={currentSetNumber}
      totalSets={totalSets}
      progressLabel="Set"
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
