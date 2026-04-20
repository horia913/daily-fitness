"use client";

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { CoachPageShell } from "@/components/coach-ui/CoachPageShell";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import WorkoutTemplateService, {
  ProgramSchedule,
  WorkoutTemplate,
} from "@/lib/workoutTemplateService";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  Target,
  Layers,
  Plus,
  Copy,
  Dumbbell,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import ExerciseBlockCard from "@/components/features/workouts/ExerciseBlockCard";
import { useExerciseLibrary } from "@/hooks/useCoachData";
import ProgramProgressionRulesEditor from "@/components/coach/ProgramProgressionRulesEditor";
import ProgramVolumeCalculator from "@/components/coach/ProgramVolumeCalculator";
import ProgressionSuggestionsModal from "@/components/coach/ProgressionSuggestionsModal";
import { TrainingBlockService } from "@/lib/trainingBlockService";
import { TrainingBlock } from "@/types/trainingBlock";
import { TrainingBlockHeader } from "@/components/coach/programs/TrainingBlockHeader";
import { TrainingBlockModal } from "@/components/coach/programs/TrainingBlockModal";
import { useToast } from "@/components/ui/toast-provider";
import { cn } from "@/lib/utils";
import { WorkoutBlockService } from "@/lib/workoutBlockService";

/** program_day 1–7 = Mon–Sun (1 = Monday) */
const PROGRAM_DAY_SHORT_LABELS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;

function programDayLabel(dayNum: number): string {
  if (dayNum >= 1 && dayNum <= 7)
    return PROGRAM_DAY_SHORT_LABELS[dayNum - 1];
  return `Day ${dayNum}`;
}

function goalDotClassForGoal(goal?: string | null): string {
  const g = (goal || "custom").toLowerCase();
  const map: Record<string, string> = {
    hypertrophy: "bg-cyan-400",
    strength: "bg-amber-400",
    power: "bg-orange-400",
    accumulation: "bg-emerald-400",
    conditioning: "bg-teal-400",
    sport_specific: "bg-purple-400",
    deload: "bg-gray-400",
    peaking: "bg-purple-400",
    general_fitness: "bg-emerald-400",
    custom: "bg-gray-400",
  };
  return map[g] ?? "bg-gray-400";
}

function goalBarClassForGoal(goal?: string | null): string {
  const g = (goal || "custom").toLowerCase();
  const map: Record<string, string> = {
    hypertrophy: "bg-cyan-400/60",
    strength: "bg-amber-400/60",
    power: "bg-orange-400/60",
    accumulation: "bg-emerald-400/60",
    conditioning: "bg-teal-400/60",
    sport_specific: "bg-purple-400/60",
    deload: "bg-gray-400/60",
    peaking: "bg-purple-400/60",
    general_fitness: "bg-emerald-400/60",
    custom: "bg-gray-400/60",
  };
  return map[g] ?? "bg-gray-400/60";
}

/** Match schedule rows to the active training block; legacy rows with null training_block_id count when only one block exists */
function scheduleRowMatchesActiveBlock(
  s: { training_block_id?: string | null },
  activeBlockId: string | null,
  trainingBlockCount: number,
): boolean {
  if (!activeBlockId) return true;
  if (s.training_block_id === activeBlockId) return true;
  if (s.training_block_id == null && trainingBlockCount <= 1) return true;
  return false;
}

interface Program {
  id: string;
  name: string;
  description?: string;
  coach_id: string;
  difficulty_level: "beginner" | "intermediate" | "advanced" | "athlete";
  duration_weeks: number;
  target_audience: string;
  category?: string | null; // Training category for volume calculator
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Helper function to generate block-type-specific summary
const getBlockSummary = (block: any): string => {
  if (!block) return "";

  const blockType = block.set_type || "";
  const exercises = block.exercises || [];
  const exerciseCount = exercises.length;

  switch (blockType) {
    case "straight_set": {
      const sets = block.total_sets || 3;
      const reps = block.reps_per_set || "10-12";
      const rest = block.rest_seconds || 60;
      // Get tempo and prescribed RPE (`rir` column) from first exercise if available
      const firstExercise = exercises[0];
      const tempo = firstExercise?.tempo;
      const prescribedRpe = firstExercise?.rir;
      let summary = `${sets} sets × ${reps} reps • ${rest}s rest`;
      if (tempo) summary += ` • Tempo ${tempo}`;
      if (prescribedRpe !== undefined && prescribedRpe !== null)
        summary += ` • RPE ${prescribedRpe}`;
      return summary;
    }

    case "superset":
      return `Superset • ${exerciseCount} exercises • ${
        block.total_sets || 3
      } sets`;

    case "giant_set":
      return `Giant Set • ${exerciseCount} exercises • ${
        block.total_sets || 3
      } sets`;

    case "pre_exhaust":
      return `Pre-Exhaust • Isolation → Compound • ${
        block.total_sets || 3
      } sets`;

    case "drop_set": {
      // Aggregate drop sets from all exercises in the block
      const allDropSets: any[] = [];
      exercises.forEach((ex: any) => {
        if (ex.drop_sets && Array.isArray(ex.drop_sets)) {
          allDropSets.push(...ex.drop_sets);
        }
      });
      // Also check block-level drop_sets if available
      if (block.drop_sets && Array.isArray(block.drop_sets)) {
        allDropSets.push(...block.drop_sets);
      }
      const uniqueDropCount = new Set(
        allDropSets.map((ds: any) => ds.drop_order),
      ).size;
      return `${uniqueDropCount} drops • ${block.total_sets || 3} sets`;
    }

    case "cluster_set": {
      // Get cluster set config from first exercise
      const firstExercise = exercises.find(
        (ex: any) => ex.cluster_sets && ex.cluster_sets.length > 0,
      );
      if (firstExercise?.cluster_sets?.[0]) {
        const config = firstExercise.cluster_sets[0];
        return `${config.clusters_per_set || 4} clusters × ${
          config.reps_per_cluster || 3
        } reps • ${config.intra_cluster_rest || 10}s intra-rest`;
      }
      // Fallback to block-level
      if (block.cluster_sets?.[0]) {
        const config = block.cluster_sets[0];
        return `${config.clusters_per_set || 4} clusters × ${
          config.reps_per_cluster || 3
        } reps • ${config.intra_cluster_rest || 10}s intra-rest`;
      }
      return `Cluster Set • ${block.total_sets || 3} sets`;
    }

    case "rest_pause": {
      // Get rest-pause config from first exercise
      const firstExercise = exercises.find(
        (ex: any) => ex.rest_pause_sets && ex.rest_pause_sets.length > 0,
      );
      if (firstExercise?.rest_pause_sets?.[0]) {
        const config = firstExercise.rest_pause_sets[0];
        return `Rest-Pause • ${
          config.rest_pause_duration || 15
        }s pauses • max ${config.max_rest_pauses || 3}`;
      }
      // Fallback to block-level
      if (block.rest_pause_sets?.[0]) {
        const config = block.rest_pause_sets[0];
        return `Rest-Pause • ${
          config.rest_pause_duration || 15
        }s pauses • max ${config.max_rest_pauses || 3}`;
      }
      return `Rest-Pause • ${block.total_sets || 3} sets`;
    }

    case "tabata": {
      const protocol = block.time_protocol;
      const work =
        protocol?.work_seconds || block.block_parameters?.work_seconds || 20;
      const rest =
        protocol?.rest_seconds || block.block_parameters?.rest_seconds || 10;
      const rounds = protocol?.rounds || block.block_parameters?.rounds || 8;
      return `Tabata • ${work}s/${rest}s • ${rounds} rounds`;
    }

    case "emom": {
      const protocol = block.time_protocol;
      const duration =
        protocol?.total_duration_minutes ||
        Math.floor((block.duration_seconds || 1200) / 60);
      return `EMOM • ${duration} minutes`;
    }

    case "amrap": {
      const protocol = block.time_protocol;
      const duration =
        protocol?.total_duration_minutes ||
        Math.floor((block.duration_seconds || 900) / 60);
      return `AMRAP • ${duration} minutes`;
    }

    case "for_time": {
      const protocol = block.time_protocol;
      const duration =
        protocol?.total_duration_minutes ||
        Math.floor((block.duration_seconds || 720) / 60);
      return `For Time • ${duration} min cap`;
    }

    default:
      return `${block.total_sets || 3} sets`;
  }
};

function EditProgramContent() {
  const params = useParams();
  const router = useRouter();
  const programId = useMemo(() => String(params?.id || ""), [params]);
  const { user } = useAuth();
  const { addToast } = useToast();
  const { performanceSettings } = useTheme();
  const { exercises: availableExercises } = useExerciseLibrary(user?.id || "");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Program | null>(null);
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string; color?: string }>
  >([]);
  const [categoryId, setCategoryId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<
    "basic" | "schedule" | "progression"
  >("basic");
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [schedule, setSchedule] = useState<ProgramSchedule[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [scheduleEditor, setScheduleEditor] = useState<{
    isOpen: boolean;
    week: number;
    day: number;
    blockId: string | null;
    templateId: string;
    isOptional: boolean;
    search: string;
  } | null>(null);
  const [scheduleCellSaving, setScheduleCellSaving] = useState(false);
  const [templateBlocks, setTemplateBlocks] = useState<Record<string, any[]>>(
    {},
  );
  /** Accumulated blocks for ProgramVolumeCalculator (chunk-loaded while on Schedule tab) */
  const [volumeTemplateBlocks, setVolumeTemplateBlocks] = useState<
    Record<string, any[]>
  >({});
  const weekBlocksLoadSeq = useRef(0);
  const [selectedScheduleForProgression, setSelectedScheduleForProgression] =
    useState<ProgramSchedule | null>(null);
  const [showProgressionSuggestions, setShowProgressionSuggestions] =
    useState(false);
  const [lastDeloadWeek, setLastDeloadWeek] = useState<number>(0);

  // Training block state (Phase 2/3)
  const [trainingBlocks, setTrainingBlocks] = useState<TrainingBlock[]>([]);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [editingBlock, setEditingBlock] = useState<TrainingBlock | null>(null);

  // Derived: the currently active training block
  const activeBlock = trainingBlocks.find((b) => b.id === activeBlockId) ?? null;
  // Week count scoped to the active block's duration
  const maxWeeks = activeBlock?.duration_weeks ?? form?.duration_weeks ?? 4;

  // Cumulative week offset: how many weeks come before the active block in the program.
  // Block 1 starts at week 1 (offset=0), Block 2 starts at week blockOffset+1, etc.
  // This converts the relative selectedWeek (1..maxWeeks) to an absolute week number
  // for storage in program_schedule.week_number, avoiding unique constraint collisions
  // between blocks that each use relative weeks 1-N.
  const blockStartWeek = useMemo(() => {
    let offset = 0;
    for (const block of trainingBlocks) {
      if (block.id === activeBlockId) break;
      offset += block.duration_weeks;
    }
    return offset + 1;
  }, [trainingBlocks, activeBlockId]);

  // The absolute week number to use for DB reads/writes this render cycle
  const absoluteSelectedWeek = blockStartWeek + selectedWeek - 1;

  const scheduleKey = useCallback(
    (week: number, day: number, blockId: string | null) =>
      `${week}:${day}:${blockId ?? "__none__"}`,
    [],
  );

  const scheduleMap = useMemo(() => {
    const map = new Map<string, ProgramSchedule>();
    for (const row of schedule) {
      const key = scheduleKey(
        row.week_number || 1,
        row.program_day,
        row.training_block_id ?? null,
      );
      map.set(key, row);
    }
    return map;
  }, [schedule, scheduleKey]);

  const weeksWithAnyConfiguredRows = useMemo(() => {
    const set = new Set<number>();
    for (const row of schedule) {
      set.add(row.week_number || 1);
    }
    return set;
  }, [schedule]);

  const scheduleVolumeKey = useMemo(
    () =>
      [
        ...new Set(
          (schedule || [])
            .map((s) => s.template_id)
            .filter((id): id is string => Boolean(id) && id !== "rest"),
        ),
      ].sort()
        .join(","),
    [schedule],
  );

  useEffect(() => {
    setVolumeTemplateBlocks({});
  }, [programId]);

  // Load set entries + workout_set_entry_exercises only for templates in the selected week (≤ ~6)
  useEffect(() => {
    if (!programId) return;
    let cancelled = false;
    const seq = ++weekBlocksLoadSeq.current;
    const weekIds = [
      ...new Set(
        schedule
          .filter(
            (s) =>
              (s.week_number || 1) === absoluteSelectedWeek &&
              scheduleRowMatchesActiveBlock(
                s,
                activeBlockId,
                trainingBlocks.length,
              ) &&
              s.template_id &&
              s.template_id !== "rest",
          )
          .map((s) => s.template_id as string),
      ),
    ];
    (async () => {
      if (weekIds.length === 0) {
        if (!cancelled && seq === weekBlocksLoadSeq.current) {
          setTemplateBlocks({});
        }
        return;
      }
      try {
        const { WorkoutBlockService } =
          await import("@/lib/workoutBlockService");
        const blocksByTemplate =
          await WorkoutBlockService.getWorkoutBlocksForTemplates(weekIds, {
            lite: true,
          });
        if (cancelled || seq !== weekBlocksLoadSeq.current) return;
        const blocksMap: Record<string, any[]> = {};
        blocksByTemplate.forEach((blocks, templateId) => {
          blocksMap[templateId] = blocks;
        });
        setTemplateBlocks(blocksMap);
      } catch (error) {
        console.error("[EditProgram] Week template blocks load failed:", error);
        if (!cancelled && seq === weekBlocksLoadSeq.current) {
          setTemplateBlocks({});
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    programId,
    schedule,
    absoluteSelectedWeek,
    activeBlockId,
    trainingBlocks.length,
  ]);

  // Background chunk load for volume calculator (avoids one giant query over all templates)
  useEffect(() => {
    if (activeTab !== "schedule" || !form?.category || !scheduleVolumeKey) {
      return;
    }
    const allIds = scheduleVolumeKey.split(",").filter(Boolean);
    if (allIds.length === 0) return;

    let cancelled = false;
    const CHUNK = 10;
    (async () => {
      for (let i = 0; i < allIds.length; i += CHUNK) {
        if (cancelled) break;
        const chunk = allIds.slice(i, i + CHUNK);
        try {
          const { WorkoutBlockService } =
            await import("@/lib/workoutBlockService");
          const map = await WorkoutBlockService.getWorkoutBlocksForTemplates(
            chunk,
            { lite: true },
          );
          if (cancelled) break;
          setVolumeTemplateBlocks((prev) => {
            const next = { ...prev };
            map.forEach((blocks, id) => {
              next[id] = blocks;
            });
            return next;
          });
        } catch (e) {
          console.error("[EditProgram] Volume calculator chunk load:", e);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, form?.category, scheduleVolumeKey]);

  // Available exercises list for ExerciseBlockCard
  const availableExercisesList = availableExercises;

  // Load categories from workout_categories table (same as workouts)
  const loadCategories = useCallback(async () => {
    try {
      if (!user?.id) return;
      if (process.env.NODE_ENV !== "production")
        console.time("[EditProgram] loadCategories");
      const { data, error } = await supabase
        .from("workout_categories")
        .select("id, name, color")
        .eq("coach_id", user.id)
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (process.env.NODE_ENV !== "production") {
        console.timeEnd("[EditProgram] loadCategories");
        console.log("[EditProgram] loadCategories rows:", data?.length ?? 0);
      }
      if (error) {
        console.error("Error loading categories:", error);
        return;
      }
      if (data && data.length > 0) {
        setCategories(data);
      } else {
        setCategories([]);
      }
    } catch (error) {
      console.error("Error loading categories:", error);
      setCategories([]);
    }
  }, [user?.id]);

  // Set categoryId when form loads or category changes
  useEffect(() => {
    if (form?.category && categories.length > 0) {
      const matchingCategory = categories.find((c) => c.name === form.category);
      if (matchingCategory) {
        setCategoryId(matchingCategory.id);
      } else {
        setCategoryId("none");
      }
    } else {
      setCategoryId("none");
    }
  }, [form?.category, categories]);

  const load = useCallback(async () => {
    if (!programId) return;
    setLoading(true);
    if (process.env.NODE_ENV !== "production")
      console.time("[EditProgram] load");
    try {
      // Wave 1: program, schedule, and categories in parallel (no dependency between them)
      const [programRes, sched, _] = await Promise.all([
        supabase
          .from("workout_programs")
          .select(
            "id, name, description, coach_id, difficulty_level, duration_weeks, target_audience, category, is_active, created_at, updated_at",
          )
          .eq("id", programId)
          .single(),
        WorkoutTemplateService.getProgramSchedule(programId),
        loadCategories(),
      ]);
      const { data: programData } = programRes;
      if (programData) setForm(programData as Program);
      if (process.env.NODE_ENV !== "production") {
        console.log(
          "[EditProgram] Loaded schedule data:",
          JSON.stringify(sched || [], null, 2),
        );
      }
      setSchedule(sched || []);

      // Load training blocks; auto-create implicit block if none exist
      if (programId) {
        let blocks = await TrainingBlockService.getTrainingBlocks(programId);
        if (blocks.length === 0 && programData) {
          const implicit = await TrainingBlockService.getOrCreateImplicitBlock(
            programId,
            programData.name,
            programData.duration_weeks ?? 4,
          );
          blocks = implicit ? [implicit] : [];
        }
        setTrainingBlocks(blocks);
        if (blocks.length > 0) {
          setActiveBlockId((prev) => prev ?? blocks[0].id);
        }
      }

      // Wave 2: coach template list only — blocks/exercises load per selected week (useEffect)
      const list = user?.id
        ? await WorkoutTemplateService.getWorkoutTemplates(user.id, {
            skipExerciseCount: true,
          })
        : [];
      if (process.env.NODE_ENV !== "production") {
        console.log("[EditProgram] getWorkoutTemplates rows:", list.length);
      }

      setTemplates(list || []);
    } finally {
      if (process.env.NODE_ENV !== "production")
        console.timeEnd("[EditProgram] load");
      setLoading(false);
    }
  }, [programId, user?.id, loadCategories]);

  const editTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (editTimeoutRef.current) clearTimeout(editTimeoutRef.current);
    editTimeoutRef.current = setTimeout(() => {
      editTimeoutRef.current = null;
      setLoading(false);
    }, 20_000);
    load().finally(() => {
      if (editTimeoutRef.current) {
        clearTimeout(editTimeoutRef.current);
        editTimeoutRef.current = null;
      }
    });
    return () => {
      if (editTimeoutRef.current) {
        clearTimeout(editTimeoutRef.current);
        editTimeoutRef.current = null;
      }
    };
  }, [load]);

  const onSave = async () => {
    if (!form || !form.name.trim()) return;
    setSaving(true);
    try {
      // Get category name from selected categoryId
      const selectedCategory =
        categoryId && categoryId !== "none"
          ? categories.find((c) => c.id === categoryId)
          : null;
      const categoryName = selectedCategory?.name || null;

      await WorkoutTemplateService.updateProgram(form.id, {
        name: form.name,
        description: form.description,
        difficulty_level: form.difficulty_level,
        duration_weeks: form.duration_weeks,
        category: categoryName,
        is_active: form.is_active,
        coach_id: form.coach_id,
      });
      router.push(`/coach/programs/${form.id}`);
    } finally {
      setSaving(false);
    }
  };

  // ── Training block handlers ──────────────────────────────────────────────

  const refreshBlocks = async (): Promise<TrainingBlock[]> => {
    if (!programId) return [];
    const blocks = await TrainingBlockService.getTrainingBlocks(programId);
    setTrainingBlocks(blocks);
    // Auto-sync program duration_weeks to sum of block durations
    const total = blocks.reduce((sum, b) => sum + b.duration_weeks, 0);
    if (total > 0 && form) {
      await WorkoutTemplateService.updateProgram(programId, { duration_weeks: total });
      setForm((prev) => (prev ? { ...prev, duration_weeks: total } : prev));
    }
    return blocks;
  };

  const handleUpdateBlock = async (blockId: string, updates: Partial<TrainingBlock>) => {
    const updated = await TrainingBlockService.updateTrainingBlock(blockId, updates);
    if (updated) {
      setTrainingBlocks((prev) => prev.map((b) => (b.id === blockId ? updated : b)));
      // Re-sync program duration when block duration changes
      if (updates.duration_weeks !== undefined && form) {
        const newTotal = trainingBlocks.reduce(
          (sum, b) => sum + (b.id === blockId ? (updates.duration_weeks as number) : b.duration_weeks),
          0,
        );
        await WorkoutTemplateService.updateProgram(programId, { duration_weeks: newTotal });
        setForm((prev) => (prev ? { ...prev, duration_weeks: newTotal } : prev));
      }
    }
  };

  const handleBlockSaved = async (saved: TrainingBlock) => {
    await refreshBlocks();
    setActiveBlockId(saved.id);
  };

  /** After a block is removed (DB delete already done in modal, or by header handler). */
  const syncAfterTrainingBlockRemoved = async (blockId: string) => {
    const blocks = await refreshBlocks();
    setActiveBlockId((prev) => {
      if (prev !== blockId) return prev;
      return blocks[0]?.id ?? null;
    });
    if (form?.id) {
      const sched = await WorkoutTemplateService.getProgramSchedule(form.id);
      setSchedule(sched || []);
    }
  };

  /** Header “…” menu: confirm, delete on server, then sync UI. */
  const handleDeleteBlockFromHeader = async (blockId: string) => {
    if (
      !window.confirm(
        "Delete this training block and all of its scheduled workouts for this program? This cannot be undone.",
      )
    ) {
      return;
    }
    const ok = await TrainingBlockService.deleteTrainingBlock(blockId);
    if (!ok) {
      addToast({
        title: "Could not delete training block.",
        variant: "destructive",
      });
      return;
    }
    await syncAfterTrainingBlockRemoved(blockId);
  };

  const handleMoveBlock = async (blockId: string, direction: "left" | "right") => {
    const idx = trainingBlocks.findIndex((b) => b.id === blockId);
    if (idx < 0) return;
    const newOrder = [...trainingBlocks];
    const swapIdx = direction === "left" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newOrder.length) return;
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    const orderedIds = newOrder.map((b) => b.id);
    await TrainingBlockService.reorderTrainingBlocks(programId, orderedIds);
    await refreshBlocks();
  };

  const handleDayTemplateChange = async (day: number, v: string) => {
    if (!form?.id) return;
    if (v === "rest") {
      await WorkoutTemplateService.removeProgramSchedule(
        form.id,
        day,
        absoluteSelectedWeek,
      );
      setSchedule((prev) =>
        prev.filter(
          (s) =>
            !(
              (s.week_number || 1) === absoluteSelectedWeek &&
              s.program_day === day &&
              scheduleRowMatchesActiveBlock(
                s,
                activeBlockId,
                trainingBlocks.length,
              )
            ),
        ),
      );
    } else {
      const result = await WorkoutTemplateService.setProgramSchedule(
        form.id,
        day,
        absoluteSelectedWeek,
        v,
        false,
        undefined,
        activeBlockId ?? undefined,
      );
      if (!result) {
        addToast({
          title: "Failed to save schedule. Please check if you have permission to edit this program.",
          variant: "destructive",
        });
        return;
      }

      if (selectedWeek === 1) {
        const { error: copyError } = await supabase.rpc("copy_week_schedule", {
          p_program_id: form.id,
          p_source_week: 1,
          p_total_weeks: form.duration_weeks,
        });
        if (copyError) {
          addToast({
            title: `Could not copy week 1 to other weeks: ${copyError.message}`,
            variant: "destructive",
          });
        } else {
          await WorkoutTemplateService.propagateAllScheduleSlotsToSnapshots(form.id);
        }
      }

      const sched = await WorkoutTemplateService.getProgramSchedule(form.id);
      if (process.env.NODE_ENV !== "production") {
        console.log(
          "[EditProgram] Schedule data after save:",
          JSON.stringify(sched || [], null, 2),
        );
      }
      setSchedule(sched || []);
    }
  };

  const openScheduleEditor = useCallback(
    (week: number, day: number, blockId: string | null) => {
      const existing = scheduleMap.get(scheduleKey(week, day, blockId));
      setScheduleEditor({
        isOpen: true,
        week,
        day,
        blockId,
        templateId: existing?.template_id || "rest",
        isOptional: Boolean(existing?.is_optional),
        search: "",
      });
      setSelectedWeek(Math.max(1, week - blockStartWeek + 1));
      setSelectedDay(day);
    },
    [scheduleMap, scheduleKey, blockStartWeek],
  );

  const saveScheduleEditor = useCallback(async () => {
    if (!form?.id || !scheduleEditor) return;
    setScheduleCellSaving(true);
    try {
      if (scheduleEditor.templateId === "rest") {
        await WorkoutTemplateService.removeProgramSchedule(
          form.id,
          scheduleEditor.day,
          scheduleEditor.week,
        );
        setSchedule((prev) =>
          prev.filter(
            (row) =>
              !(
                (row.week_number || 1) === scheduleEditor.week &&
                row.program_day === scheduleEditor.day &&
                (row.training_block_id ?? null) === (scheduleEditor.blockId ?? null)
              ),
          ),
        );
      } else {
        const result = await WorkoutTemplateService.setProgramSchedule(
          form.id,
          scheduleEditor.day,
          scheduleEditor.week,
          scheduleEditor.templateId,
          scheduleEditor.isOptional,
          undefined,
          scheduleEditor.blockId ?? undefined,
        );
        if (!result) {
          addToast({
            title: "Failed to save schedule. Please check your permissions.",
            variant: "destructive",
          });
          return;
        }

        setSchedule((prev) => {
          const filtered = prev.filter(
            (row) =>
              !(
                (row.week_number || 1) === scheduleEditor.week &&
                row.program_day === scheduleEditor.day &&
                (row.training_block_id ?? null) === (scheduleEditor.blockId ?? null)
              ),
          );
          return [...filtered, result];
        });
      }
      setScheduleEditor(null);
    } finally {
      setScheduleCellSaving(false);
    }
  }, [form?.id, scheduleEditor, addToast]);

  const handleCopyFromWeekOne = useCallback(async () => {
    if (!form?.id) return;
    const { error: copyError } = await supabase.rpc("copy_week_schedule", {
      p_program_id: form.id,
      p_source_week: 1,
      p_total_weeks: form.duration_weeks,
    });
    if (copyError) {
      addToast({
        title: `Could not copy week 1 to other weeks: ${copyError.message}`,
        variant: "destructive",
      });
      return;
    }
    await WorkoutTemplateService.propagateAllScheduleSlotsToSnapshots(form.id);
    const sched = await WorkoutTemplateService.getProgramSchedule(form.id);
    setSchedule(sched || []);
    addToast({
      title: "Copied week 1 schedule across all weeks.",
    });
  }, [form?.id, form?.duration_weeks, addToast]);

  if (loading || !form) {
    return (
      <AnimatedBackground>
        <CoachPageShell widthVariant="data-7xl" className="p-3 pb-32 sm:p-6 md:p-6">
          <PageSkeleton variant="form" />
        </CoachPageShell>
      </AnimatedBackground>
    );
  }

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}
      <CoachPageShell widthVariant="data-7xl" className="p-3 pb-32 sm:p-6 md:p-6 space-y-4 sm:space-y-6">
        <GlassCard elevation={2} className="fc-card-shell p-3 sm:p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-[color:var(--fc-domain-workouts)]/20 text-[color:var(--fc-accent)] flex items-center justify-center flex-shrink-0">
                <Dumbbell className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-[color:var(--fc-text-primary)] truncate">
                    Edit program
                  </h1>
                  {form.is_active ? (
                    <Badge className="fc-badge bg-[color:var(--fc-status-success)]/20 text-[color:var(--fc-status-success)] border-[color:var(--fc-status-success)]/30">
                      Active
                    </Badge>
                  ) : (
                    <Badge className="fc-badge bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-text-dim)] border-[color:var(--fc-glass-border)]">
                      Draft
                    </Badge>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] mt-1 truncate">
                  {form.name}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="fc-btn fc-btn-ghost shrink-0 self-start sm:self-auto"
              onClick={() => router.push("/coach/programs")}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </div>
        </GlassCard>

        {/* Training Block Header — goal/duration for single block, timeline for multi */}
        {trainingBlocks.length > 0 && (
          <TrainingBlockHeader
            trainingBlocks={trainingBlocks}
            activeBlockId={activeBlockId}
            onSelectBlock={(id) => {
              setActiveBlockId(id);
              setSelectedWeek(1);
              setSelectedScheduleForProgression(null);
            }}
            onAddBlock={() => {
              setEditingBlock(null);
              setShowBlockModal(true);
            }}
            onEditBlock={(block) => {
              setEditingBlock(block);
              setShowBlockModal(true);
            }}
            onDeleteBlock={handleDeleteBlockFromHeader}
            onUpdateBlock={handleUpdateBlock}
            onMoveBlock={handleMoveBlock}
          />
        )}

        <div className="border-b border-[color:var(--fc-glass-border)] -mx-3 sm:mx-0 px-3 sm:px-0">
          <nav
            className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
            role="tablist"
            aria-label="Program sections"
          >
            {[
              { id: "basic" as const, label: "Info" },
              { id: "schedule" as const, label: "Schedule" },
              { id: "progression" as const, label: "Progression" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "bg-transparent border-none cursor-pointer",
                    "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 min-h-[44px] rounded-t-xl",
                    "border-b-2 -mb-[1px]",
                    isActive
                      ? "text-[color:var(--fc-accent)] border-[color:var(--fc-accent)]"
                      : "text-[color:var(--fc-text-dim)] border-transparent hover:text-[color:var(--fc-text-primary)] hover:border-[color:var(--fc-glass-border)]",
                  )}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

          {/* Tab Content */}
          {activeTab === "basic" && (
            <div role="tabpanel" className="space-y-4">
              <GlassCard elevation={1} className="fc-card-shell p-4 sm:p-6 space-y-4">
                {/* Program Name */}
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-[color:var(--fc-text-dim)] block mb-1.5">
                    Program name *
                  </label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-[color:var(--fc-text-dim)] block mb-1.5">
                    Description
                  </label>
                  <Textarea
                    value={form.description || ""}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    rows={4}
                    className="text-sm resize-none"
                  />
                </div>

                {/* Difficulty & Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wide text-[color:var(--fc-text-dim)] block mb-1.5">
                      Difficulty
                    </label>
                    <Select
                      value={form.difficulty_level}
                      onValueChange={(v) =>
                        setForm({ ...form, difficulty_level: v as any })
                      }
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                        <SelectItem value="athlete">Athlete</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wide text-[color:var(--fc-text-dim)] block mb-1.5">
                      Duration (weeks)
                    </label>
                    {trainingBlocks.length > 1 ? (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm bg-[color:var(--fc-glass-soft)] border border-[color:var(--fc-glass-border)] text-[color:var(--fc-text-dim)] min-h-9">
                        <Layers className="w-4 h-4 flex-shrink-0 text-[color:var(--fc-text-dim)] opacity-60" />
                        <span>
                          {trainingBlocks.reduce((sum, b) => sum + b.duration_weeks, 0)} weeks
                          <span className="ml-1.5 text-xs text-[color:var(--fc-text-dim)] opacity-70">
                            (across {trainingBlocks.length} block{trainingBlocks.length !== 1 ? "s" : ""} — edit each block to adjust)
                          </span>
                        </span>
                      </div>
                    ) : (
                      <Input
                        type="number"
                        min={1}
                        max={52}
                        value={form.duration_weeks}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            duration_weeks: parseInt(e.target.value || "1", 10),
                          })
                        }
                        className="h-9 text-sm"
                      />
                    )}
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-[color:var(--fc-text-dim)] block mb-1.5">
                    Category{" "}
                    <span className="normal-case text-[color:var(--fc-text-dim)] font-normal opacity-70">
                      (optional)
                    </span>
                  </label>
                  <Select
                    value={categoryId || "none"}
                    onValueChange={(v) => {
                      if (v === "none") {
                        setCategoryId("");
                        setForm({
                          ...form,
                          category: null,
                        });
                      } else {
                        setCategoryId(v);
                        const selectedCat = categories.find((c) => c.id === v);
                        setForm({
                          ...form,
                          category: selectedCat?.name || null,
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select category (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        None (No progression guidelines)
                      </SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {categories.length === 0 && (
                    <p className="text-xs fc-text-dim mt-1">
                      No categories available. Create categories in the
                      Categories section.
                    </p>
                  )}
                </div>

                {/* Active Toggle */}
                <label className="flex cursor-pointer items-center justify-between gap-3 border-t border-[color:var(--fc-glass-border)] pt-2">
                  <div className="min-w-0">
                    <span className="block text-sm font-medium text-[color:var(--fc-text-primary)]">
                      Active
                    </span>
                    <p className="mt-0.5 text-xs text-[color:var(--fc-text-dim)]">
                      Visible to clients and available for assignment.
                    </p>
                  </div>
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(checked) =>
                      setForm({ ...form, is_active: checked })
                    }
                    className="shrink-0"
                  />
                </label>
              </GlassCard>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    router.push(`/coach/programs/${form.id}`)
                  }
                  className="fc-btn fc-btn-ghost"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={onSave}
                  disabled={saving || !form.name.trim()}
                  className="fc-btn fc-btn-primary"
                >
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          )}

          {activeTab === "schedule" && (
            <div role="tabpanel" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-semibold text-[color:var(--fc-text-primary)] truncate">
                    Week-at-a-glance schedule
                  </h2>
                  <p className="text-xs text-[color:var(--fc-text-dim)] mt-0.5">
                    Click any cell to assign a template, mark optional, or rest.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="fc-btn fc-btn-secondary shrink-0"
                  onClick={() => void handleCopyFromWeekOne()}
                >
                  <Copy className="w-3.5 h-3.5 mr-1" />
                  Copy from week 1
                </Button>
              </div>

              <div>
                {(() => {
                  const effectiveBlocks =
                    trainingBlocks.length > 0
                      ? trainingBlocks
                      : [
                          {
                            id: "__fallback__",
                            block_order: 1,
                            duration_weeks: form.duration_weeks,
                            goal: "custom",
                            name: "Block 1",
                          } as unknown as TrainingBlock,
                        ];

                  let globalWeekCursor = 1;
                  return (
                    <div className="space-y-4">
                      {effectiveBlocks.map((block, idx) => {
                        const blockStart = globalWeekCursor;
                        const blockEnd = blockStart + block.duration_weeks - 1;
                        globalWeekCursor = blockEnd + 1;

                        const blockRows = Array.from(
                          { length: block.duration_weeks },
                          (_, i) => blockStart + i,
                        );

                        return (
                          <section key={`${block.id}-${blockStart}`} className="space-y-2">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[color:var(--fc-accent)]/80">
                              Block {idx + 1} · {(block.goal || "custom").replace(/_/g, " ")} (Weeks {blockStart}-{blockEnd})
                            </h3>

                            <div className="overflow-x-auto rounded-xl border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-soft)]">
                              <div className="min-w-[860px] p-2">
                                <div className="grid grid-cols-[110px_repeat(7,minmax(110px,1fr))] gap-2 text-[10px] uppercase tracking-wide text-[color:var(--fc-text-dim)]">
                                  <div className="sticky left-0 z-20 rounded-md bg-[color:var(--fc-bg)]/90 px-2 py-2 backdrop-blur-sm">
                                    Week
                                  </div>
                                  {PROGRAM_DAY_SHORT_LABELS.map((d) => (
                                    <div key={d} className="rounded-md px-2 py-2 text-center">
                                      {d}
                                    </div>
                                  ))}
                                </div>

                                {blockRows.map((absoluteWeek) => (
                                  <React.Fragment key={`${block.id}-week-${absoluteWeek}`}>
                                    <div className="sticky left-0 z-10 flex items-center gap-2 rounded-lg border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-bg)]/90 px-2 py-2 backdrop-blur-sm">
                                      <span className={cn("h-5 w-1 rounded-full", goalBarClassForGoal(block.goal))} />
                                      <span className="text-xs font-semibold text-[color:var(--fc-text-primary)]">
                                        Week {absoluteWeek}
                                      </span>
                                    </div>

                                    {Array.from({ length: 7 }, (_, i) => i + 1).map((dayNum) => {
                                      const cell = scheduleMap.get(
                                        scheduleKey(absoluteWeek, dayNum, block.id === "__fallback__" ? null : block.id),
                                      );
                                      const template = cell
                                        ? templates.find((t) => t.id === cell.template_id)
                                        : null;
                                      const weekHasConfig = weeksWithAnyConfiguredRows.has(absoluteWeek);
                                      const isEmpty = !cell && !weekHasConfig;
                                      const isRest = !cell && weekHasConfig;
                                      return (
                                        <button
                                          key={`${absoluteWeek}-${dayNum}`}
                                          type="button"
                                          onClick={() =>
                                            openScheduleEditor(
                                              absoluteWeek,
                                              dayNum,
                                              block.id === "__fallback__" ? null : block.id,
                                            )
                                          }
                                          className={cn(
                                            "group min-h-[72px] rounded-lg border p-2 text-left transition-colors",
                                            "hover:border-[color:var(--fc-accent)]/40 hover:bg-[color:var(--fc-accent)]/5",
                                            isEmpty
                                              ? "border-dashed border-[color:var(--fc-glass-border)] bg-transparent"
                                              : "border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-soft)]",
                                          )}
                                        >
                                          {isEmpty ? (
                                            <div className="h-full flex items-center justify-center text-[color:var(--fc-text-dim)] opacity-60">
                                              <Plus className="w-4 h-4" />
                                            </div>
                                          ) : (
                                            <div className="space-y-1">
                                              <div className="flex items-center justify-between gap-2">
                                                <span className={cn("inline-block w-2 h-2 rounded-full", goalDotClassForGoal(block.goal))} />
                                                {cell?.is_optional ? (
                                                  <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-[color:var(--fc-accent)]/20 text-[color:var(--fc-accent)]">
                                                    Opt
                                                  </span>
                                                ) : null}
                                              </div>
                                              <p className="text-xs font-semibold text-[color:var(--fc-text-primary)] truncate">
                                                {template?.name || (isRest ? "Rest" : "Optional")}
                                              </p>
                                            </div>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </React.Fragment>
                                ))}
                              </div>
                            </div>
                          </section>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              <Dialog
                open={!!scheduleEditor?.isOpen}
                onOpenChange={(open) => {
                  if (!open) setScheduleEditor(null);
                }}
              >
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {scheduleEditor
                        ? `Week ${scheduleEditor.week} · ${programDayLabel(scheduleEditor.day)}`
                        : ""}
                    </DialogTitle>
                  </DialogHeader>

                  {scheduleEditor && (
                    <div className="space-y-3">
                      <Input
                        value={scheduleEditor.search}
                        onChange={(e) =>
                          setScheduleEditor((prev) =>
                            prev ? { ...prev, search: e.target.value } : prev,
                          )
                        }
                        placeholder="Search templates..."
                        className="h-9 text-sm"
                      />

                      <div className="max-h-56 overflow-y-auto rounded-lg border border-[color:var(--fc-glass-border)] divide-y divide-[color:var(--fc-glass-border)]">
                        <button
                          type="button"
                          onClick={() =>
                            setScheduleEditor((prev) =>
                              prev ? { ...prev, templateId: "rest" } : prev,
                            )
                          }
                          className={cn(
                            "w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[color:var(--fc-glass-highlight)]",
                            scheduleEditor.templateId === "rest"
                              ? "bg-[color:var(--fc-accent)]/10 text-[color:var(--fc-accent)]"
                              : "text-[color:var(--fc-text-primary)]",
                          )}
                        >
                          Set as Rest
                        </button>
                        {templates
                          .filter((t) =>
                            t.name.toLowerCase().includes(scheduleEditor.search.toLowerCase()),
                          )
                          .map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() =>
                                setScheduleEditor((prev) =>
                                  prev ? { ...prev, templateId: t.id } : prev,
                                )
                              }
                              className={cn(
                                "w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[color:var(--fc-glass-highlight)]",
                                scheduleEditor.templateId === t.id
                                  ? "bg-[color:var(--fc-accent)]/10 text-[color:var(--fc-accent)]"
                                  : "text-[color:var(--fc-text-primary)]",
                              )}
                            >
                              {t.name}
                            </button>
                          ))}
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-1">
                        <label
                          htmlFor="schedule-optional-toggle"
                          className="text-sm text-[color:var(--fc-text-primary)] cursor-pointer"
                        >
                          Mark optional
                        </label>
                        <Switch
                          id="schedule-optional-toggle"
                          checked={scheduleEditor.isOptional}
                          onCheckedChange={(checked) =>
                            setScheduleEditor((prev) =>
                              prev ? { ...prev, isOptional: checked } : prev,
                            )
                          }
                        />
                      </div>
                    </div>
                  )}

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="ghost"
                      className="fc-btn fc-btn-ghost"
                      onClick={() => setScheduleEditor(null)}
                      disabled={scheduleCellSaving}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      className="fc-btn fc-btn-primary"
                      onClick={() => void saveScheduleEditor()}
                      disabled={scheduleCellSaving}
                    >
                      {scheduleCellSaving ? "Saving..." : "Save"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Program Volume Calculator */}
              {form && form.category && (
                <ProgramVolumeCalculator
                  programId={form.id}
                  programCategory={form.category}
                  programDifficulty={form.difficulty_level}
                  schedule={schedule}
                  templates={templates.map((t) => ({
                    ...t,
                    category: t.category || "",
                    blocks:
                      volumeTemplateBlocks[t.id] ??
                      templateBlocks[t.id] ??
                      [],
                  }))}
                />
              )}
            </div>
          )}

          {activeTab === "progression" && (
            <div role="tabpanel" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base sm:text-lg font-semibold text-[color:var(--fc-text-primary)]">
                  Progression rules
                </h2>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="fc-btn fc-btn-ghost"
                  >
                    Skip
                  </Button>
                  {form && form.category && (
                    <Button
                      onClick={() => setShowProgressionSuggestions(true)}
                      variant="outline"
                      size="sm"
                      className="fc-btn fc-btn-secondary"
                    >
                      <Target className="w-3.5 h-3.5 mr-1" />
                      Suggestions
                    </Button>
                  )}
                </div>
              </div>

              {schedule.filter(
                (s) =>
                  (s.week_number || 1) === absoluteSelectedWeek &&
                  scheduleRowMatchesActiveBlock(
                    s,
                    activeBlockId,
                    trainingBlocks.length,
                  ),
              ).length === 0 ? (
                <GlassCard elevation={1} className="fc-card-shell py-10 text-center">
                  <p className="text-sm text-[color:var(--fc-text-dim)]">
                    No workouts for week {selectedWeek}. Use the Schedule tab first.
                  </p>
                </GlassCard>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-xs font-medium uppercase tracking-wide text-[color:var(--fc-text-dim)]">
                      Week
                    </label>
                    <Select
                      value={String(selectedWeek)}
                      onValueChange={(v) => {
                        const w = parseInt(v, 10) || 1;
                        setSelectedWeek(w);
                        setSelectedScheduleForProgression(null);
                      }}
                    >
                      <SelectTrigger className="w-28 h-9 text-sm rounded-lg [&>svg]:text-[color:var(--fc-accent)]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[10000]" position="popper">
                        {Array.from(
                          { length: maxWeeks },
                          (_, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                              Week {i + 1}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Day Selector */}
                  <div className="flex flex-wrap gap-2">
                    {schedule
                      .filter(
                        (s) =>
                          (s.week_number || 1) === absoluteSelectedWeek &&
                          (!activeBlockId || s.training_block_id === activeBlockId),
                      )
                      .map((scheduleItem) => {
                        const template = templates.find(
                          (t) => t.id === scheduleItem.template_id,
                        );
                        return (
                          <Button
                            key={scheduleItem.id || scheduleItem.template_id}
                            variant={
                              selectedScheduleForProgression?.id ===
                              scheduleItem.id
                                ? "default"
                                : "outline"
                            }
                            onClick={() => {
                              setSelectedScheduleForProgression(scheduleItem);
                            }}
                            size="sm"
                            className="h-8 text-xs rounded-full px-3"
                          >
                            {programDayLabel(scheduleItem.program_day)}
                            {template && ` · ${template.name}`}
                          </Button>
                        );
                      })}
                  </div>

                  {/* Progression Rules Editor */}
                  {selectedScheduleForProgression && form?.id ? (
                    <ProgramProgressionRulesEditor
                      programId={form.id}
                      programScheduleId={
                        selectedScheduleForProgression.id ||
                        `temp-${selectedScheduleForProgression.template_id}-${selectedScheduleForProgression.program_day}`
                      }
                      weekNumber={absoluteSelectedWeek}
                      isFirstWeekOfBlock={selectedWeek === 1}
                      trainingBlockId={
                        activeBlockId ??
                        selectedScheduleForProgression.training_block_id ??
                        undefined
                      }
                      exercises={availableExercisesList as any}
                      templates={templates}
                      blockSchedules={schedule
                        .filter(
                          (s) =>
                            s.program_day ===
                              selectedScheduleForProgression.program_day &&
                            s.training_block_id ===
                              selectedScheduleForProgression.training_block_id,
                        )
                        .map((s) => ({ id: s.id, week_number: s.week_number }))}
                      onUpdate={() => {
                        load().catch(console.error);
                      }}
                      onApplied={() => {
                        // Auto-navigate to Week 2 of the block so the coach immediately
                        // sees the generated values without having to click manually.
                        const week2AbsoluteWeek = absoluteSelectedWeek + 1;
                        const week2Schedule = schedule.find(
                          (s) =>
                            s.program_day ===
                              selectedScheduleForProgression.program_day &&
                            s.training_block_id ===
                              selectedScheduleForProgression.training_block_id &&
                            s.week_number === week2AbsoluteWeek,
                        );
                        if (week2Schedule) {
                          setSelectedScheduleForProgression(week2Schedule);
                          setSelectedWeek(2);
                        }
                        load().catch(console.error);
                      }}
                    />
                  ) : (
                    <div className="text-center py-4 text-xs fc-text-dim border-t border-[color:var(--fc-glass-border)]">
                      Select a day to edit rules.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Progression Suggestions Modal */}
          {form && form.category && (
            <ProgressionSuggestionsModal
              isOpen={showProgressionSuggestions}
              onClose={() => setShowProgressionSuggestions(false)}
              programId={form.id}
              currentWeek={selectedWeek}
              category={form.category}
              difficulty={form.difficulty_level}
              lastDeloadWeek={lastDeloadWeek}
            />
          )}

          {/* Training Block Modal */}
          {form && showBlockModal && (
            <TrainingBlockModal
              isOpen={showBlockModal}
              block={editingBlock}
              programId={form.id}
              nextBlockOrder={trainingBlocks.length + 1}
              onSave={handleBlockSaved}
              onDelete={syncAfterTrainingBlockRemoved}
              onClose={() => {
                setShowBlockModal(false);
                setEditingBlock(null);
              }}
            />
          )}
      </CoachPageShell>
    </AnimatedBackground>
  );
}

export default function EditProgramPage() {
  return (
    <ProtectedRoute requiredRole="coach">
      <EditProgramContent />
    </ProtectedRoute>
  );
}
