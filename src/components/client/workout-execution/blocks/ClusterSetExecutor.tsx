"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link, CheckCircle } from "lucide-react";
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

export function ClusterSetExecutor({
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

  const clustersPerSet: number = 3;
  const repsPerCluster: number = 2;
  const intraClusterRest: number = 20;
  const restBetweenSets = block.block.rest_seconds || 90;

  const [weight, setWeight] = useState("");
  const [isLoggingSet, setIsLoggingSet] = useState(false);
  useLoggingReset(isLoggingSet, setIsLoggingSet);
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

  // Block details
  const blockDetails: BlockDetail[] = [
    {
      label: "SETS",
      value: totalSets,
    },
    {
      label: "CLUSTERS/SET",
      value: clustersPerSet,
    },
    {
      label: "REPS/CLUSTER",
      value: repsPerCluster,
    },
    {
      label: "INTRA-CLUSTER REST",
      value: intraClusterRest,
      unit: "s",
    },
    {
      label: "REST BETWEEN SETS",
      value: restBetweenSets,
      unit: "s",
    },
  ];

  if (currentExercise?.load_percentage != null) {
    const suggestedForDisplay = source === "percent_e1rm" ? suggested_weight : null;
    const loadDisplay = formatLoadPercentage(currentExercise.load_percentage, suggestedForDisplay);
    if (loadDisplay) blockDetails.push({ label: "LOAD", value: loadDisplay });
  }

  const instructions =
    currentExercise?.notes || block.block.block_notes || undefined;

  const handleLog = async () => {
    if (!currentExercise || isLoggingSet) return;

    const weightNum = parseFloat(weight);
    if (!weight || weight.trim() === "" || isNaN(weightNum) || weightNum < 0) {
      addToast({
        title: "Invalid Input",
        description: "Please enter valid weight",
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
      // Log cluster set
      // Note: For cluster sets, we log each cluster separately
      // This logs the first cluster - subsequent clusters would be logged with cluster_number incremented
      const logData: any = {
        block_type: 'cluster_set',
        set_number: completedSets + 1,
        cluster_number: 1, // First cluster in the set
      };
      
      // Only add fields if they're defined
      if (currentExercise?.exercise_id) logData.exercise_id = currentExercise.exercise_id;
      if (weightNum !== undefined && weightNum !== null) logData.weight = weightNum;
      if (repsPerCluster !== undefined && repsPerCluster !== null) logData.reps = repsPerCluster;
      
      const result = await logSetToDatabase(logData);

      if (result.success) {
        // Calculate total reps: reps per cluster × clusters per set
        const totalReps = repsPerCluster * clustersPerSet;
        
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

        if (result.e1rm && onE1rmUpdate) {
          onE1rmUpdate(currentExercise.exercise_id, result.e1rm);
        }

        addToast({
          title: "Cluster Set Logged!",
          description: `${weightNum}kg × ${repsPerCluster} reps × ${clustersPerSet} clusters`,
          variant: "success",
          duration: 2000,
        });

        const newCompletedSets = completedSets + 1;
        const setNumber = completedSets + 1;
        if (newCompletedSets < totalSets) {
          onLastSetLoggedForRest?.({
            weight: weightNum,
            reps: totalReps,
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
          description: result.error || "Failed to save set. Please try again.",
          variant: "destructive",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Error logging cluster set:", error);
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
      <div className="p-4 rounded-xl" style={{ background: "var(--fc-surface-sunken)" }}>
        <div className="text-sm font-semibold fc-text-dim mb-4">
          Cluster 1 of {clustersPerSet} (Set {currentSet + 1} of {totalSets})
        </div>
        <div className="space-y-4">
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
          <div className="text-sm fc-text-dim">
            Reps per cluster: {repsPerCluster} | Total reps:{" "}
            {repsPerCluster * clustersPerSet}
          </div>
          <div className="text-xs fc-text-dim">
            Rest {intraClusterRest}s between clusters, {restBetweenSets}s after
            set
          </div>
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
      <Link className="w-5 h-5 mr-2" />
      {isLoggingSet ? "Logging..." : "LOG CLUSTER SET"}
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
      showRestTimer={!!intraClusterRest}
    />
  );
}
