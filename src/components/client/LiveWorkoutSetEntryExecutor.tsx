"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/components/ui/toast-provider";
import { useAuth } from "@/contexts/AuthContext";
import {
  WorkoutSetEntry,
  SetType,
  LiveWorkoutSetEntry,
  LiveWorkoutExercise,
  LoggedSet,
  WORKOUT_SET_TYPE_CONFIGS,
} from "@/types/workoutSetEntries";
import {
  calculateSuggestedWeight,
  formatSuggestedWeight,
} from "@/lib/e1rmUtils";
import { supabase } from "@/lib/supabase";
import VideoPlayerModal from "@/components/VideoPlayerModal";
import ClientExerciseAlternativesModal from "@/components/client/workout-execution/ui/ClientExerciseAlternativesModal";
import {
  LiveRestTimerProvider,
  useLiveRestTimer,
  type LiveRestPendingAction,
} from "./workout-execution/LiveRestTimerContext";
import { LiveRestTimerModal } from "./workout-execution/RestTimerModal";
import type { RestTimerLastSet } from "./workout-execution/restTimerModalTypes";
import { resolveRestSeconds } from "./workout-execution/live-card";
import { BaseSetEntryExecutorProps } from "./workout-execution/types";
import {
  formatTime,
  calculateSuggestedWeightUtil,
} from "./workout-execution/BaseBlockExecutor";
import { fetchApi } from "@/lib/apiClient";
import { useSetLoggingOrchestrator } from "@/hooks/useSetLoggingOrchestrator";
import { RPEModal } from "@/components/client/RPEModal";
import { parseWeightKgInput } from "@/lib/parseWeightKgInput";
import type { PrDetectedPayload } from "@/lib/prService";

// Import type-specific components
import { StraightSetExecutor } from "./workout-execution/blocks/StraightSetExecutor";
import { SupersetExecutor } from "./workout-execution/blocks/SupersetExecutor";
import { GiantSetExecutor } from "./workout-execution/blocks/GiantSetExecutor";
import { DropSetExecutor } from "./workout-execution/blocks/DropSetExecutor";
import { ClusterSetExecutor } from "./workout-execution/blocks/ClusterSetExecutor";
import { RestPauseExecutor } from "./workout-execution/blocks/RestPauseExecutor";
import { PreExhaustionExecutor } from "./workout-execution/blocks/PreExhaustionExecutor";
import { AmrapExecutor } from "./workout-execution/blocks/AmrapExecutor";
import { EmomExecutor } from "./workout-execution/blocks/EmomExecutor";
import { TabataExecutor } from "./workout-execution/blocks/TabataExecutor";
import { ForTimeExecutor } from "./workout-execution/blocks/ForTimeExecutor";
import { SpeedWorkExecutor } from "./workout-execution/blocks/SpeedWorkExecutor";
import { EnduranceExecutor } from "./workout-execution/blocks/EnduranceExecutor";
import { TimedSetExecutor } from "./workout-execution/blocks/TimedSetExecutor";

/** Accepts kg from DB/JSON or typed input; supports comma decimals (e.g. 16,25). */
function coerceLoggedWeightKg(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = parseWeightKgInput(raw as string | number);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/**
 * Session sticky weights: update immediately when a set is accepted so the next set's
 * autofill sees lastPerformedWeightByExerciseId before background sync completes.
 * Mirrors which fields the legacy log-set path used for onWeightLogged.
 */
function applyStickyWeightsFromLogPayload(
  payload: Record<string, unknown>,
  onWeightLogged?: (exerciseId: string, weight: number) => void,
): void {
  if (!onWeightLogged) return;

  const apply = (exerciseId: unknown, weightRaw: unknown) => {
    if (typeof exerciseId !== "string" || exerciseId.length === 0) return;
    const w = coerceLoggedWeightKg(weightRaw);
    if (w === null) return;
    onWeightLogged(exerciseId, w);
  };

  apply(payload.exercise_id, payload.weight);
  apply(payload.exercise_id, payload.dropset_initial_weight);
  apply(payload.exercise_id, payload.rest_pause_initial_weight);
  apply(payload.superset_exercise_a_id, payload.superset_weight_a);
  apply(payload.superset_exercise_b_id, payload.superset_weight_b);
  apply(
    payload.preexhaust_isolation_exercise_id,
    payload.preexhaust_isolation_weight,
  );
  apply(
    payload.preexhaust_compound_exercise_id,
    payload.preexhaust_compound_weight,
  );

  const giant = payload.giant_set_exercises;
  if (!Array.isArray(giant)) return;
  for (const row of giant) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    apply(o.exercise_id, o.weight);
  }
}

interface LiveWorkoutSetEntryExecutorProps {
  liveSetEntry: LiveWorkoutSetEntry;
  onSetEntryComplete: (setEntryId: string, loggedSets: LoggedSet[]) => void;
  onNextSetEntry: () => void;
  e1rmMap?: Record<string, number>;
  onE1rmUpdate?: (exerciseId: string, e1rm: number) => void;
  /** When true, show Edit/Delete per set (workout in progress). */
  allowSetEditDelete?: boolean;
  /** Session-level last performed weight per exercise (sticky default); updated after each log-set */
  lastPerformedWeightByExerciseId?: Record<string, number>;
  /** Last-session weight per exercise (earliest set in most recent completed workout) */
  lastSessionWeightByExerciseId?: Record<string, number>;
  /** Called after each successful log-set to update session sticky map */
  onWeightLogged?: (exerciseId: string, weight: number) => void;
  sessionId?: string | null;
  assignmentId?: string;
  allSetEntries?: LiveWorkoutSetEntry[];
  currentSetEntryIndex?: number;
  onSetEntryChange?: (setEntryIndex: number) => void;
  onSetLogged?: (setEntryId: string, newCompletedSets: number) => void;
  /** Upsert a set into the block's existingSetLogs so history persists when navigating blocks. replaceId = temp id to replace when real id arrives. */
  onSetLogUpsert?: (
    setEntryId: string,
    setEntry: LoggedSet,
    options?: { replaceId?: string },
  ) => void;
  /** Called after a set is successfully updated via PATCH so parent can replace the set in its store. */
  onSetEditSaved?: (setEntryId: string, updatedSet: LoggedSet) => void;
  /** Logged sets for this block (parent-owned). When provided, executors use this so history persists across block navigation. */
  loggedSets?: LoggedSet[];
  onExerciseComplete?: (setEntryId: string) => void;
  progressionSuggestions?: Map<
    string,
    import("@/lib/clientProgressionService").ProgressionSuggestion
  >;
  previousPerformanceMap?: Map<
    string,
    {
      lastWorkout: {
        weight: number | null;
        reps: number | null;
        sets: number;
        avgRpe: number | null;
        date: string;
        workout_log_id?: string;
        setDetails?: import("@/lib/clientProgressionService").LastSessionSetRow[];
      } | null;
      personalBest: {
        maxWeight: number | null;
        maxReps: number | null;
        date: string;
      } | null;
    }
  >;
  /** Called whenever the active exercise changes (by exercise_id). Used to trigger per-exercise data fetches in the parent. */
  onExerciseChanged?: (exerciseId: string) => void;
  /** Called when log-set returns pr_detected (new PR stored). Parent can show PRCelebrationModal. */
  onPRDetected?: (pr: PrDetectedPayload) => void;
  /** Called when log-set returns new_achievements (e.g. PR-triggered). Parent can show AchievementUnlockModal. */
  onAchievementsUnlocked?: (
    achievements: Array<{
      templateId: string;
      templateName: string;
      templateIcon: string;
      tier: string | null;
      description: string;
      nextTier: unknown;
      currentMetricValue: number;
    }>,
    context?: { prDetectedThisSync: boolean },
  ) => void;
  /** Exit workout (confirm + navigate). Passed to block layout header back control. */
  onExitWorkout?: () => void;
  /** Client body weight (kg) for speed work % BW display */
  clientBodyWeightKg?: number | null;
}

export default function LiveWorkoutSetEntryExecutor({
  liveSetEntry,
  onSetEntryComplete,
  onNextSetEntry,
  e1rmMap = {},
  onE1rmUpdate,
  allowSetEditDelete = false,
  lastPerformedWeightByExerciseId = {},
  lastSessionWeightByExerciseId = {},
  onWeightLogged,
  sessionId,
  assignmentId,
  allSetEntries = [],
  currentSetEntryIndex = 0,
  onSetEntryChange,
  onSetLogged,
  onSetLogUpsert,
  onSetEditSaved,
  loggedSets,
  onExerciseComplete,
  progressionSuggestions,
  previousPerformanceMap,
  onExerciseChanged,
  onPRDetected,
  onAchievementsUnlocked,
  onExitWorkout,
  clientBodyWeightKg = null,
}: LiveWorkoutSetEntryExecutorProps) {
  const { addToast } = useToast();
  const { user: authUser } = useAuth();

  // Sync local exercise index with block's currentExerciseIndex
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(
    liveSetEntry.currentExerciseIndex || 0,
  );

  // Update local index when block changes
  useEffect(() => {
    setCurrentExerciseIndex(liveSetEntry.currentExerciseIndex || 0);
  }, [liveSetEntry.currentExerciseIndex, liveSetEntry.setEntry.id]);

  // Video modal state
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState("");
  const [currentVideoTitle, setCurrentVideoTitle] = useState("");

  // Exercise alternatives modal state
  const [showAlternativesModal, setShowAlternativesModal] = useState(false);
  const [alternativesExerciseId, setAlternativesExerciseId] = useState<
    string | null
  >(null);

  // Rest timer metadata for modal preview (context drives the actual countdown).
  const [restDuration, setRestDuration] = useState(0);
  const [pendingAction, setPendingAction] = useState<LiveRestPendingAction>(null);
  const [restNextSet, setRestNextSet] = useState<{
    nextSetNumber: number | null;
    totalSets: number | null;
  }>({ nextSetNumber: null, totalSets: null });
  const [restLastSet, setRestLastSet] = useState<RestTimerLastSet | null>(null);
  /** Sync payload for rest start — survives async logSet → effect race. */
  const restStartRef = useRef<{
    nextSetNumber: number | null;
    totalSets: number | null;
    pendingAction: LiveRestPendingAction;
    restSeconds: number;
  }>({
    nextSetNumber: null,
    totalSets: null,
    pendingAction: "set",
    restSeconds: 0,
  });
  const completedSetEntryRef = useRef<Set<string>>(new Set());

  // --- Golden Logging Flow orchestrator ---
  // onSyncSuccess callback ref (defined after hook, but ref is stable)
  const syncSuccessRef = useRef<
    | ((
        r: import("@/hooks/useSetLoggingOrchestrator").SyncSuccessResult,
      ) => void)
    | null
  >(null);
  const orchestrator = useSetLoggingOrchestrator(sessionId, (result) =>
    syncSuccessRef.current?.(result),
  );

  // When orchestrator signals rest, InCardRestBridge starts LiveRestTimerContext;
  // LiveRestTimerModal displays the same deadline (no duplicate timer).

  // Open video modal
  const openVideoModal = (videoUrl: string, exerciseName?: string) => {
    if (!videoUrl) return;
    setCurrentVideoUrl(videoUrl);
    setCurrentVideoTitle(exerciseName || "Exercise Video");
    setShowVideoModal(true);
  };

  // Close video modal
  const closeVideoModal = () => {
    setShowVideoModal(false);
    setCurrentVideoUrl("");
    setCurrentVideoTitle("");
  };

  const LOG_SET_TIMEOUT_MS = 25_000;
  const inFlightLogRef = useRef<null | {
    startedAt: number;
    abort: () => void;
  }>(null);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (!inFlightLogRef.current) return;

      const elapsed = Date.now() - inFlightLogRef.current.startedAt;
      if (elapsed >= LOG_SET_TIMEOUT_MS) {
        inFlightLogRef.current.abort();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  // Ref for Undo: executor registers its "remove last set" function so we can call it after DELETE
  const undoFnRef = useRef<(() => void) | null>(null);
  // Resolve callbacks by setEntryId so when sync completes (possibly after user navigated away) we
  // still replace temp id in the correct block's list. Do not clear on unmount so late sync works.
  const setLogIdResolvedBySetEntryIdRef = useRef<
    Map<string, (set_log_id: string) => void>
  >(new Map());

  // ---- Golden Logging Flow: sync success handler ----
  // (registered as onSyncSuccess callback in orchestrator)
  // This runs asynchronously when background sync completes.
  const handleGoldenSyncSuccess = useCallback(
    (result: import("@/hooks/useSetLoggingOrchestrator").SyncSuccessResult) => {
      // e1RM update
      if (result.e1rm && onE1rmUpdate && result.entry.exerciseId) {
        onE1rmUpdate(result.entry.exerciseId, result.e1rm);
      }
      applyStickyWeightsFromLogPayload(
        result.entry.payload as Record<string, unknown>,
        onWeightLogged,
      );

      const prShownThisSync = !!(result.pr_detected && onPRDetected);
      if (prShownThisSync && result.pr_detected) {
        onPRDetected!(result.pr_detected);
      }

      if (result.metrics_warning) {
        addToast({
          title: "Set Logged",
          description: result.metrics_warning,
          variant: "default",
          duration: 3000,
        });
      }

      const rawAch = result.new_achievements;
      if (
        Array.isArray(rawAch) &&
        rawAch.length > 0 &&
        onAchievementsUnlocked
      ) {
        onAchievementsUnlocked(
          rawAch as Array<{
            templateId: string;
            templateName: string;
            templateIcon: string;
            tier: string | null;
            description: string;
            nextTier: unknown;
            currentMetricValue: number;
          }>,
          { prDetectedThisSync: prShownThisSync },
        );
      }

      // Replace temp id with real set_log_id in the correct block's list (by setEntryId so it works after navigation)
      if (result.set_log_id && result.entry.setEntryId) {
        setLogIdResolvedBySetEntryIdRef.current.get(result.entry.setEntryId)?.(
          result.set_log_id,
        );
      }
    },
    [
      onE1rmUpdate,
      onWeightLogged,
      addToast,
      onPRDetected,
      onAchievementsUnlocked,
    ],
  );

  // Wire the ref so the orchestrator can call our success handler
  syncSuccessRef.current = handleGoldenSyncSuccess;

  // ---- Golden Logging Flow: optimistic logSetToDatabase wrapper ----
  // Executors call this; it returns instantly with { success: true }.
  // The actual API call happens in the background after RPE confirm/skip.
  const logSetToDatabase = useCallback(
    async (
      data: any,
    ): Promise<{
      success: boolean;
      error?: any;
      e1rm?: number;
      set_log_id?: string;
      isNewPR?: boolean;
    }> => {
      // Validate sessionId
      if (
        !sessionId ||
        typeof sessionId !== "string" ||
        sessionId.trim() === ""
      ) {
        console.error("[goldenFlow] sessionId missing", { sessionId });
        return { success: false, error: "Session ID is missing" };
      }

      const currentExercise = liveSetEntry.setEntry.exercises?.[currentExerciseIndex];
      const exerciseId = data.exercise_id || currentExercise?.exercise_id || "";

      // Extract isLastSet (UI-only, must not be sent to API)
      const isLastSet = data.isLastSet === true;
      const { isLastSet: _omit, ...dataWithoutLastSet } = data;

      // Build the enriched payload (same fields the old function built)
      // Executor fields first; routing/session fields last so they cannot be
      // overwritten by a stray key from block executors.
      const enrichedPayload: Record<string, unknown> = {
        ...dataWithoutLastSet,
        set_entry_id: liveSetEntry.setEntry.id,
        set_type:
          data.set_type || liveSetEntry.setEntry.set_type,
        client_id: authUser?.id || undefined,
        workout_assignment_id: assignmentId || undefined,
        session_id: String(sessionId).trim(),
        template_exercise_id: currentExercise?.id || null,
      };

      // Route through golden flow orchestrator (giant_set uses round_number, others use set_number)
      const setNumber = data.set_number ?? data.round_number ?? 1;

      // Seed rest duration BEFORE shouldOpenRestTimer flips — InCardRestBridge
      // reads restStartRef on the same tick as the orchestrator signal.
      // Prescribed only (0 = no rest → bridge acks without starting).
      if (!isLastSet) {
        const seededRest = resolveRestSeconds(
          currentExercise?.rest_seconds,
          liveSetEntry.setEntry.rest_seconds,
        );
        setRestDuration(seededRest);
        setPendingAction("set");
        restStartRef.current = {
          ...restStartRef.current,
          pendingAction: "set",
          restSeconds: seededRest,
        };
      }

      const result = orchestrator.logSet({
        sessionId,
        setEntryId: liveSetEntry.setEntry.id,
        blockType:
          data.set_type ||
          liveSetEntry.setEntry.set_type ||
          "straight_set",
        exerciseId,
        setNumber,
        payload: enrichedPayload,
        isLastSet,
      });

      if (!result.accepted) {
        console.warn("[goldenFlow] logSet rejected:", result.reason);
        return { success: false, error: result.reason };
      }

      applyStickyWeightsFromLogPayload(enrichedPayload, onWeightLogged);

      return { success: true, set_log_id: undefined, isNewPR: false };
    },
    [
      sessionId,
      liveSetEntry.setEntry,
      currentExerciseIndex,
      authUser?.id,
      assignmentId,
      orchestrator,
      onWeightLogged,
    ],
  );

  // ---- LEGACY: Direct sync to server (kept for reference / fallback) ----
  // The golden flow orchestrator now handles all API calls via syncEntry.
  // This old function body is preserved but not called in the golden flow.
  const _legacyLogSetToDatabase = async (
    data: any,
  ): Promise<{
    success: boolean;
    error?: any;
    e1rm?: number;
    set_log_id?: string;
    isNewPR?: boolean;
  }> => {
    // Validate sessionId before making API call
    if (
      !sessionId ||
      typeof sessionId !== "string" ||
      sessionId.trim() === ""
    ) {
      console.error("logSetToDatabase: sessionId is missing or invalid", {
        sessionId,
        type: typeof sessionId,
      });
      return { success: false, error: "Session ID is missing" };
    }

    const currentExercise = liveSetEntry.setEntry.exercises?.[currentExerciseIndex];

    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const payloadSummary = {
      set_entry_id: data?.set_entry_id,
      set_type: data?.set_type,
      exercise_id: data?.exercise_id,
      set_number: data?.set_number,
    };

    try {
      try {
        await supabase.auth.refreshSession();
      } catch {
        // Non-critical
      }

      let resolvedUserId = authUser?.id || null;
      if (!resolvedUserId) {
        try {
          const {
            data: { user },
          } = (await Promise.race([
            supabase.auth.getUser(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("getUser timeout")), 2000),
            ),
          ])) as { data: { user: { id: string } | null } };
          resolvedUserId = user?.id || null;
        } catch {
          resolvedUserId = null;
        }
      }
      let activeSession: any = null;
      try {
        const {
          data: { session },
        } = (await Promise.race([
          supabase.auth.getSession(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("getSession timeout")), 2000),
          ),
        ])) as { data: { session: any } };
        activeSession = session ?? null;
      } catch (sessionError) {
        // Non-blocking: continue without session details if getSession is slow.
        console.debug(
          "[log-set] getSession timed out; continuing",
          sessionError,
        );
      }

      // Call /api/log-set to:
      // 1. Get/create workout_log_id (for session tracking)
      // 2. Insert into workout_set_logs (individual set data)
      // 3. Calculate and update e1RM in user_exercise_metrics
      try {
        // Build request body with all data passed from executor + required fields
        if (!resolvedUserId) {
          console.warn(
            "[log-set] No client user id available; relying on cookie auth.",
          );
        }

        const requestBody: any = {
          // Required for workout_set_logs
          set_entry_id: liveSetEntry.setEntry.id,
          set_type:
            data.set_type || (liveSetEntry.setEntry as any).type || liveSetEntry.setEntry.set_type,
          client_id: resolvedUserId || undefined,
          workout_assignment_id: assignmentId || undefined,
          // For API to get/create workout_log_id (session tracking)
          session_id: String(sessionId).trim(),
          template_exercise_id: currentExercise?.id || null,
          // Spread all data from executor (block-type-specific fields)
          ...data,
        };

        const sendLogSet = async () => {
          const controller = new AbortController();
          inFlightLogRef.current = {
            startedAt: Date.now(),
            abort: () => controller.abort(),
          };

          const timeoutError = new Error("timeout");
          (timeoutError as any).name = "TimeoutError";

          let timeoutId: ReturnType<typeof setTimeout> | null = null;
          const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
              controller.abort();
              reject(timeoutError);
            }, LOG_SET_TIMEOUT_MS);
          });

          const response = (await Promise.race([
            fetchApi("/api/log-set", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(requestBody),
              signal: controller.signal,
              credentials: "include",
            }),
            timeoutPromise,
          ])) as Response;

          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          inFlightLogRef.current = null;

          const responseText = await response.text().catch(() => "");

          let parsed: any = {};
          if (responseText && responseText.trim().length > 0) {
            try {
              parsed = JSON.parse(responseText);
            } catch {
              parsed = { error: responseText };
            }
          }

          return { response, parsed };
        };

        const { response, parsed } = await sendLogSet();

        if (response.ok) {
          const result = parsed;
          if (result.success) {
            // Update e1RM in local state (only if exercise_id is present in the data)
            if (
              result.e1rm &&
              result.e1rm.stored &&
              onE1rmUpdate &&
              data.exercise_id
            ) {
              onE1rmUpdate(data.exercise_id, result.e1rm.stored);
            }
            // Update session-level sticky weight for default on next set
            if (onWeightLogged) {
              if (
                data.exercise_id != null &&
                data.weight != null &&
                typeof data.weight === "number"
              ) {
                onWeightLogged(data.exercise_id, data.weight);
              }
              if (
                data.superset_exercise_a_id != null &&
                data.superset_weight_a != null &&
                typeof data.superset_weight_a === "number"
              ) {
                onWeightLogged(
                  data.superset_exercise_a_id,
                  data.superset_weight_a,
                );
              }
              if (
                data.superset_exercise_b_id != null &&
                data.superset_weight_b != null &&
                typeof data.superset_weight_b === "number"
              ) {
                onWeightLogged(
                  data.superset_exercise_b_id,
                  data.superset_weight_b,
                );
              }
              if (Array.isArray(data.giant_set_exercises)) {
                for (const ex of data.giant_set_exercises) {
                  if (
                    ex?.exercise_id != null &&
                    ex?.weight != null &&
                    typeof ex.weight === "number"
                  ) {
                    onWeightLogged(ex.exercise_id, ex.weight);
                  }
                }
              }
              if (
                data.exercise_id != null &&
                data.dropset_initial_weight != null &&
                typeof data.dropset_initial_weight === "number"
              ) {
                onWeightLogged(data.exercise_id, data.dropset_initial_weight);
              }
              const rpWeight = data.rest_pause_initial_weight;
              if (
                data.exercise_id != null &&
                rpWeight != null &&
                typeof rpWeight === "number"
              ) {
                onWeightLogged(data.exercise_id, rpWeight);
              }
              if (
                data.preexhaust_isolation_exercise_id != null &&
                data.preexhaust_isolation_weight != null &&
                typeof data.preexhaust_isolation_weight === "number"
              ) {
                onWeightLogged(
                  data.preexhaust_isolation_exercise_id,
                  data.preexhaust_isolation_weight,
                );
              }
              if (
                data.preexhaust_compound_exercise_id != null &&
                data.preexhaust_compound_weight != null &&
                typeof data.preexhaust_compound_weight === "number"
              ) {
                onWeightLogged(
                  data.preexhaust_compound_exercise_id,
                  data.preexhaust_compound_weight,
                );
              }
            }

            // PR celebration: modal only (v2)
            if (result.pr_detected && onPRDetected) {
              onPRDetected(result.pr_detected);
            }
            if (result.metrics_warning) {
              addToast({
                title: "Set Logged",
                description: result.metrics_warning,
                variant: "default",
                duration: 3000,
              });
            }

            if (
              Array.isArray(result.new_achievements) &&
              result.new_achievements.length > 0 &&
              onAchievementsUnlocked
            ) {
              onAchievementsUnlocked(result.new_achievements, {
                prDetectedThisSync: !!(result.pr_detected && onPRDetected),
              });
            }

            return {
              success: true,
              set_log_id: result.set_log_id, // Pass through for RPE modal
              e1rm: result.e1rm?.stored || result.e1rm?.calculated,
              isNewPR: !!result.pr_detected,
            };
          }

          console.error("API returned error:", parsed?.error);
          addToast({
            title: "Error",
            description: parsed?.error || "Failed to log set",
            variant: "destructive",
            duration: 5000,
          });
          return { success: false, error: parsed?.error };
        }

        if (response.status === 401 || response.status === 403) {
          addToast({
            title: "Session expired",
            description: "Please refresh and log in again.",
            variant: "destructive",
            duration: 5000,
          });
          return { success: false, error: "Session expired" };
        }

        if (response.status === 400) {
          addToast({
            title: "Error",
            description: parsed?.error || "Invalid request",
            variant: "destructive",
            duration: 5000,
          });
          return { success: false, error: parsed?.error || "Invalid request" };
        }

        addToast({
          title: "Server slow",
          description: "Server slow, try again.",
          variant: "destructive",
          duration: 5000,
        });
        return { success: false, error: "Server slow" };
      } catch (apiError: any) {
        const isSessionExpired =
          typeof apiError?.message === "string" &&
          apiError.message.toLowerCase().includes("session expired");
        const isAbort =
          apiError?.name === "AbortError" ||
          apiError?.message?.toLowerCase().includes("abort") ||
          apiError?.name === "TimeoutError";
        addToast({
          title: isSessionExpired
            ? "Session expired"
            : isAbort
              ? "Server slow"
              : "Error",
          description: isSessionExpired
            ? "Please refresh and log in again."
            : isAbort
              ? "Server slow, try again."
              : "Failed to log set. Please try again.",
          variant: "destructive",
          duration: 5000,
        });
        inFlightLogRef.current = null;
        return {
          success: false,
          error: isSessionExpired
            ? "Session expired"
            : isAbort
              ? "Server slow"
              : apiError,
        };
      }
    } catch (error) {
      console.error("Error in logSetToDatabase:", error);
      inFlightLogRef.current = null;
      return { success: false, error };
    }
  };

  // Rest timer handler
  const handleRestTimerClick = () => {
    // Rest timer is now handled within each component that needs it
    // This callback can be used if needed in the future
  };

  // Handle set complete - update parent state and check for exercise completion
  const handleSetComplete = (newCompletedSets: number) => {
    onSetLogged?.(liveSetEntry.setEntry.id, newCompletedSets);

    // Check if all sets of current exercise are complete
    const currentExercise = liveSetEntry.setEntry.exercises?.[currentExerciseIndex];
    const totalSetsForExercise =
      currentExercise?.sets || liveSetEntry.setEntry.total_sets || 1;
    const exercises = liveSetEntry.setEntry.exercises || [];
    const nextExerciseIndex = (currentExerciseIndex || 0) + 1;

    if (newCompletedSets >= totalSetsForExercise) {
      // All sets done for this exercise
      // Check if more exercises exist
      if (nextExerciseIndex < exercises.length) {
        // More exercises - rest timer before next exercise is opened by orchestrator after RPE (do not open here)
        const nextExercise = exercises[nextExerciseIndex];
        const restSeconds = resolveRestSeconds(
          nextExercise.rest_seconds,
          liveSetEntry.setEntry.rest_seconds,
        );

        if (restSeconds > 0) {
          setRestDuration(restSeconds);
          setPendingAction("exercise");
          restStartRef.current = {
            nextSetNumber: null,
            totalSets: null,
            pendingAction: "exercise",
            restSeconds,
          };
          setRestNextSet({ nextSetNumber: null, totalSets: null });
        } else {
          // No rest, advance immediately
          onExerciseComplete?.(liveSetEntry.setEntry.id);
        }
      } else {
        // No more exercises, block is complete
        // Guard against duplicate completion calls
        if (!completedSetEntryRef.current.has(liveSetEntry.setEntry.id)) {
          completedSetEntryRef.current.add(liveSetEntry.setEntry.id);
          onSetEntryComplete?.(liveSetEntry.setEntry.id, []);
        }
      }
    } else {
      // More sets in this exercise — rest opens via orchestrator.shouldOpenRestTimer
      const restSeconds = resolveRestSeconds(
        currentExercise?.rest_seconds,
        liveSetEntry.setEntry.rest_seconds,
      );

      if (restSeconds > 0) {
        setRestDuration(restSeconds);
        setPendingAction("set");
        restStartRef.current = {
          ...restStartRef.current,
          pendingAction: "set",
          restSeconds,
        };
      }
    }
  };

  // Handle rest timer completion / skip (in-card)
  const handleRestEnded = useCallback(
    (action: LiveRestPendingAction) => {
      const exercises = liveSetEntry.setEntry.exercises || [];
      const currentExIndex = currentExerciseIndex || 0;
      const resolved = action ?? pendingAction;

      if (resolved === "exercise") {
        onExerciseComplete?.(liveSetEntry.setEntry.id);
      }
      // pendingAction 'set': executor already advanced inputs via completedSets

      setPendingAction(null);
      setRestNextSet({ nextSetNumber: null, totalSets: null });
      void currentExIndex;
      void exercises;
    },
    [
      liveSetEntry.setEntry.id,
      liveSetEntry.setEntry.exercises,
      currentExerciseIndex,
      onExerciseComplete,
      pendingAction,
    ],
  );

  // Called by executor before onSetComplete when rest timer will show
  const handleLastSetLoggedForRest = useCallback(
    (data: {
      weight: number;
      reps: number;
      setNumber: number;
      totalSets: number;
      isPr?: boolean;
    }) => {
      const next = {
        nextSetNumber:
          data.setNumber < data.totalSets ? data.setNumber + 1 : null,
        totalSets: data.totalSets,
      };
      setRestNextSet(next);
      setRestLastSet({
        weight: data.weight,
        reps: data.reps,
        setNumber: data.setNumber,
        totalSets: data.totalSets,
        isPr: data.isPr,
      });
      const currentEx =
        liveSetEntry.setEntry.exercises?.[currentExerciseIndex ?? 0];
      const seededRest = resolveRestSeconds(
        currentEx?.rest_seconds,
        liveSetEntry.setEntry.rest_seconds,
      );
      restStartRef.current = {
        ...restStartRef.current,
        nextSetNumber: next.nextSetNumber,
        totalSets: next.totalSets,
        pendingAction: "set",
        restSeconds: seededRest,
      };
      setRestDuration(seededRest);
      setPendingAction("set");
    },
    [
      currentExerciseIndex,
      liveSetEntry.setEntry.exercises,
      liveSetEntry.setEntry.rest_seconds,
    ],
  );

  // Get progression suggestion for current exercise
  const currentExercise = liveSetEntry.setEntry.exercises?.[currentExerciseIndex];
  const progressionSuggestion =
    currentExercise?.exercise_id && progressionSuggestions
      ? progressionSuggestions.get(currentExercise.exercise_id)
      : undefined;

  // Notify parent whenever the active exercise changes so it can fetch
  // per-exercise data (e.g. previousPerformanceMap) that is managed at the
  // page level but keyed by exercise_id tracked here.
  useEffect(() => {
    if (currentExercise?.exercise_id && onExerciseChanged) {
      onExerciseChanged(currentExercise.exercise_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentExercise?.exercise_id]);

  // Common props for all block executors
  const commonProps: BaseSetEntryExecutorProps = {
    liveSetEntry,
    onSetEntryComplete,
    onNextSetEntry,
    e1rmMap,
    onE1rmUpdate,
    lastPerformedWeightByExerciseId,
    lastSessionWeightByExerciseId,
    onWeightLogged,
    sessionId,
    assignmentId,
    allSetEntries,
    currentSetEntryIndex,
    onSetEntryChange,
    currentExerciseIndex,
    onExerciseIndexChange: setCurrentExerciseIndex,
    logSetToDatabase,
    formatTime,
    calculateSuggestedWeight: (
      exerciseId: string,
      loadPercentage: number | null | undefined,
    ) => calculateSuggestedWeightUtil(exerciseId, loadPercentage, e1rmMap),
    onVideoClick: openVideoModal,
    onAlternativesClick: (exerciseId: string) => {
      setAlternativesExerciseId(exerciseId);
      setShowAlternativesModal(true);
    },
    onRestTimerClick: handleRestTimerClick,
    onSetComplete: handleSetComplete,
    onLastSetLoggedForRest: handleLastSetLoggedForRest,
    progressionSuggestion,
    progressionSuggestionsMap: progressionSuggestions,
    previousPerformanceMap,
    registerUndo: (fn) => {
      undoFnRef.current = fn;
    },
    allowSetEditDelete,
    registerSetLogIdResolved: (fn) => {
      setLogIdResolvedBySetEntryIdRef.current.set(liveSetEntry.setEntry.id, fn);
      return () => {};
    },
    onSetLogUpsert: onSetLogUpsert ?? (() => {}),
    onSetEditSaved: onSetEditSaved ?? (() => {}),
    loggedSets: loggedSets ?? [],
    onWorkoutBack: onExitWorkout,
    clientBodyWeightKg,
  };

  // Route to appropriate component based on block type
  const renderBlockExecutor = () => {
    const blockType = liveSetEntry.setEntry.set_type;

    switch (blockType) {
      case "straight_set":
        return <StraightSetExecutor {...commonProps} />;
      case "superset":
        return <SupersetExecutor {...commonProps} />;
      case "giant_set":
        return <GiantSetExecutor {...commonProps} />;
      case "drop_set":
        return <DropSetExecutor {...commonProps} />;
      case "cluster_set":
        return <ClusterSetExecutor {...commonProps} />;
      case "rest_pause":
        return <RestPauseExecutor {...commonProps} />;
      case "pre_exhaustion":
        return <PreExhaustionExecutor {...commonProps} />;
      case "amrap":
        return <AmrapExecutor {...commonProps} />;
      case "emom":
        return <EmomExecutor {...commonProps} />;
      case "tabata":
        return <TabataExecutor {...commonProps} />;
      case "for_time":
        return <ForTimeExecutor {...commonProps} />;
      case "speed_work":
        return <SpeedWorkExecutor {...commonProps} />;
      case "endurance":
        return <EnduranceExecutor {...commonProps} />;
      case "timed_set":
        return <TimedSetExecutor {...commonProps} />;
      default:
        return <StraightSetExecutor {...commonProps} />;
    }
  };

  // Note: currentExercise is already defined at line 429, reused here for modals

  const restSecondsForBridge =
    restStartRef.current.restSeconds ||
    restDuration ||
    resolveRestSeconds(
      liveSetEntry.setEntry.exercises?.[currentExerciseIndex ?? 0]
        ?.rest_seconds,
      liveSetEntry.setEntry.rest_seconds,
    );

  return (
    <LiveRestTimerProvider
      sessionId={sessionId}
      setEntryId={liveSetEntry.setEntry.id}
      onRestEnded={handleRestEnded}
    >
      <InCardRestBridge
        shouldOpen={orchestrator.shouldOpenRestTimer}
        ack={orchestrator.ackRestTimerOpened}
        restSeconds={restSecondsForBridge}
        sessionId={sessionId}
        setEntryId={liveSetEntry.setEntry.id}
        restStartRef={restStartRef}
      />

      <LiveRestTimerModal
        lastSet={restLastSet}
        nextSetPreview={
          restNextSet.nextSetNumber != null && restNextSet.totalSets != null
            ? {
                setNumber: restNextSet.nextSetNumber,
                totalSets: restNextSet.totalSets,
                targetWeight: null,
                targetReps: null,
              }
            : null
        }
      />

      {renderBlockExecutor()}

      {/* Video Player Modal */}
      {showVideoModal && (
        <VideoPlayerModal
          isOpen={showVideoModal}
          onClose={closeVideoModal}
          videoUrl={currentVideoUrl}
          title={currentVideoTitle}
        />
      )}

      {/* Exercise Alternatives Modal (client read-only) */}
      {showAlternativesModal &&
        alternativesExerciseId &&
        (() => {
          const exerciseData = liveSetEntry.setEntry.exercises?.find(
            (ex) => ex.exercise_id === alternativesExerciseId,
          );
          const exercise = exerciseData?.exercise;
          if (!exercise) return null;

          return (
            <ClientExerciseAlternativesModal
              isOpen={showAlternativesModal}
              onClose={() => {
                setShowAlternativesModal(false);
                setAlternativesExerciseId(null);
              }}
              exercise={{
                id: alternativesExerciseId,
                name: exercise.name || "",
              }}
              onSelect={(altId, altName) => {
                // TODO: hook up actual exercise swap for this set
                console.log("Selected alternative:", altId, altName);
                setShowAlternativesModal(false);
                setAlternativesExerciseId(null);
              }}
            />
          );
        })()}

      {/* RPE Modal - Deprecated: RPE is now collected per logged set via LoggedSetsList / SetEffortPicker */}
    </LiveRestTimerProvider>
  );
}

/** Starts in-card rest when orchestrator signals; shares deadline with LiveRestTimerModal. */
function InCardRestBridge({
  shouldOpen,
  ack,
  restSeconds,
  sessionId,
  setEntryId,
  restStartRef,
}: {
  shouldOpen: boolean;
  ack: () => void;
  restSeconds: number;
  sessionId: string | null | undefined;
  setEntryId: string;
  restStartRef: React.MutableRefObject<{
    nextSetNumber: number | null;
    totalSets: number | null;
    pendingAction: LiveRestPendingAction;
    restSeconds: number;
  }>;
}) {
  const rest = useLiveRestTimer();

  useEffect(() => {
    if (!shouldOpen || !rest) return;
    const payload = restStartRef.current;
    const sec = Math.max(
      0,
      Math.floor(Number(payload.restSeconds || restSeconds) || 0),
    );
    // Duration is seeded before logSet; ack always. Start only when prescribed > 0.
    ack();
    if (sec <= 0) return;
    rest.startRest({
      restSeconds: sec,
      nextSetNumber: payload.nextSetNumber,
      totalSets: payload.totalSets,
      pendingAction: payload.pendingAction ?? "set",
      setEntryId,
      sessionId,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldOpen, restSeconds]);

  return null;
}
