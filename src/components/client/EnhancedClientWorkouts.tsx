"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
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
  Info,
  Layers,
  ChevronRight,
  ChevronDown,
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
  const { user, profile } = useAuth();
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
  const [weeklyProgress, setWeeklyProgress] = useState({ current: 0, goal: 0 });
  const [weeklyStats, setWeeklyStats] = useState({
    totalVolume: 0,
    activeTime: 0,
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [thisWeekAssignments, setThisWeekAssignments] = useState<any[]>([]);

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

      // Load weekly progress
      try {
        const { getDashboardStats } = await import(
          "@/lib/clientDashboardService"
        );
        const stats = await getDashboardStats(clientId);
        setWeeklyProgress(stats.weeklyProgress);

        // Calculate weekly stats (volume and time) from workout logs
        const now = new Date();
        const dayOfWeek = now.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(now);
        monday.setDate(now.getDate() + diffToMonday);
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        const { data: weeklyLogs } = await supabase
          .from("workout_logs")
          .select("id, completed_at, total_duration_minutes")
          .eq("client_id", clientId)
          .not("completed_at", "is", null)
          .gte("completed_at", monday.toISOString())
          .lte("completed_at", sunday.toISOString());

        const activeTime =
          weeklyLogs?.reduce(
            (sum, log) => sum + (log.total_duration_minutes || 0),
            0
          ) || 0;

        // Calculate volume from workout_set_logs
        const logIds = weeklyLogs?.map((log) => log.id) || [];
        let totalVolume = 0;
        if (logIds.length > 0) {
          const { data: setLogs } = await supabase
            .from("workout_set_logs")
            .select("weight, reps")
            .in("workout_log_id", logIds);

          totalVolume =
            setLogs?.reduce(
              (sum, set) => sum + (set.weight || 0) * (set.reps || 0),
              0
            ) || 0;
        }
        setWeeklyStats({ totalVolume: Math.round(totalVolume), activeTime });

        // Load this week's workout assignments
        const mondayStr = monday.toISOString().split("T")[0];
        const sundayStr = sunday.toISOString().split("T")[0];

        const { data: thisWeekAssignmentsData } = await supabase
          .from("workout_assignments")
          .select("id, scheduled_date, name, status, workout_template_id")
          .eq("client_id", clientId)
          .gte("scheduled_date", mondayStr)
          .lte("scheduled_date", sundayStr)
          .order("scheduled_date", { ascending: true });

        // Get workout logs to check completion status
        const assignmentIdsForWeek =
          thisWeekAssignmentsData?.map((a) => a.id) || [];
        const { data: assignmentLogs } = await supabase
          .from("workout_logs")
          .select("workout_assignment_id, completed_at, total_duration_minutes")
          .in("workout_assignment_id", assignmentIdsForWeek)
          .not("completed_at", "is", null);

        // Map assignments with completion status
        const assignmentsWithStatus = (thisWeekAssignmentsData || []).map(
          (assignment) => {
            const log = assignmentLogs?.find(
              (l) => l.workout_assignment_id === assignment.id
            );
            return {
              ...assignment,
              completed: !!log?.completed_at,
              completed_at: log?.completed_at,
              duration_minutes: log?.total_duration_minutes,
            };
          }
        );

        setThisWeekAssignments(assignmentsWithStatus);
      } catch (error) {
        console.log("Error loading weekly stats:", error);
      }
    } catch (error) {
      console.error("Error loading workout data:", error);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  // Fetch avatar URL
  useEffect(() => {
    if (user?.id) {
      (async () => {
        try {
          const { data } = await supabase
            .from("profiles")
            .select("avatar_url")
            .eq("id", user.id)
            .single();
          if (data?.avatar_url) {
            setAvatarUrl(data.avatar_url);
          }
        } catch {
          // Silently fail - avatar is optional
        }
      })();
    }
  }, [user]);

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

  // Quartz card style (faceted quartz surfaces)
  // Using individual border properties instead of shorthand to avoid conflicts with borderLeft
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)";
  const quartzCardStyle: React.CSSProperties = {
    background: isDark
      ? "linear-gradient(165deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 100%)"
      : "linear-gradient(165deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)",
    backdropFilter: "blur(24px) saturate(180%)",
    WebkitBackdropFilter: "blur(24px) saturate(180%)",
    borderTop: `1px solid ${borderColor}`,
    borderRight: `1px solid ${borderColor}`,
    borderBottom: `1px solid ${borderColor}`,
    borderLeft: `1px solid ${borderColor}`,
    borderRadius: "24px",
    position: "relative" as const,
    overflow: "hidden" as const,
    transition: "all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)",
  };

  const getAvatarUrl = () => {
    if (avatarUrl) return avatarUrl;
    if (profile?.first_name) {
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.first_name}&backgroundColor=0A0A0A`;
    }
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${
      user?.id || "User"
    }&backgroundColor=0A0A0A`;
  };

  const weeklyProgressPercent =
    weeklyProgress.goal > 0
      ? Math.min((weeklyProgress.current / weeklyProgress.goal) * 100, 100)
      : 0;

  // Get program week info for subtitle
  const programSubtitle = currentProgram
    ? `${currentProgram.name} • Week ${currentProgram.current_week}`
    : "Training Schedule";

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
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes rotate-shimmer {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse-red {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `,
        }}
      />
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
            {/* Header Section */}
            <header
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "40px",
              }}
            >
              <div>
                <h1
                  style={{
                    fontSize: "30px",
                    fontWeight: 700,
                    lineHeight: "1.25",
                    letterSpacing: "-0.02em",
                    color: isDark ? "#FFFFFF" : "#1A1A1A",
                    margin: 0,
                    marginBottom: "4px",
                  }}
                >
                  Your Workouts
                </h1>
                <p
                  style={{
                    fontSize: "14px",
                    fontWeight: 400,
                    color: isDark ? "rgba(255,255,255,0.5)" : "#6B7280",
                    margin: 0,
                  }}
                >
                  {programSubtitle}
                </p>
              </div>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "16px",
                  ...quartzCardStyle,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4px",
                  border: `2px solid ${
                    isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"
                  }`,
                }}
              >
                <img
                  src={getAvatarUrl()}
                  alt="Avatar"
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "12px",
                    objectFit: "cover",
                  }}
                />
              </div>
            </header>

            {/* Today's Hero Card */}
            {todaysWorkout?.hasWorkout ? (
              <section style={{ marginBottom: "32px" }}>
                <div
                  style={{
                    ...quartzCardStyle,
                    padding: "32px",
                    minHeight: "280px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    borderLeft: "4px solid #EF4444",
                    position: "relative",
                  }}
                  className="kinetic-shimmer"
                >
                  {/* Kinetic shimmer overlay */}
                  <div
                    style={{
                      position: "absolute",
                      top: "-150%",
                      left: "-150%",
                      width: "400%",
                      height: "400%",
                      background:
                        "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 80%)",
                      animation: "rotate-shimmer 12s infinite linear",
                      pointerEvents: "none",
                    }}
                  />

                  <div
                    style={{
                      position: "relative",
                      zIndex: 10,
                      display: "flex",
                      flexDirection: "column",
                      gap: "24px",
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "12px",
                        }}
                      >
                        <span
                          style={{
                            padding: "4px 12px",
                            borderRadius: "99px",
                            fontSize: "12px",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            background:
                              "linear-gradient(90deg, #EF4444, #F59E0B)",
                            color: "#FFFFFF",
                            width: "fit-content",
                            animation: "pulse-red 2s infinite",
                          }}
                        >
                          <Zap
                            style={{
                              width: "12px",
                              height: "12px",
                              fill: "currentColor",
                            }}
                          />
                          Today
                        </span>
                        <h2
                          style={{
                            fontSize: "30px",
                            fontWeight: 700,
                            lineHeight: "1.25",
                            color: isDark ? "#FFFFFF" : "#1A1A1A",
                            margin: 0,
                            letterSpacing: "-0.02em",
                          }}
                        >
                          {todaysWorkout.templateName}
                        </h2>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "20px",
                            color: isDark ? "rgba(255,255,255,0.6)" : "#6B7280",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <Dumbbell
                              style={{
                                width: "20px",
                                height: "20px",
                                color: "#EF4444",
                              }}
                            />
                            <span style={{ fontSize: "16px", fontWeight: 500 }}>
                              {todaysWorkout.exercises?.length || 0} Exercises
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <Layers
                              style={{
                                width: "20px",
                                height: "20px",
                                color: "#EF4444",
                              }}
                            />
                            <span style={{ fontSize: "16px", fontWeight: 500 }}>
                              {todaysWorkout.exercises?.reduce(
                                (sum, e) => sum + (e.sets || 0),
                                0
                              ) || 0}{" "}
                              Sets
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <Clock
                              style={{
                                width: "20px",
                                height: "20px",
                                color: isDark
                                  ? "rgba(255,255,255,0.4)"
                                  : "#6B7280",
                              }}
                            />
                            <span
                              style={{
                                fontSize: "16px",
                                fontWeight: 500,
                                fontFamily: "monospace",
                              }}
                            >
                              ~{todaysWorkout.estimatedDuration || 0} min
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Buttons */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px",
                        marginTop: "32px",
                      }}
                    >
                      <button
                        onClick={() => startWorkout(todaysWorkout)}
                        style={{
                          height: "56px",
                          background:
                            "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                          boxShadow: "0 4px 20px rgba(16, 185, 129, 0.3)",
                          borderRadius: "18px",
                          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                          cursor: "pointer",
                          border: "none",
                          color: "#FFFFFF",
                          fontSize: "18px",
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "12px",
                          flex: 1,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.boxShadow =
                            "0 8px 24px rgba(16, 185, 129, 0.4)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow =
                            "0 4px 20px rgba(16, 185, 129, 0.3)";
                        }}
                        onMouseDown={(e) => {
                          e.currentTarget.style.transform = "scale(0.96)";
                          e.currentTarget.style.filter = "brightness(0.9)";
                        }}
                        onMouseUp={(e) => {
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.filter = "brightness(1)";
                        }}
                      >
                        <Play
                          style={{
                            width: "24px",
                            height: "24px",
                            fill: "currentColor",
                          }}
                        />
                        Start Workout
                      </button>
                      <button
                        onClick={() =>
                          router.push(
                            `/client/workouts/${todaysWorkout.templateId}/details`
                          )
                        }
                        style={{
                          height: "48px",
                          background: isDark
                            ? "rgba(255,255,255,0.05)"
                            : "rgba(0,0,0,0.02)",
                          border: `1px solid ${
                            isDark
                              ? "rgba(255,255,255,0.08)"
                              : "rgba(0,0,0,0.1)"
                          }`,
                          borderRadius: "16px",
                          transition: "all 0.2s ease",
                          cursor: "pointer",
                          color: isDark ? "rgba(255,255,255,0.7)" : "#6B7280",
                          fontSize: "16px",
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          padding: "0 24px",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = isDark
                            ? "rgba(255,255,255,0.1)"
                            : "rgba(0,0,0,0.05)";
                          e.currentTarget.style.borderColor = isDark
                            ? "rgba(255,255,255,0.2)"
                            : "rgba(0,0,0,0.15)";
                          e.currentTarget.style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = isDark
                            ? "rgba(255,255,255,0.05)"
                            : "rgba(0,0,0,0.02)";
                          e.currentTarget.style.borderColor = isDark
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(0,0,0,0.1)";
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                      >
                        <Info style={{ width: "20px", height: "20px" }} />
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              </section>
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

            {/* Weekly Progress Banner */}
            <section style={{ marginBottom: "32px" }}>
              <div
                style={{
                  ...quartzCardStyle,
                  padding: "24px",
                  borderLeft: "4px solid #3B82F6",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "24px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-end",
                      }}
                    >
                      <h3
                        style={{
                          fontSize: "18px",
                          fontWeight: 500,
                          lineHeight: "1.25",
                          color: isDark ? "#FFFFFF" : "#1A1A1A",
                          margin: 0,
                        }}
                      >
                        Weekly Progress
                      </h3>
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontSize: "16px",
                          fontWeight: 700,
                          color: "#3B82F6",
                        }}
                      >
                        {weeklyProgress.current} / {weeklyProgress.goal}{" "}
                        <span
                          style={{
                            color: isDark ? "rgba(255,255,255,0.5)" : "#6B7280",
                            fontWeight: 400,
                          }}
                        >
                          Workouts
                        </span>
                      </span>
                    </div>
                    <div
                      style={{
                        height: "8px",
                        background: isDark
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(0,0,0,0.05)",
                        borderRadius: "4px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          background:
                            "linear-gradient(90deg, #3B82F6, #10B981)",
                          borderRadius: "4px",
                          transition: "width 1s cubic-bezier(0.65, 0, 0.35, 1)",
                          width: `${weeklyProgressPercent}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      height: "48px",
                      width: "1px",
                      background: isDark
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.1)",
                      display: "none",
                    }}
                  />
                  <div style={{ display: "flex", gap: "32px" }}>
                    <div>
                      <p
                        style={{
                          fontSize: "12px",
                          fontWeight: 400,
                          color: isDark ? "rgba(255,255,255,0.6)" : "#6B7280",
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          margin: "0 0 4px 0",
                        }}
                      >
                        Total Volume
                      </p>
                      <p
                        style={{
                          fontSize: "20px",
                          fontWeight: 700,
                          fontFamily: "monospace",
                          letterSpacing: "-0.02em",
                          color: isDark ? "#FFFFFF" : "#1A1A1A",
                          margin: 0,
                        }}
                      >
                        {weeklyStats.totalVolume.toLocaleString()}
                        <span
                          style={{
                            color: isDark ? "rgba(255,255,255,0.5)" : "#6B7280",
                            fontSize: "14px",
                            fontWeight: 400,
                            marginLeft: "4px",
                          }}
                        >
                          kg
                        </span>
                      </p>
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: "12px",
                          fontWeight: 400,
                          color: isDark ? "rgba(255,255,255,0.6)" : "#6B7280",
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          margin: "0 0 4px 0",
                        }}
                      >
                        Active Time
                      </p>
                      <p
                        style={{
                          fontSize: "20px",
                          fontWeight: 700,
                          fontFamily: "monospace",
                          letterSpacing: "-0.02em",
                          color: isDark ? "#FFFFFF" : "#1A1A1A",
                          margin: 0,
                        }}
                      >
                        {weeklyStats.activeTime}
                        <span
                          style={{
                            color: isDark ? "rgba(255,255,255,0.5)" : "#6B7280",
                            fontSize: "14px",
                            fontWeight: 400,
                            marginLeft: "4px",
                          }}
                        >
                          min
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* SECONDARY FEATURES - Below main workout */}

            {/* Quick Stats */}
            <div className="grid grid-cols-3" style={{ gap: "12px" }}>
              <div
                style={{
                  ...quartzCardStyle,
                  padding: "24px",
                  textAlign: "center",
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
                    color: isDark ? "#FFFFFF" : "#1A1A1A",
                    lineHeight: "1.1",
                  }}
                >
                  7
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "400",
                    color: isDark ? "rgba(255,255,255,0.6)" : "#6B7280",
                  }}
                >
                  Day Streak
                </div>
              </div>
              <div
                style={{
                  ...quartzCardStyle,
                  padding: "24px",
                  textAlign: "center",
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
                    color: isDark ? "#FFFFFF" : "#1A1A1A",
                    lineHeight: "1.1",
                  }}
                >
                  12
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "400",
                    color: isDark ? "rgba(255,255,255,0.6)" : "#6B7280",
                  }}
                >
                  This Month
                </div>
              </div>
              <div
                style={{
                  ...quartzCardStyle,
                  padding: "24px",
                  textAlign: "center",
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
                    color: isDark ? "#FFFFFF" : "#1A1A1A",
                    lineHeight: "1.1",
                  }}
                >
                  85%
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "400",
                    color: isDark ? "rgba(255,255,255,0.6)" : "#6B7280",
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

            {/* This Week's Workouts */}
            {thisWeekAssignments.length > 0 && (
              <section style={{ marginBottom: "32px" }}>
                <h3
                  style={{
                    fontSize: "20px",
                    fontWeight: 600,
                    lineHeight: "1.25",
                    color: isDark ? "#FFFFFF" : "#1A1A1A",
                    marginBottom: "16px",
                    paddingLeft: "4px",
                  }}
                >
                  This Week
                </h3>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  {thisWeekAssignments.map((assignment) => {
                    const workoutDate = new Date(assignment.scheduled_date);
                    const isCompleted = assignment.completed;
                    const isSkipped = assignment.status === "skipped";
                    const isToday = assignment.scheduled_date === today;

                    const monthAbbr = workoutDate.toLocaleDateString("en-US", {
                      month: "short",
                    });
                    const day = workoutDate.getDate();

                    return (
                      <div
                        key={assignment.id}
                        style={{
                          ...quartzCardStyle,
                          padding: "20px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          cursor: "pointer",
                          opacity: isSkipped ? 0.7 : 1,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = isDark
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(255,255,255,0.95)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = isDark
                            ? "linear-gradient(165deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 100%)"
                            : "linear-gradient(165deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)";
                        }}
                        onClick={() => {
                          router.push(
                            `/client/workouts/${assignment.id}/details`
                          );
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "20px",
                          }}
                        >
                          <div
                            style={{
                              width: "56px",
                              height: "56px",
                              borderRadius: "12px",
                              background: isCompleted
                                ? "rgba(16, 185, 129, 0.1)"
                                : isSkipped
                                ? isDark
                                  ? "#1F2937"
                                  : "#F3F4F6"
                                : "rgba(59, 130, 246, 0.1)",
                              border: `1px solid ${
                                isCompleted
                                  ? "rgba(16, 185, 129, 0.2)"
                                  : isSkipped
                                  ? isDark
                                    ? "#374151"
                                    : "#E5E7EB"
                                  : "rgba(59, 130, 246, 0.2)"
                              }`,
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              color: isCompleted
                                ? "#10B981"
                                : isSkipped
                                ? isDark
                                  ? "#6B7280"
                                  : "#9CA3AF"
                                : "#3B82F6",
                              fontFamily: "monospace",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "12px",
                                fontWeight: 700,
                                textTransform: "uppercase",
                              }}
                            >
                              {monthAbbr}
                            </span>
                            <span style={{ fontSize: "20px", fontWeight: 700 }}>
                              {day}
                            </span>
                          </div>
                          <div>
                            <h4
                              style={{
                                fontSize: "18px",
                                fontWeight: 600,
                                lineHeight: "1.25",
                                color: isDark ? "#FFFFFF" : "#1A1A1A",
                                margin: "0 0 4px 0",
                              }}
                            >
                              {assignment.name || "Workout"}
                            </h4>
                            <p
                              style={{
                                fontSize: "14px",
                                fontWeight: 400,
                                color: isDark
                                  ? "rgba(255,255,255,0.5)"
                                  : "#6B7280",
                                margin: 0,
                              }}
                            >
                              {isCompleted && assignment.completed_at
                                ? `Completed at ${new Date(
                                    assignment.completed_at
                                  ).toLocaleTimeString("en-US", {
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })} • ${assignment.duration_minutes || 0} min`
                                : isSkipped
                                ? "Marked as skipped"
                                : isToday
                                ? "Scheduled for today"
                                : "Scheduled"}
                            </p>
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "16px",
                          }}
                        >
                          <span
                            style={{
                              padding: "4px 12px",
                              borderRadius: "99px",
                              fontSize: "12px",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              background: isCompleted
                                ? "rgba(16, 185, 129, 0.2)"
                                : isSkipped
                                ? isDark
                                  ? "#1F2937"
                                  : "#F3F4F6"
                                : "rgba(59, 130, 246, 0.2)",
                              border: `1px solid ${
                                isCompleted
                                  ? "rgba(16, 185, 129, 0.3)"
                                  : isSkipped
                                  ? isDark
                                    ? "#374151"
                                    : "#E5E7EB"
                                  : "rgba(59, 130, 246, 0.3)"
                              }`,
                              color: isCompleted
                                ? "#10B981"
                                : isSkipped
                                ? isDark
                                  ? "#6B7280"
                                  : "#9CA3AF"
                                : "#3B82F6",
                            }}
                          >
                            {isCompleted && (
                              <CheckCircle
                                style={{ width: "14px", height: "14px" }}
                              />
                            )}
                            {isCompleted
                              ? "DONE"
                              : isSkipped
                              ? "SKIPPED"
                              : "UPCOMING"}
                          </span>
                          <ChevronRight
                            style={{
                              width: "24px",
                              height: "24px",
                              color: isDark
                                ? "rgba(255,255,255,0.4)"
                                : "#9CA3AF",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
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
              <section className="space-y-6 mb-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                      isDark
                        ? "bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-white/10"
                        : "bg-gradient-to-br from-purple-100 to-blue-100 border border-purple-200"
                    }`}
                    style={{
                      backdropFilter: "blur(24px) saturate(180%)",
                    }}
                  >
                    <Dumbbell
                      className={isDark ? "text-purple-400" : "text-purple-600"}
                      size={28}
                    />
                  </div>
                  <h2
                    className={`text-2xl font-bold tracking-tight ${
                      isDark ? "text-white" : "text-slate-900"
                    }`}
                  >
                    All Assigned Workouts
                  </h2>
                </div>

                {/* Workout Cards */}
                <div className="space-y-4">
                  {allAssignedWorkouts.map((assignment) => {
                    const template = assignment.workout_templates;
                    const coach = assignment.profiles;
                    const category = template?.exercise_categories;
                    const assignedDate =
                      assignment.assigned_date || assignment.start_date;
                    const dateObj = assignedDate
                      ? new Date(assignedDate)
                      : new Date();
                    const monthName = dateObj.toLocaleDateString("en-US", {
                      month: "short",
                    });
                    const dayNumber = dateObj.getDate();

                    // Determine status styling
                    const getStatusBadge = () => {
                      if (assignment.status === "assigned") {
                        return {
                          bg: isDark
                            ? "bg-blue-500/20 border-blue-500/30"
                            : "bg-blue-100 border-blue-200",
                          text: isDark ? "text-blue-400" : "text-blue-700",
                          label: "ASSIGNED",
                        };
                      } else if (
                        assignment.status === "in_progress" ||
                        assignment.status === "active"
                      ) {
                        return {
                          bg: isDark
                            ? "bg-green-500/20 border-green-500/30"
                            : "bg-green-100 border-green-200",
                          text: isDark ? "text-green-400" : "text-green-700",
                          label: "ACTIVE",
                        };
                      } else {
                        return {
                          bg: isDark
                            ? "bg-slate-800/50 border-slate-700"
                            : "bg-slate-100 border-slate-200",
                          text: isDark ? "text-slate-400" : "text-slate-600",
                          label: assignment.status?.toUpperCase() || "PENDING",
                        };
                      }
                    };

                    const statusBadge = getStatusBadge();

                    return (
                      <div
                        key={assignment.id}
                        className={`group cursor-pointer transition-all duration-300 ${
                          isDark
                            ? "bg-gradient-to-br from-white/[0.06] to-white/[0.01] border border-white/10 hover:bg-white/[0.08] hover:border-white/20"
                            : "bg-white border border-slate-200/80 hover:border-slate-300 hover:shadow-lg"
                        }`}
                        style={{
                          borderRadius: "24px",
                          padding: "20px",
                          backdropFilter: isDark
                            ? "blur(24px) saturate(180%)"
                            : "none",
                          position: "relative",
                          overflow: "hidden",
                        }}
                        onClick={() => {
                          if (assignment.type === "program") {
                            router.push(
                              `/client/programs/${assignment.program_id}/details`
                            );
                          } else {
                            router.push(
                              `/client/workouts/${assignment.id}/details`
                            );
                          }
                        }}
                      >
                        {/* Shimmer effect overlay */}
                        {isDark && (
                          <div
                            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-600"
                            style={{
                              background:
                                "linear-gradient(135deg, transparent 45%, rgba(255,255,255,0.05) 50%, transparent 55%)",
                              backgroundSize: "200% 200%",
                              pointerEvents: "none",
                            }}
                          />
                        )}

                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
                          {/* Left: Date and Info */}
                          <div className="flex items-center gap-5 flex-1 min-w-0">
                            {/* Date Box */}
                            <div
                              className={`w-14 h-14 flex-shrink-0 rounded-xl flex flex-col items-center justify-center font-bold ${
                                assignment.status === "assigned"
                                  ? isDark
                                    ? "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                                    : "bg-blue-100 border border-blue-200 text-blue-700"
                                  : assignment.status === "in_progress" ||
                                    assignment.status === "active"
                                  ? isDark
                                    ? "bg-green-500/10 border border-green-500/20 text-green-400"
                                    : "bg-green-100 border border-green-200 text-green-700"
                                  : isDark
                                  ? "bg-slate-800 border border-slate-700 text-slate-500"
                                  : "bg-slate-100 border border-slate-200 text-slate-600"
                              }`}
                            >
                              <span className="text-xs font-bold uppercase tracking-wider">
                                {monthName}
                              </span>
                              <span className="text-xl leading-none">
                                {dayNumber}
                              </span>
                            </div>

                            {/* Workout Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <h4
                                  className={`text-lg font-semibold group-hover:transition-colors ${
                                    assignment.status === "assigned"
                                      ? isDark
                                        ? "text-blue-400 group-hover:text-blue-300"
                                        : "text-blue-700 group-hover:text-blue-600"
                                      : assignment.status === "in_progress" ||
                                        assignment.status === "active"
                                      ? isDark
                                        ? "text-green-400 group-hover:text-green-300"
                                        : "text-green-700 group-hover:text-green-600"
                                      : isDark
                                      ? "text-white group-hover:text-slate-200"
                                      : "text-slate-900 group-hover:text-slate-800"
                                  }`}
                                >
                                  {template?.name ||
                                    assignment.name ||
                                    (assignment.type === "program"
                                      ? "Program"
                                      : "Workout")}
                                </h4>
                                <Badge
                                  className={`${
                                    assignment.type === "program"
                                      ? isDark
                                        ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                                        : "bg-purple-100 text-purple-700 border-purple-200"
                                      : isDark
                                      ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                                      : "bg-blue-100 text-blue-700 border-blue-200"
                                  } px-2 py-0.5 text-xs font-bold uppercase tracking-wider border`}
                                >
                                  {assignment.type === "program"
                                    ? "Program"
                                    : "Workout"}
                                </Badge>
                              </div>

                              {/* Description or Details */}
                              <div className="space-y-1">
                                {(template?.description ||
                                  assignment.description) && (
                                  <p
                                    className={`text-sm ${
                                      isDark
                                        ? "text-slate-400"
                                        : "text-slate-600"
                                    } line-clamp-1`}
                                  >
                                    {template?.description ||
                                      assignment.description}
                                  </p>
                                )}
                                <div className="flex flex-wrap items-center gap-3 text-xs">
                                  {template?.duration_minutes && (
                                    <div
                                      className={`flex items-center gap-1.5 ${
                                        isDark
                                          ? "text-slate-500"
                                          : "text-slate-500"
                                      }`}
                                    >
                                      <Clock size={14} />
                                      <span className="font-mono">
                                        ~{template.duration_minutes} min
                                      </span>
                                    </div>
                                  )}
                                  {coach && (
                                    <div
                                      className={`flex items-center gap-1.5 ${
                                        isDark
                                          ? "text-slate-500"
                                          : "text-slate-500"
                                      }`}
                                    >
                                      <span>Coach: {coach.first_name}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Right: Status and Actions */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                            {/* Status Badge */}
                            <div
                              className={`px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider ${statusBadge.bg} ${statusBadge.text} self-start sm:self-auto`}
                            >
                              {statusBadge.label}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (assignment.type === "program") {
                                    router.push(
                                      `/client/programs/${assignment.program_id}/details`
                                    );
                                  } else {
                                    router.push(
                                      `/client/workouts/${assignment.id}/details`
                                    );
                                  }
                                }}
                                className={`h-10 px-3 sm:px-4 rounded-xl font-semibold transition-all flex-1 sm:flex-initial ${
                                  isDark
                                    ? "bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-slate-300"
                                    : "bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700"
                                }`}
                                variant="outline"
                              >
                                <Eye size={16} className="sm:mr-2" />
                                <span className="hidden sm:inline">
                                  Details
                                </span>
                              </Button>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (assignment.type === "program") {
                                    router.push(
                                      `/client/programs/${assignment.program_id}/details`
                                    );
                                  } else {
                                    router.push(
                                      `/client/workouts/${assignment.id}/start`
                                    );
                                  }
                                }}
                                className="h-10 px-4 sm:px-6 rounded-xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/30 hover:shadow-green-500/40 transition-all flex-1 sm:flex-initial"
                                style={{
                                  boxShadow: isDark
                                    ? "0 4px 20px rgba(16, 185, 129, 0.3)"
                                    : "0 4px 12px rgba(16, 185, 129, 0.2)",
                                }}
                              >
                                <Play
                                  size={16}
                                  className="sm:mr-2 fill-current"
                                />
                                <span>
                                  {assignment.type === "program"
                                    ? "View"
                                    : "Start"}
                                </span>
                              </Button>
                            </div>

                            <ChevronRight
                              className={`w-6 h-6 transition-colors hidden md:block ${
                                isDark
                                  ? "text-slate-600 group-hover:text-white"
                                  : "text-slate-400 group-hover:text-slate-600"
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
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
