"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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
import { buildPhaseWeekRanges } from "@/lib/clientInstancePhaseContext";
import { isCoachSkipNote, instanceTotalWeeks } from "@/lib/programInstanceResolver";
import type { WorkoutSetEntry } from "@/types/workoutSetEntries";
import { fetchApi } from "@/lib/apiClient";
import {
  normalizeClientTimezone,
  zonedCalendarDateString,
} from "@/lib/clientZonedCalendar";
import {
  getCompletionMathFromWorkouts,
  getEffectiveToday,
  getProgramWeekWindows,
  type ProgramWeekWindow,
  type WorkoutRef,
} from "@/lib/progression/weekWindows";
import { resolveAdherenceTotalWeeks } from "@/lib/progression/foundationAdherenceDays";
import { startProgramWorkout } from "@/lib/startProgramWorkout";
import { useToast } from "@/components/ui/toast-provider";
import { ProgramRoadmapSummary } from "./ProgramRoadmapSummary";
import { ProgramWeekRoadmap } from "./ProgramWeekRoadmap";
import {
  flattenWeeks,
  resolveDayFoundationStatus,
  type DaySlot,
  type FoundationProgression,
  type PhaseSection,
  type TemplatePreview,
  type WeekSection,
} from "./programRoadmapShared";
import styles from "./programDetailsV6.module.css";

interface Program {
  id: string;
  name: string;
  description: string;
  totalWeeks: number;
}

function isRestTemplateName(name: string | null | undefined): boolean {
  if (!name) return false;
  return /^rest$/i.test(name.trim());
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
  const [completedDayIds, setCompletedDayIds] = useState<Set<string>>(new Set());
  const [skippedDayIds, setSkippedDayIds] = useState<Set<string>>(new Set());
  const [foundationProgression, setFoundationProgression] =
    useState<FoundationProgression | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientOutlineWeek, setClientOutlineWeek] = useState<number>(1);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

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
              program:workout_programs(id, name, description)`,
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

          const programData = assignmentData.program as {
            id: string;
            name: string;
            description?: string;
          };
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
            if (s.program_instance_workout_id)
              instanceWorkoutIds.add(s.program_instance_workout_id);
          }

          const templatesMap = new Map<string, TemplatePreview>();
          if (templateIds.size > 0) {
            const { data: templatesRows } = await supabase
              .from("workout_templates")
              .select(
                "id, name, description, estimated_duration, difficulty_level, category",
              )
              .in("id", Array.from(templateIds));

            for (const t of templatesRows || []) {
              templatesMap.set((t as { id: string }).id, {
                id: (t as { id: string }).id,
                name: (t as { name: string }).name,
                description: (t as { description?: string }).description ?? null,
                estimated_duration:
                  (t as { estimated_duration?: number }).estimated_duration ??
                  null,
                difficulty_level:
                  (t as { difficulty_level?: string }).difficulty_level ?? null,
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
              const r = row as {
                id: string;
                name: string;
                estimated_duration?: number;
              };
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
        "timeout",
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
    (async () => {
      try {
        const res = await fetchApi("/api/client/program-week", {
          credentials: "include",
        });
        if (!res.ok) throw new Error("program-week");
        const data = await res.json();
        if (cancelled) return;
        const pageProgramId =
          typeof id === "string" ? id : Array.isArray(id) ? id[0] : null;
        const activePid = data.programId as string | null | undefined;
        const cw = (data.displayWeekNumber ?? data.currentUnlockedWeek) as
          | number
          | undefined;
        if (
          pageProgramId &&
          activePid === pageProgramId &&
          typeof cw === "number" &&
          cw >= 1
        ) {
          setClientOutlineWeek(cw);
        } else {
          setClientOutlineWeek(1);
        }
      } catch {
        if (!cancelled) setClientOutlineWeek(1);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

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

  const roadmapWeeks = useMemo(
    () => flattenWeeks(phaseSections),
    [phaseSections],
  );

  const completion = useMemo(() => {
    const empty = { inScopeTotal: 0, inScopeDone: 0, completionPct: 0 };
    if (!foundationWindows || !foundationProgression?.startDate) return empty;
    const refs: WorkoutRef[] = [];
    for (const w of roadmapWeeks) {
      for (const d of w.days) {
        if (d.isRest || !d.scheduleId || d.isOptional) continue;
        if (!d.templateId) continue;
        if (skippedDayIds.has(d.scheduleId)) continue;
        refs.push({
          id: d.scheduleId,
          weekNumber: d.weekNumber,
          programDay: d.dayNumber,
          isDone: completedDayIds.has(d.scheduleId),
        });
      }
    }
    return getCompletionMathFromWorkouts(
      refs,
      foundationWindows,
      foundationProgression.startDate,
    );
  }, [
    roadmapWeeks,
    foundationWindows,
    foundationProgression,
    completedDayIds,
    skippedDayIds,
  ]);

  const missedCount = useMemo(() => {
    if (!foundationWindows || !foundationProgression || !effectiveTodayYmd) {
      return 0;
    }
    let n = 0;
    for (const w of roadmapWeeks) {
      for (const d of w.days) {
        if (d.isRest || !d.scheduleId || d.isOptional) continue;
        const status = resolveDayFoundationStatus(
          d,
          completedDayIds,
          skippedDayIds,
          foundationWindows,
          foundationProgression,
          effectiveTodayYmd,
        );
        if (status === "missed") n += 1;
      }
    }
    return n;
  }, [
    roadmapWeeks,
    foundationWindows,
    foundationProgression,
    effectiveTodayYmd,
    completedDayIds,
    skippedDayIds,
  ]);

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
              title: result.error || "Couldn't start workout.",
              variant: "destructive",
            });
          }
          return;
        }
        router.push(`/client/workouts/${result.workoutAssignmentId}/start`);
      } catch (e) {
        clearTimeout(timeout);
        console.error(e);
        addToast({
          title: "Couldn't start workout. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsStarting(false);
        setStartingScheduleId(null);
      }
    },
    [addToast, id, isStarting, loadProgramDetails, router],
  );

  const totalWorkoutSlots = useMemo(() => {
    let n = 0;
    for (const w of roadmapWeeks) {
      for (const d of w.days) {
        if (!d.isRest && d.templateId) n += 1;
      }
    }
    return n;
  }, [roadmapWeeks]);

  const weekCountStat = useMemo(() => {
    if (program?.totalWeeks && program.totalWeeks > 0) return program.totalWeeks;
    if (roadmapWeeks.length === 0) return 0;
    return Math.max(...roadmapWeeks.map((w) => w.weekNumber));
  }, [roadmapWeeks, program?.totalWeeks]);

  const workoutsPerWeekDisplay =
    program && weekCountStat > 0
      ? Math.round((totalWorkoutSlots / weekCountStat) * 10) / 10
      : totalWorkoutSlots;

  const ensureTemplateLoaded = useCallback(async (day: DaySlot) => {
    const templateId = day.templateId;
    if (!templateId) return;
    const cacheKey = String(day.key);
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

  const handleSelectDay = useCallback(
    (day: DaySlot) => {
      setSelectedDayKey(day.key);
      void ensureTemplateLoaded(day);
    },
    [ensureTemplateLoaded],
  );

  const handleSelectPhase = useCallback(
    (phaseId: string) => {
      const section = phaseSections.find((s) => s.phase?.id === phaseId);
      if (!section) return;
      const el = document.getElementById(
        `roadmap-week-${section.startWeek}`,
      );
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [phaseSections],
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
              onRetry={
                error && id ? () => loadProgramDetails(id as string) : undefined
              }
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
        <div className={styles.hd}>
          <button
            type="button"
            onClick={() => router.push("/client/train")}
            className={styles.back}
            aria-label="Back to training"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>

        <ProgramRoadmapSummary
          programName={program.name}
          weekCount={weekCountStat}
          workoutsPerWeek={workoutsPerWeekDisplay}
          totalWorkouts={totalWorkoutSlots}
          completion={completion}
          missedCount={missedCount}
          phaseSections={phaseSections}
          currentWeekNumber={clientOutlineWeek}
          onSelectPhase={handleSelectPhase}
        />

        {roadmapWeeks.length === 0 ? (
          <p className={styles.emptyState}>No schedule for this program yet.</p>
        ) : (
          <ProgramWeekRoadmap
            weeks={roadmapWeeks}
            phaseSections={phaseSections}
            currentWeekNumber={clientOutlineWeek}
            completedDayIds={completedDayIds}
            skippedDayIds={skippedDayIds}
            windows={foundationWindows}
            progression={foundationProgression}
            effectiveTodayYmd={effectiveTodayYmd}
            selectedDayKey={selectedDayKey}
            onSelectDay={handleSelectDay}
            blocksCache={blocksCache}
            loadingTemplates={loadingTemplates}
            onStartWorkout={handleStartWorkout}
            isStarting={isStarting}
            startingScheduleId={startingScheduleId}
          />
        )}

        {program.description ? (
          <p className={styles.description}>{program.description}</p>
        ) : null}

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
