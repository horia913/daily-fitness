"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Play, Pause, RotateCcw, Heart } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import {
  BaseBlockExecutorLayout,
  formatTime,
} from "../BaseBlockExecutor";
import { LargeInput } from "../ui/LargeInput";
import { BlockDetail, BaseBlockExecutorProps } from "../types";
import { LoggedSet } from "@/types/workoutBlocks";
import { GlassCard } from "@/components/ui/GlassCard";
import { useLoggingReset } from "../hooks/useLoggingReset";

export function HRSetExecutor({
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
  progressionSuggestion,
}: BaseBlockExecutorProps) {
  const { addToast } = useToast();
  const currentExercise = block.block.exercises?.[currentExerciseIndex];
  
  // Read from special table (hr_sets)
  const hrSet = block.block.hr_sets?.find(
    (hr: any) => hr.exercise_id === currentExercise?.exercise_id || !currentExercise?.exercise_id
  ) || block.block.hr_sets?.[0];
  
  const isIntervals = hrSet?.is_intervals ?? false;
  const hrZone = hrSet?.hr_zone;
  const hrPercentageMin = hrSet?.hr_percentage_min;
  const hrPercentageMax = hrSet?.hr_percentage_max;
  const durationSeconds = hrSet?.duration_seconds || 1800; // Default 30 minutes for continuous
  const workDurationSeconds = hrSet?.work_duration_seconds || 300; // Default 5 minutes for intervals
  const restDurationSeconds = hrSet?.rest_duration_seconds || 180; // Default 3 minutes for intervals
  const targetRounds = hrSet?.target_rounds || 4;

  // Continuous mode state
  const [timeRemaining, setTimeRemaining] = useState(durationSeconds);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Interval mode state
  const [currentRound, setCurrentRound] = useState(1);
  const [isWorkPhase, setIsWorkPhase] = useState(true);
  const [intervalTimeRemaining, setIntervalTimeRemaining] = useState(workDurationSeconds);
  
  // HR input state
  const [currentHRZone, setCurrentHRZone] = useState("");
  const [currentHRPercentage, setCurrentHRPercentage] = useState("");
  const [distanceMeters, setDistanceMeters] = useState("");
  const [averageHRPercentage, setAverageHRPercentage] = useState("");
  
  // Logging state
  const [isLoggingSet, setIsLoggingSet] = useState(false);
  useLoggingReset(isLoggingSet, setIsLoggingSet);
  const [loggedSets, setLoggedSets] = useState<LoggedSet[]>([]);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer logic for continuous mode
  useEffect(() => {
    if (isActive && timeRemaining > 0 && !isPaused && !isIntervals) {
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
  }, [isActive, timeRemaining, isPaused, isIntervals]);

  // Timer logic for interval mode
  useEffect(() => {
    if (isActive && intervalTimeRemaining > 0 && !isPaused && isIntervals) {
      timerRef.current = setInterval(() => {
        setIntervalTimeRemaining((prev) => {
          if (prev <= 1) {
            // Switch phase
            if (isWorkPhase) {
              // Work phase complete, switch to rest
              setIsWorkPhase(false);
              return restDurationSeconds;
            } else {
              // Rest phase complete, move to next round or finish
              if (currentRound < targetRounds) {
                setCurrentRound((prev) => prev + 1);
                setIsWorkPhase(true);
                return workDurationSeconds;
              } else {
                // All rounds complete
                setIsActive(false);
                return 0;
              }
            }
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
  }, [isActive, intervalTimeRemaining, isPaused, isIntervals, isWorkPhase, currentRound, targetRounds, workDurationSeconds, restDurationSeconds]);

  // Block details
  const blockDetails: BlockDetail[] = [];
  
  if (hrZone) {
    blockDetails.push({
      label: "HR ZONE",
      value: `Zone ${hrZone}`,
    });
  } else if (hrPercentageMin && hrPercentageMax) {
    blockDetails.push({
      label: "HR RANGE",
      value: `${hrPercentageMin}-${hrPercentageMax}%`,
    });
  }
  
  if (isIntervals) {
    blockDetails.push({
      label: "ROUNDS",
      value: `${currentRound}/${targetRounds}`,
    });
    blockDetails.push({
      label: "PHASE",
      value: isWorkPhase ? "WORK" : "REST",
    });
  } else {
    blockDetails.push({
      label: "DURATION",
      value: formatTime(timeRemaining),
    });
  }

  const instructions =
    currentExercise?.notes || block.block.block_notes || undefined;

  const handleStartTimer = () => {
    setIsActive(true);
    setIsPaused(false);
    if (isIntervals) {
      setIntervalTimeRemaining(workDurationSeconds);
      setIsWorkPhase(true);
      setCurrentRound(1);
    } else {
      setTimeRemaining(durationSeconds);
    }
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
    if (isIntervals) {
      setIntervalTimeRemaining(workDurationSeconds);
      setIsWorkPhase(true);
      setCurrentRound(1);
    } else {
      setTimeRemaining(durationSeconds);
    }
  };

  const handleLogSet = async () => {
    if (!sessionId || !currentExercise?.exercise_id) {
      addToast({
        title: "Error",
        description: "Missing session or exercise information",
        variant: "destructive",
      });
      return;
    }

    // Validate HR input
    if (!currentHRZone && !currentHRPercentage) {
      addToast({
        title: "HR Required",
        description: "Please enter either HR zone or HR percentage",
        variant: "destructive",
      });
      return;
    }

    setIsLoggingSet(true);

    try {
      const logData: any = {
        workout_log_id: sessionId,
        exercise_id: currentExercise.exercise_id,
        set_number: isIntervals ? currentRound : loggedSets.length + 1,
        hr_zone: currentHRZone ? parseInt(currentHRZone) : null,
        hr_percentage: currentHRPercentage ? parseFloat(currentHRPercentage) : null,
        hr_distance_meters: distanceMeters ? parseFloat(distanceMeters) : null,
      };

      if (isIntervals) {
        logData.hr_interval_round = currentRound;
        logData.hr_work_duration_seconds = isWorkPhase ? workDurationSeconds - intervalTimeRemaining : workDurationSeconds;
        logData.hr_rest_duration_seconds = !isWorkPhase ? restDurationSeconds - intervalTimeRemaining : restDurationSeconds;
        logData.hr_average_percentage = averageHRPercentage ? parseFloat(averageHRPercentage) : null;
      } else {
        logData.hr_duration_seconds = durationSeconds - timeRemaining;
      }

      const result = await logSetToDatabase(logData);

      if (result.success) {
        const newLoggedSet: LoggedSet = {
          id: `temp-${Date.now()}`,
          exercise_id: currentExercise.exercise_id,
          block_id: block.block.id,
          set_number: isIntervals ? currentRound : loggedSets.length + 1,
          completed_at: new Date(),
        };

        setLoggedSets([...loggedSets, newLoggedSet]);

        // Clear inputs
        setCurrentHRZone("");
        setCurrentHRPercentage("");
        setDistanceMeters("");
        setAverageHRPercentage("");

        addToast({
          title: "Set Logged",
          description: `HR set ${isIntervals ? `round ${currentRound}` : loggedSets.length + 1} logged successfully`,
          variant: "success",
        });

        // If intervals and all rounds logged, or continuous and time is up, complete block
        if (isIntervals && currentRound >= targetRounds) {
          onBlockComplete(block.block.id, loggedSets);
        } else if (!isIntervals && timeRemaining === 0) {
          onBlockComplete(block.block.id, loggedSets);
        }
      } else {
        addToast({
          title: "Error",
          description: result.error?.message || "Failed to log set",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error logging HR set:", error);
      addToast({
        title: "Error",
        description: error.message || "Failed to log set",
        variant: "destructive",
      });
    } finally {
      setIsLoggingSet(false);
    }
  };

  const exerciseName = currentExercise?.exercise?.name || "HR Training";

  const loggingInputs = (
    <div className="space-y-4">
      {/* HR Input - Zone or Percentage */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">HR Zone (1-5)</label>
          <LargeInput
            type="number"
            value={currentHRZone}
            onChange={(value) => {
              setCurrentHRZone(value);
              setCurrentHRPercentage(""); // Clear percentage when zone is set
            }}
            placeholder="e.g., 2"
            min="1"
            max="5"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">HR %</label>
          <LargeInput
            type="number"
            value={currentHRPercentage}
            onChange={(value) => {
              setCurrentHRPercentage(value);
              setCurrentHRZone(""); // Clear zone when percentage is set
            }}
            placeholder="e.g., 65"
            min="50"
            max="100"
          />
        </div>
      </div>

      {/* Distance (optional) */}
      <div>
        <label className="block text-sm font-medium mb-2">Distance (meters, optional)</label>
        <LargeInput
          type="number"
          value={distanceMeters}
          onChange={(value) => setDistanceMeters(value)}
          placeholder="e.g., 5000"
          min="0"
        />
      </div>

      {/* Average HR for intervals */}
      {isIntervals && isWorkPhase && (
        <div>
          <label className="block text-sm font-medium mb-2">Average HR % (for this interval)</label>
          <LargeInput
            type="number"
            value={averageHRPercentage}
            onChange={(value) => setAverageHRPercentage(value)}
            placeholder="e.g., 68"
            min="50"
            max="100"
          />
        </div>
      )}
    </div>
  );

  const logButton = (
    <Button
      onClick={handleLogSet}
      disabled={isLoggingSet || (!currentHRZone && !currentHRPercentage)}
      className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white py-6 text-lg font-semibold"
    >
      {isLoggingSet ? (
        "Logging..."
      ) : (
        <>
          <CheckCircle className="w-5 h-5 mr-2" />
          Log {isIntervals ? `Round ${currentRound}` : "Set"}
        </>
      )}
    </Button>
  );

  return (
    <BaseBlockExecutorLayout
      block={block}
      exerciseName={exerciseName}
      blockDetails={blockDetails}
      instructions={instructions}
      currentSet={isIntervals ? currentRound : loggedSets.length + 1}
      totalSets={isIntervals ? targetRounds : 1}
      progressLabel={isIntervals ? "Round" : "Set"}
      loggingInputs={loggingInputs}
      logButton={logButton}
      currentExercise={currentExercise}
      onBlockComplete={onBlockComplete}
      onNextBlock={onNextBlock}
      logSetToDatabase={logSetToDatabase}
      formatTime={formatTimeProp ?? formatTime}
      calculateSuggestedWeight={calculateSuggestedWeight}
      allBlocks={allBlocks}
      currentBlockIndex={currentBlockIndex}
      onBlockChange={onBlockChange}
      onVideoClick={onVideoClick}
      onAlternativesClick={onAlternativesClick}
      onRestTimerClick={onRestTimerClick}
      progressionSuggestion={progressionSuggestion}
    />
  );
}
