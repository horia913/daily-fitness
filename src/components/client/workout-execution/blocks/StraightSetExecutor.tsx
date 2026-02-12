"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  MoreVertical,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import { LargeInput } from "../ui/LargeInput";
import { useLoggingReset } from "../hooks/useLoggingReset";
import { BlockDetail, BaseBlockExecutorProps } from "../types";
import {
  BaseBlockExecutorLayout,
  formatLoadPercentage,
  calculateSuggestedWeightUtil,
} from "../BaseBlockExecutor";
import { LoggedSet } from "@/types/workoutBlocks";
import {
  getWeightDefaultAndSuggestion,
  getCoachSuggestedWeight,
} from "@/lib/weightDefaultService";
import { ApplySuggestedWeightButton } from "../ui/ApplySuggestedWeightButton";
import { fetchApi } from "@/lib/apiClient";
import { buildSetEditPatchPayload } from "@/lib/setEditPayload";

interface StraightSetExecutorProps extends BaseBlockExecutorProps {}

export function StraightSetExecutor({
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
  onRestTimerClick,
  onSetComplete,
  onLastSetLoggedForRest,
  progressionSuggestion,
  registerUndo,
  allowSetEditDelete = false,
  registerSetLogIdResolved,
  onSetLogUpsert,
  onSetEditSaved,
  loggedSets,
}: StraightSetExecutorProps) {
  const { addToast } = useToast();
  const currentExercise = block.block.exercises?.[currentExerciseIndex];
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
  // Use exercise.sets if available, otherwise fall back to block.total_sets, then default to 1
  const totalSets =
    currentExercise?.sets !== null && currentExercise?.sets !== undefined
      ? currentExercise.sets
      : block.block.total_sets !== null && block.block.total_sets !== undefined
        ? block.block.total_sets
        : 1;
  const completedSets = block.completedSets || 0;

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
  const { default_weight, suggested_weight, source } =
    getWeightDefaultAndSuggestion({
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
      onSetLogUpsert?.(block.block.id, newEntry, { replaceId: oldEntry.id });
    });
    return () => {};
  }, [registerSetLogIdResolved, onSetLogUpsert, block.block.id]);

  // Apply truth-based default only when entering new set/exercise and pristine; never autofill e1RM/%
  useEffect(() => {
    setIsWeightPristine(true);
  }, [completedSets, currentExerciseIndex, exerciseId]);

  useEffect(() => {
    if (viewingSetIndex >= 1) return; // don't overwrite when viewing a previous set
    if (!isWeightPristine) return;
    if (default_weight != null && default_weight > 0) {
      setWeight(String(default_weight));
    } else {
      setWeight("");
    }
    setReps("");
  }, [
    viewingSetIndex,
    isWeightPristine,
    default_weight,
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
      rpe: setEntry.rir != null ? Number(setEntry.rir) : undefined,
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
          blockTypeFromUI: block.block.block_type,
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
    const w = parseFloat(editDraft.weight);
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
          blockTypeFromUI: block.block.block_type,
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
          block_id: block.block.id,
          set_number: editDraft.set_number,
          weight_kg: w,
          reps_completed: r,
          ...(editDraft.rpe != null && { rir: editDraft.rpe }),
          completed_at: current?.completed_at ?? new Date(),
        };
        onSetEditSaved?.(block.block.id, updatedEntry);
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
    const w = parseFloat(weight);
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
      const payload = buildSetEditPatchPayload(block.block.block_type, {
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
        onSetEditSaved?.(block.block.id, updatedEntry);
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

  // Get block details for display
  const blockDetails: BlockDetail[] = [
    {
      label: "SETS",
      value: totalSets,
    },
    {
      label: "REPS",
      value: currentExercise?.reps || block.block.reps_per_set || "-",
    },
    {
      label: "REST",
      value: currentExercise?.rest_seconds || block.block.rest_seconds || 60,
      unit: "s",
    },
  ];

  // Add LOAD if available (display only; suggestion chip shown separately when default_weight is null)
  const loadPercentageDisplay = currentExercise?.load_percentage;
  if (
    loadPercentageDisplay !== null &&
    loadPercentageDisplay !== undefined &&
    currentExercise?.exercise_id
  ) {
    const suggestedForDisplay =
      source === "percent_e1rm" ? suggested_weight : null;
    const loadDisplay = formatLoadPercentage(
      loadPercentageDisplay,
      suggestedForDisplay,
    );
    if (loadDisplay) {
      blockDetails.push({
        label: "LOAD",
        value: loadDisplay,
      });
    }
  }

  // Add TEMPO if available
  if (currentExercise?.tempo) {
    blockDetails.push({
      label: "TEMPO",
      value: currentExercise.tempo,
    });
  }

  // Add RIR if available
  if (currentExercise?.rir !== null && currentExercise?.rir !== undefined) {
    blockDetails.push({
      label: "RIR",
      value: currentExercise.rir,
    });
  }

  // Instructions
  const instructions =
    currentExercise?.notes || block.block.block_notes || undefined;

  // Handle logging one set at a time
  const handleLog = async () => {
    if (!currentExercise || isLoggingSet) return;

    const weightNum = parseFloat(weight);
    const repsNum = parseInt(reps);

    // Validate input - weight can be 0, reps must be > 0
    if (
      !weight ||
      weight.trim() === "" ||
      isNaN(weightNum) ||
      weightNum < 0 ||
      !reps ||
      reps.trim() === "" ||
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
        block_type: "straight_set",
        set_number: currentSetNumber,
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
        const loggedSet: LoggedSet = {
          id: result.set_log_id || `temp-${currentSetNumber}-${Date.now()}`,
          exercise_id: currentExercise.exercise_id,
          block_id: block.block.id,
          set_number: currentSetNumber,
          weight_kg: weightNum,
          reps_completed: repsNum,
          completed_at: new Date(),
        } as LoggedSet;

        onSetLogUpsert?.(block.block.id, loggedSet);

        console.log("[StraightSetExecutor] set logged", {
          currentSetNumber,
          totalSets,
          isLastSet: currentSetNumber >= totalSets,
          set_log_id: result.set_log_id,
        });
        console.log("[log-set success]", {
          blockId: block.block.id,
          setNumber: currentSetNumber,
          isLastSet: currentSetNumber >= totalSets,
          completedSets: currentSetNumber,
          totalSets,
          set_log_id: result.set_log_id,
        });

        if (result.e1rm && onE1rmUpdate) {
          onE1rmUpdate(currentExercise.exercise_id, result.e1rm);
        }

        addToast({
          title: "Set Logged!",
          description: `Set ${currentSetNumber} of ${totalSets}: ${weightNum}kg × ${repsNum} reps`,
          variant: "success",
          duration: 2000,
        });

        // When rest timer will show, pass last-set data for completion hero + next set preview
        if (currentSetNumber < totalSets) {
          onLastSetLoggedForRest?.({
            weight: weightNum,
            reps: repsNum,
            setNumber: currentSetNumber,
            totalSets,
            isPr: result.isNewPR,
          });
        }

        // Update parent with new completed sets count
        const newCompletedSets = currentSetNumber;
        onSetComplete?.(newCompletedSets);

        // RPE modal is now handled by the parent (LiveWorkoutBlockExecutor)
        // via the Golden Logging Flow orchestrator.

        // Check if this was the last set
        if (currentSetNumber >= totalSets) {
          console.log("[StraightSetExecutor] triggering onBlockComplete", {
            blockId: block.block.id,
            currentSetNumber,
            totalSets,
          });
          onBlockComplete(block.block.id, [...loggedSetsList, loggedSet]);
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

  // Logging inputs - show only current set
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
          <div className="text-xs font-semibold fc-text-dim uppercase tracking-wider mb-2">
            Logged sets
          </div>
          <ul className="space-y-1.5">
            {loggedSetsList.map((setEntry) => (
              <li
                key={setEntry.id}
                className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg"
                style={{ background: "var(--fc-surface-elevated)" }}
              >
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
              </li>
            ))}
          </ul>
        </div>
      )}
      <div
        className="p-4 space-y-4 rounded-xl"
        style={{ background: "var(--fc-surface-sunken)" }}
      >
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setViewingSetIndex((i) => Math.max(0, i - 1));
            }}
            disabled={viewingSetIndex === 0}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-lg fc-text-primary disabled:opacity-40 disabled:pointer-events-none hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-95 transition-transform"
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
            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-lg fc-text-primary disabled:opacity-40 disabled:pointer-events-none hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-95 transition-transform"
            aria-label={
              loggedSetsList.length === 0
                ? "Next set (log a set first to review)"
                : "Next set"
            }
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <LargeInput
              label="Weight"
              value={editDraft ? editDraft.weight : weight}
              onChange={(val) => {
                if (editDraft) {
                  setEditDraft((d) => (d ? { ...d, weight: val } : null));
                } else {
                  setIsWeightPristine(false);
                  setWeight(val);
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
                    setWeight(String(coachSuggestedWeight));
                    setIsWeightPristine(false);
                  }}
                />
              )}
          </div>
          <LargeInput
            label="Reps"
            value={editDraft ? editDraft.reps : reps}
            onChange={(val) => {
              if (editDraft) {
                setEditDraft((d) => (d ? { ...d, reps: val } : null));
              } else {
                setReps(val);
              }
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

  const viewedSetEntry =
    viewingSetIndex >= 1 ? loggedSetsList[viewingSetIndex - 1] : null;
  const isViewingLoggedSet = !!viewedSetEntry;

  // Edit mode: Save edits + Cancel (non-destructive until Save)
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
          editDraft.weight.trim() === "" ||
          editDraft.reps.trim() === "" ||
          isNaN(parseFloat(editDraft.weight)) ||
          parseFloat(editDraft.weight) < 0 ||
          isNaN(parseInt(editDraft.reps, 10)) ||
          parseInt(editDraft.reps, 10) <= 0
        }
        variant="fc-primary"
        className="flex-1 h-12 text-base font-bold uppercase tracking-wider rounded-xl"
      >
        {isSavingEdit ? "Saving…" : "Save edits"}
      </Button>
    </div>
  ) : isViewingLoggedSet ? (
    <Button
      onClick={() => viewedSetEntry && handleEditSet(viewedSetEntry)}
      variant="fc-primary"
      className="w-full h-12 text-base font-bold uppercase tracking-wider rounded-xl"
    >
      <Pencil className="w-5 h-5 mr-2" />
      Edit this set
    </Button>
  ) : (
    <Button
      onClick={handleLog}
      disabled={
        isLoggingSet ||
        completedSets >= totalSets ||
        !weight ||
        weight.trim() === "" ||
        isNaN(parseFloat(weight)) ||
        parseFloat(weight) < 0 ||
        !reps ||
        reps.trim() === "" ||
        isNaN(parseInt(reps)) ||
        parseInt(reps) <= 0
      }
      variant="fc-primary"
      className="w-full h-12 text-base font-bold uppercase tracking-wider rounded-xl"
    >
      <CheckCircle className="w-5 h-5 mr-2" />
      {isLoggingSet ? "Logging..." : "LOG SET"}
    </Button>
  );

  return (
    <>
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
          progressionSuggestion,
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
        progressionSuggestion={progressionSuggestion}
      />
      {/* Edit mode is inline (same form + Save edits / Cancel); no dialog so list stays visible. */}
      {/* RPE Modal moved to parent LiveWorkoutBlockExecutor (Golden Logging Flow) */}
    </>
  );
}
