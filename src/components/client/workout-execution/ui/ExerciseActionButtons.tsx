"use client";

import React from "react";
import { Youtube, RefreshCw } from "lucide-react";
import { WorkoutSetEntryExercise } from "@/types/workoutSetEntries";
import { cn } from "@/lib/utils";
import liveStyles from "../live-card/liveCard.module.css";

interface ExerciseActionButtonsProps {
  exercise: WorkoutSetEntryExercise;
  onVideoClick?: (videoUrl: string, title?: string) => void;
  onAlternativesClick?: (exerciseId: string) => void;
  className?: string;
  /**
   * `ghost` (default) — discreet ~15px icons in ~26px hit areas (live card).
   * `filled` — legacy filled circles (PrescriptionCard / older chrome).
   */
  variant?: "ghost" | "filled";
}

/** Swap (+ optional video) controls for the exercise-name row. */
export function ExerciseActionButtons({
  exercise,
  onVideoClick,
  onAlternativesClick,
  className = "",
  variant = "ghost",
}: ExerciseActionButtonsProps) {
  if (!exercise) return null;
  const videoUrl =
    exercise.exercise?.video_url ||
    (exercise as { video_url?: string }).video_url ||
    "";

  if (variant === "filled") {
    const btnClass =
      "!h-9 !w-9 min-h-0 shrink-0 border border-[color:var(--fc-glass-border)] bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08] hover:text-white";
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {onVideoClick && videoUrl ? (
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center rounded-full",
              btnClass,
            )}
            title={`Watch ${exercise.exercise?.name} video`}
            aria-label={`Watch ${exercise.exercise?.name} video`}
            onClick={() => {
              onVideoClick(videoUrl, exercise.exercise?.name);
            }}
          >
            <Youtube className="h-4 w-4 text-red-400" />
          </button>
        ) : null}
        {exercise.exercise_id && onAlternativesClick ? (
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center rounded-full",
              btnClass,
            )}
            title={`Swap ${exercise.exercise?.name}`}
            aria-label="Swap exercise"
            onClick={() => onAlternativesClick(exercise.exercise_id)}
          >
            <RefreshCw className="h-4 w-4 text-[color:var(--fc-group-c)]" />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-0.5 shrink-0", className)}>
      {onVideoClick && videoUrl ? (
        <button
          type="button"
          className={liveStyles.swap}
          title={`Watch ${exercise.exercise?.name} video`}
          aria-label={`Watch ${exercise.exercise?.name} video`}
          onClick={() => {
            onVideoClick(videoUrl, exercise.exercise?.name);
          }}
        >
          <Youtube className={liveStyles.swapSvg} aria-hidden />
        </button>
      ) : null}
      {exercise.exercise_id && onAlternativesClick ? (
        <button
          type="button"
          className={liveStyles.swap}
          title={`Swap ${exercise.exercise?.name}`}
          aria-label="Swap exercise"
          onClick={() => onAlternativesClick(exercise.exercise_id)}
        >
          <RefreshCw className={liveStyles.swapSvg} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
