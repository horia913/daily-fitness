"use client";

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { CoachPageShell } from "@/components/coach-ui/CoachPageShell";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { supabase } from "@/lib/supabase";
import WorkoutTemplateService, {
  ProgramSchedule,
  WorkoutTemplate,
} from "@/lib/workoutTemplateService";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Edit,
  ArrowLeft,
  Dumbbell,
  Coffee,
  ChevronLeft,
  ChevronRight,
  Copy,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { TrainingBlockService } from "@/lib/trainingBlockService";
import { TrainingBlock } from "@/types/trainingBlock";
import { phaseTypeDisplayLabel } from "@/lib/programs/periodizationStyles";
import { ribbonBlockColor } from "@/lib/programs/periodizationRibbonColors";
import { cn } from "@/lib/utils";
import { getCategoryAccent } from "@/lib/workoutCategoryColors";
import { sumTrainingBlockWeeks } from "@/lib/programs/stationBlockWeeks";
import { useToast } from "@/components/ui/toast-provider";
import { fetchApi } from "@/lib/apiClient";

function templateCategoryString(t: WorkoutTemplate | undefined): string {
  if (!t) return "";
  const c = (t as { category?: unknown }).category;
  if (typeof c === "string") return c;
  if (c && typeof c === "object" && c !== null && "name" in c) {
    return String((c as { name?: string }).name ?? "");
  }
  return "";
}

interface Program {
  id: string;
  name: string;
  description?: string;
  coach_id: string;
  difficulty_level: "beginner" | "intermediate" | "advanced";
  duration_weeks: number;
  target_audience: string;
  is_public?: boolean; // Optional - not in database schema
  is_active: boolean;
  periodization_style?: string | null;
  created_at: string;
  updated_at: string;
}

/** Day slot 1–7 for a schedule row (matches program_schedule.program_day or day_number, or day_of_week+1 after mapping). */
function displayDaySlotForScheduleRow(s: any): number | null {
  if (typeof s?.program_day === "number" && s.program_day >= 1 && s.program_day <= 7) {
    return s.program_day;
  }
  if (typeof s?.day_number === "number" && s.day_number >= 1 && s.day_number <= 7) {
    return s.day_number;
  }
  if (typeof s?.day_of_week === "number") {
    const d = s.day_of_week + 1;
    if (d >= 1 && d <= 7) return d;
  }
  return null;
}

function ProgramDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const programId = useMemo(() => String(params?.id || ""), [params]);
  const { performanceSettings } = useTheme();

  const [program, setProgram] = useState<Program | null>(null);
  const [schedule, setSchedule] = useState<ProgramSchedule[]>([]);
  const [templates, setTemplates] = useState<Record<string, WorkoutTemplate>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [duplicating, setDuplicating] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [trainingBlocks, setTrainingBlocks] = useState<TrainingBlock[]>([]);
  const [activeDetailBlockId, setActiveDetailBlockId] = useState<string | null>(null);

  const loadProgram = useCallback(async () => {
    if (!programId) return;
    setLoading(true);
    try {
      // Note: WorkoutTemplateService doesn't have getProgram (singular), only getPrograms (plural)
      // Using direct query is acceptable here since it's a simple fetch
      const { data, error } = await supabase
        .from("workout_programs")
        .select("*")
        .eq("id", programId)
        .single();

      if (!error && data) setProgram(data as Program);
    } catch (error) {
      console.error("Error loading program:", error);
    } finally {
      setLoading(false);
    }
  }, [programId]);

  const loadSchedule = useCallback(async () => {
    if (!programId) return;
    try {
      const sched = await WorkoutTemplateService.getProgramSchedule(programId);
      if (process.env.NODE_ENV !== "production") {
        console.log(
          "[ProgramDetails] Loaded schedule data:",
          JSON.stringify(sched || [], null, 2)
        );
      }
      if (Array.isArray(sched)) setSchedule(sched as ProgramSchedule[]);

      // Batch-load template rows (avoids N sequential queries for large programs)
      const templateIds = Array.from(
        new Set((sched || []).map((s: any) => s.template_id).filter(Boolean))
      );
      const map: Record<string, WorkoutTemplate> = {};
      const CHUNK = 100;
      for (let i = 0; i < templateIds.length; i += CHUNK) {
        const chunk = templateIds.slice(i, i + CHUNK);
        const { data, error } = await supabase
          .from("workout_templates")
          .select("*")
          .in("id", chunk);
        if (error) {
          console.error("[ProgramDetails] batch workout_templates load:", error);
          continue;
        }
        (data || []).forEach((row: any) => {
          map[row.id] = row as WorkoutTemplate;
        });
      }
      setTemplates(map);
    } catch {}
  }, [programId]);

  const programTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (programTimeoutRef.current) clearTimeout(programTimeoutRef.current);
    programTimeoutRef.current = setTimeout(() => {
      programTimeoutRef.current = null;
      setLoading(false);
    }, 20_000);
    Promise.all([loadProgram(), loadSchedule()]).finally(() => {
      if (programTimeoutRef.current) {
        clearTimeout(programTimeoutRef.current);
        programTimeoutRef.current = null;
      }
    });
    return () => {
      if (programTimeoutRef.current) {
        clearTimeout(programTimeoutRef.current);
        programTimeoutRef.current = null;
      }
    };
  }, [loadProgram, loadSchedule]);

  useEffect(() => {
    if (!programId) return;
    TrainingBlockService.getTrainingBlocks(programId).then((blocks) => {
      setTrainingBlocks(blocks);
      if (blocks.length > 0) setActiveDetailBlockId(blocks[0].id);
    });
  }, [programId]);

  if (loading) {
    return (
      <AnimatedBackground>
        <CoachPageShell widthVariant="default-5xl" className="p-4">
          <PageSkeleton variant="dashboard" />
        </CoachPageShell>
      </AnimatedBackground>
    );
  }

  if (!program) {
    return (
      <AnimatedBackground>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-8 text-center">
            <p className="fc-text-primary">
              Program not found.
            </p>
            <Button
              variant="ghost"
              type="button"
              onClick={() => router.push("/coach/programs")}
              className="mt-4"
            >
              Back to Programs
            </Button>
          </div>
        </div>
      </AnimatedBackground>
    );
  }

  const dayNames = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"];
  const activeDetailBlock = trainingBlocks.find((b) => b.id === activeDetailBlockId) ?? null;
  const phaseTotalWeeks = sumTrainingBlockWeeks(trainingBlocks);
  const totalWeeks = activeDetailBlock?.duration_weeks ?? (phaseTotalWeeks || 1);

  // Cumulative week offset before the active block — converts the relative selectedWeek
  // (1..totalWeeks shown in the UI) to the absolute week_number stored in program_schedule.
  // Block 1 starts at week 1, Block 2 starts at Block1.duration + 1, etc.
  const detailBlockStartWeek = (() => {
    let offset = 0;
    for (const block of trainingBlocks) {
      if (block.id === activeDetailBlockId) break;
      offset += block.duration_weeks;
    }
    return offset + 1;
  })();
  const absoluteDetailWeek = detailBlockStartWeek + selectedWeek - 1;

  const firstTrainingBlockId = trainingBlocks[0]?.id ?? null;
  const scheduleForWeek = (schedule || []).filter((s) => {
    if ((s.week_number || 1) !== absoluteDetailWeek) return false;
    if (!activeDetailBlockId) return true;
    const rowBlock = (s as any).training_block_id;
    if (rowBlock == null || rowBlock === "") {
      // Legacy schedule rows without a block — show only when viewing the first block
      return (
        firstTrainingBlockId != null &&
        activeDetailBlockId === firstTrainingBlockId
      );
    }
    return rowBlock === activeDetailBlockId;
  });


  const blockTimelineColor = (block: TrainingBlock, index: number) =>
    ribbonBlockColor(index, trainingBlocks.length);

  const difficultyBadgeClass =
    program.difficulty_level === "beginner"
      ? "bg-[color-mix(in_srgb,var(--fc-status-success)_15%,transparent)] text-[color:var(--fc-status-success)] border-[color-mix(in_srgb,var(--fc-status-success)_30%,transparent)]"
      : program.difficulty_level === "intermediate"
        ? "bg-[color-mix(in_srgb,var(--fc-status-warning)_15%,transparent)] text-[color:var(--fc-status-warning)] border-[color-mix(in_srgb,var(--fc-status-warning)_30%,transparent)]"
        : "bg-[color-mix(in_srgb,var(--fc-status-error)_15%,transparent)] text-[color:var(--fc-status-error)] border-[color-mix(in_srgb,var(--fc-status-error)_30%,transparent)]";

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}
      <CoachPageShell widthVariant="default-5xl" className="p-4 pb-[var(--fc-bottom-safe-area)] sm:p-6 space-y-4">
          <nav className="flex min-h-12 items-center justify-between gap-3">
            <Link
              href="/coach/programs"
              className="inline-flex items-center gap-1.5 text-sm font-medium fc-text-dim hover:fc-text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              Programs
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/coach/programs/${program.id}/edit`}>
                <Button size="sm" className="fc-btn fc-btn-primary h-9 font-semibold">
                  <Edit className="w-4 h-4 mr-1.5" />
                  Edit Program
                </Button>
              </Link>
              <Button
              size="sm"
              variant="outline"
              className="fc-btn fc-btn-secondary h-9 font-semibold"
              disabled={duplicating}
              onClick={async () => {
                setDuplicating(true);
                try {
                  const res = await fetchApi(`/api/coach/programs/${program.id}/duplicate`, {
                    method: "POST",
                    credentials: "include",
                  });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    throw new Error((data as { error?: string }).error || "Duplicate failed");
                  }
                  const newId = (data as { programId?: string }).programId;
                  if (!newId) throw new Error("No program id returned");
                  addToast({ title: "Program duplicated" });
                  router.push(`/coach/programs/${newId}/edit`);
                } catch (e) {
                  addToast({
                    title: e instanceof Error ? e.message : "Duplicate failed",
                    variant: "destructive",
                  });
                } finally {
                  setDuplicating(false);
                }
              }}
            >
              <Copy className="w-4 h-4 mr-1.5" />
              {duplicating ? "Duplicating…" : "Duplicate"}
            </Button>
            </div>
          </nav>

          <header className="space-y-2">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                    difficultyBadgeClass
                  )}
                >
                  {program.difficulty_level}
                </span>
                <span className="fc-text-dim font-mono text-[10px]">
                  {program.id.slice(0, 8)}
                </span>
              </div>
              <h1 className="text-xl font-bold tracking-tight fc-text-primary mt-1 sm:text-2xl">
                {program.name}
              </h1>

              {/* Training block: single = phase type badge, multi = timeline */}
              {trainingBlocks.length === 1 && trainingBlocks[0] && (() => {
                const phaseLabel = phaseTypeDisplayLabel(trainingBlocks[0], {
                  periodizationStyle: program.periodization_style,
                });
                if (!phaseLabel) return null;
                const blockColor = blockTimelineColor(trainingBlocks[0], 0);
                return (
                <div className="flex items-center gap-2 mb-2 mt-2">
                  <span
                    className="px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{
                      background: `${blockColor}20`,
                      color: blockColor,
                      border: `1px solid ${blockColor}40`,
                    }}
                  >
                    {phaseLabel}
                  </span>
                </div>
                );
              })()}
              {trainingBlocks.length > 1 && (() => {
                // Compute absolute start/end weeks for each block
                let offset = 0;
                const blockRanges = trainingBlocks.map((block) => {
                  const startWeek = offset + 1;
                  const endWeek = offset + block.duration_weeks;
                  offset += block.duration_weeks;
                  return { startWeek, endWeek };
                });
                return (
                  <div className="mb-2 mt-2">
                    <p className="text-xs fc-text-dim mb-1.5 font-semibold uppercase tracking-wider">
                      Program Timeline ({trainingBlocks.reduce((s, b) => s + b.duration_weeks, 0)} weeks)
                    </p>
                    <div className="flex flex-wrap gap-2 items-center">
                      {trainingBlocks.map((block, idx) => {
                        const isActive = block.id === activeDetailBlockId;
                        const blockColor = blockTimelineColor(block, idx);
                        const phaseLabel = phaseTypeDisplayLabel(block, {
                          periodizationStyle: program.periodization_style,
                        });
                        const { startWeek, endWeek } = blockRanges[idx];
                        return (
                          <React.Fragment key={block.id}>
                            <button
                              type="button"
                              onClick={() => { setActiveDetailBlockId(block.id); setSelectedWeek(1); }}
                              className={cn(
                                "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border-[1.5px]",
                                isActive
                                  ? "border-transparent"
                                  : "border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-highlight)] fc-text-dim"
                              )}
                              style={
                                isActive
                                  ? {
                                      background: `${blockColor}22`,
                                      borderColor: blockColor,
                                      color: blockColor,
                                    }
                                  : undefined
                              }
                            >
                              {phaseLabel ? `${phaseLabel} · ` : ''}{block.name} · Wks {startWeek}–{endWeek}
                            </button>
                            {idx < trainingBlocks.length - 1 && (
                              <ChevronRight className="w-3 h-3 fc-text-dim" />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {program.description && (
                <p className="text-sm fc-text-dim leading-snug line-clamp-3 mt-2">
                  {program.description}
                </p>
              )}
            </div>
          </header>

          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[color:var(--fc-glass-border)]/40 pb-2">
            <h2 className="text-sm font-semibold fc-text-primary">Progression</h2>
            <Link href={`/coach/programs/${program.id}/edit`}>
              <Button size="sm" className="fc-btn fc-btn-primary h-9 shrink-0 font-semibold">
                <Edit className="w-4 h-4 mr-1.5" />
                Edit Program
              </Button>
            </Link>
          </div>

          <p className="text-sm fc-text-dim">
            {totalWeeks} week{totalWeeks !== 1 ? "s" : ""} · 0 clients ·{" "}
            {program.target_audience.replace(/_/g, " ")}
          </p>

          <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest fc-text-dim">Training Schedule</h2>
          <div className="fc-card-shell p-6">
            {/* Week selector */}
            <div className="flex items-center justify-between mb-4">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="min-w-11 min-h-11 rounded-xl fc-surface border border-[color:var(--fc-glass-border)] text-[color:var(--fc-accent)] hover:bg-[color-mix(in_srgb,var(--fc-accent)_10%,transparent)]"
                onClick={() => setSelectedWeek((prev) => Math.max(1, prev - 1))}
                disabled={selectedWeek === 1}
                aria-label="Previous week"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <span className="text-lg font-bold rounded-xl px-4 py-1.5 bg-[color-mix(in_srgb,var(--fc-accent)_15%,transparent)] text-[color:var(--fc-accent)] tabular-nums">
                Week {selectedWeek} of {totalWeeks}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="min-w-11 min-h-11 rounded-xl fc-surface border border-[color:var(--fc-glass-border)] text-[color:var(--fc-accent)] hover:bg-[color-mix(in_srgb,var(--fc-accent)_10%,transparent)]"
                onClick={() => setSelectedWeek((prev) => Math.min(totalWeeks, prev + 1))}
                disabled={selectedWeek === totalWeeks}
                aria-label="Next week"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {dayNames.map((label, idx) => {
                const cardDay = idx + 1;
                const scheduled = scheduleForWeek.find(
                  (s) => displayDaySlotForScheduleRow(s) === cardDay
                );
                const templateId =
                  (scheduled as any)?.template_id ||
                  (scheduled as any)?.workout_template_id;
                const templateName = scheduled
                  ? templates[templateId]?.name || "Workout Day"
                  : "Rest Day";
                const isRest = !scheduled;
                if (!isRest && templateId) {
                  const templateHref = "/coach/workouts/templates/" + templateId;
                  const accent = getCategoryAccent(
                    templateCategoryString(templates[templateId])
                  );
                  return (
                    <Link
                      key={idx}
                      href={templateHref}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-xl p-4 min-h-[52px] cursor-pointer transition-colors hover:bg-[color:var(--fc-glass-soft)] border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-highlight)] border-l-2 hover:border-[color:var(--fc-glass-border)] group",
                        accent.border
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className={cn(
                              "rounded-lg p-1.5 shrink-0",
                              accent.iconBg
                            )}
                          >
                            <Dumbbell className={cn("w-4 h-4", accent.text)} />
                          </div>
                          <span className="text-sm font-semibold fc-text-primary">
                            {label}
                          </span>
                        </div>
                        <div className="text-sm truncate fc-text-dim transition-colors group-hover:text-[color:var(--fc-accent)]">
                          {templateName}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 shrink-0 text-[color:color-mix(in_srgb,var(--fc-accent)_80%,transparent)] transition-colors group-hover:text-[color:var(--fc-accent)]" aria-hidden />
                    </Link>
                  );
                }
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3 rounded-xl p-4 min-h-[52px] bg-[color:var(--fc-glass-highlight)] border border-[color:var(--fc-glass-border)]"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Coffee className="w-5 h-5 shrink-0 fc-text-dim" aria-hidden />
                      <span className="text-sm font-semibold fc-text-primary">
                        {label}
                      </span>
                    </div>
                    <div
                      className="text-sm fc-text-dim"
                    >
                      {templateName}
                    </div>
                  </div>
                );
              })}
            </div>
            {scheduleForWeek.length === 0 && (
              <p className="text-sm fc-text-dim text-center py-4">
                No workouts scheduled this week
              </p>
            )}
          </div>
          </section>
        </CoachPageShell>
    </AnimatedBackground>
  );
}

export default function ProgramDetailsPage() {
  return (
    <ProtectedRoute requiredRole="coach">
      <ProgramDetailsContent />
    </ProtectedRoute>
  );
}
