"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { TrendingDown, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import {
  BaseBlockExecutorLayout,
  formatLoadPercentage,
  calculateSuggestedWeightUtil,
} from "../BaseBlockExecutor";
import { LargeInput } from "../ui/LargeInput";
import { BlockDetail, BaseBlockExecutorProps } from "../types";
import { LoggedSet } from "@/types/workoutBlocks";

export function DropSetExecutor({
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
  const currentExercise = block.block.exercises?.[currentExerciseIndex];
  const totalSets = block.block.total_sets || 1;
  const completedSets = block.completedSets || 0;
  const currentSet = completedSets;

  const [initialWeight, setInitialWeight] = useState("");
  const [initialReps, setInitialReps] = useState("");
  const [dropWeight, setDropWeight] = useState("");
  const [dropReps, setDropReps] = useState("");
  const [isLoggingSet, setIsLoggingSet] = useState(false);
  const isManuallyEditingDropWeight = useRef(false);

  // Get drop percentage from drop_set table or default to 20% (block_parameters removed)
  const dropPercentage = 20; // TODO: Get from workout_drop_sets table
  const exerciseReps = currentExercise?.reps || block.block.reps_per_set || "";
  const dropSetReps = exerciseReps; // TODO: Get from workout_drop_sets table

  // Pre-fill with suggested weight
  useEffect(() => {
    if (currentExercise?.load_percentage && !initialWeight) {
      const suggested = calculateSuggestedWeightUtil(
        currentExercise.exercise_id,
        currentExercise.load_percentage,
        e1rmMap
      );
      if (suggested) {
        setInitialWeight(suggested.toString());
        // Calculate drop weight (reduce by drop percentage)
        const dropWeightValue = suggested * (1 - dropPercentage / 100);
        const roundedDropWeight = Math.round(dropWeightValue * 2) / 2;
        setDropWeight(roundedDropWeight.toString());
        isManuallyEditingDropWeight.current = false;
      }
    }
  }, [currentExercise, e1rmMap, dropPercentage, initialWeight]);

  // Auto-calculate drop weight when initial weight changes
  // Always recalculate when initial weight changes (unless user is actively editing drop weight)
  useEffect(() => {
    // Skip auto-calculation if user is currently manually editing drop weight field
    if (isManuallyEditingDropWeight.current) {
      return;
    }

    if (initialWeight) {
      const initialWeightNum = parseFloat(initialWeight);
      if (!isNaN(initialWeightNum) && initialWeightNum > 0) {
        // Calculate drop weight: initial weight * (1 - drop percentage / 100)
        // Round to nearest 0.5kg for practical weight selection
        const dropWeightValue = initialWeightNum * (1 - dropPercentage / 100);
        const roundedDropWeight = Math.round(dropWeightValue * 2) / 2;
        setDropWeight(roundedDropWeight.toString());
      } else if (initialWeightNum === 0 || isNaN(initialWeightNum)) {
        // Clear drop weight if initial weight is invalid
        setDropWeight("");
      }
    } else {
      // Clear drop weight if initial weight is cleared
      setDropWeight("");
    }
  }, [initialWeight, dropPercentage]);

  // Block details
  const blockDetails: BlockDetail[] = [
    {
      label: "SETS",
      value: totalSets,
    },
    {
      label: "INITIAL REPS",
      value: exerciseReps,
    },
    {
      label: "DROP",
      value: `${dropPercentage}%`,
    },
    {
      label: "AFTER DROP",
      value: `${dropSetReps} reps`,
    },
    {
      label: "REST",
      value: currentExercise?.rest_seconds || block.block.rest_seconds || 60,
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

    const initialWeightNum = parseFloat(initialWeight);
    const initialRepsNum = parseInt(initialReps);
    const dropWeightNum = parseFloat(dropWeight);
    const dropRepsNum = parseInt(dropReps);

    if (!initialWeight || initialWeight.trim() === "" || isNaN(initialWeightNum) || initialWeightNum < 0 ||
      !initialReps || initialReps.trim() === "" || isNaN(initialRepsNum) || initialRepsNum <= 0 ||
      !dropWeight || dropWeight.trim() === "" || isNaN(dropWeightNum) || dropWeightNum < 0 ||
      !dropReps || dropReps.trim() === "" || isNaN(dropRepsNum) || dropRepsNum <= 0
    ) {
      addToast({
        title: "Invalid Input",
        description: "Please enter valid weight and reps for both initial and drop sets",
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

    // Calculate drop percentage
    const dropPercentage = initialWeightNum > 0 
      ? ((initialWeightNum - dropWeightNum) / initialWeightNum) * 100 
      : 0;

    // Log dropset
    const logData: any = {
      block_type: 'dropset',
      set_number: completedSets + 1,
    };
    
    // Only add fields if they're defined
    if (currentExercise?.exercise_id) logData.exercise_id = currentExercise.exercise_id;
    if (initialWeightNum !== undefined && initialWeightNum !== null) logData.dropset_initial_weight = initialWeightNum;
    if (initialRepsNum !== undefined && initialRepsNum !== null) logData.dropset_initial_reps = initialRepsNum;
    if (dropWeightNum !== undefined && dropWeightNum !== null) logData.dropset_final_weight = dropWeightNum;
    if (dropRepsNum !== undefined && dropRepsNum !== null) logData.dropset_final_reps = dropRepsNum;
    if (dropPercentage !== undefined && dropPercentage !== null) logData.dropset_percentage = dropPercentage;
    
    const result = await logSetToDatabase(logData);

    if (result.success) {
      const loggedSetsArray: LoggedSet[] = [
        {
          id: `temp-initial-${Date.now()}`,
          exercise_id: currentExercise.exercise_id,
          block_id: block.block.id,
          set_number: completedSets + 1,
          weight_kg: initialWeightNum,
          reps_completed: initialRepsNum,
          completed_at: new Date(),
        } as LoggedSet,
      ];

      if (result.e1rm && onE1rmUpdate) {
        onE1rmUpdate(currentExercise.exercise_id, result.e1rm);
      }

      addToast({
        title: "Drop Set Logged!",
        description: `${initialWeightNum}kg × ${initialRepsNum} reps → ${dropWeightNum}kg × ${dropRepsNum} reps`,
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
        const restSeconds = currentExercise?.rest_seconds || block.block.rest_seconds || 0;
        if (restSeconds === 0) {
          // No rest timer, clear inputs immediately
          const suggested = currentExercise?.load_percentage
            ? calculateSuggestedWeightUtil(
                currentExercise.exercise_id,
                currentExercise.load_percentage,
                e1rmMap
              )
            : null;
          if (suggested) {
            setInitialWeight(suggested.toString());
            const dropWeightValue = suggested * (1 - dropPercentage / 100);
            const roundedDropWeight = Math.round(dropWeightValue * 2) / 2;
            setDropWeight(roundedDropWeight.toString());
            isManuallyEditingDropWeight.current = false;
          } else {
            setInitialWeight("");
            setDropWeight("");
            isManuallyEditingDropWeight.current = false;
          }
          setInitialReps("");
          setDropReps("");
        }
        // If restSeconds > 0, rest timer will show and inputs will be cleared
        // when the timer completes and completedSets updates
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

  const loggingInputs = (
    <div className="space-y-4">
      {/* Initial Set */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
        <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-4 text-lg">
          Initial (100%)
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <LargeInput
            label="Weight"
            value={initialWeight}
            onChange={setInitialWeight}
            placeholder="0"
            step="0.5"
            unit="kg"
          />
          <LargeInput
            label="Reps"
            value={initialReps}
            onChange={setInitialReps}
            placeholder="0"
            step="1"
          />
        </div>
      </div>

      {/* Drop Set */}
      <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-700">
        <h4 className="font-semibold text-red-800 dark:text-red-200 mb-4 text-lg">
          After Drop ({100 - dropPercentage}%)
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <LargeInput
            label="Weight"
            value={dropWeight}
            onChange={(value) => {
              isManuallyEditingDropWeight.current = true;
              setDropWeight(value);
              // Reset flag after a delay to allow auto-calculation on next initial weight change
              setTimeout(() => {
                isManuallyEditingDropWeight.current = false;
              }, 500);
            }}
            placeholder="0"
            step="0.5"
            unit="kg"
          />
          <LargeInput
            label="Reps"
            value={dropReps}
            onChange={setDropReps}
            placeholder="0"
            step="1"
          />
        </div>
      </div>
    </div>
  );

  const logButton = (
    <Button
      onClick={handleLog}
      disabled={isLoggingSet}
      className="w-full bg-gradient-to-r from-blue-600 to-red-600 hover:from-blue-700 hover:to-red-700 text-white text-lg py-4"
    >
      <TrendingDown className="w-5 h-5 mr-2" />
      {isLoggingSet ? "Logging..." : "LOG DROP SET"}
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
