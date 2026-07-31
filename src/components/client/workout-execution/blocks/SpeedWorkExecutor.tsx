"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import { LargeInput } from "../ui/LargeInput";
import { BaseSetEntryExecutorProps } from "../types";
import { useWorkoutExecutionChrome } from "../WorkoutExecutionChromeContext";
import { NavigationControls } from "../ui/NavigationControls";
import { ExerciseActionButtons } from "../ui/ExerciseActionButtons";
import { LastSessionSetsSection } from "../ui/LastSessionSetsSection";
import { ProgressionNudge } from "../ui/ProgressionNudge";
import { LoggedSet } from "@/types/workoutSetEntries";
import { LoggedSetsList, type LoggedSetRow } from "../ui/LoggedSetsList";
import { useUpdateSetRpe } from "../hooks/useUpdateSetRpe";
import { useLoggingReset } from "../hooks/useLoggingReset";
import { resolveSetPrescriptionTargets } from "../ui/set-rows/resolveSetPrescriptionTargets";
import {
  LiveCard,
  LiveCardExerciseName,
  LiveCardPrimary,
  LiveCardStats,
  LiveCardNote,
  LiveCardLog,
  LiveCardLogDistanceTime,
  LiveCardLogButton,
  effortFromPrescribedRir,
  formatLiveRest,
  resolveRestSeconds,
  formatLiveLastDistance,
  formatLiveLastDuration,
  groupIndexToHue,
  type LiveCardTarget,
} from "../live-card";

export function SpeedWorkExecutor({
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
  calculateSuggestedWeight,
  formatTime: formatTimeProp,
  onVideoClick,
  onAlternativesClick,
  onRestTimerClick,
  progressionSuggestion,
  registerSetLogIdResolved,
  onSetLogUpsert,
  onSetEditSaved,
  loggedSets: loggedSetsProp,
  clientBodyWeightKg,
  onWorkoutBack,
  previousPerformanceMap,
}: BaseSetEntryExecutorProps) {
  const { addToast } = useToast();
  const currentExercise = liveSetEntry.setEntry.exercises?.[currentExerciseIndex];
  const loggedSetsList = loggedSetsProp ?? [];

  const exOrder = currentExercise?.exercise_order ?? 1;
  const speedRow =
    (currentExercise as any)?.speed_sets?.[0] ||
    liveSetEntry.setEntry.speed_sets?.find(
      (s: any) =>
        s.exercise_id === currentExercise?.exercise_id &&
        (s.exercise_order ?? 1) === exOrder,
    ) ||
    liveSetEntry.setEntry.speed_sets?.[0];

  const totalIntervals =
    speedRow?.intervals ?? liveSetEntry.setEntry.total_sets ?? 1;
  const nextIntervalNum = loggedSetsList.length + 1;
  const completed = loggedSetsList.length >= totalIntervals;

  const targets = resolveSetPrescriptionTargets(
    currentExercise,
    Math.min(nextIntervalNum, totalIntervals),
    liveSetEntry.setEntry.reps_per_set,
  );
  const distanceM =
    targets.distance_meters ?? speedRow?.distance_meters ?? 0;
  const restSec = resolveRestSeconds(
    speedRow?.rest_seconds,
    currentExercise?.rest_seconds,
    liveSetEntry.setEntry.rest_seconds,
  );
  const loadPctBw =
    speedRow?.load_pct_bw ?? (speedRow as any)?.load_percent_bw ?? null;

  const [distanceStr, setDistanceStr] = useState(
    distanceM > 0 ? String(Math.round(distanceM)) : "",
  );
  const [timeSec, setTimeSec] = useState("");
  const [hrAvg, setHrAvg] = useState("");
  const [isLoggingSet, setIsLoggingSet] = useState(false);
  useLoggingReset(isLoggingSet, setIsLoggingSet);

  const loggedSetsRef = useRef<LoggedSet[]>(loggedSetsList);
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
      const newEntry = { ...oldEntry, id: set_log_id };
      onSetLogUpsert?.(liveSetEntry.setEntry.id, newEntry, { replaceId: oldEntry.id });
    });
    return () => {};
  }, [registerSetLogIdResolved, onSetLogUpsert, liveSetEntry.setEntry.id]);

  useEffect(() => {
    if (distanceM > 0) setDistanceStr(String(Math.round(distanceM)));
  }, [distanceM, nextIntervalNum]);

  const instructions =
    currentExercise?.notes ||
    liveSetEntry.setEntry.set_notes ||
    speedRow?.notes ||
    undefined;

  const handleLog = async () => {
    if (!currentExercise?.exercise_id || isLoggingSet || completed) return;
    const t = parseInt(String(timeSec).trim(), 10);
    if (!Number.isFinite(t) || t <= 0) {
      addToast({
        title: "Invalid time",
        description: "Enter interval time in seconds",
        variant: "destructive",
      });
      return;
    }
    const hrNum =
      hrAvg.trim() === "" ? undefined : parseFloat(String(hrAvg).trim());

    setIsLoggingSet(true);
    try {
      const logData: Record<string, unknown> = {
        set_type: "speed_work",
        exercise_id: currentExercise.exercise_id,
        set_number: nextIntervalNum,
        actual_time_seconds: t,
        isLastSet: nextIntervalNum >= totalIntervals,
      };
      if (hrNum != null && Number.isFinite(hrNum)) {
        logData.actual_hr_avg = hrNum;
      }

      const result = await logSetToDatabase(logData);
      if (result.success) {
        const loggedSet: LoggedSet = {
          id: result.set_log_id || `temp-${nextIntervalNum}-${Date.now()}`,
          exercise_id: currentExercise.exercise_id,
          set_entry_id: liveSetEntry.setEntry.id,
          set_number: nextIntervalNum,
          actual_time_seconds: t,
          ...(hrNum != null && Number.isFinite(hrNum)
            ? { actual_hr_avg: hrNum }
            : {}),
          completed_at: new Date(),
        } as LoggedSet;
        onSetLogUpsert?.(liveSetEntry.setEntry.id, loggedSet);
        setTimeSec("");
        setHrAvg("");
        if (nextIntervalNum >= totalIntervals) {
          onSetEntryComplete(liveSetEntry.setEntry.id, [
            ...loggedSetsList,
            loggedSet,
          ]);
        }
      } else {
        addToast({
          title: "Could not log interval",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoggingSet(false);
    }
  };

  const tParsed = parseInt(String(timeSec).trim(), 10);
  const speedLogReady =
    !isLoggingSet && !completed && Number.isFinite(tParsed) && tParsed > 0;

  const updateSetRpe = useUpdateSetRpe({
    setEntryId: liveSetEntry.setEntry.id,
    onSetLogUpsert,
  });
  const loggedSetRows: LoggedSetRow[] = loggedSetsList
    .slice()
    .sort((a, b) => a.set_number - b.set_number)
    .map((entry) => {
      const timePart =
        entry.actual_time_seconds != null
          ? `${entry.actual_time_seconds}s`
          : "—";
      const hrPart =
        entry.actual_hr_avg != null ? ` · HR ${entry.actual_hr_avg}` : "";
      return {
        id: entry.id,
        title: `Interval ${entry.set_number}: ${timePart}${hrPart}`,
        rpe: entry.rpe ?? null,
        onEffortChange: (rpe) => updateSetRpe(entry, rpe),
        disabled: entry.id.startsWith("temp-"),
      };
    });
  const aboveStickyContent =
    loggedSetRows.length > 0 ? (
      <LoggedSetsList rows={loggedSetRows} label="Logged intervals" />
    ) : null;

  const activeEffort = effortFromPrescribedRir(targets.rir);
  const liveTarget: LiveCardTarget =
    distanceM > 0
      ? {
          kind: "distance",
          meters:
            distanceM >= 1000
              ? Number((distanceM / 1000).toFixed(1))
              : Math.round(distanceM),
          unit: distanceM >= 1000 ? "km" : "metres",
        }
      : { kind: "distance", meters: "—", unit: "metres" };

  const lastLogged = loggedSetsList[loggedSetsList.length - 1];
  const lastLabel =
    formatLiveLastDuration(lastLogged?.actual_time_seconds) ??
    formatLiveLastDistance(distanceM > 0 ? distanceM : null);

  const paceOrLoadLabel =
    loadPctBw != null
      ? `${loadPctBw}% BW${
          clientBodyWeightKg != null
            ? ` · ~${Math.round((clientBodyWeightKg * loadPctBw) / 100)} kg`
            : ""
        }`
      : null;
  const middleLabel = loadPctBw != null ? "Load" : "Pace";

  const chrome = useWorkoutExecutionChrome();
  const hideCompactBack = chrome?.hideCompactBack ?? false;
  const totalSetEntries = allSetEntries.length || 1;
  const canGoPrevious = currentSetEntryIndex > 0;
  const canGoNext = currentSetEntryIndex < totalSetEntries - 1;
  const prevPerf =
    currentExercise?.exercise_id && previousPerformanceMap
      ? (previousPerformanceMap.get(currentExercise.exercise_id) ?? null)
      : null;

  const nudgeDist = (delta: number) => {
    const cur = parseFloat(distanceStr || "0");
    const next = Math.max(0, (isNaN(cur) ? 0 : cur) + delta);
    setDistanceStr(String(Math.round(next)));
  };
  const nudgeTime = (delta: number) => {
    const cur = parseInt(timeSec || "0", 10);
    const next = Math.max(0, (isNaN(cur) ? 0 : cur) + delta);
    setTimeSec(String(next));
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
            heading={`Interval ${Math.min(nextIntervalNum, totalIntervals)} of ${totalIntervals}`}
            status={completed ? "complete" : "logging"}
          >
            <div>
              <LiveCardExerciseName
                name={currentExercise?.exercise?.name || "Speed work"}
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
              rest={formatLiveRest(restSec)}
              tempo={paceOrLoadLabel}
              last={lastLabel}
              middleLabel={middleLabel}
            />
            {instructions ? (
              <LiveCardNote>{instructions}</LiveCardNote>
            ) : null}
            <LiveCardLog>
              {!completed ? (
                <div className="flex flex-col gap-3">

                  <LiveCardLogDistanceTime
                    distance={distanceStr}
                    time={timeSec}
                    distanceLabel="Distance"
                    timeLabel="Time"
                    onDistanceChange={setDistanceStr}
                    onTimeChange={setTimeSec}
                    onDistanceIncrement={() => nudgeDist(1)}
                    onDistanceDecrement={() => nudgeDist(-1)}
                    onTimeIncrement={() => nudgeTime(1)}
                    onTimeDecrement={() => nudgeTime(-1)}
                    disabled={isLoggingSet}
                  />
                  <LiveCardLogButton
                    disabled={!speedLogReady}
                    onClick={() => void handleLog()}
                  />
                  <LargeInput
                    label="Avg HR"
                    unit="bpm"
                    inputType="decimal"
                    value={hrAvg}
                    onChange={setHrAvg}
                    placeholder="—"
                    min="0"
                    showStepper
                    stepAmount={1}
                    hint="Optional average heart rate"
                  />
                </div>
              ) : (
                <p className="text-sm text-[color:var(--fc-status-success)]">
                  All intervals complete
                </p>
              )}
            </LiveCardLog>
          </LiveCard>

          {progressionSuggestion || prevPerf?.lastWorkout ? (
            <div className="mx-4">
              <ProgressionNudge
                suggestion={progressionSuggestion}
                previousPerformance={prevPerf}
                showPreviousSession={false}
              />
            </div>
          ) : null}

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
        <LastSessionSetsSection lastWorkout={prevPerf?.lastWorkout ?? null} />
      </div>
    </>
  );
}
