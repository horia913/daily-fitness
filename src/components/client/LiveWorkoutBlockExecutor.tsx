"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/components/ui/toast-provider";
import { useAuth } from "@/contexts/AuthContext";
import {
  WorkoutBlock,
  WorkoutBlockType,
  LiveWorkoutBlock,
  LiveWorkoutExercise,
  LoggedSet,
  WORKOUT_BLOCK_CONFIGS,
} from "@/types/workoutBlocks";
import {
  calculateSuggestedWeight,
  formatSuggestedWeight,
} from "@/lib/e1rmUtils";
import { supabase } from "@/lib/supabase";
import VideoPlayerModal from "@/components/VideoPlayerModal";
import ExerciseAlternativesModal from "@/components/coach/ExerciseAlternativesModal";
import {
  RestTimerModal,
  type RestTimerLastSet,
  type RestTimerNextSetPreview,
} from "./workout-execution/RestTimerModal";
import { BaseBlockExecutorProps } from "./workout-execution/types";
import { isBarbellExercise } from "@/lib/exerciseUtils";
import {
  formatTime,
  calculateSuggestedWeightUtil,
} from "./workout-execution/BaseBlockExecutor";
import { fetchApi } from "@/lib/apiClient";
import { useSetLoggingOrchestrator } from "@/hooks/useSetLoggingOrchestrator";
import { RPEModal } from "@/components/client/RPEModal";

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
import { HRSetExecutor } from "./workout-execution/blocks/HRSetExecutor";

interface LiveWorkoutBlockExecutorProps {
  block: LiveWorkoutBlock;
  onBlockComplete: (blockId: string, loggedSets: LoggedSet[]) => void;
  onNextBlock: () => void;
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
  allBlocks?: LiveWorkoutBlock[];
  currentBlockIndex?: number;
  onBlockChange?: (blockIndex: number) => void;
  onSetLogged?: (blockId: string, newCompletedSets: number) => void;
  /** Upsert a set into the block's existingSetLogs so history persists when navigating blocks. replaceId = temp id to replace when real id arrives. */
  onSetLogUpsert?: (
    blockId: string,
    setEntry: LoggedSet,
    options?: { replaceId?: string },
  ) => void;
  /** Called after a set is successfully updated via PATCH so parent can replace the set in its store. */
  onSetEditSaved?: (blockId: string, updatedSet: LoggedSet) => void;
  /** Logged sets for this block (parent-owned). When provided, executors use this so history persists across block navigation. */
  loggedSets?: LoggedSet[];
  onExerciseComplete?: (blockId: string) => void;
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
  onPlateCalculatorClick?: () => void;
  /** Called whenever the active exercise changes (by exercise_id). Used to trigger per-exercise data fetches in the parent. */
  onExerciseChanged?: (exerciseId: string) => void;
  /** Called when log-set returns pr_detected (new PR stored). Parent can show PRCelebrationModal. */
  onPRDetected?: (pr: {
    type: "weight" | "reps";
    exercise_name: string;
    new_value: number;
    previous_value: number | null;
    unit: string;
    weight_kg?: number;
    reps?: number;
  }) => void;
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
  ) => void;
  /** Exit workout (confirm + navigate). Passed to block layout header back control. */
  onExitWorkout?: () => void;
}

export default function LiveWorkoutBlockExecutor({
  block,
  onBlockComplete,
  onNextBlock,
  e1rmMap = {},
  onE1rmUpdate,
  allowSetEditDelete = false,
  lastPerformedWeightByExerciseId = {},
  lastSessionWeightByExerciseId = {},
  onWeightLogged,
  sessionId,
  assignmentId,
  allBlocks = [],
  currentBlockIndex = 0,
  onBlockChange,
  onSetLogged,
  onSetLogUpsert,
  onSetEditSaved,
  loggedSets,
  onExerciseComplete,
  progressionSuggestions,
  previousPerformanceMap,
  onPlateCalculatorClick,
  onExerciseChanged,
  onPRDetected,
  onAchievementsUnlocked,
  onExitWorkout,
}: LiveWorkoutBlockExecutorProps) {
  const { addToast } = useToast();
  const { user: authUser } = useAuth();

  // Sync local exercise index with block's currentExerciseIndex
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(
    block.currentExerciseIndex || 0,
  );

  // Update local index when block changes
  useEffect(() => {
    setCurrentExerciseIndex(block.currentExerciseIndex || 0);
  }, [block.currentExerciseIndex, block.block.id]);

  // Video modal state
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState("");
  const [currentVideoTitle, setCurrentVideoTitle] = useState("");

  // Exercise alternatives modal state
  const [showAlternativesModal, setShowAlternativesModal] = useState(false);
  const [alternativesExerciseId, setAlternativesExerciseId] = useState<
    string | null
  >(null);
  const [allExercises, setAllExercises] = useState<any[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);

  // Rest timer modal state
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restDuration, setRestDuration] = useState(0);
  const [restLabel, setRestLabel] = useState("Next Set");
  const [pendingAction, setPendingAction] = useState<"set" | "exercise" | null>(
    null,
  );
  const [restModalData, setRestModalData] = useState<{
    lastSet: RestTimerLastSet;
    nextSetPreview: RestTimerNextSetPreview | null;
  } | null>(null);
  const completedBlockRef = useRef<Set<string>>(new Set());

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

  // When orchestrator signals "open rest timer", bridge to existing rest timer state
  useEffect(() => {
    if (!orchestrator.shouldOpenRestTimer) return;
    orchestrator.ackRestTimerOpened();

    // Determine rest seconds from current exercise / block
    const currentEx = block.block.exercises?.[currentExerciseIndex ?? 0];
    const restSeconds =
      currentEx?.rest_seconds || block.block.rest_seconds || 0;

    if (restSeconds > 0) {
      // Rest timer data was already prepared by onLastSetLoggedForRest in the executor
      setRestDuration(restSeconds);
      setRestLabel("Next Set");
      setPendingAction("set");
      setShowRestTimer(true);
    }
  }, [orchestrator.shouldOpenRestTimer]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load all exercises for alternatives modal
  useEffect(() => {
    const loadExercises = async () => {
      setLoadingExercises(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Get the client's coach from clients table
        const { data: clientData, error: clientError } = await supabase
          .from("clients")
          .select("coach_id")
          .eq("client_id", user.id)
          .eq("status", "active")
          .maybeSingle();

        if (clientError) {
          console.error("Error fetching coach:", clientError);
          setAllExercises([]);
          return;
        }

        if (clientData?.coach_id) {
          const { data: exercisesData, error: exercisesError } = await supabase
            .from("exercises")
            .select("*")
            .eq("coach_id", clientData.coach_id)
            .eq("is_active", true)
            .order("name");

          if (exercisesError) {
            console.error("Error loading exercises:", exercisesError);
            setAllExercises([]);
          } else {
            setAllExercises(exercisesData || []);
          }
        } else {
          setAllExercises([]);
        }
      } catch (error) {
        console.error("Error in loadExercises:", error);
        setAllExercises([]);
      } finally {
        setLoadingExercises(false);
      }
    };

    loadExercises();
  }, []);

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

  const LOG_SET_TIMEOUT_MS = 12_000;
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
  // Resolve callbacks by blockId so when sync completes (possibly after user navigated away) we
  // still replace temp id in the correct block's list. Do not clear on unmount so late sync works.
  const setLogIdResolvedByBlockIdRef = useRef<
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
      // Sticky weight update
      if (onWeightLogged && result.entry.exerciseId) {
        const w = result.entry.payload.weight;
        if (w != null && typeof w === "number") {
          onWeightLogged(result.entry.exerciseId, w);
        }
      }
      // PR notification
      if (result.isNewPR) {
        addToast({
          title: "🎉 New Personal Record!",
          description: "New PR achieved!",
          variant: "success",
          duration: 4000,
        });
      }
      // Replace temp id with real set_log_id in the correct block's list (by blockId so it works after navigation)
      if (result.set_log_id && result.entry.blockId) {
        setLogIdResolvedByBlockIdRef.current.get(result.entry.blockId)?.(
          result.set_log_id,
        );
      }
    },
    [onE1rmUpdate, onWeightLogged, addToast],
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

      const currentExercise = block.block.exercises?.[currentExerciseIndex];
      const exerciseId = data.exercise_id || currentExercise?.exercise_id || "";

      // Extract isLastSet (UI-only, must not be sent to API)
      const isLastSet = data.isLastSet === true;
      const { isLastSet: _omit, ...dataWithoutLastSet } = data;

      // Build the enriched payload (same fields the old function built)
      const enrichedPayload: Record<string, unknown> = {
        set_entry_id: block.block.id,
        set_type:
          data.set_type || (block.block as any).type || block.block.set_type,
        client_id: authUser?.id || undefined,
        workout_assignment_id: assignmentId || undefined,
        session_id: String(sessionId).trim(),
        template_exercise_id: currentExercise?.id || null,
        ...dataWithoutLastSet,
      };

      // Route through golden flow orchestrator (giant_set uses round_number, others use set_number)
      const setNumber = data.set_number ?? data.round_number ?? 1;
      const result = orchestrator.logSet({
        sessionId,
        blockId: block.block.id,
        blockType:
          data.set_type ||
          (block.block as any).type ||
          block.block.set_type ||
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

      return { success: true, set_log_id: undefined, isNewPR: false };
    },
    [
      sessionId,
      block.block,
      currentExerciseIndex,
      authUser?.id,
      assignmentId,
      orchestrator,
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

    const currentExercise = block.block.exercises?.[currentExerciseIndex];

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
          set_entry_id: block.block.id,
          set_type:
            data.set_type || (block.block as any).type || block.block.set_type,
          client_id: resolvedUserId || undefined,
          workout_assignment_id: assignmentId || undefined,
          // For API to get/create workout_log_id (session tracking)
          session_id: String(sessionId).trim(),
          template_exercise_id: currentExercise?.id || null,
          // Spread all data from executor (block-type-specific fields)
          ...data,
        };

        const sendLogSet = async (attempt: number) => {
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
            fetch("/api/log-set", {
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

        let attempt = 1;
        let { response, parsed } = await sendLogSet(attempt);

        if (
          (response.status === 401 || response.status === 403) &&
          attempt === 1
        ) {
          await supabase.auth.refreshSession();
          const {
            data: { session: refreshedSession },
          } = await supabase.auth.getSession();
          if (!refreshedSession?.access_token) {
            addToast({
              title: "Session expired",
              description: "Please refresh and log in again.",
              variant: "destructive",
              duration: 5000,
            });
            return { success: false, error: "Session expired" };
          }
          attempt = 2;
          ({ response, parsed } = await sendLogSet(attempt));
        }

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

            // PR celebration: show modal when pr_detected, else toast
            if (result.pr_detected && onPRDetected) {
              onPRDetected(result.pr_detected);
            } else if (result.pr?.any_weight_pr || result.pr?.any_volume_pr) {
              addToast({
                title: "🎉 New Personal Record!",
                description: result.pr?.message || "New PR achieved!",
                variant: "success",
                duration: 4000,
              });
            }
            if (result.pr?.warning) {
              addToast({
                title: "Set Logged",
                description: result.pr.warning,
                variant: "default",
                duration: 3000,
              });
            }

            if (
              Array.isArray(result.new_achievements) &&
              result.new_achievements.length > 0 &&
              onAchievementsUnlocked
            ) {
              onAchievementsUnlocked(result.new_achievements);
            }

            return {
              success: true,
              set_log_id: result.set_log_id, // Pass through for RPE modal
              e1rm: result.e1rm?.stored || result.e1rm?.calculated,
              isNewPR: !!(result.pr?.any_weight_pr || result.pr?.any_volume_pr),
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
        const isAbort =
          apiError?.name === "AbortError" ||
          apiError?.message?.toLowerCase().includes("abort") ||
          apiError?.name === "TimeoutError";
        addToast({
          title: isAbort ? "Server slow" : "Error",
          description: isAbort
            ? "Server slow, try again."
            : "Failed to log set. Please try again.",
          variant: "destructive",
          duration: 5000,
        });
        inFlightLogRef.current = null;
        return {
          success: false,
          error: isAbort ? "Server slow" : apiError,
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
    const currentExercise = block.block.exercises?.[currentExerciseIndex];
    const restTime =
      currentExercise?.rest_seconds || block.block.rest_seconds || 60;
    // Rest timer is now handled within each component that needs it
    // This callback can be used if needed in the future
  };

  // Handle set complete - update parent state and check for exercise completion
  const handleSetComplete = (newCompletedSets: number) => {
    onSetLogged?.(block.block.id, newCompletedSets);

    // Check if all sets of current exercise are complete
    const currentExercise = block.block.exercises?.[currentExerciseIndex];
    const totalSetsForExercise =
      currentExercise?.sets || block.block.total_sets || 1;
    const exercises = block.block.exercises || [];
    const nextExerciseIndex = (currentExerciseIndex || 0) + 1;

    if (newCompletedSets >= totalSetsForExercise) {
      // All sets done for this exercise
      // Check if more exercises exist
      if (nextExerciseIndex < exercises.length) {
        // More exercises - rest timer before next exercise is opened by orchestrator after RPE (do not open here)
        const nextExercise = exercises[nextExerciseIndex];
        const restSeconds = nextExercise.rest_seconds || 0;

        if (restSeconds > 0) {
          setRestDuration(restSeconds);
          setRestLabel(
            `Next Exercise: ${
              nextExercise.exercise?.name ||
              (nextExercise as any).name ||
              "Exercise"
            }`,
          );
          setPendingAction("exercise");
          // Rest timer opens only after RPE modal (orchestrator.shouldOpenRestTimer), not on set log
        } else {
          // No rest, advance immediately
          onExerciseComplete?.(block.block.id);
        }
      } else {
        // No more exercises, block is complete
        // Guard against duplicate completion calls
        if (!completedBlockRef.current.has(block.block.id)) {
          completedBlockRef.current.add(block.block.id);
          onBlockComplete?.(block.block.id, []);
        }
      }
    } else {
      // More sets to do in this exercise - rest timer opens only after RPE (orchestrator.shouldOpenRestTimer), not on set log
      const restSeconds =
        currentExercise?.rest_seconds || block.block.rest_seconds || 0;

      if (restSeconds > 0) {
        setRestDuration(restSeconds);
        setRestLabel("Next Set");
        setPendingAction("set");
        // Do not setShowRestTimer(true) here; orchestrator opens it after RPE modal
      }
      // If no rest, executor should handle immediate advancement
    }
  };

  useEffect(() => {
    const exercises = block.block.exercises || [];
    if (exercises.length === 0) return;

    const currentExIndex = currentExerciseIndex || 0;
    const currentExercise = exercises[currentExIndex];
    const totalSetsForExercise =
      currentExercise?.sets || block.block.total_sets || 1;
    const completedSets = block.completedSets || 0;

    const isLastExercise = currentExIndex >= exercises.length - 1;
    const isExerciseComplete = completedSets >= totalSetsForExercise;

    if (!isLastExercise || !isExerciseComplete) return;

    if (completedBlockRef.current.has(block.block.id)) return;
    completedBlockRef.current.add(block.block.id);

    onBlockComplete?.(block.block.id, []);
  }, [
    block.block.id,
    block.block.total_sets,
    block.block.exercises,
    block.completedSets,
    currentExerciseIndex,
    onBlockComplete,
  ]);

  // Handle rest timer completion
  const handleRestComplete = () => {
    setShowRestTimer(false);
    setRestModalData(null);

    // Check what to advance to
    const exercises = block.block.exercises || [];
    const currentExIndex = currentExerciseIndex || 0;
    const currentExercise = exercises[currentExIndex];
    const totalSetsForExercise =
      currentExercise?.sets || block.block.total_sets || 1;
    const completedSets = block.completedSets || 0;

    if (pendingAction === "exercise") {
      // Advance to next exercise
      onExerciseComplete?.(block.block.id);
    }
    // If pendingAction is 'set', executor will handle showing next set inputs
    // The inputs will be cleared by useEffect when completedSets changes

    setPendingAction(null);
  };

  const handleRestSkip = () => {
    setShowRestTimer(false);
    setRestModalData(null);
    handleRestComplete();
  };

  // Called by executor before onSetComplete when rest timer will show; provides completion hero + next set preview
  const handleLastSetLoggedForRest = useCallback(
    (data: {
      weight: number;
      reps: number;
      setNumber: number;
      totalSets: number;
      isPr?: boolean;
    }) => {
      const currentEx = block.block.exercises?.[currentExerciseIndex ?? 0];
      const targetWeight =
        currentEx?.exercise_id &&
        lastPerformedWeightByExerciseId[currentEx.exercise_id] != null
          ? lastPerformedWeightByExerciseId[currentEx.exercise_id]
          : null;
      const repsVal = currentEx?.reps ?? block.block.reps_per_set;
      const targetReps = repsVal != null ? String(repsVal) : null;
      setRestModalData({
        lastSet: {
          weight: data.weight,
          reps: data.reps,
          setNumber: data.setNumber,
          totalSets: data.totalSets,
          isPr: data.isPr,
        },
        nextSetPreview:
          data.setNumber < data.totalSets
            ? {
                setNumber: data.setNumber + 1,
                totalSets: data.totalSets,
                targetWeight,
                targetReps,
              }
            : null,
      });
    },
    [
      block.block.exercises,
      block.block.reps_per_set,
      currentExerciseIndex,
      lastPerformedWeightByExerciseId,
    ],
  );

  // Get progression suggestion for current exercise
  const currentExercise = block.block.exercises?.[currentExerciseIndex];
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
  const commonProps: BaseBlockExecutorProps = {
    block,
    onBlockComplete,
    onNextBlock,
    e1rmMap,
    onE1rmUpdate,
    lastPerformedWeightByExerciseId,
    lastSessionWeightByExerciseId,
    onWeightLogged,
    sessionId,
    assignmentId,
    allBlocks,
    currentBlockIndex,
    onBlockChange,
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
    onPlateCalculatorClick: isBarbellExercise(currentExercise?.exercise ?? {})
      ? onPlateCalculatorClick
      : undefined,
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
      setLogIdResolvedByBlockIdRef.current.set(block.block.id, fn);
      return () => {};
    },
    onSetLogUpsert: onSetLogUpsert ?? (() => {}),
    onSetEditSaved: onSetEditSaved ?? (() => {}),
    loggedSets: loggedSets ?? [],
    onWorkoutBack: onExitWorkout,
  };

  // Route to appropriate component based on block type
  const renderBlockExecutor = () => {
    const blockType = block.block.set_type;

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
      case "hr_sets":
        return <HRSetExecutor {...commonProps} />;
      default:
        return <StraightSetExecutor {...commonProps} />;
    }
  };

  // Note: currentExercise is already defined at line 429, reused here for modals

  return (
    <>
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

      {/* Exercise Alternatives Modal */}
      {showAlternativesModal &&
        alternativesExerciseId &&
        (() => {
          const exerciseData = block.block.exercises?.find(
            (ex) => ex.exercise_id === alternativesExerciseId,
          );
          const exercise = exerciseData?.exercise;
          if (!exercise) return null;

          return (
            <ExerciseAlternativesModal
              isOpen={showAlternativesModal}
              onClose={() => {
                setShowAlternativesModal(false);
                setAlternativesExerciseId(null);
              }}
              exercise={{
                id: alternativesExerciseId,
                name: exercise.name || "",
                description: exercise.description || "",
                category: (exercise as any)?.category || "",
              }}
              allExercises={allExercises}
            />
          );
        })()}

      {/* RPE Modal - Deprecated: RPE is now collected inline via InlineRPERow component */}
      {/* Keeping component import but never rendering it */}

      {/* Rest Timer Modal */}
      <RestTimerModal
        isOpen={showRestTimer}
        restSeconds={restDuration}
        onComplete={handleRestComplete}
        onSkip={handleRestSkip}
        nextLabel={restLabel}
        lastSet={restModalData?.lastSet ?? null}
        nextSetPreview={restModalData?.nextSetPreview ?? null}
      />
    </>
  );
}
