"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/toast-provider";
import { useLoggingReset } from "../hooks/useLoggingReset";
import { BaseSetEntryExecutorProps } from "../types";
import { useWorkoutExecutionChrome } from "../WorkoutExecutionChromeContext";
import { NavigationControls } from "../ui/NavigationControls";
import { ExerciseActionButtons } from "../ui/ExerciseActionButtons";
import { LastSessionSetsSection } from "../ui/LastSessionSetsSection";
import { ProgressionNudge } from "../ui/ProgressionNudge";
import { parseRepsTarget } from "@/lib/workout/parseRepsTarget";
import { LoggedSet } from "@/types/workoutSetEntries";
import {
  getWeightDefaultAndSuggestion,
  getCoachSuggestedWeight,
} from "@/lib/weightDefaultService";
import { fetchApi } from "@/lib/apiClient";
import { buildSetEditPatchPayload } from "@/lib/setEditPayload";
import { LoggedSetsList, type LoggedSetRow } from "../ui/LoggedSetsList";
import { useUpdateSetRpe } from "../hooks/useUpdateSetRpe";
import { parseWeightKgInput } from "@/lib/parseWeightKgInput";
import { useSetRowsState } from "../hooks/useSetRowsState";
import { SetUnitRow } from "../ui/set-rows/SetUnitRow";
import setUnitStyles from "../ui/set-rows/setUnitRow.module.css";
import { resolveSetRowWeightDefault } from "../ui/set-rows/resolveSetRowWeightDefault";
import { resolveSetPrescriptionTargets } from "../ui/set-rows/resolveSetPrescriptionTargets";
import {
  LiveCard,
  LiveCardExerciseName,
  LiveCardPrimary,
  LiveCardStats,
  LiveCardNote,
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
import { LoggedEffortInline } from "../ui/LoggedEffortInline";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MoreVertical, Pencil } from "lucide-react";

interface StraightSetExecutorProps extends BaseSetEntryExecutorProps {}

interface StraightSetRow {
  setNumber: number;
  weight: string;
  reps: string;
  done: boolean;
}

export function StraightSetExecutor({
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
  onSetComplete,
  onLastSetLoggedForRest,
  progressionSuggestion,
  progressionSuggestionsMap,
  previousPerformanceMap,
  registerUndo,
  allowSetEditDelete = false,
  registerSetLogIdResolved,
  onSetLogUpsert,
  onSetEditSaved,
  loggedSets,
  onWorkoutBack,
}: StraightSetExecutorProps) {
  const { addToast } = useToast();
  const currentExercise = liveSetEntry.setEntry.exercises?.[currentExerciseIndex];
  const [menuOpenSetId, setMenuOpenSetId] = useState<string | null>(null);
  /** Edit mode: set when user clicks Edit on a logged set. Non-destructive; no DB or list change until Save edits. */
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  /** Draft values for the set being edited. Only used when editingSetId is set. Cancel clears this without saving. */
  const [editDraft, setEditDraft] = useState<{
    weight: string;
    reps: string;
    set_number: number;
    rpe?: number;
  } | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  /** 0 = current set (form for logging next), 1..n = viewing logged set 1..n (same form, edit) */
  const [viewingSetIndex, setViewingSetIndex] = useState(0);
  /** Visual feedback: green flash on Log Set button (kept for future hook into LogSetButton). */
  const [showLogSuccessFlash, setShowLogSuccessFlash] = useState(false);
  // Use exercise.sets if available, otherwise fall back to block.total_sets, then default to 1
  const totalSets =
    currentExercise?.sets !== null && currentExercise?.sets !== undefined
      ? currentExercise.sets
      : liveSetEntry.setEntry.total_sets !== null && liveSetEntry.setEntry.total_sets !== undefined
        ? liveSetEntry.setEntry.total_sets
        : 1;
  const completedSets = liveSetEntry.completedSets || 0;

  /** Parent-owned logged sets; single source of truth. Persists across block navigation. */
  const loggedSetsList = loggedSets ?? [];

  // Next set to log (1-indexed); for display we cap so we never show "Set N of Y" with N > Y
  const currentSetNumber = completedSets + 1;
  const displaySetNumber =
    editingSetId && editDraft?.set_number != null
      ? editDraft.set_number
      : viewingSetIndex >= 1
        ? viewingSetIndex
        : Math.min(currentSetNumber, totalSets);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [isLoggingSet, setIsLoggingSet] = useState(false);
  /** Tap-to-jump: override first-incomplete when client picks an upcoming set */
  const [jumpRowIndex, setJumpRowIndex] = useState<number | null>(null);
  useLoggingReset(isLoggingSet, setIsLoggingSet);
  /** Pristine: apply default only when true; set false on user edit; set true when advancing to next set */
  const [isWeightPristine, setIsWeightPristine] = useState(true);

  const loggedSetsRef = React.useRef<LoggedSet[]>(loggedSetsList);
  React.useEffect(() => {
    loggedSetsRef.current = loggedSetsList;
  }, [loggedSetsList]);

  const exerciseId = currentExercise?.exercise_id ?? "";
  const sessionStickyWeight = exerciseId
    ? (lastPerformedWeightByExerciseId[exerciseId] ?? null)
    : null;
  const lastSessionWeight = exerciseId
    ? (lastSessionWeightByExerciseId[exerciseId] ?? null)
    : null;
  const loadPercentage = currentExercise?.load_percentage ?? null;
  const e1rm = exerciseId ? (e1rmMap[exerciseId] ?? null) : null;
  const { default_weight, suggested_weight } = getWeightDefaultAndSuggestion({
      sessionStickyWeight: sessionStickyWeight ?? null,
      lastSessionWeight: lastSessionWeight ?? null,
      loadPercentage,
      e1rm: e1rm ?? null,
    });
  // Coach-prescribed weight (load % × e1RM): always show "Apply suggested" when coach set % and we have e1RM
  const coachSuggestedWeight = getCoachSuggestedWeight(loadPercentage, e1rm);

  // When golden sync succeeds, replace temp id with real set_log_id in parent so Edit PATCH uses UUID
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

  // Apply truth-based default only when entering new set/exercise and pristine; never autofill e1RM/%
  useEffect(() => {
    setIsWeightPristine(true);
  }, [completedSets, currentExerciseIndex, exerciseId]);

  const prescribedRepsRaw =
    currentExercise?.reps ?? liveSetEntry.setEntry.reps_per_set ?? null;
  const { numericDefault: prescribedRepsDefault, displayHint: repsRangeHint } =
    parseRepsTarget(prescribedRepsRaw);

  const lastSessionSetDetails =
    exerciseId && previousPerformanceMap
      ? (previousPerformanceMap.get(exerciseId)?.lastWorkout?.setDetails ?? null)
      : null;
  const weightFallback =
    coachSuggestedWeight != null && coachSuggestedWeight > 0
      ? coachSuggestedWeight
      : suggested_weight;

  const rowsState = useSetRowsState<StraightSetRow>({
    rowCount: totalSets,
    // Structural only — sticky/suggested weight must NOT be in resetKey (wipes done flags).
    resetKey: `${liveSetEntry.setEntry.id}:${currentExerciseIndex}:${exerciseId}`,
    loggedCount: completedSets,
    createDefaultRow: (index, previous) => {
      const setNumber = index + 1;
      const targets = resolveSetPrescriptionTargets(
        currentExercise,
        setNumber,
        liveSetEntry.setEntry.reps_per_set,
      );
      const { numericDefault: setRepsDefault } = parseRepsTarget(targets.reps);
      return {
        setNumber,
        weight: resolveSetRowWeightDefault({
          setNumber,
          previousRowWeight: index > 0 ? previous?.weight : undefined,
          lastSessionSetDetails,
          defaultWeight: default_weight,
          suggestedWeight: weightFallback,
          prescribedWeightKg: targets.weight_kg,
        }),
        reps:
          setRepsDefault > 0
            ? String(setRepsDefault)
            : (previous?.reps ?? ""),
        done: false,
      };
    },
  });

  useEffect(() => {
    if (viewingSetIndex >= 1) return; // don't overwrite when viewing a previous set
    if (!isWeightPristine) return;
    if (default_weight != null && default_weight > 0) {
      setWeight(String(default_weight));
    } else {
      setWeight("");
    }
    setReps(
      prescribedRepsDefault > 0 ? String(prescribedRepsDefault) : "",
    );
  }, [
    viewingSetIndex,
    isWeightPristine,
    default_weight,
    prescribedRepsDefault,
    completedSets,
    currentExerciseIndex,
    exerciseId,
  ]);

  // When navigating to a logged set, show its weight/reps in the form
  useEffect(() => {
    if (viewingSetIndex >= 1 && loggedSetsList[viewingSetIndex - 1]) {
      const s = loggedSetsList[viewingSetIndex - 1];
      setWeight(String(s.weight_kg ?? ""));
      setReps(String(s.reps_completed ?? ""));
    }
  }, [viewingSetIndex, loggedSetsList]);
  useEffect(() => {
    if (viewingSetIndex > loggedSetsList.length)
      setViewingSetIndex(loggedSetsList.length);
  }, [loggedSetsList.length, viewingSetIndex]);

  /** Enter edit mode for this set. Non-destructive: no DB call, no change to Logged Sets list. */
  const handleEditSet = (setEntry: LoggedSet) => {
    setEditingSetId(setEntry.id);
    setEditDraft({
      weight: String(setEntry.weight_kg ?? ""),
      reps: String(setEntry.reps_completed ?? ""),
      set_number: setEntry.set_number ?? 1,
      rpe: setEntry.rpe != null ? Number(setEntry.rpe) : undefined,
    });
    setMenuOpenSetId(null);
  };

  /** Save edits: PATCH only. On success update matching set in local list and exit edit mode. */
  const handleSaveEdit = async () => {
    if (!editingSetId || !editDraft) return;
    if (editingSetId.startsWith("temp-")) {
      if (process.env.NODE_ENV !== "production") {
        console.log("[SAVE EDITS guard]", {
          executor: "StraightSetExecutor",
          blockTypeFromUI: liveSetEntry.setEntry.set_type,
          editingSetId,
          isSavingEdit,
          timestamp: Date.now(),
        });
      }
      addToast({
        title: "Set still saving",
        description: "Try again in a moment.",
        variant: "default",
        duration: 2000,
      });
      return;
    }
    const w = parseWeightKgInput(editDraft.weight);
    const r = parseInt(editDraft.reps, 10);
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
      const body: Record<string, unknown> = {
        weight: w,
        reps: r,
        set_number: editDraft.set_number,
      };
      if (editDraft.rpe != null) body.rpe = editDraft.rpe;
      if (process.env.NODE_ENV !== "production") {
        console.log("[SAVE EDITS]", {
          executor: "StraightSetExecutor",
          setId: editingSetId,
          blockTypeFromUI: liveSetEntry.setEntry.set_type,
          payloadKeys: Object.keys(body),
        });
      }
      const res = await fetchApi(`/api/sets/${editingSetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
          ...(editDraft.rpe != null && { rpe: editDraft.rpe }),
          completed_at: current?.completed_at ?? new Date(),
        };
        onSetEditSaved?.(liveSetEntry.setEntry.id, updatedEntry);
        setEditingSetId(null);
        setEditDraft(null);
        addToast({ title: "Set updated", variant: "success", duration: 2000 });
      } else {
        const err = await res.json().catch(() => ({}));
        if (process.env.NODE_ENV !== "production") {
          console.log("[SAVE EDITS response]", {
            executor: "StraightSetExecutor",
            status: res.status,
            body: err,
          });
        }
        addToast({
          title: "Could not update set",
          description: (err as any)?.error ?? "Try again.",
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

  /** Cancel edit mode. No server call; no change to Logged Sets list. */
  const handleCancelEdit = () => {
    setEditingSetId(null);
    setEditDraft(null);
  };

  const handleUpdateViewedSet = async () => {
    if (viewingSetIndex < 1 || !loggedSetsList[viewingSetIndex - 1]) return;
    const setEntry = loggedSetsList[viewingSetIndex - 1];
    const w = parseWeightKgInput(weight);
    const r = parseInt(reps, 10);
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
        weight: w,
        reps: r,
        set_number: setEntry.set_number ?? viewingSetIndex,
      });
      const res = await fetchApi(`/api/sets/${setEntry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updatedEntry: LoggedSet = {
          ...setEntry,
          weight_kg: w,
          reps_completed: r,
        };
        onSetEditSaved?.(liveSetEntry.setEntry.id, updatedEntry);
        addToast({ title: "Set updated", variant: "success", duration: 2000 });
      } else {
        const err = await res.json().catch(() => ({}));
        addToast({
          title: "Could not update set",
          description: (err as any)?.error ?? "Try again.",
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

  const restSec = resolveRestSeconds(
    currentExercise?.rest_seconds,
    liveSetEntry.setEntry.rest_seconds,
  );

  const firstIncompleteIndex = rowsState.rows.findIndex((r) => !r.done);
  const activeRowIndex =
    jumpRowIndex != null &&
    jumpRowIndex >= 0 &&
    rowsState.rows[jumpRowIndex] &&
    !rowsState.rows[jumpRowIndex].done
      ? jumpRowIndex
      : firstIncompleteIndex;
  const activeRow =
    activeRowIndex >= 0 ? rowsState.rows[activeRowIndex] : null;

  // Active set for Row 1 targets (jump target or first incomplete)
  const activeSetNumber = Math.min(
    Math.max(
      1,
      activeRow?.setNumber ?? rowsState.doneCount + 1,
    ),
    totalSets,
  );
  const activeTargets = resolveSetPrescriptionTargets(
    currentExercise,
    activeSetNumber,
    liveSetEntry.setEntry.reps_per_set,
  );
  const activeEffort = effortFromPrescribedRpe(activeTargets.rpe);
  const liveTarget: LiveCardTarget =
    activeTargets.weight_kg != null
      ? {
          kind: "reps_weight",
          reps: activeTargets.reps ?? "—",
          weight: activeTargets.weight_kg,
        }
      : {
          kind: "reps_only",
          reps: activeTargets.reps ?? "—",
          unit: "reps",
        };
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

  // Instructions (coach notes) — kept out of the live card shell for Phase 1
  const instructions =
    currentExercise?.notes || liveSetEntry.setEntry.set_notes || undefined;

  // Phase 3a: row-based logging, no pane advance/reset.
  const handleLogRow = async (rowIndex: number) => {
    if (!currentExercise || isLoggingSet) return;
    const row = rowsState.rows[rowIndex];
    if (!row || row.done) return;
    const weightNum = parseWeightKgInput(row.weight);
    const repsNum = parseInt(row.reps, 10);

    // Validate input - weight can be 0, reps must be > 0
    if (
      !row.weight ||
      row.weight.trim() === "" ||
      isNaN(weightNum) ||
      weightNum < 0 ||
      !row.reps ||
      row.reps.trim() === "" ||
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
      // Log the current set
      const logData: any = {
        set_type: "straight_set",
        set_number: row.setNumber,
        isLastSet: rowsState.doneCount + 1 >= totalSets,
      };

      // Only add fields if they're defined
      if (currentExercise?.exercise_id)
        logData.exercise_id = currentExercise.exercise_id;
      if (weightNum !== undefined && weightNum !== null && !isNaN(weightNum))
        logData.weight = weightNum;
      if (repsNum !== undefined && repsNum !== null && !isNaN(repsNum))
        logData.reps = repsNum;

      const result = await logSetToDatabase(logData);

      if (result.success) {
        // Trigger green flash animation
        setShowLogSuccessFlash(true);
        setTimeout(() => setShowLogSuccessFlash(false), 200);

        const loggedSet: LoggedSet = {
          id: result.set_log_id || `temp-${currentSetNumber}-${Date.now()}`,
          exercise_id: currentExercise.exercise_id,
          set_entry_id: liveSetEntry.setEntry.id,
          set_number: row.setNumber,
          weight_kg: weightNum,
          reps_completed: repsNum,
          completed_at: new Date(),
        } as LoggedSet;

        onSetLogUpsert?.(liveSetEntry.setEntry.id, loggedSet);

        console.log("[StraightSetExecutor] set logged", {
          currentSetNumber: row.setNumber,
          totalSets,
          isLastSet: rowsState.doneCount + 1 >= totalSets,
          set_log_id: result.set_log_id,
        });
        console.log("[log-set success]", {
          setEntryId: liveSetEntry.setEntry.id,
          setNumber: row.setNumber,
          isLastSet: rowsState.doneCount + 1 >= totalSets,
          completedSets: rowsState.doneCount + 1,
          totalSets,
          set_log_id: result.set_log_id,
        });

        if (result.e1rm && onE1rmUpdate) {
          onE1rmUpdate(currentExercise.exercise_id, result.e1rm);
        }

        addToast({
          title: "Set Logged!",
          description: `Set ${row.setNumber} of ${totalSets}: ${weightNum}kg × ${repsNum} reps`,
          variant: "success",
          duration: 2000,
        });

        // When rest timer will show, pass last-set data for completion hero + next set preview
        if (rowsState.doneCount + 1 < totalSets) {
          onLastSetLoggedForRest?.({
            weight: weightNum,
            reps: repsNum,
            setNumber: row.setNumber,
            totalSets,
            isPr: result.isNewPR,
          });
        }

        // Update parent with new completed sets count
        rowsState.markDone(rowIndex, true);
        // Carry logged weight into the next row (resetKey no longer rebuilds on sticky weight)
        if (rowIndex + 1 < totalSets) {
          rowsState.setRow(rowIndex + 1, (next) => ({
            ...next,
            weight: row.weight || next.weight,
          }));
        }
        setJumpRowIndex(null);
        const newCompletedSets = rowsState.doneCount + 1;
        onSetComplete?.(newCompletedSets);

        // RPE modal is now handled by the parent (LiveWorkoutSetEntryExecutor)
        // via the Golden Logging Flow orchestrator.

        // Check if this was the last set
        if (newCompletedSets >= totalSets) {
          console.log("[StraightSetExecutor] triggering onSetEntryComplete", {
            setEntryId: liveSetEntry.setEntry.id,
            currentSetNumber: row.setNumber,
            totalSets,
          });
          onSetEntryComplete(liveSetEntry.setEntry.id, [...loggedSetsList, loggedSet]);
        } else {
          // Advancing to next set: parent will update lastPerformedWeightByExerciseId and completedSets;
          // useEffect will run (pristine reset + default from sticky) and set weight for next set.
          // If rest timer > 0, inputs clear when timer completes and completedSets updates.
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
      console.error("Error logging set:", error);
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
    title: `Set ${setEntry.set_number}: ${setEntry.weight_kg ?? "—"} kg × ${setEntry.reps_completed ?? "—"} reps`,
    rpe: setEntry.rpe ?? null,
    onEffortChange: (rpe) => updateSetRpe(setEntry, rpe),
    disabled: setEntry.id.startsWith("temp-"),
    onTitleClick: allowSetEditDelete
      ? () => handleEditSet(setEntry)
      : undefined,
    menu: allowSetEditDelete ? (
      <div className="relative flex items-center">
        <button
          type="button"
          onClick={() =>
            setMenuOpenSetId(
              menuOpenSetId === setEntry.id ? null : setEntry.id,
            )
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

  const formatUpcomingSummary = (setNumber: number) => {
    const t = resolveSetPrescriptionTargets(
      currentExercise,
      setNumber,
      liveSetEntry.setEntry.reps_per_set,
    );
    if (t.weight_kg != null) {
      return (
        <>
          {t.reps ?? "—"} ×{" "}
          <span className={setUnitStyles.sxMuted}>{t.weight_kg}</span>
        </>
      );
    }
    return <>{t.reps ?? "—"} reps</>;
  };

  const fillRemainingTargets = () => {
    rowsState.fillRemaining((index, prev) => {
      const setNumber = index + 1;
      const targets = resolveSetPrescriptionTargets(
        currentExercise,
        setNumber,
        liveSetEntry.setEntry.reps_per_set,
      );
      const { numericDefault: setRepsDefault } = parseRepsTarget(targets.reps);
      return {
        weight: resolveSetRowWeightDefault({
          setNumber,
          previousRowWeight: index > 0 ? prev?.weight : undefined,
          lastSessionSetDetails,
          defaultWeight: default_weight,
          suggestedWeight: weightFallback,
          prescribedWeightKg: targets.weight_kg,
        }),
        reps:
          setRepsDefault > 0 ? String(setRepsDefault) : (prev?.reps ?? ""),
      };
    });
  };

  const nudgeActiveWeight = (delta: number) => {
    if (activeRowIndex < 0) return;
    rowsState.setRow(activeRowIndex, (current) => {
      const cur = parseWeightKgInput(current.weight || "0");
      const next = Math.max(0, (isNaN(cur) ? 0 : cur) + delta);
      return {
        ...current,
        weight: String(Math.round(next * 2) / 2),
      };
    });
  };
  const nudgeActiveReps = (delta: number) => {
    if (activeRowIndex < 0) return;
    rowsState.setRow(activeRowIndex, (current) => {
      const cur = parseInt(current.reps || "0", 10);
      const next = Math.max(0, (isNaN(cur) ? 0 : cur) + delta);
      return { ...current, reps: String(next) };
    });
  };

  // Keep edit surface for already-logged entries.
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
            {instructions ? (
              <LiveCardNote>{instructions}</LiveCardNote>
            ) : null}

            {rowsState.rows
              .filter((row) => row.done)
              .map((row) => {
                const logged = loggedSetsList.find(
                  (s) => Number(s.set_number) === row.setNumber,
                );
                return (
                  <SetUnitRow
                    key={`done-${row.setNumber}`}
                    label={`Set ${row.setNumber}`}
                    done
                    summary={
                      <>
                        {row.reps || "—"} ×{" "}
                        <span className={setUnitStyles.sxAccent}>
                          {row.weight || "—"}
                        </span>{" "}
                        kg
                        <LoggedEffortInline rpe={logged?.rpe ?? null} />
                      </>
                    }
                  />
                );
              })}

            {activeRow ? (
              <LiveCardLog>
                <LiveCardLogField
                  label="Weight"
                  value={activeRow.weight}
                  onChange={(value) =>
                    rowsState.setRow(activeRowIndex, (c) => ({
                      ...c,
                      weight: value,
                    }))
                  }
                  onIncrement={() => nudgeActiveWeight(2.5)}
                  onDecrement={() => nudgeActiveWeight(-2.5)}
                />
                <LiveCardLogField
                  label="Reps"
                  value={activeRow.reps}
                  onChange={(value) =>
                    rowsState.setRow(activeRowIndex, (c) => ({
                      ...c,
                      reps: value,
                    }))
                  }
                  onIncrement={() => nudgeActiveReps(1)}
                  onDecrement={() => nudgeActiveReps(-1)}
                />
                <LiveCardLogButton
                  disabled={isLoggingSet}
                  onClick={() => void handleLogRow(activeRowIndex)}
                />
                {isEditMode ? (
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
                      disabled={
                        isSavingEdit ||
                        !editDraft ||
                        editDraft.weight.trim() === "" ||
                        editDraft.reps.trim() === "" ||
                        isNaN(parseWeightKgInput(editDraft.weight)) ||
                        parseWeightKgInput(editDraft.weight) < 0 ||
                        isNaN(parseInt(editDraft.reps, 10)) ||
                        parseInt(editDraft.reps, 10) <= 0
                      }
                      variant="fc-primary"
                      className="flex-1 h-12 text-base font-bold uppercase tracking-wider rounded-xl"
                    >
                      {isSavingEdit ? "Saving…" : "Save edits"}
                    </Button>
                  </div>
                ) : null}
              </LiveCardLog>
            ) : isEditMode ? (
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
                    disabled={
                      isSavingEdit ||
                      !editDraft ||
                      editDraft.weight.trim() === "" ||
                      editDraft.reps.trim() === "" ||
                      isNaN(parseWeightKgInput(editDraft.weight)) ||
                      parseWeightKgInput(editDraft.weight) < 0 ||
                      isNaN(parseInt(editDraft.reps, 10)) ||
                      parseInt(editDraft.reps, 10) <= 0
                    }
                    variant="fc-primary"
                    className="flex-1 h-12 text-base font-bold uppercase tracking-wider rounded-xl"
                  >
                    {isSavingEdit ? "Saving…" : "Save edits"}
                  </Button>
                </div>
              </LiveCardLog>
            ) : null}

            {rowsState.rows
              .filter((row) => !row.done && row.setNumber !== activeRow?.setNumber)
              .map((row) => (
                <SetUnitRow
                  key={`upcoming-${row.setNumber}`}
                  label={`Set ${row.setNumber}`}
                  summary={
                    <span className={setUnitStyles.sxMuted}>
                      {formatUpcomingSummary(row.setNumber)}
                    </span>
                  }
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
                  if (r != null) setReps(String(r));
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
