// @ts-nocheck
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import {
  ClientPageShell,
  ClientGlassCard,
  SectionHeader,
  PrimaryButton,
  SecondaryButton,
} from "@/components/client-ui";
import { Badge } from "@/components/ui/badge";
import { Stepper } from "@/components/ui/stepper";
import { RestTimerOverlay } from "@/components/workout/RestTimerOverlay";
import {
  ArrowLeft,
  Play,
  Check,
  CheckCircle,
  Target,
  Youtube,
  X,
  Trophy,
  AlertTriangle,
  Dumbbell,
  Calculator,
  Clock,
  Lightbulb,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Image,
  Video,
  Zap,
  Activity,
  Square,
  TrendingUp,
  Calendar,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchApi } from "@/lib/apiClient";
import { useToast } from "@/components/ui/toast-provider";
import { AchievementUnlockModal } from "@/components/ui/AchievementUnlockModal";
import type { Achievement } from "@/components/ui/AchievementCard";
import LiveWorkoutBlockExecutor from "@/components/client/LiveWorkoutBlockExecutor";
import {
  PRCelebrationModal,
  type PRDetectedPayload,
} from "@/components/client/workout-execution/ui/PRCelebrationModal";
import { WorkoutProgressBar } from "@/components/client/workout-execution/ui/WorkoutProgressBar";
import {
  WorkoutBlock,
  LiveWorkoutBlock,
  LoggedSet,
  WORKOUT_BLOCK_CONFIGS,
  type WorkoutBlockType,
} from "@/types/workoutBlocks";
import {
  fetchE1RMs,
  calculateSuggestedWeight,
  formatSuggestedWeight,
} from "@/lib/e1rmUtils";
import type {
  WorkoutAssignment,
  TemplateExercise,
  ClientBlockRecord,
  ClientBlockExerciseRecord,
} from "./types";
import { BARBELL_OPTIONS } from "./constants";
import { isValidUuid, calculatePlateLoading } from "./utils";
import { PreviousPerformanceCard } from "./components/PreviousPerformanceCard";
import { mapWorkoutBlocksRpcToSetEntries } from "@/lib/workoutBlocksRpcMapper";
export default function LiveWorkout() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params.id as string;
  const { addToast } = useToast();
  const { isDark, getThemeStyles, performanceSettings } = useTheme();

  const [assignment, setAssignment] = useState<WorkoutAssignment | null>(null);
  const [exercises, setExercises] = useState<TemplateExercise[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [workoutStarted, setWorkoutStarted] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingStartedAt, setLoadingStartedAt] = useState<number | null>(null);
  /** True once blocks + exercises are loaded; allows showing "Loading exercises..." after assignment is resolved */
  const [contentReady, setContentReady] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [workoutLogId, setWorkoutLogId] = useState<string | null>(null); // Store restored workout_log_id
  const [currentSetData, setCurrentSetData] = useState({
    weight: 0,
    reps: 0,
  });
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState("");
  const [isLoggingSet, setIsLoggingSet] = useState(false);

  // Rest Timer State
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restTime, setRestTime] = useState(60);

  // Exercise Display Enhancements
  const [showExerciseAlternatives, setShowExerciseAlternatives] =
    useState(false);
  const [showExerciseImage, setShowExerciseImage] = useState(false);
  const [showPlateCalculator, setShowPlateCalculator] = useState(false);
  const [showDropSetCalculator, setShowDropSetCalculator] = useState(false);
  const [showClusterTimer, setShowClusterTimer] = useState(false);
  const [selectedBarbell, setSelectedBarbell] = useState(20);
  const [targetWeight, setTargetWeight] = useState("");
  const [showPlateResults, setShowPlateResults] = useState(false);

  // Workout Block System
  const [workoutBlocks, setWorkoutBlocks] = useState<LiveWorkoutBlock[]>([]);
  /** Parent-owned logged sets keyed by set_entry_id so history persists when navigating set entries. */
  const [loggedSetsByBlockId, setLoggedSetsByBlockId] = useState<
    Record<string, LoggedSet[]>
  >({});
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [useBlockSystem, setUseBlockSystem] = useState(false);
  const workoutBlocksRef = useRef<LiveWorkoutBlock[]>([]);
  const currentBlockIndexRef = useRef(0);
  const completedBlockRef = useRef<Set<string>>(new Set());
  const loadInProgressRef = useRef(false);
  const loadIdRef = useRef(0);

  // Button Enhancement States
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  // Workout Completion State
  const [showWorkoutCompletion, setShowWorkoutCompletion] = useState(false);
  const [isLastBlockComplete, setIsLastBlockComplete] = useState(false);
  const [isCompletingWorkout, setIsCompletingWorkout] = useState(false);
  const isCompletingWorkoutRef = useRef(false);
  const completionStartedAtRef = useRef<number | null>(null);
  const [workoutStats, setWorkoutStats] = useState({
    totalTime: 0,
    exercisesCompleted: 0,
    totalSets: 0,
    personalBests: 0,
    totalWeightLifted: 0,
    weightComparison: "",
  });
  const [workoutStartTime, setWorkoutStartTime] = useState(() => Date.now());
  const [totalWeightLifted, setTotalWeightLifted] = useState(0);
  // Ref to prevent multiple timeout calls for block advancement
  const blockAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  // Exercise details lookup for nested items (giant set, etc.)
  const [exerciseLookup, setExerciseLookup] = useState<
    Record<string, { name: string; video_url?: string }>
  >({});

  // e1RM state for suggested weight calculations
  const [e1rmMap, setE1rmMap] = useState<Record<string, number>>({});

  // Session-level last performed weight per exercise (for sticky default; updated after each successful log-set)
  const [lastPerformedWeightByExerciseId, setLastPerformedWeightByExerciseId] =
    useState<Record<string, number>>({});
  // Last-session weight per exercise (earliest set in most recent completed workout)
  const [lastSessionWeightByExerciseId, setLastSessionWeightByExerciseId] =
    useState<Record<string, number>>({});

  // Celebration queue: PR shows first, then achievements sequentially
  const [newAchievementsQueue, setNewAchievementsQueue] = useState<Achievement[]>([]);
  const [achievementModalIndex, setAchievementModalIndex] = useState(0);
  const [prCelebrationData, setPrCelebrationData] = useState<PRDetectedPayload | null>(null);
  /** Latest body weight (kg) for PR tier multiplier; one fetch per page load */
  const [clientBodyWeightKg, setClientBodyWeightKg] = useState<number | null>(null);
  const pendingAchievementsRef = useRef<Achievement[]>([]);
  const showAchievementsAfterPR = useCallback(() => {
    if (pendingAchievementsRef.current.length > 0) {
      setTimeout(() => {
        setNewAchievementsQueue((prev) => [...prev, ...pendingAchievementsRef.current]);
        setAchievementModalIndex(0);
        pendingAchievementsRef.current = [];
      }, 300);
    }
  }, []);

  // Progression suggestions state
  const [progressionSuggestions, setProgressionSuggestions] = useState<
    Map<string, import("@/lib/clientProgressionService").ProgressionSuggestion>
  >(new Map());

  // DIAGNOSTIC: Tab return loading audit
  useEffect(() => {
    workoutBlocksRef.current = workoutBlocks;
  }, [workoutBlocks]);

  useEffect(() => {
    currentBlockIndexRef.current = currentBlockIndex;
  }, [currentBlockIndex]);

  // Helper: Persist workout progress to workout_sessions (lightweight, non-blocking)
  const persistSessionProgress = async (
    blockIndex: number,
    exerciseIndex: number,
    totalExercises?: number,
  ) => {
    if (!sessionId || !isValidUuid(sessionId)) {
      // Skip if sessionId is not a valid UUID (e.g., 'restored-xxx' or timestamp)
      return;
    }

    try {
      const updatePayload: {
        current_block_index: number;
        current_exercise_index: number;
        last_activity_at: string;
        total_exercises?: number;
      } = {
        current_block_index: blockIndex,
        current_exercise_index: exerciseIndex,
        last_activity_at: new Date().toISOString(),
      };

      if (totalExercises !== undefined) {
        updatePayload.total_exercises = totalExercises;
      }

      const { error } = await supabase
        .from("workout_sessions")
        .update(updatePayload)
        .eq("id", sessionId);

      if (error) {
        console.warn(
          "⚠️ Failed to persist session progress (non-blocking):",
          error.message,
        );
      }
    } catch (err) {
      console.warn("⚠️ Error persisting session progress (non-blocking):", err);
    }
  };

  // Persist progress when block index changes (debounced via navigation events)
  useEffect(() => {
    if (sessionId && isValidUuid(sessionId) && workoutBlocks.length > 0) {
      const currentBlock = workoutBlocks[currentBlockIndex];
      const globalExerciseIndex = currentBlock?.currentExerciseIndex ?? 0;

      // Calculate total exercises across all blocks
      const totalExercises = workoutBlocks.reduce((total, block) => {
        return total + (block.block.exercises?.length || 1);
      }, 0);

      persistSessionProgress(
        currentBlockIndex,
        globalExerciseIndex,
        totalExercises,
      );
    }
  }, [currentBlockIndex, sessionId, workoutBlocks.length]);

  // Helper function to get suggested weight display text
  const getSuggestedWeightText = (
    exerciseId: string,
    loadPercentage: number | null | undefined,
  ): string | null => {
    if (!loadPercentage || loadPercentage <= 0) {
      return null;
    }

    const e1rm = e1rmMap[exerciseId];
    if (!e1rm || e1rm <= 0) {
      return `${loadPercentage}% Load - Suggested: Log first set to calculate`;
    }

    const suggested = calculateSuggestedWeight(
      exerciseId,
      loadPercentage,
      e1rmMap,
    );
    if (suggested !== null && suggested > 0) {
      return `${loadPercentage}% Load - Suggested: ${suggested}kg`;
    }

    return `${loadPercentage}% Load - Suggested: Log first set to calculate`;
  };

  const barbellOptions = BARBELL_OPTIONS;

  // Workout Block Handlers
  const handleBlockComplete = (blockId: string, loggedSets: LoggedSet[]) => {
    const hadLogId = !!workoutLogId;
    const assignmentIdForApi = assignment?.id || assignmentId;

    // Persist block completion (non-blocking). When workout_log_id was missing, persist the one returned by the API.
    fetchApi("/api/block-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workout_log_id: workoutLogId || undefined,
        workout_assignment_id: assignmentIdForApi,
        workout_set_entry_id: blockId,
      }),
    })
      .then((r) => r.json())
      .then((res: { workout_log_id?: string }) => {
        if (!hadLogId && res.workout_log_id)
          setWorkoutLogId(res.workout_log_id);
      })
      .catch((err) => console.error("block-complete failed", err));

    // Update block completion status
    setWorkoutBlocks((prev) => {
      const updated = prev.map((block) =>
        block.block.id === blockId ? { ...block, isCompleted: true } : block,
      );

      // Check if all blocks are now completed
      const allCompleted = updated.every((block) => block.isCompleted);
      const completedCount = updated.filter(
        (block) => block.isCompleted,
      ).length;

      // Only show completion when ALL blocks are complete
      if (allCompleted) {
        setIsLastBlockComplete(true);
      }

      return updated;
    });

    // AUTO-ADVANCE: Move to next block or show completion
    // Clear any existing timeout to prevent multiple calls
    if (blockAdvanceTimeoutRef.current) {
      clearTimeout(blockAdvanceTimeoutRef.current);
    }

    // Move setTimeout OUTSIDE of setWorkoutBlocks to prevent multiple timeouts
    // Capture current values to avoid stale closures
    const currentIdx = currentBlockIndexRef.current;
    const totalBlocks = workoutBlocksRef.current.length;

    blockAdvanceTimeoutRef.current = setTimeout(() => {
      // Use functional update to get latest state
      setCurrentBlockIndex((latestIdx) => {
        const isLastBlock = latestIdx >= workoutBlocksRef.current.length - 1;
        if (!isLastBlock) {
          return latestIdx + 1;
        } else {
          return latestIdx;
        }
      });
      blockAdvanceTimeoutRef.current = null;
    }, 1500); // Small delay for UX
  };

  const handleNextBlock = () => {
    if (currentBlockIndex < workoutBlocks.length - 1) {
      setCurrentBlockIndex((prev) => prev + 1);
    } else {
      // All blocks completed, finish workout
      setShowWorkoutCompletion(true);
    }
  };

  // Handle block change
  const handleBlockChange = (blockIndex: number) => {
    setCurrentBlockIndex(blockIndex);
    // Reset exercise index to 0 when changing blocks
    setWorkoutBlocks((prev) =>
      prev.map((block, idx) =>
        idx === blockIndex ? { ...block, currentExerciseIndex: 0 } : block,
      ),
    );
  };

  // Upsert a logged set so history persists when navigating blocks. Single source of truth: loggedSetsByBlockId.
  const handleSetLogUpsert = (
    blockId: string,
    setEntry: LoggedSet,
    options?: { replaceId?: string },
  ) => {
    setLoggedSetsByBlockId((prev) => {
      const list = prev[blockId] ?? [];
      const replaceId = options?.replaceId;
      let next: LoggedSet[];
      if (replaceId != null) {
        const idx = list.findIndex((s) => s.id === replaceId);
        if (idx >= 0) {
          next = list.map((s, i) => (i === idx ? setEntry : s));
        } else {
          next = [...list, setEntry];
        }
      } else {
        const idx = list.findIndex((s) => s.id === setEntry.id);
        if (idx >= 0) {
          next = list.map((s, i) => (i === idx ? setEntry : s));
        } else {
          next = [...list, setEntry];
        }
      }
      return { ...prev, [blockId]: next };
    });
    // Keep block.existingSetLogs in sync for any code that reads from block
    setWorkoutBlocks((prev) =>
      prev.map((block) => {
        if (block.block.id !== blockId) return block;
        const list = block.existingSetLogs ?? [];
        const replaceId = options?.replaceId;
        let next: LoggedSet[];
        if (replaceId != null) {
          const idx = list.findIndex((s) => s.id === replaceId);
          if (idx >= 0) {
            next = list.map((s, i) => (i === idx ? setEntry : s));
          } else {
            next = [...list, setEntry];
          }
        } else {
          const idx = list.findIndex((s) => s.id === setEntry.id);
          if (idx >= 0) {
            next = list.map((s, i) => (i === idx ? setEntry : s));
          } else {
            next = [...list, setEntry];
          }
        }
        return { ...block, existingSetLogs: next };
      }),
    );
  };

  // Replace a set in the store after successful PATCH edit. Match by id only (workout_set_logs.id).
  const handleSetEditSaved = (blockId: string, updatedSet: LoggedSet) => {
    setLoggedSetsByBlockId((prev) => {
      const list = prev[blockId] ?? [];
      const idx = list.findIndex((s) => s.id === updatedSet.id);
      if (idx < 0) return prev;
      const next = list.map((s, i) => (i === idx ? updatedSet : s));
      return { ...prev, [blockId]: next };
    });
    setWorkoutBlocks((prev) =>
      prev.map((block) => {
        if (block.block.id !== blockId) return block;
        const list = block.existingSetLogs ?? [];
        const idx = list.findIndex((s) => s.id === updatedSet.id);
        if (idx < 0) return block;
        const next = list.map((s, i) => (i === idx ? updatedSet : s));
        return { ...block, existingSetLogs: next };
      }),
    );
  };

  // Handle set logged - update completedSets in workout blocks state
  const handleSetLogged = (blockId: string, newCompletedSets: number) => {
    const currentBlock = workoutBlocksRef.current.find(
      (block) => block.block.id === blockId,
    );
    if (!currentBlock) {
      setWorkoutBlocks((prev) =>
        prev.map((block) =>
          block.block.id === blockId
            ? { ...block, completedSets: newCompletedSets }
            : block,
        ),
      );
      return;
    }

    const exercises = currentBlock.block.exercises || [];
    const currentExIndex = currentBlock.currentExerciseIndex || 0;
    const currentExercise = exercises[currentExIndex];
    const totalSetsForExercise =
      currentExercise?.sets || currentBlock.block.total_sets || 1;

    const isLastExercise = currentExIndex >= exercises.length - 1;
    const isExerciseComplete = newCompletedSets >= totalSetsForExercise;

    setWorkoutBlocks((prev) =>
      prev.map((block) =>
        block.block.id === blockId
          ? {
              ...block,
              completedSets: newCompletedSets,
              isCompleted:
                isExerciseComplete && isLastExercise ? true : block.isCompleted,
            }
          : block,
      ),
    );

    if (!isExerciseComplete || !isLastExercise) return;

    if (completedBlockRef.current.has(blockId)) return;
    completedBlockRef.current.add(blockId);

    if (blockAdvanceTimeoutRef.current) {
      clearTimeout(blockAdvanceTimeoutRef.current);
    }

    blockAdvanceTimeoutRef.current = setTimeout(() => {
      setCurrentBlockIndex((latestIdx) => {
        const isLastBlock = latestIdx >= workoutBlocksRef.current.length - 1;
        if (!isLastBlock) {
          return latestIdx + 1;
        }
        setIsLastBlockComplete(true);
        return latestIdx;
      });
      blockAdvanceTimeoutRef.current = null;
    }, 500);
  };

  // Handle exercise complete - advance to next exercise within a block
  const handleExerciseComplete = (blockId: string) => {
    setWorkoutBlocks((prev) =>
      prev.map((block) => {
        if (block.block.id !== blockId) return block;

        const currentExIndex = block.currentExerciseIndex || 0;
        const exercises = block.block.exercises || [];

        if (currentExIndex < exercises.length - 1) {
          // Advance to next exercise, reset sets
          return {
            ...block,
            currentExerciseIndex: currentExIndex + 1,
            completedSets: 0,
          };
        } else {
          // All exercises done, mark block complete
          return { ...block, isCompleted: true };
        }
      }),
    );
  };

  useEffect(() => {
    if (!assignmentId) return;

    loadAssignment().catch((error) => {
      console.error("Error loading assignment:", error);
    });
  }, [assignmentId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user?.id || cancelled) return;
        const { data, error } = await supabase
          .from("body_metrics")
          .select("weight_kg")
          .eq("client_id", user.id)
          .not("weight_kg", "is", null)
          .order("measured_date", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cancelled || error) return;
        const w = data?.weight_kg;
        if (w != null && Number(w) > 0) {
          setClientBodyWeightKg(Number(w));
        }
      } catch {
        /* non-blocking */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refetchAssignment = useCallback(() => {
    if (assignmentId) loadAssignment().catch(() => {});
  }, [assignmentId]);

  // Log when completion modal state changes and calculate stats from database
  useEffect(() => {
    if (showWorkoutCompletion) {
      calculateWorkoutStatsFromDatabase();
    }
  }, [showWorkoutCompletion]);

  // ============================================================================
  // WORKOUT SESSION RESUMPTION FUNCTIONS
  // ============================================================================

  /**
   * Resolve the actual workout_assignment_id for session tracking
   * Supports only workout_assignments.id and program_day_assignments.id
   */
  const resolveWorkoutAssignmentId = async (
    assignmentId: string,
    userId: string,
  ): Promise<string | null> => {
    try {
      // First check if it's a regular workout_assignment
      const { data: workoutAssignment } = await supabase
        .from("workout_assignments")
        .select("id")
        .eq("id", assignmentId)
        .eq("client_id", userId)
        .maybeSingle();

      if (workoutAssignment) {
        return workoutAssignment.id;
      }

      // Check if it's a program_day_assignments id
      const { data: programDayAssignment } = await supabase
        .from("program_day_assignments")
        .select("id, workout_assignment_id, program_assignment_id")
        .eq("id", assignmentId)
        .maybeSingle();

      if (programDayAssignment?.workout_assignment_id) {
        // Verify ownership via program_assignments
        const { data: programAssignment } = await supabase
          .from("program_assignments")
          .select("id, client_id")
          .eq("id", programDayAssignment.program_assignment_id)
          .eq("client_id", userId)
          .maybeSingle();

        if (programAssignment) {
          return programDayAssignment.workout_assignment_id;
        }
      }

      return null;
    } catch (error) {
      console.error("Error resolving workout_assignment_id:", error);
      return null;
    }
  };

  /**
   * Close incomplete workout_logs from previous calendar days
   * Called on page load to clean up stale sessions
   */
  const closeIncompleteLogsFromPreviousDays = async (
    workoutAssignmentId: string,
    userId: string,
  ): Promise<void> => {
    try {
      const now = new Date();
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      const todayStartISO = todayStart.toISOString();

      // Find all incomplete logs for this assignment from previous days
      const { data: oldLogs, error } = await supabase
        .from("workout_logs")
        .select("id, started_at")
        .eq("workout_assignment_id", workoutAssignmentId)
        .eq("client_id", userId)
        .is("completed_at", null) // Incomplete
        .lt("started_at", todayStartISO) // Started before today
        .order("started_at", { ascending: false });

      if (error) {
        console.error("Error fetching old incomplete logs:", error);
        return;
      }

      if (oldLogs && oldLogs.length > 0) {
        console.log(
          `🔒 Closing ${oldLogs.length} incomplete workout_log(s) from previous days`,
        );

        // Close all old incomplete logs by setting completed_at to started_at
        // This marks them as "abandoned" rather than truly completed
        for (const log of oldLogs) {
          const { error: updateError } = await supabase
            .from("workout_logs")
            .update({
              completed_at: log.started_at, // Mark as completed at start time (effectively abandoned)
            })
            .eq("id", log.id);

          if (updateError) {
            console.error(`Error closing workout_log ${log.id}:`, updateError);
          } else {
            console.log(
              `✅ Closed workout_log ${log.id} (started: ${log.started_at})`,
            );
          }
        }
      }
    } catch (error) {
      console.error("Error closing incomplete logs from previous days:", error);
    }
  };

  /**
   * Find active workout_log for today
   * Returns the workout_log_id, started_at, and workout_session_id if found
   */
  const findActiveWorkoutLogForToday = async (
    workoutAssignmentId: string,
    userId: string,
  ): Promise<{
    id: string;
    started_at: string;
    workout_session_id: string | null;
  } | null> => {
    try {
      const now = new Date();
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      const todayStartISO = todayStart.toISOString();
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);
      const todayEndISO = todayEnd.toISOString();

      const { data: activeLog, error } = await supabase
        .from("workout_logs")
        .select("id, started_at, workout_session_id")
        .eq("workout_assignment_id", workoutAssignmentId)
        .eq("client_id", userId)
        .is("completed_at", null) // Incomplete
        .gte("started_at", todayStartISO) // Started today or later
        .lt("started_at", todayEndISO) // But before tomorrow
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error finding active workout_log:", error);
        return null;
      }

      if (activeLog) {
        console.log("✅ Found active workout_log for today:", {
          id: activeLog.id,
          started_at: activeLog.started_at,
          workout_session_id: activeLog.workout_session_id,
        });
        return activeLog;
      }

      return null;
    } catch (error) {
      console.error("Error finding active workout_log:", error);
      return null;
    }
  };

  /**
   * Restore workout progress from workout_set_logs and workout_set_entry_completions
   * Counts sets per block/exercise to determine where client left off; blocks with
   * no set logs but a block-completion record (e.g. timer-only Tabata/EMOM) are marked completed.
   */
  const restoreWorkoutProgress = async (
    workoutLogId: string,
    workoutBlocks: any[],
    userId: string,
    prefetched?: {
      setLogs?: any[];
      blockCompletions?: { workout_set_entry_id: string }[];
      startedAt?: string | null;
    },
  ): Promise<{
    currentBlockIndex: number;
    workoutBlocksWithProgress: LiveWorkoutBlock[];
    workoutStartTime: number;
  } | null> => {
    try {
      let setLogs: any[];
      let blockCompletions: { workout_set_entry_id: string }[];
      let startedAt: string | null = null;

      if (prefetched?.setLogs != null && prefetched?.blockCompletions != null) {
        setLogs = prefetched.setLogs;
        blockCompletions = prefetched.blockCompletions;
        startedAt = prefetched.startedAt ?? null;
      } else {
        const [setLogsResult, blockCompletionsResult, workoutLogResult] =
          await Promise.all([
            supabase
              .from("workout_set_logs")
              .select(
                "id, set_entry_id, exercise_id, set_number, round_number, set_type, weight, reps, rpe, completed_at, amrap_total_reps, amrap_duration_seconds, emom_minute_number, emom_total_reps_this_min, fortime_total_reps, fortime_time_taken_sec, preexhaust_isolation_exercise_id, preexhaust_isolation_weight, preexhaust_isolation_reps, preexhaust_compound_exercise_id, preexhaust_compound_weight, preexhaust_compound_reps",
              )
              .eq("workout_log_id", workoutLogId)
              .eq("client_id", userId)
              .order("completed_at", { ascending: true }),
            supabase
              .from("workout_set_entry_completions")
              .select("workout_set_entry_id")
              .eq("workout_log_id", workoutLogId),
            supabase
              .from("workout_logs")
              .select("started_at")
              .eq("id", workoutLogId)
              .single(),
          ]);
        const err = setLogsResult.error;
        if (err) {
          console.error("Error fetching set logs for progress restoration:", err);
          return null;
        }
        setLogs = setLogsResult.data ?? [];
        blockCompletions = blockCompletionsResult.data ?? [];
        startedAt = workoutLogResult.data?.started_at ?? null;
        if (blockCompletionsResult.error) {
          console.error("Error fetching block completions:", blockCompletionsResult.error);
        }
      }

      const completedBlockIds = new Set(
        (blockCompletions || []).map(
          (r: { workout_set_entry_id: string }) => r.workout_set_entry_id,
        ),
      );

      const workoutStartTime = startedAt
        ? new Date(startedAt).getTime()
        : Date.now();

      if (!setLogs || setLogs.length === 0) {
        if (completedBlockIds.size === 0) {
          console.log("No set logs and no block completions - starting fresh");
          return null;
        }
        console.log(
          `📊 No set logs; restoring from ${completedBlockIds.size} block completion(s)`,
        );
      } else {
        console.log(
          `📊 Found ${setLogs.length} set logs to restore progress from`,
        );
      }

      // Group sets by set_entry_id and exercise_id
      // Also track set_number for blocks that use it
      const setsByBlock = new Map<
        string,
        Map<string, { count: number; maxSetNumber: number }>
      >();
      // set_entry_id -> (exercise_id -> { count, maxSetNumber })

      for (const setLog of setLogs) {
        if (!setLog.set_entry_id) continue;

        if (!setsByBlock.has(setLog.set_entry_id)) {
          setsByBlock.set(setLog.set_entry_id, new Map());
        }

        const blockSets = setsByBlock.get(setLog.set_entry_id)!;
        const exerciseId = setLog.exercise_id || "unknown";
        const current = blockSets.get(exerciseId) || {
          count: 0,
          maxSetNumber: 0,
        };

        // For block types that log sets individually, count each log
        // For block types that log once per completion (amrap, for_time, tabata, emom), count as 1 set
        const isSingleLogBlock = [
          "amrap",
          "emom",
          "tabata",
          "for_time",
        ].includes(setLog.set_type || "");

        if (isSingleLogBlock) {
          // These block types complete the entire exercise/round with one log
          // Set count to 1 (completes the block)
          blockSets.set(exerciseId, { count: 1, maxSetNumber: 1 });
        } else {
          // Count individual sets (giant_set: round_number, emom: emom_minute_number, others: set_number)
          const setNumber =
            setLog.set_number ??
            setLog.round_number ??
            setLog.emom_minute_number ??
            current.count + 1;
          const newCount = Math.max(current.count + 1, setNumber);
          const newMaxSetNumber = Math.max(current.maxSetNumber, setNumber);
          blockSets.set(exerciseId, {
            count: newCount,
            maxSetNumber: newMaxSetNumber,
          });
        }
      }

      // Restore progress in workout blocks
      let currentBlockIndex = 0;
      let foundIncompleteBlock = false;

      const workoutBlocksWithProgress = workoutBlocks.map(
        (block: any, index) => {
          // Handle both WorkoutBlock[] (block.id) and LiveWorkoutBlock[] (block.block.id)
          const blockId = block.block?.id || block.id;
          const blockData = block.block || block;
          const blockSetsCounts = setsByBlock.get(blockId);
          const completedByBlockCompletionRecord =
            completedBlockIds.has(blockId);

          // Build existing set logs for this block (for navigation/edit in executor)
          const blockSetLogs = (setLogs || []).filter(
            (s: any) => s.set_entry_id === blockId,
          );
          const blockTypeForRestore = blockData.set_type;
          const sorted = [...blockSetLogs].sort((a: any, b: any) => {
            const na = a.set_number ?? a.round_number ?? 0;
            const nb = b.set_number ?? b.round_number ?? 0;
            return na - nb;
          });
          let existingSetLogs: Array<{
            id: string;
            exercise_id: string;
            set_entry_id: string;
            set_number: number;
            weight_kg?: number;
            reps_completed?: number;
            completed_at: Date;
          }>;
          if (blockTypeForRestore === "preexhaust") {
            existingSetLogs = sorted.flatMap((s: any) => {
              const setNum = s.set_number ?? s.round_number ?? 0;
              const completedAt = s.completed_at
                ? new Date(s.completed_at)
                : new Date();
              return [
                {
                  id: s.id,
                  exercise_id:
                    s.preexhaust_isolation_exercise_id || s.exercise_id || "",
                  set_entry_id: s.set_entry_id,
                  set_number: setNum,
                  weight_kg:
                    s.preexhaust_isolation_weight != null
                      ? Number(s.preexhaust_isolation_weight)
                      : s.weight != null
                        ? Number(s.weight)
                        : undefined,
                  reps_completed:
                    s.preexhaust_isolation_reps != null
                      ? Number(s.preexhaust_isolation_reps)
                      : s.reps != null
                        ? Number(s.reps)
                        : undefined,
                  rpe: s.rpe ?? undefined,
                  completed_at: completedAt,
                },
                {
                  id: s.id,
                  exercise_id: s.preexhaust_compound_exercise_id || "",
                  set_entry_id: s.set_entry_id,
                  set_number: setNum,
                  weight_kg:
                    s.preexhaust_compound_weight != null
                      ? Number(s.preexhaust_compound_weight)
                      : undefined,
                  reps_completed:
                    s.preexhaust_compound_reps != null
                      ? Number(s.preexhaust_compound_reps)
                      : undefined,
                  rpe: s.rpe ?? undefined,
                  completed_at: completedAt,
                },
              ];
            });
          } else {
            existingSetLogs = sorted.map((s: any) => {
              const weightKg = s.weight != null ? Number(s.weight) : undefined;
              const repsVal =
                s.reps != null
                  ? Number(s.reps)
                  : s.amrap_total_reps != null
                    ? Number(s.amrap_total_reps)
                    : s.emom_total_reps_this_min != null
                      ? Number(s.emom_total_reps_this_min)
                      : s.fortime_total_reps != null
                        ? Number(s.fortime_total_reps)
                        : undefined;
              return {
                id: s.id,
                exercise_id: s.exercise_id || "",
                set_entry_id: s.set_entry_id,
                set_number:
                  s.set_number ?? s.round_number ?? s.emom_minute_number ?? 0,
                weight_kg: weightKg,
                reps_completed: repsVal,
                rpe: s.rpe ?? undefined,
                completed_at: s.completed_at
                  ? new Date(s.completed_at)
                  : new Date(),
              };
            });
          }

          if (!blockSetsCounts || blockSetsCounts.size === 0) {
            // No set logs for this block: either completed via block-completion record (e.g. timer-only) or incomplete
            if (completedByBlockCompletionRecord) {
              if (!foundIncompleteBlock) {
                currentBlockIndex = Math.min(
                  index + 1,
                  workoutBlocks.length - 1,
                );
              }
              return {
                block: blockData,
                currentExerciseIndex: 0,
                currentSetIndex: 0,
                isCompleted: true,
                completedSets:
                  blockData.total_sets ||
                  (blockData.exercises && blockData.exercises[0]?.sets) ||
                  1,
                totalSets:
                  blockData.total_sets ||
                  (blockData.exercises && blockData.exercises[0]?.sets) ||
                  1,
                existingSetLogs,
              };
            }
            // No sets and no completion record - incomplete
            if (!foundIncompleteBlock) {
              currentBlockIndex = index;
              foundIncompleteBlock = true;
            }
            return {
              block: blockData,
              currentExerciseIndex: 0,
              currentSetIndex: 0,
              isCompleted: false,
              completedSets: 0,
              totalSets:
                blockData.total_sets ||
                (blockData.exercises && blockData.exercises[0]?.sets) ||
                1,
              existingSetLogs,
            };
          }

          // Check each exercise in the block to determine progress
          const exercises = blockData.exercises || [];
          let blockCompletedSets = 0;
          let currentExerciseIndex = 0;
          let blockIsCompleted = true;
          const blockType = blockData.set_type;

          for (let i = 0; i < exercises.length; i++) {
            const exercise = exercises[i];
            const exerciseId = exercise.exercise_id;
            const exerciseData = blockSetsCounts.get(exerciseId);
            const completedSetsForExercise = exerciseData?.count || 0;
            const totalSetsForExercise =
              exercise.sets !== null && exercise.sets !== undefined
                ? exercise.sets
                : blockData.total_sets || 1;
            const normalizedCompletedSets =
              blockType &&
              ["amrap", "emom", "tabata", "for_time"].includes(blockType)
                ? completedSetsForExercise
                : Math.min(completedSetsForExercise, totalSetsForExercise);

            // For single-log blocks (amrap, for_time, etc.), one log = complete
            // For multi-set blocks, check if sets match total
            const isExerciseComplete =
              blockType &&
              ["amrap", "emom", "tabata", "for_time"].includes(blockType)
                ? completedSetsForExercise >= 1
                : normalizedCompletedSets >= totalSetsForExercise;

            blockCompletedSets = Math.max(
              blockCompletedSets,
              normalizedCompletedSets,
            );

            if (!isExerciseComplete && !foundIncompleteBlock) {
              // Found the incomplete exercise/block
              currentBlockIndex = index;
              currentExerciseIndex = i;
              foundIncompleteBlock = true;
              blockIsCompleted = false;
            }
          }

          // For blocks with multiple exercises (superset, giant_set, pre_exhaustion)
          // Check if all exercises in the current "set" are complete
          if (exercises.length > 1 && !foundIncompleteBlock) {
            const allExercisesComplete = exercises.every((ex: any) => {
              const exerciseId = ex.exercise_id;
              const exerciseData = blockSetsCounts.get(exerciseId);
              const completedSetsForExercise = exerciseData?.count || 0;
              const totalSetsForExercise =
                ex.sets !== null && ex.sets !== undefined
                  ? ex.sets
                  : blockData.total_sets || 1;
              const normalizedCompletedSets =
                blockType &&
                ["amrap", "emom", "tabata", "for_time"].includes(blockType)
                  ? completedSetsForExercise
                  : Math.min(completedSetsForExercise, totalSetsForExercise);

              const isExerciseComplete =
                blockType &&
                ["amrap", "emom", "tabata", "for_time"].includes(blockType)
                  ? completedSetsForExercise >= 1
                  : normalizedCompletedSets >= totalSetsForExercise;

              return isExerciseComplete;
            });

            if (!allExercisesComplete) {
              blockIsCompleted = false;
              if (!foundIncompleteBlock) {
                // Find first incomplete exercise
                for (let i = 0; i < exercises.length; i++) {
                  const ex = exercises[i];
                  const exerciseId = ex.exercise_id;
                  const exerciseData = blockSetsCounts.get(exerciseId);
                  const completedSetsForExercise = exerciseData?.count || 0;
                  const totalSetsForExercise =
                    ex.sets !== null && ex.sets !== undefined
                      ? ex.sets
                      : block.block.total_sets || 1;
                  const normalizedCompletedSets =
                    blockType &&
                    ["amrap", "emom", "tabata", "for_time"].includes(blockType)
                      ? completedSetsForExercise
                      : Math.min(
                          completedSetsForExercise,
                          totalSetsForExercise,
                        );

                  const isExerciseComplete =
                    blockType &&
                    ["amrap", "emom", "tabata", "for_time"].includes(blockType)
                      ? completedSetsForExercise >= 1
                      : normalizedCompletedSets >= totalSetsForExercise;

                  if (!isExerciseComplete) {
                    currentBlockIndex = index;
                    currentExerciseIndex = i;
                    foundIncompleteBlock = true;
                    break;
                  }
                }
              }
            }
          }

          // Block is also completed if we have a block-completion record (e.g. timer-only Tabata/EMOM)
          blockIsCompleted =
            blockIsCompleted || completedByBlockCompletionRecord;

          // If this block is completed and we haven't found an incomplete block yet,
          // advance the restore cursor to the next block.
          if (blockIsCompleted && !foundIncompleteBlock) {
            currentBlockIndex = Math.min(index + 1, workoutBlocks.length - 1);
          }

          // Determine current set index from max set number logged
          // For the current exercise, use its max set number
          let currentSetIndex = 0;
          if (currentExerciseIndex < exercises.length) {
            const currentExercise = exercises[currentExerciseIndex];
            const currentExerciseData = blockSetsCounts.get(
              currentExercise.exercise_id,
            );
            if (currentExerciseData) {
              // If exercise is complete, set index should be at total sets
              // Otherwise, set to the last logged set number
              const totalSetsForCurrentExercise =
                currentExercise.sets !== null &&
                currentExercise.sets !== undefined
                  ? currentExercise.sets
                  : blockData.total_sets || 1;

              const normalizedCurrentCompletedSets =
                blockType &&
                ["amrap", "emom", "tabata", "for_time"].includes(blockType)
                  ? currentExerciseData.count
                  : Math.min(
                      currentExerciseData.count,
                      totalSetsForCurrentExercise,
                    );
              const isCurrentExerciseComplete =
                blockType &&
                ["amrap", "emom", "tabata", "for_time"].includes(blockType)
                  ? currentExerciseData.count >= 1
                  : normalizedCurrentCompletedSets >=
                    totalSetsForCurrentExercise;

              if (isCurrentExerciseComplete) {
                // Exercise is complete, move to next exercise or block
                currentSetIndex = totalSetsForCurrentExercise - 1; // Last set index
              } else {
                // Set to the next set to complete
                // If maxSetNumber is 3 (completed sets 1,2,3), next is set 4 (index 3)
                // In 0-indexed: set 1=0, set 2=1, set 3=2, set 4=3
                // So if maxSetNumber=3, we want index 3
                currentSetIndex = Math.max(
                  0,
                  Math.min(
                    currentExerciseData.maxSetNumber,
                    totalSetsForCurrentExercise,
                  ),
                );
              }
            }
          }

          return {
            block: blockData,
            completedSets: blockCompletedSets,
            currentExerciseIndex,
            currentSetIndex,
            isCompleted: blockIsCompleted,
            totalSets: blockData.total_sets || exercises[0]?.sets || 1,
            existingSetLogs,
          };
        },
      );

      // If all blocks are complete, set to last block
      if (!foundIncompleteBlock && workoutBlocks.length > 0) {
        currentBlockIndex = workoutBlocks.length - 1;
      }

      console.log("📊 Restored workout progress:", {
        currentBlockIndex,
        totalBlocks: workoutBlocks.length,
        blocksWithProgress: workoutBlocksWithProgress.map((b, i) => ({
          blockIndex: i,
          blockId: b.block.id,
          blockType: b.block.set_type,
          completedSets: b.completedSets,
          currentExerciseIndex: b.currentExerciseIndex,
          currentSetIndex: b.currentSetIndex,
          isCompleted: b.isCompleted,
          exercises:
            b.block.exercises?.map((ex: any) => ({
              exerciseId: ex.exercise_id,
              exerciseName: ex.exercise?.name,
              sets: ex.sets,
              loggedSets:
                setsByBlock.get(b.block.id)?.get(ex.exercise_id)?.count || 0,
            })) || [],
        })),
      });

      return {
        currentBlockIndex,
        workoutBlocksWithProgress,
        workoutStartTime,
      };
    } catch (error) {
      console.error("Error restoring workout progress:", error);
      return null;
    }
  };

  // Calculate workout stats from workout_set_logs in database
  const calculateWorkoutStatsFromDatabase = async () => {
    try {
      // Ensure user is authenticated before querying
      const { ensureAuthenticated } = await import("@/lib/supabase");
      await ensureAuthenticated();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !assignmentId) return;

      const actualWorkoutAssignmentId = await resolveWorkoutAssignmentId(
        assignment?.id || assignmentId,
        user.id,
      );

      if (!actualWorkoutAssignmentId) {
        console.warn("⚠️ No workout assignment resolved for stats calculation");
        return;
      }

      console.log(
        "📊 Calculating workout stats from database for assignment:",
        actualWorkoutAssignmentId,
      );

      // ✅ CRITICAL: Get only the ACTIVE workout_log (matches log-set API logic)
      // Since API reuses the same log, all sets should be in the active log
      const { data: activeWorkoutLog, error: logsError } = await supabase
        .from("workout_logs")
        .select("id, started_at, completed_at")
        .eq("workout_assignment_id", actualWorkoutAssignmentId)
        .eq("client_id", user.id)
        .is("completed_at", null) // CRITICAL: Only active logs (matches log-set API)
        .order("started_at", { ascending: false }) // Most recent first
        .limit(1)
        .maybeSingle();

      if (logsError) {
        console.error("❌ Error finding workout log:", logsError);
        return;
      }

      if (!activeWorkoutLog) {
        console.warn("⚠️ No active workout log found for assignment");
        // Fallback to workoutStartTime if available
        const totalTime = workoutStartTime
          ? Math.floor((Date.now() - workoutStartTime) / 1000 / 60)
          : 0;
        setWorkoutStats({
          totalTime,
          exercisesCompleted: 0,
          totalSets: 0,
          personalBests: 0,
          totalWeightLifted: 0,
          weightComparison: "0 kg",
        });
        return;
      }

      const workoutLogId = activeWorkoutLog.id;
      const startTime = activeWorkoutLog.started_at;

      console.log("📊 Found active workout_log:", {
        id: workoutLogId,
        started_at: startTime,
        completed_at: activeWorkoutLog.completed_at,
      });

      // Get ALL workout_set_logs for the active workout_log
      const { data: setLogs, error: setsError } = await supabase
        .from("workout_set_logs")
        .select("weight, reps, exercise_id")
        .eq("workout_log_id", workoutLogId)
        .eq("client_id", user.id);

      if (setsError) {
        console.error("❌ Error fetching set logs:", setsError);
        return;
      }

      console.log("📊 Found set logs:", {
        count: setLogs?.length || 0,
        workout_log_id: workoutLogId,
      });

      // Calculate totals from ALL sets
      const totalSets = setLogs?.length || 0;
      const totalReps =
        setLogs?.reduce((sum, set) => sum + (set.reps || 0), 0) || 0;
      const totalWeightLifted =
        setLogs?.reduce(
          (sum, set) => sum + (set.weight || 0) * (set.reps || 0),
          0,
        ) || 0;
      const uniqueExercises = new Set(
        setLogs?.map((set) => set.exercise_id).filter(Boolean) || [],
      ).size;

      // Calculate duration from start time to now
      const now = Date.now();
      const startTimeMs = startTime ? new Date(startTime).getTime() : null;
      const workoutStartTimeMs = workoutStartTime || null;

      let totalTime = 0;
      if (startTimeMs) {
        const durationMs = now - startTimeMs;
        totalTime = Math.floor(durationMs / 1000 / 60);
        console.log(
          "🕐 [Duration Debug] Calculated from database started_at:",
          {
            started_at: startTime,
            started_at_ms: startTimeMs,
            now_ms: now,
            duration_ms: durationMs,
            duration_seconds: Math.floor(durationMs / 1000),
            duration_minutes: totalTime,
          },
        );
      } else if (workoutStartTimeMs) {
        const durationMs = now - workoutStartTimeMs;
        totalTime = Math.floor(durationMs / 1000 / 60);
        console.log("🕐 [Duration Debug] Calculated from workoutStartTime:", {
          workoutStartTime_ms: workoutStartTimeMs,
          now_ms: now,
          duration_ms: durationMs,
          duration_seconds: Math.floor(durationMs / 1000),
          duration_minutes: totalTime,
        });
      }

      const calculatedStats = {
        totalTime,
        exercisesCompleted: uniqueExercises,
        totalSets,
        personalBests: 0, // TODO: Calculate from e1RM changes
        totalWeightLifted,
        weightComparison: `${totalWeightLifted.toLocaleString()} kg`,
      };

      console.log("✅ Calculated workout stats:", calculatedStats);
      setWorkoutStats(calculatedStats);
    } catch (error) {
      console.error("❌ Error calculating workout stats:", error);
    }
  };

  // Auto-start workout when assignment and exercises are loaded
  useEffect(() => {
    if (assignment && exercises.length > 0 && !sessionId) {
      startWorkout().catch((error) => {
        console.error("Error starting workout:", error);
      });
    }
  }, [assignment, exercises, sessionId]);

  const loadAssignment = async () => {
    if (loadInProgressRef.current) return;
    loadInProgressRef.current = true;
    const loadId = ++loadIdRef.current;
    const isStale = () => loadId !== loadIdRef.current;
    setContentReady(false);
    setLoading(true);
    setLoadingStartedAt(Date.now());

    const safetyTimeout = setTimeout(() => {
      if (loadInProgressRef.current) {
        loadInProgressRef.current = false;
        setLoading(false);
        setLoadingStartedAt(null);
        setContentReady(true);
        addToast({
          title: "Loading took too long",
          description: "Please reload the page to try again.",
          variant: "destructive",
        });
      }
    }, 20_000);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        clearTimeout(safetyTimeout);
        loadInProgressRef.current = false;
        setLoading(false);
        setLoadingStartedAt(null);
        return;
      }

      // TASK B: Support two ID types - workout_assignments.id OR program_day_assignments.id
      // First, try as workout_assignments.id (standalone assignment)
      const { data: assignmentData, error: assignmentError } = await supabase
        .from("workout_assignments")
        .select("*")
        .eq("id", assignmentId)
        .eq("client_id", user.id)
        .maybeSingle();

      let resolvedAssignment = assignmentData;
      let programDayAssignmentId: string | null = null;

      if (assignmentError) throw assignmentError;

      if (!resolvedAssignment) {
        // Not a workout_assignments.id - check if it's a program_day_assignments.id
        console.log(
          "Workout Execution - Not a workout_assignments.id, checking program_day_assignments",
        );

        // Get active program assignment for this client
        const { data: activeProgramAssignment, error: programAssignmentError } =
          await supabase
            .from("program_assignments")
            .select("id, program_id, client_id, coach_id, status")
            .eq("client_id", user.id)
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (programAssignmentError) {
          console.warn(
            "Error checking active program assignment:",
            programAssignmentError,
          );
        }

        if (activeProgramAssignment) {
          // Check if assignmentId is a program_day_assignments.id for this program
          const { data: programDayAssignment, error: programDayError } =
            await supabase
              .from("program_day_assignments")
              .select(
                `
              id,
              program_assignment_id,
              day_number,
              workout_template_id,
              workout_assignment_id,
              name,
              description,
              day_type
            `,
              )
              .eq("id", assignmentId)
              .eq("program_assignment_id", activeProgramAssignment.id)
              .maybeSingle();

          if (programDayError) {
            console.warn(
              "Error checking program_day_assignments:",
              programDayError,
            );
          }

          if (programDayAssignment) {
            // Guardrail: check canonical program_day_completions ledger — the single
            // source of truth for completion. DO NOT use program_day_assignments.is_completed
            // (stale legacy field). See programStateService.ts for authoritative comment.
            const { data: scheduleSlot } = await supabase
              .from("program_schedule")
              .select("id")
              .eq("program_id", activeProgramAssignment.program_id)
              .eq("day_number", programDayAssignment.day_number)
              .maybeSingle();

            if (scheduleSlot) {
              const { data: completionEntry } = await supabase
                .from("program_day_completions")
                .select("id")
                .eq("program_assignment_id", activeProgramAssignment.id)
                .eq("program_schedule_id", scheduleSlot.id)
                .maybeSingle();

              if (completionEntry) {
                addToast({
                  title: "Workout Already Completed",
                  description: "This program workout has already been completed.",
                  variant: "default",
                });
                router.push("/client/train");
                return;
              }
            }

            // Check if day_type is workout (not rest/assessment)
            if (programDayAssignment.day_type !== "workout") {
              addToast({
                title: "Invalid Workout Type",
                description: "This program day is not a workout day.",
                variant: "default",
              });
              router.push("/client/train");
              return;
            }

            programDayAssignmentId = programDayAssignment.id;

            // If workout_assignment_id is null, create one via API route (bypasses RLS)
            if (!programDayAssignment.workout_assignment_id) {
              try {
                const response = await fetchApi("/api/program-workouts/start", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    program_day_assignment_id: programDayAssignment.id,
                  }),
                });

                if (!response.ok) {
                  const errorData = await response
                    .json()
                    .catch(() => ({ error: "Unknown error" }));
                  console.error(
                    "Error creating workout_assignment via API:",
                    errorData,
                  );
                  addToast({
                    title: "Failed to Start Workout",
                    description:
                      errorData.error ||
                      errorData.details ||
                      "Could not start program workout. Please try again.",
                    variant: "destructive",
                  });
                  router.push("/client/train");
                  return;
                }

                const result = await response.json();
                const workoutAssignmentId = result.workout_assignment_id;

                if (!workoutAssignmentId) {
                  throw new Error(
                    "API returned success but no workout_assignment_id",
                  );
                }

                // Load the newly created workout_assignment
                const { data: newWorkoutAssignment, error: loadError } =
                  await supabase
                    .from("workout_assignments")
                    .select("*")
                    .eq("id", workoutAssignmentId)
                    .eq("client_id", user.id)
                    .maybeSingle();

                if (loadError || !newWorkoutAssignment) {
                  console.error(
                    "Error loading newly created workout_assignment:",
                    loadError,
                  );
                  addToast({
                    title: "Workout Assignment Not Found",
                    description:
                      "The workout was created but could not be loaded. Please try again.",
                    variant: "destructive",
                  });
                  router.push("/client/train");
                  return;
                }

                resolvedAssignment = newWorkoutAssignment;
              } catch (apiError) {
                console.error(
                  "Error calling /api/program-workouts/start:",
                  apiError,
                );
                addToast({
                  title: "Failed to Start Workout",
                  description:
                    "Could not start program workout. Please try again.",
                  variant: "destructive",
                });
                router.push("/client/train");
                return;
              }
            } else {
              // Load the existing workout_assignment
              const { data: existingAssignment, error: existingError } =
                await supabase
                  .from("workout_assignments")
                  .select("*")
                  .eq("id", programDayAssignment.workout_assignment_id)
                  .eq("client_id", user.id)
                  .maybeSingle();

              if (existingError) {
                console.error(
                  "Error loading existing workout_assignment:",
                  existingError,
                );
                throw existingError;
              }

              if (!existingAssignment) {
                throw new Error(
                  "Workout assignment linked to program day not found",
                );
              }

              resolvedAssignment = existingAssignment;
            }

            // Store program_day_assignment_id for later use in completion
            (resolvedAssignment as any).program_day_assignment_id =
              programDayAssignment.id;
            (resolvedAssignment as any).program_assignment_id =
              activeProgramAssignment.id;
          }
        }

        // TASK 2: Support exactly two ID types: program_day_assignments.id OR workout_assignments.id
        // No legacy fallbacks - if ID is neither, show error and redirect

        // TASK D: Guardrail - handle ID mismatch (nothing found)
        if (!resolvedAssignment) {
          console.error(
            "Workout Execution - ID not found in any table:",
            assignmentId,
          );
          addToast({
            title: "Workout Not Found",
            description:
              "The requested workout could not be found. Please try again.",
            variant: "destructive",
          });
          router.push("/client/workouts");
          return;
        }
      }

      // Combine the data
      const combinedAssignment: WorkoutAssignment = {
        id: resolvedAssignment.id,
        workout_template_id: resolvedAssignment.workout_template_id ?? null,
        status: resolvedAssignment.status,
        notes: resolvedAssignment.notes ?? null,
        name: resolvedAssignment.name ?? null,
        description: resolvedAssignment.description ?? null,
        scheduled_date: resolvedAssignment.scheduled_date ?? null,
      };

      // Show assignment and header immediately so the screen doesn't stall on blocks load
      if (isStale()) return;
      setAssignment(combinedAssignment);
      setLoading(false);
      setLoadingStartedAt(null);

      // Check if this is a program assignment - load blocks from progression rules
      const isProgramAssignment =
        (resolvedAssignment as any).is_program_assignment === true;
      let workoutBlocks: any[] = [];

      if (isProgramAssignment) {
        // Load blocks from client_program_progression_rules
        const { ProgramProgressionService } =
          await import("@/lib/programProgressionService");
        const programAssignmentId = (resolvedAssignment as any)
          .program_assignment_id;
        const currentWeek = (resolvedAssignment as any).current_week || 1;
        const templateId = (resolvedAssignment as any).workout_template_id;
        const programScheduleId = (resolvedAssignment as any)
          .program_schedule_id;

        console.log("Loading blocks from progression rules:", {
          programAssignmentId,
          currentWeek,
          programScheduleId,
          templateId,
        });

        workoutBlocks =
          await ProgramProgressionService.getClientProgressionBlocksForTemplate(
            programAssignmentId,
            currentWeek,
            templateId,
          );

        // Debug: Log sets values from loaded blocks
        console.log(
          "🔢 [Page] Loaded workout blocks with sets:",
          workoutBlocks.map((block) => ({
            blockOrder: block.set_order,
            blockType: block.set_type,
            exercises: block.exercises?.map((ex: any) => ({
              exercise_id: ex.exercise_id,
              sets: ex.sets,
              reps: ex.reps,
            })),
          })),
        );

        if (!workoutBlocks || workoutBlocks.length === 0) {
          throw new Error(
            "No workout blocks found in progression rules for this program",
          );
        }
      } else {
        // Regular workout assignment - load blocks from template
        if (!combinedAssignment.workout_template_id) {
          throw new Error("Workout template ID not found in assignment");
        }

        // Single RPC for all block data (replaces 25+ sequential queries)
        const templateId = combinedAssignment.workout_template_id;
        const { data: rpcBlocks, error: rpcError } = await supabase.rpc(
          "get_workout_blocks",
          { p_template_id: templateId },
        );
        if (rpcError) {
          console.error("[start] get_workout_blocks RPC error:", rpcError);
          throw new Error(rpcError.message || "Failed to load workout blocks");
        }
        workoutBlocks = mapWorkoutBlocksRpcToSetEntries(rpcBlocks ?? []);

        if (!workoutBlocks || workoutBlocks.length === 0) {
          throw new Error("No workout blocks found for this template");
        }
      }

      // Convert WorkoutBlock[] to ClientBlockRecord[] format
      const clientBlocks: ClientBlockRecord[] = workoutBlocks.map((block) => ({
        id: block.id,
        set_order: block.set_order,
        set_type: block.set_type,
        set_name: block.set_name ?? null,
        set_notes: block.set_notes ?? null,
        total_sets: block.total_sets ?? null,
        reps_per_set: block.reps_per_set ?? null,
        rest_seconds: block.rest_seconds ?? null,
        duration_seconds: block.duration_seconds ?? null,
        time_protocols: (block as any).time_protocols ?? [], // Block-level time protocols
        exercises: (block.exercises ?? []).map((ex: any) => ({
          id: ex.id,
          exercise_id: ex.exercise_id,
          exercise_order: ex.exercise_order,
          exercise_letter: ex.exercise_letter ?? null,
          sets: ex.sets ?? null,
          reps: ex.reps ?? null,
          weight_kg: ex.weight_kg ?? null,
          rir: ex.rir ?? null,
          tempo: ex.tempo ?? null,
          rest_seconds: ex.rest_seconds ?? null,
          load_percentage: (ex as any).load_percentage ?? null,
          notes: ex.notes ?? null,
          time_protocols: ex.time_protocols ?? [], // Exercise-level time protocols for tabata/amrap/emom/etc
          // Preserve special set data
          drop_sets: ex.drop_sets ?? [],
          cluster_sets: ex.cluster_sets ?? [],
          rest_pause_sets: ex.rest_pause_sets ?? [],
        })) as any[],
      }));
      const allClientExercises = clientBlocks.flatMap(
        (block) => (block.exercises ?? []) as any[],
      );

      const exerciseIds = Array.from(
        new Set(
          allClientExercises
            .map((exercise) => exercise.exercise_id)
            .filter((id): id is string => Boolean(id)),
        ),
      );

      const exerciseMeta = new Map<
        string,
        {
          name: string;
          description: string;
          image_url?: string | null;
          video_url?: string | null;
        }
      >();

      if (exerciseIds.length > 0) {
        const { data: exerciseDetails, error: exerciseDetailsError } =
          await supabase
            .from("exercises")
            .select("id, name, description, image_url, video_url")
            .in("id", exerciseIds);

        if (exerciseDetailsError) {
          console.error(
            "Error loading exercise metadata:",
            exerciseDetailsError,
          );
        } else if (exerciseDetails) {
          exerciseDetails.forEach((detail) => {
            exerciseMeta.set(detail.id, {
              name: detail.name,
              description: detail.description ?? "",
              image_url: (detail as any).image_url ?? null,
              video_url: (detail as any).video_url ?? null,
            });
          });
        }
      }

      const now = new Date().toISOString();

      const safeParse = (value: unknown) => {
        if (!value) return {};
        if (typeof value === "string") {
          // Skip parsing if it's clearly not JSON (like "teest")
          const trimmed = value.trim();
          if (trimmed.length === 0) return {};
          // Only try to parse if it looks like JSON (starts with { or [)
          if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
            try {
              return JSON.parse(value);
            } catch (error) {
              console.warn("Failed to parse JSON", value, error);
              return {};
            }
          }
          // If it's not JSON-like, return empty object
          return {};
        }
        if (typeof value === "object") return value || {};
        return {};
      };

      const workoutBlocksConverted: WorkoutBlock[] = clientBlocks.map(
        (block: ClientBlockRecord) => {
          const blockType = (block.set_type as any) || "straight_set";
          const blockParameters = safeParse(block.block_parameters);

          const blockExercises = ((block.exercises ?? []) as any[]).map(
            (exercise: ClientBlockExerciseRecord, idx: number) => {
              const parsedNotes = safeParse(exercise.notes);
              const meta = parsedNotes || {};
              const exerciseType = meta.exercise_type || blockType;
              const metaDetails = exercise.exercise_id
                ? exerciseMeta.get(exercise.exercise_id)
                : undefined;

              return {
                id: exercise.id,
                set_entry_id: block.id,
                exercise_id: exercise.exercise_id ?? "",
                exercise_order:
                  typeof exercise.exercise_order === "number" &&
                  Number.isFinite(exercise.exercise_order)
                    ? exercise.exercise_order
                    : idx + 1,
                exercise_letter: exercise.exercise_letter ?? undefined,
                sets:
                  exercise.sets !== null && exercise.sets !== undefined
                    ? exercise.sets
                    : block.total_sets !== null &&
                        block.total_sets !== undefined
                      ? block.total_sets
                      : undefined,
                reps: exercise.reps ?? block.reps_per_set ?? undefined,
                weight_kg: exercise.weight_kg ?? undefined,
                rir: exercise.rir ?? undefined,
                tempo: exercise.tempo ?? undefined,
                rest_seconds:
                  exercise.rest_seconds ?? block.rest_seconds ?? undefined,
                load_percentage: (exercise as any).load_percentage ?? undefined,
                notes: exercise.notes ?? undefined,
                time_protocols: exercise.time_protocols ?? [], // For tabata/amrap/emom/for_time blocks
                exercise: exercise.exercise_id
                  ? {
                      id: exercise.exercise_id,
                      name: metaDetails?.name || "Exercise",
                      description: metaDetails?.description || "",
                      category: "",
                      image_url: metaDetails?.image_url ?? undefined,
                      video_url: metaDetails?.video_url ?? undefined,
                      created_at: now,
                      updated_at: now,
                    }
                  : undefined,
                // Preserve special set data from exercise
                drop_sets: exercise.drop_sets ?? [],
                cluster_sets: exercise.cluster_sets ?? [],
                rest_pause_sets: exercise.rest_pause_sets ?? [],
                created_at: now,
                updated_at: now,
              };
            },
          );

          return {
            id: block.id,
            template_id:
              combinedAssignment.workout_template_id || combinedAssignment.id,
            set_type: blockType,
            set_order:
              typeof block.set_order === "number" &&
              Number.isFinite(block.set_order)
                ? block.set_order
                : 0,
            set_name: block.set_name ?? undefined,
            set_notes: block.set_notes ?? undefined,
            duration_seconds: (block as any).duration_seconds ?? undefined,
            rest_seconds: block.rest_seconds ?? undefined,
            total_sets: block.total_sets ?? undefined,
            reps_per_set: block.reps_per_set ?? undefined,
            block_parameters: blockParameters,
            exercises: blockExercises as any,
            // Block-level special sets (aggregated from all exercises)
            drop_sets: blockExercises.flatMap((ex: any) => ex.drop_sets || []),
            cluster_sets: blockExercises.flatMap(
              (ex: any) => ex.cluster_sets || [],
            ),
            rest_pause_sets: blockExercises.flatMap(
              (ex: any) => ex.rest_pause_sets || [],
            ),
            time_protocol: block.time_protocols?.[0] ?? undefined, // First time protocol for backwards compatibility
            time_protocols: block.time_protocols ?? [], // Full array for tabata/amrap/emom/for_time
            created_at: now,
            updated_at: now,
          } as WorkoutBlock;
        },
      );

      const exercisesWithDetails: TemplateExercise[] = workoutBlocksConverted
        .flatMap((block) => {
          return (block.exercises || []).map((exercise: any, idx: number) => {
            const meta = safeParse(exercise.notes);
            const exerciseType = meta.exercise_type || block.set_type;
            return {
              id: exercise.id,
              exercise_id: exercise.exercise_id,
              order_index: exercise.exercise_order ?? idx,
              sets:
                exercise.sets !== null && exercise.sets !== undefined
                  ? exercise.sets
                  : block.total_sets !== null && block.total_sets !== undefined
                    ? block.total_sets
                    : undefined,
              reps: exercise.reps ?? block.reps_per_set ?? "",
              rest_seconds: exercise.rest_seconds ?? block.rest_seconds ?? 60,
              load_percentage: (exercise as any).load_percentage ?? undefined,
              notes: exercise.notes ?? "",
              exercise_type: exerciseType,
              meta,
              exercise: exercise.exercise,
              completed_sets: 0,
              current_set: 0,
            } as TemplateExercise;
          });
        })
        .sort((a, b) => a.order_index - b.order_index);

      if (isStale()) return;
      setAssignment(combinedAssignment);
      setExercises(exercisesWithDetails);

      try {
        const idSet = new Set<string>();
        for (const ex of exercisesWithDetails as any[]) {
          const m = ex.meta || {};
          if (m.superset_exercise_id) idSet.add(m.superset_exercise_id);
          if (m.compound_exercise_id) idSet.add(m.compound_exercise_id);
          if (Array.isArray(m.giant_set_exercises)) {
            for (const gi of m.giant_set_exercises) {
              if (gi?.exercise_id) idSet.add(gi.exercise_id);
            }
          }
          if (Array.isArray(m.circuit_sets)) {
            for (const cs of m.circuit_sets) {
              if (Array.isArray(cs.exercises)) {
                for (const cse of cs.exercises) {
                  if (cse?.exercise_id) idSet.add(cse.exercise_id);
                }
              }
            }
          }
          if (Array.isArray(m.tabata_sets)) {
            for (const ts of m.tabata_sets) {
              if (Array.isArray(ts.exercises)) {
                for (const tse of ts.exercises) {
                  if (tse?.exercise_id) idSet.add(tse.exercise_id);
                }
              }
            }
          }
        }
        if (idSet.size > 0) {
          const ids = Array.from(idSet);
          const { data: extras } = await supabase
            .from("exercises")
            .select("id, name, video_url")
            .in("id", ids);
          const map: Record<string, { name: string; video_url?: string }> = {};
          for (const e of extras || []) {
            map[e.id] = { name: e.name, video_url: (e as any).video_url };
          }
          setExerciseLookup(map);
        }
      } catch (lookupError) {
        console.warn("Unable to build exercise lookup map", lookupError);
      }

      if (workoutBlocksConverted.length > 0) {
        setUseBlockSystem(true);

        // ========================================================================
        // WORKOUT SESSION RESUMPTION LOGIC
        // ========================================================================

        // 1. Resolve actual workout_assignment_id (handles program assignments)
        const actualWorkoutAssignmentId = await resolveWorkoutAssignmentId(
          assignment?.id || assignmentId,
          user.id,
        );

        let restoredProgress: {
          currentBlockIndex: number;
          workoutBlocksWithProgress: LiveWorkoutBlock[];
          workoutStartTime: number;
        } | null = null;

        if (actualWorkoutAssignmentId) {
          // 2. Close incomplete logs from previous days (before session RPC)
          await closeIncompleteLogsFromPreviousDays(
            actualWorkoutAssignmentId,
            user.id,
          );

          // 3. Single RPC for all session/log/progress data (replaces 20+ queries)
          let sessionData: {
            session?: { id: string; status: string; started_at?: string; assignment_id?: string; program_assignment_id?: string; program_schedule_id?: string } | null;
            activeLog?: { id: string; started_at?: string; workout_session_id?: string; program_assignment_id?: string; program_schedule_id?: string } | null;
            setLogs?: any[];
            blockCompletions?: { workout_set_entry_id: string }[];
            dayCompletions?: string[];
            coachId?: string | null;
          } = {};
          try {
            const { data: rpcSession, error: rpcSessionError } = await supabase.rpc(
              "get_workout_session_data",
              { p_client_id: user.id, p_assignment_id: actualWorkoutAssignmentId },
            );
            if (!rpcSessionError && rpcSession) sessionData = rpcSession as typeof sessionData;
          } catch (e) {
            console.warn("⚠️ get_workout_session_data RPC failed (fallback to per-query):", e);
          }

          // Guard: if this program slot is already in dayCompletions, redirect
          const scheduleId = sessionData.activeLog?.program_schedule_id;
          const dayCompletions = Array.isArray(sessionData.dayCompletions) ? sessionData.dayCompletions : [];
          if (scheduleId && dayCompletions.includes(scheduleId)) {
            addToast({
              title: "Workout Already Completed",
              description: "This workout has already been completed. Returning to training.",
              variant: "default",
            });
            router.push("/client/train");
            return;
          }

          const activeLog = sessionData.activeLog
            ? {
                id: sessionData.activeLog.id,
                started_at: sessionData.activeLog.started_at ?? null,
                workout_session_id: sessionData.activeLog.workout_session_id ?? null,
              }
            : await findActiveWorkoutLogForToday(actualWorkoutAssignmentId, user.id);

          if (activeLog) {
            console.log(
              "🔄 Resuming workout session from:",
              activeLog.started_at,
            );

            // 4. Restore progress (use pre-fetched setLogs/blockCompletions when from RPC)
            const prefetched =
              sessionData.setLogs != null && sessionData.blockCompletions != null
                ? {
                    setLogs: sessionData.setLogs,
                    blockCompletions: sessionData.blockCompletions,
                    startedAt: activeLog.started_at,
                  }
                : undefined;
            restoredProgress = await restoreWorkoutProgress(
              activeLog.id,
              workoutBlocksConverted,
              user.id,
              prefetched,
            );

            if (restoredProgress) {
              if (isStale()) return;
              // Set restored workout start time
              setWorkoutStartTime(restoredProgress.workoutStartTime);

              // Set restored blocks with progress
              const progress = restoredProgress;
              setWorkoutBlocks(progress.workoutBlocksWithProgress);
              setContentReady(true);
              // Seed parent-owned logged sets so they persist when navigating blocks
              setLoggedSetsByBlockId((prev) => {
                const next = { ...prev };
                progress.workoutBlocksWithProgress.forEach((b) => {
                  const id = b.block?.id;
                  if (id && b.existingSetLogs?.length)
                    next[id] = b.existingSetLogs;
                });
                return next;
              });
              // Only show completion when ALL blocks are complete
              setIsLastBlockComplete(
                progress.workoutBlocksWithProgress.every(
                  (block) => block.isCompleted,
                ),
              );

              // Set restored current block index
              setCurrentBlockIndex(progress.currentBlockIndex);

              // Store workout_log_id so we know we have an active session
              setWorkoutLogId(activeLog.id);

              // M2 Fix: Use the actual workout_session_id from the log if available
              // This ensures workout_sessions.status gets updated on completion
              if (
                activeLog.workout_session_id &&
                isValidUuid(activeLog.workout_session_id)
              ) {
                setSessionId(activeLog.workout_session_id);
                console.log(
                  "✅ Using existing workout_session_id:",
                  activeLog.workout_session_id,
                );
              } else {
                // Fallback for logs created before M2 (no workout_session_id)
                setSessionId(`restored-${activeLog.id}`);
                console.log(
                  "⚠️ No workout_session_id found, using fallback:",
                  `restored-${activeLog.id}`,
                );
              }

              console.log("✅ Workout session restored successfully:", {
                workoutLogId: activeLog.id,
                workoutSessionId: activeLog.workout_session_id,
                currentBlockIndex: restoredProgress.currentBlockIndex,
                startedAt: new Date(
                  restoredProgress.workoutStartTime,
                ).toISOString(),
              });

              // Show notification that session was resumed
              addToast({
                title: "Workout Resumed",
                description: "Continuing from where you left off",
                variant: "default",
                duration: 3000,
              });
            }
          } else {
            console.log(
              "ℹ️ No active workout session found for today - starting fresh",
            );
          }
        } else {
          console.log(
            "ℹ️ Could not resolve workout_assignment_id - starting fresh",
          );
        }

        // If no progress was restored, initialize blocks normally
        if (!restoredProgress) {
          if (isStale()) return;
          const liveBlocks: LiveWorkoutBlock[] = workoutBlocksConverted.map(
            (block) => ({
              block,
              currentExerciseIndex: 0,
              currentSetIndex: 0,
              isCompleted: false,
              completedSets: 0,
              totalSets:
                block.total_sets ||
                (block.exercises && block.exercises[0]?.sets) ||
                1,
              existingSetLogs: [],
            }),
          );
          setWorkoutBlocks(liveBlocks);
          setContentReady(true);
        }

        // Fetch e1RMs for all exercises in blocks
        const allExerciseIds = workoutBlocksConverted
          .flatMap((block) => block.exercises || [])
          .map((ex) => ex.exercise_id)
          .filter((id): id is string => !!id);

        if (allExerciseIds.length > 0) {
          fetchE1RMs(allExerciseIds, supabase).then((e1rmData) => {
            setE1rmMap(e1rmData);
          });
          // Fetch last-session weight (earliest set in most recent session) per exercise for default
          const { fetchLastSessionWeightForExercise } =
            await import("@/lib/weightDefaultService");
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            const lastWeights: Record<string, number> = {};
            await Promise.all(
              allExerciseIds.map(async (exerciseId) => {
                const w = await fetchLastSessionWeightForExercise(
                  supabase,
                  user.id,
                  exerciseId,
                );
                if (w != null && w > 0) lastWeights[exerciseId] = w;
              }),
            );
            setLastSessionWeightByExerciseId((prev) => ({
              ...prev,
              ...lastWeights,
            }));
          }
        }

        // Load progression suggestions if workout is part of a program
        loadProgressionSuggestions(
          assignmentId,
          workoutBlocksConverted,
          exerciseMeta,
        );
      } else {
        if (!isStale()) {
          setUseBlockSystem(false);
          setContentReady(true);
        }
      }
    } catch (dbError) {
      console.error("Error loading workout assignment:", dbError);
      if (!isStale()) setContentReady(true);
      addToast({
        title: "Error Loading Workout",
        description:
          "Failed to load workout. Please try again or contact your coach.",
        variant: "destructive",
      });
      // Don't set fake data - show error message instead
      return;
    } finally {
      clearTimeout(safetyTimeout);
      if (!isStale()) {
        setLoading(false);
        setLoadingStartedAt(null);
      }
      loadInProgressRef.current = false;
    }
  };

  // Load progression suggestions for exercises in the workout
  const loadProgressionSuggestions = async (
    workoutAssignmentId: string,
    blocks: WorkoutBlock[],
    exerciseMeta: Map<
      string,
      {
        name: string;
        description: string;
        image_url?: string | null;
        video_url?: string | null;
      }
    >,
  ) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      let programAssignmentId: string | null = null;

      // program_day_assignments bridges workout_assignment_id → program_assignment_id
      const { data: dayAssignment } = await supabase
        .from("program_day_assignments")
        .select("program_assignment_id")
        .eq("workout_assignment_id", workoutAssignmentId)
        .maybeSingle();

      if (dayAssignment?.program_assignment_id) {
        programAssignmentId = dayAssignment.program_assignment_id;
        console.log('[loadProgressionSuggestions] found program_assignment_id via program_day_assignments:', programAssignmentId);
      } else {
        // This workout_assignment is not linked to any program (standalone assignment)
        console.log('[loadProgressionSuggestions] standalone workout — no program_assignment_id found, skipping suggestions');
        return;
      }

      // Get current week from canonical programStateService
      const { getProgramState } = await import("@/lib/programStateService");
      const programState = await getProgramState(supabase, user.id);

      if (
        !programState.assignment ||
        programState.isCompleted ||
        !programState.currentWeekNumber
      ) {
        return;
      }

      const currentWeekForProgression = programState.currentWeekNumber;

      // Get program category
      const { data: program } = await supabase
        .from("workout_programs")
        .select("category")
        .eq("id", programState.assignment.program_id)
        .maybeSingle();

      const category = program?.category || undefined;
      const difficulty = "intermediate"; // Default, could be fetched from user profile

      // Collect all exercise IDs and names
      const exerciseIds: string[] = [];
      const exerciseNames = new Map<string, string>();

      blocks.forEach((block) => {
        block.exercises?.forEach((ex) => {
          if (ex.exercise_id) {
            exerciseIds.push(ex.exercise_id);
            const meta = exerciseMeta.get(ex.exercise_id);
            exerciseNames.set(ex.exercise_id, meta?.name || "Exercise");
          }
        });
      });

      if (exerciseIds.length === 0) {
        return;
      }

      // Load progression suggestions
      const { getProgressionSuggestionsForWorkout } =
        await import("@/lib/clientProgressionService");

      const suggestions = await getProgressionSuggestionsForWorkout(
        programAssignmentId,
        currentWeekForProgression,
        exerciseIds,
        exerciseNames,
        category,
        difficulty,
      );

      setProgressionSuggestions(suggestions);
    } catch (error) {
      console.error("Error loading progression suggestions:", error);
      // Silently fail - progression suggestions are optional
    }
  };

  const startWorkout = async () => {
    // Create or reuse workout session
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        try {
          // M2 Fix: First check for existing in_progress session for this assignment
          // This prevents creating orphan sessions when resuming workouts
          const { data: existingSession, error: existingError } = await supabase
            .from("workout_sessions")
            .select("id, status, current_block_index, current_exercise_index")
            .eq("assignment_id", assignmentId)
            .eq("client_id", user.id)
            .eq("status", "in_progress")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (existingSession && !existingError) {
            // Reuse existing session
            setSessionId(existingSession.id);
            console.log(
              "✅ Reusing existing workout session:",
              existingSession.id,
            );
            return;
          }

          // No existing session found, create a new one
          const { data, error } = await supabase
            .from("workout_sessions")
            .insert({
              assignment_id: assignmentId,
              client_id: user.id,
              status: "in_progress",
              // Initialize progress tracking columns (M2 Live Dashboard support)
              current_block_index: 0,
              current_exercise_index: 0,
              last_activity_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (error) throw error;
          setSessionId(data.id);
          console.log("✅ Created new workout session:", data.id);
        } catch (dbError) {
          console.log("Database not ready, using localStorage fallback");
          setSessionId(Date.now().toString());
        }
      }
    } catch (error) {
      console.error("Error creating workout session:", error);
    }
  };

  const completeDropSet = async () => {
    const currentExercise = exercises[currentExerciseIndex];
    const workingWeightNum = parseFloat(dropWorkingWeight);
    const dropWeightNum = parseFloat(dropWeight);

    if (
      !currentExercise ||
      workingWeightNum <= 0 ||
      dropWeightNum <= 0 ||
      isLoggingSet
    ) {
      return;
    }

    setIsLoggingSet(true);
    setShowSuccessAnimation(true);

    try {
      if ("vibrate" in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
    } catch (e) {}

    const setReps =
      Number(currentExercise?.meta?.drop_set_reps) ||
      Number(currentExercise?.drop_set_reps) ||
      Number(currentExercise?.reps) ||
      0;
    const dropReps =
      Number(currentExercise?.meta?.dropset_reps) ||
      Number(currentExercise?.dropset_reps) ||
      0;

    // Track total weight lifted
    const setWeight = workingWeightNum * setReps + dropWeightNum * dropReps;
    setTotalWeightLifted((prev) => prev + setWeight);

    // BACKGROUND DATABASE SAVE
    try {
      // Get user ID
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Log the working set
      const response1 = await fetchApi("/api/log-set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workout_log_id: undefined, // API will create if needed
          set_entry_id: currentExercise.set_entry_id,
          exercise_id:
            currentExercise.exercise_id || currentExercise.exercise?.id,
          weight: workingWeightNum,
          reps: setReps,
          client_id: user.id,
          session_id: sessionId,
          template_exercise_id: currentExercise.id,
        }),
      });

      if (!response1.ok) {
        const error = await response1.json();
        throw new Error(error.error || "Failed to log working set");
      }

      const result1 = await response1.json();

      // Show PR notification if needed for working set
      if (result1.e1rm?.is_new_pr) {
        addToast({
          title: "New Personal Record! 🎉",
          description: `e1RM: ${result1.e1rm.stored.toFixed(2)}kg`,
          variant: "success",
          duration: 3000,
        });
      }

      // Log the drop set (weight >= 0 allows bodyweight exercises)
      if (dropWeightNum >= 0 && dropReps > 0) {
        const response2 = await fetchApi("/api/log-set", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workout_log_id: undefined, // API will create if needed
            set_entry_id: currentExercise.set_entry_id,
            exercise_id:
              currentExercise.exercise_id || currentExercise.exercise?.id,
            weight: dropWeightNum,
            reps: dropReps,
            client_id: user.id,
            session_id: sessionId,
            template_exercise_id: currentExercise.id,
          }),
        });

        if (!response2.ok) {
          const error = await response2.json();
          throw new Error(error.error || "Failed to log drop set");
        }

        const result2 = await response2.json();

        // Show PR notification if needed for drop set
        if (result2.e1rm?.is_new_pr) {
          addToast({
            title: "New Personal Record! 🎉",
            description: `e1RM: ${result2.e1rm.stored.toFixed(2)}kg`,
            variant: "success",
            duration: 3000,
          });
        }
      }

      addToast({
        title: "Drop Set Logged!",
        description: `${workingWeightNum}kg → ${dropWeightNum}kg saved`,
        variant: "success",
        duration: 2000,
      });
    } catch (error) {
      console.error("Error logging drop set:", error);
      addToast({
        title: "Failed to Save",
        description: "Please check your connection and try again",
        variant: "destructive",
        duration: 5000,
      });
    }

    // Reset drop set state
    setDropWorkingWeight("");
    setDropWeight("");
    setDropManualOverride(false);

    // Move to next exercise/set
    const updatedExercises = [...exercises];
    const currentExerciseUpdated = updatedExercises[currentExerciseIndex];

    if (currentExerciseUpdated) {
      currentExerciseUpdated.completed_sets =
        (currentExerciseUpdated.completed_sets || 0) + 1;
    }
    setExercises(updatedExercises);

    const isExerciseComplete =
      currentExerciseUpdated &&
      (currentExerciseUpdated.completed_sets || 0) >=
        currentExerciseUpdated.sets;
    const isWorkoutComplete =
      isExerciseComplete && currentExerciseIndex === exercises.length - 1;

    if (isWorkoutComplete) {
      setIsLoggingSet(false);
      const totalSets = exercises.reduce(
        (sum, ex) => sum + (ex.completed_sets || 0),
        0,
      );
      const exercisesCompleted = exercises.filter(
        (ex) => (ex.completed_sets || 0) >= ex.sets,
      ).length;

      setWorkoutStats({
        totalTime: Math.floor((Date.now() - workoutStartTime) / 1000 / 60),
        exercisesCompleted,
        totalSets,
        personalBests: 0,
        totalWeightLifted,
        weightComparison: `${totalWeightLifted.toLocaleString()} kg`,
      });

      setShowWorkoutCompletion(true);
      return;
    }

    // Last set of this exercise — skip rest timer, go to next exercise
    if (isExerciseComplete) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setCurrentSet(1);
      setIsLoggingSet(false);
      return;
    }

    setRestTime(currentExercise.rest_seconds || 60);
    setShowRestTimer(true);
    setIsLoggingSet(false);
  };

  const completeSuperset = async () => {
    const currentExercise = exercises[currentExerciseIndex];
    const weightA = parseFloat(supersetAWeight);
    const repsA = parseInt(supersetAReps);
    const weightB = parseFloat(supersetBWeight);
    const repsB = parseInt(supersetBReps);

    if (
      !currentExercise ||
      weightA <= 0 ||
      repsA <= 0 ||
      weightB <= 0 ||
      repsB <= 0 ||
      isLoggingSet
    ) {
      return;
    }

    setIsLoggingSet(true);

    // Show success animation and add haptic feedback
    setShowSuccessAnimation(true);

    try {
      if ("vibrate" in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
    } catch (e) {}

    // Track total weight lifted
    const setWeight = weightA * repsA + weightB * repsB;
    setTotalWeightLifted((prev) => prev + setWeight);

    // BACKGROUND DATABASE SAVE - Log both exercises
    try {
      // Get user ID
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Log first exercise (Exercise A) - weight >= 0 allows bodyweight exercises
      if (currentExercise.exercise_id && weightA >= 0 && repsA > 0) {
        const responseA = await fetchApi("/api/log-set", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workout_log_id: undefined, // API will create if needed
            set_entry_id: currentExercise.set_entry_id,
            exercise_id: currentExercise.exercise_id,
            weight: weightA,
            reps: repsA,
            client_id: user.id,
            session_id: sessionId,
            template_exercise_id: currentExercise.id,
          }),
        });

        if (responseA.ok) {
          const resultA = await responseA.json();
          if (resultA.success && resultA.e1rm) {
            setE1rmMap((prev) => ({
              ...prev,
              [currentExercise.exercise_id]: resultA.e1rm.calculated,
            }));

            // Show PR notification if needed
            if (resultA.e1rm.is_new_pr) {
              addToast({
                title: "New Personal Record! 🎉",
                description: `e1RM: ${resultA.e1rm.stored.toFixed(2)}kg`,
                variant: "success",
                duration: 3000,
              });
            }
          }
        }
      }

      // Log second exercise (Exercise B)
      const exerciseBId =
        currentExercise.meta?.superset_exercise_id ||
        currentExercise.superset_exercise_id;
      if (exerciseBId && weightB >= 0 && repsB > 0) {
        const responseB = await fetchApi("/api/log-set", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workout_log_id: undefined, // API will create if needed
            set_entry_id: currentExercise.set_entry_id,
            exercise_id: exerciseBId,
            weight: weightB,
            reps: repsB,
            client_id: user.id,
            session_id: sessionId,
            template_exercise_id: currentExercise.id,
          }),
        });

        if (responseB.ok) {
          const resultB = await responseB.json();
          if (resultB.success && resultB.e1rm) {
            setE1rmMap((prev) => ({
              ...prev,
              [String(exerciseBId)]: resultB.e1rm.calculated,
            }));

            // Show PR notification if needed
            if (resultB.e1rm.is_new_pr) {
              addToast({
                title: "New Personal Record! 🎉",
                description: `e1RM: ${resultB.e1rm.stored.toFixed(2)}kg`,
                variant: "success",
                duration: 3000,
              });
            }
          }
        }
      }

      addToast({
        title: "Superset Logged!",
        description: `Both exercises saved`,
        variant: "success",
        duration: 2000,
      });
    } catch (error) {
      console.error("Error logging superset:", error);
      addToast({
        title: "Failed to Save",
        description: "Please check your connection and try again",
        variant: "destructive",
        duration: 5000,
      });
    }

    // Reset superset state
    setSupersetAWeight("");
    setSupersetAReps("");
    setSupersetBWeight("");
    setSupersetBReps("");

    // Move to next exercise/set
    const updatedExercises = [...exercises];
    const currentExerciseUpdated = updatedExercises[currentExerciseIndex];

    if (currentExerciseUpdated) {
      currentExerciseUpdated.completed_sets =
        (currentExerciseUpdated.completed_sets || 0) + 1;
    }
    setExercises(updatedExercises);

    const isExerciseComplete =
      currentExerciseUpdated &&
      (currentExerciseUpdated.completed_sets || 0) >=
        currentExerciseUpdated.sets;
    const isWorkoutComplete =
      isExerciseComplete && currentExerciseIndex === exercises.length - 1;

    if (isWorkoutComplete) {
      setIsLoggingSet(false);
      const totalSets = exercises.reduce(
        (sum, ex) => sum + (ex.completed_sets || 0),
        0,
      );
      const exercisesCompleted = exercises.filter(
        (ex) => (ex.completed_sets || 0) >= ex.sets,
      ).length;

      setWorkoutStats({
        totalTime: Math.floor((Date.now() - workoutStartTime) / 1000 / 60),
        exercisesCompleted,
        totalSets,
        personalBests: 0,
        totalWeightLifted,
        weightComparison: `${totalWeightLifted.toLocaleString()} kg`,
      });

      setShowWorkoutCompletion(true);
      return;
    }

    // Last set of this exercise — skip rest timer, go to next exercise
    if (isExerciseComplete) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setCurrentSet(1);
      setIsLoggingSet(false);
      return;
    }

    // Start rest timer
    setRestTime(currentExercise.rest_seconds || 60);
    setShowRestTimer(true);
    setIsLoggingSet(false);
  };

  const completeAmrapSet = async () => {
    const currentExercise = exercises[currentExerciseIndex];
    const weightNum = parseFloat(amrapWeight);
    const repsNum = parseInt(amrapReps);

    if (!currentExercise || weightNum <= 0 || repsNum <= 0 || isLoggingSet) {
      return;
    }

    setIsLoggingSet(true);

    // Show success animation and add haptic feedback
    setShowSuccessAnimation(true);

    try {
      if ("vibrate" in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
    } catch (e) {}

    // Track total weight lifted
    const setWeight = weightNum * repsNum;
    setTotalWeightLifted((prev) => prev + setWeight);

    // BACKGROUND DATABASE SAVE
    try {
      // Get user ID
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Call /api/log-set endpoint (handles both logging and e1RM calculation)
      // weight >= 0 allows bodyweight exercises
      if (currentExercise.exercise_id && weightNum >= 0 && repsNum > 0) {
        const response = await fetchApi("/api/log-set", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workout_log_id: undefined, // API will create if needed
            set_entry_id: currentExercise.set_entry_id,
            exercise_id: currentExercise.exercise_id,
            weight: weightNum,
            reps: repsNum,
            client_id: user.id,
            session_id: sessionId,
            template_exercise_id: currentExercise.id,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to log set");
        }

        const result = await response.json();
        if (result.success && result.e1rm) {
          setE1rmMap((prev) => ({
            ...prev,
            [currentExercise.exercise_id]: result.e1rm.calculated,
          }));

          // Show PR notification if needed
          if (result.e1rm.is_new_pr) {
            addToast({
              title: "New Personal Record! 🎉",
              description: `e1RM: ${result.e1rm.stored.toFixed(2)}kg`,
              variant: "success",
              duration: 3000,
            });
          }
        }
      }

      addToast({
        title: "AMRAP Logged!",
        description: `${weightNum}kg × ${repsNum} reps saved`,
        variant: "success",
        duration: 2000,
      });
    } catch (error) {
      console.error("Error logging AMRAP:", error);
      addToast({
        title: "Failed to Save",
        description: "Please check your connection and try again",
        variant: "destructive",
        duration: 5000,
      });
    }

    // Reset AMRAP state
    setAmrapWeight("");
    setAmrapReps("");
    setAmrapActive(false);
    setAmrapTimeLeft(0);

    // Move to next exercise/set
    const updatedExercises = [...exercises];
    const currentExerciseUpdated = updatedExercises[currentExerciseIndex];

    if (currentExerciseUpdated) {
      currentExerciseUpdated.completed_sets =
        (currentExerciseUpdated.completed_sets || 0) + 1;
    }
    setExercises(updatedExercises);

    const isExerciseComplete =
      currentExerciseUpdated &&
      (currentExerciseUpdated.completed_sets || 0) >=
        currentExerciseUpdated.sets;
    const isWorkoutComplete =
      isExerciseComplete && currentExerciseIndex === exercises.length - 1;

    if (isWorkoutComplete) {
      setIsLoggingSet(false);
      const totalSets = exercises.reduce(
        (sum, ex) => sum + (ex.completed_sets || 0),
        0,
      );
      const exercisesCompleted = exercises.filter(
        (ex) => (ex.completed_sets || 0) >= ex.sets,
      ).length;

      setWorkoutStats({
        totalTime: Math.floor((Date.now() - workoutStartTime) / 1000 / 60),
        exercisesCompleted,
        totalSets,
        personalBests: 0,
        totalWeightLifted,
        weightComparison: `${totalWeightLifted.toLocaleString()} kg`,
      });

      setShowWorkoutCompletion(true);
      return;
    }

    // Last set of this exercise — skip rest timer, go to next exercise
    if (isExerciseComplete) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setCurrentSet(1);
      setIsLoggingSet(false);
      return;
    }

    // Start rest timer
    setRestTime(currentExercise.rest_seconds || 60);
    setShowRestTimer(true);
    setIsLoggingSet(false);
  };

  const completeSet = async () => {
    const currentExercise = exercises[currentExerciseIndex];
    if (
      !currentExercise ||
      currentSetData.weight <= 0 ||
      currentSetData.reps <= 0 ||
      isLoggingSet
    ) {
      return;
    }

    setIsLoggingSet(true);

    // Show success animation and add haptic feedback
    setShowSuccessAnimation(true);

    // Add haptic feedback for success
    try {
      if ("vibrate" in navigator) {
        navigator.vibrate([100, 50, 100]); // Success vibration pattern
      }
    } catch (e) {
      // Ignore haptic feedback errors
    }

    // OPTIMISTIC UI UPDATE - Show checkmark immediately
    const updatedExercises = [...exercises];
    const currentExerciseUpdated = updatedExercises[currentExerciseIndex];

    if (currentExerciseUpdated) {
      currentExerciseUpdated.completed_sets =
        (currentExerciseUpdated.completed_sets || 0) + 1;
    }

    setExercises(updatedExercises);

    // Track total weight lifted
    const setWeight = currentSetData.weight * currentSetData.reps;
    setTotalWeightLifted((prev) => prev + setWeight);

    // Determine if we need rest timer or if workout is complete
    const isExerciseComplete =
      currentExerciseUpdated &&
      (currentExerciseUpdated.completed_sets || 0) >=
        currentExerciseUpdated.sets;
    const isWorkoutComplete =
      isExerciseComplete && currentExerciseIndex === exercises.length - 1;

    if (isWorkoutComplete) {
      setIsLoggingSet(false);
      // Calculate workout stats
      const totalSets = exercises.reduce(
        (sum, ex) => sum + (ex.completed_sets || 0),
        0,
      );
      const exercisesCompleted = exercises.filter(
        (ex) => (ex.completed_sets || 0) >= ex.sets,
      ).length;

      setWorkoutStats({
        totalTime: Math.floor((Date.now() - workoutStartTime) / 1000 / 60), // minutes
        exercisesCompleted,
        totalSets,
        personalBests: 0, // TODO: Calculate from previous performances
        totalWeightLifted,
        weightComparison: `${totalWeightLifted.toLocaleString()} kg`,
      });

      setShowWorkoutCompletion(true);
      return;
    }

    // Save weight and reps before resetting (used for DB save in both branches)
    const loggedWeight = currentSetData.weight;
    const loggedReps = currentSetData.reps;

    // Last set of this exercise — skip rest timer, go to next exercise
    if (isExerciseComplete) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setCurrentSet(1);
      setIsLoggingSet(false);
      setCurrentSetData({ weight: 0, reps: 0 });
    } else {
      // More sets in this exercise — show rest timer
      setRestTime(currentExercise.rest_seconds || 60);
      setShowRestTimer(true);
      setCurrentSetData({ weight: 0, reps: 0 });
    }

    // BACKGROUND DATABASE SAVE
    try {
      // Get user ID
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Call /api/log-set endpoint (handles both logging and e1RM calculation)
      // weight >= 0 allows bodyweight exercises
      if (currentExercise.exercise_id && loggedWeight >= 0 && loggedReps > 0) {
        // Build notes for for_time completion
        let notes = "";
        if (currentType === "for_time" && forTimeCompletionSecs != null) {
          notes = `for_time_completion_secs=${forTimeCompletionSecs}`;
        }

        const response = await fetchApi("/api/log-set", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            workout_log_id: undefined, // API will create if needed
            set_entry_id: currentExercise.set_entry_id,
            exercise_id: currentExercise.exercise_id,
            weight: loggedWeight,
            reps: loggedReps,
            client_id: user.id,
            session_id: sessionId,
            template_exercise_id: currentExercise.id,
            notes: notes || undefined,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to log set");
        }

        const result = await response.json();
        if (result.success && result.e1rm) {
          // Update e1RM map with new value
          setE1rmMap((prev) => ({
            ...prev,
            [currentExercise.exercise_id]: result.e1rm.calculated,
          }));

          // Show PR notification if needed
          if (result.e1rm.is_new_pr) {
            addToast({
              title: "New Personal Record! 🎉",
              description: `e1RM: ${result.e1rm.stored.toFixed(2)}kg`,
              variant: "success",
              duration: 3000,
            });
          }
        }
      }

      // Reset for_time state after logging
      if (currentType === "for_time") {
        setForTimeStopped(false);
        setForTimeCompletionSecs(null);
      }

      addToast({
        title: "Set Logged!",
        description: `${loggedWeight}kg × ${loggedReps} reps saved`,
        variant: "success",
        duration: 2000,
      });
    } catch (error) {
      console.error("Error logging set:", error);
      addToast({
        title: "Failed to Save Set",
        description: "Please check your connection and try again",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoggingSet(false);

      // Hide success animation after delay
      setTimeout(() => {
        setShowSuccessAnimation(false);
      }, 1500);
    }
  };

  // Giant Set: log all sub-exercises together
  const completeGiantSet = async () => {
    const current = exercises[currentExerciseIndex];
    if (!current || isLoggingSet) return;
    setIsLoggingSet(true);

    // Sum weight x reps across items
    let sumWeight = 0;
    for (let i = 0; i < Math.max(giantWeights.length, giantReps.length); i++) {
      const w = parseFloat(giantWeights[i] || "0") || 0;
      const r = parseInt(giantReps[i] || "0") || 0;
      sumWeight += w * r;
    }

    // Optimistic UI: increment completed sets and total weight lifted
    const updatedExercises = [...exercises];
    const updated = updatedExercises[currentExerciseIndex];
    if (updated) {
      updated.completed_sets = (updated.completed_sets || 0) + 1;
    }
    setExercises(updatedExercises);
    setTotalWeightLifted((prev) => prev + sumWeight);

    const isExerciseComplete =
      updated && (updated.completed_sets || 0) >= updated.sets;
    const isWorkoutComplete =
      isExerciseComplete && currentExerciseIndex === exercises.length - 1;

    if (isWorkoutComplete) {
      setIsLoggingSet(false);
      const totalSets = exercises.reduce(
        (sum, ex) => sum + (ex.completed_sets || 0),
        0,
      );
      const exercisesCompleted = exercises.filter(
        (ex) => (ex.completed_sets || 0) >= ex.sets,
      ).length;
      setWorkoutStats({
        totalTime: Math.floor((Date.now() - workoutStartTime) / 1000 / 60),
        exercisesCompleted,
        totalSets,
        personalBests: 0,
        totalWeightLifted,
        weightComparison: `${totalWeightLifted.toLocaleString()} kg`,
      });
      setShowWorkoutCompletion(true);
      return;
    }

    // Last set of this exercise — skip rest timer, go to next exercise
    if (isExerciseComplete) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setCurrentSet(1);
      setIsLoggingSet(false);
      // Background save continues below
    } else {
      // Start rest timer
      setRestTime(current.rest_seconds || 60);
      setShowRestTimer(true);
    }

    // Background save - Log each exercise in the giant set individually
    try {
      // Get user ID
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Get giant set exercises
      const giantSetExercises: any[] = (current?.meta?.giant_set_exercises ||
        current?.giant_set_exercises ||
        []) as any[];

      // Log each exercise individually
      for (
        let i = 0;
        i < Math.max(giantWeights.length, giantReps.length);
        i++
      ) {
        const weight = parseFloat(giantWeights[i] || "0") || 0;
        const reps = parseInt(giantReps[i] || "0") || 0;
        const exerciseItem = giantSetExercises[i];
        const exerciseId = exerciseItem?.exercise_id;

        // Only log if we have valid data (weight >= 0 allows bodyweight exercises)
        if (exerciseId && weight >= 0 && reps > 0) {
          const response = await fetchApi("/api/log-set", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              workout_log_id: undefined, // API will create if needed
              set_entry_id: current.set_entry_id,
              exercise_id: exerciseId,
              weight: weight,
              reps: reps,
              client_id: user.id,
              session_id: sessionId,
              template_exercise_id: current.id,
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            console.error(`Error logging giant set exercise ${i + 1}:`, error);
            // Continue with other exercises even if one fails
          } else {
            const result = await response.json();
            // Show PR notification if needed
            if (result.e1rm?.is_new_pr) {
              addToast({
                title: "New Personal Record! 🎉",
                description: `e1RM: ${result.e1rm.stored.toFixed(2)}kg`,
                variant: "success",
                duration: 3000,
              });
            }
          }
        }
      }

      addToast({
        title: "Giant Set Logged!",
        description: "All entries saved",
        variant: "success",
        duration: 2000,
      });
    } catch (error) {
      console.error("Error logging giant set:", error);
      addToast({
        title: "Failed to Save",
        description: "Please try again",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoggingSet(false);
      setTimeout(() => setShowSuccessAnimation(false), 1500);
    }
  };

  const handleRestTimerComplete = () => {
    setShowRestTimer(false);

    // Advance to next set or exercise
    const currentExercise = exercises[currentExerciseIndex];
    const isExerciseComplete =
      currentExercise &&
      (currentExercise.completed_sets || 0) >= currentExercise.sets;

    if (isExerciseComplete && currentExerciseIndex < exercises.length - 1) {
      // Move to next exercise
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setCurrentSet(1);
    } else {
      // More sets in current exercise
      setCurrentSet(currentSet + 1);
    }
  };

  const handleRestTimerSkip = () => {
    setShowRestTimer(false);
    handleRestTimerComplete();
  };

  const getVideoId = (url: string) => {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const getEmbedUrl = (url: string) => {
    const videoId = getVideoId(url);
    return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
  };

  const openVideoModal = (videoUrl: string) => {
    setCurrentVideoUrl(videoUrl);
    setShowVideoModal(true);
  };

  const closeVideoModal = () => {
    setShowVideoModal(false);
    setCurrentVideoUrl("");
  };

  const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    );

  const completeWorkout = async () => {
    // Double-submit guard: prevent concurrent runs (inside function, not only button)
    if (isCompletingWorkoutRef.current) return;
    isCompletingWorkoutRef.current = true;
    completionStartedAtRef.current = Date.now();
    setIsCompletingWorkout(true);

    const completeTargetId = assignment?.id || assignmentId;

    // Safety net: if navigation hasn't left this page after 15s, reset and let user retry
    const spinnerTimeout = setTimeout(() => {
      addToast({
        title: "Navigation is taking longer than expected",
        description: "Tap the button again to retry.",
        variant: "destructive",
      });
      isCompletingWorkoutRef.current = false;
      setIsCompletingWorkout(false);
    }, 15000);

    try {
      console.log("[COMPLETE-FLOW] button clicked");
      console.log("[COMPLETE-FLOW] current state", {
        workoutLogId,
        sessionId,
        assignmentId,
        completeTargetId: assignment?.id || assignmentId,
        isCompleting: isCompletingWorkoutRef.current,
      });

      const {
        data: { session },
      } = await supabase.auth.getSession();
      console.log("[COMPLETE-FLOW] auth session", {
        hasSession: !!session,
        expiresAt: session?.expires_at,
        isExpired: session ? Date.now() / 1000 > (session.expires_at ?? 0) : "no session",
      });

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.error("❌ User not authenticated");
        addToast({
          title: "Could not complete workout",
          description: "Please sign in again.",
          variant: "destructive",
        });
        return;
      }

      // Calculate simple duration: from when workout screen opened to now
      const endTime = Date.now();
      const durationMs = endTime - workoutStartTime;
      const durationMinutes = Math.round(durationMs / 1000 / 60);

      console.log("🕐 [Simple Duration] Calculated:", {
        workoutStartTime,
        endTime,
        durationMs,
        durationSeconds: Math.floor(durationMs / 1000),
        durationMinutes,
      });

      // Pass completion handoff via URL params (primary) so navigation works after tab switch.
      // Also write to localStorage as fallback for backward compatibility.
      const logIdForComplete =
        workoutLogId ||
        (sessionId?.startsWith("restored-") ? sessionId.replace("restored-", "") : null);
      const params = new URLSearchParams();
      if (logIdForComplete) params.set("logId", logIdForComplete);
      if (sessionId && isUuid(sessionId)) params.set("sessionId", sessionId);
      params.set("duration", String(durationMinutes));

      try {
        localStorage.setItem("workoutDurationMinutes", durationMinutes.toString());
        localStorage.setItem("workoutStartTime", workoutStartTime.toString());
        if (logIdForComplete) localStorage.setItem("workoutLogIdForComplete", logIdForComplete);
        if (sessionId && isUuid(sessionId)) {
          localStorage.setItem("workoutSessionIdForComplete", sessionId);
        }
      } catch (storageError) {
        console.warn(
          "⚠️ Unable to write workout data to localStorage",
          storageError,
        );
      }

      // Use full page navigation so it works after tab switch (router.push is dead then).
      console.log("[COMPLETE-FLOW] navigating to complete page");
      window.location.href = `/client/workouts/${completeTargetId}/complete?${params.toString()}`;

      // Update workout session in background — do not await so tab backgrounding doesn't block navigation
      if (sessionId && isUuid(sessionId)) {
        supabase
          .from("workout_sessions")
          .update({
            completed_at: new Date().toISOString(),
            status: "completed",
          })
          .eq("id", sessionId)
          .then(() => {})
          .catch((dbError) => {
            console.warn("⚠️ workout_sessions update failed (non-blocking):", dbError);
          });
      } else if (sessionId) {
        console.warn(
          "⚠️ Skipping workout_sessions update - non-UUID sessionId",
          sessionId,
        );
      }
    } catch (error) {
      console.error("❌ Error in completeWorkout:", error);
      addToast({
        title: "Could not complete workout",
        description: "Check connection and try again.",
        variant: "destructive",
      });
    } finally {
      clearTimeout(spinnerTimeout);
      isCompletingWorkoutRef.current = false;
      completionStartedAtRef.current = null;
      setIsCompletingWorkout(false);
    }
  };

  // When user returns to tab after leaving during "Complete workout", reset button if stuck >20s
  React.useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      if (!isCompletingWorkoutRef.current || !completionStartedAtRef.current) return;
      const elapsed = Date.now() - completionStartedAtRef.current;
      if (elapsed < 20000) return;
      isCompletingWorkoutRef.current = false;
      completionStartedAtRef.current = null;
      setIsCompletingWorkout(false);
      addToast({
        title: "Still here?",
        description: "Tap Complete Workout again to finish, or open the completion link from your history.",
        variant: "destructive",
      });
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  const currentExercise = exercises[currentExerciseIndex];
  const targetReps = currentExercise?.reps || "0";
  const currentType =
    currentExercise?.exercise_type ||
    currentExercise?.meta?.exercise_type ||
    "straight_set";

  // Short, human-friendly instructions per exercise type
  const typeHelp = (() => {
    switch (currentType) {
      case "giant_set":
        return "Perform all exercises back-to-back with minimal rest. Log weights for each, then tap Log Giant Set.";
      case "superset":
        return "Alternate the two exercises with minimal rest. Log both exercises each set.";
      case "pre_exhaustion":
        return "Do the isolation move first to fatigue the muscle, then perform the compound move.";
      case "drop_set":
        return "Work to near-failure at the working weight, then immediately reduce weight and continue.";
      case "cluster_set":
        return "Use short rests within the set. Reps per cluster are fixed; adjust weights as needed.";
      case "tabata":
        return "High-intensity intervals: follow the autoplay timer for work/rest rounds.";
      case "amrap":
        return "As many reps as possible in the time window. Start the timer, then log performance.";
      case "emom":
        return "Every minute on the minute: complete the work at the start of each minute.";
      case "for_time":
        return "Complete the target reps as fast as possible. Start the timer and stop when done.";
      default:
        return "Log weight and reps for each set. Rest as prescribed.";
    }
  })();

  // AMRAP timer state (countdown in seconds)
  const [amrapActive, setAmrapActive] = useState(false);
  const [amrapTimeLeft, setAmrapTimeLeft] = useState(0);
  const [amrapWeight, setAmrapWeight] = useState<string>("");
  const [amrapReps, setAmrapReps] = useState<string>("");
  // EMOM state
  const [emomActive, setEmomActive] = useState(false);
  const [emomPhase, setEmomPhase] = useState<"work" | "rest">("work");
  const [emomPhaseLeft, setEmomPhaseLeft] = useState(0);
  const [emomTotalLeft, setEmomTotalLeft] = useState(0);
  const [emomRepActive, setEmomRepActive] = useState(false);
  const [emomRepTimeLeft, setEmomRepTimeLeft] = useState(0);
  // Tabata state
  const [intervalActive, setIntervalActive] = useState(false);
  const [intervalPhase, setIntervalPhase] = useState<
    "work" | "rest" | "rest_after_set"
  >("work");
  const [intervalPhaseLeft, setIntervalPhaseLeft] = useState(0);
  const [intervalRound, setIntervalRound] = useState(0);
  const [intervalTotalRounds, setIntervalTotalRounds] = useState(0);
  const [intervalMode, setIntervalMode] = useState<"tabata" | null>(null);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [timerExerciseIndex, setTimerExerciseIndex] = useState(0);
  const [timerSetIndex, setTimerSetIndex] = useState(0);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  // Drop set state
  const [dropWorkingWeight, setDropWorkingWeight] = useState<string>("");
  const [dropWeight, setDropWeight] = useState<string>("");
  const [dropReps, setDropReps] = useState<number>(0);
  const [dropManualOverride, setDropManualOverride] = useState(false);
  // Cluster set state
  const [clusterWeights, setClusterWeights] = useState<string[]>([]);
  // Rest-pause state (extra forced mini-sets reps)
  const [restPauseExtraReps, setRestPauseExtraReps] = useState<string[]>([]);
  // For Time state
  const [forTimeActive, setForTimeActive] = useState(false);

  // Previous Performance data (single exercise — for PreviousPerformanceCard display)
  const [previousPerformance, setPreviousPerformance] = useState<{
    lastWorkout: any | null;
    personalBest: any | null;
    loading: boolean;
  }>({
    lastWorkout: null,
    personalBest: null,
    loading: false,
  });
  // Cache of previous performance per exercise (passed to LiveWorkoutBlockExecutor)
  const [previousPerformanceMap, setPreviousPerformanceMap] = useState<Map<string, any>>(new Map());
  const [forTimeTimeLeft, setForTimeTimeLeft] = useState(0);
  const [forTimeCompletionSecs, setForTimeCompletionSecs] = useState<
    number | null
  >(null);
  const [forTimeStopped, setForTimeStopped] = useState(false);
  // Superset/Pre-exhaustion dual inputs
  const [supersetAWeight, setSupersetAWeight] = useState<string>("");
  const [supersetAReps, setSupersetAReps] = useState<string>("");
  const [supersetBWeight, setSupersetBWeight] = useState<string>("");
  const [supersetBReps, setSupersetBReps] = useState<string>("");
  // Giant set per-exercise inputs
  const [giantWeights, setGiantWeights] = useState<string[]>([]);
  const [giantReps, setGiantReps] = useState<string[]>([]);

  useEffect(() => {
    let interval: any;
    if (amrapActive && amrapTimeLeft > 0) {
      interval = setInterval(() => {
        setAmrapTimeLeft((t) => (t > 0 ? t - 1 : 0));
      }, 1000);
    } else if (amrapActive && amrapTimeLeft === 0) {
      // Timer finished: stop and reveal standard form
      setAmrapActive(false);
    }
    return () => interval && clearInterval(interval);
  }, [amrapActive, amrapTimeLeft]);

  // EMOM: time-based alternating work/rest until total duration ends
  useEffect(() => {
    let interval: any;
    if (emomActive && emomTotalLeft > 0) {
      interval = setInterval(() => {
        setEmomTotalLeft((t) => (t > 0 ? t - 1 : 0));
        setEmomPhaseLeft((p) => {
          if (p > 1) return p - 1;
          // phase finished: switch
          const workSeconds =
            Number(currentExercise?.meta?.work_seconds) ||
            Number(currentExercise?.work_seconds) ||
            40;
          const restSeconds = 60 - workSeconds;
          const nextPhase = emomPhase === "work" ? "rest" : "work";
          setEmomPhase(nextPhase);
          return nextPhase === "work" ? workSeconds : restSeconds;
        });
      }, 1000);
    } else if (emomActive && emomTotalLeft === 0) {
      setEmomActive(false);
    }
    return () => interval && clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emomActive, emomTotalLeft]);

  // EMOM: rep-based acts like AMRAP per your spec
  useEffect(() => {
    let interval: any;
    if (emomRepActive && emomRepTimeLeft > 0) {
      interval = setInterval(() => {
        setEmomRepTimeLeft((t) => (t > 0 ? t - 1 : 0));
      }, 1000);
    } else if (emomRepActive && emomRepTimeLeft === 0) {
      setEmomRepActive(false);
    }
    return () => interval && clearInterval(interval);
  }, [emomRepActive, emomRepTimeLeft]);

  // Tabata/Circuit autoplay: alternate work/rest for N rounds
  // State machine: Move to next state when time reaches zero
  useEffect(() => {
    if (intervalPhaseLeft !== 0 || !intervalActive || !showTimerModal) return;
    if (currentType !== "tabata") return;

    // Time reached zero - transition to next state (tabata_sets; fallback to circuit_sets for legacy data)
    const circuitSets = currentExercise?.meta?.tabata_sets ?? currentExercise?.meta?.circuit_sets;
    if (!circuitSets || !Array.isArray(circuitSets)) return;

    const currentSet = (circuitSets as unknown[])[timerSetIndex] as {
      exercises?: Array<{ rest_after?: number; work_seconds?: number }>;
      rest_between_sets?: number;
    } | undefined;
    const currentExerciseInSet = currentSet?.exercises?.[timerExerciseIndex];

    if (intervalPhase === "work") {
      // Work phase finished - transition to rest
      const restTime = currentExerciseInSet?.rest_after || 10;
      console.log("💪 WORK PHASE FINISHED - Going to REST:", {
        timerSetIndex,
        timerExerciseIndex,
        restTime,
      });
      setIntervalPhase("rest");
      setIntervalPhaseLeft(restTime);
    } else if (intervalPhase === "rest") {
      // Rest phase finished - determine next state
      console.log("📊 REST PHASE FINISHED - Checking next state:", {
        timerExerciseIndex,
        exercisesInSet: currentSet?.exercises?.length,
        hasMoreExercises:
          timerExerciseIndex + 1 < (currentSet?.exercises?.length || 0),
        timerSetIndex,
        totalSets: circuitSets.length,
        hasMoreSets: timerSetIndex + 1 < circuitSets.length,
      });

      if (timerExerciseIndex + 1 < (currentSet?.exercises?.length || 0)) {
        // More exercises in current set - move to next exercise
        console.log("➡️ Moving to next exercise in same set");
        const nextExerciseIndex = timerExerciseIndex + 1;
        const nextExercise = currentSet?.exercises?.[nextExerciseIndex];
        const workTime = nextExercise?.work_seconds || 20;
        setTimerExerciseIndex(nextExerciseIndex);
        setIntervalPhase("work");
        setIntervalPhaseLeft(workTime);
      } else {
        // Completed all exercises in current set
        const isLastSetInRound = timerSetIndex === circuitSets.length - 1;
        const nextRound = intervalRound + 1;
        const isLastRound = nextRound >= intervalTotalRounds;

        // Show rest after set UNLESS this is the last set of the last round
        if (!isLastSetInRound || !isLastRound) {
          // Show rest after set
          const restAfterSetTime = Number(currentSet?.rest_between_sets) || 30;
          console.log("🟣 Transitioning to REST AFTER SET:", {
            currentSet,
            rest_between_sets: currentSet?.rest_between_sets,
            restAfterSetTime,
            timerSetIndex,
            isLastSetInRound,
            isLastRound,
          });
          setIntervalPhase("rest_after_set");
          setIntervalPhaseLeft(restAfterSetTime);
        } else {
          // Last set of last round - workout complete
          console.log("✅ Workout complete!");
          setIntervalActive(false);
          setShowTimerModal(false);
        }
      }
    } else if (intervalPhase === "rest_after_set") {
      // Rest after set finished
      const isLastSetInRound = timerSetIndex === circuitSets.length - 1;

      if (isLastSetInRound) {
        // Last set of round completed - start next round
        const nextRound = intervalRound + 1;
        console.log("🔄 Starting next round after rest:", nextRound + 1);
        const firstSet = circuitSets[0];
        const firstExercise = firstSet?.exercises?.[0];
        const workTime = firstExercise?.work_seconds || 20;
        setIntervalRound(nextRound);
        setTimerSetIndex(0);
        setTimerExerciseIndex(0);
        setIntervalPhase("work");
        setIntervalPhaseLeft(workTime);
      } else {
        // Move to first exercise of next set
        const nextSetIndex = timerSetIndex + 1;
        const nextSet = circuitSets[nextSetIndex];
        const firstExercise = nextSet?.exercises?.[0];
        const workTime = firstExercise?.work_seconds || 20;
        console.log("➡️ Moving to next set after rest:", nextSetIndex + 1);
        setTimerSetIndex(nextSetIndex);
        setTimerExerciseIndex(0);
        setIntervalPhase("work");
        setIntervalPhaseLeft(workTime);
      }
    }
  }, [
    intervalPhaseLeft,
    intervalActive,
    showTimerModal,
    currentType,
    currentExercise?.meta?.tabata_sets,
    (currentExercise?.meta?.tabata_sets ?? currentExercise?.meta?.circuit_sets),
    timerSetIndex,
    timerExerciseIndex,
    intervalPhase,
    intervalRound,
    intervalTotalRounds,
  ]);

  // Single master timer - ticks every second
  useEffect(() => {
    if (!intervalActive || !showTimerModal || isTimerPaused) return;
    if (currentType !== "tabata") return;

    const masterInterval = setInterval(() => {
      setIntervalPhaseLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(masterInterval);
  }, [intervalActive, showTimerModal, isTimerPaused, currentType]);

  // Auto-calc drop weight when working weight or percentage changes, unless user overrode
  useEffect(() => {
    if (currentType !== "drop_set") return;
    if (dropManualOverride) return;
    const pct =
      Number(currentExercise?.meta?.drop_percentage) ||
      Number(currentExercise?.drop_percentage) ||
      0;
    const w = parseFloat(dropWorkingWeight);
    if (!isNaN(w) && pct > 0) {
      const dw = Math.max(0, w * (1 - pct / 100));
      setDropWeight(dw ? dw.toFixed(1) : "");
    } else {
      setDropWeight("");
    }
  }, [
    currentType,
    currentExercise?.meta?.drop_percentage,
    currentExercise?.drop_percentage,
    dropWorkingWeight,
    dropManualOverride,
  ]);

  // Initialize cluster weights when switching to cluster_set or exercise changes
  useEffect(() => {
    if (currentType !== "cluster_set") return;
    const count =
      Number(currentExercise?.meta?.clusters_per_set) ||
      Number(currentExercise?.clusters_per_set) ||
      1;
    setClusterWeights(Array.from({ length: Math.max(1, count) }, () => ""));
  }, [
    currentType,
    currentExercise?.id,
    currentExercise?.meta?.clusters_per_set,
    currentExercise?.clusters_per_set,
  ]);

  // Initialize rest-pause mini-sets when switching to rest_pause or exercise changes
  useEffect(() => {
    if (currentType !== "rest_pause") return;
    const count =
      Number(currentExercise?.meta?.max_rest_pauses) ||
      Number(currentExercise?.max_rest_pauses) ||
      0;
    setRestPauseExtraReps(Array.from({ length: Math.max(0, count) }, () => ""));
  }, [
    currentType,
    currentExercise?.id,
    currentExercise?.meta?.max_rest_pauses,
    currentExercise?.max_rest_pauses,
  ]);

  // For Time countdown
  useEffect(() => {
    let interval: any;
    if (forTimeActive && forTimeTimeLeft > 0) {
      interval = setInterval(() => {
        setForTimeTimeLeft((t) => (t > 0 ? t - 1 : 0));
      }, 1000);
    } else if (forTimeActive && forTimeTimeLeft === 0) {
      // time exhausted
      setForTimeActive(false);
      setForTimeCompletionSecs((prev) =>
        prev == null
          ? (Number(currentExercise?.meta?.time_cap) ||
              Number(currentExercise?.time_cap) ||
              0) * 60
          : prev,
      );
    }
    return () => interval && clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forTimeActive, forTimeTimeLeft]);

  // Initialize giant set arrays when switching to giant_set or exercise changes
  useEffect(() => {
    if (currentType !== "giant_set") return;
    const items: any[] = (currentExercise?.meta?.giant_set_exercises ||
      currentExercise?.giant_set_exercises ||
      []) as any[];
    const len = Math.max(1, items.length);
    setGiantWeights(Array.from({ length: len }, () => ""));
    setGiantReps(
      Array.from({ length: len }, (_, i) => {
        const r = (items[i] && (items[i].reps || items[i].target_reps)) || "";
        return r?.toString?.() || "";
      }),
    );
  }, [
    currentType,
    currentExercise?.id,
    currentExercise?.meta?.giant_set_exercises,
    currentExercise?.giant_set_exercises,
  ]);

  // NOTE: fetchPreviousPerformance is now triggered via onExerciseChanged on
  // LiveWorkoutBlockExecutor, which tracks currentExercise correctly by index.
  // The old useEffect here was dead code because currentExercise in the start
  // page scope no longer reflects the executor's currentExerciseIndex.

  // Theme-aware styles using your app's approach
  const theme = getThemeStyles();

  // Guard: prevent duplicate in-flight fetches for the same exercise (throttles ProgressionNudge)
  const fetchingPreviousPerformanceRef = useRef<Set<string>>(new Set());

  // Fetch previous performance data for current exercise (with per-exercise caching)
  const fetchPreviousPerformance = async (exerciseId: string) => {
    if (!exerciseId) return;
    if (fetchingPreviousPerformanceRef.current.has(exerciseId)) return;

    // Serve from cache if already fetched
    if (previousPerformanceMap.has(exerciseId)) {
      const cached = previousPerformanceMap.get(exerciseId);
      console.log('[fetchPreviousPerformance] served from cache:', cached);
      setPreviousPerformance({
        lastWorkout: cached?.lastWorkoutForCard ?? null,
        personalBest: cached?.personalBestForCard ?? null,
        loading: false,
      });
      return;
    }

    setPreviousPerformance((prev) => ({ ...prev, loading: true }));
    fetchingPreviousPerformanceRef.current.add(exerciseId);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setPreviousPerformance({ lastWorkout: null, personalBest: null, loading: false });
        return;
      }

      const { getExercisePreviousPerformance } = await import(
        "@/lib/clientProgressionService"
      );

      const resolvedWorkoutAssignmentId = await resolveWorkoutAssignmentId(
        assignment?.id || assignmentId,
        user.id,
      );

      const result = await getExercisePreviousPerformance(
        user.id,
        exerciseId,
        workoutLogId || undefined,
        resolvedWorkoutAssignmentId,
      );
      console.log('[fetchPreviousPerformance] result.lastWorkout:', result?.lastWorkout);
      console.log('[fetchPreviousPerformance] result.personalBest:', result?.personalBest);

      // Shape the data to match PreviousPerformanceCard's expected interface
      const lastWorkoutForCard = result.lastWorkout
        ? {
            weight_kg: result.lastWorkout.weight,
            reps_completed: result.lastWorkout.reps,
            logged_at: result.lastWorkout.date,
            avgRpe: result.lastWorkout.avgRpe,
          }
        : null;
      const personalBestForCard = result.personalBest
        ? {
            weight_kg: result.personalBest.maxWeight,
            reps_completed: result.personalBest.maxReps,
            logged_at: result.personalBest.date,
          }
        : null;

      // Cache in map (store both the raw result and the card-shaped data)
      const cached = {
        ...result,
        lastWorkoutForCard,
        personalBestForCard,
      };
      setPreviousPerformanceMap((prev) => new Map(prev).set(exerciseId, cached));

      setPreviousPerformance({
        lastWorkout: lastWorkoutForCard,
        personalBest: personalBestForCard,
        loading: false,
      });
    } catch (error) {
      console.error("Failed to fetch previous performance:", error);
      setPreviousPerformance({ lastWorkout: null, personalBest: null, loading: false });
    } finally {
      fetchingPreviousPerformanceRef.current.delete(exerciseId);
    }
  };

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 min-h-screen pb-32">
          {/* Rest Timer Overlay */}
          <RestTimerOverlay
            isActive={showRestTimer}
            initialTime={restTime}
            onComplete={handleRestTimerComplete}
            onSkip={handleRestTimerSkip}
            exerciseName={currentExercise?.exercise?.name}
            nextSet={currentSet}
            totalSets={currentExercise?.sets}
          />

          <ClientPageShell
            className={
              useBlockSystem && workoutBlocks.length > 0
                ? "max-w-2xl mx-auto flex min-h-screen flex-col gap-3 pb-32 pt-[calc(env(safe-area-inset-top,0px)+12px)] sm:gap-4"
                : "max-w-2xl mx-auto flex min-h-screen flex-col gap-5 pb-32"
            }
            style={{ gap: "var(--fc-gap-sections)" }}
          >
              {/* Block system: back + title live in BaseBlockExecutorLayout */}
              {(!useBlockSystem || workoutBlocks.length === 0) && (
                <div className="flex items-center gap-3 mb-3">
                  <button
                    onClick={() => router.push("/client/train")}
                    className="w-9 h-9 rounded-full fc-surface border border-[color:var(--fc-surface-card-border)] flex items-center justify-center fc-text-dim transition-all active:scale-95 flex-shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full animate-pulse"
                        style={{ background: "var(--fc-status-success)" }}
                      />
                      <span className="text-[10px] uppercase tracking-[0.2em] fc-text-dim font-mono">
                        Live Session
                      </span>
                    </div>
                    <h1 className="text-base font-bold fc-text-primary leading-tight truncate">
                      {assignment?.name || "Workout"}
                    </h1>
                  </div>
                </div>
              )}
              {/* Workout Block System */}
              {loading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-8 w-48 rounded-2xl bg-[color:var(--fc-glass-highlight)]" />
                  <div className="h-40 rounded-2xl bg-[color:var(--fc-glass-highlight)]" />
                  <div className="h-40 rounded-2xl bg-[color:var(--fc-glass-highlight)]" />
                  <div className="h-32 rounded-2xl bg-[color:var(--fc-glass-highlight)]" />
                </div>
              ) : assignment && !contentReady ? (
                <div className="border-b border-white/5 py-8 text-center">
                  <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin fc-text-dim" />
                  <p className="mb-1 text-sm font-medium fc-text-primary">Loading exercises…</p>
                  <p className="text-xs fc-text-dim">This may take a few seconds.</p>
                </div>
              ) : useBlockSystem && workoutBlocks.length > 0 ? (
                <>
                  {/* Calculate overall progress */}
                  {(() => {
                    // Calculate total expected sets across all blocks
                    const totalExpectedSets = workoutBlocks.reduce((total, block) => {
                      // For each exercise in the block, count expected sets
                      const exercises = block.block.exercises || [];
                      if (exercises.length === 0) {
                        // No exercises, use block.total_sets or default to 1
                        return total + (block.block.total_sets || 1);
                      }
                      // Sum sets for each exercise
                      return total + exercises.reduce((exerciseTotal, exercise) => {
                        return exerciseTotal + (exercise.sets || block.block.total_sets || 1);
                      }, 0);
                    }, 0);

                    // Calculate total completed sets across all blocks
                    const totalCompletedSets = Object.values(loggedSetsByBlockId).reduce(
                      (total, sets) => total + sets.length,
                      0
                    );

                    // Calculate overall progress percentage
                    const overallProgress =
                      totalExpectedSets > 0
                        ? (totalCompletedSets / totalExpectedSets) * 100
                        : 0;

                    // Get current block info
                    const currentBlock = workoutBlocks[currentBlockIndex];
                    const currentExercise = currentBlock?.block.exercises?.[currentBlock.currentExerciseIndex ?? 0];
                    const currentSetNumber = (currentBlock?.completedSets || 0) + 1;
                    const totalSetsInBlock =
                      currentExercise?.sets ||
                      currentBlock?.block.total_sets ||
                      currentBlock?.totalSets ||
                      1;
                    const currentSetType =
                      (currentBlock?.block.set_type as WorkoutBlockType) || "straight_set";
                    const currentSetTypeName =
                      WORKOUT_BLOCK_CONFIGS[currentSetType]?.name ?? "Set";

                    return (
                      <WorkoutProgressBar
                        currentBlockIndex={currentBlockIndex}
                        totalBlocks={workoutBlocks.length}
                        currentSetNumber={currentSetNumber}
                        totalSetsInBlock={totalSetsInBlock}
                        overallProgress={overallProgress}
                        blockName={currentBlock?.block.set_name}
                        setTypeName={currentSetTypeName}
                      />
                    );
                  })()}

                  {/* Flow gap below fixed progress bar so first content isn’t tight to the track */}
                  <div className="h-2 w-full shrink-0" aria-hidden />

                  <div className="w-full">
                  {/* Block Progress Indicator */}
                  {workoutBlocks.length > 1 && (
                    <div className="mb-2 mt-1">
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        {workoutBlocks.map((block, index) => {
                          const isCompleted =
                            block.isCompleted || index < currentBlockIndex;
                          const isCurrent = index === currentBlockIndex;

                          return (
                            <div
                              key={block.block.id}
                              className="flex-1 h-1.5 rounded-full transition-all min-w-[20px]"
                              style={{
                                background: isCompleted
                                  ? "var(--fc-status-success)"
                                  : isCurrent
                                    ? "var(--fc-domain-workouts)"
                                    : "var(--fc-surface-sunken)",
                              }}
                              title={
                                block.block.set_name || `Set ${index + 1}`
                              }
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <LiveWorkoutBlockExecutor
                    block={workoutBlocks[currentBlockIndex]}
                    onBlockComplete={handleBlockComplete}
                    onNextBlock={handleNextBlock}
                    onSetLogUpsert={handleSetLogUpsert}
                    onSetEditSaved={handleSetEditSaved}
                    loggedSets={(() => {
                      const block = workoutBlocks[currentBlockIndex];
                      if (!block?.block?.id) return [];
                      return (
                        loggedSetsByBlockId[block.block.id] ??
                        block.existingSetLogs ??
                        []
                      );
                    })()}
                    allowSetEditDelete={true}
                    e1rmMap={e1rmMap}
                    onE1rmUpdate={(exerciseId, e1rm) => {
                      setE1rmMap((prev) => ({
                        ...prev,
                        [exerciseId]: e1rm,
                      }));
                    }}
                    lastPerformedWeightByExerciseId={
                      lastPerformedWeightByExerciseId
                    }
                    lastSessionWeightByExerciseId={
                      lastSessionWeightByExerciseId
                    }
                    onWeightLogged={(exerciseId: string, weight: number) => {
                      setLastPerformedWeightByExerciseId((prev) => ({
                        ...prev,
                        [exerciseId]: weight,
                      }));
                    }}
                    sessionId={sessionId}
                    assignmentId={assignment?.id || assignmentId}
                    allBlocks={workoutBlocks}
                    currentBlockIndex={currentBlockIndex}
                    onBlockChange={handleBlockChange}
                    onSetLogged={handleSetLogged}
                    onExerciseComplete={handleExerciseComplete}
                    progressionSuggestions={progressionSuggestions}
                    previousPerformanceMap={previousPerformanceMap}
                    onExerciseChanged={(exerciseId) =>
                      fetchPreviousPerformance(exerciseId).catch((err) =>
                        console.error("Error fetching previous performance:", err)
                      )
                    }
                    onPlateCalculatorClick={() => setShowPlateCalculator(true)}
                    onPRDetected={(pr) => setPrCelebrationData(pr)}
                    onAchievementsUnlocked={(achievements) => {
                      const tierToRarity = (tier: string | null): Achievement["rarity"] => {
                        if (!tier) return "uncommon";
                        if (tier === "platinum") return "legendary";
                        if (tier === "gold") return "epic";
                        if (tier === "silver") return "rare";
                        if (tier === "bronze") return "uncommon";
                        return "common";
                      };
                      const mapped: Achievement[] = achievements.map((a) => ({
                        id: a.templateId,
                        name: a.templateName ?? "Achievement",
                        description: a.description ?? (a.nextTier ? `Next: ${(a.nextTier as { label?: string })?.label} — ${a.currentMetricValue ?? 0}/${(a.nextTier as { threshold?: number })?.threshold ?? 0}` : ""),
                        icon: a.templateIcon ?? "🏆",
                        rarity: tierToRarity(a.tier),
                        unlocked: true,
                      }));
                      // If PR modal is active, defer achievements until it closes
                      if (prCelebrationData) {
                        pendingAchievementsRef.current = [...pendingAchievementsRef.current, ...mapped];
                      } else {
                        setNewAchievementsQueue((prev) => [...prev, ...mapped]);
                        setAchievementModalIndex(0);
                      }
                    }}
                    onExitWorkout={() => {
                      if (
                        typeof window !== "undefined" &&
                        window.confirm("Exit workout? Progress is saved.")
                      ) {
                        router.push("/client/train");
                      }
                    }}
                  />
                  {/* Complete Workout Button - Only show on last block when complete */}
                  {isLastBlockComplete &&
                    currentBlockIndex === workoutBlocks.length - 1 && (
                      <div className="mt-6">
                        <PrimaryButton
                          disabled={isCompletingWorkout}
                          onClick={async () => {
                            console.log("🔘 Complete Workout button clicked");
                            setShowWorkoutCompletion(false);
                            await completeWorkout();
                          }}
                          className="w-full h-14 text-lg font-semibold disabled:opacity-70 disabled:pointer-events-none"
                        >
                          {isCompletingWorkout ? (
                            <>
                              <Loader2 className="w-6 h-6 animate-spin" />
                              Completing…
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-6 h-6" />
                              Complete Workout
                            </>
                          )}
                        </PrimaryButton>
                      </div>
                    )}
                  </div>
                </>
              ) : /* Traditional Workout System */
              loading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-8 w-48 rounded-2xl bg-[color:var(--fc-glass-highlight)]" />
                  <div className="h-40 rounded-2xl bg-[color:var(--fc-glass-highlight)]" />
                  <div className="h-40 rounded-2xl bg-[color:var(--fc-glass-highlight)]" />
                  <div className="h-32 rounded-2xl bg-[color:var(--fc-glass-highlight)]" />
                </div>
              ) : currentExercise ? (
                <div className="space-y-4 sm:space-y-6">
                  {/* Instruction Card - Only show for types that don't have their own detail cards */}
                  {currentType !== "giant_set" &&
                    currentType !== "tabata" &&
                    currentType !== "amrap" &&
                    currentType !== "emom" &&
                    currentType !== "for_time" &&
                    currentType !== "superset" &&
                    currentType !== "pre_exhaustion" && (
                      <ClientGlassCard className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl relative z-30 border-2 border-[color:var(--fc-domain-workouts)]">
                            <div className="flex items-start gap-3">
                              <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md">
                                <Lightbulb className="w-4 h-4" />
                              </div>
                              <div className="flex-1">
                                <div className="text-base font-semibold fc-text-primary mb-1">
                                  How to perform
                                </div>
                                <div className="text-base leading-relaxed fc-text-dim rounded-xl border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-surface-sunken)] p-3">
                                  {typeHelp}
                                </div>
                              </div>
                              {/* Optional tiny illustration placeholder (hidden if not needed) */}
                              <div className="hidden sm:block shrink-0">
                                <div className="w-16 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 border border-white/40 dark:border-white/10"></div>
                              </div>
                            </div>
                      </ClientGlassCard>
                    )}
                  {/* AMRAP Flow */}
                  {currentType === "amrap" && (
                    <div className="fc-surface rounded-2xl p-6 border-2 border-[color:var(--fc-accent-cyan)]">
                      <div>
                        {!amrapActive ? (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "16px",
                            }}
                          >
                            {/* Exercise Details Header */}
                            <div
                              className="flex items-center"
                              style={{ gap: "12px" }}
                            >
                              <div
                                className="w-14 h-14 rounded-[18px] bg-[color:var(--fc-accent-cyan)] flex items-center justify-center"
                              >
                                <Target className="w-8 h-8 text-white" />
                              </div>
                              <div>
                                <div className="text-xl font-bold fc-text-primary">
                                  AMRAP Details
                                </div>
                                <div className="text-sm fc-text-dim">
                                  Complete as many reps as possible
                                </div>
                              </div>
                            </div>

                            {/* Summary Info */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="rounded-xl p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-2 border-blue-200 dark:border-blue-700">
                                <div
                                  className={`text-sm ${theme.textSecondary} mb-1`}
                                >
                                  Duration
                                </div>
                                <div
                                  className={`text-2xl font-bold ${theme.text}`}
                                >
                                  {Number(
                                    currentExercise?.meta?.amrap_duration ??
                                      currentExercise?.amrap_duration ??
                                      10
                                  )}{" "}
                                  min
                                </div>
                              </div>
                              <div className="rounded-xl p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-700">
                                <div
                                  className={`text-sm ${theme.textSecondary} mb-1`}
                                >
                                  Sets
                                </div>
                                <div
                                  className={`text-2xl font-bold ${theme.text}`}
                                >
                                  {currentExercise?.sets || 1}
                                </div>
                              </div>
                            </div>

                            {/* Exercise Details */}
                            <div className="rounded-xl p-4 bg-[color:var(--fc-glass-highlight)] border-2 border-[color:var(--fc-accent-cyan)]">
                              <div className="flex items-start gap-3 mb-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-blue-400 to-cyan-500">
                                  <Dumbbell className="w-4 h-4 text-white" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div
                                      className={`font-bold ${theme.text} text-base`}
                                    >
                                      {currentExercise.exercise?.name ||
                                        "Exercise"}
                                    </div>
                                    {/* Utility Icon Buttons */}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        setShowPlateCalculator(true)
                                      }
                                      className="h-6 w-6 p-0 hover:bg-[color:var(--fc-glass-highlight)]"
                                    >
                                      <Calculator className="w-3.5 h-3.5 fc-text-dim" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        setShowExerciseAlternatives(true)
                                      }
                                      className="h-6 w-6 p-0 hover:bg-[color:var(--fc-glass-highlight)]"
                                    >
                                      <RefreshCw className="w-3.5 h-3.5 fc-text-dim" />
                                    </Button>
                                  </div>
                                  <div className="flex flex-wrap gap-2 text-sm">
                                    {currentExercise?.reps && (
                                      <div className="px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700 inline-block">
                                        <span
                                          className={`text-sm font-bold ${theme.text}`}
                                        >
                                          {currentExercise.reps} reps
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {currentExercise.exercise?.video_url && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      openVideoModal(
                                        currentExercise.exercise?.video_url ||
                                          "",
                                      )
                                    }
                                    className="flex-shrink-0 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  >
                                    <Youtube className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>

                              {/* Logging Fields */}
                              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[color:var(--fc-glass-border)]">
                                <div>
                                  <label
                                    className={`block text-sm font-medium ${theme.text} mb-1`}
                                  >
                                    Weight (kg)
                                  </label>
                                  <input
                                    type="number"
                                    value={amrapWeight}
                                    onChange={(e) =>
                                      setAmrapWeight(e.target.value)
                                    }
                                    className={`w-full h-12 text-center text-lg rounded-xl border-2 border-[color:var(--fc-domain-workouts)] fc-glass-soft ${theme.text} font-semibold focus:outline-none focus:border-[color:var(--fc-domain-workouts)]`}
                                    step="0.5"
                                    placeholder="0"
                                  />
                                </div>
                                <div>
                                  <label
                                    className={`block text-sm font-medium ${theme.text} mb-1`}
                                  >
                                    Reps Achieved
                                  </label>
                                  <input
                                    type="number"
                                    value={amrapReps}
                                    onChange={(e) =>
                                      setAmrapReps(e.target.value)
                                    }
                                    className={`w-full h-12 text-center text-lg rounded-xl border-2 border-[color:var(--fc-domain-workouts)] fc-glass-soft ${theme.text} font-semibold focus:outline-none focus:border-[color:var(--fc-domain-workouts)]`}
                                    placeholder="0"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Previous Performance Card */}
                            <PreviousPerformanceCard previousPerformance={previousPerformance} theme={theme} />

                            {/* Action Buttons */}
                            <div className="space-y-2">
                              {/* Primary: Log and Continue */}
                              <Button
                                onClick={completeAmrapSet}
                                className="w-full fc-btn fc-btn-primary rounded-xl py-6 text-lg font-bold"
                                disabled={isLoggingSet}
                              >
                                <Check className="w-5 h-5 mr-2" /> Log AMRAP
                              </Button>

                              {/* Secondary: Start Timer */}
                              <Button
                                onClick={() => {
                                  const minutes =
                                    Number(
                                      currentExercise?.meta?.amrap_duration,
                                    ) ||
                                    Number(currentExercise?.amrap_duration) ||
                                    10;
                                  setAmrapTimeLeft(minutes * 60);
                                  setAmrapActive(true);
                                }}
                                variant="outline"
                                className="w-full border-2 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl py-4 text-base font-semibold"
                              >
                                <Clock className="w-4 h-4 mr-2" /> Start Timer
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-8">
                            <div className="text-5xl font-bold text-blue-700 dark:text-blue-300">
                              {Math.floor(amrapTimeLeft / 60)
                                .toString()
                                .padStart(2, "0")}
                              :
                              {(amrapTimeLeft % 60).toString().padStart(2, "0")}
                            </div>
                            <div className="mt-2 fc-text-dim">
                              Time Remaining
                            </div>
                            <Button
                              onClick={() => {
                                setAmrapActive(false);
                                setAmrapTimeLeft(0);
                              }}
                              variant="outline"
                              className="mt-4"
                            >
                              Stop
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* EMOM Flow */}
                  {currentType === "emom" && (
                    <div className="fc-surface rounded-2xl p-6 border-2 border-[color:var(--fc-status-success)]">
                      <div>
                        {/* Rep-based behaves like AMRAP */}
                        {currentExercise?.meta?.emom_mode === "rep_based" ? (
                          !emomRepActive && emomRepTimeLeft === 0 ? (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "16px",
                              }}
                            >
                              {/* Exercise Details Header */}
                              <div
                                className="flex items-center"
                                style={{ gap: "12px" }}
                              >
                                <div className="w-14 h-14 rounded-[18px] bg-[color:var(--fc-status-success)] flex items-center justify-center">
                                  <Clock className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                  <div className="text-xl font-bold fc-text-primary">
                                    EMOM Details (Rep-Based)
                                  </div>
                                  <div className="text-sm fc-text-dim">
                                    Complete target reps every minute
                                  </div>
                                </div>
                              </div>

                              {/* Summary Info */}
                              <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-xl p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-2 border-emerald-200 dark:border-emerald-700">
                                  <div
                                    className={`text-sm ${theme.textSecondary} mb-1`}
                                  >
                                    Duration
                                  </div>
                                  <div
                                    className={`text-2xl font-bold ${theme.text}`}
                                  >
                                    {Number(
                                      currentExercise?.meta?.emom_duration ??
                                        currentExercise?.emom_duration ??
                                        10
                                    )}{" "}
                                    min
                                  </div>
                                </div>
                                <div className="rounded-xl p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-700">
                                  <div
                                    className={`text-sm ${theme.textSecondary} mb-1`}
                                  >
                                    Sets
                                  </div>
                                  <div
                                    className={`text-2xl font-bold ${theme.text}`}
                                  >
                                    {currentExercise?.sets || 1}
                                  </div>
                                </div>
                              </div>

                              {/* Start Button */}
                              <Button
                                onClick={() => {
                                  const minutes =
                                    Number(
                                      currentExercise?.meta?.emom_duration,
                                    ) ||
                                    Number(currentExercise?.emom_duration) ||
                                    10;
                                  setEmomRepTimeLeft(minutes * 60);
                                  setEmomRepActive(true);
                                }}
                                className="w-full fc-btn fc-btn-primary rounded-xl py-6 text-lg font-bold"
                              >
                                <Clock className="w-5 h-5 mr-2" /> Start EMOM
                              </Button>
                            </div>
                          ) : emomRepActive ? (
                            <div className="flex flex-col items-center justify-center py-8">
                              <div className="text-5xl font-bold text-emerald-700 dark:text-emerald-300">
                                {Math.floor(emomRepTimeLeft / 60)
                                  .toString()
                                  .padStart(2, "0")}
                                :
                                {(emomRepTimeLeft % 60)
                                  .toString()
                                  .padStart(2, "0")}
                              </div>
                              <div className="mt-2 fc-text-dim">
                                Time Remaining
                              </div>
                              <Button
                                onClick={() => setEmomRepActive(false)}
                                variant="outline"
                                className="mt-4"
                              >
                                Stop
                              </Button>
                            </div>
                          ) : null
                        ) : // Time-based with alternating phases
                        !emomActive && emomTotalLeft === 0 ? (
                          <div className="space-y-4">
                            {/* Exercise Details Header */}
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600">
                                <Clock className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <div
                                  className={`text-xl font-bold ${theme.text}`}
                                >
                                  EMOM Details (Time-Based)
                                </div>
                                <div
                                  className={`text-sm ${theme.textSecondary}`}
                                >
                                  Work every minute on the minute
                                </div>
                              </div>
                            </div>

                            {/* Summary Info */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="rounded-xl p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-2 border-emerald-200 dark:border-emerald-700">
                                <div
                                  className={`text-sm ${theme.textSecondary} mb-1`}
                                >
                                  Duration
                                </div>
                                <div
                                  className={`text-2xl font-bold ${theme.text}`}
                                >
                                  {Number(
                                    currentExercise?.meta?.emom_duration ??
                                      currentExercise?.emom_duration ??
                                      10
                                  )}{" "}
                                  min
                                </div>
                              </div>
                              <div className="rounded-xl p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-700">
                                <div
                                  className={`text-sm ${theme.textSecondary} mb-1`}
                                >
                                  Work Time
                                </div>
                                <div
                                  className={`text-2xl font-bold ${theme.text}`}
                                >
                                  {Number(
                                    currentExercise?.meta?.work_seconds ??
                                      currentExercise?.work_seconds ??
                                      40
                                  )}
                                  s
                                </div>
                              </div>
                            </div>

                            {/* Start Button */}
                            <Button
                              onClick={() => {
                                const minutes =
                                  Number(
                                    currentExercise?.meta?.emom_duration,
                                  ) ||
                                  Number(currentExercise?.emom_duration) ||
                                  10;
                                const workSeconds =
                                  Number(currentExercise?.meta?.work_seconds) ||
                                  Number(currentExercise?.work_seconds) ||
                                  40;
                                const restSeconds = Math.max(
                                  0,
                                  60 - workSeconds,
                                );
                                setEmomTotalLeft(minutes * 60);
                                setEmomPhase("work");
                                setEmomPhaseLeft(workSeconds);
                                setEmomActive(true);
                              }}
                              className="w-full fc-btn fc-btn-primary rounded-xl py-6 text-lg font-bold"
                            >
                              <Clock className="w-5 h-5 mr-2" /> Start EMOM
                            </Button>
                          </div>
                        ) : emomActive ? (
                          <div className="flex flex-col items-center justify-center py-8">
                            <div className="text-sm uppercase tracking-wide fc-text-dim mb-1">
                              Total Remaining
                            </div>
                            <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300 mb-4">
                              {Math.floor(emomTotalLeft / 60)
                                .toString()
                                .padStart(2, "0")}
                              :
                              {(emomTotalLeft % 60).toString().padStart(2, "0")}
                            </div>
                            <div
                              className={`text-5xl font-extrabold ${
                                emomPhase === "work"
                                  ? "text-red-600"
                                  : "text-blue-600"
                              } dark:${
                                emomPhase === "work"
                                  ? "text-red-400"
                                  : "text-blue-400"
                              }`}
                            >
                              {Math.floor(emomPhaseLeft / 60)
                                .toString()
                                .padStart(2, "0")}
                              :
                              {(emomPhaseLeft % 60).toString().padStart(2, "0")}
                            </div>
                            <div className="mt-2 fc-text-dim">
                              {emomPhase === "work" ? "Work" : "Rest"} phase
                            </div>
                            <Button
                              onClick={() => setEmomActive(false)}
                              variant="outline"
                              className="mt-4"
                            >
                              Stop
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {/* Tabata Flow */}
                  {currentType === "tabata" && (
                    <div
                      className="fc-surface rounded-2xl p-6 border-2 border-[color:var(--fc-status-error)]"
                    >
                      <div>
                        {!intervalActive ? (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "16px",
                            }}
                          >
                            {/* Exercise Details Card */}
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "16px",
                              }}
                            >
                              {/* Header */}
                              <div
                                className="flex items-center"
                                style={{ gap: "12px" }}
                              >
                                <div
                                  className={`w-14 h-14 rounded-[18px] flex items-center justify-center ${currentType === "tabata" ? "bg-[color:var(--fc-status-error)]" : "bg-[color:var(--fc-accent-primary)]"}`}
                                >
                                  <Activity className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                  <div className="text-xl font-bold fc-text-primary">
                                    {currentType === "tabata"
                                      ? "Tabata"
                                      : "Tabata"}{" "}
                                    Details
                                  </div>
                                  <div className="text-sm fc-text-dim">
                                    Autoplay countdowns for work and rest
                                  </div>
                                </div>
                              </div>

                              {/* Summary Info */}
                              <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-xl p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-700">
                                  <div
                                    className={`text-sm ${theme.textSecondary} mb-1`}
                                  >
                                    {currentType === "tabata"
                                      ? "Rounds per Set"
                                      : "Total Rounds"}
                                  </div>
                                  <div
                                    className={`text-2xl font-bold ${theme.text}`}
                                  >
                                    {currentType === "tabata"
                                      ? Number(
                                          currentExercise?.rounds ??
                                            currentExercise?.meta?.rounds ??
                                            8
                                        )
                                      : Number(currentExercise?.sets ?? 1)}
                                  </div>
                                </div>
                                <div className="rounded-xl p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-700">
                                  <div
                                    className={`text-sm ${theme.textSecondary} mb-1`}
                                  >
                                    {currentType === "tabata"
                                      ? "Total Sets"
                                      : "Sets per Round"}
                                  </div>
                                  <div
                                    className={`text-2xl font-bold ${theme.text}`}
                                  >
                                    {(() => {
                                      const sets =
                                        currentType === "tabata"
                                          ? currentExercise?.meta
                                              ?.tabata_sets ||
                                            currentExercise?.tabata_sets
                                          : (currentExercise?.meta?.tabata_sets ?? currentExercise?.meta?.circuit_sets);
                                      return Array.isArray(sets)
                                        ? sets.length
                                        : 0;
                                    })()}
                                  </div>
                                </div>
                              </div>

                              {/* Sets Details */}
                              {(() => {
                                const sets =
                                  currentType === "tabata"
                                    ? currentExercise?.meta?.tabata_sets ||
                                      currentExercise?.tabata_sets
                                    : (currentExercise?.meta?.tabata_sets ?? currentExercise?.meta?.circuit_sets);
                                return (
                                  Array.isArray(sets) &&
                                  sets.length > 0 && (
                                    <div className="space-y-3">
                                      {sets.map(
                                        (set: any, setIndex: number) => (
                                          <div
                                            key={setIndex}
                                            className="rounded-xl p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-700/50 border-2 border-blue-200 dark:border-blue-700"
                                          >
                                            {/* Set Header */}
                                            <div className="flex items-center justify-between mb-3">
                                              <div
                                                className={`text-lg font-bold ${theme.text}`}
                                              >
                                                Set {setIndex + 1}
                                              </div>
                                              {set.rest_between_sets && (
                                                <div className="px-3 py-1 rounded-lg bg-purple-100 dark:bg-purple-900/40 border border-purple-300 dark:border-purple-700">
                                                  <div
                                                    className={`text-xs font-semibold ${theme.text}`}
                                                  >
                                                    Rest After Set:{" "}
                                                    {set.rest_between_sets}s
                                                  </div>
                                                </div>
                                              )}
                                            </div>

                                            {/* Exercises */}
                                            <div className="space-y-2">
                                              {Array.isArray(set.exercises) &&
                                                set.exercises.map(
                                                  (
                                                    exercise: any,
                                                    exerciseIndex: number,
                                                  ) => {
                                                    const exerciseInfo =
                                                      exerciseLookup[
                                                        exercise.exercise_id
                                                      ];
                                                    return (
                                                      <div
                                                        key={exerciseIndex}
                                                        className="rounded-lg p-3 fc-surface border border-[color:var(--fc-glass-border)]"
                                                      >
                                                        <div className="flex items-start gap-3">
                                                          <div
                                                            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                                              currentType ===
                                                              "tabata"
                                                                ? "bg-gradient-to-br from-red-400 to-orange-500"
                                                                : "bg-gradient-to-br from-purple-400 to-indigo-500"
                                                            }`}
                                                          >
                                                            <span className="text-white font-bold text-sm">
                                                              {exerciseIndex +
                                                                1}
                                                            </span>
                                                          </div>
                                                          <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                              <div
                                                                className={`font-bold ${theme.text} text-base`}
                                                              >
                                                                {exerciseInfo?.name ||
                                                                  "Unknown Exercise"}
                                                              </div>
                                                              {/* Utility Icon Buttons */}
                                                              <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() =>
                                                                  setShowPlateCalculator(
                                                                    true,
                                                                  )
                                                                }
                                                                className="h-6 w-6 p-0 hover:bg-[color:var(--fc-glass-highlight)]"
                                                              >
                                                                <Calculator className="w-3.5 h-3.5 fc-text-dim" />
                                                              </Button>
                                                              <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() =>
                                                                  setShowExerciseAlternatives(
                                                                    true,
                                                                  )
                                                                }
                                                                className="h-6 w-6 p-0 hover:bg-[color:var(--fc-glass-highlight)]"
                                                              >
                                                                <RefreshCw className="w-3.5 h-3.5 fc-text-dim" />
                                                              </Button>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2 text-sm">
                                                              {currentType ===
                                                              "tabata" ? (
                                                                <>
                                                                  {/* For Tabata, use global work_seconds and rest_seconds */}
                                                                  {(currentExercise?.work_seconds ||
                                                                    currentExercise
                                                                      ?.meta
                                                                      ?.work_seconds) && (
                                                                    <div className="px-2 py-1 rounded bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700">
                                                                      <span
                                                                        className={`font-semibold ${theme.text}`}
                                                                      >
                                                                        Work:{" "}
                                                                        {Number(
                                                                          currentExercise?.work_seconds ??
                                                                            currentExercise?.meta
                                                                              ?.work_seconds ?? 0
                                                                        )}
                                                                        s
                                                                      </span>
                                                                    </div>
                                                                  )}
                                                                  {(currentExercise?.rest_seconds ||
                                                                    currentExercise
                                                                      ?.meta
                                                                      ?.rest_seconds) && (
                                                                    <div className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700">
                                                                      <span
                                                                        className={`font-semibold ${theme.text}`}
                                                                      >
                                                                        Rest:{" "}
                                                                        {Number(
                                                                          currentExercise?.rest_seconds ??
                                                                            currentExercise?.meta
                                                                              ?.rest_seconds ?? 0
                                                                        )}
                                                                        s
                                                                      </span>
                                                                    </div>
                                                                  )}
                                                                </>
                                                              ) : (
                                                                <>
                                                                  {/* For Circuit, use individual exercise settings */}
                                                                  {exercise.work_seconds && (
                                                                    <div className="px-2 py-1 rounded bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700">
                                                                      <span
                                                                        className={`font-semibold ${theme.text}`}
                                                                      >
                                                                        Work:{" "}
                                                                        {
                                                                          exercise.work_seconds
                                                                        }
                                                                        s
                                                                      </span>
                                                                    </div>
                                                                  )}
                                                                  {exercise.target_reps && (
                                                                    <div className="px-2 py-1 rounded bg-orange-100 dark:bg-orange-900/40 border border-orange-300 dark:border-orange-700">
                                                                      <span
                                                                        className={`font-semibold ${theme.text}`}
                                                                      >
                                                                        Target:{" "}
                                                                        {
                                                                          exercise.target_reps
                                                                        }{" "}
                                                                        reps
                                                                      </span>
                                                                    </div>
                                                                  )}
                                                                  {exercise.rest_after && (
                                                                    <div className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700">
                                                                      <span
                                                                        className={`font-semibold ${theme.text}`}
                                                                      >
                                                                        Rest:{" "}
                                                                        {
                                                                          exercise.rest_after
                                                                        }
                                                                        s
                                                                      </span>
                                                                    </div>
                                                                  )}
                                                                </>
                                                              )}
                                                            </div>
                                                          </div>
                                                          {/* Video Button */}
                                                          {exerciseInfo?.video_url && (
                                                            <Button
                                                              variant="outline"
                                                              size="sm"
                                                              onClick={() => {
                                                                setCurrentVideoUrl(
                                                                  exerciseInfo.video_url ||
                                                                    "",
                                                                );
                                                                setShowVideoModal(
                                                                  true,
                                                                );
                                                              }}
                                                              className="flex-shrink-0 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                            >
                                                              <Youtube className="w-4 h-4" />
                                                            </Button>
                                                          )}
                                                        </div>
                                                      </div>
                                                    );
                                                  },
                                                )}
                                            </div>
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  )
                                );
                              })()}
                            </div>

                            {/* Start Button */}
                            <Button
                              onClick={() => {
                                setShowTimerModal(true);
                                setTimerExerciseIndex(0);
                                setTimerSetIndex(0);
                                setIntervalMode("tabata");
                                setIntervalRound(0);
                                setIntervalPhase("work");
                                setIntervalActive(true);

                                // Initialize timer with first exercise
                                const rawSets =
                                  currentType === "tabata"
                                    ? currentExercise?.meta?.tabata_sets ??
                                      currentExercise?.tabata_sets
                                    : (currentExercise?.meta?.tabata_sets ?? currentExercise?.meta?.circuit_sets);
                                const sets = Array.isArray(rawSets)
                                  ? (rawSets as Array<{ exercises?: Array<{ work_seconds?: number }> }>)
                                  : undefined;
                                const firstSet = sets?.[0];
                                const firstExercise = firstSet?.exercises?.[0];
                                const workTime =
                                  Number(firstExercise?.work_seconds ?? 20);
                                setIntervalPhaseLeft(workTime);

                                // Set total rounds
                                const rounds = currentExercise?.sets || 1;
                                setIntervalTotalRounds(rounds);
                              }}
                              className="w-full fc-btn fc-btn-primary rounded-xl py-6 text-lg font-bold"
                            >
                              <Clock className="w-5 h-5 mr-2" /> Start{" "}
                              Tabata
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-8">
                            <div className="text-sm fc-text-dim mb-1">
                              Round{" "}
                              {Math.min(
                                intervalRound +
                                  (intervalPhase === "rest" ? 1 : 1),
                                intervalTotalRounds,
                              )}{" "}
                              / {intervalTotalRounds}
                            </div>
                            <div
                              className={`text-5xl font-extrabold ${
                                intervalPhase === "work"
                                  ? "text-purple-700"
                                  : "text-indigo-700"
                              } dark:${
                                intervalPhase === "work"
                                  ? "text-purple-300"
                                  : "text-indigo-300"
                              }`}
                            >
                              {Math.floor(intervalPhaseLeft / 60)
                                .toString()
                                .padStart(2, "0")}
                              :
                              {(intervalPhaseLeft % 60)
                                .toString()
                                .padStart(2, "0")}
                            </div>
                            <div className="mt-2 fc-text-dim">
                              {intervalPhase === "work" ? "Work" : "Rest"} phase
                            </div>
                            <Button
                              onClick={() => setIntervalActive(false)}
                              variant="outline"
                              className="mt-4"
                            >
                              Stop
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Cluster Set Flow */}
                  {currentType === "cluster_set" && (
                    <div className="fc-surface rounded-2xl p-6 border-2 border-[color:var(--fc-accent-primary)]">
                      <div>
                        {/* Header */}
                        <div
                          className="flex items-center"
                          style={{ gap: "12px", marginBottom: "16px" }}
                        >
                          <div className="w-14 h-14 rounded-[18px] bg-[color:var(--fc-accent-primary)] flex items-center justify-center">
                            <Dumbbell className="w-8 h-8 text-white" />
                          </div>
                          <div>
                            <div className="text-xl font-bold fc-text-primary">
                              Cluster Set
                            </div>
                            <div className="text-sm fc-text-dim">
                              Multiple mini-sets with short rest
                            </div>
                          </div>
                        </div>

                        {/* Summary Info */}
                        <div className="grid grid-cols-3 gap-3 mb-4">
                          <div className="rounded-xl p-3 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-700">
                            <div
                              className={`text-xs ${theme.textSecondary} mb-1`}
                            >
                              Clusters
                            </div>
                            <div className={`text-lg font-bold ${theme.text}`}>
                              {Number(
                                currentExercise?.meta?.clusters_per_set,
                              ) ||
                                Number(currentExercise?.clusters_per_set) ||
                                1}
                            </div>
                          </div>
                          <div className="rounded-xl p-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-700">
                            <div
                              className={`text-xs ${theme.textSecondary} mb-1`}
                            >
                              Reps per Cluster
                            </div>
                            <div className={`text-lg font-bold ${theme.text}`}>
                              {Number(currentExercise?.meta?.cluster_reps) ||
                                Number(currentExercise?.cluster_reps) ||
                                1}
                            </div>
                          </div>
                          <div className="rounded-xl p-3 bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 border-2 border-green-200 dark:border-green-700 relative">
                            <div
                              className={`text-xs ${theme.textSecondary} mb-1`}
                            >
                              Rest (s)
                            </div>
                            <div className={`text-lg font-bold ${theme.text}`}>
                              {Number(
                                currentExercise?.meta?.intra_cluster_rest,
                              ) ||
                                Number(currentExercise?.intra_cluster_rest) ||
                                0}
                            </div>
                          </div>
                        </div>

                        {/* Exercise Info */}
                        <div className="flex items-start gap-3 mb-4">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-purple-400 to-pink-500">
                            <Dumbbell className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div
                                className={`font-bold ${theme.text} text-lg`}
                              >
                                {currentExercise.exercise?.name || "Exercise"}
                              </div>
                              {/* Utility Icon Buttons */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowPlateCalculator(true)}
                                className="h-6 w-6 p-0 hover:bg-[color:var(--fc-glass-highlight)]"
                              >
                                <Calculator className="w-3.5 h-3.5 fc-text-dim" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setShowExerciseAlternatives(true)
                                }
                                className="h-6 w-6 p-0 hover:bg-[color:var(--fc-glass-highlight)]"
                              >
                                <RefreshCw className="w-3.5 h-3.5 fc-text-dim" />
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2.5">
                              {(currentExercise?.reps != null ||
                                currentExercise?.meta?.cluster_reps != null) && (
                                <div className="px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700 inline-block">
                                  <span
                                    className={`text-sm font-bold ${theme.text}`}
                                  >
                                    {String(
                                      currentExercise?.reps ??
                                        currentExercise?.meta?.cluster_reps ??
                                        ""
                                    )}{" "}
                                    reps
                                  </span>
                                </div>
                              )}
                              {(currentExercise?.rir ||
                                currentExercise?.rir === 0) && (
                                <div className="px-2 py-1 rounded bg-orange-100 dark:bg-orange-900/40 border border-orange-300 dark:border-orange-700">
                                  <span
                                    className={`text-xs font-semibold ${theme.text}`}
                                  >
                                    RPE: {Number(currentExercise.rir)}
                                  </span>
                                </div>
                              )}
                              {currentExercise?.tempo != null && currentExercise.tempo !== "" && (
                                <div className="px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/40 border border-purple-300 dark:border-purple-700">
                                  <span
                                    className={`text-xs font-semibold ${theme.text}`}
                                  >
                                    Tempo: {String(currentExercise.tempo)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          {currentExercise.exercise?.video_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openVideoModal(
                                  currentExercise.exercise?.video_url || "",
                                )
                              }
                              className="flex-shrink-0 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Youtube className="w-4 h-4" />
                            </Button>
                          )}
                        </div>

                        {/* Cluster Logging Fields */}
                        <div className="space-y-3">
                          <div
                            className={`text-sm font-semibold ${theme.text} mb-2`}
                          >
                            Log Performance
                          </div>
                          {clusterWeights.map((w, idx) => (
                            <div
                              key={idx}
                              className="rounded-xl p-3 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-700/50 border-2 border-blue-200 dark:border-blue-700"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div
                                  className={`text-sm font-bold ${theme.text}`}
                                >
                                  Cluster {idx + 1}
                                </div>
                                <div
                                  className={`text-xs ${theme.textSecondary}`}
                                >
                                  Reps:{" "}
                                  {Number(
                                    currentExercise?.meta?.cluster_reps,
                                  ) ||
                                    Number(currentExercise?.cluster_reps) ||
                                    1}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label
                                    className={`block text-xs font-medium ${theme.text} mb-1`}
                                  >
                                    Weight (kg)
                                  </label>
                                  <input
                                    type="number"
                                    value={w}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setClusterWeights((prev) => {
                                        const copy = [...prev];
                                        copy[idx] = val;
                                        // autofill subsequent clusters if editing first cluster
                                        if (idx === 0 && val) {
                                          for (
                                            let i = 1;
                                            i < copy.length;
                                            i++
                                          ) {
                                            copy[i] = val;
                                          }
                                        }
                                        // clear subsequent clusters if first cluster is cleared
                                        else if (idx === 0 && !val) {
                                          for (
                                            let i = 1;
                                            i < copy.length;
                                            i++
                                          ) {
                                            copy[i] = "";
                                          }
                                        }
                                        return copy;
                                      });
                                    }}
                                    className={`w-full h-10 text-center text-sm rounded-lg border-2 border-[color:var(--fc-domain-workouts)] fc-glass-soft ${theme.text} font-semibold focus:outline-none focus:border-[color:var(--fc-domain-workouts)]`}
                                    step="0.5"
                                    placeholder={
                                      idx === 0 ? "Enter weight" : "Auto-filled"
                                    }
                                    readOnly={idx > 0}
                                  />
                                </div>
                                <div>
                                  <label
                                    className={`block text-xs font-medium ${theme.text} mb-1`}
                                  >
                                    Reps
                                  </label>
                                  <input
                                    type="number"
                                    value={
                                      Number(
                                        currentExercise?.meta?.cluster_reps,
                                      ) ||
                                      Number(currentExercise?.cluster_reps) ||
                                      1
                                    }
                                    readOnly
                                    className={`w-full h-10 text-center text-sm rounded-lg border-2 border-[color:var(--fc-glass-border)] fc-glass-soft ${theme.text} font-semibold`}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Timer Button */}
                        <div className="flex justify-center mt-6 mb-4">
                          <Button
                            onClick={() => setShowClusterTimer(true)}
                            className="w-full fc-btn fc-btn-primary px-6 py-3 rounded-xl font-semibold"
                          >
                            <Clock className="w-4 h-4 mr-2" />
                            Start Rest Timer
                          </Button>
                        </div>

                        {/* Previous Performance Card */}
                        <div className="mt-4">
                          <PreviousPerformanceCard previousPerformance={previousPerformance} theme={theme} />
                        </div>

                        {/* Log Button */}
                        <div className="mt-4">
                          <Button
                            onClick={() => {
                              // TODO: Implement cluster set completion logic
                              console.log(
                                "Logging cluster set:",
                                clusterWeights,
                              );
                            }}
                            className="w-full fc-btn fc-btn-primary rounded-xl py-6 text-lg font-bold"
                            disabled={clusterWeights.some(
                              (w) => !w || w === "0",
                            )}
                          >
                            <Check className="w-5 h-5 mr-2" /> Log Cluster Set
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rest-Pause Flow */}
                  {currentType === "rest_pause" && (
                    <div className="fc-surface rounded-2xl p-6 border-2 border-[color:var(--fc-status-success)]">
                      <div>
                        {/* Header */}
                        <div
                          className="flex items-center"
                          style={{ gap: "12px", marginBottom: "16px" }}
                        >
                          <div className="w-14 h-14 rounded-[18px] bg-[color:var(--fc-status-success)] flex items-center justify-center">
                            <Dumbbell className="w-8 h-8 text-white" />
                          </div>
                          <div>
                            <div className="text-xl font-bold fc-text-primary">
                              Rest Pause Set
                            </div>
                            <div className="text-sm fc-text-dim">
                              Main set + mini-sets with rest periods
                            </div>
                          </div>
                        </div>

                        {/* Summary Info */}
                        <div className="grid grid-cols-3 gap-3 mb-4">
                          <div className="rounded-xl p-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-700">
                            <div
                              className={`text-xs ${theme.textSecondary} mb-1`}
                            >
                              Main Set
                            </div>
                            <div className={`text-lg font-bold ${theme.text}`}>
                              1
                            </div>
                          </div>
                          <div className="rounded-xl p-3 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-700">
                            <div
                              className={`text-xs ${theme.textSecondary} mb-1`}
                            >
                              Mini-sets
                            </div>
                            <div className={`text-lg font-bold ${theme.text}`}>
                              {restPauseExtraReps.length}
                            </div>
                          </div>
                          <div className="rounded-xl p-3 bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 border-2 border-green-200 dark:border-green-700">
                            <div
                              className={`text-xs ${theme.textSecondary} mb-1`}
                            >
                              Rest (s)
                            </div>
                            <div className={`text-lg font-bold ${theme.text}`}>
                              {Number(
                                currentExercise?.meta?.rest_pause_duration,
                              ) ||
                                Number(currentExercise?.rest_pause_duration) ||
                                0}
                            </div>
                          </div>
                        </div>

                        {/* Exercise Info */}
                        <div className="flex items-start gap-3 mb-4">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-teal-400 to-cyan-500">
                            <Dumbbell className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div
                                className={`font-bold ${theme.text} text-lg`}
                              >
                                {currentExercise.exercise?.name || "Exercise"}
                              </div>
                              {/* Utility Icon Buttons */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowPlateCalculator(true)}
                                className="h-6 w-6 p-0 hover:bg-[color:var(--fc-glass-highlight)]"
                              >
                                <Calculator className="w-3.5 h-3.5 fc-text-dim" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setShowExerciseAlternatives(true)
                                }
                                className="h-6 w-6 p-0 hover:bg-[color:var(--fc-glass-highlight)]"
                              >
                                <RefreshCw className="w-3.5 h-3.5 fc-text-dim" />
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2.5">
                              {(currentExercise?.reps != null ||
                                currentExercise?.meta?.rest_pause_reps != null) && (
                                <div className="px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700 inline-block">
                                  <span
                                    className={`text-sm font-bold ${theme.text}`}
                                  >
                                    {String(
                                      currentExercise?.reps ??
                                        currentExercise?.meta
                                          ?.rest_pause_reps ??
                                        ""
                                    )}{" "}
                                    reps
                                  </span>
                                </div>
                              )}
                              {(currentExercise?.rir ||
                                currentExercise?.rir === 0) && (
                                <div className="px-2 py-1 rounded bg-orange-100 dark:bg-orange-900/40 border border-orange-300 dark:border-orange-700">
                                  <span
                                    className={`text-xs font-semibold ${theme.text}`}
                                  >
                                    RPE: {Number(currentExercise.rir)}
                                  </span>
                                </div>
                              )}
                              {currentExercise?.tempo != null && currentExercise.tempo !== "" && (
                                <div className="px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/40 border border-purple-300 dark:border-purple-700">
                                  <span
                                    className={`text-xs font-semibold ${theme.text}`}
                                  >
                                    Tempo: {String(currentExercise.tempo)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          {currentExercise.exercise?.video_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openVideoModal(
                                  currentExercise.exercise?.video_url || "",
                                )
                              }
                              className="flex-shrink-0 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Youtube className="w-4 h-4" />
                            </Button>
                          )}
                        </div>

                        {/* Main Set Logging */}
                        <div className="space-y-3 mb-4">
                          <div
                            className={`text-sm font-semibold ${theme.text} mb-2`}
                          >
                            Main Set
                          </div>
                          <div className="rounded-xl p-4 bg-[color:var(--fc-glass-highlight)] border-2 border-[color:var(--fc-accent-cyan)]">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label
                                  className={`block text-sm font-medium ${theme.text} mb-1`}
                                >
                                  Weight (kg)
                                </label>
                                <input
                                  type="number"
                                  value={
                                    currentSetData.weight === 0
                                      ? ""
                                      : currentSetData.weight
                                  }
                                  onChange={(e) =>
                                    setCurrentSetData((prev) => ({
                                      ...prev,
                                      weight: parseFloat(e.target.value) || 0,
                                    }))
                                  }
                                  className={`w-full h-12 text-center text-lg rounded-xl border-2 border-[color:var(--fc-domain-workouts)] fc-glass-soft ${theme.text} font-semibold focus:outline-none focus:border-[color:var(--fc-domain-workouts)]`}
                                  step="0.5"
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <label
                                  className={`block text-sm font-medium ${theme.text} mb-1`}
                                >
                                  Reps
                                </label>
                                <input
                                  type="number"
                                  value={
                                    currentSetData.reps === 0
                                      ? ""
                                      : currentSetData.reps
                                  }
                                  onChange={(e) =>
                                    setCurrentSetData((prev) => ({
                                      ...prev,
                                      reps: parseInt(e.target.value) || 0,
                                    }))
                                  }
                                  className={`w-full h-12 text-center text-lg rounded-xl border-2 border-[color:var(--fc-domain-workouts)] fc-glass-soft ${theme.text} font-semibold focus:outline-none focus:border-[color:var(--fc-domain-workouts)]`}
                                  placeholder="0"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Mini-sets Logging */}
                        {restPauseExtraReps.length > 0 && (
                          <div className="space-y-3 mb-4">
                            <div
                              className={`text-sm font-semibold ${theme.text} mb-2`}
                            >
                              Mini-sets
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {restPauseExtraReps.map((r, idx) => (
                                <div
                                  key={idx}
                                  className="rounded-xl p-3 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-700/50 border-2 border-blue-200 dark:border-blue-700"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div
                                      className={`text-sm font-bold ${theme.text}`}
                                    >
                                      Mini-set {idx + 1}
                                    </div>
                                    <div
                                      className={`text-sm font-bold ${theme.text}`}
                                    >
                                      {currentSetData.weight || 0}kg
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label
                                        className={`block text-xs font-medium ${theme.text} mb-1`}
                                      >
                                        Reps
                                      </label>
                                      <input
                                        type="number"
                                        value={r}
                                        onChange={(e) =>
                                          setRestPauseExtraReps((prev) =>
                                            prev.map((x, i) =>
                                              i === idx ? e.target.value : x,
                                            ),
                                          )
                                        }
                                        className={`w-full h-10 text-center text-sm rounded-lg border-2 border-[color:var(--fc-domain-workouts)] fc-glass-soft ${theme.text} font-semibold focus:outline-none focus:border-[color:var(--fc-domain-workouts)]`}
                                        placeholder="0"
                                      />
                                    </div>
                                    <div>
                                      <label
                                        className={`block text-xs font-medium ${theme.text} mb-1`}
                                      >
                                        Rest (s)
                                      </label>
                                      <input
                                        type="number"
                                        value={
                                          Number(
                                            currentExercise?.meta
                                              ?.rest_pause_duration,
                                          ) ||
                                          Number(
                                            currentExercise?.rest_pause_duration,
                                          ) ||
                                          0
                                        }
                                        readOnly
                                        className={`w-full h-10 text-center text-sm rounded-lg border-2 border-[color:var(--fc-glass-border)] fc-glass-soft ${theme.text} font-semibold`}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Previous Performance Card */}
                        <div className="mt-4">
                          <PreviousPerformanceCard previousPerformance={previousPerformance} theme={theme} />
                        </div>

                        {/* Log Button */}
                        <div className="mt-4">
                          <Button
                            onClick={() => {
                              // TODO: Implement rest pause completion logic
                              console.log("Logging rest pause set:", {
                                mainSet: currentSetData,
                                miniSets: restPauseExtraReps,
                              });
                            }}
                            className="w-full fc-btn fc-btn-primary rounded-xl py-6 text-lg font-bold"
                            disabled={
                              currentSetData.weight <= 0 ||
                              currentSetData.reps <= 0
                            }
                          >
                            <Check className="w-5 h-5 mr-2" /> Log Rest Pause
                            Set
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* For Time Flow */}
                  {currentType === "for_time" && (
                    <div className="fc-surface rounded-2xl p-6 border-2 border-[color:var(--fc-status-warning)]">
                      <div>
                        {!forTimeActive && forTimeCompletionSecs == null ? (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "16px",
                            }}
                          >
                            {/* Exercise Details Header */}
                            <div
                              className="flex items-center"
                              style={{ gap: "12px" }}
                            >
                              <div className="w-14 h-14 rounded-[18px] bg-[color:var(--fc-status-warning)] flex items-center justify-center">
                                <Trophy className="w-8 h-8 text-white" />
                              </div>
                              <div>
                                <div className="text-xl font-bold fc-text-primary">
                                  For Time Details
                                </div>
                                <div
                                  className="text-sm fc-text-dim"
                                >
                                  Complete target reps as fast as possible
                                </div>
                              </div>
                            </div>

                            {/* Summary Info */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="rounded-xl p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-200 dark:border-amber-700">
                                <div
                                  className={`text-sm ${theme.textSecondary} mb-1`}
                                >
                                  Time Cap
                                </div>
                                <div
                                  className={`text-2xl font-bold ${theme.text}`}
                                >
                                  {Number(
                                    currentExercise?.meta?.time_cap ??
                                      currentExercise?.time_cap ??
                                      10
                                  )}{" "}
                                  min
                                </div>
                              </div>
                              <div className="rounded-xl p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-700">
                                <div
                                  className={`text-sm ${theme.textSecondary} mb-1`}
                                >
                                  Target Reps
                                </div>
                                <div
                                  className={`text-2xl font-bold ${theme.text}`}
                                >
                                  {String(
                                    currentExercise?.meta?.target_reps ??
                                      currentExercise?.target_reps ??
                                      currentExercise?.reps ??
                                      "-"
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Start Button */}
                            <Button
                              onClick={() => {
                                const capMin =
                                  Number(currentExercise?.meta?.time_cap) ||
                                  Number(currentExercise?.time_cap) ||
                                  10;
                                setForTimeTimeLeft(capMin * 60);
                                setForTimeCompletionSecs(null);
                                setForTimeActive(true);
                                setForTimeStopped(false);
                              }}
                              className="w-full fc-btn fc-btn-primary rounded-xl py-6 text-lg font-bold"
                            >
                              <Clock className="w-5 h-5 mr-2" /> Start For Time
                            </Button>
                          </div>
                        ) : forTimeActive ? (
                          <div className="flex flex-col items-center justify-center py-8">
                            <div className="text-5xl font-bold text-amber-700 dark:text-amber-300">
                              {Math.floor(forTimeTimeLeft / 60)
                                .toString()
                                .padStart(2, "0")}
                              :
                              {(forTimeTimeLeft % 60)
                                .toString()
                                .padStart(2, "0")}
                            </div>
                            <div className="mt-2 fc-text-dim">
                              Time Remaining
                            </div>
                            <Button
                              onClick={() => {
                                const capMin =
                                  Number(currentExercise?.meta?.time_cap) ||
                                  Number(currentExercise?.time_cap) ||
                                  10;
                                const elapsed = capMin * 60 - forTimeTimeLeft;
                                setForTimeCompletionSecs(elapsed);
                                setForTimeActive(false);
                                setForTimeStopped(true);
                              }}
                              variant="outline"
                              className="mt-4"
                            >
                              Stop
                            </Button>
                          </div>
                        ) : forTimeStopped && forTimeCompletionSecs != null ? (
                          <div className="space-y-6">
                            {/* Completion Time Display */}
                            <div className="flex flex-col items-center justify-center py-4">
                              <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300 mb-2">
                                {Math.floor(forTimeCompletionSecs / 60)
                                  .toString()
                                  .padStart(2, "0")}
                                :
                                {(forTimeCompletionSecs % 60)
                                  .toString()
                                  .padStart(2, "0")}
                              </div>
                              <div className="text-sm fc-text-dim">
                                Completion Time
                              </div>
                            </div>

                            {/* Weight and Reps Inputs */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-semibold fc-text-dim mb-2">
                                  Weight (kg)
                                </label>
                                <input
                                  type="number"
                                  value={
                                    currentSetData.weight === 0
                                      ? ""
                                      : currentSetData.weight
                                  }
                                  onChange={(e) =>
                                    setCurrentSetData((prev) => ({
                                      ...prev,
                                      weight: parseFloat(e.target.value) || 0,
                                    }))
                                  }
                                  className="w-full h-12 text-center text-lg font-bold rounded-xl border-2 border-blue-300 dark:border-indigo-700 fc-surface fc-text-primary focus:outline-none focus:border-[color:var(--fc-domain-workouts)] dark:focus:border-indigo-500"
                                  step="0.5"
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold fc-text-dim mb-2">
                                  Reps
                                </label>
                                <input
                                  type="number"
                                  value={
                                    currentSetData.reps === 0
                                      ? ""
                                      : currentSetData.reps
                                  }
                                  onChange={(e) =>
                                    setCurrentSetData((prev) => ({
                                      ...prev,
                                      reps: parseInt(e.target.value) || 0,
                                    }))
                                  }
                                  className="w-full h-12 text-center text-lg font-bold rounded-xl border-2 border-blue-300 dark:border-indigo-700 fc-surface fc-text-primary focus:outline-none focus:border-[color:var(--fc-domain-workouts)] dark:focus:border-indigo-500"
                                  placeholder="0"
                                />
                              </div>
                            </div>

                            {/* Complete Set Button */}
                            <Button
                              onClick={completeSet}
                              disabled={
                                currentSetData.weight <= 0 ||
                                currentSetData.reps <= 0 ||
                                isLoggingSet
                              }
                              className="w-full bg-[var(--fc-status-success)] hover:brightness-110 text-white rounded-xl py-6 text-lg font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Check className="w-5 h-5 mr-2" /> Complete Set
                            </Button>
                          </div>
                        ) : (
                          <div className="p-3 bg-[color:var(--fc-glass-highlight)] rounded-xl border border-[color:var(--fc-glass-border)]">
                            <div className="text-sm fc-text-dim">
                              Completion time recorded: {forTimeCompletionSecs}s
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Superset / Pre-Exhaustion Flow */}
                  {(currentType === "superset" ||
                    currentType === "pre_exhaustion") && (
                    <div className="fc-surface rounded-2xl p-6 border-2 border-[color:var(--fc-status-error)]">
                      <div>
                        {/* Header */}
                        <div
                          className="flex items-center justify-between"
                          style={{ marginBottom: "16px" }}
                        >
                          <div
                            className="flex items-center"
                            style={{ gap: "12px" }}
                          >
                            <div className="text-xl font-bold fc-text-primary">
                              {currentType === "superset"
                                ? "Superset"
                                : "Pre-Exhaustion"}
                            </div>
                            {(currentExercise?.rest_seconds != null ||
                              currentExercise?.meta?.rest_seconds != null) && (
                              <div className="px-2 py-1 rounded bg-green-100 dark:bg-green-900/40 border border-green-300 dark:border-green-700">
                                <span
                                  className={`text-xs font-semibold ${theme.text}`}
                                >
                                  Rest:{" "}
                                  {Number(
                                    currentExercise?.rest_seconds ??
                                      currentExercise?.meta?.rest_seconds ??
                                      0
                                  )}
                                  s
                                </span>
                              </div>
                            )}
                          </div>
                          <div className={`text-xs ${theme.textSecondary}`}>
                            Set {currentSet} of {currentExercise?.sets || 1}
                          </div>
                        </div>

                        {/* Exercise Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Exercise A */}
                          <div className="rounded-2xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-xl">
                            <div
                              className="p-4 fc-surface rounded-2xl space-y-3"
                            >
                              {/* Exercise Header */}
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-purple-400 to-indigo-500">
                                  <span className="text-white font-bold text-sm">
                                    1
                                  </span>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`font-bold ${theme.text} text-base`}
                                    >
                                      {currentExercise?.exercise?.name ||
                                        "First Exercise"}
                                    </div>
                                    {/* Utility Icon Buttons */}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        setShowPlateCalculator(true)
                                      }
                                      className="h-6 w-6 p-0 hover:bg-[color:var(--fc-glass-highlight)]"
                                    >
                                      <Calculator className="w-3.5 h-3.5 fc-text-dim" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        setShowExerciseAlternatives(true)
                                      }
                                      className="h-6 w-6 p-0 hover:bg-[color:var(--fc-glass-highlight)]"
                                    >
                                      <RefreshCw className="w-3.5 h-3.5 fc-text-dim" />
                                    </Button>
                                  </div>
                                </div>
                                {currentExercise?.exercise?.video_url && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      openVideoModal(
                                        currentExercise.exercise?.video_url ||
                                          "",
                                      )
                                    }
                                    className="flex-shrink-0 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  >
                                    <Youtube className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>

                              {/* Exercise Details */}
                              <div className="flex flex-wrap gap-2">
                                {(currentExercise?.meta?.superset_reps_a ||
                                  currentExercise?.reps) && (
                                  <div className="px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700 inline-block">
                                    <span
                                      className={`text-sm font-bold ${theme.text}`}
                                    >
                                      {String(
                                        currentExercise?.meta?.superset_reps_a ??
                                          currentExercise?.reps ??
                                        ""
                                      )}{" "}
                                      reps
                                    </span>
                                  </div>
                                )}
                                {(currentExercise?.rir ||
                                  currentExercise?.rir === 0) && (
                                  <div className="px-2 py-1 rounded bg-orange-100 dark:bg-orange-900/40 border border-orange-300 dark:border-orange-700">
                                    <span
                                      className={`text-xs font-semibold ${theme.text}`}
                                    >
                                      RPE: {Number(currentExercise.rir)}
                                    </span>
                                  </div>
                                )}
                                {currentExercise?.tempo != null && currentExercise.tempo !== "" && (
                                  <div className="px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/40 border border-purple-300 dark:border-purple-700">
                                    <span
                                      className={`text-xs font-semibold ${theme.text}`}
                                    >
                                      Tempo: {String(currentExercise.tempo)}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Logging Fields */}
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label
                                    className={`block text-sm font-medium ${theme.text} mb-1`}
                                  >
                                    Weight (kg)
                                  </label>
                                  <input
                                    type="number"
                                    value={supersetAWeight}
                                    onChange={(e) =>
                                      setSupersetAWeight(e.target.value)
                                    }
                                    className={`w-full h-12 text-center text-lg rounded-xl border-2 border-[color:var(--fc-domain-workouts)] fc-glass-soft ${theme.text} font-semibold focus:outline-none focus:border-[color:var(--fc-domain-workouts)]`}
                                    step="0.5"
                                    placeholder="0"
                                  />
                                </div>
                                <div>
                                  <label
                                    className={`block text-sm font-medium ${theme.text} mb-1`}
                                  >
                                    Reps
                                  </label>
                                  <input
                                    type="number"
                                    value={supersetAReps}
                                    onChange={(e) =>
                                      setSupersetAReps(e.target.value)
                                    }
                                    className={`w-full h-12 text-center text-lg rounded-xl border-2 border-[color:var(--fc-domain-workouts)] fc-glass-soft ${theme.text} font-semibold focus:outline-none focus:border-[color:var(--fc-domain-workouts)]`}
                                    placeholder="0"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Exercise B */}
                          <div className="rounded-2xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-xl">
                            <div
                              className="p-4 fc-surface rounded-2xl space-y-3"
                            >
                              {/* Exercise Header */}
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-purple-400 to-indigo-500">
                                  <span className="text-white font-bold text-sm">
                                    2
                                  </span>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`font-bold ${theme.text} text-base`}
                                    >
                                      {(() => {
                                        const exerciseId =
                                          currentExercise?.meta
                                            ?.superset_exercise_id ??
                                          currentExercise?.superset_exercise_id;
                                        const exerciseInfo =
                                          exerciseId != null && exerciseId !== ""
                                            ? exerciseLookup[String(exerciseId)]
                                            : undefined;
                                        return (
                                          exerciseInfo?.name ||
                                          "Second Exercise"
                                        );
                                      })()}
                                    </div>
                                    {/* Utility Icon Buttons */}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        setShowPlateCalculator(true)
                                      }
                                      className="h-6 w-6 p-0 hover:bg-[color:var(--fc-glass-highlight)]"
                                    >
                                      <Calculator className="w-3.5 h-3.5 fc-text-dim" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        setShowExerciseAlternatives(true)
                                      }
                                      className="h-6 w-6 p-0 hover:bg-[color:var(--fc-glass-highlight)]"
                                    >
                                      <RefreshCw className="w-3.5 h-3.5 fc-text-dim" />
                                    </Button>
                                  </div>
                                </div>
                                {(() => {
                                  const exerciseId =
                                    currentExercise?.meta
                                      ?.superset_exercise_id ??
                                    currentExercise?.superset_exercise_id;
                                  const exerciseInfo =
                                    exerciseId != null && exerciseId !== ""
                                      ? exerciseLookup[String(exerciseId)]
                                      : undefined;
                                  const video = exerciseInfo?.video_url;
                                  return (
                                    video && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openVideoModal(video)}
                                        className="flex-shrink-0 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                      >
                                        <Youtube className="w-4 h-4" />
                                      </Button>
                                    )
                                  );
                                })()}
                              </div>

                              {/* Exercise Details */}
                              <div className="flex flex-wrap gap-2">
                                {(currentExercise?.meta?.superset_reps_b ||
                                  currentExercise?.meta?.superset_reps ||
                                  currentExercise?.superset_reps ||
                                  currentExercise?.reps) && (
                                  <div className="px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700 inline-block">
                                    <span
                                      className={`text-sm font-bold ${theme.text}`}
                                    >
                                      {String(
                                        currentExercise?.meta?.superset_reps_b ??
                                          currentExercise?.meta?.superset_reps ??
                                          currentExercise?.superset_reps ??
                                          currentExercise?.reps ??
                                          ""
                                      )}{" "}
                                      reps
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Logging Fields */}
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label
                                    className={`block text-sm font-medium ${theme.text} mb-1`}
                                  >
                                    Weight (kg)
                                  </label>
                                  <input
                                    type="number"
                                    value={supersetBWeight}
                                    onChange={(e) =>
                                      setSupersetBWeight(e.target.value)
                                    }
                                    className={`w-full h-12 text-center text-lg rounded-xl border-2 border-[color:var(--fc-domain-workouts)] fc-glass-soft ${theme.text} font-semibold focus:outline-none focus:border-[color:var(--fc-domain-workouts)]`}
                                    step="0.5"
                                    placeholder="0"
                                  />
                                </div>
                                <div>
                                  <label
                                    className={`block text-sm font-medium ${theme.text} mb-1`}
                                  >
                                    Reps
                                  </label>
                                  <input
                                    type="number"
                                    value={supersetBReps}
                                    onChange={(e) =>
                                      setSupersetBReps(e.target.value)
                                    }
                                    className={`w-full h-12 text-center text-lg rounded-xl border-2 border-[color:var(--fc-domain-workouts)] fc-glass-soft ${theme.text} font-semibold focus:outline-none focus:border-[color:var(--fc-domain-workouts)]`}
                                    placeholder="0"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Previous Performance Card */}
                        <div style={{ marginTop: "24px" }}>
                          <PreviousPerformanceCard previousPerformance={previousPerformance} theme={theme} />
                        </div>

                        {/* Log Button */}
                        <Button
                          onClick={completeSuperset}
                          className="w-full py-4 px-8 rounded-2xl bg-[color:var(--fc-status-success)] text-white font-semibold shadow-[0_2px_4px_rgba(0,0,0,0.1)] border-none mt-6"
                            style={{
                              cursor: isLoggingSet ? "not-allowed" : "pointer",
                              opacity: isLoggingSet ? 0.5 : 1,
                            }}
                          disabled={isLoggingSet}
                        >
                          <Check className="w-5 h-5 mr-2" /> Log{" "}
                          {currentType === "superset"
                            ? "Superset"
                            : "Pre-Exhaustion"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Giant Set Flow */}
                  {currentType === "giant_set" && (
                    <div className="fc-surface rounded-2xl p-6 border-2 border-[color:var(--fc-accent-primary)] relative z-20">
                      <div>
                        <div
                          className="flex items-center justify-between"
                          style={{ marginBottom: "16px" }}
                        >
                          <div
                            className={`text-base sm:text-xl font-bold ${theme.text}`}
                          >
                            Giant Set
                          </div>
                          <div className={`text-xs ${theme.textSecondary}`}>
                            Set {currentSet} of {currentExercise?.sets || 1}
                          </div>
                        </div>
                        {(
                          (currentExercise?.meta?.giant_set_exercises ||
                            currentExercise?.giant_set_exercises ||
                            []) as any[]
                        ).map((item: any, idx: number) => {
                          const resolved = item.exercise_id
                            ? exerciseLookup[item.exercise_id]
                            : undefined;
                          const displayName =
                            resolved?.name ||
                            item.name ||
                            `Exercise ${idx + 1}`;
                          const video = resolved?.video_url || item.video_url;
                          return (
                            <div
                              key={idx}
                              className="rounded-2xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-xl"
                            >
                              <div
                                className="p-4 fc-surface rounded-2xl space-y-3"
                              >
                                {/* Header: name + video + number badge */}
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-orange-400 to-red-500">
                                    <span className="text-white font-bold text-sm">
                                      {idx + 1}
                                    </span>
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <div className="text-base sm:text-lg font-bold fc-text-primary">
                                        {displayName}
                                      </div>
                                      {/* Utility Icon Buttons */}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          setShowPlateCalculator(true)
                                        }
                                        className="h-6 w-6 p-0 hover:bg-[color:var(--fc-glass-highlight)]"
                                      >
                                        <Calculator className="w-3.5 h-3.5 fc-text-dim" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          setShowExerciseAlternatives(true)
                                        }
                                        className="h-6 w-6 p-0 hover:bg-[color:var(--fc-glass-highlight)]"
                                      >
                                        <RefreshCw className="w-3.5 h-3.5 fc-text-dim" />
                                      </Button>
                                    </div>
                                  </div>
                                  {video && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openVideoModal(video)}
                                      className="flex-shrink-0 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                      <Youtube className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>

                                {/* Exercise Details - Reps */}
                                {item.reps && (
                                  <div className="px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700 inline-block">
                                    <span
                                      className={`text-sm font-bold ${theme.text}`}
                                    >
                                      {item.reps} reps
                                    </span>
                                  </div>
                                )}

                                {/* Input Fields */}
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label
                                      className={`block text-sm font-medium fc-text-primary mb-1`}
                                    >
                                      Weight (kg)
                                    </label>
                                    <input
                                      type="number"
                                      value={giantWeights[idx] || ""}
                                      onChange={(e) =>
                                        setGiantWeights((prev) =>
                                          prev.map((w, i) =>
                                            i === idx ? e.target.value : w,
                                          ),
                                        )
                                      }
                                      className={`w-full h-12 text-center text-lg rounded-xl border-2 border-blue-300 dark:border-indigo-700 fc-surface fc-text-primary font-semibold focus:outline-none focus:border-[color:var(--fc-domain-workouts)] dark:focus:border-indigo-500`}
                                      step="0.5"
                                    />
                                  </div>
                                  <div>
                                    <label
                                      className={`block text-sm font-medium fc-text-primary mb-1`}
                                    >
                                      Reps
                                    </label>
                                    <input
                                      type="number"
                                      value={giantReps[idx] || ""}
                                      readOnly
                                      className={`w-full h-12 text-center text-lg rounded-xl border-2 border-blue-300 dark:border-indigo-700 fc-surface fc-text-primary font-semibold`}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Previous Performance Card */}
                        <div style={{ marginTop: "24px" }}>
                          <PreviousPerformanceCard previousPerformance={previousPerformance} theme={theme} />
                        </div>

                        <Button
                          onClick={completeGiantSet}
                          className="w-full py-4 px-8 rounded-2xl bg-[color:var(--fc-status-success)] text-white font-semibold shadow-[0_2px_4px_rgba(0,0,0,0.1)] border-none mt-6"
                            style={{
                              cursor: isLoggingSet ? "not-allowed" : "pointer",
                              opacity: isLoggingSet ? 0.5 : 1,
                            }}
                          disabled={isLoggingSet}
                        >
                          Log Giant Set
                        </Button>
                      </div>
                    </div>
                  )}
                  {/* Standard Exercise Types - Modern Style */}
                  {currentType !== "giant_set" &&
                    currentType !== "tabata" &&
                    currentType !== "amrap" &&
                    currentType !== "emom" &&
                    currentType !== "for_time" &&
                    currentType !== "superset" &&
                    currentType !== "pre_exhaustion" &&
                    currentType !== "cluster_set" &&
                    currentType !== "rest_pause" && (
                      <div className="fc-surface rounded-2xl p-6 border-2 border-[color:var(--fc-accent-cyan)]">
                        <div>
                          {/* Header */}
                          <div
                            className="flex items-center justify-between"
                            style={{ marginBottom: "16px" }}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`text-base sm:text-xl font-bold ${theme.text}`}
                              >
                                {currentType === "straight_set"
                                  ? "Straight Set"
                                  : currentType === "drop_set"
                                    ? "Drop Set"
                                    : currentType === "cluster_set"
                                      ? "Cluster Set"
                                      : currentType === "rest_pause"
                                        ? "Rest Pause"
                                        : "Exercise"}
                              </div>
                              {currentExercise?.rest_seconds && (
                                <div className="px-2 py-1 rounded bg-green-100 dark:bg-green-900/40 border border-green-300 dark:border-green-700">
                                  <span
                                    className={`text-xs font-semibold ${theme.text}`}
                                  >
                                    Rest: {currentExercise.rest_seconds}s
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="px-3 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700">
                              <span
                                className={`text-sm font-bold ${theme.text}`}
                              >
                                Set {currentSet} of {currentExercise?.sets || 1}
                              </span>
                            </div>
                          </div>

                          {/* Exercise Name and Actions */}
                          <div
                            className="flex items-start"
                            style={{ gap: "12px", marginBottom: "16px" }}
                          >
                            <div
                              style={{
                                width: "56px",
                                height: "56px",
                                borderRadius: "18px",
                                background: "var(--fc-accent-primary)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              <Dumbbell
                                className="w-8 h-8 text-white"
                              />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="text-xl font-bold fc-text-primary">
                                  {currentExercise.exercise?.name || "Exercise"}
                                </div>
                                {/* Utility Icon Buttons */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setShowPlateCalculator(true)}
                                  className="h-6 w-6 p-0 hover:bg-[color:var(--fc-glass-highlight)]"
                                >
                                  <Calculator className="w-3.5 h-3.5 fc-text-dim" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setShowExerciseAlternatives(true)
                                  }
                                  className="h-6 w-6 p-0 hover:bg-[color:var(--fc-glass-highlight)]"
                                >
                                  <RefreshCw className="w-3.5 h-3.5 fc-text-dim" />
                                </Button>
                              </div>
                              <div
                                className="flex flex-wrap"
                                style={{ gap: "8px" }}
                              >
                                {targetReps && (
                                  <div className="inline-block rounded-xl px-3 py-1.5 bg-[color:var(--fc-accent-primary)]/20">
                                    <span className="text-sm font-semibold text-[color:var(--fc-accent-primary)]">
                                      {targetReps} reps
                                    </span>
                                  </div>
                                )}
                                {(currentExercise?.rir ||
                                  currentExercise?.rir === 0) && (
                                  <div className="inline-block rounded-xl px-3 py-1.5 bg-[color:var(--fc-status-warning)]/20">
                                    <span className="text-sm font-semibold text-[color:var(--fc-status-warning)]">
                                      RPE: {Number(currentExercise.rir)}
                                    </span>
                                  </div>
                                )}
                                {currentExercise?.exercise_id != null &&
                                  currentExercise?.load_percentage != null &&
                                  (() => {
                                    const text = getSuggestedWeightText(
                                      currentExercise.exercise_id,
                                      Number(currentExercise.load_percentage ?? 0),
                                    );
                                    return text ? (
                                      <div className="inline-block rounded-xl px-3 py-1.5 bg-[color:var(--fc-status-success)]/20">
                                        <span className="text-sm font-semibold text-[color:var(--fc-status-success)]">
                                          {String(text)}
                                        </span>
                                      </div>
                                    ) : null;
                                  })()}
                                {currentExercise?.tempo != null && currentExercise.tempo !== "" && (
                                  <div className="inline-block rounded-xl px-3 py-1.5 bg-[color:var(--fc-accent-cyan)]/20">
                                    <span className="text-sm font-semibold text-[color:var(--fc-accent-cyan)]">
                                      Tempo: {String(currentExercise.tempo)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            {currentExercise.exercise?.video_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  openVideoModal(
                                    currentExercise.exercise?.video_url || "",
                                  )
                                }
                                className="flex-shrink-0 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <Youtube className="w-4 h-4" />
                              </Button>
                            )}
                          </div>

                          {/* Logging Fields */}
                          <div
                            className="grid grid-cols-2 gap-4 pt-4 border-t border-[color:var(--fc-glass-border)]"
                          >
                            <div>
                              <label className="block text-sm font-semibold fc-text-dim mb-2">
                                {currentType === "drop_set"
                                  ? "Working Weight (kg)"
                                  : "Weight (kg)"}
                              </label>
                              <input
                                type="number"
                                value={
                                  currentSetData.weight === 0
                                    ? ""
                                    : currentSetData.weight
                                }
                                onChange={(e) =>
                                  setCurrentSetData((prev) => ({
                                    ...prev,
                                    weight: parseFloat(e.target.value) || 0,
                                  }))
                                }
                                className="w-full h-14 text-center text-lg font-bold rounded-2xl border-2 border-[color:var(--fc-accent-cyan)] fc-surface fc-text-primary focus:outline-none"
                                style={{ width: "100%", height: "56px", textAlign: "center" as const }}
                                step="0.5"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold fc-text-dim mb-2">
                                Reps
                              </label>
                              <input
                                type="number"
                                value={
                                  currentSetData.reps === 0
                                    ? ""
                                    : currentSetData.reps
                                }
                                onChange={(e) =>
                                  setCurrentSetData((prev) => ({
                                    ...prev,
                                    reps: parseInt(e.target.value) || 0,
                                  }))
                                }
                                className="w-full h-14 text-center text-lg font-bold rounded-2xl border-2 border-[color:var(--fc-accent-cyan)] fc-surface fc-text-primary focus:outline-none"
                                style={{ width: "100%", height: "56px", textAlign: "center" as const }}
                                placeholder="0"
                              />
                            </div>
                          </div>

                          {/* Drop Set - Second Set Fields */}
                          {currentType === "drop_set" && (
                            <div className="mt-3 pt-3 border-t border-[color:var(--fc-glass-border)]">
                              <div className="flex items-center gap-2 mb-2">
                                <Calculator className="w-3 h-3 text-orange-500" />
                                <span className="text-xs font-medium fc-text-dim">
                                  Drop Set (Second Set)
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-xs fc-text-dim mb-1">
                                    Drop Weight (kg)
                                  </label>
                                  <input
                                    type="number"
                                    value={dropWeight === "" ? "" : dropWeight}
                                    onChange={(e) =>
                                      setDropWeight(e.target.value)
                                    }
                                    className="w-full h-8 text-center text-sm rounded-lg border border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20 fc-text-dim"
                                    step="0.5"
                                    placeholder={
                                      currentSetData.weight > 0
                                        ? (
                                            currentSetData.weight *
                                            (1 -
                                              (Number(
                                                currentExercise?.meta
                                                  ?.drop_percentage,
                                              ) ||
                                                Number(
                                                  currentExercise?.drop_percentage,
                                                ) ||
                                                0) /
                                                100)
                                          ).toFixed(1)
                                        : "Auto"
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs fc-text-dim mb-1">
                                    Reps
                                  </label>
                                  <input
                                    type="number"
                                    value={dropReps === 0 ? "" : dropReps}
                                    onChange={(e) =>
                                      setDropReps(parseInt(e.target.value) || 0)
                                    }
                                    className="w-full h-8 text-center text-sm rounded-lg border border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20 fc-text-dim"
                                    placeholder="0"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Previous Performance Card */}
                          <div style={{ marginTop: "24px" }}>
                            <PreviousPerformanceCard previousPerformance={previousPerformance} theme={theme} />
                          </div>

                          {/* Log Button */}
                          <Button
                            onClick={completeSet}
                            className="w-full min-h-[44px] py-4 px-8 rounded-2xl bg-[color:var(--fc-status-success)] text-white font-semibold shadow-[0_2px_4px_rgba(0,0,0,0.1)] border-none"
                            style={{
                              width: "100%",
                              cursor:
                                currentSetData.weight <= 0 ||
                                currentSetData.reps <= 0 ||
                                isLoggingSet
                                  ? "not-allowed"
                                  : "pointer",
                              opacity:
                                currentSetData.weight <= 0 ||
                                currentSetData.reps <= 0 ||
                                isLoggingSet
                                  ? 0.5
                                  : 1,
                              marginTop: "24px",
                            }}
                            disabled={
                              currentSetData.weight <= 0 ||
                              currentSetData.reps <= 0 ||
                              isLoggingSet
                            }
                          >
                            <Check className="w-5 h-5 mr-2" /> Log Set
                          </Button>
                        </div>
                      </div>
                    )}

                  {/* Simple Navigation */}
                  {exercises.length > 1 && (
                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        onClick={() =>
                          setCurrentExerciseIndex(
                            Math.max(0, currentExerciseIndex - 1),
                          )
                        }
                        disabled={currentExerciseIndex === 0}
                        className="flex-1 mr-2"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </Button>

                      <div className="text-center px-4">
                        <div className="text-sm fc-text-dim">Exercise</div>
                        <div className="text-lg font-bold">
                          {currentExerciseIndex + 1} / {exercises.length}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        onClick={() =>
                          setCurrentExerciseIndex(
                            Math.min(
                              exercises.length - 1,
                              currentExerciseIndex + 1,
                            ),
                          )
                        }
                        disabled={currentExerciseIndex === exercises.length - 1}
                        className="flex-1 ml-2"
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <ClientGlassCard className="p-12 text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-pink-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold fc-text-primary mb-3">
                    No exercises found
                  </h3>
                  <p className="fc-text-dim mb-6">
                    This workout doesn&apos;t have any exercises assigned.
                  </p>
                  <SecondaryButton
                    className="w-auto"
                    onClick={() => router.push("/client/train")}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Workouts
                  </SecondaryButton>
                </ClientGlassCard>
              )}

        {/* Full-Screen Timer Modal for Tabata */}
        {showTimerModal && currentType === "tabata" && (
            <div
              className={`fixed inset-0 z-[9999] transition-colors duration-500 ${
                intervalPhase === "work"
                  ? "bg-red-900/95"
                  : intervalPhase === "rest_after_set"
                    ? "bg-purple-900/95"
                    : "bg-blue-900/95"
              }`}
            >
              <div className="h-full flex flex-col items-center justify-center p-4">
                {/* Segment Counter */}
                <div className="absolute top-8 left-1/2 transform -translate-x-1/2">
                  <div className="bg-white/20 backdrop-blur-sm rounded-full px-6 py-2">
                    <span className="text-white font-semibold text-lg">
                      {(() => {
                        const raw =
                          (currentExercise?.meta?.tabata_sets ?? currentExercise?.meta?.circuit_sets) ?? [];
                        const circuitSets = Array.isArray(raw)
                          ? raw
                          : [];

                        // Calculate segments per round
                        let segmentsPerRound = 0;
                        circuitSets.forEach((set: any) => {
                          const exercisesInSet = set?.exercises?.length || 0;
                          // Each exercise has: work + rest
                          segmentsPerRound += exercisesInSet * 2;
                          // Each set (except the last one) has: rest_after_set
                          // Actually, every set except the last set of the last round has rest_after_set
                          // For counting purposes, we'll add it for all sets and subtract later if needed
                        });
                        // Add rest_after_set for each set
                        segmentsPerRound += circuitSets.length;

                        const totalSegments =
                          segmentsPerRound * intervalTotalRounds - 1; // -1 because last set of last round has no rest_after_set

                        // Calculate current segment
                        let currentSegment = intervalRound * segmentsPerRound;

                        // Add segments from completed sets in current round
                        for (let s = 0; s < timerSetIndex; s++) {
                          const exercisesInSet =
                            circuitSets[s]?.exercises?.length || 0;
                          currentSegment += exercisesInSet * 2 + 1; // work + rest per exercise + rest_after_set
                        }

                        // Add segments from current set
                        const currentSet = circuitSets[timerSetIndex];
                        const exercisesBeforeCurrent = timerExerciseIndex;
                        currentSegment += exercisesBeforeCurrent * 2; // work + rest for each completed exercise

                        // Add current phase
                        if (intervalPhase === "work") {
                          currentSegment += 1;
                        } else if (intervalPhase === "rest") {
                          currentSegment += 2;
                        } else if (intervalPhase === "rest_after_set") {
                          const exercisesInCurrentSet =
                            currentSet?.exercises?.length || 0;
                          currentSegment += exercisesInCurrentSet * 2 + 1;
                        }

                        return `${currentSegment} / ${totalSegments}`;
                      })()}
                    </span>
                  </div>
                </div>

                {/* Main Timer Display */}
                <div className="text-center flex-1 flex flex-col justify-center items-center">
                  {/* Current Exercise Info */}
                  {((() => {
                    const sets = (currentExercise?.meta?.tabata_sets ?? currentExercise?.meta?.circuit_sets);
                    if (!Array.isArray(sets)) return null;
                    const set = (sets as unknown[])[timerSetIndex] as
                      | { exercises?: unknown[] }
                      | undefined;
                    if (!set?.exercises?.length) return null;
                    return (
                      <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-8 py-6 max-w-md mb-12">
                        <div className="text-2xl font-bold text-white mb-2">
                          {(() => {
                            const setsArr = sets as unknown[];
                            const currentExerciseInSet = (
                              setsArr[timerSetIndex] as {
                                exercises?: Array<{ exercise_id?: string }>;
                              }
                            )?.exercises?.[timerExerciseIndex];
                            return (
                              exerciseLookup[
                                currentExerciseInSet?.exercise_id ?? ""
                              ]?.name || "Exercise"
                            );
                          })()}
                        </div>
                        {intervalPhase === "work" && (
                          <div className="text-lg text-gray-200">
                            {(
                              (sets as unknown[])[timerSetIndex] as {
                                exercises?: Array<{ work_seconds?: number }>;
                              }
                            )?.exercises?.[timerExerciseIndex]?.work_seconds
                              ? `${((sets as unknown[])[timerSetIndex] as { exercises: Array<{ work_seconds?: number }> }).exercises[timerExerciseIndex].work_seconds}s work`
                              : (sets as unknown[])[timerSetIndex] != null &&
                                  ((sets as unknown[])[timerSetIndex] as { exercises?: Array<{ target_reps?: number }> })?.exercises?.[timerExerciseIndex]?.target_reps != null
                                ? `${((sets as unknown[])[timerSetIndex] as { exercises: Array<{ target_reps?: number }> }).exercises[timerExerciseIndex].target_reps} reps`
                                : "Work phase"}
                          </div>
                        )}
                      </div>
                    );
                  })() as React.ReactNode)}

                  {/* Phase Indicator */}
                  <div
                    className={`mb-8 px-8 py-4 rounded-2xl ${
                      intervalPhase === "work"
                        ? "bg-red-600/30 border-2 border-red-400"
                        : intervalPhase === "rest_after_set"
                          ? "bg-purple-600/30 border-2 border-purple-400"
                          : "bg-blue-600/30 border-2 border-blue-400"
                    }`}
                  >
                    <div className="text-4xl sm:text-5xl font-black text-white">
                      {intervalPhase === "work"
                        ? "WORK"
                        : intervalPhase === "rest_after_set"
                          ? "REST AFTER SET"
                          : "REST"}
                    </div>
                  </div>

                  {/* Large Timer */}
                  <div
                    className={`text-9xl sm:text-[12rem] font-black mb-8 ${
                      intervalPhase === "work"
                        ? "text-red-100"
                        : "text-blue-100"
                    }`}
                  >
                    {Math.floor(intervalPhaseLeft / 60)
                      .toString()
                      .padStart(2, "0")}
                    :{(intervalPhaseLeft % 60).toString().padStart(2, "0")}
                  </div>

                  {/* Next Exercise Preview */}
                  {(currentExercise?.meta?.tabata_sets ?? currentExercise?.meta?.circuit_sets) &&
                    (((currentExercise.meta.tabata_sets ?? currentExercise.meta.circuit_sets) as unknown[])[
                      timerSetIndex
                    ] as { exercises?: Array<{ exercise_id?: string }> } | undefined)
                      ?.exercises && (
                      <div className="mb-4">
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-6 py-4 text-center">
                          <div className="text-sm text-gray-300 mb-1">
                            Next:
                          </div>
                          <div className="text-lg font-semibold text-white">
                            {timerExerciseIndex + 1 <
                            (
                              ((currentExercise.meta.tabata_sets ?? currentExercise.meta.circuit_sets) as unknown[])[
                                timerSetIndex
                              ] as { exercises: Array<{ exercise_id?: string }> }
                            ).exercises.length
                              ? exerciseLookup[
                                  (
                                    ((currentExercise.meta.tabata_sets ?? currentExercise.meta.circuit_sets) as unknown[])[
                                      timerSetIndex
                                    ] as {
                                      exercises: Array<{ exercise_id?: string }>;
                                    }
                                  ).exercises[timerExerciseIndex + 1]
                                    ?.exercise_id ?? ""
                                ]?.name || "Next Exercise"
                              : timerSetIndex + 1 <
                                  ((currentExercise.meta.tabata_sets ?? currentExercise.meta.circuit_sets) as unknown[]).length
                                ? "Next Set"
                                : "Break"}
                          </div>
                        </div>
                      </div>
                    )}
                </div>

                {/* Control Buttons */}
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4 items-center">
                  {/* Previous Button */}
                  <Button
                    onClick={() => {
                      const circuitSets = (currentExercise?.meta?.tabata_sets ?? currentExercise?.meta?.circuit_sets);

                      if (intervalPhase === "work") {
                        // Work -> Previous Rest (or Previous Rest After Set)
                        if (timerExerciseIndex > 0) {
                          // Go to rest of previous exercise in same set
                          setTimerExerciseIndex((prev) => prev - 1);
                          const currentSet = circuitSets?.[timerSetIndex];
                          const prevExercise =
                            currentSet?.exercises?.[timerExerciseIndex - 1];
                          const restTime = prevExercise?.rest_after || 10;
                          setIntervalPhase("rest");
                          setIntervalPhaseLeft(restTime);
                        } else if (timerSetIndex > 0) {
                          // First exercise in set - go to rest_after_set of previous set
                          setTimerSetIndex((prev) => prev - 1);
                          const prevSet = circuitSets?.[timerSetIndex - 1];
                          const restAfterSetTime =
                            Number(prevSet?.rest_between_sets) || 30;
                          setIntervalPhase("rest_after_set");
                          setIntervalPhaseLeft(restAfterSetTime);
                        } else if (intervalRound > 0) {
                          // First exercise of first set - go to rest_after_set of last set of previous round
                          setIntervalRound((prev) => prev - 1);
                          const lastSetIndex = circuitSets.length - 1;
                          const lastSet = circuitSets?.[lastSetIndex];
                          const restAfterSetTime =
                            Number(lastSet?.rest_between_sets) || 30;
                          setTimerSetIndex(lastSetIndex);
                          setTimerExerciseIndex(0);
                          setIntervalPhase("rest_after_set");
                          setIntervalPhaseLeft(restAfterSetTime);
                        }
                      } else if (intervalPhase === "rest") {
                        // Rest -> Work (same exercise)
                        const currentSet = circuitSets?.[timerSetIndex];
                        const currentExerciseInSet =
                          currentSet?.exercises?.[timerExerciseIndex];
                        const workTime =
                          currentExerciseInSet?.work_seconds || 20;
                        setIntervalPhase("work");
                        setIntervalPhaseLeft(workTime);
                      } else if (intervalPhase === "rest_after_set") {
                        // Rest After Set -> Rest (last exercise of current set)
                        const currentSet = circuitSets?.[timerSetIndex];
                        const lastExerciseIndex =
                          (currentSet?.exercises?.length || 1) - 1;
                        const lastExercise =
                          currentSet?.exercises?.[lastExerciseIndex];
                        const restTime = lastExercise?.rest_after || 10;
                        setTimerExerciseIndex(lastExerciseIndex);
                        setIntervalPhase("rest");
                        setIntervalPhaseLeft(restTime);
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="border-white/50 text-white hover:bg-white hover:text-black bg-white/10 backdrop-blur-sm"
                    disabled={
                      timerExerciseIndex === 0 &&
                      timerSetIndex === 0 &&
                      intervalRound === 0 &&
                      intervalPhase === "work"
                    }
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>

                  {/* Play/Pause Button */}
                  <Button
                    onClick={() => setIsTimerPaused(!isTimerPaused)}
                    variant="outline"
                    size="lg"
                    className="border-white/50 text-white hover:bg-white hover:text-black bg-white/10 backdrop-blur-sm px-8 py-3 text-lg"
                  >
                    {isTimerPaused ? (
                      <Play className="w-6 h-6" />
                    ) : (
                      <div className="flex gap-1">
                        <div className="w-2 h-6 bg-white"></div>
                        <div className="w-2 h-6 bg-white"></div>
                      </div>
                    )}
                  </Button>

                  {/* Next Button */}
                  <Button
                    onClick={() => {
                      const circuitSets = (currentExercise?.meta?.tabata_sets ?? currentExercise?.meta?.circuit_sets);

                      if (intervalPhase === "work") {
                        // Work -> Rest (same exercise)
                        const currentSet = circuitSets?.[timerSetIndex];
                        const currentExerciseInSet =
                          currentSet?.exercises?.[timerExerciseIndex];
                        const restTime = currentExerciseInSet?.rest_after || 10;
                        setIntervalPhase("rest");
                        setIntervalPhaseLeft(restTime);
                      } else if (intervalPhase === "rest") {
                        // Rest -> Next Work (or Rest After Set)
                        const currentSet = circuitSets?.[timerSetIndex];
                        const isLastExerciseInSet =
                          timerExerciseIndex ===
                          (currentSet?.exercises?.length || 1) - 1;

                        if (!isLastExerciseInSet) {
                          // More exercises in set - go to next exercise work
                          setTimerExerciseIndex((prev) => prev + 1);
                          const nextExercise =
                            currentSet?.exercises?.[timerExerciseIndex + 1];
                          const workTime = nextExercise?.work_seconds || 20;
                          setIntervalPhase("work");
                          setIntervalPhaseLeft(workTime);
                        } else {
                          // Last exercise in set - check if we should show rest_after_set
                          const isLastSetInRound =
                            timerSetIndex === circuitSets.length - 1;
                          const nextRound = intervalRound + 1;
                          const isLastRound = nextRound >= intervalTotalRounds;

                          if (!isLastSetInRound || !isLastRound) {
                            // Show rest after set
                            const restAfterSetTime =
                              Number(currentSet?.rest_between_sets) || 30;
                            setIntervalPhase("rest_after_set");
                            setIntervalPhaseLeft(restAfterSetTime);
                          } else {
                            // Last set of last round - workout complete
                            setIntervalActive(false);
                            setShowTimerModal(false);
                          }
                        }
                      } else if (intervalPhase === "rest_after_set") {
                        // Rest After Set -> Work (first exercise of next set or next round)
                        const isLastSetInRound =
                          timerSetIndex === circuitSets.length - 1;

                        if (isLastSetInRound) {
                          // Start next round
                          setIntervalRound((prev) => prev + 1);
                          setTimerSetIndex(0);
                          setTimerExerciseIndex(0);
                          const firstSet = circuitSets?.[0];
                          const firstExercise = firstSet?.exercises?.[0];
                          const workTime = firstExercise?.work_seconds || 20;
                          setIntervalPhase("work");
                          setIntervalPhaseLeft(workTime);
                        } else {
                          // Move to next set
                          setTimerSetIndex((prev) => prev + 1);
                          setTimerExerciseIndex(0);
                          const nextSet = circuitSets?.[timerSetIndex + 1];
                          const firstExercise = nextSet?.exercises?.[0];
                          const workTime = firstExercise?.work_seconds || 20;
                          setIntervalPhase("work");
                          setIntervalPhaseLeft(workTime);
                        }
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="border-white/50 text-white hover:bg-white hover:text-black bg-white/10 backdrop-blur-sm"
                  >
                    <ArrowLeft className="w-4 h-4 rotate-180" />
                  </Button>

                  {/* Stop Button */}
                  <Button
                    onClick={() => {
                      setShowTimerModal(false);
                      setIntervalActive(false);
                      setIsTimerPaused(false);
                    }}
                    variant="outline"
                    className="px-6 py-3 text-lg border-red-400 text-red-100 hover:bg-red-600 hover:text-white bg-red-600/20 backdrop-blur-sm"
                  >
                    Stop
                  </Button>
                </div>
              </div>
            </div>
          )}

        {/* Enhanced Video Modal */}
        {showVideoModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/10 backdrop-blur-md rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-white/20">
              {/* Enhanced Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/20">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center">
                    <Youtube className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    Exercise Video
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeVideoModal}
                  className="text-white hover:bg-white/20 rounded-2xl min-h-[44px] min-w-[44px]"
                  aria-label="Close video"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Enhanced Video Content */}
              <div className="p-6">
                <div
                  className="relative w-full"
                  style={{ paddingBottom: "56.25%" }}
                >
                  <iframe
                    src={getEmbedUrl(currentVideoUrl)}
                    title="Exercise Video"
                    className="absolute top-0 left-0 w-full h-full rounded-2xl"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {prCelebrationData && (
          <PRCelebrationModal
            visible={!!prCelebrationData}
            onClose={() => {
              setPrCelebrationData(null);
              showAchievementsAfterPR();
            }}
            pr={prCelebrationData}
            bodyWeightKg={clientBodyWeightKg}
          />
        )}

        {newAchievementsQueue.length > 0 && (
          <AchievementUnlockModal
            achievement={newAchievementsQueue[achievementModalIndex] ?? null}
            visible={achievementModalIndex < newAchievementsQueue.length}
            onClose={() => {
              if (achievementModalIndex < newAchievementsQueue.length - 1) {
                setAchievementModalIndex((i) => i + 1);
              } else {
                setNewAchievementsQueue([]);
                setAchievementModalIndex(0);
              }
            }}
          />
        )}

        {/* Exercise Image Modal */}
        {showExerciseImage && currentExercise.exercise?.image_url && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/10 backdrop-blur-md rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-white/20">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/20">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <Image className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    {currentExercise.exercise?.name}
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowExerciseImage(false)}
                  className="text-white hover:bg-white/20 rounded-2xl min-h-[44px] min-w-[44px]"
                  aria-label="Close image"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Image Content */}
              <div className="p-6">
                <div className="relative w-full">
                  <img
                    src={currentExercise.exercise.image_url}
                    alt={currentExercise.exercise?.name}
                    className="w-full h-auto rounded-2xl"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Exercise Alternatives Modal */}
        {showExerciseAlternatives && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/10 backdrop-blur-md rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-hidden border border-white/20">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/20">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                    <RefreshCw className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    Exercise Alternatives
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowExerciseAlternatives(false)}
                  className="text-white hover:bg-white/20 rounded-2xl"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Alternatives Content */}
              <div className="p-6">
                <div className="space-y-4">
                  <p className="text-white/70 text-center mb-6">
                    Can&apos;t perform {currentExercise.exercise?.name}? Try
                    these alternatives:
                  </p>

                  {/* Alternative Exercises */}
                  <div className="space-y-3">
                    {[
                      {
                        name: "Modified Push-ups",
                        difficulty: "Easy",
                        description: "Knee push-ups or wall push-ups",
                      },
                      {
                        name: "Dumbbell Press",
                        difficulty: "Medium",
                        description: "Using dumbbells instead of bodyweight",
                      },
                      {
                        name: "Incline Push-ups",
                        difficulty: "Easy",
                        description: "Using a bench or elevated surface",
                      },
                    ].map((alternative, index) => (
                      <div
                        key={index}
                        className="p-4 bg-white/10 rounded-2xl border border-white/20 hover:bg-white/20 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-white">
                              {alternative.name}
                            </h4>
                            <p className="text-sm text-white/70">
                              {alternative.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              className={`text-xs ${
                                alternative.difficulty === "Easy"
                                  ? "bg-green-500/20 text-green-400"
                                  : alternative.difficulty === "Medium"
                                    ? "bg-yellow-500/20 text-yellow-400"
                                    : "bg-red-500/20 text-red-400"
                              }`}
                            >
                              {alternative.difficulty}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-white hover:bg-white/20 rounded-xl"
                            >
                              <Zap className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 p-4 bg-blue-500/20 rounded-2xl border border-blue-400/30">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 text-blue-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-100 mb-1">
                          Need Help?
                        </p>
                        <p className="text-sm text-blue-200">
                          Ask your coach for personalized alternatives or
                          modifications.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Plate Calculator Modal */}
        {showPlateCalculator && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="fc-surface backdrop-blur-md rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden border-0 shadow-2xl">
              <div className="p-6">
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <Calculator className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-xl font-bold fc-text-primary">
                      Barbell Plate Calculator
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowPlateCalculator(false);
                      setShowPlateResults(false);
                      setTargetWeight("");
                      setSelectedBarbell(20);
                    }}
                    className="fc-text-dim hover:bg-[color:var(--fc-glass-highlight)] rounded-xl"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                {!showPlateResults ? (
                  // Input Screen
                  <div className="space-y-6">
                    {/* Barbell Selection */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium fc-text-dim">
                        Select Barbell:
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {barbellOptions.map((barbell) => (
                          <button
                            key={barbell.weight}
                            onClick={() => setSelectedBarbell(barbell.weight)}
                            className={`p-3 rounded-xl border-2 transition-all ${
                              selectedBarbell === barbell.weight
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                : "border-[color:var(--fc-glass-border)] hover:border-[color:var(--fc-glass-soft)]"
                            }`}
                          >
                            <div className="text-center">
                              <div className="text-lg font-bold fc-text-primary">
                                {barbell.weight}kg
                              </div>
                              <div className="text-xs fc-text-dim">
                                {barbell.name}
                              </div>
                              <div className="text-xs mt-1">
                                {barbell.type === "straight" ? "📏" : "🌀"}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Weight Input */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium fc-text-dim">
                        Target Weight:
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={targetWeight}
                          onChange={(e) => setTargetWeight(e.target.value)}
                          className="w-full p-4 text-2xl font-bold text-center border-2 border-[color:var(--fc-glass-border)] rounded-xl fc-surface fc-text-primary focus:border-[color:var(--fc-domain-workouts)] focus:outline-none"
                          placeholder="142.5"
                        />
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 fc-text-dim font-medium">
                          kg
                        </div>
                      </div>
                    </div>

                    {/* Calculate Button */}
                    <button
                      onClick={() => {
                        const weight = Number(targetWeight);
                        if (weight > 0) {
                          setShowPlateResults(true);
                        }
                      }}
                      disabled={!targetWeight || Number(targetWeight) <= 0}
                      className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Calculate
                    </button>
                  </div>
                ) : (
                  // Results Screen
                  <div className="space-y-6">
                    {(() => {
                      const result = calculatePlateLoading(
                        Number(targetWeight),
                        selectedBarbell,
                      );
                      const selectedBarbellInfo = barbellOptions.find(
                        (b) => b.weight === selectedBarbell,
                      );

                      if (
                        result.option1.remainder > 0 ||
                        result.option2.remainder > 0
                      ) {
                        // Impossible weight - show closest options
                        return (
                          <div className="space-y-4">
                            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-700">
                              <div className="text-red-800 dark:text-red-200 font-semibold">
                                Unable to load {targetWeight}kg exactly
                              </div>
                              <div className="text-red-600 dark:text-red-400 text-sm mt-1">
                                Here are the closest options:
                              </div>
                            </div>

                            {/* Lighter option */}
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-700">
                              <div className="text-center space-y-3">
                                <div className="text-lg font-bold text-blue-800 dark:text-blue-200">
                                  Option 1:{" "}
                                  {Number(targetWeight) -
                                    result.option1.remainder * 2}
                                  kg (
                                  {(result.option1.remainder * 2).toFixed(2)}kg
                                  lighter)
                                </div>
                                <div className="text-sm text-blue-700 dark:text-blue-200">
                                  Load on each side:
                                </div>
                                <div className="flex flex-wrap items-center justify-center gap-2">
                                  {result.option1.plates.map((plate, index) => (
                                    <div
                                      key={index}
                                      className="flex items-center gap-1"
                                    >
                                      <div
                                        className={`w-3 h-3 ${plate.color} rounded-full border ${plate.border} relative flex items-center justify-center`}
                                      >
                                        {/* Inner grey circle - smaller */}
                                        <div className="w-1 h-1 bg-[color:var(--fc-glass-highlight)] rounded-full border border-[color:var(--fc-glass-border)] flex items-center justify-center">
                                          {/* Tiny black center */}
                                          <div className="w-0.5 h-0.5 bg-black rounded-full"></div>
                                        </div>
                                      </div>
                                      <span className="text-sm">
                                        {plate.count} x {plate.weight}kg
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Heavier option */}
                            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-700">
                              <div className="text-center space-y-3">
                                <div className="text-lg font-bold text-green-800 dark:text-green-200">
                                  Option 2:{" "}
                                  {targetWeight + result.option1.remainder * 2}
                                  kg (
                                  {(result.option1.remainder * 2).toFixed(2)}kg
                                  heavier)
                                </div>
                                <div className="text-sm text-green-700 dark:text-green-200">
                                  Load on each side:
                                </div>
                                <div className="flex flex-wrap items-center justify-center gap-2">
                                  {result.option1.plates.map((plate, index) => (
                                    <div
                                      key={index}
                                      className="flex items-center gap-1"
                                    >
                                      <div
                                        className={`w-3 h-3 ${plate.color} rounded-full border ${plate.border} relative flex items-center justify-center`}
                                      >
                                        {/* Inner grey circle - smaller */}
                                        <div className="w-1 h-1 bg-[color:var(--fc-glass-highlight)] rounded-full border border-[color:var(--fc-glass-border)] flex items-center justify-center">
                                          {/* Tiny black center */}
                                          <div className="w-0.5 h-0.5 bg-black rounded-full"></div>
                                        </div>
                                      </div>
                                      <span className="text-sm">
                                        {plate.count} x {plate.weight}kg
                                      </span>
                                    </div>
                                  ))}
                                  {result.option1.remainder > 0 && (
                                    <div className="flex items-center gap-1">
                                      <div className="w-3 h-3 bg-gray-400 rounded-full border border-gray-600 relative flex items-center justify-center">
                                        {/* Inner grey circle */}
                                        <div className="w-1.5 h-1.5 bg-[color:var(--fc-glass-highlight)] rounded-full border border-[color:var(--fc-glass-border)] flex items-center justify-center">
                                          {/* Tiny black center */}
                                          <div className="w-0.5 h-0.5 bg-black rounded-full"></div>
                                        </div>
                                      </div>
                                      <span className="text-sm">
                                        1 x 1.25kg
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // Exact match - show 2 best loading options
                      return (
                        <div className="space-y-6">
                          {/* Total Weight Display */}
                          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-700">
                            <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                              Total: {targetWeight}kg
                            </div>
                            <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                              Using {selectedBarbell}kg{" "}
                              {selectedBarbellInfo?.name} (
                              {selectedBarbellInfo?.type === "straight"
                                ? "📏"
                                : "🌀"}
                              )
                            </div>
                          </div>

                          {/* Option 1 - Recommended */}
                          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-700">
                            <div className="text-center space-y-4">
                              <div className="text-lg font-bold text-blue-800 dark:text-blue-200">
                                Option 1 (Recommended):
                              </div>

                              {/* Visual Barbell Display */}
                              <div className="p-3 bg-[color:var(--fc-glass-highlight)] rounded-lg">
                                <div className="text-center text-xs font-medium fc-text-dim mb-2">
                                  Load on each side:
                                </div>
                                <div className="flex items-center justify-between">
                                  {/* Left side plates */}
                                  <div className="flex items-center space-x-1">
                                    {result.option1.plates
                                      .map((plate, index) => {
                                        const size =
                                          plate.weight >= 20
                                            ? "w-6 h-6"
                                            : plate.weight >= 10
                                              ? "w-5 h-5"
                                              : "w-4 h-4";
                                        const innerSize =
                                          plate.weight >= 20
                                            ? "w-3 h-3"
                                            : plate.weight >= 10
                                              ? "w-2.5 h-2.5"
                                              : "w-1.5 h-1.5";
                                        return Array.from(
                                          { length: plate.count },
                                          (_, i) => (
                                            <div
                                              key={`left-${index}-${i}`}
                                              className="flex flex-col items-center"
                                            >
                                              <div
                                                className={`${size} ${plate.color} rounded-full border-2 ${plate.border} relative flex items-center justify-center`}
                                              >
                                                {/* Inner grey circle - smaller */}
                                                <div
                                                  className={`${innerSize} bg-[color:var(--fc-glass-highlight)] rounded-full border border-[color:var(--fc-glass-border)] flex items-center justify-center`}
                                                >
                                                  {/* Tiny black center */}
                                                  <div className="w-0.5 h-0.5 bg-black rounded-full"></div>
                                                </div>
                                              </div>
                                              <div className="text-xs font-medium fc-text-dim mt-1">
                                                {plate.weight}
                                              </div>
                                            </div>
                                          ),
                                        );
                                      })
                                      .flat()}
                                  </div>

                                  {/* Barbell shaft - aligned with black dots */}
                                  <div className="flex-1 h-0.5 bg-[color:var(--fc-glass-border)] mx-3 rounded relative">
                                    {/* Align barbell with the center of plates (black dots) */}
                                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[color:var(--fc-glass-border)] rounded"></div>
                                  </div>

                                  {/* Right side plates */}
                                  <div className="flex items-center space-x-1">
                                    {result.option1.plates
                                      .map((plate, index) => {
                                        const size =
                                          plate.weight >= 20
                                            ? "w-6 h-6"
                                            : plate.weight >= 10
                                              ? "w-5 h-5"
                                              : "w-4 h-4";
                                        const innerSize =
                                          plate.weight >= 20
                                            ? "w-3 h-3"
                                            : plate.weight >= 10
                                              ? "w-2.5 h-2.5"
                                              : "w-1.5 h-1.5";
                                        return Array.from(
                                          { length: plate.count },
                                          (_, i) => (
                                            <div
                                              key={`right-${index}-${i}`}
                                              className="flex flex-col items-center"
                                            >
                                              <div
                                                className={`${size} ${plate.color} rounded-full border-2 ${plate.border} relative flex items-center justify-center`}
                                              >
                                                {/* Inner grey circle - smaller */}
                                                <div
                                                  className={`${innerSize} bg-[color:var(--fc-glass-highlight)] rounded-full border border-[color:var(--fc-glass-border)] flex items-center justify-center`}
                                                >
                                                  {/* Tiny black center */}
                                                  <div className="w-0.5 h-0.5 bg-black rounded-full"></div>
                                                </div>
                                              </div>
                                              <div className="text-xs font-medium fc-text-dim mt-1">
                                                {plate.weight}
                                              </div>
                                            </div>
                                          ),
                                        );
                                      })
                                      .flat()}
                                  </div>
                                </div>
                              </div>

                              {/* Simple Text Breakdown */}
                              <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
                                {result.option1.plates.map((plate, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center gap-1"
                                  >
                                    <div
                                      className={`w-3 h-3 ${plate.color} rounded-full border ${plate.border} relative flex items-center justify-center`}
                                    >
                                      {/* Inner grey circle - smaller */}
                                      <div className="w-1 h-1 bg-[color:var(--fc-glass-highlight)] rounded-full border border-[color:var(--fc-glass-border)] flex items-center justify-center">
                                        {/* Tiny black center */}
                                        <div className="w-0.5 h-0.5 bg-black rounded-full"></div>
                                      </div>
                                    </div>
                                    <span className="text-blue-700 dark:text-blue-200">
                                      {plate.count} x {plate.weight}kg
                                    </span>
                                    {index <
                                      result.option1.plates.length - 1 && (
                                      <span className="text-blue-600 dark:text-blue-300 mx-1">
                                        +
                                      </span>
                                    )}
                                  </div>
                                ))}
                                <span className="text-blue-600 dark:text-blue-300 mx-1">
                                  = {targetWeight}kg
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Option 2 - Alternative */}
                          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-700">
                            <div className="text-center space-y-3">
                              <div className="text-lg font-bold text-green-800 dark:text-green-200">
                                Option 2 (Alternative):
                              </div>

                              {/* Simple Text Breakdown */}
                              <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
                                {result.option2.plates.map((plate, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center gap-1"
                                  >
                                    <div
                                      className={`w-3 h-3 ${plate.color} rounded-full border ${plate.border} relative flex items-center justify-center`}
                                    >
                                      {/* Inner grey circle - smaller */}
                                      <div className="w-1 h-1 bg-[color:var(--fc-glass-highlight)] rounded-full border border-[color:var(--fc-glass-border)] flex items-center justify-center">
                                        {/* Tiny black center */}
                                        <div className="w-0.5 h-0.5 bg-black rounded-full"></div>
                                      </div>
                                    </div>
                                    <span className="text-green-700 dark:text-green-200">
                                      {plate.count} x {plate.weight}kg
                                    </span>
                                    {index <
                                      result.option2.plates.length - 1 && (
                                      <span className="text-green-600 dark:text-green-300 mx-1">
                                        +
                                      </span>
                                    )}
                                  </div>
                                ))}
                                <span className="text-green-600 dark:text-green-300 mx-1">
                                  = {targetWeight}kg
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Back Button */}
                    <button
                      onClick={() => setShowPlateResults(false)}
                      className="w-full py-3 bg-[color:var(--fc-glass-highlight)] fc-text-primary font-medium rounded-xl hover:bg-[color:var(--fc-glass-soft)] transition-all"
                    >
                      Calculate New Weight
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Workout Completion Modal */}
        {showWorkoutCompletion && (
          <div
            style={{
              position: "fixed",
              inset: "0",
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 50,
              padding: "16px",
            }}
          >
            <div className="fc-surface rounded-3xl w-full max-w-[448px] max-h-[90vh] overflow-hidden border-0 shadow-[0_4px_12px_rgba(0,0,0,0.12)]">
              <div style={{ padding: "32px", textAlign: "center" }}>
                {/* Celebration Header */}
                <div style={{ marginBottom: "24px" }}>
                  <div className="w-20 h-20 rounded-full bg-[color:var(--fc-status-success)] flex items-center justify-center mx-auto mb-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
                    <Trophy className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-3xl font-extrabold fc-text-primary leading-tight mb-2">
                    Workout Complete! 🎉
                  </h2>
                  <p className="text-base font-normal fc-text-dim">
                    Amazing work! You crushed this workout!
                  </p>
                </div>

                {/* Weight Lifted Highlight */}
                <div className="p-6 rounded-3xl border-2 border-[color:var(--fc-status-error)] mb-6 text-center bg-[color:var(--fc-status-warning)]/30">
                  <div className="text-4xl font-extrabold fc-text-primary leading-tight mb-2">
                    {workoutStats.totalWeightLifted.toLocaleString()} kg
                  </div>
                  <div className="text-lg font-semibold fc-text-primary">
                    Total Weight Lifted
                  </div>
                </div>

                {/* Performance Stats */}
                <div style={{ marginBottom: "32px" }}>
                  <div className="grid grid-cols-3" style={{ gap: "12px" }}>
                    <div className="fc-surface rounded-3xl p-4 text-center shadow-[0_2px_8px_rgba(0,0,0,0.08)] border-2 border-[color:var(--fc-accent-cyan)]">
                      <div className="text-3xl font-extrabold fc-text-primary leading-tight">
                        {(() => {
                          console.log(
                            "🕐 [Duration Debug] Modal displaying totalTime:",
                            {
                              totalTime: workoutStats.totalTime,
                              unit: "minutes",
                            },
                          );
                          return workoutStats.totalTime;
                        })()}
                      </div>
                      <div className="text-xs font-normal fc-text-dim">
                        Minutes
                      </div>
                    </div>
                    <div className="fc-surface rounded-3xl p-4 text-center shadow-[0_2px_8px_rgba(0,0,0,0.08)] border-2 border-[color:var(--fc-accent-primary)]">
                      <div className="text-3xl font-extrabold fc-text-primary leading-tight">
                        {workoutStats.exercisesCompleted}
                      </div>
                      <div className="text-xs font-normal fc-text-dim">
                        Exercises
                      </div>
                    </div>
                    <div className="fc-surface rounded-3xl p-4 text-center shadow-[0_2px_8px_rgba(0,0,0,0.08)] border-2 border-[color:var(--fc-status-error)]">
                      <div className="text-3xl font-extrabold fc-text-primary leading-tight">
                        {workoutStats.totalSets}
                      </div>
                      <div className="text-xs font-normal fc-text-dim">
                        Total Sets
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <Button
                    disabled={isCompletingWorkout}
                    onClick={async () => {
                      console.log(
                        "🔘 Completion modal button clicked - View Progress",
                      );
                      setShowWorkoutCompletion(false);
                      await completeWorkout();
                      // completeWorkout() already navigates to complete page
                    }}
                    className="w-full flex items-center justify-center gap-2 py-4 px-8 rounded-[20px] border-none bg-[color:var(--fc-status-success)] text-white text-base font-semibold shadow-[0_2px_4px_rgba(0,0,0,0.1)] disabled:cursor-not-allowed disabled:opacity-70"
                    style={{
                      cursor: isCompletingWorkout ? "not-allowed" : "pointer",
                      opacity: isCompletingWorkout ? 0.7 : 1,
                    }}
                  >
                    {isCompletingWorkout ? (
                      <>
                        <Loader2
                          style={{ width: "20px", height: "20px" }}
                          className="animate-spin"
                        />
                        Completing…
                      </>
                    ) : (
                      <>
                        <Trophy style={{ width: "20px", height: "20px" }} />
                        View Progress
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowWorkoutCompletion(false);
                      router.push("/client/train");
                    }}
                    className="w-full py-4 px-8 rounded-2xl border-2 border-[color:var(--fc-accent-primary)] fc-surface text-[color:var(--fc-accent-primary)] font-semibold flex items-center justify-center"
                  >
                    Back to Dashboard
                  </Button>
                </div>

                {/* Motivational Message */}
                <div className="mt-6 p-4 rounded-3xl border-2 border-[color:var(--fc-status-error)] bg-[color:var(--fc-status-warning)]/20">
                  <p className="text-sm font-semibold fc-text-primary text-center">
                    💪 Keep pushing! Every workout makes you stronger!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Drop Set Calculator Modal */}
        {showDropSetCalculator && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="fc-surface backdrop-blur-md rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden border-0 shadow-2xl">
              <div className="p-6">
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                      <Calculator className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-xl font-bold fc-text-primary">
                      Drop Set Calculator
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDropSetCalculator(false)}
                    className="fc-text-dim hover:bg-[color:var(--fc-glass-highlight)] rounded-xl"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <div className="space-y-6">
                  {/* Working Weight Input */}
                  <div>
                    <label className="text-sm font-medium fc-text-dim mb-2 block">
                      Working Weight (kg):
                    </label>
                    <input
                      type="number"
                      value={
                        currentSetData.weight === 0 ? "" : currentSetData.weight
                      }
                      onChange={(e) =>
                        setCurrentSetData((prev) => ({
                          ...prev,
                          weight: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full h-12 text-center text-lg rounded-xl border-2 border-[color:var(--fc-domain-workouts)] fc-glass-soft fc-text-primary font-semibold focus:outline-none focus:border-[color:var(--fc-domain-workouts)]"
                      step="0.5"
                      placeholder="Enter weight"
                    />
                  </div>

                  {/* Calculator Result */}
                  <div className="rounded-xl p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Calculator className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      <span className="text-sm font-semibold fc-text-primary">
                        Auto-calculated drop weight:
                      </span>
                    </div>
                    {currentSetData.weight > 0 ? (
                      <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {(
                          currentSetData.weight *
                          (1 -
                            (Number(currentExercise?.meta?.drop_percentage) ||
                              Number(currentExercise?.drop_percentage) ||
                              0) /
                              100)
                        ).toFixed(1)}
                        kg
                      </div>
                    ) : (
                      <div className="fc-text-dim">
                        Enter working weight to see calculation
                      </div>
                    )}
                    <div className="text-xs fc-text-dim mt-1">
                      Drop percentage:{" "}
                      {Number(currentExercise?.meta?.drop_percentage) ||
                        Number(currentExercise?.drop_percentage) ||
                        0}
                      %
                    </div>
                  </div>

                  {/* Manual Override */}
                  <div>
                    <label className="text-sm font-medium fc-text-dim mb-2 block">
                      Manual Drop Weight (kg):
                    </label>
                    <input
                      type="number"
                      value={dropWeight === "" ? "" : dropWeight}
                      onChange={(e) => setDropWeight(e.target.value)}
                      className="w-full h-12 text-center text-lg rounded-xl border-2 border-[color:var(--fc-glass-border)] fc-surface fc-text-primary font-semibold focus:outline-none focus:border-[color:var(--fc-accent-primary)]"
                      step="0.5"
                      placeholder="Override calculated weight"
                    />
                    <p className="text-xs fc-text-dim mt-1">
                      Leave empty to use auto-calculated weight
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cluster Timer Modal */}
        {showClusterTimer && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="fc-surface backdrop-blur-md rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden border-0 shadow-2xl">
              <div className="p-6">
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center">
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-xl font-bold fc-text-primary">
                      Cluster Rest Timer
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowClusterTimer(false)}
                    className="fc-text-dim hover:bg-[color:var(--fc-glass-highlight)] rounded-xl"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <div className="text-center space-y-6">
                  {/* Timer Display */}
                  <div className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-2xl p-8 border-2 border-green-200 dark:border-green-700">
                    <div className="text-6xl font-extrabold text-green-600 dark:text-green-400 mb-2">
                      {Number(currentExercise?.meta?.intra_cluster_rest) ||
                        Number(currentExercise?.intra_cluster_rest) ||
                        0}
                    </div>
                    <div className="text-lg font-semibold fc-text-dim">
                      seconds rest
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="text-sm fc-text-dim">
                    Use this timer between each cluster set. Tap start to begin
                    the countdown.
                  </div>

                  {/* Timer Controls */}
                  <div className="flex gap-3 justify-center">
                    <PrimaryButton
                      onClick={() => {
                        // TODO: Implement timer start logic
                        console.log("Starting cluster rest timer");
                      }}
                      className="w-auto px-8 py-3"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start Timer
                    </PrimaryButton>
                    <SecondaryButton
                      onClick={() => setShowClusterTimer(false)}
                      className="w-auto px-8 py-3"
                    >
                      Close
                    </SecondaryButton>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
          </ClientPageShell>
      </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
