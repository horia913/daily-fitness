"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Flame, CheckCircle } from "lucide-react";
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
import { useLoggingReset } from "../hooks/useLoggingReset";
import { getWeightDefaultAndSuggestion, getCoachSuggestedWeight } from "@/lib/weightDefaultService";
import { ApplySuggestedWeightButton } from "../ui/ApplySuggestedWeightButton";

export function GiantSetExecutor({
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
  const exercises = block.block.exercises || [];
  const totalSets = block.block.total_sets || 1;
  const completedSets = block.completedSets || 0;
  const currentSet = completedSets;

  const [weights, setWeights] = useState<string[]>([]);
  const [reps, setReps] = useState<string[]>([]);
  const [isLoggingSet, setIsLoggingSet] = useState(false);
  useLoggingReset(isLoggingSet, setIsLoggingSet);
  const [weightsPristine, setWeightsPristine] = useState<boolean[]>([]);

  const results = exercises.map((ex) =>
    getWeightDefaultAndSuggestion({
      sessionStickyWeight: ex.exercise_id ? (lastPerformedWeightByExerciseId[ex.exercise_id] ?? null) : null,
      lastSessionWeight: ex.exercise_id ? (lastSessionWeightByExerciseId[ex.exercise_id] ?? null) : null,
      loadPercentage: ex.load_percentage ?? null,
      e1rm: ex.exercise_id ? (e1rmMap[ex.exercise_id] ?? null) : null,
    })
  );

  useEffect(() => {
    if (exercises.length > 0) {
      setWeightsPristine(new Array(exercises.length).fill(true));
    }
  }, [completedSets, exercises.length]);

  useEffect(() => {
    if (exercises.length === 0) return;
    const nextWeights: string[] = weights.length !== exercises.length ? [] : [...weights];
    for (let idx = 0; idx < exercises.length; idx++) {
      if (weightsPristine[idx] !== false) {
        const r = results[idx];
        const val = r?.default_weight != null && r.default_weight > 0 ? String(r.default_weight) : "";
        if (nextWeights.length <= idx) nextWeights.push(val);
        else if (nextWeights[idx] !== val) nextWeights[idx] = val;
      } else if (nextWeights.length <= idx) {
        nextWeights.push("");
      }
    }
    if (nextWeights.length !== weights.length || nextWeights.some((w, i) => weights[i] !== w)) {
      setWeights(nextWeights.length ? nextWeights : new Array(exercises.length).fill(""));
    }
    if (reps.length !== exercises.length) {
      setReps(new Array(exercises.length).fill(""));
    }
  }, [exercises.length, completedSets, lastPerformedWeightByExerciseId, lastSessionWeightByExerciseId, e1rmMap, weightsPristine]);

  // Block details
  const blockDetails: BlockDetail[] = [
    {
      label: "ROUNDS",
      value: totalSets,
    },
    {
      label: "REST BETWEEN",
      value: block.block.rest_seconds || 90,
      unit: "s",
    },
  ];

  // Add exercises list
  exercises.forEach((ex, idx) => {
    if (ex.reps) {
      blockDetails.push({
        label: `${idx + 1}. ${ex.exercise?.name || `Exercise ${idx + 1}`}`,
        value: `${ex.reps} reps`,
      });
      if (ex.load_percentage) {
        const suggestedWeight = calculateSuggestedWeightUtil(
          ex.exercise_id,
          ex.load_percentage,
          e1rmMap
        );
        const loadDisplay = formatLoadPercentage(
          ex.load_percentage,
          suggestedWeight
        );
        if (loadDisplay) {
          blockDetails.push({
            label: `LOAD (${idx + 1})`,
            value: loadDisplay,
          });
        }
      }
    }
  });

  const instructions = block.block.block_notes || undefined;

  const handleLog = async () => {
    if (exercises.length === 0 || isLoggingSet) return;

    const allValid = exercises.every((_, idx) => {
      const weightStr = weights[idx];
      const repsStr = reps[idx];
      
      // Check weight: must be entered (not empty or undefined), valid number, and >= 0
      // Allow "0" as a valid weight value
      if (weightStr === undefined || weightStr === null || String(weightStr).trim() === "") {
        console.log(`GiantSet: Exercise ${idx} weight invalid:`, weightStr);
        return false;
      }
      const weight = parseFloat(String(weightStr));
      if (isNaN(weight) || weight < 0) {
        console.log(`GiantSet: Exercise ${idx} weight parse failed:`, weightStr, weight);
        return false;
      }
      
      // Check reps: must be entered (not empty or undefined), valid number, and > 0
      if (repsStr === undefined || repsStr === null || String(repsStr).trim() === "") {
        console.log(`GiantSet: Exercise ${idx} reps invalid:`, repsStr);
        return false;
      }
      const repsNum = parseInt(String(repsStr));
      if (isNaN(repsNum) || repsNum <= 0) {
        console.log(`GiantSet: Exercise ${idx} reps parse failed:`, repsStr, repsNum);
        return false;
      }
      
      return true;
    });

    if (!allValid) {
      addToast({
        title: "Invalid Input",
        description: "Please enter valid weight and reps for all exercises",
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
      // Build giant_set_exercises array - only include valid exercises
      const giantSetExercises = exercises
        .map((exercise, idx) => {
          const weightNum = parseFloat(weights[idx] || "0");
          const repsNum = parseInt(reps[idx] || "0");
          if (!exercise?.exercise_id || isNaN(weightNum) || isNaN(repsNum)) {
            return null;
          }
          return {
            exercise_id: exercise.exercise_id,
            weight: weightNum,
            reps: repsNum,
            order: idx + 1,
          };
        })
        .filter(Boolean);

      // Log giant set as a single call
      const logData: any = {
        block_type: 'giant_set',
        round_number: completedSets + 1,
      };
      
      if (giantSetExercises.length > 0) {
        logData.giant_set_exercises = giantSetExercises;
      }
      
      const result = await logSetToDatabase(logData);

      // Build logged sets array for UI
      const loggedSetsArray: LoggedSet[] = exercises.map((exercise, idx) => ({
        id: `temp-${idx}-${Date.now()}`,
        exercise_id: exercise.exercise_id,
        block_id: block.block.id,
        set_number: completedSets + 1,
        weight_kg: parseFloat(weights[idx] || "0"),
        reps_completed: parseInt(reps[idx] || "0"),
        completed_at: new Date(),
      } as LoggedSet));

      const allSuccess = result.success;

      if (allSuccess) {
        addToast({
          title: "Giant Set Logged!",
          description: `${exercises.length} exercises completed`,
          variant: "success",
          duration: 2000,
        });

        const newCompletedSets = completedSets + 1;
        const setNumber = completedSets + 1;
        if (newCompletedSets < totalSets) {
          const firstWeight = parseFloat(weights[0] || "0");
          const firstReps = parseInt(reps[0] || "0", 10);
          onLastSetLoggedForRest?.({
            weight: firstWeight,
            reps: firstReps,
            setNumber,
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
          description: "Some exercises failed to save. Please try again.",
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
      {exercises.map((exercise, idx) => (
        <div
          key={exercise.id || idx}
          className="p-4 rounded-xl"
          style={{ background: "var(--fc-surface-sunken)" }}
        >
          <div className="mb-4">
            <h4 className="font-semibold fc-text-primary text-lg">
              {idx + 1}. {exercise.exercise?.name || `Exercise ${idx + 1}`}
              {exercise.exercise_letter && ` (${exercise.exercise_letter})`}
            </h4>
            <ExerciseActionButtons
              exercise={exercise}
              onVideoClick={onVideoClick}
              onAlternativesClick={onAlternativesClick}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <LargeInput
                label="Weight"
                value={weights[idx] || ""}
                onChange={(value) => {
                  setWeightsPristine((prev) => {
                    const next = [...(prev.length ? prev : new Array(exercises.length).fill(true))];
                    if (next[idx] !== false) next[idx] = false;
                    return next;
                  });
                  const newWeights = [...weights];
                  newWeights[idx] = value;
                  setWeights(newWeights);
                }}
                placeholder="0"
                step="0.5"
                unit="kg"
                showStepper
                stepAmount={2.5}
              />
              {(() => {
                const coachSuggested = getCoachSuggestedWeight(exercise.load_percentage, exercise.exercise_id ? (e1rmMap[exercise.exercise_id] ?? null) : null);
                return coachSuggested != null && coachSuggested > 0 ? (
                  <ApplySuggestedWeightButton
                    suggestedKg={coachSuggested}
                    onApply={() => {
                      setWeightsPristine((prev) => {
                        const next = [...(prev.length ? prev : new Array(exercises.length).fill(true))];
                        next[idx] = false;
                        return next;
                      });
                      const newWeights = [...weights];
                      newWeights[idx] = String(coachSuggested);
                      setWeights(newWeights);
                    }}
                  />
                ) : null;
              })()}
            </div>
            <LargeInput
              label="Reps"
              value={reps[idx] || ""}
              onChange={(value) => {
                const newReps = [...reps];
                newReps[idx] = value;
                setReps(newReps);
              }}
              placeholder="0"
              step="1"
              showStepper
              stepAmount={1}
            />
          </div>
        </div>
      ))}
    </div>
  );

  const logButton = (
    <Button
      onClick={handleLog}
      disabled={isLoggingSet}
      variant="fc-primary"
      className="w-full h-12 text-base font-bold uppercase tracking-wider rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Flame className="w-5 h-5 mr-2" />
      {isLoggingSet ? "Logging..." : "LOG GIANT SET"}
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
      exerciseName={`Giant Set: ${exercises.length} Exercises`}
      blockDetails={blockDetails}
      instructions={instructions}
      currentSet={currentSet}
      totalSets={totalSets}
      progressLabel="Round"
      loggingInputs={loggingInputs}
      logButton={logButton}
      showNavigation={true}
      currentExercise={exercises[0]}
      showRestTimer={!!block.block.rest_seconds}
    />
  );
}
