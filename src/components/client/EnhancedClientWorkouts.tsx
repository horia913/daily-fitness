"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/contexts/ThemeContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { supabase, ensureAuthenticated } from "@/lib/supabase";
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
  LayoutGrid,
  LineChart,
  Plus,
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
  const { user, profile, session, signOut } = useAuth();
  const theme = getThemeStyles();
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
          "🔍 Client Workouts - ALL program assignments:",
          allProgramAssignments,
          allProgramError
        );

        // Get the most recent active program assignment
        const programAssignment = allProgramAssignments && allProgramAssignments.length > 0
          ? allProgramAssignments[0]
          : null;

        console.log(
          "🔍 Client Workouts - Program assignment:",
          programAssignment
        );

        if (programAssignment) {
          // ========================================================================
          // NEW: Use program_progress as SOURCE OF TRUTH for next program workout
          // This replaces the legacy program_day_assignments logic
          // ========================================================================
          const workoutInfo = await getCurrentWorkoutFromProgress(supabase, clientId);
          
          console.log(
            "🔍 Client Workouts - getCurrentWorkoutFromProgress result:",
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
                "🔍 Client Workouts - Error loading workout blocks:",
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
              "🔍 Client Workouts - Set program workout from progress:",
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
          "🔍 Client Workouts - Program queries failed (tables may not exist):",
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
          "🔍 Client Workouts - Assigned workouts:",
          assignedWorkouts,
          assignedError
        );

        // OPTIMIZED: Reuse program assignments already fetched above (no duplicate query!)
        const assignedPrograms = allProgramAssignments || [];

        console.log(
          "🔍 Client Workouts - Assigned programs:",
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

            // Get coach from map (no query!)
            const coach = coachProfilesMap.get(assignment.coach_id) || null;

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
          });
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

  useEffect(() => {
    if (useNewLoader) {
      loadWorkoutDataFromApi().catch((error) => {
        console.error("Error loading workout data (API):", error);
      });
      return;
    }

    loadWorkoutData().catch((error) => {
      console.error("Error loading workout data:", error);
    });
  }, [loadWorkoutData, loadWorkoutDataFromApi, useNewLoader]);

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
        console.log("🚀 Starting program workout via start-from-progress API...");
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
            console.log("🚀 Got workout_assignment_id:", result.workout_assignment_id);
            router.push(`/client/workouts/${result.workout_assignment_id}/start`);
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
      router.push(`/client/workouts/${workout.scheduleId}/start`);
      return;
    }

    if (!workout.templateId) return;

    try {
      if (useNewLoader) {
        const scheduleId = scheduleIdByTemplate[workout.templateId];
        if (scheduleId) {
          router.push(`/client/workouts/${scheduleId}/start`);
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

  if (loadError && useNewLoader) {
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
                <Button variant="fc-primary" onClick={() => loadWorkoutDataFromApi()}>
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
          <div className="relative z-10 max-w-4xl mx-auto flex flex-col gap-5" style={{ gap: "var(--fc-gap-sections)" }}>
            {/* Header Section */}
            <header className="flex justify-between items-center mb-10">
              <div>
                <h1 className="text-3xl font-bold tracking-tight fc-text-primary m-0">Your Workouts</h1>
                <p className="text-sm fc-text-dim mt-1">{programSubtitle}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl fc-glass border-2 border-[color:var(--fc-glass-border)] flex items-center justify-center overflow-hidden p-0.5">
                <img src={getAvatarUrl()} alt="" className="w-full h-full rounded-xl object-cover" />
              </div>
            </header>

            {/* Unified Hero Card */}
            {todaysWorkout?.hasWorkout ? (
              <section className="mb-8">
                <GlassCard
                  elevation={2}
                  className="fc-hero-card fc-kinetic-shimmer p-6 sm:p-8 min-h-[240px] flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="relative z-10 flex flex-col gap-6 flex-1">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-3">
                        <span className="fc-pill fc-pill-glass fc-text-workouts inline-flex items-center gap-1 w-fit fc-streak-pulse">
                          <Zap className="w-3 h-3" />
                          Today
                        </span>
                        {currentProgram && (
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="fc-outline" className="px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.2em]">
                              Program
                            </Badge>
                            <span className="text-[11px] uppercase tracking-[0.22em] fc-text-dim font-mono">
                              Week {currentProgram.current_week} of {currentProgram.total_weeks}
                            </span>
                            {typeof currentProgram.progress_percentage === "number" && (
                              <span className="text-[11px] uppercase tracking-[0.22em] fc-text-dim font-mono">
                                • {currentProgram.progress_percentage}% complete
                              </span>
                            )}
                          </div>
                        )}
                        <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight tracking-tight fc-text-primary m-0">
                          {todaysWorkout.templateName}
                        </h2>
                        <div className="flex flex-wrap gap-4 fc-text-dim">
                          <div className="flex items-center gap-1.5">
                            <Dumbbell className="w-4 h-4 fc-text-workouts" />
                            <span className="text-sm font-medium">
                              {(todaysWorkout.exerciseCount ??
                                (todaysWorkout.exercises?.length || 0))}{" "}
                              Exercises
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Layers className="w-4 h-4 fc-text-workouts" />
                            <span className="text-sm font-medium">
                              {(todaysWorkout.totalSets ??
                                (todaysWorkout.exercises?.reduce(
                                  (sum, e) => sum + (e.sets || 0),
                                  0
                                ) || 0))}{" "}
                              Sets
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4 fc-text-dim" />
                            <span className="text-sm font-medium font-mono">
                              ~{todaysWorkout.estimatedDuration || 0} min
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Buttons */}
                    <div className="mt-8 flex flex-col md:flex-row gap-4">
                      <Button
                        variant="fc-primary"
                        size="xl"
                        onClick={() => startWorkout(todaysWorkout)}
                        className="flex-1 gap-3"
                      >
                        <Play className="w-6 h-6 fill-current" />
                        Start Workout
                      </Button>
                      <Button
                        variant="fc-secondary"
                        size="lg"
                        onClick={() => {
                          const tid = todaysWorkout.templateId;
                          const aid = tid != null ? assignmentIdByTemplate[tid] : undefined;
                          router.push(aid ? `/client/workouts/${aid}/details` : tid ? `/client/workouts/${tid}/details` : "/client/workouts");
                        }}
                        className="px-6 gap-2 fc-text-dim font-semibold"
                      >
                        <Info className="w-5 h-5" />
                        Details
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              </section>
            ) : (
              <GlassCard elevation={2} className="fc-card p-8 sm:p-16 text-center overflow-hidden">
                  {todaysWorkout?.weekCompleted ? (
                    <>
                      <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8 fc-icon-tile fc-icon-meals bg-[color-mix(in_srgb,var(--fc-status-success)_25%,transparent)] border-[color:var(--fc-status-success)]">
                        <Trophy className="w-8 h-8 sm:w-12 sm:h-12 fc-text-success" />
                      </div>
                      <h3 className="text-xl sm:text-2xl font-semibold fc-text-primary mb-3 sm:mb-4">
                        Week {todaysWorkout.currentWeek} Complete! 🎉
                      </h3>
                      <p className="fc-text-dim text-lg sm:text-xl mb-4">
                        {todaysWorkout.message ||
                          "The work is done for the week! You have completed all workouts, recharge your batteries and be prepared to crush next week!"}
                      </p>
                      <div className="fc-glass-soft p-4 sm:p-6 rounded-2xl border border-[color:var(--fc-glass-border)] fc-accent-meals">
                        <p className="fc-text-primary text-sm sm:text-base">
                          🏆 Amazing work this week! Your dedication is paying
                          off. Take this time to recover, stay hydrated, and get
                          ready for another week of progress.
                        </p>
                      </div>
                    </>
                  ) : todaysWorkout?.message?.includes("No active program") ? (
                    <>
                      <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8 fc-icon-tile fc-icon-workouts">
                        <Target className="w-8 h-8 sm:w-12 sm:h-12 fc-text-workouts" />
                      </div>
                      <h3 className="text-xl sm:text-2xl font-semibold fc-text-primary mb-3 sm:mb-4">
                        Ready to Get Started? 💪
                      </h3>
                      <p className="fc-text-dim text-lg sm:text-xl mb-4">
                        No active program assigned. Contact your coach to get
                        started with your fitness journey!
                      </p>
                      <div className="fc-glass-soft p-4 sm:p-6 rounded-2xl border border-[color:var(--fc-glass-border)] fc-accent-workouts">
                        <p className="fc-text-primary text-sm sm:text-base">
                          🎯 Your coach will create a personalized workout
                          program just for you. Once assigned, you&apos;ll see
                          your daily workouts here!
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8 fc-icon-tile fc-icon-meals border-[color:var(--fc-glass-border)]">
                        <Calendar className="w-8 h-8 sm:w-12 sm:h-12 fc-text-dim" />
                      </div>
                      <h3 className="text-xl sm:text-2xl font-semibold fc-text-primary mb-3 sm:mb-4">
                        Rest Day
                      </h3>
                      <p className="fc-text-dim text-lg sm:text-xl mb-4">
                        {getMotivationalMessage()}
                      </p>
                      <p className="fc-text-dim text-sm sm:text-base">
                        Check back tomorrow for your next workout.
                      </p>
                    </>
                  )}
              </GlassCard>
            )}

            {/* Weekly Progress - standalone section (mockup layout) */}
            {(weeklyProgress.goal > 0 || weeklyStats.totalVolume > 0 || weeklyStats.activeTime > 0) && (
              <section className="mb-8">
                <GlassCard elevation={2} className="fc-card p-6 rounded-2xl border-l-4 border-l-[color:var(--fc-domain-workouts)]">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1 space-y-2">
                      <div className="flex justify-between items-end">
                        <h3 className="text-lg font-semibold fc-text-primary">Weekly Progress</h3>
                        <span className="font-mono text-sm font-bold fc-text-workouts">
                          {weeklyProgress.current}
                          {" / "}
                          {weeklyProgress.goal}{" "}
                          <span className="font-normal fc-text-subtle">Workouts</span>
                        </span>
                      </div>
                      <div className="fc-progress-track">
                        <div
                          className="fc-progress-fill"
                          style={{ width: `${weeklyProgressPercent}%` }}
                        />
                      </div>
                    </div>
                    <div className="hidden md:block h-12 w-px bg-[color:var(--fc-glass-border)]" />
                    <div className="flex gap-8">
                      <div>
                        <p className="text-xs uppercase tracking-widest fc-text-dim mb-1">Total Volume</p>
                        <p className="text-xl font-bold font-mono tracking-tight fc-text-primary m-0">
                          {weeklyStats.totalVolume.toLocaleString()}
                          <span className="text-sm font-normal fc-text-subtle ml-1">kg</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-widest fc-text-dim mb-1">Active Time</p>
                        <p className="text-xl font-bold font-mono tracking-tight fc-text-primary m-0">
                          {weeklyStats.activeTime}
                          <span className="text-sm font-normal fc-text-subtle ml-1">min</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </section>
            )}

            {/* SECONDARY FEATURES - Below main workout */}

            {/* Quick Stats Strip */}
            <div className="fc-stats-strip">
              <div className="fc-stats-strip-item">
                <span className="fc-stats-strip-value fc-text-warning">{dayStreak}</span>
                <span className="fc-stats-strip-label">Streak</span>
              </div>
              <div className="fc-stats-strip-item">
                <span className="fc-stats-strip-value">{thisMonthWorkouts}</span>
                <span className="fc-stats-strip-label">Month</span>
              </div>
              <div className="fc-stats-strip-item">
                <span className="fc-stats-strip-value fc-text-success">{successRate}%</span>
                <span className="fc-stats-strip-label">Rate</span>
              </div>
              <div className="fc-stats-strip-item">
                <span className="fc-stats-strip-value">{allTimeVolume.toLocaleString()}</span>
                <span className="fc-stats-strip-label">Total kg</span>
              </div>
            </div>

            {/* This Week's Workouts - dedupe by id to avoid duplicate React keys */}
            {thisWeekAssignments.length > 0 && (
              <section className="mb-8">
                <h3 className="text-xl font-semibold leading-tight fc-text-primary mb-4 pl-1">
                  This Week
                </h3>
                <div className="flex flex-col gap-3">
                  {Array.from(
                    new Map(thisWeekAssignments.map((a) => [a.id, a])).values()
                  ).map((assignment) => {
                    const workoutDate = new Date(assignment.scheduled_date);
                    const isCompleted = assignment.completed;
                    const isSkipped = assignment.status === "skipped";
                    const isToday = assignment.scheduled_date === today;
                    const scheduleLabel = formatDate(assignment.scheduled_date);

                    const monthAbbr = workoutDate.toLocaleDateString("en-US", {
                      month: "short",
                    });
                    const day = workoutDate.getDate();
                    const dateLabel = `${monthAbbr} ${day}`;
                    const dateVariant = isCompleted
                      ? "fc-date-card--done"
                      : isSkipped
                      ? "fc-date-card--skipped"
                      : "fc-date-card--today";
                    const statusVariant = isCompleted
                      ? "fc-status-pill--done"
                      : isSkipped
                      ? "fc-status-pill--skipped"
                      : "fc-status-pill--upcoming";

                    return (
                      <div
                        key={assignment.id}
                        onClick={() => {
                          router.push(
                            `/client/workouts/${assignment.id}/details`
                          );
                        }}
                      >
                        <div className={isSkipped ? "opacity-70" : ""}>
                          <div
                            className={`fc-surface rounded-2xl p-4 sm:p-5 cursor-pointer transition-all duration-200 hover:translate-y-[-1px] active:scale-[0.98] ${
                              isCompleted ? "border-l-4 border-l-[color:var(--fc-status-success)]" : ""
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                              <div className="flex items-center gap-3 sm:gap-4 flex-1">
                                <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 border ${isCompleted ? "bg-[color:var(--fc-status-success)]/10 border-[color:var(--fc-status-success)]/20 text-[color:var(--fc-status-success)]" : isSkipped ? "bg-[color:var(--fc-glass-highlight)] border-[color:var(--fc-glass-border)] fc-text-subtle" : "bg-[color:var(--fc-domain-workouts)]/10 border-[color:var(--fc-domain-workouts)]/20 fc-text-workouts"}`}>
                                  <span className="text-[9px] font-bold uppercase tracking-wide">{monthAbbr}</span>
                                  <span className="text-lg font-extrabold leading-none">{day}</span>
                                </div>
                                <div className="flex-1">
                                  <h4 className="text-base font-bold leading-tight fc-text-primary mb-0.5">
                                    {assignment.name || "Workout"}
                                  </h4>
                                  <div className="text-xs fc-text-dim">
                                    {isCompleted && assignment.completed_at
                                      ? `Completed ${new Date(assignment.completed_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}${assignment.duration_minutes ? ` • ${assignment.duration_minutes} min` : ""}`
                                      : isSkipped
                                      ? "Marked as skipped"
                                      : isToday
                                      ? "Today"
                                      : `Scheduled • ${dateLabel}`}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center justify-between sm:justify-end gap-3 pl-0 sm:pl-0">
                                <span className={`fc-status-pill ${statusVariant}`}>
                                  {isCompleted ? <CheckCircle className="w-3.5 h-3.5" /> : null}
                                  {isCompleted
                                    ? "DONE"
                                    : isSkipped
                                    ? "SKIPPED"
                                    : "UPCOMING"}
                                </span>
                                <ChevronRight className="w-5 h-5 fc-text-subtle" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Completed Programs */}
            {completedPrograms.length > 0 && (
              <GlassCard elevation={2} className="fc-card overflow-hidden">
                <div className="p-8 border-b border-[color:var(--fc-glass-border)]">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 fc-icon-tile fc-icon-challenges rounded-xl flex items-center justify-center">
                      <Trophy className="w-5 h-5 fc-text-challenges" />
                    </div>
                    <span className="text-2xl font-bold fc-text-primary">
                      Completed Programs
                    </span>
                  </div>
                </div>
                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" style={{ gap: "var(--fc-gap-cards)" }}>
                    {completedPrograms.map((program) => (
                      <GlassCard
                        key={program.id}
                        elevation={1}
                        className="fc-card p-6 border-2 border-[color:var(--fc-glass-border)] hover:border-[color:var(--fc-accent-purple)] transition-all duration-300"
                      >
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 fc-icon-tile fc-icon-challenges rounded-xl flex items-center justify-center">
                              <Trophy className="w-6 h-6 fc-text-challenges" />
                            </div>
                            <Badge className="fc-text-success bg-[color:var(--fc-status-success)] text-white border-0 px-3 py-1">
                              {(program as any).completion_percentage ||
                                Math.round(100 * (program.current_week / program.total_weeks))}
                              % Complete
                            </Badge>
                          </div>
                          <h4 className="font-bold text-lg mb-2 fc-text-primary">
                            {(program as any).program_name || program.name}
                          </h4>
                          <p className="text-sm fc-text-dim mb-4 line-clamp-2">
                            {(program as any).program_description ||
                              program.description}
                          </p>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="fc-text-dim">Duration:</span>
                              <span className="fc-text-primary">{program.total_weeks} weeks</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="fc-text-dim">Coach:</span>
                              <span className="fc-text-primary">{program.coach_name}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="fc-text-dim">Workouts:</span>
                              <span className="fc-text-primary">{(program as any).total_workouts_completed || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="fc-text-dim">Completed:</span>
                              <span className="fc-text-primary">
                                {new Date(
                                  (program as any).completed_date || new Date()
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="mt-4">
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className="fc-text-dim">Progress</span>
                              <span className="fc-text-primary">
                                {(program as any).completion_percentage ||
                                  Math.round(100 * (program.current_week / program.total_weeks))}
                                %
                              </span>
                            </div>
                            <div className="w-full fc-glass-soft rounded-full h-2 border border-[color:var(--fc-glass-border)]">
                              <div
                                className="h-2 rounded-full transition-all duration-500 bg-[color:var(--fc-status-success)]"
                                style={{
                                  width: `${(program as any).completion_percentage ||
                                    Math.round(100 * (program.current_week / program.total_weeks))}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                      </GlassCard>
                    ))}
                  </div>
                </div>
              </GlassCard>
            )}

            {/* All Assigned Workouts */}
            {allAssignedWorkouts.length > 0 && (
              <section className="space-y-6 mb-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                  <div className="fc-icon-tile fc-icon-workouts">
                    <Dumbbell className="w-7 h-7" />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight fc-text-primary">
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
                          label: "ASSIGNED",
                        };
                      } else if (
                        assignment.status === "in_progress" ||
                        assignment.status === "active"
                      ) {
                        return {
                          label: "IN PROGRESS",
                        };
                      } else {
                        return {
                          label: "COMPLETED",
                        };
                      }
                    };

                    const statusBadge = getStatusBadge();
                    const statusVariant =
                      assignment.status === "assigned"
                        ? "fc-status-pill--upcoming"
                        : assignment.status === "in_progress" ||
                          assignment.status === "active"
                        ? "fc-status-pill--active"
                        : "fc-status-pill--done";
                    const iconVariant =
                      assignment.type === "program"
                        ? "fc-icon-challenges"
                        : "fc-icon-workouts";

                    return (
                      <Link
                        key={assignment.id}
                        href={
                          assignment.type === "program"
                            ? `/client/programs/${assignment.program_id}/details`
                            : `/client/workouts/${assignment.id}/details`
                        }
                        className="group block"
                      >
                        <div
                          className="fc-surface rounded-2xl p-4 sm:p-5 transition-all duration-200 hover:translate-y-[-1px] active:scale-[0.98]"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                            <div className="flex items-center gap-3 sm:gap-4 flex-1">
                              <div className={`fc-icon-tile ${iconVariant} w-10 h-10 sm:w-11 sm:h-11 shrink-0`}>
                                {assignment.type === "program" ? (
                                  <Award className="w-5 h-5" />
                                ) : (
                                  <Dumbbell className="w-5 h-5" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <h4 className="text-base font-bold fc-text-primary leading-tight mb-0.5">
                                  {template?.name ||
                                    assignment.name ||
                                    (assignment.type === "program"
                                      ? "Program"
                                      : "Workout")}
                                </h4>
                                <div className="text-[11px] uppercase tracking-wider fc-text-dim">
                                  {monthName.toUpperCase()} {dayNumber}
                                  {coach?.first_name && (
                                    <span className="hidden sm:inline"> • Coach: {coach.first_name}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Bottom row on mobile / Right section on desktop */}
                            <div className="flex items-center justify-between sm:justify-end gap-3 pl-14 sm:pl-0">
                              <span className={`fc-status-pill ${statusVariant}`}>
                                {statusBadge.label}
                              </span>
                              {assignment.type === "program" ? (
                                <div className="flex gap-2">
                                  <Button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      // Start program workout via progress API
                                      try {
                                        const response = await fetchApi("/api/program-workouts/start-from-progress", {
                                          method: "POST",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({}),
                                        });
                                        if (response.ok) {
                                          const result = await response.json();
                                          if (result.workout_assignment_id) {
                                            router.push(`/client/workouts/${result.workout_assignment_id}/start`);
                                            return;
                                          }
                                        }
                                        // Fallback to program details if API fails
                                        router.push(`/client/programs/${assignment.program_id}/details`);
                                      } catch (err) {
                                        console.error("Error starting program workout:", err);
                                        router.push(`/client/programs/${assignment.program_id}/details`);
                                      }
                                    }}
                                    className="h-9 sm:h-10 px-4 rounded-xl font-semibold"
                                    variant="fc-primary"
                                  >
                                    <Play size={16} className="mr-1.5 fill-current" />
                                    Start
                                  </Button>
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      router.push(`/client/programs/${assignment.program_id}/details`);
                                    }}
                                    className="h-9 sm:h-10 px-3 rounded-xl font-semibold"
                                    variant="fc-secondary"
                                  >
                                    <Eye size={16} />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/client/workouts/${assignment.id}/start`);
                                  }}
                                  className="h-9 sm:h-10 px-4 rounded-xl font-semibold"
                                  variant="fc-primary"
                                >
                                  <Play size={16} className="mr-1.5 fill-current" />
                                  Start
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Exercise Alternatives Modal */}
            {showAlternatives && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <GlassCard
                  elevation={3}
                  className="fc-card max-w-2xl w-full max-h-[80vh] overflow-hidden rounded-3xl"
                >
                  <div className="border-b border-[color:var(--fc-glass-border)] p-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 fc-icon-tile fc-icon-workouts rounded-lg flex items-center justify-center">
                          <Shuffle className="w-4 h-4 fc-text-workouts" />
                        </div>
                        <span className="text-xl font-bold fc-text-primary">
                          Exercise Alternatives
                        </span>
                      </div>
                      <Button
                        variant="fc-ghost"
                        size="sm"
                        onClick={() => setShowAlternatives(null)}
                        className="p-3 rounded-xl"
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-8">
                    {selectedExerciseAlternatives.length > 0 ? (
                      <div className="space-y-6">
                        <p className="text-base fc-text-dim">
                          Choose an alternative exercise if equipment is
                          unavailable or you prefer a different variation:
                        </p>
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                          {selectedExerciseAlternatives.map((alternative) => (
                            <div
                              key={alternative.id}
                              className="flex items-center justify-between p-6 fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl hover:border-[color:var(--fc-domain-workouts)] transition-colors"
                            >
                              <div className="flex-1">
                                <h4 className="font-semibold text-lg mb-2 fc-text-primary">
                                  {alternative.alternative_exercise?.name}
                                </h4>
                                <p className="text-base mb-3 fc-text-dim">
                                  {
                                    alternative.alternative_exercise
                                      ?.description
                                  }
                                </p>
                                <div className="flex items-center gap-3">
                                  <Badge
                                    variant="outline"
                                    className="text-sm px-3 py-1 border-[color:var(--fc-glass-border)]"
                                  >
                                    {alternative.reason}
                                  </Badge>
                                  <span className="text-sm fc-text-dim">
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
                                variant="fc-primary"
                                onClick={() =>
                                  swapExercise(
                                    showAlternatives,
                                    alternative.alternative_exercise_id
                                  )
                                }
                                className="ml-6 rounded-xl px-6 py-3"
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
                        <Lightbulb className="w-16 h-16 fc-text-dim mx-auto mb-6" />
                        <h3 className="font-semibold text-xl mb-3 fc-text-primary">
                          No alternatives available
                        </h3>
                        <p className="text-base fc-text-dim">
                          This exercise doesn&apos;t have any alternatives
                          configured yet.
                        </p>
                      </div>
                    )}
                  </div>
                </GlassCard>
              </div>
            )}
          </div>
        </div>

        {/* Fixed bottom nav — mockup: Dashboard, Workouts (active), Analytics, Quick Log */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
          <div className="h-24 bg-[color:var(--fc-bg-base)]/90 backdrop-blur-xl border-t border-[color:var(--fc-glass-border)]" aria-hidden />
          <div className="fixed bottom-0 left-0 right-0 z-50 max-w-4xl mx-auto px-6 h-24 flex items-center justify-between gap-4 pointer-events-auto">
            <div className="flex flex-1 justify-around md:justify-start md:gap-12">
              <Link href="/client" className="flex flex-col items-center gap-1.5 fc-text-subtle hover:fc-text-primary transition-colors group">
                <LayoutGrid className="w-7 h-7 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold uppercase tracking-widest">Dashboard</span>
              </Link>
              <span className="flex flex-col items-center gap-1.5 fc-text-workouts" aria-current="page">
                <Calendar className="w-7 h-7 scale-110" />
                <span className="text-[11px] font-bold uppercase tracking-widest">Workouts</span>
              </span>
              <Link href="/client/progress/analytics" className="flex flex-col items-center gap-1.5 fc-text-subtle hover:fc-text-primary transition-colors group">
                <LineChart className="w-7 h-7 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold uppercase tracking-widest">Analytics</span>
              </Link>
            </div>
            <Link href="/client/progress/workout-logs" className="fc-btn fc-btn-primary h-14 w-14 md:h-12 md:w-auto md:px-6 rounded-2xl flex items-center justify-center gap-2 font-bold shadow-lg">
              <Plus className="w-6 h-6 md:w-5 md:h-5" />
              <span className="hidden md:inline">Quick Log</span>
            </Link>
          </div>
        </nav>
      </>
    </AnimatedBackground>
  );
}
