"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { ClientPageShell } from "@/components/client-ui";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Clock,
  Share2,
  FileText,
  Repeat2,
  Trophy,
  ChevronRight,
  AlertCircle,
  Check,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { normalizeSetType } from "@/lib/setTypeUtils";
import { mapWorkoutBlocksRpcToSetEntries } from "@/lib/workoutBlocksRpcMapper";
import { cn } from "@/lib/utils";
import {
  formatPersonalRecordCaption,
  formatPersonalRecordImprovementSuffix,
} from "@/lib/personalRecordDisplay";
import { ProgramEditSetTypePill } from "@/components/coach/programs/ProgramEditSetTypePill";
import { PsHero, PsRpePill, PsSectionEyebrow } from "@/components/client/progress-suite";
import ps from "@/components/client/progress-suite/progressSuiteV1.module.css";

interface WorkoutSet {
  id: string;
  set_entry_id: string;
  set_type: string;
  exercise_id: string;
  weight: number | null;
  reps: number | null;
  rpe?: number | null;
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
  rest_pause_duration?: number | null;
  max_rest_pauses?: number | null;

  cluster_number?: number | null;

  tabata_rounds_completed?: number | null;
  tabata_total_duration_sec?: number | null;

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
  set_entry_id: string;
  set_type: string;
  set_name?: string;
  set_order?: number;
  sets: WorkoutSet[];
  exercises: Map<
    string,
    {
      exercise_id: string;
      exercise_name: string;
      sets: WorkoutSet[];
      totalReps: number;
      totalWeight: number;
    }
  >;
  totalSets: number;
  totalReps: number;
  totalWeight: number;
  exerciseNames: Map<string, string>; // For template exercise names
  exerciseLetterMap: Map<string, string>; // Maps exercise_id to letter (A, B, C, D)
  templateBlock?: any; // Store full template block data for blocks with no sets
}

export default function WorkoutLogDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { performanceSettings } = useTheme();
  const workoutLogId = useMemo(() => String(params?.id || ""), [params?.id]);

  const [loading, setLoading] = useState(true);
  const [workoutLog, setWorkoutLog] = useState<any>(null);
  const [workoutName, setWorkoutName] = useState<string>("Workout");
  const [blockGroups, setBlockGroups] = useState<BlockGroup[]>([]);
  const [personalRecords, setPersonalRecords] = useState<any[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalSets: 0,
    totalReps: 0,
    totalWeight: 0,
    uniqueExercises: 0,
    duration: 0,
  });

  useEffect(() => {
    if (workoutLogId) {
      setLoading(true);
      setWorkoutLog(null);
      setWorkoutName("Workout");
      setBlockGroups([]);
      setPersonalRecords([]);
      setTotalStats({
        totalSets: 0,
        totalReps: 0,
        totalWeight: 0,
        uniqueExercises: 0,
        duration: 0,
      });
    }
  }, [workoutLogId]);

  const [loadError, setLoadError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (user && !authLoading && workoutLogId) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        setLoading(false);
        setLoadError("Loading took too long. Tap Retry to try again.");
      }, 20_000);
      loadWorkoutLog().finally(() => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      });
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };
    }
    if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading, workoutLogId]);

  const loadWorkoutLog = async () => {
    if (!user?.id || !workoutLogId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // ── Wave 1: workout_log + set_logs fire in parallel ──
      // set_logs only needs workoutLogId (from URL), not from the log record
      const [logResult, setsResult] = await Promise.all([
        supabase
          .from("workout_logs")
          .select(
            "id, started_at, completed_at, total_duration_minutes, total_sets_completed, total_reps_completed, total_weight_lifted, workout_assignment_id, notes, overall_difficulty_rating, perceived_effort"
          )
          .eq("id", workoutLogId)
          .eq("client_id", user.id)
          .single(),
        supabase
          .from("workout_set_logs")
          .select(
            `id, workout_log_id, set_entry_id, set_type, exercise_id, weight, reps, rpe, set_number, completed_at,
            dropset_initial_weight, dropset_initial_reps, dropset_final_weight, dropset_final_reps, dropset_percentage,
            superset_exercise_a_id, superset_weight_a, superset_reps_a, superset_exercise_b_id, superset_weight_b, superset_reps_b,
            giant_set_exercises,
            amrap_total_reps, amrap_duration_seconds, amrap_target_reps,
            fortime_total_reps, fortime_time_taken_sec, fortime_time_cap_sec, fortime_target_reps,
            emom_minute_number, emom_total_reps_this_min, emom_total_duration_sec,
            rest_pause_initial_weight, rest_pause_initial_reps, rest_pause_reps_after, rest_pause_number, rest_pause_duration, max_rest_pauses,
            cluster_number,
            tabata_rounds_completed, tabata_total_duration_sec,
            preexhaust_isolation_exercise_id, preexhaust_isolation_weight, preexhaust_isolation_reps,
            preexhaust_compound_exercise_id, preexhaust_compound_weight, preexhaust_compound_reps,
            exercises (id, name, category)`
          )
          .eq("workout_log_id", workoutLogId)
          .eq("client_id", user.id)
          .order("completed_at", { ascending: true }),
      ]);

      const { data: log, error: logError } = logResult;
      const { data: sets, error: setsError } = setsResult;

      if (logError || !log) {
        console.error("Error loading workout log:", logError);
        setLoading(false);
        return;
      }
      if (setsError) {
        console.error("Error loading sets:", setsError);
      }

      // ── Wave 2: assignment + PRs fire in parallel (both need workout_assignment_id) ──
      let templateName = "Workout";
      let templateId: string | null = null;
      let prs: any[] = [];

      if (log.workout_assignment_id) {
        const [assignmentResult, prsResult] = await Promise.all([
          supabase
            .from("workout_assignments")
            .select(`workout_template_id, workout_templates (id, name)`)
            .eq("id", log.workout_assignment_id)
            .single(),
          supabase
            .from("personal_records")
            .select(`id, exercise_id, record_type, record_value, record_unit, previous_record_value, improvement_percentage, exercises (id, name)`)
            .eq("workout_assignment_id", log.workout_assignment_id)
            .eq("client_id", user.id),
        ]);

        const { data: assignment } = assignmentResult;
        if (assignment?.workout_templates) {
          templateName = (assignment.workout_templates as any).name || "Workout";
        }
        templateId = assignment?.workout_template_id || null;
        prs = prsResult.data || [];
      }
      setWorkoutName(templateName);

      if (!templateId) {
        console.error("No template_id found for assignment");
        setLoading(false);
        return;
      }

      // ── Wave 3: RPC for template blocks (needs templateId from wave 2) ──
      const { data: rpcBlocks, error: rpcError } = await supabase.rpc(
        "get_workout_blocks",
        { p_template_id: templateId }
      );
      if (rpcError) {
        console.error("Error loading blocks via RPC:", rpcError);
      }
      const templateBlocks = mapWorkoutBlocksRpcToSetEntries(rpcBlocks);

      // ── Build exercise name map from sets (joined) + RPC template data ──
      // The workout_set_logs query already joins exercises(id, name, category),
      // so we extract names from the sets themselves instead of a separate query.
      const exerciseMap = new Map<string, string>();
      sets?.forEach((set: any) => {
        if (set.exercises?.name) exerciseMap.set(set.exercise_id, set.exercises.name);
        if (set.giant_set_exercises && Array.isArray(set.giant_set_exercises)) {
          set.giant_set_exercises.forEach((ex: any) => {
            if (ex.exercise_id && ex.exercise_name) exerciseMap.set(ex.exercise_id, ex.exercise_name);
          });
        }
      });
      // Also populate from template blocks (for exercises not in logged sets)
      templateBlocks.forEach((block: any) => {
        (block.exercises || []).forEach((ex: any) => {
          if (ex.exercise_id && ex.exercise?.name && !exerciseMap.has(ex.exercise_id)) {
            exerciseMap.set(ex.exercise_id, ex.exercise.name);
          }
        });
      });

      // ── Assemble block groups ──
      const blocksMap = new Map<string, BlockGroup>();

      templateBlocks.forEach((block) => {
        const templateExerciseNames = new Map<string, string>();
        const exerciseLetterMap = new Map<string, string>();

        if (block.exercises && Array.isArray(block.exercises)) {
          const sortedExercises = [...block.exercises].sort((a: any, b: any) => {
            if (a.exercise_letter && b.exercise_letter) {
              return a.exercise_letter.localeCompare(b.exercise_letter);
            }
            return (a.exercise_order || 0) - (b.exercise_order || 0);
          });

          sortedExercises.forEach((ex: any, index: number) => {
            const name = ex.exercise?.name || exerciseMap.get(ex.exercise_id);
            if (ex.exercise_id && name) {
              templateExerciseNames.set(ex.exercise_id, name);
              const letter = ex.exercise_letter || String.fromCharCode(65 + index);
              exerciseLetterMap.set(ex.exercise_id, letter);
            }
          });
        }

        blocksMap.set(block.id, {
          set_entry_id: block.id,
          set_type: normalizeSetType(block.set_type) || "unknown",
          set_name: block.set_name || `Set ${block.set_order || ""}`,
          set_order: block.set_order || 0,
          sets: [],
          exercises: new Map(),
          totalSets: 0,
          totalReps: 0,
          totalWeight: 0,
          exerciseNames: templateExerciseNames,
          exerciseLetterMap: exerciseLetterMap,
          templateBlock: block,
        });
      });

      sets?.forEach((set: any) => {
        if (!set.set_entry_id) return;

        const blockGroup = blocksMap.get(set.set_entry_id);
        if (!blockGroup) {
          console.warn("Set found for block not in template:", set.set_entry_id);
          return;
        }

        if (set.superset_exercise_a_id) {
          set.exercise_a = {
            id: set.superset_exercise_a_id,
            name: exerciseMap.get(set.superset_exercise_a_id) || "Exercise A",
          };
        }
        if (set.superset_exercise_b_id) {
          set.exercise_b = {
            id: set.superset_exercise_b_id,
            name: exerciseMap.get(set.superset_exercise_b_id) || "Exercise B",
          };
        }
        if (set.preexhaust_isolation_exercise_id) {
          set.isolation_exercise = {
            id: set.preexhaust_isolation_exercise_id,
            name: exerciseMap.get(set.preexhaust_isolation_exercise_id) || "Isolation",
          };
        }
        if (set.preexhaust_compound_exercise_id) {
          set.compound_exercise = {
            id: set.preexhaust_compound_exercise_id,
            name: exerciseMap.get(set.preexhaust_compound_exercise_id) || "Compound",
          };
        }

        blockGroup.sets.push(set);
        blockGroup.totalSets += 1;
        blockGroup.totalReps += set.reps || 0;
        blockGroup.totalWeight += (set.weight || 0) * (set.reps || 0);

        if (set.exercise_id) {
          if (set.exercises?.name && !blockGroup.exerciseNames.has(set.exercise_id)) {
            blockGroup.exerciseNames.set(set.exercise_id, set.exercises.name);
          } else if (exerciseMap.has(set.exercise_id) && !blockGroup.exerciseNames.has(set.exercise_id)) {
            blockGroup.exerciseNames.set(set.exercise_id, exerciseMap.get(set.exercise_id)!);
          }
        }

        const normalizedBlockType = normalizeSetType(blockGroup.set_type);
        if (
          set.exercise_id &&
          !["giant_set", "superset", "pre_exhaustion"].includes(normalizedBlockType)
        ) {
          const exerciseName =
            blockGroup.exerciseNames.get(set.exercise_id) ||
            set.exercises?.name ||
            "Unknown Exercise";
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

        if (
          normalizedBlockType === "giant_set" &&
          set.giant_set_exercises &&
          Array.isArray(set.giant_set_exercises)
        ) {
          set.giant_set_exercises.forEach((ex: any) => {
            if (ex.exercise_id && !blockGroup.exerciseNames.has(ex.exercise_id) && exerciseMap.has(ex.exercise_id)) {
              blockGroup.exerciseNames.set(ex.exercise_id, exerciseMap.get(ex.exercise_id)!);
            }
          });
        }
      });

      const blocksArray = Array.from(blocksMap.values()).sort(
        (a, b) => (a.set_order || 0) - (b.set_order || 0)
      );

      const totalSets = log.total_sets_completed || sets?.length || 0;
      const totalReps =
        log.total_reps_completed ||
        sets?.reduce((sum: number, set: any) => sum + (set.reps || 0), 0) || 0;
      const totalWeight =
        log.total_weight_lifted ||
        sets?.reduce((sum: number, set: any) => sum + (set.weight || 0) * (set.reps || 0), 0) || 0;
      const uniqueExercises = new Set(
        sets?.map((s: any) => s.exercise_id).filter(Boolean) || []
      ).size;
      const duration = log.total_duration_minutes || 0;

      setWorkoutLog(log);
      setBlockGroups(blocksArray);
      setPersonalRecords(prs);
      setTotalStats({
        totalSets,
        totalReps,
        totalWeight,
        uniqueExercises,
        duration,
      });
    } catch (error) {
      console.error("Error loading workout log:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatBlockType = (blockType: string) => {
    return blockType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const fmtSec = (sec: number) =>
    `${Math.floor(sec / 60).toString().padStart(2, "0")}:${(sec % 60).toString().padStart(2, "0")}`;

  const renderSetRow = (
    set: WorkoutSet,
    blockType: string,
    exerciseNames: Map<string, string>,
    exerciseLetterMap?: Map<string, string>,
    index?: number
  ) => {
    const n = set.set_number || (index != null ? index + 1 : 1);
    const normalizedType = normalizeSetType(blockType);
    const rowBg = (index ?? 0) % 2 === 1 ? "bg-[color:var(--fc-surface-sunken)]/50" : "";

    switch (normalizedType) {
      case "drop_set":
        return (
          <div key={set.id} className={cn(ps.psDropRow, rowBg)}>
            <span className={cn(ps.psFontMono, "text-[11px]")} style={{ color: "var(--ps-t3)" }}>
              {n}
            </span>
            <div className="min-w-0">
              <span className={cn(ps.psFontMono, "text-[11px] font-medium")} style={{ color: "var(--ps-t1)", letterSpacing: "0.04em" }}>
                {set.dropset_initial_weight || set.weight || 0} kg × {set.dropset_initial_reps || set.reps || 0}
                {set.dropset_final_weight != null && (
                  <>
                    <span className="mx-1" style={{ color: "var(--ps-t4)" }}>
                      →
                    </span>
                    <span>
                      {set.dropset_final_weight} kg × {set.dropset_final_reps || 0}
                    </span>
                  </>
                )}
                {set.dropset_percentage != null && set.dropset_percentage > 0 ? (
                  <span className={ps.psDropTag}>−{Math.round(set.dropset_percentage)}% drop</span>
                ) : null}
              </span>
            </div>
            <div className="justify-self-end">
              <PsRpePill value={set.rpe} />
            </div>
          </div>
        );

      case "superset":
        return (
          <div key={set.id} className={`grid grid-cols-[2rem_1fr] gap-2 py-2 px-2 rounded-lg text-sm ${rowBg}`}>
            <span className="fc-text-dim font-mono">{n}</span>
            <div>
              <span className="fc-text-workouts font-bold mr-1">A:</span>
              <span className="font-medium fc-text-primary">
                {set.superset_weight_a || set.weight || 0} kg × {set.superset_reps_a || set.reps || 0}
              </span>
              {set.superset_weight_b != null && (
                <>
                  <span className="mx-2 fc-text-dim">+</span>
                  <span className="fc-text-workouts font-bold mr-1">B:</span>
                  <span className="font-medium fc-text-primary">
                    {set.superset_weight_b} kg × {set.superset_reps_b || 0}
                  </span>
                </>
              )}
              <span className="ml-2 inline-flex justify-end"><PsRpePill value={set.rpe} /></span>
            </div>
          </div>
        );

      case "giant_set":
        if (set.giant_set_exercises && Array.isArray(set.giant_set_exercises)) {
          return (
            <div key={set.id} className={`grid grid-cols-[2rem_1fr] gap-2 py-2 px-2 rounded-lg text-sm ${rowBg}`}>
              <span className="fc-text-dim font-mono">{n}</span>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                {set.giant_set_exercises.map((ex: any, idx: number) => {
                  const letter = ex.exercise_letter ||
                    (exerciseLetterMap && ex.exercise_id ? exerciseLetterMap.get(ex.exercise_id) : null) ||
                    String.fromCharCode(65 + idx);
                  return (
                    <span key={idx} className="font-medium fc-text-primary">
                      {idx > 0 && <span className="mr-1.5 fc-text-dim">+</span>}
                      <span className="fc-text-workouts font-bold mr-0.5">{letter}:</span>
                      {ex.weight || 0}kg×{ex.reps || 0}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        }
        return (
          <div key={set.id} className={`grid grid-cols-[2rem_1fr] gap-2 py-2 px-2 rounded-lg text-sm ${rowBg}`}>
            <span className="fc-text-dim font-mono">{n}</span>
            <span className="font-medium fc-text-primary">
              {set.weight || 0} kg × {set.reps || 0}
              <span className="ml-2 inline-flex justify-end"><PsRpePill value={set.rpe} /></span>
            </span>
          </div>
        );

      case "pre_exhaustion":
        return (
          <div key={set.id} className={`grid grid-cols-[2rem_1fr] gap-2 py-2 px-2 rounded-lg text-sm ${rowBg}`}>
            <span className="fc-text-dim font-mono">{n}</span>
            <div>
              <span className="fc-text-workouts font-bold mr-1">A:</span>
              <span className="font-medium fc-text-primary">
                {set.preexhaust_isolation_weight || 0} kg × {set.preexhaust_isolation_reps || 0}
              </span>
              <span className="mx-1.5 fc-text-dim">→</span>
              <span className="fc-text-workouts font-bold mr-1">B:</span>
              <span className="font-medium fc-text-primary">
                {set.preexhaust_compound_weight || 0} kg × {set.preexhaust_compound_reps || 0}
              </span>
              <span className="ml-2 inline-flex justify-end"><PsRpePill value={set.rpe} /></span>
            </div>
          </div>
        );

      case "cluster_set":
        return (
          <div key={set.id} className={`grid grid-cols-[2rem_1fr] gap-2 py-2 px-2 rounded-lg text-sm ${rowBg}`}>
            <span className="fc-text-dim font-mono">{n}</span>
            <span className="font-medium fc-text-primary">
              {set.weight || 0} kg × {set.reps || 0}
              {set.cluster_number != null && <span className="ml-1 fc-text-dim text-xs">(cluster {set.cluster_number})</span>}
              <span className="ml-2 inline-flex justify-end"><PsRpePill value={set.rpe} /></span>
            </span>
          </div>
        );

      case "rest_pause":
        return (
          <div key={set.id} className={`grid grid-cols-[2rem_1fr] gap-2 py-2 px-2 rounded-lg text-sm ${rowBg}`}>
            <span className="fc-text-dim font-mono">{n}</span>
            <div>
              <span className="font-medium fc-text-primary">
                {set.rest_pause_initial_weight || set.weight || 0} kg × {set.rest_pause_initial_reps || set.reps || 0}
              </span>
              {set.rest_pause_reps_after != null && (
                <>
                  <span className="mx-1.5 fc-text-dim">→</span>
                  <span className="font-medium fc-text-primary">
                    {set.rest_pause_initial_weight || set.weight || 0} kg × {set.rest_pause_reps_after}
                  </span>
                  <span className="ml-1.5 text-xs fc-text-dim">(pause #{set.rest_pause_number || 1})</span>
                </>
              )}
              <span className="ml-2 inline-flex justify-end"><PsRpePill value={set.rpe} /></span>
            </div>
          </div>
        );

      case "emom":
        return (
          <div key={set.id} className={`grid grid-cols-[2rem_1fr] gap-2 py-2 px-2 rounded-lg text-sm ${rowBg}`}>
            <span className="fc-text-dim font-mono">{set.emom_minute_number || n}</span>
            <span className="font-medium fc-text-primary">
              {set.emom_total_reps_this_min || set.reps || 0} reps
              {set.emom_total_duration_sec != null && (
                <span className="ml-2 text-xs fc-text-dim">({fmtSec(set.emom_total_duration_sec)})</span>
              )}
              <span className="ml-2 inline-flex justify-end"><PsRpePill value={set.rpe} /></span>
            </span>
          </div>
        );

      case "tabata":
        return (
          <div key={set.id} className={`grid grid-cols-[2rem_1fr] gap-2 py-2 px-2 rounded-lg text-sm ${rowBg}`}>
            <span className="fc-text-dim font-mono">{n}</span>
            <span className="font-medium fc-text-primary">
              {set.tabata_rounds_completed || 0} rounds
              {set.tabata_total_duration_sec != null && (
                <span className="ml-2 text-xs fc-text-dim">({fmtSec(set.tabata_total_duration_sec)})</span>
              )}
            </span>
          </div>
        );

      case "amrap":
        return (
          <div key={set.id} className={`grid grid-cols-[2rem_1fr] gap-2 py-2 px-2 rounded-lg text-sm ${rowBg}`}>
            <span className="fc-text-dim font-mono">{n}</span>
            <div>
              <span className="font-medium fc-text-primary">
                {set.weight || 0} kg × {set.amrap_total_reps || set.reps || 0}
              </span>
              {set.amrap_target_reps != null && (
                <span className="ml-2 text-xs fc-text-dim">(target: {set.amrap_target_reps})</span>
              )}
              {set.amrap_duration_seconds != null && (
                <span className="ml-2 text-xs fc-text-dim">({fmtSec(set.amrap_duration_seconds)})</span>
              )}
              <span className="ml-2 inline-flex justify-end"><PsRpePill value={set.rpe} /></span>
            </div>
          </div>
        );

      case "for_time": {
        const timeTaken = set.fortime_time_taken_sec != null ? fmtSec(set.fortime_time_taken_sec) : null;
        return (
          <div key={set.id} className={`grid grid-cols-[2rem_1fr] gap-2 py-2 px-2 rounded-lg text-sm ${rowBg}`}>
            <span className="fc-text-dim font-mono">{n}</span>
            <div>
              <span className="font-medium fc-text-primary">
                {set.weight || 0} kg × {set.fortime_total_reps || set.reps || 0}
              </span>
              {timeTaken && <span className="ml-2 text-xs fc-text-dim">(in {timeTaken})</span>}
              <span className="ml-2 inline-flex justify-end"><PsRpePill value={set.rpe} /></span>
            </div>
          </div>
        );
      }

      default:
        return (
          <div key={set.id} className={cn(ps.psSetsBody, rowBg)}>
            <span className={cn(ps.psFontMono, "text-[11px]")} style={{ color: "var(--ps-t3)" }}>
              {n}
            </span>
            <span className={cn(ps.psFontDisplay, "text-[15px] font-bold tabular-nums")} style={{ color: "var(--ps-t1)" }}>
              {set.weight || 0}
              <span className={cn(ps.psFontMono, "ml-0.5 text-[9px] font-normal")} style={{ color: "var(--ps-t3)" }}>
                kg
              </span>
            </span>
            <span
              className={cn(ps.psFontDisplay, "text-center text-[15px] font-bold tabular-nums")}
              style={{ color: "var(--ps-t1)" }}
            >
              {set.reps || 0}
            </span>
            <div className="flex justify-end">
              <PsRpePill value={set.rpe} />
            </div>
          </div>
        );
    }
  };

  const getBestSet = (sets: WorkoutSet[]) => {
    let best: WorkoutSet | null = null;
    let bestVolume = 0;
    for (const s of sets) {
      const vol = (s.weight || 0) * (s.reps || 0);
      if (vol > bestVolume) {
        bestVolume = vol;
        best = s;
      }
    }
    return best;
  };

  const renderTemplateExercises = (
    block: BlockGroup,
    exerciseNames: Map<string, string>
  ) => {
    if (!block.templateBlock) {
      return (
        <div className="pl-4 border-l-2 border-[color:var(--fc-glass-border)] text-sm text-[color:var(--fc-text-subtle)] italic">
          No template data available for this block.
        </div>
      );
    }

    const templateBlock = block.templateBlock;
    const blockType = templateBlock.set_type;

    // For Tabata, show exercises with their time protocol data
    // Use exerciseNames as primary source since it's guaranteed to be populated (header shows it)
    if (blockType === "tabata") {
      const exercises = templateBlock.exercises || [];
      const timeProtocols = templateBlock.time_protocols || [];
      const rounds = templateBlock.total_sets || 8;

      // Get rest_after_set from any time protocol (it's block-level, same for all exercises in tabata)
      // It might also be stored in block.rest_seconds
      const restAfterSet =
        timeProtocols.find(
          (tp: any) =>
            tp.rest_after_set !== null &&
            tp.rest_after_set !== undefined &&
            tp.rest_after_set > 0
        )?.rest_after_set ||
        templateBlock.rest_seconds ||
        null;

      // Always use exerciseNames as primary source - it's populated from template and shows in header
      if (exerciseNames.size > 0) {
        // Group exercises by set number (Tabata organizes exercises into sets/rounds)
        const setsMap = new Map<
          number,
          Array<{
            exerciseId: string;
            exerciseName: string;
            work_seconds: number;
            rest_seconds: number;
            exercise_order: number;
          }>
        >();

        // First, get all unique set numbers
        const allSetNumbers = new Set<number>();
        timeProtocols.forEach((tp: any) => {
          if (tp.set !== null && tp.set !== undefined) {
            allSetNumbers.add(tp.set);
          }
        });

        // If no set numbers found, treat all exercises as set 1
        const setNumbers =
          allSetNumbers.size > 0
            ? Array.from(allSetNumbers).sort((a, b) => a - b)
            : [1];

        // Group exercises by their set number
        setNumbers.forEach((setNum) => {
          if (!setsMap.has(setNum)) {
            setsMap.set(setNum, []);
          }

          // Find all exercises that belong to this set
          timeProtocols.forEach((tp: any) => {
            const tpSet = tp.set !== null && tp.set !== undefined ? tp.set : 1;
            if (tpSet === setNum) {
              const exerciseName =
                exerciseNames.get(tp.exercise_id) || "Exercise";
              const existingInSet = setsMap
                .get(setNum)!
                .find((e) => e.exerciseId === tp.exercise_id);

              if (!existingInSet) {
                setsMap.get(setNum)!.push({
                  exerciseId: tp.exercise_id,
                  exerciseName,
                  work_seconds: tp.work_seconds ?? 20,
                  rest_seconds: tp.rest_seconds ?? 10,
                  exercise_order: tp.exercise_order ?? 1,
                });
              }
            }
          });
        });

        // Sort exercises within each set by exercise_order
        setsMap.forEach((exercises, setNum) => {
          exercises.sort((a, b) => a.exercise_order - b.exercise_order);
        });

        // If we have sets, display them grouped by set
        if (setsMap.size > 0) {
          return (
            <div className="space-y-3">
              <div className="mb-2 text-sm font-semibold text-[color:var(--fc-text-primary)]">
                Rounds: {rounds}
              </div>
              {Array.from(setsMap.entries()).map(([setNum, setExercises]) => (
                <div
                  key={setNum}
                  className="pl-4 border-l-2 border-[color:var(--fc-glass-border)]"
                >
                  <div className="mb-1 text-xs font-semibold text-[color:var(--fc-text-subtle)]">
                    Set {setNum}:
                  </div>
                  {setExercises.map((ex, idx) => (
                    <div
                      key={ex.exerciseId || idx}
                      className="text-sm ml-2 mb-1"
                    >
                      <span className="font-medium">{ex.exerciseName}</span>
                      <span className="ml-2 text-[color:var(--fc-text-dim)]">
                        Work: {ex.work_seconds}s • Rest: {ex.rest_seconds}s
                      </span>
                    </div>
                  ))}
                </div>
              ))}
              {restAfterSet && (
                <div className="mt-2 text-xs text-[color:var(--fc-text-subtle)]">
                  Rest after set: {restAfterSet}s
                </div>
              )}
              <div className="mt-2 text-xs italic text-[color:var(--fc-text-subtle)]">
                (No sets logged for this block)
              </div>
            </div>
          );
        }

        // Fallback: If no sets found, display all exercises in a single group
        const allExercises = Array.from(exerciseNames.entries())
          .map(([exerciseId, exerciseName]) => {
            const tp = timeProtocols.find(
              (t: any) => t.exercise_id === exerciseId
            );
            return {
              exerciseId,
              exerciseName,
              work_seconds: tp?.work_seconds ?? 20,
              rest_seconds: tp?.rest_seconds ?? 10,
              exercise_order: tp?.exercise_order ?? 1,
            };
          })
          .sort((a, b) => a.exercise_order - b.exercise_order);

        return (
          <div className="space-y-3">
            <div className="mb-2 text-sm font-semibold text-[color:var(--fc-text-primary)]">
              Rounds: {rounds}
            </div>
            <div className="pl-4 border-l-2 border-[color:var(--fc-glass-border)]">
              <div className="mb-1 text-xs font-semibold text-[color:var(--fc-text-subtle)]">
                Exercises:
              </div>
              {allExercises.map((ex, idx) => (
                <div key={ex.exerciseId || idx} className="text-sm ml-2 mb-1">
                  <span className="font-medium">{ex.exerciseName}</span>
                  <span className="ml-2 text-[color:var(--fc-text-dim)]">
                    Work: {ex.work_seconds}s • Rest: {ex.rest_seconds}s
                  </span>
                </div>
              ))}
            </div>
            {restAfterSet && (
              <div className="mt-2 text-xs text-[color:var(--fc-text-subtle)]">
                Rest after set: {restAfterSet}s
              </div>
            )}
            <div className="mt-2 text-xs italic text-[color:var(--fc-text-subtle)]">
              (No sets logged for this block)
            </div>
          </div>
        );
      }

      // Fallback if no exercise names found
      return (
        <div className="pl-4 border-l-2 border-[color:var(--fc-glass-border)] text-sm text-[color:var(--fc-text-subtle)] italic">
          No exercises configured for this Tabata block.
        </div>
      );
    }

    // For other block types, show basic exercise information
    const exercises = templateBlock.exercises || [];
    if (exercises.length === 0) {
      return (
        <div className="pl-4 border-l-2 border-[color:var(--fc-glass-border)] text-sm text-[color:var(--fc-text-subtle)] italic">
          No exercises configured for this block.
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {exercises.map((ex: any, idx: number) => {
          const exerciseName = exerciseNames.get(ex.exercise_id) || "Exercise";
          return (
            <div
              key={idx}
              className="pl-4 border-l-2 border-[color:var(--fc-glass-border)] text-sm"
            >
              <span className="font-semibold">{exerciseName}</span>
              {ex.reps && (
                <span className="ml-2 text-[color:var(--fc-text-dim)]">
                  • Reps: {ex.reps}
                </span>
              )}
              {ex.load_percentage && (
                <span className="ml-2 text-[color:var(--fc-text-dim)]">
                  • Load: {ex.load_percentage}%
                </span>
              )}
              {ex.weight_kg && (
                <span className="ml-2 text-[color:var(--fc-text-dim)]">
                  • Weight: {ex.weight_kg} kg
                </span>
              )}
            </div>
          );
        })}
        <div className="pl-4 border-l-2 border-[color:var(--fc-glass-border)] mt-2 text-xs italic text-[color:var(--fc-text-subtle)]">
          (No sets logged for this block)
        </div>
      </div>
    );
  };

  if (loadError) {
    return (
      <ProtectedRoute requiredRole="client">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <ClientPageShell className="max-w-lg mx-auto px-4 pb-32 pt-6">
            <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
              <p className="text-sm text-[color:var(--fc-text-dim)] mb-3">{loadError}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="fc-btn fc-btn-secondary fc-press h-10 px-4 text-sm"
              >
                Retry
              </button>
            </div>
          </ClientPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  if (authLoading || loading) {
    return (
      <ProtectedRoute requiredRole="client">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <ClientPageShell className="max-w-lg mx-auto px-4 pb-32 pt-6">
            <PageSkeleton variant="dashboard" />
          </ClientPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  if (!workoutLog) {
    return (
      <ProtectedRoute requiredRole="client">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <ClientPageShell className="max-w-lg mx-auto px-4 pb-32 pt-6">
            <div className="text-center py-8">
              <p className="text-sm fc-text-dim">Workout log not found</p>
              <Button
                onClick={() => router.push("/client/progress/workout-logs")}
                className="fc-btn fc-btn-secondary mt-3 h-10 text-sm"
              >
                Back to Logs
              </Button>
            </div>
          </ClientPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  const isAbandoned = !workoutLog.completed_at;
  const hasNoSets = blockGroups.every((b) => b.totalSets === 0);

  const completedDate = workoutLog.completed_at
    ? new Date(workoutLog.completed_at)
    : workoutLog.started_at
    ? new Date(workoutLog.started_at)
    : null;

  const durationM = totalStats.duration;
  const durationStr =
    durationM >= 60
      ? `${Math.floor(durationM / 60)}h ${durationM % 60}m`
      : `${durationM}m`;

  const difficultyRating = workoutLog.overall_difficulty_rating;
  const workoutNotes = workoutLog.notes;

  const sortSets = (a: WorkoutSet, b: WorkoutSet) => {
    if (a.set_number && b.set_number) return a.set_number - b.set_number;
    if (a.set_number) return -1;
    if (b.set_number) return 1;
    return new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime();
  };

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <ClientPageShell className="max-w-lg mx-auto px-4 pb-36 pt-6 space-y-4">
            <div className={ps.psV1}>
            <PsHero
              glow="cyan"
              onBack={() => router.push("/client/progress/workout-logs")}
              backAriaLabel="Back to workout history"
              eyebrow={
                completedDate
                  ? `Session · ${completedDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}`
                  : "Session"
              }
              eyebrowColor="#4FE3E8"
              title={workoutName}
              titleCompact
              rightSlot={
                <button
                  type="button"
                  className={ps.psHeroIconBtn}
                  aria-label="More options"
                >
                  <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
                </button>
              }
            />

            <div className={cn(ps.psSessionCard, "relative z-[1] mt-4")}>
              <div>
                <span
                  className={
                    isAbandoned
                      ? "inline-flex items-center gap-1 rounded-[5px] border px-1.5 py-0.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.08em]"
                      : ps.psCompletedBadge
                  }
                  style={
                    isAbandoned
                      ? {
                          borderColor: "var(--ps-warning-dim)",
                          background: "var(--ps-warning-soft)",
                          color: "var(--ps-warning)",
                        }
                      : undefined
                  }
                >
                  {!isAbandoned && (
                    <Check className="h-2.5 w-2.5 shrink-0" strokeWidth={3} aria-hidden />
                  )}
                  {isAbandoned ? "Incomplete" : "Completed"}
                </span>
              </div>
              <p
                className={cn(ps.psFontMono, "flex flex-wrap items-center gap-1.5 text-[10.5px]")}
                style={{ color: "var(--ps-t3)" }}
              >
                <Clock className="h-2.5 w-2.5 shrink-0" aria-hidden />
                <span>
                  {completedDate
                    ? completedDate.toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })
                    : "—"}
                  {durationM > 0 ? ` · ${durationStr}` : ""}
                </span>
              </p>

              <div
                className="grid grid-cols-3 gap-2 border-t pt-2.5 text-center"
                style={{ borderColor: "var(--ps-line-2)", paddingTop: 10 }}
              >
                <div>
                  <p className={cn(ps.psFontDisplay, "text-[22px] font-bold tabular-nums")} style={{ color: "var(--ps-lime)" }}>
                    {totalStats.totalSets}
                  </p>
                  <p className={cn(ps.psFontMono, "mt-1 text-[9px] uppercase")} style={{ color: "var(--ps-t3)", letterSpacing: "0.12em" }}>
                    Sets
                  </p>
                </div>
                <div>
                  <p className={cn(ps.psFontDisplay, "text-[22px] font-bold tabular-nums")} style={{ color: "var(--ps-cyan)" }}>
                    {totalStats.totalReps}
                  </p>
                  <p className={cn(ps.psFontMono, "mt-1 text-[9px] uppercase")} style={{ color: "var(--ps-t3)", letterSpacing: "0.12em" }}>
                    Reps
                  </p>
                </div>
                <div>
                  <p className={cn(ps.psFontDisplay, "text-[22px] font-bold tabular-nums")} style={{ color: "var(--ps-t1)" }}>
                    {totalStats.totalWeight.toLocaleString()}
                    <span className={cn(ps.psFontMono, "text-[11px] font-normal")} style={{ color: "var(--ps-t3)" }}>
                      {" "}
                      kg
                    </span>
                  </p>
                  <p className={cn(ps.psFontMono, "mt-1 text-[9px] uppercase")} style={{ color: "var(--ps-t3)", letterSpacing: "0.12em" }}>
                    Volume
                  </p>
                </div>
              </div>

              {difficultyRating != null && difficultyRating > 0 && (
                <div className="mt-3 pt-3 border-t border-[color:var(--fc-glass-border)] flex flex-wrap items-center gap-2">
                  <span className="text-[10px] fc-text-subtle uppercase font-bold tracking-widest">Difficulty</span>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        className={`w-2 h-2 rounded-full ${
                          i < difficultyRating
                            ? "bg-[color:var(--fc-accent-cyan)]"
                            : "bg-[color:var(--fc-glass-border)]"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs fc-text-dim">{difficultyRating}/5</span>
                </div>
              )}

              {workoutNotes && (
                <div className="mt-3 p-3 rounded-lg bg-[color:var(--fc-surface-sunken)] border border-[color:var(--fc-glass-border)]">
                  <p className="text-xs fc-text-primary italic leading-relaxed">
                    &ldquo;{workoutNotes}&rdquo;
                  </p>
                </div>
              )}
            </div>

            {personalRecords.length > 0 && (
              <div className="fc-card-shell fc-card-shell--warning p-3">
                <h3 className="text-sm uppercase tracking-wider mb-2 flex items-center gap-1.5 font-bold fc-text-primary">
                  <Trophy className="w-4 h-4 text-[color:var(--fc-status-warning)] shrink-0" />
                  PRs this session
                </h3>
                <div className="space-y-2">
                  {personalRecords.map((pr: any) => {
                    const exerciseName = pr.exercises?.name || "Exercise";
                    const improvement = pr.previous_record_value
                      ? Number(pr.record_value) - Number(pr.previous_record_value)
                      : null;
                    const caption = formatPersonalRecordCaption(
                      pr.record_type,
                      pr.record_value,
                      pr.record_unit
                    );
                    const impSuffix =
                      improvement != null && improvement > 0
                        ? formatPersonalRecordImprovementSuffix(
                            pr.record_type,
                            improvement,
                            pr.record_unit
                          )
                        : "";
                    return (
                      <div
                        key={pr.id}
                        className="flex items-center justify-between gap-2 py-2 px-2 rounded-lg bg-[color:var(--fc-surface-sunken)] border border-[color:var(--fc-glass-border)]"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold fc-text-primary truncate">{exerciseName}</p>
                          <p className="text-[10px] fc-text-dim capitalize">{(pr.record_type || "").replace(/_/g, " ")}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold font-mono fc-text-primary tabular-nums">
                            {caption}
                          </p>
                          {impSuffix ? (
                            <p className="text-[10px] font-medium text-[color:var(--fc-status-success)]">
                              {impSuffix}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {isAbandoned && hasNoSets && (
              <div className="fc-card-shell p-4 text-center">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-[color:var(--fc-text-subtle)]" />
                <h3 className="text-sm uppercase tracking-wider mb-2 font-bold fc-text-primary">Workout not completed</h3>
                <p className="text-xs fc-text-dim">Started but not finished — no sets logged.</p>
              </div>
            )}

            {/* Exercise Breakdown — all expanded, card-per-exercise with table layout */}
            {!(isAbandoned && hasNoSets) && (
              <section className="mt-4 space-y-3">
                <PsSectionEyebrow accent="lime" className="px-0.5">
                  Exercises · {totalStats.uniqueExercises}
                </PsSectionEyebrow>
                {blockGroups.map((block) => {
                  const normalizedType = normalizeSetType(block.set_type);
                  const firstExerciseName =
                    block.exerciseNames.size > 0
                      ? Array.from(block.exerciseNames.values())[0]
                      : formatBlockType(normalizedType);

                  const isMultiExerciseBlock = [
                    "giant_set",
                    "superset",
                    "pre_exhaustion",
                  ].includes(normalizedType);

                  const showTableHeader = ["straight_set"].includes(normalizedType);
                  const sortedSets = [...block.sets].sort(sortSets);

                  const bestSet = getBestSet(block.sets);
                  const bestWeight = bestSet ? bestSet.weight || 0 : 0;
                  const bestReps = bestSet ? bestSet.reps || 0 : 0;

                  return (
                    <div key={block.set_entry_id} className={ps.psExerciseCard}>
                      <div>
                        <div className="mb-2">
                          <ProgramEditSetTypePill setType={block.set_type} />
                        </div>
                        <h4
                          className={cn(ps.psFontHeadline, "text-[15px] font-semibold leading-snug")}
                          style={{ color: "var(--ps-t1)" }}
                        >
                          {isMultiExerciseBlock
                            ? Array.from(block.exerciseNames.values()).join(" + ") || formatBlockType(normalizedType)
                            : firstExerciseName}
                        </h4>
                        <p
                          className={cn(ps.psFontMono, "mt-1 text-[9.5px] leading-snug")}
                          style={{ color: "var(--ps-t3)" }}
                        >
                          <strong style={{ color: "var(--ps-t1)", fontWeight: 500 }}>{block.totalSets} sets</strong>
                          {bestSet ? (
                            <>
                              {" "}
                              · best{" "}
                              <strong style={{ color: "var(--ps-t1)", fontWeight: 500 }}>
                                {bestWeight} kg × {bestReps}
                              </strong>
                            </>
                          ) : null}
                        </p>
                      </div>

                      <div className="pb-0.5">
                        {block.sets.length === 0 ? (
                          renderTemplateExercises(block, block.exerciseNames)
                        ) : isMultiExerciseBlock ? (
                          <div>
                            {/* Header row for multi-exercise */}
                            <div className="grid grid-cols-[2rem_1fr] gap-2 pb-1.5 mb-1 border-b border-[color:var(--fc-glass-border)]">
                              <span className="text-[10px] font-bold uppercase tracking-widest fc-text-subtle">#</span>
                              <span className="text-[10px] font-bold uppercase tracking-widest fc-text-subtle">Exercises</span>
                            </div>
                            {sortedSets.map((set, idx) =>
                              renderSetRow(set, block.set_type, block.exerciseNames, block.exerciseLetterMap, idx)
                            )}
                          </div>
                        ) : (
                          <div className="space-y-5">
                            {Array.from(block.exercises.values()).map((exercise) => (
                              <div key={exercise.exercise_id}>
                                {block.exercises.size > 1 && (
                                  <h5 className="mb-2 font-semibold text-sm fc-text-primary">
                                    {exercise.exercise_name}
                                  </h5>
                                )}
                                {/* Table header */}
                                {showTableHeader ? (
                                  <div className={cn(ps.psSetsGrid, "mb-1")}>
                                    <div className={ps.psSetsHead}>
                                      <span className={cn(ps.psFontMono, "text-[9px] font-medium uppercase")} style={{ color: "var(--ps-t3)", letterSpacing: "0.1em" }}>
                                        #
                                      </span>
                                      <span className={cn(ps.psFontMono, "text-[9px] font-medium uppercase")} style={{ color: "var(--ps-t3)", letterSpacing: "0.1em" }}>
                                        Weight
                                      </span>
                                      <span className={cn(ps.psFontMono, "text-center text-[9px] font-medium uppercase")} style={{ color: "var(--ps-t3)", letterSpacing: "0.1em" }}>
                                        Reps
                                      </span>
                                      <span className={cn(ps.psFontMono, "text-right text-[9px] font-medium uppercase")} style={{ color: "var(--ps-t3)", letterSpacing: "0.1em" }}>
                                        RPE
                                      </span>
                                    </div>
                                    {[...exercise.sets].sort(sortSets).map((set, idx) =>
                                      renderSetRow(set, block.set_type, block.exerciseNames, undefined, idx)
                                    )}
                                  </div>
                                ) : (
                                  <>
                                    <div className="grid grid-cols-[2rem_1fr] gap-2 pb-1.5 mb-1 border-b border-[color:var(--fc-glass-border)]">
                                      <span className="text-[10px] font-bold uppercase tracking-widest fc-text-subtle">#</span>
                                      <span className="text-[10px] font-bold uppercase tracking-widest fc-text-subtle">Details</span>
                                    </div>
                                    {[...exercise.sets].sort(sortSets).map((set, idx) =>
                                      renderSetRow(set, block.set_type, block.exerciseNames, undefined, idx)
                                    )}
                                  </>
                                )}
                                <button
                                  type="button"
                                  onClick={() => router.push(`/client/progress/analytics?exerciseId=${exercise.exercise_id}#strength-exercises`)}
                                  className={ps.psProgCta}
                                >
                                  <span className={ps.psProgCtaLabel}>
                                    View progression for {exercise.exercise_name}
                                  </span>
                                  <ChevronRight className="h-[13px] w-[13px] shrink-0" style={{ color: "var(--ps-cyan)" }} aria-hidden />
                                </button>
                              </div>
                            ))}
                            {/* Orphan sets */}
                            {block.sets.filter(
                              (set) => set.exercise_id && !block.exercises.has(set.exercise_id)
                            ).length > 0 && (
                              <div>
                                {block.sets
                                  .filter((set) => set.exercise_id && !block.exercises.has(set.exercise_id))
                                  .sort(sortSets)
                                  .map((set, idx) =>
                                    renderSetRow(set, block.set_type, block.exerciseNames, undefined, idx)
                                  )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </section>
            )}

            </div>

            <div className="fixed bottom-0 left-0 right-0 p-3 sm:p-4 z-50 bg-gradient-to-t from-[color:var(--fc-bg-base)] via-[color:var(--fc-bg-base)]/95 to-transparent backdrop-blur-sm">
              <div className="max-w-lg mx-auto w-full grid grid-cols-2 sm:grid-cols-3 gap-2">
                <Button
                  onClick={() => router.push("/client/progress/workout-logs")}
                  className="fc-btn rounded-xl h-10 text-sm font-semibold gap-1.5 bg-[color:var(--fc-status-error)] hover:opacity-90 text-[color:var(--fc-bg-base)] border-0"
                >
                  <Repeat2 className="w-4 h-4" />
                  Repeat
                </Button>
                <button
                  type="button"
                  className="rounded-xl h-10 text-sm fc-glass border border-[color:var(--fc-glass-border)] flex items-center justify-center gap-1.5 font-semibold fc-text-primary hover:fc-glass-soft"
                >
                  <Share2 className="w-4 h-4 fc-text-workouts" />
                  Share
                </button>
                <button
                  type="button"
                  className="rounded-xl h-10 text-sm fc-glass border border-[color:var(--fc-glass-border)] hidden sm:flex items-center justify-center gap-1.5 font-semibold fc-text-dim hover:fc-glass-soft col-span-2 sm:col-span-1"
                >
                  <FileText className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>
        </ClientPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
