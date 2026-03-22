"use client";

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  BookOpen,
  ArrowLeft,
  Calendar,
  TrendingUp,
  Dumbbell,
  Coffee,
  Info,
  Target,
  Layers,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import ExerciseBlockCard from "@/components/features/workouts/ExerciseBlockCard";
import { useExerciseLibrary } from "@/hooks/useCoachData";
import ProgramProgressionRulesEditor from "@/components/coach/ProgramProgressionRulesEditor";
import ProgramProgressionService from "@/lib/programProgressionService";
import ProgramVolumeCalculator from "@/components/coach/ProgramVolumeCalculator";
import ProgressionSuggestionsModal from "@/components/coach/ProgressionSuggestionsModal";
import { TrainingBlockService } from "@/lib/trainingBlockService";
import { TrainingBlock } from "@/types/trainingBlock";
import { TrainingBlockHeader } from "@/components/coach/programs/TrainingBlockHeader";
import { TrainingBlockModal } from "@/components/coach/programs/TrainingBlockModal";
import { useToast } from "@/components/ui/toast-provider";
import { cn } from "@/lib/utils";

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
      // Get tempo and RIR from first exercise if available
      const firstExercise = exercises[0];
      const tempo = firstExercise?.tempo;
      const rir = firstExercise?.rir;
      let summary = `${sets} sets × ${reps} reps • ${rest}s rest`;
      if (tempo) summary += ` • Tempo ${tempo}`;
      if (rir !== undefined && rir !== null) summary += ` • RIR ${rir}`;
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
  const programId = useMemo(() => String(params?.id || ""), [params]);
  const { user } = useAuth();
  const { addToast } = useToast();
  const { isDark, performanceSettings } = useTheme();
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
              (!activeBlockId || s.training_block_id === activeBlockId) &&
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
  }, [programId, schedule, absoluteSelectedWeek, activeBlockId]);

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
      window.location.href = `/coach/programs/${form.id}`;
    } finally {
      setSaving(false);
    }
  };

  // ── Training block handlers ──────────────────────────────────────────────

  const refreshBlocks = async () => {
    if (!programId) return;
    const blocks = await TrainingBlockService.getTrainingBlocks(programId);
    setTrainingBlocks(blocks);
    // Auto-sync program duration_weeks to sum of block durations
    const total = blocks.reduce((sum, b) => sum + b.duration_weeks, 0);
    if (total > 0 && form) {
      await WorkoutTemplateService.updateProgram(programId, { duration_weeks: total });
      setForm((prev) => (prev ? { ...prev, duration_weeks: total } : prev));
    }
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

  const handleDeleteBlock = async (blockId: string) => {
    await refreshBlocks();
    // Select the first remaining block
    setActiveBlockId((prev) => {
      if (prev === blockId) {
        const remaining = trainingBlocks.filter((b) => b.id !== blockId);
        return remaining[0]?.id ?? null;
      }
      return prev;
    });
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
              s.program_day === day
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

      let sched = await WorkoutTemplateService.getProgramSchedule(form.id);
      if (process.env.NODE_ENV !== "production") {
        console.log(
          "[EditProgram] Schedule data after save:",
          JSON.stringify(sched || [], null, 2),
        );
      }
      setSchedule(sched || []);

      if (selectedWeek === 1) {
        // selectedWeek === 1 means the coach is setting the first (relative) week of the
        // active block. Auto-fill all other weeks within this block using absolute numbers.
        const totalWeeks = activeBlock?.duration_weeks ?? form.duration_weeks ?? 1;
        const autoFillPromises: Promise<any>[] = [];
        const weeksUpdated: number[] = [];
        // week1Item rows are stored under the absolute week number for relative week 1
        const week1Schedule = (sched || []).filter(
          (s) =>
            (s.week_number || 1) === absoluteSelectedWeek &&
            (!activeBlockId || s.training_block_id === activeBlockId),
        );

        for (let relWeek = 2; relWeek <= totalWeeks; relWeek++) {
          // Translate relative week → absolute week for storage
          const absWeek = blockStartWeek + relWeek - 1;
          for (const week1Item of week1Schedule) {
            if (week1Item.template_id && week1Item.template_id !== "rest") {
              autoFillPromises.push(
                WorkoutTemplateService.setProgramSchedule(
                  form.id,
                  week1Item.program_day,
                  absWeek,
                  week1Item.template_id,
                  false,
                  undefined,
                  activeBlockId ?? undefined,
                ),
              );
            } else if (
              week1Item.template_id === "rest" ||
              !week1Item.template_id
            ) {
              autoFillPromises.push(
                WorkoutTemplateService.removeProgramSchedule(
                  form.id,
                  week1Item.program_day,
                  absWeek,
                ),
              );
            }
          }
          if (week1Schedule.length > 0) {
            weeksUpdated.push(absWeek);
          }
        }

        if (autoFillPromises.length > 0) {
          await Promise.all(autoFillPromises);
          console.log(
            `✅ Auto-applied Week 1 schedule to all other weeks (${weeksUpdated.length} week(s)): ${weeksUpdated.join(", ")}`,
          );
          sched = await WorkoutTemplateService.getProgramSchedule(form.id);
          setSchedule(sched || []);

          const allWeeksSchedule = sched || [];
          const copyPromises: Promise<void>[] = [];
          for (const week of weeksUpdated) {
            const weekSchedule = allWeeksSchedule.filter(
              (s) => (s.week_number || 1) === week,
            );
            for (const scheduleItem of weekSchedule) {
              if (
                scheduleItem.template_id &&
                scheduleItem.template_id !== "rest" &&
                scheduleItem.id
              ) {
                copyPromises.push(
                  (async () => {
                    try {
                      await ProgramProgressionService.deleteProgressionRules(
                        scheduleItem.id,
                        week,
                      );
                      await ProgramProgressionService.copyWorkoutToProgram(
                        form.id,
                        scheduleItem.id,
                        scheduleItem.template_id,
                        week,
                      );
                    } catch (error) {
                      console.error(
                        `Error copying workout data for Week ${week}, Day ${scheduleItem.program_day}:`,
                        error,
                      );
                    }
                  })(),
                );
              }
            }
          }
          if (copyPromises.length > 0) {
            await Promise.all(copyPromises);
            console.log(
              `✅ Copied workout data to progression rules for ${copyPromises.length} schedule(s)`,
            );
          }
        }
      }

      if (v !== "rest" && result?.id) {
        try {
          await ProgramProgressionService.deleteProgressionRules(
            result.id,
            selectedWeek,
          );
          const copySuccess =
            await ProgramProgressionService.copyWorkoutToProgram(
              form.id,
              result.id,
              v,
              selectedWeek,
            );
          if (!copySuccess) {
            console.warn(
              "⚠️ Failed to copy workout data to progression rules after schedule update",
            );
          }
        } catch (error) {
          console.error(
            "❌ Error copying workout to progression rules after schedule update:",
            error,
          );
        }
      }

      // Week-scoped blocks refresh via useEffect when schedule / week updates
    }
  };

  if (loading || !form) {
    return (
      <AnimatedBackground>
        <div className="min-h-screen p-4 max-w-5xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-10 w-32 rounded-2xl bg-[color:var(--fc-glass-highlight)]" />
            <div className="h-8 w-64 rounded-2xl bg-[color:var(--fc-glass-highlight)]" />
            <div className="h-40 rounded-2xl bg-[color:var(--fc-glass-highlight)]" />
            <div className="h-40 rounded-2xl bg-[color:var(--fc-glass-highlight)]" />
          </div>
        </div>
      </AnimatedBackground>
    );
  }

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}
      <div className="min-h-screen p-4 sm:p-6">
        <div className="max-w-5xl mx-auto space-y-6 relative z-10">
          <Button
            variant="ghost"
            onClick={() =>
              (window.location.href = "/coach/programs")
            }
            className="fc-btn fc-btn-ghost"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Programs
          </Button>

          <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6 sm:p-10">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-cyan-500 to-cyan-400 shadow-lg shadow-cyan-500/25">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                  Program Editor
                </span>
                <h1 className="mt-3 text-2xl font-bold text-[color:var(--fc-text-primary)] break-words">
                  Edit Program
                </h1>
                <p className="text-sm text-[color:var(--fc-text-dim)] break-words">
                  {form.name}
                </p>
              </div>
            </div>
          </div>

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
              onDeleteBlock={handleDeleteBlock}
              onUpdateBlock={handleUpdateBlock}
              onMoveBlock={handleMoveBlock}
            />
          )}

          <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-2">
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setActiveTab("basic")}
                className={cn(
                  "flex-1 rounded-xl fc-btn",
                  activeTab === "basic"
                    ? "fc-btn-primary"
                    : "fc-btn-ghost",
                )}
              >
                <BookOpen className="w-4 h-4 mr-2" />
                <span className="sm:hidden">Info</span>
                <span className="hidden sm:inline">Basic Info</span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => setActiveTab("schedule")}
                className={cn(
                  "flex-1 rounded-xl fc-btn",
                  activeTab === "schedule"
                    ? "fc-btn-primary"
                    : "fc-btn-ghost",
                )}
              >
                <Calendar className="w-4 h-4 mr-2" />
                <span className="sm:hidden">Schedule</span>
                <span className="hidden sm:inline">Weekly Schedule</span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => setActiveTab("progression")}
                className={cn(
                  "flex-1 rounded-xl fc-btn",
                  activeTab === "progression"
                    ? "fc-btn-primary"
                    : "fc-btn-ghost",
                )}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                <span className="sm:hidden">Progression</span>
                <span className="hidden sm:inline">Progression Rules</span>
              </Button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === "basic" && (
            <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6">
              <div className="space-y-6">
                {/* Program Name */}
                <div>
                  <label
                    className="text-sm font-semibold block mb-2"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.9)"
                        : "rgba(0,0,0,0.9)",
                    }}
                  >
                    Program Name *
                  </label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="text-base"
                    style={{
                      background: isDark
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.05)",
                      border: `1px solid ${
                        isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"
                      }`,
                      color: isDark ? "#fff" : "#1A1A1A",
                    }}
                  />
                </div>

                {/* Description */}
                <div>
                  <label
                    className="text-sm font-semibold block mb-2"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.9)"
                        : "rgba(0,0,0,0.9)",
                    }}
                  >
                    Description
                  </label>
                  <Textarea
                    value={form.description || ""}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    rows={4}
                    className="text-base resize-none"
                    style={{
                      background: isDark
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.05)",
                      border: `1px solid ${
                        isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"
                      }`,
                      color: isDark ? "#fff" : "#1A1A1A",
                    }}
                  />
                </div>

                {/* Difficulty & Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      className="text-sm font-semibold block mb-2"
                      style={{
                        color: isDark
                          ? "rgba(255,255,255,0.9)"
                          : "rgba(0,0,0,0.9)",
                      }}
                    >
                      Difficulty Level
                    </label>
                    <Select
                      value={form.difficulty_level}
                      onValueChange={(v) =>
                        setForm({ ...form, difficulty_level: v as any })
                      }
                    >
                      <SelectTrigger
                        style={{
                          background: isDark
                            ? "rgba(255,255,255,0.1)"
                            : "rgba(0,0,0,0.05)",
                          border: `1px solid ${
                            isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"
                          }`,
                          color: isDark ? "#fff" : "#1A1A1A",
                        }}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">
                          Intermediate
                        </SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                        <SelectItem value="athlete">Athlete</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label
                      className="text-sm font-semibold block mb-2"
                      style={{
                        color: isDark
                          ? "rgba(255,255,255,0.9)"
                          : "rgba(0,0,0,0.9)",
                      }}
                    >
                      Total Duration (Weeks)
                    </label>
                    {trainingBlocks.length > 1 ? (
                      <div
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
                        style={{
                          background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                          border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                          color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
                        }}
                      >
                        <Layers className="w-4 h-4 flex-shrink-0" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }} />
                        <span>
                          {trainingBlocks.reduce((sum, b) => sum + b.duration_weeks, 0)} weeks
                          <span className="ml-1.5 text-xs" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>
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
                        style={{
                          background: isDark
                            ? "rgba(255,255,255,0.1)"
                            : "rgba(0,0,0,0.05)",
                          border: `1px solid ${
                            isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"
                          }`,
                          color: isDark ? "#fff" : "#1A1A1A",
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label
                    className="text-sm font-semibold block mb-2"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.9)"
                        : "rgba(0,0,0,0.9)",
                    }}
                  >
                    Training Category
                    <span className="text-xs fc-text-dim ml-2">
                      (optional - for volume calculator)
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
                    <SelectTrigger
                      style={{
                        background: isDark
                          ? "rgba(255,255,255,0.1)"
                          : "rgba(0,0,0,0.05)",
                        border: `1px solid ${
                          isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"
                        }`,
                        color: isDark ? "#fff" : "#1A1A1A",
                      }}
                    >
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
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) =>
                      setForm({ ...form, is_active: e.target.checked })
                    }
                    className="w-5 h-5"
                  />
                  <label
                    className="text-sm font-semibold"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.9)"
                        : "rgba(0,0,0,0.9)",
                    }}
                  >
                    Program is active and visible to clients
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div
                className="flex items-center justify-end gap-3 mt-8 pt-6"
                style={{
                  borderTop: `1px solid ${
                    isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
                  }`,
                }}
              >
                <Button
                  variant="ghost"
                  onClick={() =>
                    (window.location.href = `/coach/programs/${form.id}`)
                  }
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={onSave}
                  disabled={saving || !form.name.trim()}
                  className="fc-btn fc-btn-primary rounded-xl disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}

          {activeTab === "schedule" && (
            <div className="space-y-6 max-w-6xl">
              <header>
                <h2 className="text-2xl font-bold tracking-tight fc-text-primary mb-2">
                  Weekly Schedule
                </h2>
                <p className="fc-text-dim max-w-xl">
                  Assign workout templates to each day. This schedule will serve
                  as the foundation for the entire program duration.
                </p>
              </header>
              {/* Info: Week 1 Auto-Apply */}
              <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6 border-l-4 border-l-[color:var(--fc-accent)] flex items-start gap-5">
                <div className="w-12 h-12 rounded-2xl bg-[color:var(--fc-aurora)]/20 flex items-center justify-center text-[color:var(--fc-accent)] shrink-0">
                  <Info className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold fc-text-primary mb-1">
                    Week {selectedWeek} schedule
                  </h3>
                  <p className="fc-text-dim leading-relaxed">
                    Changes made to this week will apply to this week only. Use
                    the week selector to edit other weeks.
                  </p>
                </div>
              </div>
              {/* Week Selector */}
              <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6">
                <div className="flex items-center gap-4 mb-6">
                  <label
                    className="text-sm font-semibold"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.9)"
                        : "rgba(0,0,0,0.9)",
                    }}
                  >
                    Select Week:
                  </label>
                  <Select
                    value={String(selectedWeek)}
                    onValueChange={(v) => setSelectedWeek(parseInt(v, 10))}
                  >
                    <SelectTrigger
                      className="w-40"
                      style={{
                        background: isDark
                          ? "rgba(255,255,255,0.1)"
                          : "rgba(0,0,0,0.05)",
                        border: `1px solid ${
                          isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"
                        }`,
                        color: isDark ? "#fff" : "#1A1A1A",
                      }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: maxWeeks }).map(
                        (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>
                            Week {i + 1}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Day strip */}
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                  {[1, 2, 3, 4, 5, 6, 7].map((dayNum) => {
                    const daySchedule = schedule.find(
                      (s) =>
                        (s.week_number || 1) === absoluteSelectedWeek &&
                        s.program_day === dayNum &&
                        (!activeBlockId || s.training_block_id === activeBlockId),
                    );
                    const hasWorkout =
                      daySchedule?.template_id &&
                      daySchedule.template_id !== "rest";
                    const isSelected = selectedDay === dayNum;
                    return (
                      <button
                        key={dayNum}
                        type="button"
                        onClick={() => setSelectedDay(dayNum)}
                        className={`flex-shrink-0 flex flex-col items-center justify-center min-w-[52px] min-h-[52px] rounded-xl transition-all duration-150 ${
                          isSelected
                            ? "bg-[color:var(--fc-accent-cyan)] text-white ring-2 ring-[color:var(--fc-accent-cyan)]/30 shadow-lg"
                            : "fc-surface hover:bg-[color:var(--fc-glass-highlight)]"
                        }`}
                      >
                        <span
                          className={`text-xs font-medium ${
                            isSelected ? "text-white/80" : "fc-text-subtle"
                          }`}
                        >
                          Day
                        </span>
                        <span
                          className={`text-lg font-bold ${
                            isSelected ? "text-white" : "fc-text-primary"
                          }`}
                        >
                          {dayNum}
                        </span>
                        <div
                          className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                            hasWorkout
                              ? "bg-green-400"
                              : isSelected
                                ? "bg-white/40"
                                : "bg-[color:var(--fc-text-dim)]/30"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                {/* Selected day detail */}
                {(() => {
                  const currentSchedule = schedule.find(
                    (s) =>
                      (s.week_number || 1) === absoluteSelectedWeek &&
                      s.program_day === selectedDay &&
                      (!activeBlockId || s.training_block_id === activeBlockId),
                  );
                  const currentTemplateValue =
                    currentSchedule?.template_id || "rest";
                  const hasWorkout = currentTemplateValue !== "rest";
                  const selectedTemplate = templates.find(
                    (t) => t.id === currentTemplateValue,
                  );
                  return (
                    <div className="fc-surface rounded-2xl p-4 space-y-3 mt-4 border border-[color:var(--fc-surface-card-border)]">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          {hasWorkout ? (
                            <Dumbbell className="w-5 h-5 text-cyan-400" />
                          ) : (
                            <Coffee
                              className="w-5 h-5"
                              style={{
                                color: isDark
                                  ? "rgba(255,255,255,0.3)"
                                  : "rgba(0,0,0,0.3)",
                              }}
                            />
                          )}
                          <h4
                            className="font-semibold"
                            style={{
                              color: isDark ? "#fff" : "#1A1A1A",
                            }}
                          >
                            Day {selectedDay}
                          </h4>
                        </div>
                        {hasWorkout && selectedTemplate && (
                          <span className="text-sm fc-text-subtle">
                            {selectedTemplate.name}
                          </span>
                        )}
                      </div>

                      <div>
                        <label
                          className="text-sm font-medium mb-1.5 block"
                          style={{
                            color: isDark ? "#fff" : "#1A1A1A",
                          }}
                        >
                          Workout Template
                        </label>
                        <Select
                          value={currentTemplateValue}
                          onValueChange={(value) =>
                            handleDayTemplateChange(selectedDay, value)
                          }
                        >
                          <SelectTrigger
                            style={{
                              background: isDark
                                ? "rgba(255,255,255,0.1)"
                                : "rgba(255,255,255,0.8)",
                              border: `1px solid ${
                                isDark
                                  ? "rgba(255,255,255,0.2)"
                                  : "rgba(0,0,0,0.1)"
                              }`,
                              color: isDark ? "#fff" : "#1A1A1A",
                            }}
                          >
                            <SelectValue placeholder="Select template or Rest Day" />
                          </SelectTrigger>
                          <SelectContent className="z-[10000]" position="popper">
                            <SelectItem value="rest">Rest Day</SelectItem>
                            {templates.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {hasWorkout && selectedTemplate && (
                        <div className="text-sm fc-text-subtle flex gap-4">
                          <span>
                            {selectedTemplate.exercise_count ?? "?"} exercises
                          </span>
                          <span>
                            {selectedTemplate.estimated_duration ?? "?"} min
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Info Card */}
              <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-cyan-400" />
                  <p
                    className="text-sm"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.7)"
                        : "rgba(0,0,0,0.7)",
                    }}
                  >
                    Configure the workout schedule for each week of your
                    program. When you set workouts for <strong>Week 1</strong>,
                    they will automatically be applied to all other weeks. You
                    can then customize individual weeks later if needed. Select
                    a workout template for each training day, or choose "Rest
                    Day" for recovery. Changes are saved automatically when you
                    make a selection.
                  </p>
                </div>
              </div>

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
            <div className="space-y-6 max-w-4xl">
              <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight fc-text-primary mb-2">
                    Progression Rules
                  </h2>
                  <p className="fc-text-dim">
                    Fine-tune intensities and volume for the initial phase.
                    Changes apply only to this program.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-lg fc-text-dim hover:fc-text-primary border border-[color:var(--fc-glass-border)]"
                  >
                    Skip for Now
                  </Button>
                  {form && form.category && (
                    <Button
                      onClick={() => setShowProgressionSuggestions(true)}
                      variant="outline"
                      className="rounded-xl"
                    >
                      <Target className="w-4 h-4 mr-2" />
                      Get Progression Suggestions
                    </Button>
                  )}
                </div>
              </header>

              {schedule.filter(
                (s) =>
                  (s.week_number || 1) === absoluteSelectedWeek &&
                  (!activeBlockId || s.training_block_id === activeBlockId),
              ).length === 0 ? (
                <div className="text-center py-8 fc-text-dim">
                  <Calendar className="w-16 h-16 mx-auto mb-4" />
                  <h4 className="text-lg font-medium mb-2">
                    No Workouts Scheduled for Week {selectedWeek}
                  </h4>
                  <p className="text-sm mb-4">
                    Please assign workout templates to days in the Weekly
                    Schedule tab first.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Week Selector */}
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium">Week:</label>
                    <Select
                      value={String(selectedWeek)}
                      onValueChange={(v) => {
                        const w = parseInt(v, 10) || 1;
                        setSelectedWeek(w);
                        setSelectedScheduleForProgression(null);
                      }}
                    >
                      <SelectTrigger className="w-32 rounded-xl">
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
                            className="rounded-lg"
                          >
                            Day {scheduleItem.program_day}
                            {template && ` - ${template.name}`}
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
                      trainingBlockId={activeBlockId ?? undefined}
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
                    <div className="text-center py-8 fc-text-dim">
                      <p>Select a day above to edit progression rules.</p>
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
              onDelete={handleDeleteBlock}
              onClose={() => {
                setShowBlockModal(false);
                setEditingBlock(null);
              }}
            />
          )}
        </div>
      </div>
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
