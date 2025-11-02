"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Edit,
  Trash2,
  GripVertical,
  Dumbbell,
  Zap,
  Target,
  TrendingDown,
  Timer,
  PauseCircle,
  BarChart3,
  Activity,
  RotateCcw,
  Clock,
  Hash,
  Flame,
  Repeat,
} from "lucide-react";
import ExerciseItem from "./ExerciseItem";

interface ExerciseBlockCardProps {
  exercise: any; // WorkoutTemplateExercise with all its data
  index: number;
  availableExercises?: any[]; // For exercise name lookups
  onEdit?: (exercise: any) => void;
  onDelete?: (exerciseId: string) => void;
  onDuplicate?: (exercise: any) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, exerciseId: string) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  renderMode?: "form" | "view"; // 'form' for edit mode, 'view' for display only
}

// Block type styles with colors and icons
const blockTypeStyles: Record<
  string,
  { color: string; bg: string; text: string; icon: any; label: string }
> = {
  straight_set: {
    color: "blue",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-600 dark:text-blue-400",
    icon: Dumbbell,
    label: "Straight Set",
  },
  superset: {
    color: "green",
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-600 dark:text-green-400",
    icon: Zap,
    label: "Superset",
  },
  giant_set: {
    color: "orange",
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-600 dark:text-orange-400",
    icon: Target,
    label: "Giant Set",
  },
  drop_set: {
    color: "red",
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-600 dark:text-red-400",
    icon: TrendingDown,
    label: "Drop Set",
  },
  cluster_set: {
    color: "purple",
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-600 dark:text-purple-400",
    icon: Timer,
    label: "Cluster Set",
  },
  rest_pause: {
    color: "yellow",
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-600 dark:text-yellow-400",
    icon: PauseCircle,
    label: "Rest-Pause",
  },
  pyramid_set: {
    color: "indigo",
    bg: "bg-indigo-100 dark:bg-indigo-900/30",
    text: "text-indigo-600 dark:text-indigo-400",
    icon: BarChart3,
    label: "Pyramid Set",
  },
  pre_exhaustion: {
    color: "pink",
    bg: "bg-pink-100 dark:bg-pink-900/30",
    text: "text-pink-600 dark:text-pink-400",
    icon: Activity,
    label: "Pre-Exhaustion",
  },
  amrap: {
    color: "emerald",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-600 dark:text-emerald-400",
    icon: RotateCcw,
    label: "AMRAP",
  },
  emom: {
    color: "cyan",
    bg: "bg-cyan-100 dark:bg-cyan-900/30",
    text: "text-cyan-600 dark:text-cyan-400",
    icon: Clock,
    label: "EMOM",
  },
  emom_reps: {
    color: "sky",
    bg: "bg-sky-100 dark:bg-sky-900/30",
    text: "text-sky-600 dark:text-sky-400",
    icon: Hash,
    label: "EMOM Reps",
  },
  tabata: {
    color: "rose",
    bg: "bg-rose-100 dark:bg-rose-900/30",
    text: "text-rose-600 dark:text-rose-400",
    icon: Flame,
    label: "Tabata",
  },
  circuit: {
    color: "violet",
    bg: "bg-violet-100 dark:bg-violet-900/30",
    text: "text-violet-600 dark:text-violet-400",
    icon: Repeat,
    label: "Circuit",
  },
  for_time: {
    color: "amber",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-600 dark:text-amber-400",
    icon: Zap,
    label: "For Time",
  },
  ladder: {
    color: "teal",
    bg: "bg-teal-100 dark:bg-teal-900/30",
    text: "text-teal-600 dark:text-teal-400",
    icon: BarChart3,
    label: "Ladder",
  },
};

// Complex block types that show nested exercises
const COMPLEX_BLOCK_TYPES = [
  "circuit",
  "tabata",
  "giant_set",
  "superset",
  "pre_exhaustion",
];

export default function ExerciseBlockCard({
  exercise,
  index,
  availableExercises = [],
  onEdit,
  onDelete,
  onDuplicate,
  draggable = false,
  onDragStart,
  onDragEnd,
  renderMode = "form",
}: ExerciseBlockCardProps) {
  const { getThemeStyles } = useTheme();
  const theme = getThemeStyles();

  const exerciseType =
    exercise.exercise_type || exercise.block_type || "straight_set";
  const isComplex = COMPLEX_BLOCK_TYPES.includes(exerciseType);

  const styleConfig =
    blockTypeStyles[exerciseType] || blockTypeStyles["straight_set"];
  const BlockIcon = styleConfig.icon;

  // Get exercise name
  const getExerciseName = (exerciseId?: string) => {
    if (!exerciseId) return "Exercise";
    const found = availableExercises.find((e) => e.id === exerciseId);
    return found?.name || "Exercise";
  };

  // Get main exercise name
  const mainExerciseName =
    exercise.exercise?.name || getExerciseName(exercise.exercise_id);

  // Render exercise details summary based on type
  const renderExerciseSummary = () => {
    switch (exerciseType) {
      case "tabata":
        return (
          <>
            {exercise.rounds || 8} rounds • {exercise.work_seconds || 20}s work
            {exercise.rest_after && ` • ${exercise.rest_after}s rest after`}
            {exercise.tabata_sets && ` • ${exercise.tabata_sets.length} sets`}
          </>
        );
      case "circuit":
        return (
          <>
            {exercise.sets || 1} rounds • {exercise.circuit_sets?.length || 0}{" "}
            exercises
            {exercise.rest_seconds && ` • ${exercise.rest_seconds}s rest`}
          </>
        );
      case "amrap":
        return (
          <>
            {exercise.amrap_duration} minutes • As many rounds as possible
            {exercise.reps && ` • ${exercise.reps} reps per round`}
          </>
        );
      case "emom":
      case "emom_reps":
        return (
          <>
            {exercise.emom_duration} minutes • Every minute on the minute
            {exercise.emom_reps && ` • ${exercise.emom_reps} reps`}
            {exercise.work_seconds && ` • ${exercise.work_seconds}s work`}
          </>
        );
      case "for_time":
        return (
          <>
            {exercise.target_reps && `Target: ${exercise.target_reps} reps`}
            {exercise.time_cap && ` • Time cap: ${exercise.time_cap} min`}
          </>
        );
      case "cluster_set":
        return (
          <>
            {exercise.sets} sets
            {exercise.cluster_reps &&
              ` • ${exercise.cluster_reps} reps per cluster`}
            {exercise.clusters_per_set &&
              ` • ${exercise.clusters_per_set} clusters per set`}
            {exercise.rest_seconds && ` • ${exercise.rest_seconds}s rest`}
          </>
        );
      case "rest_pause":
        return (
          <>
            {exercise.sets && `${exercise.sets} sets`}
            {exercise.rest_pause_duration &&
              ` • RP: ${exercise.rest_pause_duration}s`}
            {exercise.max_rest_pauses &&
              ` • Max pauses: ${exercise.max_rest_pauses}`}
            {exercise.rest_seconds && ` • Rest: ${exercise.rest_seconds}s`}
          </>
        );
      case "superset":
        return (
          <>
            {exercise.sets} sets × {exercise.reps || "N/A"} reps
            {exercise.rest_seconds && ` • ${exercise.rest_seconds}s rest`}
          </>
        );
      case "giant_set":
        return (
          <>
            {exercise.sets} sets
            {exercise.giant_set_exercises?.length &&
              ` • ${exercise.giant_set_exercises.length} exercises`}
            {exercise.rest_seconds && ` • ${exercise.rest_seconds}s rest`}
          </>
        );
      case "pre_exhaustion":
        return (
          <>
            {exercise.sets} sets
            {exercise.isolation_reps &&
              ` • Isolation: ${exercise.isolation_reps} reps`}
            {exercise.compound_reps &&
              ` • Compound: ${exercise.compound_reps} reps`}
            {exercise.rest_seconds && ` • Rest: ${exercise.rest_seconds}s`}
          </>
        );
      case "drop_set":
        return (
          <>
            {exercise.sets} sets × {exercise.reps} reps
            {exercise.drop_percentage &&
              ` • Drop: ${exercise.drop_percentage}%`}
            {exercise.rest_seconds && ` • ${exercise.rest_seconds}s rest`}
          </>
        );
      default:
        return (
          <>
            {exercise.sets} sets × {exercise.reps || "N/A"} reps
            {exercise.rest_seconds && ` • ${exercise.rest_seconds}s rest`}
            {exercise.rir && ` • RIR: ${exercise.rir}`}
            {exercise.tempo && ` • Tempo: ${exercise.tempo}`}
          </>
        );
    }
  };

  // Extract nested exercises for complex blocks
  const getNestedExercises = (): any[] => {
    // First check if exercises are directly available (from workout_blocks schema)
    if (
      exercise.exercises &&
      Array.isArray(exercise.exercises) &&
      exercise.exercises.length > 0
    ) {
      return exercise.exercises.map((ex: any) => ({
        exercise_id: ex.exercise_id,
        name: ex.exercise?.name || getExerciseName(ex.exercise_id),
        sets: ex.sets,
        reps: ex.reps,
        rest_seconds: ex.rest_seconds,
        exercise: ex.exercise,
      }));
    }

    // Fallback to legacy format
    switch (exerciseType) {
      case "circuit":
        return exercise.circuit_sets || [];
      case "tabata":
        return exercise.tabata_sets || [];
      case "giant_set":
        return exercise.giant_set_exercises || [];
      case "superset":
        // Superset has main exercise and secondary exercise
        return [
          {
            exercise_id: exercise.exercise_id,
            name: mainExerciseName,
            sets: exercise.sets,
            reps: exercise.reps,
            rest_seconds: exercise.rest_seconds,
          },
          {
            exercise_id: exercise.superset_exercise_id,
            name: getExerciseName(exercise.superset_exercise_id),
            sets: exercise.sets,
            reps: exercise.superset_reps || exercise.reps,
            rest_seconds: exercise.rest_seconds,
          },
        ].filter((e) => e.exercise_id);
      case "pre_exhaustion":
        return [
          {
            exercise_id: exercise.exercise_id,
            name: mainExerciseName,
            sets: exercise.sets,
            reps: exercise.isolation_reps,
            type: "isolation",
          },
          {
            exercise_id: exercise.compound_exercise_id,
            name: getExerciseName(exercise.compound_exercise_id),
            sets: exercise.sets,
            reps: exercise.compound_reps,
            type: "compound",
          },
        ].filter((e) => e.exercise_id);
      default:
        return [];
    }
  };

  const nestedExercises = getNestedExercises();
  // Always show nested exercises for complex blocks
  const showNestedExercises = isComplex && nestedExercises.length > 0;

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => draggable && onDragStart?.(e, exercise.id)}
      onDragEnd={draggable ? onDragEnd : undefined}
      className={`${theme.card} border ${
        theme.border
      } rounded-xl p-3 sm:p-4 transition-all duration-200 hover:shadow-md ${
        draggable ? "cursor-move" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left side: Number, drag handle, content */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Number and drag handle */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {draggable && (
              <div className="cursor-grab active:cursor-grabbing">
                <GripVertical className="w-4 h-4 text-gray-400" />
              </div>
            )}
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${styleConfig.bg} ${styleConfig.text}`}
            >
              {index + 1}
            </div>
          </div>

          {/* Exercise info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h4 className={`font-semibold ${theme.text} break-words`}>
                {isComplex &&
                exerciseType !== "superset" &&
                exerciseType !== "pre_exhaustion"
                  ? `${styleConfig.label} ${index + 1}`
                  : mainExerciseName}
              </h4>
              <Badge
                className={`text-xs ${styleConfig.bg} ${styleConfig.text} border-0`}
              >
                <BlockIcon className="w-3 h-3 mr-1" />
                {styleConfig.label}
              </Badge>
            </div>
            <p className={`text-sm ${theme.textSecondary} break-words`}>
              {renderExerciseSummary()}
            </p>
            {exercise.notes && (
              <p className={`text-xs ${theme.textSecondary} mt-1`}>
                Note: {exercise.notes}
              </p>
            )}
          </div>
        </div>

        {/* Right side: Actions */}
        {renderMode === "form" && (
          <div className="flex gap-2 flex-shrink-0">
            {onEdit && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onEdit(exercise)}
                className="rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onDelete(exercise.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Nested exercises for complex blocks */}
      {showNestedExercises && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          {nestedExercises.map((nestedExercise: any, nestedIndex: number) => (
            <ExerciseItem
              key={nestedIndex}
              exercise={nestedExercise}
              index={nestedIndex}
              availableExercises={availableExercises}
              blockType={exerciseType}
            />
          ))}
        </div>
      )}
    </div>
  );
}
