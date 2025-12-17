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
  children?: React.ReactNode;
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
  "amrap",
  "emom",
  "emom_reps",
  "for_time",
  "ladder",
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
  children,
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
        // Count rounds, sets, and exercises
        const tabataRounds =
          exercise.rounds || exercise.tabata_sets?.length || 8;
        const tabataSets = exercise.tabata_sets?.length || 0;
        const totalTabataExercises =
          exercise.tabata_sets && Array.isArray(exercise.tabata_sets)
            ? exercise.tabata_sets.reduce((total: number, set: any) => {
                return (
                  total +
                  (Array.isArray(set.exercises) ? set.exercises.length : 0)
                );
              }, 0)
            : 0;
        return (
          <>
            {tabataRounds} rounds • {tabataSets} sets • {totalTabataExercises}{" "}
            exercises
            {exercise.load_percentage &&
              ` • Load: ${exercise.load_percentage}%`}
          </>
        );
      case "circuit":
        // Count rounds, sets, and exercises
        const circuitRounds =
          exercise.sets || exercise.circuit_sets?.length || 1;
        const circuitSets = exercise.circuit_sets?.length || 0;
        const totalCircuitExercises =
          exercise.circuit_sets && Array.isArray(exercise.circuit_sets)
            ? exercise.circuit_sets.reduce((total: number, set: any) => {
                return (
                  total +
                  (Array.isArray(set.exercises) ? set.exercises.length : 0)
                );
              }, 0)
            : 0;
        return (
          <>
            {circuitRounds} rounds • {circuitSets} sets •{" "}
            {totalCircuitExercises} exercises
            {exercise.load_percentage &&
              ` • Load: ${exercise.load_percentage}%`}
          </>
        );
      case "amrap":
        return (
          <>
            {exercise.amrap_duration} minutes • As many rounds as possible
            {exercise.reps && ` • ${exercise.reps} reps per round`}
            {exercise.load_percentage &&
              ` • Load: ${exercise.load_percentage}%`}
          </>
        );
      case "emom":
      case "emom_reps":
        // For rep-based EMOM, show reps prominently
        if (exercise.emom_mode === "rep_based" && exercise.emom_reps) {
          return (
            <>
              {exercise.emom_reps} reps/min • {exercise.emom_duration || 0}{" "}
              minutes
              {exercise.load_percentage &&
                ` • Load: ${exercise.load_percentage}%`}
            </>
          );
        }
        // For time-based EMOM, show work time
        return (
          <>
            {exercise.emom_duration || 0} minutes • Every minute on the minute
            {exercise.work_seconds && ` • ${exercise.work_seconds}s work`}
            {exercise.emom_reps && ` • ${exercise.emom_reps} reps/min`}
            {exercise.load_percentage &&
              ` • Load: ${exercise.load_percentage}%`}
          </>
        );
      case "for_time":
        return (
          <>
            {exercise.target_reps && `Target: ${exercise.target_reps} reps`}
            {exercise.time_cap && ` • Time cap: ${exercise.time_cap} min`}
            {exercise.load_percentage &&
              ` • Load: ${exercise.load_percentage}%`}
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
            {exercise.load_percentage &&
              ` • Load: ${exercise.load_percentage}%`}
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
            {exercise.load_percentage &&
              ` • Load: ${exercise.load_percentage}%`}
          </>
        );
      case "superset":
        return (
          <>
            {exercise.sets} sets × {exercise.reps || "N/A"} reps
            {exercise.rest_seconds && ` • ${exercise.rest_seconds}s rest`}
            {exercise.load_percentage &&
              ` • Load: ${exercise.load_percentage}%`}
          </>
        );
      case "giant_set":
        return (
          <>
            {exercise.sets} sets
            {exercise.giant_set_exercises?.length &&
              ` • ${exercise.giant_set_exercises.length} exercises`}
            {exercise.rest_seconds && ` • ${exercise.rest_seconds}s rest`}
            {exercise.load_percentage &&
              ` • Load: ${exercise.load_percentage}%`}
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
            {exercise.load_percentage &&
              ` • Load: ${exercise.load_percentage}%`}
          </>
        );
      case "drop_set":
        return (
          <>
            {exercise.sets} sets × {exercise.reps} reps
            {exercise.weight && ` • ${exercise.weight} kg`}
            {exercise.drop_percentage &&
              ` • Drop: ${exercise.drop_percentage}%`}
            {exercise.drop_set_reps &&
              ` • Drop reps: ${exercise.drop_set_reps}`}
            {exercise.rest_seconds && ` • ${exercise.rest_seconds}s rest`}
            {exercise.load_percentage &&
              ` • Load: ${exercise.load_percentage}%`}
          </>
        );
      case "pyramid_set":
        return (
          <>
            {exercise.sets} sets • Pyramid structure
            {exercise.start_reps && ` • Start: ${exercise.start_reps} reps`}
            {exercise.end_reps && ` • End: ${exercise.end_reps} reps`}
            {exercise.rest_seconds && ` • ${exercise.rest_seconds}s rest`}
            {exercise.load_percentage &&
              ` • Load: ${exercise.load_percentage}%`}
          </>
        );
      case "ladder":
        return (
          <>
            {exercise.rounds} rounds • Ladder style
            {exercise.start_reps && ` • Start: ${exercise.start_reps} reps`}
            {exercise.increment && ` • +${exercise.increment} per round`}
            {exercise.rest_seconds && ` • ${exercise.rest_seconds}s rest`}
            {exercise.load_percentage &&
              ` • Load: ${exercise.load_percentage}%`}
          </>
        );
      default:
        // Straight sets and any other type - show ALL available data
        const details: string[] = [];
        if (exercise.sets) details.push(`${exercise.sets} sets`);
        if (exercise.reps) details.push(`${exercise.reps} reps`);
        if (exercise.weight) details.push(`${exercise.weight} kg`);
        if (exercise.load_percentage)
          details.push(`${exercise.load_percentage}% load`);
        if (exercise.rest_seconds)
          details.push(`${exercise.rest_seconds}s rest`);
        if (exercise.rir) details.push(`RIR: ${exercise.rir}`);
        if (exercise.rpe) details.push(`RPE: ${exercise.rpe}`);
        if (exercise.tempo) details.push(`Tempo: ${exercise.tempo}`);
        if (exercise.duration_seconds)
          details.push(`${exercise.duration_seconds}s`);

        return <>{details.length > 0 ? details.join(" • ") : "No details"}</>;
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
        exercise_letter: ex.exercise_letter,
        weight_kg: ex.weight_kg,
        tempo: ex.tempo,
        rir: ex.rir,
        rpe: ex.rpe,
        notes: ex.notes,
      }));
    }

    // Fallback to legacy format
    switch (exerciseType) {
      case "circuit":
        // Circuit: circuit_sets is an array of sets, each set has exercises array
        if (exercise.circuit_sets && Array.isArray(exercise.circuit_sets)) {
          const allExercises: any[] = [];
          exercise.circuit_sets.forEach((set: any, setIndex: number) => {
            if (set.exercises && Array.isArray(set.exercises)) {
              set.exercises.forEach((ex: any, exIndex: number) => {
                allExercises.push({
                  exercise_id: ex.exercise_id,
                  name: ex.exercise?.name || getExerciseName(ex.exercise_id),
                  sets: ex.sets || exercise.sets,
                  reps: ex.reps || exercise.reps,
                  rest_seconds:
                    ex.rest_seconds ||
                    set.rest_between_sets ||
                    exercise.rest_seconds,
                  exercise: ex.exercise,
                  work_seconds: ex.work_seconds,
                  rest_after: ex.rest_after || set.rest_between_sets,
                  exercise_letter: String.fromCharCode(65 + exIndex), // A, B, C, etc.
                });
              });
            }
          });
          return allExercises;
        }
        return [];
      case "tabata":
        // Tabata: tabata_sets is an array of sets, each set has exercises array
        if (exercise.tabata_sets && Array.isArray(exercise.tabata_sets)) {
          const allExercises: any[] = [];
          exercise.tabata_sets.forEach((set: any, setIndex: number) => {
            if (set.exercises && Array.isArray(set.exercises)) {
              set.exercises.forEach((ex: any, exIndex: number) => {
                allExercises.push({
                  exercise_id: ex.exercise_id,
                  name: ex.exercise?.name || getExerciseName(ex.exercise_id),
                  sets: ex.sets || exercise.sets,
                  reps: ex.reps || exercise.reps,
                  rest_seconds:
                    ex.rest_seconds ||
                    set.rest_between_sets ||
                    exercise.rest_after ||
                    exercise.rest_seconds,
                  exercise: ex.exercise,
                  work_seconds: exercise.work_seconds,
                  rest_after:
                    ex.rest_after ||
                    set.rest_between_sets ||
                    exercise.rest_after,
                  exercise_letter: String.fromCharCode(65 + exIndex), // A, B, C, etc.
                });
              });
            }
          });
          return allExercises;
        }
        return [];
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
            weight: exercise.weight,
            tempo: exercise.tempo,
            rir: exercise.rir,
            rpe: exercise.rpe,
          },
          {
            exercise_id: exercise.superset_exercise_id,
            name: getExerciseName(exercise.superset_exercise_id),
            sets: exercise.sets,
            reps: exercise.superset_reps || exercise.reps,
            rest_seconds: exercise.rest_seconds,
            weight: exercise.superset_weight,
            tempo: exercise.superset_tempo,
            rir: exercise.superset_rir,
            rpe: exercise.superset_rpe,
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
            rest_seconds: exercise.rest_seconds,
            weight: exercise.weight,
            tempo: exercise.tempo,
            rir: exercise.rir,
            rpe: exercise.rpe,
          },
          {
            exercise_id: exercise.compound_exercise_id,
            name: getExerciseName(exercise.compound_exercise_id),
            sets: exercise.sets,
            reps: exercise.compound_reps,
            type: "compound",
            rest_seconds: exercise.rest_seconds,
            weight: exercise.compound_weight,
            tempo: exercise.compound_tempo,
            rir: exercise.compound_rir,
            rpe: exercise.compound_rpe,
          },
        ].filter((e) => e.exercise_id);
      case "amrap":
      case "emom":
      case "emom_reps":
      case "for_time":
      case "ladder":
        // These types might have nested exercises in block.exercises
        // If main exercise exists, show it as a nested item
        if (exercise.exercise_id) {
          return [
            {
              exercise_id: exercise.exercise_id,
              name: mainExerciseName,
              sets: exercise.sets,
              reps: exercise.reps,
              rest_seconds: exercise.rest_seconds,
              weight: exercise.weight,
              tempo: exercise.tempo,
              rir: exercise.rir,
              rpe: exercise.rpe,
              duration_seconds: exercise.duration_seconds,
              work_seconds: exercise.work_seconds,
              emom_duration: exercise.emom_duration,
              emom_reps: exercise.emom_reps,
              emom_mode: exercise.emom_mode,
            },
          ];
        }
        return [];
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
      } rounded-xl p-3 sm:p-4 transition-all duration-200 hover:shadow-md w-full ${
        draggable ? "cursor-move" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left side: Number, drag handle, content */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Number and drag handle */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {draggable && (
              <div className="hidden sm:block cursor-grab active:cursor-grabbing">
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
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
          {/* Group exercises by sets for tabata/circuit */}
          {(exerciseType === "tabata" || exerciseType === "circuit") &&
          (exercise.tabata_sets || exercise.circuit_sets)
            ? // Display sets with their exercises
              (exerciseType === "tabata"
                ? exercise.tabata_sets
                : exercise.circuit_sets
              ).map((set: any, setIndex: number) => (
                <div key={setIndex} className="space-y-2">
                  {/* Set header with rest after set time */}
                  {set.rest_between_sets && (
                    <div
                      className={`text-xs font-medium ${theme.textSecondary} mb-1`}
                    >
                      Set {setIndex + 1} • {set.rest_between_sets}s rest after
                      set
                    </div>
                  )}
                  {/* Exercises in this set */}
                  {Array.isArray(set.exercises) && set.exercises.length > 0 ? (
                    <div className="space-y-2 pl-2 w-full">
                      {set.exercises.map((ex: any, exIndex: number) => {
                        // Get exercise name
                        const exName =
                          ex.exercise?.name ||
                          (ex.exercise_id
                            ? availableExercises.find(
                                (e: any) => e.id === ex.exercise_id
                              )?.name
                            : null) ||
                          "Exercise";

                        // For Tabata: work_seconds and rest_seconds are uniform (block-level)
                        // For Circuit: can differ per exercise
                        let workTime: number | undefined;
                        let restTime: number | undefined;

                        if (exerciseType === "tabata") {
                          // Tabata: uniform work/rest times from block level
                          // Work time comes from block level (exercise.work_seconds)
                          workTime = exercise.work_seconds
                            ? parseInt(String(exercise.work_seconds))
                            : 20; // Default 20s for tabata if not set
                          // Rest time is the SHORT rest between exercises (typically 10s)
                          // This is NOT rest_after (which is shown in set header)
                          // In tabata, rest between exercises is usually 10s or stored in block_parameters
                          restTime = ex.rest_seconds
                            ? parseInt(String(ex.rest_seconds))
                            : 10; // Default 10s rest between exercises in tabata
                        } else {
                          // Circuit: can differ per exercise
                          workTime = ex.work_seconds
                            ? parseInt(String(ex.work_seconds))
                            : undefined;
                          restTime = ex.rest_seconds
                            ? parseInt(String(ex.rest_seconds))
                            : ex.rest_after
                            ? parseInt(String(ex.rest_after))
                            : undefined;
                        }

                        return (
                          <ExerciseItem
                            key={exIndex}
                            exercise={{
                              ...ex,
                              exercise_id: ex.exercise_id,
                              name: exName,
                              exercise:
                                ex.exercise ||
                                availableExercises.find(
                                  (e: any) => e.id === ex.exercise_id
                                ),
                              work_seconds: workTime,
                              rest_seconds: restTime,
                            }}
                            index={exIndex}
                            availableExercises={availableExercises}
                            blockType={exerciseType}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div
                      className={`text-xs ${theme.textSecondary} pl-2 italic`}
                    >
                      No exercises in this set
                    </div>
                  )}
                </div>
              ))
            : // Fallback for other complex block types or if sets structure is not available
              nestedExercises.map(
                (nestedExercise: any, nestedIndex: number) => (
                  <ExerciseItem
                    key={nestedIndex}
                    exercise={nestedExercise}
                    index={nestedIndex}
                    availableExercises={availableExercises}
                    blockType={exerciseType}
                  />
                )
              )}
        </div>
      )}

      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
