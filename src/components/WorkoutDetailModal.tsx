"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Clock,
  Dumbbell,
  Target,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  Users,
  Copy,
  AlertCircle,
  Info,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  preventBackgroundScroll,
  restoreBackgroundScroll,
} from "@/lib/mobile-compatibility";
import { useTheme } from "@/contexts/ThemeContext";

interface WorkoutTemplate {
  id: string;
  name: string;
  description: string;
  category_id: string;
  estimated_duration: number;
  difficulty_level: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  coach_id?: string;
  category?: {
    name: string;
    color: string;
  };
}

interface Exercise {
  id: string;
  name: string;
  description?: string;
}

interface WorkoutExercise {
  id: string;
  template_id: string;
  exercise_id: string;
  order_index: number;
  sets: number;
  reps: string;
  rest_seconds: number;
  notes?: string;
  exercise?: Exercise;
  // New schema fields
  exercise_type?: string;
  details?: any;
  // Complex exercise type fields
  rounds?: number;
  work_seconds?: number;
  rest_after?: number;
  tabata_sets?: any[];
  circuit_sets?: any[];
  amrap_duration?: number;
  emom_duration?: number;
  emom_reps?: number;
  emom_mode?: string;
  superset_exercise_id?: string;
  superset_reps?: string;
  compound_exercise_id?: string;
  isolation_reps?: string;
  compound_reps?: string;
  initial_weight?: number;
  drop_percentage?: number;
  drop_set_reps?: string;
  cluster_reps?: number;
  clusters_per_set?: number;
  intra_cluster_rest?: number;
  rest_pause_duration?: number;
  max_rest_pauses?: number;
  pyramid_type?: string;
  weight_increment?: number;
  ladder_type?: string;
  start_reps?: number;
  peak_reps?: number;
  target_reps?: number;
  time_cap?: number;
  giant_set_exercises?: any[];
}

interface WorkoutDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: WorkoutTemplate | null;
  onWorkoutUpdated?: () => void;
}

const difficultyColors = {
  Beginner: "bg-green-100 text-green-800",
  Intermediate: "bg-yellow-100 text-yellow-800",
  Advanced: "bg-red-100 text-red-800",
};

// Helper functions moved outside component
const formatRestTime = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0
    ? `${minutes}m ${remainingSeconds}s`
    : `${minutes}m`;
};

const loadWorkoutDetails = async (
  template: WorkoutTemplate | null,
  setLoading: (loading: boolean) => void,
  setWorkoutExercises: (exercises: WorkoutExercise[]) => void,
  setAvailableExercises: (exercises: Exercise[]) => void
) => {
  if (!template) return;

  setLoading(true);
  try {
    const { WorkoutBlockService } = await import("@/lib/workoutBlockService");
    const blocks = await WorkoutBlockService.getWorkoutBlocks(template.id);

    const exercisesData: any[] = [];
    blocks.forEach((block) => {
      if (block.exercises && block.exercises.length > 0) {
        block.exercises.forEach((exercise) => {
          exercisesData.push({
            id: exercise.id,
            template_id: template.id,
            exercise_id: exercise.exercise_id,
            exercise: exercise.exercise,
            order_index: block.block_order,
            notes: exercise.notes || block.block_notes,
            exercise_type: block.block_type,
            sets: exercise.sets || block.total_sets,
            reps: exercise.reps || block.reps_per_set,
            rest_seconds: exercise.rest_seconds || block.rest_seconds,
          });
        });
      }
    });

    const parsedExercises = (exercisesData || []).map((exercise) => {
      let parsedExercise = { ...exercise };

      if (exercise.exercise_type && exercise.details) {
        parsedExercise = {
          ...exercise,
          ...exercise.details,
          exercise_type: exercise.exercise_type,
        };
      } else if (exercise.notes) {
        try {
          const complexData = JSON.parse(exercise.notes);
          parsedExercise = {
            ...exercise,
            ...complexData,
            notes:
              typeof complexData === "object"
                ? complexData.notes || ""
                : exercise.notes,
          };
        } catch (e) {
          // Keep original notes
        }
      }

      return parsedExercise;
    });

    setWorkoutExercises(parsedExercises);

    const { data: availableData, error: availableError } = await supabase
      .from("exercises")
      .select("*")
      .order("name", { ascending: true });

    if (availableError) throw availableError;

    const uniqueExercises = (availableData || []).reduce(
      (acc: Exercise[], current: Exercise) => {
        const existing = acc.find((ex) => ex.name === current.name);
        if (!existing) {
          acc.push({
            id: current.id,
            name: current.name,
            description: current.description,
          });
        }
        return acc;
      },
      []
    );

    setAvailableExercises(uniqueExercises);
  } catch (error) {
    console.error("Error loading workout details:", error);
    setWorkoutExercises([]);
    const fallbackExercises = [
      {
        id: "1",
        name: "Push-ups",
        description: "Classic bodyweight exercise for chest and arms",
      },
      {
        id: "2",
        name: "Squats",
        description: "Fundamental lower body exercise",
      },
      { id: "3", name: "Plank", description: "Core strengthening exercise" },
    ];
    setAvailableExercises(fallbackExercises);
  } finally {
    setLoading(false);
  }
};

const addExercise = async (
  template: WorkoutTemplate | null,
  newExercise: {
    exercise_id: string;
    sets: number;
    reps: string;
    rest_seconds: number;
    notes: string;
  },
  availableExercises: Exercise[],
  workoutExercises: WorkoutExercise[],
  setWorkoutExercises: (
    exercises:
      | WorkoutExercise[]
      | ((prev: WorkoutExercise[]) => WorkoutExercise[])
  ) => void,
  setNewExercise: (exercise: {
    exercise_id: string;
    sets: number;
    reps: string;
    rest_seconds: number;
    notes: string;
  }) => void,
  setShowAddExercise: (show: boolean) => void
) => {
  if (!template || !newExercise.exercise_id) return;

  try {
    const selectedExercise = availableExercises.find(
      (ex) => ex.id === newExercise.exercise_id
    );
    if (!selectedExercise) return;

    const newWorkoutExercise: WorkoutExercise = {
      id: `temp-${Date.now()}`,
      template_id: template.id,
      exercise_id: newExercise.exercise_id,
      order_index: workoutExercises.length + 1,
      sets: newExercise.sets,
      reps: newExercise.reps,
      rest_seconds: newExercise.rest_seconds,
      notes: newExercise.notes,
      exercise: selectedExercise,
    };

    setWorkoutExercises([...workoutExercises, newWorkoutExercise]);
    setNewExercise({
      exercise_id: "",
      sets: 3,
      reps: "10-12",
      rest_seconds: 60,
      notes: "",
    });
    setShowAddExercise(false);
  } catch (error) {
    console.error("Error adding exercise:", error);
  }
};

const removeExercise = (
  exerciseId: string,
  workoutExercises: WorkoutExercise[],
  setWorkoutExercises: (exercises: WorkoutExercise[]) => void
) => {
  if (!confirm("Are you sure you want to remove this exercise?")) return;
  setWorkoutExercises(workoutExercises.filter((ex) => ex.id !== exerciseId));
};

const editExercise = (
  exercise: WorkoutExercise,
  setEditingExercise: (exercise: WorkoutExercise | null) => void,
  setNewExercise: (exercise: {
    exercise_id: string;
    sets: number;
    reps: string;
    rest_seconds: number;
    notes: string;
  }) => void,
  setShowAddExercise: (show: boolean) => void
) => {
  setEditingExercise(exercise);
  setNewExercise({
    exercise_id: exercise.exercise_id,
    sets: exercise.sets,
    reps: exercise.reps,
    rest_seconds: exercise.rest_seconds,
    notes: exercise.notes || "",
  });
  setShowAddExercise(true);
};

const updateExercise = async (
  editingExercise: WorkoutExercise | null,
  newExercise: {
    exercise_id: string;
    sets: number;
    reps: string;
    rest_seconds: number;
    notes: string;
  },
  availableExercises: Exercise[],
  workoutExercises: WorkoutExercise[],
  setWorkoutExercises: (
    exercises:
      | WorkoutExercise[]
      | ((prev: WorkoutExercise[]) => WorkoutExercise[])
  ) => void,
  setShowAddExercise: (show: boolean) => void,
  setEditingExercise: (exercise: WorkoutExercise | null) => void,
  setNewExercise: (exercise: {
    exercise_id: string;
    sets: number;
    reps: string;
    rest_seconds: number;
    notes: string;
  }) => void,
  loadWorkoutDetailsFn: () => Promise<void>
) => {
  if (!editingExercise || !newExercise.exercise_id) return;

  try {
    setShowAddExercise(false);
    setEditingExercise(null);
    await loadWorkoutDetailsFn();

    setWorkoutExercises((prev) =>
      prev.map((ex) =>
        ex.id === editingExercise.id
          ? {
              ...ex,
              ...newExercise,
              exercise: availableExercises.find(
                (e) => e.id === newExercise.exercise_id
              ),
            }
          : ex
      )
    );

    setEditingExercise(null);
    setNewExercise({
      exercise_id: "",
      sets: 3,
      reps: "10-12",
      rest_seconds: 60,
      notes: "",
    });
    setShowAddExercise(false);
  } catch (error) {
    console.error("Error updating exercise:", error);
    alert("Failed to update exercise. Please try again.");
  }
};

const saveWorkout = async (
  template: WorkoutTemplate | null,
  workoutExercises: WorkoutExercise[],
  onWorkoutUpdated: (() => void) | undefined,
  onClose: () => void
) => {
  if (!template) return;

  try {
    const { WorkoutBlockService } = await import("@/lib/workoutBlockService");

    for (const exercise of workoutExercises) {
      if (exercise.id.startsWith("temp-")) {
        const block = await WorkoutBlockService.createWorkoutBlock(
          template.id,
          (exercise.exercise_type || "straight_set") as any,
          exercise.order_index || 0,
          {
            total_sets: exercise.sets,
            reps_per_set: exercise.reps,
            rest_seconds: exercise.rest_seconds,
          }
        );

        if (block && exercise.exercise_id) {
          const result = await WorkoutBlockService.addExerciseToBlock(
            block.id,
            exercise.exercise_id,
            1,
            {
              sets: exercise.sets,
              reps: exercise.reps,
              rest_seconds: exercise.rest_seconds,
              details:
                exercise.exercise_type &&
                exercise.exercise_type !== "straight_set"
                  ? {
                      rounds: exercise.rounds,
                      work_seconds: exercise.work_seconds,
                      rest_after: exercise.rest_after,
                      tabata_sets: exercise.tabata_sets,
                      circuit_sets: exercise.circuit_sets,
                      amrap_duration: exercise.amrap_duration,
                      emom_duration: exercise.emom_duration,
                      emom_reps: exercise.emom_reps,
                      emom_mode: exercise.emom_mode,
                      superset_exercise_id: exercise.superset_exercise_id,
                      superset_reps: exercise.superset_reps,
                      compound_exercise_id: exercise.compound_exercise_id,
                      isolation_reps: exercise.isolation_reps,
                      compound_reps: exercise.compound_reps,
                      drop_percentage: exercise.drop_percentage,
                      drop_set_reps: exercise.drop_set_reps,
                      cluster_reps: exercise.cluster_reps,
                      clusters_per_set: exercise.clusters_per_set,
                      intra_cluster_rest: exercise.intra_cluster_rest,
                      rest_pause_duration: exercise.rest_pause_duration,
                      max_rest_pauses: exercise.max_rest_pauses,
                      target_reps: exercise.target_reps,
                      time_cap: exercise.time_cap,
                      giant_set_exercises: exercise.giant_set_exercises,
                    }
                  : null,
              notes: exercise.notes || undefined,
            } as any
          );

          if (!result) {
            throw new Error("Failed to insert exercise");
          }
        }
      }
    }

    alert("Workout saved successfully!");
    if (onWorkoutUpdated) {
      onWorkoutUpdated();
    }
    onClose();
  } catch (error) {
    console.error("Error saving workout:", error);
    alert("Error saving workout");
  }
};

const duplicateWorkout = async (
  template: WorkoutTemplate | null,
  onWorkoutUpdated: (() => void) | undefined
) => {
  if (!template) return;

  try {
    const { data: newTemplate, error } = await supabase
      .from("workout_templates")
      .insert({
        name: `${template.name} (Copy)`,
        description: template.description,
        category_id: template.category_id,
        estimated_duration: template.estimated_duration,
        difficulty_level: template.difficulty_level,
        is_active: template.is_active,
        coach_id: template.coach_id || "00000000-0000-0000-0000-000000000000",
      })
      .select()
      .single();

    if (error) throw error;

    const { WorkoutBlockService } = await import("@/lib/workoutBlockService");
    const blocks = await WorkoutBlockService.getWorkoutBlocks(template.id);

    if (blocks && blocks.length > 0) {
      for (const block of blocks) {
        const newBlock = await WorkoutBlockService.createWorkoutBlock(
          newTemplate.id,
          block.block_type,
          block.block_order,
          {
            block_name: block.block_name,
            block_notes: block.block_notes,
            total_sets: block.total_sets,
            reps_per_set: block.reps_per_set,
            rest_seconds: block.rest_seconds,
            duration_seconds: block.duration_seconds,
          }
        );

        if (newBlock && block.exercises && block.exercises.length > 0) {
          for (const exercise of block.exercises) {
            await WorkoutBlockService.addExerciseToBlock(
              newBlock.id,
              exercise.exercise_id,
              exercise.exercise_order,
              {
                exercise_letter: exercise.exercise_letter,
                sets: exercise.sets,
                reps: exercise.reps,
                weight_kg: exercise.weight_kg,
                rir: exercise.rir,
                tempo: exercise.tempo,
                rest_seconds: exercise.rest_seconds,
                notes: exercise.notes,
              }
            );
          }
        }
      }
    }

    alert("Workout duplicated successfully!");
    onWorkoutUpdated?.();
  } catch (error) {
    console.error("Error duplicating workout:", error);
    alert("Failed to duplicate workout. Please try again.");
  }
};

const assignWorkout = (onClose: () => void) => {
  onClose();
};

export default function WorkoutDetailModal({
  isOpen,
  onClose,
  template,
  onWorkoutUpdated,
}: WorkoutDetailModalProps) {
  const { isDark, getThemeStyles } = useTheme();
  const theme = getThemeStyles();

  console.log("🔧 WorkoutDetailModal loaded - version with fixes applied");

  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>(
    []
  );
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges] = useState(false);
  const [newExercise, setNewExercise] = useState({
    exercise_id: "",
    sets: 3,
    reps: "10-12",
    rest_seconds: 60,
    notes: "",
  });
  const [editingExercise, setEditingExercise] =
    useState<WorkoutExercise | null>(null);

  const loadWorkoutDetailsFn = useCallback(async () => {
    await loadWorkoutDetails(
      template,
      setLoading,
      setWorkoutExercises,
      setAvailableExercises
    );
  }, [template]);

  useEffect(() => {
    const loadData = async () => {
      if (isOpen && template) {
        await loadWorkoutDetailsFn();
        preventBackgroundScroll();
      } else {
        restoreBackgroundScroll();
      }
    };

    loadData();

    return () => {
      restoreBackgroundScroll();
    };
  }, [isOpen, template, loadWorkoutDetailsFn]);

  if (!template) return null as any;
  if (!isOpen) return null as any;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 ${
        isDark ? "bg-black/60 backdrop-blur-sm" : "bg-black/50 backdrop-blur-sm"
      }`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      data-theme={isDark ? "dark" : "light"}
    >
      {/* Modal */}
      <div
        className={`relative ${theme.card} ${theme.shadow} rounded-3xl border ${theme.border} max-w-5xl w-full max-h-[95vh] flex flex-col transform transition-all duration-300 ease-out`}
        style={{
          animation: "modalSlideIn 0.3s ease-out",
        }}
      >
        {/* Header */}
        <div
          className={`sticky top-0 ${theme.card} border-b ${theme.border} px-6 py-5 rounded-t-3xl`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`p-3 rounded-2xl ${
                  isDark
                    ? "bg-slate-700"
                    : "bg-gradient-to-br from-purple-100 to-orange-100"
                }`}
              >
                <Dumbbell className={`w-6 h-6 ${theme.text}`} />
              </div>
              <div>
                <h2 className={`text-2xl font-bold ${theme.text}`}>
                  {template.name}
                </h2>
                <div className="flex items-center gap-3 mt-1">
                  <Badge
                    className={`${
                      difficultyColors[
                        template.difficulty_level as keyof typeof difficultyColors
                      ]
                    } ${isDark ? "dark:bg-opacity-20" : ""}`}
                  >
                    {template.difficulty_level}
                  </Badge>
                  <div
                    className={`flex items-center gap-1 text-sm ${theme.textSecondary}`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>{template.estimated_duration} min</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className={`p-2 rounded-xl transition-all duration-200 ${
                  theme.textSecondary
                } hover:${theme.text} hover:${
                  isDark ? "bg-slate-700" : "bg-slate-100"
                }`}
              >
                <Edit className="w-4 h-4" />
              </Button>
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
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {/* Workout Overview */}
          <Card
            className={`${
              isDark
                ? "bg-slate-800 border-slate-700"
                : "bg-gradient-to-br from-purple-50 via-white to-orange-50 border-purple-200"
            } rounded-2xl mb-6`}
          >
            <CardHeader className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-xl ${
                      isDark ? "bg-slate-700" : "bg-purple-100"
                    }`}
                  >
                    <Info
                      className={`w-5 h-5 ${
                        isDark ? "text-purple-400" : "text-purple-600"
                      }`}
                    />
                  </div>
                  <span className={`text-lg font-semibold ${theme.text}`}>
                    Workout Overview
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => duplicateWorkout(template, onWorkoutUpdated)}
                    className="flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Duplicate
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => assignWorkout(onClose)}
                    className={`${theme.primary} flex items-center gap-2`}
                  >
                    <Users className="w-4 h-4" />
                    Assign
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="space-y-4">
                <p
                  className={`text-base leading-relaxed ${theme.textSecondary}`}
                >
                  {template.description}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div
                    className={`flex items-center gap-2 p-3 rounded-xl ${
                      isDark ? "bg-slate-700" : "bg-white/60"
                    }`}
                  >
                    <Clock className={`w-4 h-4 ${theme.textSecondary}`} />
                    <div>
                      <div className={`text-sm ${theme.textSecondary}`}>
                        Duration
                      </div>
                      <div className={`font-semibold ${theme.text}`}>
                        {template.estimated_duration} min
                      </div>
                    </div>
                  </div>
                  <div
                    className={`flex items-center gap-2 p-3 rounded-xl ${
                      isDark ? "bg-slate-700" : "bg-white/60"
                    }`}
                  >
                    <Dumbbell className={`w-4 h-4 ${theme.textSecondary}`} />
                    <div>
                      <div className={`text-sm ${theme.textSecondary}`}>
                        Exercises
                      </div>
                      <div className={`font-semibold ${theme.text}`}>
                        {workoutExercises.length}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`flex items-center gap-2 p-3 rounded-xl ${
                      isDark ? "bg-slate-700" : "bg-white/60"
                    }`}
                  >
                    <Target className={`w-4 h-4 ${theme.textSecondary}`} />
                    <div>
                      <div className={`text-sm ${theme.textSecondary}`}>
                        Difficulty
                      </div>
                      <div className={`font-semibold ${theme.text}`}>
                        {template.difficulty_level}
                      </div>
                    </div>
                  </div>
                  {template.category && (
                    <div
                      className={`flex items-center gap-2 p-3 rounded-xl ${
                        isDark ? "bg-slate-700" : "bg-white/60"
                      }`}
                    >
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: template.category.color }}
                      />
                      <div>
                        <div className={`text-sm ${theme.textSecondary}`}>
                          Category
                        </div>
                        <div className={`font-semibold ${theme.text}`}>
                          {template.category.name}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Exercises List */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-xl ${
                    isDark ? "bg-slate-700" : "bg-orange-100"
                  }`}
                >
                  <Dumbbell
                    className={`w-5 h-5 ${
                      isDark ? "text-orange-400" : "text-orange-600"
                    }`}
                  />
                </div>
                <h3 className={`text-xl font-bold ${theme.text}`}>Exercises</h3>
                <Badge variant="outline" className={`${theme.textSecondary}`}>
                  {workoutExercises.length} exercises
                </Badge>
              </div>
              <Button
                onClick={() => setShowAddExercise(true)}
                className={`${theme.success} flex items-center gap-2`}
                size="sm"
              >
                <Plus className="w-4 h-4" />
                Add Exercise
              </Button>
            </div>

            {/* Add Exercise Modal */}
            {showAddExercise && (
              <Card
                className={`${theme.card} border ${theme.border} rounded-2xl`}
              >
                <CardHeader className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-xl ${
                          isDark ? "bg-slate-700" : "bg-green-100"
                        }`}
                      >
                        <Plus
                          className={`w-5 h-5 ${
                            isDark ? "text-green-400" : "text-green-600"
                          }`}
                        />
                      </div>
                      <CardTitle className={`text-xl font-bold ${theme.text}`}>
                        {editingExercise ? "Edit Exercise" : "Add Exercise"}
                      </CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowAddExercise(false);
                        setEditingExercise(null);
                        setNewExercise({
                          exercise_id: "",
                          sets: 3,
                          reps: "10-12",
                          rest_seconds: 60,
                          notes: "",
                        });
                      }}
                      className={`p-2 rounded-xl transition-all duration-200 ${
                        theme.textSecondary
                      } hover:${theme.text} hover:${
                        isDark ? "bg-slate-700" : "bg-slate-100"
                      }`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="space-y-6">
                    <div>
                      <Label
                        htmlFor="exercise"
                        className={`text-sm font-medium ${theme.text}`}
                      >
                        Exercise
                      </Label>
                      <Select
                        value={newExercise.exercise_id}
                        onValueChange={(value) =>
                          setNewExercise({ ...newExercise, exercise_id: value })
                        }
                      >
                        <SelectTrigger className="mt-2 rounded-xl">
                          <SelectValue placeholder="Select an exercise" />
                        </SelectTrigger>
                        <SelectContent className="z-[99999] max-h-60">
                          {availableExercises.map((exercise) => (
                            <SelectItem
                              key={exercise.id}
                              value={exercise.id}
                              className="rounded-lg"
                            >
                              {exercise.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label
                          htmlFor="sets"
                          className={`text-sm font-medium ${theme.text}`}
                        >
                          Sets
                        </Label>
                        <Input
                          id="sets"
                          type="number"
                          value={newExercise.sets}
                          onChange={(e) =>
                            setNewExercise({
                              ...newExercise,
                              sets: parseInt(e.target.value) || 0,
                            })
                          }
                          min="1"
                          className="mt-2 rounded-xl"
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor="reps"
                          className={`text-sm font-medium ${theme.text}`}
                        >
                          Reps
                        </Label>
                        <Input
                          id="reps"
                          value={newExercise.reps}
                          onChange={(e) =>
                            setNewExercise({
                              ...newExercise,
                              reps: e.target.value,
                            })
                          }
                          placeholder="e.g., 10-12"
                          className="mt-2 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label
                          htmlFor="rest"
                          className={`text-sm font-medium ${theme.text}`}
                        >
                          Rest (seconds)
                        </Label>
                        <Input
                          id="rest"
                          type="number"
                          value={newExercise.rest_seconds}
                          onChange={(e) =>
                            setNewExercise({
                              ...newExercise,
                              rest_seconds: parseInt(e.target.value) || 0,
                            })
                          }
                          min="0"
                          className="mt-2 rounded-xl"
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor="notes"
                          className={`text-sm font-medium ${theme.text}`}
                        >
                          Notes
                        </Label>
                        <Input
                          id="notes"
                          value={newExercise.notes}
                          onChange={(e) =>
                            setNewExercise({
                              ...newExercise,
                              notes: e.target.value,
                            })
                          }
                          placeholder="Optional notes"
                          className="mt-2 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        onClick={
                          editingExercise
                            ? () =>
                                updateExercise(
                                  editingExercise,
                                  newExercise,
                                  availableExercises,
                                  workoutExercises,
                                  setWorkoutExercises,
                                  setShowAddExercise,
                                  setEditingExercise,
                                  setNewExercise,
                                  loadWorkoutDetailsFn
                                )
                            : () =>
                                addExercise(
                                  template,
                                  newExercise,
                                  availableExercises,
                                  workoutExercises,
                                  setWorkoutExercises,
                                  setNewExercise,
                                  setShowAddExercise
                                )
                        }
                        className={`${theme.success} flex items-center gap-2 rounded-xl`}
                      >
                        {editingExercise ? (
                          <>
                            <Save className="w-4 h-4" />
                            Update Exercise
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            Add Exercise
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowAddExercise(false);
                          setEditingExercise(null);
                          setNewExercise({
                            exercise_id: "",
                            sets: 3,
                            reps: "10-12",
                            rest_seconds: 60,
                            notes: "",
                          });
                        }}
                        className="rounded-xl"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`${theme.card} border ${theme.border} rounded-2xl p-6`}
                  >
                    <div className="animate-pulse">
                      <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-3"></div>
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mb-4"></div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded"></div>
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded"></div>
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {workoutExercises.map((workoutExercise, index) => (
                  <Card
                    key={workoutExercise.id}
                    className={`${theme.card} border ${theme.border} rounded-2xl hover:shadow-lg transition-all duration-200`}
                  >
                    <CardHeader className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div
                              className={`flex items-center justify-center w-8 h-8 rounded-xl ${
                                isDark
                                  ? "bg-slate-700"
                                  : "bg-gradient-to-br from-purple-100 to-orange-100"
                              }`}
                            >
                              <span
                                className={`text-sm font-bold ${theme.text}`}
                              >
                                {index + 1}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <CardTitle
                                className={`text-xl font-bold ${theme.text}`}
                              >
                                {workoutExercise.exercise?.name || "Exercise"}
                              </CardTitle>
                              {workoutExercise.exercise_type &&
                                workoutExercise.exercise_type !==
                                  "straight_set" && (
                                  <Badge
                                    className={`${
                                      workoutExercise.exercise_type === "tabata"
                                        ? "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300"
                                        : workoutExercise.exercise_type ===
                                          "circuit"
                                        ? "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300"
                                        : workoutExercise.exercise_type ===
                                          "amrap"
                                        ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                                        : workoutExercise.exercise_type ===
                                          "emom"
                                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
                                        : "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300"
                                    }`}
                                  >
                                    {workoutExercise.exercise_type === "tabata"
                                      ? "Tabata Circuit"
                                      : workoutExercise.exercise_type ===
                                        "circuit"
                                      ? "Circuit"
                                      : workoutExercise.exercise_type ===
                                        "amrap"
                                      ? "AMRAP"
                                      : workoutExercise.exercise_type === "emom"
                                      ? "EMOM"
                                      : workoutExercise.exercise_type ===
                                        "superset"
                                      ? "Superset"
                                      : workoutExercise.exercise_type ===
                                        "drop_set"
                                      ? "Drop Set"
                                      : workoutExercise.exercise_type ===
                                        "giant_set"
                                      ? "Giant Set"
                                      : workoutExercise.exercise_type ===
                                        "cluster_set"
                                      ? "Cluster Set"
                                      : workoutExercise.exercise_type ===
                                        "rest_pause"
                                      ? "Rest-Pause"
                                      : workoutExercise.exercise_type ===
                                        "pyramid_set"
                                      ? "Pyramid Set"
                                      : workoutExercise.exercise_type ===
                                        "pre_exhaustion"
                                      ? "Pre-Exhaustion"
                                      : workoutExercise.exercise_type ===
                                        "for_time"
                                      ? "For Time"
                                      : workoutExercise.exercise_type ===
                                        "ladder"
                                      ? "Ladder"
                                      : "Straight Set"}
                                  </Badge>
                                )}
                            </div>
                          </div>
                          <CardDescription
                            className={`text-sm mb-4 ${theme.textSecondary}`}
                          >
                            {workoutExercise.exercise?.description}
                          </CardDescription>

                          {workoutExercise.exercise_type === "tabata" ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                              <div
                                className={`p-3 rounded-xl ${
                                  isDark ? "bg-slate-700" : "bg-white/60"
                                }`}
                              >
                                <div
                                  className={`text-xs ${theme.textSecondary} mb-1`}
                                >
                                  Rounds
                                </div>
                                <div
                                  className={`font-bold text-lg ${theme.text}`}
                                >
                                  {workoutExercise.rounds || 8}
                                </div>
                              </div>
                              <div
                                className={`p-3 rounded-xl ${
                                  isDark ? "bg-slate-700" : "bg-white/60"
                                }`}
                              >
                                <div
                                  className={`text-xs ${theme.textSecondary} mb-1`}
                                >
                                  Work
                                </div>
                                <div
                                  className={`font-bold text-lg ${theme.text}`}
                                >
                                  {workoutExercise.work_seconds || 20}s
                                </div>
                              </div>
                              <div
                                className={`p-3 rounded-xl ${
                                  isDark ? "bg-slate-700" : "bg-white/60"
                                }`}
                              >
                                <div
                                  className={`text-xs ${theme.textSecondary} mb-1`}
                                >
                                  Rest After
                                </div>
                                <div
                                  className={`font-bold text-lg ${theme.text}`}
                                >
                                  {workoutExercise.rest_after
                                    ? `${workoutExercise.rest_after}s`
                                    : "N/A"}
                                </div>
                              </div>
                              <div
                                className={`p-3 rounded-xl ${
                                  isDark ? "bg-slate-700" : "bg-white/60"
                                }`}
                              >
                                <div
                                  className={`text-xs ${theme.textSecondary} mb-1`}
                                >
                                  Sets
                                </div>
                                <div
                                  className={`font-bold text-lg ${theme.text}`}
                                >
                                  {workoutExercise.tabata_sets?.length || 0}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                              <div
                                className={`p-3 rounded-xl ${
                                  isDark ? "bg-slate-700" : "bg-white/60"
                                }`}
                              >
                                <div
                                  className={`text-xs ${theme.textSecondary} mb-1`}
                                >
                                  Sets
                                </div>
                                <div
                                  className={`font-bold text-lg ${theme.text}`}
                                >
                                  {workoutExercise.sets}
                                </div>
                              </div>
                              <div
                                className={`p-3 rounded-xl ${
                                  isDark ? "bg-slate-700" : "bg-white/60"
                                }`}
                              >
                                <div
                                  className={`text-xs ${theme.textSecondary} mb-1`}
                                >
                                  Reps
                                </div>
                                <div
                                  className={`font-bold text-lg ${theme.text}`}
                                >
                                  {workoutExercise.reps}
                                </div>
                              </div>
                              <div
                                className={`p-3 rounded-xl ${
                                  isDark ? "bg-slate-700" : "bg-white/60"
                                }`}
                              >
                                <div
                                  className={`text-xs ${theme.textSecondary} mb-1`}
                                >
                                  Rest
                                </div>
                                <div
                                  className={`font-bold text-lg ${theme.text}`}
                                >
                                  {formatRestTime(workoutExercise.rest_seconds)}
                                </div>
                              </div>
                              <div
                                className={`p-3 rounded-xl ${
                                  isDark ? "bg-slate-700" : "bg-white/60"
                                }`}
                              >
                                <div
                                  className={`text-xs ${theme.textSecondary} mb-1`}
                                >
                                  Order
                                </div>
                                <div
                                  className={`font-bold text-lg ${theme.text}`}
                                >
                                  #{workoutExercise.order_index}
                                </div>
                              </div>
                            </div>
                          )}

                          {workoutExercise.notes && (
                            <div
                              className={`p-4 rounded-xl ${
                                isDark
                                  ? "bg-blue-900/20 border border-blue-800"
                                  : "bg-blue-50 border border-blue-200"
                              } mb-4`}
                            >
                              <div
                                className={`text-sm font-medium ${
                                  isDark ? "text-blue-300" : "text-blue-800"
                                } mb-1`}
                              >
                                Notes:
                              </div>
                              <div
                                className={`text-sm ${
                                  isDark ? "text-blue-200" : "text-blue-700"
                                }`}
                              >
                                {workoutExercise.notes}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              editExercise(
                                workoutExercise,
                                setEditingExercise,
                                setNewExercise,
                                setShowAddExercise
                              )
                            }
                            className={`p-2 rounded-xl transition-all duration-200 ${
                              theme.textSecondary
                            } hover:${theme.text} hover:${
                              isDark ? "bg-slate-700" : "bg-slate-100"
                            }`}
                            title="Edit Exercise"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              removeExercise(
                                workoutExercise.id,
                                workoutExercises,
                                setWorkoutExercises
                              )
                            }
                            className={`p-2 rounded-xl transition-all duration-200 ${
                              theme.textSecondary
                            } hover:text-red-600 hover:${
                              isDark ? "bg-red-900/20" : "bg-red-50"
                            }`}
                            title="Remove Exercise"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div
          className={`flex-shrink-0 ${theme.card} border-t ${theme.border} px-6 py-4 rounded-b-3xl`}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2"></div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="rounded-xl"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
