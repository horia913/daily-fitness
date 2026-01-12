"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Zap, CheckCircle } from "lucide-react";
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

export function SupersetExecutor({
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
  const exerciseA = block.block.exercises?.[0];
  const exerciseB = block.block.exercises?.[1];
  const totalSets = block.block.total_sets || 1;
  const completedSets = block.completedSets || 0;
  const currentSet = completedSets;

  const [weightA, setWeightA] = useState("");
  const [repsA, setRepsA] = useState("");
  const [weightB, setWeightB] = useState("");
  const [repsB, setRepsB] = useState("");
  const [isLoggingSet, setIsLoggingSet] = useState(false);

  // Pre-fill with suggested weights
  useEffect(() => {
    if (exerciseA?.load_percentage && !weightA) {
      const suggested = calculateSuggestedWeightUtil(
        exerciseA.exercise_id,
        exerciseA.load_percentage,
        e1rmMap
      );
      if (suggested) setWeightA(suggested.toString());
    }
    if (exerciseB?.load_percentage && !weightB) {
      const suggested = calculateSuggestedWeightUtil(
        exerciseB.exercise_id,
        exerciseB.load_percentage,
        e1rmMap
      );
      if (suggested) setWeightB(suggested.toString());
    }
  }, [exerciseA, exerciseB, e1rmMap, weightA, weightB]);

  // Block details
  const blockDetails: BlockDetail[] = [
    {
      label: "SETS",
      value: totalSets,
    },
    {
      label: "REST",
      value: block.block.rest_seconds || exerciseA?.rest_seconds || 60,
      unit: "s",
    },
  ];

  if (exerciseA) {
    blockDetails.push({
      label: "EXERCISE A",
      value: exerciseA.exercise?.name || "Exercise A",
    });
    if (exerciseA.reps) {
      blockDetails.push({
        label: "REPS (A)",
        value: exerciseA.reps,
      });
    }
    if (exerciseA.load_percentage) {
      const suggestedWeight = calculateSuggestedWeightUtil(
        exerciseA.exercise_id,
        exerciseA.load_percentage,
        e1rmMap
      );
      const loadDisplay = formatLoadPercentage(
        exerciseA.load_percentage,
        suggestedWeight
      );
      if (loadDisplay) {
        blockDetails.push({
          label: "LOAD (A)",
          value: loadDisplay,
        });
      }
    }
  }

  if (exerciseB) {
    blockDetails.push({
      label: "EXERCISE B",
      value: exerciseB.exercise?.name || "Exercise B",
    });
    if (exerciseB.reps) {
      blockDetails.push({
        label: "REPS (B)",
        value: exerciseB.reps,
      });
    }
    if (exerciseB.load_percentage) {
      const suggestedWeight = calculateSuggestedWeightUtil(
        exerciseB.exercise_id,
        exerciseB.load_percentage,
        e1rmMap
      );
      const loadDisplay = formatLoadPercentage(
        exerciseB.load_percentage,
        suggestedWeight
      );
      if (loadDisplay) {
        blockDetails.push({
          label: "LOAD (B)",
          value: loadDisplay,
        });
      }
    }
  }

  const instructions = block.block.block_notes || undefined;

  const handleLog = async () => {
    if (!exerciseA || !exerciseB || isLoggingSet) return;

    const weightANum = parseFloat(weightA);
    const repsANum = parseInt(repsA);
    const weightBNum = parseFloat(weightB);
    const repsBNum = parseInt(repsB);

    if (!weightA || weightA.trim() === "" || isNaN(weightANum) || weightANum < 0 || 
        !repsA || repsA.trim() === "" || isNaN(repsANum) || repsANum <= 0 || 
        !weightB || weightB.trim() === "" || isNaN(weightBNum) || weightBNum < 0 || 
        !repsB || repsB.trim() === "" || isNaN(repsBNum) || repsBNum <= 0) {
      addToast({
        title: "Invalid Input",
        description: "Please enter valid weight and reps for both exercises",
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

    // Log superset as a single call with both exercises
    // Calculate set number from current state
    const setNumber = completedSets + 1;
    
    const logData: any = {
      block_type: 'superset',
      set_number: setNumber,
    };
    
    // Only add fields if they're defined
    if (exerciseA?.exercise_id) logData.superset_exercise_a_id = exerciseA.exercise_id;
    if (weightANum !== undefined && weightANum !== null) logData.superset_weight_a = weightANum;
    if (repsANum !== undefined && repsANum !== null) logData.superset_reps_a = repsANum;
    if (exerciseB?.exercise_id) logData.superset_exercise_b_id = exerciseB.exercise_id;
    if (weightBNum !== undefined && weightBNum !== null) logData.superset_weight_b = weightBNum;
    if (repsBNum !== undefined && repsBNum !== null) logData.superset_reps_b = repsBNum;
    
    const result = await logSetToDatabase(logData);

    if (result.success) {
      const loggedSetsArray: LoggedSet[] = [
        {
          id: `temp-a-${Date.now()}`,
          exercise_id: exerciseA.exercise_id,
          block_id: block.block.id,
          set_number: setNumber,
          weight_kg: weightANum,
          reps_completed: repsANum,
          completed_at: new Date(),
        } as LoggedSet,
        {
          id: `temp-b-${Date.now()}`,
          exercise_id: exerciseB.exercise_id,
          block_id: block.block.id,
          set_number: setNumber,
          weight_kg: weightBNum,
          reps_completed: repsBNum,
          completed_at: new Date(),
        } as LoggedSet,
      ];

      // Update e1RM for exercise A (API calculates e1RM for exercise A in superset)
      if (result.e1rm && onE1rmUpdate) {
        onE1rmUpdate(exerciseA.exercise_id, result.e1rm);
      }

      addToast({
        title: "Superset Logged!",
        description: `Exercise A: ${weightANum}kg × ${repsANum} reps, Exercise B: ${weightBNum}kg × ${repsBNum} reps`,
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
        const currentExercise = block.block.exercises?.[currentExerciseIndex];
        const restSeconds = currentExercise?.rest_seconds || block.block.rest_seconds || 0;
        if (restSeconds === 0) {
          // No rest timer, clear inputs immediately
          setWeightA("");
          setRepsA("");
          setWeightB("");
          setRepsB("");
        }
        // If restSeconds > 0, rest timer will show and inputs will be cleared
        // when the timer completes and completedSets updates
      }
    } else {
      addToast({
        title: "Failed to Save",
        description: "Failed to save sets. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    }

    setIsLoggingSet(false);
  };

  const loggingInputs = (
    <div className="space-y-6">
      {/* Exercise A */}
      <GlassCard elevation={1} className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-blue-800 dark:text-blue-200 text-lg">
            Exercise A: {exerciseA?.exercise?.name || "Exercise A"}
          </h4>
          {exerciseA && (
            <ExerciseActionButtons
              exercise={exerciseA}
              onVideoClick={onVideoClick}
              onAlternativesClick={onAlternativesClick}
            />
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <LargeInput
            label="Weight"
            value={weightA}
            onChange={setWeightA}
            placeholder="0"
            step="0.5"
            unit="kg"
          />
          <LargeInput
            label="Reps"
            value={repsA}
            onChange={setRepsA}
            placeholder="0"
            step="1"
          />
        </div>
      </GlassCard>

      {/* Exercise B */}
      <GlassCard elevation={1} className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-purple-800 dark:text-purple-200 text-lg">
            Exercise B: {exerciseB?.exercise?.name || "Exercise B"}
          </h4>
          {exerciseB && (
            <ExerciseActionButtons
              exercise={exerciseB}
              onVideoClick={onVideoClick}
              onAlternativesClick={onAlternativesClick}
            />
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <LargeInput
            label="Weight"
            value={weightB}
            onChange={setWeightB}
            placeholder="0"
            step="0.5"
            unit="kg"
          />
          <LargeInput
            label="Reps"
            value={repsB}
            onChange={setRepsB}
            placeholder="0"
            step="1"
          />
        </div>
      </GlassCard>
    </div>
  );

  const logButton = (
    <Button
      onClick={handleLog}
      disabled={isLoggingSet}
      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-lg py-4"
    >
      <Zap className="w-5 h-5 mr-2" />
      {isLoggingSet ? "Logging..." : "LOG SUPERSET"}
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
      exerciseName={`${exerciseA?.exercise?.name || "Exercise A"} + ${
        exerciseB?.exercise?.name || "Exercise B"
      }`}
      blockDetails={blockDetails}
      instructions={instructions}
      currentSet={currentSet}
      totalSets={totalSets}
      progressLabel="Set"
      loggingInputs={loggingInputs}
      logButton={logButton}
      showNavigation={true}
      currentExercise={exerciseA}
      showRestTimer={!!(block.block.rest_seconds || exerciseA?.rest_seconds)}
    />
  );
}
