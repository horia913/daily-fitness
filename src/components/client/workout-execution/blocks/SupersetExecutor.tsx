"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Zap, CheckCircle } from "lucide-react";
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

export function SupersetExecutor({
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
  const exerciseA = block.block.exercises?.[0];
  const exerciseB = block.block.exercises?.[1];
  const totalSets = block.block.total_sets || 1;
  const completedSets = block.completedSets || 0;
  const currentSet = completedSets;

  const [weightA, setWeightA] = useState("");
  const [repsA, setRepsA] = useState("");
  const [weightB, setWeightB] = useState("");
  const [repsB, setRepsB] = useState("");
  const [isLoggingSet, setIsLoggingSet] = useState(false);
  useLoggingReset(isLoggingSet, setIsLoggingSet);
  const [isWeightAPristine, setIsWeightAPristine] = useState(true);
  const [isWeightBPristine, setIsWeightBPristine] = useState(true);

  const resultA = getWeightDefaultAndSuggestion({
    sessionStickyWeight: exerciseA?.exercise_id ? (lastPerformedWeightByExerciseId[exerciseA.exercise_id] ?? null) : null,
    lastSessionWeight: exerciseA?.exercise_id ? (lastSessionWeightByExerciseId[exerciseA.exercise_id] ?? null) : null,
    loadPercentage: exerciseA?.load_percentage ?? null,
    e1rm: exerciseA?.exercise_id ? (e1rmMap[exerciseA.exercise_id] ?? null) : null,
  });
  const resultB = getWeightDefaultAndSuggestion({
    sessionStickyWeight: exerciseB?.exercise_id ? (lastPerformedWeightByExerciseId[exerciseB.exercise_id] ?? null) : null,
    lastSessionWeight: exerciseB?.exercise_id ? (lastSessionWeightByExerciseId[exerciseB.exercise_id] ?? null) : null,
    loadPercentage: exerciseB?.load_percentage ?? null,
    e1rm: exerciseB?.exercise_id ? (e1rmMap[exerciseB.exercise_id] ?? null) : null,
  });
  const coachSuggestedA = getCoachSuggestedWeight(exerciseA?.load_percentage ?? null, exerciseA?.exercise_id ? (e1rmMap[exerciseA.exercise_id] ?? null) : null);
  const coachSuggestedB = getCoachSuggestedWeight(exerciseB?.load_percentage ?? null, exerciseB?.exercise_id ? (e1rmMap[exerciseB.exercise_id] ?? null) : null);

  useEffect(() => {
    setIsWeightAPristine(true);
    setIsWeightBPristine(true);
  }, [completedSets]);

  useEffect(() => {
    if (isWeightAPristine) {
      if (resultA.default_weight != null && resultA.default_weight > 0) setWeightA(String(resultA.default_weight));
      else setWeightA("");
    }
  }, [isWeightAPristine, resultA.default_weight]);
  useEffect(() => {
    if (isWeightBPristine) {
      if (resultB.default_weight != null && resultB.default_weight > 0) setWeightB(String(resultB.default_weight));
      else setWeightB("");
    }
  }, [isWeightBPristine, resultB.default_weight]);

  // Block details
  const blockDetails: BlockDetail[] = [
    {
      label: "SETS",
      value: totalSets,
    },
    {
      label: "REST",
      value: block.block.rest_seconds || exerciseA?.rest_seconds || 60,
      unit: "s",
    },
  ];

  if (exerciseA) {
    blockDetails.push({
      label: "EXERCISE A",
      value: exerciseA.exercise?.name || "Exercise A",
    });
    if (exerciseA.reps) {
      blockDetails.push({
        label: "REPS (A)",
        value: exerciseA.reps,
      });
    }
    if (exerciseA.load_percentage != null) {
      const suggestedForDisplay = resultA.source === "percent_e1rm" ? resultA.suggested_weight : null;
      const loadDisplay = formatLoadPercentage(exerciseA.load_percentage, suggestedForDisplay);
      if (loadDisplay) {
        blockDetails.push({ label: "LOAD (A)", value: loadDisplay });
      }
    }
  }

  if (exerciseB) {
    blockDetails.push({
      label: "EXERCISE B",
      value: exerciseB.exercise?.name || "Exercise B",
    });
    if (exerciseB.reps) {
      blockDetails.push({
        label: "REPS (B)",
        value: exerciseB.reps,
      });
    }
    if (exerciseB.load_percentage != null) {
      const suggestedForDisplay = resultB.source === "percent_e1rm" ? resultB.suggested_weight : null;
      const loadDisplay = formatLoadPercentage(exerciseB.load_percentage, suggestedForDisplay);
      if (loadDisplay) {
        blockDetails.push({ label: "LOAD (B)", value: loadDisplay });
      }
    }
  }

  const instructions = block.block.block_notes || undefined;

  const handleLog = async () => {
    if (!exerciseA || !exerciseB || isLoggingSet) return;

    const weightANum = parseFloat(weightA);
    const repsANum = parseInt(repsA);
    const weightBNum = parseFloat(weightB);
    const repsBNum = parseInt(repsB);

    if (!weightA || weightA.trim() === "" || isNaN(weightANum) || weightANum < 0 || 
        !repsA || repsA.trim() === "" || isNaN(repsANum) || repsANum <= 0 || 
        !weightB || weightB.trim() === "" || isNaN(weightBNum) || weightBNum < 0 || 
        !repsB || repsB.trim() === "" || isNaN(repsBNum) || repsBNum <= 0) {
      addToast({
        title: "Invalid Input",
        description: "Please enter valid weight and reps for both exercises",
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
      // Log superset as a single call with both exercises
      // Calculate set number from current state
      const setNumber = completedSets + 1;
      
      const logData: any = {
        block_type: 'superset',
        set_number: setNumber,
      };
      
      // Only add fields if they're defined
      if (exerciseA?.exercise_id) logData.superset_exercise_a_id = exerciseA.exercise_id;
      if (weightANum !== undefined && weightANum !== null) logData.superset_weight_a = weightANum;
      if (repsANum !== undefined && repsANum !== null) logData.superset_reps_a = repsANum;
      if (exerciseB?.exercise_id) logData.superset_exercise_b_id = exerciseB.exercise_id;
      if (weightBNum !== undefined && weightBNum !== null) logData.superset_weight_b = weightBNum;
      if (repsBNum !== undefined && repsBNum !== null) logData.superset_reps_b = repsBNum;
      
      const result = await logSetToDatabase(logData);

      if (result.success) {
        const loggedSetsArray: LoggedSet[] = [
          {
            id: `temp-a-${Date.now()}`,
            exercise_id: exerciseA.exercise_id,
            block_id: block.block.id,
            set_number: setNumber,
            weight_kg: weightANum,
            reps_completed: repsANum,
            completed_at: new Date(),
          } as LoggedSet,
          {
            id: `temp-b-${Date.now()}`,
            exercise_id: exerciseB.exercise_id,
            block_id: block.block.id,
            set_number: setNumber,
            weight_kg: weightBNum,
            reps_completed: repsBNum,
            completed_at: new Date(),
          } as LoggedSet,
        ];

        // Update e1RM for exercise A (API calculates e1RM for exercise A in superset)
        if (result.e1rm && onE1rmUpdate) {
          onE1rmUpdate(exerciseA.exercise_id, result.e1rm);
        }

        addToast({
          title: "Superset Logged!",
          description: `Exercise A: ${weightANum}kg × ${repsANum} reps, Exercise B: ${weightBNum}kg × ${repsBNum} reps`,
          variant: "success",
          duration: 2000,
        });

        const newCompletedSets = completedSets + 1;
        if (newCompletedSets < totalSets) {
          onLastSetLoggedForRest?.({
            weight: weightANum,
            reps: repsANum,
            setNumber: setNumber,
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
          description: "Failed to save sets. Please try again.",
          variant: "destructive",
          duration: 5000,
        });
      }
    } finally {
      setIsLoggingSet(false);
    }
  };

  const loggingInputs = (
    <div className="space-y-6">
      {/* Exercise A */}
      <div className="p-4 rounded-xl" style={{ background: "var(--fc-surface-sunken)" }}>
        <div className="mb-4">
          <h4 className="font-semibold text-lg" style={{ color: "var(--fc-accent-cyan)" }}>
            Exercise A: {exerciseA?.exercise?.name || "Exercise A"}
          </h4>
          {exerciseA && (
            <ExerciseActionButtons
              exercise={exerciseA}
              onVideoClick={onVideoClick}
              onAlternativesClick={onAlternativesClick}
            />
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <LargeInput
              label="Weight"
              value={weightA}
              onChange={(val) => { setIsWeightAPristine(false); setWeightA(val); }}
              placeholder="0"
              step="0.5"
              unit="kg"
              showStepper
              stepAmount={2.5}
            />
            {coachSuggestedA != null && coachSuggestedA > 0 && (
              <ApplySuggestedWeightButton
                suggestedKg={coachSuggestedA}
                onApply={() => { setWeightA(String(coachSuggestedA)); setIsWeightAPristine(false); }}
              />
            )}
          </div>
          <LargeInput
            label="Reps"
            value={repsA}
            onChange={setRepsA}
            placeholder="0"
            step="1"
            showStepper
            stepAmount={1}
          />
        </div>
      </div>

      {/* Exercise B */}
      <div className="p-4 rounded-xl" style={{ background: "var(--fc-surface-sunken)" }}>
        <div className="mb-4">
          <h4 className="font-semibold text-lg" style={{ color: "var(--fc-accent-purple)" }}>
            Exercise B: {exerciseB?.exercise?.name || "Exercise B"}
          </h4>
          {exerciseB && (
            <ExerciseActionButtons
              exercise={exerciseB}
              onVideoClick={onVideoClick}
              onAlternativesClick={onAlternativesClick}
            />
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <LargeInput
              label="Weight"
              value={weightB}
              onChange={(val) => { setIsWeightBPristine(false); setWeightB(val); }}
              placeholder="0"
              step="0.5"
              unit="kg"
              showStepper
              stepAmount={2.5}
            />
            {coachSuggestedB != null && coachSuggestedB > 0 && (
              <ApplySuggestedWeightButton
                suggestedKg={coachSuggestedB}
                onApply={() => { setWeightB(String(coachSuggestedB)); setIsWeightBPristine(false); }}
              />
            )}
          </div>
          <LargeInput
            label="Reps"
            value={repsB}
            onChange={setRepsB}
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
      <Zap className="w-5 h-5 mr-2" />
      {isLoggingSet ? "Logging..." : "LOG SUPERSET"}
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
      exerciseName={`${exerciseA?.exercise?.name || "Exercise A"} + ${
        exerciseB?.exercise?.name || "Exercise B"
      }`}
      blockDetails={blockDetails}
      instructions={instructions}
      currentSet={currentSet}
      totalSets={totalSets}
      progressLabel="Set"
      loggingInputs={loggingInputs}
      logButton={logButton}
      showNavigation={true}
      currentExercise={exerciseA}
      showRestTimer={!!(block.block.rest_seconds || exerciseA?.rest_seconds)}
    />
  );
}
