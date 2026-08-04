"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
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
import { formatPaceMinSecPerKm } from "@/lib/enduranceFormUtils";
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
  effortFromPrescribedRpe,
  formatLiveRest,
  resolveRestSeconds,
  formatLiveLastDistance,
  groupIndexToHue,
  type LiveCardTarget,
} from "../live-card";

function parseMmssToSeconds(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  const parts = s.split(":");
  if (parts.length === 1) {
    const n = parseInt(parts[0], 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  if (parts.length === 2) {
    const m = parseInt(parts[0], 10);
    const sec = parseInt(parts[1], 10);
    if (!Number.isFinite(m) || !Number.isFinite(sec) || sec < 0 || sec > 59)
      return null;
    return m * 60 + sec;
  }
  return null;
}

function metersToLogDistance(meters: number): string {
  if (meters >= 1000) return String(Number((meters / 1000).toFixed(2)));
  return String(Math.round(meters));
}

export function EnduranceExecutor({
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
  onWorkoutBack,
  previousPerformanceMap,
}: BaseSetEntryExecutorProps) {
  const { addToast } = useToast();
  const currentExercise = liveSetEntry.setEntry.exercises?.[currentExerciseIndex];
  const loggedSetsList = loggedSetsProp ?? [];

  const exOrder = currentExercise?.exercise_order ?? 1;
  const endRow =
    (currentExercise as any)?.endurance_sets?.[0] ||
    liveSetEntry.setEntry.endurance_sets?.find(
      (e: any) =>
        e.exercise_id === currentExercise?.exercise_id &&
        (e.exercise_order ?? 1) === exOrder,
    ) ||
    liveSetEntry.setEntry.endurance_sets?.[0];

  const targets = resolveSetPrescriptionTargets(
    currentExercise,
    1,
    liveSetEntry.setEntry.reps_per_set,
  );
  const targetDistM =
    targets.distance_meters ?? endRow?.target_distance_meters ?? 0;
  const targetTimeSec =
    targets.work_seconds ?? endRow?.target_time_seconds ?? null;
  const targetPaceSec =
    endRow?.target_pace_seconds_per_km ??
    (currentExercise as { target_pace_seconds_per_km?: number | null } | undefined)
      ?.target_pace_seconds_per_km ??
    null;
  const restSec = resolveRestSeconds(
    currentExercise?.rest_seconds,
    liveSetEntry.setEntry.rest_seconds,
  );

  const distanceUsesKm = targetDistM >= 1000;
  const [distanceStr, setDistanceStr] = useState("");
  const [timeMmss, setTimeMmss] = useState("");
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

  const completed = loggedSetsList.length >= 1;

  useEffect(() => {
    if (completed) return;
    if (targetDistM > 0) {
      setDistanceStr(metersToLogDistance(targetDistM));
    }
    if (targetTimeSec != null && targetTimeSec > 0) {
      setTimeMmss(formatTimeProp(targetTimeSec));
    }
  }, [completed, targetDistM, targetTimeSec, formatTimeProp]);

  const actualPaceSec = useMemo(() => {
    const raw = parseFloat(distanceStr);
    const t = parseMmssToSeconds(timeMmss);
    if (!Number.isFinite(raw) || raw <= 0 || t == null || t <= 0) return null;
    const km = distanceUsesKm || targetDistM >= 1000 ? raw : raw / 1000;
    if (km <= 0) return null;
    return t / km;
  }, [distanceStr, timeMmss, distanceUsesKm, targetDistM]);

  const instructions =
    currentExercise?.notes ||
    liveSetEntry.setEntry.set_notes ||
    endRow?.notes ||
    undefined;

  const distPreview = parseFloat(distanceStr);
  const tPreview = parseMmssToSeconds(timeMmss);
  const enduranceLogReady =
    !isLoggingSet &&
    !completed &&
    Number.isFinite(distPreview) &&
    distPreview > 0 &&
    tPreview != null &&
    tPreview > 0;

  const handleLog = async () => {
    if (!currentExercise?.exercise_id || isLoggingSet || completed) return;
    const raw = parseFloat(distanceStr);
    const t = parseMmssToSeconds(timeMmss);
    if (!Number.isFinite(raw) || raw <= 0) {
      addToast({
        title: "Distance required",
        description: distanceUsesKm
          ? "Enter actual distance in km"
          : "Enter actual distance in metres",
        variant: "destructive",
      });
      return;
    }
    if (t == null || t <= 0) {
      addToast({
        title: "Time required",
        description: "Use mm:ss (e.g. 28:30) or seconds",
        variant: "destructive",
      });
      return;
    }
    const distM =
      distanceUsesKm || targetDistM >= 1000 ? raw * 1000 : raw;
    const km = distM / 1000;
    const hrNum =
      hrAvg.trim() === "" ? undefined : parseFloat(String(hrAvg).trim());
    const speedKmh = km / (t / 3600);

    setIsLoggingSet(true);
    try {
      const logData: Record<string, unknown> = {
        set_type: "endurance",
        exercise_id: currentExercise.exercise_id,
        set_number: 1,
        actual_distance_meters: distM,
        actual_time_seconds: t,
        actual_speed_kmh: speedKmh,
        isLastSet: true,
      };
      if (hrNum != null && Number.isFinite(hrNum)) {
        logData.actual_hr_avg = hrNum;
      }

      const result = await logSetToDatabase(logData);
      if (result.success) {
        const loggedSet: LoggedSet = {
          id: result.set_log_id || `temp-end-${Date.now()}`,
          exercise_id: currentExercise.exercise_id,
          set_entry_id: liveSetEntry.setEntry.id,
          set_number: 1,
          actual_distance_meters: distM,
          actual_time_seconds: t,
          actual_speed_kmh: speedKmh,
          ...(hrNum != null && Number.isFinite(hrNum)
            ? { actual_hr_avg: hrNum }
            : {}),
          completed_at: new Date(),
        } as LoggedSet;
        onSetLogUpsert?.(liveSetEntry.setEntry.id, loggedSet);
        onSetEntryComplete(liveSetEntry.setEntry.id, [loggedSet]);
      } else {
        addToast({ title: "Could not log", variant: "destructive" });
      }
    } finally {
      setIsLoggingSet(false);
    }
  };

  const updateSetRpe = useUpdateSetRpe({
    setEntryId: liveSetEntry.setEntry.id,
    onSetLogUpsert,
  });
  const loggedSetRows: LoggedSetRow[] = loggedSetsList.map((entry) => {
    const distKm = (entry.actual_distance_meters ?? 0) / 1000;
    const timeSec = entry.actual_time_seconds ?? 0;
    const title =
      `${distKm.toFixed(2)} km · ${formatTimeProp(timeSec)}` +
      (entry.actual_speed_kmh != null
        ? ` · ${entry.actual_speed_kmh.toFixed(2)} km/h`
        : "");
    return {
      id: entry.id,
      title,
      rpe: entry.rpe ?? null,
      onEffortChange: (rpe) => updateSetRpe(entry, rpe),
      disabled: entry.id.startsWith("temp-"),
    };
  });
  const aboveStickyContent =
    loggedSetRows.length > 0 ? <LoggedSetsList rows={loggedSetRows} /> : null;

  const activeEffort = effortFromPrescribedRpe(targets.rpe);
  const liveTarget: LiveCardTarget =
    targetDistM > 0
      ? {
          kind: "distance",
          meters:
            targetDistM >= 1000
              ? Number((targetDistM / 1000).toFixed(2))
              : Math.round(targetDistM),
          unit: targetDistM >= 1000 ? "km" : "metres",
        }
      : { kind: "distance", meters: "—", unit: "metres" };
  const paceLabel =
    targetPaceSec != null && targetPaceSec > 0
      ? formatPaceMinSecPerKm(targetPaceSec)
      : null;
  const lastLabel = formatLiveLastDistance(
    loggedSetsList[0]?.actual_distance_meters ??
      (previousPerformanceMap && currentExercise?.exercise_id
        ? (
            previousPerformanceMap.get(currentExercise.exercise_id)?.lastWorkout
              ?.setDetails?.[0] as { actual_distance_meters?: number } | undefined
          )?.actual_distance_meters
        : null),
  );

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
    const step = distanceUsesKm ? 0.01 : 1;
    const next = Math.max(0, (isNaN(cur) ? 0 : cur) + delta * step);
    setDistanceStr(
      distanceUsesKm ? String(Number(next.toFixed(2))) : String(Math.round(next)),
    );
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
            heading={completed ? "Done" : "Set 1 of 1"}
            status={completed ? "complete" : "logging"}
          >
            <div>
              <LiveCardExerciseName
                name={currentExercise?.exercise?.name || "Endurance"}
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
              tempo={paceLabel}
              last={lastLabel}
              middleLabel="Pace"
            />
            {instructions ? (
              <LiveCardNote>{instructions}</LiveCardNote>
            ) : null}
            <LiveCardLog>
              {!completed ? (
                <div className="flex flex-col gap-3">

                  <LiveCardLogDistanceTime
                    distance={distanceStr}
                    time={timeMmss}
                    distanceLabel={distanceUsesKm ? "Distance (km)" : "Distance"}
                    timeLabel="Time"
                    onDistanceChange={setDistanceStr}
                    onTimeChange={setTimeMmss}
                    onDistanceIncrement={() => nudgeDist(1)}
                    onDistanceDecrement={() => nudgeDist(-1)}
                    disabled={isLoggingSet}
                  />
                  <LiveCardLogButton
                    disabled={!enduranceLogReady}
                    onClick={() => void handleLog()}
                  />
                  {actualPaceSec != null ? (
                    <p className="text-sm text-[color:var(--fc-text-dim)]">
                      Pace: {formatPaceMinSecPerKm(actualPaceSec)}
                    </p>
                  ) : null}
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
                  Effort logged
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
