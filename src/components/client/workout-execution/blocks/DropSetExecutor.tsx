"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  TrendingDown,
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

  const [initialWeight, setInitialWeight] = useState("");
  const [initialReps, setInitialReps] = useState("");
  const [dropWeight, setDropWeight] = useState("");
  const [dropReps, setDropReps] = useState("");
  const [isLoggingSet, setIsLoggingSet] = useState(false);
  useLoggingReset(isLoggingSet, setIsLoggingSet);
  const isManuallyEditingDropWeight = useRef(false);
  const [isWeightPristine, setIsWeightPristine] = useState(true);
  const [viewingSetIndex, setViewingSetIndex] = useState(0);
  /** Collapsible set history: show all sets or only last 2 */
  const [showAllSets, setShowAllSets] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [menuOpenSetId, setMenuOpenSetId] = useState<string | null>(null);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    initialWeight: string;
    initialReps: string;
    dropWeight: string;
    dropReps: string;
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

  const dropPercentage = 20;

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
      const s = loggedSetsList[viewingSetIndex - 1];
      setInitialWeight(String(s.weight_kg ?? ""));
      setInitialReps(String(s.reps_completed ?? ""));
      const dropVal = (s.weight_kg ?? 0) * (1 - dropPercentage / 100);
      setDropWeight(String(Math.round(dropVal * 2) / 2));
    }
  }, [viewingSetIndex, loggedSetsList, dropPercentage]);

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
      setInitialWeight(String(default_weight));
      const dropWeightValue = default_weight * (1 - dropPercentage / 100);
      setDropWeight(String(Math.round(dropWeightValue * 2) / 2));
    } else {
      setInitialWeight("");
      setDropWeight("");
    }
  }, [
    viewingSetIndex,
    isWeightPristine,
    default_weight,
    completedSets,
    exerciseId,
    dropPercentage,
  ]);

  // Auto-calculate drop weight when initial weight changes
  // Always recalculate when initial weight changes (unless user is actively editing drop weight)
  useEffect(() => {
    // Skip auto-calculation if user is currently manually editing drop weight field
    if (isManuallyEditingDropWeight.current) {
      return;
    }

    if (initialWeight) {
      const initialWeightNum = parseFloat(initialWeight);
      if (!isNaN(initialWeightNum) && initialWeightNum > 0) {
        // Calculate drop weight: initial weight * (1 - drop percentage / 100)
        // Round to nearest 0.5kg for practical weight selection
        const dropWeightValue = initialWeightNum * (1 - dropPercentage / 100);
        const roundedDropWeight = Math.round(dropWeightValue * 2) / 2;
        setDropWeight(roundedDropWeight.toString());
      } else if (initialWeightNum === 0 || isNaN(initialWeightNum)) {
        // Clear drop weight if initial weight is invalid
        setDropWeight("");
      }
    } else {
      // Clear drop weight if initial weight is cleared
      setDropWeight("");
    }
  }, [initialWeight, dropPercentage]);

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
      label: "DROP",
      value: `${dropPercentage}%`,
    },
    {
      label: "AFTER DROP",
      value: `${dropSetReps} reps`,
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
    const dropVal = (setEntry.weight_kg ?? 0) * (1 - dropPercentage / 100);
    setEditingSetId(setEntry.id);
    setEditDraft({
      initialWeight: String(setEntry.weight_kg ?? ""),
      initialReps: String(setEntry.reps_completed ?? ""),
      dropWeight: String(Math.round(dropVal * 2) / 2),
      dropReps: String(setEntry.reps_completed ?? ""),
      set_number: setEntry.set_number ?? 1,
    });
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
    const w0 = parseFloat(editDraft.initialWeight);
    const r0 = parseInt(editDraft.initialReps, 10);
    const w1 = parseFloat(editDraft.dropWeight);
    const r1 = parseInt(editDraft.dropReps, 10);
    if (
      isNaN(w0) ||
      w0 < 0 ||
      isNaN(r0) ||
      r0 <= 0 ||
      isNaN(w1) ||
      w1 < 0 ||
      isNaN(r1) ||
      r1 <= 0
    ) {
      addToast({
        title: "Invalid values",
        description: "Weight and reps must be valid",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    const pct = w0 > 0 ? ((w0 - w1) / w0) * 100 : dropPercentage;
    setIsSavingEdit(true);
    try {
      const payload = buildSetEditPatchPayload(block.block.set_type, {
        dropset_initial_weight: w0,
        dropset_initial_reps: r0,
        dropset_final_weight: w1,
        dropset_final_reps: r1,
        dropset_percentage: pct,
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
        const updatedEntry: LoggedSet = {
          ...current,
          id: editingSetId,
          exercise_id:
            current?.exercise_id ?? currentExercise?.exercise_id ?? "",
          set_entry_id: block.block.id,
          set_number: editDraft.set_number,
          weight_kg: w0,
          reps_completed: r0,
          completed_at: current?.completed_at ?? new Date(),
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

    const initialWeightNum = parseFloat(initialWeight);
    const initialRepsNum = parseInt(initialReps);
    const dropWeightNum = parseFloat(dropWeight);
    const dropRepsNum = parseInt(dropReps);

    if (
      !initialWeight ||
      initialWeight.trim() === "" ||
      isNaN(initialWeightNum) ||
      initialWeightNum < 0 ||
      !initialReps ||
      initialReps.trim() === "" ||
      isNaN(initialRepsNum) ||
      initialRepsNum <= 0 ||
      !dropWeight ||
      dropWeight.trim() === "" ||
      isNaN(dropWeightNum) ||
      dropWeightNum < 0 ||
      !dropReps ||
      dropReps.trim() === "" ||
      isNaN(dropRepsNum) ||
      dropRepsNum <= 0
    ) {
      addToast({
        title: "Invalid Input",
        description:
          "Please enter valid weight and reps for both initial and drop sets",
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
      // Calculate drop percentage
      const dropPercentage =
        initialWeightNum > 0
          ? ((initialWeightNum - dropWeightNum) / initialWeightNum) * 100
          : 0;

      const logData: any = {
        set_type: "dropset",
        set_number: currentSetNumber,
      };

      // Only add fields if they're defined
      if (currentExercise?.exercise_id)
        logData.exercise_id = currentExercise.exercise_id;
      if (initialWeightNum !== undefined && initialWeightNum !== null)
        logData.dropset_initial_weight = initialWeightNum;
      if (initialRepsNum !== undefined && initialRepsNum !== null)
        logData.dropset_initial_reps = initialRepsNum;
      if (dropWeightNum !== undefined && dropWeightNum !== null)
        logData.dropset_final_weight = dropWeightNum;
      if (dropRepsNum !== undefined && dropRepsNum !== null)
        logData.dropset_final_reps = dropRepsNum;
      if (dropPercentage !== undefined && dropPercentage !== null)
        logData.dropset_percentage = dropPercentage;

      const result = await logSetToDatabase(logData);

      if (result.success) {
        const newLoggedSet: LoggedSet = {
          id: result.set_log_id || `temp-${currentSetNumber}-${Date.now()}`,
          exercise_id: currentExercise.exercise_id,
          set_entry_id: block.block.id,
          set_number: currentSetNumber,
          weight_kg: initialWeightNum,
          reps_completed: initialRepsNum,
          completed_at: new Date(),
        } as LoggedSet;
        onSetLogUpsert?.(block.block.id, newLoggedSet);

        if (result.e1rm && onE1rmUpdate) {
          onE1rmUpdate(currentExercise.exercise_id, result.e1rm);
        }

        addToast({
          title: "Drop Set Logged!",
          description: `${initialWeightNum}kg × ${initialRepsNum} reps → ${dropWeightNum}kg × ${dropRepsNum} reps`,
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
        } else {
          // Advancing to next set: parent updates lastPerformedWeightByExerciseId and completedSets; useEffect will apply defaults
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
          {editDraft ? "Edit set" : "Initial (100%)"}
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <LargeInput
              label="Weight"
              value={editDraft ? editDraft.initialWeight : initialWeight}
              onChange={(val) => {
                if (editDraft)
                  setEditDraft((d) =>
                    d ? { ...d, initialWeight: val } : null,
                  );
                else {
                  setIsWeightPristine(false);
                  setInitialWeight(val);
                }
              }}
              placeholder="0"
              step="0.5"
              unit="kg"
              showStepper
              stepAmount={2.5}
            />
            {!editDraft &&
              coachSuggestedWeight != null &&
              coachSuggestedWeight > 0 && (
                <ApplySuggestedWeightButton
                  suggestedKg={coachSuggestedWeight}
                  onApply={() => {
                    setInitialWeight(String(coachSuggestedWeight));
                    setIsWeightPristine(false);
                    const dropVal =
                      coachSuggestedWeight * (1 - dropPercentage / 100);
                    setDropWeight(String(Math.round(dropVal * 2) / 2));
                  }}
                />
              )}
          </div>
          <LargeInput
            label="Reps"
            value={editDraft ? editDraft.initialReps : initialReps}
            onChange={(val) => {
              if (editDraft)
                setEditDraft((d) => (d ? { ...d, initialReps: val } : null));
              else setInitialReps(val);
            }}
            placeholder="0"
            step="1"
            showStepper
            stepAmount={1}
          />
        </div>
      </div>

      {/* Drop Set */}
      <div
        className="p-4 rounded-xl"
        style={{ background: "var(--fc-surface-sunken)" }}
      >
        <h4
          className="font-semibold mb-4 text-lg"
          style={{ color: "var(--fc-status-error)" }}
        >
          After Drop ({100 - dropPercentage}%)
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <LargeInput
            label="Weight"
            value={editDraft ? editDraft.dropWeight : dropWeight}
            onChange={(value) => {
              if (editDraft)
                setEditDraft((d) => (d ? { ...d, dropWeight: value } : null));
              else {
                isManuallyEditingDropWeight.current = true;
                setDropWeight(value);
                setTimeout(() => {
                  isManuallyEditingDropWeight.current = false;
                }, 500);
              }
            }}
            placeholder="0"
            step="0.5"
            unit="kg"
            showStepper
            stepAmount={2.5}
          />
          <LargeInput
            label="Reps"
            value={editDraft ? editDraft.dropReps : dropReps}
            onChange={(val) => {
              if (editDraft)
                setEditDraft((d) => (d ? { ...d, dropReps: val } : null));
              else setDropReps(val);
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
          editDraft.initialWeight.trim() === "" ||
          editDraft.initialReps.trim() === "" ||
          editDraft.dropWeight.trim() === "" ||
          editDraft.dropReps.trim() === "" ||
          isNaN(parseFloat(editDraft.initialWeight)) ||
          parseFloat(editDraft.initialWeight) < 0 ||
          isNaN(parseInt(editDraft.initialReps, 10)) ||
          parseInt(editDraft.initialReps, 10) <= 0 ||
          isNaN(parseFloat(editDraft.dropWeight)) ||
          parseFloat(editDraft.dropWeight) < 0 ||
          isNaN(parseInt(editDraft.dropReps, 10)) ||
          parseInt(editDraft.dropReps, 10) <= 0
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
        if (w != null) setInitialWeight(String(w));
      }}
    />
  );
}
