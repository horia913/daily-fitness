"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Activity,
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
import { supabase } from "@/lib/supabase";
import { useLoggingReset } from "../hooks/useLoggingReset";
import { getWeightDefaultAndSuggestion } from "@/lib/weightDefaultService";
import { fetchApi } from "@/lib/apiClient";
import { buildSetEditPatchPayload } from "@/lib/setEditPayload";

export function ForTimeExecutor({
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

  // DEBUG: Log data structure at component initialization
  const exercises = block.block.exercises || [];
  const effectiveIndex =
    exercises.length > 0
      ? Math.min(currentExerciseIndex, exercises.length - 1)
      : 0;
  const currentExercise = exercises[effectiveIndex];

  console.log("ForTimeExecutor DEBUG:", {
    blockId: block?.block?.id,
    blockType: block?.block?.set_type,
    currentExercise: currentExercise,
    currentExerciseKeys: currentExercise
      ? Object.keys(currentExercise)
      : "null",
    exercises: exercises,
    exercisesLength: exercises?.length || 0,
    exercisesData: exercises?.map((ex) => ({
      id: ex.id,
      exercise_id: ex.exercise_id,
      name: (ex as any).name || ex.exercise?.name,
      keys: Object.keys(ex),
    })),
    allBlockData: block,
  });

  const { addToast } = useToast();

  // Read from special table (time_protocols)
  const timeProtocol =
    block.block.time_protocols?.find(
      (tp: any) =>
        tp.protocol_type === "for_time" &&
        (tp.exercise_id === currentExercise?.exercise_id ||
          !currentExercise?.exercise_id),
    ) || block.block.time_protocols?.[0];

  const timeCapMinutes = timeProtocol?.time_cap_minutes || 15;
  const targetReps = timeProtocol?.target_reps;

  // Debug logging for exercise data
  useEffect(() => {
    console.log("ForTimeExecutor exercise data:", {
      exercisesCount: exercises.length,
      currentExerciseIndex,
      effectiveIndex,
      currentExercise: currentExercise
        ? {
            id: currentExercise.id,
            exercise_id: currentExercise.exercise_id,
            hasExerciseId: !!currentExercise.exercise_id,
          }
        : null,
      allExercises: exercises.map((ex) => ({
        id: ex.id,
        exercise_id: ex.exercise_id,
      })),
    });
  }, [exercises, currentExerciseIndex, currentExercise]);

  // Get exercise name - try multiple sources
  const [exerciseNameState, setExerciseNameState] =
    useState<string>("For Time");

  useEffect(() => {
    const loadExerciseName = async () => {
      // If no exercises, use block name or "For Time"
      if (exercises.length === 0) {
        if (block.block.set_name) {
          setExerciseNameState(block.block.set_name);
        } else {
          setExerciseNameState("For Time");
        }
        return;
      }

      if (exercises.length > 1) {
        setExerciseNameState("For Time");
        return;
      }

      // Try exercise relation first
      if (currentExercise?.exercise?.name) {
        setExerciseNameState(currentExercise.exercise.name);
        return;
      }

      // Try block name
      if (block.block.set_name) {
        setExerciseNameState(block.block.set_name);
        return;
      }

      // Fetch exercise name from database if we have exercise_id
      // Try current exercise first, then any exercise in the block
      const exerciseIdToFetch =
        currentExercise?.exercise_id ||
        exercises.find((ex) => ex.exercise_id)?.exercise_id;

      if (exerciseIdToFetch) {
        try {
          const { data: exerciseData } = await supabase
            .from("exercises")
            .select("name")
            .eq("id", exerciseIdToFetch)
            .single();

          if (exerciseData?.name) {
            setExerciseNameState(exerciseData.name);
            return;
          }
        } catch (error) {
          console.error("Error fetching exercise name:", error);
        }
      }

      // Final fallback
      setExerciseNameState("For Time");
    };

    loadExerciseName();
  }, [currentExercise, exercises, block.block.set_name]);

  const exerciseName = exerciseNameState;

  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [isLoggingSet, setIsLoggingSet] = useState(false);
  useLoggingReset(isLoggingSet, setIsLoggingSet);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerStopped, setTimerStopped] = useState(false);
  const [completionTime, setCompletionTime] = useState<number | null>(null);
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
  const { default_weight, suggested_weight, source } =
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
  }, [
    isViewingLoggedSet,
    isWeightPristine,
    default_weight,
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

  // Block details
  const blockDetails: BlockDetail[] = [
    {
      label: "TIME CAP",
      value: `${timeCapMinutes} minutes`,
    },
  ];

  if (targetReps) {
    blockDetails.push({
      label: "TARGET REPS",
      value: targetReps,
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

  // Exercise list if multi-exercise
  if (exercises.length > 1) {
    exercises.forEach((ex, idx) => {
      blockDetails.push({
        label: `${idx + 1}. ${ex.exercise?.name || `Exercise ${idx + 1}`}`,
        value: ex.reps || "-",
      });
    });
  }

  const instructions =
    currentExercise?.notes ||
    block.block.set_notes ||
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
    setMenuOpenSetId(null);
  };

  const handleSaveEdit = async () => {
    if (!editingSetId || !editDraft) return;
    if (editingSetId.startsWith("temp-")) {
      if (process.env.NODE_ENV !== "production") {
        console.log("[SAVE EDITS guard]", {
          executor: "ForTimeExecutor",
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
    const weightNum =
      editDraft.weight.trim() !== "" ? parseFloat(editDraft.weight) : 0;
    const repsNum = parseInt(editDraft.reps, 10);
    if (isNaN(repsNum) || repsNum <= 0) return;
    setIsSavingEdit(true);
    try {
      const payload = buildSetEditPatchPayload(block.block.set_type, {
        exercise_id: exercises[0]?.exercise_id ?? undefined,
        weight: !isNaN(weightNum) && weightNum >= 0 ? weightNum : undefined,
        fortime_total_reps: repsNum,
      });
      if (process.env.NODE_ENV !== "production") {
        console.log("[SAVE EDITS]", {
          executor: "ForTimeExecutor",
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

  const handleLog = async () => {
    console.log("ForTimeExecutor handleLog called", {
      currentExercise: !!currentExercise,
      exercise_id: currentExercise?.exercise_id,
      isLoggingSet,
      weight,
      reps,
      exercises: exercises.map((ex) => ({
        id: ex.id,
        exercise_id: ex.exercise_id,
      })),
    });

    if (isLoggingSet) {
      console.log("ForTimeExecutor: Already logging");
      return;
    }

    // For For Time, exercise_id is optional (can be null)
    // Try to get exercise_id if available, but don't require it
    let exerciseIdToUse: string | undefined = currentExercise?.exercise_id;
    if (!exerciseIdToUse && exercises.length > 0) {
      // Try to find any exercise with an exercise_id
      const exerciseWithId = exercises.find((ex) => ex.exercise_id);
      exerciseIdToUse = exerciseWithId?.exercise_id || undefined;
    }

    console.log("ForTimeExecutor handleLog: exercise_id check", {
      exerciseIdToUse,
      currentExercise: currentExercise
        ? {
            id: currentExercise.id,
            exercise_id: currentExercise.exercise_id,
          }
        : null,
      exercisesCount: exercises.length,
    });

    // Parse weight (optional) and reps (required)
    const weightNum = weight && weight.trim() !== "" ? parseFloat(weight) : 0;
    const repsNum = parseInt(reps, 10);

    console.log("ForTimeExecutor: Parsed values", {
      weightNum,
      repsNum,
      weightStr: weight,
      repsStr: reps,
    });

    // Validate reps is required and > 0, weight is optional
    if (isNaN(repsNum) || repsNum <= 0) {
      console.log("ForTimeExecutor: Invalid reps validation failed");
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
      console.log("ForTimeExecutor: Invalid weight validation failed");
      addToast({
        title: "Invalid Input",
        description: "If weight is provided, it must be 0 or greater.",
        variant: "destructive",
        duration: 3000,
      });
      setIsLoggingSet(false);
      return;
    }

    console.log("ForTimeExecutor: Validation passed, starting log...");
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
        set_type: "fortime",
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

      console.log("ForTimeExecutor: Logging set with:", logData);

      const result = await logSetToDatabase(logData);

      if (result.success) {
        const setLogId =
          (result as { set_log_id?: string }).set_log_id ??
          `temp-${Date.now()}`;
        const newEntry: LoggedSet = {
          id: setLogId,
          exercise_id: exerciseIdToUse || "",
          set_entry_id: block.block.id,
          set_number: 1,
          weight_kg: weightNum > 0 ? weightNum : 0,
          reps_completed: repsNum,
          completed_at: new Date(),
        } as LoggedSet;
        onSetLogUpsert?.(block.block.id, newEntry);

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

        onBlockComplete(block.block.id, [...loggedSetsList, newEntry]);
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
      {/* Timer Display */}
      {!startTime && !timerStopped ? (
        // Initial state - Start Timer button
        <div
          className="rounded-xl p-5 text-center"
          style={{
            background:
              "color-mix(in srgb, var(--fc-status-error) 8%, var(--fc-surface-card))",
            border:
              "2px solid color-mix(in srgb, var(--fc-status-error) 25%, transparent)",
          }}
        >
          <div
            className="text-5xl font-bold mb-3"
            style={{ color: "var(--fc-status-error)" }}
          >
            {formatTime(0)}
          </div>
          <div className="text-lg fc-text-dim mb-4">
            Complete as fast as possible
          </div>
          <Button
            onClick={handleStartTimer}
            className="bg-rose-500 hover:bg-rose-600 text-white"
          >
            <Play className="w-5 h-5 mr-2" />
            Start Timer
          </Button>
        </div>
      ) : startTime && !timerStopped ? (
        // Timer running - Show elapsed time and Stop button
        <div
          className="rounded-xl p-5 text-center"
          style={{
            background:
              "color-mix(in srgb, var(--fc-status-error) 8%, var(--fc-surface-card))",
            border:
              "2px solid color-mix(in srgb, var(--fc-status-error) 25%, transparent)",
          }}
        >
          <div
            className="text-5xl font-bold mb-3"
            style={{ color: "var(--fc-status-error)" }}
          >
            {formatTime(elapsedSeconds)}
          </div>
          <div className="text-lg fc-text-dim mb-4">
            Complete as fast as possible
          </div>
          <div className="text-sm fc-text-dim mb-4">
            Time Cap: {timeCapMinutes} minutes
          </div>
          <Button
            onClick={handleStopTimer}
            variant="outline"
            className="border-rose-500 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
          >
            Stop
          </Button>
        </div>
      ) : timerStopped && completionTime !== null ? (
        // Timer stopped - Show completion time
        <div
          className="rounded-xl p-5 text-center"
          style={{
            background:
              "color-mix(in srgb, var(--fc-status-success) 8%, var(--fc-surface-card))",
            border:
              "2px solid color-mix(in srgb, var(--fc-status-success) 25%, transparent)",
          }}
        >
          <div
            className="text-3xl font-bold mb-2"
            style={{ color: "var(--fc-status-success)" }}
          >
            {formatTime(completionTime)}
          </div>
          <div className="text-sm fc-text-dim mb-4">Completion Time</div>
        </div>
      ) : null}

      {/* Weight and Reps Input - Show when timer is stopped or not started */}
      {(!startTime || timerStopped) && (
        <div
          className="p-4 rounded-xl"
          style={{ background: "var(--fc-surface-sunken)" }}
        >
          <div className="grid grid-cols-2 gap-4">
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
              {!editDraft &&
                suggested_weight != null &&
                suggested_weight > 0 && (
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
              label="Completed Reps"
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
      )}
    </div>
  );

  // Validate inputs for button state
  // For "for time" blocks: reps is required, weight is optional
  const weightStr = String(weight || "").trim();
  const repsStr = String(reps || "").trim();
  const weightNum = weightStr ? parseFloat(weightStr) : NaN;
  const repsNum = repsStr ? parseInt(repsStr, 10) : NaN;

  // For "for time" blocks, we need at least reps (weight is optional but recommended)
  const isValidInput =
    repsStr !== "" &&
    !isNaN(repsNum) &&
    isFinite(repsNum) &&
    repsNum > 0 &&
    (weightStr === "" ||
      (!isNaN(weightNum) && isFinite(weightNum) && weightNum > 0));

  // For "for_time" blocks, exercise_id is optional, so we don't require exercises to be configured
  // The button should work as long as reps are entered

  // Debug logging for button state
  const buttonDisabledReason = !isValidInput
    ? `Invalid input (reps: ${reps || "empty"}, weight: ${weight || "empty"})`
    : isLoggingSet
      ? "Currently logging"
      : null;

  // Debug button state
  useEffect(() => {
    console.log("ForTimeExecutor button state:", {
      isLoggingSet,
      isValidInput,
      exercisesCount: exercises.length,
      weight,
      reps,
      weightNum,
      repsNum,
      timerStopped,
      completionTime,
      disabled: isLoggingSet || !isValidInput,
      reason: buttonDisabledReason,
    });
  }, [
    isLoggingSet,
    isValidInput,
    exercises,
    weight,
    reps,
    weightNum,
    repsNum,
    timerStopped,
    completionTime,
    buttonDisabledReason,
  ]);

  const isEditMode = !!editingSetId && !!editDraft;
  const viewedSetEntry =
    viewingSetIndex >= 1
      ? (loggedSetsList.find((s) => s.set_number === viewingSetIndex) ??
        loggedSetsList[viewingSetIndex - 1])
      : null;
  // Only show Complete Set button when timer is stopped
  const logButton = timerStopped ? (
    <div className="w-full space-y-2">
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
          Edit this set
        </Button>
      ) : (
        <>
          <Button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isLoggingSet && isValidInput) handleLog();
            }}
            disabled={isLoggingSet || !isValidInput}
            variant="fc-primary"
            className="w-full h-12 text-base font-bold uppercase tracking-wider rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            title={buttonDisabledReason || undefined}
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            {isLoggingSet ? "Logging..." : "Complete Set"}
          </Button>
          {buttonDisabledReason && (
            <p className="text-xs text-red-500 mt-2 text-center">
              {buttonDisabledReason}
            </p>
          )}
        </>
      )}
    </div>
  ) : null;

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
      exerciseName={exerciseName}
      blockDetails={blockDetails}
      instructions={instructions}
      currentSet={1}
      totalSets={1}
      progressLabel="Exercise"
      loggingInputs={loggingInputs}
      logButton={logButton}
      showNavigation={true}
      currentExercise={currentExercise}
      showRestTimer={false}
    />
  );
}
