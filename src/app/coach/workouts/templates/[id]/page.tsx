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
  const [exerciseCount, setExerciseCount] = useState<number>(0);
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

  // Reset state when templateId changes or component mounts
  useEffect(() => {
    if (templateId) {
      setLoading(true);
      setTemplate(null);
      setWorkoutBlocks([]);
      setExerciseCount(0);
      setError(null);
    }
  }, [templateId]);

  useEffect(() => {
    if (!authLoading && templateId) {
      if (user?.id) {
        loadTemplate();
        loadWorkoutBlocks();
      } else {
        setError("User not authenticated");
        setLoading(false);
      }
    } else if (!authLoading && !user) {
      setLoading(false);
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
        // Use exercise_count from template (calculated using same logic)
        setExerciseCount(found.exercise_count || 0);
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
      // Also update exercise count using the same counting logic as getWorkoutTemplates
      const count = await WorkoutTemplateService.countExercisesForTemplate(templateId);
      setExerciseCount(count);
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
                    value={exerciseCount}
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
                  // Get first exercise and its special table data
                  const firstExercise = block.exercises?.[0];
                  const firstExerciseId = firstExercise?.exercise_id;
                  const firstExerciseOrder = firstExercise?.exercise_order || 1;
                  
                  // Get time protocol for this block/exercise (for time-based blocks)
                  const timeProtocol = block.time_protocols?.find(
                    (tp: any) => tp.exercise_id === firstExerciseId && tp.exercise_order === firstExerciseOrder
                  ) || block.time_protocols?.[0];
                  
                  // Get special table data from first exercise
                  const dropSet = firstExercise?.drop_sets?.[0];
                  const clusterSet = firstExercise?.cluster_sets?.[0];
                  const restPauseSet = firstExercise?.rest_pause_sets?.[0];
                  
                  // Convert block to exercise format (same as edit page)
                  const exercise: any = {
                    id: block.id || `block-${index}-${Date.now()}`,
                    exercise_type: block.block_type,
                    block_type: block.block_type,
                    exercise_id: firstExerciseId,
                    order_index: index + 1,
                    sets: block.total_sets?.toString() || "",
                    reps: block.reps_per_set || "",
                    rest_seconds: block.rest_seconds?.toString() || "",
                    notes: block.block_notes || "",
                    block_name: block.block_name,
                    // Read from workout_time_protocols (block_parameters removed)
                    rounds: timeProtocol?.rounds
                      ? String(timeProtocol.rounds)
                      : undefined,
                    work_seconds: timeProtocol?.work_seconds
                      ? String(timeProtocol.work_seconds)
                      : undefined,
                    rest_after: timeProtocol?.rest_seconds
                      ? String(timeProtocol.rest_seconds)
                      : undefined,
                    amrap_duration: timeProtocol?.total_duration_minutes
                      ? String(timeProtocol.total_duration_minutes)
                      : undefined,
                    emom_duration: timeProtocol?.total_duration_minutes
                      ? String(timeProtocol.total_duration_minutes)
                      : undefined,
                    emom_reps: timeProtocol?.reps_per_round
                      ? String(timeProtocol.reps_per_round)
                      : undefined,
                    emom_mode: timeProtocol?.emom_mode,
                    // Read from special tables (block_parameters removed)
                    drop_percentage: dropSet ? (() => {
                      const initialWeight = firstExercise?.weight_kg || 0;
                      const dropWeight = dropSet.weight_kg || 0;
                      if (initialWeight > 0 && dropWeight > 0) {
                        return String(Math.round(((initialWeight - dropWeight) / initialWeight) * 100));
                      }
                      return undefined;
                    })() : undefined,
                    drop_set_reps: dropSet?.reps,
                    cluster_reps: clusterSet?.reps_per_cluster,
                    clusters_per_set: clusterSet?.clusters_per_set
                      ? String(clusterSet.clusters_per_set)
                      : undefined,
                    intra_cluster_rest: clusterSet?.intra_cluster_rest
                      ? String(clusterSet.intra_cluster_rest)
                      : undefined,
                    rest_pause_duration: restPauseSet?.rest_pause_duration
                      ? String(restPauseSet.rest_pause_duration)
                      : undefined,
                    max_rest_pauses: restPauseSet?.max_rest_pauses
                      ? String(restPauseSet.max_rest_pauses)
                      : undefined,
                    target_reps: timeProtocol?.target_reps
                      ? String(timeProtocol.target_reps)
                      : undefined,
                    time_cap: timeProtocol?.time_cap_minutes
                      ? String(timeProtocol.time_cap_minutes)
                      : undefined,
                    // Load percentage from first exercise
                    load_percentage: firstExercise?.load_percentage?.toString() || "",
                  };

                  // Handle complex block types with nested exercises
                  const blockType = block.block_type as string;
                  if (blockType === "circuit" || blockType === "tabata") {
                    // Get time protocols for each exercise (for individual work_seconds, rest_after)
                    const exerciseProtocols =
                      block.time_protocols?.filter(
                        (tp: any) => tp.protocol_type === blockType
                      ) || [];

                    const exercisesArray =
                      block.exercises?.map((ex, idx) => {
                        // Find protocol for this specific exercise
                        const exProtocol = exerciseProtocols.find(
                          (tp: any) =>
                            tp.exercise_id === ex.exercise_id &&
                            tp.exercise_order === (idx + 1)
                        );
                        
                        return {
                          exercise_id: ex.exercise_id,
                          sets:
                            ex.sets?.toString() ||
                            block.total_sets?.toString() ||
                            "",
                          reps: ex.reps || block.reps_per_set || "",
                          // Use individual exercise rest_seconds, not block rest
                          rest_seconds: ex.rest_seconds?.toString() || "",
                          // Get work_seconds from time protocol for this exercise
                          work_seconds: exProtocol?.work_seconds?.toString() || "",
                          // Get rest_after from time protocol for this exercise
                          rest_after: exProtocol?.rest_seconds?.toString() || "",
                          // Load individual load_percentage for each exercise
                          load_percentage: ex.load_percentage?.toString() || "",
                          exercise: ex.exercise,
                        };
                      }) || [];

                    if (blockType === "tabata") {
                      // Read from workout_time_protocols (one per exercise)
                      const tabataProtocol = block.time_protocols?.find(
                        (tp: any) => tp.protocol_type === 'tabata'
                      ) || timeProtocol;
                      
                      const restAfter = tabataProtocol?.rest_seconds?.toString() ||
                        block.rest_seconds?.toString() ||
                        "10";
                      exercise.rest_after = String(restAfter);
                      
                      // Load rest_after_set from time_protocols (block-level field)
                      const restAfterSet =
                        tabataProtocol?.rest_after_set?.toString() || "10";
                      (exercise as any).rest_after_set = String(restAfterSet);
                      
                      exercise.rounds = tabataProtocol?.rounds?.toString() ||
                        block.total_sets?.toString() ||
                        "8";
                      exercise.work_seconds = tabataProtocol?.work_seconds?.toString() || "20";

                      // Build tabata_sets from exercises and their time protocols
                      // Group exercises by set number from time_protocols
                      const setsMap = new Map<number, any[]>();
                      exercisesArray.forEach((ex: any, exIdx: number) => {
                        const exProtocol = exerciseProtocols.find(
                          (tp: any) =>
                            tp.exercise_id === ex.exercise_id &&
                            tp.exercise_order === exIdx + 1
                        );
                        const setNumber = exProtocol?.set || 1; // Default to set 1 if not found
                        if (!setsMap.has(setNumber)) {
                          setsMap.set(setNumber, []);
                        }
                        setsMap.get(setNumber)!.push({
                          ...ex,
                          work_seconds:
                            exProtocol?.work_seconds?.toString() ||
                            exercise.work_seconds,
                          rest_after: exProtocol?.rest_seconds?.toString() || restAfter,
                        });
                      });

                      // Convert map to array of sets
                      exercise.tabata_sets = Array.from(setsMap.entries())
                        .sort(([a], [b]) => a - b)
                        .map(([setNum, exercises]) => ({
                          exercises,
                          rest_between_sets: String(restAfter),
                        }));
                      exercise.circuit_sets = exercise.tabata_sets;
                    } else {
                      // circuit_sets should come from relational tables, not block_parameters
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
                  } else if (block.block_type === "giant_set") {
                    exercise.giant_set_exercises =
                      block.exercises?.map((ex) => ({
                        exercise_id: ex.exercise_id,
                        sets:
                          ex.sets?.toString() ||
                          block.total_sets?.toString() ||
                          "",
                        reps: ex.reps || block.reps_per_set || "",
                        // Load individual load_percentage for each exercise
                        load_percentage: ex.load_percentage?.toString() || "",
                        exercise: ex.exercise,
                      })) || [];
                  } else if (block.block_type === "superset") {
                    if (block.exercises && block.exercises.length >= 2) {
                      exercise.superset_exercise_id =
                        block.exercises[1].exercise_id;
                      exercise.superset_reps =
                        block.exercises[1].reps || block.reps_per_set || "";
                      // Load percentage for first exercise (already loaded at line 487)
                      // Load percentage for second exercise (individual for each exercise in superset)
                      (exercise as any).superset_load_percentage =
                        block.exercises[1].load_percentage?.toString() || "";
                    }
                  } else if (block.block_type === "pre_exhaustion") {
                    if (block.exercises && block.exercises.length >= 2) {
                      exercise.compound_exercise_id =
                        block.exercises[1].exercise_id;
                      exercise.isolation_reps = block.exercises[0].reps || "";
                      exercise.compound_reps = block.exercises[1].reps || "";
                      // Load percentage for isolation exercise (first exercise)
                      exercise.load_percentage =
                        block.exercises[0].load_percentage?.toString() || "";
                      // Load percentage for compound exercise (second exercise)
                      (exercise as any).compound_load_percentage =
                        block.exercises[1].load_percentage?.toString() || "";
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
                      renderMode="view"
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
