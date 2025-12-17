"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";
import WorkoutTemplateService, {
  WorkoutTemplate,
} from "@/lib/workoutTemplateService";
import { useExerciseLibrary } from "@/hooks/useCoachData";
import { useAuth } from "@/contexts/AuthContext";
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
  Settings,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import ExerciseBlockCard from "@/components/features/workouts/ExerciseBlockCard";
import { WorkoutBlockService } from "@/lib/workoutBlockService";
import { WorkoutBlock } from "@/types/workoutBlocks";

export default function WorkoutTemplateDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = useMemo(() => String(params?.id || ""), [params]);
  const { getThemeStyles } = useTheme();
  const theme = getThemeStyles();
  const { user, loading: authLoading } = useAuth();

  // Load exercises for name lookup
  const { exercises: availableExercises } = useExerciseLibrary(user?.id || "");

  const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
  const [workoutBlocks, setWorkoutBlocks] = useState<WorkoutBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    // Wait for auth to finish loading before trying to load template
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
    if (!user?.id) {
      return; // Auth check already handled in useEffect
    }
    try {
      setLoading(true);
      setError(null);

      // Get all templates and find the one we need
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
      // Don't set error here - blocks might not exist yet, which is okay
    }
  };

  const CategoryIcon = template
    ? getCategoryIcon(template.category || "")
    : Dumbbell;

  // Show loading while auth is initializing or data is loading
  if (authLoading || loading) {
    return (
      <div className={`min-h-screen ${theme.background}`}>
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          <div className={`${theme.card} rounded-2xl p-6`}>
            <div className="animate-pulse h-8 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
            <div className="animate-pulse h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className={`min-h-screen ${theme.background}`}>
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          <div className={`${theme.card} ${theme.shadow} rounded-2xl p-6`}>
            <p className={`${theme.text} text-lg font-semibold mb-2`}>
              {error || "Template not found"}
            </p>
            <p className={`${theme.textSecondary} mb-4`}>
              {error
                ? "There was an error loading this template. Please try again."
                : "The template you're looking for doesn't exist or you don't have access to it."}
            </p>
            <Link href="/coach/workouts/templates">
              <Button className="mt-4">Back to Templates</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.background}`}>
      <div className="p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Link href="/coach/workouts/templates">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-4 flex-1">
              <div
                className={`p-3 rounded-2xl bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 shadow-lg`}
              >
                <CategoryIcon className={`w-6 h-6 text-white`} />
              </div>
              <div className="min-w-0 flex-1">
                <h1
                  className={`text-2xl sm:text-3xl font-bold ${theme.text} break-words`}
                >
                  {template.name}
                </h1>
                <p
                  className={`text-sm ${theme.textSecondary} mt-1 break-words`}
                >
                  {template.category || "General"} • {template.difficulty_level}
                </p>
              </div>
            </div>
            <Link href={`/coach/workouts/templates/${template.id}/edit`}>
              <Button>
                <Edit className="w-4 h-4 mr-2" />
                Edit Template
              </Button>
            </Link>
          </div>

          {/* Template Overview */}
          <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
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
                    {workoutBlocks.reduce(
                      (total, block) => total + (block.exercises?.length || 0),
                      0
                    )}
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
                    {template.usage_count || 0}
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
                    {template.rating || 0}
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
          <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
            <CardHeader className="p-6">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-xl bg-gradient-to-br from-green-400 via-green-500 to-green-600 shadow-lg`}
                >
                  <Dumbbell className={`w-5 h-5 text-white`} />
                </div>
                <CardTitle className={`text-xl font-bold ${theme.text}`}>
                  Workout Blocks ({workoutBlocks.length})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              {workoutBlocks.length > 0 ? (
                <div className="space-y-4">
                  {workoutBlocks.map((block, index) => {
                    // Convert block to exercise format for ExerciseBlockCard
                    const blockAsExercise = {
                      id: block.id,
                      exercise_type: block.block_type,
                      block_type: block.block_type,
                      sets: block.total_sets,
                      reps: block.reps_per_set,
                      rest_seconds: block.rest_seconds,
                      duration_seconds: block.duration_seconds,
                      rounds: block.block_parameters?.rounds,
                      work_seconds: block.block_parameters?.work_seconds,
                      rest_after: block.block_parameters?.rest_after,
                      amrap_duration: block.block_parameters?.amrap_duration,
                      emom_duration: block.block_parameters?.emom_duration,
                      emom_reps: block.block_parameters?.emom_reps,
                      exercise_id: block.exercises?.[0]?.exercise_id,
                      exercise: block.exercises?.[0]?.exercise,
                      exercises: block.exercises, // For nested exercises
                      block_parameters: block.block_parameters,
                      notes: block.block_notes,
                      block_name: block.block_name,
                    };
                    return (
                      <ExerciseBlockCard
                        key={block.id}
                        exercise={blockAsExercise}
                        index={index}
                        availableExercises={availableExercises}
                        renderMode="view"
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Dumbbell className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className={`text-slate-500 ${theme.textSecondary}`}>
                    No exercises added to this template
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
