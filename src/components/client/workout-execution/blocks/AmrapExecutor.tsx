"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Play, Pause, RotateCcw } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import {
  BaseBlockExecutorLayout,
  formatLoadPercentage,
  calculateSuggestedWeightUtil,
  formatTime,
} from "../BaseBlockExecutor";
import { LargeInput } from "../ui/LargeInput";
import { BlockDetail, BaseBlockExecutorProps } from "../types";
import { LoggedSet } from "@/types/workoutBlocks";
import { GlassCard } from "@/components/ui/GlassCard";

export function AmrapExecutor({
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
  const { addToast } = useToast();
  const currentExercise = block.block.exercises?.[currentExerciseIndex];
  
  // Read from special table (time_protocols)
  const timeProtocol = block.block.time_protocols?.find(
    (tp: any) => tp.protocol_type === 'amrap' && 
    (tp.exercise_id === currentExercise?.exercise_id || !currentExercise?.exercise_id)
  ) || block.block.time_protocols?.[0];
  
  const durationSeconds = timeProtocol?.total_duration_minutes 
    ? timeProtocol.total_duration_minutes * 60
    : block.block.duration_seconds || 600; // Default 10 minutes
  const targetReps = timeProtocol?.target_reps;

  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [isLoggingSet, setIsLoggingSet] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(durationSeconds);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Pre-fill with suggested weight
  useEffect(() => {
    if (currentExercise?.load_percentage && !weight) {
      const suggested = calculateSuggestedWeightUtil(
        currentExercise.exercise_id,
        currentExercise.load_percentage,
        e1rmMap
      );
      if (suggested) setWeight(suggested.toString());
    }
  }, [currentExercise, e1rmMap, weight]);

  // Timer logic
  useEffect(() => {
    if (isActive && timeRemaining > 0 && !isPaused) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsActive(false);
            return 0;
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
  }, [isActive, timeRemaining, isPaused]);

  // Block details
  const blockDetails: BlockDetail[] = [
    {
      label: "DURATION",
      value: `${Math.floor(durationSeconds / 60)} minutes`,
    },
  ];

  if (targetReps) {
    blockDetails.push({
      label: "TARGET REPS",
      value: targetReps,
    });
  }

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

  const handleStartTimer = () => {
    setIsActive(true);
    setIsPaused(false);
    setTimeRemaining(durationSeconds);
  };

  const handlePauseResume = () => {
    if (isActive) {
      setIsPaused(!isPaused);
    } else {
      setIsActive(true);
      setIsPaused(false);
    }
  };

  const handleResetTimer = () => {
    setIsActive(false);
    setIsPaused(false);
    setTimeRemaining(durationSeconds);
  };

  // Check if timer has ended
  const timerHasEnded = timeRemaining === 0 && !isActive;

  const handleLogSet = async () => {
    if (!currentExercise || isLoggingSet) return;

    if (!currentExercise.exercise_id) {
      addToast({
        title: "Error",
        description: "Exercise ID not found. Please refresh the page.",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    const weightNum = parseFloat(weight);
    const repsNum = parseInt(reps, 10);

    if (!weight || weight.trim() === "" || isNaN(weightNum) || weightNum < 0 || 
        !reps || reps.trim() === "" || isNaN(repsNum) || repsNum <= 0) {
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

    // Log the final set
    // Ensure exercise_id is a valid string
    const exerciseIdToLog = String(currentExercise.exercise_id || "").trim();
    if (!exerciseIdToLog) {
      addToast({
        title: "Error",
        description: "Exercise ID is invalid. Please refresh the page.",
        variant: "destructive",
        duration: 5000,
      });
      setIsLoggingSet(false);
      return;
    }

    // Calculate actual duration used (durationSeconds - timeRemaining)
    const actualDurationSeconds = durationSeconds - timeRemaining;

    console.log("AmrapExecutor handleLogSet: Calling logSetToDatabase with:", {
      block_type: 'amrap',
      exercise_id: exerciseIdToLog,
      amrap_total_reps: repsNum,
      amrap_duration_seconds: actualDurationSeconds,
      amrap_target_reps: targetReps || null,
    });

    const logData: any = {
      block_type: 'amrap',
    };
    
    // Only add fields if they're defined
    if (exerciseIdToLog) logData.exercise_id = exerciseIdToLog;
    if (repsNum !== undefined && repsNum !== null && !isNaN(repsNum)) logData.amrap_total_reps = repsNum;
    if (actualDurationSeconds !== undefined && actualDurationSeconds !== null) logData.amrap_duration_seconds = actualDurationSeconds;
    if (targetReps !== undefined && targetReps !== null) logData.amrap_target_reps = targetReps;
    
    const result = await logSetToDatabase(logData);

    if (result.success) {
      if (result.e1rm && onE1rmUpdate) {
        onE1rmUpdate(currentExercise.exercise_id, result.e1rm);
      }

      const loggedSetsArray: LoggedSet[] = [
        {
          id: `temp-${Date.now()}`,
          exercise_id: currentExercise.exercise_id,
          block_id: block.block.id,
          set_number: 1,
          weight_kg: weightNum,
          reps_completed: repsNum,
          completed_at: new Date(),
        } as LoggedSet,
      ];

      addToast({
        title: "AMRAP Set Logged!",
        description: `${weightNum}kg × ${repsNum} total reps`,
        variant: "success",
        duration: 2000,
      });

      // Complete the block
      onBlockComplete(block.block.id, loggedSetsArray);
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
      {/* Inline Timer */}
      <div
        className={`rounded-xl p-6 border-2 text-center ${
          timerHasEnded
            ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700"
            : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700"
        }`}
      >
        <div
          className={`text-5xl font-bold mb-3 ${
            timerHasEnded
              ? "text-green-600 dark:text-green-400"
              : "text-blue-600 dark:text-blue-400"
          }`}
        >
          {formatTime(timeRemaining)}
        </div>
        {timerHasEnded && (
          <div className="text-lg font-semibold text-green-700 dark:text-green-300 mb-3">
            ⏱️ Time's Up!
          </div>
        )}
        <div className="flex items-center justify-center gap-3 mb-2">
          {!isActive && timeRemaining === durationSeconds && (
            <Button
              onClick={handleStartTimer}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Timer
            </Button>
          )}
          {isActive && !timerHasEnded && (
            <>
              <Button onClick={handlePauseResume} variant="outline">
                {isPaused ? (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </>
                )}
              </Button>
              <Button onClick={handleResetTimer} variant="outline">
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Weight and Reps Input */}
      <GlassCard elevation={1} className="p-4">
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
            label="Total Reps"
            value={reps}
            onChange={setReps}
            placeholder="0"
            step="1"
          />
        </div>
      </GlassCard>
    </div>
  );

  // Validate inputs for button state
  // Check if inputs are valid numbers AND greater than 0
  // Be very explicit about what constitutes valid input
  const weightStr = String(weight || "").trim();
  const repsStr = String(reps || "").trim();

  // Parse the values
  const weightNum = weightStr ? parseFloat(weightStr) : NaN;
  const repsNum = repsStr ? parseInt(repsStr, 10) : NaN;

  // Both must be valid numbers AND greater than 0
  const isValidInput =
    weightStr !== "" &&
    repsStr !== "" &&
    !isNaN(weightNum) &&
    !isNaN(repsNum) &&
    isFinite(weightNum) &&
    isFinite(repsNum) &&
    weightNum > 0 &&
    repsNum > 0;

  // Check if exercise ID exists
  const hasExerciseId = !!currentExercise?.exercise_id;

  // Determine if button should be disabled
  const isButtonDisabled = isLoggingSet || !isValidInput || !hasExerciseId;

  const logButton = (
    <Button
      onClick={handleLogSet}
      disabled={isButtonDisabled}
      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-indigo-600"
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
        formatTime: formatTimeProp,
        calculateSuggestedWeight,
        onVideoClick,
        onAlternativesClick,
        onRestTimerClick,
      }}
      exerciseName={currentExercise?.exercise?.name || "Exercise"}
      blockDetails={blockDetails}
      instructions={instructions}
      currentSet={1}
      totalSets={1}
      progressLabel="Set"
      loggingInputs={loggingInputs}
      logButton={logButton}
      showNavigation={true}
      currentExercise={currentExercise}
      showRestTimer={false}
    />
  );
}
