"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Target, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import {
  BaseBlockExecutorLayout,
  formatLoadPercentage,
  calculateSuggestedWeightUtil,
  formatTime,
} from "../BaseBlockExecutor";
import { LargeInput } from "../ui/LargeInput";
import { ExerciseActionButtons } from "../ui/ExerciseActionButtons";
import { BlockDetail, BaseBlockExecutorProps } from "../types";
import { LoggedSet } from "@/types/workoutBlocks";

export function PreExhaustionExecutor({
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
  onSetComplete,
}: BaseBlockExecutorProps) {
  const { addToast } = useToast();
  const isolationExercise = block.block.exercises?.[0];
  const compoundExercise = block.block.exercises?.[1];
  const totalSets = block.block.total_sets || 1;
  const completedSets = block.completedSets || 0;
  const currentSet = completedSets;

  const restBetween = (block.block.block_parameters as any)?.rest_between || 15;

  const [isolationWeight, setIsolationWeight] = useState("");
  const [isolationReps, setIsolationReps] = useState("");
  const [compoundWeight, setCompoundWeight] = useState("");
  const [compoundReps, setCompoundReps] = useState("");
  const [isLoggingSet, setIsLoggingSet] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(restBetween);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Pre-fill with suggested weights
  useEffect(() => {
    if (isolationExercise?.load_percentage && !isolationWeight) {
      const suggested = calculateSuggestedWeightUtil(
        isolationExercise.exercise_id,
        isolationExercise.load_percentage,
        e1rmMap
      );
      if (suggested) setIsolationWeight(suggested.toString());
    }
    if (compoundExercise?.load_percentage && !compoundWeight) {
      const suggested = calculateSuggestedWeightUtil(
        compoundExercise.exercise_id,
        compoundExercise.load_percentage,
        e1rmMap
      );
      if (suggested) setCompoundWeight(suggested.toString());
    }
  }, [
    isolationExercise,
    compoundExercise,
    e1rmMap,
    isolationWeight,
    compoundWeight,
  ]);

  // Timer logic
  useEffect(() => {
    if (showTimer && timerSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setShowTimer(false);
            return restBetween;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [showTimer, timerSeconds, restBetween]);

  // Block details
  const blockDetails: BlockDetail[] = [
    {
      label: "SETS",
      value: totalSets,
    },
    {
      label: "ISOLATION",
      value: isolationExercise?.exercise?.name || "Isolation Exercise",
    },
    {
      label: "ISOLATION REPS",
      value: isolationExercise?.reps || "-",
    },
    {
      label: "REST BETWEEN",
      value: restBetween,
      unit: "s",
    },
    {
      label: "COMPOUND",
      value: compoundExercise?.exercise?.name || "Compound Exercise",
    },
    {
      label: "COMPOUND REPS",
      value: compoundExercise?.reps || "-",
    },
  ];

  if (isolationExercise?.load_percentage) {
    const suggestedWeight = calculateSuggestedWeightUtil(
      isolationExercise.exercise_id,
      isolationExercise.load_percentage,
      e1rmMap
    );
    const loadDisplay = formatLoadPercentage(
      isolationExercise.load_percentage,
      suggestedWeight
    );
    if (loadDisplay) {
      blockDetails.push({
        label: "LOAD (ISOLATION)",
        value: loadDisplay,
      });
    }
  }

  if (compoundExercise?.load_percentage) {
    const suggestedWeight = calculateSuggestedWeightUtil(
      compoundExercise.exercise_id,
      compoundExercise.load_percentage,
      e1rmMap
    );
    const loadDisplay = formatLoadPercentage(
      compoundExercise.load_percentage,
      suggestedWeight
    );
    if (loadDisplay) {
      blockDetails.push({
        label: "LOAD (COMPOUND)",
        value: loadDisplay,
      });
    }
  }

  const instructions = block.block.block_notes || undefined;

  const handleLog = async () => {
    if (!isolationExercise || !compoundExercise || isLoggingSet) return;

    const isolationWeightNum = parseFloat(isolationWeight);
    const isolationRepsNum = parseInt(isolationReps);
    const compoundWeightNum = parseFloat(compoundWeight);
    const compoundRepsNum = parseInt(compoundReps);

    if (!isolationWeight || isolationWeight.trim() === "" || isNaN(isolationWeightNum) || isolationWeightNum < 0 ||
      !isolationReps || isolationReps.trim() === "" || isNaN(isolationRepsNum) || isolationRepsNum <= 0 ||
      !compoundWeight || compoundWeight.trim() === "" || isNaN(compoundWeightNum) || compoundWeightNum < 0 ||
      !compoundReps || compoundReps.trim() === "" || isNaN(compoundRepsNum) || compoundRepsNum <= 0
    ) {
      addToast({
        title: "Invalid Input",
        description: "Please enter valid weight and reps for both isolation and compound exercises",
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

    // Log pre-exhaustion as a single call with both exercises
    const logData: any = {
      block_type: 'preexhaust',
      set_number: completedSets + 1,
    };
    
    // Only add fields if they're defined
    if (isolationExercise?.exercise_id) logData.preexhaust_isolation_exercise_id = isolationExercise.exercise_id;
    if (isolationWeightNum !== undefined && isolationWeightNum !== null) logData.preexhaust_isolation_weight = isolationWeightNum;
    if (isolationRepsNum !== undefined && isolationRepsNum !== null) logData.preexhaust_isolation_reps = isolationRepsNum;
    if (compoundExercise?.exercise_id) logData.preexhaust_compound_exercise_id = compoundExercise.exercise_id;
    if (compoundWeightNum !== undefined && compoundWeightNum !== null) logData.preexhaust_compound_weight = compoundWeightNum;
    if (compoundRepsNum !== undefined && compoundRepsNum !== null) logData.preexhaust_compound_reps = compoundRepsNum;
    
    const result = await logSetToDatabase(logData);

    if (result.success) {
      const loggedSetsArray: LoggedSet[] = [
        {
          id: `temp-isolation-${Date.now()}`,
          exercise_id: isolationExercise.exercise_id,
          block_id: block.block.id,
          set_number: completedSets + 1,
          weight_kg: isolationWeightNum,
          reps_completed: isolationRepsNum,
          completed_at: new Date(),
        } as LoggedSet,
        {
          id: `temp-compound-${Date.now()}`,
          exercise_id: compoundExercise.exercise_id,
          block_id: block.block.id,
          set_number: completedSets + 1,
          weight_kg: compoundWeightNum,
          reps_completed: compoundRepsNum,
          completed_at: new Date(),
        } as LoggedSet,
      ];

      // Note: Pre-exhaustion doesn't calculate e1RM (no weight+reps for e1RM calculation)

      addToast({
        title: "Pre-Exhaustion Set Logged!",
        description: `Isolation: ${isolationWeightNum}kg × ${isolationRepsNum} reps, Compound: ${compoundWeightNum}kg × ${compoundRepsNum} reps`,
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
          const suggestedIsolation = isolationExercise?.load_percentage
            ? calculateSuggestedWeightUtil(
                isolationExercise.exercise_id,
                isolationExercise.load_percentage,
                e1rmMap
              )
            : null;
          const suggestedCompound = compoundExercise?.load_percentage
            ? calculateSuggestedWeightUtil(
                compoundExercise.exercise_id,
                compoundExercise.load_percentage,
                e1rmMap
              )
            : null;

          if (suggestedIsolation) setIsolationWeight(suggestedIsolation.toString());
          else setIsolationWeight("");
          if (suggestedCompound) setCompoundWeight(suggestedCompound.toString());
          else setCompoundWeight("");

          setIsolationReps("");
          setCompoundReps("");
          setShowTimer(false);
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
    <div className="space-y-4">
      {/* Isolation Exercise */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-blue-800 dark:text-blue-200 text-lg">
            Isolation:{" "}
            {isolationExercise?.exercise?.name || "Isolation Exercise"}
          </h4>
          {isolationExercise && (
            <ExerciseActionButtons
              exercise={isolationExercise}
              onVideoClick={onVideoClick}
              onAlternativesClick={onAlternativesClick}
            />
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <LargeInput
            label="Weight"
            value={isolationWeight}
            onChange={setIsolationWeight}
            placeholder="0"
            step="0.5"
            unit="kg"
          />
          <LargeInput
            label="Reps"
            value={isolationReps}
            onChange={setIsolationReps}
            placeholder="0"
            step="1"
          />
        </div>
      </div>

      {/* Timer */}
      {showTimer && (
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-6 border border-orange-200 dark:border-orange-700 text-center">
          <div className="text-4xl font-bold text-orange-600 dark:text-orange-400 mb-2">
            {formatTime(timerSeconds)}
          </div>
          <div className="text-sm text-orange-700 dark:text-orange-300">
            Rest Between Exercises
          </div>
        </div>
      )}

      {/* Compound Exercise */}
      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-700">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-purple-800 dark:text-purple-200 text-lg">
            Compound: {compoundExercise?.exercise?.name || "Compound Exercise"}
          </h4>
          {compoundExercise && (
            <ExerciseActionButtons
              exercise={compoundExercise}
              onVideoClick={onVideoClick}
              onAlternativesClick={onAlternativesClick}
            />
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <LargeInput
            label="Weight"
            value={compoundWeight}
            onChange={setCompoundWeight}
            placeholder="0"
            step="0.5"
            unit="kg"
          />
          <LargeInput
            label="Reps"
            value={compoundReps}
            onChange={setCompoundReps}
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
      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-lg py-4"
    >
      <Target className="w-5 h-5 mr-2" />
      {isLoggingSet ? "Logging..." : "LOG PRE-EXHAUSTION SET"}
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
        formatTime: formatTimeProp,
        calculateSuggestedWeight,
        onVideoClick,
        onAlternativesClick,
        onRestTimerClick,
      }}
      exerciseName={`${isolationExercise?.exercise?.name || "Isolation"} + ${
        compoundExercise?.exercise?.name || "Compound"
      }`}
      blockDetails={blockDetails}
      instructions={instructions}
      currentSet={currentSet}
      totalSets={totalSets}
      progressLabel="Set"
      loggingInputs={loggingInputs}
      logButton={logButton}
      showNavigation={true}
      currentExercise={isolationExercise}
      showRestTimer={!!block.block.rest_seconds}
    />
  );
}
