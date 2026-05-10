"use client";

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { CoachPageShell } from "@/components/coach-ui/CoachPageShell";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { Button } from "@/components/ui/button";
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
  Layers,
  Plus,
  Copy,
  X,
  Check,
  Sparkles,
  LayoutGrid,
  Info,
  CalendarDays,
  MoreHorizontal,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useExerciseLibrary } from "@/hooks/useCoachData";
import ProgramProgressionRulesEditor from "@/components/coach/ProgramProgressionRulesEditor";
import ProgramProgressionGrid from "@/components/coach/ProgramProgressionGrid";
import ProgramVolumeCalculator from "@/components/coach/ProgramVolumeCalculator";
import ProgressionSuggestionsModal from "@/components/coach/ProgressionSuggestionsModal";
import { TrainingBlockService } from "@/lib/trainingBlockService";
import { TrainingBlock, TRAINING_BLOCK_GOALS, type TrainingBlockGoal } from "@/types/trainingBlock";
import { TrainingBlockHeader } from "@/components/coach/programs/TrainingBlockHeader";
import { TrainingBlockModal } from "@/components/coach/programs/TrainingBlockModal";
import { useToast } from "@/components/ui/toast-provider";
import { cn } from "@/lib/utils";
import { WorkoutBlockService } from "@/lib/workoutBlockService";
import { ProgramProgressionService } from "@/lib/programProgressionService";
import {
  sumTrainingBlockWeeksFromRows,
  resolveProgramTotalDisplayWeeks,
} from "@/lib/programDurationResolver";
import type { ProgramProgressionGridRow as GridRow, ProgressionGridCellRef } from "@/hooks/useProgramProgressionGrid";
import css from "@/components/coach/programs/programEditV1.module.css";

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

function coachDifficultyLabel(level: string): string {
  switch (level) {
    case "beginner":
      return "Beginner";
    case "intermediate":
      return "Intermediate";
    case "advanced":
      return "Athlete";
    case "athlete":
      return "Elite";
    default:
      return level;
  }
}

/** Match schedule rows to the active block using week ranges (program_schedule.training_block_id is not authoritative). */
function scheduleRowMatchesActiveBlock(
  s: { week_number?: number },
  activeBlockId: string | null,
  trainingBlocks: TrainingBlock[],
): boolean {
  if (!activeBlockId) return true;
  const w = s.week_number ?? 1;
  return (
    TrainingBlockService.getBlockForWeekFromBlocks(trainingBlocks, w)?.id ===
    activeBlockId
  );
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
  const [showPerWorkoutProgressionEditor, setShowPerWorkoutProgressionEditor] =
    useState(false);
  const [deepEditorDirty, setDeepEditorDirty] = useState(false);
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

  const programDisplayWeeks = useMemo(
    () =>
      resolveProgramTotalDisplayWeeks({
        sumTrainingBlockWeeks: sumTrainingBlockWeeksFromRows(trainingBlocks),
        assignmentDurationWeeks: null,
        assignmentTotalDays: null,
      }),
    [trainingBlocks],
  );

  const distinctTemplateCount = useMemo(() => {
    const ids = new Set(
      (schedule || [])
        .map((s) => s.template_id)
        .filter((id): id is string => Boolean(id) && id !== "rest"),
    );
    return ids.size;
  }, [schedule]);

  const [progressionReloadKey, setProgressionReloadKey] = useState(0);

  const programDayToday = useMemo(() => {
    const d = new Date().getDay();
    return d === 0 ? 7 : d;
  }, []);

  const scheduleKey = useCallback(
    (week: number, day: number, blockId: string | null) =>
      `${week}:${day}:${blockId ?? "__none__"}`,
    [],
  );

  const scheduleMap = useMemo(() => {
    const map = new Map<string, ProgramSchedule>();
    for (const row of schedule) {
      const blockForRow =
        TrainingBlockService.getBlockForWeekFromBlocks(
          trainingBlocks,
          row.week_number || 1,
        )?.id ?? null;
      const key = scheduleKey(
        row.week_number || 1,
        row.program_day,
        blockForRow,
      );
      map.set(key, row);
    }
    return map;
  }, [schedule, scheduleKey, trainingBlocks]);

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

  const templatesForVolumeCalculator = useMemo(() => {
    const byId = new Map(templates.map((t) => [t.id, t]));
    const scheduleTemplateIds = [
      ...new Set(
        (schedule || [])
          .map((s) => s.template_id)
          .filter((id): id is string => Boolean(id) && id !== "rest"),
      ),
    ];

    return scheduleTemplateIds.map((templateId) => {
      const base = byId.get(templateId);
      const scheduleRow = schedule.find((s) => s.template_id === templateId);
      return {
        id: templateId,
        name: base?.name || scheduleRow?.template_name || "Template",
        category: (base?.category as string | null | undefined) ?? "",
        difficulty_level:
          (base?.difficulty_level as string | undefined) ??
          form?.difficulty_level ??
          "beginner",
        blocks:
          volumeTemplateBlocks[templateId] ??
          templateBlocks[templateId] ??
          [],
      };
    });
  }, [templates, schedule, volumeTemplateBlocks, templateBlocks, form?.difficulty_level]);

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
              scheduleRowMatchesActiveBlock(s, activeBlockId, trainingBlocks) &&
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
  }, [programId, schedule, absoluteSelectedWeek, activeBlockId, trainingBlocks]);

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

      // Load training blocks (DB trigger ensures at least one block per program).
      if (programId) {
        const blocks = await TrainingBlockService.getTrainingBlocks(programId);
        if (blocks.length === 0) {
          console.error(
            `[edit page] Program ${programId} has no blocks — DB trigger may have failed.`,
          );
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
    return blocks;
  };

  const handleUpdateBlock = async (blockId: string, updates: Partial<TrainingBlock>) => {
    try {
      const updated = await TrainingBlockService.updateTrainingBlock(blockId, updates);
      setTrainingBlocks((prev) => prev.map((b) => (b.id === blockId ? updated : b)));
      if (updates.duration_weeks !== undefined && form) {
        const { data: prog } = await supabase
          .from("workout_programs")
          .select("duration_weeks")
          .eq("id", programId)
          .single();
        if (prog?.duration_weeks != null) {
          setForm((prev) =>
            prev ? { ...prev, duration_weeks: prog.duration_weeks } : prev,
          );
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not update training block.";
      addToast({ title: msg, variant: "destructive" });
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
    try {
      await TrainingBlockService.deleteTrainingBlock(blockId);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not delete training block.";
      addToast({
        title: msg,
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
      try {
        await WorkoutTemplateService.removeProgramSchedule(
          form.id,
          day,
          absoluteSelectedWeek,
        );
      } catch (e: unknown) {
        const msg =
          e instanceof Error ? e.message : "Failed to remove schedule cell.";
        const propagationFailed =
          typeof msg === "string" &&
          (msg.includes("snapshot propagation failed") ||
            msg.includes("propagation failed"));
        addToast({
          title: propagationFailed
            ? "Schedule did not sync to every client"
            : "Could not remove this cell",
          description: msg,
          variant: "destructive",
        });
        return;
      }
      setSchedule((prev) =>
        prev.filter(
          (s) =>
            !(
              (s.week_number || 1) === absoluteSelectedWeek &&
              s.program_day === day &&
              scheduleRowMatchesActiveBlock(s, activeBlockId, trainingBlocks)
            ),
        ),
      );
    } else {
      try {
        await WorkoutTemplateService.setProgramSchedule({
          programId: form.id,
          programDay: day,
          weekNumber: absoluteSelectedWeek,
          templateId: v,
          isOptional: false,
        });
      } catch (e: unknown) {
        const msg =
          e instanceof Error
            ? e.message
            : "Failed to save schedule. Please check if you have permission to edit this program.";
        const propagationFailed =
          typeof msg === "string" &&
          (msg.includes("snapshot propagation failed") ||
            msg.includes("propagation failed"));
        addToast({
          title: propagationFailed
            ? "Schedule did not sync to every client"
            : "Could not save this cell",
          description: msg,
          variant: "destructive",
        });
        return;
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
        try {
          await WorkoutTemplateService.removeProgramSchedule(
            form.id,
            scheduleEditor.day,
            scheduleEditor.week,
          );
        } catch (e: unknown) {
          const msg =
            e instanceof Error ? e.message : "Failed to remove schedule cell.";
          const propagationFailed =
            typeof msg === "string" &&
            (msg.includes("snapshot propagation failed") ||
              msg.includes("propagation failed"));
          addToast({
            title: propagationFailed
              ? "Schedule did not sync to every client"
              : "Could not remove this cell",
            description: msg,
            variant: "destructive",
          });
          setScheduleCellSaving(false);
          return;
        }
        setSchedule((prev) =>
          prev.filter(
            (row) =>
              !(
                (row.week_number || 1) === scheduleEditor.week &&
                row.program_day === scheduleEditor.day &&
                (TrainingBlockService.getBlockForWeekFromBlocks(
                  trainingBlocks,
                  row.week_number || 1,
                )?.id ?? null) === (scheduleEditor.blockId ?? null)
              ),
          ),
        );
      } else {
        try {
          await WorkoutTemplateService.setProgramSchedule({
            programId: form.id,
            programDay: scheduleEditor.day,
            weekNumber: scheduleEditor.week,
            templateId: scheduleEditor.templateId,
            isOptional: scheduleEditor.isOptional,
          });
        } catch (e: unknown) {
          const msg =
            e instanceof Error
              ? e.message
              : "Failed to save schedule. Please check your permissions.";
          const propagationFailed =
            typeof msg === "string" &&
            (msg.includes("snapshot propagation failed") ||
              msg.includes("propagation failed"));
          addToast({
            title: propagationFailed
              ? "Schedule did not sync to every client"
              : "Could not save this cell",
            description: msg,
            variant: "destructive",
          });
          return;
        }

        const sched = await WorkoutTemplateService.getProgramSchedule(form.id);
        setSchedule(sched || []);
      }
      setScheduleEditor(null);
    } finally {
      setScheduleCellSaving(false);
    }
  }, [form?.id, scheduleEditor, addToast, trainingBlocks]);

  const handleCopyWeekAcrossActiveBlock = useCallback(
    async (absoluteSourceWeek: number) => {
      if (!form?.id || !activeBlock) return;
      const idx = trainingBlocks.findIndex((b) => b.id === activeBlock.id);
      if (idx < 0) return;
      let blockStart = 1;
      for (let i = 0; i < idx; i++) blockStart += trainingBlocks[i].duration_weeks;
      const { error: copyError } = await supabase.rpc("copy_week_schedule", {
        p_program_id: form.id,
        p_source_week: absoluteSourceWeek,
        p_total_weeks: activeBlock.duration_weeks,
        p_block_start_week: blockStart,
        p_training_block_id: activeBlock.id,
      });
      if (copyError) {
        addToast({
          title: `Could not copy week: ${copyError.message}`,
          variant: "destructive",
        });
        return;
      }
      try {
        await WorkoutTemplateService.propagateAllScheduleSlotsToSnapshots(form.id);
      } catch (e: unknown) {
        const msg =
          e instanceof Error ? e.message : "Propagation failed after copy.";
        addToast({ title: msg, variant: "destructive" });
        return;
      }
      const sched = await WorkoutTemplateService.getProgramSchedule(form.id);
      setSchedule(sched || []);
      addToast({ title: "Week copied across the other weeks in this block." });
    },
    [form?.id, activeBlock, trainingBlocks, addToast],
  );

  /** Header “Copy week”: use first week of the active block as the source pattern. */
  const handleCopyFromWeekOne = useCallback(async () => {
    if (!activeBlock) return;
    const idx = trainingBlocks.findIndex((b) => b.id === activeBlock.id);
    if (idx < 0) return;
    let blockStart = 1;
    for (let i = 0; i < idx; i++) blockStart += trainingBlocks[i].duration_weeks;
    await handleCopyWeekAcrossActiveBlock(blockStart);
  }, [activeBlock, trainingBlocks, handleCopyWeekAcrossActiveBlock]);

  const handleDuplicateBlock = useCallback(
    async (block: TrainingBlock) => {
      if (!form?.id) return;
      try {
        await TrainingBlockService.createTrainingBlock({
          program_id: form.id,
          name: `${block.name} (copy)`,
          goal: block.goal,
          custom_goal_label: block.custom_goal_label ?? null,
          duration_weeks: block.duration_weeks,
          progression_profile: block.progression_profile ?? "none",
          notes: block.notes ?? null,
        });
        const blocks = await refreshBlocks();
        const created = [...blocks].sort(
          (a, b) => (a.block_order || 0) - (b.block_order || 0),
        )[blocks.length - 1];
        if (created) setActiveBlockId(created.id);
        addToast({ title: "Block duplicated." });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Could not duplicate block.";
        addToast({ title: msg, variant: "destructive" });
      }
    },
    [form?.id, addToast],
  );

  const handleSkipProgression = useCallback(async () => {
    if (!form?.id || !activeBlockId) return;
    const idx = trainingBlocks.findIndex((b) => b.id === activeBlockId);
    if (idx < 0) return;
    let blockStart = 1;
    for (let i = 0; i < idx; i++) blockStart += trainingBlocks[i].duration_weeks;
    const blockEnd = blockStart + (trainingBlocks[idx].duration_weeks || 0) - 1;
    const scheduleIds = schedule
      .filter((s) => {
        const w = s.week_number || 1;
        return (
          w >= blockStart &&
          w <= blockEnd &&
          Boolean(s.template_id) &&
          s.template_id !== "rest" &&
          scheduleRowMatchesActiveBlock(s, activeBlockId, trainingBlocks)
        );
      })
      .map((s) => s.id)
      .filter(Boolean) as string[];
    if (scheduleIds.length === 0) {
      addToast({ title: "No scheduled workouts in this block to clear." });
      return;
    }
    if (
      !window.confirm(
        "Clear all progression rules for scheduled workouts in this training block?",
      )
    ) {
      return;
    }
    const ok = await ProgramProgressionService.deleteProgressionRulesForSchedules(scheduleIds);
    if (!ok) {
      addToast({ title: "Could not clear progression.", variant: "destructive" });
      return;
    }
    setProgressionReloadKey((k) => k + 1);
    addToast({ title: "Progression cleared for this block." });
  }, [form?.id, activeBlockId, trainingBlocks, schedule, addToast]);

  const openPerWorkoutEditorForWeekDay = useCallback(
    (absoluteWeek: number, programDay: number) => {
      const block = TrainingBlockService.getBlockForWeekFromBlocks(
        trainingBlocks,
        absoluteWeek,
      );
      if (block?.id) setActiveBlockId(block.id);

      let relativeWeek = absoluteWeek;
      if (block?.id) {
        let priorWeeks = 0;
        for (const b of trainingBlocks) {
          if (b.id === block.id) break;
          priorWeeks += b.duration_weeks;
        }
        relativeWeek = Math.max(1, absoluteWeek - priorWeeks);
      }
      setSelectedWeek(relativeWeek);

      const scheduleItem = schedule.find(
        (s) =>
          (s.week_number || 1) === absoluteWeek && s.program_day === programDay,
      );
      setSelectedScheduleForProgression(scheduleItem || null);
      setShowPerWorkoutProgressionEditor(true);
    },
    [schedule, trainingBlocks],
  );

  const handleConfigureGridRow = useCallback(
    (row: GridRow) => {
      const week = row.defaultWeek || 1;
      openPerWorkoutEditorForWeekDay(week, row.day);
    },
    [openPerWorkoutEditorForWeekDay],
  );

  const handleOpenGridCellFullEditor = useCallback(
    (cell: ProgressionGridCellRef) => {
      openPerWorkoutEditorForWeekDay(cell.weekNumber, cell.day);
    },
    [openPerWorkoutEditorForWeekDay],
  );

  const requestClosePerWorkoutEditor = useCallback(() => {
    if (deepEditorDirty) {
      const ok = window.confirm(
        "You have unsaved progression changes. Close without saving?",
      );
      if (!ok) return;
    }
    setShowPerWorkoutProgressionEditor(false);
    setDeepEditorDirty(false);
  }, [deepEditorDirty]);

  useEffect(() => {
    if (!showPerWorkoutProgressionEditor) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        requestClosePerWorkoutEditor();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showPerWorkoutProgressionEditor, requestClosePerWorkoutEditor]);

  if (loading || !form) {
    return (
      <AnimatedBackground>
        <CoachPageShell widthVariant="data-7xl" className="p-3 pb-[var(--fc-bottom-safe-area)] sm:p-6 md:p-6">
          <PageSkeleton variant="form" />
        </CoachPageShell>
      </AnimatedBackground>
    );
  }

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}
      <CoachPageShell
        widthVariant="data-7xl"
        className={cn("p-3 pb-[var(--fc-bottom-safe-area)] sm:p-6 md:p-6 space-y-4 sm:space-y-6", css.wrap)}
      >
        <div className={cn(css.hero, css.heroGlowCyan)}>
          <div className="relative z-[1] flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={css.eyebrow}>Editing program</span>
                {form.is_active ? (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                    style={{
                      fontFamily: "var(--f-mono, Geist Mono, monospace)",
                      background: "rgba(52,211,153,0.12)",
                      color: "#34D399",
                    }}
                  >
                    Active
                  </span>
                ) : (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                    style={{
                      fontFamily: "var(--f-mono, Geist Mono, monospace)",
                      background: "rgba(245,194,66,0.12)",
                      color: "#F5C242",
                    }}
                  >
                    Draft
                  </span>
                )}
              </div>
              <h1 className={cn(css.heroTitle, "truncate")}>{form.name}</h1>
              <p
                className="text-xs text-[var(--pe-t3)]"
                style={{ fontFamily: "var(--font-geist-sans, Geist, sans-serif)" }}
              >
                {form.category || "—"} · {programDisplayWeeks} weeks ·{" "}
                {coachDifficultyLabel(form.difficulty_level)} level
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/coach/programs")}
              className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-[var(--pe-line)] px-3 text-[11px] font-medium text-[var(--pe-t2)] hover:text-[var(--pe-t1)] hover:bg-white/[0.04] transition-colors"
              style={{ fontFamily: "var(--f-mono, Geist Mono, monospace)" }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
          </div>
          <div
            className="relative z-[1] mt-4 grid grid-cols-3 gap-2 border-t border-[var(--pe-line)] pt-4"
            style={{ fontFamily: "var(--font-geist-sans, Geist, sans-serif)" }}
          >
            <div className="text-center sm:text-left">
              <div className={cn(css.statNum, "text-[var(--pe-cyan)]")}>{trainingBlocks.length}</div>
              <div className={css.statLbl}>Blocks</div>
            </div>
            <div className="text-center sm:text-left">
              <div className={cn(css.statNum, "text-[var(--pe-t1)]")}>{programDisplayWeeks}</div>
              <div className={css.statLbl}>Weeks</div>
            </div>
            <div className="text-center sm:text-left">
              <div className={cn(css.statNum, "text-[#C5FF4A]")}>{distinctTemplateCount}</div>
              <div className={css.statLbl}>Templates</div>
            </div>
          </div>
        </div>

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
            onDuplicateBlock={handleDuplicateBlock}
          />
        )}

        <div className={css.subTabs} role="tablist" aria-label="Program sections">
          {(
            [
              { id: "basic" as const, label: "Info", Icon: Info },
              { id: "schedule" as const, label: "Schedule", Icon: CalendarDays },
              { id: "progression" as const, label: "Progression", Icon: Layers },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.Icon;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                disabled={false}
                onClick={() => setActiveTab(tab.id)}
                className={cn(css.subTab, isActive && css.subTabActive)}
              >
                <Icon className="w-3.5 h-3.5 shrink-0 opacity-80" />
                {tab.label}
              </button>
            );
          })}
        </div>

          {/* Tab Content */}
          {activeTab === "basic" && (
            <div role="tabpanel" className="space-y-4">
              <div className={css.formCard}>
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--pe-t3)]"
                  style={{ fontFamily: "var(--f-mono, Geist Mono, monospace)" }}
                >
                  Block details
                </p>
                <div>
                  <label
                    className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--pe-t3)]"
                    style={{ fontFamily: "var(--f-mono, Geist Mono, monospace)" }}
                  >
                    Program name <span className="text-[#FF5A5F]">*</span>
                  </label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="h-10 border border-[var(--pe-line)] bg-[var(--pe-card-2)] text-[12.5px] text-[var(--pe-t1)] placeholder:text-[var(--pe-t4)] rounded-[10px] px-[11px] focus-visible:border-[var(--pe-cyan)] focus-visible:ring-[3px] focus-visible:ring-[rgba(79,227,232,0.12)]"
                    style={{ fontFamily: "var(--font-geist-sans, Geist, sans-serif)" }}
                  />
                </div>
                <div>
                  <label
                    className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--pe-t3)]"
                    style={{ fontFamily: "var(--f-mono, Geist Mono, monospace)" }}
                  >
                    Description
                  </label>
                  <Textarea
                    value={form.description || ""}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    placeholder="Optional — describe goals and structure"
                    className="min-h-[64px] resize-none border border-[var(--pe-line)] bg-[var(--pe-card-2)] text-[12.5px] text-[var(--pe-t1)] placeholder:italic placeholder:text-[var(--pe-t4)] rounded-[10px] px-[11px] py-2 focus-visible:border-[var(--pe-cyan)] focus-visible:ring-[3px] focus-visible:ring-[rgba(79,227,232,0.12)]"
                    style={{ fontFamily: "var(--font-geist-sans, Geist, sans-serif)" }}
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--pe-t3)]"
                      style={{ fontFamily: "var(--f-mono, Geist Mono, monospace)" }}
                    >
                      Difficulty
                    </label>
                    <Select
                      value={form.difficulty_level}
                      onValueChange={(v) => setForm({ ...form, difficulty_level: v as any })}
                    >
                      <SelectTrigger className="h-10 border-[var(--pe-line)] bg-[var(--pe-card-2)] text-[12.5px] text-[var(--pe-t1)] rounded-[10px] focus:ring-[3px] focus:ring-[rgba(79,227,232,0.12)]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Athlete</SelectItem>
                        <SelectItem value="athlete">Elite</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label
                      className="mb-1.5 flex flex-wrap items-baseline gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--pe-t3)]"
                      style={{ fontFamily: "var(--f-mono, Geist Mono, monospace)" }}
                    >
                      Duration
                      <span
                        className="normal-case font-normal text-[var(--pe-t4)]"
                        style={{ letterSpacing: "0.06em" }}
                      >
                        weeks
                      </span>
                    </label>
                    {trainingBlocks.length > 1 ? (
                      <div className="flex min-h-10 items-center gap-2 rounded-[10px] border border-[var(--pe-line)] bg-[var(--pe-card-2)] px-3 py-2 text-[12.5px] text-[var(--pe-t3)]">
                        <Layers className="h-4 w-4 shrink-0 opacity-60" />
                        <span>
                          {trainingBlocks.reduce((sum, b) => sum + b.duration_weeks, 0)} weeks
                          <span className="ml-1.5 text-[11px] opacity-80">
                            (across {trainingBlocks.length} block{trainingBlocks.length !== 1 ? "s" : ""})
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
                        className="h-10 border border-[var(--pe-line)] bg-[var(--pe-card-2)] text-[12.5px] text-[var(--pe-t1)] rounded-[10px] px-[11px] focus-visible:border-[var(--pe-cyan)] focus-visible:ring-[3px] focus-visible:ring-[rgba(79,227,232,0.12)]"
                      />
                    )}
                  </div>
                </div>
                <div>
                  <label
                    className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--pe-t3)]"
                    style={{ fontFamily: "var(--f-mono, Geist Mono, monospace)" }}
                  >
                    Category{" "}
                    <span className="normal-case font-normal text-[var(--pe-t4)]">(optional)</span>
                  </label>
                  <Select
                    value={categoryId || "none"}
                    onValueChange={(v) => {
                      if (v === "none") {
                        setCategoryId("");
                        setForm({ ...form, category: null });
                      } else {
                        setCategoryId(v);
                        const selectedCat = categories.find((c) => c.id === v);
                        setForm({ ...form, category: selectedCat?.name || null });
                      }
                    }}
                  >
                    <SelectTrigger className="h-10 border-[var(--pe-line)] bg-[var(--pe-card-2)] text-[12.5px] text-[var(--pe-t1)] rounded-[10px]">
                      <SelectValue placeholder="Select category (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (No progression guidelines)</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {categories.length === 0 ? (
                    <p className="mt-1 text-xs text-[var(--pe-t3)]">
                      No categories available. Create categories in the Categories section.
                    </p>
                  ) : null}
                </div>
                <div
                  className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5"
                  style={{ borderColor: "var(--pe-line-2)", background: "var(--pe-card-2)" }}
                >
                  <div className="min-w-0">
                    <span
                      className="block text-[12.5px] font-semibold text-[var(--pe-t1)]"
                      style={{ fontFamily: "var(--font-geist-sans, Geist, sans-serif)" }}
                    >
                      Active
                    </span>
                    <p
                      className="mt-0.5 text-[11px] text-[var(--pe-t3)]"
                      style={{ fontFamily: "var(--font-geist-sans, Geist, sans-serif)" }}
                    >
                      Visible to clients · available for assignment
                    </p>
                  </div>
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                    className="shrink-0 data-[state=checked]:bg-[#4FE3E8] data-[state=unchecked]:bg-white/10"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => router.push(`/coach/programs/${form.id}`)}
                  className="h-10 rounded-lg px-4 text-[12.5px] font-semibold text-[var(--pe-t2)] hover:text-[var(--pe-t1)] transition-colors"
                  style={{ fontFamily: "var(--font-geist-sans, Geist, sans-serif)" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void onSave()}
                  disabled={saving || !form.name.trim()}
                  className="inline-flex h-10 items-center gap-2 rounded-lg px-4 text-[12.5px] font-semibold text-[#0a1a18] disabled:opacity-50 transition-opacity"
                  style={{
                    fontFamily: "var(--font-geist-sans, Geist, sans-serif)",
                    background: "linear-gradient(90deg, #C5FF4A, #7FE89A)",
                  }}
                >
                  <Check className="h-4 w-4" />
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          )}

          {activeTab === "schedule" && (
            <div role="tabpanel" className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2
                    className="text-sm font-bold text-[var(--pe-t1)] sm:text-base"
                    style={{ fontFamily: "var(--f-headline, Bricolage Grotesque, sans-serif)" }}
                  >
                    Week-at-a-glance
                  </h2>
                  <p
                    className="mt-0.5 text-[11px] text-[var(--pe-t3)]"
                    style={{ fontFamily: "var(--font-geist-sans, Geist, sans-serif)" }}
                  >
                    Tap a day to assign a workout, mark optional, or rest.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCopyFromWeekOne()}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 self-start rounded-lg border border-[var(--pe-line)] px-3 text-[11px] font-semibold text-[var(--pe-t2)] hover:bg-white/[0.04] hover:text-[var(--pe-t1)] transition-colors"
                  style={{ fontFamily: "var(--font-geist-sans, Geist, sans-serif)" }}
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy week
                </button>
              </div>

              {activeBlock ? (
                <div
                  className="flex items-center gap-2 rounded-[10px] border px-3 py-2"
                  style={{
                    borderColor: "rgba(79,227,232,0.18)",
                    background: "rgba(79,227,232,0.12)",
                  }}
                >
                  <Layers className="w-3.5 h-3.5 shrink-0 text-[var(--pe-cyan)]" />
                  <p
                    className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--pe-cyan)]"
                    style={{ fontFamily: "var(--f-mono, Geist Mono, monospace)" }}
                  >
                    Block {trainingBlocks.findIndex((b) => b.id === activeBlock.id) + 1} ·{" "}
                    {TRAINING_BLOCK_GOALS[(activeBlock.goal || "custom") as TrainingBlockGoal] ??
                      activeBlock.goal}{" "}
                    · Wks {blockStartWeek}–{blockStartWeek + activeBlock.duration_weeks - 1}
                  </p>
                </div>
              ) : null}

              <div className="space-y-3">
                {(() => {
                  const block =
                    activeBlock ??
                    (trainingBlocks[0] as TrainingBlock | undefined) ??
                    ({
                      id: "__fallback__",
                      block_order: 1,
                      duration_weeks: form.duration_weeks,
                      goal: "custom",
                      name: "Block 1",
                    } as unknown as TrainingBlock);
                  const bIdx = Math.max(
                    0,
                    trainingBlocks.findIndex((x) => x.id === block.id),
                  );
                  let bStart = 1;
                  for (let i = 0; i < bIdx; i++) bStart += trainingBlocks[i]?.duration_weeks ?? 0;
                  const blockRows = Array.from(
                    { length: block.duration_weeks },
                    (_, i) => bStart + i,
                  );
                  const blockIdForKey = block.id === "__fallback__" ? null : block.id;

                  return blockRows.map((absoluteWeek) => {
                    const rel = absoluteWeek - bStart + 1;
                    let wkWorkouts = 0;
                    let wkRest = 0;
                    let wkEmpty = 0;
                    for (let dayNum = 1; dayNum <= 7; dayNum++) {
                      const cell = scheduleMap.get(
                        scheduleKey(absoluteWeek, dayNum, blockIdForKey),
                      );
                      const weekHasConfig = weeksWithAnyConfiguredRows.has(absoluteWeek);
                      if (cell?.template_id && cell.template_id !== "rest") wkWorkouts += 1;
                      else if (cell?.template_id === "rest" || (!cell && weekHasConfig)) wkRest += 1;
                      else wkEmpty += 1;
                    }
                    const complete = wkEmpty === 0 && wkWorkouts + wkRest === 7;
                    const partial = !complete && wkWorkouts + wkRest > 0;
                    const emptyWeek = wkWorkouts === 0 && wkRest === 0;
                    const cardBg = emptyWeek ? "var(--pe-card-2)" : "var(--pe-card)";
                    const borderStyle = emptyWeek ? "dashed" : "solid";

                    return (
                      <div
                        key={`wk-${absoluteWeek}`}
                        className="rounded-2xl border p-3 space-y-2.5"
                        style={{
                          borderColor: "rgba(255,255,255,0.08)",
                          borderStyle,
                          background: cardBg,
                          boxShadow: complete ? "inset 3px 0 0 #34D399" : partial ? "inset 3px 0 0 #4FE3E8" : "inset 3px 0 0 rgba(255,255,255,0.2)",
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p
                              className="text-sm font-bold text-[var(--pe-t1)]"
                              style={{ fontFamily: "var(--f-headline, Bricolage Grotesque, sans-serif)" }}
                            >
                              Week {rel}
                            </p>
                            {emptyWeek ? (
                              <span
                                className="mt-0.5 inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--pe-t4)]"
                                style={{ background: "rgba(255,255,255,0.05)" }}
                              >
                                Empty
                              </span>
                            ) : (
                              <span
                                className="mt-0.5 inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                                style={{
                                  fontFamily: "var(--f-mono, Geist Mono, monospace)",
                                  background: "rgba(52,211,153,0.12)",
                                  color: "#34D399",
                                }}
                              >
                                {wkWorkouts} workouts · {wkRest} rest
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--pe-t3)] hover:bg-white/[0.06] hover:text-[var(--pe-t1)] transition-colors"
                              aria-label="Copy this week across block"
                              onClick={() => void handleCopyWeekAcrossActiveBlock(absoluteWeek)}
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--pe-t3)] hover:bg-white/[0.06] hover:text-[var(--pe-t1)] transition-colors opacity-40"
                              aria-label="Week menu"
                              disabled
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {Array.from({ length: 7 }, (_, i) => i + 1).map((dayNum) => {
                            const cell = scheduleMap.get(
                              scheduleKey(absoluteWeek, dayNum, blockIdForKey),
                            );
                            const template = cell
                              ? templates.find((t) => t.id === cell.template_id)
                              : null;
                            const weekHasConfig = weeksWithAnyConfiguredRows.has(absoluteWeek);
                            const isEmpty = !cell && !weekHasConfig;
                            const isRest =
                              (cell && cell.template_id === "rest") || (!cell && weekHasConfig);
                            const isTodayRow =
                              absoluteWeek === absoluteSelectedWeek && dayNum === programDayToday;
                            return (
                              <button
                                key={dayNum}
                                type="button"
                                onClick={() =>
                                  openScheduleEditor(absoluteWeek, dayNum, blockIdForKey)
                                }
                                className={cn(
                                  "flex min-h-[36px] w-full items-center gap-2 rounded-[10px] border px-2 py-1.5 text-left transition-colors",
                                  isTodayRow
                                    ? "border-[rgba(79,227,232,0.35)] ring-1 ring-[rgba(79,227,232,0.18)] bg-[rgba(79,227,232,0.04)]"
                                    : "border-[var(--pe-line-2)] hover:border-[rgba(79,227,232,0.35)]",
                                )}
                              >
                                <span
                                  className={cn(
                                    "w-8 shrink-0 text-center text-[9.5px] font-semibold uppercase tracking-[0.1em]",
                                    isTodayRow ? "text-[var(--pe-cyan)]" : "text-[var(--pe-t3)]",
                                  )}
                                  style={{ fontFamily: "var(--f-mono, Geist Mono, monospace)" }}
                                >
                                  {PROGRAM_DAY_SHORT_LABELS[dayNum - 1]}
                                </span>
                                {isEmpty ? (
                                  <>
                                    <span
                                      className="flex-1 text-left text-[12px] italic text-[var(--pe-t4)]"
                                      style={{ fontFamily: "var(--font-geist-sans, Geist, sans-serif)" }}
                                    >
                                      Tap to add workout
                                    </span>
                                    <Plus className="h-[18px] w-[18px] shrink-0 text-[var(--pe-t3)]" />
                                  </>
                                ) : isRest ? (
                                  <>
                                    <span className="flex-1" />
                                    <span
                                      className="rounded-md px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--pe-t3)]"
                                      style={{
                                        fontFamily: "var(--f-mono, Geist Mono, monospace)",
                                        background: "rgba(255,255,255,0.02)",
                                      }}
                                    >
                                      Rest
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4FE3E8]" />
                                    <span
                                      className="flex-1 truncate text-left text-[12px] font-medium text-[var(--pe-t1)]"
                                      style={{ fontFamily: "var(--font-geist-sans, Geist, sans-serif)" }}
                                    >
                                      {template?.name || "Workout"}
                                    </span>
                                    {cell?.is_optional ? (
                                      <span className="text-[9px] uppercase text-[var(--pe-cyan)]">Opt</span>
                                    ) : null}
                                  </>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
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
                              ? "bg-[color:var(--fc-accent-cyan)]/10 text-[color:var(--fc-accent-cyan)]"
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
                                  ? "bg-[color:var(--fc-accent-cyan)]/10 text-[color:var(--fc-accent-cyan)]"
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
                  templates={templatesForVolumeCalculator}
                />
              )}
            </div>
          )}

          {activeTab === "progression" && (
            <div role="tabpanel" className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h2
                    className="text-sm font-bold text-[var(--pe-t1)] sm:text-base"
                    style={{ fontFamily: "var(--f-headline, Bricolage Grotesque, sans-serif)" }}
                  >
                    Progression rules
                  </h2>
                  <p
                    className="mt-0.5 text-[11px] text-[var(--pe-t3)]"
                    style={{ fontFamily: "var(--font-geist-sans, Geist, sans-serif)" }}
                  >
                    Configure week-by-week % · RPE · reps
                  </p>
                </div>
                <div
                  className={cn(
                    "grid grid-cols-1 gap-1.5",
                    form?.category ? "sm:grid-cols-3" : "sm:grid-cols-2",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setShowPerWorkoutProgressionEditor(true)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--pe-line)] text-[11px] font-semibold text-[var(--pe-t2)] hover:bg-white/[0.04] hover:text-[var(--pe-t1)] transition-colors"
                    style={{ fontFamily: "var(--font-geist-sans, Geist, sans-serif)" }}
                  >
                    <LayoutGrid className="w-4 h-4" />
                    Per-workout
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSkipProgression()}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--pe-line)] text-[11px] font-semibold text-[var(--pe-t2)] hover:bg-white/[0.04] hover:text-[var(--pe-t1)] transition-colors"
                    style={{ fontFamily: "var(--font-geist-sans, Geist, sans-serif)" }}
                  >
                    Skip
                  </button>
                  {form?.category ? (
                    <button
                      type="button"
                      onClick={() => setShowProgressionSuggestions(true)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-transparent bg-[rgba(79,227,232,0.18)] text-[11px] font-semibold text-[#0a1a26] transition-colors hover:bg-[#4FE3E8]"
                      style={{ fontFamily: "var(--font-geist-sans, Geist, sans-serif)" }}
                    >
                      <Sparkles className="w-4 h-4" />
                      Suggest
                    </button>
                  ) : null}
                </div>
              </div>

              <ProgramProgressionGrid
                programId={form.id}
                durationWeeks={programDisplayWeeks}
                schedule={schedule}
                onConfigureRow={handleConfigureGridRow}
                onOpenFullEditorCell={handleOpenGridCellFullEditor}
                reloadSignal={progressionReloadKey}
                accentWeekNumber={absoluteSelectedWeek}
              />
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
          {showPerWorkoutProgressionEditor && (
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              onClick={requestClosePerWorkoutEditor}
            >
              <div
                className="w-full max-w-6xl max-h-[90vh] h-full sm:h-auto fc-modal fc-card p-4 sm:p-6 flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between gap-3 mb-3 flex-shrink-0">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-[color:var(--fc-text-primary)]">
                      Per-workout deep editor
                    </h3>
                    <p className="text-xs text-[color:var(--fc-text-dim)]">
                      Configure full progression fields for the selected week/day.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={requestClosePerWorkoutEditor}
                    aria-label="Close deep editor"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-3 flex-shrink-0">
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
                      <SelectTrigger className="w-28 h-9 text-sm rounded-lg [&>svg]:text-[color:var(--fc-accent-cyan)]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[10000]" position="popper">
                        {Array.from({ length: maxWeeks }, (_, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>
                            Week {i + 1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {schedule
                      .filter(
                        (s) =>
                          (s.week_number || 1) === absoluteSelectedWeek &&
                          scheduleRowMatchesActiveBlock(
                            s,
                            activeBlockId,
                            trainingBlocks,
                          ),
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
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto pt-3">
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
                        TrainingBlockService.getBlockForWeekFromBlocks(
                          trainingBlocks,
                          selectedScheduleForProgression.week_number ||
                            absoluteSelectedWeek,
                        )?.id ??
                        undefined
                      }
                      exercises={availableExercisesList as any}
                      templates={templates}
                      blockSchedules={schedule
                        .filter((s) => {
                          const anchor =
                            TrainingBlockService.getBlockForWeekFromBlocks(
                              trainingBlocks,
                              selectedScheduleForProgression.week_number ||
                                absoluteSelectedWeek,
                            )?.id ?? null;
                          return (
                            s.program_day ===
                              selectedScheduleForProgression.program_day &&
                            (TrainingBlockService.getBlockForWeekFromBlocks(
                              trainingBlocks,
                              s.week_number || 1,
                            )?.id ?? null) === anchor
                          );
                        })
                        .map((s) => ({ id: s.id, week_number: s.week_number }))}
                      onDirtyStateChange={(dirty) => setDeepEditorDirty(dirty)}
                      onUpdate={() => {
                        load().catch(console.error);
                      }}
                      onApplied={() => {
                        const week2AbsoluteWeek = absoluteSelectedWeek + 1;
                        const anchor =
                          TrainingBlockService.getBlockForWeekFromBlocks(
                            trainingBlocks,
                            selectedScheduleForProgression.week_number ||
                              absoluteSelectedWeek,
                          )?.id ?? null;
                        const week2Schedule = schedule.find(
                          (s) =>
                            s.program_day ===
                              selectedScheduleForProgression.program_day &&
                            (TrainingBlockService.getBlockForWeekFromBlocks(
                              trainingBlocks,
                              s.week_number || 1,
                            )?.id ?? null) === anchor &&
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
              </div>
            </div>
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
