"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import { LargeInput } from "../ui/LargeInput";
import { useLoggingReset } from "../hooks/useLoggingReset";
import { GlassCard } from "@/components/ui/GlassCard";
import { BlockDetail, BaseBlockExecutorProps } from "../types";
import {
  BaseBlockExecutorLayout,
  formatLoadPercentage,
  calculateSuggestedWeightUtil,
} from "../BaseBlockExecutor";
import { LoggedSet } from "@/types/workoutBlocks";
import { RPEModal } from "@/components/client/RPEModal";

interface StraightSetExecutorProps extends BaseBlockExecutorProps {}

export function StraightSetExecutor({
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
  progressionSuggestion,
}: StraightSetExecutorProps) {
  const { addToast } = useToast();
  const currentExercise = block.block.exercises?.[currentExerciseIndex];
  // Use exercise.sets if available, otherwise fall back to block.total_sets, then default to 1
  const totalSets = (currentExercise?.sets !== null && currentExercise?.sets !== undefined)
    ? currentExercise.sets
    : (block.block.total_sets !== null && block.block.total_sets !== undefined)
      ? block.block.total_sets
      : 1;
  const completedSets = block.completedSets || 0;

  // Use block.completedSets for progress display (1-indexed)
  const currentSetNumber = completedSets + 1;
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [isLoggingSet, setIsLoggingSet] = useState(false);
  useLoggingReset(isLoggingSet, setIsLoggingSet);
  const [loggedSetsArray, setLoggedSetsArray] = useState<LoggedSet[]>([]);
  
  // RPE Modal State
  const [showRpeModal, setShowRpeModal] = useState(false);
  const [pendingSetLogId, setPendingSetLogId] = useState<string | null>(null);

  // Pre-fill with suggested weight when set number or exercise changes
  useEffect(() => {
    if (currentExercise?.load_percentage && currentExercise?.exercise_id) {
      const suggestedWeight = calculateSuggestedWeightUtil(
        currentExercise.exercise_id,
        currentExercise.load_percentage,
        e1rmMap
      );
      if (suggestedWeight && suggestedWeight > 0) {
        setWeight(suggestedWeight.toString());
      } else {
        setWeight("");
      }
    } else {
      setWeight("");
    }
    setReps("");
  }, [
    completedSets,
    currentExerciseIndex,
    currentExercise?.exercise_id,
    currentExercise?.load_percentage,
    e1rmMap,
  ]);

  // Get block details for display
  const blockDetails: BlockDetail[] = [
    {
      label: "SETS",
      value: totalSets,
    },
    {
      label: "REPS",
      value: currentExercise?.reps || block.block.reps_per_set || "-",
    },
    {
      label: "REST",
      value: currentExercise?.rest_seconds || block.block.rest_seconds || 60,
      unit: "s",
    },
  ];

  // Add LOAD if available
  const loadPercentage = currentExercise?.load_percentage;
  if (
    loadPercentage !== null &&
    loadPercentage !== undefined &&
    currentExercise?.exercise_id
  ) {
    const suggestedWeight = calculateSuggestedWeightUtil(
      currentExercise.exercise_id,
      loadPercentage,
      e1rmMap
    );
    const loadDisplay = formatLoadPercentage(loadPercentage, suggestedWeight);
    if (loadDisplay) {
      blockDetails.push({
        label: "LOAD",
        value: loadDisplay,
      });
    }
  }

  // Add TEMPO if available
  if (currentExercise?.tempo) {
    blockDetails.push({
      label: "TEMPO",
      value: currentExercise.tempo,
    });
  }

  // Add RIR if available
  if (currentExercise?.rir !== null && currentExercise?.rir !== undefined) {
    blockDetails.push({
      label: "RIR",
      value: currentExercise.rir,
    });
  }

  // Instructions
  const instructions =
    currentExercise?.notes || block.block.block_notes || undefined;

  // Handle logging one set at a time
  const handleLog = async () => {
    if (!currentExercise || isLoggingSet) return;

    const weightNum = parseFloat(weight);
    const repsNum = parseInt(reps);

    // Validate input - weight can be 0, reps must be > 0
    if (
      !weight ||
      weight.trim() === "" ||
      isNaN(weightNum) ||
      weightNum < 0 ||
      !reps ||
      reps.trim() === "" ||
      isNaN(repsNum) ||
      repsNum <= 0
    ) {
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
      // Log the current set
      const logData: any = {
        block_type: "straight_set",
        set_number: currentSetNumber,
      };

      // Only add fields if they're defined
      if (currentExercise?.exercise_id)
        logData.exercise_id = currentExercise.exercise_id;
      if (weightNum !== undefined && weightNum !== null && !isNaN(weightNum))
        logData.weight = weightNum;
      if (repsNum !== undefined && repsNum !== null && !isNaN(repsNum))
        logData.reps = repsNum;

      const result = await logSetToDatabase(logData);

      if (result.success) {
        const loggedSet: LoggedSet = {
          id: result.set_log_id || `temp-${currentSetNumber}-${Date.now()}`,
          exercise_id: currentExercise.exercise_id,
          block_id: block.block.id,
          set_number: currentSetNumber,
          weight_kg: weightNum,
          reps_completed: repsNum,
          completed_at: new Date(),
        } as LoggedSet;

        const updatedLoggedSets = [...loggedSetsArray, loggedSet];
        setLoggedSetsArray(updatedLoggedSets);

        console.log("[StraightSetExecutor] set logged", {
          currentSetNumber,
          totalSets,
          isLastSet: currentSetNumber >= totalSets,
          set_log_id: result.set_log_id,
        });
        console.log("[log-set success]", {
          blockId: block.block.id,
          setNumber: currentSetNumber,
          isLastSet: currentSetNumber >= totalSets,
          completedSets: currentSetNumber,
          totalSets,
          set_log_id: result.set_log_id,
        });

        if (result.e1rm && onE1rmUpdate) {
          onE1rmUpdate(currentExercise.exercise_id, result.e1rm);
        }

        addToast({
          title: "Set Logged!",
          description: `Set ${currentSetNumber} of ${totalSets}: ${weightNum}kg × ${repsNum} reps`,
          variant: "success",
          duration: 2000,
        });

        // Update parent with new completed sets count
        const newCompletedSets = currentSetNumber;
        onSetComplete?.(newCompletedSets);

        // Show RPE modal if we have a set_log_id
        if (result.set_log_id) {
          setPendingSetLogId(result.set_log_id);
          setShowRpeModal(true);
        }

        // Check if this was the last set
        if (currentSetNumber >= totalSets) {
          console.log("[StraightSetExecutor] triggering onBlockComplete", {
            blockId: block.block.id,
            currentSetNumber,
            totalSets,
          });
          // Complete the block
          onBlockComplete(block.block.id, updatedLoggedSets);
        } else {
          // Check if rest timer will show - if so, don't clear inputs yet
          const restSeconds =
            currentExercise?.rest_seconds || block.block.rest_seconds || 0;
          if (restSeconds === 0) {
            // No rest timer, clear inputs immediately (will be pre-filled by useEffect)
            setWeight("");
            setReps("");
          }
          // If restSeconds > 0, rest timer will show and inputs will be cleared
          // when the timer completes and completedSets updates (via useEffect)
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
      console.error("Error logging set:", error);
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

  // Handle RPE selection - call API to update the set log
  const handleRpeSelect = useCallback(async (rpe: number) => {
    if (!pendingSetLogId) {
      setShowRpeModal(false);
      return;
    }

    try {
      const response = await fetch('/api/set-rpe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          set_log_id: pendingSetLogId,
          rpe,
        }),
      });

      if (response.ok) {
        console.log('[RPE] Successfully updated RPE:', { set_log_id: pendingSetLogId, rpe });
      } else {
        console.error('[RPE] Failed to update RPE:', await response.text());
      }
    } catch (error) {
      console.error('[RPE] Error updating RPE:', error);
    } finally {
      setShowRpeModal(false);
      setPendingSetLogId(null);
    }
  }, [pendingSetLogId]);

  // Handle RPE skip - just close the modal
  const handleRpeSkip = useCallback(() => {
    console.log('[RPE] User skipped RPE input');
    setShowRpeModal(false);
    setPendingSetLogId(null);
  }, []);

  // Handle RPE modal close (backdrop click or X button)
  const handleRpeClose = useCallback(() => {
    setShowRpeModal(false);
    setPendingSetLogId(null);
  }, []);

  // Logging inputs - show only current set
  const loggingInputs = (
    <div className="space-y-4">
      <GlassCard elevation={1} className="p-4 space-y-4">
        <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Set {currentSetNumber} of {totalSets}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <LargeInput
            label="Weight"
            value={weight}
            onChange={setWeight}
            placeholder="0"
            step="0.5"
            unit="kg"
            showStepper
            stepAmount={2.5}
          />
          <LargeInput
            label="Reps"
            value={reps}
            onChange={setReps}
            placeholder="0"
            step="1"
            showStepper
            stepAmount={1}
          />
        </div>
      </GlassCard>
    </div>
  );

  // Log button
  const logButton = (
    <Button
      onClick={handleLog}
      disabled={
        isLoggingSet ||
        !weight ||
        weight.trim() === "" ||
        isNaN(parseFloat(weight)) ||
        parseFloat(weight) < 0 ||
        !reps ||
        reps.trim() === "" ||
        isNaN(parseInt(reps)) ||
        parseInt(reps) <= 0
      }
      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <CheckCircle className="w-5 h-5 mr-2" />
      {isLoggingSet ? "Logging..." : "LOG SET"}
    </Button>
  );

  return (
    <>
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
          progressionSuggestion,
        }}
        exerciseName={currentExercise?.exercise?.name || "Exercise"}
        blockDetails={blockDetails}
        instructions={instructions}
        currentSet={currentSetNumber}
        totalSets={totalSets}
        progressLabel="Set"
        loggingInputs={loggingInputs}
        logButton={logButton}
        showNavigation={true}
        currentExercise={currentExercise}
        showRestTimer={
          !!(block.block.rest_seconds || currentExercise?.rest_seconds)
        }
        progressionSuggestion={progressionSuggestion}
      />
      
      {/* RPE Modal - Non-blocking, appears after set is logged */}
      <RPEModal
        isOpen={showRpeModal}
        onSelect={handleRpeSelect}
        onSkip={handleRpeSkip}
        onClose={handleRpeClose}
      />
    </>
  );
}
