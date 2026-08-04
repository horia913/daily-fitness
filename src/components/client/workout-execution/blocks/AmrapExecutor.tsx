"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  RotateCcw,
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
import { getWeightDefaultAndSuggestion } from "@/lib/weightDefaultService";
import { fetchApi } from "@/lib/apiClient";
import { buildSetEditPatchPayload } from "@/lib/setEditPayload";
import { parseWeightKgInput } from "@/lib/parseWeightKgInput";
import { parseRepsTarget } from "@/lib/workout/parseRepsTarget";
import { resolveSetPrescriptionTargets } from "../ui/set-rows/resolveSetPrescriptionTargets";
import { formatGroupedExerciseBadge } from "../groupLetterBadges";
import {
  LiveCard,
  LiveCardGroupedExercise,
  LiveCardNote,
  LiveCardLog,
  LiveCardLogField,
  LiveCardLogButton,
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

function groupExerciseBadge(
  groupIndex: number,
  exerciseOrder: number | undefined,
  index: number,
): string {
  return formatGroupedExerciseBadge(groupIndex, exerciseOrder, index);
}

export function AmrapExecutor({
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
  const { addToast } = useToast();
  const currentExercise = liveSetEntry.setEntry.exercises?.[currentExerciseIndex];
  const totalSets = 1;
  const completedSets = liveSetEntry.completedSets ?? 0;

  /** Parent-owned logged sets; single source of truth. Persists across block navigation. */
  const loggedSetsList = loggedSets ?? [];

  const [viewingSetIndex, setViewingSetIndex] = useState(0);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    weight: string;
    reps: string;
    set_number?: number;
  } | null>(null);

  const displaySetNumber =
    editingSetId && editDraft?.set_number != null
      ? editDraft.set_number
      : viewingSetIndex >= 1
        ? viewingSetIndex
        : Math.min(completedSets + 1, totalSets);

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
  const timeProtocol =
    liveSetEntry.setEntry.time_protocols?.find(
      (tp: any) =>
        tp.protocol_type === "amrap" &&
        (tp.exercise_id === currentExercise?.exercise_id ||
          !currentExercise?.exercise_id),
    ) || liveSetEntry.setEntry.time_protocols?.[0];

  const durationSeconds = timeProtocol?.total_duration_minutes
    ? timeProtocol.total_duration_minutes * 60
    : liveSetEntry.setEntry.duration_seconds || 600;
  const targetReps = timeProtocol?.target_reps;
  const targetRepsParsed = parseRepsTarget(targetReps);

  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [isLoggingSet, setIsLoggingSet] = useState(false);
  useLoggingReset(isLoggingSet, setIsLoggingSet);
  const [timeRemaining, setTimeRemaining] = useState(durationSeconds);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [isWeightPristine, setIsWeightPristine] = useState(true);

  const exerciseId = currentExercise?.exercise_id ?? "";
  const sessionStickyWeight = exerciseId
    ? (lastPerformedWeightByExerciseId[exerciseId] ?? null)
    : null;
  const lastSessionWeightVal = exerciseId
    ? (lastSessionWeightByExerciseId[exerciseId] ?? null)
    : null;
  const loadPercentage = currentExercise?.load_percentage ?? null;
  const e1rm = exerciseId ? (e1rmMap[exerciseId] ?? null) : null;
  const { default_weight, suggested_weight } =
    getWeightDefaultAndSuggestion({
      sessionStickyWeight: sessionStickyWeight ?? null,
      lastSessionWeight: lastSessionWeightVal ?? null,
      loadPercentage,
      e1rm: e1rm ?? null,
    });

  useEffect(() => {
    setIsWeightPristine(true);
  }, [currentExerciseIndex, exerciseId]);

  useEffect(() => {
    if (isViewingLoggedSet) return;
    if (!isWeightPristine) return;
    if (default_weight != null && default_weight > 0)
      setWeight(String(default_weight));
    else setWeight("");
    setReps(
      targetRepsParsed.numericDefault > 0
        ? String(targetRepsParsed.numericDefault)
        : "",
    );
  }, [
    isViewingLoggedSet,
    isWeightPristine,
    default_weight,
    targetRepsParsed.numericDefault,
    currentExerciseIndex,
    exerciseId,
  ]);

  // Timer logic
  useEffect(() => {
    if (isActive && timeRemaining > 0 && !isPaused) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsActive(false);
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
  }, [isActive, timeRemaining, isPaused]);

  const instructions =
    currentExercise?.notes || liveSetEntry.setEntry.set_notes || undefined;

  const handleStartTimer = () => {
    setIsActive(true);
    setIsPaused(false);
    setTimeRemaining(durationSeconds);
  };

  const handlePauseResume = () => {
    if (isActive) {
      setIsPaused(!isPaused);
    } else {
      setIsActive(true);
      setIsPaused(false);
    }
  };

  const handleResetTimer = () => {
    setIsActive(false);
    setIsPaused(false);
    setTimeRemaining(durationSeconds);
  };

  // Check if timer has ended
  const timerHasEnded = timeRemaining === 0 && !isActive;

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
          executor: "AmrapExecutor",
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
    const weightNum = parseWeightKgInput(editDraft.weight);
    const repsNum = parseInt(editDraft.reps, 10);
    if (isNaN(repsNum) || repsNum <= 0) return;
    setIsSavingEdit(true);
    try {
      const payload = buildSetEditPatchPayload(liveSetEntry.setEntry.set_type, {
        exercise_id: currentExercise?.exercise_id ?? undefined,
        weight: !isNaN(weightNum) && weightNum >= 0 ? weightNum : undefined,
        amrap_total_reps: repsNum,
      });
      if (process.env.NODE_ENV !== "production") {
        console.log("[SAVE EDITS]", {
          executor: "AmrapExecutor",
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

  const handleLogSet = async () => {
    if (!currentExercise || isLoggingSet) return;

    if (!currentExercise.exercise_id) {
      addToast({
        title: "Error",
        description: "Exercise ID not found. Please refresh the page.",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    const weightNum = parseWeightKgInput(weight);
    const repsNum = parseInt(reps, 10);

    if (
      !weight ||
      weight.trim() === "" ||
      isNaN(weightNum) ||
      weightNum < 0 ||
      !reps ||
      reps.trim() === "" ||
      isNaN(repsNum) ||
      repsNum <= 0
    ) {
      addToast({
        title: "Invalid Input",
        description: "Please enter valid weight and reps",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    setIsLoggingSet(true);

    try {
      if ("vibrate" in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
    } catch (e) {}

    try {
      // Log the final set
      // Ensure exercise_id is a valid string
      const exerciseIdToLog = String(currentExercise.exercise_id || "").trim();
      if (!exerciseIdToLog) {
        addToast({
          title: "Error",
          description: "Exercise ID is invalid. Please refresh the page.",
          variant: "destructive",
          duration: 5000,
        });
        return;
      }

      // Calculate actual duration used (durationSeconds - timeRemaining)
      const actualDurationSeconds = durationSeconds - timeRemaining;

      console.log(
        "AmrapExecutor handleLogSet: Calling logSetToDatabase with:",
        {
          set_type: "amrap",
          exercise_id: exerciseIdToLog,
          amrap_total_reps: repsNum,
          amrap_duration_seconds: actualDurationSeconds,
          amrap_target_reps: targetReps || null,
        },
      );

      const logData: any = {
        set_type: "amrap",
        isLastSet: true, // AMRAP is single set per block
      };

      // Only add fields if they're defined
      if (exerciseIdToLog) logData.exercise_id = exerciseIdToLog;
      if (repsNum !== undefined && repsNum !== null && !isNaN(repsNum))
        logData.amrap_total_reps = repsNum;
      if (actualDurationSeconds !== undefined && actualDurationSeconds !== null)
        logData.amrap_duration_seconds = actualDurationSeconds;
      if (targetReps !== undefined && targetReps !== null)
        logData.amrap_target_reps = targetReps;
      if (!isNaN(weightNum) && weightNum > 0) logData.weight = weightNum;

      const result = await logSetToDatabase(logData);

      if (result.success) {
        const setLogId =
          (result as { set_log_id?: string }).set_log_id ??
          `temp-${Date.now()}`;
        const newEntry: LoggedSet = {
          id: setLogId,
          exercise_id: currentExercise.exercise_id,
          set_entry_id: liveSetEntry.setEntry.id,
          set_number: 1,
          weight_kg: weightNum,
          reps_completed: repsNum,
          completed_at: new Date(),
        } as LoggedSet;
        onSetLogUpsert?.(liveSetEntry.setEntry.id, newEntry);

        if (result.e1rm && onE1rmUpdate) {
          onE1rmUpdate(currentExercise.exercise_id, result.e1rm);
        }

        addToast({
          title: "AMRAP Set Logged!",
          description: `${weightNum}kg × ${repsNum} total reps`,
          variant: "success",
          duration: 2000,
        });

        onSetEntryComplete(liveSetEntry.setEntry.id, [...loggedSetsList, newEntry]);
      } else {
        addToast({
          title: "Failed to Save",
          description: "Failed to save set. Please try again.",
          variant: "destructive",
          duration: 5000,
        });
      }
    } finally {
      setIsLoggingSet(false);
    }
  };

  const updateSetRpe = useUpdateSetRpe({
    setEntryId: liveSetEntry.setEntry.id,
    onSetLogUpsert,
  });
  const loggedSetRows: LoggedSetRow[] = loggedSetsList.map((setEntry) => {
    const repsTitle = `${
      setEntry.weight_kg != null && setEntry.weight_kg > 0
        ? `${setEntry.weight_kg} kg × `
        : ""
    }${setEntry.reps_completed ?? "—"} reps${
      setEntry.set_number > 0 ? ` (Set ${setEntry.set_number})` : ""
    }`;
    return {
      id: setEntry.id,
      title: repsTitle,
      rpe: setEntry.rpe ?? null,
      onEffortChange: (rpe) => updateSetRpe(setEntry, rpe),
      disabled: setEntry.id.startsWith("temp-"),
      onTitleClick: allowSetEditDelete
        ? () => handleEditSet(setEntry)
        : undefined,
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
    };
  });
  const aboveStickyContent =
    loggedSetRows.length > 0 ? (
      <LoggedSetsList rows={loggedSetRows} />
    ) : null;

  // Validate inputs for button state
  const weightStr = String(weight || "").trim();
  const repsStr = String(reps || "").trim();
  const weightNum = weightStr ? parseWeightKgInput(weightStr) : NaN;
  const repsNum = repsStr ? parseInt(repsStr, 10) : NaN;
  const isValidInput =
    weightStr !== "" &&
    repsStr !== "" &&
    !isNaN(weightNum) &&
    !isNaN(repsNum) &&
    isFinite(weightNum) &&
    isFinite(repsNum) &&
    weightNum > 0 &&
    repsNum > 0;
  const hasExerciseId = !!currentExercise?.exercise_id;
  const logReadyAmrap = isValidInput && hasExerciseId && !isLoggingSet;

  const exercises = liveSetEntry.setEntry.exercises || [];

  const nudgeWeight = (delta: number) => {
    const cur = parseWeightKgInput(weight || "0");
    const next = Math.max(0, (isNaN(cur) ? 0 : cur) + delta);
    setIsWeightPristine(false);
    setWeight(String(Math.round(next * 2) / 2));
  };
  const nudgeReps = (delta: number) => {
    const cur = parseInt(reps || "0", 10);
    const next = Math.max(0, (isNaN(cur) ? 0 : cur) + delta);
    setIsWeightPristine(false);
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
  const fmt = formatTimeProp ?? formatTime;

  /** Clock: live in-executor countdown (timeRemaining). */
  const glueClock = fmt(timeRemaining);

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
            heading="Round"
            status={timerHasEnded ? "complete" : "logging"}
            statusLabel={
              timerHasEnded ? "● Time's up" : "● In progress"
            }
          >
            {exercises.map((ex, i) => {
              const t = resolveSetPrescriptionTargets(
                ex,
                1,
                liveSetEntry.setEntry.reps_per_set,
              );
              const loggedValue =
                t.weight_kg != null
                  ? `${t.reps ?? "—"} reps · ${t.weight_kg}kg`
                  : `${t.reps ?? "—"} reps`;
              return (
                <LiveCardGroupedExercise
                  key={ex.exercise_id ?? `amrap-ex-${i}`}
                  badge={groupExerciseBadge(
                    currentSetEntryIndex,
                    ex.exercise_order,
                    i,
                  )}
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
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {!isActive && timeRemaining === durationSeconds ? (
                    <Button
                      onClick={handleStartTimer}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start Timer
                    </Button>
                  ) : null}
                  {isActive && !timerHasEnded ? (
                    <>
                      <Button onClick={handlePauseResume} variant="outline">
                        {isPaused ? (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Resume
                          </>
                        ) : (
                          <>
                            <Pause className="w-4 h-4 mr-2" />
                            Pause
                          </>
                        )}
                      </Button>
                      <Button onClick={handleResetTimer} variant="outline">
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset
                      </Button>
                    </>
                  ) : null}
                </div>

                <LiveCardLogField
                  label="Weight"
                  value={editDraft ? editDraft.weight : weight}
                  onChange={(val) => {
                    if (editDraft)
                      setEditDraft((d) => (d ? { ...d, weight: val } : null));
                    else {
                      setIsWeightPristine(false);
                      setWeight(val);
                    }
                  }}
                  onIncrement={() => nudgeWeight(2.5)}
                  onDecrement={() => nudgeWeight(-2.5)}
                />
                <LiveCardLogField
                  label="Total reps"
                  value={editDraft ? editDraft.reps : reps}
                  onChange={(val) => {
                    if (editDraft)
                      setEditDraft((d) => (d ? { ...d, reps: val } : null));
                    else {
                      setIsWeightPristine(false);
                      setReps(val);
                    }
                  }}
                  onIncrement={() => nudgeReps(1)}
                  onDecrement={() => nudgeReps(-1)}
                />
                <LiveCardLogButton
                  disabled={
                    isEditMode
                      ? isSavingEdit ||
                        !editDraft ||
                        editDraft.reps.trim() === "" ||
                        isNaN(parseInt(editDraft.reps, 10)) ||
                        parseInt(editDraft.reps, 10) <= 0
                      : !logReadyAmrap
                  }
                  onClick={() => {
                    if (isEditMode) void handleSaveEdit();
                    else void handleLogSet();
                  }}
                />
                {isEditMode ? (
                  <Button variant="outline" onClick={handleCancelEdit}>
                    Cancel edit
                  </Button>
                ) : null}
                {!isEditMode &&
                suggested_weight != null &&
                suggested_weight > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setWeight(String(suggested_weight));
                      setIsWeightPristine(false);
                    }}
                    className="text-xs font-medium hover:underline text-left"
                    style={{ color: "var(--fc-accent)" }}
                  >
                    {loadPercentage != null
                      ? `${loadPercentage}% → ${suggested_weight} kg`
                      : `Suggested: ${suggested_weight} kg`}{" "}
                    (tap to apply)
                  </button>
                ) : null}
              </div>
            </LiveCardLog>
            <LiveCardGlue timer={glueClock}>
              ↻ &nbsp;as many rounds as possible
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
