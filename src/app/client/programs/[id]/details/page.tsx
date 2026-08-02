"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/withTimeout";
import { WorkoutBlockService } from "@/lib/workoutBlockService";
import { getAssignmentSchedule, getCompletedSlots } from "@/lib/programStateService";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ClientPageShell } from "@/components/client-ui";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { cn } from "@/lib/utils";
import {
  loadInstancePhases,
  type InstancePhaseRow,
} from "@/lib/programInstance/instanceCanvasLoad";
import {
  buildPhaseWeekRanges,
  clientPhaseChipLabel,
  clientPhaseSecondaryLabel,
  formatPhaseWeekSpanLabel,
} from "@/lib/clientInstancePhaseContext";
import { isCoachSkipNote, instanceTotalWeeks } from "@/lib/programInstanceResolver";
import type { WorkoutSetEntry } from "@/types/workoutSetEntries";
import { fetchApi } from "@/lib/apiClient";
import {
  normalizeClientTimezone,
  zonedCalendarDateString,
} from "@/lib/clientZonedCalendar";
import {
  getEffectiveToday,
  getProgramWeekWindows,
  getWorkoutStatus,
  type PauseState,
  type ProgramWeekWindow,
  type WorkoutStatus,
} from "@/lib/progression/weekWindows";
import { resolveAdherenceTotalWeeks } from "@/lib/progression/foundationAdherenceDays";
import { startProgramWorkout } from "@/lib/startProgramWorkout";
import { useToast } from "@/components/ui/toast-provider";
import styles from "./programDetailsV6.module.css";

/** Assignment calendar context for foundation getWorkoutStatus. */
type FoundationProgression = {
  startDate: string;
  totalWeeks: number;
  timeZone: string;
  pauses: PauseState;
};

/** Group hue palette (matches design/mockups/program-details-v6.html: blue · cyan · amber · purple). */
const GROUP_HUES = [
  "var(--fc-group-a)",
  "var(--fc-group-c)",
  "var(--fc-group-d)",
  "var(--fc-group-b)",
];

interface Program {
  id: string;
  name: string;
  description: string;
  totalWeeks: number;
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
  template: TemplatePreview | null;
  isRest: boolean;
}

function resolveDayFoundationStatus(
  day: DaySlot,
  completedIds: Set<string>,
  skippedIds: Set<string>,
  windows: ProgramWeekWindow[] | null,
  progression: FoundationProgression | null,
  effectiveTodayYmd: string | null,
): WorkoutStatus | null {
  if (day.isRest || !day.scheduleId || !windows || !progression || !effectiveTodayYmd) {
    return null;
  }
  const isDone =
    completedIds.has(day.scheduleId) || skippedIds.has(day.scheduleId);
  return getWorkoutStatus(
    {
      weekNumber: day.weekNumber,
      programDay: day.dayNumber,
      isDone,
    },
    windows,
    progression.startDate,
    effectiveTodayYmd,
  );
}

function isFoundationStartable(status: WorkoutStatus | null): boolean {
  return status === "missed" || status === "due-today";
}

interface WeekSection {
  weekNumber: number;
  days: DaySlot[];
}

interface PhaseSection {
  phase: InstancePhaseRow | null;
  displayPhaseOrder: number;
  startWeek: number;
  endWeek: number;
  weeks: WeekSection[];
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
    <div className="flex min-w-0 w-full flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] uppercase tracking-wider fc-text-subtle">
      {difficultyRaw ? (
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded border border-[color:var(--fc-glass-border)] fc-glass-soft px-1.5 py-0.5 font-medium leading-none",
            difficultyBadgeTextClass(difficultyRaw),
          )}
        >
          {difficultyRaw.toUpperCase()}
        </span>
      ) : null}
      {metaText ? (
        <span className="min-w-0 truncate">
          {difficultyRaw ? <span className="fc-text-subtle">· </span> : null}
          <span className="fc-text-dim">{metaText}</span>
        </span>
      ) : null}
    </div>
  );
}

function phaseNavStableKey(section: PhaseSection): string {
  return section.phase?.id ?? `order-${section.displayPhaseOrder}`;
}

function sectionNavKeyForWeek(sections: PhaseSection[], absoluteWeek: number): string | null {
  for (const sec of sections) {
    if (sec.weeks.some((w) => w.weekNumber === absoluteWeek)) {
      return phaseNavStableKey(sec);
    }
  }
  return null;
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

/** v6 exercise display row: letter badge + group hue + meta + right-aligned rx + technique. */
interface V6ExerciseRow {
  key: string;
  badge: string;
  hue: string;
  name: string;
  meta: string;
  rx: string;
  oneRm: string | null;
  tech: string | null;
  notes: string | null;
}

/** "3 sets · 12 reps" from the exercise/block prescription. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setsRepsMeta(block: WorkoutSetEntry, ex: any): string {
  const sets = ex.sets ?? block.total_sets;
  const reps = ex.reps ?? block.reps_per_set;
  const parts: string[] = [];
  if (sets != null) parts.push(`${sets} ${sets === 1 ? "set" : "sets"}`);
  if (reps) parts.push(`${reps} reps`);
  return parts.join(" · ");
}

/** Amber technique note under the exercise name — only for real techniques (never a set-type chip). */
function techniqueNote(block: WorkoutSetEntry): string | null {
  const t = (block.set_type || "").toLowerCase();
  if (t === "drop_set") {
    const drops = block.drop_sets?.length ?? 0;
    return drops > 0 ? `↳ drop set · ${drops} ${drops === 1 ? "drop" : "drops"}` : "↳ drop set";
  }
  if (t === "cluster_set") return "↳ cluster set";
  if (t === "rest_pause") return "↳ rest-pause";
  if (t === "pre_exhaustion") return "↳ pre-exhaust";
  return null;
}

/** Build v6 rows for a block. Grouped blocks (superset/giant) share one hue and read A1 / A2. */
function buildV6ExerciseRows(block: WorkoutSetEntry, blockIndex: number): V6ExerciseRow[] {
  const hue = GROUP_HUES[blockIndex % GROUP_HUES.length];
  const letter = String.fromCharCode(65 + blockIndex);
  const tech = techniqueNote(block);
  const exercises = block.exercises;
  if (exercises && exercises.length > 0) {
    const sorted = [...exercises].sort(
      (a, b) => (a.exercise_order ?? 0) - (b.exercise_order ?? 0),
    );
    const grouped = sorted.length > 1;
    return sorted.map((ex, i) => {
      const oneRm = formatExerciseWeightLine(ex);
      return {
        key: `${block.id}-${i}`,
        badge: grouped ? `${letter}${i + 1}` : letter,
        hue,
        name: ex.exercise?.name || ex.exercise_letter || "Exercise",
        meta: setsRepsMeta(block, ex),
        rx: formatPrescriptionBadge(block, ex),
        oneRm: oneRm ? oneRm.replace(/^@\s*/, "") : null,
        tech,
        notes: ex.notes ?? null,
      };
    });
  }
  const label = block.set_name || block.set_type || "Set";
  return [
    {
      key: `${block.id}-0`,
      badge: letter,
      hue,
      name: label,
      meta: setsRepsMeta(block, {}),
      rx: formatPrescriptionBadge(block, {}),
      oneRm: null,
      tech,
      notes: null,
    },
  ];
}

function ExpandedDaySkeletonRows() {
  return (
    <div role="status" aria-label="Loading exercises">
      {[0, 1, 2].map((i) => (
        <div key={i} className={cn(styles.skRow, "animate-pulse")}>
          <div className={styles.skBadge} />
          <div className={styles.skCol}>
            <div className={styles.skLine} style={{ width: "55%" }} />
            <div className={styles.skLine} style={{ width: "35%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

type AssignmentSlot = Awaited<ReturnType<typeof getAssignmentSchedule>>[number];

function buildPhaseSections(
  assignmentSlots: AssignmentSlot[],
  templatesMap: Map<string, TemplatePreview>,
  phases: InstancePhaseRow[],
): PhaseSection[] {
  const phaseRanges = buildPhaseWeekRanges(phases);
  const maxFromSlots =
    assignmentSlots.length > 0
      ? Math.max(...assignmentSlots.map((s) => s.week_number ?? 1), 1)
      : 1;
  const sumPhaseWeeks = instanceTotalWeeks(phases);
  const maxWeek = Math.max(maxFromSlots, sumPhaseWeeks, 1);

  const byWeek = new Map<number, AssignmentSlot[]>();
  for (const row of assignmentSlots) {
    const w = row.week_number ?? 1;
    if (!byWeek.has(w)) byWeek.set(w, []);
    byWeek.get(w)!.push(row);
  }

  const buildWeekDays = (w: number): DaySlot[] => {
    const rows = byWeek.get(w) ?? [];
    const byDay = new Map<number, AssignmentSlot>();
    for (const r of rows) {
      const d = r.program_day ?? 1;
      byDay.set(d, r);
    }
    const days: DaySlot[] = [];
    for (let dayNum = 1; dayNum <= 7; dayNum++) {
      const row = byDay.get(dayNum);
      if (!row) {
        days.push({
          key: `rest-${w}-${dayNum}`,
          scheduleId: null,
          dayNumber: dayNum,
          weekNumber: w,
          templateId: null,
          isOptional: false,
          template: null,
          isRest: true,
        });
        continue;
      }
      const templateId =
        (row.workout_template_id && String(row.workout_template_id).length > 0
          ? row.workout_template_id
          : row.program_instance_workout_id) ?? null;
      const tmpl = templateId ? templatesMap.get(templateId) ?? null : null;
      const restByType = row.day_type === "rest";
      const restByTemplate = Boolean(
        restByType ||
          !templateId ||
          (tmpl != null && isRestTemplateName(tmpl.name)),
      );
      days.push({
        key: String(row.id),
        scheduleId: row.id,
        dayNumber: dayNum,
        weekNumber: w,
        templateId,
        isOptional: row.is_optional === true,
        scheduleNotes: row.name || undefined,
        template: tmpl,
        isRest: restByTemplate,
      });
    }
    return days;
  };

  if (phaseRanges.length === 0) {
    const weeks: WeekSection[] = [];
    for (let w = 1; w <= maxWeek; w++) {
      weeks.push({ weekNumber: w, days: buildWeekDays(w) });
    }
    if (weeks.length === 0) return [];
    return [
      {
        phase: null,
        displayPhaseOrder: 1,
        startWeek: 1,
        endWeek: maxWeek,
        weeks,
      },
    ];
  }

  return phaseRanges.map((range, index) => {
    const weeks: WeekSection[] = [];
    for (let w = range.startWeek; w <= range.endWeek; w++) {
      weeks.push({ weekNumber: w, days: buildWeekDays(w) });
    }
    return {
      phase: range.phase,
      displayPhaseOrder: index + 1,
      startWeek: range.startWeek,
      endWeek: range.endWeek,
      weeks,
    };
  });
}

function ProgramDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [program, setProgram] = useState<Program | null>(null);
  const [phaseSections, setPhaseSections] = useState<PhaseSection[]>([]);
  /** program_day_assignment ids completed by the client (excludes coach-skips). */
  const [completedDayIds, setCompletedDayIds] = useState<Set<string>>(new Set());
  /** Coach-skipped PDA ids — treated as dealt-with for status (not startable). */
  const [skippedDayIds, setSkippedDayIds] = useState<Set<string>>(new Set());
  const [foundationProgression, setFoundationProgression] =
    useState<FoundationProgression | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Absolute program week to expand by default (from /api/client/program-week when program matches). */
  const [clientOutlineWeek, setClientOutlineWeek] = useState<number>(1);
  const [weekLayoutReady, setWeekLayoutReady] = useState(false);
  const [openWeeks, setOpenWeeks] = useState<Record<number, boolean>>({});
  const [scrollNavPhaseKey, setScrollNavPhaseKey] = useState<string | null>(null);
  const [expandedDayKeys, setExpandedDayKeys] = useState<Set<string>>(new Set());
  const expandedDayKeysRef = useRef(expandedDayKeys);
  expandedDayKeysRef.current = expandedDayKeys;

  const [loadingTemplates, setLoadingTemplates] = useState<Set<string>>(new Set());
  const [blocksCache, setBlocksCache] = useState<Map<string, WorkoutSetEntry[]>>(new Map());
  const blocksCacheRef = useRef(blocksCache);
  blocksCacheRef.current = blocksCache;
  const [isStarting, setIsStarting] = useState(false);
  const [startingScheduleId, setStartingScheduleId] = useState<string | null>(null);

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
              program:workout_programs(id, name, description)`
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

          const programData = assignmentData.program as { id: string; name: string; description?: string };
          const assignmentId = assignmentData.id as string;

          const [assignmentSlots, phases, completedSlots, profileRes] =
            await Promise.all([
              getAssignmentSchedule(supabase, assignmentId),
              loadInstancePhases(supabase, assignmentId),
              getCompletedSlots(supabase, assignmentId),
              supabase
                .from("profiles")
                .select("timezone")
                .eq("id", user.id)
                .maybeSingle(),
            ]);

          setCompletedDayIds(
            new Set(
              completedSlots
                .filter((c) => !isCoachSkipNote(c.notes))
                .map((c) => c.program_day_assignment_id),
            ),
          );
          setSkippedDayIds(
            new Set(
              completedSlots
                .filter((c) => isCoachSkipNote(c.notes))
                .map((c) => c.program_day_assignment_id),
            ),
          );

          const derivedTotalWeeks = resolveAdherenceTotalWeeks(
            instanceTotalWeeks(phases),
            assignmentSlots,
          );
          const assignmentRow = assignmentData as {
            start_date?: string | null;
            pause_accumulated_days?: number | null;
            pause_status?: string | null;
            paused_at?: string | null;
            timezone_snapshot?: string | null;
          };
          const profileTz = (
            profileRes.data as { timezone?: string | null } | null
          )?.timezone;
          const tz = normalizeClientTimezone(
            assignmentRow.timezone_snapshot || profileTz,
          );
          const startDate = (assignmentRow.start_date ?? "").slice(0, 10);
          if (startDate && derivedTotalWeeks > 0) {
            setFoundationProgression({
              startDate,
              totalWeeks: derivedTotalWeeks,
              timeZone: tz,
              pauses: {
                accumulatedDays: assignmentRow.pause_accumulated_days,
                pauseStatus: assignmentRow.pause_status,
                pausedAt: assignmentRow.paused_at,
              },
            });
          } else {
            setFoundationProgression(null);
          }

          setProgram({
            id: programData.id,
            name: programData.name,
            description: programData.description || "",
            totalWeeks: derivedTotalWeeks,
          });

          if (!assignmentSlots.length && phases.length === 0) {
            setPhaseSections([]);
            return;
          }

          const templateIds = new Set<string>();
          const instanceWorkoutIds = new Set<string>();
          for (const s of assignmentSlots) {
            if (s.workout_template_id) templateIds.add(s.workout_template_id);
            if (s.program_instance_workout_id) instanceWorkoutIds.add(s.program_instance_workout_id);
          }

          const templatesMap = new Map<string, TemplatePreview>();
          if (templateIds.size > 0) {
            const { data: templatesRows } = await supabase
              .from("workout_templates")
              .select("id, name, description, estimated_duration, difficulty_level, category")
              .in("id", Array.from(templateIds));

            for (const t of templatesRows || []) {
              templatesMap.set((t as { id: string }).id, {
                id: (t as { id: string }).id,
                name: (t as { name: string }).name,
                description: (t as { description?: string }).description ?? null,
                estimated_duration: (t as { estimated_duration?: number }).estimated_duration ?? null,
                difficulty_level: (t as { difficulty_level?: string }).difficulty_level ?? null,
                category: (t as { category?: string }).category ?? null,
              });
            }
          }

          if (instanceWorkoutIds.size > 0) {
            const { data: piwRows } = await supabase
              .from("program_instance_workouts")
              .select("id, name, estimated_duration")
              .in("id", Array.from(instanceWorkoutIds));
            for (const row of piwRows ?? []) {
              const r = row as { id: string; name: string; estimated_duration?: number };
              templatesMap.set(r.id, {
                id: r.id,
                name: r.name,
                description: null,
                estimated_duration: r.estimated_duration ?? null,
                difficulty_level: null,
                category: null,
              });
            }
          }

          setPhaseSections(
            buildPhaseSections(assignmentSlots, templatesMap, phases),
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
    setScrollNavPhaseKey(null);
    (async () => {
      try {
        const res = await fetchApi("/api/client/program-week", { credentials: "include" });
        if (!res.ok) throw new Error("program-week");
        const data = await res.json();
        if (cancelled) return;
        const pageProgramId = typeof id === "string" ? id : Array.isArray(id) ? id[0] : null;
        const activePid = data.programId as string | null | undefined;
        const cw = (data.displayWeekNumber ?? data.currentUnlockedWeek) as number | undefined;
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
    for (const sec of phaseSections) {
      for (const w of sec.weeks) {
        s.add(w.weekNumber);
      }
    }
    return Array.from(s).sort((a, b) => a - b);
  }, [phaseSections]);

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

  const progressNavPhaseKey = useMemo(
    () => sectionNavKeyForWeek(phaseSections, clientOutlineWeek),
    [phaseSections, clientOutlineWeek],
  );

  const { foundationWindows, effectiveTodayYmd } = useMemo(() => {
    if (
      !foundationProgression?.startDate ||
      foundationProgression.totalWeeks <= 0 ||
      !foundationProgression.timeZone
    ) {
      return {
        foundationWindows: null as ProgramWeekWindow[] | null,
        effectiveTodayYmd: null as string | null,
      };
    }
    const win = getProgramWeekWindows(
      foundationProgression.startDate,
      foundationProgression.totalWeeks,
      foundationProgression.timeZone,
      foundationProgression.pauses,
    );
    const wallToday = zonedCalendarDateString(
      new Date(),
      foundationProgression.timeZone,
    );
    return {
      foundationWindows: win,
      effectiveTodayYmd: getEffectiveToday(
        wallToday,
        foundationProgression.timeZone,
        foundationProgression.pauses,
      ),
    };
  }, [foundationProgression]);

  const handleStartWorkout = useCallback(
    async (scheduleId: string) => {
      if (isStarting) return;
      setIsStarting(true);
      setStartingScheduleId(scheduleId);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      try {
        const result = await startProgramWorkout({
          programDayAssignmentId: scheduleId,
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!result.ok) {
          if (result.code === "WEEK_LOCKED") {
            addToast({
              title: result.message || "Complete the current week first.",
              variant: "destructive",
            });
          } else if (result.code === "ALREADY_COMPLETED") {
            addToast({
              title:
                result.message ||
                result.error ||
                "This workout is already completed.",
              variant: "destructive",
            });
            void loadProgramDetails(id as string);
          } else if (result.code === "TIMEOUT") {
            addToast({
              title: "Request timed out. Please try again.",
              variant: "destructive",
            });
          } else {
            addToast({
              title: result.message || result.error || "Could not start workout.",
              variant: "destructive",
            });
          }
        }
      } catch (err) {
        clearTimeout(timeout);
        console.error("Error starting workout from program details:", err);
        addToast({
          title: "Could not start workout. Check your connection.",
          variant: "destructive",
        });
      } finally {
        setIsStarting(false);
        setStartingScheduleId(null);
      }
    },
    [addToast, id, isStarting, loadProgramDetails],
  );

  const highlightedNavPhaseKey =
    scrollNavPhaseKey ??
    progressNavPhaseKey ??
    (phaseSections[0] ? phaseNavStableKey(phaseSections[0]) : null);

  const phaseNavVisibilityRef = useRef<Map<string, { ratio: number; top: number }>>(new Map());

  useEffect(() => {
    phaseNavVisibilityRef.current.clear();
  }, [phaseSections]);

  useEffect(() => {
    if (typeof window === "undefined" || phaseSections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const vis = phaseNavVisibilityRef.current;
        for (const e of entries) {
          const key = (e.target as HTMLElement).dataset.phaseNavKey;
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
        if (bestKey) setScrollNavPhaseKey(bestKey);
      },
      {
        root: null,
        threshold: [0, 0.08, 0.15, 0.25, 0.4, 0.55, 0.7, 0.85, 1],
        rootMargin: "-52px 0px -52% 0px",
      },
    );
    const raf = requestAnimationFrame(() => {
      document.querySelectorAll<HTMLElement>("[data-phase-nav-key]").forEach((el) => {
        observer.observe(el);
      });
    });
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [phaseSections]);

  const totalWorkoutSlots = useMemo(() => {
    let n = 0;
    for (const sec of phaseSections) {
      for (const w of sec.weeks) {
        for (const d of w.days) {
          if (!d.isRest && d.templateId) n += 1;
        }
      }
    }
    return n;
  }, [phaseSections]);

  const weekCountStat = useMemo(() => {
    if (program?.totalWeeks && program.totalWeeks > 0) return program.totalWeeks;
    if (allWeekNumbers.length === 0) return 0;
    return Math.max(...allWeekNumbers);
  }, [allWeekNumbers, program?.totalWeeks]);

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
        <ClientPageShell className="max-w-lg lg:max-w-3xl mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 overflow-x-hidden">
          <PageSkeleton variant="dashboard" />
        </ClientPageShell>
      </AnimatedBackground>
    );
  }

  if (error || !program) {
    return (
      <AnimatedBackground>
        <ClientPageShell className="max-w-lg lg:max-w-3xl mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 overflow-x-hidden w-full">
          <div className="w-full space-y-3">
            <ErrorBanner
              title={error ? "Couldn't load program" : "Program not found"}
              message="Please check your connection and try again."
              onRetry={error && id ? () => loadProgramDetails(id as string) : undefined}
            />
            <Button
              type="button"
              onClick={() => router.push("/client/train")}
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
      <ClientPageShell
        className={cn(
          "max-w-lg lg:max-w-3xl mx-auto px-4 pt-6 overflow-x-hidden",
          styles.page,
        )}
      >
        {/* Header */}
        <div className={styles.hd}>
          <button
            type="button"
            onClick={() => router.push("/client/train")}
            className={styles.back}
            aria-label="Back to training"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
          <div className={styles.hdMain}>
            <h1 className={styles.title}>{program.name}</h1>
            <p className={styles.subtitle}>
              {weekCountStat} {weekCountStat === 1 ? "week" : "weeks"} ·{" "}
              {workoutsPerWeekDisplay} workouts/week
            </p>
          </div>
        </div>

        {/* Stats strip */}
        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.statNum}>{weekCountStat}</div>
            <div className={styles.statLbl}>Weeks</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statNum}>{workoutsPerWeekDisplay}</div>
            <div className={styles.statLbl}>Per week</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statNum}>{totalWorkoutSlots}</div>
            <div className={styles.statLbl}>Workouts</div>
          </div>
        </div>

        {/* Phase chips */}
        {phaseSections.length > 0 ? (
          <div className={styles.chipsBar}>
            <div className={styles.chips}>
              {phaseSections.map((section) => {
                const navKey = phaseNavStableKey(section);
                const active = highlightedNavPhaseKey === navKey;
                const chip =
                  clientPhaseChipLabel(section.phase) ??
                  `Phase ${section.displayPhaseOrder}`;
                return (
                  <button
                    key={navKey}
                    type="button"
                    onClick={() => {
                      const safe =
                        typeof CSS !== "undefined" && "escape" in CSS
                          ? CSS.escape(navKey)
                          : navKey;
                      const el = document.querySelector<HTMLElement>(
                        `[data-phase-nav-key="${safe}"]`,
                      );
                      el?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className={cn(styles.chip, active && styles.chipOn)}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {program.description ? (
          <p className={styles.description}>{program.description}</p>
        ) : null}

        {phaseSections.length === 0 ? (
          <p className={styles.emptyState}>No schedule for this program yet.</p>
        ) : (
          <div>
            {phaseSections.map((section, secIdx) => {
              const spanLabel = section.phase
                ? formatPhaseWeekSpanLabel(
                    section.phase,
                    section.startWeek,
                    section.endWeek,
                  )
                : `Weeks ${section.startWeek}–${section.endWeek}`;
              const isCurrentPhase =
                clientOutlineWeek >= section.startWeek &&
                clientOutlineWeek <= section.endWeek;
              const navKey = phaseNavStableKey(section);
              const secondaryLabel = clientPhaseSecondaryLabel(section.phase);
              return (
                <section
                  key={`sec-${section.displayPhaseOrder}-${secIdx}`}
                  data-phase-nav-key={navKey}
                  className={styles.phaseSection}
                >
                  <div className={styles.phaseHead}>
                    <span className={styles.phaseLbl}>{spanLabel}</span>
                    {isCurrentPhase ? (
                      <span className={styles.herePill}>You are here</span>
                    ) : null}
                  </div>
                  {secondaryLabel ? (
                    <p className={styles.phaseSecondary}>{secondaryLabel}</p>
                  ) : null}
                  {section.phase?.notes ? (
                    <p className={styles.phaseNotes}>{section.phase.notes}</p>
                  ) : null}

                  <div style={{ marginTop: 12 }}>
                    {section.weeks.map(({ weekNumber, days }) => {
                      const weekOpen = openWeeks[weekNumber] === true;
                      const isCurrentWeek = weekNumber === clientOutlineWeek;
                      const workoutDays = days.filter(
                        (d) => !d.isRest && d.templateId,
                      );
                      const workoutCount = workoutDays.length;
                      const completedInWeek = workoutDays.filter(
                        (d) => d.scheduleId && completedDayIds.has(d.scheduleId),
                      ).length;
                      const weekAllDone =
                        workoutCount > 0 && completedInWeek === workoutCount;
                      return (
                        <div key={`w-${weekNumber}`} className={styles.week}>
                          <button
                            type="button"
                            onClick={() =>
                              setOpenWeeks((prev) => ({
                                ...prev,
                                [weekNumber]: !prev[weekNumber],
                              }))
                            }
                            className={styles.weekHead}
                            aria-expanded={weekOpen}
                          >
                            <span className={styles.weekName}>Week {weekNumber}</span>
                            {isCurrentWeek ? (
                              <span className={styles.weekCurrent}>· Current</span>
                            ) : null}
                            <span
                              className={cn(
                                styles.weekCount,
                                weekAllDone && styles.weekCountDone,
                              )}
                            >
                              {workoutCount === 0
                                ? "Rest week"
                                : `${completedInWeek}/${workoutCount} done`}
                            </span>
                            <ChevronDown
                              className={cn(
                                styles.weekChev,
                                weekOpen && styles.weekChevOpen,
                              )}
                              aria-hidden
                            />
                          </button>

                          {weekOpen ? (
                            <div className={styles.weekBody}>
                              {days.map((day) => {
                                if (day.isRest) {
                                  return (
                                    <div key={day.key} className={styles.day}>
                                      <div className={styles.rest}>
                                        <span className={styles.restDash}>—</span>
                                        Rest day
                                      </div>
                                    </div>
                                  );
                                }

                                const expanded = expandedDayKeys.has(
                                  String(day.key),
                                );
                                const dayLoadKey = dayExerciseCacheKey(day);
                                const isLoadingBlocks =
                                  !!day.templateId &&
                                  loadingTemplates.has(dayLoadKey);
                                const cachedBlocks = blocksCache.get(dayLoadKey);
                                const foundationStatus = resolveDayFoundationStatus(
                                  day,
                                  completedDayIds,
                                  skippedDayIds,
                                  foundationWindows,
                                  foundationProgression,
                                  effectiveTodayYmd,
                                );
                                const isDone =
                                  foundationStatus === "completed" ||
                                  (!!day.scheduleId &&
                                    completedDayIds.has(day.scheduleId));
                                const isMissed = foundationStatus === "missed";
                                const isDueToday =
                                  foundationStatus === "due-today";
                                const canStart =
                                  isFoundationStartable(foundationStatus) &&
                                  Boolean(day.scheduleId) &&
                                  Boolean(day.templateId);
                                const isStartingThis =
                                  isStarting &&
                                  startingScheduleId === day.scheduleId;

                                const workoutName =
                                  day.template?.name ?? "Workout";
                                const durationStr =
                                  day.template?.estimated_duration != null &&
                                  day.template.estimated_duration > 0
                                    ? `${day.template.estimated_duration} min`
                                    : null;

                                const activateDayRow = () => {
                                  void toggleDayExpand(day);
                                };

                                return (
                                  <div key={day.key} className={styles.day}>
                                    <div
                                      role="button"
                                      tabIndex={0}
                                      aria-expanded={expanded}
                                      className={styles.dayRow}
                                      onClick={activateDayRow}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                          e.preventDefault();
                                          activateDayRow();
                                        }
                                      }}
                                    >
                                      <span className={styles.dayIdx}>
                                        {String(day.dayNumber).padStart(2, "0")}
                                      </span>
                                      <div className={styles.dayMain}>
                                        <div className={styles.dayName}>
                                          {workoutName}
                                        </div>
                                        {durationStr ? (
                                          <span className={styles.dur}>
                                            {durationStr}
                                          </span>
                                        ) : null}
                                        <div className={styles.daySub}>
                                          <DayRowSubtitle day={day} />
                                        </div>
                                      </div>
                                      {canStart ? (
                                        <button
                                          type="button"
                                          className={styles.dayStart}
                                          disabled={isStartingThis}
                                          aria-busy={isStartingThis}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (day.scheduleId) {
                                              void handleStartWorkout(
                                                day.scheduleId,
                                              );
                                            }
                                          }}
                                        >
                                          {isStartingThis ? (
                                            <>
                                              <Loader2
                                                className="h-3.5 w-3.5 animate-spin"
                                                aria-hidden
                                              />
                                              Starting…
                                            </>
                                          ) : isMissed ? (
                                            "Start missed"
                                          ) : (
                                            "Start"
                                          )}
                                        </button>
                                      ) : null}
                                      <Check
                                        className={cn(
                                          styles.dayCheck,
                                          isDone
                                            ? styles.checkDone
                                            : isMissed
                                              ? styles.checkMissed
                                              : isDueToday
                                                ? styles.checkDueToday
                                                : styles.checkUpcoming,
                                        )}
                                        strokeWidth={isDone || isMissed ? 2.5 : 2}
                                        aria-label={
                                          isDone
                                            ? "Completed"
                                            : isMissed
                                              ? "Missed"
                                              : isDueToday
                                                ? "Due today"
                                                : "Not done yet"
                                        }
                                      />
                                      <ChevronDown
                                        className={cn(
                                          styles.dayChev,
                                          expanded && styles.weekChevOpen,
                                        )}
                                        aria-hidden
                                      />
                                    </div>

                                    {expanded && day.templateId ? (
                                      <div className={styles.exWrap}>
                                        {isLoadingBlocks ||
                                        cachedBlocks === undefined ? (
                                          <ExpandedDaySkeletonRows />
                                        ) : cachedBlocks.length === 0 ? (
                                          <p className={styles.exEmpty}>
                                            No exercises configured for this
                                            workout
                                          </p>
                                        ) : (
                                          [...cachedBlocks]
                                            .sort(
                                              (a, b) =>
                                                (a.set_order ?? 0) -
                                                (b.set_order ?? 0),
                                            )
                                            .flatMap((blk, bi) =>
                                              buildV6ExerciseRows(blk, bi),
                                            )
                                            .map((row) => (
                                              <div
                                                key={row.key}
                                                className={styles.ex}
                                              >
                                                <span
                                                  className={styles.badge}
                                                  style={{ ["--hue" as string]: row.hue }}
                                                >
                                                  {row.badge}
                                                </span>
                                                <div className={styles.exMain}>
                                                  <div className={styles.exName}>
                                                    {row.name}
                                                  </div>
                                                  {row.meta ? (
                                                    <div className={styles.exMeta}>
                                                      {row.meta}
                                                    </div>
                                                  ) : null}
                                                  {row.tech ? (
                                                    <div className={styles.tech}>
                                                      {row.tech}
                                                    </div>
                                                  ) : null}
                                                  {row.notes ? (
                                                    <div className={styles.exNote}>
                                                      {row.notes}
                                                    </div>
                                                  ) : null}
                                                </div>
                                                <div className={styles.exRight}>
                                                  <div className={styles.exRx}>
                                                    {row.rx}
                                                  </div>
                                                  {row.oneRm ? (
                                                    <div className={styles.ex1rm}>
                                                      {row.oneRm}
                                                    </div>
                                                  ) : null}
                                                </div>
                                              </div>
                                            ))
                                        )}
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
                  </div>
                </section>
              );
            })}
          </div>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            onClick={() => router.push("/client/train")}
            className="fc-btn fc-btn-primary fc-press flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold"
          >
            Go to Training
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="fc-btn fc-btn-ghost fc-press h-11 w-full rounded-xl text-sm font-medium"
          >
            Back
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
