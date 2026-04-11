"use client";

import React, { useState, useEffect, useRef } from "react";
import { Hash, Route, Gauge, Timer, Weight } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import { BaseBlockExecutorLayout } from "../BaseBlockExecutor";
import { LargeInput } from "../ui/LargeInput";
import { BaseBlockExecutorProps } from "../types";
import type { PrescriptionItem } from "../ui/PrescriptionCard";
import { LogSetButton } from "../ui/LogSetButton";
import { LoggedSet } from "@/types/workoutBlocks";
import { useLoggingReset } from "../hooks/useLoggingReset";

export function SpeedWorkExecutor({
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
  clientBodyWeightKg,
  onWorkoutBack,
  previousPerformanceMap,
}: BaseBlockExecutorProps) {
  const { addToast } = useToast();
  const currentExercise = block.block.exercises?.[currentExerciseIndex];
  const loggedSetsList = loggedSetsProp ?? [];

  const exOrder = currentExercise?.exercise_order ?? 1;
  const speedRow =
    (currentExercise as any)?.speed_sets?.[0] ||
    block.block.speed_sets?.find(
      (s: any) =>
        s.exercise_id === currentExercise?.exercise_id &&
        (s.exercise_order ?? 1) === exOrder,
    ) ||
    block.block.speed_sets?.[0];

  const totalIntervals = speedRow?.intervals ?? block.block.total_sets ?? 1;
  const distanceM = speedRow?.distance_meters ?? 0;
  const restSec = speedRow?.rest_seconds ?? block.block.rest_seconds ?? 120;
  const loadPctBw =
    speedRow?.load_pct_bw ?? (speedRow as any)?.load_percent_bw ?? null;
  const maxSpeedPct =
    speedRow?.target_speed_pct ?? (speedRow as any)?.max_speed_percent ?? null;
  const maxHrPct =
    speedRow?.target_hr_pct ?? (speedRow as any)?.max_hr_percent ?? null;

  const suggestedLoadKg =
    clientBodyWeightKg != null && loadPctBw != null
      ? Math.round((clientBodyWeightKg * loadPctBw) / 100)
      : null;

  const [timeSec, setTimeSec] = useState("");
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

  const nextIntervalNum = loggedSetsList.length + 1;
  const completed = loggedSetsList.length >= totalIntervals;

  const prescriptionItems: PrescriptionItem[] = [
    { icon: Hash, label: "Intervals", value: totalIntervals },
  ];
  if (distanceM > 0) {
    if (distanceM >= 1000) {
      prescriptionItems.push({
        icon: Route,
        label: "Distance",
        value: Number((distanceM / 1000).toFixed(1)),
        unit: "km",
      });
    } else {
      prescriptionItems.push({
        icon: Route,
        label: "Distance",
        value: Math.round(distanceM),
        unit: "m",
      });
    }
  }
  if (maxSpeedPct != null) {
    prescriptionItems.push({
      icon: Gauge,
      label: "Target speed",
      value: maxSpeedPct,
      unit: "% max",
    });
  } else if (maxHrPct != null) {
    prescriptionItems.push({
      icon: Gauge,
      label: "Target HR",
      value: maxHrPct,
      unit: "% max",
    });
  }
  prescriptionItems.push({
    icon: Timer,
    label: "Recovery",
    value: restSec,
    unit: "s",
  });
  if (loadPctBw != null) {
    prescriptionItems.push({
      icon: Weight,
      label: "Load",
      value: loadPctBw,
      unit: "% BW",
    });
  }

  const instructions =
    currentExercise?.notes ||
    block.block.set_notes ||
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
    const rpeNum =
      rpeStr.trim() === "" ? null : parseInt(String(rpeStr).trim(), 10);

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
          id: result.set_log_id || `temp-${nextIntervalNum}-${Date.now()}`,
          exercise_id: currentExercise.exercise_id,
          set_entry_id: block.block.id,
          set_number: nextIntervalNum,
          actual_time_seconds: t,
          ...(hrNum != null && Number.isFinite(hrNum)
            ? { actual_hr_avg: hrNum }
            : {}),
          ...(rpeNum != null && !Number.isNaN(rpeNum) ? { rpe: rpeNum } : {}),
          completed_at: new Date(),
        } as LoggedSet;
        onSetLogUpsert?.(block.block.id, loggedSet);
        setTimeSec("");
        setHrAvg("");
        setRpeStr("");
        if (nextIntervalNum >= totalIntervals) {
          onBlockComplete(block.block.id, [...loggedSetsList, loggedSet]);
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

  const exerciseName = currentExercise?.exercise?.name || "Speed work";

  const tParsed = parseInt(String(timeSec).trim(), 10);
  const speedLogReady =
    !isLoggingSet &&
    !completed &&
    Number.isFinite(tParsed) &&
    tParsed > 0;

  return (
    <BaseBlockExecutorLayout
      block={block}
      exerciseName={exerciseName}
      prescriptionItems={prescriptionItems}
      prescriptionGridMode="two-column-only"
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
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 text-center">
            <p className="text-sm text-muted-foreground">Interval</p>
            <p className="text-2xl font-bold tabular-nums">
              {Math.min(nextIntervalNum, totalIntervals)} of {totalIntervals}
            </p>
            {completed && (
              <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                All intervals complete
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Time (seconds)
            </label>
            <LargeInput
              type="number"
              value={timeSec}
              onChange={setTimeSec}
              placeholder="e.g. 14.2"
              min="1"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">
              Avg HR (optional)
            </label>
            <LargeInput
              type="number"
              value={hrAvg}
              onChange={setHrAvg}
              placeholder="e.g. 165"
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
              placeholder="e.g. 8"
              min="1"
              max="10"
            />
          </div>

          {loggedSetsList.length > 0 && (
            <div className="space-y-2 border-t border-white/10 pt-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Completed intervals
              </p>
              <ul className="space-y-1 text-sm">
                {loggedSetsList
                  .slice()
                  .sort((a, b) => a.set_number - b.set_number)
                  .map((s) => (
                    <li key={s.id} className="flex justify-between gap-2">
                      <span>#{s.set_number}</span>
                      <span className="tabular-nums">
                        {s.actual_time_seconds != null
                          ? `${s.actual_time_seconds}s`
                          : "—"}
                        {s.actual_hr_avg != null
                          ? ` · HR ${s.actual_hr_avg}`
                          : ""}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      }
      logButton={
        <LogSetButton
          onClick={handleLog}
          ready={speedLogReady}
          loading={isLoggingSet}
          label={
            completed
              ? "Completed"
              : `Log interval ${nextIntervalNum}`
          }
        />
      }
      logSectionTitle={`LOG INTERVAL ${Math.min(nextIntervalNum, totalIntervals)}`}
      currentSet={Math.min(nextIntervalNum, totalIntervals)}
      totalSets={totalIntervals}
      progressLabel="Interval"
      currentExercise={currentExercise as any}
      onWorkoutBack={onWorkoutBack}
      previousPerformanceMap={previousPerformanceMap}
    />
  );
}
