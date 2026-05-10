"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  RotateCcw,
  Clock,
  Target,
  Flame,
  Pencil,
} from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import {
  BaseBlockExecutorLayout,
  formatTime,
} from "../BaseBlockExecutor";
import { LargeInput } from "../ui/LargeInput";
import logPairStyles from "../ui/logWeightRepsPair.module.css";
import { BaseBlockExecutorProps } from "../types";
import { LoggedSet } from "@/types/workoutBlocks";
import { LoggedSetsList, type LoggedSetRow } from "../ui/LoggedSetsList";
import { useUpdateSetRpe } from "../hooks/useUpdateSetRpe";
import { appendTargetEffortItem } from "../appendTargetEffortItem";
import { useLoggingReset } from "../hooks/useLoggingReset";
import { getWeightDefaultAndSuggestion } from "@/lib/weightDefaultService";
import { fetchApi } from "@/lib/apiClient";
import { buildSetEditPatchPayload } from "@/lib/setEditPayload";
import { parseWeightKgInput } from "@/lib/parseWeightKgInput";
import type {
  PrescriptionItem,
  PrescriptionItemTone,
} from "../ui/PrescriptionCard";
import { LogSetButton } from "../ui/LogSetButton";
import { parseRepsTarget } from "@/lib/workout/parseRepsTarget";

export function AmrapExecutor({
  block,
  onBlockComplete,
  onNextBlock,
  e1rmMap = {},
  onE1rmUpdate,
  lastPerformedWeightByExerciseId = {},
  lastSessionWeightByExerciseId = {},
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
  onWorkoutBack,
  previousPerformanceMap,
  progressionSuggestion,
  allowSetEditDelete = false,
  registerSetLogIdResolved,
  onSetLogUpsert,
  onSetEditSaved,
  loggedSets,
}: BaseBlockExecutorProps) {
  const { addToast } = useToast();
  const currentExercise = block.block.exercises?.[currentExerciseIndex];
  const totalSets = 1;
  const completedSets = block.completedSets ?? 0;

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
      onSetLogUpsert?.(block.block.id, newEntry, { replaceId: oldEntry.id });
    });
    return () => {};
  }, [registerSetLogIdResolved, onSetLogUpsert, block.block.id]);
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
    block.block.time_protocols?.find(
      (tp: any) =>
        tp.protocol_type === "amrap" &&
        (tp.exercise_id === currentExercise?.exercise_id ||
          !currentExercise?.exercise_id),
    ) || block.block.time_protocols?.[0];

  const durationSeconds = timeProtocol?.total_duration_minutes
    ? timeProtocol.total_duration_minutes * 60
    : block.block.duration_seconds || 600;
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

  const durationMinutesDisplay = Math.floor(durationSeconds / 60);
  const prescriptionItems: PrescriptionItem[] = [
    {
      icon: Clock,
      label: "Duration",
      value: durationMinutesDisplay,
      unit: "min",
    },
  ];

  if (
    targetReps != null &&
    (typeof targetReps !== "string" || targetReps !== "")
  ) {
    prescriptionItems.push({
      icon: Target,
      label: "Target reps",
      value: targetReps,
    });
  }

  appendTargetEffortItem(
    prescriptionItems,
    currentExercise ? (currentExercise as { rir?: unknown }).rir : undefined,
    Flame,
  );

  const instructions =
    currentExercise?.notes || block.block.set_notes || undefined;

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
          blockTypeFromUI: block.block.set_type,
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
      const payload = buildSetEditPatchPayload(block.block.set_type, {
        exercise_id: currentExercise?.exercise_id ?? undefined,
        weight: !isNaN(weightNum) && weightNum >= 0 ? weightNum : undefined,
        amrap_total_reps: repsNum,
      });
      if (process.env.NODE_ENV !== "production") {
        console.log("[SAVE EDITS]", {
          executor: "AmrapExecutor",
          setId: editingSetId,
          blockTypeFromUI: block.block.set_type,
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
          set_entry_id: block.block.id,
          set_number: current?.set_number ?? 1,
          weight_kg: weightNum,
          reps_completed: repsNum,
          completed_at: current?.completed_at ?? new Date(),
        };
        onSetEditSaved?.(block.block.id, updatedEntry);
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
          set_entry_id: block.block.id,
          set_number: 1,
          weight_kg: weightNum,
          reps_completed: repsNum,
          completed_at: new Date(),
        } as LoggedSet;
        onSetLogUpsert?.(block.block.id, newEntry);

        if (result.e1rm && onE1rmUpdate) {
          onE1rmUpdate(currentExercise.exercise_id, result.e1rm);
        }

        addToast({
          title: "AMRAP Set Logged!",
          description: `${weightNum}kg × ${repsNum} total reps`,
          variant: "success",
          duration: 2000,
        });

        onBlockComplete(block.block.id, [...loggedSetsList, newEntry]);
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
    blockId: block.block.id,
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

  const loggingInputs = (
    <div className="space-y-4">
      {/* Inline Timer */}
      <div
        className="rounded-xl p-5 text-center"
        style={
          timerHasEnded
            ? {
                background:
                  "color-mix(in srgb, var(--fc-status-success) 8%, var(--fc-surface-card))",
                border:
                  "2px solid color-mix(in srgb, var(--fc-status-success) 25%, transparent)",
              }
            : {
                background:
                  "color-mix(in srgb, var(--fc-accent-cyan) 8%, var(--fc-surface-card))",
                border:
                  "2px solid color-mix(in srgb, var(--fc-accent-cyan) 25%, transparent)",
              }
        }
      >
        <div
          className="text-5xl font-bold mb-3"
          style={{
            color: timerHasEnded
              ? "var(--fc-status-success)"
              : "var(--fc-accent-cyan)",
          }}
        >
          {formatTime(timeRemaining)}
        </div>
        {timerHasEnded && (
          <div
            className="text-lg font-semibold mb-3"
            style={{ color: "var(--fc-status-success)" }}
          >
            ⏱️ Time's Up!
          </div>
        )}
        <div className="flex items-center justify-center gap-3 mb-2">
          {!isActive && timeRemaining === durationSeconds && (
            <Button
              onClick={handleStartTimer}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Timer
            </Button>
          )}
          {isActive && !timerHasEnded && (
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
          )}
        </div>
      </div>

      {/* Weight and Reps Input */}
      <div
        className="p-4 rounded-xl"
        style={{ background: "var(--fc-surface-sunken)" }}
      >
        <div className={`${logPairStyles.pair} ${logPairStyles.pairGapLg}`}>
          <div className="space-y-2">
            <LargeInput
              label="Weight"
              value={weight}
              onChange={(val) => {
                setIsWeightPristine(false);
                setWeight(val);
              }}
              placeholder="0"
              step="0.5"
              unit="kg"
              showStepper
              stepAmount={2.5}
              />
            {suggested_weight != null && suggested_weight > 0 && (
              <button
                type="button"
                onClick={() => {
                  setWeight(String(suggested_weight));
                  setIsWeightPristine(false);
                }}
                className="text-xs font-medium hover:underline"
                style={{ color: "var(--fc-accent-cyan)" }}
              >
                {loadPercentage != null
                  ? `${loadPercentage}% → ${suggested_weight} kg`
                  : `Suggested: ${suggested_weight} kg`}{" "}
                (tap to apply)
              </button>
            )}
          </div>
          <LargeInput
            label="Total Reps"
            hint={targetRepsParsed.displayHint ?? undefined}
            value={reps}
            onChange={(v) => {
              setIsWeightPristine(false);
              setReps(v);
            }}
            placeholder="0"
            step="1"
            showStepper
            stepAmount={1}
          />
        </div>
      </div>
    </div>
  );

  // Validate inputs for button state
  // Check if inputs are valid numbers AND greater than 0
  // Be very explicit about what constitutes valid input
  const weightStr = String(weight || "").trim();
  const repsStr = String(reps || "").trim();

  // Parse the values
  const weightNum = weightStr ? parseWeightKgInput(weightStr) : NaN;
  const repsNum = repsStr ? parseInt(repsStr, 10) : NaN;

  // Both must be valid numbers AND greater than 0
  const isValidInput =
    weightStr !== "" &&
    repsStr !== "" &&
    !isNaN(weightNum) &&
    !isNaN(repsNum) &&
    isFinite(weightNum) &&
    isFinite(repsNum) &&
    weightNum > 0 &&
    repsNum > 0;

  // Check if exercise ID exists
  const hasExerciseId = !!currentExercise?.exercise_id;

  // Determine if button should be disabled
  const logReadyAmrap = isValidInput && hasExerciseId && !isLoggingSet;

  const isEditMode = !!editingSetId && !!editDraft;
  const logButton = (
    <div className="space-y-2">
      {allowSetEditDelete && isEditMode ? (
        <div className="flex gap-2 w-full">
          <Button
            variant="outline"
            onClick={handleCancelEdit}
            className="flex-1 h-12 text-base font-semibold rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveEdit}
            disabled={
              isSavingEdit ||
              !editDraft ||
              editDraft.reps.trim() === "" ||
              isNaN(parseInt(editDraft.reps, 10)) ||
              parseInt(editDraft.reps, 10) <= 0
            }
            variant="fc-primary"
            className="flex-1 h-12 text-base font-bold uppercase tracking-wider rounded-xl"
          >
            {isSavingEdit ? "Saving…" : "Save edits"}
          </Button>
        </div>
      ) : (
        <LogSetButton
          onClick={handleLogSet}
          ready={logReadyAmrap}
          loading={isLoggingSet}
          label="Log set"
        />
      )}
    </div>
  );

  return (
    <BaseBlockExecutorLayout
      {...{
        block,
        onBlockComplete,
        onNextBlock,
        e1rmMap,
        onE1rmUpdate,
        sessionId,
        assignmentId,
        allBlocks,
        currentBlockIndex,
        onBlockChange,
        currentExerciseIndex,
        onExerciseIndexChange,
        logSetToDatabase,
        formatTime: formatTimeProp,
        calculateSuggestedWeight,
        onVideoClick,
        onAlternativesClick,
              onRestTimerClick,
        onWorkoutBack,
        previousPerformanceMap,
      }}
      exerciseName={currentExercise?.exercise?.name || "Exercise"}
      prescriptionItems={prescriptionItems}
      instructions={instructions}
      currentSet={1}
      totalSets={1}
      progressLabel="Set"
      loggingInputs={loggingInputs}
      logButton={logButton}
      showNavigation={true}
      currentExercise={currentExercise}
      showRestTimer={false}
      progressionSuggestion={progressionSuggestion}
      aboveStickyContent={aboveStickyContent}
    />
  );
}
