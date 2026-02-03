"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, Pause, X } from "lucide-react";

// Simple beep via Web Audio — no external files. work = higher, rest = lower.
function playWorkBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 660;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch (_) {}
}
function playRestBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 440;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch (_) {}
}

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
  const prevPhaseRef = useRef<"work" | "rest" | "rest_after_set" | null>(null);

  // Lock background scroll while modal is open (same as other app modals)
  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add("fc-modal-open");
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.classList.remove("fc-modal-open");
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Sound alerts when phase changes: work = higher beep, rest / rest_after_set = lower beep
  useEffect(() => {
    if (prevPhaseRef.current === null) {
      prevPhaseRef.current = intervalPhase;
      return;
    }
    if (prevPhaseRef.current === intervalPhase) return;
    prevPhaseRef.current = intervalPhase;
    if (intervalPhase === "work") playWorkBeep();
    else if (intervalPhase === "rest" || intervalPhase === "rest_after_set") playRestBeep();
  }, [intervalPhase]);

  // Initialize timer when modal opens
  useEffect(() => {
    if (isOpen && sets.length > 0 && sets[0]?.exercises?.length > 0) {
      prevPhaseRef.current = null;
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

  // Full-screen phase colors (your request): work = blue, rest = red, rest_after_set = green
  const overlayBgClass =
    intervalPhase === "work"
      ? "bg-[#2563eb]"
      : intervalPhase === "rest"
      ? "bg-[#dc2626]"
      : "bg-[#16a34a]";

  return (
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 min-h-full ${overlayBgClass}`}>
      <div
        className={`fc-modal fc-card rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden flex flex-col shadow-2xl border-2 border-white/30 ${overlayBgClass}`}
      >
          {/* Minimal top bar: round + close */}
          <div className="flex items-center justify-between px-4 pt-4 py-3 text-white/90">
            <span className="text-sm font-medium">
              Round {intervalRound + 1} of {Math.max(1, Number(totalRounds) || 1)}
            </span>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="rounded-full p-2 text-white/90 hover:bg-white/20 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Hero: timer + phase + current exercise + controls — main focus */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 text-center">
            <span className="text-sm font-semibold uppercase tracking-wider text-white/90 mb-2">
              {phaseLabel}
            </span>
            <div className="text-7xl sm:text-8xl font-black font-mono tracking-tight text-white tabular-nums">
              {Math.floor(intervalPhaseLeft / 60)
                .toString()
                .padStart(2, "0")}
              :{(intervalPhaseLeft % 60).toString().padStart(2, "0")}
            </div>
            {currentExercise && (
              <div className="mt-6 max-w-md">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/80 mb-1">
                  Current exercise
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-white">
                  {exerciseName}
                </div>
                {intervalPhase === "work" && (
                  <div className="text-sm text-white/80 mt-1">
                    {currentExercise.work_seconds
                      ? `${currentExercise.work_seconds}s work`
                      : currentExercise.target_reps
                      ? `${currentExercise.target_reps} reps`
                      : "Work phase"}
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center gap-3 mt-8">
              <Button
                onClick={handlePrevious}
                variant="outline"
                size="sm"
                className="min-w-[48px] min-h-[48px] rounded-full border-2 border-white/50 bg-white/10 text-white hover:bg-white/25"
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
                  className="min-w-[64px] min-h-[64px] rounded-full border-2 border-white bg-white/20 text-white hover:bg-white/35"
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
                  className="min-w-[64px] min-h-[64px] rounded-full border-2 border-white bg-white/20 text-white hover:bg-white/35"
                >
                  <Play className="w-6 h-6" />
                </Button>
              )}
              <Button
                onClick={handleNext}
                variant="outline"
                size="sm"
                className="min-w-[48px] min-h-[48px] rounded-full border-2 border-white/50 bg-white/10 text-white hover:bg-white/25"
              >
                <ArrowLeft className="w-5 h-5 rotate-180" />
              </Button>
            </div>
          </div>

          {/* Bottom: up next + stop — secondary */}
          <div className="px-4 pb-6 pt-4 flex flex-col gap-3">
            <div className="rounded-xl bg-black/20 px-4 py-3 text-center">
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/80">Up next</span>
              <div className="text-lg font-semibold text-white">{nextExerciseName}</div>
            </div>
            <div className="flex items-center justify-between text-white/70 text-xs">
              <span>
                Set {timerSetIndex + 1}/{sets.length} · Ex {timerExerciseIndex + 1}/{currentSet?.exercises?.length || 1}
              </span>
              {intervalActive && (
                <Button
                  onClick={handleStop}
                  variant="ghost"
                  className="text-white/90 hover:bg-white/20 hover:text-white px-4 py-2 text-sm"
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

