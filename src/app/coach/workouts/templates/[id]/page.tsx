"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/toast-provider";

export default function WorkoutTemplateDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const templateId = useMemo(() => String(params?.id || ""), [params]);
  const { getSemanticColor, performanceSettings } = useTheme();
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

  const templateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!authLoading && templateId && user?.id) {
      if (templateTimeoutRef.current) clearTimeout(templateTimeoutRef.current);
      templateTimeoutRef.current = setTimeout(() => {
        templateTimeoutRef.current = null;
        setLoading(false);
      }, 20_000);
      Promise.all([loadTemplate(), loadWorkoutBlocks()]).finally(() => {
        if (templateTimeoutRef.current) {
          clearTimeout(templateTimeoutRef.current);
          templateTimeoutRef.current = null;
        }
      });
      return () => {
        if (templateTimeoutRef.current) {
          clearTimeout(templateTimeoutRef.current);
          templateTimeoutRef.current = null;
        }
      };
    }
    if (!authLoading && templateId && !user?.id) {
      setError("User not authenticated");
      setLoading(false);
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [templateId, authLoading, user]);

  const loadTemplate = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      setError(null);

      // Use efficient single-template fetch; skip exercise count (we derive it from blocks below)
      const found = await WorkoutTemplateService.getWorkoutTemplateById(templateId, { skipExerciseCount: true });
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
      setExerciseCount(WorkoutBlockService.countExercisesFromBlocks(blocks || []));
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
      addToast({ title: "Couldn't duplicate template", variant: "destructive" });
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
      addToast({ title: "Couldn't delete template", variant: "destructive" });
    }
  };

  if (authLoading || loading) {
    return (
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="animate-pulse space-y-6">
              <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6">
                <div className="h-8 rounded mb-4 bg-[color:var(--fc-glass-highlight)]"></div>
                <div className="h-4 rounded w-2/3 bg-[color:var(--fc-glass-highlight)]"></div>
              </div>
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
          <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-8 max-w-md text-center">
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
            <h2 className="text-2xl font-bold mb-2 text-[color:var(--fc-text-primary)]">
              {error || "Template not found"}
            </h2>
            <p className="text-sm mb-6 text-[color:var(--fc-text-dim)]">
              {error
                ? "There was an error loading this template. Please try again."
                : "The template you're looking for doesn't exist or you don't have access to it."}
            </p>
            <Link href="/coach/workouts/templates">
              <Button className="fc-btn fc-btn-primary">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Templates
              </Button>
            </Link>
          </div>
        </div>
      </AnimatedBackground>
    );
  }

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <div className="relative z-10 p-4 sm:p-6 pt-10">
        <div className="max-w-5xl mx-auto space-y-8">
          <nav className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/coach/programs" className="fc-surface inline-flex items-center gap-2 rounded-xl border border-[color:var(--fc-surface-card-border)] px-3 py-2.5 w-fit text-[color:var(--fc-text-primary)] text-sm font-medium">
                <ArrowLeft className="w-4 h-4 shrink-0" />
                Back to Programs
              </Link>
              <Link
                href="/coach/workouts/templates"
                className="flex items-center gap-2 fc-text-dim hover:fc-text-primary transition-colors group"
              >
                <span className="p-2 rounded-xl fc-glass border border-[color:var(--fc-glass-border)] group-hover:bg-white/10 transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </span>
                <span className="font-medium">Back to Templates</span>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="fc-ghost" onClick={handleDuplicate}>
                <CopyIcon className="w-4 h-4 mr-2" />
                <span>Duplicate</span>
              </Button>
              <Button
                variant="outline"
                className="fc-btn border-red-500/30 text-red-500 hover:bg-red-500/10"
                onClick={handleDelete}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                <span>Delete</span>
              </Button>
              <Link href={`/coach/workouts/templates/${template.id}/edit`}>
                <Button className="fc-btn fc-btn-primary">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Template
                </Button>
              </Link>
            </div>
          </nav>

          <header className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <span
                className="text-xs sm:text-sm px-3 py-1 rounded-full font-semibold uppercase tracking-wider border"
                style={{
                  background: `${getSemanticColor("trust").primary}20`,
                  color: getSemanticColor("trust").primary,
                  borderColor: `${getSemanticColor("trust").primary}40`,
                }}
              >
                {template.category || "General"}
              </span>
              <span
                className="text-xs sm:text-sm px-3 py-1 rounded-full font-semibold capitalize border"
                style={{
                  background: `${getDifficultyColor(template.difficulty_level)}20`,
                  color: getDifficultyColor(template.difficulty_level),
                  borderColor: `${getDifficultyColor(template.difficulty_level)}40`,
                }}
              >
                {template.difficulty_level}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight fc-text-primary">
              {template.name}
            </h1>
            {template.description && (
              <p className="text-lg fc-text-dim max-w-2xl leading-relaxed">
                {template.description}
              </p>
            )}
          </header>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Duration */}
            <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    background: "var(--fc-surface-sunken)",
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
                      color="var(--fc-text-primary)"
                    />
                    <span className="text-sm text-[color:var(--fc-text-dim)]">
                      min
                    </span>
                  </div>
                  <p className="text-xs text-[color:var(--fc-text-dim)]">
                    Duration
                  </p>
                </div>
              </div>
            </div>

            {/* Exercises */}
            <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    background: "var(--fc-surface-sunken)",
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
                    color="var(--fc-text-primary)"
                  />
                  <p className="text-xs text-[color:var(--fc-text-dim)]">
                    Exercises
                  </p>
                </div>
              </div>
            </div>

            {/* Usage Count */}
            <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    background: "var(--fc-surface-sunken)",
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
                    color="var(--fc-text-primary)"
                  />
                  <p className="text-xs text-[color:var(--fc-text-dim)]">
                    Assignments
                  </p>
                </div>
              </div>
            </div>

            {/* Rating */}
            <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    background: "var(--fc-surface-sunken)",
                  }}
                >
                  <Star
                    className="w-6 h-6"
                    style={{ color: getSemanticColor("warning").primary }}
                  />
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    {template.rating ? (
                      <AnimatedNumber
                        value={template.rating}
                        decimals={1}
                        className="text-2xl font-bold"
                        color="var(--fc-text-primary)"
                      />
                    ) : (
                      <span className="text-2xl font-bold" style={{ color: "var(--fc-text-primary)" }}>--</span>
                    )}
                    <span className="text-sm text-[color:var(--fc-text-dim)]">
                      / 5
                    </span>
                  </div>
                  <p className="text-xs text-[color:var(--fc-text-dim)]">
                    Rating
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Workout Flow */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold tracking-tight fc-text-primary flex items-center gap-3">
                <Activity className="w-6 h-6 fc-text-dim" />
                Workout Flow
              </h2>
              <span className="text-sm fc-text-dim font-mono">
                {exerciseCount} {exerciseCount !== 1 ? "exercises" : "exercise"}
              </span>
            </div>

            {workoutBlocks.length > 0 ? (
              <div className="space-y-3">
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
                    exercise_type: block.set_type,
                    set_type: block.set_type,
                    exercise_id: firstExerciseId,
                    order_index: index + 1,
                    sets: block.total_sets?.toString() || "",
                    reps: block.reps_per_set || "",
                    rest_seconds: block.rest_seconds?.toString() || "",
                    notes: block.set_notes || "",
                    set_name: block.set_name,
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
                  const blockType = block.set_type as string;
                  if (blockType === "tabata") {
                    // Get time protocols for each exercise (for individual work_seconds, rest_after)
                    const exerciseProtocols =
                      block.time_protocols?.filter(
                        (tp: any) => tp.protocol_type === "tabata"
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
                  } else if (block.set_type === "giant_set") {
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
                  } else if (block.set_type === "superset") {
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
                  } else if (block.set_type === "pre_exhaustion") {
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

                  const blockBorderColor =
                    blockType === "straight_set"
                      ? "var(--fc-accent-indigo, #6366f1)"
                      : blockType === "superset"
                        ? "var(--fc-accent-amber, #f59e0b)"
                        : blockType === "amrap" || blockType === "emom" || blockType === "for_time" || blockType === "tabata"
                          ? "var(--fc-accent-success, #10b981)"
                          : "var(--fc-glass-border)";
                  return (
                    <div key={uniqueKey} className="rounded-2xl border-l-4" style={{ borderLeftColor: blockBorderColor }}>
                      <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-5">
                        <ExerciseBlockCard
                          exercise={exercise}
                          index={index}
                          availableExercises={availableExercises}
                          renderMode="view"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={Dumbbell}
                title="No exercises yet"
                description="Add exercises to this template to get started."
                actionLabel="Add exercises"
                actionHref={`/coach/workouts/templates/${template.id}/edit`}
              />
            )}
          </section>
        </div>
      </div>
    </AnimatedBackground>
  );
}
