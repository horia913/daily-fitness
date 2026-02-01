"use client";

import React, { useState, useEffect, useRef } from "react";
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
import { RestTimerModal } from "./workout-execution/RestTimerModal";
import { BaseBlockExecutorProps } from "./workout-execution/types";
import {
  formatTime,
  calculateSuggestedWeightUtil,
} from "./workout-execution/BaseBlockExecutor";
import { fetchApi } from "@/lib/apiClient";

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
  sessionId?: string | null;
  assignmentId?: string;
  allBlocks?: LiveWorkoutBlock[];
  currentBlockIndex?: number;
  onBlockChange?: (blockIndex: number) => void;
  onSetLogged?: (blockId: string, newCompletedSets: number) => void;
  onExerciseComplete?: (blockId: string) => void;
  progressionSuggestions?: Map<
    string,
    import("@/lib/clientProgressionService").ProgressionSuggestion
  >;
}

export default function LiveWorkoutBlockExecutor({
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
  onSetLogged,
  onExerciseComplete,
  progressionSuggestions,
}: LiveWorkoutBlockExecutorProps) {
  const { addToast } = useToast();
  const { ensureFreshSession, user: authUser } = useAuth();

  // Debug: Log assignmentId received as prop
  console.log("📍 LiveWorkoutBlockExecutor received:", {
    assignmentId,
    blockId: block.block.id,
    blockType: (block.block as any).type || block.block.block_type,
  });

  useEffect(() => {
    console.log(
      "🔍 [LiveWorkoutBlockExecutor] assignmentId received:",
      assignmentId
    );
    console.log(
      "🔍 [LiveWorkoutBlockExecutor] assignmentId type:",
      typeof assignmentId
    );
    console.log(
      "🔍 [LiveWorkoutBlockExecutor] assignmentId truthy:",
      !!assignmentId
    );
  }, [assignmentId]);

  // Sync local exercise index with block's currentExerciseIndex
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(
    block.currentExerciseIndex || 0
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
    null
  );
  const completedBlockRef = useRef<Set<string>>(new Set());

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
  const inFlightLogRef = useRef<null | { startedAt: number; abort: () => void }>(null);

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

  // Log set to database and calculate e1RM
  // Individual sets go to workout_set_logs, not workout_logs
  // workout_logs is for session summary only
  const logSetToDatabase = async (data: any): Promise<{ success: boolean; error?: any; e1rm?: number; set_log_id?: string; isNewPR?: boolean }> => {
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
      block_id: data?.block_id,
      block_type: data?.block_type,
      exercise_id: data?.exercise_id,
      set_number: data?.set_number,
    };

    try {
      console.log("[log-set] start", {
        route: window.location.pathname,
        assignmentId,
        blockId: block.block.id,
        payload: {
          exercise_id: data?.exercise_id,
          reps: data?.reps,
          weight: data?.weight,
          set_number: data?.set_number,
        },
      });
      console.log("[log-set] ensureFreshSession: begin");
      try {
        await Promise.race([
          ensureFreshSession(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("ensureFreshSession timeout")), 4000)
          ),
        ]);
        console.log("[log-set] ensureFreshSession: done");
      } catch (refreshError) {
        console.warn("[log-set] ensureFreshSession failed or timed out", refreshError);
      }

      let resolvedUserId = authUser?.id || null;
      if (!resolvedUserId) {
        try {
          const { data: { user } } = (await Promise.race([
            supabase.auth.getUser(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("getUser timeout")), 2000)
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
            setTimeout(() => reject(new Error("getSession timeout")), 2000)
          ),
        ])) as { data: { session: any } };
        activeSession = session ?? null;
      } catch (sessionError) {
        // Non-blocking: continue without session details if getSession is slow.
        console.debug("[log-set] getSession timed out; continuing", sessionError);
      }

      const logSessionInfo = {
        hasSession: !!activeSession,
        expiresAt: activeSession?.expires_at ?? null,
        expiresInSec: activeSession?.expires_at
          ? Math.round(activeSession.expires_at - Date.now() / 1000)
          : null,
        hasAccessToken: !!activeSession?.access_token,
      };

      // Call /api/log-set to:
      // 1. Get/create workout_log_id (for session tracking)
      // 2. Insert into workout_set_logs (individual set data)
      // 3. Calculate and update e1RM in user_exercise_metrics
      try {
        // Debug: Log assignmentId before building request
        console.log(
          "🔍 [logSetToDatabase] assignmentId from closure:",
          assignmentId
        );
        console.log(
          "🔍 [logSetToDatabase] assignmentId type:",
          typeof assignmentId
        );
        console.log(
          "🔍 [logSetToDatabase] assignmentId truthy:",
          !!assignmentId
        );

        console.log("[log-set] resolvedUserId:", resolvedUserId);

        // Build request body with all data passed from executor + required fields
        if (!resolvedUserId) {
          console.warn("[log-set] No client user id available; relying on cookie auth.");
        }

        const requestBody: any = {
          // Required for workout_set_logs
          block_id: block.block.id,
          block_type:
            data.block_type ||
            (block.block as any).type ||
            block.block.block_type,
          client_id: resolvedUserId || undefined,
          workout_assignment_id: assignmentId || undefined,
          // For API to get/create workout_log_id (session tracking)
          session_id: String(sessionId).trim(),
          template_exercise_id: currentExercise?.id || null,
          // Spread all data from executor (block-type-specific fields)
          ...data,
        };
        console.log("[log-set] requestBody ready", {
          block_id: requestBody.block_id,
          workout_assignment_id: requestBody.workout_assignment_id,
          session_id: requestBody.session_id,
          exercise_id: requestBody.exercise_id,
          reps: requestBody.reps,
          weight: requestBody.weight,
        });

          const sendLogSet = async (attempt: number) => {
            console.log("🚀 About to send to /api/log-set:", {
              requestId,
              attempt,
              route: window.location.pathname,
              session: logSessionInfo,
              workout_assignment_id: requestBody.workout_assignment_id,
              block_id: requestBody.block_id,
              client_id: requestBody.client_id,
              block_type: requestBody.block_type,
              exercise_id: requestBody.exercise_id,
              weight: requestBody.weight,
              reps: requestBody.reps,
            });

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
            console.log("[log-set]", {
              requestId,
              attempt,
              status: response.status,
              payloadSummary,
              responseText,
            });

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

        if ((response.status === 401 || response.status === 403) && attempt === 1) {
          await ensureFreshSession();
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

              // Show PR notification if new personal record
            if (result.pr?.any_weight_pr || result.pr?.any_volume_pr) {
              addToast({
                title: "🎉 New Personal Record!",
                description: result.pr?.message || "New PR achieved!",
                variant: "success",
                duration: 4000,
              });
            } else if (result.pr?.warning) {
              addToast({
                title: "Set Logged",
                description: result.pr.warning,
                variant: "default",
                duration: 3000,
              });
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
    // Update parent's completedSets
    onSetLogged?.(block.block.id, newCompletedSets);
    console.log("[block complete detected]", {
      blockId: block.block.id,
      completedSets: newCompletedSets,
      totalSets:
        block.block.exercises?.[currentExerciseIndex]?.sets ||
        block.block.total_sets ||
        1,
      currentExerciseIndex,
      source: "handleSetComplete",
    });

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
        // More exercises - show rest timer before next exercise
        const nextExercise = exercises[nextExerciseIndex];
        const restSeconds = nextExercise.rest_seconds || 0;

        if (restSeconds > 0) {
          setRestDuration(restSeconds);
          setRestLabel(
            `Next Exercise: ${
              nextExercise.exercise?.name ||
              (nextExercise as any).name ||
              "Exercise"
            }`
          );
          setPendingAction("exercise");
          setShowRestTimer(true);
        } else {
          // No rest, advance immediately
          onExerciseComplete?.(block.block.id);
        }
      } else {
        // No more exercises, block is complete
        // Guard against duplicate completion calls
        if (!completedBlockRef.current.has(block.block.id)) {
          completedBlockRef.current.add(block.block.id);
          console.log("[block complete detected]", {
            blockId: block.block.id,
            completedSets: newCompletedSets,
            totalSets:
              currentExercise?.sets || block.block.total_sets || 1,
            currentExerciseIndex,
            source: "handleSetComplete-finalExercise",
          });
          onBlockComplete?.(block.block.id, []);
        }
      }
    } else {
      // More sets to do in this exercise
      const restSeconds =
        currentExercise?.rest_seconds || block.block.rest_seconds || 0;

      if (restSeconds > 0) {
        setRestDuration(restSeconds);
        setRestLabel("Next Set");
        setPendingAction("set");
        setShowRestTimer(true);
        // Don't advance yet - wait for timer
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

    console.log("✅ Auto-completing block from effect", {
      blockId: block.block.id,
      completedSets,
      totalSetsForExercise,
      currentExIndex,
    });
    console.log("[block complete detected]", {
      blockId: block.block.id,
      completedSets,
      totalSets: totalSetsForExercise,
      currentExerciseIndex: currentExIndex,
      source: "completionEffect",
    });
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
    handleRestComplete();
  };

  // Get progression suggestion for current exercise
  const currentExercise = block.block.exercises?.[currentExerciseIndex];
  const progressionSuggestion =
    currentExercise?.exercise_id && progressionSuggestions
      ? progressionSuggestions.get(currentExercise.exercise_id)
      : undefined;

  // Common props for all block executors
  const commonProps: BaseBlockExecutorProps = {
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
    onExerciseIndexChange: setCurrentExerciseIndex,
    logSetToDatabase,
    formatTime,
    calculateSuggestedWeight: (
      exerciseId: string,
      loadPercentage: number | null | undefined
    ) => calculateSuggestedWeightUtil(exerciseId, loadPercentage, e1rmMap),
    onVideoClick: openVideoModal,
    onAlternativesClick: (exerciseId: string) => {
      setAlternativesExerciseId(exerciseId);
      setShowAlternativesModal(true);
    },
    onRestTimerClick: handleRestTimerClick,
    onSetComplete: handleSetComplete,
    progressionSuggestion,
  };

  // Route to appropriate component based on block type
  const renderBlockExecutor = () => {
    const blockType = block.block.block_type;

    // Debug: trace which executor is rendered
    // Note: kept minimal and gated to avoid noisy logs in production builds if env is set
    try {
      // eslint-disable-next-line no-console
      console.log("LiveWorkoutBlockExecutor: rendering type", blockType, {
        blockId: block.block.id,
        blockOrder: block.block.block_order,
        exerciseCount: block.block.exercises?.length || 0,
      });
    } catch {}

    switch (blockType) {
      case "straight_set":
        try {
          // eslint-disable-next-line no-console
          console.log("Executor: StraightSetExecutor");
        } catch {}
        return <StraightSetExecutor {...commonProps} />;
      case "superset":
        try {
          // eslint-disable-next-line no-console
          console.log("Executor: SupersetExecutor");
        } catch {}
        return <SupersetExecutor {...commonProps} />;
      case "giant_set":
        try {
          // eslint-disable-next-line no-console
          console.log("Executor: GiantSetExecutor");
        } catch {}
        return <GiantSetExecutor {...commonProps} />;
      case "drop_set":
        try {
          // eslint-disable-next-line no-console
          console.log("Executor: DropSetExecutor");
        } catch {}
        return <DropSetExecutor {...commonProps} />;
      case "cluster_set":
        try {
          // eslint-disable-next-line no-console
          console.log("Executor: ClusterSetExecutor");
        } catch {}
        return <ClusterSetExecutor {...commonProps} />;
      case "rest_pause":
        try {
          // eslint-disable-next-line no-console
          console.log("Executor: RestPauseExecutor");
        } catch {}
        return <RestPauseExecutor {...commonProps} />;
      // DEPRECATED: pyramid_set, ladder, and circuit block types have been removed
      // case "pyramid_set": - REMOVED
      // case "ladder": - REMOVED
      // case "circuit": - REMOVED
      case "pre_exhaustion":
        try {
          // eslint-disable-next-line no-console
          console.log("Executor: PreExhaustionExecutor");
        } catch {}
        return <PreExhaustionExecutor {...commonProps} />;
      case "amrap":
        try {
          // eslint-disable-next-line no-console
          console.log("Executor: AmrapExecutor");
        } catch {}
        return <AmrapExecutor {...commonProps} />;
      case "emom":
        try {
          // eslint-disable-next-line no-console
          console.log("Executor: EmomExecutor");
        } catch {}
        return <EmomExecutor {...commonProps} />;
      case "tabata":
        try {
          // eslint-disable-next-line no-console
          console.log("Executor: TabataExecutor");
        } catch {}
        return <TabataExecutor {...commonProps} />;
      // DEPRECATED: circuit block type has been removed
      // case "circuit": - REMOVED
      case "for_time":
        try {
          // eslint-disable-next-line no-console
          console.log("Executor: ForTimeExecutor");
        } catch {}
        return <ForTimeExecutor {...commonProps} />;
      case "hr_sets":
        try {
          // eslint-disable-next-line no-console
          console.log("Executor: HRSetExecutor");
        } catch {}
        return <HRSetExecutor {...commonProps} />;
      // DEPRECATED: ladder block type has been removed
      // case "ladder": - REMOVED
      default:
        // Fallback to straight set if unknown type
        try {
          // eslint-disable-next-line no-console
          console.log("Executor: Fallback -> StraightSetExecutor");
        } catch {}
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
            (ex) => ex.exercise_id === alternativesExerciseId
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

      {/* Rest Timer Modal */}
      <RestTimerModal
        isOpen={showRestTimer}
        restSeconds={restDuration}
        onComplete={handleRestComplete}
        onSkip={handleRestSkip}
        nextLabel={restLabel}
      />
    </>
  );
}
