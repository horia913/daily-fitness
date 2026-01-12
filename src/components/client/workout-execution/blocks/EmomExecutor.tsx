"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Timer as TimerIcon, CheckCircle, Play } from "lucide-react";
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

export function EmomExecutor({
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
    (tp: any) => tp.protocol_type === 'emom' && 
    (tp.exercise_id === currentExercise?.exercise_id || !currentExercise?.exercise_id)
  ) || block.block.time_protocols?.[0];
  
  const durationMinutes = timeProtocol?.total_duration_minutes ||
    ((block.block.duration_seconds || 600) / 60); // Default 10 minutes
  const emomMode = timeProtocol?.emom_mode || "target_reps";
  const targetReps = timeProtocol?.target_reps || timeProtocol?.reps_per_round;
  const workSeconds = timeProtocol?.work_seconds;

  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [currentMinute, setCurrentMinute] = useState(1);
  const [isLoggingSet, setIsLoggingSet] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [isActive, setIsActive] = useState(false);
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

  // Timer logic - countdown each minute
  useEffect(() => {
    if (isActive && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            // Minute complete, advance to next minute
            if (currentMinute < durationMinutes) {
              setCurrentMinute((prev) => prev + 1);
              return 60;
            } else {
              // All minutes complete
              setIsActive(false);
              return 0;
            }
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
  }, [isActive, timeRemaining, currentMinute, durationMinutes]);

  // Manual start handler
  const handleStart = () => {
    setIsActive(true);
    setTimeRemaining(60);
    setCurrentMinute(1);
  };

  // Block details
  const blockDetails: BlockDetail[] = [
    {
      label: "DURATION",
      value: `${durationMinutes} minutes`,
    },
    {
      label: "MODE",
      value: emomMode === "target_reps" ? "Target Reps" : "Time Based",
    },
  ];

  if (emomMode === "target_reps" && targetReps) {
    blockDetails.push({
      label: "REPS/MINUTE",
      value: targetReps,
    });
  }

  if (emomMode === "time_based" && workSeconds) {
    blockDetails.push({
      label: "WORK",
      value: `${workSeconds}s`,
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

  const handleLog = async () => {
    if (!currentExercise || isLoggingSet) return;

    const weightNum = parseFloat(weight);
    const repsNum = parseInt(reps);

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

    // Calculate duration used for this minute (60 - timeRemaining)
    const durationUsedThisMin = 60 - timeRemaining;

    const logData: any = {
      block_type: 'emom',
      emom_minute_number: currentMinute,
    };
    
    // Only add fields if they're defined
    if (currentExercise?.exercise_id) logData.exercise_id = currentExercise.exercise_id;
    if (repsNum !== undefined && repsNum !== null && !isNaN(repsNum)) logData.emom_total_reps_this_min = repsNum;
    if (durationUsedThisMin !== undefined && durationUsedThisMin !== null) logData.emom_total_duration_sec = durationUsedThisMin;
    
    const result = await logSetToDatabase(logData);

    if (result.success) {
      if (result.e1rm && onE1rmUpdate) {
        onE1rmUpdate(currentExercise.exercise_id, result.e1rm);
      }

      setReps("");

      addToast({
        title: "EMOM Work Logged!",
        description: `${weightNum}kg × ${repsNum} reps (Minute ${currentMinute})`,
        variant: "success",
        duration: 2000,
      });

      // If all minutes complete, finish block
      if (currentMinute >= durationMinutes && timeRemaining === 0) {
        const loggedSetsArray: LoggedSet[] = [
          {
            id: `temp-${Date.now()}`,
            exercise_id: currentExercise.exercise_id,
            block_id: block.block.id,
            set_number: currentMinute,
            weight_kg: weightNum,
            reps_completed: repsNum,
            completed_at: new Date(),
          } as LoggedSet,
        ];
        onBlockComplete(block.block.id, loggedSetsArray);
      }
    } else {
      addToast({
        title: "Failed to Save",
        description: "Failed to save work. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    }

    setIsLoggingSet(false);
  };

  const loggingInputs = (
    <div className="space-y-4">
      {/* Minute Counter */}
      <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-xl p-6 border-2 border-cyan-200 dark:border-cyan-700 text-center">
        <div className="text-2xl font-semibold text-cyan-800 dark:text-cyan-200 mb-2">
          Minute {currentMinute} of {durationMinutes}
        </div>
        <div className="text-4xl font-bold text-cyan-600 dark:text-cyan-400 mb-2">
          {formatTime(timeRemaining)}
        </div>
        <div className="text-sm text-cyan-700 dark:text-cyan-300 mb-4">
          {isActive ? "Work Time" : isActive === false && currentMinute === 1 && timeRemaining === 60 ? "Ready to Start" : "Complete"}
        </div>
        {!isActive && currentMinute === 1 && timeRemaining === 60 && (
          <Button
            onClick={handleStart}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Play className="w-4 h-4 mr-2" />
            Start EMOM
          </Button>
        )}
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
            label="Reps Completed"
            value={reps}
            onChange={setReps}
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
      disabled={isLoggingSet || !isActive}
      className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white text-lg py-4"
    >
      <CheckCircle className="w-5 h-5 mr-2" />
      {isLoggingSet ? "Logging..." : "LOG WORK"}
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
      currentSet={currentMinute}
      totalSets={durationMinutes}
      progressLabel="Minute"
      loggingInputs={loggingInputs}
      logButton={logButton}
      showNavigation={true}
      currentExercise={currentExercise}
      showRestTimer={false}
    />
  );
}
