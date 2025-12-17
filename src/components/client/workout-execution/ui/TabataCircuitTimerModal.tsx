"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, Pause, X } from "lucide-react";

interface ExerciseInSet {
  exercise_id: string;
  work_seconds?: number;
  rest_after?: number;
  target_reps?: number;
}

interface CircuitSet {
  exercises: ExerciseInSet[];
  rest_between_sets?: number;
}

interface TabataCircuitTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sets: CircuitSet[]; // For both tabata_sets and circuit_sets
  totalRounds: number;
  exerciseLookup: Record<string, { name: string }>;
  onComplete?: () => void;
}

export function TabataCircuitTimerModal({
  isOpen,
  onClose,
  sets,
  totalRounds,
  exerciseLookup,
  onComplete,
}: TabataCircuitTimerModalProps) {
  const [intervalPhase, setIntervalPhase] = useState<"work" | "rest" | "rest_after_set">("work");
  const [intervalPhaseLeft, setIntervalPhaseLeft] = useState(0);
  const [intervalActive, setIntervalActive] = useState(false);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [intervalRound, setIntervalRound] = useState(0);
  const [timerSetIndex, setTimerSetIndex] = useState(0);
  const [timerExerciseIndex, setTimerExerciseIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize timer when modal opens
  useEffect(() => {
    if (isOpen && sets.length > 0 && sets[0]?.exercises?.length > 0) {
      const firstExercise = sets[0].exercises[0];
      const workTime = firstExercise.work_seconds || 20;
      setIntervalPhase("work");
      setIntervalPhaseLeft(workTime);
      setIntervalActive(false); // Start button will activate
      setIsTimerPaused(false);
      setIntervalRound(0);
      setTimerSetIndex(0);
      setTimerExerciseIndex(0);
      setIsCompleted(false);
    }
  }, [isOpen, sets]);

  // Handle phase completion
  const handlePhaseComplete = useCallback(() => {
    const currentSet = sets[timerSetIndex];
    const currentExercise = currentSet?.exercises?.[timerExerciseIndex];

    if (intervalPhase === "work") {
      // Work -> Rest (same exercise) OR Rest After Set (if last exercise of set)
      const isLastExerciseInSet = timerExerciseIndex === (currentSet?.exercises?.length || 1) - 1;
      const isLastSetInRound = timerSetIndex === sets.length - 1;
      const isLastRound = intervalRound === totalRounds - 1;

      if (isLastExerciseInSet && isLastSetInRound && isLastRound) {
        // Last exercise of last set in last round - workout complete
        setIntervalActive(false);
        setIsCompleted(true);
        if (onComplete) {
          onComplete();
        }
      } else if (isLastExerciseInSet) {
        // Last exercise of set - skip rest and go directly to rest_after_set
        const restAfterSetTime = Number(currentSet?.rest_between_sets) || 30;
        setIntervalPhase("rest_after_set");
        setIntervalPhaseLeft(restAfterSetTime);
      } else {
        // Not last exercise - normal flow: Work -> Rest
        const restTime = currentExercise?.rest_after || 10;
        setIntervalPhase("rest");
        setIntervalPhaseLeft(restTime);
      }
    } else if (intervalPhase === "rest") {
      // Rest -> Next Work
      const nextIndex = timerExerciseIndex + 1;
      const nextExercise = currentSet.exercises[nextIndex];
      const workTime = nextExercise?.work_seconds || 20;
      setTimerExerciseIndex(nextIndex);
      setIntervalPhase("work");
      setIntervalPhaseLeft(workTime);
    } else if (intervalPhase === "rest_after_set") {
      // Rest After Set -> Work (first exercise of next set or next round)
      const isLastSetInRound = timerSetIndex === sets.length - 1;

      if (isLastSetInRound) {
        // Start next round
        setIntervalRound((prev) => prev + 1);
        setTimerSetIndex(0);
        setTimerExerciseIndex(0);
        const firstSet = sets[0];
        const firstExercise = firstSet?.exercises?.[0];
        const workTime = firstExercise?.work_seconds || 20;
        setIntervalPhase("work");
        setIntervalPhaseLeft(workTime);
      } else {
        // Move to next set
        const nextSetIndex = timerSetIndex + 1;
        const nextSet = sets[nextSetIndex];
        const firstExercise = nextSet?.exercises?.[0];
        const workTime = firstExercise?.work_seconds || 20;
        setTimerSetIndex(nextSetIndex);
        setTimerExerciseIndex(0);
        setIntervalPhase("work");
        setIntervalPhaseLeft(workTime);
      }
    }
  }, [intervalPhase, timerSetIndex, timerExerciseIndex, intervalRound, sets, totalRounds, onComplete]);

  // Timer logic
  useEffect(() => {
    if (intervalActive && !isTimerPaused && intervalPhaseLeft > 0) {
      timerRef.current = setInterval(() => {
        setIntervalPhaseLeft((prev) => {
          if (prev <= 1) {
            // Time's up, advance to next phase
            handlePhaseComplete();
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
  }, [intervalActive, isTimerPaused, intervalPhaseLeft, handlePhaseComplete]);

  const handleStart = () => {
    setIntervalActive(true);
  };

  const handlePrevious = () => {
    if (intervalPhase === "work") {
      // Work -> Previous Rest (or Previous Rest After Set)
      if (timerExerciseIndex > 0) {
        // Go to rest of previous exercise in same set
        setTimerExerciseIndex((prev) => prev - 1);
        const currentSet = sets[timerSetIndex];
        const prevExercise = currentSet?.exercises?.[timerExerciseIndex - 1];
        const restTime = prevExercise?.rest_after || 10;
        setIntervalPhase("rest");
        setIntervalPhaseLeft(restTime);
      } else if (timerSetIndex > 0) {
        // First exercise in set - go to rest_after_set of previous set
        setTimerSetIndex((prev) => prev - 1);
        const prevSet = sets[timerSetIndex - 1];
        const restAfterSetTime = Number(prevSet?.rest_between_sets) || 30;
        setIntervalPhase("rest_after_set");
        setIntervalPhaseLeft(restAfterSetTime);
      } else if (intervalRound > 0) {
        // First exercise of first set - go to rest_after_set of last set of previous round
        setIntervalRound((prev) => prev - 1);
        const lastSetIndex = sets.length - 1;
        const lastSet = sets[lastSetIndex];
        const restAfterSetTime = Number(lastSet?.rest_between_sets) || 30;
        setTimerSetIndex(lastSetIndex);
        setTimerExerciseIndex(0);
        setIntervalPhase("rest_after_set");
        setIntervalPhaseLeft(restAfterSetTime);
      }
    } else if (intervalPhase === "rest") {
      // Rest -> Work (same exercise)
      const currentSet = sets[timerSetIndex];
      const currentExerciseInSet = currentSet?.exercises?.[timerExerciseIndex];
      const workTime = currentExerciseInSet?.work_seconds || 20;
      setIntervalPhase("work");
      setIntervalPhaseLeft(workTime);
    } else if (intervalPhase === "rest_after_set") {
      // Rest After Set -> Rest (last exercise of current set)
      const currentSet = sets[timerSetIndex];
      const lastExerciseIndex = (currentSet?.exercises?.length || 1) - 1;
      const lastExercise = currentSet?.exercises?.[lastExerciseIndex];
      const restTime = lastExercise?.rest_after || 10;
      setTimerExerciseIndex(lastExerciseIndex);
      setIntervalPhase("rest");
      setIntervalPhaseLeft(restTime);
    }
  };

  const handleNext = () => {
    handlePhaseComplete();
  };

  const handleStop = () => {
    setIntervalActive(false);
    setIsTimerPaused(false);
    onClose();
  };

  if (!isOpen) return null;

  // Show completed screen
  if (isCompleted) {
    return (
      <div
        className={`fixed inset-0 z-[9999] transition-colors duration-500 bg-green-900/95`}
      >
        <div className="h-full flex flex-col items-center justify-center p-4 relative">
          {/* Close Button */}
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 text-white hover:bg-white/20 bg-white/10 backdrop-blur-sm rounded-full p-2 z-10"
          >
            <X className="w-5 h-5" />
          </Button>

          <div className="text-center">
            <div className="text-6xl mb-8">🎉</div>
            <div className="text-5xl font-black text-white mb-4">Workout Complete!</div>
            <div className="text-xl text-green-100 mb-8">
              Great job completing all rounds!
            </div>
            <Button
              onClick={onClose}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate current exercise - ensure we use the latest state values
  const currentSet = sets[timerSetIndex] || sets[0];
  const currentExercise = currentSet?.exercises?.[timerExerciseIndex] || currentSet?.exercises?.[0];
  const exerciseName = currentExercise 
    ? (exerciseLookup[currentExercise.exercise_id]?.name || "Exercise")
    : "Exercise";

  // Calculate segments for display
  // Note: Last exercise of each set skips its rest period (goes directly to rest_after_set)
  let segmentsPerRound = 0;
  
  if (sets && Array.isArray(sets) && sets.length > 0) {
    sets.forEach((set) => {
      if (set && Array.isArray(set.exercises) && set.exercises.length > 0) {
        const exercisesInSet = set.exercises.length;
        // Each exercise has work, but only non-last exercises have rest
        // Last exercise goes: work -> rest_after_set (no rest period)
        // For each set: (n-1) exercises with work+rest, last exercise with just work, then rest_after_set
        segmentsPerRound += (exercisesInSet - 1) * 2 + 1; // (n-1) exercises with work+rest, last exercise with just work
        segmentsPerRound += 1; // rest_after_set per set
      }
    });
  }

  // Calculate total segments
  const rounds = Math.max(1, Number(totalRounds) || 1);
  let totalSegments = segmentsPerRound * rounds;
  
  // Last set of last round has no rest_after_set, so subtract 1
  if (totalSegments > 0) {
    totalSegments -= 1;
  }
  
  // Ensure valid number
  if (isNaN(totalSegments) || totalSegments < 0 || !isFinite(totalSegments)) {
    totalSegments = Math.max(1, segmentsPerRound);
  }

  let currentSegment = intervalRound * segmentsPerRound;
  for (let s = 0; s < timerSetIndex; s++) {
    const exercisesInSet = sets[s]?.exercises?.length || 0;
    // Each set: (n-1) exercises with work+rest, last exercise with just work, then rest_after_set
    currentSegment += (exercisesInSet - 1) * 2 + 1 + 1; // exercises + rest_after_set
  }
  
  // Current set progress
  const isLastExerciseInSet = timerExerciseIndex === (currentSet?.exercises?.length || 1) - 1;
  if (!isLastExerciseInSet) {
    // Not last exercise: count work + rest for each completed exercise
    currentSegment += timerExerciseIndex * 2;
    if (intervalPhase === "work") {
      currentSegment += 1;
    } else if (intervalPhase === "rest") {
      currentSegment += 2;
    }
  } else {
    // Last exercise: only count work (no rest period, goes directly to rest_after_set)
    currentSegment += timerExerciseIndex * 2; // previous exercises
    if (intervalPhase === "work") {
      currentSegment += 1;
    } else if (intervalPhase === "rest_after_set") {
      currentSegment += 1 + 1; // work + rest_after_set
    }
  }

  // Determine next exercise name
  let nextExerciseName = "Break";
  if (timerExerciseIndex + 1 < (currentSet?.exercises?.length || 0)) {
    const nextExercise = currentSet.exercises[timerExerciseIndex + 1];
    nextExerciseName = exerciseLookup[nextExercise?.exercise_id]?.name || "Next Exercise";
  } else if (timerSetIndex + 1 < sets.length) {
    nextExerciseName = "Next Set";
  } else if (intervalRound + 1 < totalRounds) {
    nextExerciseName = "Next Round";
  }

  return (
    <div
      className={`fixed inset-0 z-[9999] transition-colors duration-500 ${
        intervalPhase === "work"
          ? "bg-red-900/95"
          : intervalPhase === "rest_after_set"
          ? "bg-purple-900/95"
          : "bg-blue-900/95"
      }`}
    >
      <div className="h-full flex flex-col relative overflow-hidden">
        {/* Close Button */}
        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
          className="absolute top-4 right-4 text-white hover:bg-white/20 bg-white/10 backdrop-blur-sm rounded-full p-2 z-10"
        >
          <X className="w-5 h-5" />
        </Button>

        {/* Segment Counter */}
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-white/20 backdrop-blur-sm rounded-full px-6 py-2">
            <span className="text-white font-semibold text-lg">
              {currentSegment} / {totalSegments}
            </span>
          </div>
        </div>

        {/* Main Timer Display */}
        <div className="text-center flex-1 flex flex-col justify-center items-center px-4">
          {/* Total Duration Display */}
          {(() => {
            // Calculate total duration in seconds for one round
            let durationPerRound = 0;
            
            if (sets && Array.isArray(sets) && sets.length > 0) {
              sets.forEach((set) => {
                if (set && Array.isArray(set.exercises) && set.exercises.length > 0) {
                  const exercisesInSet = set.exercises.length;
                  
                  set.exercises.forEach((exercise, exIndex) => {
                    if (exercise) {
                      const isLastExercise = exIndex === exercisesInSet - 1;
                      // Add work time (always)
                      const workTime = Number(exercise.work_seconds) || 20;
                      durationPerRound += workTime;
                      
                      // Add rest time only if not last exercise
                      if (!isLastExercise) {
                        const restTime = Number(exercise.rest_after) || 10;
                        durationPerRound += restTime;
                      }
                    }
                  });
                  
                  // Add rest_after_set for all sets in a round
                  const restAfterSet = Number(set.rest_between_sets) || 30;
                  durationPerRound += restAfterSet;
                }
              });
            }
            
            // Multiply by rounds
            const rounds = Number(totalRounds) || 1;
            let totalDurationSeconds = durationPerRound * rounds;
            
            // Subtract last rest_after_set (last set of last round doesn't have it)
            if (sets && sets.length > 0) {
              const lastSet = sets[sets.length - 1];
              if (lastSet) {
                const lastRestAfterSet = Number(lastSet.rest_between_sets) || 30;
                totalDurationSeconds -= lastRestAfterSet;
              }
            }
            
            // Ensure we have a valid number
            if (isNaN(totalDurationSeconds) || totalDurationSeconds < 0 || !isFinite(totalDurationSeconds)) {
              totalDurationSeconds = 0;
            }
            
            // Format duration
            const totalMinutes = Math.floor(totalDurationSeconds / 60);
            const totalSeconds = totalDurationSeconds % 60;
            const durationText = totalMinutes > 0 
              ? `${totalMinutes}m ${totalSeconds}s`
              : `${totalSeconds}s`;
            
            return (
              <div className="mb-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-6 py-3 text-center">
                  <div className="text-sm text-gray-300 mb-1">Total Duration</div>
                  <div className="text-xl font-semibold text-white">{durationText}</div>
                </div>
              </div>
            );
          })()}

          {/* Current Exercise Info */}
          {currentExercise && (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-8 py-6 max-w-md mb-12">
              <div className="text-2xl font-bold text-white mb-2">{exerciseName}</div>
              {intervalPhase === "work" && (
                <div className="text-lg text-gray-200">
                  {currentExercise.work_seconds
                    ? `${currentExercise.work_seconds}s work`
                    : currentExercise.target_reps
                    ? `${currentExercise.target_reps} reps`
                    : "Work phase"}
                </div>
              )}
            </div>
          )}

          {/* Phase Indicator */}
          <div
            className={`mb-8 px-8 py-4 rounded-2xl ${
              intervalPhase === "work"
                ? "bg-red-600/30 border-2 border-red-400"
                : intervalPhase === "rest_after_set"
                ? "bg-purple-600/30 border-2 border-purple-400"
                : "bg-blue-600/30 border-2 border-blue-400"
            }`}
          >
            <div className="text-4xl sm:text-5xl font-black text-white">
              {intervalPhase === "work"
                ? "WORK"
                : intervalPhase === "rest_after_set"
                ? "REST AFTER SET"
                : "REST"}
            </div>
          </div>

          {/* Large Timer */}
          <div
            className={`text-9xl sm:text-[12rem] font-black mb-8 ${
              intervalPhase === "work" ? "text-red-100" : "text-blue-100"
            }`}
          >
            {Math.floor(intervalPhaseLeft / 60)
              .toString()
              .padStart(2, "0")}
            :{(intervalPhaseLeft % 60).toString().padStart(2, "0")}
          </div>


          {/* Next Exercise Preview */}
          <div className="mb-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-6 py-4 text-center">
              <div className="text-sm text-gray-300 mb-1">Next:</div>
              <div className="text-lg font-semibold text-white">{nextExerciseName}</div>
            </div>
          </div>

          {/* Control Buttons - Always visible */}
          <div className="flex gap-4 items-center justify-center mt-4">
            {/* Previous Button */}
            <Button
            onClick={handlePrevious}
            variant="outline"
            size="sm"
            className="!border-white/80 !text-white hover:!bg-white hover:!text-black !bg-white/20 backdrop-blur-sm min-w-[48px] min-h-[48px]"
            disabled={
              timerExerciseIndex === 0 &&
              timerSetIndex === 0 &&
              intervalRound === 0 &&
              intervalPhase === "work"
            }
          >
              <ArrowLeft className="w-5 h-5" />
            </Button>

            {/* Play/Pause Button - Only show pause when active, otherwise show play */}
            {intervalActive ? (
              <Button
                onClick={() => setIsTimerPaused(!isTimerPaused)}
                variant="outline"
                size="lg"
                className="!border-white/80 !text-white hover:!bg-white hover:!text-black !bg-white/20 backdrop-blur-sm px-8 py-3 text-lg min-w-[64px] min-h-[64px]"
              >
                {isTimerPaused ? (
                  <Play className="w-6 h-6" />
                ) : (
                  <Pause className="w-6 h-6" />
                )}
              </Button>
            ) : (
              <Button
                onClick={handleStart}
                variant="outline"
                size="lg"
                className="!border-white/80 !text-white hover:!bg-white hover:!text-black !bg-white/20 backdrop-blur-sm px-8 py-3 text-lg min-w-[64px] min-h-[64px]"
              >
                <Play className="w-6 h-6" />
              </Button>
            )}

            {/* Next Button */}
            <Button
              onClick={handleNext}
              variant="outline"
              size="sm"
              className="!border-white/80 !text-white hover:!bg-white hover:!text-black !bg-white/20 backdrop-blur-sm min-w-[48px] min-h-[48px]"
            >
              <ArrowLeft className="w-5 h-5 rotate-180" />
            </Button>

            {/* Stop Button - Only show when active */}
            {intervalActive && (
              <Button
                onClick={handleStop}
                variant="outline"
                className="px-6 py-3 text-lg !border-red-400 !text-red-100 hover:!bg-red-600 hover:!text-white !bg-red-600/30 backdrop-blur-sm"
              >
                Stop
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

