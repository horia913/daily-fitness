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
import { useLoggingReset } from "../hooks/useLoggingReset";
import { getWeightDefaultAndSuggestion, getCoachSuggestedWeight } from "@/lib/weightDefaultService";
import { ApplySuggestedWeightButton } from "../ui/ApplySuggestedWeightButton";

export function RestPauseExecutor({
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
  onSetComplete,
  onLastSetLoggedForRest,
}: BaseBlockExecutorProps) {
  const { addToast } = useToast();
  const currentExercise = block.block.exercises?.[currentExerciseIndex];
  const totalSets = block.block.total_sets || 1;
  const completedSets = block.completedSets || 0;
  const currentSet = completedSets;

  const restPauseSet = currentExercise?.rest_pause_sets?.[0];
  const restPauseDuration = restPauseSet?.rest_pause_duration || 30;
  const maxRestPauses = restPauseSet?.max_rest_pauses || 2;

  const [weight, setWeight] = useState("");
  const [initialReps, setInitialReps] = useState("");
  const [restPauseAttempts, setRestPauseAttempts] = useState<string[]>([]);
  const [isLoggingSet, setIsLoggingSet] = useState(false);
  useLoggingReset(isLoggingSet, setIsLoggingSet);
  const [showTimer, setShowTimer] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(restPauseDuration);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [isWeightPristine, setIsWeightPristine] = useState(true);

  const exerciseId = currentExercise?.exercise_id ?? "";
  const sessionStickyWeight = exerciseId ? lastPerformedWeightByExerciseId[exerciseId] ?? null : null;
  const lastSessionWeight = exerciseId ? lastSessionWeightByExerciseId[exerciseId] ?? null : null;
  const loadPercentage = currentExercise?.load_percentage ?? null;
  const e1rm = exerciseId ? e1rmMap[exerciseId] ?? null : null;
  const { default_weight, suggested_weight, source } = getWeightDefaultAndSuggestion({
    sessionStickyWeight: sessionStickyWeight ?? null,
    lastSessionWeight: lastSessionWeight ?? null,
    loadPercentage,
    e1rm: e1rm ?? null,
  });
  const coachSuggestedWeight = getCoachSuggestedWeight(loadPercentage, e1rm);

  useEffect(() => {
    setIsWeightPristine(true);
  }, [completedSets, currentExerciseIndex, exerciseId]);

  useEffect(() => {
    if (!isWeightPristine) return;
    if (default_weight != null && default_weight > 0) setWeight(String(default_weight));
    else setWeight("");
  }, [isWeightPristine, default_weight, completedSets, exerciseId]);

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

  if (currentExercise?.load_percentage != null) {
    const suggestedForDisplay = source === "percent_e1rm" ? suggested_weight : null;
    const loadDisplay = formatLoadPercentage(currentExercise.load_percentage, suggestedForDisplay);
    if (loadDisplay) blockDetails.push({ label: "LOAD", value: loadDisplay });
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

        const newCompletedSets = completedSets + 1;
        if (newCompletedSets < totalSets) {
          onLastSetLoggedForRest?.({
            weight: weightNum,
            reps: totalReps,
            setNumber: newCompletedSets,
            totalSets,
            isPr: result.isNewPR,
          });
        }
        onSetComplete?.(newCompletedSets);

        // Complete block if last set
        if (newCompletedSets >= totalSets) {
          onBlockComplete(block.block.id, loggedSetsArray);
        } else {
          // Advancing to next set: parent updates lastPerformedWeightByExerciseId and completedSets; useEffect will apply defaults
          setInitialReps("");
          setRestPauseAttempts([]);
          setShowTimer(false);
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
      <div className="p-4 rounded-xl" style={{ background: "var(--fc-surface-sunken)" }}>
        <h4 className="font-semibold fc-text-primary mb-4 text-lg">
          Initial reps to failure
        </h4>
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
            {coachSuggestedWeight != null && coachSuggestedWeight > 0 && (
              <ApplySuggestedWeightButton
                suggestedKg={coachSuggestedWeight}
                onApply={() => { setWeight(String(coachSuggestedWeight)); setIsWeightPristine(false); }}
              />
            )}
          </div>
          <LargeInput
            label="Reps"
            value={initialReps}
            onChange={setInitialReps}
            placeholder="0"
            step="1"
            showStepper
            stepAmount={1}
          />
        </div>
      </div>

      {/* Timer */}
      {showTimer && (
        <div className="rounded-xl p-5 text-center" style={{ background: "color-mix(in srgb, var(--fc-status-warning) 8%, var(--fc-surface-card))", border: "2px solid color-mix(in srgb, var(--fc-status-warning) 25%, transparent)" }}>
          <div className="text-4xl font-bold mb-2" style={{ color: "var(--fc-status-warning)" }}>
            {formatTime(timerSeconds)}
          </div>
          <div className="text-sm fc-text-dim">
            Rest-Pause Timer
          </div>
        </div>
      )}

      {/* Rest-Pause Attempts */}
      {restPauseAttempts.length > 0 && (
        <div className="p-4 rounded-xl" style={{ background: "var(--fc-surface-sunken)" }}>
          <h4 className="font-semibold fc-text-primary mb-4 text-lg">
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
                    showStepper
                    stepAmount={1}
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
        </div>
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
      variant="fc-primary"
      className="w-full h-12 text-base font-bold uppercase tracking-wider rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
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
