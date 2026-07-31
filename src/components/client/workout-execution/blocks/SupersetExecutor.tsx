"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Pencil } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
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
import { fetchApi } from "@/lib/apiClient";
import { buildSetEditPatchPayload } from "@/lib/setEditPayload";
import { parseWeightKgInput } from "@/lib/parseWeightKgInput";
import { useSetRowsState } from "../hooks/useSetRowsState";
import { SetUnitRow } from "../ui/set-rows/SetUnitRow";
import setUnitStyles from "../ui/set-rows/setUnitRow.module.css";
import { resolveSetRowWeightDefault } from "../ui/set-rows/resolveSetRowWeightDefault";
import { resolveSetPrescriptionTargets } from "../ui/set-rows/resolveSetPrescriptionTargets";
import { LoggedEffortInline } from "../ui/LoggedEffortInline";
import { useLiveRestTimer } from "../LiveRestTimerContext";
import { formatGroupedExerciseBadge } from "../groupLetterBadges";
import {
  LiveCard,
  LiveCardGroupedExercise,
  LiveCardGlue,
  LiveCardLog,
  LiveCardLogField,
  LiveCardLogButton,
  effortFromPrescribedRir,
  formatLiveRest,
  resolveRestSeconds,
  formatLiveLast,
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

interface SupersetRow {
  setNumber: number;
  weightA: string;
  repsA: string;
  weightB: string;
  repsB: string;
  done: boolean;
}

export function SupersetExecutor({
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
  formatTime,
  calculateSuggestedWeight,
  onVideoClick,
  onAlternativesClick,
  onRestTimerClick,
  onWorkoutBack,
  onSetComplete,
  onLastSetLoggedForRest,
  progressionSuggestionsMap,
  previousPerformanceMap,
  allowSetEditDelete = false,
  registerSetLogIdResolved,
  onSetLogUpsert,
  onSetEditSaved,
  loggedSets,
}: BaseSetEntryExecutorProps) {
  const { addToast } = useToast();
  const exerciseA = liveSetEntry.setEntry.exercises?.[0];
  const exerciseB = liveSetEntry.setEntry.exercises?.[1];
  const totalSets = liveSetEntry.setEntry.total_sets || 1;
  const completedSets = liveSetEntry.completedSets || 0;
  const currentSetNumber = completedSets + 1;

  /** Parent-owned logged sets; single source of truth. Persists across block navigation. */
  const loggedSetsList = loggedSets ?? [];
  const setNumbersLogged = [
    ...new Set(loggedSetsList.map((s) => s.set_number)),
  ].sort((a, b) => a - b);

  const [weightA, setWeightA] = useState("");
  const [repsA, setRepsA] = useState("");
  const [weightB, setWeightB] = useState("");
  const [repsB, setRepsB] = useState("");
  const [isLoggingSet, setIsLoggingSet] = useState(false);
  useLoggingReset(isLoggingSet, setIsLoggingSet);
  /** Tap-to-jump: override first-incomplete when client picks an upcoming round */
  const [jumpRowIndex, setJumpRowIndex] = useState<number | null>(null);
  const [isWeightAPristine, setIsWeightAPristine] = useState(true);
  const [isWeightBPristine, setIsWeightBPristine] = useState(true);
  const [viewingSetIndex, setViewingSetIndex] = useState(0);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    weightA: string;
    repsA: string;
    weightB: string;
    repsB: string;
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
      if (list.length === 0) return;
      const lastId = list[list.length - 1].id;
      if (!lastId.startsWith("temp-")) return;
      const oldEntry = list[list.length - 1];
      const newEntry = { ...oldEntry, id: set_log_id };
      onSetLogUpsert?.(liveSetEntry.setEntry.id, newEntry, { replaceId: lastId });
    });
    return () => {};
  }, [registerSetLogIdResolved, onSetLogUpsert, liveSetEntry.setEntry.id]);
  useEffect(() => {
    if (viewingSetIndex > loggedSetsList.length)
      setViewingSetIndex(loggedSetsList.length);
  }, [loggedSetsList.length, viewingSetIndex]);
  useEffect(() => {
    if (viewingSetIndex >= 1) {
      const forSet = loggedSetsList.filter(
        (s) => s.set_number === viewingSetIndex,
      );
      const entryA =
        forSet.find((s) => s.exercise_id === exerciseA?.exercise_id) ||
        forSet[0];
      const entryB =
        forSet.find((s) => s.exercise_id === exerciseB?.exercise_id) ||
        forSet[1] ||
        forSet[0];
      if (entryA) {
        setWeightA(String(entryA.weight_kg ?? ""));
        setRepsA(String(entryA.reps_completed ?? ""));
      }
      if (entryB) {
        setWeightB(String(entryB.weight_kg ?? ""));
        setRepsB(String(entryB.reps_completed ?? ""));
      }
    }
  }, [
    viewingSetIndex,
    loggedSetsList,
    exerciseA?.exercise_id,
    exerciseB?.exercise_id,
  ]);

  const resultA = getWeightDefaultAndSuggestion({
    sessionStickyWeight: exerciseA?.exercise_id
      ? (lastPerformedWeightByExerciseId[exerciseA.exercise_id] ?? null)
      : null,
    lastSessionWeight: exerciseA?.exercise_id
      ? (lastSessionWeightByExerciseId[exerciseA.exercise_id] ?? null)
      : null,
    loadPercentage: exerciseA?.load_percentage ?? null,
    e1rm: exerciseA?.exercise_id
      ? (e1rmMap[exerciseA.exercise_id] ?? null)
      : null,
  });
  const resultB = getWeightDefaultAndSuggestion({
    sessionStickyWeight: exerciseB?.exercise_id
      ? (lastPerformedWeightByExerciseId[exerciseB.exercise_id] ?? null)
      : null,
    lastSessionWeight: exerciseB?.exercise_id
      ? (lastSessionWeightByExerciseId[exerciseB.exercise_id] ?? null)
      : null,
    loadPercentage: exerciseB?.load_percentage ?? null,
    e1rm: exerciseB?.exercise_id
      ? (e1rmMap[exerciseB.exercise_id] ?? null)
      : null,
  });
  const coachSuggestedA = getCoachSuggestedWeight(
    exerciseA?.load_percentage ?? null,
    exerciseA?.exercise_id ? (e1rmMap[exerciseA.exercise_id] ?? null) : null,
  );
  const coachSuggestedB = getCoachSuggestedWeight(
    exerciseB?.load_percentage ?? null,
    exerciseB?.exercise_id ? (e1rmMap[exerciseB.exercise_id] ?? null) : null,
  );

  useEffect(() => {
    setIsWeightAPristine(true);
    setIsWeightBPristine(true);
  }, [completedSets]);

  const isViewingLoggedSet = viewingSetIndex >= 1;
  useEffect(() => {
    if (isViewingLoggedSet) return;
    if (editingSetId) return;
    if (isWeightAPristine) {
      if (resultA.default_weight != null && resultA.default_weight > 0)
        setWeightA(String(resultA.default_weight));
      else setWeightA("");
    }
  }, [
    isViewingLoggedSet,
    editingSetId,
    isWeightAPristine,
    resultA.default_weight,
    completedSets,
  ]);
  useEffect(() => {
    if (isViewingLoggedSet) return;
    if (editingSetId) return;
    if (isWeightBPristine) {
      if (resultB.default_weight != null && resultB.default_weight > 0)
        setWeightB(String(resultB.default_weight));
      else setWeightB("");
    }
  }, [
    isViewingLoggedSet,
    editingSetId,
    isWeightBPristine,
    resultB.default_weight,
    completedSets,
  ]);

  const {
    numericDefault: prescribedRepsDefaultA,
    displayHint: repsRangeHintA,
  } = parseRepsTarget(exerciseA?.reps ?? null);
  const {
    numericDefault: prescribedRepsDefaultB,
    displayHint: repsRangeHintB,
  } = parseRepsTarget(exerciseB?.reps ?? null);

  useEffect(() => {
    if (viewingSetIndex >= 1) return;
    if (editingSetId) return;
    setRepsA(
      prescribedRepsDefaultA > 0 ? String(prescribedRepsDefaultA) : "",
    );
    setRepsB(
      prescribedRepsDefaultB > 0 ? String(prescribedRepsDefaultB) : "",
    );
  }, [
    viewingSetIndex,
    editingSetId,
    prescribedRepsDefaultA,
    prescribedRepsDefaultB,
    completedSets,
    exerciseA?.reps,
    exerciseB?.reps,
  ]);

  const exercises = liveSetEntry.setEntry.exercises ?? [];
  const titleExercise =
    exercises[currentExerciseIndex ?? 0] ?? exerciseA ?? exerciseB;

  const restSec = resolveRestSeconds(
    liveSetEntry.setEntry.rest_seconds,
    exerciseA?.rest_seconds,
    exerciseB?.rest_seconds,
  );

  const instructions = liveSetEntry.setEntry.set_notes || undefined;

  const maxViewableSet =
    loggedSetsList.length === 0
      ? 0
      : Math.max(...loggedSetsList.map((s) => s.set_number));

  const lastSessionSetsA =
    exerciseA?.exercise_id && previousPerformanceMap
      ? (previousPerformanceMap.get(exerciseA.exercise_id)?.lastWorkout?.setDetails ??
        null)
      : null;
  const lastSessionSetsB =
    exerciseB?.exercise_id && previousPerformanceMap
      ? (previousPerformanceMap.get(exerciseB.exercise_id)?.lastWorkout?.setDetails ??
        null)
      : null;
  const weightFallbackA =
    coachSuggestedA != null && coachSuggestedA > 0
      ? coachSuggestedA
      : resultA.suggested_weight;
  const weightFallbackB =
    coachSuggestedB != null && coachSuggestedB > 0
      ? coachSuggestedB
      : resultB.suggested_weight;

  const rowsState = useSetRowsState<SupersetRow>({
    rowCount: totalSets,
    // Structural only — sticky/suggested weight must NOT be in resetKey (wipes done flags).
    resetKey: `${liveSetEntry.setEntry.id}:${exerciseA?.exercise_id ?? "a"}:${exerciseB?.exercise_id ?? "b"}`,
    loggedCount: setNumbersLogged.length,
    createDefaultRow: (index, previous) => {
      const setNumber = index + 1;
      const targetsA = resolveSetPrescriptionTargets(
        exerciseA,
        setNumber,
        liveSetEntry.setEntry.reps_per_set,
      );
      const targetsB = resolveSetPrescriptionTargets(
        exerciseB,
        setNumber,
        liveSetEntry.setEntry.reps_per_set,
      );
      const { numericDefault: repsDefaultA } = parseRepsTarget(targetsA.reps);
      const { numericDefault: repsDefaultB } = parseRepsTarget(targetsB.reps);
      return {
        setNumber,
        weightA: resolveSetRowWeightDefault({
          setNumber,
          previousRowWeight: index > 0 ? previous?.weightA : undefined,
          lastSessionSetDetails: lastSessionSetsA,
          defaultWeight: resultA.default_weight,
          suggestedWeight: weightFallbackA,
          prescribedWeightKg: targetsA.weight_kg,
        }),
        repsA:
          repsDefaultA > 0 ? String(repsDefaultA) : (previous?.repsA ?? ""),
        weightB: resolveSetRowWeightDefault({
          setNumber,
          previousRowWeight: index > 0 ? previous?.weightB : undefined,
          lastSessionSetDetails: lastSessionSetsB,
          defaultWeight: resultB.default_weight,
          suggestedWeight: weightFallbackB,
          prescribedWeightKg: targetsB.weight_kg,
        }),
        repsB:
          repsDefaultB > 0 ? String(repsDefaultB) : (previous?.repsB ?? ""),
        done: false,
      };
    },
  });

  const handleEditSet = (setEntry: LoggedSet) => {
    const forSet = loggedSetsList.filter(
      (s) => s.set_number === setEntry.set_number,
    );
    const entryA =
      forSet.find((s) => s.exercise_id === exerciseA?.exercise_id) ?? forSet[0];
    const entryB =
      forSet.find((s) => s.exercise_id === exerciseB?.exercise_id) ??
      forSet[1] ??
      forSet[0];
    setEditingSetId(setEntry.id);
    setEditDraft({
      weightA: String(entryA?.weight_kg ?? ""),
      repsA: String(entryA?.reps_completed ?? ""),
      weightB: String(entryB?.weight_kg ?? ""),
      repsB: String(entryB?.reps_completed ?? ""),
      set_number: setEntry.set_number ?? 1,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingSetId || !editDraft) return;
    if (editingSetId.startsWith("temp-")) {
      if (process.env.NODE_ENV !== "production") {
        console.log("[SAVE EDITS guard]", {
          executor: "SupersetExecutor",
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
    const weightANum = parseWeightKgInput(editDraft.weightA);
    const repsANum = parseInt(editDraft.repsA, 10);
    const weightBNum = parseWeightKgInput(editDraft.weightB);
    const repsBNum = parseInt(editDraft.repsB, 10);
    if (
      isNaN(weightANum) ||
      isNaN(repsANum) ||
      isNaN(weightBNum) ||
      isNaN(repsBNum)
    ) {
      addToast({
        title: "Invalid values",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    setIsSavingEdit(true);
    try {
      const payload = buildSetEditPatchPayload(liveSetEntry.setEntry.set_type, {
        set_number: editDraft.set_number,
        superset_exercise_a_id: exerciseA?.exercise_id ?? undefined,
        superset_weight_a: weightANum,
        superset_reps_a: repsANum,
        superset_exercise_b_id: exerciseB?.exercise_id ?? undefined,
        superset_weight_b: weightBNum,
        superset_reps_b: repsBNum,
      });
      if (process.env.NODE_ENV !== "production") {
        console.log("[SAVE EDITS]", {
          executor: "SupersetExecutor",
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
        const setNum = editDraft.set_number;
        const next = loggedSetsList.map((s) => {
          if (s.set_number !== setNum) return s;
          const isA = s.exercise_id === exerciseA?.exercise_id;
          return {
            ...s,
            weight_kg: isA ? weightANum : weightBNum,
            reps_completed: isA ? repsANum : repsBNum,
          };
        });
        const toUpsert = next.filter((s) => s.set_number === setNum);
        toUpsert.forEach((e) => onSetEditSaved?.(liveSetEntry.setEntry.id, e));
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

  const handleLogRound = async (rowIndex: number) => {
    if (!exerciseA || !exerciseB || isLoggingSet) return;
    const row = rowsState.rows[rowIndex];
    if (!row || row.done) return;

    const weightANum = parseWeightKgInput(row.weightA);
    const repsANum = parseInt(row.repsA, 10);
    const weightBNum = parseWeightKgInput(row.weightB);
    const repsBNum = parseInt(row.repsB, 10);

    if (
      !row.weightA ||
      row.weightA.trim() === "" ||
      isNaN(weightANum) ||
      weightANum < 0 ||
      !row.repsA ||
      row.repsA.trim() === "" ||
      isNaN(repsANum) ||
      repsANum <= 0 ||
      !row.weightB ||
      row.weightB.trim() === "" ||
      isNaN(weightBNum) ||
      weightBNum < 0 ||
      !row.repsB ||
      row.repsB.trim() === "" ||
      isNaN(repsBNum) ||
      repsBNum <= 0
    ) {
      addToast({
        title: "Invalid Input",
        description: "Please enter valid weight and reps for both exercises",
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
      // Log superset as a single call with both exercises
      // Calculate set number from current state
      const setNumber = row.setNumber;

      const logData: any = {
        set_type: "superset",
        set_number: setNumber,
        isLastSet: rowsState.doneCount + 1 >= totalSets,
      };

      // Only add fields if they're defined
      if (exerciseA?.exercise_id)
        logData.superset_exercise_a_id = exerciseA.exercise_id;
      if (weightANum !== undefined && weightANum !== null)
        logData.superset_weight_a = weightANum;
      if (repsANum !== undefined && repsANum !== null)
        logData.superset_reps_a = repsANum;
      if (exerciseB?.exercise_id)
        logData.superset_exercise_b_id = exerciseB.exercise_id;
      if (weightBNum !== undefined && weightBNum !== null)
        logData.superset_weight_b = weightBNum;
      if (repsBNum !== undefined && repsBNum !== null)
        logData.superset_reps_b = repsBNum;

      const result = await logSetToDatabase(logData);

      if (result.success) {
        const setLogId =
          (result as { set_log_id?: string }).set_log_id ??
          `temp-${Date.now()}`;
        const newEntries: LoggedSet[] = [
          {
            id: setLogId,
            exercise_id: exerciseA.exercise_id,
            set_entry_id: liveSetEntry.setEntry.id,
            set_number: setNumber,
            weight_kg: weightANum,
            reps_completed: repsANum,
            completed_at: new Date(),
          } as LoggedSet,
          {
            id: setLogId,
            exercise_id: exerciseB.exercise_id,
            set_entry_id: liveSetEntry.setEntry.id,
            set_number: setNumber,
            weight_kg: weightBNum,
            reps_completed: repsBNum,
            completed_at: new Date(),
          } as LoggedSet,
        ];
        newEntries.forEach((e) => onSetLogUpsert?.(liveSetEntry.setEntry.id, e));
        rowsState.markDone(rowIndex, true);
        setJumpRowIndex(null);

        // Update e1RM for exercise A (API calculates e1RM for exercise A in superset)
        if (result.e1rm && onE1rmUpdate) {
          onE1rmUpdate(exerciseA.exercise_id, result.e1rm);
        }

        addToast({
          title: "Superset Logged!",
          description: `Exercise A: ${weightANum}kg × ${repsANum} reps, Exercise B: ${weightBNum}kg × ${repsBNum} reps`,
          variant: "success",
          duration: 2000,
        });

        const newCompletedSets = rowsState.doneCount + 1;
        const updatedLoggedSets = [...loggedSetsList, ...newEntries];
        if (newCompletedSets < totalSets) {
          onLastSetLoggedForRest?.({
            weight: weightANum,
            reps: repsANum,
            setNumber: setNumber,
            totalSets,
            isPr: result.isNewPR,
          });
        }
        onSetComplete?.(newCompletedSets);

        // Complete block if last set
        if (newCompletedSets >= totalSets) {
          onSetEntryComplete(liveSetEntry.setEntry.id, updatedLoggedSets);
        }
      } else {
        addToast({
          title: "Failed to Save",
          description: "Failed to save sets. Please try again.",
          variant: "destructive",
          duration: 5000,
        });
      }
    } finally {
      setIsLoggingSet(false);
    }
  };

  const firstIncompleteIndex = rowsState.rows.findIndex((r) => !r.done);
  const activeRowIndex =
    jumpRowIndex != null &&
    jumpRowIndex >= 0 &&
    rowsState.rows[jumpRowIndex] &&
    !rowsState.rows[jumpRowIndex].done
      ? jumpRowIndex
      : firstIncompleteIndex;
  const activeSetNumber = Math.min(
    Math.max(1, (activeRowIndex >= 0 ? activeRowIndex : rowsState.doneCount - 1) + 1),
    totalSets,
  );
  const [confirmedA, setConfirmedA] = useState(false);
  const [confirmedB, setConfirmedB] = useState(false);
  useEffect(() => {
    setConfirmedA(false);
    setConfirmedB(false);
  }, [activeRowIndex, liveSetEntry.setEntry.id]);

  const confirmExercise = async (which: "a" | "b") => {
    if (activeRowIndex < 0 || isLoggingSet) return;
    const row = rowsState.rows[activeRowIndex];
    if (!row || row.done) return;

    if (which === "a") {
      const w = parseWeightKgInput(row.weightA);
      const r = parseInt(row.repsA, 10);
      if (
        !row.weightA.trim() ||
        isNaN(w) ||
        w < 0 ||
        !row.repsA.trim() ||
        isNaN(r) ||
        r <= 0
      ) {
        addToast({
          title: "Invalid Input",
          description: "Enter valid weight and reps for exercise A",
          variant: "destructive",
          duration: 3000,
        });
        return;
      }
      const nextB = confirmedB;
      setConfirmedA(true);
      if (nextB) await handleLogRound(activeRowIndex);
      return;
    }

    const w = parseWeightKgInput(row.weightB);
    const r = parseInt(row.repsB, 10);
    if (
      !row.weightB.trim() ||
      isNaN(w) ||
      w < 0 ||
      !row.repsB.trim() ||
      isNaN(r) ||
      r <= 0
    ) {
      addToast({
        title: "Invalid Input",
        description: "Enter valid weight and reps for exercise B",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    const nextA = confirmedA;
    setConfirmedB(true);
    if (nextA) await handleLogRound(activeRowIndex);
  };

  const updateSetRpe = useUpdateSetRpe({
    setEntryId: liveSetEntry.setEntry.id,
    onSetLogUpsert,
  });
  const loggedSetRows: LoggedSetRow[] = setNumbersLogged.map((setNum) => {
    const forSet = loggedSetsList.filter((s) => s.set_number === setNum);
    const entryA =
      forSet.find((s) => s.exercise_id === exerciseA?.exercise_id) || forSet[0];
    const entryB =
      forSet.find((s) => s.exercise_id === exerciseB?.exercise_id) || forSet[1];
    const label = `Set ${setNum}: A ${entryA?.weight_kg ?? "—"}×${entryA?.reps_completed ?? "—"}${entryB ? `, B ${entryB.weight_kg ?? "—"}×${entryB.reps_completed ?? "—"}` : ""}`;
    const representative = entryA ?? forSet[0];
    return {
      id: `set-${setNum}`,
      title: label,
      rpe: representative?.rpe ?? null,
      onEffortChange: (rpe) => {
        if (representative) updateSetRpe(representative, rpe);
      },
      disabled: !representative || representative.id.startsWith("temp-"),
      menu: allowSetEditDelete && forSet[0] ? (
        <button
          type="button"
          onClick={() => handleEditSet(forSet[0])}
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

  const activeRow =
    activeRowIndex >= 0 ? rowsState.rows[activeRowIndex] : null;
  const targetsAActive = resolveSetPrescriptionTargets(
    exerciseA,
    activeSetNumber,
    liveSetEntry.setEntry.reps_per_set,
  );
  const targetsBActive = resolveSetPrescriptionTargets(
    exerciseB,
    activeSetNumber,
    liveSetEntry.setEntry.reps_per_set,
  );
  const loggedValA = activeRow
    ? (formatLiveLast(activeRow.repsA, activeRow.weightA) ?? undefined)
    : undefined;
  const loggedValB = activeRow
    ? (formatLiveLast(activeRow.repsB, activeRow.weightB) ?? undefined)
    : undefined;

  const hintForExercise = (
    exercise: typeof exerciseA,
    targets: ReturnType<typeof resolveSetPrescriptionTargets>,
  ) => {
    const lastDetail =
      exercise?.exercise_id && previousPerformanceMap
        ? previousPerformanceMap
            .get(exercise.exercise_id)
            ?.lastWorkout?.setDetails?.find(
              (s) => Number(s.set_number) === activeSetNumber,
            )
        : null;
    const lastHint = formatLiveLast(
      lastDetail?.reps_completed ?? null,
      lastDetail?.weight_kg ?? null,
    );
    const tempoHint =
      targets.tempo && String(targets.tempo).trim()
        ? `Tempo ${String(targets.tempo).trim()}`
        : null;
    return [tempoHint, lastHint ? `Last ${lastHint}` : null]
      .filter(Boolean)
      .join(" · ");
  };
  const hintA = hintForExercise(exerciseA, targetsAActive);
  const hintB = hintForExercise(exerciseB, targetsBActive);

  const nudgeWeight = (
    index: number,
    key: "weightA" | "weightB",
    delta: number,
  ) => {
    rowsState.setRow(index, (current) => {
      const cur = parseWeightKgInput(current[key] || "0");
      const next = Math.max(0, (isNaN(cur) ? 0 : cur) + delta);
      return { ...current, [key]: String(Math.round(next * 2) / 2) };
    });
  };
  const nudgeReps = (
    index: number,
    key: "repsA" | "repsB",
    delta: number,
  ) => {
    rowsState.setRow(index, (current) => {
      const cur = parseInt(current[key] || "0", 10);
      const next = Math.max(0, (isNaN(cur) ? 0 : cur) + delta);
      return { ...current, [key]: String(next) };
    });
  };

  const fillRemainingTargets = () => {
    rowsState.fillRemaining((index, prev) => {
      const setNumber = index + 1;
      const targetsA = resolveSetPrescriptionTargets(
        exerciseA,
        setNumber,
        liveSetEntry.setEntry.reps_per_set,
      );
      const targetsB = resolveSetPrescriptionTargets(
        exerciseB,
        setNumber,
        liveSetEntry.setEntry.reps_per_set,
      );
      const { numericDefault: repsDefaultA } = parseRepsTarget(targetsA.reps);
      const { numericDefault: repsDefaultB } = parseRepsTarget(targetsB.reps);
      return {
        weightA: resolveSetRowWeightDefault({
          setNumber,
          previousRowWeight: index > 0 ? prev?.weightA : undefined,
          lastSessionSetDetails: lastSessionSetsA,
          defaultWeight: resultA.default_weight,
          suggestedWeight: weightFallbackA,
          prescribedWeightKg: targetsA.weight_kg,
        }),
        repsA: repsDefaultA > 0 ? String(repsDefaultA) : (prev?.repsA ?? ""),
        weightB: resolveSetRowWeightDefault({
          setNumber,
          previousRowWeight: index > 0 ? prev?.weightB : undefined,
          lastSessionSetDetails: lastSessionSetsB,
          defaultWeight: resultB.default_weight,
          suggestedWeight: weightFallbackB,
          prescribedWeightKg: targetsB.weight_kg,
        }),
        repsB: repsDefaultB > 0 ? String(repsDefaultB) : (prev?.repsB ?? ""),
      };
    });
  };

  const formatRoundSummary = (
    row: (typeof rowsState.rows)[number],
    opts: { done: boolean },
  ) => {
    const badgeA = groupExerciseBadge(
      currentSetEntryIndex,
      exerciseA?.exercise_order,
      0,
    );
    const badgeB = groupExerciseBadge(
      currentSetEntryIndex,
      exerciseB?.exercise_order,
      1,
    );
    if (opts.done) {
      const forRound = (loggedSets ?? []).filter(
        (s) => Number(s.set_number) === row.setNumber,
      );
      return (
        <>
          <span className={setUnitStyles.sxMuted}>{badgeA}</span>{" "}
          {row.repsA || "—"}×
          <span className={setUnitStyles.sxAccent}>{row.weightA || "—"}</span>
          {" · "}
          <span className={setUnitStyles.sxMuted}>{badgeB}</span>{" "}
          {row.repsB || "—"}×
          <span className={setUnitStyles.sxAccent}>{row.weightB || "—"}</span>
          <LoggedEffortInline rpe={forRound[0]?.rpe ?? null} />
        </>
      );
    }
    const setNumber = row.setNumber;
    const tA = resolveSetPrescriptionTargets(
      exerciseA,
      setNumber,
      liveSetEntry.setEntry.reps_per_set,
    );
    const tB = resolveSetPrescriptionTargets(
      exerciseB,
      setNumber,
      liveSetEntry.setEntry.reps_per_set,
    );
    return (
      <span className={setUnitStyles.sxMuted}>
        {badgeA} {tA.reps ?? "—"}×{tA.weight_kg ?? "—"} · {badgeB}{" "}
        {tB.reps ?? "—"}×
        {tB.weight_kg ?? "—"}
      </span>
    );
  };

  const isEditMode = !!editingSetId && !!editDraft;
  const chrome = useWorkoutExecutionChrome();
  const hideCompactBack = chrome?.hideCompactBack ?? false;
  const totalSetEntries = allSetEntries.length || 1;
  const canGoPrevious = currentSetEntryIndex > 0;
  const canGoNext = currentSetEntryIndex < totalSetEntries - 1;
  const prevA =
    exerciseA?.exercise_id && previousPerformanceMap
      ? (previousPerformanceMap.get(exerciseA.exercise_id) ?? null)
      : null;
  const lastWorkoutForLastWeek = prevA?.lastWorkout ?? null;
  const glueRest = formatLiveRest(restSec) ?? "—";
  const lastBadge = groupExerciseBadge(
    currentSetEntryIndex,
    exerciseB?.exercise_order,
    1,
  );
  const liveRest = useLiveRestTimer();
  const isCardResting = Boolean(liveRest?.isResting);

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
            status={
              rowsState.doneCount >= totalSets ? "complete" : "logging"
            }
            restGlue="none"
          >
            <div className="flex items-start justify-end gap-2 px-[18px] pt-1">
              {titleExercise ? (
                <ExerciseActionButtons
                  exercise={titleExercise}
                  onVideoClick={onVideoClick}
                  onAlternativesClick={onAlternativesClick}
                />
              ) : null}
            </div>

            {rowsState.rows
              .filter((row) => row.done)
              .map((row) => (
                <SetUnitRow
                  key={`done-${row.setNumber}`}
                  label={`Set ${row.setNumber}`}
                  done
                  summary={formatRoundSummary(row, { done: true })}
                />
              ))}

            {activeRow && activeRowIndex >= 0 ? (
              <>
                <LiveCardGroupedExercise
                  badge={groupExerciseBadge(
                    currentSetEntryIndex,
                    exerciseA?.exercise_order,
                    0,
                  )}
                  name={exerciseA?.exercise?.name || "Exercise A"}
                  target={targetsToLiveCardTarget(targetsAActive)}
                  effort={effortFromPrescribedRir(targetsAActive.rir)}
                  loadPct={exerciseA?.load_percentage}
                  note={exerciseA?.notes}
                  hint={hintA || null}
                  logged={confirmedA}
                  loggedValue={loggedValA}
                  logSlot={
                    !confirmedA ? (
                      <>
                        <LiveCardLogField
                          label="Weight"
                          value={activeRow.weightA}
                          onChange={(value) =>
                            rowsState.setRow(activeRowIndex, (c) => ({
                              ...c,
                              weightA: value,
                            }))
                          }
                          onIncrement={() =>
                            nudgeWeight(activeRowIndex, "weightA", 2.5)
                          }
                          onDecrement={() =>
                            nudgeWeight(activeRowIndex, "weightA", -2.5)
                          }
                        />
                        <LiveCardLogField
                          label="Reps"
                          value={activeRow.repsA}
                          onChange={(value) =>
                            rowsState.setRow(activeRowIndex, (c) => ({
                              ...c,
                              repsA: value,
                            }))
                          }
                          onIncrement={() =>
                            nudgeReps(activeRowIndex, "repsA", 1)
                          }
                          onDecrement={() =>
                            nudgeReps(activeRowIndex, "repsA", -1)
                          }
                        />
                        <LiveCardLogButton
                          variant="compact"
                          disabled={isLoggingSet}
                          onClick={() => void confirmExercise("a")}
                        />
                      </>
                    ) : undefined
                  }
                />
                <LiveCardGroupedExercise
                  badge={groupExerciseBadge(
                    currentSetEntryIndex,
                    exerciseB?.exercise_order,
                    1,
                  )}
                  name={exerciseB?.exercise?.name || "Exercise B"}
                  target={targetsToLiveCardTarget(targetsBActive)}
                  effort={effortFromPrescribedRir(targetsBActive.rir)}
                  loadPct={exerciseB?.load_percentage}
                  note={exerciseB?.notes}
                  hint={hintB || null}
                  logged={confirmedB}
                  loggedValue={loggedValB}
                  logSlot={
                    !confirmedB ? (
                      <>
                        <LiveCardLogField
                          label="Weight"
                          value={activeRow.weightB}
                          onChange={(value) =>
                            rowsState.setRow(activeRowIndex, (c) => ({
                              ...c,
                              weightB: value,
                            }))
                          }
                          onIncrement={() =>
                            nudgeWeight(activeRowIndex, "weightB", 2.5)
                          }
                          onDecrement={() =>
                            nudgeWeight(activeRowIndex, "weightB", -2.5)
                          }
                        />
                        <LiveCardLogField
                          label="Reps"
                          value={activeRow.repsB}
                          onChange={(value) =>
                            rowsState.setRow(activeRowIndex, (c) => ({
                              ...c,
                              repsB: value,
                            }))
                          }
                          onIncrement={() =>
                            nudgeReps(activeRowIndex, "repsB", 1)
                          }
                          onDecrement={() =>
                            nudgeReps(activeRowIndex, "repsB", -1)
                          }
                        />
                        <LiveCardLogButton
                          variant="compact"
                          disabled={isLoggingSet}
                          onClick={() => void confirmExercise("b")}
                        />
                      </>
                    ) : undefined
                  }
                />
              </>
            ) : null}

            <LiveCardGlue
              resting={isCardResting}
              timer={isCardResting ? liveRest?.countdownLabel : undefined}
            >
              {isCardResting
                ? `↺ resting — Set ${liveRest?.nextSetNumber ?? "—"} next`
                : `↓ \u00a0back to back · rest ${glueRest} after ${lastBadge}`}
            </LiveCardGlue>

            {rowsState.rows
              .filter((row) => !row.done && row.setNumber !== activeRow?.setNumber)
              .map((row) => (
                <SetUnitRow
                  key={`upcoming-${row.setNumber}`}
                  label={`Set ${row.setNumber}`}
                  summary={formatRoundSummary(row, { done: false })}
                  onSelect={() =>
                    setJumpRowIndex(
                      rowsState.rows.findIndex((r) => r.setNumber === row.setNumber),
                    )
                  }
                />
              ))}

            {rowsState.doneCount < totalSets ? (
              <button
                type="button"
                onClick={fillRemainingTargets}
                className="mx-[18px] mb-2 self-start text-[10px] font-semibold uppercase tracking-wide text-[color:var(--fc-text-subtle)] hover:text-[color:var(--fc-accent)]"
              >
                Prefill remaining targets
              </button>
            ) : null}

            {isEditMode ? (
              <LiveCardLog>
                <div className="mt-3 flex gap-2 w-full">
                  <Button
                    variant="outline"
                    onClick={handleCancelEdit}
                    className="flex-1 h-12 text-base font-semibold rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveEdit}
                    disabled={isSavingEdit || !editDraft}
                    variant="fc-primary"
                    className="flex-1 h-12 text-base font-bold uppercase tracking-wider rounded-xl"
                  >
                    {isSavingEdit ? "Saving…" : "Save edits"}
                  </Button>
                </div>
              </LiveCardLog>
            ) : null}
          </LiveCard>

          {prevA?.lastWorkout != null ||
          progressionSuggestionsMap?.get(exerciseA?.exercise_id ?? "") ? (
            <div className="mx-4">
              <ProgressionNudge
                suggestion={
                  progressionSuggestionsMap?.get(
                    exerciseA?.exercise_id ?? "",
                  ) ?? null
                }
                previousPerformance={prevA}
                previousSessionSetNumber={activeSetNumber}
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
        <LastSessionSetsSection lastWorkout={lastWorkoutForLastWeek} />
      </div>
    </>
  );
}
