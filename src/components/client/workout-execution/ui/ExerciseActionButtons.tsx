"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Youtube, RefreshCw } from "lucide-react";
import { WorkoutBlockExercise } from "@/types/workoutBlocks";

interface ExerciseActionButtonsProps {
  exercise: WorkoutBlockExercise;
  onVideoClick?: (videoUrl: string, title?: string) => void;
  onAlternativesClick?: (exerciseId: string) => void;
  className?: string;
}

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

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {onVideoClick && videoUrl && (
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => {
            onVideoClick(videoUrl, exercise.exercise?.name);
          }}
          className="p-2 rounded-lg transition-colors"
          style={{ color: "var(--fc-status-error)" }}
          title={`Watch ${exercise.exercise?.name} Video`}
        >
          <Youtube className="w-5 h-5" />
        </Button>
      )}
      {exercise.exercise_id && onAlternativesClick && (
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => onAlternativesClick(exercise.exercise_id)}
          className="p-2 rounded-lg transition-colors"
          style={{ color: "var(--fc-accent-cyan)" }}
          title={`View ${exercise.exercise?.name} Alternatives`}
        >
          <RefreshCw className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
}
