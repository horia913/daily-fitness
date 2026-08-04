"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pencil,
  ChevronLeft,
} from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import { formatTime } from "../BaseBlockExecutor";
import { BaseSetEntryExecutorProps } from "../types";
import { useWorkoutExecutionChrome } from "../WorkoutExecutionChromeContext";
import { NavigationControls } from "../ui/NavigationControls";
import { LastSessionSetsSection } from "../ui/LastSessionSetsSection";
import { ProgressionNudge } from "../ui/ProgressionNudge";
import { LoggedSet } from "@/types/workoutSetEntries";
import { LoggedSetsList, type LoggedSetRow } from "../ui/LoggedSetsList";
import { useUpdateSetRpe } from "../hooks/useUpdateSetRpe";
import { useLoggingReset } from "../hooks/useLoggingReset";
import { fetchApi } from "@/lib/apiClient";
import { buildSetEditPatchPayload } from "@/lib/setEditPayload";
import { parseRepsTarget } from "@/lib/workout/parseRepsTarget";
import { parseWeightKgInput } from "@/lib/parseWeightKgInput";
import { resolveSetPrescriptionTargets } from "../ui/set-rows/resolveSetPrescriptionTargets";
import {
  LiveCard,
  LiveCardGroupedExercise,
  LiveCardNote,
  LiveCardLog,
  LiveCardLogField,
  LiveCardLogButton,
  LiveCardLogTimeHeld,
  LiveCardGlue,
  effortFromPrescribedRpe,
  groupIndexToHue,
  type LiveCardTarget,
} from "../live-card";

function targetsToLiveCardTarget(
  targets: ReturnType<typeof resolveSetPrescriptionTargets>,
): LiveCardTarget {
  if (targets.weight_kg != null) {
    return {
      kind: "reps_weight",
      reps: targets.reps ?? "—",
      weight: targets.weight_kg,
    };
  }
  return {
    kind: "reps_only",
    reps: targets.reps ?? "—",
    unit: "reps",
  };
}

export function ForTimeExecutor({
  liveSetEntry,
  onSetEntryComplete,
  onNextSetEntry,
  e1rmMap = {},
  onE1rmUpdate,
  lastPerformedWeightByExerciseId = {},
  lastSessionWeightByExerciseId = {},
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
  onWorkoutBack,
  previousPerformanceMap,
  progressionSuggestion,
  allowSetEditDelete = false,
  registerSetLogIdResolved,
  onSetLogUpsert,
  onSetEditSaved,
  loggedSets,
}: BaseSetEntryExecutorProps) {
  /** Parent-owned logged sets; single source of truth. Persists across block navigation. */
  const loggedSetsList = loggedSets ?? [];

  const [viewingSetIndex, setViewingSetIndex] = useState(0);
  /** Collapsible set history: show all sets or only last 2 */
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    weight: string;
    reps: string;
    set_number?: number;
  } | null>(null);
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
    if (viewingSetIndex > loggedSetsList.length)
      setViewingSetIndex(loggedSetsList.length);
  }, [loggedSetsList.length, viewingSetIndex]);
  useEffect(() => {
    if (viewingSetIndex >= 1) {
      const entry =
        loggedSetsList.find((s) => s.set_number === viewingSetIndex) ??
        loggedSetsList[viewingSetIndex - 1];
      if (entry) {
        setWeight(String(entry.weight_kg ?? ""));
        setReps(String(entry.reps_completed ?? ""));
      }
    }
  }, [viewingSetIndex, loggedSetsList]);

  const isViewingLoggedSet = viewingSetIndex >= 1;

  const exercises = liveSetEntry.setEntry.exercises || [];
  const effectiveIndex =
    exercises.length > 0
      ? Math.min(currentExerciseIndex, exercises.length - 1)
      : 0;
  const currentExercise = exercises[effectiveIndex];

  const { addToast } = useToast();

  // Read from special table (time_protocols)
  const timeProtocol =
    liveSetEntry.setEntry.time_protocols?.find(
      (tp: any) =>
        tp.protocol_type === "for_time" &&
        (tp.exercise_id === currentExercise?.exercise_id ||
          !currentExercise?.exercise_id),
    ) || liveSetEntry.setEntry.time_protocols?.[0];

  const timeCapMinutes = timeProtocol?.time_cap_minutes || 15;
  const targetReps = timeProtocol?.target_reps;
  const targetRepsParsed = parseRepsTarget(targetReps);

  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [isLoggingSet, setIsLoggingSet] = useState(false);
  useLoggingReset(isLoggingSet, setIsLoggingSet);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerStopped, setTimerStopped] = useState(false);
  const [completionTime, setCompletionTime] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const exerciseId = currentExercise?.exercise_id ?? "";

  useEffect(() => {
    if (isViewingLoggedSet) return;
    setWeight("");
    setReps(
      targetRepsParsed.numericDefault > 0
        ? String(targetRepsParsed.numericDefault)
        : "",
    );
  }, [
    isViewingLoggedSet,
    targetRepsParsed.numericDefault,
    currentExerciseIndex,
    exerciseId,
  ]);

  // Timer logic
  useEffect(() => {
    if (startTime) {
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
        setElapsedSeconds(elapsed);

        // Check if time cap reached
        if (elapsed >= timeCapMinutes * 60) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }
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
  }, [startTime, timeCapMinutes]);

  const instructions =
    currentExercise?.notes ||
    liveSetEntry.setEntry.set_notes ||
    "Complete all exercises as fast as possible. Focus on form and efficiency.";

  const handleStartTimer = () => {
    setStartTime(new Date());
    setElapsedSeconds(0);
    setTimerStopped(false);
    setCompletionTime(null);
  };

  const handleStopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimerStopped(true);
    setCompletionTime(elapsedSeconds);
    setStartTime(null);
  };

  const handleEditSet = (setEntry: LoggedSet) => {
    setEditingSetId(setEntry.id);
    setEditDraft({
      weight: String(setEntry.weight_kg ?? ""),
      reps: String(setEntry.reps_completed ?? ""),
      set_number: setEntry.set_number ?? 1,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingSetId || !editDraft) return;
    if (editingSetId.startsWith("temp-")) {
      if (process.env.NODE_ENV !== "production") {
        console.log("[SAVE EDITS guard]", {
          executor: "ForTimeExecutor",
          blockTypeFromUI: liveSetEntry.setEntry.set_type,
          editingSetId,
          isSavingEdit,
          timestamp: Date.now(),
        });
      }
      addToast({
        title: "Set still saving, try again in a moment",
        variant: "default",
        duration: 2000,
      });
      return;
    }
    const weightNum =
      editDraft.weight.trim() !== "" ? parseWeightKgInput(editDraft.weight) : 0;
    const repsNum = parseInt(editDraft.reps, 10);
    if (isNaN(repsNum) || repsNum <= 0) return;
    setIsSavingEdit(true);
    try {
      const payload = buildSetEditPatchPayload(liveSetEntry.setEntry.set_type, {
        exercise_id: exercises[0]?.exercise_id ?? undefined,
        weight: !isNaN(weightNum) && weightNum >= 0 ? weightNum : undefined,
        fortime_total_reps: repsNum,
      });
      if (process.env.NODE_ENV !== "production") {
        console.log("[SAVE EDITS]", {
          executor: "ForTimeExecutor",
          setId: editingSetId,
          blockTypeFromUI: liveSetEntry.setEntry.set_type,
          payloadKeys: Object.keys(payload),
        });
      }
      const res = await fetchApi(`/api/sets/${editingSetId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      if (res?.ok) {
        const current = loggedSetsList.find((s) => s.id === editingSetId);
        const updatedEntry: LoggedSet = {
          ...current,
          id: editingSetId,
          exercise_id:
            current?.exercise_id ?? currentExercise?.exercise_id ?? "",
          set_entry_id: liveSetEntry.setEntry.id,
          set_number: current?.set_number ?? 1,
          weight_kg: weightNum,
          reps_completed: repsNum,
          completed_at: current?.completed_at ?? new Date(),
        };
        onSetEditSaved?.(liveSetEntry.setEntry.id, updatedEntry);
        setEditingSetId(null);
        setEditDraft(null);
        addToast({ title: "Set updated", variant: "success", duration: 2000 });
      } else {
        addToast({
          title: "Failed to update set",
          variant: "destructive",
          duration: 3000,
        });
      }
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingSetId(null);
    setEditDraft(null);
  };

  const handleLog = async () => {
    if (isLoggingSet) return;

    let exerciseIdToUse: string | undefined = currentExercise?.exercise_id;
    if (!exerciseIdToUse && exercises.length > 0) {
      const exerciseWithId = exercises.find((ex) => ex.exercise_id);
      exerciseIdToUse = exerciseWithId?.exercise_id || undefined;
    }

    const weightNum =
      weight && weight.trim() !== "" ? parseWeightKgInput(weight) : 0;
    const repsNum = parseInt(reps, 10);

    if (isNaN(repsNum) || repsNum <= 0) {
      addToast({
        title: "Invalid Input",
        description:
          "Please enter valid reps (must be greater than 0). Weight is optional.",
        variant: "destructive",
        duration: 3000,
      });
      setIsLoggingSet(false);
      return;
    }

    if (weight && weight.trim() !== "" && (isNaN(weightNum) || weightNum < 0)) {
      addToast({
        title: "Invalid Input",
        description: "If weight is provided, it must be 0 or greater.",
        variant: "destructive",
        duration: 3000,
      });
      setIsLoggingSet(false);
      return;
    }

    setIsLoggingSet(true);

    try {
      if ("vibrate" in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
    } catch (e) {}

    try {
      // Use the completion time from when timer was stopped, or current elapsed time
      const completionTimeToLog =
        completionTime !== null ? completionTime : elapsedSeconds;

      // Build the log data - exercise_id is optional for fortime blocks
      const logData: any = {
        set_type: "for_time",
        fortime_total_reps: repsNum,
        fortime_time_taken_sec: completionTimeToLog,
        fortime_time_cap_sec: timeCapMinutes * 60,
        fortime_target_reps: targetReps || null,
        isLastSet: true, // For-time is single set per block
      };

      // Include exercise_id if available (optional for fortime blocks)
      if (exerciseIdToUse) {
        logData.exercise_id = String(exerciseIdToUse).trim();
      }

      // Include weight if provided (optional for for_time blocks)
      if (weightNum > 0) {
        logData.weight = weightNum;
      }

      const result = await logSetToDatabase(logData);

      if (result.success) {
        const setLogId =
          (result as { set_log_id?: string }).set_log_id ??
          `temp-${Date.now()}`;
        const newEntry: LoggedSet = {
          id: setLogId,
          exercise_id: exerciseIdToUse || "",
          set_entry_id: liveSetEntry.setEntry.id,
          set_number: 1,
          weight_kg: weightNum > 0 ? weightNum : 0,
          reps_completed: repsNum,
          completed_at: new Date(),
        } as LoggedSet;
        onSetLogUpsert?.(liveSetEntry.setEntry.id, newEntry);

        if (result.e1rm && onE1rmUpdate && exerciseIdToUse) {
          onE1rmUpdate(exerciseIdToUse, result.e1rm);
        }

        addToast({
          title: "For Time Logged!",
          description:
            weightNum > 0
              ? `${weightNum}kg × ${repsNum} reps completed in ${formatTime(completionTimeToLog)}`
              : `${repsNum} reps completed in ${formatTime(completionTimeToLog)}`,
          variant: "success",
          duration: 2000,
        });

        setTimerStopped(false);
        setCompletionTime(null);
        setElapsedSeconds(0);

        onSetEntryComplete(liveSetEntry.setEntry.id, [...loggedSetsList, newEntry]);
      } else {
        addToast({
          title: "Failed to Save",
          description:
            result.error || "Failed to save completion. Please try again.",
          variant: "destructive",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Error logging for time set:", error);
      addToast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoggingSet(false);
    }
  };

  const updateSetRpe = useUpdateSetRpe({
    setEntryId: liveSetEntry.setEntry.id,
    onSetLogUpsert,
  });
  const loggedSetRows: LoggedSetRow[] = loggedSetsList.map((setEntry) => ({
    id: setEntry.id,
    title: `${
      setEntry.weight_kg != null && setEntry.weight_kg > 0
        ? `${setEntry.weight_kg} kg × `
        : ""
    }${setEntry.reps_completed ?? "—"} reps`,
    rpe: setEntry.rpe ?? null,
    onEffortChange: (rpe) => updateSetRpe(setEntry, rpe),
    disabled: setEntry.id.startsWith("temp-"),
    menu: allowSetEditDelete ? (
      <button
        type="button"
        onClick={() => handleEditSet(setEntry)}
        className="grid h-6 w-6 place-items-center rounded-md text-[color:var(--fc-text-dim)] hover:bg-white/5 hover:text-[color:var(--fc-text-primary)]"
        aria-label="Edit"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    ) : null,
  }));
  const aboveStickyContent =
    loggedSetRows.length > 0 ? (
      <LoggedSetsList rows={loggedSetRows} />
    ) : null;

  // Validate inputs — for-time: reps required, weight optional
  const weightStr = String(weight || "").trim();
  const repsStr = String(reps || "").trim();
  const weightNum = weightStr ? parseWeightKgInput(weightStr) : NaN;
  const repsNum = repsStr ? parseInt(repsStr, 10) : NaN;
  const isValidInput =
    repsStr !== "" &&
    !isNaN(repsNum) &&
    isFinite(repsNum) &&
    repsNum > 0 &&
    (weightStr === "" ||
      (!isNaN(weightNum) && isFinite(weightNum) && weightNum > 0));
  const forTimeLogReady = timerStopped && isValidInput && !isLoggingSet;

  const roundExercises = liveSetEntry.setEntry.exercises || [];
  const totalRounds =
    liveSetEntry.setEntry.total_sets ||
    (timeProtocol as { rounds?: number } | undefined)?.rounds ||
    1;
  const displayRound = Math.min(
    Math.max(1, viewingSetIndex >= 1 ? viewingSetIndex : 1),
    totalRounds,
  );

  const nudgeReps = (delta: number) => {
    const cur = parseInt(reps || "0", 10);
    const next = Math.max(0, (isNaN(cur) ? 0 : cur) + delta);
    setReps(String(next));
  };

  const chrome = useWorkoutExecutionChrome();
  const hideCompactBack = chrome?.hideCompactBack ?? false;
  const totalSetEntries = allSetEntries.length || 1;
  const canGoPrevious = currentSetEntryIndex > 0;
  const canGoNext = currentSetEntryIndex < totalSetEntries - 1;
  const previousPerf =
    exerciseId && previousPerformanceMap
      ? (previousPerformanceMap.get(exerciseId) ?? null)
      : null;

  const isEditMode = !!editingSetId && !!editDraft;
  const viewedSetEntry =
    viewingSetIndex >= 1
      ? (loggedSetsList.find((s) => s.set_number === viewingSetIndex) ??
        loggedSetsList[viewingSetIndex - 1])
      : null;
  const fmt = formatTimeProp ?? formatTime;
  const glueClock = fmt(
    timerStopped && completionTime !== null ? completionTime : elapsedSeconds,
  );

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
            heading={`Round ${displayRound} of ${totalRounds}`}
            status={timerStopped ? "complete" : "logging"}
            statusLabel={timerStopped ? "● Done" : "● Logging now"}
          >
            {roundExercises.map((ex, i) => {
              const t = resolveSetPrescriptionTargets(
                ex,
                displayRound,
                liveSetEntry.setEntry.reps_per_set,
              );
              const loggedValue =
                t.weight_kg != null
                  ? `${t.reps ?? "—"} × ${t.weight_kg}`
                  : `${t.reps ?? "—"} reps`;
              return (
                <LiveCardGroupedExercise
                  key={ex.exercise_id ?? `ft-ex-${i}`}
                  badge={String(ex.exercise_order ?? i + 1)}
                  name={ex.exercise?.name || `Exercise ${i + 1}`}
                  target={targetsToLiveCardTarget(t)}
                  effort={effortFromPrescribedRpe(t.rpe)}
                  logged
                  loggedValue={loggedValue}
                />
              );
            })}
            {instructions ? (
              <LiveCardNote>{instructions}</LiveCardNote>
            ) : null}
            <LiveCardLog>
              <div className="flex flex-col gap-3">
                {!startTime && !timerStopped ? (
                  <Button
                    onClick={handleStartTimer}
                    className="bg-rose-500 hover:bg-rose-600 text-white"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Start Timer
                  </Button>
                ) : startTime && !timerStopped ? (
                  <Button
                    onClick={handleStopTimer}
                    variant="outline"
                    className="border-rose-500 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                  >
                    Stop
                  </Button>
                ) : null}

                {timerStopped && (
                  <>
                  <LiveCardLogField
                    label="Total reps"
                    value={editDraft ? editDraft.reps : reps}
                    onChange={(val) => {
                      if (editDraft)
                        setEditDraft((d) => (d ? { ...d, reps: val } : null));
                      else setReps(val);
                    }}
                    onIncrement={() => nudgeReps(1)}
                    onDecrement={() => nudgeReps(-1)}
                  />
                  <LiveCardLogTimeHeld
                    label="Time"
                    value={fmt(
                      completionTime !== null
                        ? completionTime
                        : elapsedSeconds,
                    )}
                    disabled
                  />
                  <LiveCardLogButton
                    disabled={
                      isEditMode
                        ? isSavingEdit ||
                          !editDraft ||
                          editDraft.reps.trim() === "" ||
                          isNaN(parseInt(editDraft.reps, 10)) ||
                          parseInt(editDraft.reps, 10) <= 0
                        : !forTimeLogReady
                    }
                    onClick={() => {
                      if (isEditMode) void handleSaveEdit();
                      else void handleLog();
                    }}
                  />
                  </>
                )}

                {isEditMode ? (
                  <Button variant="outline" onClick={handleCancelEdit}>
                    Cancel edit
                  </Button>
                ) : allowSetEditDelete && viewedSetEntry ? (
                  <Button
                    onClick={() => handleEditSet(viewedSetEntry)}
                    variant="outline"
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit this set
                  </Button>
                ) : null}
              </div>
            </LiveCardLog>
            <LiveCardGlue timer={glueClock}>
              ↻ &nbsp;all rounds, fastest time
            </LiveCardGlue>
          </LiveCard>

          {previousPerf?.lastWorkout != null || progressionSuggestion ? (
            <div className="mx-4">
              <ProgressionNudge
                suggestion={progressionSuggestion}
                previousPerformance={previousPerf}
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
        <LastSessionSetsSection lastWorkout={previousPerf?.lastWorkout ?? null} />
      </div>
    </>
  );
}
