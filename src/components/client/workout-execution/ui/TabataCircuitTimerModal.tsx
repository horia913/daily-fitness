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
      <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm">
        <div className="h-full flex items-center justify-center p-6">
          <div className="fc-modal fc-card w-full max-w-md text-center px-6 py-8 relative">
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 rounded-full p-2 fc-btn fc-btn-ghost"
            >
              <X className="w-5 h-5" />
            </Button>

            <div className="mx-auto mb-6 w-20 h-20 rounded-full flex items-center justify-center fc-icon-tile fc-icon-workouts">
              <span className="text-3xl">🎉</span>
            </div>
            <div className="text-3xl font-bold fc-text-primary mb-2">
              Workout complete
            </div>
            <div className="text-base fc-text-dim mb-8">
              Great job completing all rounds!
            </div>
            <Button
              onClick={onClose}
              className="w-full fc-btn fc-btn-primary fc-press py-5 text-base"
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

  const phaseLabel =
    intervalPhase === "work"
      ? "Work"
      : intervalPhase === "rest_after_set"
      ? "Rest After Set"
      : "Rest";
  const phaseAccent =
    intervalPhase === "work"
      ? "fc-text-workouts"
      : intervalPhase === "rest_after_set"
      ? "fc-text-warning"
      : "fc-text-neutral";

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm">
      <div className="h-full flex items-center justify-center p-4">
        <div className="fc-modal fc-card w-full max-w-4xl overflow-hidden">
          <div className="px-6 pt-6 pb-4 border-b border-[color:var(--fc-glass-border)] flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="fc-icon-tile fc-icon-workouts">
                <Play className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <span className={`fc-pill fc-pill-glass ${phaseAccent}`}>
                  {phaseLabel}
                </span>
                <div className="text-2xl font-bold fc-text-primary">
                  Interval Circuit
                </div>
                <div className="text-sm fc-text-dim">
                  Round {intervalRound + 1} of {Math.max(1, Number(totalRounds) || 1)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="fc-pill fc-pill-glass fc-text-subtle">
                Segment {currentSegment} / {totalSegments}
              </div>
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="rounded-full p-2 fc-btn fc-btn-ghost"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="px-6 py-6">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-6">
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
                    <div className="fc-glass-soft rounded-2xl px-5 py-4">
                      <div className="text-[10px] tracking-[0.2em] uppercase fc-text-subtle">
                        Total duration
                      </div>
                      <div className="text-lg font-semibold fc-text-primary">
                        {durationText}
                      </div>
                    </div>
                  );
                })()}

                {currentExercise && (
                  <div className="fc-glass-soft rounded-2xl px-6 py-5">
                    <div className="text-[10px] tracking-[0.2em] uppercase fc-text-subtle mb-2">
                      Current exercise
                    </div>
                    <div className="text-2xl font-semibold fc-text-primary">
                      {exerciseName}
                    </div>
                    {intervalPhase === "work" && (
                      <div className="text-sm fc-text-dim mt-2">
                        {currentExercise.work_seconds
                          ? `${currentExercise.work_seconds}s work`
                          : currentExercise.target_reps
                          ? `${currentExercise.target_reps} reps`
                          : "Work phase"}
                      </div>
                    )}
                  </div>
                )}

                <div className="fc-glass-soft rounded-2xl px-6 py-5">
                  <div className="text-[10px] tracking-[0.2em] uppercase fc-text-subtle mb-2">
                    Up next
                  </div>
                  <div className="text-lg font-semibold fc-text-primary">
                    {nextExerciseName}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center text-center gap-6">
                <div className={`text-base font-semibold ${phaseAccent}`}>
                  {phaseLabel}
                </div>
                <div className="text-6xl sm:text-7xl font-black font-mono tracking-tight fc-text-primary">
                  {Math.floor(intervalPhaseLeft / 60)
                    .toString()
                    .padStart(2, "0")}
                  :{(intervalPhaseLeft % 60).toString().padStart(2, "0")}
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handlePrevious}
                    variant="outline"
                    size="sm"
                    className="fc-btn fc-btn-secondary fc-press min-w-[48px] min-h-[48px]"
                    disabled={
                      timerExerciseIndex === 0 &&
                      timerSetIndex === 0 &&
                      intervalRound === 0 &&
                      intervalPhase === "work"
                    }
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  {intervalActive ? (
                    <Button
                      onClick={() => setIsTimerPaused(!isTimerPaused)}
                      variant="outline"
                      size="lg"
                      className="fc-btn fc-btn-primary fc-press min-w-[64px] min-h-[64px]"
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
                      className="fc-btn fc-btn-primary fc-press min-w-[64px] min-h-[64px]"
                    >
                      <Play className="w-6 h-6" />
                    </Button>
                  )}
                  <Button
                    onClick={handleNext}
                    variant="outline"
                    size="sm"
                    className="fc-btn fc-btn-secondary fc-press min-w-[48px] min-h-[48px]"
                  >
                    <ArrowLeft className="w-5 h-5 rotate-180" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 pb-6 pt-4 border-t border-[color:var(--fc-glass-border)] flex items-center justify-between">
            <div className="text-xs tracking-[0.2em] uppercase fc-text-subtle">
              Sets {timerSetIndex + 1}/{sets.length} · Exercise {timerExerciseIndex + 1}/
              {currentSet?.exercises?.length || 1}
            </div>
            {intervalActive && (
              <Button
                onClick={handleStop}
                variant="outline"
                className="fc-btn fc-btn-destructive fc-press px-6 py-3 text-sm"
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

