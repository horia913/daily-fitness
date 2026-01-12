"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { PauseCircle, CheckCircle, X, Plus } from "lucide-react";
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

export function RestPauseExecutor({
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
  const currentExercise = block.block.exercises?.[currentExerciseIndex];
  const totalSets = block.block.total_sets || 1;
  const completedSets = block.completedSets || 0;
  const currentSet = completedSets;

  // Read from special table (rest_pause_sets)
  const restPauseSet = currentExercise?.rest_pause_sets?.[0];
  const restPauseDuration = restPauseSet?.rest_pause_duration || 30;
  const maxRestPauses = restPauseSet?.max_rest_pauses || 2;

  const [weight, setWeight] = useState("");
  const [initialReps, setInitialReps] = useState("");
  const [restPauseAttempts, setRestPauseAttempts] = useState<string[]>([]);
  const [isLoggingSet, setIsLoggingSet] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(restPauseDuration);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Pre-fill with suggested weight - recalculate when e1rmMap is populated
  useEffect(() => {
    if (currentExercise?.load_percentage && currentExercise?.exercise_id) {
      // Check if e1rmMap has data for this exercise
      const hasE1rm = e1rmMap[currentExercise.exercise_id] && e1rmMap[currentExercise.exercise_id] > 0;
      // Only set if weight is empty or if e1rmMap was just populated
      const weightIsEmpty = !weight || weight.trim() === "" || parseFloat(weight) === 0;
      
      if (hasE1rm && weightIsEmpty) {
        const suggested = calculateSuggestedWeightUtil(
          currentExercise.exercise_id,
          currentExercise.load_percentage,
          e1rmMap
        );
        if (suggested && suggested > 0) {
          setWeight(suggested.toString());
        }
      }
    }
  }, [currentExercise?.exercise_id, currentExercise?.load_percentage, e1rmMap, weight]);

  // Timer logic
  useEffect(() => {
    if (showTimer && timerSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev: number) => {
          if (prev <= 1) {
            setShowTimer(false);
            return restPauseDuration;
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
  }, [showTimer, timerSeconds, restPauseDuration]);

  // Block details
  const blockDetails: BlockDetail[] = [
    {
      label: "SETS",
      value: totalSets,
    },
    {
      label: "REPS TO FAILURE",
      value: currentExercise?.reps || block.block.reps_per_set || 8,
    },
    {
      label: "PAUSE DURATION",
      value: restPauseDuration,
      unit: "s",
    },
    {
      label: "MAX PAUSES",
      value: maxRestPauses,
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

  const handleAddRestPause = () => {
    if (restPauseAttempts.length < maxRestPauses) {
      setRestPauseAttempts([...restPauseAttempts, ""]);
      setShowTimer(true);
      setTimerSeconds(restPauseDuration);
    }
  };

  const handleRemoveRestPause = (index: number) => {
    setRestPauseAttempts(restPauseAttempts.filter((_, i) => i !== index));
  };

  const handleLog = async () => {
    if (!currentExercise || isLoggingSet) return;

    const weightNum = parseFloat(weight);
    const initialRepsNum = parseInt(initialReps);

    if (!weight || weight.trim() === "" || isNaN(weightNum) || weightNum < 0 || 
        !initialReps || initialReps.trim() === "" || isNaN(initialRepsNum) || initialRepsNum <= 0) {
      addToast({
        title: "Invalid Input",
        description: "Please enter valid weight and initial reps",
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
      // Calculate reps after rest pause
      const repsAfterRestPause = restPauseAttempts.reduce(
        (sum, r) => sum + parseInt(r || "0"),
        0
      );

      const logData: any = {
        block_type: 'rest_pause',
        set_number: completedSets + 1,
        rest_pause_number: 1, // First rest-pause set
      };
      
      // Only add fields if they're defined
      if (currentExercise?.exercise_id) logData.exercise_id = currentExercise.exercise_id;
      // Only save rest_pause_initial_weight (not generic weight field)
      if (weightNum !== undefined && weightNum !== null) {
        logData.rest_pause_initial_weight = weightNum;
      }
      if (initialRepsNum !== undefined && initialRepsNum !== null) logData.rest_pause_initial_reps = initialRepsNum;
      if (repsAfterRestPause !== undefined && repsAfterRestPause !== null) logData.rest_pause_reps_after = repsAfterRestPause;
      // Add rest_pause_duration and max_rest_pauses (from workout_rest_pause_sets)
      if (restPauseDuration !== undefined && restPauseDuration !== null) logData.rest_pause_duration = restPauseDuration;
      if (maxRestPauses !== undefined && maxRestPauses !== null) logData.max_rest_pauses = maxRestPauses;
      
      const result = await logSetToDatabase(logData);

      if (result.success) {
        // Calculate total reps: initial reps + reps after rest pause
        const totalReps = initialRepsNum + repsAfterRestPause;
        
        const loggedSetsArray: LoggedSet[] = [
          {
            id: `temp-${Date.now()}`,
            exercise_id: currentExercise?.exercise_id || "",
            block_id: block.block.id,
            set_number: completedSets + 1,
            weight_kg: weightNum,
            reps_completed: totalReps,
            completed_at: new Date(),
          } as LoggedSet,
        ];

        if (result.e1rm && onE1rmUpdate && currentExercise?.exercise_id) {
          onE1rmUpdate(currentExercise.exercise_id, result.e1rm);
        }

        addToast({
          title: "Rest-Pause Set Logged!",
          description: `${weightNum}kg × ${totalReps} total reps (${initialRepsNum} + ${restPauseAttempts.length} rest-pause attempts)`,
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
              setWeight(suggested.toString());
            } else {
              setWeight("");
            }
            setInitialReps("");
            setRestPauseAttempts([]);
            setShowTimer(false);
          }
          // If restSeconds > 0, rest timer will show and inputs will be cleared
          // when the timer completes and completedSets updates
        }
      } else {
        addToast({
          title: "Failed to Save",
          description: result.error || "Failed to save set. Please try again.",
          variant: "destructive",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Error logging rest-pause set:", error);
      addToast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoggingSet(false);
    }
  };

  const loggingInputs = (
    <div className="space-y-4">
      {/* Initial Reps */}
      <GlassCard elevation={1} className="p-4">
        <h4 className="font-semibold text-slate-800 dark:text-white mb-4 text-lg">
          Initial reps to failure
        </h4>
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
            value={initialReps}
            onChange={setInitialReps}
            placeholder="0"
            step="1"
          />
        </div>
      </GlassCard>

      {/* Timer */}
      {showTimer && (
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-6 border border-orange-200 dark:border-orange-700 text-center">
          <div className="text-4xl font-bold text-orange-600 dark:text-orange-400 mb-2">
            {formatTime(timerSeconds)}
          </div>
          <div className="text-sm text-orange-700 dark:text-orange-300">
            Rest-Pause Timer
          </div>
        </div>
      )}

      {/* Rest-Pause Attempts */}
      {restPauseAttempts.length > 0 && (
        <GlassCard elevation={1} className="p-4">
          <h4 className="font-semibold text-slate-800 dark:text-white mb-4 text-lg">
            Rest-Pause Attempts
          </h4>
          <div className="space-y-2">
            {restPauseAttempts.map((attempt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="flex-1">
                  <LargeInput
                    label={`Reps after pause ${idx + 1}`}
                    value={attempt}
                    onChange={(value) => {
                      const newAttempts = [...restPauseAttempts];
                      newAttempts[idx] = value;
                      setRestPauseAttempts(newAttempts);
                    }}
                    placeholder="0"
                    step="1"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveRestPause(idx)}
                  className="p-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Add Rest-Pause Button */}
      {restPauseAttempts.length < maxRestPauses && (
        <Button
          variant="outline"
          onClick={handleAddRestPause}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Rest-Pause Attempt
        </Button>
      )}
    </div>
  );

  const logButton = (
    <Button
      onClick={handleLog}
      disabled={isLoggingSet}
      className="w-full bg-gradient-to-r from-slate-600 to-gray-600 hover:from-slate-700 hover:to-gray-700 text-white text-lg py-4"
    >
      <PauseCircle className="w-5 h-5 mr-2" />
      {isLoggingSet ? "Logging..." : "LOG REST-PAUSE SET"}
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
      currentSet={currentSet}
      totalSets={totalSets}
      progressLabel="Set"
      loggingInputs={loggingInputs}
      logButton={logButton}
      showNavigation={true}
      currentExercise={currentExercise}
      showRestTimer={!!block.block.rest_seconds}
    />
  );
}
