"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/withTimeout";
import WorkoutTemplateService, {
  type ProgramSchedule,
} from "@/lib/workoutTemplateService";
import { WorkoutBlockService } from "@/lib/workoutBlockService";
import { TrainingBlockService } from "@/lib/trainingBlockService";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ClientPageShell } from "@/components/client-ui";
import { cn } from "@/lib/utils";
import type { TrainingBlock } from "@/types/trainingBlock";
import { TRAINING_BLOCK_GOALS } from "@/types/trainingBlock";
import type { WorkoutSetEntry } from "@/types/workoutSetEntries";

interface Program {
  id: string;
  name: string;
  description: string;
  duration_weeks: number;
}

interface TemplatePreview {
  id: string;
  name: string;
  description: string | null;
  estimated_duration: number | null;
  difficulty_level: string | null;
  category: string | null;
}

interface DaySlot {
  key: string;
  scheduleId: string | null;
  dayNumber: number;
  weekNumber: number;
  templateId: string | null;
  isOptional: boolean;
  scheduleNotes?: string | null;
  trainingBlockId: string | null;
  trainingBlock: TrainingBlock | null;
  template: TemplatePreview | null;
  isRest: boolean;
}

interface WeekSection {
  weekNumber: number;
  days: DaySlot[];
}

interface BlockSection {
  block: TrainingBlock | null;
  displayBlockOrder: number;
  weeks: WeekSection[];
}

/** Training-block goal → dot fill (collapsed day row). */
function goalDotClassForBlock(block: TrainingBlock | null): string {
  if (!block) return "bg-gray-400";
  const g = (block.goal || "custom").toLowerCase();
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

/** Matching subtle ring for goal dot (ring-2 ring-{color}-400/20). */
function goalDotRingClassForBlock(block: TrainingBlock | null): string {
  if (!block) return "ring-gray-400/20";
  const g = (block.goal || "custom").toLowerCase();
  const map: Record<string, string> = {
    hypertrophy: "ring-cyan-400/20",
    strength: "ring-amber-400/20",
    power: "ring-orange-400/20",
    accumulation: "ring-emerald-400/20",
    conditioning: "ring-teal-400/20",
    sport_specific: "ring-purple-400/20",
    deload: "ring-gray-400/20",
    peaking: "ring-purple-400/20",
    general_fitness: "ring-emerald-400/20",
    custom: "ring-gray-400/20",
  };
  return map[g] ?? "ring-gray-400/20";
}

function difficultyBadgeTextClass(level: string): string {
  const k = level.trim().toLowerCase();
  if (k === "beginner") return "text-emerald-400/80";
  if (k === "intermediate") return "text-amber-400/80";
  if (k === "advanced") return "text-orange-400/80";
  if (k === "athlete") return "text-rose-400/80";
  return "text-gray-400/80";
}

/**
 * Must match the same value used for expand/collapse (`day.key`), not `scheduleId` alone:
 * `??` does not treat "" as missing, and id types can diverge from `key` unless normalized.
 */
function dayExerciseCacheKey(day: DaySlot): string {
  return String(day.key);
}

function DayRowSubtitle({ day }: { day: DaySlot }) {
  const t = day.template;
  const difficultyRaw = t?.difficulty_level?.trim();
  const category =
    t?.category &&
    String(t.category).trim() &&
    String(t.category).toLowerCase() !== "general"
      ? String(t.category).toUpperCase()
      : null;
  const optionalTail = day.isOptional ? "OPTIONAL" : null;
  const metaParts = [category, optionalTail].filter(Boolean) as string[];
  const metaText = metaParts.join(" · ");

  if (!difficultyRaw && !metaText) return null;

  return (
    <div className="flex min-w-0 w-full flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] uppercase tracking-wider text-gray-500/80">
      {difficultyRaw ? (
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded border border-white/[0.06] bg-white/[0.04] px-1.5 py-0.5 font-medium leading-none",
            difficultyBadgeTextClass(difficultyRaw),
          )}
        >
          {difficultyRaw.toUpperCase()}
        </span>
      ) : null}
      {metaText ? (
        <span className="min-w-0 truncate">
          {difficultyRaw ? <span className="text-gray-500/80">· </span> : null}
          <span className="text-gray-500">{metaText}</span>
        </span>
      ) : null}
    </div>
  );
}

function blockHeaderGoalLabel(block: TrainingBlock | null): string {
  if (!block) return "PROGRAM";
  if (block.goal === "custom" && block.custom_goal_label) {
    return block.custom_goal_label.toUpperCase();
  }
  return (TRAINING_BLOCK_GOALS[block.goal] || block.goal).toUpperCase();
}

/** Short label for block nav chips (first segment before / or space-heavy trim). */
function goalAbbrevForNavChip(block: TrainingBlock | null): string {
  const label = blockHeaderGoalLabel(block);
  const segment = label.split("/")[0]?.trim() ?? label;
  return segment.length > 18 ? `${segment.slice(0, 16)}…` : segment;
}

function blockNavStableKey(section: BlockSection): string {
  return section.block?.id ?? `order-${section.displayBlockOrder}`;
}

function sectionNavKeyForWeek(sections: BlockSection[], absoluteWeek: number): string | null {
  for (const sec of sections) {
    if (sec.weeks.some((w) => w.weekNumber === absoluteWeek)) {
      return blockNavStableKey(sec);
    }
  }
  return null;
}

/** Prefer the most common training_block_id in the week (avoids wrong block from .find() order). */
function dominantTrainingBlockId(rowsInWeek: ProgramSchedule[]): string | null {
  const counts = new Map<string, number>();
  for (const r of rowsInWeek) {
    const tid = r.training_block_id;
    if (tid == null) continue;
    const k = String(tid).trim();
    if (!k) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  let best: string | null = null;
  let bestN = -1;
  for (const [k, n] of counts) {
    if (n > bestN) {
      best = k;
      bestN = n;
    }
  }
  return best;
}

function inferTrainingBlockIdForWeek(
  weekNum: number,
  rowsInWeek: ProgramSchedule[],
  blocksOrdered: TrainingBlock[],
): string | null {
  const fromRows = dominantTrainingBlockId(rowsInWeek);
  if (fromRows) return fromRows;
  if (blocksOrdered.length === 0) return null;
  let acc = 0;
  for (const b of blocksOrdered) {
    acc += Math.max(0, Number(b.duration_weeks) || 0);
    if (weekNum <= acc) return b.id;
  }
  return blocksOrdered[blocksOrdered.length - 1]?.id ?? null;
}

function isRestTemplateName(name: string | null | undefined): boolean {
  if (!name) return false;
  return /^rest$/i.test(name.trim());
}

/** Sets × reps for expanded badge (spaces around ×). */
function formatPrescriptionBadge(block: WorkoutSetEntry, ex: any): string {
  const blockType = (block.set_type || "").toLowerCase();
  if (["straight_set", "superset", "giant_set", "pre_exhaustion"].includes(blockType)) {
    const sets = ex.sets ?? block.total_sets;
    const reps = ex.reps ?? block.reps_per_set ?? "";
    if (sets != null && reps) return `${sets} × ${reps}`;
    if (reps) return String(reps);
  } else if (blockType === "drop_set") {
    const sets = ex.sets ?? block.total_sets;
    return sets != null ? `${sets} drops` : "Drop set";
  } else if (blockType === "cluster_set") {
    const c = ex.cluster_sets?.[0];
    if (c) return `${c.reps_per_cluster} × ${c.clusters_per_set} clusters`;
    return "Cluster";
  } else if (blockType === "rest_pause") {
    return "Rest-pause";
  } else if (blockType === "amrap") {
    const dur = block.duration_seconds ? Math.floor(block.duration_seconds / 60) : null;
    return dur ? `${dur} min AMRAP` : "AMRAP";
  } else if (blockType === "emom") {
    const dur = block.duration_seconds ? Math.floor(block.duration_seconds / 60) : null;
    return dur ? `EMOM ${dur}m` : "EMOM";
  } else if (blockType === "for_time") {
    return "For time";
  } else if (blockType === "tabata") {
    return "Tabata";
  } else if (blockType === "speed_work") {
    return "Speed work";
  } else if (blockType === "endurance") {
    return "Endurance";
  } else {
    const sets = ex.sets ?? block.total_sets;
    const reps = ex.reps ?? block.reps_per_set ?? "";
    if (sets != null && reps) return `${sets} × ${reps}`;
    if (reps) return String(reps);
  }
  return "—";
}

function formatExerciseWeightLine(ex: any): string | null {
  const w = ex.weight_kg;
  if (w != null && w !== "") {
    const n = typeof w === "number" ? (Number.isInteger(w) ? String(w) : String(w)) : String(w);
    return `@ ${n}kg`;
  }
  const lp = ex.load_percentage;
  if (lp != null && lp !== "") {
    const n = typeof lp === "number" ? String(lp) : String(lp);
    return `@ ${n}% 1RM`;
  }
  return null;
}

interface ExpandedExerciseRow {
  name: string;
  prescription: string;
  notes: string | null;
  weightLine: string | null;
}

function collectExpandedExerciseRows(block: WorkoutSetEntry): ExpandedExerciseRow[] {
  const exercises = block.exercises;
  if (exercises && exercises.length > 0) {
    const sorted = [...exercises].sort((a, b) => (a.exercise_order ?? 0) - (b.exercise_order ?? 0));
    return sorted.map((ex) => ({
      name: ex.exercise?.name || ex.exercise_letter || "Exercise",
      prescription: formatPrescriptionBadge(block, ex),
      notes: ex.notes ?? null,
      weightLine: formatExerciseWeightLine(ex),
    }));
  }
  const label = block.set_name || block.set_type || "Block";
  return [{ name: label, prescription: "—", notes: null, weightLine: null }];
}

function ExpandedDaySkeletonRows() {
  return (
    <div className="space-y-0" role="status" aria-label="Loading exercises">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex animate-pulse items-center justify-between gap-3 border-b border-white/[0.04] py-2 last:border-0"
        >
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-4 w-[55%] rounded bg-white/10" />
            <div className="h-3 w-[40%] rounded bg-white/[0.06]" />
          </div>
          <div className="shrink-0">
            <div className="h-6 w-16 rounded-md border border-white/5 bg-white/[0.06]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function buildBlockSections(
  schedule: ProgramSchedule[],
  templatesMap: Map<string, TemplatePreview>,
  blocksOrdered: TrainingBlock[],
  programDurationWeeks?: number | null,
): BlockSection[] {
  if (!schedule.length && blocksOrdered.length === 0) return [];

  const tbMap = new Map(blocksOrdered.map((b) => [b.id, b]));
  const attachBlock = (row: ProgramSchedule): TrainingBlock | null => {
    if (row.training_block) return row.training_block;
    const id = row.training_block_id;
    return id ? tbMap.get(id) ?? null : null;
  };

  const maxFromSchedule =
    schedule.length > 0 ? Math.max(...schedule.map((s) => s.week_number ?? 1), 1) : 1;
  const sumBlockWeeks = blocksOrdered.reduce(
    (acc, b) => acc + Math.max(0, Number(b.duration_weeks) || 0),
    0,
  );
  const maxWeek = Math.max(
    maxFromSchedule,
    sumBlockWeeks,
    programDurationWeeks != null && programDurationWeeks > 0 ? programDurationWeeks : 0,
    1,
  );

  const byWeek = new Map<number, ProgramSchedule[]>();
  for (const row of schedule) {
    const w = row.week_number ?? 1;
    if (!byWeek.has(w)) byWeek.set(w, []);
    byWeek.get(w)!.push(row);
  }

  const slotsByBlock = new Map<string | "__none", Map<number, DaySlot[]>>();

  const ensureBucket = (blockKey: string) => {
    if (!slotsByBlock.has(blockKey)) slotsByBlock.set(blockKey, new Map());
    return slotsByBlock.get(blockKey)!;
  };

  for (let w = 1; w <= maxWeek; w++) {
    const rows = byWeek.get(w) ?? [];
    const byDay = new Map<number, ProgramSchedule>();
    for (const r of rows) {
      const d = r.program_day ?? 1;
      byDay.set(d, r);
    }
    const inferredBlockId = inferTrainingBlockIdForWeek(w, rows, blocksOrdered);

    for (let dayNum = 1; dayNum <= 7; dayNum++) {
      const row = byDay.get(dayNum);
      const blockId = row?.training_block_id ?? inferredBlockId;
      const blockKey = blockId || "__none";

      if (!row) {
        const tb = blockId ? tbMap.get(blockId) ?? null : null;
        const weekMap = ensureBucket(blockKey);
        if (!weekMap.has(w)) weekMap.set(w, []);
        weekMap.get(w)!.push({
          key: String(`rest-${w}-${dayNum}`),
          scheduleId: null,
          dayNumber: dayNum,
          weekNumber: w,
          templateId: null,
          isOptional: false,
          trainingBlockId: blockId,
          trainingBlock: tb,
          template: null,
          isRest: true,
        });
        continue;
      }

      const templateId = row.template_id && String(row.template_id).length > 0 ? row.template_id : null;
      const tmpl = templateId ? templatesMap.get(templateId) ?? null : null;
      const tbRow = attachBlock(row);
      const restByTemplate = Boolean(
        !templateId || (tmpl != null && isRestTemplateName(tmpl.name)),
      );

      const weekMap = ensureBucket(blockKey);
      if (!weekMap.has(w)) weekMap.set(w, []);
      const rowIdRaw = row.id as string | number | null | undefined;
      const slotKey = String(
        rowIdRaw !== null && rowIdRaw !== undefined && String(rowIdRaw).trim() !== ""
          ? rowIdRaw
          : `slot-${w}-${dayNum}`,
      );
      weekMap.get(w)!.push({
        key: slotKey,
        scheduleId:
          rowIdRaw !== null && rowIdRaw !== undefined && String(rowIdRaw).trim() !== ""
            ? String(rowIdRaw)
            : null,
        dayNumber: dayNum,
        weekNumber: w,
        templateId,
        isOptional: row.is_optional === true,
        scheduleNotes: row.notes ?? null,
        trainingBlockId: blockId,
        trainingBlock: tbRow ?? (blockId ? tbMap.get(blockId) ?? null : null),
        template: tmpl,
        isRest: restByTemplate,
      });
    }
  }

  const orderedBlockIds = blocksOrdered.map((b) => b.id);
  const seen = new Set<string>();
  const sections: BlockSection[] = [];

  const pushSection = (block: TrainingBlock | null, blockOrder: number, key: string) => {
    if (seen.has(key)) return;
    seen.add(key);
    const weekMap = slotsByBlock.get(key);
    if (!weekMap || weekMap.size === 0) return;
    const weeks: WeekSection[] = Array.from(weekMap.keys())
      .sort((a, b) => a - b)
      .map((wn) => ({
        weekNumber: wn,
        days: (weekMap.get(wn) || []).sort((a, b) => a.dayNumber - b.dayNumber),
      }));
    sections.push({ block, displayBlockOrder: blockOrder, weeks });
  };

  let orderCounter = 0;
  for (const bid of orderedBlockIds) {
    orderCounter += 1;
    pushSection(tbMap.get(bid) ?? null, orderCounter, bid);
  }

  if (slotsByBlock.has("__none")) {
    orderCounter += 1;
    pushSection(null, orderCounter, "__none");
  }

  for (const key of slotsByBlock.keys()) {
    if (key !== "__none" && !seen.has(key)) {
      orderCounter += 1;
      pushSection(tbMap.get(key) ?? null, orderCounter, key);
    }
  }

  return sections;
}

function ProgramDetailsContent() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { performanceSettings } = useTheme();
  const [program, setProgram] = useState<Program | null>(null);
  const [blockSections, setBlockSections] = useState<BlockSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Absolute program week to expand by default (from /api/client/program-week when program matches). */
  const [clientOutlineWeek, setClientOutlineWeek] = useState<number>(1);
  const [weekLayoutReady, setWeekLayoutReady] = useState(false);
  const [openWeeks, setOpenWeeks] = useState<Record<number, boolean>>({});
  const [scrollNavBlockKey, setScrollNavBlockKey] = useState<string | null>(null);
  const [expandedDayKeys, setExpandedDayKeys] = useState<Set<string>>(new Set());
  const expandedDayKeysRef = useRef(expandedDayKeys);
  expandedDayKeysRef.current = expandedDayKeys;

  const [loadingTemplates, setLoadingTemplates] = useState<Set<string>>(new Set());
  const [blocksCache, setBlocksCache] = useState<Map<string, WorkoutSetEntry[]>>(new Map());
  const blocksCacheRef = useRef(blocksCache);
  blocksCacheRef.current = blocksCache;

  const isValidUuid = (val: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

  const loadProgramDetails = useCallback(async (programId: string) => {
    try {
      setLoading(true);
      setError(null);

      await withTimeout(
        (async () => {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) throw new Error("User not authenticated");

          const { data: assignmentData, error: assignmentError } = await supabase
            .from("program_assignments")
            .select(
              `*,
              program:workout_programs(id, name, description, duration_weeks)`
            )
            .eq("program_id", programId)
            .eq("client_id", user.id)
            .eq("status", "active")
            .maybeSingle();

          if (assignmentError) {
            console.error("Error fetching program through assignment:", assignmentError);
            throw new Error("Failed to load program details");
          }

          if (!assignmentData || !assignmentData.program) {
            throw new Error("Program not found or not assigned to you");
          }

          const programData = assignmentData.program as any;
          setProgram({
            id: programData.id,
            name: programData.name,
            description: programData.description || "",
            duration_weeks: programData.duration_weeks,
          });

          const [scheduleRaw, trainingBlocks] = await Promise.all([
            WorkoutTemplateService.getProgramSchedule(programId),
            TrainingBlockService.getTrainingBlocks(programId),
          ]);

          const tbMap = new Map(trainingBlocks.map((b) => [b.id, b]));
          const schedule: ProgramSchedule[] = scheduleRaw.map((s) => ({
            ...s,
            training_block: s.training_block_id ? tbMap.get(s.training_block_id) ?? null : null,
          }));

          if (!schedule.length && trainingBlocks.length === 0) {
            setBlockSections([]);
            return;
          }

          const uniqueTemplateIds = Array.from(
            new Set(
              schedule
                .map((s) => s.template_id)
                .filter((tid) => tid && String(tid).length > 0) as string[],
            ),
          );

          const templatesMap = new Map<string, TemplatePreview>();
          if (uniqueTemplateIds.length > 0) {
            const { data: templatesRows } = await supabase
              .from("workout_templates")
              .select("id, name, description, estimated_duration, difficulty_level, category")
              .in("id", uniqueTemplateIds);

            for (const t of templatesRows || []) {
              templatesMap.set((t as any).id, {
                id: (t as any).id,
                name: (t as any).name,
                description: (t as any).description ?? null,
                estimated_duration: (t as any).estimated_duration ?? null,
                difficulty_level: (t as any).difficulty_level ?? null,
                category: (t as any).category ?? null,
              });
            }
          }

          setBlockSections(
            buildBlockSections(schedule, templatesMap, trainingBlocks, programData.duration_weeks),
          );
        })(),
        30000,
        "timeout"
      );
    } catch (err) {
      console.error("Error loading program details:", err);
      setError("Failed to load program details");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!id) return;
    const idStr = id as string;
    if (!isValidUuid(idStr)) {
      setError("Invalid program link. Please go back and try again.");
      setLoading(false);
      return;
    }
    loadProgramDetails(idStr);
  }, [id, loadProgramDetails]);

  useEffect(() => {
    let cancelled = false;
    setWeekLayoutReady(false);
    setScrollNavBlockKey(null);
    (async () => {
      try {
        const res = await fetch("/api/client/program-week", { credentials: "include" });
        if (!res.ok) throw new Error("program-week");
        const data = await res.json();
        if (cancelled) return;
        const pageProgramId = typeof id === "string" ? id : Array.isArray(id) ? id[0] : null;
        const activePid = data.programId as string | null | undefined;
        const cw = data.currentUnlockedWeek as number | undefined;
        if (pageProgramId && activePid === pageProgramId && typeof cw === "number" && cw >= 1) {
          setClientOutlineWeek(cw);
        } else {
          setClientOutlineWeek(1);
        }
      } catch {
        if (!cancelled) setClientOutlineWeek(1);
      } finally {
        if (!cancelled) setWeekLayoutReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const allWeekNumbers = useMemo(() => {
    const s = new Set<number>();
    for (const sec of blockSections) {
      for (const w of sec.weeks) {
        s.add(w.weekNumber);
      }
    }
    return Array.from(s).sort((a, b) => a - b);
  }, [blockSections]);

  useEffect(() => {
    if (allWeekNumbers.length === 0 || !weekLayoutReady) return;
    const target =
      clientOutlineWeek >= 1 && allWeekNumbers.includes(clientOutlineWeek)
        ? clientOutlineWeek
        : (allWeekNumbers[0] ?? 1);
    const initial: Record<number, boolean> = {};
    for (const w of allWeekNumbers) {
      initial[w] = w === target;
    }
    setOpenWeeks(initial);
  }, [allWeekNumbers, clientOutlineWeek, weekLayoutReady]);

  const progressNavBlockKey = useMemo(
    () => sectionNavKeyForWeek(blockSections, clientOutlineWeek),
    [blockSections, clientOutlineWeek],
  );

  const highlightedNavBlockKey =
    scrollNavBlockKey ??
    progressNavBlockKey ??
    (blockSections[0] ? blockNavStableKey(blockSections[0]) : null);

  const blockNavVisibilityRef = useRef<Map<string, { ratio: number; top: number }>>(new Map());

  useEffect(() => {
    blockNavVisibilityRef.current.clear();
  }, [blockSections]);

  useEffect(() => {
    if (typeof window === "undefined" || blockSections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const vis = blockNavVisibilityRef.current;
        for (const e of entries) {
          const key = (e.target as HTMLElement).dataset.blockNavKey;
          if (!key) continue;
          if (e.isIntersecting && e.intersectionRatio > 0) {
            vis.set(key, {
              ratio: e.intersectionRatio,
              top: e.boundingClientRect.top,
            });
          } else {
            vis.delete(key);
          }
        }
        if (vis.size === 0) return;
        let bestKey: string | null = null;
        let bestScore = -Infinity;
        for (const [key, v] of vis) {
          const score = v.ratio * 1000 - Math.max(0, v.top - 52) * 0.02;
          if (score > bestScore) {
            bestScore = score;
            bestKey = key;
          }
        }
        if (bestKey) setScrollNavBlockKey(bestKey);
      },
      {
        root: null,
        threshold: [0, 0.08, 0.15, 0.25, 0.4, 0.55, 0.7, 0.85, 1],
        rootMargin: "-52px 0px -52% 0px",
      },
    );
    const raf = requestAnimationFrame(() => {
      document.querySelectorAll<HTMLElement>("[data-block-nav-key]").forEach((el) => {
        observer.observe(el);
      });
    });
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [blockSections]);

  const totalWorkoutSlots = useMemo(() => {
    let n = 0;
    for (const sec of blockSections) {
      for (const w of sec.weeks) {
        for (const d of w.days) {
          if (!d.isRest && d.templateId) n += 1;
        }
      }
    }
    return n;
  }, [blockSections]);

  const weekCountStat = useMemo(() => {
    if (allWeekNumbers.length === 0) return program?.duration_weeks ?? 0;
    return Math.max(...allWeekNumbers, program?.duration_weeks ?? 0);
  }, [allWeekNumbers, program?.duration_weeks]);

  const workoutsPerWeekDisplay =
    program && weekCountStat > 0
      ? Math.round((totalWorkoutSlots / weekCountStat) * 10) / 10
      : totalWorkoutSlots;

  const ensureTemplateLoaded = useCallback(async (day: DaySlot) => {
    const templateId = day.templateId;
    if (!templateId) return;
    const cacheKey = dayExerciseCacheKey(day);
    if (blocksCacheRef.current.has(cacheKey)) return;
    setLoadingTemplates((prev) => new Set(prev).add(cacheKey));
    try {
      const blocks = await WorkoutBlockService.getWorkoutBlocks(templateId);
      setBlocksCache((prev) => new Map(prev).set(cacheKey, blocks));
    } catch (e) {
      console.error("Lazy load workout structure:", e);
      setBlocksCache((prev) => new Map(prev).set(cacheKey, []));
    } finally {
      setLoadingTemplates((prev) => {
        const n = new Set(prev);
        n.delete(cacheKey);
        return n;
      });
    }
  }, []);

  const toggleDayExpand = useCallback(
    async (day: DaySlot) => {
      if (day.isRest || !day.templateId) return;
      const k = String(day.key);
      const opening = !expandedDayKeysRef.current.has(k);
      setExpandedDayKeys((prev) => {
        const next = new Set(prev);
        if (next.has(k)) next.delete(k);
        else next.add(k);
        return next;
      });
      if (opening) await ensureTemplateLoaded(day);
    },
    [ensureTemplateLoaded],
  );

  if (loading) {
    return (
      <AnimatedBackground>
        <ClientPageShell className="max-w-lg mx-auto px-4 pb-32 pt-6 overflow-x-hidden">
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="animate-pulse space-y-3">
            <div className="h-8 w-28 rounded-lg bg-[color:var(--fc-glass-highlight)]" />
            <div className="h-6 w-48 rounded-lg bg-[color:var(--fc-glass-highlight)]" />
            <div className="h-36 rounded-xl bg-[color:var(--fc-glass-highlight)]" />
            <div className="h-36 rounded-xl bg-[color:var(--fc-glass-highlight)]" />
          </div>
        </ClientPageShell>
      </AnimatedBackground>
    );
  }

  if (error || !program) {
    return (
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <ClientPageShell className="max-w-lg mx-auto px-4 pb-32 pt-6 overflow-x-hidden w-full">
          <div className="w-full space-y-3">
            <ErrorBanner
              title={error ? "Couldn't load program" : "Program not found"}
              message="Please check your connection and try again."
              onRetry={error && id ? () => loadProgramDetails(id as string) : undefined}
            />
            <Button
              type="button"
              onClick={() => {
                window.location.href = "/client/train";
              }}
              variant="outline"
              className="w-full h-10 text-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to training
            </Button>
          </div>
        </ClientPageShell>
      </AnimatedBackground>
    );
  }

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}
      <ClientPageShell className="max-w-lg mx-auto px-4 pb-32 pt-6 overflow-x-hidden">
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={() => {
              window.location.href = "/client/train";
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white hover:bg-white/[0.05]"
            aria-label="Back to training"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-white tracking-tight mb-1 break-words">{program.name}</h1>
            <p className="text-sm text-gray-500">
              <span className="tabular-nums">{program.duration_weeks}</span> weeks ·{" "}
              <span className="tabular-nums">{weekCountStat}</span> weeks ·{" "}
              <span className="tabular-nums">{workoutsPerWeekDisplay}</span> workouts/week
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 mb-4">
          <div className="flex items-center justify-between gap-1">
            <div className="flex-1 min-w-0 text-center">
              <p className="text-base font-semibold text-white tabular-nums">{weekCountStat}</p>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-0.5">Weeks</p>
            </div>
            <div className="w-px h-8 bg-white/10 shrink-0" aria-hidden />
            <div className="flex-1 min-w-0 text-center">
              <p className="text-base font-semibold text-white tabular-nums">{workoutsPerWeekDisplay}</p>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-0.5">
                Workouts/wk
              </p>
            </div>
            <div className="w-px h-8 bg-white/10 shrink-0" aria-hidden />
            <div className="flex-1 min-w-0 text-center">
              <p className="text-base font-semibold text-white tabular-nums">{totalWorkoutSlots}</p>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-0.5">
                Total workouts
              </p>
            </div>
          </div>
        </div>

        {blockSections.length > 0 ? (
          <div className="sticky top-0 z-10 -mx-4 border-b border-white/[0.07] bg-transparent px-4 py-1.5">
            <div className="flex gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {blockSections.map((section) => {
                const navKey = blockNavStableKey(section);
                const active = highlightedNavBlockKey === navKey;
                return (
                  <button
                    key={navKey}
                    type="button"
                    onClick={() => {
                      const safe = typeof CSS !== "undefined" && "escape" in CSS ? CSS.escape(navKey) : navKey;
                      const el = document.querySelector<HTMLElement>(`[data-block-nav-key="${safe}"]`);
                      el?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className={cn(
                      "shrink-0 appearance-none rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase leading-none tracking-wider shadow-none ring-0 outline-none transition-colors",
                      active
                        ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-300/90"
                        : "border-white/[0.08] bg-white/[0.05] text-gray-400",
                    )}
                  >
                    BLOCK {section.displayBlockOrder} · {goalAbbrevForNavChip(section.block)}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {program.description ? (
          <p className="mb-4 text-sm text-gray-400 leading-relaxed line-clamp-4">{program.description}</p>
        ) : null}

        {blockSections.length === 0 ? (
          <p className="text-center text-sm text-gray-500 py-8">No schedule for this program yet.</p>
        ) : (
          <div className="mb-6">
            {blockSections.map((section, secIdx) => {
              const weeksRange =
                section.weeks.length > 0
                  ? `${Math.min(...section.weeks.map((w) => w.weekNumber))}–${Math.max(...section.weeks.map((w) => w.weekNumber))}`
                  : "—";
              const durW = section.block?.duration_weeks ?? "—";
              const goalLine = blockHeaderGoalLabel(section.block);

              const navKey = blockNavStableKey(section);
              return (
                <section
                  key={`sec-${section.displayBlockOrder}-${secIdx}`}
                  data-block-nav-key={navKey}
                  className={cn(secIdx === 0 ? "mt-0" : "mt-6", "mb-2 scroll-mt-16")}
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-300/70">
                    BLOCK {section.displayBlockOrder} · {goalLine}
                  </p>
                  {section.block?.name ? (
                    <p className="text-sm font-semibold text-white mt-0.5">{section.block.name}</p>
                  ) : (
                    <p className="text-sm font-semibold text-white mt-0.5">Program block</p>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5">
                    Weeks {weeksRange} · {durW} weeks
                  </p>
                  {section.block?.notes ? (
                    <p className="text-xs text-gray-400 italic mt-1">{section.block.notes}</p>
                  ) : null}

                  {section.weeks.map(({ weekNumber, days }) => {
                    const weekOpen = openWeeks[weekNumber] === true;
                    return (
                      <div
                        key={`w-${weekNumber}`}
                        className="rounded-xl border border-white/10 bg-white/[0.04] p-4 mb-3 mt-3"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setOpenWeeks((prev) => ({
                              ...prev,
                              [weekNumber]: !prev[weekNumber],
                            }))
                          }
                          className="flex w-full items-center justify-between gap-2 text-left"
                          aria-expanded={weekOpen}
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300/70 mb-0">
                            WEEK {weekNumber}
                          </span>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 shrink-0 text-gray-500 transition-transform",
                              weekOpen && "rotate-180",
                            )}
                          />
                        </button>

                        {weekOpen ? (
                          <div className="mt-2">
                            {days.map((day) => {
                              if (day.isRest) {
                                return (
                                  <div
                                    key={day.key}
                                    className="flex items-center gap-4 py-3.5 border-b border-white/5 last:border-0"
                                  >
                                    <div className="flex w-12 shrink-0 items-center justify-center">
                                      <span className="text-2xl font-light text-gray-700/60 tabular-nums leading-none">
                                        —
                                      </span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-base font-medium italic text-gray-500">Rest day</p>
                                    </div>
                                  </div>
                                );
                              }

                              const expanded = expandedDayKeys.has(String(day.key));
                              const dayLoadKey = dayExerciseCacheKey(day);
                              const isLoadingBlocks =
                                !!day.templateId && loadingTemplates.has(dayLoadKey);
                              const cachedBlocks = blocksCache.get(dayLoadKey);

                              const workoutName = day.template?.name ?? "Workout";
                              const durationStr =
                                day.template?.estimated_duration != null &&
                                day.template.estimated_duration > 0
                                  ? `${day.template.estimated_duration} min`
                                  : "—";

                              const activateDayRow = () => {
                                if (!openWeeks[weekNumber]) {
                                  setOpenWeeks((p) => ({ ...p, [weekNumber]: true }));
                                }
                                void toggleDayExpand(day);
                              };

                              return (
                                <div
                                  key={day.key}
                                  className="border-b border-white/5 last:border-0"
                                >
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    aria-expanded={expanded}
                                    className="flex w-full cursor-pointer items-start gap-4 py-3.5 text-left transition-colors hover:bg-white/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/35 focus-visible:ring-offset-0"
                                    onClick={activateDayRow}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        activateDayRow();
                                      }
                                    }}
                                  >
                                    <div className="flex w-12 shrink-0 flex-col items-center gap-1 pt-0.5">
                                      <span className="text-2xl font-bold leading-none tracking-tight text-white/90 tabular-nums">
                                        {String(day.dayNumber).padStart(2, "0")}
                                      </span>
                                      <span
                                        className={cn(
                                          "h-2.5 w-2.5 shrink-0 rounded-full ring-2",
                                          goalDotClassForBlock(day.trainingBlock),
                                          goalDotRingClassForBlock(day.trainingBlock),
                                        )}
                                        aria-hidden
                                      />
                                    </div>
                                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                                      <div className="flex items-baseline justify-between gap-2">
                                        <span className="truncate text-base font-semibold tracking-tight text-white/95">
                                          {workoutName}
                                        </span>
                                        <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/5 bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium tabular-nums text-gray-400">
                                          <Clock className="h-2.5 w-2.5 shrink-0 opacity-70" aria-hidden />
                                          {durationStr}
                                        </span>
                                      </div>
                                      <DayRowSubtitle day={day} />
                                    </div>
                                    <div className="ml-1 flex shrink-0 items-start justify-center pt-1.5">
                                      {expanded ? (
                                        <ChevronDown className="h-4 w-4 text-gray-500" aria-hidden />
                                      ) : (
                                        <ChevronRight className="h-4 w-4 text-gray-500" aria-hidden />
                                      )}
                                    </div>
                                  </div>

                                  {expanded && day.templateId ? (
                                    <div className="mb-2 mt-2 pl-[3.75rem]">
                                      <div className="ml-6 border-l border-white/5 pl-4">
                                        {isLoadingBlocks || cachedBlocks === undefined ? (
                                          <ExpandedDaySkeletonRows />
                                        ) : cachedBlocks.length === 0 ? (
                                          <p className="py-3 text-xs italic text-gray-500">
                                            No exercises configured for this workout
                                          </p>
                                        ) : (
                                          [...cachedBlocks]
                                            .sort((a, b) => (a.set_order ?? 0) - (b.set_order ?? 0))
                                            .map((blk, bi) => (
                                              <div key={blk.id} className={cn(bi > 0 && "mt-3")}>
                                                <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-400/70">
                                                    {blk.set_name?.trim() ||
                                                      `Block ${blk.set_order ?? bi + 1}`}
                                                  </span>
                                                  {blk.set_type ? (
                                                    <span className="inline-block rounded border border-white/5 bg-white/[0.04] px-1.5 py-0.5 text-[9px] uppercase text-gray-500">
                                                      {(blk.set_type || "").replace(/_/g, " ")}
                                                    </span>
                                                  ) : null}
                                                </div>
                                                {blk.set_notes ? (
                                                  <p className="mb-2 text-xs italic text-gray-500/80">
                                                    {blk.set_notes}
                                                  </p>
                                                ) : null}
                                                <div>
                                                  {collectExpandedExerciseRows(blk).map((row, ri) => (
                                                    <div
                                                      key={`${blk.id}-${ri}`}
                                                      className="flex items-center justify-between gap-3 border-b border-white/[0.04] py-2 last:border-0"
                                                    >
                                                      <div className="min-w-0 flex-1">
                                                        <p className="text-sm tracking-tight text-white/90">
                                                          {row.name}
                                                        </p>
                                                        {row.notes ? (
                                                          <p className="mt-0.5 line-clamp-1 text-[11px] italic text-gray-500">
                                                            {row.notes}
                                                          </p>
                                                        ) : null}
                                                      </div>
                                                      <div className="flex shrink-0 flex-col items-end">
                                                        <span className="inline-flex items-center rounded-md border border-white/5 bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium tabular-nums text-gray-400">
                                                          {row.prescription}
                                                        </span>
                                                        {row.weightLine ? (
                                                          <span className="mt-0.5 text-right text-[10px] tabular-nums text-gray-500">
                                                            {row.weightLine}
                                                          </span>
                                                        ) : null}
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            ))
                                        )}
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </section>
              );
            })}
          </div>
        )}

        <div className="flex flex-col gap-2 mt-6">
          <button
            type="button"
            onClick={() => {
              window.location.href = "/client/train";
            }}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 px-4 text-base font-semibold text-white shadow-lg shadow-cyan-500/25 ring-1 ring-cyan-400/30 ring-inset transition-all active:scale-[0.98]"
          >
            Go to Training
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => {
              window.history.back();
            }}
            className="h-11 w-full rounded-xl border border-white/15 bg-white/[0.04] text-sm font-medium text-gray-300 transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            Back to Program
          </button>
        </div>
      </ClientPageShell>
    </AnimatedBackground>
  );
}

export default function ProgramDetailsPage() {
  return (
    <ProtectedRoute requiredRole="client">
      <ProgramDetailsContent />
    </ProtectedRoute>
  );
}
