"use client";

import React from "react";
import { Youtube, RefreshCw } from "lucide-react";
import { WorkoutBlockExercise } from "@/types/workoutBlocks";
import { IconButton } from "@/components/client-ui";
import { cn } from "@/lib/utils";

interface ExerciseActionButtonsProps {
  exercise: WorkoutBlockExercise;
  onVideoClick?: (videoUrl: string, title?: string) => void;
  onAlternativesClick?: (exerciseId: string) => void;
  className?: string;
}

/** Mock rx-refresh: 36×36 rounded-full icon buttons. */
export function ExerciseActionButtons({
  exercise,
  onVideoClick,
  onAlternativesClick,
  className = "",
}: ExerciseActionButtonsProps) {
  if (!exercise) return null;
  const videoUrl =
    exercise.exercise?.video_url ||
    (exercise as { video_url?: string }).video_url ||
    "";

  const btnClass =
    "!h-9 !w-9 min-h-0 shrink-0 border border-[color:var(--fc-glass-border)] bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08] hover:text-white";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {onVideoClick && videoUrl && (
        <IconButton
          size="md"
          variant="filled"
          type="button"
          className={btnClass}
          title={`Watch ${exercise.exercise?.name} video`}
          aria-label={`Watch ${exercise.exercise?.name} video`}
          onClick={() => {
            onVideoClick(videoUrl, exercise.exercise?.name);
          }}
        >
          <Youtube className="h-4 w-4 text-red-400" />
        </IconButton>
      )}
      {exercise.exercise_id && onAlternativesClick && (
        <IconButton
          size="md"
          variant="filled"
          type="button"
          className={btnClass}
          title={`Swap ${exercise.exercise?.name}`}
          aria-label="Swap exercise"
          onClick={() => onAlternativesClick(exercise.exercise_id)}
        >
          <RefreshCw className="h-4 w-4 text-cyan-400" />
        </IconButton>
      )}
    </div>
  );
}
