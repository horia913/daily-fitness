"use client";

import React, { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Plus,
  Search,
  GripVertical,
  Trash2,
  Copy,
  Timer,
  Dumbbell,
  Zap,
  Clock,
  BarChart3,
  Users,
  Eye,
  Save,
  X,
} from "lucide-react";
import Link from "next/link";

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight?: string;
  restTime: number; // in seconds
  notes?: string;
  type: "strength" | "cardio" | "flexibility";
}

interface WorkoutTemplate {
  name: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  exercises: Exercise[];
  estimatedDuration: number; // in minutes
}

// Sample exercises library
const EXERCISE_LIBRARY = [
  { id: "1", name: "Barbell Squat", type: "strength" as const },
  { id: "2", name: "Bench Press", type: "strength" as const },
  { id: "3", name: "Deadlift", type: "strength" as const },
  { id: "4", name: "Pull-ups", type: "strength" as const },
  { id: "5", name: "Running", type: "cardio" as const },
  { id: "6", name: "Bicycle Crunches", type: "strength" as const },
  { id: "7", name: "Lunges", type: "strength" as const },
  { id: "8", name: "Shoulder Press", type: "strength" as const },
  { id: "9", name: "Plank", type: "strength" as const },
  { id: "10", name: "Jump Rope", type: "cardio" as const },
];

function WorkoutTemplateBuilderContent() {
  const { user } = useAuth();
  const { isDark, getSemanticColor, performanceSettings } = useTheme();

  const [template, setTemplate] = useState<WorkoutTemplate>({
    name: "",
    description: "",
    difficulty: "intermediate",
    exercises: [],
    estimatedDuration: 0,
  });

  const [showExerciseLibrary, setShowExerciseLibrary] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [draggedExercise, setDraggedExercise] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Calculate estimated duration based on exercises
  const calculateDuration = (exercises: Exercise[]) => {
    const totalTime = exercises.reduce((acc, ex) => {
      const setsTime = ex.sets * 45; // Assume 45s per set
      const restTime = (ex.sets - 1) * ex.restTime;
      return acc + setsTime + restTime;
    }, 0);
    return Math.ceil(totalTime / 60); // Convert to minutes
  };

  // Calculate difficulty based on exercises
  const calculateDifficulty = (
    exercises: Exercise[]
  ): "beginner" | "intermediate" | "advanced" => {
    if (exercises.length < 4) return "beginner";
    if (exercises.length < 7) return "intermediate";
    return "advanced";
  };

  const addExercise = (libraryExercise: (typeof EXERCISE_LIBRARY)[0]) => {
    const newExercise: Exercise = {
      id: `${Date.now()}-${libraryExercise.id}`,
      name: libraryExercise.name,
      sets: 3,
      reps: "10",
      weight: "",
      restTime: 60,
      type: libraryExercise.type,
    };

    const newExercises = [...template.exercises, newExercise];
    setTemplate({
      ...template,
      exercises: newExercises,
      estimatedDuration: calculateDuration(newExercises),
      difficulty: calculateDifficulty(newExercises),
    });
    setShowExerciseLibrary(false);
  };

  const updateExercise = (index: number, updates: Partial<Exercise>) => {
    const newExercises = [...template.exercises];
    newExercises[index] = { ...newExercises[index], ...updates };
    setTemplate({
      ...template,
      exercises: newExercises,
      estimatedDuration: calculateDuration(newExercises),
      difficulty: calculateDifficulty(newExercises),
    });
  };

  const removeExercise = (index: number) => {
    const newExercises = template.exercises.filter((_, i) => i !== index);
    setTemplate({
      ...template,
      exercises: newExercises,
      estimatedDuration: calculateDuration(newExercises),
      difficulty: calculateDifficulty(newExercises),
    });
  };

  const duplicateExercise = (index: number) => {
    const exerciseToCopy = template.exercises[index];
    const newExercise = {
      ...exerciseToCopy,
      id: `${Date.now()}-copy`,
    };
    const newExercises = [
      ...template.exercises.slice(0, index + 1),
      newExercise,
      ...template.exercises.slice(index + 1),
    ];
    setTemplate({
      ...template,
      exercises: newExercises,
      estimatedDuration: calculateDuration(newExercises),
      difficulty: calculateDifficulty(newExercises),
    });
  };

  const handleDragStart = (index: number) => {
    setDraggedExercise(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedExercise === null || draggedExercise === index) return;

    const newExercises = [...template.exercises];
    const draggedItem = newExercises[draggedExercise];
    newExercises.splice(draggedExercise, 1);
    newExercises.splice(index, 0, draggedItem);

    setTemplate({ ...template, exercises: newExercises });
    setDraggedExercise(index);
  };

  const handleDragEnd = () => {
    setDraggedExercise(null);
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

  const filteredExercises = EXERCISE_LIBRARY.filter((ex) =>
    ex.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-[1600px]">
        {/* Header */}
        <div className="mb-6">
          <GlassCard elevation={1} className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <Link href="/coach/workouts/templates">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                </Link>
                <div>
                  <h1
                    className="text-2xl font-bold"
                    style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                  >
                    Create Workout Template
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
                <Button
                  variant="default"
                  style={{
                    background: getSemanticColor("success").gradient,
                    boxShadow: `0 4px 12px ${
                      getSemanticColor("success").primary
                    }30`,
                  }}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Template
                </Button>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Two-Panel Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT PANEL: Builder */}
          <div className="space-y-6">
            {/* Template Info */}
            <GlassCard elevation={2} className="p-6">
              <h2
                className="text-lg font-bold mb-4"
                style={{ color: isDark ? "#fff" : "#1A1A1A" }}
              >
                Template Info
              </h2>

              <div className="space-y-4">
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.7)"
                        : "rgba(0,0,0,0.7)",
                    }}
                  >
                    Template Name *
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g., Upper Body Strength"
                    value={template.name}
                    onChange={(e) =>
                      setTemplate({ ...template, name: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.7)"
                        : "rgba(0,0,0,0.7)",
                    }}
                  >
                    Description
                  </label>
                  <textarea
                    className="w-full px-3 py-2 rounded-lg"
                    rows={3}
                    placeholder="Describe the workout..."
                    value={template.description}
                    onChange={(e) =>
                      setTemplate({ ...template, description: e.target.value })
                    }
                    style={{
                      background: isDark
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(0,0,0,0.05)",
                      border: `1px solid ${
                        isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
                      }`,
                      color: isDark ? "#fff" : "#1A1A1A",
                    }}
                  />
                </div>
              </div>
            </GlassCard>

            {/* Exercises List */}
            <GlassCard elevation={2} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-lg font-bold"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  Exercises ({template.exercises.length})
                </h2>
                <Button
                  size="sm"
                  onClick={() => setShowExerciseLibrary(!showExerciseLibrary)}
                  style={{
                    background: getSemanticColor("trust").gradient,
                    boxShadow: `0 4px 12px ${
                      getSemanticColor("trust").primary
                    }30`,
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Exercise
                </Button>
              </div>

              {/* Exercise Library Modal */}
              {showExerciseLibrary && (
                <div className="mb-4">
                  <GlassCard elevation={3} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3
                        className="font-semibold"
                        style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                      >
                        Exercise Library
                      </h3>
                      <button
                        onClick={() => setShowExerciseLibrary(false)}
                        style={{
                          color: isDark
                            ? "rgba(255,255,255,0.6)"
                            : "rgba(0,0,0,0.6)",
                        }}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="relative mb-3">
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                        style={{
                          color: isDark
                            ? "rgba(255,255,255,0.5)"
                            : "rgba(0,0,0,0.5)",
                        }}
                      />
                      <Input
                        type="text"
                        placeholder="Search exercises..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {filteredExercises.map((exercise) => (
                        <button
                          key={exercise.id}
                          onClick={() => addExercise(exercise)}
                          className="w-full p-3 rounded-lg text-left transition-all hover:scale-102"
                          style={{
                            background: isDark
                              ? "rgba(255,255,255,0.05)"
                              : "rgba(0,0,0,0.05)",
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className="font-medium"
                              style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                            >
                              {exercise.name}
                            </span>
                            <span
                              className="text-xs px-2 py-1 rounded"
                              style={{
                                background: `${
                                  getSemanticColor("trust").primary
                                }20`,
                                color: getSemanticColor("trust").primary,
                              }}
                            >
                              {exercise.type}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </GlassCard>
                </div>
              )}

              {/* Exercises */}
              <div className="space-y-3">
                {template.exercises.length === 0 ? (
                  <div className="text-center py-12">
                    <Dumbbell
                      className="w-16 h-16 mx-auto mb-4"
                      style={{
                        color: isDark
                          ? "rgba(255,255,255,0.3)"
                          : "rgba(0,0,0,0.3)",
                      }}
                    />
                    <p
                      className="text-sm mb-4"
                      style={{
                        color: isDark
                          ? "rgba(255,255,255,0.6)"
                          : "rgba(0,0,0,0.6)",
                      }}
                    >
                      No exercises added yet
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setShowExerciseLibrary(true)}
                      style={{
                        background: getSemanticColor("trust").gradient,
                      }}
                    >
                      Add First Exercise
                    </Button>
                  </div>
                ) : (
                  template.exercises.map((exercise, index) => (
                    <div
                      key={exercise.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className="p-4 rounded-lg cursor-move transition-all"
                      style={{
                        background: isDark
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(0,0,0,0.05)",
                        opacity: draggedExercise === index ? 0.5 : 1,
                        borderLeft: `4px solid ${
                          getSemanticColor("trust").primary
                        }`,
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <GripVertical
                          className="w-5 h-5 mt-1 flex-shrink-0"
                          style={{
                            color: isDark
                              ? "rgba(255,255,255,0.4)"
                              : "rgba(0,0,0,0.4)",
                          }}
                        />

                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-3">
                            <h4
                              className="font-semibold"
                              style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                            >
                              {index + 1}. {exercise.name}
                            </h4>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => duplicateExercise(index)}
                                className="p-1 hover:scale-110 transition-transform"
                              >
                                <Copy
                                  className="w-4 h-4"
                                  style={{
                                    color: isDark
                                      ? "rgba(255,255,255,0.6)"
                                      : "rgba(0,0,0,0.6)",
                                  }}
                                />
                              </button>
                              <button
                                onClick={() => removeExercise(index)}
                                className="p-1 hover:scale-110 transition-transform"
                              >
                                <Trash2
                                  className="w-4 h-4"
                                  style={{
                                    color: getSemanticColor("critical").primary,
                                  }}
                                />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                              <label
                                className="text-xs mb-1 block"
                                style={{
                                  color: isDark
                                    ? "rgba(255,255,255,0.5)"
                                    : "rgba(0,0,0,0.5)",
                                }}
                              >
                                Sets
                              </label>
                              <Input
                                type="number"
                                value={exercise.sets}
                                onChange={(e) =>
                                  updateExercise(index, {
                                    sets: parseInt(e.target.value) || 0,
                                  })
                                }
                                min="1"
                              />
                            </div>

                            <div>
                              <label
                                className="text-xs mb-1 block"
                                style={{
                                  color: isDark
                                    ? "rgba(255,255,255,0.5)"
                                    : "rgba(0,0,0,0.5)",
                                }}
                              >
                                Reps
                              </label>
                              <Input
                                type="text"
                                value={exercise.reps}
                                onChange={(e) =>
                                  updateExercise(index, {
                                    reps: e.target.value,
                                  })
                                }
                                placeholder="10"
                              />
                            </div>

                            <div>
                              <label
                                className="text-xs mb-1 block"
                                style={{
                                  color: isDark
                                    ? "rgba(255,255,255,0.5)"
                                    : "rgba(0,0,0,0.5)",
                                }}
                              >
                                Weight
                              </label>
                              <Input
                                type="text"
                                value={exercise.weight || ""}
                                onChange={(e) =>
                                  updateExercise(index, {
                                    weight: e.target.value,
                                  })
                                }
                                placeholder="kg"
                              />
                            </div>

                            <div>
                              <label
                                className="text-xs mb-1 block"
                                style={{
                                  color: isDark
                                    ? "rgba(255,255,255,0.5)"
                                    : "rgba(0,0,0,0.5)",
                                }}
                              >
                                Rest (s)
                              </label>
                              <Input
                                type="number"
                                value={exercise.restTime}
                                onChange={(e) =>
                                  updateExercise(index, {
                                    restTime: parseInt(e.target.value) || 0,
                                  })
                                }
                                min="0"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>
          </div>

          {/* RIGHT PANEL: Live Preview */}
          <div className="lg:sticky lg:top-8 lg:self-start">
            <GlassCard elevation={2} className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Eye
                  className="w-5 h-5"
                  style={{ color: getSemanticColor("trust").primary }}
                />
                <h2
                  className="text-lg font-bold"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  Client View Preview
                </h2>
              </div>

              {/* Preview Card */}
              <div
                className="p-6 rounded-xl mb-6"
                style={{
                  background: isDark
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.1)",
                  border: `2px solid ${getSemanticColor("trust").primary}40`,
                }}
              >
                <h3
                  className="text-2xl font-bold mb-2"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  {template.name || "Untitled Workout"}
                </h3>
                <p
                  className="text-sm mb-4"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
                  }}
                >
                  {template.description || "No description"}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div
                    className="text-center p-3 rounded-lg"
                    style={{
                      background: isDark
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(0,0,0,0.05)",
                    }}
                  >
                    <Clock
                      className="w-5 h-5 mx-auto mb-1"
                      style={{ color: getSemanticColor("trust").primary }}
                    />
                    <p
                      className="text-lg font-bold"
                      style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                    >
                      {template.estimatedDuration}
                    </p>
                    <p
                      className="text-xs"
                      style={{
                        color: isDark
                          ? "rgba(255,255,255,0.5)"
                          : "rgba(0,0,0,0.5)",
                      }}
                    >
                      minutes
                    </p>
                  </div>

                  <div
                    className="text-center p-3 rounded-lg"
                    style={{
                      background: isDark
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(0,0,0,0.05)",
                    }}
                  >
                    <Dumbbell
                      className="w-5 h-5 mx-auto mb-1"
                      style={{ color: getSemanticColor("energy").primary }}
                    />
                    <p
                      className="text-lg font-bold"
                      style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                    >
                      {template.exercises.length}
                    </p>
                    <p
                      className="text-xs"
                      style={{
                        color: isDark
                          ? "rgba(255,255,255,0.5)"
                          : "rgba(0,0,0,0.5)",
                      }}
                    >
                      exercises
                    </p>
                  </div>

                  <div
                    className="text-center p-3 rounded-lg"
                    style={{
                      background: isDark
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(0,0,0,0.05)",
                    }}
                  >
                    <BarChart3
                      className="w-5 h-5 mx-auto mb-1"
                      style={{ color: getDifficultyColor(template.difficulty) }}
                    />
                    <p
                      className="text-lg font-bold capitalize"
                      style={{
                        color: getDifficultyColor(template.difficulty),
                      }}
                    >
                      {template.difficulty}
                    </p>
                    <p
                      className="text-xs"
                      style={{
                        color: isDark
                          ? "rgba(255,255,255,0.5)"
                          : "rgba(0,0,0,0.5)",
                      }}
                    >
                      difficulty
                    </p>
                  </div>
                </div>

                {/* Exercise Preview List */}
                {template.exercises.length > 0 && (
                  <div className="space-y-2">
                    {template.exercises.map((exercise, index) => (
                      <div
                        key={exercise.id}
                        className="p-3 rounded-lg"
                        style={{
                          background: isDark
                            ? "rgba(255,255,255,0.05)"
                            : "rgba(255,255,255,0.8)",
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span
                              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                              style={{
                                background: getSemanticColor("trust").gradient,
                                color: "#fff",
                              }}
                            >
                              {index + 1}
                            </span>
                            <span
                              className="font-medium"
                              style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                            >
                              {exercise.name}
                            </span>
                          </div>
                          <span
                            className="text-sm"
                            style={{
                              color: isDark
                                ? "rgba(255,255,255,0.6)"
                                : "rgba(0,0,0,0.6)",
                            }}
                          >
                            {exercise.sets} × {exercise.reps}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  className="w-full"
                  style={{
                    background: getSemanticColor("success").gradient,
                    boxShadow: `0 4px 12px ${
                      getSemanticColor("success").primary
                    }30`,
                  }}
                >
                  <Save className="w-5 h-5 mr-2" />
                  Save as Template
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  style={{
                    background: isDark
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.05)",
                  }}
                >
                  <Users className="w-5 h-5 mr-2" />
                  Assign to Clients
                </Button>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </AnimatedBackground>
  );
}

export default function WorkoutTemplateBuilder() {
  return (
    <ProtectedRoute requiredRole="coach">
      <WorkoutTemplateBuilderContent />
    </ProtectedRoute>
  );
}
