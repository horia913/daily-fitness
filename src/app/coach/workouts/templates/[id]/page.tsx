"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";
import WorkoutTemplateService, {
  WorkoutTemplate,
} from "@/lib/workoutTemplateService";
import { useExerciseLibrary } from "@/hooks/useCoachData";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Button } from "@/components/ui/button";
import {
  Dumbbell,
  Clock,
  Users,
  Star,
  Edit,
  ArrowLeft,
  Heart,
  Zap,
  Activity,
  BarChart3,
  Calendar,
  Copy as CopyIcon,
  Trash2,
  Share2,
} from "lucide-react";
import Link from "next/link";
import ExerciseBlockCard from "@/components/features/workouts/ExerciseBlockCard";
import { WorkoutBlockService } from "@/lib/workoutBlockService";
import { WorkoutBlock } from "@/types/workoutBlocks";

export default function WorkoutTemplateDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = useMemo(() => String(params?.id || ""), [params]);
  const { isDark, getSemanticColor, performanceSettings } = useTheme();
  const { user, loading: authLoading } = useAuth();

  // Load exercises for name lookup
  const { exercises: availableExercises } = useExerciseLibrary(user?.id || "");

  const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
  const [workoutBlocks, setWorkoutBlocks] = useState<WorkoutBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return getSemanticColor("success").primary;
      case "intermediate":
        return getSemanticColor("warning").primary;
      case "advanced":
        return getSemanticColor("critical").primary;
      default:
        return getSemanticColor("neutral").primary;
    }
  };

  useEffect(() => {
    if (!authLoading && templateId) {
      if (user?.id) {
        loadTemplate();
        loadWorkoutBlocks();
      } else {
        setError("User not authenticated");
        setLoading(false);
      }
    }
  }, [templateId, authLoading, user]);

  const loadTemplate = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      setError(null);

      const templates = await WorkoutTemplateService.getWorkoutTemplates(
        user.id
      );
      const found = templates.find((t) => t.id === templateId);
      if (found) {
        setTemplate(found);
      } else {
        setError("Template not found");
      }
    } catch (error: any) {
      console.error("Error loading template:", error);
      setError(error?.message || "Failed to load template");
    } finally {
      setLoading(false);
    }
  };

  const loadWorkoutBlocks = async () => {
    try {
      const blocks = await WorkoutBlockService.getWorkoutBlocks(templateId);
      setWorkoutBlocks(blocks || []);
    } catch (error: any) {
      console.error("Error loading workout blocks:", error);
      setWorkoutBlocks([]);
    }
  };

  const CategoryIcon = template
    ? getCategoryIcon(template.category || "")
    : Dumbbell;

  const handleDuplicate = async () => {
    if (!template) return;
    try {
      const dup = await WorkoutTemplateService.duplicateWorkoutTemplate(
        template.id,
        `${template.name} (Copy)`
      );
      if (dup) {
        router.push(`/coach/workouts/templates/${dup.id}`);
      }
    } catch (error) {
      console.error("Error duplicating template:", error);
      alert("Failed to duplicate template");
    }
  };

  const handleDelete = async () => {
    if (!template) return;
    if (
      !confirm(
        `Are you sure you want to delete "${template.name}"? This action cannot be undone.`
      )
    )
      return;

    try {
      await WorkoutTemplateService.deleteWorkoutTemplate(template.id);
      router.push("/coach/workouts/templates");
    } catch (error) {
      console.error("Error deleting template:", error);
      alert("Failed to delete template");
    }
  };

  if (authLoading || loading) {
    return (
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="animate-pulse space-y-6">
              <GlassCard elevation={1} className="p-6">
                <div
                  className="h-8 rounded mb-4"
                  style={{
                    background: isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.1)",
                  }}
                ></div>
                <div
                  className="h-4 rounded w-2/3"
                  style={{
                    background: isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.1)",
                  }}
                ></div>
              </GlassCard>
            </div>
          </div>
        </div>
      </AnimatedBackground>
    );
  }

  if (error || !template) {
    return (
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 flex items-center justify-center p-4">
          <GlassCard elevation={2} className="p-8 max-w-md text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{
                background: `${getSemanticColor("critical").primary}20`,
              }}
            >
              <Dumbbell
                className="w-8 h-8"
                style={{ color: getSemanticColor("critical").primary }}
              />
            </div>
            <h2
              className="text-2xl font-bold mb-2"
              style={{ color: isDark ? "#fff" : "#1A1A1A" }}
            >
              {error || "Template not found"}
            </h2>
            <p
              className="text-sm mb-6"
              style={{
                color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
              }}
            >
              {error
                ? "There was an error loading this template. Please try again."
                : "The template you're looking for doesn't exist or you don't have access to it."}
            </p>
            <Link href="/coach/workouts/templates">
              <Button
                style={{
                  background: getSemanticColor("trust").gradient,
                  boxShadow: `0 4px 12px ${
                    getSemanticColor("trust").primary
                  }30`,
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Templates
              </Button>
            </Link>
          </GlassCard>
        </div>
      </AnimatedBackground>
    );
  }

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <div className="relative z-10 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <GlassCard elevation={2} className="p-4 sm:p-6">
            <div className="flex flex-col gap-4">
              {/* Top Row: Back Button and Title */}
              <div className="flex items-center gap-4">
                <Link href="/coach/workouts/templates">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </Link>

                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: getSemanticColor("trust").gradient,
                      boxShadow: `0 4px 12px ${
                        getSemanticColor("trust").primary
                      }30`,
                    }}
                  >
                    <CategoryIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h1
                      className="text-xl sm:text-2xl lg:text-3xl font-bold truncate"
                      style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                    >
                      {template.name}
                    </h1>
                  </div>
                </div>
              </div>

              {/* Badges Row */}
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-xs sm:text-sm px-3 py-1 rounded-full font-semibold"
                  style={{
                    background: `${getSemanticColor("trust").primary}20`,
                    color: getSemanticColor("trust").primary,
                  }}
                >
                  {template.category || "General"}
                </span>
                <span
                  className="text-xs sm:text-sm px-3 py-1 rounded-full font-semibold capitalize"
                  style={{
                    background: `${getDifficultyColor(
                      template.difficulty_level
                    )}20`,
                    color: getDifficultyColor(template.difficulty_level),
                  }}
                >
                  {template.difficulty_level}
                </span>
              </div>

              {/* Bottom Row: Action Buttons */}
              <div className="flex items-center justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={handleDuplicate}>
                  <CopyIcon className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  style={{ color: getSemanticColor("critical").primary }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Link href={`/coach/workouts/templates/${template.id}/edit`}>
                  <Button
                    size="sm"
                    style={{
                      background: getSemanticColor("energy").gradient,
                      boxShadow: `0 4px 12px ${
                        getSemanticColor("energy").primary
                      }30`,
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </Link>
              </div>
            </div>
          </GlassCard>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Duration */}
            <GlassCard elevation={2} className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    background: isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.05)",
                  }}
                >
                  <Clock
                    className="w-6 h-6"
                    style={{ color: getSemanticColor("trust").primary }}
                  />
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <AnimatedNumber
                      value={template.estimated_duration}
                      className="text-2xl font-bold"
                      color={isDark ? "#fff" : "#1A1A1A"}
                    />
                    <span
                      className="text-sm"
                      style={{
                        color: isDark
                          ? "rgba(255,255,255,0.6)"
                          : "rgba(0,0,0,0.6)",
                      }}
                    >
                      min
                    </span>
                  </div>
                  <p
                    className="text-xs"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.6)"
                        : "rgba(0,0,0,0.6)",
                    }}
                  >
                    Duration
                  </p>
                </div>
              </div>
            </GlassCard>

            {/* Exercises */}
            <GlassCard elevation={2} className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    background: isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.05)",
                  }}
                >
                  <Dumbbell
                    className="w-6 h-6"
                    style={{ color: getSemanticColor("energy").primary }}
                  />
                </div>
                <div>
                  <AnimatedNumber
                    value={workoutBlocks.reduce(
                      (total, block) => total + (block.exercises?.length || 0),
                      0
                    )}
                    className="text-2xl font-bold"
                    color={isDark ? "#fff" : "#1A1A1A"}
                  />
                  <p
                    className="text-xs"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.6)"
                        : "rgba(0,0,0,0.6)",
                    }}
                  >
                    Exercises
                  </p>
                </div>
              </div>
            </GlassCard>

            {/* Usage Count */}
            <GlassCard elevation={2} className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    background: isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.05)",
                  }}
                >
                  <Users
                    className="w-6 h-6"
                    style={{ color: getSemanticColor("success").primary }}
                  />
                </div>
                <div>
                  <AnimatedNumber
                    value={template.usage_count || 0}
                    className="text-2xl font-bold"
                    color={isDark ? "#fff" : "#1A1A1A"}
                  />
                  <p
                    className="text-xs"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.6)"
                        : "rgba(0,0,0,0.6)",
                    }}
                  >
                    Assignments
                  </p>
                </div>
              </div>
            </GlassCard>

            {/* Rating */}
            <GlassCard elevation={2} className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    background: isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.05)",
                  }}
                >
                  <Star
                    className="w-6 h-6"
                    style={{ color: getSemanticColor("warning").primary }}
                  />
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <AnimatedNumber
                      value={template.rating || 0}
                      decimals={1}
                      className="text-2xl font-bold"
                      color={isDark ? "#fff" : "#1A1A1A"}
                    />
                    <span
                      className="text-sm"
                      style={{
                        color: isDark
                          ? "rgba(255,255,255,0.6)"
                          : "rgba(0,0,0,0.6)",
                      }}
                    >
                      / 5
                    </span>
                  </div>
                  <p
                    className="text-xs"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.6)"
                        : "rgba(0,0,0,0.6)",
                    }}
                  >
                    Rating
                  </p>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Description */}
          {template.description && (
            <GlassCard elevation={2} className="p-6">
              <h3
                className="text-lg font-bold mb-3"
                style={{ color: isDark ? "#fff" : "#1A1A1A" }}
              >
                Description
              </h3>
              <p
                className="leading-relaxed"
                style={{
                  color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
                }}
              >
                {template.description}
              </p>
            </GlassCard>
          )}

          {/* Workout Flow */}
          <GlassCard elevation={2} className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    background: getSemanticColor("success").gradient,
                    boxShadow: `0 4px 12px ${
                      getSemanticColor("success").primary
                    }30`,
                  }}
                >
                  <Dumbbell className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3
                    className="text-xl font-bold"
                    style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                  >
                    Workout Flow ({workoutBlocks.length} items)
                  </h3>
                </div>
              </div>
            </div>

            {workoutBlocks.length > 0 ? (
              <div className="space-y-3 max-h-[600px] sm:max-h-[700px] overflow-y-auto">
                {workoutBlocks.map((block, index) => {
                  // Convert block to exercise format (same as edit page)
                  const exercise: any = {
                    id: block.id || `block-${index}-${Date.now()}`,
                    exercise_type: block.block_type,
                    block_type: block.block_type,
                    exercise_id: block.exercises?.[0]?.exercise_id,
                    order_index: index + 1,
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
                        sets:
                          ex.sets?.toString() ||
                          block.total_sets?.toString() ||
                          "",
                        reps: ex.reps || block.reps_per_set || "",
                        rest_seconds:
                          ex.rest_seconds?.toString() ||
                          block.rest_seconds?.toString() ||
                          "",
                        work_seconds: ex.work_seconds?.toString(),
                        rest_after: ex.rest_after?.toString(),
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
                      exercise.work_seconds = block.block_parameters
                        ?.work_seconds
                        ? String(block.block_parameters.work_seconds)
                        : "20";

                      if (
                        block.block_parameters?.tabata_sets &&
                        Array.isArray(block.block_parameters.tabata_sets)
                      ) {
                        exercise.tabata_sets =
                          block.block_parameters.tabata_sets.map(
                            (set: any) => ({
                              exercises: Array.isArray(set.exercises)
                                ? set.exercises.map((ex: any) => ({
                                    ...ex,
                                    exercise:
                                      ex.exercise ||
                                      availableExercises.find(
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
                        exercise.circuit_sets =
                          block.block_parameters.circuit_sets.map(
                            (set: any) => ({
                              exercises: Array.isArray(set.exercises)
                                ? set.exercises.map((ex: any) => ({
                                    ...ex,
                                    exercise:
                                      ex.exercise ||
                                      availableExercises.find(
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
                            rest_between_sets:
                              block.rest_seconds?.toString() || "60",
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
                        sets:
                          ex.sets?.toString() ||
                          block.total_sets?.toString() ||
                          "",
                        reps: ex.reps || block.reps_per_set || "",
                        exercise: ex.exercise,
                      })) || [];
                  } else if (block.block_type === "superset") {
                    if (block.exercises && block.exercises.length >= 2) {
                      exercise.superset_exercise_id =
                        block.exercises[1].exercise_id;
                      exercise.superset_reps =
                        block.exercises[1].reps || block.reps_per_set || "";
                    }
                  } else if (block.block_type === "pre_exhaustion") {
                    if (block.exercises && block.exercises.length >= 2) {
                      exercise.compound_exercise_id =
                        block.exercises[1].exercise_id;
                      exercise.isolation_reps = block.exercises[0].reps || "";
                      exercise.compound_reps = block.exercises[1].reps || "";
                    }
                  }

                  // Add exercise object from block
                  if (block.exercises && block.exercises.length > 0) {
                    exercise.exercise = block.exercises[0].exercise;
                  }

                  // Create unique key
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
                      availableExercises={availableExercises}
                      renderMode="details"
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Dumbbell
                  className="w-24 h-24 mx-auto mb-4"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
                  }}
                />
                <h4
                  className="text-xl font-bold mb-2"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  No exercises yet
                </h4>
                <p
                  className="text-sm mb-6"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                  }}
                >
                  Add exercises to this template to get started
                </p>
                <Link href={`/coach/workouts/templates/${template.id}/edit`}>
                  <Button
                    style={{
                      background: getSemanticColor("trust").gradient,
                      boxShadow: `0 4px 12px ${
                        getSemanticColor("trust").primary
                      }30`,
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Add Exercises
                  </Button>
                </Link>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </AnimatedBackground>
  );
}
