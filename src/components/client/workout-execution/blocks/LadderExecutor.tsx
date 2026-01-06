"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { BarChart3, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import {
  BaseBlockExecutorLayout,
  formatLoadPercentage,
  calculateSuggestedWeightUtil,
} from "../BaseBlockExecutor";
import { LargeInput } from "../ui/LargeInput";
import { BlockDetail, BaseBlockExecutorProps } from "../types";
import { LoggedSet } from "@/types/workoutBlocks";

export function LadderExecutor({
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
  const rounds = block.block.total_sets || 1;
  // Ladder parameters (block_parameters removed - TODO: Get from workout_ladder_sets table)
  const startReps = 5; // TODO: Get from workout_ladder_sets table
  const ladderOrder = "ascending"; // TODO: Get from workout_ladder_sets table

  // Generate ladder array based on start reps and order
  const generateLadder = () => {
    const ladder: number[] = [];
    if (ladderOrder === "ascending") {
      for (let i = 0; i < rounds; i++) {
        ladder.push(startReps + i);
      }
    } else {
      for (let i = 0; i < rounds; i++) {
        ladder.push(startReps + rounds - 1 - i);
      }
    }
    return ladder;
  };

  const ladder = generateLadder();
  const totalRungs = ladder.length;

  const [weights, setWeights] = useState<string[]>([]);
  const [reps, setReps] = useState<string[]>([]);
  const [isLoggingSet, setIsLoggingSet] = useState(false);

  // Initialize arrays with ladder reps
  useEffect(() => {
    if (weights.length !== totalRungs) {
      const suggestedWeight = currentExercise?.load_percentage
        ? calculateSuggestedWeightUtil(
            currentExercise.exercise_id,
            currentExercise.load_percentage,
            e1rmMap
          )
        : null;

      const initialWeights = new Array(totalRungs).fill("");
      if (suggestedWeight) {
        for (let i = 0; i < totalRungs; i++) {
          initialWeights[i] = suggestedWeight.toString();
        }
      }
      setWeights(initialWeights);

      // Pre-fill reps with ladder values
      const initialReps = ladder.map((val) => val.toString());
      setReps(initialReps);
    }
  }, [
    totalRungs,
    ladder,
    currentExercise?.exercise_id,
    currentExercise?.load_percentage,
    e1rmMap,
  ]);

  // Block details
  const blockDetails: BlockDetail[] = [
    {
      label: "ROUNDS",
      value: rounds,
    },
    {
      label: "START REPS",
      value: startReps,
    },
    {
      label: "LADDER",
      value: ladder.join(", "),
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
        description: "Please enter valid weight and reps for all ladder rungs",
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

    // Log each ladder rung
    const loggedSetsArray: LoggedSet[] = [];
    let allSuccess = true;

    for (let idx = 0; idx < totalRungs; idx++) {
      const weightNum = parseFloat(weights[idx]);
      const repsNum = parseInt(reps[idx]);

      const logData: any = {
        block_type: 'ladder',
        ladder_rung_number: idx + 1,
        ladder_round_number: 1, // Default to 1, could be tracked if multiple rounds
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
        title: "Ladder Set Logged!",
        description: `${totalRungs} rungs completed`,
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

      const newWeights = new Array(totalRungs).fill("");
      if (suggestedWeight) {
        for (let i = 0; i < totalRungs; i++) {
          newWeights[i] = suggestedWeight.toString();
        }
      }
      setWeights(newWeights);
      setReps(ladder.map((val) => val.toString()));

      // Complete block
      onBlockComplete(block.block.id, loggedSetsArray);
    } else {
      addToast({
        title: "Failed to Save",
        description: "Some rungs failed to save. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    }

    setIsLoggingSet(false);
  };

  const loggingInputs = (
    <div className="space-y-4">
      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
        <h4 className="font-semibold text-slate-800 dark:text-white mb-4 text-lg">
          Round 1
        </h4>
        <div className="space-y-4">
          {ladder.map((rungReps, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-700 rounded-lg p-4 border border-slate-200 dark:border-slate-600"
            >
              <h5 className="font-medium text-slate-700 dark:text-slate-300 mb-3">
                Rung {idx + 1} ({rungReps} reps)
              </h5>
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
                />
                <LargeInput
                  label="Reps"
                  value={reps[idx] || rungReps.toString()}
                  onChange={(value) => {
                    const newReps = [...reps];
                    newReps[idx] = value;
                    setReps(newReps);
                  }}
                  placeholder={rungReps.toString()}
                  step="1"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const logButton = (
    <Button
      onClick={handleLog}
      disabled={isLoggingSet}
      className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-lg py-4"
    >
      <BarChart3 className="w-5 h-5 mr-2" />
      {isLoggingSet ? "Logging..." : "LOG LADDER SET"}
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
      currentSet={1}
      totalSets={rounds}
      progressLabel="Round"
      loggingInputs={loggingInputs}
      logButton={logButton}
      showNavigation={true}
      currentExercise={currentExercise}
      showRestTimer={!!block.block.rest_seconds}
    />
  );
}
