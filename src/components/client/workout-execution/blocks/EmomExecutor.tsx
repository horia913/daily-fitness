"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  Play,
  MoreVertical,
  Pencil,
  ChevronLeft,
} from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import { formatTime } from "../BaseBlockExecutor";
import { parseRepsTarget } from "@/lib/workout/parseRepsTarget";
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
import { getWeightDefaultAndSuggestion } from "@/lib/weightDefaultService";
import { fetchApi } from "@/lib/apiClient";
import { buildSetEditPatchPayload } from "@/lib/setEditPayload";
import { parseWeightKgInput } from "@/lib/parseWeightKgInput";
import { resolveSetPrescriptionTargets } from "../ui/set-rows/resolveSetPrescriptionTargets";
import {
  LiveCard,
  LiveCardExerciseName,
  LiveCardPrimary,
  LiveCardNote,
  LiveCardLog,
  LiveCardLogField,
  LiveCardLogButton,
  LiveCardGlue,
  effortFromPrescribedRpe,
  groupIndexToHue,
  type LiveCardTarget,
} from "../live-card";

export function EmomExecutor({
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

  /** Parent-owned logged sets; single source of truth. Persists across block navigation. */
  const loggedSetsList = loggedSets ?? [];

  const [viewingSetIndex, setViewingSetIndex] = useState(0);
  /** Collapsible set history: show all sets or only last 2 */
  const [showAllSets, setShowAllSets] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [menuOpenSetId, setMenuOpenSetId] = useState<string | null>(null);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    weight: string;
    reps: string;
    set_number?: number;
  } | null>(null);
  const loggedSetsRef = useRef<LoggedSet[]>(loggedSetsList);
  const isViewingLoggedSet = viewingSetIndex >= 1;
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

  // Read from special table (time_protocols)
  const timeProtocol =
    liveSetEntry.setEntry.time_protocols?.find(
      (tp: any) =>
        tp.protocol_type === "emom" &&
        (tp.exercise_id === currentExercise?.exercise_id ||
          !currentExercise?.exercise_id),
    ) || liveSetEntry.setEntry.time_protocols?.[0];

  const durationMinutes =
    timeProtocol?.total_duration_minutes ||
    (liveSetEntry.setEntry.duration_seconds || 600) / 60; // Default 10 minutes
  const emomMode = timeProtocol?.emom_mode || "target_reps";
  const targetReps = timeProtocol?.target_reps || timeProtocol?.reps_per_round;
  const workSeconds = timeProtocol?.work_seconds;
  const targetRepsParsed = parseRepsTarget(targetReps);

  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [currentMinute, setCurrentMinute] = useState(1);
  const [isLoggingSet, setIsLoggingSet] = useState(false);
  useLoggingReset(isLoggingSet, setIsLoggingSet);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [isWeightPristine, setIsWeightPristine] = useState(true);

  const exerciseId = currentExercise?.exercise_id ?? "";
  const sessionStickyWeight = exerciseId
    ? (lastPerformedWeightByExerciseId[exerciseId] ?? null)
    : null;
  const lastSessionWeight = exerciseId
    ? (lastSessionWeightByExerciseId[exerciseId] ?? null)
    : null;
  const loadPercentage = currentExercise?.load_percentage ?? null;
  const e1rm = exerciseId ? (e1rmMap[exerciseId] ?? null) : null;
  const { default_weight, suggested_weight } =
    getWeightDefaultAndSuggestion({
      sessionStickyWeight: sessionStickyWeight ?? null,
      lastSessionWeight: lastSessionWeight ?? null,
      loadPercentage,
      e1rm: e1rm ?? null,
    });

  useEffect(() => {
    setIsWeightPristine(true);
  }, [currentExerciseIndex, exerciseId]);

  useEffect(() => {
    if (isViewingLoggedSet) return;
    if (!isWeightPristine) return;
    if (default_weight != null && default_weight > 0) {
      setWeight(String(default_weight));
    } else {
      setWeight("");
    }
  }, [
    isViewingLoggedSet,
    isWeightPristine,
    default_weight,
    currentExerciseIndex,
    exerciseId,
  ]);

  useEffect(() => {
    if (isViewingLoggedSet) return;
    if (emomMode === "target_reps" && targetRepsParsed.numericDefault > 0) {
      setReps(String(targetRepsParsed.numericDefault));
    } else if (emomMode !== "target_reps") {
      setReps("");
    }
  }, [
    isViewingLoggedSet,
    emomMode,
    targetRepsParsed.numericDefault,
    currentExerciseIndex,
    exerciseId,
  ]);

  // Timer logic - countdown each minute
  useEffect(() => {
    if (isActive && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            // Minute complete, advance to next minute
            if (currentMinute < durationMinutes) {
              setCurrentMinute((prev) => prev + 1);
              return 60;
            } else {
              // All minutes complete
              setIsActive(false);
              return 0;
            }
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
  }, [isActive, timeRemaining, currentMinute, durationMinutes]);

  // Manual start handler
  const handleStart = () => {
    setIsActive(true);
    setTimeRemaining(60);
    setCurrentMinute(1);
  };

  const instructions =
    currentExercise?.notes || liveSetEntry.setEntry.set_notes || undefined;

  const activeTargets = resolveSetPrescriptionTargets(
    currentExercise,
    currentMinute,
    liveSetEntry.setEntry.reps_per_set,
  );
  const activeEffort = effortFromPrescribedRpe(activeTargets.rpe);
  const liveTarget: LiveCardTarget =
    activeTargets.weight_kg != null
      ? {
          kind: "reps_weight",
          reps:
            activeTargets.reps ??
            (targetReps != null ? String(targetReps) : "—"),
          weight: activeTargets.weight_kg,
        }
      : {
          kind: "reps_only",
          reps:
            activeTargets.reps ??
            (targetReps != null ? String(targetReps) : "—"),
          unit: "reps",
        };


  const handleEditSet = (setEntry: LoggedSet) => {
    setEditingSetId(setEntry.id);
    setEditDraft({
      weight: String(setEntry.weight_kg ?? ""),
      reps: String(setEntry.reps_completed ?? ""),
      set_number: setEntry.set_number ?? undefined,
    });
    setMenuOpenSetId(null);
  };

  const handleSaveEdit = async () => {
    if (!editingSetId || !editDraft) return;
    if (editingSetId.startsWith("temp-")) {
      if (process.env.NODE_ENV !== "production") {
        console.log("[SAVE EDITS guard]", {
          executor: "EmomExecutor",
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
    const entry = loggedSetsList.find((s) => s.id === editingSetId);
    const minuteNum =
      entry?.set_number ?? editDraft.set_number ?? viewingSetIndex;
    setIsSavingEdit(true);
    try {
      const payload = buildSetEditPatchPayload(liveSetEntry.setEntry.set_type, {
        exercise_id: currentExercise?.exercise_id ?? undefined,
        weight: !isNaN(weightNum) && weightNum >= 0 ? weightNum : undefined,
        emom_minute_number: minuteNum,
        emom_total_reps_this_min: repsNum,
      });
      if (process.env.NODE_ENV !== "production") {
        console.log("[SAVE EDITS]", {
          executor: "EmomExecutor",
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
        addToast({
          title: "Minute updated",
          variant: "success",
          duration: 2000,
        });
      } else {
        addToast({
          title: "Failed to update",
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
    if (!currentExercise || isLoggingSet) return;

    const weightNum = parseWeightKgInput(weight);
    const repsNum = parseInt(reps);

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
      // Calculate duration used for this minute (60 - timeRemaining)
      const durationUsedThisMin = 60 - timeRemaining;

      const logData: any = {
        set_type: "emom",
        emom_minute_number: currentMinute,
        emom_mode: emomMode,
        emom_reps_per_round: emomMode === "target_reps" ? targetReps : null,
        isLastSet: currentMinute >= durationMinutes,
      };

      // Only add fields if they're defined
      if (currentExercise?.exercise_id)
        logData.exercise_id = currentExercise.exercise_id;
      if (repsNum !== undefined && repsNum !== null && !isNaN(repsNum))
        logData.emom_total_reps_this_min = repsNum;
      if (durationUsedThisMin !== undefined && durationUsedThisMin !== null)
        logData.emom_total_duration_sec = durationUsedThisMin;
      if (!isNaN(weightNum) && weightNum > 0) logData.weight = weightNum;

      const result = await logSetToDatabase(logData);

      if (result.success) {
        if (result.e1rm && onE1rmUpdate) {
          onE1rmUpdate(currentExercise.exercise_id, result.e1rm);
        }

        setReps(
          emomMode === "target_reps" && targetRepsParsed.numericDefault > 0
            ? String(targetRepsParsed.numericDefault)
            : "",
        );

        const newLoggedSet: LoggedSet = {
          id:
            (result as { set_log_id?: string }).set_log_id ??
            `temp-${Date.now()}`,
          exercise_id: currentExercise.exercise_id,
          set_entry_id: liveSetEntry.setEntry.id,
          set_number: currentMinute,
          weight_kg: weightNum,
          reps_completed: repsNum,
          completed_at: new Date(),
        } as LoggedSet;
        onSetLogUpsert?.(liveSetEntry.setEntry.id, newLoggedSet);

        addToast({
          title: "EMOM Work Logged!",
          description: `${weightNum}kg × ${repsNum} reps (Minute ${currentMinute})`,
          variant: "success",
          duration: 2000,
        });

        if (currentMinute >= durationMinutes) {
          onSetEntryComplete(liveSetEntry.setEntry.id, []);
        }
      } else {
        addToast({
          title: "Failed to Save",
          description: "Failed to save work. Please try again.",
          variant: "destructive",
          duration: 5000,
        });
      }
    } finally {
      setIsLoggingSet(false);
    }
  };

  const displayMinute =
    editingSetId && editDraft?.set_number != null
      ? editDraft.set_number
      : viewingSetIndex >= 1
        ? viewingSetIndex
        : currentMinute;

  const updateSetRpe = useUpdateSetRpe({
    setEntryId: liveSetEntry.setEntry.id,
    onSetLogUpsert,
  });
  const loggedSetRows: LoggedSetRow[] = loggedSetsList.map((setEntry) => ({
    id: setEntry.id,
    title: `Min ${setEntry.set_number}: ${
      setEntry.weight_kg != null && setEntry.weight_kg > 0
        ? `${setEntry.weight_kg} kg × `
        : ""
    }${setEntry.reps_completed ?? "—"} reps`,
    rpe: setEntry.rpe ?? null,
    onEffortChange: (rpe) => updateSetRpe(setEntry, rpe),
    disabled: setEntry.id.startsWith("temp-"),
    menu: allowSetEditDelete ? (
      <div className="relative flex items-center">
        <button
          type="button"
          className="grid h-6 w-6 place-items-center rounded-md text-[color:var(--fc-text-dim)] hover:bg-white/5 hover:text-[color:var(--fc-text-primary)]"
          onClick={() =>
            setMenuOpenSetId(menuOpenSetId === setEntry.id ? null : setEntry.id)
          }
          aria-label="Options"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {menuOpenSetId === setEntry.id && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpenSetId(null)}
              aria-hidden
            />
            <div
              className="absolute right-0 top-full z-20 mt-1 min-w-[120px] rounded-lg py-1 shadow-lg"
              style={{
                background: "var(--fc-surface-elevated)",
                border: "1px solid var(--fc-surface-card-border)",
              }}
            >
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:opacity-80"
                onClick={() => handleEditSet(setEntry)}
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            </div>
          </>
        )}
      </div>
    ) : null,
  }));
  const aboveStickyContent =
    loggedSetRows.length > 0 ? (
      <LoggedSetsList rows={loggedSetRows} />
    ) : null;

  const handleCompleteBlock = () => {
    const loggedSetsArray: LoggedSet[] = [];
    onSetEntryComplete(liveSetEntry.setEntry.id, loggedSetsArray);
  };

  const emomWeightNum = parseWeightKgInput(weight);
  const emomRepsNum = parseInt(reps, 10);
  const emomLogWorkReady =
    isActive &&
    !isLoggingSet &&
    weight.trim() !== "" &&
    !isNaN(emomWeightNum) &&
    emomWeightNum >= 0 &&
    reps.trim() !== "" &&
    !isNaN(emomRepsNum) &&
    emomRepsNum > 0;

  const isEditMode = !!editingSetId && !!editDraft;
  const viewedSetEntry =
    viewingSetIndex >= 1
      ? (loggedSetsList.find((s) => s.set_number === viewingSetIndex) ??
        loggedSetsList[viewingSetIndex - 1])
      : null;

  const fmt = formatTimeProp ?? formatTime;
  const chrome = useWorkoutExecutionChrome();
  const hideCompactBack = chrome?.hideCompactBack ?? false;
  const totalSetEntries = allSetEntries.length || 1;
  const canGoPrevious = currentSetEntryIndex > 0;
  const canGoNext = currentSetEntryIndex < totalSetEntries - 1;
  const previousPerf =
    exerciseId && previousPerformanceMap
      ? (previousPerformanceMap.get(exerciseId) ?? null)
      : null;

  const nudgeWeight = (delta: number) => {
    const cur = parseWeightKgInput(weight || "0");
    const next = Math.max(0, (isNaN(cur) ? 0 : cur) + delta);
    setIsWeightPristine(false);
    setWeight(String(Math.round(next * 2) / 2));
  };
  const nudgeReps = (delta: number) => {
    const cur = parseInt(reps || "0", 10);
    const next = Math.max(0, (isNaN(cur) ? 0 : cur) + delta);
    setReps(String(next));
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
            heading={`Minute ${displayMinute} of ${durationMinutes}`}
            status={
              loggedSetsList.length >= durationMinutes ? "complete" : "logging"
            }
          >
            <div>
              <LiveCardExerciseName
                name={currentExercise?.exercise?.name || "Exercise"}
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
            <LiveCardPrimary
              target={liveTarget}
              effort={activeEffort}
              loadPct={loadPercentage}
            />
            {instructions ? (
              <LiveCardNote>{instructions}</LiveCardNote>
            ) : null}
            <LiveCardLog>
              <div className="flex flex-col gap-3">
                {!isActive && currentMinute === 1 && timeRemaining === 60 ? (
                  <Button
                    onClick={handleStart}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start EMOM
                  </Button>
                ) : null}

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
                  label="Reps"
                  value={editDraft ? editDraft.reps : reps}
                  onChange={(val) => {
                    if (editDraft)
                      setEditDraft((d) => (d ? { ...d, reps: val } : null));
                    else setReps(val);
                  }}
                  onIncrement={() => nudgeReps(1)}
                  onDecrement={() => nudgeReps(-1)}
                />
                <LiveCardLogButton
                  disabled={isEditMode ? isSavingEdit : !emomLogWorkReady}
                  onClick={() => {
                    if (isEditMode) void handleSaveEdit();
                    else void handleLog();
                  }}
                />
                {isEditMode ? (
                  <Button variant="outline" onClick={handleCancelEdit}>
                    Cancel edit
                  </Button>
                ) : viewedSetEntry && allowSetEditDelete ? (
                  <Button
                    onClick={() => handleEditSet(viewedSetEntry)}
                    variant="outline"
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit this minute
                  </Button>
                ) : null}
                <Button
                  onClick={handleCompleteBlock}
                  variant="fc-primary"
                  className="w-full h-12 text-base font-bold uppercase tracking-wider rounded-xl"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Finish EMOM
                </Button>
              </div>
            </LiveCardLog>
            <LiveCardGlue timer={fmt(timeRemaining)}>
              ↻ &nbsp;next minute
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
