"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Zap,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Pencil,
  Calculator,
} from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import {
  BaseBlockExecutorLayout,
  formatLoadPercentage,
  calculateSuggestedWeightUtil,
} from "../BaseBlockExecutor";
import { LargeInput } from "../ui/LargeInput";
import { ExerciseActionButtons } from "../ui/ExerciseActionButtons";
import { BlockDetail, BaseBlockExecutorProps } from "../types";
import { LoggedSet } from "@/types/workoutBlocks";
import { InlineRPERow } from "../ui/InlineRPERow";
import { useLoggingReset } from "../hooks/useLoggingReset";
import {
  getWeightDefaultAndSuggestion,
  getCoachSuggestedWeight,
} from "@/lib/weightDefaultService";
import { ApplySuggestedWeightButton } from "../ui/ApplySuggestedWeightButton";
import { ProgressionNudge } from "../ui/ProgressionNudge";
import { fetchApi } from "@/lib/apiClient";
import { buildSetEditPatchPayload } from "@/lib/setEditPayload";

export function SupersetExecutor({
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
  formatTime,
  calculateSuggestedWeight,
  onVideoClick,
  onAlternativesClick,
  onPlateCalculatorClick,
  onRestTimerClick,
  onSetComplete,
  onLastSetLoggedForRest,
  progressionSuggestionsMap,
  previousPerformanceMap,
  allowSetEditDelete = false,
  registerSetLogIdResolved,
  onSetLogUpsert,
  onSetEditSaved,
  loggedSets,
}: BaseBlockExecutorProps) {
  const { addToast } = useToast();
  const exerciseA = block.block.exercises?.[0];
  const exerciseB = block.block.exercises?.[1];
  const totalSets = block.block.total_sets || 1;
  const completedSets = block.completedSets || 0;
  const currentSetNumber = completedSets + 1;

  /** Parent-owned logged sets; single source of truth. Persists across block navigation. */
  const loggedSetsList = loggedSets ?? [];

  const [weightA, setWeightA] = useState("");
  const [repsA, setRepsA] = useState("");
  const [weightB, setWeightB] = useState("");
  const [repsB, setRepsB] = useState("");
  const [isLoggingSet, setIsLoggingSet] = useState(false);
  useLoggingReset(isLoggingSet, setIsLoggingSet);
  const [isWeightAPristine, setIsWeightAPristine] = useState(true);
  const [isWeightBPristine, setIsWeightBPristine] = useState(true);
  const [viewingSetIndex, setViewingSetIndex] = useState(0);
  /** Collapsible set history: show all sets or only last 2 */
  const [showAllSets, setShowAllSets] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [menuOpenSetId, setMenuOpenSetId] = useState<string | null>(null);
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
      onSetLogUpsert?.(block.block.id, newEntry, { replaceId: lastId });
    });
    return () => {};
  }, [registerSetLogIdResolved, onSetLogUpsert, block.block.id]);
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
    if (isWeightAPristine) {
      if (resultA.default_weight != null && resultA.default_weight > 0)
        setWeightA(String(resultA.default_weight));
      else setWeightA("");
    }
  }, [isViewingLoggedSet, isWeightAPristine, resultA.default_weight]);
  useEffect(() => {
    if (isViewingLoggedSet) return;
    if (isWeightBPristine) {
      if (resultB.default_weight != null && resultB.default_weight > 0)
        setWeightB(String(resultB.default_weight));
      else setWeightB("");
    }
  }, [isViewingLoggedSet, isWeightBPristine, resultB.default_weight]);

  // Block details
  const blockDetails: BlockDetail[] = [
    {
      label: "SETS",
      value: totalSets,
    },
    {
      label: "REST",
      value: block.block.rest_seconds || exerciseA?.rest_seconds || 60,
      unit: "s",
    },
  ];

  if (exerciseA) {
    blockDetails.push({
      label: "EXERCISE A",
      value: exerciseA.exercise?.name || "Exercise A",
    });
    if (exerciseA.reps) {
      blockDetails.push({
        label: "REPS (A)",
        value: exerciseA.reps,
      });
    }
    if (exerciseA.load_percentage != null) {
      const suggestedForDisplay =
        resultA.source === "percent_e1rm" ? resultA.suggested_weight : null;
      const loadDisplay = formatLoadPercentage(
        exerciseA.load_percentage,
        suggestedForDisplay,
      );
      if (loadDisplay) {
        blockDetails.push({ label: "LOAD (A)", value: loadDisplay });
      }
    }
  }

  if (exerciseB) {
    blockDetails.push({
      label: "EXERCISE B",
      value: exerciseB.exercise?.name || "Exercise B",
    });
    if (exerciseB.reps) {
      blockDetails.push({
        label: "REPS (B)",
        value: exerciseB.reps,
      });
    }
    if (exerciseB.load_percentage != null) {
      const suggestedForDisplay =
        resultB.source === "percent_e1rm" ? resultB.suggested_weight : null;
      const loadDisplay = formatLoadPercentage(
        exerciseB.load_percentage,
        suggestedForDisplay,
      );
      if (loadDisplay) {
        blockDetails.push({ label: "LOAD (B)", value: loadDisplay });
      }
    }
  }

  const instructions = block.block.set_notes || undefined;

  const maxViewableSet =
    loggedSetsList.length === 0
      ? 0
      : Math.max(...loggedSetsList.map((s) => s.set_number));

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
    setMenuOpenSetId(null);
  };

  const handleSaveEdit = async () => {
    if (!editingSetId || !editDraft) return;
    if (editingSetId.startsWith("temp-")) {
      if (process.env.NODE_ENV !== "production") {
        console.log("[SAVE EDITS guard]", {
          executor: "SupersetExecutor",
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
    const weightANum = parseFloat(editDraft.weightA);
    const repsANum = parseInt(editDraft.repsA, 10);
    const weightBNum = parseFloat(editDraft.weightB);
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
      const payload = buildSetEditPatchPayload(block.block.set_type, {
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
          blockTypeFromUI: block.block.set_type,
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
        toUpsert.forEach((e) => onSetEditSaved?.(block.block.id, e));
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
    if (!exerciseA || !exerciseB || isLoggingSet) return;

    const weightANum = parseFloat(weightA);
    const repsANum = parseInt(repsA);
    const weightBNum = parseFloat(weightB);
    const repsBNum = parseInt(repsB);

    if (
      !weightA ||
      weightA.trim() === "" ||
      isNaN(weightANum) ||
      weightANum < 0 ||
      !repsA ||
      repsA.trim() === "" ||
      isNaN(repsANum) ||
      repsANum <= 0 ||
      !weightB ||
      weightB.trim() === "" ||
      isNaN(weightBNum) ||
      weightBNum < 0 ||
      !repsB ||
      repsB.trim() === "" ||
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
      const setNumber = completedSets + 1;

      const logData: any = {
        set_type: "superset",
        set_number: setNumber,
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
            set_entry_id: block.block.id,
            set_number: setNumber,
            weight_kg: weightANum,
            reps_completed: repsANum,
            completed_at: new Date(),
          } as LoggedSet,
          {
            id: setLogId,
            exercise_id: exerciseB.exercise_id,
            set_entry_id: block.block.id,
            set_number: setNumber,
            weight_kg: weightBNum,
            reps_completed: repsBNum,
            completed_at: new Date(),
          } as LoggedSet,
        ];
        newEntries.forEach((e) => onSetLogUpsert?.(block.block.id, e));
        setViewingSetIndex(0);

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

        const newCompletedSets = completedSets + 1;
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
          onBlockComplete(block.block.id, updatedLoggedSets);
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

  const setNumbersLogged = [
    ...new Set(loggedSetsList.map((s) => s.set_number)),
  ].sort((a, b) => a - b);

  const loggingInputs = (
    <div className="space-y-4">
      {allowSetEditDelete && setNumbersLogged.length > 0 && (
        <div
          className="rounded-xl border p-3"
          style={{
            borderColor: "var(--fc-surface-card-border)",
            background: "var(--fc-surface-sunken)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold fc-text-dim uppercase tracking-wider">
              Logged sets
            </div>
            {setNumbersLogged.length > 2 && (
              <button
                type="button"
                onClick={() => setShowAllSets(!showAllSets)}
                className="text-xs font-medium fc-text-dim hover:fc-text-primary transition-colors"
              >
                {showAllSets ? (
                  <>Show less ▲</>
                ) : (
                  <>Show all {setNumbersLogged.length} sets ▼</>
                )}
              </button>
            )}
          </div>
          <ul className="space-y-1.5">
            {(showAllSets ? setNumbersLogged : setNumbersLogged.slice(-2)).map((setNum) => {
              // Calculate the actual index in the full list for isLatestSet
              const actualIndex = showAllSets 
                ? setNumbersLogged.indexOf(setNum)
                : setNumbersLogged.length - 2 + setNumbersLogged.slice(-2).indexOf(setNum);
              const isLatestSet = actualIndex === setNumbersLogged.length - 1;
              const forSet = loggedSetsList.filter(
                (s) => s.set_number === setNum,
              );
              const entryA =
                forSet.find((s) => s.exercise_id === exerciseA?.exercise_id) ||
                forSet[0];
              const entryB =
                forSet.find((s) => s.exercise_id === exerciseB?.exercise_id) ||
                forSet[1];
              const label = `Set ${setNum}: A ${entryA?.weight_kg ?? "—"}×${entryA?.reps_completed ?? "—"}${entryB ? `, B ${entryB.weight_kg ?? "—"}×${entryB.reps_completed ?? "—"}` : ""}`;
              const firstId = forSet[0]?.id ?? "";
              const rpeForSet = entryA?.rpe ?? entryB?.rpe ?? null;
              return (
                <li
                  key={`set-${setNum}`}
                  className="flex flex-col gap-1.5 py-1.5 px-2 rounded-lg"
                  style={{ background: "var(--fc-surface-elevated)" }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm fc-text-primary">{label}</span>
                    <div className="relative flex items-center">
                      <button
                        type="button"
                        className="p-1.5 rounded-md hover:bg-black/10"
                        onClick={() =>
                          setMenuOpenSetId(
                            menuOpenSetId === firstId ? null : firstId,
                          )
                        }
                        aria-label="Options"
                      >
                        <MoreVertical className="w-4 h-4 fc-text-dim" />
                      </button>
                      {menuOpenSetId === firstId && (
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
                            onClick={() => handleEditSet(forSet[0])}
                          >
                            <Pencil className="w-4 h-4" /> Edit
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <InlineRPERow
                    setLogId={firstId.startsWith("temp-") ? null : firstId}
                    currentRPE={rpeForSet}
                    onRPESelect={async (rpe) => {
                      // Update RPE for the first entry (entryA represents the set)
                      const updatedEntry: LoggedSet = {
                        ...entryA!,
                        rpe,
                      };
                      onSetLogUpsert?.(block.block.id, updatedEntry, {
                        replaceId: entryA!.id,
                      });

                      // If set is synced, update via API
                      if (!firstId.startsWith("temp-")) {
                        try {
                          const res = await fetch(`/api/sets/${firstId}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ rpe }),
                            credentials: "include",
                          });
                          if (!res.ok) {
                            console.error("Failed to update RPE:", await res.text());
                            const revertedEntry: LoggedSet = {
                              ...entryA!,
                              rpe: entryA!.rpe ?? undefined,
                            };
                            onSetLogUpsert?.(block.block.id, revertedEntry, {
                              replaceId: entryA!.id,
                            });
                          }
                        } catch (err) {
                          console.error("Error updating RPE:", err);
                          const revertedEntry: LoggedSet = {
                            ...entryA!,
                            rpe: entryA!.rpe ?? undefined,
                          };
                          onSetLogUpsert?.(block.block.id, revertedEntry, {
                            replaceId: entryA!.id,
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
      {allowSetEditDelete && totalSets > 0 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => setViewingSetIndex((i) => Math.max(0, i - 1))}
            disabled={viewingSetIndex <= 0}
            aria-label="Previous set"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="text-sm font-medium fc-text-primary min-w-[100px] text-center">
            Set {displaySetNumber} of {totalSets}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() =>
              setViewingSetIndex((i) => Math.min(maxViewableSet, i + 1))
            }
            disabled={viewingSetIndex >= maxViewableSet}
            aria-label="Next set"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      )}
      <div className="space-y-6">
        {/* Exercise A */}
        <div
          className="p-4 rounded-xl"
          style={{ background: "var(--fc-surface-sunken)" }}
        >
          <div className="mb-4">
            <h4
              className="font-semibold text-lg"
              style={{ color: "var(--fc-accent-cyan)" }}
            >
              Exercise A: {exerciseA?.exercise?.name || "Exercise A"}
            </h4>
            {exerciseA && (
              <ExerciseActionButtons
                exercise={exerciseA}
                onVideoClick={onVideoClick}
                onAlternativesClick={onAlternativesClick}
              />
            )}
          </div>
          {exerciseA?.exercise_id && (
            <ProgressionNudge
              suggestion={progressionSuggestionsMap?.get(exerciseA.exercise_id)}
              previousPerformance={previousPerformanceMap?.get(exerciseA.exercise_id) ?? null}
              onApplySuggestion={(w, r) => {
                if (w != null) { setIsWeightAPristine(false); setWeightA(String(w)); }
                if (r != null) setRepsA(String(r));
              }}
            />
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="relative">
                <LargeInput
                  label="Weight"
                  value={editDraft ? editDraft.weightA : weightA}
                  onChange={(val) => {
                    if (editDraft)
                      setEditDraft((d) => (d ? { ...d, weightA: val } : null));
                    else {
                      setIsWeightAPristine(false);
                      setWeightA(val);
                    }
                  }}
                  placeholder="0"
                  step="0.5"
                  unit="kg"
                  showStepper
                  stepAmount={2.5}
                />
                {onPlateCalculatorClick && (
                  <button
                    type="button"
                    onClick={() => onPlateCalculatorClick()}
                    className="absolute right-2 top-[1.75rem] p-1.5 rounded-lg transition-colors hover:bg-white/10 focus:outline-none focus:ring-2"
                    style={{ color: "var(--fc-domain-workouts)" }}
                    title="Plate Calculator"
                    aria-label="Open plate calculator"
                  >
                    <Calculator className="w-4 h-4" />
                  </button>
                )}
              </div>
              {!editDraft && coachSuggestedA != null && coachSuggestedA > 0 && (
                <ApplySuggestedWeightButton
                  suggestedKg={coachSuggestedA}
                  onApply={() => {
                    setWeightA(String(coachSuggestedA));
                    setIsWeightAPristine(false);
                  }}
                />
              )}
            </div>
            <LargeInput
              label="Reps"
              value={editDraft ? editDraft.repsA : repsA}
              onChange={(val) => {
                if (editDraft)
                  setEditDraft((d) => (d ? { ...d, repsA: val } : null));
                else setRepsA(val);
              }}
              placeholder="0"
              step="1"
              showStepper
              stepAmount={1}
            />
          </div>
        </div>

        {/* Exercise B */}
        <div
          className="p-4 rounded-xl"
          style={{ background: "var(--fc-surface-sunken)" }}
        >
          <div className="mb-4">
            <h4
              className="font-semibold text-lg"
              style={{ color: "var(--fc-accent-purple)" }}
            >
              Exercise B: {exerciseB?.exercise?.name || "Exercise B"}
            </h4>
            {exerciseB && (
              <ExerciseActionButtons
                exercise={exerciseB}
                onVideoClick={onVideoClick}
                onAlternativesClick={onAlternativesClick}
              />
            )}
          </div>
          {exerciseB?.exercise_id && (
            <ProgressionNudge
              suggestion={progressionSuggestionsMap?.get(exerciseB.exercise_id)}
              previousPerformance={previousPerformanceMap?.get(exerciseB.exercise_id) ?? null}
              onApplySuggestion={(w, r) => {
                if (w != null) { setIsWeightBPristine(false); setWeightB(String(w)); }
                if (r != null) setRepsB(String(r));
              }}
            />
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="relative">
                <LargeInput
                  label="Weight"
                  value={editDraft ? editDraft.weightB : weightB}
                  onChange={(val) => {
                    if (editDraft)
                      setEditDraft((d) => (d ? { ...d, weightB: val } : null));
                    else {
                      setIsWeightBPristine(false);
                      setWeightB(val);
                    }
                  }}
                  placeholder="0"
                  step="0.5"
                  unit="kg"
                  showStepper
                  stepAmount={2.5}
                />
                {onPlateCalculatorClick && (
                  <button
                    type="button"
                    onClick={() => onPlateCalculatorClick()}
                    className="absolute right-2 top-[1.75rem] p-1.5 rounded-lg transition-colors hover:bg-white/10 focus:outline-none focus:ring-2"
                    style={{ color: "var(--fc-domain-workouts)" }}
                    title="Plate Calculator"
                    aria-label="Open plate calculator"
                  >
                    <Calculator className="w-4 h-4" />
                  </button>
                )}
              </div>
              {!editDraft && coachSuggestedB != null && coachSuggestedB > 0 && (
                <ApplySuggestedWeightButton
                  suggestedKg={coachSuggestedB}
                  onApply={() => {
                    setWeightB(String(coachSuggestedB));
                    setIsWeightBPristine(false);
                  }}
                />
              )}
            </div>
            <LargeInput
              label="Reps"
              value={editDraft ? editDraft.repsB : repsB}
              onChange={(val) => {
                if (editDraft)
                  setEditDraft((d) => (d ? { ...d, repsB: val } : null));
                else setRepsB(val);
              }}
              placeholder="0"
              step="1"
              showStepper
              stepAmount={1}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const isEditMode = !!editingSetId && !!editDraft;
  const forViewedSet =
    viewingSetIndex >= 1
      ? loggedSetsList.filter((s) => s.set_number === viewingSetIndex)
      : [];
  const viewedSetEntry = forViewedSet[0] ?? null;
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
              editDraft.weightA.trim() === "" ||
              editDraft.repsA.trim() === "" ||
              editDraft.weightB.trim() === "" ||
              editDraft.repsB.trim() === "" ||
              isNaN(parseFloat(editDraft.weightA)) ||
              isNaN(parseInt(editDraft.repsA, 10)) ||
              isNaN(parseFloat(editDraft.weightB)) ||
              isNaN(parseInt(editDraft.repsB, 10))
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
        <Button
          onClick={handleLog}
          disabled={isLoggingSet || completedSets >= totalSets}
          variant="fc-primary"
          className="w-full h-12 text-base font-bold uppercase tracking-wider rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Zap className="w-5 h-5 mr-2" />
          {isLoggingSet ? "Logging..." : "LOG SUPERSET"}
        </Button>
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
        formatTime,
        calculateSuggestedWeight,
        onVideoClick,
        onAlternativesClick,
        onRestTimerClick,
      }}
      exerciseName={`${exerciseA?.exercise?.name || "Exercise A"} + ${
        exerciseB?.exercise?.name || "Exercise B"
      }`}
      blockDetails={blockDetails}
      instructions={instructions}
      currentSet={displaySetNumber}
      totalSets={totalSets}
      progressLabel="Set"
      loggingInputs={loggingInputs}
      logButton={logButton}
      showNavigation={true}
      currentExercise={exerciseA}
      showRestTimer={!!(block.block.rest_seconds || exerciseA?.rest_seconds)}
    />
  );
}
