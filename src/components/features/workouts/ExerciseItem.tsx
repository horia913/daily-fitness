"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/contexts/ThemeContext";

interface ExerciseItemProps {
  exercise: any; // Nested exercise data
  index: number;
  availableExercises?: any[];
  blockType?: string; // Parent block type (circuit, tabata, etc.)
}

export default function ExerciseItem({
  exercise,
  index,
  availableExercises = [],
  blockType,
}: ExerciseItemProps) {
  const { getThemeStyles } = useTheme();
  const theme = getThemeStyles();

  const getExerciseName = (exerciseId?: string) => {
    // First check if exercise object is directly available
    if (exercise.exercise?.name) return exercise.exercise.name;
    // Then check if name is in the exercise object itself
    if (exercise.name) return exercise.name;
    // Then try to look up by exercise_id
    if (exerciseId) {
      const found = availableExercises.find((e) => e.id === exerciseId);
      if (found?.name) return found.name;
    }
    return "Exercise";
  };

  const exerciseName = getExerciseName(exercise.exercise_id);

  // Render ALL details based on parent block type
  const renderDetails = () => {
    const details: string[] = [];

    // Block-type specific details first
    // Tabata and Circuit display the same: exercise name, work time, rest time
    if (blockType === "circuit" || blockType === "tabata") {
      // Work time - required for both
      if (
        exercise.work_seconds !== undefined &&
        exercise.work_seconds !== null
      ) {
        details.push(`${exercise.work_seconds}s work`);
      }
      // Rest time - the short rest between exercises (required for both)
      if (
        exercise.rest_seconds !== undefined &&
        exercise.rest_seconds !== null
      ) {
        details.push(`${exercise.rest_seconds}s rest`);
      }
      // Load percentage for individual exercises
      if (exercise.load_percentage) {
        details.push(`Load: ${exercise.load_percentage}%`);
      }
    } else if (blockType === "giant_set") {
      if (exercise.sets) details.push(`${exercise.sets} sets`);
      if (exercise.reps) details.push(`${exercise.reps} reps`);
      // NO rest_seconds for giant_set exercises (they're done back-to-back)
      if (exercise.load_percentage)
        details.push(`Load: ${exercise.load_percentage}%`);
    } else if (blockType === "superset") {
      if (exercise.sets) details.push(`${exercise.sets} sets`);
      if (exercise.reps) details.push(`${exercise.reps} reps`);
      // NO rest_seconds for superset exercises (they're done back-to-back)
      if (exercise.load_percentage)
        details.push(`Load: ${exercise.load_percentage}%`);
    } else if (blockType === "pre_exhaustion") {
      if (exercise.reps) details.push(`${exercise.reps} reps`);
      if (exercise.type) details.push(`(${exercise.type})`);
      // NO rest_seconds for pre_exhaustion exercises (they're done back-to-back)
      if (exercise.load_percentage)
        details.push(`Load: ${exercise.load_percentage}%`);
    } else if (blockType === "amrap") {
      if (exercise.reps) details.push(`${exercise.reps} reps`);
      if (exercise.duration_seconds)
        details.push(`${exercise.duration_seconds}s`);
      if (exercise.rest_seconds) details.push(`${exercise.rest_seconds}s rest`);
    } else if (blockType === "emom" || blockType === "emom_reps") {
      // For rep-based EMOM, show reps prominently
      if (exercise.emom_reps) {
        details.push(`${exercise.emom_reps} reps/min`);
      } else if (exercise.reps) {
        details.push(`${exercise.reps} reps`);
      }
      // For time-based EMOM, show work time
      if (exercise.work_seconds) details.push(`${exercise.work_seconds}s work`);
      if (exercise.rest_seconds) details.push(`${exercise.rest_seconds}s rest`);
      // Always show duration if available
      if (exercise.emom_duration) details.push(`${exercise.emom_duration} min`);
    } else if (blockType === "for_time") {
      if (exercise.reps) details.push(`${exercise.reps} reps`);
      if (exercise.sets) details.push(`${exercise.sets} rounds`);
      if (exercise.duration_seconds)
        details.push(`${exercise.duration_seconds}s cap`);
    } else if (blockType === "ladder") {
      if (exercise.reps) details.push(`${exercise.reps} reps`);
      if (exercise.rest_seconds) details.push(`${exercise.rest_seconds}s rest`);
    } else {
      // Default: show all available data
      if (exercise.sets) details.push(`${exercise.sets} sets`);
      if (exercise.reps) details.push(`${exercise.reps} reps`);
      if (exercise.duration_seconds)
        details.push(`${exercise.duration_seconds}s`);
      if (exercise.rest_seconds) details.push(`${exercise.rest_seconds}s rest`);
    }

    // Common fields that should always be shown if present
    // Note: load_percentage is already handled in block-type specific sections above
    // Only add it here for block types that don't have specific handling
    if (exercise.weight) details.push(`${exercise.weight} kg`);
    if (
      exercise.load_percentage &&
      blockType !== "giant_set" &&
      blockType !== "superset" &&
      blockType !== "pre_exhaustion" &&
      blockType !== "circuit" &&
      blockType !== "tabata"
    ) {
      details.push(`${exercise.load_percentage}% load`);
    }
    if (exercise.tempo) details.push(`Tempo: ${exercise.tempo}`);
    if (exercise.rir) details.push(`RIR: ${exercise.rir}`);
    if (exercise.rpe) details.push(`RPE: ${exercise.rpe}`);

    return details.length > 0 ? details.join(" • ") : "No details";
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-3 p-2 sm:p-3 rounded-lg ${theme.card} border ${theme.border} bg-opacity-50`}
    >
      <Badge variant="outline" className="text-xs flex-shrink-0">
        {String.fromCharCode(65 + index)} {/* A, B, C, etc. */}
      </Badge>
      <div className="flex-1 min-w-0 w-full sm:w-auto">
        <div className={`font-medium ${theme.text} text-sm break-words`}>
          {exerciseName}
        </div>
        <div className={`text-xs ${theme.textSecondary} break-words`}>
          {renderDetails()}
        </div>
        {exercise.notes && (
          <div
            className={`text-xs ${theme.textSecondary} mt-1 italic break-words`}
          >
            Note: {exercise.notes}
          </div>
        )}
      </div>
    </div>
  );
}
