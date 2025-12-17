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
  sessionId?: string | null;
  assignmentId?: string;
  allBlocks?: LiveWorkoutBlock[];
  currentBlockIndex?: number;
  onBlockChange?: (blockIndex: number) => void;
  currentExerciseIndex?: number;
  onExerciseIndexChange?: (index: number) => void;
  logSetToDatabase: (
    data: any
  ) => Promise<{ success: boolean; error?: any; e1rm?: number }>;
  formatTime: (seconds: number) => string;
  calculateSuggestedWeight: (
    exerciseId: string,
    loadPercentage: number | null | undefined
  ) => number | null;
  onVideoClick?: (videoUrl: string, title?: string) => void;
  onAlternativesClick?: (exerciseId: string) => void;
  onRestTimerClick?: () => void;
  onSetComplete?: (completedSets: number) => void;
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

