"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { WorkoutTemplate } from "@/lib/database";
import { supabase } from "@/lib/supabase";
import { useExerciseLibrary } from "@/hooks/useCoachData";
import { useAuth } from "@/contexts/AuthContext";
import { WorkoutBlockService } from "@/lib/workoutBlockService";
import ExerciseBlockCard from "@/components/features/workouts/ExerciseBlockCard";
import {
  X,
  Dumbbell,
  Clock,
  Users,
  Star,
  Edit,
  Heart,
  Zap,
  Activity,
  Settings,
} from "lucide-react";

interface WorkoutTemplateDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  template: WorkoutTemplate;
  onEdit?: (template: WorkoutTemplate) => void;
}

export default function WorkoutTemplateDetails({
  isOpen,
  onClose,
  template,
  onEdit,
}: WorkoutTemplateDetailsProps) {
  const { user } = useAuth();

  // Load exercises for name lookup
  const { exercises: availableExercises } = useExerciseLibrary(user?.id || "");

  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [availableExercisesList, setAvailableExercisesList] = useState<any[]>(
    []
  );

  const difficultyColors = {
    beginner:
      "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
    intermediate:
      "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
    advanced: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
  };

  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName?.toLowerCase()) {
      case "strength":
        return Dumbbell;
      case "cardio":
        return Heart;
      case "hiit":
        return Zap;
      case "flexibility":
        return Activity;
      default:
        return Dumbbell;
    }
  };

  const categoryName = typeof (template as any).category === 'string' 
    ? (template as any).category 
    : (template as any).category?.name || ''
  const CategoryIcon = getCategoryIcon(categoryName);

  useEffect(() => {
    if (isOpen && template) {
      loadWorkoutBlocks();
      loadAvailableExercises();
    }
  }, [isOpen, template]);

  const loadAvailableExercises = async () => {
    try {
      const { data, error } = await supabase
        .from("exercises")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setAvailableExercisesList(data || []);
    } catch (error) {
      console.error("Error loading exercises:", error);
      setAvailableExercisesList([]);
    }
  };

  const loadWorkoutBlocks = async () => {
    try {
      setLoading(true);
      const blocks = await WorkoutBlockService.getWorkoutBlocks(template.id);

      // Convert blocks to exercises format (same as edit page)
      if (blocks && blocks.length > 0) {
        const convertedExercises: any[] = [];

        blocks.forEach((block, blockIndex) => {
          // Create exercise object from block (same logic as edit page)
          const exercise: any = {
            id: block.id || `block-${blockIndex}-${Date.now()}`,
            exercise_type: block.block_type,
            exercise_id: block.exercises?.[0]?.exercise_id,
            order_index: blockIndex + 1,
            sets: block.total_sets?.toString() || "",
            reps: block.reps_per_set || "",
            rest_seconds: block.rest_seconds?.toString() || "",
            notes: block.block_notes || "",
            block_name: block.block_name,
          };

          // Get first exercise and its special table data
          const firstExercise = block.exercises?.[0];
          const firstExerciseId = firstExercise?.exercise_id;
          const firstExerciseOrder = firstExercise?.exercise_order || 1;
          
          // Get time protocol for this block/exercise (for time-based blocks)
          const timeProtocol = block.time_protocols?.find(
            (tp: any) => tp.exercise_id === firstExerciseId && tp.exercise_order === firstExerciseOrder
          ) || block.time_protocols?.[0]; // Fallback to first if not found
          
          // Get special table data from first exercise
          const dropSet = firstExercise?.drop_sets?.[0];
          const clusterSet = firstExercise?.cluster_sets?.[0];
          const restPauseSet = firstExercise?.rest_pause_sets?.[0];
          const pyramidSets = firstExercise?.pyramid_sets || [];
          const ladderSets = firstExercise?.ladder_sets || [];

          // Load data from special tables
          exercise.rounds = timeProtocol?.rounds?.toString() || undefined;
          exercise.work_seconds = timeProtocol?.work_seconds?.toString() || undefined;
          exercise.rest_after = timeProtocol?.rest_seconds?.toString() || undefined;
          exercise.amrap_duration = timeProtocol?.total_duration_minutes?.toString() || undefined;
          exercise.emom_duration = timeProtocol?.total_duration_minutes?.toString() || undefined;
          exercise.emom_reps = timeProtocol?.reps_per_round?.toString() || undefined;
          exercise.emom_mode = timeProtocol?.emom_mode || "";
          exercise.target_reps = timeProtocol?.target_reps?.toString() || undefined;
          exercise.time_cap = timeProtocol?.time_cap_minutes?.toString() || undefined;
          
          // Drop set specific (from special table)
          if (dropSet) {
            const initialWeight = firstExercise?.weight_kg || 0;
            const dropWeight = dropSet.weight_kg || 0;
            if (initialWeight > 0 && dropWeight > 0) {
              const calculatedPercentage = Math.round(((initialWeight - dropWeight) / initialWeight) * 100);
              exercise.drop_percentage = String(calculatedPercentage);
            }
            exercise.drop_set_reps = dropSet.reps || "";
          } else {
            // No drop set data available
            exercise.drop_percentage = "";
            exercise.drop_set_reps = "";
          }

          // Handle complex block types with nested exercises
          const blockType = block.block_type as string;
          if (blockType === "circuit" || blockType === "tabata") {
            const exercisesArray =
              block.exercises?.map((ex, idx) => ({
                exercise_id: ex.exercise_id,
                sets: ex.sets?.toString() || block.total_sets?.toString() || "",
                reps: ex.reps || block.reps_per_set || "",
                rest_seconds:
                  ex.rest_seconds?.toString() ||
                  block.rest_seconds?.toString() ||
                  "",
                work_seconds: (ex as any).work_seconds?.toString(),
                rest_after: (ex as any).rest_after?.toString(),
                exercise: ex.exercise,
              })) || [];

            if (blockType === "tabata") {
              // Get time protocol data for tabata (use first exercise's protocol as default)
              const tabataProtocol = block.time_protocols?.find(
                (tp: any) => tp.protocol_type === 'tabata'
              ) || timeProtocol;
              
              const restAfter = tabataProtocol?.rest_seconds?.toString() ||
                block.rest_seconds?.toString() ||
                "10";
              exercise.rest_after = String(restAfter);
              exercise.rounds = tabataProtocol?.rounds?.toString() ||
                block.total_sets?.toString() ||
                "8";
              exercise.work_seconds = tabataProtocol?.work_seconds?.toString() ||
                "20";

              // Build tabata_sets from exercises and their time protocols
              const numSets = block.total_sets || 1;
              exercise.tabata_sets = Array.from(
                { length: numSets },
                (_, setIdx) => {
                  // Get time protocol for each exercise if available
                  const exerciseProtocols = block.time_protocols?.filter(
                    (tp: any) => tp.protocol_type === 'tabata'
                  ) || [];
                  
                  return {
                    exercises: exercisesArray.map((ex: any, exIdx: number) => {
                      const exProtocol = exerciseProtocols.find(
                        (tp: any) => tp.exercise_id === ex.exercise_id && tp.exercise_order === (exIdx + 1)
                      );
                      return {
                        ...ex,
                        exercise: ex.exercise || availableExercisesList.find((e: any) => e.id === ex.exercise_id),
                        rest_seconds: exProtocol?.rest_seconds?.toString() || restAfter,
                      };
                    }),
                    rest_between_sets: String(restAfter),
                  };
                }
              );
              
              exercise.circuit_sets = exercise.tabata_sets;
            } else {
              // Circuit uses circuit_sets
              // Get time protocol data for circuit
              const circuitProtocol = block.time_protocols?.find(
                (tp: any) => tp.protocol_type === 'circuit'
              ) || timeProtocol;
              
              // Build circuit_sets from exercises and their time protocols
              const numSets = block.total_sets || 1;
              exercise.circuit_sets = Array.from(
                { length: numSets },
                (_, setIdx) => {
                  // Get time protocol for each exercise if available
                  const exerciseProtocols = block.time_protocols?.filter(
                    (tp: any) => tp.protocol_type === 'circuit'
                  ) || [];
                  
                  return {
                    exercises: exercisesArray.map((ex: any, exIdx: number) => {
                      const exProtocol = exerciseProtocols.find(
                        (tp: any) => tp.exercise_id === ex.exercise_id && tp.exercise_order === (exIdx + 1)
                      );
                      return {
                        ...ex,
                        exercise: ex.exercise || availableExercisesList.find((e: any) => e.id === ex.exercise_id),
                        rest_seconds: exProtocol?.rest_seconds?.toString() || 
                          block.rest_seconds?.toString() || 
                          "60",
                      };
                    }),
                    rest_between_sets: circuitProtocol?.rest_seconds?.toString() ||
                      block.rest_seconds?.toString() ||
                      "60",
                  };
                }
              );
              
              // circuit_sets should come from relational tables (block_parameters removed)
              // TODO: Check if circuit_sets data exists in relational tables
            }
          } else if (block.block_type === "drop_set") {
            // Already handled above in the special table loading section
          } else if (block.block_type === "cluster_set") {
            // Load cluster set data from special table
            if (clusterSet) {
              exercise.cluster_reps = clusterSet.reps_per_cluster?.toString() || exercise.reps || "";
              exercise.clusters_per_set = clusterSet.clusters_per_set?.toString() || "";
              exercise.intra_cluster_rest = clusterSet.intra_cluster_rest?.toString() || "15";
            }
          } else if (block.block_type === "rest_pause") {
            // Load rest pause data from special table
            if (restPauseSet) {
              exercise.rest_pause_duration = restPauseSet.rest_pause_duration?.toString() || "15";
              exercise.max_rest_pauses = restPauseSet.max_rest_pauses?.toString() || "3";
            }
          } else if (block.block_type === "pyramid_set") {
            // Load pyramid set data from special table
            if (pyramidSets.length > 0) {
              // Use first pyramid step as base
              exercise.weight_kg = pyramidSets[0]?.weight_kg?.toString() || "";
              exercise.reps = pyramidSets[0]?.reps || "";
            }
          } else if (block.block_type === "ladder") {
            // Load ladder set data from special table
            if (ladderSets.length > 0) {
              // Use first ladder step as base
              exercise.weight_kg = ladderSets[0]?.weight_kg?.toString() || "";
              exercise.reps = ladderSets[0]?.reps?.toString() || "";
            }
          } else if (block.block_type === "giant_set") {
            exercise.giant_set_exercises =
              block.exercises?.map((ex) => ({
                exercise_id: ex.exercise_id,
                sets: ex.sets?.toString() || block.total_sets?.toString() || "",
                reps: ex.reps || block.reps_per_set || "",
                exercise: ex.exercise,
              })) || [];
          } else if (block.block_type === "superset") {
            if (block.exercises && block.exercises.length >= 2) {
              exercise.superset_exercise_id = block.exercises[1].exercise_id;
              exercise.superset_reps =
                block.exercises[1].reps || block.reps_per_set || "";
            }
          } else if (block.block_type === "pre_exhaustion") {
            if (block.exercises && block.exercises.length >= 2) {
              exercise.compound_exercise_id = block.exercises[1].exercise_id;
              exercise.isolation_reps = block.exercises[0].reps || "";
              exercise.compound_reps = block.exercises[1].reps || "";
            }
          }

          // Add exercise object from block
          if (block.exercises && block.exercises.length > 0) {
            exercise.exercise = block.exercises[0].exercise;
          }

          convertedExercises.push(exercise);
        });

        setExercises(convertedExercises);
      } else {
        setExercises([]);
      }
    } catch (error) {
      console.error("Error loading workout blocks:", error);
      setExercises([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center p-4 pt-8 pb-8 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative fc-modal fc-card max-w-6xl w-full max-h-[95vh] flex flex-col transform transition-all duration-300 ease-out overflow-hidden"
        style={{
          animation: "modalSlideIn 0.3s ease-out",
          height: "min(95vh, calc(100vh - 2rem))",
        }}
      >
        {/* Header */}
        <div className="sticky top-0 border-b border-[color:var(--fc-glass-border)] px-3 sm:px-6 py-5 rounded-t-3xl">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-4">
              <div className="fc-icon-tile fc-icon-workouts">
                <CategoryIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="fc-pill fc-pill-glass fc-text-workouts">
                  Template details
                </span>
                <h2 className="text-lg sm:text-2xl font-bold fc-text-primary mt-2 break-words">
                  {template.name}
                </h2>
                <p className="text-xs sm:text-sm fc-text-dim mt-1 break-words">
                  {typeof (template as any).category === "string"
                    ? (template as any).category
                    : (template as any).category?.name || "General"}{" "}
                  • {template.difficulty_level}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2 fc-btn fc-btn-ghost"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-6 pb-6">
          <div className="space-y-6 w-full">
            {/* Template Overview */}
            <div className="fc-glass fc-card border border-[color:var(--fc-glass-border)] rounded-2xl">
              <div className="p-6">
                <div className="flex items-center gap-3">
                  <div className="fc-icon-tile fc-icon-workouts">
                    <Settings className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold fc-text-primary">
                    Template Overview
                  </h3>
                </div>
              </div>
              <div className="p-6 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl fc-glass-soft border border-[color:var(--fc-glass-border)]">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 fc-text-workouts" />
                      <span className="text-[10px] tracking-[0.2em] uppercase fc-text-subtle">
                        Duration
                      </span>
                    </div>
                    <p className="text-2xl font-bold fc-text-primary">
                      {template.estimated_duration}m
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl fc-glass-soft border border-[color:var(--fc-glass-border)]">
                    <div className="flex items-center gap-2 mb-2">
                      <Dumbbell className="w-4 h-4 fc-text-workouts" />
                      <span className="text-[10px] tracking-[0.2em] uppercase fc-text-subtle">
                        Exercises
                      </span>
                    </div>
                    <p className="text-2xl font-bold fc-text-primary">
                      {exercises.length}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl fc-glass-soft border border-[color:var(--fc-glass-border)]">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 fc-text-workouts" />
                      <span className="text-[10px] tracking-[0.2em] uppercase fc-text-subtle">
                        Usage
                      </span>
                    </div>
                    <p className="text-2xl font-bold fc-text-primary">
                      {(template as any).usage_count || 0}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl fc-glass-soft border border-[color:var(--fc-glass-border)]">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-4 h-4 fc-text-workouts" />
                      <span className="text-[10px] tracking-[0.2em] uppercase fc-text-subtle">
                        Rating
                      </span>
                    </div>
                    <p className="text-2xl font-bold fc-text-primary">
                      {(template as any).rating || 0}
                    </p>
                  </div>
                </div>

                {template.description && (
                  <div className="mt-6">
                    <h4 className="text-lg font-semibold fc-text-primary mb-2">
                      Description
                    </h4>
                    <p className="fc-text-dim leading-relaxed">
                      {template.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Exercises */}
            <div className="fc-glass fc-card border border-[color:var(--fc-glass-border)] rounded-2xl">
              <div className="p-6">
                <div className="flex items-center gap-3">
                  <div className="fc-icon-tile fc-icon-workouts">
                    <Dumbbell className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold fc-text-primary">
                    Workout Flow ({exercises.length} items)
                  </h3>
                </div>
              </div>
              <div className="p-6 pt-0">
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="fc-glass-soft rounded-xl p-4 animate-pulse"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 bg-[color:var(--fc-glass-border)] rounded-lg"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-[color:var(--fc-glass-border)] rounded w-1/3"></div>
                            <div className="h-3 bg-[color:var(--fc-glass-border)] rounded w-1/2"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : exercises.length > 0 ? (
                  <div className="space-y-3 max-h-[600px] sm:max-h-[700px] overflow-y-auto">
                    {exercises.map((exercise, index) => {
                      // Create unique key combining multiple properties to avoid duplicates
                      const order = exercise.order_index || index + 1;
                      const uniqueKey = exercise.id
                        ? `ex-${exercise.exercise_type || "unknown"}-${
                            exercise.id
                          }-${order}`
                        : `ex-${exercise.exercise_type || "unknown"}-${
                            exercise.exercise_id || "no-id"
                          }-${order}-${index}`;

                      return (
                        <ExerciseBlockCard
                          key={uniqueKey}
                          exercise={exercise}
                          index={index}
                          availableExercises={availableExercisesList}
                          renderMode="view"
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center rounded-2xl border-2 border-dashed border-[color:var(--fc-glass-border)] fc-text-dim">
                    <div className="mx-auto w-12 h-12 mb-3 fc-icon-tile fc-icon-workouts">
                      <Dumbbell className="w-5 h-5" />
                    </div>
                    <h4 className="font-semibold text-lg fc-text-primary">
                      No Exercises
                    </h4>
                    <p className="text-sm">
                      This workout template doesn't have any exercises yet.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-[color:var(--fc-glass-border)] px-3 sm:px-6 py-4 rounded-b-3xl flex items-center justify-end gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            className="fc-btn fc-btn-secondary"
          >
            Close
          </Button>
          {onEdit && (
            <Button
              onClick={() => onEdit(template)}
              className="fc-btn fc-btn-primary fc-press"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Template
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
