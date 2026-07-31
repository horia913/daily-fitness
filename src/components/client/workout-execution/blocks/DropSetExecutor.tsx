"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, MoreVertical, Pencil, Plus } from "lucide-react";
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
import { WeightRepsInlineFields } from "../ui/set-rows/SetRowFieldsByType";
import {
  resolveDropWeightFromInitial,
  resolveSetRowWeightDefault,
} from "../ui/set-rows/resolveSetRowWeightDefault";
import { resolveSetPrescriptionTargets } from "../ui/set-rows/resolveSetPrescriptionTargets";
import {
  LiveCard,
  LiveCardExerciseName,
  LiveCardPrimary,
  LiveCardStats,
  LiveCardTechnique,
  LiveCardNote,
  LiveCardLog,
  LiveCardLogField,
  LiveCardLogButton,
  formatDropTechniqueBody,
  effortFromPrescribedRir,
  formatLiveRest,
  resolveRestSeconds,
  formatLiveLast,
  groupIndexToHue,
  type LiveCardTarget,
} from "../live-card";
import { LoggedEffortInline } from "../ui/LoggedEffortInline";

interface DropRow {
  setNumber: number;
  drops: Array<{ weight: string; reps: string }>;
  expanded: boolean;
  done: boolean;
}

export function DropSetExecutor({
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

  const [drops, setDrops] = useState<Array<{ weight: string; reps: string }>>([
    { weight: "", reps: "" },
    { weight: "", reps: "" },
  ]);
  const MAX_DROPS = 5;
  const [isLoggingSet, setIsLoggingSet] = useState(false);
  useLoggingReset(isLoggingSet, setIsLoggingSet);
  /** Tap-to-jump: override first-incomplete when client picks an upcoming set */
  const [jumpRowIndex, setJumpRowIndex] = useState<number | null>(null);
  const [isWeightPristine, setIsWeightPristine] = useState(true);
  const [viewingSetIndex, setViewingSetIndex] = useState(0);
  /** Collapsible set history: show all sets or only last 2 */
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [menuOpenSetId, setMenuOpenSetId] = useState<string | null>(null);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    drops: Array<{ weight: string; reps: string }>;
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
      const s = loggedSetsList[viewingSetIndex - 1] as LoggedSet & {
        dropset_drops?: Array<{ weight: number; reps: number }>;
      };
      const stored = s.dropset_drops;
      if (Array.isArray(stored) && stored.length >= 2) {
        setDrops(
          stored.map((d) => ({
            weight: String(d.weight),
            reps: String(d.reps),
          })),
        );
      } else {
        setDrops([
          {
            weight: String(s.weight_kg ?? ""),
            reps: String(s.reps_completed ?? ""),
          },
          {
            weight: String((s.weight_kg ?? 0) * 0.8),
            reps: String(s.reps_completed ?? ""),
          },
        ]);
      }
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
  const { default_weight, suggested_weight } = getWeightDefaultAndSuggestion({
    sessionStickyWeight: sessionStickyWeight ?? null,
    lastSessionWeight: lastSessionWeight ?? null,
    loadPercentage,
    e1rm: e1rm ?? null,
  });
  const coachSuggestedWeight = getCoachSuggestedWeight(loadPercentage, e1rm);
  const weightFallback =
    coachSuggestedWeight != null && coachSuggestedWeight > 0
      ? coachSuggestedWeight
      : suggested_weight;
  const lastSessionSetDetails =
    exerciseId && previousPerformanceMap
      ? (previousPerformanceMap.get(exerciseId)?.lastWorkout?.setDetails ?? null)
      : null;

  const exerciseReps = currentExercise?.reps || liveSetEntry.setEntry.reps_per_set || "";
  const dropSetReps = exerciseReps;
  const dropRepsParsed = parseRepsTarget(exerciseReps);
  const rowsState = useSetRowsState<DropRow>({
    rowCount: totalSets,
    // Structural only — sticky/suggested weight must NOT be in resetKey (wipes done flags).
    resetKey: `${liveSetEntry.setEntry.id}:${exerciseId}`,
    loggedCount: completedSets,
    createDefaultRow: (index, previous) => {
      const setNumber = index + 1;
      const targets = resolveSetPrescriptionTargets(
        currentExercise,
        setNumber,
        liveSetEntry.setEntry.reps_per_set,
      );
      const setRepsParsed = parseRepsTarget(targets.reps);
      const repsPrefill =
        setRepsParsed.numericDefault > 0
          ? String(setRepsParsed.numericDefault)
          : "";
      const initialWeightStr = resolveSetRowWeightDefault({
        setNumber,
        previousRowWeight: previous?.drops?.[0]?.weight,
        lastSessionSetDetails,
        defaultWeight: default_weight,
        suggestedWeight: weightFallback,
        prescribedWeightKg: targets.weight_kg,
      });
      const initialWeightNum =
        initialWeightStr.trim() !== ""
          ? parseWeightKgInput(initialWeightStr)
          : null;
      return {
        setNumber,
        drops: [
          { weight: initialWeightStr, reps: repsPrefill },
          {
            weight: resolveDropWeightFromInitial(initialWeightNum),
            reps: repsPrefill,
          },
        ],
        expanded: false,
        done: false,
      };
    },
  });

  useEffect(() => {
    setIsWeightPristine(true);
  }, [completedSets, currentExerciseIndex, exerciseId]);

  useEffect(() => {
    if (viewingSetIndex >= 1) return;
    if (!isWeightPristine) return;
    const repsPrefill =
      dropRepsParsed.numericDefault > 0
        ? String(dropRepsParsed.numericDefault)
        : "";
    if (default_weight != null && default_weight > 0) {
      const dropWeightValue = default_weight * 0.8;
      setDrops([
        { weight: String(default_weight), reps: repsPrefill },
        { weight: String(Math.round(dropWeightValue * 2) / 2), reps: repsPrefill },
      ]);
    } else {
      setDrops([
        { weight: "", reps: repsPrefill },
        { weight: "", reps: repsPrefill },
      ]);
    }
  }, [
    viewingSetIndex,
    isWeightPristine,
    default_weight,
    dropRepsParsed.numericDefault,
    completedSets,
    exerciseId,
  ]);

  const restSecDrop = resolveRestSeconds(
    currentExercise?.rest_seconds,
    liveSetEntry.setEntry.rest_seconds,
  );

  const instructions =
    currentExercise?.notes || liveSetEntry.setEntry.set_notes || undefined;

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
  const activeInitial = activeRow?.drops?.[0];

  const activeSetNumber = Math.min(
    Math.max(1, activeRow?.setNumber ?? rowsState.doneCount + 1),
    totalSets,
  );
  const activeTargets = resolveSetPrescriptionTargets(
    currentExercise,
    activeSetNumber,
    liveSetEntry.setEntry.reps_per_set,
  );
  const activeEffort = effortFromPrescribedRir(activeTargets.rir);
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

  /** Slot technique config (instance path → drop_sets[0] / optional scalar). */
  const dropPctRaw =
    currentExercise?.drop_sets?.[0]?.drop_percentage ??
    (currentExercise as { drop_percentage?: number | null } | undefined)
      ?.drop_percentage ??
    null;
  const dropPct =
    dropPctRaw != null && Number.isFinite(Number(dropPctRaw))
      ? Number(dropPctRaw)
      : 20;
  const slotMaxDrops =
    (currentExercise as { max_drops?: number | null } | undefined)?.max_drops ??
    null;
  const effectiveMaxDrops =
    slotMaxDrops != null && slotMaxDrops > 0 ? slotMaxDrops : MAX_DROPS;

  const handleEditSet = (setEntry: LoggedSet) => {
    const s = setEntry as LoggedSet & {
      dropset_drops?: Array<{ weight: number; reps: number }>;
    };
    const stored = s.dropset_drops;
    let editDrops: Array<{ weight: string; reps: string }>;
    if (Array.isArray(stored) && stored.length >= 2) {
      editDrops = stored.map((d) => ({
        weight: String(d.weight),
        reps: String(d.reps),
      }));
    } else {
      editDrops = [
        {
          weight: String(setEntry.weight_kg ?? ""),
          reps: String(setEntry.reps_completed ?? ""),
        },
        {
          weight: String((setEntry.weight_kg ?? 0) * 0.8),
          reps: String(setEntry.reps_completed ?? ""),
        },
      ];
    }
    setEditingSetId(setEntry.id);
    setEditDraft({ drops: editDrops, set_number: setEntry.set_number ?? 1 });
    setMenuOpenSetId(null);
  };

  const handleSaveEdit = async () => {
    if (!editingSetId || !editDraft) return;
    if (editingSetId.startsWith("temp-")) {
      if (process.env.NODE_ENV !== "production") {
        console.log("[SAVE EDITS guard]", {
          executor: "DropSetExecutor",
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
    const dropsParsed = editDraft.drops
      .map((d) => ({
        weight: parseWeightKgInput(d.weight),
        reps: parseInt(d.reps, 10),
      }))
      .filter(
        (d) =>
          !isNaN(d.weight) && d.weight >= 0 && !isNaN(d.reps) && d.reps > 0,
      );
    if (dropsParsed.length < 2) {
      addToast({
        title: "Invalid values",
        description: "Need at least 2 drops with valid weight and reps",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    const w0 = dropsParsed[0].weight;
    const r0 = dropsParsed[0].reps;
    const wLast = dropsParsed[dropsParsed.length - 1].weight;
    const rLast = dropsParsed[dropsParsed.length - 1].reps;
    const pct = w0 > 0 ? ((w0 - wLast) / w0) * 100 : 0;
    setIsSavingEdit(true);
    try {
      const payload = buildSetEditPatchPayload(liveSetEntry.setEntry.set_type, {
        dropset_initial_weight: w0,
        dropset_initial_reps: r0,
        dropset_final_weight: wLast,
        dropset_final_reps: rLast,
        dropset_percentage: pct,
        dropset_drops: dropsParsed,
        set_number: editDraft.set_number,
        ...(currentExercise?.exercise_id && {
          exercise_id: currentExercise.exercise_id,
        }),
      });
      if (process.env.NODE_ENV !== "production") {
        console.log("[SAVE EDITS]", {
          executor: "DropSetExecutor",
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
        const updatedEntry: LoggedSet & {
          dropset_drops?: Array<{ weight: number; reps: number }>;
        } = {
          ...current,
          id: editingSetId,
          exercise_id:
            current?.exercise_id ?? currentExercise?.exercise_id ?? "",
          set_entry_id: liveSetEntry.setEntry.id,
          set_number: editDraft.set_number,
          weight_kg: w0,
          reps_completed: r0,
          completed_at: current?.completed_at ?? new Date(),
          dropset_drops: dropsParsed,
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

  const handleLogSet = async (rowIndex: number) => {
    if (!currentExercise || isLoggingSet) return;
    const row = rowsState.rows[rowIndex];
    if (!row || row.done) return;

    const dropsParsed = row.drops
      .map((d) => ({
        weight: parseWeightKgInput(d.weight),
        reps: parseInt(d.reps, 10),
      }))
      .filter(
        (d) =>
          !isNaN(d.weight) && d.weight >= 0 && !isNaN(d.reps) && d.reps > 0,
      );

    if (dropsParsed.length < 2) {
      addToast({
        title: "Invalid Input",
        description:
          "Please enter valid weight and reps for at least initial and first drop",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    const initialWeightNum = dropsParsed[0].weight;
    const initialRepsNum = dropsParsed[0].reps;

    setIsLoggingSet(true);

    try {
      if ("vibrate" in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
    } catch (e) {}

    try {
      const last = dropsParsed[dropsParsed.length - 1];
      const dropPct =
        initialWeightNum > 0
          ? ((initialWeightNum - last.weight) / initialWeightNum) * 100
          : 0;

      const logData: any = {
        set_type: "drop_set",
        set_number: row.setNumber,
        isLastSet: rowsState.doneCount + 1 >= totalSets,
        dropset_drops: dropsParsed,
        dropset_initial_weight: initialWeightNum,
        dropset_initial_reps: initialRepsNum,
        dropset_final_weight: last.weight,
        dropset_final_reps: last.reps,
        dropset_percentage: dropPct,
      };

      const resolvedExerciseId =
        currentExercise?.exercise_id ||
        liveSetEntry.setEntry.exercises?.[0]?.exercise_id;
      if (resolvedExerciseId) logData.exercise_id = resolvedExerciseId;

      const result = await logSetToDatabase(logData);

      if (result.success) {
        const newLoggedSet: LoggedSet & {
          dropset_drops?: Array<{ weight: number; reps: number }>;
        } = {
          id: result.set_log_id || `temp-${row.setNumber}-${Date.now()}`,
          exercise_id: currentExercise.exercise_id,
          set_entry_id: liveSetEntry.setEntry.id,
          set_number: row.setNumber,
          weight_kg: initialWeightNum,
          reps_completed: initialRepsNum,
          completed_at: new Date(),
          dropset_drops: dropsParsed,
        } as LoggedSet;
        onSetLogUpsert?.(liveSetEntry.setEntry.id, newLoggedSet);

        if (result.e1rm && onE1rmUpdate) {
          onE1rmUpdate(currentExercise.exercise_id, result.e1rm);
        }

        addToast({
          title: "Drop Set Logged!",
          description: `${initialWeightNum}kg × ${initialRepsNum} reps → ${last.weight}kg × ${last.reps} reps`,
          variant: "success",
          duration: 2000,
        });

        rowsState.markDone(rowIndex, true);
        rowsState.setRow(rowIndex, (current) => ({ ...current, expanded: false }));
        if (rowIndex + 1 < totalSets && row.drops?.[0]?.weight) {
          const carryWeight = row.drops[0].weight;
          rowsState.setRow(rowIndex + 1, (next) => {
            const drops = [...(next.drops ?? [])];
            if (drops[0]) {
              drops[0] = { ...drops[0], weight: carryWeight };
            }
            return { ...next, drops };
          });
        }
        setJumpRowIndex(null);
        const newCompletedSets = rowsState.doneCount + 1;
        if (newCompletedSets < totalSets) {
          onLastSetLoggedForRest?.({
            weight: initialWeightNum,
            reps: initialRepsNum,
            setNumber: newCompletedSets,
            totalSets,
            isPr: result.isNewPR,
          });
        }
        onSetComplete?.(newCompletedSets);

        if (newCompletedSets >= totalSets) {
          onSetEntryComplete(liveSetEntry.setEntry.id, [...loggedSetsList, newLoggedSet]);
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
      console.error("Error logging drop set:", error);
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

  const fillRemainingTargets = () => {
    rowsState.fillRemaining((index, prev) => {
      const setNumber = index + 1;
      const targets = resolveSetPrescriptionTargets(
        currentExercise,
        setNumber,
        liveSetEntry.setEntry.reps_per_set,
      );
      const setRepsParsed = parseRepsTarget(targets.reps);
      const repsSeed =
        setRepsParsed.numericDefault > 0
          ? String(setRepsParsed.numericDefault)
          : (prev?.drops?.[0]?.reps ?? "");
      const initialWeightStr = resolveSetRowWeightDefault({
        setNumber,
        previousRowWeight: prev?.drops?.[0]?.weight,
        lastSessionSetDetails,
        defaultWeight: default_weight,
        suggestedWeight: weightFallback,
        prescribedWeightKg: targets.weight_kg,
      });
      const initialWeightNum =
        initialWeightStr.trim() !== ""
          ? parseWeightKgInput(initialWeightStr)
          : null;
      return {
        drops: [
          { weight: initialWeightStr, reps: repsSeed },
          {
            weight: resolveDropWeightFromInitial(initialWeightNum),
            reps: repsSeed,
          },
        ],
      };
    });
  };

  const formatUpcomingDropSummary = (setNumber: number) => {
    const t = resolveSetPrescriptionTargets(
      currentExercise,
      setNumber,
      liveSetEntry.setEntry.reps_per_set,
    );
    if (t.weight_kg != null) {
      return `${t.reps ?? "—"} × ${t.weight_kg} · drops`;
    }
    return `${t.reps ?? "—"} reps · drops`;
  };

  const nudgeActiveDropField = (
    dropIndex: number,
    key: "weight" | "reps",
    delta: number,
  ) => {
    if (activeRowIndex < 0) return;
    rowsState.setRow(activeRowIndex, (current) => {
      const nextDrops = [...current.drops];
      const curVal =
        key === "weight"
          ? parseWeightKgInput(nextDrops[dropIndex]?.weight || "0")
          : parseInt(nextDrops[dropIndex]?.reps || "0", 10);
      const next =
        key === "weight"
          ? Math.max(0, (isNaN(curVal) ? 0 : curVal) + delta)
          : Math.max(0, (isNaN(curVal) ? 0 : curVal) + delta);
      nextDrops[dropIndex] = {
        ...nextDrops[dropIndex],
        [key]:
          key === "weight"
            ? String(Math.round(next * 2) / 2)
            : String(next),
      };
      return { ...current, drops: nextDrops };
    });
  };

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
              rest={formatLiveRest(restSecDrop)}
              tempo={tempoLabel}
              last={lastLabel}
            />
            <LiveCardTechnique title="Drop set">
              {formatDropTechniqueBody(dropPct)}
            </LiveCardTechnique>
            {instructions ? (
              <LiveCardNote>{instructions}</LiveCardNote>
            ) : null}

            {rowsState.rows
              .filter((row) => row.done)
              .map((row) => {
                const initial = row.drops[0];
                const logged = (loggedSets ?? []).find(
                  (s) => Number(s.set_number) === row.setNumber,
                );
                return (
                  <SetUnitRow
                    key={`done-${row.setNumber}`}
                    label={`Set ${row.setNumber}`}
                    done
                    summary={
                      <>
                        {initial?.reps || "—"} ×{" "}
                        <span className={setUnitStyles.sxAccent}>
                          {initial?.weight || "—"}
                        </span>{" "}
                        kg
                        <span className={setUnitStyles.sxMuted}>
                          {" "}
                          · {Math.max(0, row.drops.length - 1)} drops
                        </span>
                        <LoggedEffortInline rpe={logged?.rpe ?? null} />
                      </>
                    }
                  />
                );
              })}

            {activeRow && activeInitial ? (
              <LiveCardLog>
                  <LiveCardLogField
                    label="Weight"
                    value={activeInitial.weight}
                    onChange={(value) =>
                      rowsState.setRow(activeRowIndex, (c) => {
                        const nextDrops = [...c.drops];
                        nextDrops[0] = { ...nextDrops[0], weight: value };
                        return { ...c, drops: nextDrops };
                      })
                    }
                    onIncrement={() => nudgeActiveDropField(0, "weight", 2.5)}
                    onDecrement={() => nudgeActiveDropField(0, "weight", -2.5)}
                  />
                  <LiveCardLogField
                    label="Reps"
                    value={activeInitial.reps}
                    onChange={(value) =>
                      rowsState.setRow(activeRowIndex, (c) => {
                        const nextDrops = [...c.drops];
                        nextDrops[0] = { ...nextDrops[0], reps: value };
                        return { ...c, drops: nextDrops };
                      })
                    }
                    onIncrement={() => nudgeActiveDropField(0, "reps", 1)}
                    onDecrement={() => nudgeActiveDropField(0, "reps", -1)}
                  />
                  <LiveCardLogButton
                    disabled={isLoggingSet}
                    onClick={() => void handleLogSet(activeRowIndex)}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      rowsState.setRow(activeRowIndex, (c) => ({
                        ...c,
                        expanded: !c.expanded,
                      }))
                    }
                    className="self-start text-[10px] font-semibold uppercase tracking-wide text-[color:var(--fc-accent)]"
                  >
                    {activeRow.expanded ? "Hide drops" : "Edit drops"}
                  </button>
                  {activeRow.expanded ? (
                    <div className="space-y-1.5">
                      {activeRow.drops.map((drop, dropIndex) =>
                        dropIndex === 0 ? null : (
                          <div
                            key={`drop-${dropIndex}`}
                            className="rounded-md border border-white/10 bg-black/20 px-2 py-2"
                          >
                            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                              Drop {dropIndex}
                            </p>
                            <WeightRepsInlineFields
                              weight={drop.weight}
                              reps={drop.reps}
                              onWeightChange={(value) =>
                                rowsState.setRow(activeRowIndex, (current) => {
                                  const nextDrops = [...current.drops];
                                  nextDrops[dropIndex] = {
                                    ...nextDrops[dropIndex],
                                    weight: value,
                                  };
                                  return { ...current, drops: nextDrops };
                                })
                              }
                              onRepsChange={(value) =>
                                rowsState.setRow(activeRowIndex, (current) => {
                                  const nextDrops = [...current.drops];
                                  nextDrops[dropIndex] = {
                                    ...nextDrops[dropIndex],
                                    reps: value,
                                  };
                                  return { ...current, drops: nextDrops };
                                })
                              }
                            />
                          </div>
                        ),
                      )}
                      {activeRow.drops.length < effectiveMaxDrops ? (
                        <button
                          type="button"
                          onClick={() =>
                            rowsState.setRow(activeRowIndex, (current) => {
                              const lastWeight = parseWeightKgInput(
                                current.drops[current.drops.length - 1]
                                  ?.weight || "",
                              );
                              return {
                                ...current,
                                drops: [
                                  ...current.drops,
                                  {
                                    weight:
                                      !isNaN(lastWeight) && lastWeight > 0
                                        ? String(
                                            Math.round(lastWeight * 0.85 * 2) /
                                              2,
                                          )
                                        : "",
                                    reps: current.drops[0]?.reps ?? "",
                                  },
                                ],
                              };
                            })
                          }
                          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add drop
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                  {isEditMode ? (
                    <div className="mt-1 flex gap-2 w-full">
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
                          editDraft.drops.length < 2 ||
                          editDraft.drops.some(
                            (d) =>
                              isNaN(parseWeightKgInput(d.weight)) ||
                              parseWeightKgInput(d.weight) < 0 ||
                              isNaN(parseInt(d.reps, 10)) ||
                              parseInt(d.reps, 10) <= 0,
                          )
                        }
                        variant="fc-primary"
                        className="flex-1 h-12 text-base font-bold uppercase tracking-wider rounded-xl"
                      >
                        {isSavingEdit ? "Saving…" : "Save edits"}
                      </Button>
                    </div>
                  ) : null}
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
                      {formatUpcomingDropSummary(row.setNumber)}
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
                onApplySuggestion={(w) => {
                  if (w != null) {
                    setDrops((prev) => [
                      { ...prev[0], weight: String(w) },
                      ...prev.slice(1),
                    ]);
                    setIsWeightPristine(false);
                  }
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
