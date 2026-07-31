"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import {
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Pencil,
} from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import { formatTime } from "../BaseBlockExecutor";
import { LogSetButton } from "../ui/LogSetButton";
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
import {
  getWeightDefaultAndSuggestion,
  getCoachSuggestedWeight,
} from "@/lib/weightDefaultService";
import { ApplySuggestedWeightButton } from "../ui/ApplySuggestedWeightButton";
import { fetchApi } from "@/lib/apiClient";
import { buildSetEditPatchPayload } from "@/lib/setEditPayload";
import { parseWeightKgInput } from "@/lib/parseWeightKgInput";
import { resolveSetPrescriptionTargets } from "../ui/set-rows/resolveSetPrescriptionTargets";
import {
  LiveCard,
  LiveCardExerciseName,
  LiveCardPrimary,
  LiveCardStats,
  LiveCardNote,
  LiveCardTechnique,
  LiveCardLog,
  LiveCardLogField,
  formatRestPauseTechniqueBody,
  effortFromPrescribedRir,
  formatLiveRest,
  resolveRestSeconds,
  formatLiveLast,
  groupIndexToHue,
  type LiveCardTarget,
} from "../live-card";

export function RestPauseExecutor({
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
  onSetComplete,
  onLastSetLoggedForRest,
  progressionSuggestion,
  previousPerformanceMap,
  allowSetEditDelete = false,
  registerSetLogIdResolved,
  onSetLogUpsert,
  onSetEditSaved,
  loggedSets,
}: BaseSetEntryExecutorProps) {
  const { addToast } = useToast();
  const currentExercise = liveSetEntry.setEntry.exercises?.[currentExerciseIndex];
  const totalSets = liveSetEntry.setEntry.total_sets || 1;
  const completedSets = liveSetEntry.completedSets || 0;
  const currentSetNumber = completedSets + 1;

  /** Parent-owned logged sets; single source of truth. Persists across block navigation. */
  const loggedSetsList = loggedSets ?? [];

  const restPauseSet = currentExercise?.rest_pause_sets?.[0];
  const restPauseDuration = restPauseSet?.rest_pause_duration || 30;
  const maxRestPauses = restPauseSet?.max_rest_pauses || 2;

  const [weight, setWeight] = useState("");
  const [initialReps, setInitialReps] = useState("");
  const [restPauseAttempts, setRestPauseAttempts] = useState<string[]>([]);
  const [isLoggingSet, setIsLoggingSet] = useState(false);
  useLoggingReset(isLoggingSet, setIsLoggingSet);
  const [showTimer, setShowTimer] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(restPauseDuration);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [isWeightPristine, setIsWeightPristine] = useState(true);
  const [viewingSetIndex, setViewingSetIndex] = useState(0);
  /** Collapsible set history: show all sets or only last 2 */
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [menuOpenSetId, setMenuOpenSetId] = useState<string | null>(null);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    weight: string;
    initialReps: string;
    set_number: number;
  } | null>(null);

  const loggedSetsRef = useRef<LoggedSet[]>(loggedSetsList);
  useEffect(() => {
    loggedSetsRef.current = loggedSetsList;
  }, [loggedSetsList]);

  const displaySetNumber =
    editingSetId && editDraft?.set_number != null
      ? editDraft.set_number
      : viewingSetIndex >= 1
        ? viewingSetIndex
        : Math.min(currentSetNumber, totalSets);

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
    if (viewingSetIndex >= 1 && loggedSetsList[viewingSetIndex - 1]) {
      const s = loggedSetsList[viewingSetIndex - 1];
      setWeight(String(s.weight_kg ?? ""));
      setInitialReps(String(s.reps_completed ?? ""));
    }
  }, [viewingSetIndex, loggedSetsList]);

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
  const coachSuggestedWeight = getCoachSuggestedWeight(loadPercentage, e1rm);

  useEffect(() => {
    setIsWeightPristine(true);
  }, [completedSets, currentExerciseIndex, exerciseId]);

  const prescribedTargetRepsRaw =
    currentExercise?.reps ?? liveSetEntry.setEntry.reps_per_set ?? 8;
  const { numericDefault: prescribedTargetRepsNum, displayHint: targetRepsHint } =
    parseRepsTarget(prescribedTargetRepsRaw);

  useEffect(() => {
    if (viewingSetIndex >= 1) return;
    if (!isWeightPristine) return;
    if (default_weight != null && default_weight > 0)
      setWeight(String(default_weight));
    else setWeight("");
    setInitialReps(
      prescribedTargetRepsNum > 0 ? String(prescribedTargetRepsNum) : "",
    );
  }, [
    viewingSetIndex,
    isWeightPristine,
    default_weight,
    prescribedTargetRepsNum,
    completedSets,
    exerciseId,
  ]);

  // Timer logic
  useEffect(() => {
    if (showTimer && timerSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev: number) => {
          if (prev <= 1) {
            setShowTimer(false);
            return restPauseDuration;
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
  }, [showTimer, timerSeconds, restPauseDuration]);

  const restSec = resolveRestSeconds(
    currentExercise?.rest_seconds,
    liveSetEntry.setEntry.rest_seconds,
  );

  const instructions =
    currentExercise?.notes || liveSetEntry.setEntry.set_notes || undefined;

  const activeSetNumber = Math.min(
    Math.max(1, completedSets + 1),
    totalSets,
  );
  const activeTargets = resolveSetPrescriptionTargets(
    currentExercise,
    activeSetNumber,
    liveSetEntry.setEntry.reps_per_set,
  );
  const activeEffort = effortFromPrescribedRir(activeTargets.rir);
  const liveTarget: LiveCardTarget = {
    kind: "reps_only",
    reps: activeTargets.reps ?? prescribedTargetRepsRaw ?? "—",
    unit: "+ reps",
  };
  const lastSessionSetDetails =
    exerciseId && previousPerformanceMap
      ? (previousPerformanceMap.get(exerciseId)?.lastWorkout?.setDetails ?? null)
      : null;
  const lastForActiveSet = lastSessionSetDetails?.find(
    (s) => s.set_number === activeSetNumber,
  );
  const lastLabel = formatLiveLast(
    lastForActiveSet?.reps_completed ?? null,
    lastForActiveSet?.weight_kg ?? null,
  );
  const tempoLabel =
    activeTargets.tempo && String(activeTargets.tempo).trim()
      ? String(activeTargets.tempo).trim()
      : null;

  const pauseSeconds =
    restPauseSet?.rest_pause_duration ??
    (currentExercise as { rest_pause_seconds?: number | null } | undefined)
      ?.rest_pause_seconds ??
    restPauseDuration;
  const bursts =
    restPauseSet?.max_rest_pauses ??
    (currentExercise as { max_rest_pauses?: number | null } | undefined)
      ?.max_rest_pauses ??
    maxRestPauses;

  const handleAddRestPause = () => {
    if (restPauseAttempts.length < maxRestPauses) {
      setRestPauseAttempts([...restPauseAttempts, ""]);
      setShowTimer(true);
      setTimerSeconds(restPauseDuration);
    }
  };

  const handleRemoveRestPause = (index: number) => {
    setRestPauseAttempts(restPauseAttempts.filter((_, i) => i !== index));
  };

  const handleEditSet = (setEntry: LoggedSet) => {
    setEditingSetId(setEntry.id);
    setEditDraft({
      weight: String(setEntry.weight_kg ?? ""),
      initialReps: String(setEntry.reps_completed ?? ""),
      set_number: setEntry.set_number ?? 1,
    });
    setMenuOpenSetId(null);
  };

  const handleSaveEdit = async () => {
    if (!editingSetId || !editDraft) return;
    if (editingSetId.startsWith("temp-")) {
      if (process.env.NODE_ENV !== "production") {
        console.log("[SAVE EDITS guard]", {
          executor: "RestPauseExecutor",
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
    const w = parseWeightKgInput(editDraft.weight);
    const r = parseInt(editDraft.initialReps, 10);
    if (isNaN(w) || w < 0 || isNaN(r) || r <= 0) {
      addToast({
        title: "Invalid values",
        description: "Weight ≥ 0, reps ≥ 1",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    setIsSavingEdit(true);
    try {
      const payload = buildSetEditPatchPayload(liveSetEntry.setEntry.set_type, {
        rest_pause_initial_weight: w,
        rest_pause_initial_reps: r,
        rest_pause_reps_after: 0,
        set_number: editDraft.set_number,
        ...(currentExercise?.exercise_id && {
          exercise_id: currentExercise.exercise_id,
        }),
        ...(restPauseDuration != null && {
          rest_pause_duration: restPauseDuration,
        }),
        ...(maxRestPauses != null && { max_rest_pauses: maxRestPauses }),
      });
      if (process.env.NODE_ENV !== "production") {
        console.log("[SAVE EDITS]", {
          executor: "RestPauseExecutor",
          setId: editingSetId,
          blockTypeFromUI: liveSetEntry.setEntry.set_type,
          payloadKeys: Object.keys(payload),
        });
      }
      const res = await fetchApi(`/api/sets/${editingSetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const current = loggedSetsList.find((s) => s.id === editingSetId);
        const updatedEntry: LoggedSet = {
          ...current,
          id: editingSetId,
          exercise_id:
            current?.exercise_id ?? currentExercise?.exercise_id ?? "",
          set_entry_id: liveSetEntry.setEntry.id,
          set_number: editDraft.set_number,
          weight_kg: w,
          reps_completed: r,
          completed_at: current?.completed_at ?? new Date(),
        };
        onSetEditSaved?.(liveSetEntry.setEntry.id, updatedEntry);
        setEditingSetId(null);
        setEditDraft(null);
        addToast({ title: "Set updated", variant: "success", duration: 2000 });
      } else {
        const err = await res.json().catch(() => ({}));
        addToast({
          title: "Could not update set",
          description: (err as { error?: string })?.error ?? "Try again.",
          variant: "destructive",
          duration: 3000,
        });
      }
    } catch {
      addToast({
        title: "Could not update set",
        variant: "destructive",
        duration: 3000,
      });
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
    const initialRepsNum = parseInt(initialReps);

    if (
      !weight ||
      weight.trim() === "" ||
      isNaN(weightNum) ||
      weightNum < 0 ||
      !initialReps ||
      initialReps.trim() === "" ||
      isNaN(initialRepsNum) ||
      initialRepsNum <= 0
    ) {
      addToast({
        title: "Invalid Input",
        description: "Please enter valid weight and initial reps",
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
      // Calculate reps after rest pause
      const repsAfterRestPause = restPauseAttempts.reduce(
        (sum, r) => sum + parseInt(r || "0"),
        0,
      );

      const logData: any = {
        set_type: "rest_pause",
        set_number: completedSets + 1,
        rest_pause_number: 1,
        isLastSet: currentSetNumber >= totalSets,
      };

      // Only add fields if they're defined
      if (currentExercise?.exercise_id)
        logData.exercise_id = currentExercise.exercise_id;
      // Only save rest_pause_initial_weight (not generic weight field)
      if (weightNum !== undefined && weightNum !== null) {
        logData.rest_pause_initial_weight = weightNum;
      }
      if (initialRepsNum !== undefined && initialRepsNum !== null)
        logData.rest_pause_initial_reps = initialRepsNum;
      if (repsAfterRestPause !== undefined && repsAfterRestPause !== null)
        logData.rest_pause_reps_after = repsAfterRestPause;
      // Add rest_pause_duration and max_rest_pauses (from workout_rest_pause_sets)
      if (restPauseDuration !== undefined && restPauseDuration !== null)
        logData.rest_pause_duration = restPauseDuration;
      if (maxRestPauses !== undefined && maxRestPauses !== null)
        logData.max_rest_pauses = maxRestPauses;

      const result = await logSetToDatabase(logData);

      if (result.success) {
        const totalReps = initialRepsNum + repsAfterRestPause;
        const newLoggedSet: LoggedSet = {
          id: result.set_log_id || `temp-${currentSetNumber}-${Date.now()}`,
          exercise_id: currentExercise?.exercise_id || "",
          set_entry_id: liveSetEntry.setEntry.id,
          set_number: currentSetNumber,
          weight_kg: weightNum,
          reps_completed: totalReps,
          completed_at: new Date(),
        } as LoggedSet;
        onSetLogUpsert?.(liveSetEntry.setEntry.id, newLoggedSet);

        if (result.e1rm && onE1rmUpdate && currentExercise?.exercise_id) {
          onE1rmUpdate(currentExercise.exercise_id, result.e1rm);
        }

        addToast({
          title: "Rest-Pause Set Logged!",
          description: `${weightNum}kg × ${totalReps} total reps (${initialRepsNum} + ${restPauseAttempts.length} rest-pause attempts)`,
          variant: "success",
          duration: 2000,
        });

        const newCompletedSets = currentSetNumber;
        if (newCompletedSets < totalSets) {
          onLastSetLoggedForRest?.({
            weight: weightNum,
            reps: totalReps,
            setNumber: newCompletedSets,
            totalSets,
            isPr: result.isNewPR,
          });
        }
        onSetComplete?.(newCompletedSets);

        if (newCompletedSets >= totalSets) {
          onSetEntryComplete(liveSetEntry.setEntry.id, [...loggedSetsList, newLoggedSet]);
        } else {
          setInitialReps("");
          setRestPauseAttempts([]);
          setShowTimer(false);
        }
      } else {
        addToast({
          title: "Failed to Save",
          description: result.error || "Failed to save set. Please try again.",
          variant: "destructive",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Error logging rest-pause set:", error);
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

  const viewedSetEntry =
    viewingSetIndex >= 1 ? loggedSetsList[viewingSetIndex - 1] : null;
  const isViewingLoggedSet = !!viewedSetEntry;

  const updateSetRpe = useUpdateSetRpe({
    setEntryId: liveSetEntry.setEntry.id,
    onSetLogUpsert,
  });
  const loggedSetRows: LoggedSetRow[] = loggedSetsList.map((setEntry) => ({
    id: setEntry.id,
    title: `Set ${setEntry.set_number}: ${setEntry.weight_kg ?? "—"} kg × ${setEntry.reps_completed ?? "—"} reps`,
    rpe: setEntry.rpe ?? null,
    onEffortChange: (rpe) => updateSetRpe(setEntry, rpe),
    disabled: setEntry.id.startsWith("temp-"),
    menu: allowSetEditDelete ? (
      <div className="relative flex items-center">
        <button
          type="button"
          onClick={() =>
            setMenuOpenSetId(menuOpenSetId === setEntry.id ? null : setEntry.id)
          }
          className="grid h-6 w-6 place-items-center rounded-md text-[color:var(--fc-text-dim)] hover:bg-white/5 hover:text-[color:var(--fc-text-primary)]"
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
                onClick={() => handleEditSet(setEntry)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:opacity-80"
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

  const loggingInputs = (
    <div className="space-y-4">
      <div
        className="p-4 rounded-xl"
        style={{ background: "var(--fc-surface-sunken)" }}
      >
        <div className="flex items-center justify-center gap-2 mb-4">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setViewingSetIndex((i) => Math.max(0, i - 1));
            }}
            disabled={viewingSetIndex === 0}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-lg fc-text-primary disabled:opacity-40 disabled:pointer-events-none hover:bg-black/10 focus:outline-none focus:ring-2"
            aria-label="Previous set"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <Eyebrow
            as="span"
            tone="dim"
            density="section"
            className="min-w-[6rem] justify-center text-center"
          >
            Set {displaySetNumber} of {totalSets}
          </Eyebrow>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setViewingSetIndex((i) => Math.min(loggedSetsList.length, i + 1));
            }}
            disabled={viewingSetIndex >= loggedSetsList.length}
            title={
              loggedSetsList.length === 0
                ? "Log at least one set to review previous sets"
                : undefined
            }
            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-lg fc-text-primary disabled:opacity-40 disabled:pointer-events-none hover:bg-black/10 focus:outline-none focus:ring-2"
            aria-label={
              loggedSetsList.length === 0
                ? "Next set (log a set first to review)"
                : "Next set"
            }
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <h4 className="font-semibold fc-text-primary mb-4 text-lg">
          {isViewingLoggedSet ? "Edit set" : "Initial reps to failure"}
        </h4>
        <div className="flex flex-col gap-2">
          <LiveCardLogField
            label="Weight"
            value={weight}
            onChange={(val) => {
              setIsWeightPristine(false);
              setWeight(val);
            }}
            onIncrement={() => {
              const cur = parseWeightKgInput(weight || "0");
              const next = String(
                Math.max(0, Math.round(((isNaN(cur) ? 0 : cur) + 2.5) * 2) / 2),
              );
              setIsWeightPristine(false);
              setWeight(next);
            }}
            onDecrement={() => {
              const cur = parseWeightKgInput(weight || "0");
              const next = String(
                Math.max(0, Math.round(((isNaN(cur) ? 0 : cur) - 2.5) * 2) / 2),
              );
              setIsWeightPristine(false);
              setWeight(next);
            }}
          />
          {!editDraft &&
            coachSuggestedWeight != null &&
            coachSuggestedWeight > 0 && (
              <ApplySuggestedWeightButton
                suggestedKg={coachSuggestedWeight}
                onApply={() => {
                  setWeight(String(coachSuggestedWeight));
                  setIsWeightPristine(false);
                }}
              />
            )}
          <LiveCardLogField
            label="Reps"
            value={editDraft ? editDraft.initialReps : initialReps}
            onChange={(val) => {
              if (editDraft)
                setEditDraft((d) => (d ? { ...d, initialReps: val } : null));
              else {
                setIsWeightPristine(false);
                setInitialReps(val);
              }
            }}
            onIncrement={() => {
              const raw = editDraft ? editDraft.initialReps : initialReps;
              const cur = parseInt(raw || "0", 10);
              const next = String(Math.max(0, (isNaN(cur) ? 0 : cur) + 1));
              if (editDraft)
                setEditDraft((d) => (d ? { ...d, initialReps: next } : null));
              else {
                setIsWeightPristine(false);
                setInitialReps(next);
              }
            }}
            onDecrement={() => {
              const raw = editDraft ? editDraft.initialReps : initialReps;
              const cur = parseInt(raw || "0", 10);
              const next = String(Math.max(0, (isNaN(cur) ? 0 : cur) - 1));
              if (editDraft)
                setEditDraft((d) => (d ? { ...d, initialReps: next } : null));
              else {
                setIsWeightPristine(false);
                setInitialReps(next);
              }
            }}
          />
          {!editDraft && targetRepsHint ? (
            <p className="text-[11px] text-[color:var(--fc-text-dim)]">
              Target: {targetRepsHint}
            </p>
          ) : null}
        </div>
      </div>

      {/* Timer — hide when in edit mode */}
      {!editDraft && showTimer && (
        <div
          className="rounded-xl p-5 text-center"
          style={{
            background:
              "color-mix(in srgb, var(--fc-status-warning) 8%, var(--fc-surface-card))",
            border:
              "2px solid color-mix(in srgb, var(--fc-status-warning) 25%, transparent)",
          }}
        >
          <div
            className="text-4xl font-bold mb-2"
            style={{ color: "var(--fc-status-warning)" }}
          >
            {formatTime(timerSeconds)}
          </div>
          <div className="text-sm fc-text-dim">Rest-Pause Timer</div>
        </div>
      )}

      {/* Rest-Pause Attempts — hide when in edit mode */}
      {!editDraft && restPauseAttempts.length > 0 && (
        <div
          className="p-4 rounded-xl"
          style={{ background: "var(--fc-surface-sunken)" }}
        >
          <h4 className="font-semibold fc-text-primary mb-4 text-lg">
            Rest-Pause Attempts
          </h4>
          <div className="space-y-2">
            {restPauseAttempts.map((attempt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="flex-1">
                  <LiveCardLogField
                    label={`Reps after pause ${idx + 1}`}
                    value={attempt}
                    onChange={(value) => {
                      const newAttempts = [...restPauseAttempts];
                      newAttempts[idx] = value;
                      setRestPauseAttempts(newAttempts);
                    }}
                    onIncrement={() => {
                      const cur = parseInt(attempt || "0", 10);
                      const next = String(Math.max(0, (isNaN(cur) ? 0 : cur) + 1));
                      const newAttempts = [...restPauseAttempts];
                      newAttempts[idx] = next;
                      setRestPauseAttempts(newAttempts);
                    }}
                    onDecrement={() => {
                      const cur = parseInt(attempt || "0", 10);
                      const next = String(Math.max(0, (isNaN(cur) ? 0 : cur) - 1));
                      const newAttempts = [...restPauseAttempts];
                      newAttempts[idx] = next;
                      setRestPauseAttempts(newAttempts);
                    }}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveRestPause(idx)}
                  className="p-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Rest-Pause Button — hide when in edit mode */}
      {!editDraft && restPauseAttempts.length < maxRestPauses && (
        <Button
          variant="outline"
          onClick={handleAddRestPause}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Rest-Pause Attempt
        </Button>
      )}
    </div>
  );

  const initialRepsNumPreview = parseInt(initialReps, 10);
  const weightNumPreviewRp = parseWeightKgInput(weight);
  const restPauseLogReady =
    !isLoggingSet &&
    completedSets < totalSets &&
    weight.trim() !== "" &&
    !isNaN(weightNumPreviewRp) &&
    weightNumPreviewRp >= 0 &&
    initialReps.trim() !== "" &&
    !isNaN(initialRepsNumPreview) &&
    initialRepsNumPreview > 0;

  const isEditMode = !!editingSetId && !!editDraft;
  const chrome = useWorkoutExecutionChrome();
  const hideCompactBack = chrome?.hideCompactBack ?? false;
  const totalSetEntries = allSetEntries.length || 1;
  const canGoPrevious = currentSetEntryIndex > 0;
  const canGoNext = currentSetEntryIndex < totalSetEntries - 1;
  const previousPerfForExercise =
    exerciseId && previousPerformanceMap
      ? (previousPerformanceMap.get(exerciseId) ?? null)
      : null;
  const lastWorkoutForLastWeek = previousPerfForExercise?.lastWorkout ?? null;

  const logButton = isEditMode ? (
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
          editDraft.weight.trim() === "" ||
          editDraft.initialReps.trim() === "" ||
          isNaN(parseWeightKgInput(editDraft.weight)) ||
          parseWeightKgInput(editDraft.weight) < 0 ||
          isNaN(parseInt(editDraft.initialReps, 10)) ||
          parseInt(editDraft.initialReps, 10) <= 0
        }
        variant="fc-primary"
        className="flex-1 h-12 text-base font-bold uppercase tracking-wider rounded-xl"
      >
        {isSavingEdit ? "Saving…" : "Save edits"}
      </Button>
    </div>
  ) : viewedSetEntry ? (
    <Button
      onClick={() => handleEditSet(viewedSetEntry)}
      variant="fc-primary"
      className="w-full h-12 text-base font-bold uppercase tracking-wider rounded-xl"
    >
      <Pencil className="w-5 h-5 mr-2" />
      Edit this set
    </Button>
  ) : (
    <LogSetButton
      onClick={handleLog}
      ready={restPauseLogReady}
      loading={isLoggingSet}
      label="Log rest-pause set"
    />
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
            heading={`Set ${activeSetNumber} of ${totalSets}`}
            status={completedSets >= totalSets ? "complete" : "logging"}
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
            <LiveCardStats
              rest={formatLiveRest(restSec)}
              tempo={tempoLabel}
              last={lastLabel}
            />
            <LiveCardTechnique title="Rest-pause">
              {formatRestPauseTechniqueBody({
                pauseSeconds,
                maxPauses: bursts,
              })}
            </LiveCardTechnique>
            {instructions ? (
              <LiveCardNote>{instructions}</LiveCardNote>
            ) : null}
            <LiveCardLog>
              {loggingInputs}
              <div className="mt-3">{logButton}</div>
            </LiveCardLog>
          </LiveCard>

          {previousPerfForExercise?.lastWorkout != null ||
          progressionSuggestion ? (
            <div className="mx-4">
              <ProgressionNudge
                suggestion={progressionSuggestion}
                previousPerformance={previousPerfForExercise}
                previousSessionSetNumber={activeSetNumber}
                showPreviousSession={false}
                onApplySuggestion={(w, r) => {
                  if (w != null) {
                    setWeight(String(w));
                    setIsWeightPristine(false);
                  }
                  if (r != null) setInitialReps(String(r));
                }}
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
        <LastSessionSetsSection lastWorkout={lastWorkoutForLastWeek} />
      </div>
    </>
  );
}
