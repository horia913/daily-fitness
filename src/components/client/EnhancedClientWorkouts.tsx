"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { supabase } from "@/lib/supabase";
import {
  Calendar,
  Clock,
  Dumbbell,
  Play,
  Target,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Trophy,
  Zap,
  TrendingUp,
  BarChart3,
  Eye,
  Flame,
  Award,
  Calendar as CalendarIcon,
  RefreshCcw,
  Shuffle,
  ArrowRight,
  Lightbulb,
  X,
  Video,
} from "lucide-react";
import { useRouter } from "next/navigation";
import WorkoutTemplateService, {
  DailyWorkout,
  DailyWorkoutExercise,
  ExerciseAlternative,
} from "@/lib/workoutTemplateService";

interface EnhancedClientWorkoutsProps {
  clientId: string;
}

interface Program {
  id: string;
  name: string;
  description?: string;
  current_week: number;
  total_weeks: number;
  progress_percentage: number;
  difficulty_level: string;
  coach_name: string;
}

type ClientBlockExerciseRecord = {
  id: string;
  exercise_id: string | null;
  exercise_order: number | null;
  exercise_letter: string | null;
  sets: number | null;
  reps: string | null;
  weight_kg: number | null;
  rir: number | null;
  tempo: string | null;
  rest_seconds: number | null;
  notes: string | null;
};

type ClientBlockRecord = {
  id: string;
  block_order: number | null;
  block_type: string | null;
  block_name: string | null;
  block_notes: string | null;
  total_sets: number | null;
  reps_per_set: string | null;
  rest_seconds: number | null;
  exercises?: ClientBlockExerciseRecord[] | null;
};

type ClientProgramRuleRecord = {
  id: string;
  program_assignment_id: string | null;
  week_number: number | null;
  block_order: number | null;
  exercise_id: string | null;
  exercise_order: number | null;
  exercise_letter: string | null;
  sets: number | null;
  reps: string | null;
  rest_seconds: number | null;
  notes: string | null;
};

export default function EnhancedClientWorkouts({
  clientId,
}: EnhancedClientWorkoutsProps) {
  const { isDark, getSemanticColor, performanceSettings, getThemeStyles } =
    useTheme();
  const theme = getThemeStyles();
  const router = useRouter();

  // State management
  const [todaysWorkout, setTodaysWorkout] = useState<DailyWorkout | null>(null);
  const [upcomingWorkouts, setUpcomingWorkouts] = useState<DailyWorkout[]>([]);
  const [currentProgram, setCurrentProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [workoutHistory, setWorkoutHistory] = useState<DailyWorkout[]>([]);
  const [completedPrograms, setCompletedPrograms] = useState<Program[]>([]);
  const [allAssignedWorkouts, setAllAssignedWorkouts] = useState<any[]>([]);

  // Modal states
  const [showAlternatives, setShowAlternatives] = useState<string | null>(null);
  const [selectedExerciseAlternatives, setSelectedExerciseAlternatives] =
    useState<ExerciseAlternative[]>([]);
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(
    new Set()
  );

  const today = new Date().toISOString().split("T")[0];

  const toggleExerciseExpanded = (exerciseId: string) => {
    setExpandedExercises((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(exerciseId)) {
        newSet.delete(exerciseId);
      } else {
        newSet.add(exerciseId);
      }
      return newSet;
    });
  };

  const loadWorkoutData = useCallback(async () => {
    setLoading(true);
    try {
      // Load next due workout using direct database queries (same as dashboard)
      console.log("🔍 Client Workouts - Loading workout for client:", clientId);

      let nextWorkout = null;

      // First, try to get today's assignment
      const today = new Date().toISOString().split("T")[0];
      const { data: todaysAssignment, error: todaysError } = await supabase
        .from("workout_assignments")
        .select(
          `
          id,
          workout_template_id,
          assigned_date,
          scheduled_date,
          status,
          name,
          description
        `
        )
        .eq("client_id", clientId)
        .eq("scheduled_date", today)
        .in("status", ["assigned", "active"])
        .maybeSingle();

      console.log(
        "🔍 Client Workouts - Today assignment:",
        todaysAssignment,
        todaysError
      );

      // If no assignment for today, get the most recent assignment
      let assignmentToUse = todaysAssignment;
      if (!todaysAssignment) {
        const { data: recentAssignment, error: recentError } = await supabase
          .from("workout_assignments")
          .select(
            `
            id,
            workout_template_id,
            assigned_date,
            scheduled_date,
            status,
            name,
            description
          `
          )
          .eq("client_id", clientId)
          .in("status", ["assigned", "active"])
          .order("scheduled_date", { ascending: false })
          .limit(1)
          .maybeSingle();

        console.log(
          "🔍 Client Workouts - Recent assignment:",
          recentAssignment,
          recentError
        );
        assignmentToUse = recentAssignment;
      }

      // Build workout details from client-owned tables so we avoid coach data queries
      if (assignmentToUse && assignmentToUse.id) {
        const assignmentName =
          assignmentToUse.name && assignmentToUse.name.trim().length > 0
            ? assignmentToUse.name
            : "Workout";
        const assignmentDescription =
          assignmentToUse.description &&
          assignmentToUse.description.trim().length > 0
            ? assignmentToUse.description
            : "";

        // Fetch original blocks using workout_template_id from assignment
        if (!assignmentToUse.workout_template_id) {
          console.error(
            "🔍 Client Workouts - Workout template ID not found in assignment"
          );
        } else {
          // Use WorkoutBlockService to fetch blocks (handles RLS properly)
          const { WorkoutBlockService } = await import(
            "@/lib/workoutBlockService"
          );
          const workoutBlocks = await WorkoutBlockService.getWorkoutBlocks(
            assignmentToUse.workout_template_id
          );

          if (!workoutBlocks || workoutBlocks.length === 0) {
            console.warn(
              "🔍 Client Workouts - No workout blocks found for template"
            );
          } else {
            // Convert WorkoutBlock[] to ClientBlockRecord[] format
            const clientBlocks: ClientBlockRecord[] = workoutBlocks.map(
              (block) => ({
                id: block.id,
                block_order: block.block_order,
                block_type: block.block_type,
                block_name: block.block_name ?? null,
                block_notes: block.block_notes ?? null,
                total_sets: block.total_sets ?? null,
                reps_per_set: block.reps_per_set ?? null,
                rest_seconds: block.rest_seconds ?? null,
                exercises: (block.exercises ?? []).map((ex) => ({
                  id: ex.id,
                  exercise_id: ex.exercise_id,
                  exercise_order: ex.exercise_order,
                  exercise_letter: ex.exercise_letter ?? null,
                  sets: ex.sets ?? null,
                  reps: ex.reps ?? null,
                  weight_kg: ex.weight_kg ?? null,
                  rir: ex.rir ?? null,
                  tempo: ex.tempo ?? null,
                  rest_seconds: ex.rest_seconds ?? null,
                  notes: ex.notes ?? null,
                })) as any[],
              })
            );

            const exerciseIds = Array.from(
              new Set(
                clientBlocks.flatMap((block) =>
                  ((block.exercises ?? []) as any[])
                    .map((exercise) => exercise.exercise_id)
                    .filter((id): id is string => Boolean(id))
                )
              )
            );

            const exerciseDetailsMap = new Map<
              string,
              { name: string; description: string }
            >();

            if (exerciseIds.length > 0) {
              const { data: exerciseDetails, error: exerciseDetailsError } =
                await supabase
                  .from("exercises")
                  .select("id, name, description")
                  .in("id", exerciseIds);

              if (exerciseDetailsError) {
                console.error(
                  "🔍 Client Workouts - Error loading exercise metadata:",
                  exerciseDetailsError
                );
              } else if (exerciseDetails) {
                exerciseDetails.forEach((detail) => {
                  exerciseDetailsMap.set(detail.id, {
                    name: detail.name,
                    description: detail.description ?? "",
                  });
                });
              }
            }

            const exercisesWithDetails: DailyWorkoutExercise[] = clientBlocks
              .flatMap((block) => {
                const blockExercises = (block.exercises ?? []) as any[];
                return blockExercises.map((exercise, index) => {
                  const detail = exercise.exercise_id
                    ? exerciseDetailsMap.get(exercise.exercise_id)
                    : undefined;

                  const rawOrder =
                    typeof exercise.exercise_order === "number"
                      ? exercise.exercise_order
                      : index + 1;
                  const orderIndex = Math.max(0, rawOrder - 1);

                  const fallbackName =
                    detail?.name ||
                    exercise.exercise_letter ||
                    `Exercise ${orderIndex + 1}`;

                  return {
                    id: exercise.id,
                    exerciseId: exercise.exercise_id ?? "",
                    name: detail?.name || fallbackName,
                    description: detail?.description || "",
                    orderIndex,
                    notes: exercise.notes ?? block.block_notes ?? undefined,
                    sets: exercise.sets ?? block.total_sets ?? 0,
                    reps: exercise.reps ?? block.reps_per_set ?? "",
                    weightGuidance:
                      exercise.weight_kg !== null &&
                      exercise.weight_kg !== undefined
                        ? `${exercise.weight_kg} kg`
                        : undefined,
                    restSeconds:
                      (exercise as any).rest_seconds ??
                      block.rest_seconds ??
                      60,
                    progressionNotes:
                      exercise.rir !== null && exercise.rir !== undefined
                        ? `RIR ${exercise.rir}`
                        : undefined,
                  };
                });
              })
              .sort((a, b) => a.orderIndex - b.orderIndex);

            nextWorkout = {
              hasWorkout: true,
              templateId: assignmentToUse.workout_template_id || undefined,
              templateName: assignmentName,
              templateDescription: assignmentDescription,
              weekNumber: 1,
              programDay: 1,
              exercises: exercisesWithDetails,
              generatedAt:
                assignmentToUse.scheduled_date || assignmentToUse.assigned_date,
              message: "Workout ready!",
            };
          }
        }
      }

      // If no workout found, set default message
      if (!nextWorkout) {
        nextWorkout = {
          hasWorkout: false,
          message:
            "No active workout assigned. Contact your coach to get started!",
        };
      }

      console.log("🔍 Client Workouts - Final workout:", nextWorkout);
      setTodaysWorkout(nextWorkout);

      // Check for active program assignment (if program tables exist)
      try {
        const { data: allProgramAssignments, error: allProgramError } =
          await supabase
            .from("program_assignments")
            .select(
              `
            id,
            start_date,
            status,
            program_id,
            name,
            description,
            duration_weeks
          `
            )
            .eq("client_id", clientId);

        console.log(
          "🔍 Client Workouts - ALL program assignments:",
          allProgramAssignments,
          allProgramError
        );

        const { data: programAssignment, error: programError } = await supabase
          .from("program_assignments")
          .select(
            `
            id,
            start_date,
            status,
            program_id,
            name,
            description,
            duration_weeks
          `
          )
          .eq("client_id", clientId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        console.log(
          "🔍 Client Workouts - Program assignment:",
          programAssignment,
          programError
        );

        if (programAssignment) {
          const programName =
            programAssignment.name && programAssignment.name.trim().length > 0
              ? programAssignment.name
              : "Program";
          const programDescription =
            programAssignment.description &&
            programAssignment.description.trim().length > 0
              ? programAssignment.description
              : "";

          let programExercises: DailyWorkoutExercise[] = [];
          try {
            const { data: clientRulesData, error: clientRulesError } =
              await supabase
                .from("client_program_progression_rules")
                .select(
                  `
                  id,
                  week_number,
                  block_order,
                  exercise_id,
                  exercise_order,
                  exercise_letter,
                  sets,
                  reps,
                  rest_seconds,
                  notes
                `
                )
                .eq("program_assignment_id", programAssignment.id)
                .eq("week_number", 1)
                .order("block_order", { ascending: true })
                .order("exercise_order", { ascending: true });

            if (clientRulesError) {
              console.error(
                "🔍 Client Workouts - Error loading client program rules:",
                clientRulesError
              );
            } else {
              const clientRules =
                (clientRulesData as ClientProgramRuleRecord[] | null) ?? [];
              const ruleExerciseIds = Array.from(
                new Set(
                  clientRules
                    .map((rule) => rule.exercise_id)
                    .filter((id): id is string => Boolean(id))
                )
              );

              const ruleExerciseDetailsMap = new Map<
                string,
                { name: string; description: string }
              >();

              if (ruleExerciseIds.length > 0) {
                const {
                  data: ruleExerciseDetails,
                  error: ruleExerciseDetailsError,
                } = await supabase
                  .from("exercises")
                  .select("id, name, description")
                  .in("id", ruleExerciseIds);

                if (ruleExerciseDetailsError) {
                  console.error(
                    "🔍 Client Workouts - Error loading program exercise metadata:",
                    ruleExerciseDetailsError
                  );
                } else if (ruleExerciseDetails) {
                  ruleExerciseDetails.forEach((detail) => {
                    ruleExerciseDetailsMap.set(detail.id, {
                      name: detail.name,
                      description: detail.description ?? "",
                    });
                  });
                }
              }

              programExercises = clientRules
                .map((rule, index) => {
                  const detail = rule.exercise_id
                    ? ruleExerciseDetailsMap.get(rule.exercise_id)
                    : undefined;
                  const rawOrder =
                    typeof rule.exercise_order === "number"
                      ? rule.exercise_order
                      : index + 1;
                  const orderIndex = Math.max(0, rawOrder - 1);
                  const fallbackName =
                    detail?.name ||
                    rule.exercise_letter ||
                    `Exercise ${orderIndex + 1}`;

                  return {
                    id: rule.id,
                    exerciseId: rule.exercise_id ?? "",
                    name: detail?.name || fallbackName,
                    description: detail?.description || "",
                    orderIndex,
                    notes: rule.notes || undefined,
                    sets: rule.sets ?? 0,
                    reps: rule.reps ?? "",
                    restSeconds: rule.rest_seconds ?? 60,
                    progressionNotes: undefined,
                    weightGuidance: undefined,
                  };
                })
                .sort((a, b) => a.orderIndex - b.orderIndex);
            }
          } catch (rulesError) {
            console.error(
              "🔍 Client Workouts - Unexpected error loading client program rules:",
              rulesError
            );
          }

          if (!nextWorkout || !nextWorkout.hasWorkout) {
            nextWorkout = {
              hasWorkout: true,
              templateId: programAssignment.program_id || undefined,
              templateName: programName,
              templateDescription: programDescription,
              weekNumber: 1,
              programDay: 1,
              exercises: programExercises,
              generatedAt: programAssignment.start_date,
              message: "Program ready!",
            };
            console.log(
              "🔍 Client Workouts - Set program assignment as workout:",
              nextWorkout
            );
          }
        }
      } catch (error) {
        console.log(
          "🔍 Client Workouts - Program queries failed (tables may not exist):",
          error
        );
      }

      setTodaysWorkout(nextWorkout);

      // Get program progress for current program info
      // Handle gracefully if new tables don't exist yet
      let programProgress;
      try {
        programProgress = await WorkoutTemplateService.getProgramProgress(
          clientId
        );
      } catch (error) {
        console.log("Program progress tracking not available yet");
        programProgress = null;
      }

      if (programProgress) {
        // Get program details
        // Fetch program details without the profiles relationship to avoid 406 errors
        // Use explicit column selection instead of * to avoid RLS issues
        let programData = null;
        let programError = null;
        let coachInfo = null;

        try {
          // Query through program_assignments to respect RLS policies
          // Clients should access workout_programs through program_assignments, not directly
          const { data: assignmentWithProgram, error: assignmentError } =
            await supabase
              .from("program_assignments")
              .select(
                `
              *,
              program:workout_programs(
                id, name, description, duration_weeks, difficulty_level, coach_id
              )
            `
              )
              .eq("program_id", programProgress.program_id)
              .eq("client_id", clientId)
              .maybeSingle();

          if (assignmentError) {
            programError = assignmentError;
          } else if (assignmentWithProgram?.program) {
            programData = assignmentWithProgram.program;

            // If we need coach info, fetch it separately
            if (programData?.coach_id) {
              const { data: coach } = await supabase
                .from("profiles")
                .select("first_name, last_name")
                .eq("id", programData.coach_id)
                .maybeSingle();
              coachInfo = coach;
            }
          } else {
            console.log("🔍 Client Workouts - Program not found in assignment");
          }
        } catch (error) {
          console.log(
            "🔍 Client Workouts - Error fetching program via assignment:",
            error
          );
          programError = error as any;
        }

        if (!programError && programData) {
          setCurrentProgram({
            id: programData.id,
            name: programData.name,
            description: programData.description,
            current_week: programProgress.current_week,
            total_weeks: programData.duration_weeks,
            progress_percentage: Math.round(
              (programProgress.current_week / programData.duration_weeks) * 100
            ),
            difficulty_level: programData.difficulty_level,
            coach_name:
              `${coachInfo?.first_name || ""} ${
                coachInfo?.last_name || ""
              }`.trim() || "Your Coach",
          });
        }
      }

      // Load workout history
      // Handle gracefully if new tables don't exist yet
      let workoutHistory: any[] = [];
      try {
        workoutHistory = await WorkoutTemplateService.getWorkoutHistory(
          clientId,
          7
        );
      } catch (error) {
        console.log("Workout history tracking not available yet");
        workoutHistory = [];
      }
      setWorkoutHistory(
        workoutHistory.map((completion) => ({
          hasWorkout: true,
          templateId:
            completion.template_id || (completion as any).template?.id,
          templateName:
            (completion as any).template?.name || "Completed Workout",
          templateDescription: "",
          weekNumber: completion.week_number || 0,
          programDay: completion.program_day || 0,
          estimatedDuration: completion.duration_minutes || 0,
          difficultyLevel:
            (completion as any).template?.difficulty_level || "intermediate",
          exercises: [],
          generatedAt: completion.completed_at,
          message: "Workout completed",
          completed: true,
          completedAt: completion.completed_at,
        }))
      );

      // For upcoming workouts, we'll show a preview of what's coming next
      // Since we don't know the exact schedule, we'll show the next few potential workouts
      const upcomingWorkouts: DailyWorkout[] = [];
      for (let i = 1; i <= 3; i++) {
        // This would need to be implemented to show upcoming workouts
        // For now, we'll leave this empty or show a placeholder
      }
      setUpcomingWorkouts(upcomingWorkouts);

      // Load completed programs
      // Handle gracefully if new tables don't exist yet
      let completedProgramsData: any[] = [];
      try {
        completedProgramsData =
          await WorkoutTemplateService.getCompletedPrograms(clientId);
      } catch (error) {
        console.log("Completed programs tracking not available yet");
        completedProgramsData = [];
      }
      setCompletedPrograms(completedProgramsData);

      // Load ALL assigned workouts/programs
      try {
        const { data: assignedWorkouts, error: assignedError } = await supabase
          .from("workout_assignments")
          .select(
            `
            id,
            status,
            assigned_date,
            scheduled_date,
            workout_template_id,
            coach_id,
            name,
            description
          `
          )
          .eq("client_id", clientId)
          .in("status", ["assigned", "active", "in_progress"])
          .order("assigned_date", { ascending: false });

        console.log(
          "🔍 Client Workouts - Assigned workouts:",
          assignedWorkouts,
          assignedError
        );

        // Also load program assignments
        const { data: assignedPrograms, error: programsError } = await supabase
          .from("program_assignments")
          .select(
            `
            id,
            start_date,
            status,
            program_id,
            coach_id,
            name,
            description,
            duration_weeks
          `
          )
          .eq("client_id", clientId)
          .order("created_at", { ascending: false });

        console.log(
          "🔍 Client Workouts - Assigned programs:",
          assignedPrograms,
          programsError
        );

        if (assignedError) {
          console.error("Error loading assigned workouts:", assignedError);
        }

        const allAssignments = [];

        // Process workout assignments
        if (assignedWorkouts) {
          const workoutsWithDetails = await Promise.all(
            assignedWorkouts.map(async (assignment) => {
              console.log("🔎 Processing workout assignment:", assignment);
              let templateSnapshot =
                assignment.name || assignment.description
                  ? {
                      id: assignment.workout_template_id,
                      name: assignment.name,
                      description: assignment.description,
                    }
                  : null;

              if (!templateSnapshot) {
                // Client sessions can't read coach templates (RLS), so fall back to the snapshot columns.
                templateSnapshot = {
                  id: assignment.workout_template_id,
                  name: "Workout",
                  description: null,
                };
              }

              const { data: coach } = await supabase
                .from("profiles")
                .select("first_name, last_name")
                .eq("id", assignment.coach_id)
                .maybeSingle();

              return {
                ...assignment,
                type: "workout",
                workout_templates: templateSnapshot,
                profiles: coach,
              };
            })
          );
          allAssignments.push(...workoutsWithDetails);
        }

        // Process program assignments
        if (assignedPrograms) {
          const programsWithDetails = await Promise.all(
            assignedPrograms.map(async (assignment) => {
              console.log("🔎 Processing program assignment:", assignment);
              let programSnapshot =
                assignment.name || assignment.description
                  ? {
                      id: assignment.program_id,
                      name: assignment.name,
                      description: assignment.description,
                      duration_weeks: assignment.duration_weeks,
                    }
                  : null;

              if (!programSnapshot) {
                // Client sessions can't read coach programs (RLS), so rely on assignment snapshot data.
                programSnapshot = {
                  id: assignment.program_id,
                  name: "Program",
                  description: null,
                  duration_weeks: assignment.duration_weeks,
                };
              }

              const { data: coach } = await supabase
                .from("profiles")
                .select("first_name, last_name")
                .eq("id", assignment.coach_id)
                .maybeSingle();

              return {
                ...assignment,
                type: "program",
                workout_templates: programSnapshot
                  ? {
                      id: programSnapshot.id,
                      name: programSnapshot.name,
                      description: programSnapshot.description,
                      duration_weeks: programSnapshot.duration_weeks,
                    }
                  : null,
                profiles: coach,
              };
            })
          );
          allAssignments.push(...programsWithDetails);
        }

        console.log(
          "🔍 Client Workouts - All assignments (workouts + programs):",
          allAssignments
        );
        setAllAssignedWorkouts(allAssignments);
      } catch (error) {
        console.log("Error loading assigned workouts/programs:", error);
        setAllAssignedWorkouts([]);
      }
    } catch (error) {
      console.error("Error loading workout data:", error);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadWorkoutData().catch((error) => {
      console.error("Error loading workout data:", error);
    });
  }, [loadWorkoutData]);

  const startWorkout = async (workout: DailyWorkout) => {
    if (!workout.templateId) return;

    try {
      // Find the active assignment for this client and template
      const { data: assignment, error } = await supabase
        .from("workout_assignments")
        .select("id")
        .eq("client_id", clientId)
        .eq("workout_template_id", workout.templateId)
        .in("status", ["assigned", "active"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (assignment) {
        router.push(`/client/workouts/${assignment.id}/start`);
      } else {
        // Fallback to template ID if no assignment found
        router.push(`/client/workouts/${workout.templateId}/start`);
      }
    } catch (error) {
      console.error("Error finding assignment:", error);
      // Fallback to template ID
      router.push(`/client/workouts/${workout.templateId}/start`);
    }
  };

  const showExerciseAlternatives = async (exerciseId: string) => {
    try {
      const alternatives = await WorkoutTemplateService.getExerciseAlternatives(
        exerciseId
      );
      setSelectedExerciseAlternatives(alternatives);
      setShowAlternatives(exerciseId);
    } catch (error) {
      console.error("Error loading exercise alternatives:", error);
    }
  };

  const swapExercise = (
    originalExerciseId: string,
    alternativeExerciseId: string
  ) => {
    // Implementation for swapping exercises in the workout
    // This would update the current workout with the alternative exercise
    console.log(
      "Swapping exercise:",
      originalExerciseId,
      "with:",
      alternativeExerciseId
    );
    setShowAlternatives(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (dateString === today.toISOString().split("T")[0]) {
      return "Today";
    } else if (dateString === tomorrow.toISOString().split("T")[0]) {
      return "Tomorrow";
    } else {
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    }
  };

  const getMotivationalMessage = () => {
    const messages = [
      "You're crushing your fitness goals! 💪",
      "Every workout brings you closer to your best self! 🌟",
      "Your consistency is paying off! Keep it up! 🔥",
      "Transform your body, transform your life! ⚡",
      "The only bad workout is the one you didn't do! 🏆",
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${theme.background}`}>
        <div className="animate-pulse p-4">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="h-8 bg-slate-200 rounded mb-2"></div>
              <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-48 bg-slate-200 rounded-2xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}
      <div
        style={{
          minHeight: "100vh",
          paddingBottom: "100px",
        }}
      >
        <div style={{ padding: "24px 20px" }}>
          <div
            className="max-w-4xl mx-auto"
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
            {/* Mobile-Optimized Header */}
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div className="flex items-center justify-center gap-3 mb-2">
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "18px",
                    background:
                      "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                  }}
                >
                  <Dumbbell
                    style={{ width: "40px", height: "40px", color: "#FFFFFF" }}
                  />
                </div>
                <h1
                  style={{
                    fontSize: "32px",
                    fontWeight: "800",
                    color: "#1A1A1A",
                    lineHeight: "1.2",
                    margin: "0",
                  }}
                >
                  My Workouts
                </h1>
              </div>
              <p
                style={{
                  fontSize: "16px",
                  fontWeight: "400",
                  color: "#6B7280",
                  marginTop: "8px",
                }}
              >
                Ready to crush your goals? 💪
              </p>
            </div>

            {/* PRIORITY 1: Today's Workout - Main Focus */}
            {todaysWorkout?.hasWorkout ? (
              <Card
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: "24px",
                  padding: "0",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                  marginBottom: "20px",
                  border: "none",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {/* Subtle decorative elements */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 to-purple-50/30 dark:from-indigo-900/20 dark:to-purple-900/20"></div>

                <CardHeader
                  style={{
                    padding: "24px",
                    paddingBottom: "12px",
                    position: "relative",
                    zIndex: 10,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center" style={{ gap: "16px" }}>
                      <div
                        style={{
                          width: "56px",
                          height: "56px",
                          borderRadius: "18px",
                          background:
                            "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                        }}
                      >
                        <Zap
                          style={{
                            width: "32px",
                            height: "32px",
                            color: "#FFFFFF",
                          }}
                        />
                      </div>
                      <div>
                        <span
                          style={{
                            fontSize: "20px",
                            fontWeight: "700",
                            color: "#1A1A1A",
                            display: "block",
                          }}
                        >
                          Today&apos;s Workout
                        </span>
                        <div
                          className="flex items-center"
                          style={{ gap: "8px", marginTop: "4px" }}
                        >
                          <Sparkles
                            style={{
                              width: "16px",
                              height: "16px",
                              color: "#FFE082",
                            }}
                          />
                          <span
                            style={{
                              fontSize: "14px",
                              fontWeight: "400",
                              color: "#6B7280",
                            }}
                          >
                            Week {todaysWorkout.weekNumber} • Day{" "}
                            {todaysWorkout.programDay}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={loadWorkoutData}
                      style={{
                        padding: "12px",
                        borderRadius: "16px",
                        color: "#6B7280",
                      }}
                    >
                      <RefreshCcw style={{ width: "20px", height: "20px" }} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent
                  style={{
                    padding: "24px",
                    paddingTop: "0",
                    position: "relative",
                    zIndex: 10,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "24px",
                    }}
                  >
                    <div style={{ textAlign: "center" }}>
                      <h2
                        style={{
                          fontSize: "32px",
                          fontWeight: "800",
                          color: "#1A1A1A",
                          lineHeight: "1.2",
                          marginBottom: "12px",
                        }}
                      >
                        {todaysWorkout.templateName}
                      </h2>
                      <p
                        style={{
                          fontSize: "16px",
                          fontWeight: "400",
                          color: "#6B7280",
                          lineHeight: "1.5",
                        }}
                      >
                        {todaysWorkout.templateDescription}
                      </p>
                    </div>

                    {/* Stat cards */}
                    <div className="grid grid-cols-3" style={{ gap: "12px" }}>
                      <div
                        style={{
                          backgroundColor: "#FFFFFF",
                          borderRadius: "24px",
                          padding: "24px",
                          textAlign: "center",
                          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        <div
                          style={{
                            width: "56px",
                            height: "56px",
                            borderRadius: "18px",
                            background:
                              "linear-gradient(135deg, #2196F3 0%, #64B5F6 100%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginBottom: "8px",
                          }}
                        >
                          <Clock
                            style={{
                              width: "32px",
                              height: "32px",
                              color: "#FFFFFF",
                            }}
                          />
                        </div>
                        <div
                          style={{
                            fontSize: "40px",
                            fontWeight: "800",
                            color: "#1A1A1A",
                            lineHeight: "1.1",
                          }}
                        >
                          {todaysWorkout.estimatedDuration}
                        </div>
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: "400",
                            color: "#6B7280",
                          }}
                        >
                          min
                        </div>
                      </div>
                      <div
                        style={{
                          backgroundColor: "#FFFFFF",
                          borderRadius: "24px",
                          padding: "24px",
                          textAlign: "center",
                          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        <div
                          style={{
                            width: "56px",
                            height: "56px",
                            borderRadius: "18px",
                            background:
                              "linear-gradient(135deg, #4CAF50 0%, #81C784 100%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginBottom: "8px",
                          }}
                        >
                          <Dumbbell
                            style={{
                              width: "32px",
                              height: "32px",
                              color: "#FFFFFF",
                            }}
                          />
                        </div>
                        <div
                          style={{
                            fontSize: "40px",
                            fontWeight: "800",
                            color: "#1A1A1A",
                            lineHeight: "1.1",
                          }}
                        >
                          {todaysWorkout.exercises?.length || 0}
                        </div>
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: "400",
                            color: "#6B7280",
                          }}
                        >
                          exercises
                        </div>
                      </div>
                      <div
                        style={{
                          backgroundColor: "#FFFFFF",
                          borderRadius: "24px",
                          padding: "24px",
                          textAlign: "center",
                          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        <div
                          style={{
                            width: "56px",
                            height: "56px",
                            borderRadius: "18px",
                            background:
                              "linear-gradient(135deg, #F093FB 0%, #F5576C 100%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginBottom: "8px",
                          }}
                        >
                          <Target
                            style={{
                              width: "32px",
                              height: "32px",
                              color: "#FFFFFF",
                            }}
                          />
                        </div>
                        <div
                          style={{
                            fontSize: "18px",
                            fontWeight: "600",
                            color: "#1A1A1A",
                            lineHeight: "1.1",
                            textTransform: "capitalize",
                          }}
                        >
                          {todaysWorkout.difficultyLevel}
                        </div>
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: "400",
                            color: "#6B7280",
                          }}
                        >
                          level
                        </div>
                      </div>
                    </div>

                    {/* PRIORITY: Start Workout Button - Most Important */}
                    <Button
                      onClick={() => startWorkout(todaysWorkout)}
                      style={{
                        width: "100%",
                        backgroundColor: "#6C5CE7",
                        color: "#FFFFFF",
                        fontSize: "16px",
                        fontWeight: "600",
                        padding: "16px 32px",
                        borderRadius: "20px",
                        border: "none",
                        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "12px",
                      }}
                    >
                      <Play style={{ width: "24px", height: "24px" }} />
                      Start Workout
                    </Button>

                    {/* Full Exercise Details - Enhanced */}
                    {todaysWorkout.exercises &&
                      todaysWorkout.exercises.length > 0 && (
                        <div className="bg-slate-100/80 dark:bg-slate-700/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-slate-200/50 dark:border-slate-600/50">
                          <div className="p-3 sm:p-4">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-slate-700 dark:text-slate-200 font-semibold text-sm sm:text-base">
                                Workout Details (
                                {todaysWorkout.exercises.length} exercises)
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  router.push(
                                    `/client/workouts/${todaysWorkout.templateId}/details`
                                  )
                                }
                                className="text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-600/50 p-2 rounded-lg text-xs"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View Full Details
                              </Button>
                            </div>
                          </div>
                          <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-2 sm:space-y-3 max-h-96 overflow-y-auto">
                            {todaysWorkout.exercises.map((exercise, index) => {
                              const isExpanded = expandedExercises.has(
                                exercise.id
                              );

                              return (
                                <div
                                  key={exercise.id}
                                  className="bg-white/60 dark:bg-slate-600/60 rounded-lg sm:rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-500/50"
                                >
                                  {/* Exercise Header - Always Visible */}
                                  <div
                                    className="flex items-center justify-between p-2 sm:p-3 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-500/30 rounded-lg sm:rounded-xl transition-colors"
                                    onClick={() =>
                                      toggleExerciseExpanded(exercise.id)
                                    }
                                  >
                                    <div className="flex items-center gap-2 sm:gap-3">
                                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg sm:rounded-xl flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-sm">
                                        {index + 1}
                                      </div>
                                      <div>
                                        <div className="text-slate-800 dark:text-white font-semibold text-xs sm:text-sm">
                                          {exercise.name}
                                        </div>
                                        <div className="text-slate-600 dark:text-slate-300 text-xs">
                                          {(() => {
                                            // Handle different exercise types and data scenarios
                                            if (
                                              exercise.reps &&
                                              Number(exercise.reps) > 0
                                            ) {
                                              return `${exercise.sets} × ${
                                                exercise.reps
                                              }${
                                                (exercise as any).weight &&
                                                (exercise as any).weight > 0
                                                  ? ` @ ${
                                                      (exercise as any).weight
                                                    }kg`
                                                  : ""
                                              }`;
                                            } else if (
                                              exercise.sets &&
                                              exercise.sets > 0
                                            ) {
                                              return `${exercise.sets} sets${
                                                (exercise as any).weight &&
                                                (exercise as any).weight > 0
                                                  ? ` @ ${
                                                      (exercise as any).weight
                                                    }kg`
                                                  : ""
                                              }`;
                                            } else if (
                                              (exercise as any).weight &&
                                              (exercise as any).weight > 0
                                            ) {
                                              return `Weight: ${
                                                (exercise as any).weight
                                              }kg`;
                                            } else {
                                              return "Tap to view details";
                                            }
                                          })()}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          showExerciseAlternatives(
                                            exercise.exerciseId
                                          );
                                        }}
                                        className="text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-500/50 p-1 sm:p-2 rounded-lg text-xs"
                                        title="Alternatives"
                                      >
                                        <Shuffle className="w-3 h-3 sm:w-4 sm:h-4" />
                                      </Button>
                                      <div
                                        className={`transform transition-transform duration-200 ${
                                          isExpanded ? "rotate-180" : ""
                                        }`}
                                      >
                                        <svg
                                          className="w-4 h-4 text-slate-600 dark:text-slate-300"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M19 9l-7 7-7-7"
                                          />
                                        </svg>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Expandable Content */}
                                  {isExpanded && (
                                    <div className="px-2 sm:px-3 pb-2 sm:pb-3 border-t border-slate-200/50 dark:border-slate-500/50 mt-2 pt-2">
                                      <div className="space-y-2">
                                        {(() => {
                                          // Render detailed information based on exercise type
                                          const exerciseType = exercise.name;

                                          if (exerciseType === "Giant Set") {
                                            return (
                                              <div className="text-xs text-slate-600 dark:text-slate-300">
                                                <div className="font-medium mb-2">
                                                  Giant Set Format:
                                                </div>
                                                <div className="mb-2">
                                                  • Complete all exercises
                                                  before resting
                                                </div>
                                                <div className="mb-2">
                                                  • {exercise.sets} rounds total
                                                </div>
                                                <div className="mb-3">
                                                  • Rest:{" "}
                                                  {
                                                    (exercise as any)
                                                      .rest_seconds
                                                  }
                                                  s between rounds
                                                </div>

                                                {/* Individual exercises in Giant Set */}
                                                <div className="space-y-2">
                                                  <div className="font-medium">
                                                    Exercises in this Giant Set:
                                                  </div>
                                                  {(
                                                    exercise as any
                                                  ).notes_data?.giant_set_exercises?.map(
                                                    (
                                                      ex: any,
                                                      exIndex: number
                                                    ) => {
                                                      const exerciseDetail = (
                                                        exercise as any
                                                      ).exercise_details?.find(
                                                        (ed: any) =>
                                                          ed.id ===
                                                          ex.exercise_id
                                                      );
                                                      return (
                                                        <div
                                                          key={exIndex}
                                                          className="flex items-center justify-between bg-slate-50 dark:bg-slate-700 rounded-lg p-2"
                                                        >
                                                          <div className="flex-1">
                                                            <div className="font-medium">
                                                              {exerciseDetail?.name ||
                                                                `Exercise ${
                                                                  exIndex + 1
                                                                }`}
                                                            </div>
                                                            <div className="text-xs text-slate-500">
                                                              {ex.reps} reps
                                                            </div>
                                                          </div>
                                                          <div className="flex gap-1">
                                                            {exerciseDetail?.video_url && (
                                                              <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() =>
                                                                  window.open(
                                                                    exerciseDetail.video_url,
                                                                    "_blank"
                                                                  )
                                                                }
                                                                className="text-xs px-2 py-1 h-6"
                                                              >
                                                                <Video className="w-3 h-3" />
                                                              </Button>
                                                            )}
                                                            <Button
                                                              size="sm"
                                                              variant="outline"
                                                              onClick={() =>
                                                                showExerciseAlternatives(
                                                                  ex.exercise_id
                                                                )
                                                              }
                                                              className="text-xs px-2 py-1 h-6"
                                                            >
                                                              <RefreshCcw className="w-3 h-3" />
                                                            </Button>
                                                          </div>
                                                        </div>
                                                      );
                                                    }
                                                  ) || (
                                                    <div className="text-slate-500">
                                                      Exercise details not
                                                      available
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          } else if (
                                            exerciseType === "Superset"
                                          ) {
                                            return (
                                              <div className="text-xs text-slate-600 dark:text-slate-300">
                                                <div className="font-medium mb-2">
                                                  Superset Format:
                                                </div>
                                                <div className="mb-2">
                                                  • Exercise A → Exercise B →
                                                  Rest
                                                </div>
                                                <div className="mb-2">
                                                  • {exercise.sets} supersets
                                                  total
                                                </div>
                                                <div className="mb-3">
                                                  • Rest:{" "}
                                                  {
                                                    (exercise as any)
                                                      .rest_seconds
                                                  }
                                                  s between supersets
                                                </div>

                                                {/* Individual exercises in Superset */}
                                                <div className="space-y-2">
                                                  <div className="font-medium">
                                                    Exercises in this Superset:
                                                  </div>
                                                  {/* Exercise A (current exercise) */}
                                                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700 rounded-lg p-2">
                                                    <div className="flex-1">
                                                      <div className="font-medium">
                                                        {(exercise as any)
                                                          .exercise_name ||
                                                          (exercise as any)
                                                            .exercise?.name ||
                                                          "Exercise A"}
                                                      </div>
                                                      <div className="text-xs text-slate-500">
                                                        {(exercise as any)
                                                          .notes_data
                                                          ?.exercise_a ||
                                                          exercise.reps}{" "}
                                                        reps
                                                      </div>
                                                    </div>
                                                    <div className="flex gap-1">
                                                      <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                          showExerciseAlternatives(
                                                            exercise.exerciseId ||
                                                              (exercise as any)
                                                                .exercise_id
                                                          )
                                                        }
                                                        className="text-xs px-2 py-1 h-6"
                                                      >
                                                        <RefreshCcw className="w-3 h-3" />
                                                      </Button>
                                                    </div>
                                                  </div>
                                                  {/* Exercise B (superset partner) */}
                                                  {(exercise as any).notes_data
                                                    ?.superset_exercise_id && (
                                                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700 rounded-lg p-2">
                                                      <div className="flex-1">
                                                        <div className="font-medium">
                                                          {(
                                                            exercise as any
                                                          ).exercise_details?.find(
                                                            (ed: any) =>
                                                              ed.id ===
                                                              (exercise as any)
                                                                .notes_data
                                                                .superset_exercise_id
                                                          )?.name ||
                                                            "Exercise B"}
                                                        </div>
                                                        <div className="text-xs text-slate-500">
                                                          {(exercise as any)
                                                            .notes_data
                                                            ?.exercise_b ||
                                                            "N/A"}{" "}
                                                          reps
                                                        </div>
                                                      </div>
                                                      <div className="flex gap-1">
                                                        {(
                                                          exercise as any
                                                        ).exercise_details?.find(
                                                          (ed: any) =>
                                                            ed.id ===
                                                            (exercise as any)
                                                              .notes_data
                                                              .superset_exercise_id
                                                        )?.video_url && (
                                                          <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                              window.open(
                                                                (
                                                                  exercise as any
                                                                ).exercise_details.find(
                                                                  (ed: any) =>
                                                                    ed.id ===
                                                                    (
                                                                      exercise as any
                                                                    ).notes_data
                                                                      .superset_exercise_id
                                                                ).video_url,
                                                                "_blank"
                                                              )
                                                            }
                                                            className="text-xs px-2 py-1 h-6"
                                                          >
                                                            <Video className="w-3 h-3" />
                                                          </Button>
                                                        )}
                                                        <Button
                                                          size="sm"
                                                          variant="outline"
                                                          onClick={() =>
                                                            showExerciseAlternatives(
                                                              (exercise as any)
                                                                .notes_data
                                                                .superset_exercise_id
                                                            )
                                                          }
                                                          className="text-xs px-2 py-1 h-6"
                                                        >
                                                          <RefreshCcw className="w-3 h-3" />
                                                        </Button>
                                                      </div>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          } else if (
                                            exerciseType === "Circuit"
                                          ) {
                                            return (
                                              <div className="text-xs text-slate-600 dark:text-slate-300">
                                                <div className="font-medium mb-2">
                                                  Circuit Format:
                                                </div>
                                                <div className="mb-2">
                                                  • Complete all exercises in
                                                  sequence
                                                </div>
                                                <div className="mb-2">
                                                  • {exercise.sets} rounds total
                                                </div>
                                                <div className="mb-3">
                                                  • Rest:{" "}
                                                  {
                                                    (exercise as any)
                                                      .rest_seconds
                                                  }
                                                  s between rounds
                                                </div>

                                                {/* Individual exercises in Circuit */}
                                                <div className="space-y-2">
                                                  <div className="font-medium">
                                                    Exercises in this Circuit:
                                                  </div>
                                                  {(
                                                    exercise as any
                                                  ).notes_data?.circuit_sets?.map(
                                                    (
                                                      ex: any,
                                                      exIndex: number
                                                    ) => {
                                                      const exerciseDetail = (
                                                        exercise as any
                                                      ).exercise_details?.find(
                                                        (ed: any) =>
                                                          ed.id ===
                                                          ex.exercise_id
                                                      );
                                                      return (
                                                        <div
                                                          key={exIndex}
                                                          className="flex items-center justify-between bg-slate-50 dark:bg-slate-700 rounded-lg p-2"
                                                        >
                                                          <div className="flex-1">
                                                            <div className="font-medium">
                                                              {exerciseDetail?.name ||
                                                                `Exercise ${
                                                                  exIndex + 1
                                                                }`}
                                                            </div>
                                                            <div className="text-xs text-slate-500">
                                                              {ex.reps ||
                                                                "AMRAP"}{" "}
                                                              reps
                                                            </div>
                                                          </div>
                                                          <div className="flex gap-1">
                                                            {exerciseDetail?.video_url && (
                                                              <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() =>
                                                                  window.open(
                                                                    exerciseDetail.video_url,
                                                                    "_blank"
                                                                  )
                                                                }
                                                                className="text-xs px-2 py-1 h-6"
                                                              >
                                                                <Video className="w-3 h-3" />
                                                              </Button>
                                                            )}
                                                            <Button
                                                              size="sm"
                                                              variant="outline"
                                                              onClick={() =>
                                                                showExerciseAlternatives(
                                                                  ex.exercise_id
                                                                )
                                                              }
                                                              className="text-xs px-2 py-1 h-6"
                                                            >
                                                              <RefreshCcw className="w-3 h-3" />
                                                            </Button>
                                                          </div>
                                                        </div>
                                                      );
                                                    }
                                                  ) || (
                                                    <div className="text-slate-500">
                                                      Exercise details not
                                                      available
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          } else if (exerciseType === "AMRAP") {
                                            return (
                                              <div className="text-xs text-slate-600 dark:text-slate-300">
                                                <div className="font-medium mb-1">
                                                  AMRAP Format:
                                                </div>
                                                <div>
                                                  • As Many Rounds As Possible
                                                </div>
                                                <div>
                                                  • Duration:{" "}
                                                  {exercise.reps || 10} minutes
                                                </div>
                                                <div>
                                                  • Rest:{" "}
                                                  {
                                                    (exercise as any)
                                                      .rest_seconds
                                                  }
                                                  s between exercises
                                                </div>
                                              </div>
                                            );
                                          } else if (
                                            exerciseType === "Tabata"
                                          ) {
                                            return (
                                              <div className="text-xs text-slate-600 dark:text-slate-300">
                                                <div className="font-medium mb-1">
                                                  Tabata Format:
                                                </div>
                                                <div>• 20s work, 10s rest</div>
                                                <div>
                                                  • {exercise.sets} rounds total
                                                </div>
                                                <div>
                                                  • High intensity interval
                                                  training
                                                </div>
                                              </div>
                                            );
                                          } else if (
                                            exerciseType === "Drop Set"
                                          ) {
                                            return (
                                              <div className="text-xs text-slate-600 dark:text-slate-300">
                                                <div className="font-medium mb-1">
                                                  Drop Set Format:
                                                </div>
                                                <div>
                                                  • Reduce weight after each set
                                                </div>
                                                <div>
                                                  • {exercise.sets} drop sets
                                                  total
                                                </div>
                                                <div>
                                                  • Rest:{" "}
                                                  {
                                                    (exercise as any)
                                                      .rest_seconds
                                                  }
                                                  s between sets
                                                </div>
                                              </div>
                                            );
                                          } else {
                                            // Straight Set or other single exercise types
                                            return (
                                              <div className="text-xs text-slate-600 dark:text-slate-300">
                                                <div className="font-medium mb-1">
                                                  Exercise Details:
                                                </div>
                                                <div>
                                                  • Sets: {exercise.sets}
                                                </div>
                                                <div>
                                                  • Reps:{" "}
                                                  {Number(exercise.reps) > 0
                                                    ? exercise.reps
                                                    : "To failure"}
                                                </div>
                                                <div>
                                                  • Rest:{" "}
                                                  {
                                                    (exercise as any)
                                                      .rest_seconds
                                                  }
                                                  s between sets
                                                </div>
                                                {(exercise as any).weight >
                                                  0 && (
                                                  <div>
                                                    • Weight:{" "}
                                                    {(exercise as any).weight}
                                                    kg
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          }
                                        })()}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 border-0 shadow-xl rounded-2xl sm:rounded-3xl overflow-hidden">
                <CardContent className="p-8 sm:p-16 text-center">
                  {todaysWorkout?.weekCompleted ? (
                    <>
                      <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8">
                        <Trophy className="w-8 h-8 sm:w-12 sm:h-12 text-white" />
                      </div>
                      <h3 className="text-xl sm:text-2xl font-semibold text-slate-800 dark:text-white mb-3 sm:mb-4">
                        Week {todaysWorkout.currentWeek} Complete! 🎉
                      </h3>
                      <p className="text-slate-600 dark:text-slate-300 text-lg sm:text-xl mb-4">
                        {todaysWorkout.message ||
                          "The work is done for the week! You have completed all workouts, recharge your batteries and be prepared to crush next week!"}
                      </p>
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 sm:p-6 rounded-2xl border border-green-200 dark:border-green-800">
                        <p className="text-slate-800 dark:text-white text-sm sm:text-base">
                          🏆 Amazing work this week! Your dedication is paying
                          off. Take this time to recover, stay hydrated, and get
                          ready for another week of progress.
                        </p>
                      </div>
                    </>
                  ) : todaysWorkout?.message?.includes("No active program") ? (
                    <>
                      <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8">
                        <Target className="w-8 h-8 sm:w-12 sm:h-12 text-white" />
                      </div>
                      <h3 className="text-xl sm:text-2xl font-semibold text-slate-800 dark:text-white mb-3 sm:mb-4">
                        Ready to Get Started? 💪
                      </h3>
                      <p className="text-slate-600 dark:text-slate-300 text-lg sm:text-xl mb-4">
                        No active program assigned. Contact your coach to get
                        started with your fitness journey!
                      </p>
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 sm:p-6 rounded-2xl border border-blue-200 dark:border-blue-800">
                        <p className="text-slate-800 dark:text-white text-sm sm:text-base">
                          🎯 Your coach will create a personalized workout
                          program just for you. Once assigned, you&apos;ll see
                          your daily workouts here!
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8">
                        <Calendar className="w-8 h-8 sm:w-12 sm:h-12 text-slate-500 dark:text-slate-400" />
                      </div>
                      <h3 className="text-xl sm:text-2xl font-semibold text-slate-800 dark:text-white mb-3 sm:mb-4">
                        Rest Day
                      </h3>
                      <p className="text-slate-600 dark:text-slate-300 text-lg sm:text-xl mb-4">
                        {getMotivationalMessage()}
                      </p>
                      <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
                        Check back tomorrow for your next workout.
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* SECONDARY FEATURES - Below main workout */}

            {/* Quick Stats */}
            <div className="grid grid-cols-3" style={{ gap: "12px" }}>
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: "24px",
                  padding: "24px",
                  textAlign: "center",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "18px",
                    background:
                      "linear-gradient(135deg, #F093FB 0%, #F5576C 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "8px",
                  }}
                >
                  <Flame
                    style={{ width: "32px", height: "32px", color: "#FFFFFF" }}
                  />
                </div>
                <div
                  style={{
                    fontSize: "40px",
                    fontWeight: "800",
                    color: "#1A1A1A",
                    lineHeight: "1.1",
                  }}
                >
                  7
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "400",
                    color: "#6B7280",
                  }}
                >
                  Day Streak
                </div>
              </div>
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: "24px",
                  padding: "24px",
                  textAlign: "center",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "18px",
                    background:
                      "linear-gradient(135deg, #4CAF50 0%, #81C784 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "8px",
                  }}
                >
                  <Trophy
                    style={{ width: "32px", height: "32px", color: "#FFFFFF" }}
                  />
                </div>
                <div
                  style={{
                    fontSize: "40px",
                    fontWeight: "800",
                    color: "#1A1A1A",
                    lineHeight: "1.1",
                  }}
                >
                  12
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "400",
                    color: "#6B7280",
                  }}
                >
                  This Month
                </div>
              </div>
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: "24px",
                  padding: "24px",
                  textAlign: "center",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "18px",
                    background:
                      "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "8px",
                  }}
                >
                  <TrendingUp
                    style={{ width: "32px", height: "32px", color: "#FFFFFF" }}
                  />
                </div>
                <div
                  style={{
                    fontSize: "40px",
                    fontWeight: "800",
                    color: "#1A1A1A",
                    lineHeight: "1.1",
                  }}
                >
                  85%
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "400",
                    color: "#6B7280",
                  }}
                >
                  Success Rate
                </div>
              </div>
            </div>

            {/* Current Program Status - Collapsible */}
            {currentProgram && (
              <details className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-900/20 dark:via-teal-900/20 dark:to-cyan-900/20 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-emerald-200/50 dark:border-emerald-700/50 shadow-lg">
                <summary className="p-4 sm:p-6 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                        <Award className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <div>
                        <span className="font-bold text-emerald-800 dark:text-emerald-200 text-sm sm:text-lg">
                          Current Program
                        </span>
                        <p className="text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
                          {currentProgram.name}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0 px-3 sm:px-4 py-1 sm:py-2 text-xs sm:text-base font-bold">
                      Week {currentProgram.current_week} of{" "}
                      {currentProgram.total_weeks}
                    </Badge>
                  </div>
                </summary>
                <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4">
                  <div className="bg-white/50 dark:bg-slate-800/50 p-4 sm:p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                          </div>
                          <div>
                            <span className="text-sm sm:text-lg font-bold text-slate-800 dark:text-white">
                              {currentProgram.progress_percentage}%
                            </span>
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                              Complete
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                          Coached by
                        </p>
                        <p className="font-bold text-slate-800 dark:text-white text-xs sm:text-sm">
                          {currentProgram.coach_name}
                        </p>
                      </div>
                    </div>

                    <div className="relative">
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 sm:h-4 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 h-2 sm:h-4 rounded-full transition-all duration-1000 ease-out shadow-lg"
                          style={{
                            width: `${currentProgram.progress_percentage}%`,
                          }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                        </div>
                      </div>
                      <div className="flex justify-between mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                        <span>Started</span>
                        <span className="font-bold">
                          {currentProgram.progress_percentage}% Complete
                        </span>
                        <span>Goal</span>
                      </div>
                    </div>
                  </div>
                </div>
              </details>
            )}

            {/* Upcoming Workouts */}
            {upcomingWorkouts.length > 0 && (
              <Card
                className={`${theme.card} ${theme.shadow} rounded-3xl overflow-hidden`}
              >
                <CardHeader className="p-8 border-b border-slate-200 dark:border-slate-700">
                  <CardTitle className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                      <CalendarIcon className="w-5 h-5 text-white" />
                    </div>
                    <span className={`text-2xl font-bold ${theme.text}`}>
                      Upcoming Workouts
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {upcomingWorkouts.slice(0, 6).map((workout, index) => {
                      const workoutDate = new Date();
                      workoutDate.setDate(workoutDate.getDate() + index + 1);
                      const dateString = workoutDate
                        .toISOString()
                        .split("T")[0];

                      return (
                        <Card
                          key={index}
                          className={`${theme.card} border-2 border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 transition-all duration-300 rounded-2xl`}
                        >
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <Badge
                                variant="outline"
                                className="border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-3 py-1"
                              >
                                {formatDate(dateString)}
                              </Badge>
                              <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 px-3 py-1">
                                Week {workout.weekNumber} • Day{" "}
                                {workout.programDay}
                              </Badge>
                            </div>
                            <h4
                              className={`font-bold text-lg mb-3 truncate ${theme.text}`}
                            >
                              {workout.templateName}
                            </h4>
                            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mb-4">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span>{workout.estimatedDuration}m</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Dumbbell className="w-4 h-4" />
                                <span>{workout.exercises?.length || 0}</span>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full rounded-xl border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                              onClick={() => {
                                // Preview workout logic
                                console.log("Preview workout:", workout);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Preview
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Workout History */}
            {workoutHistory.length > 0 && (
              <Card
                className={`${theme.card} ${theme.shadow} rounded-3xl overflow-hidden`}
              >
                <CardHeader className="p-8 border-b border-slate-200 dark:border-slate-700">
                  <CardTitle className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <span className={`text-2xl font-bold ${theme.text}`}>
                      Recent Workouts
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="space-y-4">
                    {workoutHistory.slice(0, 5).map((workout, index) => {
                      const workoutDate = new Date();
                      workoutDate.setDate(workoutDate.getDate() - index - 1);
                      const dateString = workoutDate
                        .toISOString()
                        .split("T")[0];
                      const isCompleted = (
                        workout as DailyWorkout & { completed: boolean }
                      ).completed;

                      return (
                        <div
                          key={index}
                          className={`flex items-center gap-6 p-6 rounded-2xl ${
                            isCompleted
                              ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                              : "bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              isCompleted
                                ? "bg-green-100 dark:bg-green-800"
                                : "bg-slate-100 dark:bg-slate-700"
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                            ) : (
                              <AlertCircle className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h4
                              className={`font-bold text-lg mb-2 ${
                                isCompleted
                                  ? "text-green-900 dark:text-green-100"
                                  : theme.text
                              }`}
                            >
                              {workout.templateName}
                            </h4>
                            <div className="flex items-center gap-4 text-base text-slate-500 dark:text-slate-400">
                              <span>{formatDate(dateString)}</span>
                              <span>
                                Week {workout.weekNumber} • Day{" "}
                                {workout.programDay}
                              </span>
                              <span>{workout.estimatedDuration}min</span>
                            </div>
                          </div>
                          <Badge
                            className={
                              isCompleted
                                ? "bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300"
                                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-4 py-2"
                            }
                          >
                            {isCompleted ? "Completed" : "Skipped"}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Completed Programs */}
            {completedPrograms.length > 0 && (
              <Card
                className={`${theme.card} ${theme.shadow} rounded-3xl overflow-hidden`}
              >
                <CardHeader className="p-8 border-b border-slate-200 dark:border-slate-700">
                  <CardTitle className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-white" />
                    </div>
                    <span className={`text-2xl font-bold ${theme.text}`}>
                      Completed Programs
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {completedPrograms.map((program) => (
                      <Card
                        key={program.id}
                        className={`${theme.card} border-2 border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 transition-all duration-300 rounded-2xl`}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                              <Trophy className="w-6 h-6 text-white" />
                            </div>
                            <Badge className="bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0 px-3 py-1">
                              {(program as any).completion_percentage ||
                                Math.round(
                                  (program.current_week / program.total_weeks) *
                                    100
                                )}
                              % Complete
                            </Badge>
                          </div>
                          <h4
                            className={`font-bold text-lg mb-2 ${theme.text}`}
                          >
                            {(program as any).program_name || program.name}
                          </h4>
                          <p
                            className={`text-sm ${theme.textSecondary} mb-4 line-clamp-2`}
                          >
                            {(program as any).program_description ||
                              program.description}
                          </p>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className={theme.textSecondary}>
                                Duration:
                              </span>
                              <span className={theme.text}>
                                {program.total_weeks} weeks
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className={theme.textSecondary}>
                                Coach:
                              </span>
                              <span className={theme.text}>
                                {program.coach_name}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className={theme.textSecondary}>
                                Workouts:
                              </span>
                              <span className={theme.text}>
                                {(program as any).total_workouts_completed || 0}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className={theme.textSecondary}>
                                Completed:
                              </span>
                              <span className={theme.text}>
                                {new Date(
                                  (program as any).completed_date || new Date()
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="mt-4">
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className={theme.textSecondary}>
                                Progress
                              </span>
                              <span className={theme.text}>
                                {(program as any).completion_percentage ||
                                  Math.round(
                                    (program.current_week /
                                      program.total_weeks) *
                                      100
                                  )}
                                %
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                                style={{
                                  width: `${
                                    (program as any).completion_percentage ||
                                    Math.round(
                                      (program.current_week /
                                        program.total_weeks) *
                                        100
                                    )
                                  }%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* All Assigned Workouts */}
            {allAssignedWorkouts.length > 0 && (
              <Card
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: "24px",
                  padding: "0",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                  marginBottom: "20px",
                  border: "none",
                  overflow: "hidden",
                }}
              >
                <CardHeader
                  style={{
                    padding: "24px",
                    borderBottom: "1px solid #E5E7EB",
                  }}
                >
                  <CardTitle
                    className="flex items-center"
                    style={{ gap: "16px" }}
                  >
                    <div
                      style={{
                        width: "56px",
                        height: "56px",
                        borderRadius: "18px",
                        background:
                          "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Dumbbell
                        style={{
                          width: "32px",
                          height: "32px",
                          color: "#FFFFFF",
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: "20px",
                        fontWeight: "700",
                        color: "#1A1A1A",
                      }}
                    >
                      All Assigned Workouts
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent style={{ padding: "24px" }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {allAssignedWorkouts.map((assignment) => {
                      const template = assignment.workout_templates;
                      const coach = assignment.profiles;
                      const category = template?.exercise_categories;

                      return (
                        <Card
                          key={assignment.id}
                          style={{
                            backgroundColor: "#FFFFFF",
                            borderRadius: "24px",
                            padding: "0",
                            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                            border: "2px solid #E5E7EB",
                            overflow: "hidden",
                          }}
                        >
                          <CardContent style={{ padding: "24px" }}>
                            {/* Header */}
                            <div
                              className="flex items-center justify-between"
                              style={{ marginBottom: "16px" }}
                            >
                              <div
                                style={{
                                  width: "56px",
                                  height: "56px",
                                  borderRadius: "18px",
                                  background:
                                    "linear-gradient(135deg, #2196F3 0%, #64B5F6 100%)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Dumbbell
                                  style={{
                                    width: "32px",
                                    height: "32px",
                                    color: "#FFFFFF",
                                  }}
                                />
                              </div>
                              <Badge
                                className={`${
                                  assignment.status === "assigned"
                                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                                    : assignment.status === "in_progress"
                                    ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300"
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                                } px-3 py-1`}
                              >
                                {assignment.status === "assigned"
                                  ? "Assigned"
                                  : assignment.status === "in_progress"
                                  ? "In Progress"
                                  : assignment.status}
                              </Badge>
                            </div>

                            {/* Workout/Program Name */}
                            <h4
                              style={{
                                fontSize: "18px",
                                fontWeight: "600",
                                color: "#1A1A1A",
                                marginBottom: "8px",
                              }}
                            >
                              {template?.name ||
                                assignment.name ||
                                (assignment.type === "program"
                                  ? "Program"
                                  : "Workout")}
                            </h4>

                            {/* Type Badge */}
                            <div className="mb-2">
                              <Badge
                                className={`${
                                  assignment.type === "program"
                                    ? "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300"
                                    : "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                                } px-2 py-1 text-xs`}
                              >
                                {assignment.type === "program"
                                  ? "Program"
                                  : "Workout"}
                              </Badge>
                            </div>

                            {/* Description */}
                            {(template?.description ||
                              assignment.description) && (
                              <p
                                style={{
                                  fontSize: "14px",
                                  fontWeight: "400",
                                  color: "#6B7280",
                                  marginBottom: "16px",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                }}
                              >
                                {template?.description ||
                                  assignment.description}
                              </p>
                            )}

                            {/* Details */}
                            <div className="space-y-2 text-sm mb-4">
                              {category && (
                                <div className="flex items-center justify-between">
                                  <span className={theme.textSecondary}>
                                    Category:
                                  </span>
                                  <span className={theme.text}>
                                    {category.name}
                                  </span>
                                </div>
                              )}
                              {template?.difficulty && (
                                <div className="flex items-center justify-between">
                                  <span className={theme.textSecondary}>
                                    Difficulty:
                                  </span>
                                  <Badge className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 capitalize">
                                    {template.difficulty}
                                  </Badge>
                                </div>
                              )}
                              {assignment.type === "program"
                                ? template?.duration_weeks && (
                                    <div className="flex items-center justify-between">
                                      <span className={theme.textSecondary}>
                                        Duration:
                                      </span>
                                      <span className={theme.text}>
                                        {template.duration_weeks} weeks
                                      </span>
                                    </div>
                                  )
                                : template?.duration_minutes && (
                                    <div className="flex items-center justify-between">
                                      <span className={theme.textSecondary}>
                                        Duration:
                                      </span>
                                      <span className={theme.text}>
                                        {template.duration_minutes} min
                                      </span>
                                    </div>
                                  )}
                              {coach && (
                                <div className="flex items-center justify-between">
                                  <span className={theme.textSecondary}>
                                    Coach:
                                  </span>
                                  <span className={theme.text}>
                                    {coach.first_name} {coach.last_name}
                                  </span>
                                </div>
                              )}
                              {(assignment.assigned_date ||
                                assignment.start_date) && (
                                <div className="flex items-center justify-between">
                                  <span className={theme.textSecondary}>
                                    {assignment.type === "program"
                                      ? "Started:"
                                      : "Assigned:"}
                                  </span>
                                  <span className={theme.text}>
                                    {new Date(
                                      assignment.assigned_date ||
                                        assignment.start_date
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex" style={{ gap: "8px" }}>
                              <Button
                                onClick={() => {
                                  if (assignment.type === "program") {
                                    router.push(
                                      `/client/programs/${assignment.program_id}/details`
                                    );
                                  } else {
                                    console.log(
                                      "Navigating to workout details",
                                      {
                                        assignmentId: assignment.id,
                                        templateId:
                                          assignment.workout_template_id,
                                      }
                                    );
                                    router.push(
                                      `/client/workouts/${assignment.id}/details`
                                    );
                                  }
                                }}
                                variant="outline"
                                style={{
                                  flex: 1,
                                  backgroundColor: "#FFFFFF",
                                  color: "#6C5CE7",
                                  fontSize: "16px",
                                  fontWeight: "600",
                                  padding: "16px 32px",
                                  borderRadius: "20px",
                                  border: "2px solid #6C5CE7",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: "8px",
                                }}
                              >
                                <Eye
                                  style={{ width: "20px", height: "20px" }}
                                />
                                View Details
                              </Button>
                              <Button
                                onClick={() => {
                                  if (assignment.type === "program") {
                                    // For programs, we might want to show program details or go to a different page
                                    console.log("Program clicked:", assignment);
                                    // For now, we'll just log it - you can add program-specific navigation later
                                  } else {
                                    router.push(
                                      `/client/workouts/${assignment.id}/start`
                                    );
                                  }
                                }}
                                style={{
                                  flex: 1,
                                  backgroundColor: "#6C5CE7",
                                  color: "#FFFFFF",
                                  fontSize: "16px",
                                  fontWeight: "600",
                                  padding: "16px 32px",
                                  borderRadius: "20px",
                                  border: "none",
                                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: "8px",
                                }}
                              >
                                <Play
                                  style={{ width: "20px", height: "20px" }}
                                />
                                {assignment.type === "program"
                                  ? "View Program"
                                  : "Start Workout"}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Exercise Alternatives Modal */}
            {showAlternatives && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <Card
                  className={`max-w-2xl w-full max-h-[80vh] overflow-hidden ${theme.card} ${theme.shadow} rounded-3xl`}
                >
                  <CardHeader className="border-b border-slate-200 dark:border-slate-700 p-8">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                          <Shuffle className="w-4 h-4 text-white" />
                        </div>
                        <span className={`text-xl font-bold ${theme.text}`}>
                          Exercise Alternatives
                        </span>
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAlternatives(null)}
                        className="p-3 rounded-xl"
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8">
                    {selectedExerciseAlternatives.length > 0 ? (
                      <div className="space-y-6">
                        <p className={`text-base ${theme.textSecondary}`}>
                          Choose an alternative exercise if equipment is
                          unavailable or you prefer a different variation:
                        </p>
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                          {selectedExerciseAlternatives.map((alternative) => (
                            <div
                              key={alternative.id}
                              className={`flex items-center justify-between p-6 border border-slate-200 dark:border-slate-700 rounded-2xl hover:border-blue-300 dark:hover:border-blue-600 transition-colors ${theme.card}`}
                            >
                              <div className="flex-1">
                                <h4
                                  className={`font-semibold text-lg mb-2 ${theme.text}`}
                                >
                                  {alternative.alternative_exercise?.name}
                                </h4>
                                <p
                                  className={`text-base mb-3 ${theme.textSecondary}`}
                                >
                                  {
                                    alternative.alternative_exercise
                                      ?.description
                                  }
                                </p>
                                <div className="flex items-center gap-3">
                                  <Badge
                                    variant="outline"
                                    className="text-sm px-3 py-1"
                                  >
                                    {alternative.reason}
                                  </Badge>
                                  <span
                                    className={`text-sm ${theme.textSecondary}`}
                                  >
                                    {typeof alternative.alternative_exercise
                                      ?.category === "string"
                                      ? alternative.alternative_exercise
                                          .category
                                      : (
                                          alternative.alternative_exercise
                                            ?.category as any
                                        )?.name}
                                  </span>
                                </div>
                              </div>
                              <Button
                                onClick={() =>
                                  swapExercise(
                                    showAlternatives,
                                    alternative.alternative_exercise_id
                                  )
                                }
                                className="ml-6 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3"
                              >
                                <ArrowRight className="w-4 h-4 mr-2" />
                                Use This
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Lightbulb className="w-16 h-16 text-slate-400 dark:text-slate-500 mx-auto mb-6" />
                        <h3
                          className={`font-semibold text-xl mb-3 ${theme.text}`}
                        >
                          No alternatives available
                        </h3>
                        <p className={`text-base ${theme.textSecondary}`}>
                          This exercise doesn&apos;t have any alternatives
                          configured yet.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </AnimatedBackground>
  );
}
