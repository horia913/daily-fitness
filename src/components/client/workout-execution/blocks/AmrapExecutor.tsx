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
import { useLoggingReset } from "../hooks/useLoggingReset";
import { getWeightDefaultAndSuggestion } from "@/lib/weightDefaultService";

export function AmrapExecutor({
  block,
  onBlockComplete,
  onNextBlock,
  e1rmMap = {},
  onE1rmUpdate,
  lastPerformedWeightByExerciseId = {},
  lastSessionWeightByExerciseId = {},
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
  
  const timeProtocol = block.block.time_protocols?.find(
    (tp: any) => tp.protocol_type === 'amrap' && 
    (tp.exercise_id === currentExercise?.exercise_id || !currentExercise?.exercise_id)
  ) || block.block.time_protocols?.[0];
  
  const durationSeconds = timeProtocol?.total_duration_minutes 
    ? timeProtocol.total_duration_minutes * 60
    : block.block.duration_seconds || 600;
  const targetReps = timeProtocol?.target_reps;

  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [isLoggingSet, setIsLoggingSet] = useState(false);
  useLoggingReset(isLoggingSet, setIsLoggingSet);
  const [timeRemaining, setTimeRemaining] = useState(durationSeconds);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [isWeightPristine, setIsWeightPristine] = useState(true);

  const exerciseId = currentExercise?.exercise_id ?? "";
  const sessionStickyWeight = exerciseId ? lastPerformedWeightByExerciseId[exerciseId] ?? null : null;
  const lastSessionWeightVal = exerciseId ? lastSessionWeightByExerciseId[exerciseId] ?? null : null;
  const loadPercentage = currentExercise?.load_percentage ?? null;
  const e1rm = exerciseId ? e1rmMap[exerciseId] ?? null : null;
  const { default_weight, suggested_weight, source } = getWeightDefaultAndSuggestion({
    sessionStickyWeight: sessionStickyWeight ?? null,
    lastSessionWeight: lastSessionWeightVal ?? null,
    loadPercentage,
    e1rm: e1rm ?? null,
  });

  useEffect(() => {
    setIsWeightPristine(true);
  }, [currentExerciseIndex, exerciseId]);

  useEffect(() => {
    if (!isWeightPristine) return;
    if (default_weight != null && default_weight > 0) setWeight(String(default_weight));
    else setWeight("");
  }, [isWeightPristine, default_weight, currentExerciseIndex, exerciseId]);

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

  if (currentExercise?.load_percentage != null) {
    const suggestedForDisplay = source === "percent_e1rm" ? suggested_weight : null;
    const loadDisplay = formatLoadPercentage(currentExercise.load_percentage, suggestedForDisplay);
    if (loadDisplay) blockDetails.push({ label: "LOAD", value: loadDisplay });
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

    try {
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
      if (!isNaN(weightNum) && weightNum > 0) logData.weight = weightNum;
      
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
    } finally {
      setIsLoggingSet(false);
    }
  };

  const loggingInputs = (
    <div className="space-y-4">
      {/* Inline Timer */}
      <div
        className="rounded-xl p-5 text-center"
        style={timerHasEnded
          ? { background: "color-mix(in srgb, var(--fc-status-success) 8%, var(--fc-surface-card))", border: "2px solid color-mix(in srgb, var(--fc-status-success) 25%, transparent)" }
          : { background: "color-mix(in srgb, var(--fc-accent-cyan) 8%, var(--fc-surface-card))", border: "2px solid color-mix(in srgb, var(--fc-accent-cyan) 25%, transparent)" }
        }
      >
        <div
          className="text-5xl font-bold mb-3"
          style={{ color: timerHasEnded ? "var(--fc-status-success)" : "var(--fc-accent-cyan)" }}
        >
          {formatTime(timeRemaining)}
        </div>
        {timerHasEnded && (
          <div className="text-lg font-semibold mb-3" style={{ color: "var(--fc-status-success)" }}>
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
      <div className="p-4 rounded-xl" style={{ background: "var(--fc-surface-sunken)" }}>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <LargeInput
              label="Weight"
              value={weight}
              onChange={(val) => { setIsWeightPristine(false); setWeight(val); }}
              placeholder="0"
              step="0.5"
              unit="kg"
              showStepper
              stepAmount={2.5}
            />
            {suggested_weight != null && suggested_weight > 0 && (
              <button type="button" onClick={() => { setWeight(String(suggested_weight)); setIsWeightPristine(false); }} className="text-xs font-medium hover:underline" style={{ color: "var(--fc-accent-cyan)" }}>
                {loadPercentage != null ? `${loadPercentage}% → ${suggested_weight} kg` : `Suggested: ${suggested_weight} kg`} (tap to apply)
              </button>
            )}
          </div>
          <LargeInput
            label="Total Reps"
            value={reps}
            onChange={setReps}
            placeholder="0"
            step="1"
            showStepper
            stepAmount={1}
          />
        </div>
      </div>
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
      variant="fc-primary"
      className="w-full h-12 text-base font-bold uppercase tracking-wider rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
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
