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
import { useLoggingReset } from "../hooks/useLoggingReset";
import { getWeightDefaultAndSuggestion, getCoachSuggestedWeight } from "@/lib/weightDefaultService";
import { ApplySuggestedWeightButton } from "../ui/ApplySuggestedWeightButton";

export function DropSetExecutor({
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
  formatTime,
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

  const [initialWeight, setInitialWeight] = useState("");
  const [initialReps, setInitialReps] = useState("");
  const [dropWeight, setDropWeight] = useState("");
  const [dropReps, setDropReps] = useState("");
  const [isLoggingSet, setIsLoggingSet] = useState(false);
  useLoggingReset(isLoggingSet, setIsLoggingSet);
  const isManuallyEditingDropWeight = useRef(false);
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

  const dropPercentage = 20;
  const exerciseReps = currentExercise?.reps || block.block.reps_per_set || "";
  const dropSetReps = exerciseReps;

  useEffect(() => {
    setIsWeightPristine(true);
  }, [completedSets, currentExerciseIndex, exerciseId]);

  useEffect(() => {
    if (!isWeightPristine) return;
    if (default_weight != null && default_weight > 0) {
      setInitialWeight(String(default_weight));
      const dropWeightValue = default_weight * (1 - dropPercentage / 100);
      setDropWeight(String(Math.round(dropWeightValue * 2) / 2));
    } else {
      setInitialWeight("");
      setDropWeight("");
    }
  }, [isWeightPristine, default_weight, completedSets, exerciseId, dropPercentage]);

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

  if (currentExercise?.load_percentage != null) {
    const suggestedForDisplay = source === "percent_e1rm" ? suggested_weight : null;
    const loadDisplay = formatLoadPercentage(currentExercise.load_percentage, suggestedForDisplay);
    if (loadDisplay) {
      blockDetails.push({ label: "LOAD", value: loadDisplay });
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

    try {
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

        const newCompletedSets = completedSets + 1;
        if (newCompletedSets < totalSets) {
          onLastSetLoggedForRest?.({
            weight: initialWeightNum,
            reps: initialRepsNum,
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
      console.error("Error logging drop set:", error);
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
      {/* Initial Set */}
      <div className="p-4 rounded-xl" style={{ background: "var(--fc-surface-sunken)" }}>
        <h4 className="font-semibold mb-4 text-lg" style={{ color: "var(--fc-accent-cyan)" }}>
          Initial (100%)
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <LargeInput
              label="Weight"
              value={initialWeight}
              onChange={(val) => {
                setIsWeightPristine(false);
                setInitialWeight(val);
              }}
              placeholder="0"
              step="0.5"
              unit="kg"
              showStepper
              stepAmount={2.5}
            />
            {coachSuggestedWeight != null && coachSuggestedWeight > 0 && (
              <ApplySuggestedWeightButton
                suggestedKg={coachSuggestedWeight}
                onApply={() => {
                  setInitialWeight(String(coachSuggestedWeight));
                  setIsWeightPristine(false);
                  const dropVal = coachSuggestedWeight * (1 - dropPercentage / 100);
                  setDropWeight(String(Math.round(dropVal * 2) / 2));
                }}
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

      {/* Drop Set */}
      <div className="p-4 rounded-xl" style={{ background: "var(--fc-surface-sunken)" }}>
        <h4 className="font-semibold mb-4 text-lg" style={{ color: "var(--fc-status-error)" }}>
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
            showStepper
            stepAmount={2.5}
          />
          <LargeInput
            label="Reps"
            value={dropReps}
            onChange={setDropReps}
            placeholder="0"
            step="1"
            showStepper
            stepAmount={1}
          />
        </div>
      </div>
    </div>
  );

  const logButton = (
    <Button
      onClick={handleLog}
      disabled={isLoggingSet}
      variant="fc-primary"
      className="w-full h-12 text-base font-bold uppercase tracking-wider rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
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
