"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Pause, Play, Timer } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import {
  BaseBlockExecutorLayout,
  formatTime,
} from "../BaseBlockExecutor";
import { BaseBlockExecutorProps } from "../types";
import type { PrescriptionItem } from "../ui/PrescriptionCard";
import { LoggedSet } from "@/types/workoutBlocks";
import { useLoggingReset } from "../hooks/useLoggingReset";

type Phase = "work" | "rest";

export function TimedSetExecutor({
  block,
  onBlockComplete,
  onNextBlock,
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
  registerSetLogIdResolved,
  onSetLogUpsert,
  loggedSets: loggedSetsProp,
  onWorkoutBack,
}: BaseBlockExecutorProps) {
  const { addToast } = useToast();
  const currentExercise = block.block.exercises?.[currentExerciseIndex];
  const loggedSetsList = loggedSetsProp ?? [];

  const workSeconds = Math.max(1, block.block.duration_seconds ?? 60);
  const totalSets = Math.max(1, block.block.total_sets ?? 1);
  const restSeconds = Math.max(0, block.block.rest_seconds ?? 30);

  const completedSets = loggedSetsList.length;
  const currentSetNumber = completedSets + 1;
  const blockComplete = completedSets >= totalSets;

  const [phase, setPhase] = useState<Phase>("work");
  const [remainingSeconds, setRemainingSeconds] = useState(workSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoggingSet, setIsLoggingSet] = useState(false);
  useLoggingReset(isLoggingSet, setIsLoggingSet);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loggedSetsRef = useRef<LoggedSet[]>(loggedSetsList);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useEffect(() => {
    loggedSetsRef.current = loggedSetsList;
  }, [loggedSetsList]);

  useEffect(() => {
    if (!registerSetLogIdResolved) return;
    registerSetLogIdResolved((set_log_id: string) => {
      const list = loggedSetsRef.current;
      const idx = list.findLastIndex((s) => s.id.startsWith("temp-"));
      if (idx === -1) return;
      const oldEntry = list[idx];
      onSetLogUpsert?.(block.block.id, { ...oldEntry, id: set_log_id }, {
        replaceId: oldEntry.id,
      });
    });
    return () => {};
  }, [registerSetLogIdResolved, onSetLogUpsert, block.block.id]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const beginWorkPhase = useCallback(() => {
    setPhase("work");
    setRemainingSeconds(workSeconds);
    setIsRunning(false);
  }, [workSeconds]);

  const finishSet = useCallback(
    async (actualSeconds: number) => {
      if (!currentExercise?.exercise_id || blockComplete) return;
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
          set_entry_id: block.block.id,
          set_number: setNum,
          actual_duration_seconds: sec,
          completed_at: new Date(),
        } as LoggedSet;

        const nextList = [...loggedSetsRef.current, loggedSet];
        onSetLogUpsert?.(block.block.id, loggedSet);
        onSetComplete?.(setNum);

        addToast({
          title: "Set complete",
          description: `Set ${setNum} of ${totalSets}: ${sec}s`,
          variant: "success",
          duration: 2000,
        });

        if (isLastSet) {
          onBlockComplete(block.block.id, nextList);
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
      blockComplete,
      workSeconds,
      totalSets,
      restSeconds,
      logSetToDatabase,
      addToast,
      beginWorkPhase,
      onSetLogUpsert,
      block.block.id,
      onSetComplete,
      onBlockComplete,
      clearTimer,
    ],
  );

  useEffect(() => {
    if (!isRunning || blockComplete) {
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
    blockComplete,
    clearTimer,
    beginWorkPhase,
    finishSet,
    workSeconds,
  ]);

  const elapsedWorkSeconds = workSeconds - remainingSeconds;
  const fmt = formatTimeProp ?? formatTime;

  const prescriptionItems: PrescriptionItem[] = [
    { icon: Timer, label: "Work", value: workSeconds, unit: "s" },
    { icon: Timer, label: "Rest", value: restSeconds, unit: "s" },
  ];

  const aboveStickyContent =
    loggedSetsList.length > 0 ? (
      <div className="mx-4 rounded-[18px] border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-surface-card)] px-4 py-3.5">
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

  const loggingInputs = (
    <div className="flex flex-col items-center gap-4 py-2">
      <p className="text-sm text-[color:var(--fc-text-dim)]">
        {phase === "work"
          ? `Work · Set ${currentSetNumber} of ${totalSets}`
          : `Rest · next set ${currentSetNumber} of ${totalSets}`}
      </p>
      <div
        className="text-5xl font-mono font-semibold tabular-nums text-[color:var(--fc-text-primary)]"
        aria-live="polite"
      >
        {fmt(remainingSeconds)}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={isLoggingSet || blockComplete}
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
        {phase === "work" && (
          <Button
            type="button"
            size="lg"
            disabled={
              isLoggingSet || blockComplete || elapsedWorkSeconds < 1
            }
            onClick={() => void finishSet(elapsedWorkSeconds)}
            className="min-w-[100px]"
          >
            Done
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <BaseBlockExecutorLayout
      block={block}
      exerciseName={currentExercise?.exercise?.name ?? "Exercise"}
      prescriptionItems={prescriptionItems}
      instructions={currentExercise?.notes || block.block.set_notes}
      currentSet={Math.min(currentSetNumber, totalSets)}
      totalSets={totalSets}
      progressLabel={
        phase === "rest"
          ? `Rest before set ${currentSetNumber}`
          : `Set ${currentSetNumber} of ${totalSets}`
      }
      loggingInputs={loggingInputs}
      logButton={<div />}
      showNavigation
      currentExercise={currentExercise}
      onVideoClick={onVideoClick}
      onAlternativesClick={onAlternativesClick}
      onRestTimerClick={onRestTimerClick}
      onWorkoutBack={onWorkoutBack}
      onBlockComplete={onBlockComplete}
      logSetToDatabase={logSetToDatabase}
      formatTime={formatTimeProp ?? formatTime}
      calculateSuggestedWeight={calculateSuggestedWeight}
      allBlocks={allBlocks}
      currentBlockIndex={currentBlockIndex}
      onBlockChange={onBlockChange}
      currentExerciseIndex={currentExerciseIndex}
      onExerciseIndexChange={onExerciseIndexChange}
      onNextBlock={onNextBlock}
      sessionId={sessionId}
      assignmentId={assignmentId}
      aboveStickyContent={aboveStickyContent}
    />
  );
}

