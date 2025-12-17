"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Clock,
  Dumbbell,
  Target,
  TrendingUp,
  Calendar,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
  CheckCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface WorkoutSet {
  id: string;
  block_id: string;
  block_type: string;
  exercise_id: string;
  weight: number | null;
  reps: number | null;
  set_number?: number | null;
  completed_at: string;
  
  // Special type columns
  dropset_initial_weight?: number | null;
  dropset_initial_reps?: number | null;
  dropset_final_weight?: number | null;
  dropset_final_reps?: number | null;
  dropset_percentage?: number | null;
  
  superset_exercise_a_id?: string | null;
  superset_weight_a?: number | null;
  superset_reps_a?: number | null;
  superset_exercise_b_id?: string | null;
  superset_weight_b?: number | null;
  superset_reps_b?: number | null;
  
  giant_set_exercises?: any; // JSON array
  
  amrap_total_reps?: number | null;
  amrap_duration_seconds?: number | null;
  amrap_target_reps?: number | null;
  
  fortime_total_reps?: number | null;
  fortime_time_taken_sec?: number | null;
  fortime_time_cap_sec?: number | null;
  fortime_target_reps?: number | null;
  
  emom_minute_number?: number | null;
  emom_total_reps_this_min?: number | null;
  emom_total_duration_sec?: number | null;
  
  rest_pause_initial_weight?: number | null;
  rest_pause_initial_reps?: number | null;
  rest_pause_reps_after?: number | null;
  rest_pause_number?: number | null;
  
  preexhaust_isolation_exercise_id?: string | null;
  preexhaust_isolation_weight?: number | null;
  preexhaust_isolation_reps?: number | null;
  preexhaust_compound_exercise_id?: string | null;
  preexhaust_compound_weight?: number | null;
  preexhaust_compound_reps?: number | null;
  
  exercise?: {
    id: string;
    name: string;
    category: string | null;
  };
  
  // For superset/pre-exhaustion exercise names
  exercise_a?: { id: string; name: string };
  exercise_b?: { id: string; name: string };
  isolation_exercise?: { id: string; name: string };
  compound_exercise?: { id: string; name: string };
}

interface BlockGroup {
  block_id: string;
  block_type: string;
  block_name?: string;
  block_order?: number;
  sets: WorkoutSet[];
  exercises: Map<string, {
    exercise_id: string;
    exercise_name: string;
    sets: WorkoutSet[];
    totalReps: number;
    totalWeight: number;
  }>;
  totalSets: number;
  totalReps: number;
  totalWeight: number;
}

export default function WorkoutLogDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isDark, getThemeStyles, getSemanticColor, performanceSettings } =
    useTheme();
  const theme = getThemeStyles();
  const workoutLogId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [workoutLog, setWorkoutLog] = useState<any>(null);
  const [workoutName, setWorkoutName] = useState<string>("Workout");
  const [blockGroups, setBlockGroups] = useState<BlockGroup[]>([]);
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [totalStats, setTotalStats] = useState({
    totalSets: 0,
    totalReps: 0,
    totalWeight: 0,
    uniqueExercises: 0,
    duration: 0,
  });

  useEffect(() => {
    if (user && !authLoading && workoutLogId) {
      loadWorkoutLog();
    }
  }, [user, authLoading, workoutLogId]);

  const toggleBlock = (blockId: string) => {
    setExpandedBlocks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(blockId)) {
        newSet.delete(blockId);
      } else {
        newSet.add(blockId);
      }
      return newSet;
    });
  };

  const loadWorkoutLog = async () => {
    if (!user?.id || !workoutLogId) return;

    try {
      setLoading(true);

      // Get the workout_log with totals
      const { data: log, error: logError } = await supabase
        .from("workout_logs")
        .select("id, started_at, completed_at, total_duration_minutes, total_sets_completed, total_reps_completed, total_weight_lifted, workout_assignment_id")
        .eq("id", workoutLogId)
        .eq("client_id", user.id)
        .single();

      if (logError || !log) {
        console.error("Error loading workout log:", logError);
        return;
      }

      // Get workout template name
      let templateName = "Workout";
      if (log.workout_assignment_id) {
        const { data: assignment } = await supabase
          .from("workout_assignments")
          .select(`
            workout_template_id,
            workout_templates (
              id,
              name
            )
          `)
          .eq("id", log.workout_assignment_id)
          .single();
        
        if (assignment?.workout_templates) {
          templateName = (assignment.workout_templates as any).name || "Workout";
        }
      }
      setWorkoutName(templateName);

      // Get the workout assignment to find the template_id
      const { data: assignment } = await supabase
        .from("workout_assignments")
        .select("workout_template_id")
        .eq("id", log.workout_assignment_id)
        .single();

      if (!assignment?.workout_template_id) {
        console.error("No template_id found for assignment");
        return;
      }

      // Get ALL blocks from the template in correct order
      const { data: templateBlocks, error: blocksError } = await supabase
        .from("workout_blocks")
        .select("id, block_type, block_name, block_order")
        .eq("template_id", assignment.workout_template_id)
        .order("block_order", { ascending: true });

      if (blocksError) {
        console.error("Error loading blocks:", blocksError);
      }

      // Query sets with ALL special columns
      const { data: sets, error: setsError } = await supabase
        .from("workout_set_logs")
        .select(`
          id,
          workout_log_id,
          block_id,
          block_type,
          exercise_id,
          weight,
          reps,
          set_number,
          completed_at,
          dropset_initial_weight,
          dropset_initial_reps,
          dropset_final_weight,
          dropset_final_reps,
          dropset_percentage,
          superset_exercise_a_id,
          superset_weight_a,
          superset_reps_a,
          superset_exercise_b_id,
          superset_weight_b,
          superset_reps_b,
          giant_set_exercises,
          amrap_total_reps,
          amrap_duration_seconds,
          amrap_target_reps,
          fortime_total_reps,
          fortime_time_taken_sec,
          fortime_time_cap_sec,
          fortime_target_reps,
          emom_minute_number,
          emom_total_reps_this_min,
          emom_total_duration_sec,
          rest_pause_initial_weight,
          rest_pause_initial_reps,
          rest_pause_reps_after,
          rest_pause_number,
          preexhaust_isolation_exercise_id,
          preexhaust_isolation_weight,
          preexhaust_isolation_reps,
          preexhaust_compound_exercise_id,
          preexhaust_compound_weight,
          preexhaust_compound_reps,
          exercises (
            id,
            name,
            category
          )
        `)
        .eq("workout_log_id", workoutLogId)
        .eq("client_id", user.id)
        .order("completed_at", { ascending: true });

      if (setsError) {
        console.error("Error loading sets:", setsError);
        return;
      }

      // Get exercise names for superset/pre-exhaustion
      const exerciseIds = new Set<string>();
      sets?.forEach((set: any) => {
        if (set.exercise_id) exerciseIds.add(set.exercise_id);
        if (set.superset_exercise_a_id) exerciseIds.add(set.superset_exercise_a_id);
        if (set.superset_exercise_b_id) exerciseIds.add(set.superset_exercise_b_id);
        if (set.preexhaust_isolation_exercise_id) exerciseIds.add(set.preexhaust_isolation_exercise_id);
        if (set.preexhaust_compound_exercise_id) exerciseIds.add(set.preexhaust_compound_exercise_id);
      });

      const exerciseMap = new Map<string, string>();
      if (exerciseIds.size > 0) {
        const { data: exercises } = await supabase
          .from("exercises")
          .select("id, name")
          .in("id", Array.from(exerciseIds));
        
        exercises?.forEach((ex: any) => {
          exerciseMap.set(ex.id, ex.name);
        });
      }

      // Group sets by block_id
      const blocksMap = new Map<string, BlockGroup>();
      
      // First, create block groups for all blocks in the template (even if no sets)
      templateBlocks?.forEach((blockInfo) => {
        blocksMap.set(blockInfo.id, {
          block_id: blockInfo.id,
          block_type: blockInfo.block_type || "unknown",
          block_name: blockInfo.block_name || `Block ${blockInfo.block_order || ""}`,
          block_order: blockInfo.block_order || 0,
          sets: [],
          exercises: new Map(),
          totalSets: 0,
          totalReps: 0,
          totalWeight: 0,
        });
      });
      
      // Then, add sets to their respective blocks
      sets?.forEach((set: any) => {
        if (!set.block_id) return;
        
        const blockGroup = blocksMap.get(set.block_id);
        if (!blockGroup) {
          console.warn("Set found for block not in template:", set.block_id);
          return;
        }

        // Add exercise names for superset/pre-exhaustion
        if (set.superset_exercise_a_id) {
          set.exercise_a = { id: set.superset_exercise_a_id, name: exerciseMap.get(set.superset_exercise_a_id) || "Exercise A" };
        }
        if (set.superset_exercise_b_id) {
          set.exercise_b = { id: set.superset_exercise_b_id, name: exerciseMap.get(set.superset_exercise_b_id) || "Exercise B" };
        }
        if (set.preexhaust_isolation_exercise_id) {
          set.isolation_exercise = { id: set.preexhaust_isolation_exercise_id, name: exerciseMap.get(set.preexhaust_isolation_exercise_id) || "Isolation" };
        }
        if (set.preexhaust_compound_exercise_id) {
          set.compound_exercise = { id: set.preexhaust_compound_exercise_id, name: exerciseMap.get(set.preexhaust_compound_exercise_id) || "Compound" };
        }

        // Add set to block
        blockGroup.sets.push(set);
        blockGroup.totalSets += 1;
        blockGroup.totalReps += set.reps || 0;
        blockGroup.totalWeight += (set.weight || 0) * (set.reps || 0);

        // Group by exercise within block
        if (set.exercise_id) {
          const exerciseName = set.exercises?.name || "Unknown Exercise";
          let exerciseGroup = blockGroup.exercises.get(set.exercise_id);
          if (!exerciseGroup) {
            exerciseGroup = {
              exercise_id: set.exercise_id,
              exercise_name: exerciseName,
              sets: [],
              totalReps: 0,
              totalWeight: 0,
            };
            blockGroup.exercises.set(set.exercise_id, exerciseGroup);
          }
          exerciseGroup.sets.push(set);
          exerciseGroup.totalReps += set.reps || 0;
          exerciseGroup.totalWeight += (set.weight || 0) * (set.reps || 0);
        }
      });

      // Convert to array and sort by block_order - SHOW ALL BLOCKS (even if no sets)
      const blocksArray = Array.from(blocksMap.values())
        .sort((a, b) => (a.block_order || 0) - (b.block_order || 0));

      // Use totals from workout_log
      const totalSets = log.total_sets_completed || sets?.length || 0;
      const totalReps = log.total_reps_completed || sets?.reduce((sum: number, set: any) => sum + (set.reps || 0), 0) || 0;
      const totalWeight = log.total_weight_lifted || sets?.reduce(
        (sum: number, set: any) => sum + ((set.weight || 0) * (set.reps || 0)),
        0
      ) || 0;
      const uniqueExercises = new Set(sets?.map((s: any) => s.exercise_id).filter(Boolean) || []).size;
      const duration = log.total_duration_minutes || 0;

      setWorkoutLog(log);
      setBlockGroups(blocksArray);
      setTotalStats({
        totalSets,
        totalReps,
        totalWeight,
        uniqueExercises,
        duration,
      });
      
      // Expand first block by default
      if (blocksArray.length > 0) {
        setExpandedBlocks(new Set([blocksArray[0].block_id]));
      }
    } catch (error) {
      console.error("Error loading workout log:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatBlockType = (blockType: string) => {
    return blockType
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatSet = (set: WorkoutSet, blockType: string) => {
    const setNum = set.set_number || 1;
    
    switch (blockType) {
      case "amrap":
        return `• Set ${setNum}: ${set.weight || 0} kg × ${set.amrap_total_reps || set.reps || 0} reps (amrap_total_reps: ${set.amrap_total_reps || 0}, amrap_duration_seconds: ${set.amrap_duration_seconds || 0})`;
      
      case "for_time":
        return `• Set ${setNum}: ${set.weight || 0} kg × ${set.fortime_total_reps || set.reps || 0} reps (fortime_total_reps: ${set.fortime_total_reps || 0}, fortime_time_taken_sec: ${set.fortime_time_taken_sec || 0}${set.fortime_time_cap_sec ? ` / ${set.fortime_time_cap_sec} sec cap` : ""})`;
      
      case "dropset":
        const dropPct = set.dropset_percentage ? `${set.dropset_percentage}%` : "30%";
        return `• Set ${setNum}: ${set.dropset_initial_weight || set.weight || 0} kg × ${set.dropset_initial_reps || set.reps || 0} → ${set.dropset_final_weight || 0} kg × ${set.dropset_final_reps || 0} (${dropPct} drop)`;
      
      case "superset":
        return `• Set ${setNum}: ${set.superset_weight_a || 0} kg × ${set.superset_reps_a || 0} reps + ${set.superset_weight_b || 0} kg × ${set.superset_reps_b || 0} reps`;
      
      case "giant_set":
        const giantExercises = set.giant_set_exercises ? (typeof set.giant_set_exercises === 'string' ? JSON.parse(set.giant_set_exercises) : set.giant_set_exercises) : [];
        const giantStr = giantExercises.map((ex: any) => `${ex.weight || 0}kg×${ex.reps || 0}`).join(", ");
        return `• Round ${set.set_number || 1}: [${giantStr}]`;
      
      case "rest_pause":
        return `• Set ${setNum}: ${set.rest_pause_initial_weight || set.weight || 0} kg × ${set.rest_pause_initial_reps || set.reps || 0} reps (initial) → ${set.rest_pause_initial_weight || set.weight || 0} kg × ${set.rest_pause_reps_after || 0} reps (after rest)`;
      
      case "pre_exhaustion":
        return `• Set ${setNum}: [Isolation: ${set.preexhaust_isolation_weight || 0} kg × ${set.preexhaust_isolation_reps || 0}] → [Compound: ${set.preexhaust_compound_weight || 0} kg × ${set.preexhaust_compound_reps || 0}]`;
      
      case "emom":
        return `• Minute ${set.emom_minute_number || setNum}: ${set.emom_total_reps_this_min || set.reps || 0} reps`;
      
      default:
        return `• Set ${setNum}: ${set.weight || 0} kg × ${set.reps || 0} reps`;
    }
  };

  if (authLoading || loading) {
    return (
      <ProtectedRoute>
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className={`min-h-screen ${theme.background}`}>
            <div className="max-w-7xl mx-auto p-4 sm:p-6">
              <div className="animate-pulse">
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-4"></div>
                <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded"></div>
              </div>
            </div>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  if (!workoutLog) {
    return (
      <ProtectedRoute>
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className={`min-h-screen ${theme.background}`}>
            <div className="max-w-7xl mx-auto p-4 sm:p-6">
              <GlassCard elevation={2} className="p-12">
                <div className="text-center">
                  <p className={theme.textSecondary}>Workout log not found</p>
                  <Button
                    onClick={() => router.push("/client/progress/workout-logs")}
                    className="mt-4"
                  >
                    Back to Logs
                  </Button>
                </div>
              </GlassCard>
            </div>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  const completedDate = workoutLog.completed_at
    ? new Date(workoutLog.completed_at)
    : workoutLog.started_at
    ? new Date(workoutLog.started_at)
    : null;

  const startedDate = workoutLog.started_at ? new Date(workoutLog.started_at) : null;

  return (
    <ProtectedRoute>
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className={`min-h-screen ${theme.background}`}>
          <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
            {/* Back Button */}
            <div className="mb-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/client/progress/workout-logs")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>

            {/* Header Card with Gradient */}
            <GlassCard 
              elevation={3} 
              className="p-6 mb-8 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h1 className={`text-2xl sm:text-3xl font-bold text-white mb-2`}>
                    {workoutName}
                  </h1>
                  {completedDate && (
                    <div className="flex items-center gap-2 text-white/90">
                      <CheckCircle className="w-5 h-5" />
                      <span>
                        Completed - {completedDate.toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "short",
                          day: "numeric",
                        })} at {completedDate.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  )}
                  {totalStats.duration > 0 && (
                    <p className="text-white/80 mt-1">
                      Duration: {totalStats.duration} minutes
                    </p>
                  )}
                </div>
              </div>
            </GlassCard>

            {/* Stats Cards - Sets, Reps, Weight, Minutes */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <GlassCard elevation={2} className="p-6 text-center">
                <Target
                  className="w-6 h-6 mx-auto mb-2"
                  style={{ color: getSemanticColor("energy").primary }}
                />
                <p className="text-3xl font-bold" style={{ color: getSemanticColor("energy").primary }}>
                  {totalStats.totalSets}
                </p>
                <p className="text-sm font-semibold mt-1" style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)" }}>
                  SETS
                </p>
              </GlassCard>

              <GlassCard elevation={2} className="p-6 text-center">
                <Activity
                  className="w-6 h-6 mx-auto mb-2"
                  style={{ color: getSemanticColor("success").primary }}
                />
                <p className="text-3xl font-bold" style={{ color: getSemanticColor("success").primary }}>
                  {totalStats.totalReps}
                </p>
                <p className="text-sm font-semibold mt-1" style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)" }}>
                  REPS
                </p>
              </GlassCard>

              <GlassCard elevation={2} className="p-6 text-center">
                <TrendingUp
                  className="w-6 h-6 mx-auto mb-2"
                  style={{ color: getSemanticColor("success").primary }}
                />
                <p className="text-3xl font-bold" style={{ color: getSemanticColor("success").primary }}>
                  {totalStats.totalWeight.toLocaleString()}
                </p>
                <p className="text-sm font-semibold mt-1" style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)" }}>
                  WEIGHT (kg)
                </p>
              </GlassCard>

              <GlassCard elevation={2} className="p-6 text-center">
                <Clock
                  className="w-6 h-6 mx-auto mb-2"
                  style={{ color: getSemanticColor("trust").primary }}
                />
                <p className="text-3xl font-bold" style={{ color: getSemanticColor("trust").primary }}>
                  {totalStats.duration}
                </p>
                <p className="text-sm font-semibold mt-1" style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)" }}>
                  MINUTES
                </p>
              </GlassCard>
            </div>

            {/* Blocks Section - Expandable */}
            <div className="space-y-4">
              <h2 className={`text-xl font-bold ${theme.text} mb-4 flex items-center gap-2`}>
                <Layers className="w-5 h-5" />
                Blocks
              </h2>
              {blockGroups.map((block, blockIndex) => {
                const isExpanded = expandedBlocks.has(block.block_id);
                const hasSets = block.totalSets > 0;
                
                return (
                  <GlassCard key={block.block_id} elevation={2} className="overflow-hidden">
                    {/* Block Header - Clickable */}
                    <div
                      className="p-6 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      onClick={() => toggleBlock(block.block_id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className={`text-lg font-bold ${theme.text}`}>
                              Block {block.block_order || blockIndex + 1} - {formatBlockType(block.block_type)}
                            </h3>
                            {hasSets && (
                              <span className={`text-sm px-2 py-1 rounded-full ${theme.textSecondary} bg-slate-100 dark:bg-slate-800`}>
                                {block.totalSets} {block.totalSets === 1 ? "set" : "sets"}
                              </span>
                            )}
                          </div>
                          {!hasSets && (
                            <p className={`text-sm mt-1 ${theme.textSecondary}`}>
                              [no sets logged]
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5" style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)" }} />
                          ) : (
                            <ChevronDown className="w-5 h-5" style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)" }} />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Block Content - Expandable */}
                    {isExpanded && hasSets && (
                      <div className="px-6 pb-6 border-t border-slate-200 dark:border-slate-700">
                        <div className="mt-4 space-y-4">
                          {Array.from(block.exercises.values()).map((exercise) => (
                            <div key={exercise.exercise_id}>
                              <h4 className={`font-semibold mb-2 ${theme.text}`}>
                                {exercise.exercise_name}
                              </h4>
                              <div className="space-y-1 ml-4">
                                {exercise.sets
                                  .sort((a, b) => {
                                    if (a.set_number && b.set_number) {
                                      return a.set_number - b.set_number;
                                    }
                                    if (a.set_number) return -1;
                                    if (b.set_number) return 1;
                                    return new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime();
                                  })
                                  .map((set) => (
                                    <p key={set.id} className={`text-sm ${theme.textSecondary}`}>
                                      {formatSet(set, block.block_type)}
                                    </p>
                                  ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </GlassCard>
                );
              })}
            </div>
          </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
