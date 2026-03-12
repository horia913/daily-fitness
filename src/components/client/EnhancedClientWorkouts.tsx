"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/contexts/ThemeContext";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  ClientPageShell,
  ClientGlassCard,
  SectionHeader,
  PrimaryButton,
  SecondaryButton,
  AssignedWorkoutRow,
} from "@/components/client-ui";
import { AddGoalModal } from "@/components/goals/AddGoalModal";
import { CompactGoalCard } from "@/components/goals/CompactGoalCard";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { supabase, ensureAuthenticated } from "@/lib/supabase";
import { useToast } from "@/components/ui/toast-provider";
import { useNewWorkoutLoader } from "@/lib/featureFlags";
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
import Link from "next/link";
import WorkoutTemplateService, {
  DailyWorkout,
  DailyWorkoutExercise,
  ExerciseAlternative,
} from "@/lib/workoutTemplateService";
import { usePathname } from "next/navigation";
import { fetchApi } from "@/lib/apiClient";
import { getCurrentWorkoutFromProgress } from "@/lib/programProgressService";

type WorkoutSummaryPayload = {
  avatarUrl: string | null;
  todaysWorkout: DailyWorkout | null;
  currentProgram: Program | null;
  workoutHistory: DailyWorkout[];
  completedPrograms: Program[];
  upcomingWorkouts: DailyWorkout[];
  allAssignedWorkouts: any[];
  weeklyProgress: { current: number; goal: number };
  weeklyStats: { totalVolume: number; activeTime: number };
  allTimeVolume?: number;
  thisWeekAssignments: any[];
  assignmentIdByTemplate: Record<string, string>;
  scheduleIdByTemplate: Record<string, string>;
};

const workoutSummaryCache = new Map<
  string,
  { data: WorkoutSummaryPayload; fetchedAt: number }
>();
const WORKOUT_SUMMARY_TTL_MS = 45 * 1000;
const PERF_WORKOUTS_ENABLED = process.env.NEXT_PUBLIC_DEBUG_HARNESS === "true";

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
  set_order: number | null;
  set_type: string | null;
  set_name: string | null;
  set_notes: string | null;
  total_sets: number | null;
  reps_per_set: string | null;
  rest_seconds: number | null;
  exercises?: ClientBlockExerciseRecord[] | null;
};

type ClientProgramRuleRecord = {
  id: string;
  program_assignment_id: string | null;
  week_number: number | null;
  set_order: number | null;
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
  const { user, profile, session, signOut } = useAuth();
  const theme = getThemeStyles();
  const { addToast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const perfMarksRef = useRef<{
    mountAt: number;
    fetchResolvedAt: number;
    summaryApplied: boolean;
    logged: boolean;
  }>({
    mountAt: 0,
    fetchResolvedAt: 0,
    summaryApplied: false,
    logged: false,
  });
  const useNewLoader =
    useNewWorkoutLoader || pathname.startsWith("/client/workouts");

  useEffect(() => {
    if (!PERF_WORKOUTS_ENABLED) return;
    perfMarksRef.current.mountAt = performance.now();
    performance.mark("workouts_mount");
  }, []);

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
  const [allTimeVolume, setAllTimeVolume] = useState(0);
  const [dayStreak, setDayStreak] = useState(0);
  const [thisMonthWorkouts, setThisMonthWorkouts] = useState(0);
  const [successRate, setSuccessRate] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [thisWeekAssignments, setThisWeekAssignments] = useState<any[]>([]);
  const [assignmentIdByTemplate, setAssignmentIdByTemplate] = useState<
    Record<string, string>
  >({});
  const [scheduleIdByTemplate, setScheduleIdByTemplate] = useState<
    Record<string, string>
  >({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pillarGoals, setPillarGoals] = useState<Array<{ id: string; title: string; target_value?: number; current_value?: number; target_unit?: string; progress_percentage?: number; target_date?: string; status: string }>>([]);
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);

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
      // Ensure user is authenticated before querying
      await ensureAuthenticated();

      // Load next due workout using direct database queries (same as dashboard)
      console.log("ðŸ” Client Workouts - Loading workout for client:", clientId);

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
        "ðŸ” Client Workouts - Today assignment:",
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
          "ðŸ” Client Workouts - Recent assignment:",
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
            "ðŸ” Client Workouts - Workout template ID not found in assignment"
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
              "ðŸ” Client Workouts - No workout blocks found for template"
            );
          } else {
            // Convert WorkoutBlock[] to ClientBlockRecord[] format
            const clientBlocks: ClientBlockRecord[] = workoutBlocks.map(
              (block) => ({
                id: block.id,
                set_order: block.set_order,
                set_type: block.set_type,
                set_name: block.set_name ?? null,
                set_notes: block.set_notes ?? null,
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
                  "ðŸ” Client Workouts - Error loading exercise metadata:",
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
                    notes: exercise.notes ?? block.set_notes ?? undefined,
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

      console.log("ðŸ” Client Workouts - Final workout:", nextWorkout);
      setTodaysWorkout(nextWorkout);

      // Check for active program assignment (if program tables exist)
      // Declare at function scope so it can be reused later
      let allProgramAssignments: any[] | null = null;
      try {
        // OPTIMIZED: Single query for program assignments (reused later, includes coach_id)
        const { data: programAssignmentsData, error: allProgramError } =
          await supabase
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

        // Store in function-scoped variable for reuse later
        allProgramAssignments = programAssignmentsData || null;

        console.log(
          "ðŸ” Client Workouts - ALL program assignments:",
          allProgramAssignments,
          allProgramError
        );

        // Get the most recent active program assignment
        const programAssignment = allProgramAssignments && allProgramAssignments.length > 0
          ? allProgramAssignments[0]
          : null;

        console.log(
          "ðŸ” Client Workouts - Program assignment:",
          programAssignment
        );

        if (programAssignment) {
          // ========================================================================
          // NEW: Use program_progress as SOURCE OF TRUTH for next program workout
          // This replaces the legacy program_day_assignments logic
          // ========================================================================
          const workoutInfo = await getCurrentWorkoutFromProgress(supabase, clientId);
          
          console.log(
            "ðŸ” Client Workouts - getCurrentWorkoutFromProgress result:",
            workoutInfo
          );

          if (workoutInfo.status === "active" && workoutInfo.template_id) {
            const programName = workoutInfo.program_name || programAssignment.name || "Program";

            // Load exercises from workout template and get template info
            let programExercises: DailyWorkoutExercise[] = [];
            let estimatedDuration = 45; // Default duration
            try {
              const { WorkoutBlockService } = await import("@/lib/workoutBlockService");
              const blocks = await WorkoutBlockService.getWorkoutBlocks(
                workoutInfo.template_id
              );
              programExercises = blocks
                .flatMap((block) => {
                  return (block.exercises || []).map((exercise, index) => ({
                    id: exercise.id || `${block.id}-${index}`,
                    exerciseId: exercise.exercise_id || "",
                    name: exercise.exercise?.name || "Exercise",
                    description: exercise.exercise?.description || "",
                    orderIndex: exercise.exercise_order ?? index,
                    notes: exercise.notes || undefined,
                    sets: exercise.sets || 0,
                    reps: exercise.reps || "",
                    restSeconds: exercise.rest_seconds || 60,
                    progressionNotes: undefined,
                    weightGuidance: undefined,
                  }));
                })
                .sort((a, b) => a.orderIndex - b.orderIndex);
              
              // Estimate duration: ~3 min per exercise (including rest)
              estimatedDuration = Math.max(15, programExercises.length * 3);
            } catch (blocksError) {
              console.error(
                "ðŸ” Client Workouts - Error loading workout blocks:",
                blocksError
              );
            }

            // Also try to get estimated_duration from template
            try {
              const { data: templateData } = await supabase
                .from("workout_templates")
                .select("estimated_duration")
                .eq("id", workoutInfo.template_id)
                .maybeSingle();
              if (templateData?.estimated_duration) {
                estimatedDuration = templateData.estimated_duration;
              }
            } catch (err) {
              // Ignore - use calculated estimate
            }

            // Set nextWorkout with program_schedule info (stored in scheduleId field)
            nextWorkout = {
              hasWorkout: true,
              templateId: workoutInfo.template_id,
              scheduleId: workoutInfo.schedule_row_id, // program_schedule.id for routing
              templateName: programName,
              templateDescription: "",
              weekNumber: workoutInfo.actual_week_number || 1,
              programDay: (workoutInfo.current_day_index || 0) + 1, // 1-based for display
              exercises: programExercises,
              estimatedDuration: estimatedDuration,
              generatedAt: programAssignment.start_date,
              message: workoutInfo.position_label ? `${workoutInfo.position_label} ready!` : "Program workout ready!",
            };
            console.log(
              "ðŸ” Client Workouts - Set program workout from progress:",
              nextWorkout
            );
          } else if (workoutInfo.status === "completed") {
            // Program is completed
            nextWorkout = {
              hasWorkout: false,
              templateId: programAssignment.program_id || undefined,
              templateName: workoutInfo.program_name || programAssignment.name || "Program",
              templateDescription: "",
              message: "Congratulations! Program completed!",
            };
          } else if (!nextWorkout || !nextWorkout.hasWorkout) {
            // Fallback: no active program or other issue
            const programName =
              programAssignment.name && programAssignment.name.trim().length > 0
                ? programAssignment.name
                : "Program";

            nextWorkout = {
              hasWorkout: false,
              templateId: programAssignment.program_id || undefined,
              templateName: programName,
              templateDescription: "",
              message: workoutInfo.message || "No workout available",
            };
          }
        }
      } catch (error) {
        console.log(
          "ðŸ” Client Workouts - Program queries failed (tables may not exist):",
          error
        );
      }

      setTodaysWorkout(nextWorkout);

      // TASK 3: Get program progress from canonical ledger (program_day_completions)
      // Get active program assignment first
      const activeProgramAssignment = allProgramAssignments && allProgramAssignments.length > 0
        ? allProgramAssignments[0]
        : null;

      if (activeProgramAssignment) {
        // Get program metrics from program_day_completions (new system)
        const { getProgramMetrics } = await import("@/lib/programMetricsService");
        const programMetrics = await getProgramMetrics(activeProgramAssignment.id, supabase);

        // Get program details
        let programData = null;
        let programError = null;
        let coachInfo = null;

        try {
          // Query through program_assignments to respect RLS policies
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
              .eq("id", activeProgramAssignment.id)
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
            console.log("ðŸ” Client Workouts - Program not found in assignment");
          }
        } catch (error) {
          console.log(
            "ðŸ” Client Workouts - Error fetching program via assignment:",
            error
          );
          programError = error as any;
        }

        if (!programError && programData) {
          // Calculate estimated week from current_day_number (assuming ~7 workouts per week)
          const estimatedWeek = programMetrics?.current_day_number
            ? Math.ceil(programMetrics.current_day_number / 7)
            : 1;

          setCurrentProgram({
            id: programData.id,
            name: programData.name,
            description: programData.description,
            current_week: estimatedWeek,
            total_weeks: programData.duration_weeks,
            progress_percentage: programMetrics?.completion_percentage || 0,
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
          "ðŸ” Client Workouts - Assigned workouts:",
          assignedWorkouts,
          assignedError
        );

        // OPTIMIZED: Reuse program assignments already fetched above (no duplicate query!)
        const assignedPrograms = allProgramAssignments || [];

        console.log(
          "ðŸ” Client Workouts - Assigned programs:",
          assignedPrograms
        );

        if (assignedError) {
          console.error("Error loading assigned workouts:", assignedError);
        }

        const allAssignments = [];

        // OPTIMIZED: Batch fetch ALL coach profiles at once instead of N+1 queries
        const allCoachIds = new Set<string>();
        if (assignedWorkouts) {
          assignedWorkouts.forEach((a: any) => {
            if (a.coach_id) allCoachIds.add(a.coach_id);
          });
        }
        if (assignedPrograms) {
          assignedPrograms.forEach((a: any) => {
            if (a.coach_id) allCoachIds.add(a.coach_id);
          });
        }

        // Single query for all coach profiles
        const coachProfilesMap = new Map<string, any>();
        if (allCoachIds.size > 0) {
          const { data: coaches, error: coachesError } = await supabase
            .from("profiles")
            .select("id, first_name, last_name")
            .in("id", Array.from(allCoachIds));

          if (!coachesError && coaches) {
            coaches.forEach((coach: any) => {
              coachProfilesMap.set(coach.id, coach);
            });
          }
        }

        // Process workout assignments (no queries in loop!)
        if (assignedWorkouts) {
          const workoutsWithDetails = assignedWorkouts.map((assignment: any) => {
            console.log("ðŸ”Ž Processing workout assignment:", assignment);
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

            // Get coach from map (no query!)
            const coach = coachProfilesMap.get(assignment.coach_id) || null;

            return {
              ...assignment,
              type: "workout",
              workout_templates: templateSnapshot,
              profiles: coach,
            };
          });
          allAssignments.push(...workoutsWithDetails);
        }

        // Process program assignments (no queries in loop!)
        if (assignedPrograms) {
          const programsWithDetails = assignedPrograms.map((assignment: any) => {
            console.log("ðŸ”Ž Processing program assignment:", assignment);
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

            // Get coach from map (no query!)
            const coach = coachProfilesMap.get(assignment.coach_id) || null;

            return {
              ...assignment,
              type: "program",
              program_id: assignment.program_id,
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
          });
          allAssignments.push(...programsWithDetails);
        }

        console.log(
          "ðŸ” Client Workouts - All assignments (workouts + programs):",
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

        const { data: allTimeLogs } = await supabase
          .from("workout_logs")
          .select("total_weight_lifted, completed_at")
          .eq("client_id", clientId)
          .not("completed_at", "is", null)
          .order("completed_at", { ascending: false });

        const totalAllTimeVolume =
          allTimeLogs?.reduce(
            (sum, log) => sum + (log.total_weight_lifted || 0),
            0
          ) || 0;
        setAllTimeVolume(Math.round(totalAllTimeVolume));

        // Calculate Day Streak (consecutive days with completed workouts)
        if (allTimeLogs && allTimeLogs.length > 0) {
          const uniqueDates = [...new Set(
            allTimeLogs.map(log => new Date(log.completed_at!).toISOString().split('T')[0])
          )].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
          
          const todayStr = new Date().toISOString().split('T')[0];
          const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
          
          // Check if streak is current (most recent should be today or yesterday)
          if (uniqueDates[0] === todayStr || uniqueDates[0] === yesterdayStr) {
            let streak = 1;
            let expectedDate = new Date(uniqueDates[0]);
            
            for (let i = 1; i < uniqueDates.length; i++) {
              expectedDate.setDate(expectedDate.getDate() - 1);
              const expectedStr = expectedDate.toISOString().split('T')[0];
              if (uniqueDates[i] === expectedStr) {
                streak++;
              } else {
                break;
              }
            }
            setDayStreak(streak);
          } else {
            setDayStreak(0);
          }
        }

        // Calculate This Month Workouts
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const thisMonthCount = allTimeLogs?.filter(log => 
          new Date(log.completed_at!) >= monthStart
        ).length || 0;
        setThisMonthWorkouts(thisMonthCount);

        // Calculate Success Rate (completed / total assigned * 100)
        const { data: totalAssignments } = await supabase
          .from("workout_assignments")
          .select("id")
          .eq("client_id", clientId);
        
        const totalAssigned = totalAssignments?.length || 0;
        const totalCompleted = allTimeLogs?.length || 0;
        const rate = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0;
        setSuccessRate(Math.min(rate, 100)); // Cap at 100%

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
      setLoadError("Failed to load workouts. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  const loadWorkoutDataFromApi = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    setLoadError(null);

    try {
      const cacheKey = `${clientId}:${pathname}`;
      const cached = workoutSummaryCache.get(cacheKey);
      if (cached && Date.now() - cached.fetchedAt < WORKOUT_SUMMARY_TTL_MS) {
        const data = cached.data;
        setAvatarUrl(data.avatarUrl || null);
        setTodaysWorkout(data.todaysWorkout || null);
        setCurrentProgram(data.currentProgram || null);
        setWorkoutHistory(data.workoutHistory || []);
        setCompletedPrograms(data.completedPrograms || []);
        setUpcomingWorkouts(data.upcomingWorkouts || []);
        setAllAssignedWorkouts(data.allAssignedWorkouts || []);
        setWeeklyProgress(data.weeklyProgress || { current: 0, goal: 0 });
        setWeeklyStats(data.weeklyStats || { totalVolume: 0, activeTime: 0 });
        setAllTimeVolume(data.allTimeVolume || 0);
        setThisWeekAssignments(data.thisWeekAssignments || []);
        setAssignmentIdByTemplate(data.assignmentIdByTemplate || {});
        setScheduleIdByTemplate(data.scheduleIdByTemplate || {});
        setLoading(false);
        return;
      }

      if (!session?.access_token) {
        setLoadError("Session expired. Please sign in again.");
        await signOut();
        router.push("/");
        return;
      }

      const response = await fetchApi("/api/client/workouts/summary", {
        method: "GET",
        cache: "no-store",
        onSessionExpired: async () => {
          setLoadError("Session expired. Please sign in again.");
          await signOut();
          router.push("/");
        },
      });

      if (!response.ok) {
        const text = await response.text();
        setLoadError(text || "Failed to load workout data.");
        return;
      }

      const data = (await response.json()) as WorkoutSummaryPayload;
      workoutSummaryCache.set(cacheKey, { data, fetchedAt: Date.now() });

      if (PERF_WORKOUTS_ENABLED) {
        perfMarksRef.current.fetchResolvedAt = performance.now();
        performance.mark("workouts_summary_fetch_resolved");
      }

      setAvatarUrl(data.avatarUrl || null);
      setTodaysWorkout(data.todaysWorkout || null);
      setCurrentProgram(data.currentProgram || null);
      setWorkoutHistory(data.workoutHistory || []);
      setCompletedPrograms(data.completedPrograms || []);
      setUpcomingWorkouts(data.upcomingWorkouts || []);
      setAllAssignedWorkouts(data.allAssignedWorkouts || []);
      setWeeklyProgress(data.weeklyProgress || { current: 0, goal: 0 });
      setWeeklyStats(data.weeklyStats || { totalVolume: 0, activeTime: 0 });
      setAllTimeVolume(data.allTimeVolume || 0);
      setThisWeekAssignments(data.thisWeekAssignments || []);
      setAssignmentIdByTemplate(data.assignmentIdByTemplate || {});
      setScheduleIdByTemplate(data.scheduleIdByTemplate || {});
      if (PERF_WORKOUTS_ENABLED) {
        perfMarksRef.current.summaryApplied = true;
      }
    } catch (error) {
      console.error("Error loading workout data (API):", error);
      setLoadError("Failed to load workout data.");
    } finally {
      setLoading(false);
    }
  }, [clientId, pathname, router, session, signOut]);

  // Fetch avatar URL
  useEffect(() => {
    if (useNewLoader) return;
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
  }, [user, useNewLoader]);

  const workoutsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (workoutsTimeoutRef.current) clearTimeout(workoutsTimeoutRef.current);
    workoutsTimeoutRef.current = setTimeout(() => {
      workoutsTimeoutRef.current = null;
      setLoading(false);
    }, 20_000);

    const loadPromise = useNewLoader
      ? loadWorkoutDataFromApi()
      : loadWorkoutData();

    loadPromise
      .catch((error) => {
        console.error("Error loading workout data:", error);
      })
      .finally(() => {
        if (workoutsTimeoutRef.current) {
          clearTimeout(workoutsTimeoutRef.current);
          workoutsTimeoutRef.current = null;
        }
      });

    return () => {
      if (workoutsTimeoutRef.current) {
        clearTimeout(workoutsTimeoutRef.current);
        workoutsTimeoutRef.current = null;
      }
    };
  }, [loadWorkoutData, loadWorkoutDataFromApi, useNewLoader]);

  const fetchPillarGoals = useCallback(async () => {
    if (!clientId) return;
    try {
      const { data, error } = await supabase
        .from("goals")
        .select("id, title, target_value, current_value, target_unit, progress_percentage, target_date, status")
        .eq("client_id", clientId)
        .eq("pillar", "training")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      setPillarGoals(data || []);
    } catch {
      setPillarGoals([]);
    }
  }, [clientId]);

  useEffect(() => {
    fetchPillarGoals();
  }, [fetchPillarGoals]);

  useEffect(() => {
    if (!PERF_WORKOUTS_ENABLED) return;
    const marks = perfMarksRef.current;
    if (marks.logged) return;
    if (!marks.summaryApplied || loading) return;

    const renderAt = performance.now();
    performance.mark("workouts_first_render");

    const mountAt = marks.mountAt || renderAt;
    const fetchResolvedAt = marks.fetchResolvedAt || renderAt;
    const mountToFetchMs = Math.round(fetchResolvedAt - mountAt);
    const fetchToRenderMs = Math.round(renderAt - fetchResolvedAt);
    const mountToRenderMs = Math.round(renderAt - mountAt);

    console.log(
      `PERF_WORKOUTS mountToFetchMs=${mountToFetchMs} | fetchToRenderMs=${fetchToRenderMs} | mountToRenderMs=${mountToRenderMs}`
    );
    marks.logged = true;
  }, [loading]);

  const startWorkout = async (workout: DailyWorkout) => {
    // ========================================================================
    // NEW: For program workouts (weekNumber exists), use the new progress-based API
    // This creates/gets a workout_assignment from the current program_progress position
    // ========================================================================
    if (workout.weekNumber && workout.templateId) {
      try {
        console.log("ðŸš€ Starting program workout via start-from-progress API...");
        const response = await fetchApi("/api/program-workouts/start-from-progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}), // Uses auth.uid() automatically
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
          console.error("Error starting program workout:", errorData);
          // Fall through to legacy handling
        } else {
          const result = await response.json();
          if (result.workout_assignment_id) {
            console.log("ðŸš€ Got workout_assignment_id:", result.workout_assignment_id);
            window.location.href = `/client/workouts/${result.workout_assignment_id}/start`;
            return;
          }
        }
      } catch (apiError) {
        console.error("Error calling start-from-progress API:", apiError);
        // Fall through to legacy handling
      }
    }

    // Legacy: If scheduleId is a program_day_assignments.id or workout_assignments.id
    if (workout.scheduleId) {
      window.location.href = `/client/workouts/${workout.scheduleId}/start`;
      return;
    }

    if (!workout.templateId) return;

    try {
      if (useNewLoader) {
        const scheduleId = scheduleIdByTemplate[workout.templateId];
        if (scheduleId) {
          window.location.href = `/client/workouts/${scheduleId}/start`;
          return;
        }
        const assignmentId = assignmentIdByTemplate[workout.templateId];
        if (assignmentId) {
          router.push(`/client/workouts/${assignmentId}/start`);
          return;
        }
      }

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
        window.location.href = `/client/workouts/${assignment.id}/start`;
      } else {
        // No assignment found for this standalone template — cannot start.
        // Do NOT push template ID as URL param: start/page.tsx cannot resolve it.
        console.warn('[EnhancedClientWorkouts] No workout_assignment found for template:', workout.templateId);
        addToast({ title: 'No active assignment found for this workout. Ask your coach to assign it.', variant: 'destructive' });
      }
    } catch (error) {
      console.error("Error finding assignment:", error);
      // Do NOT fall back to template ID — it is not a valid workout_assignment_id.
      addToast({ title: 'Could not start workout. Please try again.', variant: 'destructive' });
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
      "You're crushing your fitness goals! ðŸ’ª",
      "Every workout brings you closer to your best self! ðŸŒŸ",
      "Your consistency is paying off! Keep it up! ðŸ”¥",
      "Transform your body, transform your life! âš¡",
      "The only bad workout is the one you didn't do! ðŸ†",
    ];
    return messages[Math.floor(Math.random() * messages.length)];
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

  if (loading) {
    return (
      <AnimatedBackground>
        <div className="relative z-10 min-h-screen fc-page animate-pulse">
          <div className="max-w-5xl mx-auto flex flex-col gap-6">
            <div className="fc-glass fc-card p-6 rounded-2xl">
              <div className="h-8 fc-glass-soft rounded mb-2" />
              <div className="h-4 fc-glass-soft rounded w-[75%]" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ gap: "var(--fc-gap-cards)" }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-48 fc-glass-soft rounded-2xl border border-[color:var(--fc-glass-border)]" />
              ))}
            </div>
          </div>
        </div>
      </AnimatedBackground>
    );
  }

  if (loadError) {
    return (
      <AnimatedBackground>
        <div className="relative z-10 min-h-screen fc-page flex items-center justify-center">
          <div className="max-w-3xl w-full">
            <GlassCard className="fc-card">
              <div className="p-6 space-y-4 text-center">
                <h2 className="text-lg font-semibold fc-text-primary">
                  Unable to load workouts
                </h2>
                <p className="text-sm fc-text-dim">{loadError}</p>
                <Button variant="fc-primary" onClick={() => useNewLoader ? loadWorkoutDataFromApi() : loadWorkoutData()}>
                  Refresh
                </Button>
              </div>
            </GlassCard>
          </div>
        </div>
      </AnimatedBackground>
    );
  }

  return (
    <AnimatedBackground>
      <>
      {performanceSettings.floatingParticles && (
        <FloatingParticles />
      )}
      <div className="relative z-10 min-h-screen pb-28 fc-page">
          <ClientPageShell className="max-w-3xl flex flex-col gap-6">
            {/* SECTION 1 â€” Current Program (Hero) */}
            <ClientGlassCard className="p-6">
              {currentProgram ? (
                <>
                  <h3 className="text-lg font-bold fc-text-primary mb-1">
                    {currentProgram.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 fc-text-dim text-sm mb-4">
                    <span>Week {currentProgram.current_week} of {currentProgram.total_weeks}</span>
                    {typeof currentProgram.progress_percentage === "number" && (
                      <span>â€¢ {currentProgram.progress_percentage}% complete</span>
                    )}
                  </div>
                  {todaysWorkout?.hasWorkout && (
                    <PrimaryButton
                      className="mb-4"
                      onClick={() => startWorkout(todaysWorkout)}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start Today&apos;s Workout
                    </PrimaryButton>
                  )}
                  <SecondaryButton
                    className="w-full sm:w-auto"
                    onClick={() => {
                      const programAssignment = allAssignedWorkouts.find((a: any) => a.program_id);
                      const programId = programAssignment?.program_id ?? (currentProgram as any)?.program_id ?? currentProgram?.id;
                      if (programId) router.push(`/client/programs/${programId}/details`);
                      else router.push("/client/workouts");
                    }}
                  >
                    View Full Program
                  </SecondaryButton>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="fc-text-dim mb-4">No active program assigned.</p>
                  <SecondaryButton
                    className="w-auto"
                    onClick={() => router.push("/client/workouts")}
                  >
                    Browse Workouts
                  </SecondaryButton>
                </div>
              )}
            </ClientGlassCard>

            {/* SECTION 1b - Assigned Workouts */}
            <section>
              <SectionHeader title="Assigned Workouts" />
              <ClientGlassCard className="p-4">
                {(() => {
                  const fromAll = (allAssignedWorkouts || []).filter((a: any) => a.type === "workout");
                  const fromWeek = (thisWeekAssignments || []);
                  const seen = new Set<string>();
                  const allItems = [...fromWeek, ...fromAll].filter((a: any) => {
                    const id = a.id;
                    if (seen.has(id)) return false;
                    seen.add(id);
                    return true;
                  });
                  const toShow = allItems.slice(0, 6);
                  const hasMore = allItems.length > 6;
                  if (toShow.length === 0) {
                    return <p className="fc-text-dim text-sm py-4 text-center">No workouts assigned yet.</p>;
                  }
                  return (
                    <div className="space-y-0">
                      {toShow.map((item: any) => {
                        const name = item.workout_templates?.name || item.name || "Workout";
                        const dayLabel = item.scheduled_date ? formatDate(item.scheduled_date) : item.assigned_date ? formatDate(item.assigned_date) : "Assigned";
                        const asDaily: DailyWorkout = {
                          hasWorkout: true,
                          templateId: item.workout_template_id || item.workout_templates?.id,
                          scheduleId: item.id,
                          templateName: name,
                          weekNumber: item.week_number,
                          programDay: item.program_day,
                          estimatedDuration: 0,
                          exercises: [],
                          message: "",
                        };
                        return (
                          <AssignedWorkoutRow
                            key={item.id}
                            title={name}
                            subtitle={dayLabel}
                            onStart={() => startWorkout(asDaily)}
                          />
                        );
                      })}
                      {hasMore && (
                        <div className="pt-3 mt-3 border-t border-[color:var(--fc-glass-border)]">
                          <Link
                            href="/client/workouts"
                            className="text-sm font-medium fc-text-workouts hover:underline"
                          >
                            View all assigned
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </ClientGlassCard>
            </section>

            {/* SECTION 2 â€” Workout History */}
            <section>
              <SectionHeader
                title="Recent Workouts"
                action={
                  <button
                    type="button"
                    onClick={() => router.push("/client/progress/workout-logs")}
                    className="fc-btn fc-btn-secondary fc-press h-8 px-4 text-xs rounded-xl"
                  >
                    View All Logs
                  </button>
                }
              />
              <ClientGlassCard className="p-4">
                {(workoutHistory?.slice(0, 5) ?? thisWeekAssignments.filter((a: any) => a.completed).slice(0, 5)).length > 0 ? (
                  <div className="space-y-3">
                    {(workoutHistory?.slice(0, 5) ?? thisWeekAssignments.filter((a: any) => a.completed).slice(0, 5)).map((item: any, idx: number) => (
                      <div key={item.id || idx} className="flex items-center justify-between py-2 border-b border-[color:var(--fc-glass-border)] last:border-0">
                        <div>
                          <p className="font-semibold fc-text-primary text-sm">
                            {item.templateName ?? item.name ?? "Workout"}
                          </p>
                          <p className="text-xs fc-text-dim">
                            {item.generatedAt || item.completed_at || item.scheduled_date
                              ? new Date(item.generatedAt || item.completed_at || item.scheduled_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
                              : ""}
                          </p>
                        </div>
                        {item.completed && <CheckCircle className="w-4 h-4 fc-text-success shrink-0" />}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="fc-text-dim text-sm py-4 text-center">No recent workouts yet.</p>
                )}
                <SecondaryButton
                  className="w-full mt-4"
                  onClick={() => router.push("/client/progress/workout-logs")}
                >
                  View All Logs
                </SecondaryButton>
              </ClientGlassCard>
            </section>

            {/* SECTION 3 â€” Performance */}
            <section>
              <SectionHeader title="Performance" />
              <ClientGlassCard className="p-5">
                <div className="flex flex-wrap gap-6 mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider fc-text-dim mb-1">Weekly Volume</p>
                    <p className="text-xl font-bold fc-text-primary">{weeklyStats.totalVolume.toLocaleString()} kg</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider fc-text-dim mb-1">Active Time</p>
                    <p className="text-xl font-bold fc-text-primary">{weeklyStats.activeTime} min</p>
                  </div>
                </div>
                <PrimaryButton onClick={() => router.push("/client/progress/personal-records")}>
                  View Performance
                </PrimaryButton>
              </ClientGlassCard>
            </section>

            {/* SECTION 4 â€” Competitive */}
            <section>
              <SectionHeader title="Competitive" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link href="/client/progress/leaderboard">
                  <ClientGlassCard className="p-5 cursor-pointer fc-hover-rise transition-all">
                    <div className="flex items-center gap-3 mb-2">
                      <Trophy className="w-6 h-6 fc-text-warning" />
                      <h4 className="font-bold fc-text-primary">Leaderboard</h4>
                    </div>
                    <p className="text-sm fc-text-dim">See your rank among peers.</p>
                  </ClientGlassCard>
                </Link>
                <Link href="/client/challenges">
                  <ClientGlassCard className="p-5 cursor-pointer fc-hover-rise transition-all">
                    <div className="flex items-center gap-3 mb-2">
                      <Zap className="w-6 h-6 fc-text-workouts" />
                      <h4 className="font-bold fc-text-primary">Challenges</h4>
                    </div>
                    <p className="text-sm fc-text-dim">Join events and competitions.</p>
                  </ClientGlassCard>
                </Link>
              </div>
            </section>

            {/* SECTION 5 â€” Training Goals */}
            <section>
              <SectionHeader
                title={
                  pillarGoals.length > 0
                    ? `Training Goals · ${Math.round(pillarGoals.reduce((s, g) => s + (g.progress_percentage ?? 0), 0) / pillarGoals.length)}% adherence`
                    : "Training Goals"
                }
              />
              <ClientGlassCard className="p-5">
                {pillarGoals.length > 0 ? (
                  <div className="space-y-3 mb-4">
                    {pillarGoals.map((g) => (
                      <CompactGoalCard
                        key={g.id}
                        goal={{
                          id: g.id,
                          title: g.title,
                          target_value: g.target_value,
                          current_value: g.current_value,
                          target_unit: g.target_unit,
                          progress_percentage: g.progress_percentage,
                          status: g.status,
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="fc-text-dim text-sm mb-4">No active training goals.</p>
                )}
                <div className="flex flex-col sm:flex-row gap-2">
                  <PrimaryButton className="w-full sm:w-auto" onClick={() => setShowAddGoalModal(true)}>
                    + Add Training Goal
                  </PrimaryButton>
                  <SecondaryButton className="w-full sm:w-auto" onClick={() => router.push("/client/goals")}>
                    Manage all goals
                  </SecondaryButton>
                </div>
              </ClientGlassCard>
            </section>

            <AddGoalModal
              open={showAddGoalModal}
              onClose={() => setShowAddGoalModal(false)}
              pillar="training"
              onSuccess={fetchPillarGoals}
            />
          </ClientPageShell>
      </div>
      </>
    </AnimatedBackground>
  );
}
