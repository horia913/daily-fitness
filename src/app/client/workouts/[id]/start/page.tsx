"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { useTheme } from "@/contexts/ThemeContext";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchApi } from "@/lib/apiClient";
import { useToast } from "@/components/ui/toast-provider";
import LiveWorkoutBlockExecutor from "@/components/client/LiveWorkoutBlockExecutor";
import {
  WorkoutBlock,
  LiveWorkoutBlock,
  LoggedSet,
} from "@/types/workoutBlocks";
import {
  fetchE1RMs,
  calculateSuggestedWeight,
  formatSuggestedWeight,
} from "@/lib/e1rmUtils";
interface WorkoutAssignment {
  id: string;
  workout_template_id: string | null;
  status: string;
  notes?: string | null;
  name?: string | null;
  description?: string | null;
  scheduled_date?: string | null;
}

interface TemplateExercise {
  id: string;
  exercise_id: string;
  order_index: number;
  sets: number;
  reps: string;
  rest_seconds: number;
  notes: string;
  // Parsed complex data saved as JSON in notes
  exercise_type?: string;
  meta?: any;
  exercise?: {
    id: string;
    name: string;
    description: string;
    category: string;
    image_url?: string;
    video_url?: string;
  };
  completed_sets?: number;
  current_set?: number;
  [key: string]: any;
}

type ClientBlockExerciseRecord = {
  id: string;
  exercise_id: string | null;
  exercise_order: number | null;
  exercise_letter: string | null;
  sets: number | null;
  reps: string | null;
  weight_kg: number | null;
  rir: number | null;
  tempo: string | null;
  rest_seconds: number | null;
  notes: string | null;
};

type ClientBlockRecord = {
  id: string;
  block_order: number | null;
  block_type: string | null;
  block_name: string | null;
  block_notes: string | null;
  total_sets: number | null;
  reps_per_set: string | null;
  rest_seconds: number | null;
  duration_seconds?: number | null;
  block_parameters?: unknown;
  exercises?: ClientBlockExerciseRecord[] | null;
};

export default function LiveWorkout() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params.id as string;
  console.log("📍 Page: assignmentId from params:", assignmentId);
  const { addToast } = useToast();

  // Debug: Log assignmentId from URL
  useEffect(() => {
    console.log("🔍 [Page] assignmentId from URL params:", params.id);
    console.log("🔍 [Page] assignmentId variable:", assignmentId);
  }, [assignmentId, params.id]);
  const { isDark, getThemeStyles, performanceSettings } = useTheme();

  const [assignment, setAssignment] = useState<WorkoutAssignment | null>(null);
  const [exercises, setExercises] = useState<TemplateExercise[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [workoutStarted, setWorkoutStarted] = useState(true);
  const [loading, setLoading] = useState(true);
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
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [useBlockSystem, setUseBlockSystem] = useState(false);
  const workoutBlocksRef = useRef<LiveWorkoutBlock[]>([]);
  const currentBlockIndexRef = useRef(0);
  const completedBlockRef = useRef<Set<string>>(new Set());

  // Button Enhancement States
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  // Workout Completion State
  const [showWorkoutCompletion, setShowWorkoutCompletion] = useState(false);
  const [isLastBlockComplete, setIsLastBlockComplete] = useState(false);
  const [workoutStats, setWorkoutStats] = useState({
    totalTime: 0,
    exercisesCompleted: 0,
    totalSets: 0,
    personalBests: 0,
    totalWeightLifted: 0,
    weightComparison: "",
  });
  const [workoutStartTime, setWorkoutStartTime] = useState(() => {
    const time = Date.now();
    console.log("🕐 [Duration Debug] workoutStartTime initialized:", {
      timestamp: time,
      date: new Date(time).toISOString(),
      isMilliseconds: true,
    });
    return time;
  });
  const [totalWeightLifted, setTotalWeightLifted] = useState(0);
  // Ref to prevent multiple timeout calls for block advancement
  const blockAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  // Exercise details lookup for nested items (giant set, etc.)
  const [exerciseLookup, setExerciseLookup] = useState<
    Record<string, { name: string; video_url?: string }>
  >({});

  // e1RM state for suggested weight calculations
  const [e1rmMap, setE1rmMap] = useState<Record<string, number>>({});

  // Progression suggestions state
  const [progressionSuggestions, setProgressionSuggestions] = useState<
    Map<string, import("@/lib/clientProgressionService").ProgressionSuggestion>
  >(new Map());

  useEffect(() => {
    workoutBlocksRef.current = workoutBlocks;
  }, [workoutBlocks]);

  useEffect(() => {
    currentBlockIndexRef.current = currentBlockIndex;
  }, [currentBlockIndex]);

  // Helper: Validate UUID format
  const isValidUuid = (value: string | null | undefined): boolean => {
    if (!value) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  };

  // Helper: Persist workout progress to workout_sessions (lightweight, non-blocking)
  const persistSessionProgress = async (
    blockIndex: number,
    exerciseIndex: number,
    totalExercises?: number
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
        .from('workout_sessions')
        .update(updatePayload)
        .eq('id', sessionId);

      if (error) {
        console.warn('⚠️ Failed to persist session progress (non-blocking):', error.message);
      }
    } catch (err) {
      console.warn('⚠️ Error persisting session progress (non-blocking):', err);
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

      persistSessionProgress(currentBlockIndex, globalExerciseIndex, totalExercises);
    }
  }, [currentBlockIndex, sessionId, workoutBlocks.length]);

  // Helper function to get suggested weight display text
  const getSuggestedWeightText = (
    exerciseId: string,
    loadPercentage: number | null | undefined
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
      e1rmMap
    );
    if (suggested !== null && suggested > 0) {
      return `${loadPercentage}% Load - Suggested: ${suggested}kg`;
    }

    return `${loadPercentage}% Load - Suggested: Log first set to calculate`;
  };

  // Barbell options
  const barbellOptions = [
    { weight: 20, name: "Olympic", type: "straight" },
    { weight: 15, name: "Junior", type: "straight" },
    { weight: 12, name: "Straight", type: "straight" },
    { weight: 9, name: "EZ Bar", type: "ez" },
  ];

  // Function to calculate plate loading with barbell selection - PRIORITIZES 20kg and 10kg
  const calculatePlateLoading = (
    targetWeight: number,
    barbellWeight: number = 20
  ) => {
    const plates = [
      { weight: 20, color: "bg-blue-600", border: "border-blue-800" },
      { weight: 10, color: "bg-green-500", border: "border-green-700" },
      { weight: 25, color: "bg-red-600", border: "border-red-800" },
      { weight: 15, color: "bg-yellow-500", border: "border-yellow-700" },
      { weight: 5, color: "bg-white", border: "border-slate-400" },
      { weight: 2.5, color: "bg-black", border: "border-slate-600" },
      { weight: 1.25, color: "bg-gray-400", border: "border-gray-600" },
    ];

    // Calculate plates needed per side
    const plateWeight = targetWeight - barbellWeight;
    const weightPerSide = plateWeight / 2;

    // Generate two best loading options
    const options = [];

    // Option 1: Prioritize 20kg and 10kg plates first
    const option1 = [];
    let remaining1 = weightPerSide;
    for (const plate of plates) {
      const count = Math.floor(remaining1 / plate.weight);
      if (count > 0) {
        option1.push({
          weight: plate.weight,
          count: count,
          color: plate.color,
          border: plate.border,
        });
        remaining1 -= count * plate.weight;
      }
    }

    // Option 2: Alternative approach - try to minimize total number of plates
    const option2 = [];
    let remaining2 = weightPerSide;
    const platesAlt = [
      { weight: 25, color: "bg-red-600", border: "border-red-800" },
      { weight: 20, color: "bg-blue-600", border: "border-blue-800" },
      { weight: 15, color: "bg-yellow-500", border: "border-yellow-700" },
      { weight: 10, color: "bg-green-500", border: "border-green-700" },
      { weight: 5, color: "bg-white", border: "border-slate-400" },
      { weight: 2.5, color: "bg-black", border: "border-slate-600" },
      { weight: 1.25, color: "bg-gray-400", border: "border-gray-600" },
    ];
    for (const plate of platesAlt) {
      const count = Math.floor(remaining2 / plate.weight);
      if (count > 0) {
        option2.push({
          weight: plate.weight,
          count: count,
          color: plate.color,
          border: plate.border,
        });
        remaining2 -= count * plate.weight;
      }
    }

    // If both options are the same, provide a third alternative
    const isSame = JSON.stringify(option1) === JSON.stringify(option2);
    if (isSame && option1.length > 1) {
      // Try a different combination for option 2
      option2.length = 0; // Clear option 2
      remaining2 = weightPerSide;
      // Use a different greedy approach
      for (const plate of platesAlt.slice(1)) {
        // Skip 25kg to force different combination
        const count = Math.floor(remaining2 / plate.weight);
        if (count > 0) {
          option2.push({
            weight: plate.weight,
            count: count,
            color: plate.color,
            border: plate.border,
          });
          remaining2 -= count * plate.weight;
        }
      }
    }

    return {
      option1: { plates: option1, remainder: remaining1 },
      option2: { plates: option2, remainder: remaining2 },
      barbellWeight,
    };
  };

  // Removed childish weight comparison function - now just showing weight in kg

  // Workout Block Handlers
  const handleBlockComplete = (blockId: string, loggedSets: LoggedSet[]) => {
    console.log("🎯 handleBlockComplete called:", {
      blockId,
      currentBlockIndex,
      totalBlocks: workoutBlocks.length,
      isLastBlock: currentBlockIndex >= workoutBlocks.length - 1,
    });
    console.log("[block complete detected]", {
      blockId,
      currentBlockIndex,
      totalBlocks: workoutBlocks.length,
      source: "handleBlockComplete",
    });

    // Update block completion status
    setWorkoutBlocks((prev) => {
      const updated = prev.map((block) =>
        block.block.id === blockId ? { ...block, isCompleted: true } : block
      );

      // Check if all blocks are now completed
      const allCompleted = updated.every((block) => block.isCompleted);
      const completedCount = updated.filter(
        (block) => block.isCompleted
      ).length;

      // Only show completion when ALL blocks are complete
      if (allCompleted) {
        console.log(
          "🏁 All blocks completed - setting isLastBlockComplete flag"
        );
        setIsLastBlockComplete(true);
      }

      console.log("📊 Block completion status:", {
        totalBlocks: updated.length,
        completedCount,
        allCompleted,
        currentBlockIndex: currentBlockIndexRef.current,
        isLastBlock: allCompleted,
      });

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
          console.log("[advance]", {
            fromBlockIndex: latestIdx,
            toBlockIndex: latestIdx + 1,
          });
          console.log(
            "➡️ Moving to next block:",
            latestIdx + 1,
            "of",
            workoutBlocksRef.current.length
          );
          return latestIdx + 1;
        } else {
          // All blocks complete - don't auto-show completion modal
          // User will click "Complete Workout" button instead
          console.log("[advance]", {
            fromBlockIndex: latestIdx,
            toBlockIndex: latestIdx,
            reason: "lastBlock",
          });
          console.log(
            "🏁 All blocks complete! Waiting for user to click 'Complete Workout' button"
          );
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
    console.log("[state reset]", {
      type: "blockChange",
      blockIndex,
    });
    // Reset exercise index to 0 when changing blocks
    setWorkoutBlocks((prev) =>
      prev.map((block, idx) =>
        idx === blockIndex ? { ...block, currentExerciseIndex: 0 } : block
      )
    );
  };

  // Handle set logged - update completedSets in workout blocks state
  const handleSetLogged = (blockId: string, newCompletedSets: number) => {
    const currentBlock = workoutBlocksRef.current.find(
      (block) => block.block.id === blockId
    );
    if (!currentBlock) {
      setWorkoutBlocks((prev) =>
        prev.map((block) =>
          block.block.id === blockId
            ? { ...block, completedSets: newCompletedSets }
            : block
        )
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
                isExerciseComplete && isLastExercise
                  ? true
                  : block.isCompleted,
            }
          : block
      )
    );

    if (!isExerciseComplete || !isLastExercise) return;

    if (completedBlockRef.current.has(blockId)) return;
    completedBlockRef.current.add(blockId);

    console.log("✅ Auto-advancing block from handleSetLogged", {
      blockId,
      newCompletedSets,
      totalSetsForExercise,
      currentExIndex,
    });
    console.log("[advance]", {
      fromBlockIndex: currentBlockIndexRef.current,
      toBlockIndex: Math.min(
        currentBlockIndexRef.current + 1,
        workoutBlocksRef.current.length - 1
      ),
      source: "handleSetLogged",
    });

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
          console.log("[state reset]", {
            type: "exerciseAdvance",
            blockId,
            fromExerciseIndex: currentExIndex,
            toExerciseIndex: currentExIndex + 1,
          });
          return {
            ...block,
            currentExerciseIndex: currentExIndex + 1,
            completedSets: 0,
          };
        } else {
          // All exercises done, mark block complete
          return { ...block, isCompleted: true };
        }
      })
    );
  };

  useEffect(() => {
    if (assignmentId) {
      loadAssignment().catch((error) => {
        console.error("Error loading assignment:", error);
      });
    }
  }, [assignmentId]);

  // Log when completion modal state changes and calculate stats from database
  useEffect(() => {
    if (showWorkoutCompletion) {
      console.log("🎉 Workout completion modal is now showing");
      console.log("📊 Workout stats (before calculation):", workoutStats);

      // Calculate stats from logged sets in database
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
    userId: string
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
    userId: string
  ): Promise<void> => {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
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
          `🔒 Closing ${oldLogs.length} incomplete workout_log(s) from previous days`
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
            console.log(`✅ Closed workout_log ${log.id} (started: ${log.started_at})`);
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
    userId: string
  ): Promise<{ id: string; started_at: string; workout_session_id: string | null } | null> => {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
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
   * Restore workout progress from workout_set_logs
   * Counts sets per block/exercise to determine where client left off
   */
  const restoreWorkoutProgress = async (
    workoutLogId: string,
    workoutBlocks: any[],
    userId: string
  ): Promise<{
    currentBlockIndex: number;
    workoutBlocksWithProgress: LiveWorkoutBlock[];
    workoutStartTime: number;
  } | null> => {
    try {
      // Get all set logs for this workout_log
      const { data: setLogs, error } = await supabase
        .from("workout_set_logs")
        .select("block_id, exercise_id, set_number, block_type")
        .eq("workout_log_id", workoutLogId)
        .eq("client_id", userId)
        .order("completed_at", { ascending: true });

      if (error) {
        console.error("Error fetching set logs for progress restoration:", error);
        return null;
      }

      if (!setLogs || setLogs.length === 0) {
        console.log("No set logs found - starting fresh");
        return null;
      }

      console.log(`📊 Found ${setLogs.length} set logs to restore progress from`);

      // Get workout_log to restore started_at time
      const { data: workoutLog } = await supabase
        .from("workout_logs")
        .select("started_at")
        .eq("id", workoutLogId)
        .single();

      const workoutStartTime = workoutLog?.started_at
        ? new Date(workoutLog.started_at).getTime()
        : Date.now();

      // Group sets by block_id and exercise_id
      // Also track set_number for blocks that use it
      const setsByBlock = new Map<string, Map<string, { count: number; maxSetNumber: number }>>(); 
      // block_id -> (exercise_id -> { count, maxSetNumber })

      for (const setLog of setLogs) {
        if (!setLog.block_id) continue;

        if (!setsByBlock.has(setLog.block_id)) {
          setsByBlock.set(setLog.block_id, new Map());
        }

        const blockSets = setsByBlock.get(setLog.block_id)!;
        const exerciseId = setLog.exercise_id || "unknown";
        const current = blockSets.get(exerciseId) || { count: 0, maxSetNumber: 0 };

        // For block types that log sets individually, count each log
        // For block types that log once per completion (amrap, for_time, tabata, emom), count as 1 set
        const isSingleLogBlock = ["amrap", "emom", "tabata", "for_time"].includes(
          setLog.block_type || ""
        );

        if (isSingleLogBlock) {
          // These block types complete the entire exercise/round with one log
          // Set count to 1 (completes the block)
          blockSets.set(exerciseId, { count: 1, maxSetNumber: 1 });
        } else {
          // Count individual sets
          // For blocks with set_number, use that; otherwise count logs
          const setNumber = setLog.set_number || current.count + 1;
          const newCount = Math.max(current.count + 1, setNumber);
          const newMaxSetNumber = Math.max(current.maxSetNumber, setNumber);
          blockSets.set(exerciseId, { count: newCount, maxSetNumber: newMaxSetNumber });
        }
      }

      // Restore progress in workout blocks
      let currentBlockIndex = 0;
      let foundIncompleteBlock = false;

      const workoutBlocksWithProgress = workoutBlocks.map((block: any, index) => {
        // Handle both WorkoutBlock[] (block.id) and LiveWorkoutBlock[] (block.block.id)
        const blockId = block.block?.id || block.id;
        const blockData = block.block || block;
        const blockSetsCounts = setsByBlock.get(blockId);

        if (!blockSetsCounts || blockSetsCounts.size === 0) {
          // No sets logged for this block - if we haven't found incomplete block yet, this is it
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
            totalSets: blockData.total_sets || (blockData.exercises && blockData.exercises[0]?.sets) || 1,
          };
        }

        // Check each exercise in the block to determine progress
        const exercises = blockData.exercises || [];
        let blockCompletedSets = 0;
        let currentExerciseIndex = 0;
        let blockIsCompleted = true;
        const blockType = blockData.block_type;

        for (let i = 0; i < exercises.length; i++) {
          const exercise = exercises[i];
          const exerciseId = exercise.exercise_id;
          const exerciseData = blockSetsCounts.get(exerciseId);
          const completedSetsForExercise = exerciseData?.count || 0;
          const totalSetsForExercise =
            exercise.sets !== null && exercise.sets !== undefined
              ? exercise.sets
              : blockData.total_sets || 1;
          const normalizedCompletedSets = blockType && ["amrap", "emom", "tabata", "for_time"].includes(blockType)
            ? completedSetsForExercise
            : Math.min(completedSetsForExercise, totalSetsForExercise);

          // For single-log blocks (amrap, for_time, etc.), one log = complete
          // For multi-set blocks, check if sets match total
          const isExerciseComplete = blockType && ["amrap", "emom", "tabata", "for_time"].includes(blockType)
            ? completedSetsForExercise >= 1
            : normalizedCompletedSets >= totalSetsForExercise;

          blockCompletedSets = Math.max(
            blockCompletedSets,
            normalizedCompletedSets
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
            const normalizedCompletedSets = blockType && ["amrap", "emom", "tabata", "for_time"].includes(blockType)
              ? completedSetsForExercise
              : Math.min(completedSetsForExercise, totalSetsForExercise);
            
            const isExerciseComplete = blockType && ["amrap", "emom", "tabata", "for_time"].includes(blockType)
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
                const normalizedCompletedSets = blockType && ["amrap", "emom", "tabata", "for_time"].includes(blockType)
                  ? completedSetsForExercise
                  : Math.min(completedSetsForExercise, totalSetsForExercise);
                
                const isExerciseComplete = blockType && ["amrap", "emom", "tabata", "for_time"].includes(blockType)
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
          const currentExerciseData = blockSetsCounts.get(currentExercise.exercise_id);
          if (currentExerciseData) {
            // If exercise is complete, set index should be at total sets
            // Otherwise, set to the last logged set number
            const totalSetsForCurrentExercise =
              currentExercise.sets !== null && currentExercise.sets !== undefined
                ? currentExercise.sets
                : blockData.total_sets || 1;
            
            const normalizedCurrentCompletedSets = blockType && ["amrap", "emom", "tabata", "for_time"].includes(blockType)
              ? currentExerciseData.count
              : Math.min(currentExerciseData.count, totalSetsForCurrentExercise);
            const isCurrentExerciseComplete = blockType && ["amrap", "emom", "tabata", "for_time"].includes(blockType)
              ? currentExerciseData.count >= 1
              : normalizedCurrentCompletedSets >= totalSetsForCurrentExercise;
            
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
                Math.min(currentExerciseData.maxSetNumber, totalSetsForCurrentExercise)
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
          totalSets: blockData.total_sets || (exercises[0]?.sets) || 1,
        };
      });

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
          blockType: b.block.block_type,
          completedSets: b.completedSets,
          currentExerciseIndex: b.currentExerciseIndex,
          currentSetIndex: b.currentSetIndex,
          isCompleted: b.isCompleted,
          exercises: b.block.exercises?.map((ex: any) => ({
            exerciseId: ex.exercise_id,
            exerciseName: ex.exercise?.name,
            sets: ex.sets,
            loggedSets: setsByBlock.get(b.block.id)?.get(ex.exercise_id)?.count || 0,
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
      const { ensureAuthenticated } = await import('@/lib/supabase');
      await ensureAuthenticated();
      
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !assignmentId) return;

      const actualWorkoutAssignmentId = await resolveWorkoutAssignmentId(
        assignment?.id || assignmentId,
        user.id
      );

      if (!actualWorkoutAssignmentId) {
        console.warn("⚠️ No workout assignment resolved for stats calculation");
        return;
      }

      console.log(
        "📊 Calculating workout stats from database for assignment:",
        actualWorkoutAssignmentId
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
          0
        ) || 0;
      const uniqueExercises = new Set(
        setLogs?.map((set) => set.exercise_id).filter(Boolean) || []
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
          }
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
    try {
      console.log(
        "🔍 Workout Execution - Loading assignment with ID:",
        assignmentId
      );
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // TASK B: Support two ID types - workout_assignments.id OR program_day_assignments.id
      // First, try as workout_assignments.id (standalone assignment)
      const { data: assignmentData, error: assignmentError } = await supabase
        .from("workout_assignments")
        .select("*")
        .eq("id", assignmentId)
        .eq("client_id", user.id)
        .maybeSingle();

      console.log("🔍 Workout Execution - Assignment query result:", {
        assignmentData,
        assignmentError,
      });

      let resolvedAssignment = assignmentData;
      let programDayAssignmentId: string | null = null;

      if (assignmentError) throw assignmentError;

      if (!resolvedAssignment) {
        // Not a workout_assignments.id - check if it's a program_day_assignments.id
        console.log(
          "Workout Execution - Not a workout_assignments.id, checking program_day_assignments"
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
          console.warn("Error checking active program assignment:", programAssignmentError);
        }

        if (activeProgramAssignment) {
          // Check if assignmentId is a program_day_assignments.id for this program
          const { data: programDayAssignment, error: programDayError } = await supabase
            .from("program_day_assignments")
            .select(
              `
              id,
              program_assignment_id,
              day_number,
              workout_template_id,
              workout_assignment_id,
              is_completed,
              name,
              description,
              day_type
            `
            )
            .eq("id", assignmentId)
            .eq("program_assignment_id", activeProgramAssignment.id)
            .maybeSingle();

          if (programDayError) {
            console.warn("Error checking program_day_assignments:", programDayError);
          }

          if (programDayAssignment) {
            // TASK D: Guardrail - prevent starting completed program_day_assignments
            if (programDayAssignment.is_completed === true) {
              addToast({
                title: "Workout Already Completed",
                description: "This program workout has already been completed.",
                variant: "default",
              });
              router.push("/client/workouts");
              return;
            }

            // Check if day_type is workout (not rest/assessment)
            if (programDayAssignment.day_type !== "workout") {
              addToast({
                title: "Invalid Workout Type",
                description: "This program day is not a workout day.",
                variant: "default",
              });
              router.push("/client/workouts");
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
                  const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
                  console.error("Error creating workout_assignment via API:", errorData);
                  addToast({
                    title: "Failed to Start Workout",
                    description: errorData.error || errorData.details || "Could not start program workout. Please try again.",
                    variant: "destructive",
                  });
                  router.push("/client/workouts");
                  return;
                }

                const result = await response.json();
                const workoutAssignmentId = result.workout_assignment_id;

                if (!workoutAssignmentId) {
                  throw new Error("API returned success but no workout_assignment_id");
                }

                // Load the newly created workout_assignment
                const { data: newWorkoutAssignment, error: loadError } = await supabase
                  .from("workout_assignments")
                  .select("*")
                  .eq("id", workoutAssignmentId)
                  .eq("client_id", user.id)
                  .maybeSingle();

                if (loadError || !newWorkoutAssignment) {
                  console.error("Error loading newly created workout_assignment:", loadError);
                  addToast({
                    title: "Workout Assignment Not Found",
                    description: "The workout was created but could not be loaded. Please try again.",
                    variant: "destructive",
                  });
                  router.push("/client/workouts");
                  return;
                }

                resolvedAssignment = newWorkoutAssignment;
              } catch (apiError) {
                console.error("Error calling /api/program-workouts/start:", apiError);
                addToast({
                  title: "Failed to Start Workout",
                  description: "Could not start program workout. Please try again.",
                  variant: "destructive",
                });
                router.push("/client/workouts");
                return;
              }
            } else {
              // Load the existing workout_assignment
              const { data: existingAssignment, error: existingError } = await supabase
                .from("workout_assignments")
                .select("*")
                .eq("id", programDayAssignment.workout_assignment_id)
                .eq("client_id", user.id)
                .maybeSingle();

              if (existingError) {
                console.error("Error loading existing workout_assignment:", existingError);
                throw existingError;
              }

              if (!existingAssignment) {
                throw new Error("Workout assignment linked to program day not found");
              }

              resolvedAssignment = existingAssignment;
            }

            // Store program_day_assignment_id for later use in completion
            (resolvedAssignment as any).program_day_assignment_id = programDayAssignment.id;
            (resolvedAssignment as any).program_assignment_id = activeProgramAssignment.id;
          }
        }

        // TASK 2: Support exactly two ID types: program_day_assignments.id OR workout_assignments.id
        // No legacy fallbacks - if ID is neither, show error and redirect

        // TASK D: Guardrail - handle ID mismatch (nothing found)
        if (!resolvedAssignment) {
          console.error("Workout Execution - ID not found in any table:", assignmentId);
          addToast({
            title: "Workout Not Found",
            description: "The requested workout could not be found. Please try again.",
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

      // Check if this is a program assignment - load blocks from progression rules
      const isProgramAssignment =
        (resolvedAssignment as any).is_program_assignment === true;
      let workoutBlocks: any[] = [];

      if (isProgramAssignment) {
        // Load blocks from client_program_progression_rules
        const { ProgramProgressionService } = await import(
          "@/lib/programProgressionService"
        );
        const programAssignmentId = (resolvedAssignment as any)
          .program_assignment_id;
        const currentWeek = (resolvedAssignment as any).current_week || 1;
        const templateId = (resolvedAssignment as any).workout_template_id;
        const programScheduleId = (resolvedAssignment as any).program_schedule_id;

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
            templateId
          );
        
        // Debug: Log sets values from loaded blocks
        console.log("🔢 [Page] Loaded workout blocks with sets:", workoutBlocks.map(block => ({
          blockOrder: block.block_order,
          blockType: block.block_type,
          exercises: block.exercises?.map((ex: any) => ({
            exercise_id: ex.exercise_id,
            sets: ex.sets,
            reps: ex.reps
          }))
        })));

        if (!workoutBlocks || workoutBlocks.length === 0) {
          throw new Error(
            "No workout blocks found in progression rules for this program"
          );
        }
      } else {
        // Regular workout assignment - load blocks from template
        if (!combinedAssignment.workout_template_id) {
          throw new Error("Workout template ID not found in assignment");
        }

        // Use WorkoutBlockService to fetch blocks (handles RLS properly)
        const { WorkoutBlockService } = await import(
          "@/lib/workoutBlockService"
        );
        workoutBlocks = await WorkoutBlockService.getWorkoutBlocks(
          combinedAssignment.workout_template_id
        );

        if (!workoutBlocks || workoutBlocks.length === 0) {
          throw new Error("No workout blocks found for this template");
        }
      }

      // Convert WorkoutBlock[] to ClientBlockRecord[] format
      const clientBlocks: ClientBlockRecord[] = workoutBlocks.map((block) => ({
        id: block.id,
        block_order: block.block_order,
        block_type: block.block_type,
        block_name: block.block_name ?? null,
        block_notes: block.block_notes ?? null,
        total_sets: block.total_sets ?? null,
        reps_per_set: block.reps_per_set ?? null,
        rest_seconds: block.rest_seconds ?? null,
        duration_seconds: block.duration_seconds ?? null,
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
        })) as any[],
      }));
      const allClientExercises = clientBlocks.flatMap(
        (block) => (block.exercises ?? []) as any[]
      );

      const exerciseIds = Array.from(
        new Set(
          allClientExercises
            .map((exercise) => exercise.exercise_id)
            .filter((id): id is string => Boolean(id))
        )
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
            exerciseDetailsError
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
          const blockType = (block.block_type as any) || "straight_set";
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
                block_id: block.id,
                exercise_id: exercise.exercise_id ?? "",
                exercise_order:
                  typeof exercise.exercise_order === "number" &&
                  Number.isFinite(exercise.exercise_order)
                    ? exercise.exercise_order
                    : idx + 1,
                exercise_letter: exercise.exercise_letter ?? undefined,
                sets: (exercise.sets !== null && exercise.sets !== undefined) 
                  ? exercise.sets 
                  : (block.total_sets !== null && block.total_sets !== undefined)
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
                drop_sets: [],
                cluster_sets: [],
                pyramid_sets: [],
                rest_pause_sets: [],
                ladder_sets: [],
                created_at: now,
                updated_at: now,
              };
            }
          );

          return {
            id: block.id,
            template_id:
              combinedAssignment.workout_template_id || combinedAssignment.id,
            block_type: blockType,
            block_order:
              typeof block.block_order === "number" &&
              Number.isFinite(block.block_order)
                ? block.block_order
                : 0,
            block_name: block.block_name ?? undefined,
            block_notes: block.block_notes ?? undefined,
            duration_seconds: (block as any).duration_seconds ?? undefined,
            rest_seconds: block.rest_seconds ?? undefined,
            total_sets: block.total_sets ?? undefined,
            reps_per_set: block.reps_per_set ?? undefined,
            block_parameters: blockParameters,
            exercises: blockExercises as any,
            drop_sets: [],
            cluster_sets: [],
            pyramid_sets: [],
            rest_pause_sets: [],
            time_protocol: undefined,
            ladder_sets: [],
            created_at: now,
            updated_at: now,
          } as WorkoutBlock;
        }
      );

      const exercisesWithDetails: TemplateExercise[] = workoutBlocksConverted
        .flatMap((block) => {
          return (block.exercises || []).map((exercise: any, idx: number) => {
            const meta = safeParse(exercise.notes);
            const exerciseType = meta.exercise_type || block.block_type;
            return {
              id: exercise.id,
              exercise_id: exercise.exercise_id,
              order_index: exercise.exercise_order ?? idx,
              sets: (exercise.sets !== null && exercise.sets !== undefined) 
                ? exercise.sets 
                : (block.total_sets !== null && block.total_sets !== undefined)
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

      setAssignment(combinedAssignment);
      console.log("📍 Page: Assignment loaded:", combinedAssignment);
      console.log("📍 Page: assignment.id:", combinedAssignment?.id);
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
          user.id
        );

        let restoredProgress: {
          currentBlockIndex: number;
          workoutBlocksWithProgress: LiveWorkoutBlock[];
          workoutStartTime: number;
        } | null = null;

        if (actualWorkoutAssignmentId) {
          // 2. Close incomplete logs from previous days
          await closeIncompleteLogsFromPreviousDays(
            actualWorkoutAssignmentId,
            user.id
          );

          // 3. Find active workout_log for today
          const activeLog = await findActiveWorkoutLogForToday(
            actualWorkoutAssignmentId,
            user.id
          );

          if (activeLog) {
            console.log("🔄 Resuming workout session from:", activeLog.started_at);
            
            // 4. Restore progress from workout_set_logs
            restoredProgress = await restoreWorkoutProgress(
              activeLog.id,
              workoutBlocksConverted,
              user.id
            );

            if (restoredProgress) {
              // Set restored workout start time
              setWorkoutStartTime(restoredProgress.workoutStartTime);
              
              // Set restored blocks with progress
              setWorkoutBlocks(restoredProgress.workoutBlocksWithProgress);
              // Only show completion when ALL blocks are complete
              setIsLastBlockComplete(
                restoredProgress.workoutBlocksWithProgress.every(
                  (block) => block.isCompleted
                )
              );
              
              // Set restored current block index
              setCurrentBlockIndex(restoredProgress.currentBlockIndex);

              // Store workout_log_id so we know we have an active session
              setWorkoutLogId(activeLog.id);
              
              // M2 Fix: Use the actual workout_session_id from the log if available
              // This ensures workout_sessions.status gets updated on completion
              if (activeLog.workout_session_id && isValidUuid(activeLog.workout_session_id)) {
                setSessionId(activeLog.workout_session_id);
                console.log("✅ Using existing workout_session_id:", activeLog.workout_session_id);
              } else {
                // Fallback for logs created before M2 (no workout_session_id)
                setSessionId(`restored-${activeLog.id}`);
                console.log("⚠️ No workout_session_id found, using fallback:", `restored-${activeLog.id}`);
              }

              console.log("✅ Workout session restored successfully:", {
                workoutLogId: activeLog.id,
                workoutSessionId: activeLog.workout_session_id,
                currentBlockIndex: restoredProgress.currentBlockIndex,
                startedAt: new Date(restoredProgress.workoutStartTime).toISOString(),
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
            console.log("ℹ️ No active workout session found for today - starting fresh");
          }
        } else {
          console.log("ℹ️ Could not resolve workout_assignment_id - starting fresh");
        }

        // If no progress was restored, initialize blocks normally
        if (!restoredProgress) {
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
            })
          );
          setWorkoutBlocks(liveBlocks);
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
        }

        // Load progression suggestions if workout is part of a program
        loadProgressionSuggestions(
          assignmentId,
          workoutBlocksConverted,
          exerciseMeta
        );
      } else {
        setUseBlockSystem(false);
      }
    } catch (dbError) {
      console.error("Error loading workout assignment:", dbError);
      addToast({
        title: "Error Loading Workout",
        description:
          "Failed to load workout. Please try again or contact your coach.",
        variant: "destructive",
      });
      setLoading(false);
      // Don't set fake data - show error message instead
      return;
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
    >
  ) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      let programAssignmentId: string | null = null;

      // Check if this is a program assignment (assignmentId is program_assignments.id)
      const { data: programAssignment } = await supabase
        .from("program_assignments")
        .select("id")
        .eq("id", workoutAssignmentId)
        .eq("client_id", user.id)
        .maybeSingle();

      if (programAssignment) {
        // This is a program assignment
        programAssignmentId = programAssignment.id;
      } else {
        // workout_assignments table doesn't have program_assignment_id column
        // Workout assignments are not directly linked to program assignments
        // Skip progression suggestions for regular workout assignments
        return;
      }

      if (!programAssignmentId) {
        return;
      }

      // Get current week from program_assignment_progress
      const { data: progress } = await supabase
        .from("program_assignment_progress")
        .select("current_week, program_id")
        .eq("assignment_id", programAssignmentId)
        .eq("client_id", user.id)
        .maybeSingle();

      if (!progress?.current_week) {
        return;
      }

      // Get program category
      const { data: program } = await supabase
        .from("workout_programs")
        .select("category")
        .eq("id", progress.program_id)
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
      const { getProgressionSuggestionsForWorkout } = await import(
        "@/lib/clientProgressionService"
      );

      const suggestions = await getProgressionSuggestionsForWorkout(
        programAssignmentId,
        progress.current_week,
        exerciseIds,
        exerciseNames,
        category,
        difficulty
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
            console.log("✅ Reusing existing workout session:", existingSession.id);
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
          block_id: currentExercise.block_id,
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

      // Log the drop set
      if (dropWeightNum > 0 && dropReps > 0) {
        const response2 = await fetchApi("/api/log-set", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workout_log_id: undefined, // API will create if needed
            block_id: currentExercise.block_id,
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
        0
      );
      const exercisesCompleted = exercises.filter(
        (ex) => (ex.completed_sets || 0) >= ex.sets
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

      // Log first exercise (Exercise A)
      if (currentExercise.exercise_id && weightA > 0 && repsA > 0) {
        const responseA = await fetchApi("/api/log-set", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workout_log_id: undefined, // API will create if needed
            block_id: currentExercise.block_id,
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
      if (exerciseBId && weightB > 0 && repsB > 0) {
        const responseB = await fetchApi("/api/log-set", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workout_log_id: undefined, // API will create if needed
            block_id: currentExercise.block_id,
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
              [exerciseBId]: resultB.e1rm.calculated,
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
        0
      );
      const exercisesCompleted = exercises.filter(
        (ex) => (ex.completed_sets || 0) >= ex.sets
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
      if (currentExercise.exercise_id && weightNum > 0 && repsNum > 0) {
        const response = await fetchApi("/api/log-set", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workout_log_id: undefined, // API will create if needed
            block_id: currentExercise.block_id,
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
        0
      );
      const exercisesCompleted = exercises.filter(
        (ex) => (ex.completed_sets || 0) >= ex.sets
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
        0
      );
      const exercisesCompleted = exercises.filter(
        (ex) => (ex.completed_sets || 0) >= ex.sets
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

    // Save weight and reps before resetting
    const loggedWeight = currentSetData.weight;
    const loggedReps = currentSetData.reps;

    // Start rest timer
    setRestTime(currentExercise.rest_seconds || 60);
    setShowRestTimer(true);

    // Reset form data for next set
    setCurrentSetData({ weight: 0, reps: 0 });

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
      if (currentExercise.exercise_id && loggedWeight > 0 && loggedReps > 0) {
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
            block_id: currentExercise.block_id,
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
        0
      );
      const exercisesCompleted = exercises.filter(
        (ex) => (ex.completed_sets || 0) >= ex.sets
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

    // Start rest timer
    setRestTime(current.rest_seconds || 60);
    setShowRestTimer(true);

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

        // Only log if we have valid data
        if (exerciseId && weight > 0 && reps > 0) {
          const response = await fetchApi("/api/log-set", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              workout_log_id: undefined, // API will create if needed
              block_id: current.block_id,
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
      value
    );

  const completeWorkout = async () => {
    try {
      console.log("🚀 completeWorkout called - navigating to complete page");
      const completeTargetId = assignment?.id || assignmentId;
      console.log("📍 assignmentId:", assignmentId);
      console.log("📍 completeTargetId:", completeTargetId);
      console.log("📍 sessionId:", sessionId);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.error("❌ User not authenticated");
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

      // Store duration in localStorage to pass to complete page
      // Guard against storage failures (e.g., private mode)
      try {
        localStorage.setItem(
          "workoutDurationMinutes",
          durationMinutes.toString()
        );
        localStorage.setItem("workoutStartTime", workoutStartTime.toString());

        // Store workout_log_id for complete page to avoid mismatched logs
        if (workoutLogId) {
          localStorage.setItem("workoutLogIdForComplete", workoutLogId);
        } else if (sessionId?.startsWith("restored-")) {
          localStorage.setItem(
            "workoutLogIdForComplete",
            sessionId.replace("restored-", "")
          );
        }
      } catch (storageError) {
        console.warn("⚠️ Unable to write workout data to localStorage", storageError);
      }

      if (sessionId && isUuid(sessionId)) {
        localStorage.setItem("workoutSessionIdForComplete", sessionId);
      }

      try {
        // Update workout session (if exists)
        if (sessionId && isUuid(sessionId)) {
          console.log("💾 Updating workout session:", sessionId);
          await supabase
            .from("workout_sessions")
            .update({
              completed_at: new Date().toISOString(),
              status: "completed",
            })
            .eq("id", sessionId);
        } else if (sessionId) {
          console.warn(
            "⚠️ Skipping workout_sessions update - non-UUID sessionId",
            sessionId
          );
        }

        // Don't update assignment status here - let the complete page handle it
        // This ensures markWorkoutComplete() is called, which updates totals
      } catch (dbError) {
        console.error("❌ Database error in completeWorkout:", dbError);
        // Continue anyway - navigation is more important
      }

      // Navigate to completion page
      // The complete page will handle updating assignment status and totals
      console.log(
        "🧭 Navigating to complete page:",
        `/client/workouts/${completeTargetId}/complete`
      );
      router.push(`/client/workouts/${completeTargetId}/complete`);
    } catch (error) {
      console.error("❌ Error in completeWorkout:", error);
    }
  };

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
      case "circuit":
        return "Move through the circuit following the autoplay timer for each exercise/rest.";
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
  // Tabata/Circuit state
  const [intervalActive, setIntervalActive] = useState(false);
  const [intervalPhase, setIntervalPhase] = useState<
    "work" | "rest" | "rest_after_set"
  >("work");
  const [intervalPhaseLeft, setIntervalPhaseLeft] = useState(0);
  const [intervalRound, setIntervalRound] = useState(0);
  const [intervalTotalRounds, setIntervalTotalRounds] = useState(0);
  const [intervalMode, setIntervalMode] = useState<"tabata" | "circuit" | null>(
    null
  );
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

  // Previous Performance data
  const [previousPerformance, setPreviousPerformance] = useState<{
    lastWorkout: any | null;
    personalBest: any | null;
    loading: boolean;
  }>({
    lastWorkout: null,
    personalBest: null,
    loading: false,
  });
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
    if (currentType !== "tabata" && currentType !== "circuit") return;

    // Time reached zero - transition to next state
    const circuitSets = currentExercise?.meta?.circuit_sets;
    if (!circuitSets) return;

    const currentSet = circuitSets[timerSetIndex];
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
        const nextExercise = currentSet.exercises[nextExerciseIndex];
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
    currentExercise?.meta?.circuit_sets,
    timerSetIndex,
    timerExerciseIndex,
    intervalPhase,
    intervalRound,
    intervalTotalRounds,
  ]);

  // Single master timer - ticks every second
  useEffect(() => {
    if (!intervalActive || !showTimerModal || isTimerPaused) return;
    if (currentType !== "tabata" && currentType !== "circuit") return;

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
          : prev
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
      })
    );
  }, [
    currentType,
    currentExercise?.id,
    currentExercise?.meta?.giant_set_exercises,
    currentExercise?.giant_set_exercises,
  ]);

  // Fetch previous performance when exercise changes
  useEffect(() => {
    if (currentExercise?.exercise?.id) {
      fetchPreviousPerformance(currentExercise.exercise.id).catch((error) => {
        console.error("Error fetching previous performance:", error);
      });
    }
  }, [currentExercise?.exercise?.id]);

  // Theme-aware styles using your app's approach
  const theme = getThemeStyles();

  // Fetch previous performance data for current exercise
  const fetchPreviousPerformance = async (exerciseId: string) => {
    if (!exerciseId) return;

    setPreviousPerformance((prev) => ({ ...prev, loading: true }));

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setPreviousPerformance({
          lastWorkout: null,
          personalBest: null,
          loading: false,
        });
        return;
      }

      // TODO: Fix previous performance query once workout_logs schema is confirmed
      // For now, disable this query to prevent errors
      // The workout_logs table schema may be different than expected
      console.log(
        "Previous performance query disabled - workout_logs schema needs verification"
      );

      // Set empty previous performance for now
      setPreviousPerformance({
        lastWorkout: null,
        personalBest: null,
        loading: false,
      });
    } catch (error) {
      console.log("Previous performance data unavailable:", error);
      setPreviousPerformance({
        lastWorkout: null,
        personalBest: null,
        loading: false,
      });
    }
  };

  // Reusable Previous Performance Card Component
  const PreviousPerformanceCard = () => (
    <div className="rounded-xl p-4 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-700">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-green-500 to-emerald-600">
          <TrendingUp className="w-4 h-4 text-white" />
        </div>
        <div className={`font-bold ${theme.text} text-base`}>
          Previous Performance
        </div>
      </div>

      {previousPerformance.loading ? (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
          <span className={`ml-2 text-sm ${theme.textSecondary}`}>
            Loading...
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Last Workout */}
          <div className="rounded-lg p-3 bg-white/60 dark:bg-slate-800/60 border border-green-200 dark:border-green-700">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className={`text-sm font-semibold ${theme.text}`}>
                Last Workout
              </span>
            </div>
            {previousPerformance.lastWorkout ? (
              <div className="space-y-1">
                {(previousPerformance.lastWorkout.weight_used ||
                  previousPerformance.lastWorkout.weight_kg) && (
                  <div className={`text-sm ${theme.text}`}>
                    <span className="font-medium">Weight:</span>{" "}
                    {previousPerformance.lastWorkout.weight_used ||
                      previousPerformance.lastWorkout.weight_kg}
                    kg
                  </div>
                )}
                {(previousPerformance.lastWorkout.reps_completed ||
                  previousPerformance.lastWorkout.reps) && (
                  <div className={`text-sm ${theme.text}`}>
                    <span className="font-medium">Reps:</span>{" "}
                    {previousPerformance.lastWorkout.reps_completed ||
                      previousPerformance.lastWorkout.reps}
                  </div>
                )}
                <div className={`text-xs ${theme.textSecondary}`}>
                  {new Date(
                    previousPerformance.lastWorkout.logged_at
                  ).toLocaleDateString()}
                </div>
              </div>
            ) : (
              <div className={`text-sm ${theme.textSecondary}`}>
                No previous data
              </div>
            )}
          </div>

          {/* Personal Best */}
          <div className="rounded-lg p-3 bg-white/60 dark:bg-slate-800/60 border border-green-200 dark:border-green-700">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              <span className={`text-sm font-semibold ${theme.text}`}>
                Personal Best
              </span>
            </div>
            {previousPerformance.personalBest ? (
              <div className="space-y-1">
                {(previousPerformance.personalBest.weight_used ||
                  previousPerformance.personalBest.weight_kg) && (
                  <div className={`text-sm ${theme.text}`}>
                    <span className="font-medium">Weight:</span>{" "}
                    {previousPerformance.personalBest.weight_used ||
                      previousPerformance.personalBest.weight_kg}
                    kg
                  </div>
                )}
                {(previousPerformance.personalBest.reps_completed ||
                  previousPerformance.personalBest.reps) && (
                  <div className={`text-sm ${theme.text}`}>
                    <span className="font-medium">Reps:</span>{" "}
                    {previousPerformance.personalBest.reps_completed ||
                      previousPerformance.personalBest.reps}
                  </div>
                )}
                <div className={`text-xs ${theme.textSecondary}`}>
                  {new Date(
                    previousPerformance.personalBest.logged_at
                  ).toLocaleDateString()}
                </div>
              </div>
            ) : (
              <div className={`text-sm ${theme.textSecondary}`}>
                No personal best yet
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 min-h-screen pb-28">
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

          <div className="px-5 py-6">
            <div className="max-w-4xl mx-auto flex flex-col gap-5">
              {/* Enhanced Header - Mobile Optimized */}
              <GlassCard elevation={2} className="fc-glass fc-card p-4 sm:p-5 mb-4 sm:mb-5">
                <div className="flex items-start gap-3 sm:gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/client/workouts")}
                    className="p-2 sm:p-3 rounded-xl fc-text-dim hover:fc-text-primary flex-shrink-0"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3">
                      <div className="fc-icon-tile fc-icon-workouts w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
                        <Dumbbell className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] sm:tracking-[0.3em] fc-text-dim">
                            Live Session
                          </p>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-xs fc-text-dim">Live</span>
                          </div>
                        </div>
                        <h1 className="text-base sm:text-xl font-bold fc-text-primary leading-tight mt-1 break-words">
                          {assignment?.name || "Workout"}
                        </h1>
                        <p className="text-xs sm:text-sm fc-text-dim mt-0.5">
                          Live workout execution
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>
              {/* Workout Block System */}
              {useBlockSystem && workoutBlocks.length > 0 ? (
                <>
                  {/* Block Progress Indicator */}
                  {workoutBlocks.length > 1 && (
                    <GlassCard elevation={2} className="p-4 mb-4">
                      <div className="flex items-center gap-2 overflow-x-auto pb-2">
                        {workoutBlocks.map((block, index) => {
                          const isCompleted =
                            block.isCompleted || index < currentBlockIndex;
                          const isCurrent = index === currentBlockIndex;
                          const blockClass = isCompleted
                            ? "opacity-50 pointer-events-none bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                            : isCurrent
                            ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20"
                            : "bg-slate-50 dark:bg-slate-800";

                          return (
                            <div
                              key={block.block.id}
                              className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg border-2 ${
                                isCompleted
                                  ? "border-gray-300 dark:border-gray-600"
                                  : isCurrent
                                  ? "border-blue-500"
                                  : "border-slate-300 dark:border-slate-600"
                              } ${blockClass}`}
                              title={
                                block.block.block_name || `Block ${index + 1}`
                              }
                            >
                              {isCompleted ? (
                                <Check className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                              ) : (
                                <span className="text-sm font-semibold">
                                  {index + 1}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
                        Block {currentBlockIndex + 1} of {workoutBlocks.length}
                      </div>
                    </GlassCard>
                  )}
                  <LiveWorkoutBlockExecutor
                    block={workoutBlocks[currentBlockIndex]}
                    onBlockComplete={handleBlockComplete}
                    onNextBlock={handleNextBlock}
                    e1rmMap={e1rmMap}
                    onE1rmUpdate={(exerciseId, e1rm) => {
                      setE1rmMap((prev) => ({
                        ...prev,
                        [exerciseId]: e1rm,
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
                  />
                  {/* Complete Workout Button - Only show on last block when complete */}
                  {isLastBlockComplete &&
                    currentBlockIndex === workoutBlocks.length - 1 && (
                      <div className="mt-6">
                        <Button
                          onClick={async () => {
                            console.log("🔘 Complete Workout button clicked");
                            setShowWorkoutCompletion(false);
                            await completeWorkout();
                          }}
                          className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-2xl h-14 text-lg font-semibold shadow-lg"
                        >
                          <div className="flex items-center gap-3">
                            <CheckCircle className="w-6 h-6" />
                            Complete Workout
                          </div>
                        </Button>
                      </div>
                    )}
                </>
              ) : /* Traditional Workout System */
              loading ? (
                <Card
                  className={`${theme.card} border ${theme.border} rounded-3xl overflow-hidden`}
                >
                  <CardContent className="p-12 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <Dumbbell className="w-10 h-10 text-white animate-pulse" />
                    </div>
                    <h3 className={`text-2xl font-bold ${theme.text} mb-3`}>
                      Loading workout...
                    </h3>
                    <p className={`${theme.textSecondary} mb-6`}>
                      Please wait while we prepare your exercises.
                    </p>
                  </CardContent>
                </Card>
              ) : currentExercise ? (
                <div className="space-y-4 sm:space-y-6">
                  {/* Instruction Card - Only show for types that don't have their own detail cards */}
                  {currentType !== "giant_set" &&
                    currentType !== "circuit" &&
                    currentType !== "tabata" &&
                    currentType !== "amrap" &&
                    currentType !== "emom" &&
                    currentType !== "for_time" &&
                    currentType !== "superset" &&
                    currentType !== "pre_exhaustion" && (
                      <div className="rounded-2xl sm:rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl relative z-30">
                        <Card
                          className={`border-0 ${theme.card} bg-white/90 dark:bg-slate-800/90 backdrop-blur-md overflow-hidden`}
                        >
                          <CardContent className="p-4 sm:p-5">
                            <div className="flex items-start gap-3">
                              <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md">
                                <Lightbulb className="w-4 h-4" />
                              </div>
                              <div className="flex-1">
                                <div
                                  className={`text-base font-semibold ${theme.text} mb-1`}
                                >
                                  How to perform
                                </div>
                                <div
                                  className={`text-base leading-relaxed ${theme.textSecondary} rounded-xl border ${theme.border} bg-white/70 dark:bg-slate-800/50 p-3`}
                                >
                                  {typeHelp}
                                </div>
                              </div>
                              {/* Optional tiny illustration placeholder (hidden if not needed) */}
                              <div className="hidden sm:block shrink-0">
                                <div className="w-16 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 border border-white/40 dark:border-white/10"></div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  {/* AMRAP Flow */}
                  {currentType === "amrap" && (
                    <div
                      style={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: "24px",
                        padding: "24px",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                        border: "2px solid #2196F3",
                      }}
                    >
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
                                style={{
                                  width: "56px",
                                  height: "56px",
                                  borderRadius: "18px",
                                  background:
                                    "linear-gradient(135deg, #2196F3 0%, #64B5F6 100%)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Target
                                  style={{
                                    width: "32px",
                                    height: "32px",
                                    color: "#FFFFFF",
                                  }}
                                />
                              </div>
                              <div>
                                <div
                                  style={{
                                    fontSize: "20px",
                                    fontWeight: "700",
                                    color: "#1A1A1A",
                                  }}
                                >
                                  AMRAP Details
                                </div>
                                <div
                                  style={{ fontSize: "14px", color: "#6B7280" }}
                                >
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
                                  {currentExercise?.meta?.amrap_duration ||
                                    currentExercise?.amrap_duration ||
                                    10}{" "}
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
                            <div className="rounded-xl p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-700/50 border-2 border-blue-200 dark:border-blue-700">
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
                                      className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                                    >
                                      <Calculator className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        setShowExerciseAlternatives(true)
                                      }
                                      className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                                    >
                                      <RefreshCw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
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
                                          ""
                                      )
                                    }
                                    className="flex-shrink-0 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  >
                                    <Youtube className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>

                              {/* Logging Fields */}
                              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200 dark:border-slate-600">
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
                                    className={`w-full h-12 text-center text-lg rounded-xl border-2 border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-700 ${theme.text} font-semibold focus:outline-none focus:border-blue-500`}
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
                                    className={`w-full h-12 text-center text-lg rounded-xl border-2 border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-700 ${theme.text} font-semibold focus:outline-none focus:border-blue-500`}
                                    placeholder="0"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Previous Performance Card */}
                            <PreviousPerformanceCard />

                            {/* Action Buttons */}
                            <div className="space-y-2">
                              {/* Primary: Log and Continue */}
                              <Button
                                onClick={completeAmrapSet}
                                className="w-full bg-[linear-gradient(135deg,rgba(59,130,246,1)_0%,rgba(99,102,241,1)_50%,rgba(147,51,234,1)_100%)] hover:brightness-110 text-white rounded-xl py-6 text-lg font-bold shadow-lg transition-all"
                                disabled={isLoggingSet}
                              >
                                <Check className="w-5 h-5 mr-2" /> Log AMRAP
                              </Button>

                              {/* Secondary: Start Timer */}
                              <Button
                                onClick={() => {
                                  const minutes =
                                    Number(
                                      currentExercise?.meta?.amrap_duration
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
                            <div className="mt-2 text-slate-600 dark:text-slate-300">
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
                    <div
                      style={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: "24px",
                        padding: "24px",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                        border: "2px solid #4CAF50",
                      }}
                    >
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
                                <div
                                  style={{
                                    width: "56px",
                                    height: "56px",
                                    borderRadius: "18px",
                                    background:
                                      "linear-gradient(135deg, #4CAF50 0%, #81C784 100%)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <Clock
                                    style={{
                                      width: "32px",
                                      height: "32px",
                                      color: "#FFFFFF",
                                    }}
                                  />
                                </div>
                                <div>
                                  <div
                                    style={{
                                      fontSize: "20px",
                                      fontWeight: "700",
                                      color: "#1A1A1A",
                                    }}
                                  >
                                    EMOM Details (Rep-Based)
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "14px",
                                      color: "#6B7280",
                                    }}
                                  >
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
                                    {currentExercise?.meta?.emom_duration ||
                                      currentExercise?.emom_duration ||
                                      10}{" "}
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
                                      currentExercise?.meta?.emom_duration
                                    ) ||
                                    Number(currentExercise?.emom_duration) ||
                                    10;
                                  setEmomRepTimeLeft(minutes * 60);
                                  setEmomRepActive(true);
                                }}
                                className="w-full bg-[linear-gradient(135deg,rgba(59,130,246,1)_0%,rgba(99,102,241,1)_50%,rgba(147,51,234,1)_100%)] hover:brightness-110 text-white rounded-xl py-6 text-lg font-bold shadow-lg transition-all"
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
                              <div className="mt-2 text-slate-600 dark:text-slate-300">
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
                                  {currentExercise?.meta?.emom_duration ||
                                    currentExercise?.emom_duration ||
                                    10}{" "}
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
                                  {currentExercise?.meta?.work_seconds ||
                                    currentExercise?.work_seconds ||
                                    40}
                                  s
                                </div>
                              </div>
                            </div>

                            {/* Start Button */}
                            <Button
                              onClick={() => {
                                const minutes =
                                  Number(
                                    currentExercise?.meta?.emom_duration
                                  ) ||
                                  Number(currentExercise?.emom_duration) ||
                                  10;
                                const workSeconds =
                                  Number(currentExercise?.meta?.work_seconds) ||
                                  Number(currentExercise?.work_seconds) ||
                                  40;
                                const restSeconds = Math.max(
                                  0,
                                  60 - workSeconds
                                );
                                setEmomTotalLeft(minutes * 60);
                                setEmomPhase("work");
                                setEmomPhaseLeft(workSeconds);
                                setEmomActive(true);
                              }}
                              className="w-full bg-[linear-gradient(135deg,rgba(59,130,246,1)_0%,rgba(99,102,241,1)_50%,rgba(147,51,234,1)_100%)] hover:brightness-110 text-white rounded-xl py-6 text-lg font-bold shadow-lg transition-all"
                            >
                              <Clock className="w-5 h-5 mr-2" /> Start EMOM
                            </Button>
                          </div>
                        ) : emomActive ? (
                          <div className="flex flex-col items-center justify-center py-8">
                            <div className="text-sm uppercase tracking-wide text-slate-600 dark:text-slate-300 mb-1">
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
                            <div className="mt-2 text-slate-600 dark:text-slate-300">
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

                  {/* Tabata / Circuit Flow */}
                  {(currentType === "tabata" || currentType === "circuit") && (
                    <div
                      style={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: "24px",
                        padding: "24px",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                        border:
                          currentType === "tabata"
                            ? "2px solid #F5576C"
                            : "2px solid #6C5CE7",
                      }}
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
                                  style={{
                                    width: "56px",
                                    height: "56px",
                                    borderRadius: "18px",
                                    background:
                                      currentType === "tabata"
                                        ? "linear-gradient(135deg, #F5576C 0%, #FF8A80 100%)"
                                        : "linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <Activity
                                    style={{
                                      width: "32px",
                                      height: "32px",
                                      color: "#FFFFFF",
                                    }}
                                  />
                                </div>
                                <div>
                                  <div
                                    style={{
                                      fontSize: "20px",
                                      fontWeight: "700",
                                      color: "#1A1A1A",
                                    }}
                                  >
                                    {currentType === "tabata"
                                      ? "Tabata"
                                      : "Circuit"}{" "}
                                    Details
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "14px",
                                      color: "#6B7280",
                                    }}
                                  >
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
                                      ? currentExercise?.rounds ||
                                        currentExercise?.meta?.rounds ||
                                        8
                                      : currentExercise?.sets || 1}
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
                                          : currentExercise?.meta?.circuit_sets;
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
                                    : currentExercise?.meta?.circuit_sets;
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
                                                    exerciseIndex: number
                                                  ) => {
                                                    const exerciseInfo =
                                                      exerciseLookup[
                                                        exercise.exercise_id
                                                      ];
                                                    return (
                                                      <div
                                                        key={exerciseIndex}
                                                        className="rounded-lg p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600"
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
                                                                    true
                                                                  )
                                                                }
                                                                className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                                                              >
                                                                <Calculator className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                                              </Button>
                                                              <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() =>
                                                                  setShowExerciseAlternatives(
                                                                    true
                                                                  )
                                                                }
                                                                className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                                                              >
                                                                <RefreshCw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
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
                                                                        {currentExercise?.work_seconds ||
                                                                          currentExercise
                                                                            ?.meta
                                                                            ?.work_seconds}
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
                                                                        {currentExercise?.rest_seconds ||
                                                                          currentExercise
                                                                            ?.meta
                                                                            ?.rest_seconds}
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
                                                                    ""
                                                                );
                                                                setShowVideoModal(
                                                                  true
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
                                                  }
                                                )}
                                            </div>
                                          </div>
                                        )
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
                                setIntervalMode(currentType as any);
                                setIntervalRound(0);
                                setIntervalPhase("work");
                                setIntervalActive(true);

                                // Initialize timer with first exercise
                                const sets =
                                  currentType === "tabata"
                                    ? currentExercise?.meta?.tabata_sets ||
                                      currentExercise?.tabata_sets
                                    : currentExercise?.meta?.circuit_sets;
                                const firstSet = sets?.[0];
                                const firstExercise = firstSet?.exercises?.[0];
                                const workTime =
                                  firstExercise?.work_seconds || 20;
                                setIntervalPhaseLeft(workTime);

                                // Set total rounds
                                const rounds = currentExercise?.sets || 1;
                                setIntervalTotalRounds(rounds);
                              }}
                              className="w-full bg-[linear-gradient(135deg,rgba(59,130,246,1)_0%,rgba(99,102,241,1)_50%,rgba(147,51,234,1)_100%)] hover:brightness-110 text-white rounded-xl py-6 text-lg font-bold shadow-lg transition-all"
                            >
                              <Clock className="w-5 h-5 mr-2" /> Start{" "}
                              {currentType === "tabata" ? "Tabata" : "Circuit"}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-8">
                            <div className="text-sm text-slate-600 dark:text-slate-300 mb-1">
                              Round{" "}
                              {Math.min(
                                intervalRound +
                                  (intervalPhase === "rest" ? 1 : 1),
                                intervalTotalRounds
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
                            <div className="mt-2 text-slate-600 dark:text-slate-300">
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
                    <div
                      style={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: "24px",
                        padding: "24px",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                        border: "2px solid #6C5CE7",
                      }}
                    >
                      <div>
                        {/* Header */}
                        <div
                          className="flex items-center"
                          style={{ gap: "12px", marginBottom: "16px" }}
                        >
                          <div
                            style={{
                              width: "56px",
                              height: "56px",
                              borderRadius: "18px",
                              background:
                                "linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Dumbbell
                              style={{
                                width: "32px",
                                height: "32px",
                                color: "#FFFFFF",
                              }}
                            />
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: "20px",
                                fontWeight: "700",
                                color: "#1A1A1A",
                              }}
                            >
                              Cluster Set
                            </div>
                            <div style={{ fontSize: "14px", color: "#6B7280" }}>
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
                                currentExercise?.meta?.clusters_per_set
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
                                currentExercise?.meta?.intra_cluster_rest
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
                                className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                              >
                                <Calculator className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setShowExerciseAlternatives(true)
                                }
                                className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2.5">
                              {(currentExercise?.reps ||
                                currentExercise?.meta?.cluster_reps) && (
                                <div className="px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700 inline-block">
                                  <span
                                    className={`text-sm font-bold ${theme.text}`}
                                  >
                                    {currentExercise?.reps ||
                                      currentExercise?.meta?.cluster_reps}{" "}
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
                                    RIR: {currentExercise.rir}
                                  </span>
                                </div>
                              )}
                              {currentExercise?.tempo && (
                                <div className="px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/40 border border-purple-300 dark:border-purple-700">
                                  <span
                                    className={`text-xs font-semibold ${theme.text}`}
                                  >
                                    Tempo: {currentExercise.tempo}
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
                                  currentExercise.exercise?.video_url || ""
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
                                    currentExercise?.meta?.cluster_reps
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
                                    className={`w-full h-10 text-center text-sm rounded-lg border-2 border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-700 ${theme.text} font-semibold focus:outline-none focus:border-blue-500`}
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
                                        currentExercise?.meta?.cluster_reps
                                      ) ||
                                      Number(currentExercise?.cluster_reps) ||
                                      1
                                    }
                                    readOnly
                                    className={`w-full h-10 text-center text-sm rounded-lg border-2 border-blue-300 dark:border-blue-700 bg-slate-100 dark:bg-slate-700 ${theme.text} font-semibold`}
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
                            className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg"
                          >
                            <Clock className="w-4 h-4 mr-2" />
                            Start Rest Timer
                          </Button>
                        </div>

                        {/* Previous Performance Card */}
                        <div className="mt-4">
                          <PreviousPerformanceCard />
                        </div>

                        {/* Log Button */}
                        <div className="mt-4">
                          <Button
                            onClick={() => {
                              // TODO: Implement cluster set completion logic
                              console.log(
                                "Logging cluster set:",
                                clusterWeights
                              );
                            }}
                            className="w-full bg-[linear-gradient(135deg,rgba(59,130,246,1)_0%,rgba(99,102,241,1)_50%,rgba(147,51,234,1)_100%)] hover:brightness-110 text-white rounded-xl py-6 text-lg font-bold shadow-lg transition-all"
                            disabled={clusterWeights.some(
                              (w) => !w || w === "0"
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
                    <div
                      style={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: "24px",
                        padding: "24px",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                        border: "2px solid #4CAF50",
                      }}
                    >
                      <div>
                        {/* Header */}
                        <div
                          className="flex items-center"
                          style={{ gap: "12px", marginBottom: "16px" }}
                        >
                          <div
                            style={{
                              width: "56px",
                              height: "56px",
                              borderRadius: "18px",
                              background:
                                "linear-gradient(135deg, #4CAF50 0%, #81C784 100%)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Dumbbell
                              style={{
                                width: "32px",
                                height: "32px",
                                color: "#FFFFFF",
                              }}
                            />
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: "20px",
                                fontWeight: "700",
                                color: "#1A1A1A",
                              }}
                            >
                              Rest Pause Set
                            </div>
                            <div style={{ fontSize: "14px", color: "#6B7280" }}>
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
                                currentExercise?.meta?.rest_pause_duration
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
                                className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                              >
                                <Calculator className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setShowExerciseAlternatives(true)
                                }
                                className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2.5">
                              {(currentExercise?.reps ||
                                currentExercise?.meta?.rest_pause_reps) && (
                                <div className="px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700 inline-block">
                                  <span
                                    className={`text-sm font-bold ${theme.text}`}
                                  >
                                    {currentExercise?.reps ||
                                      currentExercise?.meta
                                        ?.rest_pause_reps}{" "}
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
                                    RIR: {currentExercise.rir}
                                  </span>
                                </div>
                              )}
                              {currentExercise?.tempo && (
                                <div className="px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/40 border border-purple-300 dark:border-purple-700">
                                  <span
                                    className={`text-xs font-semibold ${theme.text}`}
                                  >
                                    Tempo: {currentExercise.tempo}
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
                                  currentExercise.exercise?.video_url || ""
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
                          <div className="rounded-xl p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-700/50 border-2 border-blue-200 dark:border-blue-700">
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
                                  className={`w-full h-12 text-center text-lg rounded-xl border-2 border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-700 ${theme.text} font-semibold focus:outline-none focus:border-blue-500`}
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
                                  className={`w-full h-12 text-center text-lg rounded-xl border-2 border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-700 ${theme.text} font-semibold focus:outline-none focus:border-blue-500`}
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
                                              i === idx ? e.target.value : x
                                            )
                                          )
                                        }
                                        className={`w-full h-10 text-center text-sm rounded-lg border-2 border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-700 ${theme.text} font-semibold focus:outline-none focus:border-blue-500`}
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
                                              ?.rest_pause_duration
                                          ) ||
                                          Number(
                                            currentExercise?.rest_pause_duration
                                          ) ||
                                          0
                                        }
                                        readOnly
                                        className={`w-full h-10 text-center text-sm rounded-lg border-2 border-blue-300 dark:border-blue-700 bg-slate-100 dark:bg-slate-700 ${theme.text} font-semibold`}
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
                          <PreviousPerformanceCard />
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
                            className="w-full bg-[linear-gradient(135deg,rgba(59,130,246,1)_0%,rgba(99,102,241,1)_50%,rgba(147,51,234,1)_100%)] hover:brightness-110 text-white rounded-xl py-6 text-lg font-bold shadow-lg transition-all"
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
                    <div
                      style={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: "24px",
                        padding: "24px",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                        border: "2px solid #FFD54F",
                      }}
                    >
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
                              <div
                                style={{
                                  width: "56px",
                                  height: "56px",
                                  borderRadius: "18px",
                                  background:
                                    "linear-gradient(135deg, #FFD54F 0%, #FFE082 100%)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Trophy
                                  style={{
                                    width: "32px",
                                    height: "32px",
                                    color: "#FFFFFF",
                                  }}
                                />
                              </div>
                              <div>
                                <div
                                  style={{
                                    fontSize: "20px",
                                    fontWeight: "700",
                                    color: "#1A1A1A",
                                  }}
                                >
                                  For Time Details
                                </div>
                                <div
                                  style={{ fontSize: "14px", color: "#6B7280" }}
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
                                  {currentExercise?.meta?.time_cap ||
                                    currentExercise?.time_cap ||
                                    10}{" "}
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
                                  {currentExercise?.meta?.target_reps ||
                                    currentExercise?.target_reps ||
                                    currentExercise?.reps ||
                                    "-"}
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
                              className="w-full bg-[linear-gradient(135deg,rgba(59,130,246,1)_0%,rgba(99,102,241,1)_50%,rgba(147,51,234,1)_100%)] hover:brightness-110 text-white rounded-xl py-6 text-lg font-bold shadow-lg transition-all"
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
                            <div className="mt-2 text-slate-600 dark:text-slate-300">
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
                              <div className="text-sm text-slate-600 dark:text-slate-300">
                                Completion Time
                              </div>
                            </div>

                            {/* Weight and Reps Inputs */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
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
                                  className="w-full h-12 text-center text-lg font-bold rounded-xl border-2 border-blue-300 dark:border-indigo-700 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-indigo-500"
                                  step="0.5"
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
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
                                  className="w-full h-12 text-center text-lg font-bold rounded-xl border-2 border-blue-300 dark:border-indigo-700 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-indigo-500"
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
                              className="w-full bg-[linear-gradient(135deg,#4CAF50_0%,#81C784_100%)] hover:brightness-110 text-white rounded-xl py-6 text-lg font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Check className="w-5 h-5 mr-2" /> Complete Set
                            </Button>
                          </div>
                        ) : (
                          <div className="p-3 bg-white/80 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                            <div className="text-sm text-slate-700 dark:text-slate-200">
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
                    <div
                      style={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: "24px",
                        padding: "24px",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                        border: "2px solid #F5576C",
                      }}
                    >
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
                            <div
                              style={{
                                fontSize: "20px",
                                fontWeight: "700",
                                color: "#1A1A1A",
                              }}
                            >
                              {currentType === "superset"
                                ? "Superset"
                                : "Pre-Exhaustion"}
                            </div>
                            {(currentExercise?.rest_seconds ||
                              currentExercise?.meta?.rest_seconds) && (
                              <div className="px-2 py-1 rounded bg-green-100 dark:bg-green-900/40 border border-green-300 dark:border-green-700">
                                <span
                                  className={`text-xs font-semibold ${theme.text}`}
                                >
                                  Rest:{" "}
                                  {currentExercise?.rest_seconds ||
                                    currentExercise?.meta?.rest_seconds}
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
                              className={`p-4 ${theme.card} bg-white/95 dark:bg-slate-800/95 rounded-2xl space-y-3`}
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
                                      className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                                    >
                                      <Calculator className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        setShowExerciseAlternatives(true)
                                      }
                                      className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                                    >
                                      <RefreshCw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
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
                                          ""
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
                                      {currentExercise?.meta?.superset_reps_a ||
                                        currentExercise?.reps}{" "}
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
                                      RIR: {currentExercise.rir}
                                    </span>
                                  </div>
                                )}
                                {currentExercise?.tempo && (
                                  <div className="px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/40 border border-purple-300 dark:border-purple-700">
                                    <span
                                      className={`text-xs font-semibold ${theme.text}`}
                                    >
                                      Tempo: {currentExercise.tempo}
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
                                    className={`w-full h-12 text-center text-lg rounded-xl border-2 border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-700 ${theme.text} font-semibold focus:outline-none focus:border-blue-500`}
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
                                    className={`w-full h-12 text-center text-lg rounded-xl border-2 border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-700 ${theme.text} font-semibold focus:outline-none focus:border-blue-500`}
                                    placeholder="0"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Exercise B */}
                          <div className="rounded-2xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-xl">
                            <div
                              className={`p-4 ${theme.card} bg-white/95 dark:bg-slate-800/95 rounded-2xl space-y-3`}
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
                                            ?.superset_exercise_id ||
                                          currentExercise?.superset_exercise_id;
                                        const exerciseInfo = exerciseId
                                          ? exerciseLookup[exerciseId]
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
                                      className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                                    >
                                      <Calculator className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        setShowExerciseAlternatives(true)
                                      }
                                      className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                                    >
                                      <RefreshCw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                    </Button>
                                  </div>
                                </div>
                                {(() => {
                                  const exerciseId =
                                    currentExercise?.meta
                                      ?.superset_exercise_id ||
                                    currentExercise?.superset_exercise_id;
                                  const exerciseInfo = exerciseId
                                    ? exerciseLookup[exerciseId]
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
                                      {currentExercise?.meta?.superset_reps_b ||
                                        currentExercise?.meta?.superset_reps ||
                                        currentExercise?.superset_reps ||
                                        currentExercise?.reps}{" "}
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
                                    className={`w-full h-12 text-center text-lg rounded-xl border-2 border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-700 ${theme.text} font-semibold focus:outline-none focus:border-blue-500`}
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
                                    className={`w-full h-12 text-center text-lg rounded-xl border-2 border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-700 ${theme.text} font-semibold focus:outline-none focus:border-blue-500`}
                                    placeholder="0"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Previous Performance Card */}
                        <div style={{ marginTop: "24px" }}>
                          <PreviousPerformanceCard />
                        </div>

                        {/* Log Button */}
                        <Button
                          onClick={completeSuperset}
                          style={{
                            width: "100%",
                            background:
                              "linear-gradient(135deg, #4CAF50 0%, #81C784 100%)",
                            color: "#FFFFFF",
                            borderRadius: "20px",
                            padding: "16px 32px",
                            fontSize: "16px",
                            fontWeight: "600",
                            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                            border: "none",
                            cursor: isLoggingSet ? "not-allowed" : "pointer",
                            opacity: isLoggingSet ? 0.5 : 1,
                            marginTop: "24px",
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
                    <div
                      style={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: "24px",
                        padding: "24px",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                        border: "2px solid #6C5CE7",
                        position: "relative",
                        zIndex: 20,
                      }}
                    >
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
                                className={`p-4 ${theme.card} bg-white/95 dark:bg-slate-800/95 rounded-2xl space-y-3`}
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
                                      <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                                        {displayName}
                                      </div>
                                      {/* Utility Icon Buttons */}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          setShowPlateCalculator(true)
                                        }
                                        className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                                      >
                                        <Calculator className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          setShowExerciseAlternatives(true)
                                        }
                                        className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                                      >
                                        <RefreshCw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
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
                                      className={`block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1`}
                                    >
                                      Weight (kg)
                                    </label>
                                    <input
                                      type="number"
                                      value={giantWeights[idx] || ""}
                                      onChange={(e) =>
                                        setGiantWeights((prev) =>
                                          prev.map((w, i) =>
                                            i === idx ? e.target.value : w
                                          )
                                        )
                                      }
                                      className={`w-full h-12 text-center text-lg rounded-xl border-2 border-blue-300 dark:border-indigo-700 bg-white/90 dark:bg-slate-700 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500 dark:focus:border-indigo-500`}
                                      step="0.5"
                                    />
                                  </div>
                                  <div>
                                    <label
                                      className={`block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1`}
                                    >
                                      Reps
                                    </label>
                                    <input
                                      type="number"
                                      value={giantReps[idx] || ""}
                                      readOnly
                                      className={`w-full h-12 text-center text-lg rounded-xl border-2 border-blue-300 dark:border-indigo-700 bg-white/80 dark:bg-slate-700 text-slate-900 dark:text-white font-semibold`}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Previous Performance Card */}
                        <div style={{ marginTop: "24px" }}>
                          <PreviousPerformanceCard />
                        </div>

                        <Button
                          onClick={completeGiantSet}
                          style={{
                            width: "100%",
                            background:
                              "linear-gradient(135deg, #4CAF50 0%, #81C784 100%)",
                            color: "#FFFFFF",
                            borderRadius: "20px",
                            padding: "16px 32px",
                            fontSize: "16px",
                            fontWeight: "600",
                            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                            border: "none",
                            cursor: isLoggingSet ? "not-allowed" : "pointer",
                            opacity: isLoggingSet ? 0.5 : 1,
                            marginTop: "24px",
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
                    currentType !== "circuit" &&
                    currentType !== "tabata" &&
                    currentType !== "amrap" &&
                    currentType !== "emom" &&
                    currentType !== "for_time" &&
                    currentType !== "superset" &&
                    currentType !== "pre_exhaustion" &&
                    currentType !== "cluster_set" &&
                    currentType !== "rest_pause" && (
                      <div
                        style={{
                          backgroundColor: "#FFFFFF",
                          borderRadius: "24px",
                          padding: "24px",
                          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                          border: "2px solid #2196F3",
                        }}
                      >
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
                                background:
                                  "linear-gradient(135deg, #2196F3 0%, #64B5F6 100%)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              <Dumbbell
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  color: "#FFFFFF",
                                }}
                              />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <div
                                  style={{
                                    fontSize: "20px",
                                    fontWeight: "700",
                                    color: "#1A1A1A",
                                  }}
                                >
                                  {currentExercise.exercise?.name || "Exercise"}
                                </div>
                                {/* Utility Icon Buttons */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setShowPlateCalculator(true)}
                                  className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                                >
                                  <Calculator className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setShowExerciseAlternatives(true)
                                  }
                                  className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                                >
                                  <RefreshCw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                </Button>
                              </div>
                              <div
                                className="flex flex-wrap"
                                style={{ gap: "8px" }}
                              >
                                {targetReps && (
                                  <div
                                    style={{
                                      backgroundColor: "#EDE7F6",
                                      borderRadius: "12px",
                                      padding: "6px 12px",
                                      display: "inline-block",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: "14px",
                                        fontWeight: "600",
                                        color: "#6C5CE7",
                                      }}
                                    >
                                      {targetReps} reps
                                    </span>
                                  </div>
                                )}
                                {(currentExercise?.rir ||
                                  currentExercise?.rir === 0) && (
                                  <div
                                    style={{
                                      backgroundColor: "#FFE0B2",
                                      borderRadius: "12px",
                                      padding: "6px 12px",
                                      display: "inline-block",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: "14px",
                                        fontWeight: "600",
                                        color: "#F5576C",
                                      }}
                                    >
                                      RIR: {currentExercise.rir}
                                    </span>
                                  </div>
                                )}
                                {currentExercise?.exercise_id &&
                                  currentExercise?.load_percentage &&
                                  getSuggestedWeightText(
                                    currentExercise.exercise_id,
                                    currentExercise.load_percentage
                                  ) && (
                                    <div
                                      style={{
                                        backgroundColor: "#E8F5E9",
                                        borderRadius: "12px",
                                        padding: "6px 12px",
                                        display: "inline-block",
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontSize: "14px",
                                          fontWeight: "600",
                                          color: "#2E7D32",
                                        }}
                                      >
                                        {getSuggestedWeightText(
                                          currentExercise.exercise_id,
                                          currentExercise.load_percentage
                                        )}
                                      </span>
                                    </div>
                                  )}
                                {currentExercise?.tempo && (
                                  <div
                                    style={{
                                      backgroundColor: "#E3F2FD",
                                      borderRadius: "12px",
                                      padding: "6px 12px",
                                      display: "inline-block",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: "14px",
                                        fontWeight: "600",
                                        color: "#2196F3",
                                      }}
                                    >
                                      Tempo: {currentExercise.tempo}
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
                                    currentExercise.exercise?.video_url || ""
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
                            className="grid grid-cols-2"
                            style={{
                              gap: "16px",
                              paddingTop: "16px",
                              borderTop: "1px solid #E5E7EB",
                            }}
                          >
                            <div>
                              <label
                                style={{
                                  display: "block",
                                  fontSize: "14px",
                                  fontWeight: "600",
                                  color: "#6B7280",
                                  marginBottom: "8px",
                                }}
                              >
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
                                style={{
                                  width: "100%",
                                  height: "56px",
                                  textAlign: "center",
                                  fontSize: "18px",
                                  fontWeight: "700",
                                  color: "#1A1A1A",
                                  backgroundColor: "#FFFFFF",
                                  border: "2px solid #2196F3",
                                  borderRadius: "16px",
                                  outline: "none",
                                }}
                                step="0.5"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label
                                style={{
                                  display: "block",
                                  fontSize: "14px",
                                  fontWeight: "600",
                                  color: "#6B7280",
                                  marginBottom: "8px",
                                }}
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
                                style={{
                                  width: "100%",
                                  height: "56px",
                                  textAlign: "center",
                                  fontSize: "18px",
                                  fontWeight: "700",
                                  color: "#1A1A1A",
                                  backgroundColor: "#FFFFFF",
                                  border: "2px solid #2196F3",
                                  borderRadius: "16px",
                                  outline: "none",
                                }}
                                placeholder="0"
                              />
                            </div>
                          </div>

                          {/* Drop Set - Second Set Fields */}
                          {currentType === "drop_set" && (
                            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                              <div className="flex items-center gap-2 mb-2">
                                <Calculator className="w-3 h-3 text-orange-500" />
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                  Drop Set (Second Set)
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-xs text-slate-500 dark:text-slate-500 mb-1">
                                    Drop Weight (kg)
                                  </label>
                                  <input
                                    type="number"
                                    value={dropWeight === "" ? "" : dropWeight}
                                    onChange={(e) =>
                                      setDropWeight(e.target.value)
                                    }
                                    className="w-full h-8 text-center text-sm rounded-lg border border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20 text-slate-700 dark:text-slate-300"
                                    step="0.5"
                                    placeholder={
                                      currentSetData.weight > 0
                                        ? (
                                            currentSetData.weight *
                                            (1 -
                                              (Number(
                                                currentExercise?.meta
                                                  ?.drop_percentage
                                              ) ||
                                                Number(
                                                  currentExercise?.drop_percentage
                                                ) ||
                                                0) /
                                                100)
                                          ).toFixed(1)
                                        : "Auto"
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-slate-500 dark:text-slate-500 mb-1">
                                    Reps
                                  </label>
                                  <input
                                    type="number"
                                    value={dropReps === 0 ? "" : dropReps}
                                    onChange={(e) =>
                                      setDropReps(parseInt(e.target.value) || 0)
                                    }
                                    className="w-full h-8 text-center text-sm rounded-lg border border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20 text-slate-700 dark:text-slate-300"
                                    placeholder="0"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Previous Performance Card */}
                          <div style={{ marginTop: "24px" }}>
                            <PreviousPerformanceCard />
                          </div>

                          {/* Log Button */}
                          <Button
                            onClick={completeSet}
                            style={{
                              width: "100%",
                              background:
                                "linear-gradient(135deg, #4CAF50 0%, #81C784 100%)",
                              color: "#FFFFFF",
                              borderRadius: "20px",
                              padding: "16px 32px",
                              fontSize: "16px",
                              fontWeight: "600",
                              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                              border: "none",
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
                            Math.max(0, currentExerciseIndex - 1)
                          )
                        }
                        disabled={currentExerciseIndex === 0}
                        className="flex-1 mr-2"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </Button>

                      <div className="text-center px-4">
                        <div className="text-sm text-slate-600 dark:text-slate-300">
                          Exercise
                        </div>
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
                              currentExerciseIndex + 1
                            )
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
                <Card
                  className={`${theme.card} border ${theme.border} rounded-3xl overflow-hidden`}
                >
                  <CardContent className="p-12 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-pink-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <AlertTriangle className="w-10 h-10 text-white" />
                    </div>
                    <h3 className={`text-2xl font-bold ${theme.text} mb-3`}>
                      No exercises found
                    </h3>
                    <p className={`${theme.textSecondary} mb-6`}>
                      This workout doesn&apos;t have any exercises assigned.
                    </p>
                    <Button
                      onClick={() => router.push("/client/workouts")}
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Workouts
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Full-Screen Timer Modal for Tabata/Circuit */}
        {showTimerModal &&
          (currentType === "tabata" || currentType === "circuit") && (
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
                        const circuitSets =
                          currentExercise?.meta?.circuit_sets || [];

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
                  {currentExercise?.meta?.circuit_sets &&
                    currentExercise.meta.circuit_sets[timerSetIndex]
                      ?.exercises && (
                      <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-8 py-6 max-w-md mb-12">
                        <div className="text-2xl font-bold text-white mb-2">
                          {(() => {
                            const currentExerciseInSet =
                              currentExercise.meta.circuit_sets[timerSetIndex]
                                ?.exercises?.[timerExerciseIndex];
                            return (
                              exerciseLookup[currentExerciseInSet?.exercise_id]
                                ?.name || "Exercise"
                            );
                          })()}
                        </div>
                        {intervalPhase === "work" && (
                          <div className="text-lg text-gray-200">
                            {currentExercise.meta.circuit_sets[timerSetIndex]
                              ?.exercises?.[timerExerciseIndex]?.work_seconds
                              ? `${currentExercise.meta.circuit_sets[timerSetIndex].exercises[timerExerciseIndex].work_seconds}s work`
                              : currentExercise.meta.circuit_sets[timerSetIndex]
                                  ?.exercises?.[timerExerciseIndex]?.target_reps
                              ? `${currentExercise.meta.circuit_sets[timerSetIndex].exercises[timerExerciseIndex].target_reps} reps`
                              : "Work phase"}
                          </div>
                        )}
                      </div>
                    )}

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
                  {currentExercise?.meta?.circuit_sets &&
                    currentExercise.meta.circuit_sets[timerSetIndex]
                      ?.exercises && (
                      <div className="mb-4">
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-6 py-4 text-center">
                          <div className="text-sm text-gray-300 mb-1">
                            Next:
                          </div>
                          <div className="text-lg font-semibold text-white">
                            {timerExerciseIndex + 1 <
                            currentExercise.meta.circuit_sets[timerSetIndex]
                              .exercises.length
                              ? exerciseLookup[
                                  currentExercise.meta.circuit_sets[
                                    timerSetIndex
                                  ].exercises[timerExerciseIndex + 1]
                                    ?.exercise_id
                                ]?.name || "Next Exercise"
                              : timerSetIndex + 1 <
                                currentExercise.meta.circuit_sets.length
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
                      const circuitSets = currentExercise?.meta?.circuit_sets;

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
                      const circuitSets = currentExercise?.meta?.circuit_sets;

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
                  size="sm"
                  onClick={closeVideoModal}
                  className="text-white hover:bg-white/20 rounded-2xl"
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
                  size="sm"
                  onClick={() => setShowExerciseImage(false)}
                  className="text-white hover:bg-white/20 rounded-2xl"
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
            <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden border-0 shadow-2xl">
              <div className="p-6">
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <Calculator className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">
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
                    className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                {!showPlateResults ? (
                  // Input Screen
                  <div className="space-y-6">
                    {/* Barbell Selection */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
                                : "border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500"
                            }`}
                          >
                            <div className="text-center">
                              <div className="text-lg font-bold text-slate-800 dark:text-white">
                                {barbell.weight}kg
                              </div>
                              <div className="text-xs text-slate-600 dark:text-slate-400">
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
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Target Weight:
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={targetWeight}
                          onChange={(e) => setTargetWeight(e.target.value)}
                          className="w-full p-4 text-2xl font-bold text-center border-2 border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-blue-500 focus:outline-none"
                          placeholder="142.5"
                        />
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 dark:text-slate-400 font-medium">
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
                        selectedBarbell
                      );
                      const selectedBarbellInfo = barbellOptions.find(
                        (b) => b.weight === selectedBarbell
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
                                        <div className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full border border-slate-400 dark:border-slate-500 flex items-center justify-center">
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
                                        <div className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full border border-slate-400 dark:border-slate-500 flex items-center justify-center">
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
                                        <div className="w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full border border-slate-400 dark:border-slate-500 flex items-center justify-center">
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
                              <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                                <div className="text-center text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
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
                                                  className={`${innerSize} bg-slate-300 dark:bg-slate-600 rounded-full border border-slate-400 dark:border-slate-500 flex items-center justify-center`}
                                                >
                                                  {/* Tiny black center */}
                                                  <div className="w-0.5 h-0.5 bg-black rounded-full"></div>
                                                </div>
                                              </div>
                                              <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-1">
                                                {plate.weight}
                                              </div>
                                            </div>
                                          )
                                        );
                                      })
                                      .flat()}
                                  </div>

                                  {/* Barbell shaft - aligned with black dots */}
                                  <div className="flex-1 h-0.5 bg-slate-400 dark:bg-slate-500 mx-3 rounded relative">
                                    {/* Align barbell with the center of plates (black dots) */}
                                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-400 dark:bg-slate-500 rounded"></div>
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
                                                  className={`${innerSize} bg-slate-300 dark:bg-slate-600 rounded-full border border-slate-400 dark:border-slate-500 flex items-center justify-center`}
                                                >
                                                  {/* Tiny black center */}
                                                  <div className="w-0.5 h-0.5 bg-black rounded-full"></div>
                                                </div>
                                              </div>
                                              <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-1">
                                                {plate.weight}
                                              </div>
                                            </div>
                                          )
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
                                      <div className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full border border-slate-400 dark:border-slate-500 flex items-center justify-center">
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
                                      <div className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full border border-slate-400 dark:border-slate-500 flex items-center justify-center">
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
                      className="w-full py-3 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-white font-medium rounded-xl hover:bg-slate-300 dark:hover:bg-slate-500 transition-all"
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
            <div
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "24px",
                width: "100%",
                maxWidth: "448px",
                maxHeight: "90vh",
                overflow: "hidden",
                border: "none",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.12)",
              }}
            >
              <div style={{ padding: "32px", textAlign: "center" }}>
                {/* Celebration Header */}
                <div style={{ marginBottom: "24px" }}>
                  <div
                    style={{
                      width: "80px",
                      height: "80px",
                      background:
                        "linear-gradient(135deg, #4CAF50 0%, #81C784 100%)",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 16px",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                    }}
                  >
                    <Trophy
                      style={{
                        width: "40px",
                        height: "40px",
                        color: "#FFFFFF",
                      }}
                    />
                  </div>
                  <h2
                    style={{
                      fontSize: "32px",
                      fontWeight: "800",
                      color: "#1A1A1A",
                      lineHeight: "1.2",
                      marginBottom: "8px",
                    }}
                  >
                    Workout Complete! 🎉
                  </h2>
                  <p
                    style={{
                      fontSize: "16px",
                      fontWeight: "400",
                      color: "#6B7280",
                    }}
                  >
                    Amazing work! You crushed this workout!
                  </p>
                </div>

                {/* Weight Lifted Highlight */}
                <div
                  style={{
                    padding: "24px",
                    backgroundColor: "#FFE082",
                    borderRadius: "24px",
                    border: "2px solid #F5576C",
                    marginBottom: "24px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "40px",
                      fontWeight: "800",
                      color: "#1A1A1A",
                      lineHeight: "1.1",
                      marginBottom: "8px",
                    }}
                  >
                    {workoutStats.totalWeightLifted.toLocaleString()} kg
                  </div>
                  <div
                    style={{
                      fontSize: "18px",
                      fontWeight: "600",
                      color: "#1A1A1A",
                    }}
                  >
                    Total Weight Lifted
                  </div>
                </div>

                {/* Performance Stats */}
                <div style={{ marginBottom: "32px" }}>
                  <div className="grid grid-cols-3" style={{ gap: "12px" }}>
                    <div
                      style={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: "24px",
                        padding: "16px",
                        textAlign: "center",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                        border: "2px solid #2196F3",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "32px",
                          fontWeight: "800",
                          color: "#1A1A1A",
                          lineHeight: "1.1",
                        }}
                      >
                        {(() => {
                          console.log(
                            "🕐 [Duration Debug] Modal displaying totalTime:",
                            {
                              totalTime: workoutStats.totalTime,
                              unit: "minutes",
                            }
                          );
                          return workoutStats.totalTime;
                        })()}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: "400",
                          color: "#6B7280",
                        }}
                      >
                        Minutes
                      </div>
                    </div>
                    <div
                      style={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: "24px",
                        padding: "16px",
                        textAlign: "center",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                        border: "2px solid #6C5CE7",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "32px",
                          fontWeight: "800",
                          color: "#1A1A1A",
                          lineHeight: "1.1",
                        }}
                      >
                        {workoutStats.exercisesCompleted}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: "400",
                          color: "#6B7280",
                        }}
                      >
                        Exercises
                      </div>
                    </div>
                    <div
                      style={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: "24px",
                        padding: "16px",
                        textAlign: "center",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                        border: "2px solid #F5576C",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "32px",
                          fontWeight: "800",
                          color: "#1A1A1A",
                          lineHeight: "1.1",
                        }}
                      >
                        {workoutStats.totalSets}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: "400",
                          color: "#6B7280",
                        }}
                      >
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
                    onClick={async () => {
                      console.log(
                        "🔘 Completion modal button clicked - View Progress"
                      );
                      setShowWorkoutCompletion(false);
                      await completeWorkout();
                      // completeWorkout() already navigates to complete page
                    }}
                    style={{
                      width: "100%",
                      backgroundColor: "#4CAF50",
                      color: "#FFFFFF",
                      fontSize: "16px",
                      fontWeight: "600",
                      padding: "16px 32px",
                      borderRadius: "20px",
                      border: "none",
                      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                  >
                    <Trophy style={{ width: "20px", height: "20px" }} />
                    View Progress
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowWorkoutCompletion(false);
                      router.push("/client/workouts");
                    }}
                    style={{
                      width: "100%",
                      backgroundColor: "#FFFFFF",
                      color: "#6C5CE7",
                      fontSize: "16px",
                      fontWeight: "600",
                      padding: "16px 32px",
                      borderRadius: "20px",
                      border: "2px solid #6C5CE7",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    Back to Dashboard
                  </Button>
                </div>

                {/* Motivational Message */}
                <div
                  style={{
                    marginTop: "24px",
                    padding: "16px",
                    backgroundColor: "#FFE082",
                    borderRadius: "24px",
                    border: "2px solid #F5576C",
                  }}
                >
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#1A1A1A",
                      textAlign: "center",
                    }}
                  >
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
            <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden border-0 shadow-2xl">
              <div className="p-6">
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                      <Calculator className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                      Drop Set Calculator
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDropSetCalculator(false)}
                    className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <div className="space-y-6">
                  {/* Working Weight Input */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
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
                      className="w-full h-12 text-center text-lg rounded-xl border-2 border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
                      step="0.5"
                      placeholder="Enter weight"
                    />
                  </div>

                  {/* Calculator Result */}
                  <div className="rounded-xl p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Calculator className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
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
                      <div className="text-slate-600 dark:text-slate-400">
                        Enter working weight to see calculation
                      </div>
                    )}
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      Drop percentage:{" "}
                      {Number(currentExercise?.meta?.drop_percentage) ||
                        Number(currentExercise?.drop_percentage) ||
                        0}
                      %
                    </div>
                  </div>

                  {/* Manual Override */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                      Manual Drop Weight (kg):
                    </label>
                    <input
                      type="number"
                      value={dropWeight === "" ? "" : dropWeight}
                      onChange={(e) => setDropWeight(e.target.value)}
                      className="w-full h-12 text-center text-lg rounded-xl border-2 border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-semibold focus:outline-none focus:border-purple-500"
                      step="0.5"
                      placeholder="Override calculated weight"
                    />
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
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
            <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden border-0 shadow-2xl">
              <div className="p-6">
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center">
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                      Cluster Rest Timer
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowClusterTimer(false)}
                    className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
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
                    <div className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                      seconds rest
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Use this timer between each cluster set. Tap start to begin
                    the countdown.
                  </div>

                  {/* Timer Controls */}
                  <div className="flex gap-3 justify-center">
                    <Button
                      onClick={() => {
                        // TODO: Implement timer start logic
                        console.log("Starting cluster rest timer");
                      }}
                      className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white px-8 py-3 rounded-xl font-semibold"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start Timer
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowClusterTimer(false)}
                      className="px-8 py-3 rounded-xl font-semibold"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
