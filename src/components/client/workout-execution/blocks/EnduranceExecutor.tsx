"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Route, Activity, Heart, Clock } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import { BaseBlockExecutorLayout } from "../BaseBlockExecutor";
import { LargeInput } from "../ui/LargeInput";
import { BaseBlockExecutorProps } from "../types";
import type { PrescriptionItem } from "../ui/PrescriptionCard";
import { LogSetButton } from "../ui/LogSetButton";
import { LoggedSet } from "@/types/workoutBlocks";
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
  onPlateCalculatorClick,
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
  const [rpeStr, setRpeStr] = useState("");
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
    const rpeNum =
      rpeStr.trim() === "" ? null : parseInt(String(rpeStr).trim(), 10);
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
      if (
        rpeNum != null &&
        !Number.isNaN(rpeNum) &&
        rpeNum >= 1 &&
        rpeNum <= 10
      ) {
        logData.rpe = rpeNum;
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
          ...(rpeNum != null && !Number.isNaN(rpeNum) ? { rpe: rpeNum } : {}),
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

  return (
    <BaseBlockExecutorLayout
      block={block}
      exerciseName={exerciseName}
      prescriptionItems={prescriptionItems}
      instructions={instructions}
      onVideoClick={onVideoClick}
      onAlternativesClick={onAlternativesClick}
      onPlateCalculatorClick={onPlateCalculatorClick}
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
          {completed && loggedSetsList[0] && (
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 text-sm">
              <p className="font-medium">Last effort</p>
              <p className="tabular-nums text-muted-foreground">
                {(
                  (loggedSetsList[0].actual_distance_meters ?? 0) / 1000
                ).toFixed(2)}{" "}
                km ·{" "}
                {formatTimeProp(loggedSetsList[0].actual_time_seconds ?? 0)}
                {loggedSetsList[0].actual_speed_kmh != null
                  ? ` · ${loggedSetsList[0].actual_speed_kmh.toFixed(2)} km/h`
                  : ""}
              </p>
            </div>
          )}
          {!completed && (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Actual distance (km)
                </label>
                <LargeInput
                  type="number"
                  value={distanceKmStr}
                  onChange={setDistanceKmStr}
                  placeholder="e.g. 5.0"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Time (mm:ss or seconds)
                </label>
                <LargeInput
                  type="text"
                  value={timeMmss}
                  onChange={setTimeMmss}
                  placeholder="28:30"
                />
              </div>
              {actualPaceSec != null && (
                <p className="text-sm text-muted-foreground">
                  Pace: {formatPaceMinSecPerKm(actualPaceSec)}
                </p>
              )}
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Avg HR (optional)
                </label>
                <LargeInput
                  type="number"
                  value={hrAvg}
                  onChange={setHrAvg}
                  placeholder="e.g. 152"
                  min="0"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">
                  RPE (1–10, optional)
                </label>
                <LargeInput
                  type="number"
                  value={rpeStr}
                  onChange={setRpeStr}
                  min="1"
                  max="10"
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
      logSectionTitle="LOG YOUR EFFORT"
      currentSet={1}
      totalSets={1}
      currentExercise={currentExercise as any}
      onWorkoutBack={onWorkoutBack}
      previousPerformanceMap={previousPerformanceMap}
    />
  );
}
