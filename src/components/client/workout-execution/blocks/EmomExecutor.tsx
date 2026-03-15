"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Timer as TimerIcon,
  CheckCircle,
  Play,
  MoreVertical,
  Pencil,
} from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import {
  BaseBlockExecutorLayout,
  formatLoadPercentage,
  calculateSuggestedWeightUtil,
  formatTime,
} from "../BaseBlockExecutor";
import { LargeInput } from "../ui/LargeInput";
import { BlockDetail, BaseBlockExecutorProps } from "../types";
import { LoggedSet } from "@/types/workoutBlocks";
import { InlineRPERow } from "../ui/InlineRPERow";
import { useLoggingReset } from "../hooks/useLoggingReset";
import { getWeightDefaultAndSuggestion } from "@/lib/weightDefaultService";
import { fetchApi } from "@/lib/apiClient";
import { buildSetEditPatchPayload } from "@/lib/setEditPayload";

export function EmomExecutor({
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
  onPlateCalculatorClick,
  onRestTimerClick,
  previousPerformanceMap,
  allowSetEditDelete = false,
  registerSetLogIdResolved,
  onSetLogUpsert,
  onSetEditSaved,
  loggedSets,
}: BaseBlockExecutorProps) {
  const { addToast } = useToast();
  const currentExercise = block.block.exercises?.[currentExerciseIndex];

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

  // Read from special table (time_protocols)
  const timeProtocol =
    block.block.time_protocols?.find(
      (tp: any) =>
        tp.protocol_type === "emom" &&
        (tp.exercise_id === currentExercise?.exercise_id ||
          !currentExercise?.exercise_id),
    ) || block.block.time_protocols?.[0];

  const durationMinutes =
    timeProtocol?.total_duration_minutes ||
    (block.block.duration_seconds || 600) / 60; // Default 10 minutes
  const emomMode = timeProtocol?.emom_mode || "target_reps";
  const targetReps = timeProtocol?.target_reps || timeProtocol?.reps_per_round;
  const workSeconds = timeProtocol?.work_seconds;

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
  const { default_weight, suggested_weight, source } =
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

  // Block details
  const blockDetails: BlockDetail[] = [
    {
      label: "DURATION",
      value: `${durationMinutes} minutes`,
    },
    {
      label: "MODE",
      value: emomMode === "target_reps" ? "Target Reps" : "Time Based",
    },
  ];

  if (emomMode === "target_reps" && targetReps) {
    blockDetails.push({
      label: "REPS/MINUTE",
      value: targetReps,
    });
  }

  if (emomMode === "time_based" && workSeconds) {
    blockDetails.push({
      label: "WORK",
      value: `${workSeconds}s`,
    });
  }

  if (currentExercise?.load_percentage != null) {
    const suggestedForDisplay =
      source === "percent_e1rm" ? suggested_weight : null;
    const loadDisplay = formatLoadPercentage(
      currentExercise.load_percentage,
      suggestedForDisplay,
    );
    if (loadDisplay) {
      blockDetails.push({
        label: "LOAD",
        value: loadDisplay,
      });
    }
  }

  const instructions =
    currentExercise?.notes || block.block.set_notes || undefined;

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
    const weightNum = parseFloat(editDraft.weight);
    const repsNum = parseInt(editDraft.reps, 10);
    if (isNaN(repsNum) || repsNum <= 0) return;
    const entry = loggedSetsList.find((s) => s.id === editingSetId);
    const minuteNum =
      entry?.set_number ?? editDraft.set_number ?? viewingSetIndex;
    setIsSavingEdit(true);
    try {
      const payload = buildSetEditPatchPayload(block.block.set_type, {
        exercise_id: currentExercise?.exercise_id ?? undefined,
        weight: !isNaN(weightNum) && weightNum >= 0 ? weightNum : undefined,
        emom_minute_number: minuteNum,
        emom_total_reps_this_min: repsNum,
      });
      if (process.env.NODE_ENV !== "production") {
        console.log("[SAVE EDITS]", {
          executor: "EmomExecutor",
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

    const weightNum = parseFloat(weight);
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

        setReps("");

        const newLoggedSet: LoggedSet = {
          id:
            (result as { set_log_id?: string }).set_log_id ??
            `temp-${Date.now()}`,
          exercise_id: currentExercise.exercise_id,
          set_entry_id: block.block.id,
          set_number: currentMinute,
          weight_kg: weightNum,
          reps_completed: repsNum,
          completed_at: new Date(),
        } as LoggedSet;
        onSetLogUpsert?.(block.block.id, newLoggedSet);

        addToast({
          title: "EMOM Work Logged!",
          description: `${weightNum}kg × ${repsNum} reps (Minute ${currentMinute})`,
          variant: "success",
          duration: 2000,
        });

        if (currentMinute >= durationMinutes) {
          onBlockComplete(block.block.id, []);
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

  const loggingInputs = (
    <div className="space-y-4">
      {allowSetEditDelete && loggedSetsList.length > 0 && (
        <div
          className="rounded-xl border p-3"
          style={{
            borderColor: "var(--fc-surface-card-border)",
            background: "var(--fc-surface-sunken)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold fc-text-dim uppercase tracking-wider">
              Logged
            </div>
            {loggedSetsList.length > 2 && (
              <button
                type="button"
                onClick={() => setShowAllSets(!showAllSets)}
                className="text-xs font-medium fc-text-dim hover:fc-text-primary transition-colors"
              >
                {showAllSets ? (
                  <>Show less ▲</>
                ) : (
                  <>Show all {loggedSetsList.length} sets ▼</>
                )}
              </button>
            )}
          </div>
          <ul className="space-y-1.5">
            {(showAllSets ? loggedSetsList : loggedSetsList.slice(-2)).map((setEntry, index) => {
              // Calculate the actual index in the full list for isLatestSet
              const actualIndex = showAllSets ? index : loggedSetsList.length - 2 + index;
              const isLatestSet = actualIndex === loggedSetsList.length - 1;
              return (
              <li
                key={setEntry.id}
                className="flex flex-col gap-1.5 py-1.5 px-2 rounded-lg"
                style={{ background: "var(--fc-surface-elevated)" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm fc-text-primary">
                    Min {setEntry.set_number}:{" "}
                    {setEntry.weight_kg != null && setEntry.weight_kg > 0
                      ? `${setEntry.weight_kg} kg × `
                      : ""}
                    {setEntry.reps_completed ?? "—"} reps
                  </span>
                  <div className="relative flex items-center">
                    <button
                      type="button"
                      className="p-1.5 rounded-md hover:bg-black/10"
                      onClick={() =>
                        setMenuOpenSetId(
                          menuOpenSetId === setEntry.id ? null : setEntry.id,
                        )
                      }
                      aria-label="Options"
                    >
                      <MoreVertical className="w-4 h-4 fc-text-dim" />
                    </button>
                    {menuOpenSetId === setEntry.id && (
                      <div
                        className="absolute right-0 top-full mt-1 py-1 rounded-lg shadow-lg z-10 min-w-[120px]"
                        style={{
                          background: "var(--fc-surface-elevated)",
                          border: "1px solid var(--fc-surface-card-border)",
                        }}
                      >
                        <button
                          type="button"
                          className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-black/10"
                          onClick={() => handleEditSet(setEntry)}
                        >
                          <Pencil className="w-4 h-4" /> Edit
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <InlineRPERow
                  setLogId={setEntry.id.startsWith("temp-") ? null : setEntry.id}
                  currentRPE={setEntry.rpe ?? null}
                  onRPESelect={async (rpe) => {
                    const updatedEntry: LoggedSet = {
                      ...setEntry,
                      rpe,
                    };
                    onSetLogUpsert?.(block.block.id, updatedEntry, {
                      replaceId: setEntry.id,
                    });

                    if (!setEntry.id.startsWith("temp-")) {
                      try {
                        const res = await fetch(`/api/sets/${setEntry.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ rpe }),
                          credentials: "include",
                        });
                        if (!res.ok) {
                          console.error("Failed to update RPE:", await res.text());
                          const revertedEntry: LoggedSet = {
                            ...setEntry,
                            rpe: setEntry.rpe ?? undefined,
                          };
                          onSetLogUpsert?.(block.block.id, revertedEntry, {
                            replaceId: setEntry.id,
                          });
                        }
                      } catch (err) {
                        console.error("Error updating RPE:", err);
                        const revertedEntry: LoggedSet = {
                          ...setEntry,
                          rpe: setEntry.rpe ?? undefined,
                        };
                        onSetLogUpsert?.(block.block.id, revertedEntry, {
                          replaceId: setEntry.id,
                        });
                      }
                    }
                  }}
                  isLatestSet={isLatestSet}
                />
              </li>
              );
            })}
          </ul>
        </div>
      )}
      {/* Minute Counter */}
      <div
        className="rounded-xl p-5 text-center"
        style={{
          background:
            "color-mix(in srgb, var(--fc-accent-cyan) 8%, var(--fc-surface-card))",
          border:
            "2px solid color-mix(in srgb, var(--fc-accent-cyan) 25%, transparent)",
        }}
      >
        <div
          className="text-2xl font-semibold mb-2"
          style={{ color: "var(--fc-accent-cyan)" }}
        >
          Minute {currentMinute} of {durationMinutes}
        </div>
        <div
          className="text-4xl font-bold mb-2"
          style={{ color: "var(--fc-accent-cyan)" }}
        >
          {formatTime(timeRemaining)}
        </div>
        <div className="text-sm fc-text-dim mb-4">
          {isActive
            ? "Work Time"
            : isActive === false && currentMinute === 1 && timeRemaining === 60
              ? "Ready to Start"
              : "Complete"}
        </div>
        {!isActive && currentMinute === 1 && timeRemaining === 60 && (
          <Button
            onClick={handleStart}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Play className="w-4 h-4 mr-2" />
            Start EMOM
          </Button>
        )}
      </div>

      {/* Weight and Reps Input */}
      <div
        className="p-4 rounded-xl"
        style={{ background: "var(--fc-surface-sunken)" }}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <LargeInput
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
                {currentExercise?.load_percentage != null
                  ? `${currentExercise.load_percentage}% → ${suggested_weight} kg`
                  : `Suggested: ${suggested_weight} kg`}{" "}
                (tap to apply)
              </button>
            )}
          </div>
          <LargeInput
            label="Reps Completed"
            value={editDraft ? editDraft.reps : reps}
            onChange={(val) => {
              if (editDraft)
                setEditDraft((d) => (d ? { ...d, reps: val } : null));
              else setReps(val);
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

  const handleCompleteBlock = () => {
    const loggedSetsArray: LoggedSet[] = [];
    onBlockComplete(block.block.id, loggedSetsArray);
  };

  const isEditMode = !!editingSetId && !!editDraft;
  const viewedSetEntry =
    viewingSetIndex >= 1
      ? (loggedSetsList.find((s) => s.set_number === viewingSetIndex) ??
        loggedSetsList[viewingSetIndex - 1])
      : null;
  const logButton = (
    <div className="space-y-3">
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
      ) : allowSetEditDelete && viewedSetEntry ? (
        <Button
          onClick={() => handleEditSet(viewedSetEntry)}
          variant="fc-primary"
          className="w-full h-12 text-base font-bold uppercase tracking-wider rounded-xl"
        >
          <Pencil className="w-5 h-5 mr-2" />
          Edit this minute
        </Button>
      ) : (
        <>
          <Button
            onClick={handleLog}
            disabled={isLoggingSet || !isActive}
            variant="fc-primary"
            className="w-full h-12 text-base font-bold uppercase tracking-wider rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            {isLoggingSet ? "Logging..." : "LOG WORK"}
          </Button>
          <Button
            onClick={handleCompleteBlock}
            variant="fc-primary"
            className="w-full h-12 text-base font-bold uppercase tracking-wider rounded-xl"
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            Complete Block
          </Button>
        </>
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
        onPlateCalculatorClick,
        onRestTimerClick,
        previousPerformanceMap,
      }}
      exerciseName={currentExercise?.exercise?.name || "Exercise"}
      blockDetails={blockDetails}
      instructions={instructions}
      currentSet={displayMinute}
      totalSets={durationMinutes}
      progressLabel="Minute"
      loggingInputs={loggingInputs}
      logButton={logButton}
      showNavigation={true}
      currentExercise={currentExercise}
      showRestTimer={false}
    />
  );
}
