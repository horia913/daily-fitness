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
  effortFromPrescribedRpe,
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

interface GiantSetRow {
  setNumber: number;
  weights: string[];
  reps: string[];
  done: boolean;
}

export function GiantSetExecutor({
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
  const exercises = liveSetEntry.setEntry.exercises || [];
  const totalSets = liveSetEntry.setEntry.total_sets || 1;
  const completedSets = liveSetEntry.completedSets || 0;
  const currentSetNumber = completedSets + 1;

  /** Parent-owned logged sets; single source of truth. Persists across block navigation. */
  const loggedSetsList = loggedSets ?? [];

  const [weights, setWeights] = useState<string[]>([]);
  const [reps, setReps] = useState<string[]>([]);
  const [isLoggingSet, setIsLoggingSet] = useState(false);
  /** Tap-to-jump: override first-incomplete when client picks an upcoming round */
  const [jumpRowIndex, setJumpRowIndex] = useState<number | null>(null);
  useLoggingReset(isLoggingSet, setIsLoggingSet);
  const [weightsPristine, setWeightsPristine] = useState<boolean[]>([]);
  const [viewingSetIndex, setViewingSetIndex] = useState(0);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    round_number: number;
    weights: string[];
    reps: string[];
  } | null>(null);

  const loggedSetsRef = useRef<LoggedSet[]>(loggedSetsList);
  useEffect(() => {
    loggedSetsRef.current = loggedSetsList;
  }, [loggedSetsList]);

  const displaySetNumber =
    editingSetId && editDraft?.round_number != null
      ? editDraft.round_number
      : viewingSetIndex >= 1
        ? viewingSetIndex
        : Math.min(currentSetNumber, totalSets);

  useEffect(() => {
    if (!registerSetLogIdResolved) return;
    registerSetLogIdResolved((set_log_id: string) => {
      const list = loggedSetsRef.current;
      const tempEntries = list.filter((s) => s.id.startsWith("temp-"));
      if (tempEntries.length === 0) return;
      const tempId = tempEntries[0].id;
      tempEntries.forEach((oldEntry) => {
        const newEntry = { ...oldEntry, id: set_log_id };
        onSetLogUpsert?.(liveSetEntry.setEntry.id, newEntry, { replaceId: tempId });
      });
    });
    return () => {};
  }, [registerSetLogIdResolved, onSetLogUpsert, liveSetEntry.setEntry.id]);
  useEffect(() => {
    if (viewingSetIndex > loggedSetsList.length)
      setViewingSetIndex(loggedSetsList.length);
  }, [loggedSetsList.length, viewingSetIndex]);
  useEffect(() => {
    if (viewingSetIndex >= 1 && exercises.length > 0) {
      const forRound = loggedSetsList.filter(
        (s) => s.set_number === viewingSetIndex,
      );
      const nextWeights = [...weights];
      const nextReps = [...reps];
      exercises.forEach((ex, idx) => {
        const entry =
          forRound.find((s) => s.exercise_id === ex.exercise_id) ??
          forRound[idx];
        if (entry) {
          if (nextWeights.length <= idx)
            nextWeights.push(String(entry.weight_kg ?? ""));
          else nextWeights[idx] = String(entry.weight_kg ?? "");
          if (nextReps.length <= idx)
            nextReps.push(String(entry.reps_completed ?? ""));
          else nextReps[idx] = String(entry.reps_completed ?? "");
        }
      });
      setWeights(
        nextWeights.length ? nextWeights : new Array(exercises.length).fill(""),
      );
      setReps(
        nextReps.length ? nextReps : new Array(exercises.length).fill(""),
      );
    }
  }, [viewingSetIndex, loggedSetsList, exercises]);

  const results = exercises.map((ex) =>
    getWeightDefaultAndSuggestion({
      sessionStickyWeight: ex.exercise_id
        ? (lastPerformedWeightByExerciseId[ex.exercise_id] ?? null)
        : null,
      lastSessionWeight: ex.exercise_id
        ? (lastSessionWeightByExerciseId[ex.exercise_id] ?? null)
        : null,
      loadPercentage: ex.load_percentage ?? null,
      e1rm: ex.exercise_id ? (e1rmMap[ex.exercise_id] ?? null) : null,
    }),
  );

  useEffect(() => {
    if (exercises.length > 0) {
      setWeightsPristine(new Array(exercises.length).fill(true));
    }
  }, [completedSets, exercises.length]);

  const isViewingLoggedSet = viewingSetIndex >= 1;
  useEffect(() => {
    if (exercises.length === 0 || isViewingLoggedSet) return;
    if (editingSetId) return;
    const nextWeights: string[] =
      weights.length !== exercises.length ? [] : [...weights];
    for (let idx = 0; idx < exercises.length; idx++) {
      if (weightsPristine[idx] !== false) {
        const r = results[idx];
        const val =
          r?.default_weight != null && r.default_weight > 0
            ? String(r.default_weight)
            : "";
        if (nextWeights.length <= idx) nextWeights.push(val);
        else if (nextWeights[idx] !== val) nextWeights[idx] = val;
      } else if (nextWeights.length <= idx) {
        nextWeights.push("");
      }
    }
    if (
      nextWeights.length !== weights.length ||
      nextWeights.some((w, i) => weights[i] !== w)
    ) {
      setWeights(
        nextWeights.length ? nextWeights : new Array(exercises.length).fill(""),
      );
    }
  }, [
    exercises.length,
    completedSets,
    isViewingLoggedSet,
    editingSetId,
    lastPerformedWeightByExerciseId,
    lastSessionWeightByExerciseId,
    e1rmMap,
    weightsPristine,
  ]);

  const exerciseRepSig = exercises
    .map((e) => `${e.exercise_id}:${e.reps ?? ""}`)
    .join("|");

  useEffect(() => {
    if (viewingSetIndex >= 1) return;
    if (editingSetId) return;
    if (exercises.length === 0) return;
    const nextReps = exercises.map((ex) => {
      const { numericDefault } = parseRepsTarget(
        ex.reps ?? liveSetEntry.setEntry.reps_per_set ?? null,
      );
      return numericDefault > 0 ? String(numericDefault) : "";
    });
    setReps(nextReps);
  }, [
    viewingSetIndex,
    editingSetId,
    completedSets,
    exercises.length,
    exerciseRepSig,
    liveSetEntry.setEntry.reps_per_set,
  ]);

  const titleExercise =
    exercises[currentExerciseIndex ?? 0] ?? exercises[0];

  const restSec = resolveRestSeconds(liveSetEntry.setEntry.rest_seconds);

  const instructions = liveSetEntry.setEntry.set_notes || undefined;

  const roundNumbersLogged = [
    ...new Set(loggedSetsList.map((s) => s.set_number)),
  ].sort((a, b) => a - b);
  const exerciseWeightMeta = exercises.map((exercise, exIdx) => {
    const coachSuggested = getCoachSuggestedWeight(
      exercise.load_percentage,
      exercise.exercise_id ? (e1rmMap[exercise.exercise_id] ?? null) : null,
    );
    const result = results[exIdx];
    return {
      lastSessionSetDetails:
        exercise.exercise_id && previousPerformanceMap
          ? (previousPerformanceMap.get(exercise.exercise_id)?.lastWorkout
              ?.setDetails ?? null)
          : null,
      defaultWeight: result?.default_weight ?? null,
      suggestedWeight:
        coachSuggested != null && coachSuggested > 0
          ? coachSuggested
          : (result?.suggested_weight ?? null),
    };
  });

  const rowsState = useSetRowsState<GiantSetRow>({
    rowCount: totalSets,
    // Structural only — sticky/suggested weight must NOT be in resetKey (wipes done flags).
    resetKey: `${liveSetEntry.setEntry.id}:${exercises.map((e) => e.exercise_id).join(",")}`,
    loggedCount: roundNumbersLogged.length,
    createDefaultRow: (index, previous) => ({
      setNumber: index + 1,
      weights: exercises.map((exercise, exIdx) => {
        const targets = resolveSetPrescriptionTargets(
          exercise,
          index + 1,
          liveSetEntry.setEntry.reps_per_set,
        );
        return resolveSetRowWeightDefault({
          setNumber: index + 1,
          previousRowWeight: index > 0 ? previous?.weights?.[exIdx] : undefined,
          lastSessionSetDetails: exerciseWeightMeta[exIdx]?.lastSessionSetDetails,
          defaultWeight: exerciseWeightMeta[exIdx]?.defaultWeight ?? null,
          suggestedWeight: exerciseWeightMeta[exIdx]?.suggestedWeight ?? null,
          prescribedWeightKg: targets.weight_kg,
        });
      }),
      reps: exercises.map((exercise, exIdx) => {
        const targets = resolveSetPrescriptionTargets(
          exercise,
          index + 1,
          liveSetEntry.setEntry.reps_per_set,
        );
        const { numericDefault } = parseRepsTarget(targets.reps);
        if (numericDefault > 0) return String(numericDefault);
        return previous?.reps?.[exIdx] ?? "";
      }),
      done: false,
    }),
  });

  const maxViewableRound =
    roundNumbersLogged.length === 0 ? 0 : Math.max(...roundNumbersLogged);

  const handleUpdateViewedSet = async () => {
    if (viewingSetIndex < 1) return;
    const forRound = loggedSetsList.filter(
      (s) => s.set_number === viewingSetIndex,
    );
    const firstId = forRound[0]?.id;
    if (!firstId || firstId.startsWith("temp-")) return;
    const giantSetExercises = exercises
      .map((ex, idx) => {
        const w = parseWeightKgInput(weights[idx] || "0");
        const r = parseInt(reps[idx] || "0", 10);
        if (!ex?.exercise_id || isNaN(w) || isNaN(r)) return null;
        return {
          exercise_id: ex.exercise_id,
          weight: w,
          reps: r,
          order: idx + 1,
        };
      })
      .filter(Boolean);
    if (giantSetExercises.length === 0) return;
    setIsSavingEdit(true);
    try {
      const payload = buildSetEditPatchPayload(liveSetEntry.setEntry.set_type, {
        round_number: viewingSetIndex,
        giant_set_exercises: giantSetExercises,
      });
      const res = await fetchApi(`/api/sets/${firstId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      if (res?.ok) {
        const next = loggedSetsList.map((s) => {
          if (s.set_number !== viewingSetIndex) return s;
          const idx = exercises.findIndex(
            (e) => e.exercise_id === s.exercise_id,
          );
          if (idx < 0) return s;
          const w = parseWeightKgInput(weights[idx] || "0");
          const r = parseInt(reps[idx] || "0", 10);
          return { ...s, weight_kg: w, reps_completed: r };
        });
        const toUpsert = next.filter((s) => s.set_number === viewingSetIndex);
        toUpsert.forEach((e) => onSetEditSaved?.(liveSetEntry.setEntry.id, e));
        addToast({
          title: "Round updated",
          variant: "success",
          duration: 2000,
        });
      } else {
        addToast({
          title: "Failed to update round",
          variant: "destructive",
          duration: 3000,
        });
      }
    } finally {
      setIsSavingEdit(false);
    }
  };

  /** Enter edit mode for this round. Populates editDraft with round_number and weights/reps from the round. */
  const handleEditSet = (setEntry: LoggedSet) => {
    const roundNum = setEntry.set_number ?? 1;
    const forRound = loggedSetsList.filter((s) => s.set_number === roundNum);
    const draftWeights = exercises.map((ex, idx) =>
      String(
        (
          forRound.find((s) => s.exercise_id === ex.exercise_id) ??
          forRound[idx]
        )?.weight_kg ?? "",
      ),
    );
    const draftReps = exercises.map((ex, idx) =>
      String(
        (
          forRound.find((s) => s.exercise_id === ex.exercise_id) ??
          forRound[idx]
        )?.reps_completed ?? "",
      ),
    );
    setEditingSetId(forRound[0]?.id ?? setEntry.id);
    setEditDraft({
      round_number: roundNum,
      weights: draftWeights,
      reps: draftReps,
    });
  };

  /** Cancel edit mode. */
  const handleCancelEdit = () => {
    setEditingSetId(null);
    setEditDraft(null);
  };

  /** Save edits: PATCH round with editDraft data, then exit edit mode. */
  const handleSaveEdit = async () => {
    if (!editingSetId || !editDraft) return;
    if (editingSetId.startsWith("temp-")) {
      if (process.env.NODE_ENV !== "production") {
        console.log("[SAVE EDITS guard]", {
          executor: "GiantSetExecutor",
          blockTypeFromUI: liveSetEntry.setEntry.set_type,
          editingSetId,
          isSavingEdit,
          timestamp: Date.now(),
        });
      }
      addToast({
        title: "Round still saving",
        description: "Try again in a moment.",
        variant: "default",
        duration: 2000,
      });
      return;
    }
    const giantSetExercises = exercises
      .map((ex, idx) => {
        const w = parseWeightKgInput(editDraft.weights[idx] || "0");
        const r = parseInt(editDraft.reps[idx] || "0", 10);
        if (!ex?.exercise_id || isNaN(w) || isNaN(r)) return null;
        return {
          exercise_id: ex.exercise_id,
          weight: w,
          reps: r,
          order: idx + 1,
        };
      })
      .filter(Boolean);
    if (giantSetExercises.length === 0) return;
    setIsSavingEdit(true);
    try {
      const payload = buildSetEditPatchPayload(liveSetEntry.setEntry.set_type, {
        round_number: editDraft.round_number,
        giant_set_exercises: giantSetExercises,
      });
      if (process.env.NODE_ENV !== "production") {
        console.log("[SAVE EDITS]", {
          executor: "GiantSetExecutor",
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
        const next = loggedSetsList.map((s) => {
          if (s.set_number !== editDraft.round_number) return s;
          const idx = exercises.findIndex(
            (e) => e.exercise_id === s.exercise_id,
          );
          const w = parseWeightKgInput(editDraft.weights[idx] || "0");
          const r = parseInt(editDraft.reps[idx] || "0", 10);
          return { ...s, weight_kg: w, reps_completed: r };
        });
        const toUpsert = next.filter(
          (s) => s.set_number === editDraft.round_number,
        );
        toUpsert.forEach((e) => onSetEditSaved?.(liveSetEntry.setEntry.id, e));
        setEditingSetId(null);
        setEditDraft(null);
        addToast({
          title: "Round updated",
          variant: "success",
          duration: 2000,
        });
      } else {
        addToast({
          title: "Failed to update round",
          variant: "destructive",
          duration: 3000,
        });
      }
    } catch {
      addToast({
        title: "Failed to update round",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleLogRound = async (rowIndex: number) => {
    if (exercises.length === 0 || isLoggingSet) return;
    const row = rowsState.rows[rowIndex];
    if (!row || row.done) return;

    const allValid = exercises.every((_, idx) => {
      const weightStr = row.weights[idx];
      const repsStr = row.reps[idx];

      // Check weight: must be entered (not empty or undefined), valid number, and >= 0
      // Allow "0" as a valid weight value
      if (
        weightStr === undefined ||
        weightStr === null ||
        String(weightStr).trim() === ""
      ) {
        console.log(`GiantSet: Exercise ${idx} weight invalid:`, weightStr);
        return false;
      }
      const weight = parseWeightKgInput(String(weightStr));
      if (isNaN(weight) || weight < 0) {
        console.log(
          `GiantSet: Exercise ${idx} weight parse failed:`,
          weightStr,
          weight,
        );
        return false;
      }

      // Check reps: must be entered (not empty or undefined), valid number, and > 0
      if (
        repsStr === undefined ||
        repsStr === null ||
        String(repsStr).trim() === ""
      ) {
        console.log(`GiantSet: Exercise ${idx} reps invalid:`, repsStr);
        return false;
      }
      const repsNum = parseInt(String(repsStr));
      if (isNaN(repsNum) || repsNum <= 0) {
        console.log(
          `GiantSet: Exercise ${idx} reps parse failed:`,
          repsStr,
          repsNum,
        );
        return false;
      }

      return true;
    });

    if (!allValid) {
      addToast({
        title: "Invalid Input",
        description: "Please enter valid weight and reps for all exercises",
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
      // Build giant_set_exercises array - only include valid exercises
      const giantSetExercises = exercises
        .map((exercise, idx) => {
          const weightNum = parseWeightKgInput(row.weights[idx] || "0");
          const repsNum = parseInt(row.reps[idx] || "0", 10);
          if (!exercise?.exercise_id || isNaN(weightNum) || isNaN(repsNum)) {
            return null;
          }
          return {
            exercise_id: exercise.exercise_id,
            weight: weightNum,
            reps: repsNum,
            order: idx + 1,
          };
        })
        .filter(Boolean);

      // Log giant set as a single call
      const logData: any = {
        set_type: "giant_set",
        round_number: row.setNumber,
        isLastSet: rowsState.doneCount + 1 >= totalSets,
      };

      if (giantSetExercises.length > 0) {
        logData.giant_set_exercises = giantSetExercises;
      }

      const result = await logSetToDatabase(logData);

      const setLogId =
        (result as { set_log_id?: string }).set_log_id ?? `temp-${Date.now()}`;
      const roundNumber = row.setNumber;
      const newEntries: LoggedSet[] = exercises.map(
        (exercise, idx) =>
          ({
            id: setLogId,
            exercise_id: exercise.exercise_id,
            set_entry_id: liveSetEntry.setEntry.id,
            set_number: roundNumber,
            weight_kg: parseWeightKgInput(row.weights[idx] || "0"),
            reps_completed: parseInt(row.reps[idx] || "0", 10),
            completed_at: new Date(),
          }) as LoggedSet,
      );

      if (result.success) {
        newEntries.forEach((e) => onSetLogUpsert?.(liveSetEntry.setEntry.id, e));
        rowsState.markDone(rowIndex, true);
        setJumpRowIndex(null);

        addToast({
          title: "Giant Set Logged!",
          description: `${exercises.length} exercises completed`,
          variant: "success",
          duration: 2000,
        });

        const newCompletedSets = rowsState.doneCount + 1;
        const updatedLoggedSets = [...loggedSetsList, ...newEntries];
        if (newCompletedSets < totalSets) {
          const firstWeight = parseWeightKgInput(row.weights[0] || "0");
          const firstReps = parseInt(row.reps[0] || "0", 10);
          onLastSetLoggedForRest?.({
            weight: firstWeight,
            reps: firstReps,
            setNumber: roundNumber,
            totalSets,
            isPr: result.isNewPR,
          });
        }
        onSetComplete?.(newCompletedSets);

        if (newCompletedSets >= totalSets) {
          onSetEntryComplete(liveSetEntry.setEntry.id, updatedLoggedSets);
        }
      } else {
        addToast({
          title: "Failed to Save",
          description: "Some exercises failed to save. Please try again.",
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
    Math.max(
      1,
      (activeRowIndex >= 0 ? activeRowIndex : rowsState.doneCount - 1) + 1,
    ),
    totalSets,
  );
  const [confirmed, setConfirmed] = useState<boolean[]>(() =>
    exercises.map(() => false),
  );
  useEffect(() => {
    setConfirmed(exercises.map(() => false));
  }, [activeRowIndex, liveSetEntry.setEntry.id, exercises.length]);

  const confirmExercise = async (exIdx: number) => {
    if (activeRowIndex < 0 || isLoggingSet) return;
    const row = rowsState.rows[activeRowIndex];
    if (!row || row.done) return;
    const weightStr = row.weights[exIdx] ?? "";
    const repsStr = row.reps[exIdx] ?? "";
    const w = parseWeightKgInput(weightStr);
    const r = parseInt(repsStr, 10);
    if (
      !weightStr.trim() ||
      isNaN(w) ||
      w < 0 ||
      !repsStr.trim() ||
      isNaN(r) ||
      r <= 0
    ) {
      addToast({
        title: "Invalid Input",
        description: `Enter valid weight and reps for exercise ${exIdx + 1}`,
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    const next = confirmed.map((c, i) => (i === exIdx ? true : c));
    setConfirmed(next);
    if (next.every(Boolean)) {
      await handleLogRound(activeRowIndex);
    }
  };

  const updateSetRpe = useUpdateSetRpe({
    setEntryId: liveSetEntry.setEntry.id,
    onSetLogUpsert,
  });
  const loggedSetRows: LoggedSetRow[] = roundNumbersLogged.map((roundNum) => {
    const forRound = loggedSetsList.filter((s) => s.set_number === roundNum);
    const label = forRound
      .sort(
        (a, b) =>
          exercises.findIndex((e) => e.exercise_id === a.exercise_id) -
          exercises.findIndex((e) => e.exercise_id === b.exercise_id),
      )
      .map((s) => `${s.weight_kg ?? "—"}×${s.reps_completed ?? "—"}`)
      .join(", ");
    const representative = forRound[0];
    return {
      id: `round-${roundNum}`,
      title: `Round ${roundNum}: ${label}`,
      rpe: representative?.rpe ?? null,
      onEffortChange: (rpe) => {
        if (representative) updateSetRpe(representative, rpe);
      },
      disabled: !representative || representative.id.startsWith("temp-"),
      onTitleClick:
        allowSetEditDelete && forRound[0]
          ? () => handleEditSet(forRound[0])
          : undefined,
      menu: allowSetEditDelete && forRound[0] ? (
        <button
          type="button"
          onClick={() => handleEditSet(forRound[0])}
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
      <LoggedSetsList rows={loggedSetRows} label="Logged rounds" />
    ) : null;

  const activeRow =
    activeRowIndex >= 0 ? rowsState.rows[activeRowIndex] : null;

  const nudgeWeight = (exIdx: number, delta: number) => {
    if (activeRowIndex < 0) return;
    rowsState.setRow(activeRowIndex, (current) => {
      const nextWeights = [...current.weights];
      const cur = parseWeightKgInput(nextWeights[exIdx] || "0");
      const next = Math.max(0, (isNaN(cur) ? 0 : cur) + delta);
      nextWeights[exIdx] = String(Math.round(next * 2) / 2);
      return { ...current, weights: nextWeights };
    });
  };
  const nudgeReps = (exIdx: number, delta: number) => {
    if (activeRowIndex < 0) return;
    rowsState.setRow(activeRowIndex, (current) => {
      const nextReps = [...current.reps];
      const cur = parseInt(nextReps[exIdx] || "0", 10);
      const next = Math.max(0, (isNaN(cur) ? 0 : cur) + delta);
      nextReps[exIdx] = String(next);
      return { ...current, reps: nextReps };
    });
  };

  const fillRemainingTargets = () => {
    rowsState.fillRemaining((index, prev) => ({
      weights: exercises.map((exercise, exIdx) => {
        const targets = resolveSetPrescriptionTargets(
          exercise,
          index + 1,
          liveSetEntry.setEntry.reps_per_set,
        );
        return resolveSetRowWeightDefault({
          setNumber: index + 1,
          previousRowWeight: index > 0 ? prev?.weights?.[exIdx] : undefined,
          lastSessionSetDetails:
            exerciseWeightMeta[exIdx]?.lastSessionSetDetails,
          defaultWeight: exerciseWeightMeta[exIdx]?.defaultWeight ?? null,
          suggestedWeight: exerciseWeightMeta[exIdx]?.suggestedWeight ?? null,
          prescribedWeightKg: targets.weight_kg,
        });
      }),
      reps: exercises.map((exercise, exIdx) => {
        const targets = resolveSetPrescriptionTargets(
          exercise,
          index + 1,
          liveSetEntry.setEntry.reps_per_set,
        );
        const { numericDefault } = parseRepsTarget(targets.reps);
        if (numericDefault > 0) return String(numericDefault);
        return prev?.reps?.[exIdx] ?? "";
      }),
    }));
  };

  const formatGiantRoundSummary = (
    row: (typeof rowsState.rows)[number],
    opts: { done: boolean },
  ) => {
    if (opts.done) {
      const forRound = loggedSetsList.filter(
        (s) => Number(s.set_number) === row.setNumber,
      );
      return (
        <>
          {exercises.map((_, exIdx) => (
            <span key={`done-sum-${exIdx}`}>
              {exIdx > 0 ? " · " : null}
              <span className={setUnitStyles.sxMuted}>
                {formatGroupedExerciseBadge(
                  currentSetEntryIndex,
                  exercises[exIdx]?.exercise_order,
                  exIdx,
                )}
              </span>{" "}
              {row.reps[exIdx] || "—"}×
              <span className={setUnitStyles.sxAccent}>
                {row.weights[exIdx] || "—"}
              </span>
            </span>
          ))}
          <LoggedEffortInline rpe={forRound[0]?.rpe ?? null} />
        </>
      );
    }
    return (
      <span className={setUnitStyles.sxMuted}>
        {exercises
          .map((exercise, exIdx) => {
            const t = resolveSetPrescriptionTargets(
              exercise,
              row.setNumber,
              liveSetEntry.setEntry.reps_per_set,
            );
            return `${formatGroupedExerciseBadge(currentSetEntryIndex, exercise.exercise_order, exIdx)} ${t.reps ?? "—"}×${t.weight_kg ?? "—"}`;
          })
          .join(" · ")}
      </span>
    );
  };

  const isEditMode = !!editingSetId && !!editDraft;
  const chrome = useWorkoutExecutionChrome();
  const hideCompactBack = chrome?.hideCompactBack ?? false;
  const totalSetEntries = allSetEntries.length || 1;
  const canGoPrevious = currentSetEntryIndex > 0;
  const canGoNext = currentSetEntryIndex < totalSetEntries - 1;
  const firstExId = exercises[0]?.exercise_id;
  const prevFirst =
    firstExId && previousPerformanceMap
      ? (previousPerformanceMap.get(firstExId) ?? null)
      : null;
  const lastWorkoutForLastWeek = prevFirst?.lastWorkout ?? null;
  const glueRest = formatLiveRest(restSec) ?? "—";
  const glueLabel =
    exercises.length >= 3
      ? `↓ \u00a0all ${exercises.length === 3 ? "three" : exercises.length} back to back · rest ${glueRest}`
      : `↓ \u00a0back to back · rest ${glueRest}`;
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
                  summary={formatGiantRoundSummary(row, { done: true })}
                />
              ))}

            {activeRow && activeRowIndex >= 0
              ? exercises.map((exercise, exIdx) => {
                  const targets = resolveSetPrescriptionTargets(
                    exercise,
                    activeSetNumber,
                    liveSetEntry.setEntry.reps_per_set,
                  );
                  const isLogged = confirmed[exIdx] === true;
                  const loggedValue =
                    formatLiveLast(
                      activeRow.reps[exIdx],
                      activeRow.weights[exIdx],
                    ) ?? undefined;
                  const lastDetail =
                    exercise.exercise_id && previousPerformanceMap
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
                  const hint = [tempoHint, lastHint ? `Last ${lastHint}` : null]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <LiveCardGroupedExercise
                      key={exercise.exercise_id ?? exIdx}
                      badge={groupExerciseBadge(
                        currentSetEntryIndex,
                        exercise.exercise_order,
                        exIdx,
                      )}
                      name={
                        exercise.exercise?.name || `Exercise ${exIdx + 1}`
                      }
                      target={targetsToLiveCardTarget(targets)}
                      effort={effortFromPrescribedRpe(targets.rpe)}
                      loadPct={exercise.load_percentage}
                      note={exercise.notes}
                      hint={hint || null}
                      logged={isLogged}
                      loggedValue={loggedValue}
                      logSlot={
                        !isLogged ? (
                          <>
                            <LiveCardLogField
                              label="Weight"
                              value={activeRow.weights[exIdx] ?? ""}
                              onChange={(value) =>
                                rowsState.setRow(activeRowIndex, (c) => {
                                  const nextWeights = [...c.weights];
                                  nextWeights[exIdx] = value;
                                  return { ...c, weights: nextWeights };
                                })
                              }
                              onIncrement={() => nudgeWeight(exIdx, 2.5)}
                              onDecrement={() => nudgeWeight(exIdx, -2.5)}
                            />
                            <LiveCardLogField
                              label="Reps"
                              value={activeRow.reps[exIdx] ?? ""}
                              onChange={(value) =>
                                rowsState.setRow(activeRowIndex, (c) => {
                                  const nextReps = [...c.reps];
                                  nextReps[exIdx] = value;
                                  return { ...c, reps: nextReps };
                                })
                              }
                              onIncrement={() => nudgeReps(exIdx, 1)}
                              onDecrement={() => nudgeReps(exIdx, -1)}
                            />
                            <LiveCardLogButton
                              variant="compact"
                              disabled={isLoggingSet}
                              onClick={() => void confirmExercise(exIdx)}
                            />
                          </>
                        ) : undefined
                      }
                    />
                  );
                })
              : null}

            <LiveCardGlue
              resting={isCardResting}
              timer={isCardResting ? liveRest?.countdownLabel : undefined}
            >
              {isCardResting
                ? `↺ resting — Set ${liveRest?.nextSetNumber ?? "—"} next`
                : glueLabel}
            </LiveCardGlue>

            {rowsState.rows
              .filter((row) => !row.done && row.setNumber !== activeRow?.setNumber)
              .map((row) => (
                <SetUnitRow
                  key={`upcoming-${row.setNumber}`}
                  label={`Set ${row.setNumber}`}
                  summary={formatGiantRoundSummary(row, { done: false })}
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

          {prevFirst?.lastWorkout != null ||
          (firstExId &&
            progressionSuggestionsMap?.get(firstExId)) ? (
            <div className="mx-4">
              <ProgressionNudge
                suggestion={
                  firstExId
                    ? (progressionSuggestionsMap?.get(firstExId) ?? null)
                    : null
                }
                previousPerformance={prevFirst}
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
