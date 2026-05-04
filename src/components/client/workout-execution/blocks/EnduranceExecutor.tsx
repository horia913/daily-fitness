"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Route, Activity, Heart, Clock, Flame } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import { BaseBlockExecutorLayout } from "../BaseBlockExecutor";
import { LargeInput } from "../ui/LargeInput";
import logPairStyles from "../ui/logWeightRepsPair.module.css";
import { BaseBlockExecutorProps } from "../types";
import type { PrescriptionItem } from "../ui/PrescriptionCard";
import { LogSetButton } from "../ui/LogSetButton";
import { LoggedSet } from "@/types/workoutBlocks";
import { LoggedSetsList, type LoggedSetRow } from "../ui/LoggedSetsList";
import { useUpdateSetRpe } from "../hooks/useUpdateSetRpe";
import { appendTargetEffortItem } from "../appendTargetEffortItem";
import { useLoggingReset } from "../hooks/useLoggingReset";
import { formatPaceMinSecPerKm } from "@/lib/enduranceFormUtils";

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

export function EnduranceExecutor({
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
}: BaseBlockExecutorProps) {
  const { addToast } = useToast();
  const currentExercise = block.block.exercises?.[currentExerciseIndex];
  const loggedSetsList = loggedSetsProp ?? [];

  const exOrder = currentExercise?.exercise_order ?? 1;
  const endRow =
    (currentExercise as any)?.endurance_sets?.[0] ||
    block.block.endurance_sets?.find(
      (e: any) =>
        e.exercise_id === currentExercise?.exercise_id &&
        (e.exercise_order ?? 1) === exOrder,
    ) ||
    block.block.endurance_sets?.[0];

  const targetDistM = endRow?.target_distance_meters ?? 0;
  const targetTimeSec = endRow?.target_time_seconds ?? null;
  const targetPaceSec = endRow?.target_pace_seconds_per_km ?? null;
  const hrZone = endRow?.hr_zone ?? null;
  const hrPct =
    endRow?.target_hr_pct ??
    (endRow as { hr_percentage?: number | null })?.hr_percentage ??
    null;

  const [distanceKmStr, setDistanceKmStr] = useState("");
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
      onSetLogUpsert?.(block.block.id, newEntry, { replaceId: oldEntry.id });
    });
    return () => {};
  }, [registerSetLogIdResolved, onSetLogUpsert, block.block.id]);

  const completed = loggedSetsList.length >= 1;

  useEffect(() => {
    if (completed) return;
    if (targetDistM > 0) {
      setDistanceKmStr(String(Number((targetDistM / 1000).toFixed(2))));
    }
    if (targetTimeSec != null && targetTimeSec > 0) {
      setTimeMmss(formatTimeProp(targetTimeSec));
    }
  }, [completed, targetDistM, targetTimeSec, formatTimeProp]);

  const actualPaceSec = useMemo(() => {
    const km = parseFloat(distanceKmStr);
    const t = parseMmssToSeconds(timeMmss);
    if (!Number.isFinite(km) || km <= 0 || t == null || t <= 0) return null;
    return t / km;
  }, [distanceKmStr, timeMmss]);

  const prescriptionItems: PrescriptionItem[] = [];
  if (targetDistM > 0) {
    prescriptionItems.push({
      icon: Route,
      label: "Distance",
      value: Number((targetDistM / 1000).toFixed(2)),
      unit: "km",
    });
  }
  if (targetPaceSec != null && targetPaceSec > 0) {
    prescriptionItems.push({
      icon: Activity,
      label: "Pace",
      value: formatPaceMinSecPerKm(targetPaceSec),
    });
  }
  if (hrZone != null) {
    prescriptionItems.push({
      icon: Heart,
      label: "Zone",
      value: `Zone ${hrZone}`,
    });
  } else if (hrPct != null) {
    prescriptionItems.push({
      icon: Heart,
      label: "HR",
      value: hrPct,
      unit: "% max",
    });
  }
  if (targetTimeSec != null && targetTimeSec > 0) {
    prescriptionItems.push({
      icon: Clock,
      label: "Target time",
      value: formatTimeProp(targetTimeSec),
    });
  }
  appendTargetEffortItem(
    prescriptionItems,
    currentExercise ? (currentExercise as { rir?: unknown }).rir : undefined,
    Flame,
  );

  const instructions =
    currentExercise?.notes ||
    block.block.set_notes ||
    endRow?.notes ||
    undefined;

  const kmPreview = parseFloat(distanceKmStr);
  const tPreview = parseMmssToSeconds(timeMmss);
  const enduranceLogReady =
    !isLoggingSet &&
    !completed &&
    Number.isFinite(kmPreview) &&
    kmPreview > 0 &&
    tPreview != null &&
    tPreview > 0;

  const handleLog = async () => {
    if (!currentExercise?.exercise_id || isLoggingSet || completed) return;
    const km = parseFloat(distanceKmStr);
    const t = parseMmssToSeconds(timeMmss);
    if (!Number.isFinite(km) || km <= 0) {
      addToast({
        title: "Distance required",
        description: "Enter actual distance in km",
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
    const distM = km * 1000;
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
          set_entry_id: block.block.id,
          set_number: 1,
          actual_distance_meters: distM,
          actual_time_seconds: t,
          actual_speed_kmh: speedKmh,
          ...(hrNum != null && Number.isFinite(hrNum)
            ? { actual_hr_avg: hrNum }
            : {}),
          completed_at: new Date(),
        } as LoggedSet;
        onSetLogUpsert?.(block.block.id, loggedSet);
        onBlockComplete(block.block.id, [loggedSet]);
      } else {
        addToast({ title: "Could not log", variant: "destructive" });
      }
    } finally {
      setIsLoggingSet(false);
    }
  };

  const exerciseName = currentExercise?.exercise?.name || "Endurance";

  const updateSetRpe = useUpdateSetRpe({
    blockId: block.block.id,
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

  return (
    <BaseBlockExecutorLayout
      block={block}
      exerciseName={exerciseName}
      prescriptionItems={prescriptionItems}
      instructions={instructions}
      onVideoClick={onVideoClick}
      onAlternativesClick={onAlternativesClick}
      onRestTimerClick={onRestTimerClick}
      progressionSuggestion={progressionSuggestion}
      onBlockComplete={onBlockComplete}
      onNextBlock={onNextBlock}
      allBlocks={allBlocks}
      currentBlockIndex={currentBlockIndex}
      onBlockChange={onBlockChange}
      currentExerciseIndex={currentExerciseIndex}
      onExerciseIndexChange={onExerciseIndexChange}
      sessionId={sessionId}
      assignmentId={assignmentId}
      logSetToDatabase={logSetToDatabase}
      calculateSuggestedWeight={calculateSuggestedWeight}
      formatTime={formatTimeProp}
      loggingInputs={
        <div className="space-y-4">
          {!completed && (
            <>
              <div className={`w-full min-w-0 ${logPairStyles.pair}`}>
                <div className="flex min-h-0 min-w-0 flex-col">
                  <LargeInput
                    label="Distance"
                    unit="km"
                    inputType="decimal"
                    value={distanceKmStr}
                    onChange={setDistanceKmStr}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    showStepper
                    stepAmount={0.01}
                    hint="Actual distance in km"
                  />
                </div>
                <div className="flex min-h-0 min-w-0 flex-col">
                  <LargeInput
                    label="Duration"
                    type="text"
                    value={timeMmss}
                    onChange={setTimeMmss}
                    placeholder="28:30"
                    hint="mm:ss or seconds"
                    showStepper={false}
                  />
                </div>
              </div>
              {actualPaceSec != null && (
                <p className="text-sm text-muted-foreground">
                  Pace: {formatPaceMinSecPerKm(actualPaceSec)}
                </p>
              )}
              <div className="w-full min-w-0">
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
            </>
          )}
        </div>
      }
      logButton={
        <LogSetButton
          onClick={handleLog}
          ready={enduranceLogReady}
          loading={isLoggingSet}
          label={completed ? "Logged" : "Log effort"}
        />
      }
      aboveStickyContent={aboveStickyContent}
      currentSet={1}
      totalSets={1}
      currentExercise={currentExercise as any}
      onWorkoutBack={onWorkoutBack}
      previousPerformanceMap={previousPerformanceMap}
    />
  );
}
