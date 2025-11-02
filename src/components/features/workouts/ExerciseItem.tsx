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
    if (!exerciseId && exercise.name) return exercise.name;
    if (!exerciseId) return "Exercise";
    const found = availableExercises.find((e) => e.id === exerciseId);
    return found?.name || exercise.name || "Exercise";
  };

  const exerciseName = getExerciseName(exercise.exercise_id);

  // Render details based on parent block type
  const renderDetails = () => {
    if (blockType === "circuit" && exercise.work_seconds) {
      return (
        <>
          {exercise.work_seconds}s work
          {exercise.rest_after && ` • ${exercise.rest_after}s rest after`}
        </>
      );
    }
    if (blockType === "tabata" && exercise.work_seconds) {
      return <>{exercise.work_seconds}s work</>;
    }
    if (blockType === "giant_set") {
      return (
        <>
          {exercise.sets && `${exercise.sets} sets`}
          {exercise.reps && ` • ${exercise.reps} reps`}
          {exercise.rest_seconds && ` • ${exercise.rest_seconds}s rest`}
        </>
      );
    }
    if (blockType === "superset") {
      return (
        <>
          {exercise.sets && `${exercise.sets} sets`}
          {exercise.reps && ` • ${exercise.reps} reps`}
        </>
      );
    }
    if (blockType === "pre_exhaustion") {
      return (
        <>
          {exercise.reps && `${exercise.reps} reps`}
          {exercise.type && ` (${exercise.type})`}
        </>
      );
    }
    // Default
    return (
      <>
        {exercise.sets && `${exercise.sets} sets`}
        {exercise.reps && ` • ${exercise.reps} reps`}
      </>
    );
  };

  return (
    <div
      className={`flex items-center gap-3 p-2 sm:p-3 rounded-lg ${theme.card} border ${theme.border} bg-opacity-50`}
    >
      <Badge variant="outline" className="text-xs flex-shrink-0">
        {String.fromCharCode(65 + index)} {/* A, B, C, etc. */}
      </Badge>
      <div className="flex-1 min-w-0">
        <div className={`font-medium ${theme.text} text-sm break-words`}>
          {exerciseName}
        </div>
        <div className={`text-xs ${theme.textSecondary} break-words`}>
          {renderDetails()}
        </div>
      </div>
    </div>
  );
}
