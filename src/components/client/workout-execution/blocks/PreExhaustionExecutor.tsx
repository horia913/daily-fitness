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
import { useLoggingReset } from "../hooks/useLoggingReset";
import { ApplySuggestedWeightButton } from "../ui/ApplySuggestedWeightButton";
import { getCoachSuggestedWeight } from "@/lib/weightDefaultService";

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
  onLastSetLoggedForRest,
}: BaseBlockExecutorProps) {
  const { addToast } = useToast();
  const isolationExercise = block.block.exercises?.[0];
  const compoundExercise = block.block.exercises?.[1];
  const totalSets = block.block.total_sets || 1;
  const completedSets = block.completedSets || 0;
  const currentSet = completedSets;

  const restBetween = block.block.rest_seconds || 15;

  const [isolationWeight, setIsolationWeight] = useState("");
  const [isolationReps, setIsolationReps] = useState("");
  const [compoundWeight, setCompoundWeight] = useState("");
  const [compoundReps, setCompoundReps] = useState("");
  const [isLoggingSet, setIsLoggingSet] = useState(false);
  useLoggingReset(isLoggingSet, setIsLoggingSet);
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
        setTimerSeconds((prev: number) => {
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

    try {
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

        const newCompletedSets = completedSets + 1;
        if (newCompletedSets < totalSets) {
          onLastSetLoggedForRest?.({
            weight: compoundWeightNum,
            reps: compoundRepsNum,
            setNumber: newCompletedSets,
            totalSets,
            isPr: result?.isNewPR,
          });
        }
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
    } finally {
      setIsLoggingSet(false);
    }
  };

  const loggingInputs = (
    <div className="space-y-4">
      {/* Isolation Exercise */}
      <div className="p-4 rounded-xl" style={{ background: "var(--fc-surface-sunken)" }}>
        <div className="mb-4">
          <h4 className="font-semibold text-lg" style={{ color: "var(--fc-accent-cyan)" }}>
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
          <div className="space-y-2">
            <LargeInput
              label="Weight"
              value={isolationWeight}
              onChange={setIsolationWeight}
              placeholder="0"
              step="0.5"
              unit="kg"
              showStepper
              stepAmount={2.5}
            />
            {isolationExercise?.load_percentage != null && (() => {
              const suggested = calculateSuggestedWeightUtil(
                isolationExercise.exercise_id,
                isolationExercise.load_percentage,
                e1rmMap
              );
              return suggested != null && suggested > 0 ? (
                <ApplySuggestedWeightButton
                  suggestedKg={Math.round(suggested * 2) / 2}
                  onApply={() => setIsolationWeight(String(suggested))}
                />
              ) : null;
            })()}
          </div>
          <LargeInput
            label="Reps"
            value={isolationReps}
            onChange={setIsolationReps}
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
            Rest Between Exercises
          </div>
        </div>
      )}

      {/* Compound Exercise */}
      <div className="p-4 rounded-xl" style={{ background: "var(--fc-surface-sunken)" }}>
        <div className="mb-4">
          <h4 className="font-semibold text-lg" style={{ color: "var(--fc-accent-purple)" }}>
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
          <div className="space-y-2">
            <LargeInput
              label="Weight"
              value={compoundWeight}
              onChange={setCompoundWeight}
              placeholder="0"
              step="0.5"
              unit="kg"
              showStepper
              stepAmount={2.5}
            />
            {(() => {
              const coachSuggested = getCoachSuggestedWeight(
                compoundExercise?.load_percentage,
                compoundExercise?.exercise_id ? (e1rmMap[compoundExercise.exercise_id] ?? null) : null
              );
              return coachSuggested != null && coachSuggested > 0 ? (
                <ApplySuggestedWeightButton
                  suggestedKg={coachSuggested}
                  onApply={() => setCompoundWeight(String(coachSuggested))}
                />
              ) : null;
            })()}
          </div>
          <LargeInput
            label="Reps"
            value={compoundReps}
            onChange={setCompoundReps}
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
