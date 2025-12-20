"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Activity, CheckCircle, Play } from "lucide-react";
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
import { supabase } from "@/lib/supabase";

export function ForTimeExecutor({
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
  // DEBUG: Log data structure at component initialization
  const exercises = block.block.exercises || [];
  const effectiveIndex =
    exercises.length > 0
      ? Math.min(currentExerciseIndex, exercises.length - 1)
      : 0;
  const currentExercise = exercises[effectiveIndex];

  console.log('ForTimeExecutor DEBUG:', {
    blockId: block?.block?.id,
    blockType: block?.block?.block_type,
    currentExercise: currentExercise,
    currentExerciseKeys: currentExercise ? Object.keys(currentExercise) : 'null',
    exercises: exercises,
    exercisesLength: exercises?.length || 0,
    exercisesData: exercises?.map(ex => ({
      id: ex.id,
      exercise_id: ex.exercise_id,
      name: (ex as any).name || ex.exercise?.name,
      keys: Object.keys(ex)
    })),
    allBlockData: block
  });

  const { addToast } = useToast();
  const timeCapMinutes =
    (block.block.block_parameters as any)?.time_cap_minutes || 15;
  const targetReps = (block.block.block_parameters as any)?.target_reps;

  // Debug logging for exercise data
  useEffect(() => {
    console.log("ForTimeExecutor exercise data:", {
      exercisesCount: exercises.length,
      currentExerciseIndex,
      effectiveIndex,
      currentExercise: currentExercise
        ? {
            id: currentExercise.id,
            exercise_id: currentExercise.exercise_id,
            hasExerciseId: !!currentExercise.exercise_id,
          }
        : null,
      allExercises: exercises.map((ex) => ({
        id: ex.id,
        exercise_id: ex.exercise_id,
      })),
    });
  }, [exercises, currentExerciseIndex, currentExercise]);

  // Get exercise name - try multiple sources
  const [exerciseNameState, setExerciseNameState] =
    useState<string>("For Time");

  useEffect(() => {
    const loadExerciseName = async () => {
      // If no exercises, use block name or "For Time"
      if (exercises.length === 0) {
        if (block.block.block_name) {
          setExerciseNameState(block.block.block_name);
        } else {
          setExerciseNameState("For Time");
        }
        return;
      }

      if (exercises.length > 1) {
        setExerciseNameState("For Time");
        return;
      }

      // Try exercise relation first
      if (currentExercise?.exercise?.name) {
        setExerciseNameState(currentExercise.exercise.name);
        return;
      }

      // Try block name
      if (block.block.block_name) {
        setExerciseNameState(block.block.block_name);
        return;
      }

      // Fetch exercise name from database if we have exercise_id
      // Try current exercise first, then any exercise in the block
      const exerciseIdToFetch =
        currentExercise?.exercise_id ||
        exercises.find((ex) => ex.exercise_id)?.exercise_id;

      if (exerciseIdToFetch) {
        try {
          const { data: exerciseData } = await supabase
            .from("exercises")
            .select("name")
            .eq("id", exerciseIdToFetch)
            .single();

          if (exerciseData?.name) {
            setExerciseNameState(exerciseData.name);
            return;
          }
        } catch (error) {
          console.error("Error fetching exercise name:", error);
        }
      }

      // Final fallback
      setExerciseNameState("For Time");
    };

    loadExerciseName();
  }, [currentExercise, exercises, block.block.block_name]);

  const exerciseName = exerciseNameState;

  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [isLoggingSet, setIsLoggingSet] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerStopped, setTimerStopped] = useState(false);
  const [completionTime, setCompletionTime] = useState<number | null>(null);
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
    if (startTime) {
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
        setElapsedSeconds(elapsed);

        // Check if time cap reached
        if (elapsed >= timeCapMinutes * 60) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }
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
  }, [startTime, timeCapMinutes]);

  // Block details
  const blockDetails: BlockDetail[] = [
    {
      label: "TIME CAP",
      value: `${timeCapMinutes} minutes`,
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

  // Exercise list if multi-exercise
  if (exercises.length > 1) {
    exercises.forEach((ex, idx) => {
      blockDetails.push({
        label: `${idx + 1}. ${ex.exercise?.name || `Exercise ${idx + 1}`}`,
        value: ex.reps || "-",
      });
    });
  }

  const instructions =
    currentExercise?.notes ||
    block.block.block_notes ||
    "Complete all exercises as fast as possible. Focus on form and efficiency.";

  const handleStartTimer = () => {
    setStartTime(new Date());
    setElapsedSeconds(0);
    setTimerStopped(false);
    setCompletionTime(null);
  };

  const handleStopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimerStopped(true);
    setCompletionTime(elapsedSeconds);
    setStartTime(null);
  };

  const handleLog = async () => {
    console.log("ForTimeExecutor handleLog called", {
      currentExercise: !!currentExercise,
      exercise_id: currentExercise?.exercise_id,
      isLoggingSet,
      weight,
      reps,
      exercises: exercises.map((ex) => ({
        id: ex.id,
        exercise_id: ex.exercise_id,
      })),
    });

    if (isLoggingSet) {
      console.log("ForTimeExecutor: Already logging");
      return;
    }

    // For For Time, exercise_id is optional (can be null)
    // Try to get exercise_id if available, but don't require it
    let exerciseIdToUse: string | undefined = currentExercise?.exercise_id;
    if (!exerciseIdToUse && exercises.length > 0) {
      // Try to find any exercise with an exercise_id
      const exerciseWithId = exercises.find((ex) => ex.exercise_id);
      exerciseIdToUse = exerciseWithId?.exercise_id || undefined;
    }

    console.log("ForTimeExecutor handleLog: exercise_id check", {
      exerciseIdToUse,
      currentExercise: currentExercise ? {
        id: currentExercise.id,
        exercise_id: currentExercise.exercise_id,
      } : null,
      exercisesCount: exercises.length,
    });

    // Parse weight (optional) and reps (required)
    const weightNum = weight && weight.trim() !== "" ? parseFloat(weight) : 0;
    const repsNum = parseInt(reps, 10);

    console.log("ForTimeExecutor: Parsed values", {
      weightNum,
      repsNum,
      weightStr: weight,
      repsStr: reps,
    });

    // Validate reps is required and > 0, weight is optional
    if (isNaN(repsNum) || repsNum <= 0) {
      console.log("ForTimeExecutor: Invalid reps validation failed");
      addToast({
        title: "Invalid Input",
        description:
          "Please enter valid reps (must be greater than 0). Weight is optional.",
        variant: "destructive",
        duration: 3000,
      });
      setIsLoggingSet(false);
      return;
    }

    if (weight && weight.trim() !== "" && (isNaN(weightNum) || weightNum < 0)) {
      console.log("ForTimeExecutor: Invalid weight validation failed");
      addToast({
        title: "Invalid Input",
        description: "If weight is provided, it must be 0 or greater.",
        variant: "destructive",
        duration: 3000,
      });
      setIsLoggingSet(false);
      return;
    }

    console.log("ForTimeExecutor: Validation passed, starting log...");
    setIsLoggingSet(true);

    try {
      if ("vibrate" in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
    } catch (e) {}

    // Use the completion time from when timer was stopped, or current elapsed time
    const completionTimeToLog = completionTime !== null ? completionTime : elapsedSeconds;

    // Build the log data - exercise_id is optional for fortime blocks
    const logData: any = {
      block_type: 'fortime',
      fortime_total_reps: repsNum,
      fortime_time_taken_sec: completionTimeToLog,
      fortime_time_cap_sec: timeCapMinutes * 60,
      fortime_target_reps: targetReps || null,
    };

    // Include exercise_id if available (optional for fortime blocks)
    if (exerciseIdToUse) {
      logData.exercise_id = String(exerciseIdToUse).trim();
    }

    // Include weight if provided (optional for for_time blocks)
    if (weightNum > 0) {
      logData.weight = weightNum;
    }

    console.log("ForTimeExecutor: Logging set with:", logData);

    const result = await logSetToDatabase(logData);

    if (result.success) {
      const loggedSetsArray: LoggedSet[] = [
        {
          id: `temp-${Date.now()}`,
          exercise_id: exerciseIdToUse || "",
          block_id: block.block.id,
          set_number: 1,
          weight_kg: weightNum > 0 ? weightNum : 0,
          reps_completed: repsNum,
          completed_at: new Date(),
        } as LoggedSet,
      ];

      // Update e1RM if available and exercise_id exists
      if (result.e1rm && onE1rmUpdate && exerciseIdToUse) {
        onE1rmUpdate(exerciseIdToUse, result.e1rm);
      }

      addToast({
        title: "For Time Logged!",
        description: weightNum > 0
          ? `${weightNum}kg × ${repsNum} reps completed in ${formatTime(completionTimeToLog)}`
          : `${repsNum} reps completed in ${formatTime(completionTimeToLog)}`,
        variant: "success",
        duration: 2000,
      });

      // Reset timer state after logging
      setTimerStopped(false);
      setCompletionTime(null);
      setElapsedSeconds(0);

      // Complete block
      onBlockComplete(block.block.id, loggedSetsArray);
    } else {
      addToast({
        title: "Failed to Save",
        description: "Failed to save completion. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    }

    setIsLoggingSet(false);
  };

  const loggingInputs = (
    <div className="space-y-4">
      {/* Timer Display */}
      {!startTime && !timerStopped ? (
        // Initial state - Start Timer button
        <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-6 border-2 border-rose-200 dark:border-rose-700 text-center">
          <div className="text-5xl font-bold text-rose-600 dark:text-rose-400 mb-3">
            {formatTime(0)}
          </div>
          <div className="text-lg text-slate-600 dark:text-slate-400 mb-4">
            Complete as fast as possible
          </div>
          <Button
            onClick={handleStartTimer}
            className="bg-rose-500 hover:bg-rose-600 text-white"
          >
            <Play className="w-5 h-5 mr-2" />
            Start Timer
          </Button>
        </div>
      ) : startTime && !timerStopped ? (
        // Timer running - Show elapsed time and Stop button
        <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-6 border-2 border-rose-200 dark:border-rose-700 text-center">
          <div className="text-5xl font-bold text-rose-600 dark:text-rose-400 mb-3">
            {formatTime(elapsedSeconds)}
          </div>
          <div className="text-lg text-slate-600 dark:text-slate-400 mb-4">
            Complete as fast as possible
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Time Cap: {timeCapMinutes} minutes
          </div>
          <Button
            onClick={handleStopTimer}
            variant="outline"
            className="border-rose-500 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
          >
            Stop
          </Button>
        </div>
      ) : timerStopped && completionTime !== null ? (
        // Timer stopped - Show completion time
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-6 border-2 border-emerald-200 dark:border-emerald-700 text-center">
          <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
            {formatTime(completionTime)}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Completion Time
          </div>
        </div>
      ) : null}

      {/* Weight and Reps Input - Show when timer is stopped or not started */}
      {(!startTime || timerStopped) && (
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
            label="Completed Reps"
            value={reps}
            onChange={setReps}
            placeholder="0"
            step="1"
          />
        </div>
      )}
    </div>
  );

  // Validate inputs for button state
  // For "for time" blocks: reps is required, weight is optional
  const weightStr = String(weight || "").trim();
  const repsStr = String(reps || "").trim();
  const weightNum = weightStr ? parseFloat(weightStr) : NaN;
  const repsNum = repsStr ? parseInt(repsStr, 10) : NaN;

  // For "for time" blocks, we need at least reps (weight is optional but recommended)
  const isValidInput =
    repsStr !== "" &&
    !isNaN(repsNum) &&
    isFinite(repsNum) &&
    repsNum > 0 &&
    (weightStr === "" || (!isNaN(weightNum) && isFinite(weightNum) && weightNum > 0));

  // For "for_time" blocks, exercise_id is optional, so we don't require exercises to be configured
  // The button should work as long as reps are entered

  // Debug logging for button state
  const buttonDisabledReason = !isValidInput
    ? `Invalid input (reps: ${reps || "empty"}, weight: ${weight || "empty"})`
    : isLoggingSet
    ? "Currently logging"
    : null;

  // Debug button state
  useEffect(() => {
    console.log("ForTimeExecutor button state:", {
      isLoggingSet,
      isValidInput,
      exercisesCount: exercises.length,
      weight,
      reps,
      weightNum,
      repsNum,
      timerStopped,
      completionTime,
      disabled: isLoggingSet || !isValidInput,
      reason: buttonDisabledReason,
    });
  }, [
    isLoggingSet,
    isValidInput,
    exercises,
    weight,
    reps,
    weightNum,
    repsNum,
    timerStopped,
    completionTime,
    buttonDisabledReason,
  ]);

  // Only show Complete Set button when timer is stopped
  const logButton = timerStopped ? (
    <div className="w-full">
      <Button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log("Complete Set button clicked", {
            isLoggingSet,
            isValidInput,
            exercisesCount: exercises.length,
            weight,
            reps,
            timerStopped,
            completionTime,
          });
          if (!isLoggingSet && isValidInput) {
            handleLog();
          } else {
            console.warn("Button click ignored - validation failed:", {
              isLoggingSet,
              isValidInput,
              reason: buttonDisabledReason,
            });
          }
        }}
        disabled={isLoggingSet || !isValidInput}
        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-emerald-600 disabled:hover:to-teal-600"
        title={buttonDisabledReason || undefined}
      >
        <CheckCircle className="w-5 h-5 mr-2" />
        {isLoggingSet ? "Logging..." : "Complete Set"}
      </Button>
      {buttonDisabledReason && (
        <p className="text-xs text-red-500 mt-2 text-center">
          {buttonDisabledReason}
        </p>
      )}
    </div>
  ) : null;

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
      exerciseName={exerciseName}
      blockDetails={blockDetails}
      instructions={instructions}
      currentSet={1}
      totalSets={1}
      progressLabel="Exercise"
      loggingInputs={loggingInputs}
      logButton={logButton}
      showNavigation={true}
      currentExercise={currentExercise}
      showRestTimer={false}
    />
  );
}
