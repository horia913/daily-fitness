"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Pause, Play } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import { formatTime } from "../BaseBlockExecutor";
import { BaseSetEntryExecutorProps } from "../types";
import { useWorkoutExecutionChrome } from "../WorkoutExecutionChromeContext";
import { NavigationControls } from "../ui/NavigationControls";
import { ExerciseActionButtons } from "../ui/ExerciseActionButtons";
import { LastSessionSetsSection } from "../ui/LastSessionSetsSection";
import { LoggedSet } from "@/types/workoutSetEntries";
import { useLoggingReset } from "../hooks/useLoggingReset";
import { resolveSetPrescriptionTargets } from "../ui/set-rows/resolveSetPrescriptionTargets";
import {
  LiveCard,
  LiveCardExerciseName,
  LiveCardPrimary,
  LiveCardStats,
  LiveCardNote,
  LiveCardLog,
  LiveCardLogTimeHeld,
  LiveCardLogButton,
  effortFromPrescribedRpe,
  formatLiveRest,
  resolveRestSeconds,
  formatLiveLastDuration,
  groupIndexToHue,
  type LiveCardTarget,
} from "../live-card";

type Phase = "work" | "rest";

export function TimedSetExecutor({
  liveSetEntry,
  onSetEntryComplete,
  onNextSetEntry,
  sessionId,
  assignmentId,
  allSetEntries = [],
  currentSetEntryIndex = 0,
  onSetEntryChange,
  currentExerciseIndex = 0,
  onExerciseIndexChange,
  logSetToDatabase,
  formatTime: formatTimeProp,
  calculateSuggestedWeight,
  onVideoClick,
  onAlternativesClick,
  onRestTimerClick,
  onSetComplete,
  registerSetLogIdResolved,
  onSetLogUpsert,
  loggedSets: loggedSetsProp,
  onWorkoutBack,
  previousPerformanceMap,
}: BaseSetEntryExecutorProps) {
  const { addToast } = useToast();
  const currentExercise = liveSetEntry.setEntry.exercises?.[currentExerciseIndex];
  const loggedSetsList = loggedSetsProp ?? [];

  const activeSetNumber = Math.min(
    Math.max(1, loggedSetsList.length + 1),
    Math.max(1, liveSetEntry.setEntry.total_sets ?? 1),
  );
  const targets = resolveSetPrescriptionTargets(
    currentExercise,
    activeSetNumber,
    liveSetEntry.setEntry.reps_per_set,
  );
  const workSeconds = Math.max(
    1,
    targets.work_seconds ?? liveSetEntry.setEntry.duration_seconds ?? 60,
  );
  const totalSets = Math.max(1, liveSetEntry.setEntry.total_sets ?? 1);
  const restSeconds = resolveRestSeconds(
    currentExercise?.rest_seconds,
    liveSetEntry.setEntry.rest_seconds,
  );

  const completedSets = loggedSetsList.length;
  const currentSetNumber = completedSets + 1;
  const setEntryComplete = completedSets >= totalSets;

  const [phase, setPhase] = useState<Phase>("work");
  const [remainingSeconds, setRemainingSeconds] = useState(workSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoggingSet, setIsLoggingSet] = useState(false);
  const [timeHeldDraft, setTimeHeldDraft] = useState(String(workSeconds));
  useLoggingReset(isLoggingSet, setIsLoggingSet);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loggedSetsRef = useRef<LoggedSet[]>(loggedSetsList);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useEffect(() => {
    loggedSetsRef.current = loggedSetsList;
  }, [loggedSetsList]);

  useEffect(() => {
    setRemainingSeconds(workSeconds);
    setTimeHeldDraft(String(workSeconds));
  }, [workSeconds, completedSets]);

  useEffect(() => {
    if (!registerSetLogIdResolved) return;
    registerSetLogIdResolved((set_log_id: string) => {
      const list = loggedSetsRef.current;
      const idx = list.findLastIndex((s) => s.id.startsWith("temp-"));
      if (idx === -1) return;
      const oldEntry = list[idx];
      onSetLogUpsert?.(liveSetEntry.setEntry.id, { ...oldEntry, id: set_log_id }, {
        replaceId: oldEntry.id,
      });
    });
    return () => {};
  }, [registerSetLogIdResolved, onSetLogUpsert, liveSetEntry.setEntry.id]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const beginWorkPhase = useCallback(() => {
    setPhase("work");
    setRemainingSeconds(workSeconds);
    setTimeHeldDraft(String(workSeconds));
    setIsRunning(false);
  }, [workSeconds]);

  const finishSet = useCallback(
    async (actualSeconds: number) => {
      if (!currentExercise?.exercise_id || setEntryComplete) return;
      const sec = Math.max(1, Math.min(workSeconds, Math.round(actualSeconds)));

      setIsLoggingSet(true);
      clearTimer();
      setIsRunning(false);

      try {
        const setNum = loggedSetsRef.current.length + 1;
        const isLastSet = setNum >= totalSets;
        const result = await logSetToDatabase({
          set_type: "timed_set",
          exercise_id: currentExercise.exercise_id,
          set_number: setNum,
          actual_duration_seconds: sec,
          isLastSet,
        });

        if (!result.success) {
          addToast({
            title: "Could not log set",
            variant: "destructive",
          });
          beginWorkPhase();
          return;
        }

        const loggedSet: LoggedSet = {
          id: result.set_log_id || `temp-${setNum}-${Date.now()}`,
          exercise_id: currentExercise.exercise_id,
          set_entry_id: liveSetEntry.setEntry.id,
          set_number: setNum,
          actual_duration_seconds: sec,
          completed_at: new Date(),
        } as LoggedSet;

        const nextList = [...loggedSetsRef.current, loggedSet];
        onSetLogUpsert?.(liveSetEntry.setEntry.id, loggedSet);
        onSetComplete?.(setNum);

        addToast({
          title: "Set complete",
          description: `Set ${setNum} of ${totalSets}: ${sec}s`,
          variant: "success",
          duration: 2000,
        });

        if (isLastSet) {
          onSetEntryComplete(liveSetEntry.setEntry.id, nextList);
          return;
        }

        if (restSeconds > 0) {
          setPhase("rest");
          setRemainingSeconds(restSeconds);
          setIsRunning(true);
        } else {
          beginWorkPhase();
        }
      } finally {
        setIsLoggingSet(false);
      }
    },
    [
      currentExercise?.exercise_id,
      setEntryComplete,
      workSeconds,
      totalSets,
      restSeconds,
      logSetToDatabase,
      addToast,
      beginWorkPhase,
      onSetLogUpsert,
      liveSetEntry.setEntry.id,
      onSetComplete,
      onSetEntryComplete,
      clearTimer,
    ],
  );

  useEffect(() => {
    if (!isRunning || setEntryComplete) {
      clearTimer();
      return;
    }

    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev > 1) return prev - 1;

        setIsRunning(false);
        if (phaseRef.current === "rest") {
          beginWorkPhase();
          return workSeconds;
        }
        void finishSet(workSeconds);
        return 0;
      });
    }, 1000);

    return clearTimer;
  }, [
    isRunning,
    setEntryComplete,
    clearTimer,
    beginWorkPhase,
    finishSet,
    workSeconds,
  ]);

  const elapsedWorkSeconds = workSeconds - remainingSeconds;
  const fmt = formatTimeProp ?? formatTime;

  const activeEffort = effortFromPrescribedRpe(targets.rpe);
  const liveTarget: LiveCardTarget = {
    kind: "time",
    seconds: workSeconds,
    unit: "seconds",
  };
  const exerciseId = currentExercise?.exercise_id ?? "";
  const lastSession = exerciseId && previousPerformanceMap
    ? previousPerformanceMap.get(exerciseId)?.lastWorkout
    : null;
  const lastDur =
    lastSession?.setDetails?.find((s) => s.set_number === activeSetNumber) as
      | { actual_duration_seconds?: number; reps_completed?: number }
      | undefined;
  const lastLabel =
    formatLiveLastDuration(lastDur?.actual_duration_seconds) ??
    (lastDur?.reps_completed != null
      ? formatLiveLastDuration(lastDur.reps_completed)
      : null);
  const loadLabel = "bodyweight";

  const aboveStickyContent =
    loggedSetsList.length > 0 ? (
      <div className="mx-4 rounded-[18px] border border-[color:var(--fc-hairline-strong)] bg-transparent px-4 py-3.5">
        <p className="mb-2 text-[9.5px] font-bold uppercase tracking-[0.16em] text-[color:var(--fc-text-dim)]">
          Logged sets · {loggedSetsList.length}
        </p>
        <ul className="space-y-2">
          {[...loggedSetsList]
            .sort((a, b) => a.set_number - b.set_number)
            .map((entry) => {
              const dur =
                (entry as LoggedSet & { actual_duration_seconds?: number })
                  .actual_duration_seconds ?? workSeconds;
              return (
                <li
                  key={entry.id}
                  className="text-[13px] font-medium text-[color:var(--fc-text-primary)]"
                >
                  Set {entry.set_number}: {dur}s
                </li>
              );
            })}
        </ul>
      </div>
    ) : null;

  const chrome = useWorkoutExecutionChrome();
  const hideCompactBack = chrome?.hideCompactBack ?? false;
  const totalSetEntries = allSetEntries.length || 1;
  const canGoPrevious = currentSetEntryIndex > 0;
  const canGoNext = currentSetEntryIndex < totalSetEntries - 1;
  const instructions =
    currentExercise?.notes || liveSetEntry.setEntry.set_notes || undefined;

  const nudgeHeld = (delta: number) => {
    const cur = parseInt(timeHeldDraft || "0", 10);
    const next = Math.max(1, (isNaN(cur) ? workSeconds : cur) + delta);
    setTimeHeldDraft(String(next));
  };

  return (
    <>
      <div className="flex flex-col border-b border-white/5">
        <div className="flex flex-col gap-3 px-0 pb-2 pt-1 sm:px-1">
          {onWorkoutBack && !hideCompactBack ? (
            <button
              type="button"
              onClick={onWorkoutBack}
              className="-ml-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white active:scale-95"
              aria-label="Back"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
          ) : null}

          <LiveCard
            hue={groupIndexToHue(currentSetEntryIndex)}
            heading={`Set ${Math.min(currentSetNumber, totalSets)} of ${totalSets}`}
            status={
              setEntryComplete
                ? "complete"
                : phase === "rest"
                  ? "resting"
                  : "logging"
            }
          >
            <div>
              <LiveCardExerciseName
                name={currentExercise?.exercise?.name ?? "Exercise"}
                endSlot={
                  currentExercise ? (
                    <ExerciseActionButtons
                      exercise={currentExercise}
                      onVideoClick={onVideoClick}
                      onAlternativesClick={onAlternativesClick}
                    />
                  ) : undefined
                }
              />
            </div>
            <LiveCardPrimary target={liveTarget} effort={activeEffort} />
            <LiveCardStats
              rest={formatLiveRest(restSeconds)}
              tempo={loadLabel}
              last={lastLabel}
              middleLabel="Load"
            />
            {instructions ? (
              <LiveCardNote>{instructions}</LiveCardNote>
            ) : null}
            <LiveCardLog>
              <div className="flex flex-col gap-3">
                <p className="text-sm text-[color:var(--fc-text-dim)]">
                  {phase === "work"
                    ? `Work · Set ${currentSetNumber} of ${totalSets}`
                    : `Rest · next set ${currentSetNumber} of ${totalSets}`}
                </p>
                <div
                  className="text-center text-5xl font-mono font-semibold tabular-nums text-[color:var(--fc-text-primary)]"
                  aria-live="polite"
                >
                  {fmt(remainingSeconds)}
                </div>
                <div className="flex gap-2 justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    disabled={isLoggingSet || setEntryComplete}
                    onClick={() => setIsRunning((r) => !r)}
                    className="min-w-[100px]"
                  >
                    {isRunning ? (
                      <>
                        <Pause className="w-4 h-4 mr-2" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        {remainingSeconds <
                        (phase === "work" ? workSeconds : restSeconds)
                          ? "Resume"
                          : "Start"}
                      </>
                    )}
                  </Button>
                </div>
                {phase === "work" && !setEntryComplete ? (
                  <>
                  <LiveCardLogTimeHeld
                    value={timeHeldDraft}
                    onChange={setTimeHeldDraft}
                    onIncrement={() => nudgeHeld(1)}
                    onDecrement={() => nudgeHeld(-1)}
                    disabled={isLoggingSet}
                  />
                  <LiveCardLogButton
                    disabled={isLoggingSet || setEntryComplete}
                    onClick={() => {
                      const held = parseInt(timeHeldDraft, 10);
                      const sec =
                        Number.isFinite(held) && held > 0
                          ? held
                          : Math.max(1, elapsedWorkSeconds);
                      void finishSet(sec);
                    }}
                  />
                  </>
                ) : null}
              </div>
            </LiveCardLog>
          </LiveCard>

          {aboveStickyContent}

          <NavigationControls
            currentBlock={currentSetEntryIndex + 1}
            totalBlocks={totalSetEntries}
            onPrevious={() => {
              if (onSetEntryChange && canGoPrevious) {
                onSetEntryChange(currentSetEntryIndex - 1);
              }
            }}
            onNext={() => {
              if (onSetEntryChange && canGoNext) {
                onSetEntryChange(currentSetEntryIndex + 1);
              }
            }}
            canGoPrevious={canGoPrevious}
            canGoNext={canGoNext}
          />
        </div>
        <LastSessionSetsSection lastWorkout={lastSession ?? null} />
      </div>
    </>
  );
}
