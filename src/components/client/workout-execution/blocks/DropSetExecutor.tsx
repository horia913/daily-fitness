"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Pencil,
  Plus,
} from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import {
  BaseBlockExecutorLayout,
  formatLoadPercentage,
  calculateSuggestedWeightUtil,
} from "../BaseBlockExecutor";
import { LargeInput } from "../ui/LargeInput";
import { BlockDetail, BaseBlockExecutorProps } from "../types";
import { LoggedSet } from "@/types/workoutBlocks";
import { InlineRPERow } from "../ui/InlineRPERow";
import { useLoggingReset } from "../hooks/useLoggingReset";
import {
  getWeightDefaultAndSuggestion,
  getCoachSuggestedWeight,
} from "@/lib/weightDefaultService";
import { ApplySuggestedWeightButton } from "../ui/ApplySuggestedWeightButton";
import { fetchApi } from "@/lib/apiClient";
import { buildSetEditPatchPayload } from "@/lib/setEditPayload";

export function DropSetExecutor({
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
  progressionSuggestion,
  previousPerformanceMap,
  allowSetEditDelete = false,
  registerSetLogIdResolved,
  onSetLogUpsert,
  onSetEditSaved,
  loggedSets,
}: BaseBlockExecutorProps) {
  const { addToast } = useToast();
  const currentExercise = block.block.exercises?.[currentExerciseIndex];
  const totalSets = block.block.total_sets || 1;
  const completedSets = block.completedSets || 0;
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
  const [isWeightPristine, setIsWeightPristine] = useState(true);
  const [viewingSetIndex, setViewingSetIndex] = useState(0);
  /** Collapsible set history: show all sets or only last 2 */
  const [showAllSets, setShowAllSets] = useState(false);
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
      onSetLogUpsert?.(block.block.id, newEntry, { replaceId: oldEntry.id });
    });
    return () => {};
  }, [registerSetLogIdResolved, onSetLogUpsert, block.block.id]);
  useEffect(() => {
    if (viewingSetIndex > loggedSetsList.length)
      setViewingSetIndex(loggedSetsList.length);
  }, [loggedSetsList.length, viewingSetIndex]);
  useEffect(() => {
    if (viewingSetIndex >= 1 && loggedSetsList[viewingSetIndex - 1]) {
      const s = loggedSetsList[viewingSetIndex - 1] as LoggedSet & { dropset_drops?: Array<{ weight: number; reps: number }> };
      const stored = s.dropset_drops;
      if (Array.isArray(stored) && stored.length >= 2) {
        setDrops(stored.map((d) => ({ weight: String(d.weight), reps: String(d.reps) })));
      } else {
        setDrops([
          { weight: String(s.weight_kg ?? ""), reps: String(s.reps_completed ?? "") },
          { weight: String((s.weight_kg ?? 0) * 0.8), reps: String(s.reps_completed ?? "") },
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
  const { default_weight, suggested_weight, source } =
    getWeightDefaultAndSuggestion({
      sessionStickyWeight: sessionStickyWeight ?? null,
      lastSessionWeight: lastSessionWeight ?? null,
      loadPercentage,
      e1rm: e1rm ?? null,
    });
  const coachSuggestedWeight = getCoachSuggestedWeight(loadPercentage, e1rm);

  const exerciseReps = currentExercise?.reps || block.block.reps_per_set || "";
  const dropSetReps = exerciseReps;

  useEffect(() => {
    setIsWeightPristine(true);
  }, [completedSets, currentExerciseIndex, exerciseId]);

  useEffect(() => {
    if (viewingSetIndex >= 1) return;
    if (!isWeightPristine) return;
    if (default_weight != null && default_weight > 0) {
      const dropWeightValue = default_weight * 0.8;
      setDrops([
        { weight: String(default_weight), reps: "" },
        { weight: String(Math.round(dropWeightValue * 2) / 2), reps: "" },
      ]);
    } else {
      setDrops([{ weight: "", reps: "" }, { weight: "", reps: "" }]);
    }
  }, [viewingSetIndex, isWeightPristine, default_weight, completedSets, exerciseId]);

  // Block details
  const blockDetails: BlockDetail[] = [
    {
      label: "SETS",
      value: totalSets,
    },
    {
      label: "INITIAL REPS",
      value: exerciseReps,
    },
    {
      label: "DROPS",
      value: "2-5",
    },
    {
      label: "REST",
      value: currentExercise?.rest_seconds || block.block.rest_seconds || 60,
      unit: "s",
    },
  ];

  if (currentExercise?.load_percentage != null) {
    const suggestedForDisplay =
      source === "percent_e1rm" ? suggested_weight : null;
    const loadDisplay = formatLoadPercentage(
      currentExercise.load_percentage,
      suggestedForDisplay,
    );
    if (loadDisplay) {
      blockDetails.push({ label: "LOAD", value: loadDisplay });
    }
  }

  const instructions =
    currentExercise?.notes || block.block.set_notes || undefined;

  const handleEditSet = (setEntry: LoggedSet) => {
    const s = setEntry as LoggedSet & { dropset_drops?: Array<{ weight: number; reps: number }> };
    const stored = s.dropset_drops;
    let editDrops: Array<{ weight: string; reps: string }>;
    if (Array.isArray(stored) && stored.length >= 2) {
      editDrops = stored.map((d) => ({ weight: String(d.weight), reps: String(d.reps) }));
    } else {
      editDrops = [
        { weight: String(setEntry.weight_kg ?? ""), reps: String(setEntry.reps_completed ?? "") },
        { weight: String((setEntry.weight_kg ?? 0) * 0.8), reps: String(setEntry.reps_completed ?? "") },
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
    const dropsParsed = editDraft.drops
      .map((d) => ({ weight: parseFloat(d.weight), reps: parseInt(d.reps, 10) }))
      .filter((d) => !isNaN(d.weight) && d.weight >= 0 && !isNaN(d.reps) && d.reps > 0);
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
      const payload = buildSetEditPatchPayload(block.block.set_type, {
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
          blockTypeFromUI: block.block.set_type,
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
        const updatedEntry: LoggedSet & { dropset_drops?: Array<{ weight: number; reps: number }> } = {
          ...current,
          id: editingSetId,
          exercise_id:
            current?.exercise_id ?? currentExercise?.exercise_id ?? "",
          set_entry_id: block.block.id,
          set_number: editDraft.set_number,
          weight_kg: w0,
          reps_completed: r0,
          completed_at: current?.completed_at ?? new Date(),
          dropset_drops: dropsParsed,
        };
        onSetEditSaved?.(block.block.id, updatedEntry);
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

    const dropsParsed = drops
      .map((d) => ({ weight: parseFloat(d.weight), reps: parseInt(d.reps, 10) }))
      .filter((d) => !isNaN(d.weight) && d.weight >= 0 && !isNaN(d.reps) && d.reps > 0);

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
      const dropPct = initialWeightNum > 0 ? ((initialWeightNum - last.weight) / initialWeightNum) * 100 : 0;

      const logData: any = {
        set_type: "dropset",
        set_number: currentSetNumber,
        isLastSet: currentSetNumber >= totalSets,
        dropset_drops: dropsParsed,
        dropset_initial_weight: initialWeightNum,
        dropset_initial_reps: initialRepsNum,
        dropset_final_weight: last.weight,
        dropset_final_reps: last.reps,
        dropset_percentage: dropPct,
      };

      if (currentExercise?.exercise_id)
        logData.exercise_id = currentExercise.exercise_id;

      const result = await logSetToDatabase(logData);

      if (result.success) {
        const newLoggedSet: LoggedSet & { dropset_drops?: Array<{ weight: number; reps: number }> } = {
          id: result.set_log_id || `temp-${currentSetNumber}-${Date.now()}`,
          exercise_id: currentExercise.exercise_id,
          set_entry_id: block.block.id,
          set_number: currentSetNumber,
          weight_kg: initialWeightNum,
          reps_completed: initialRepsNum,
          completed_at: new Date(),
          dropset_drops: dropsParsed,
        } as LoggedSet;
        onSetLogUpsert?.(block.block.id, newLoggedSet);

        if (result.e1rm && onE1rmUpdate) {
          onE1rmUpdate(currentExercise.exercise_id, result.e1rm);
        }

        addToast({
          title: "Drop Set Logged!",
          description: `${initialWeightNum}kg × ${initialRepsNum} reps → ${last.weight}kg × ${last.reps} reps`,
          variant: "success",
          duration: 2000,
        });

        const newCompletedSets = currentSetNumber;
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
          onBlockComplete(block.block.id, [...loggedSetsList, newLoggedSet]);
        }
        setDrops([{ weight: String(initialWeightNum), reps: "" }, { weight: String(Math.round(last.weight * 0.9 * 2) / 2), reps: "" }]);
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

  const loggingInputs = (
    <div className="space-y-4">
      {allowSetEditDelete && loggedSetsList.length > 0 && (
        <div className="border-t border-white/10 pt-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <div className="text-xs font-semibold fc-text-dim uppercase tracking-wider">
              Logged sets
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
          <ul className="flex flex-col border-y border-white/5">
            {(showAllSets ? loggedSetsList : loggedSetsList.slice(-2)).map((setEntry, index) => {
              // Calculate the actual index in the full list for isLatestSet
              const actualIndex = showAllSets ? index : loggedSetsList.length - 2 + index;
              const isLatestSet = actualIndex === loggedSetsList.length - 1;
              return (
              <li
                key={setEntry.id}
                className="flex flex-col gap-1.5 border-b border-white/5 py-3 px-1 last:border-b-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm fc-text-primary">
                    Set {setEntry.set_number}: {setEntry.weight_kg ?? "—"} kg ×{" "}
                    {setEntry.reps_completed ?? "—"} reps
                  </span>
                  <div className="relative flex items-center">
                    <button
                      type="button"
                      onClick={() =>
                        setMenuOpenSetId(
                          menuOpenSetId === setEntry.id ? null : setEntry.id,
                        )
                      }
                      className="p-1.5 rounded-lg fc-text-dim hover:fc-text-primary focus:outline-none focus:ring-2"
                      aria-label="Options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {menuOpenSetId === setEntry.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setMenuOpenSetId(null)}
                          aria-hidden
                        />
                        <div
                          className="absolute right-0 top-full mt-1 z-20 py-1 rounded-lg shadow-lg min-w-[120px]"
                          style={{
                            background: "var(--fc-surface-elevated)",
                            border: "1px solid var(--fc-surface-card-border)",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => handleEditSet(setEntry)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:opacity-80"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </button>
                        </div>
                      </>
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
          <span className="text-xs font-semibold fc-text-dim uppercase tracking-wider min-w-[6rem] text-center">
            Set {displaySetNumber} of {totalSets}
          </span>
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
        <h4
          className="font-semibold mb-4 text-lg"
          style={{ color: "var(--fc-accent-cyan)" }}
        >
          {editDraft ? "Edit set" : "Drop Set — Set " + displaySetNumber + " of " + totalSets}
        </h4>
        {(editDraft ? editDraft.drops : drops).map((drop, idx) => (
          <div key={idx} className="mb-4">
            <h5 className="text-sm font-medium fc-text-dim mb-2">
              {idx === 0 ? "Initial" : `Drop ${idx}`}
            </h5>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <LargeInput
                  label="Weight"
                  value={drop.weight}
                  onChange={(val) => {
                    if (editDraft)
                      setEditDraft((d) =>
                        d
                          ? {
                              ...d,
                              drops: d.drops.map((x, i) =>
                                i === idx ? { ...x, weight: val } : x,
                              ),
                            }
                          : null,
                      );
                    else {
                      setIsWeightPristine(false);
                      setDrops((prev) =>
                        prev.map((x, i) =>
                          i === idx ? { ...x, weight: val } : x,
                        ),
                      );
                    }
                  }}
                  placeholder="0"
                  step="0.5"
                  unit="kg"
                  showStepper
                  stepAmount={2.5}
                />
                {!editDraft && idx === 0 && coachSuggestedWeight != null && coachSuggestedWeight > 0 && (
                  <ApplySuggestedWeightButton
                    suggestedKg={coachSuggestedWeight}
                    onApply={() => {
                      setDrops((prev) => [
                        { weight: String(coachSuggestedWeight), reps: prev[0]?.reps ?? "" },
                        ...prev.slice(1),
                      ]);
                      setIsWeightPristine(false);
                    }}
                  />
                )}
              </div>
              <LargeInput
                label="Reps"
                value={drop.reps}
                onChange={(val) => {
                  if (editDraft)
                    setEditDraft((d) =>
                      d
                        ? {
                            ...d,
                            drops: d.drops.map((x, i) =>
                              i === idx ? { ...x, reps: val } : x,
                            ),
                          }
                        : null,
                    );
                  else
                    setDrops((prev) =>
                      prev.map((x, i) => (i === idx ? { ...x, reps: val } : x)),
                    );
                }}
                placeholder="0"
                step="1"
                showStepper
                stepAmount={1}
              />
            </div>
            {idx > 0 && (editDraft ? editDraft.drops : drops).length > 2 && (
              <button
                type="button"
                onClick={() => {
                  if (editDraft)
                    setEditDraft((d) =>
                      d
                        ? {
                            ...d,
                            drops: d.drops.filter((_, i) => i !== idx),
                          }
                        : null,
                    );
                  else
                    setDrops((prev) => prev.filter((_, i) => i !== idx));
                }}
                className="mt-2 text-xs text-amber-500 hover:underline"
              >
                Remove drop
              </button>
            )}
          </div>
        ))}
        {!editDraft && drops.length < MAX_DROPS && (
          <button
            type="button"
            onClick={() =>
              setDrops((prev) => [
                ...prev,
                {
                  weight: prev.length > 0 ? String(Math.round(parseFloat(prev[prev.length - 1].weight || "0") * 0.85 * 2) / 2) : "",
                  reps: "",
                },
              ])
            }
            className="text-sm fc-text-dim hover:fc-text-primary flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Add Drop
          </button>
        )}
        {editDraft && editDraft.drops.length < MAX_DROPS && (
          <button
            type="button"
            onClick={() =>
              setEditDraft((d) =>
                d
                  ? {
                      ...d,
                      drops: [
                        ...d.drops,
                        {
                          weight: d.drops.length > 0
                            ? String(Math.round(parseFloat(d.drops[d.drops.length - 1].weight || "0") * 0.85 * 2) / 2)
                            : "",
                          reps: "",
                        },
                      ],
                    }
                  : null,
              )
            }
            className="text-sm fc-text-dim hover:fc-text-primary flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Add Drop
          </button>
        )}
      </div>
    </div>
  );

  const isEditMode = !!editingSetId && !!editDraft;
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
          editDraft.drops.length < 2 ||
          editDraft.drops.some(
            (d) =>
              isNaN(parseFloat(d.weight)) ||
              parseFloat(d.weight) < 0 ||
              isNaN(parseInt(d.reps, 10)) ||
              parseInt(d.reps, 10) <= 0
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
      Edit this set
    </Button>
  ) : (
    <Button
      onClick={handleLog}
      disabled={isLoggingSet || completedSets >= totalSets}
      variant="fc-primary"
      className="w-full h-12 text-base font-bold uppercase tracking-wider rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <TrendingDown className="w-5 h-5 mr-2" />
      {isLoggingSet ? "Logging..." : "LOG DROP SET"}
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
        progressionSuggestion,
        previousPerformanceMap,
      }}
      exerciseName={currentExercise?.exercise?.name || "Exercise"}
      blockDetails={blockDetails}
      instructions={instructions}
      currentSet={displaySetNumber}
      totalSets={totalSets}
      progressLabel="Set"
      loggingInputs={loggingInputs}
      logButton={logButton}
      showNavigation={true}
      currentExercise={currentExercise}
      showRestTimer={
        !!(block.block.rest_seconds || currentExercise?.rest_seconds)
      }
      onApplySuggestion={(w, _r) => {
        if (w != null) setDrops((prev) => [{ ...prev[0], weight: String(w) }, ...prev.slice(1)]);
      }}
    />
  );
}
