"use client";

import React from "react";
import { Button } from "@/components/ui/button";
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
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import ExerciseItem from "./ExerciseItem";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatPrescribedRpeLabel } from "@/lib/workoutTargetIntensity";

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
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  children?: React.ReactNode;
  /** Tighter padding in template editor */
  compact?: boolean;
}

// Block type styles with colors and icons
const blockTypeStyles: Record<
  string,
  { icon: any; label: string }
> = {
  straight_set: {
    icon: Dumbbell,
    label: "Straight Set",
  },
  superset: {
    icon: Zap,
    label: "Superset",
  },
  giant_set: {
    icon: Target,
    label: "Giant Set",
  },
  drop_set: {
    icon: TrendingDown,
    label: "Drop Set",
  },
  cluster_set: {
    icon: Timer,
    label: "Cluster Set",
  },
  rest_pause: {
    icon: PauseCircle,
    label: "Rest-Pause",
  },
  pre_exhaustion: {
    icon: Activity,
    label: "Pre-Exhaustion",
  },
  amrap: {
    icon: RotateCcw,
    label: "AMRAP",
  },
  emom: {
    icon: Clock,
    label: "EMOM",
  },
  emom_reps: {
    icon: Hash,
    label: "EMOM Reps",
  },
  tabata: {
    icon: Flame,
    label: "Tabata",
  },
  for_time: {
    icon: Zap,
    label: "For Time",
  },
};

// Complex block types that show nested exercises
const COMPLEX_BLOCK_TYPES = [
  "tabata",
  "giant_set",
  "superset",
  "pre_exhaustion",
  "amrap",
  "emom",
  "emom_reps",
  "for_time",
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
  isExpanded = true,
  onToggleExpand,
  children,
  compact = false,
}: ExerciseBlockCardProps) {
  const isCollapsible =
    renderMode === "form" && onToggleExpand != null;
  const showExpanded = !isCollapsible || isExpanded;
  const exerciseType =
    exercise.exercise_type || exercise.set_type || "straight_set";
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
            {exercise.intra_cluster_rest &&
              ` • Intra-cluster rest: ${exercise.intra_cluster_rest}s`}
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
            {/* NO rest_seconds for superset exercises (they're done back-to-back) */}
            {exercise.load_percentage &&
              ` • Load: ${exercise.load_percentage}%`}
            {(exercise as any).superset_load_percentage &&
              exercise.load_percentage !==
                (exercise as any).superset_load_percentage &&
              ` • Superset load: ${
                (exercise as any).superset_load_percentage
              }%`}
          </>
        );
      case "giant_set":
        return (
          <>
            {exercise.sets} sets
            {exercise.giant_set_exercises?.length &&
              ` • ${exercise.giant_set_exercises.length} exercises`}
            {exercise.rest_seconds && ` • ${exercise.rest_seconds}s rest`}
            {/* Don't show load in summary - each exercise has its own load shown in nested exercises */}
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
              ` • Isolation load: ${exercise.load_percentage}%`}
            {(exercise as any).compound_load_percentage &&
              ` • Compound load: ${
                (exercise as any).compound_load_percentage
              }%`}
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
        if (exercise.rir != null && exercise.rir !== "") {
          details.push(
            formatPrescribedRpeLabel(exercise.rir) ?? `RPE ${String(exercise.rir).trim()}`,
          );
        }
        if (exercise.rpe) details.push(`RPE: ${exercise.rpe}`);
        if (exercise.tempo) details.push(`Tempo: ${exercise.tempo}`);
        if (exercise.duration_seconds)
          details.push(`${exercise.duration_seconds}s`);

        return <>{details.length > 0 ? details.join(" • ") : "No details"}</>;
    }
  };

  // Extract nested exercises for complex blocks
  const getNestedExercises = (): any[] => {
    // First check if exercises are directly available (from workout_set_entries schema)
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
        load_percentage: ex.load_percentage?.toString() || "",
      }));
    }

    // Fallback to legacy format
    switch (exerciseType) {
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
                  load_percentage: ex.load_percentage?.toString() || "",
                  exercise_letter: String.fromCharCode(65 + exIndex), // A, B, C, etc.
                });
              });
            }
          });
          return allExercises;
        }
        return [];
      case "giant_set":
        return (exercise.giant_set_exercises || []).map((ex: any) => ({
          ...ex,
          load_percentage: ex.load_percentage?.toString() || "",
        }));
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
            load_percentage: exercise.load_percentage?.toString() || "",
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
            load_percentage:
              (exercise as any).superset_load_percentage?.toString() || "",
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
            load_percentage: exercise.load_percentage?.toString() || "",
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
            load_percentage:
              (exercise as any).compound_load_percentage?.toString() || "",
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
  const showNestedExercises =
    isComplex && nestedExercises.length > 0 && showExpanded;

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => draggable && onDragStart?.(e, exercise.id)}
      onDragEnd={draggable ? onDragEnd : undefined}
      className={`fc-glass fc-card border border-[color:var(--fc-glass-border)] transition-all duration-200 fc-hover-rise w-full ${
        compact ? "rounded-lg p-3" : "rounded-2xl p-3 sm:p-5"
      } ${draggable ? "cursor-move" : ""} ${
        isCollapsible && isExpanded ? "ring-2 ring-[color:var(--fc-accent-cyan)]/30" : ""
      }`}
    >
      <div
        className={`flex items-start justify-between gap-2 sm:gap-3 ${isCollapsible ? `cursor-pointer ${compact ? "min-h-9" : "min-h-11"}` : ""}`}
        onClick={isCollapsible ? onToggleExpand : undefined}
        role={isCollapsible ? "button" : undefined}
        tabIndex={isCollapsible ? 0 : undefined}
        onKeyDown={isCollapsible ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggleExpand?.(); } } : undefined}
        aria-expanded={isCollapsible ? isExpanded : undefined}
      >
        {/* Left side: Number, drag handle, content */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Number and drag handle */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {draggable && (
              <div className="flex cursor-grab active:cursor-grabbing">
                <GripVertical className="w-3 h-3 sm:w-4 sm:h-4 fc-text-subtle" />
              </div>
            )}
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold fc-glass-soft border border-[color:var(--fc-glass-border)] fc-text-primary">
              {index + 1}
            </div>
          </div>

          {/* Exercise info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h4 className="font-semibold fc-text-primary break-words">
                {isComplex &&
                exerciseType !== "superset" &&
                exerciseType !== "pre_exhaustion"
                  ? `${styleConfig.label} ${index + 1}`
                  : mainExerciseName}
              </h4>
              <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                <BlockIcon className="w-3 h-3 mr-1 fc-text-workouts" />
                {styleConfig.label}
              </span>
            </div>
            <p className="text-sm fc-text-subtle break-words">
              {renderExerciseSummary()}
            </p>
            {exercise.notes && (
              <p className="text-xs fc-text-subtle mt-1">
                Note: {exercise.notes}
              </p>
            )}
          </div>
        </div>

        {/* Right side: Actions */}
        {renderMode === "form" && (
          <div className="flex gap-2 flex-shrink-0">
            {isCollapsible && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand?.();
                }}
                className="fc-btn fc-btn-ghost fc-press min-w-11 min-h-11"
                aria-label={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            )}
            {onEdit && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(exercise);
                }}
                className="fc-btn fc-btn-ghost fc-press min-w-11 min-h-11"
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(exercise.id);
                }}
                className="fc-btn fc-btn-ghost fc-press fc-text-error min-w-11 min-h-11"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Nested exercises for complex set entries */}
      {showNestedExercises && (
        <div className={`${compact ? "mt-2 pt-2 space-y-2" : "mt-4 pt-4 space-y-3"} border-t border-[color:var(--fc-glass-border)]`}>
          {/* Group exercises by sets for tabata */}
          {exerciseType === "tabata" && exercise.tabata_sets
            ? exercise.tabata_sets.map((set: any, setIndex: number) => (
                <div key={setIndex} className="space-y-2">
                  {/* Set header with rest after set time */}
                  {((exercise as any).rest_after_set ||
                    set.rest_between_sets) && (
                    <div className="text-xs font-medium fc-text-subtle mb-1">
                      Set {setIndex + 1} •{" "}
                      {(exercise as any).rest_after_set ||
                        set.rest_between_sets}
                      s rest after set
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
                    <EmptyState variant="inline" title="No exercises in this set" />
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

      {showExpanded && children && (
        <div className={`border-t border-[color:var(--fc-glass-border)] ${compact ? "mt-2 pt-2" : "mt-5 pt-5"}`}>
          {children}
        </div>
      )}
    </div>
  );
}
