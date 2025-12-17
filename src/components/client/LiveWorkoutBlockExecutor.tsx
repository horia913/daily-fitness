"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/components/ui/toast-provider";
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

// Import type-specific components
import { StraightSetExecutor } from "./workout-execution/blocks/StraightSetExecutor";
import { SupersetExecutor } from "./workout-execution/blocks/SupersetExecutor";
import { GiantSetExecutor } from "./workout-execution/blocks/GiantSetExecutor";
import { DropSetExecutor } from "./workout-execution/blocks/DropSetExecutor";
import { ClusterSetExecutor } from "./workout-execution/blocks/ClusterSetExecutor";
import { RestPauseExecutor } from "./workout-execution/blocks/RestPauseExecutor";
import { PyramidSetExecutor } from "./workout-execution/blocks/PyramidSetExecutor";
import { PreExhaustionExecutor } from "./workout-execution/blocks/PreExhaustionExecutor";
import { AmrapExecutor } from "./workout-execution/blocks/AmrapExecutor";
import { EmomExecutor } from "./workout-execution/blocks/EmomExecutor";
import { TabataExecutor } from "./workout-execution/blocks/TabataExecutor";
import { CircuitExecutor } from "./workout-execution/blocks/CircuitExecutor";
import { ForTimeExecutor } from "./workout-execution/blocks/ForTimeExecutor";
import { LadderExecutor } from "./workout-execution/blocks/LadderExecutor";

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
}: LiveWorkoutBlockExecutorProps) {
  const { addToast } = useToast();
  
  // Debug: Log assignmentId received as prop
  console.log("📍 LiveWorkoutBlockExecutor received:", {
    assignmentId,
    blockId: block.block.id,
    blockType: block.block.type,
  });
  
  useEffect(() => {
    console.log("🔍 [LiveWorkoutBlockExecutor] assignmentId received:", assignmentId);
    console.log("🔍 [LiveWorkoutBlockExecutor] assignmentId type:", typeof assignmentId);
    console.log("🔍 [LiveWorkoutBlockExecutor] assignmentId truthy:", !!assignmentId);
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
  const [pendingAction, setPendingAction] = useState<'set' | 'exercise' | null>(null);

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

  // Log set to database and calculate e1RM
  // Individual sets go to workout_set_logs, not workout_logs
  // workout_logs is for session summary only
  const logSetToDatabase = async (data: any) => {
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

    try {
      // Get user ID for client_id
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: "User not authenticated" };
      }

      // Call /api/log-set to:
      // 1. Get/create workout_log_id (for session tracking)
      // 2. Insert into workout_set_logs (individual set data)
      // 3. Calculate and update e1RM in user_exercise_metrics
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const access_token = session?.access_token;

        if (access_token) {
          // Debug: Log assignmentId before building request
          console.log("🔍 [logSetToDatabase] assignmentId from closure:", assignmentId);
          console.log("🔍 [logSetToDatabase] assignmentId type:", typeof assignmentId);
          console.log("🔍 [logSetToDatabase] assignmentId truthy:", !!assignmentId);
          
          // Build request body with all data passed from executor + required fields
          const requestBody: any = {
            // Required for workout_set_logs
            block_id: block.block.id,
            block_type: data.block_type || block.block.type,
            client_id: user.id,
            workout_assignment_id: assignmentId || undefined,
            // For API to get/create workout_log_id (session tracking)
            session_id: String(sessionId).trim(),
            template_exercise_id: currentExercise?.id || null,
            // Backwards compatible
            access_token: access_token,
            // Spread all data from executor (block-type-specific fields)
            ...data,
          };

          // Debug logging - show all relevant fields
          console.log('🚀 About to send to /api/log-set:', {
            workout_assignment_id: requestBody.workout_assignment_id,
            block_id: requestBody.block_id,
            client_id: requestBody.client_id,
            block_type: requestBody.block_type,
            exercise_id: requestBody.exercise_id,
            weight: requestBody.weight,
            reps: requestBody.reps,
            workout_log_id: requestBody.workout_log_id,
            ...requestBody,
          });

          const response = await fetch("/api/log-set", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
          });

          console.log('📊 Response status:', response.status, response.statusText);

          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              // Update e1RM in local state (only if exercise_id is present in the data)
              if (result.e1rm && result.e1rm.stored && onE1rmUpdate && data.exercise_id) {
                onE1rmUpdate(data.exercise_id, result.e1rm.stored);
              }

              // Show PR notification if new personal record
              if (result.e1rm?.is_new_pr) {
                addToast({
                  title: "🎉 New Personal Record!",
                  description:
                    result.message || `${result.e1rm.stored}kg estimated 1RM`,
                  variant: "success",
                  duration: 4000,
                });
              } else if (result.e1rm?.warning) {
                // Show warning if metrics couldn't be saved
                addToast({
                  title: "Set Logged",
                  description: result.e1rm.warning,
                  variant: "default",
                  duration: 3000,
                });
              }

              return {
                success: true,
                e1rm: result.e1rm?.stored || result.e1rm?.calculated,
                isNewPR: result.e1rm?.is_new_pr || false,
              };
            } else {
              console.error("API returned error:", result.error);
              addToast({
                title: "Error",
                description: result.error || "Failed to log set",
                variant: "destructive",
                duration: 5000,
              });
              return { success: false, error: result.error };
            }
          } else {
            console.error("❌ API returned error status:", response.status);
            let errorData: any;
            try {
              const text = await response.text();
              console.error("❌ Response text:", text);
              errorData = JSON.parse(text);
            } catch (parseError) {
              console.error("❌ Failed to parse error response:", parseError);
              errorData = { error: "Unknown error", raw_response: await response.text().catch(() => "Could not read response") };
            }
            console.error("❌ API error response:", errorData);
            addToast({
              title: "Error",
              description: errorData.error || errorData.details || "Failed to log set",
              variant: "destructive",
              duration: 5000,
            });
            return { success: false, error: errorData.error || errorData.details || "Unknown error" };
          }
        } else {
          return { success: false, error: "Not authenticated" };
        }
      } catch (apiError) {
        console.error("Error calling /api/log-set:", apiError);
        addToast({
          title: "Error",
          description: "Failed to log set. Please try again.",
          variant: "destructive",
          duration: 5000,
        });
        return { success: false, error: apiError };
      }
    } catch (error) {
      console.error("Error in logSetToDatabase:", error);
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

    // Check if all sets of current exercise are complete
    const currentExercise = block.block.exercises?.[currentExerciseIndex];
    const totalSetsForExercise = currentExercise?.sets || block.block.total_sets || 1;
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
          setRestLabel(`Next Exercise: ${nextExercise.exercise?.name || nextExercise.name || 'Exercise'}`);
          setPendingAction('exercise');
          setShowRestTimer(true);
        } else {
          // No rest, advance immediately
          onExerciseComplete?.(block.block.id);
        }
      } else {
        // No more exercises, block is complete
        // Don't show rest timer between blocks - auto-advance immediately
        // onBlockComplete will be called by the executor
      }
    } else {
      // More sets to do in this exercise
      const restSeconds = currentExercise?.rest_seconds || block.block.rest_seconds || 0;

      if (restSeconds > 0) {
        setRestDuration(restSeconds);
        setRestLabel("Next Set");
        setPendingAction('set');
        setShowRestTimer(true);
        // Don't advance yet - wait for timer
      }
      // If no rest, executor should handle immediate advancement
    }
  };

  // Handle rest timer completion
  const handleRestComplete = () => {
    setShowRestTimer(false);

    // Check what to advance to
    const exercises = block.block.exercises || [];
    const currentExIndex = currentExerciseIndex || 0;
    const currentExercise = exercises[currentExIndex];
    const totalSetsForExercise = currentExercise?.sets || block.block.total_sets || 1;
    const completedSets = block.completedSets || 0;

    if (pendingAction === 'exercise') {
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
      case "pyramid_set":
        try {
          // eslint-disable-next-line no-console
          console.log("Executor: PyramidSetExecutor");
        } catch {}
        return <PyramidSetExecutor {...commonProps} />;
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
      case "circuit":
        try {
          // eslint-disable-next-line no-console
          console.log("Executor: CircuitExecutor");
        } catch {}
        return <CircuitExecutor {...commonProps} />;
      case "for_time":
        try {
          // eslint-disable-next-line no-console
          console.log("Executor: ForTimeExecutor");
        } catch {}
        return <ForTimeExecutor {...commonProps} />;
      case "ladder":
        try {
          // eslint-disable-next-line no-console
          console.log("Executor: LadderExecutor");
        } catch {}
        return <LadderExecutor {...commonProps} />;
      default:
        // Fallback to straight set if unknown type
        try {
          // eslint-disable-next-line no-console
          console.log("Executor: Fallback -> StraightSetExecutor");
        } catch {}
        return <StraightSetExecutor {...commonProps} />;
    }
  };

  // Get current exercise for modals
  const currentExercise = block.block.exercises?.[currentExerciseIndex];

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
