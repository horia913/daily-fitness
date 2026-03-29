// Common types for workout execution components

import {
  LiveWorkoutBlock,
  LoggedSet,
  WorkoutBlockExercise,
} from "@/types/workoutBlocks";

export interface BaseBlockExecutorProps {
  block: LiveWorkoutBlock;
  onBlockComplete: (blockId: string, loggedSets: LoggedSet[]) => void;
  onNextBlock: () => void;
  e1rmMap?: Record<string, number>;
  onE1rmUpdate?: (exerciseId: string, e1rm: number) => void;
  /** Session-level last performed weight per exercise (sticky default) */
  lastPerformedWeightByExerciseId?: Record<string, number>;
  /** Last-session weight per exercise (earliest set in most recent completed workout) */
  lastSessionWeightByExerciseId?: Record<string, number>;
  onWeightLogged?: (exerciseId: string, weight: number) => void;
  sessionId?: string | null;
  assignmentId?: string;
  allBlocks?: LiveWorkoutBlock[];
  currentBlockIndex?: number;
  onBlockChange?: (blockIndex: number) => void;
  currentExerciseIndex?: number;
  onExerciseIndexChange?: (index: number) => void;
  logSetToDatabase: (
    data: any
  ) => Promise<{ success: boolean; error?: any; e1rm?: number; set_log_id?: string; isNewPR?: boolean }>;
  formatTime: (seconds: number) => string;
  calculateSuggestedWeight: (
    exerciseId: string,
    loadPercentage: number | null | undefined
  ) => number | null;
  onVideoClick?: (videoUrl: string, title?: string) => void;
  onAlternativesClick?: (exerciseId: string) => void;
  onPlateCalculatorClick?: () => void;
  onToolsClick?: () => void;
  onRestTimerClick?: () => void;
  /** Exit workout (e.g. confirm + navigate away). Wired from start page only. */
  onWorkoutBack?: () => void;
  onSetComplete?: (completedSets: number) => void;
  /** Called when a set is logged and rest timer will show; pass data for completion hero + next preview */
  onLastSetLoggedForRest?: (data: {
    weight: number;
    reps: number;
    setNumber: number;
    totalSets: number;
    isPr?: boolean;
  }) => void;
  progressionSuggestion?: import("@/lib/clientProgressionService").ProgressionSuggestion | null;
  /**
   * Full suggestions map (keyed by exerciseId). Multi-exercise executors
   * (Superset, GiantSet, PreExhaustion) use this to look up per-exercise suggestions.
   */
  progressionSuggestionsMap?: Map<string, import("@/lib/clientProgressionService").ProgressionSuggestion>;
  /**
   * Previous performance map (keyed by exerciseId). Contains lastWorkout + personalBest data
   * fetched from workout_exercise_logs → workout_set_details.
   */
  previousPerformanceMap?: Map<string, {
    lastWorkout: {
      weight: number | null;
      reps: number | null;
      sets: number;
      avgRpe: number | null;
      date: string;
      workout_log_id?: string;
      setDetails?: import("@/lib/clientProgressionService").LastSessionSetRow[];
    } | null;
    personalBest: { maxWeight: number | null; maxReps: number | null; date: string } | null;
  }>;
  /** Register undo handler for the last logged set (for "Set saved — Undo" toast). Called with a function that removes last set from local state. */
  registerUndo?: (undoFn: () => void) => void;
  /** When true, show Logged Sets list and Edit per set (only while workout is in progress). Delete is not supported. */
  allowSetEditDelete?: boolean;
  /** Register callback to replace last temp id with real set_log_id when golden sync succeeds. */
  registerSetLogIdResolved?: (fn: (set_log_id: string) => void) => void;
  /** Upsert a set into the block's existingSetLogs so history persists when navigating blocks. replaceId = temp id to replace when real id arrives. */
  onSetLogUpsert?: (blockId: string, setEntry: LoggedSet, options?: { replaceId?: string }) => void;
  /** Logged sets for this block (parent-owned source of truth). When provided, executors sync from this so history persists across block navigation. */
  loggedSets?: LoggedSet[];
  /** Called after a set is successfully updated via PATCH so parent can replace the set in its store. */
  onSetEditSaved?: (blockId: string, updatedSet: LoggedSet) => void;
}

export interface BlockDetail {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
}

export interface LogButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  label: string;
  gradient?: string;
  icon?: React.ReactNode;
}

