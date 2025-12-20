"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/contexts/ThemeContext";
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
  Copy,
  Trash2,
  Heart,
  Zap,
  Activity,
  Settings,
  ChevronRight,
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
  const { getThemeStyles } = useTheme();
  const theme = getThemeStyles();
  const isDark = theme.background.includes("slate-900");
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
            // Copy block parameters
            rounds: block.block_parameters?.rounds
              ? String(block.block_parameters.rounds)
              : undefined,
            work_seconds: block.block_parameters?.work_seconds
              ? String(block.block_parameters.work_seconds)
              : undefined,
            rest_after: block.block_parameters?.rest_after
              ? String(block.block_parameters.rest_after)
              : undefined,
            amrap_duration: block.block_parameters?.amrap_duration
              ? String(block.block_parameters.amrap_duration)
              : undefined,
            emom_duration: block.block_parameters?.emom_duration
              ? String(block.block_parameters.emom_duration)
              : undefined,
            emom_reps: block.block_parameters?.emom_reps
              ? String(block.block_parameters.emom_reps)
              : undefined,
            emom_mode: block.block_parameters?.emom_mode,
            target_reps: block.block_parameters?.target_reps
              ? String(block.block_parameters.target_reps)
              : undefined,
            time_cap: block.block_parameters?.time_cap
              ? String(block.block_parameters.time_cap)
              : undefined,
            drop_percentage: block.block_parameters?.drop_percentage
              ? String(block.block_parameters.drop_percentage)
              : "",
            drop_set_reps: block.block_parameters?.drop_set_reps || "",
          };

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
              const restAfter =
                block.block_parameters?.rest_after ||
                block.rest_seconds ||
                "10";
              exercise.rest_after = String(restAfter);
              exercise.rounds =
                block.block_parameters?.rounds ||
                block.total_sets?.toString() ||
                "8";
              exercise.work_seconds = block.block_parameters?.work_seconds
                ? String(block.block_parameters.work_seconds)
                : "20";

              if (
                block.block_parameters?.tabata_sets &&
                Array.isArray(block.block_parameters.tabata_sets)
              ) {
                exercise.tabata_sets = block.block_parameters.tabata_sets.map(
                  (set: any) => ({
                    exercises: Array.isArray(set.exercises)
                      ? set.exercises.map((ex: any) => ({
                          ...ex,
                          exercise:
                            ex.exercise ||
                            availableExercisesList.find(
                              (e: any) => e.id === ex.exercise_id
                            ),
                        }))
                      : [],
                    rest_between_sets:
                      set.rest_between_sets || String(restAfter),
                  })
                );
              } else {
                const numSets = block.total_sets || 1;
                exercise.tabata_sets = Array.from(
                  { length: numSets },
                  (_, setIdx) => ({
                    exercises: exercisesArray.map((ex: any) => ({
                      ...ex,
                    })),
                    rest_between_sets: String(restAfter),
                  })
                );
              }
              exercise.circuit_sets = exercise.tabata_sets;
            } else {
              if (
                block.block_parameters?.circuit_sets &&
                Array.isArray(block.block_parameters.circuit_sets)
              ) {
                exercise.circuit_sets = block.block_parameters.circuit_sets.map(
                  (set: any) => ({
                    exercises: Array.isArray(set.exercises)
                      ? set.exercises.map((ex: any) => ({
                          ...ex,
                          exercise:
                            ex.exercise ||
                            availableExercisesList.find(
                              (e: any) => e.id === ex.exercise_id
                            ),
                        }))
                      : [],
                    rest_between_sets:
                      set.rest_between_sets ||
                      block.rest_seconds?.toString() ||
                      "60",
                  })
                );
              } else {
                const numSets = block.total_sets || 1;
                exercise.circuit_sets = Array.from(
                  { length: numSets },
                  (_, setIdx) => ({
                    exercises: exercisesArray.map((ex: any) => ({
                      ...ex,
                    })),
                    rest_between_sets: block.rest_seconds?.toString() || "60",
                  })
                );
              }
            }
          } else if (block.block_type === "drop_set") {
            if (block.block_parameters?.drop_percentage !== undefined) {
              exercise.drop_percentage = String(
                block.block_parameters.drop_percentage
              );
            }
            if (block.block_parameters?.drop_set_reps) {
              exercise.drop_set_reps = String(
                block.block_parameters.drop_set_reps
              );
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
      className={`fixed inset-0 z-[9999] flex items-start justify-center p-4 pt-8 pb-8 ${
        isDark ? "bg-black/60 backdrop-blur-sm" : "bg-black/50 backdrop-blur-sm"
      }`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      data-theme={isDark ? "dark" : "light"}
    >
      <div
        className={`relative ${theme.card} ${theme.shadow} rounded-3xl border ${theme.border} w-full flex flex-col transform transition-all duration-300 ease-out overflow-hidden`}
        style={{
          animation: "modalSlideIn 0.3s ease-out",
          height: "min(90vh, calc(100vh - 2rem))",
          maxHeight: "min(90vh, calc(100vh - 2rem))",
          maxWidth: "min(98vw, 90rem)",
        }}
      >
        {/* Header */}
        <div
          className={`sticky top-0 ${theme.card} border-b ${theme.border} px-3 sm:px-6 py-5 rounded-t-3xl`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-4">
              <div
                className={`p-3 rounded-2xl bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 shadow-lg`}
              >
                <CategoryIcon className={`w-6 h-6 text-white`} />
              </div>
              <div className="min-w-0 flex-1">
                <h2
                  className={`text-lg sm:text-2xl font-bold ${theme.text} break-words`}
                >
                  {template.name}
                </h2>
                <p
                  className={`text-xs sm:text-sm ${theme.textSecondary} mt-1 break-words`}
                >
                  {typeof (template as any).category === 'string' 
                    ? (template as any).category 
                    : (template as any).category?.name || "General"} • {template.difficulty_level}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className={`p-2 rounded-xl transition-all duration-200 ${
                theme.textSecondary
              } hover:${theme.text} hover:${
                isDark ? "bg-slate-700" : "bg-slate-100"
              }`}
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
            <Card
              className={`${theme.card} border ${theme.border} rounded-2xl`}
            >
              <CardHeader className="p-6">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-xl bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 shadow-lg`}
                  >
                    <Settings className={`w-5 h-5 text-white`} />
                  </div>
                  <CardTitle className={`text-xl font-bold ${theme.text}`}>
                    Template Overview
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div
                    className={`p-4 rounded-xl ${theme.card} border ${theme.border}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span className={`text-sm font-medium ${theme.text}`}>
                        Duration
                      </span>
                    </div>
                    <p className={`text-2xl font-bold ${theme.text}`}>
                      {template.estimated_duration}m
                    </p>
                  </div>

                  <div
                    className={`p-4 rounded-xl ${theme.card} border ${theme.border}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Dumbbell className="w-4 h-4 text-green-500" />
                      <span className={`text-sm font-medium ${theme.text}`}>
                        Exercises
                      </span>
                    </div>
                    <p className={`text-2xl font-bold ${theme.text}`}>
                      {exercises.length}
                    </p>
                  </div>

                  <div
                    className={`p-4 rounded-xl ${theme.card} border ${theme.border}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-orange-500" />
                      <span className={`text-sm font-medium ${theme.text}`}>
                        Usage
                      </span>
                    </div>
                    <p className={`text-2xl font-bold ${theme.text}`}>
                      {(template as any).usage_count || 0}
                    </p>
                  </div>

                  <div
                    className={`p-4 rounded-xl ${theme.card} border ${theme.border}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className={`text-sm font-medium ${theme.text}`}>
                        Rating
                      </span>
                    </div>
                    <p className={`text-2xl font-bold ${theme.text}`}>
                      {(template as any).rating || 0}
                    </p>
                  </div>
                </div>

                {template.description && (
                  <div className="mt-6">
                    <h4 className={`text-lg font-semibold ${theme.text} mb-2`}>
                      Description
                    </h4>
                    <p className={`${theme.textSecondary} leading-relaxed`}>
                      {template.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Exercises */}
            <Card
              className={`${theme.card} border ${theme.border} rounded-2xl`}
            >
              <CardHeader className="p-6">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-xl bg-gradient-to-br from-green-400 via-green-500 to-green-600 shadow-lg`}
                  >
                    <Dumbbell className={`w-5 h-5 text-white`} />
                  </div>
                  <CardTitle className={`text-xl font-bold ${theme.text}`}>
                    Workout Flow ({exercises.length} items)
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`${theme.card} rounded-xl p-4 animate-pulse`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 bg-slate-300 dark:bg-slate-600 rounded-lg"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-slate-300 dark:bg-slate-600 rounded w-1/3 mb-2"></div>
                            <div className="h-3 bg-slate-300 dark:bg-slate-600 rounded w-1/2"></div>
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
                  <div
                    className={`p-6 text-center rounded-xl border-2 border-dashed ${theme.border} ${theme.textSecondary}`}
                  >
                    <Dumbbell className="mx-auto w-12 h-12 mb-3 text-gray-400" />
                    <h4 className="font-semibold text-lg">No Exercises</h4>
                    <p className="text-sm">
                      This workout template doesn't have any exercises yet.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`sticky bottom-0 ${theme.card} border-t ${theme.border} px-3 sm:px-6 py-4 rounded-b-3xl flex items-center justify-end gap-3`}
        >
          <Button
            variant="ghost"
            onClick={onClose}
            className={`${theme.textSecondary} hover:${theme.text}`}
          >
            Close
          </Button>
          {onEdit && (
            <Button
              onClick={() => onEdit(template)}
              className={`${theme.primary} ${theme.shadow} rounded-xl px-6 hover:scale-105 transition-all duration-200`}
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
