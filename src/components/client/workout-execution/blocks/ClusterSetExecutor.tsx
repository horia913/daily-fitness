"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import {
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Pencil,
} from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import { LogSetButton } from "../ui/LogSetButton";
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
  formatClusterTechniqueBody,
  effortFromPrescribedRpe,
  formatLiveRest,
  resolveRestSeconds,
  formatLiveLast,
  groupIndexToHue,
  type LiveCardTarget,
} from "../live-card";

export function ClusterSetExecutor({
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

  const clustersPerSet: number =
    Number((currentExercise as any)?.clusters_per_set) ||
    Number((currentExercise as any)?.meta?.clusters_per_set) ||
    Number((currentExercise as any)?.cluster_sets?.[0]?.clusters_per_set) ||
    4;
  const repsPerCluster: number =
    Number((currentExercise as any)?.reps_per_cluster) ||
    Number((currentExercise as any)?.meta?.reps_per_cluster) ||
    Number((currentExercise as any)?.cluster_sets?.[0]?.reps_per_cluster) ||
    3;
  const intraClusterRest: number =
    Number((currentExercise as any)?.intra_cluster_rest) ||
    Number((currentExercise as any)?.meta?.intra_cluster_rest) ||
    Number((currentExercise as any)?.cluster_sets?.[0]?.intra_cluster_rest) ||
    15;

  const [weight, setWeight] = useState("");
  const [isLoggingSet, setIsLoggingSet] = useState(false);
  useLoggingReset(isLoggingSet, setIsLoggingSet);
  const [isWeightPristine, setIsWeightPristine] = useState(true);
  const [viewingSetIndex, setViewingSetIndex] = useState(0);
  /** Collapsible set history: show all sets or only last 2 */
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [menuOpenSetId, setMenuOpenSetId] = useState<string | null>(null);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    weight: string;
    set_number: number;
  } | null>(null);
  const [currentClusterInSet, setCurrentClusterInSet] = useState(1);
  /** idle = logging; ticking = intra-cluster rest countdown */
  const [intraClusterRestPhase, setIntraClusterRestPhase] = useState<
    "idle" | "ticking"
  >("idle");
  const [intraClusterTimeLeft, setIntraClusterTimeLeft] = useState(intraClusterRest);

  const displaySetNumber =
    editingSetId && editDraft?.set_number != null
      ? editDraft.set_number
      : viewingSetIndex >= 1
        ? viewingSetIndex
        : Math.min(currentSetNumber, totalSets);

  const loggedSetsRef = useRef<LoggedSet[]>(loggedSetsList);
  useEffect(() => {
    loggedSetsRef.current = loggedSetsList;
  }, [loggedSetsList]);
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

  useEffect(() => {
    setCurrentClusterInSet(1);
    setIntraClusterRestPhase("idle");
  }, [completedSets, currentSetNumber]);

  useEffect(() => {
    if (intraClusterRestPhase !== "ticking" || intraClusterRest <= 0) {
      if (intraClusterRestPhase !== "ticking") {
        setIntraClusterTimeLeft(intraClusterRest);
      }
      return;
    }
    let restSec = intraClusterRest;
    setIntraClusterTimeLeft(restSec);
    const interval = setInterval(() => {
      restSec -= 1;
      setIntraClusterTimeLeft(restSec);
      if (restSec <= 0) {
        clearInterval(interval);
        setIntraClusterRestPhase("idle");
        setCurrentClusterInSet((c) => c + 1);
        setIntraClusterTimeLeft(intraClusterRest);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [intraClusterRestPhase, intraClusterRest]);

  useEffect(() => {
    if (viewingSetIndex >= 1) return;
    if (!isWeightPristine) return;
    if (default_weight != null && default_weight > 0)
      setWeight(String(default_weight));
    else setWeight("");
  }, [
    viewingSetIndex,
    isWeightPristine,
    default_weight,
    completedSets,
    exerciseId,
  ]);

  const restBetweenSets = resolveRestSeconds(
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
  const activeEffort = effortFromPrescribedRpe(activeTargets.rpe);
  /** Mockup: reps_per_cluster × clusters_per_set with unit "clusters". */
  const liveTarget: LiveCardTarget = {
    kind: "reps_weight",
    reps: repsPerCluster,
    weight: clustersPerSet,
    unit: "clusters",
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

  const handleEditSet = (setEntry: LoggedSet) => {
    setEditingSetId(setEntry.id);
    setEditDraft({
      weight: String(setEntry.weight_kg ?? ""),
      set_number: setEntry.set_number ?? 1,
    });
    setMenuOpenSetId(null);
  };

  const handleSaveEdit = async () => {
    if (!editingSetId || !editDraft) return;
    if (editingSetId.startsWith("temp-")) {
      if (process.env.NODE_ENV !== "production") {
        console.log("[SAVE EDITS guard]", {
          executor: "ClusterSetExecutor",
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
    if (isNaN(w) || w < 0) {
      addToast({
        title: "Invalid weight",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    const totalReps = repsPerCluster * clustersPerSet;
    setIsSavingEdit(true);
    try {
      const payload = buildSetEditPatchPayload(liveSetEntry.setEntry.set_type, {
        weight: w,
        reps: totalReps,
        set_number: editDraft.set_number,
        ...(currentExercise?.exercise_id && {
          exercise_id: currentExercise.exercise_id,
        }),
      });
      if (process.env.NODE_ENV !== "production") {
        console.log("[SAVE EDITS]", {
          executor: "ClusterSetExecutor",
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
          reps_completed: totalReps,
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

  const handleClusterDone = async () => {
    if (!currentExercise || isLoggingSet) return;

    const weightNum = parseWeightKgInput(weight);
    if (!weight || weight.trim() === "" || isNaN(weightNum) || weightNum < 0) {
      addToast({
        title: "Invalid Input",
        description: "Please enter valid weight",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    const isLastCluster = currentClusterInSet >= clustersPerSet;

    if (!isLastCluster) {
      if (intraClusterRest <= 0) {
        setCurrentClusterInSet((c) => c + 1);
        return;
      }
      setIntraClusterRestPhase("ticking");
      return;
    }

    setIsLoggingSet(true);

    try {
      if ("vibrate" in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
    } catch (e) {}

    try {
      const totalReps = repsPerCluster * clustersPerSet;
      const logData: any = {
        set_type: "cluster_set",
        set_number: completedSets + 1,
        cluster_number: 1,
        isLastSet: currentSetNumber >= totalSets,
        reps: totalReps,
      };

      if (currentExercise?.exercise_id)
        logData.exercise_id = currentExercise.exercise_id;
      if (weightNum !== undefined && weightNum !== null)
        logData.weight = weightNum;

      const result = await logSetToDatabase(logData);

      if (result.success) {
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

        if (result.e1rm && onE1rmUpdate) {
          onE1rmUpdate(currentExercise.exercise_id, result.e1rm);
        }

        addToast({
          title: "Cluster Set Logged!",
          description: `${weightNum}kg × ${totalReps} reps (${repsPerCluster} × ${clustersPerSet} clusters)`,
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
        }

        setCurrentClusterInSet(1);
      } else {
        addToast({
          title: "Failed to Save",
          description: result.error || "Failed to save set. Please try again.",
          variant: "destructive",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Error logging cluster set:", error);
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
        {!(intraClusterRestPhase === "ticking" && !editDraft) ? (
          <div className="text-sm font-semibold fc-text-dim mb-4">
            {editDraft
              ? "Edit set"
              : `Set ${displaySetNumber} — Cluster ${currentClusterInSet} of ${clustersPerSet}`}
          </div>
        ) : null}
        <div className="space-y-4">
          {intraClusterRestPhase !== "ticking" && (
          <>
          <div className="flex min-h-0 min-w-0 flex-col space-y-2">
            <LiveCardLogField
              label="Weight"
              value={editDraft ? editDraft.weight : weight}
              onChange={(val) => {
                if (editDraft)
                  setEditDraft((d) => (d ? { ...d, weight: val } : null));
                else {
                  setIsWeightPristine(false);
                  setWeight(val);
                }
              }}
              onIncrement={() => {
                const cur = parseWeightKgInput(
                  (editDraft ? editDraft.weight : weight) || "0",
                );
                const next = String(
                  Math.max(0, Math.round(((isNaN(cur) ? 0 : cur) + 2.5) * 2) / 2),
                );
                if (editDraft)
                  setEditDraft((d) => (d ? { ...d, weight: next } : null));
                else {
                  setIsWeightPristine(false);
                  setWeight(next);
                }
              }}
              onDecrement={() => {
                const cur = parseWeightKgInput(
                  (editDraft ? editDraft.weight : weight) || "0",
                );
                const next = String(
                  Math.max(0, Math.round(((isNaN(cur) ? 0 : cur) - 2.5) * 2) / 2),
                );
                if (editDraft)
                  setEditDraft((d) => (d ? { ...d, weight: next } : null));
                else {
                  setIsWeightPristine(false);
                  setWeight(next);
                }
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
          </div>
          <div className="text-sm fc-text-dim">
            Reps per cluster: {repsPerCluster} | Total reps:{" "}
            {repsPerCluster * clustersPerSet}
          </div>
          <div className="text-xs fc-text-dim">
            Rest {intraClusterRest}s between clusters, {restBetweenSets}s after
            set
          </div>
          </>
          )}
        </div>
        {intraClusterRestPhase === "ticking" && (
          <div className="mb-4 rounded-xl p-5 space-y-4" style={{ background: "var(--fc-surface-elevated)" }}>
            <p
              className="text-center font-black tabular-nums tracking-tight text-[color-mix(in_srgb,var(--fc-group-c)_70%,white)]"
              style={{ fontSize: "clamp(2.75rem, 11vw, 3.75rem)", lineHeight: 1.05 }}
              aria-live="polite"
              aria-label={`${intraClusterTimeLeft} seconds rest, next cluster`}
            >
              {intraClusterTimeLeft}s
            </p>
            <p className="text-xs fc-text-dim text-center">Rest before next cluster</p>
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 text-sm font-semibold rounded-xl"
              onClick={() => {
                setIntraClusterRestPhase("idle");
                setCurrentClusterInSet((c) => c + 1);
                setIntraClusterTimeLeft(intraClusterRest);
              }}
            >
              Skip rest — next cluster
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  const weightNumPreview = parseWeightKgInput(weight);
  const clusterWeightReady =
    weight.trim() !== "" &&
    !isNaN(weightNumPreview) &&
    weightNumPreview >= 0;
  const clusterLogReady =
    !isLoggingSet &&
    completedSets < totalSets &&
    intraClusterRestPhase === "idle" &&
    clusterWeightReady;

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
          isNaN(parseWeightKgInput(editDraft.weight)) ||
          parseWeightKgInput(editDraft.weight) < 0
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
      onClick={handleClusterDone}
      ready={clusterLogReady}
      loading={isLoggingSet}
      label={
        currentClusterInSet >= clustersPerSet
          ? "Log set"
          : `Done cluster ${currentClusterInSet}`
      }
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
            status={
              completedSets >= totalSets
                ? "complete"
                : intraClusterRestPhase === "ticking"
                  ? "resting"
                  : "logging"
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
              rest={formatLiveRest(restBetweenSets)}
              tempo={tempoLabel}
              last={lastLabel}
            />
            <LiveCardTechnique title="Cluster">
              {formatClusterTechniqueBody({
                repsPerCluster,
                intraRest: intraClusterRest,
                clustersPerSet,
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
                onApplySuggestion={(w) => {
                  if (w != null) {
                    setWeight(String(w));
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
