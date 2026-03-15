"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Target,
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
  formatTime,
} from "../BaseBlockExecutor";
import { LargeInput } from "../ui/LargeInput";
import { ExerciseActionButtons } from "../ui/ExerciseActionButtons";
import { BlockDetail, BaseBlockExecutorProps } from "../types";
import { LoggedSet } from "@/types/workoutBlocks";
import { InlineRPERow } from "../ui/InlineRPERow";
import { useLoggingReset } from "../hooks/useLoggingReset";
import { ApplySuggestedWeightButton } from "../ui/ApplySuggestedWeightButton";
import { ProgressionNudge } from "../ui/ProgressionNudge";
import { getCoachSuggestedWeight } from "@/lib/weightDefaultService";
import { fetchApi } from "@/lib/apiClient";
import { buildSetEditPatchPayload } from "@/lib/setEditPayload";

export function PreExhaustionExecutor({
  block,
  onBlockComplete,
  onNextBlock,
  e1rmMap = {},
  onE1rmUpdate,
  sessionId,
  assignmentId,
  allBlocks = [],
  currentBlockIndex = 0,
  onBlockChange,
  currentExerciseIndex = 0,
  onExerciseIndexChange,
  logSetToDatabase,
  formatTime: formatTimeProp,
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
  const isolationExercise = block.block.exercises?.[0];
  const compoundExercise = block.block.exercises?.[1];
  const totalSets = block.block.total_sets || 1;
  const completedSets = block.completedSets || 0;
  const currentSetNumber = completedSets + 1;

  /** Parent-owned logged sets; single source of truth. Persists across block navigation. */
  const loggedSetsList = loggedSets ?? [];

  const restBetween = block.block.rest_seconds || 15;

  const [isolationWeight, setIsolationWeight] = useState("");
  const [isolationReps, setIsolationReps] = useState("");
  const [compoundWeight, setCompoundWeight] = useState("");
  const [compoundReps, setCompoundReps] = useState("");
  const [isLoggingSet, setIsLoggingSet] = useState(false);
  useLoggingReset(isLoggingSet, setIsLoggingSet);
  const [showTimer, setShowTimer] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(restBetween);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [viewingSetIndex, setViewingSetIndex] = useState(0);
  /** Collapsible set history: show all sets or only last 2 */
  const [showAllSets, setShowAllSets] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [menuOpenSetId, setMenuOpenSetId] = useState<string | null>(null);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    isolationWeight: string;
    isolationReps: string;
    compoundWeight: string;
    compoundReps: string;
    set_number: number;
  } | null>(null);

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
    if (viewingSetIndex >= 1) {
      const forSet = loggedSetsList.filter(
        (s) => s.set_number === viewingSetIndex,
      );
      const isolationEntry =
        forSet.find((s) => s.exercise_id === isolationExercise?.exercise_id) ??
        forSet[0];
      const compoundEntry =
        forSet.find((s) => s.exercise_id === compoundExercise?.exercise_id) ??
        forSet[1] ??
        forSet[0];
      if (forSet.length > 0) {
        if (isolationEntry) {
          setIsolationWeight(String(isolationEntry.weight_kg ?? ""));
          setIsolationReps(String(isolationEntry.reps_completed ?? ""));
        }
        if (compoundEntry) {
          setCompoundWeight(String(compoundEntry.weight_kg ?? ""));
          setCompoundReps(String(compoundEntry.reps_completed ?? ""));
        }
      }
    }
  }, [
    viewingSetIndex,
    loggedSetsList,
    isolationExercise?.exercise_id,
    compoundExercise?.exercise_id,
  ]);

  const isViewingLoggedSet = viewingSetIndex >= 1;
  // Pre-fill with suggested weights (skip when viewing a previous set)
  useEffect(() => {
    if (isViewingLoggedSet) return;
    if (isolationExercise?.load_percentage && !isolationWeight) {
      const suggested = calculateSuggestedWeightUtil(
        isolationExercise.exercise_id,
        isolationExercise.load_percentage,
        e1rmMap,
      );
      if (suggested) setIsolationWeight(suggested.toString());
    }
    if (compoundExercise?.load_percentage && !compoundWeight) {
      const suggested = calculateSuggestedWeightUtil(
        compoundExercise.exercise_id,
        compoundExercise.load_percentage,
        e1rmMap,
      );
      if (suggested) setCompoundWeight(suggested.toString());
    }
  }, [
    isViewingLoggedSet,
    isolationExercise,
    compoundExercise,
    e1rmMap,
    isolationWeight,
    compoundWeight,
  ]);

  // Timer logic
  useEffect(() => {
    if (showTimer && timerSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev: number) => {
          if (prev <= 1) {
            setShowTimer(false);
            return restBetween;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [showTimer, timerSeconds, restBetween]);

  // Block details
  const blockDetails: BlockDetail[] = [
    {
      label: "SETS",
      value: totalSets,
    },
    {
      label: "ISOLATION",
      value: isolationExercise?.exercise?.name || "Isolation Exercise",
    },
    {
      label: "ISOLATION REPS",
      value: isolationExercise?.reps || "-",
    },
    {
      label: "REST BETWEEN",
      value: restBetween,
      unit: "s",
    },
    {
      label: "COMPOUND",
      value: compoundExercise?.exercise?.name || "Compound Exercise",
    },
    {
      label: "COMPOUND REPS",
      value: compoundExercise?.reps || "-",
    },
  ];

  if (isolationExercise?.load_percentage) {
    const suggestedWeight = calculateSuggestedWeightUtil(
      isolationExercise.exercise_id,
      isolationExercise.load_percentage,
      e1rmMap,
    );
    const loadDisplay = formatLoadPercentage(
      isolationExercise.load_percentage,
      suggestedWeight,
    );
    if (loadDisplay) {
      blockDetails.push({
        label: "LOAD (ISOLATION)",
        value: loadDisplay,
      });
    }
  }

  if (compoundExercise?.load_percentage) {
    const suggestedWeight = calculateSuggestedWeightUtil(
      compoundExercise.exercise_id,
      compoundExercise.load_percentage,
      e1rmMap,
    );
    const loadDisplay = formatLoadPercentage(
      compoundExercise.load_percentage,
      suggestedWeight,
    );
    if (loadDisplay) {
      blockDetails.push({
        label: "LOAD (COMPOUND)",
        value: loadDisplay,
      });
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
    const iso =
      forSet.find((s) => s.exercise_id === isolationExercise?.exercise_id) ??
      forSet[0];
    const comp =
      forSet.find((s) => s.exercise_id === compoundExercise?.exercise_id) ??
      forSet[1] ??
      forSet[0];
    setEditingSetId(setEntry.id);
    setEditDraft({
      isolationWeight: String(iso?.weight_kg ?? ""),
      isolationReps: String(iso?.reps_completed ?? ""),
      compoundWeight: String(comp?.weight_kg ?? ""),
      compoundReps: String(comp?.reps_completed ?? ""),
      set_number: setEntry.set_number ?? 1,
    });
    setMenuOpenSetId(null);
  };

  const handleSaveEdit = async () => {
    if (!editingSetId || !editDraft) return;
    if (editingSetId.startsWith("temp-")) {
      if (process.env.NODE_ENV !== "production") {
        console.log("[SAVE EDITS guard]", {
          executor: "PreExhaustionExecutor",
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
    const isolationWeightNum = parseFloat(editDraft.isolationWeight);
    const isolationRepsNum = parseInt(editDraft.isolationReps, 10);
    const compoundWeightNum = parseFloat(editDraft.compoundWeight);
    const compoundRepsNum = parseInt(editDraft.compoundReps, 10);
    if (
      isNaN(isolationWeightNum) ||
      isNaN(isolationRepsNum) ||
      isNaN(compoundWeightNum) ||
      isNaN(compoundRepsNum)
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
        preexhaust_isolation_exercise_id:
          isolationExercise?.exercise_id ?? undefined,
        preexhaust_isolation_weight: isolationWeightNum,
        preexhaust_isolation_reps: isolationRepsNum,
        preexhaust_compound_exercise_id:
          compoundExercise?.exercise_id ?? undefined,
        preexhaust_compound_weight: compoundWeightNum,
        preexhaust_compound_reps: compoundRepsNum,
      });
      if (process.env.NODE_ENV !== "production") {
        console.log("[SAVE EDITS]", {
          executor: "PreExhaustionExecutor",
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
          const isIso = s.exercise_id === isolationExercise?.exercise_id;
          return {
            ...s,
            weight_kg: isIso ? isolationWeightNum : compoundWeightNum,
            reps_completed: isIso ? isolationRepsNum : compoundRepsNum,
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
    if (!isolationExercise || !compoundExercise || isLoggingSet) return;

    const isolationWeightNum = parseFloat(isolationWeight);
    const isolationRepsNum = parseInt(isolationReps);
    const compoundWeightNum = parseFloat(compoundWeight);
    const compoundRepsNum = parseInt(compoundReps);

    if (
      !isolationWeight ||
      isolationWeight.trim() === "" ||
      isNaN(isolationWeightNum) ||
      isolationWeightNum < 0 ||
      !isolationReps ||
      isolationReps.trim() === "" ||
      isNaN(isolationRepsNum) ||
      isolationRepsNum <= 0 ||
      !compoundWeight ||
      compoundWeight.trim() === "" ||
      isNaN(compoundWeightNum) ||
      compoundWeightNum < 0 ||
      !compoundReps ||
      compoundReps.trim() === "" ||
      isNaN(compoundRepsNum) ||
      compoundRepsNum <= 0
    ) {
      addToast({
        title: "Invalid Input",
        description:
          "Please enter valid weight and reps for both isolation and compound exercises",
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
      // Log pre-exhaustion as a single call with both exercises
      const logData: any = {
        set_type: "preexhaust",
        set_number: completedSets + 1,
        isLastSet: currentSetNumber >= totalSets,
      };

      // Only add fields if they're defined
      if (isolationExercise?.exercise_id)
        logData.preexhaust_isolation_exercise_id =
          isolationExercise.exercise_id;
      if (isolationWeightNum !== undefined && isolationWeightNum !== null)
        logData.preexhaust_isolation_weight = isolationWeightNum;
      if (isolationRepsNum !== undefined && isolationRepsNum !== null)
        logData.preexhaust_isolation_reps = isolationRepsNum;
      if (compoundExercise?.exercise_id)
        logData.preexhaust_compound_exercise_id = compoundExercise.exercise_id;
      if (compoundWeightNum !== undefined && compoundWeightNum !== null)
        logData.preexhaust_compound_weight = compoundWeightNum;
      if (compoundRepsNum !== undefined && compoundRepsNum !== null)
        logData.preexhaust_compound_reps = compoundRepsNum;

      const result = await logSetToDatabase(logData);

      if (result.success) {
        const setLogId =
          (result as { set_log_id?: string }).set_log_id ??
          `temp-${Date.now()}`;
        const setNumber = completedSets + 1;
        const newEntries: LoggedSet[] = [
          {
            id: setLogId,
            exercise_id: isolationExercise.exercise_id,
            set_entry_id: block.block.id,
            set_number: setNumber,
            weight_kg: isolationWeightNum,
            reps_completed: isolationRepsNum,
            completed_at: new Date(),
          } as LoggedSet,
          {
            id: setLogId,
            exercise_id: compoundExercise.exercise_id,
            set_entry_id: block.block.id,
            set_number: setNumber,
            weight_kg: compoundWeightNum,
            reps_completed: compoundRepsNum,
            completed_at: new Date(),
          } as LoggedSet,
        ];
        newEntries.forEach((e) => onSetLogUpsert?.(block.block.id, e));
        setViewingSetIndex(0);

        addToast({
          title: "Pre-Exhaustion Set Logged!",
          description: `Isolation: ${isolationWeightNum}kg × ${isolationRepsNum} reps, Compound: ${compoundWeightNum}kg × ${compoundRepsNum} reps`,
          variant: "success",
          duration: 2000,
        });

        const newCompletedSets = completedSets + 1;
        const updatedLoggedSets = [...loggedSetsList, ...newEntries];
        if (newCompletedSets < totalSets) {
          onLastSetLoggedForRest?.({
            weight: compoundWeightNum,
            reps: compoundRepsNum,
            setNumber: newCompletedSets,
            totalSets,
            isPr: result?.isNewPR,
          });
        }
        onSetComplete?.(newCompletedSets);

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
              const iso =
                forSet.find(
                  (s) => s.exercise_id === isolationExercise?.exercise_id,
                ) || forSet[0];
              const comp =
                forSet.find(
                  (s) => s.exercise_id === compoundExercise?.exercise_id,
                ) || forSet[1];
              const label = `Set ${setNum}: Iso ${iso?.weight_kg ?? "—"}×${iso?.reps_completed ?? "—"}${comp ? `, Comp ${comp.weight_kg ?? "—"}×${comp.reps_completed ?? "—"}` : ""}`;
              const firstId = forSet[0]?.id ?? "";
              const rpeForSet = iso?.rpe ?? comp?.rpe ?? null;
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
                      // Update RPE for the isolation exercise entry (represents the set)
                      const updatedEntry: LoggedSet = {
                        ...iso!,
                        rpe,
                      };
                      onSetLogUpsert?.(block.block.id, updatedEntry, {
                        replaceId: iso!.id,
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
                              ...iso!,
                              rpe: iso!.rpe ?? undefined,
                            };
                            onSetLogUpsert?.(block.block.id, revertedEntry, {
                              replaceId: iso!.id,
                            });
                          }
                        } catch (err) {
                          console.error("Error updating RPE:", err);
                          const revertedEntry: LoggedSet = {
                            ...iso!,
                            rpe: iso!.rpe ?? undefined,
                          };
                          onSetLogUpsert?.(block.block.id, revertedEntry, {
                            replaceId: iso!.id,
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
      {/* Isolation Exercise */}
      <div
        className="p-4 rounded-xl"
        style={{ background: "var(--fc-surface-sunken)" }}
      >
        <div className="mb-4">
          <h4
            className="font-semibold text-lg"
            style={{ color: "var(--fc-accent-cyan)" }}
          >
            Isolation:{" "}
            {isolationExercise?.exercise?.name || "Isolation Exercise"}
          </h4>
          {isolationExercise && (
            <ExerciseActionButtons
              exercise={isolationExercise}
              onVideoClick={onVideoClick}
              onAlternativesClick={onAlternativesClick}
            />
          )}
        </div>
        {isolationExercise?.exercise_id && (
          <ProgressionNudge
            suggestion={progressionSuggestionsMap?.get(isolationExercise.exercise_id)}
            previousPerformance={previousPerformanceMap?.get(isolationExercise.exercise_id) ?? null}
            onApplySuggestion={(w, r) => {
              if (w != null) setIsolationWeight(String(w));
              if (r != null) setIsolationReps(String(r));
            }}
          />
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <LargeInput
              label="Weight"
              value={isolationWeight}
              onChange={setIsolationWeight}
              placeholder="0"
              step="0.5"
              unit="kg"
              showStepper
              stepAmount={2.5}
            />
            {isolationExercise?.load_percentage != null &&
              (() => {
                const suggested = calculateSuggestedWeightUtil(
                  isolationExercise.exercise_id,
                  isolationExercise.load_percentage,
                  e1rmMap,
                );
                return suggested != null && suggested > 0 ? (
                  <ApplySuggestedWeightButton
                    suggestedKg={Math.round(suggested * 2) / 2}
                    onApply={() => setIsolationWeight(String(suggested))}
                  />
                ) : null;
              })()}
          </div>
          <LargeInput
            label="Reps"
            value={editDraft ? editDraft.isolationReps : isolationReps}
            onChange={(val) => {
              if (editDraft)
                setEditDraft((d) => (d ? { ...d, isolationReps: val } : null));
              else setIsolationReps(val);
            }}
            placeholder="0"
            step="1"
            showStepper
            stepAmount={1}
          />
        </div>
      </div>

      {/* Timer */}
      {showTimer && (
        <div
          className="rounded-xl p-5 text-center"
          style={{
            background:
              "color-mix(in srgb, var(--fc-status-warning) 8%, var(--fc-surface-card))",
            border:
              "2px solid color-mix(in srgb, var(--fc-status-warning) 25%, transparent)",
          }}
        >
          <div
            className="text-4xl font-bold mb-2"
            style={{ color: "var(--fc-status-warning)" }}
          >
            {formatTime(timerSeconds)}
          </div>
          <div className="text-sm fc-text-dim">Rest Between Exercises</div>
        </div>
      )}

      {/* Compound Exercise */}
      <div
        className="p-4 rounded-xl"
        style={{ background: "var(--fc-surface-sunken)" }}
      >
        <div className="mb-4">
          <h4
            className="font-semibold text-lg"
            style={{ color: "var(--fc-accent-purple)" }}
          >
            Compound: {compoundExercise?.exercise?.name || "Compound Exercise"}
          </h4>
          {compoundExercise && (
            <ExerciseActionButtons
              exercise={compoundExercise}
              onVideoClick={onVideoClick}
              onAlternativesClick={onAlternativesClick}
            />
          )}
        </div>
        {compoundExercise?.exercise_id && (
          <ProgressionNudge
            suggestion={progressionSuggestionsMap?.get(compoundExercise.exercise_id)}
            previousPerformance={previousPerformanceMap?.get(compoundExercise.exercise_id) ?? null}
            onApplySuggestion={(w, r) => {
              if (w != null) setCompoundWeight(String(w));
              if (r != null) setCompoundReps(String(r));
            }}
          />
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <LargeInput
              label="Weight"
              value={compoundWeight}
              onChange={setCompoundWeight}
              placeholder="0"
              step="0.5"
              unit="kg"
              showStepper
              stepAmount={2.5}
            />
            {(() => {
              const coachSuggested = getCoachSuggestedWeight(
                compoundExercise?.load_percentage,
                compoundExercise?.exercise_id
                  ? (e1rmMap[compoundExercise.exercise_id] ?? null)
                  : null,
              );
              return coachSuggested != null && coachSuggested > 0 ? (
                <ApplySuggestedWeightButton
                  suggestedKg={coachSuggested}
                  onApply={() => setCompoundWeight(String(coachSuggested))}
                />
              ) : null;
            })()}
          </div>
          <LargeInput
            label="Reps"
            value={editDraft ? editDraft.compoundReps : compoundReps}
            onChange={(val) => {
              if (editDraft)
                setEditDraft((d) => (d ? { ...d, compoundReps: val } : null));
              else setCompoundReps(val);
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
              editDraft.isolationWeight.trim() === "" ||
              editDraft.isolationReps.trim() === "" ||
              editDraft.compoundWeight.trim() === "" ||
              editDraft.compoundReps.trim() === "" ||
              isNaN(parseFloat(editDraft.isolationWeight)) ||
              isNaN(parseInt(editDraft.isolationReps, 10)) ||
              isNaN(parseFloat(editDraft.compoundWeight)) ||
              isNaN(parseInt(editDraft.compoundReps, 10))
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
          <Target className="w-5 h-5 mr-2" />
          {isLoggingSet ? "Logging..." : "LOG PRE-EXHAUSTION SET"}
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
        formatTime: formatTimeProp,
        calculateSuggestedWeight,
        onVideoClick,
        onAlternativesClick,
        onPlateCalculatorClick,
        onRestTimerClick,
      }}
      exerciseName={`${isolationExercise?.exercise?.name || "Isolation"} + ${
        compoundExercise?.exercise?.name || "Compound"
      }`}
      blockDetails={blockDetails}
      instructions={instructions}
      currentSet={displaySetNumber}
      totalSets={totalSets}
      progressLabel="Set"
      loggingInputs={loggingInputs}
      logButton={logButton}
      showNavigation={true}
      currentExercise={isolationExercise}
      showRestTimer={!!block.block.rest_seconds}
    />
  );
}
