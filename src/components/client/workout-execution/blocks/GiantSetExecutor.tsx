"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Flame,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Pencil,
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

export function GiantSetExecutor({
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
  const exercises = block.block.exercises || [];
  const totalSets = block.block.total_sets || 1;
  const completedSets = block.completedSets || 0;
  const currentSetNumber = completedSets + 1;

  /** Parent-owned logged sets; single source of truth. Persists across block navigation. */
  const loggedSetsList = loggedSets ?? [];

  const [weights, setWeights] = useState<string[]>([]);
  const [reps, setReps] = useState<string[]>([]);
  const [isLoggingSet, setIsLoggingSet] = useState(false);
  useLoggingReset(isLoggingSet, setIsLoggingSet);
  const [weightsPristine, setWeightsPristine] = useState<boolean[]>([]);
  const [viewingSetIndex, setViewingSetIndex] = useState(0);
  /** Collapsible set history: show all sets or only last 2 */
  const [showAllSets, setShowAllSets] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [menuOpenSetId, setMenuOpenSetId] = useState<string | null>(null);
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
        onSetLogUpsert?.(block.block.id, newEntry, { replaceId: tempId });
      });
    });
    return () => {};
  }, [registerSetLogIdResolved, onSetLogUpsert, block.block.id]);
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
    if (reps.length !== exercises.length) {
      setReps(new Array(exercises.length).fill(""));
    }
  }, [
    exercises.length,
    completedSets,
    isViewingLoggedSet,
    lastPerformedWeightByExerciseId,
    lastSessionWeightByExerciseId,
    e1rmMap,
    weightsPristine,
  ]);

  // Block details
  const blockDetails: BlockDetail[] = [
    {
      label: "ROUNDS",
      value: totalSets,
    },
    {
      label: "REST BETWEEN",
      value: block.block.rest_seconds || 90,
      unit: "s",
    },
  ];

  // Add exercises list
  exercises.forEach((ex, idx) => {
    if (ex.reps) {
      blockDetails.push({
        label: `${idx + 1}. ${ex.exercise?.name || `Exercise ${idx + 1}`}`,
        value: `${ex.reps} reps`,
      });
      if (ex.load_percentage) {
        const suggestedWeight = calculateSuggestedWeightUtil(
          ex.exercise_id,
          ex.load_percentage,
          e1rmMap,
        );
        const loadDisplay = formatLoadPercentage(
          ex.load_percentage,
          suggestedWeight,
        );
        if (loadDisplay) {
          blockDetails.push({
            label: `LOAD (${idx + 1})`,
            value: loadDisplay,
          });
        }
      }
    }
  });

  const instructions = block.block.set_notes || undefined;

  const roundNumbersLogged = [
    ...new Set(loggedSetsList.map((s) => s.set_number)),
  ].sort((a, b) => a - b);
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
        const w = parseFloat(weights[idx] || "0");
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
      const payload = buildSetEditPatchPayload(block.block.set_type, {
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
          const w = parseFloat(weights[idx] || "0");
          const r = parseInt(reps[idx] || "0", 10);
          return { ...s, weight_kg: w, reps_completed: r };
        });
        const toUpsert = next.filter((s) => s.set_number === viewingSetIndex);
        toUpsert.forEach((e) => onSetEditSaved?.(block.block.id, e));
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
    setMenuOpenSetId(null);
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
          blockTypeFromUI: block.block.set_type,
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
        const w = parseFloat(editDraft.weights[idx] || "0");
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
      const payload = buildSetEditPatchPayload(block.block.set_type, {
        round_number: editDraft.round_number,
        giant_set_exercises: giantSetExercises,
      });
      if (process.env.NODE_ENV !== "production") {
        console.log("[SAVE EDITS]", {
          executor: "GiantSetExecutor",
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
        const next = loggedSetsList.map((s) => {
          if (s.set_number !== editDraft.round_number) return s;
          const idx = exercises.findIndex(
            (e) => e.exercise_id === s.exercise_id,
          );
          const w = parseFloat(editDraft.weights[idx] || "0");
          const r = parseInt(editDraft.reps[idx] || "0", 10);
          return { ...s, weight_kg: w, reps_completed: r };
        });
        const toUpsert = next.filter(
          (s) => s.set_number === editDraft.round_number,
        );
        toUpsert.forEach((e) => onSetEditSaved?.(block.block.id, e));
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

  const handleLog = async () => {
    if (exercises.length === 0 || isLoggingSet) return;

    const allValid = exercises.every((_, idx) => {
      const weightStr = weights[idx];
      const repsStr = reps[idx];

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
      const weight = parseFloat(String(weightStr));
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
          const weightNum = parseFloat(weights[idx] || "0");
          const repsNum = parseInt(reps[idx] || "0");
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
        round_number: completedSets + 1,
        isLastSet: (completedSets + 1) >= totalSets,
      };

      if (giantSetExercises.length > 0) {
        logData.giant_set_exercises = giantSetExercises;
      }

      const result = await logSetToDatabase(logData);

      const setLogId =
        (result as { set_log_id?: string }).set_log_id ?? `temp-${Date.now()}`;
      const roundNumber = completedSets + 1;
      const newEntries: LoggedSet[] = exercises.map(
        (exercise, idx) =>
          ({
            id: setLogId,
            exercise_id: exercise.exercise_id,
            set_entry_id: block.block.id,
            set_number: roundNumber,
            weight_kg: parseFloat(weights[idx] || "0"),
            reps_completed: parseInt(reps[idx] || "0"),
            completed_at: new Date(),
          }) as LoggedSet,
      );

      if (result.success) {
        newEntries.forEach((e) => onSetLogUpsert?.(block.block.id, e));
        setViewingSetIndex(0);

        addToast({
          title: "Giant Set Logged!",
          description: `${exercises.length} exercises completed`,
          variant: "success",
          duration: 2000,
        });

        const newCompletedSets = completedSets + 1;
        const updatedLoggedSets = [...loggedSetsList, ...newEntries];
        if (newCompletedSets < totalSets) {
          const firstWeight = parseFloat(weights[0] || "0");
          const firstReps = parseInt(reps[0] || "0", 10);
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
          onBlockComplete(block.block.id, updatedLoggedSets);
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

  const loggingInputs = (
    <div className="space-y-4">
      {allowSetEditDelete && roundNumbersLogged.length > 0 && (
        <div
          className="rounded-xl border p-3"
          style={{
            borderColor: "var(--fc-surface-card-border)",
            background: "var(--fc-surface-sunken)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold fc-text-dim uppercase tracking-wider">
              Logged rounds
            </div>
            {roundNumbersLogged.length > 2 && (
              <button
                type="button"
                onClick={() => setShowAllSets(!showAllSets)}
                className="text-xs font-medium fc-text-dim hover:fc-text-primary transition-colors"
              >
                {showAllSets ? (
                  <>Show less ▲</>
                ) : (
                  <>Show all {roundNumbersLogged.length} sets ▼</>
                )}
              </button>
            )}
          </div>
          <ul className="space-y-1.5">
            {(showAllSets ? roundNumbersLogged : roundNumbersLogged.slice(-2)).map((roundNum) => {
              // Calculate the actual index in the full list for isLatestSet
              const actualIndex = showAllSets 
                ? roundNumbersLogged.indexOf(roundNum)
                : roundNumbersLogged.length - 2 + roundNumbersLogged.slice(-2).indexOf(roundNum);
              const isLatestRound = actualIndex === roundNumbersLogged.length - 1;
              const forRound = loggedSetsList.filter(
                (s) => s.set_number === roundNum,
              );
              const label = forRound
                .sort(
                  (a, b) =>
                    exercises.findIndex(
                      (e) => e.exercise_id === a.exercise_id,
                    ) -
                    exercises.findIndex((e) => e.exercise_id === b.exercise_id),
                )
                .map((s) => `${s.weight_kg ?? "—"}×${s.reps_completed ?? "—"}`)
                .join(", ");
              const firstId = forRound[0]?.id ?? "";
              const rpeForRound = forRound[0]?.rpe ?? null;
              return (
                <li
                  key={`round-${roundNum}`}
                  className="flex flex-col gap-1.5 py-1.5 px-2 rounded-lg"
                  style={{ background: "var(--fc-surface-elevated)" }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm fc-text-primary">
                      Round {roundNum}: {label}
                    </span>
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
                            onClick={() => handleEditSet(forRound[0])}
                          >
                            <Pencil className="w-4 h-4" /> Edit
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <InlineRPERow
                    setLogId={firstId.startsWith("temp-") ? null : firstId}
                    currentRPE={rpeForRound}
                    onRPESelect={async (rpe) => {
                      // Update RPE for the first entry in the round (represents the round)
                      const updatedEntry: LoggedSet = {
                        ...forRound[0]!,
                        rpe,
                      };
                      onSetLogUpsert?.(block.block.id, updatedEntry, {
                        replaceId: forRound[0]!.id,
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
                              ...forRound[0]!,
                              rpe: forRound[0]!.rpe ?? undefined,
                            };
                            onSetLogUpsert?.(block.block.id, revertedEntry, {
                              replaceId: forRound[0]!.id,
                            });
                          }
                        } catch (err) {
                          console.error("Error updating RPE:", err);
                          const revertedEntry: LoggedSet = {
                            ...forRound[0]!,
                            rpe: forRound[0]!.rpe ?? undefined,
                          };
                          onSetLogUpsert?.(block.block.id, revertedEntry, {
                            replaceId: forRound[0]!.id,
                          });
                        }
                      }
                    }}
                    isLatestSet={isLatestRound}
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
            aria-label="Previous round"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="text-sm font-medium fc-text-primary min-w-[100px] text-center">
            Round {displaySetNumber} of {totalSets}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() =>
              setViewingSetIndex((i) => Math.min(maxViewableRound, i + 1))
            }
            disabled={viewingSetIndex >= maxViewableRound}
            aria-label="Next round"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      )}
      {exercises.map((exercise, idx) => (
        <div
          key={exercise.id || idx}
          className="p-4 rounded-xl"
          style={{ background: "var(--fc-surface-sunken)" }}
        >
          <div className="mb-4">
            <h4 className="font-semibold fc-text-primary text-lg">
              {idx + 1}. {exercise.exercise?.name || `Exercise ${idx + 1}`}
              {exercise.exercise_letter && ` (${exercise.exercise_letter})`}
            </h4>
            <ExerciseActionButtons
              exercise={exercise}
              onVideoClick={onVideoClick}
              onAlternativesClick={onAlternativesClick}
            />
          </div>
          {exercise.exercise_id && (
            <ProgressionNudge
              suggestion={progressionSuggestionsMap?.get(exercise.exercise_id)}
              previousPerformance={previousPerformanceMap?.get(exercise.exercise_id) ?? null}
              onApplySuggestion={(w, r) => {
                if (w != null) {
                  setWeightsPristine((prev) => {
                    const next = [...(prev.length ? prev : new Array(exercises.length).fill(true))];
                    next[idx] = false;
                    return next;
                  });
                  const newWeights = [...weights];
                  newWeights[idx] = String(w);
                  setWeights(newWeights);
                }
                if (r != null) {
                  const newReps = [...reps];
                  newReps[idx] = String(r);
                  setReps(newReps);
                }
              }}
            />
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <LargeInput
                label="Weight"
                value={
                  editDraft
                    ? (editDraft.weights[idx] ?? "")
                    : weights[idx] || ""
                }
                onChange={(value) => {
                  if (editDraft) {
                    setEditDraft((d) =>
                      d
                        ? {
                            ...d,
                            weights: d.weights.map((w, i) =>
                              i === idx ? value : w,
                            ),
                          }
                        : null,
                    );
                  } else {
                    setWeightsPristine((prev) => {
                      const next = [
                        ...(prev.length
                          ? prev
                          : new Array(exercises.length).fill(true)),
                      ];
                      if (next[idx] !== false) next[idx] = false;
                      return next;
                    });
                    const newWeights = [...weights];
                    newWeights[idx] = value;
                    setWeights(newWeights);
                  }
                }}
                placeholder="0"
                step="0.5"
                unit="kg"
                showStepper
                stepAmount={2.5}
              />
              {!editDraft &&
                (() => {
                  const coachSuggested = getCoachSuggestedWeight(
                    exercise.load_percentage,
                    exercise.exercise_id
                      ? (e1rmMap[exercise.exercise_id] ?? null)
                      : null,
                  );
                  return coachSuggested != null && coachSuggested > 0 ? (
                    <ApplySuggestedWeightButton
                      suggestedKg={coachSuggested}
                      onApply={() => {
                        setWeightsPristine((prev) => {
                          const next = [
                            ...(prev.length
                              ? prev
                              : new Array(exercises.length).fill(true)),
                          ];
                          next[idx] = false;
                          return next;
                        });
                        const newWeights = [...weights];
                        newWeights[idx] = String(coachSuggested);
                        setWeights(newWeights);
                      }}
                    />
                  ) : null;
                })()}
            </div>
            <LargeInput
              label="Reps"
              value={editDraft ? (editDraft.reps[idx] ?? "") : reps[idx] || ""}
              onChange={(value) => {
                if (editDraft) {
                  setEditDraft((d) =>
                    d
                      ? {
                          ...d,
                          reps: d.reps.map((r, i) => (i === idx ? value : r)),
                        }
                      : null,
                  );
                } else {
                  const newReps = [...reps];
                  newReps[idx] = value;
                  setReps(newReps);
                }
              }}
              placeholder="0"
              step="1"
              showStepper
              stepAmount={1}
            />
          </div>
        </div>
      ))}
    </div>
  );

  const isEditMode = !!editingSetId && !!editDraft;
  const forViewedRound =
    viewingSetIndex >= 1
      ? loggedSetsList.filter((s) => s.set_number === viewingSetIndex)
      : [];
  const viewedSetEntry = forViewedRound[0] ?? null;
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
          editDraft.weights.some(
            (w, i) => !w?.trim() || isNaN(parseFloat(w)) || parseFloat(w) < 0,
          ) ||
          editDraft.reps.some(
            (r, i) =>
              !r?.trim() || isNaN(parseInt(r, 10)) || parseInt(r, 10) <= 0,
          )
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
      Edit this round
    </Button>
  ) : (
    <Button
      onClick={handleLog}
      disabled={isLoggingSet || completedSets >= totalSets}
      variant="fc-primary"
      className="w-full h-12 text-base font-bold uppercase tracking-wider rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Flame className="w-5 h-5 mr-2" />
      {isLoggingSet ? "Logging..." : "LOG GIANT SET"}
    </Button>
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
        onPlateCalculatorClick,
        onRestTimerClick,
      }}
      exerciseName={`Giant Set: ${exercises.length} Exercises`}
      blockDetails={blockDetails}
      instructions={instructions}
      currentSet={displaySetNumber}
      totalSets={totalSets}
      progressLabel="Round"
      loggingInputs={loggingInputs}
      logButton={logButton}
      showNavigation={true}
      currentExercise={exercises[0]}
      showRestTimer={!!block.block.rest_seconds}
    />
  );
}
