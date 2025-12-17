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

export function ClusterSetExecutor({
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
  formatTime,
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

  // Cluster set parameters
  const clustersPerSet =
    (block.block.block_parameters as any)?.clusters_per_set || 3;
  const repsPerCluster =
    (block.block.block_parameters as any)?.reps_per_cluster || 2;
  const intraClusterRest =
    (block.block.block_parameters as any)?.intra_cluster_rest || 20;
  const restBetweenSets = block.block.rest_seconds || 90;

  const [weight, setWeight] = useState("");
  const [isLoggingSet, setIsLoggingSet] = useState(false);

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

      // Update parent with new completed sets count
      const newCompletedSets = completedSets + 1;
      onSetComplete?.(newCompletedSets);

      // Complete block if last set
      if (newCompletedSets >= totalSets) {
        setWeight("");
        onBlockComplete(block.block.id, loggedSetsArray);
      } else {
        // Check if rest timer will show - if so, don't clear weight yet
        // For cluster sets, use intra-cluster rest (rest between exercises within cluster)
        // restBetweenSets is only for rest AFTER completing a full set
        const restSeconds = intraClusterRest || currentExercise?.rest_seconds || block.block.rest_seconds || 0;
        if (restSeconds === 0) {
          // No rest timer, clear weight immediately
          setWeight("");
        }
        // If restSeconds > 0, rest timer will show and weight will be cleared
        // when the timer completes and completedSets updates
      }
    } else {
      addToast({
        title: "Failed to Save",
        description: "Failed to save set. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    }

    setIsLoggingSet(false);
  };

  const loggingInputs = (
    <div className="space-y-4">
      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
        <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
          Cluster 1 of {clustersPerSet} (Set {currentSet + 1} of {totalSets})
        </div>
        <div className="space-y-4">
          <LargeInput
            label="Weight"
            value={weight}
            onChange={setWeight}
            placeholder="0"
            step="0.5"
            unit="kg"
          />
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Reps per cluster: {repsPerCluster} | Total reps:{" "}
            {repsPerCluster * clustersPerSet}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-500">
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
      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-lg py-4"
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
