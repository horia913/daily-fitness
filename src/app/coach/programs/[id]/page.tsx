"use client";

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { supabase } from "@/lib/supabase";
import WorkoutTemplateService, {
  ProgramSchedule,
  WorkoutTemplate,
} from "@/lib/workoutTemplateService";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Calendar,
  Edit,
  Users,
  TrendingUp,
  Clock,
  Target,
  ArrowLeft,
  Dumbbell,
  Coffee,
  Share2,
  MoreHorizontal,
  Settings2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { TrainingBlockService } from "@/lib/trainingBlockService";
import { TrainingBlock, TRAINING_BLOCK_GOALS } from "@/types/trainingBlock";

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
  created_at: string;
  updated_at: string;
}

function ProgramDetailsContent() {
  const params = useParams();
  const programId = useMemo(() => String(params?.id || ""), [params]);
  const { user } = useAuth();
  const { isDark, getSemanticColor, performanceSettings } = useTheme();

  const [program, setProgram] = useState<Program | null>(null);
  const [schedule, setSchedule] = useState<ProgramSchedule[]>([]);
  const [templates, setTemplates] = useState<Record<string, WorkoutTemplate>>(
    {}
  );
  const [loading, setLoading] = useState(true);
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

      // Collect template ids and load their basic info for display
      const templateIds = Array.from(
        new Set((sched || []).map((s: any) => s.template_id).filter(Boolean))
      );
      const map: Record<string, WorkoutTemplate> = {};
      for (const tid of templateIds) {
        const { data } = await supabase
          .from("workout_templates")
          .select("*")
          .eq("id", tid)
          .single();
        if (data) map[tid] = data as WorkoutTemplate;
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

  if (!program) {
    return (
      <AnimatedBackground>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-8 text-center">
            <p
              style={{
                color: isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.9)",
              }}
            >
              Program not found.
            </p>
            <Button
              variant="ghost"
              onClick={() => (window.location.href = "/coach/programs")}
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
  const totalWeeks = activeDetailBlock?.duration_weeks ?? program?.duration_weeks ?? 1;

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

  const scheduleForWeek = (schedule || []).filter(
    (s) =>
      (s.week_number || 1) === absoluteDetailWeek &&
      (!activeDetailBlockId || s.training_block_id === activeDetailBlockId),
  );

  const GOAL_COLORS_DETAIL: Record<string, string> = {
    hypertrophy: "#06b6d4", strength: "#f97316", power: "#ef4444",
    peaking: "#a855f7", accumulation: "#3b82f6", conditioning: "#22c55e",
    deload: "#6b7280", general_fitness: "#14b8a6", sport_specific: "#eab308",
    custom: "#8b5cf6",
  };

  // Difficulty colors
  const getDifficultyColor = (level: string) => {
    switch (level) {
      case "beginner":
        return getSemanticColor("success");
      case "intermediate":
        return getSemanticColor("energy");
      case "advanced":
        return getSemanticColor("critical");
      default:
        return getSemanticColor("neutral");
    }
  };

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}
      <div className="min-h-screen p-4 sm:p-6 pb-32">
        <div className="max-w-5xl mx-auto space-y-8 relative z-10">
          <nav className="flex items-center justify-between">
            <Link
              href="/coach/programs"
              className="flex items-center gap-2 fc-text-dim hover:fc-text-primary transition-colors font-medium"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Programs
            </Link>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="w-11 h-11 rounded-full fc-glass border border-[color:var(--fc-glass-border)]">
                <Share2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="w-11 h-11 rounded-full fc-glass border border-[color:var(--fc-glass-border)]">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </nav>

          <header className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border"
                  style={{
                    background: `${getSemanticColor("critical").primary}15`,
                    color: getSemanticColor("critical").primary,
                    borderColor: `${getSemanticColor("critical").primary}30`,
                  }}
                >
                  {program.difficulty_level} {program.target_audience?.replace("_", " ") || ""}
                </span>
                <span className="fc-text-dim font-mono text-xs">ID: {program.id.slice(0, 8)}</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight fc-text-primary mb-3">
                {program.name}
              </h1>

              {/* Training block: single = goal badge, multi = timeline */}
              {trainingBlocks.length === 1 && trainingBlocks[0] && (
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className="px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{
                      background: `${GOAL_COLORS_DETAIL[trainingBlocks[0].goal]}20`,
                      color: GOAL_COLORS_DETAIL[trainingBlocks[0].goal],
                      border: `1px solid ${GOAL_COLORS_DETAIL[trainingBlocks[0].goal]}40`,
                    }}
                  >
                    Goal: {trainingBlocks[0].goal === "custom" && trainingBlocks[0].custom_goal_label
                      ? trainingBlocks[0].custom_goal_label
                      : TRAINING_BLOCK_GOALS[trainingBlocks[0].goal]}
                  </span>
                </div>
              )}
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
                  <div className="mb-4">
                    <p className="text-xs fc-text-dim mb-2 font-semibold uppercase tracking-wider">
                      Program Timeline ({trainingBlocks.reduce((s, b) => s + b.duration_weeks, 0)} weeks)
                    </p>
                    <div className="flex flex-wrap gap-2 items-center">
                      {trainingBlocks.map((block, idx) => {
                        const isActive = block.id === activeDetailBlockId;
                        const blockColor = GOAL_COLORS_DETAIL[block.goal];
                        const { startWeek, endWeek } = blockRanges[idx];
                        return (
                          <React.Fragment key={block.id}>
                            <button
                              onClick={() => { setActiveDetailBlockId(block.id); setSelectedWeek(1); }}
                              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                              style={{
                                background: isActive ? `${blockColor}22` : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"),
                                border: `1.5px solid ${isActive ? blockColor : (isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)")}`,
                                color: isActive ? blockColor : (isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)"),
                              }}
                            >
                              {block.name} · Wks {startWeek}–{endWeek}
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
                <p className="text-lg fc-text-dim leading-relaxed">
                  {program.description}
                </p>
              )}
            </div>
            <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6 flex flex-col gap-4 min-w-[220px]">
              <div className="flex justify-between items-center">
                <span className="text-sm fc-text-dim">Assigned Clients</span>
                <span className="fc-badge fc-badge-strong text-xs">0 ACTIVE</span>
              </div>
              <Link
                href={`/coach/programs/${program.id}/edit`}
                className="text-sm font-semibold fc-text-primary flex items-center gap-1.5 hover:underline"
              >
                Manage Access <ArrowLeft className="w-3 h-3 rotate-180" />
              </Link>
            </div>
          </header>

          <div className="rounded-2xl border-l-4" style={{ borderLeftColor: getSemanticColor("trust").primary }}>
          <div
            className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6 flex flex-col md:flex-row items-center justify-between gap-6"
          >
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${getSemanticColor("trust").primary}20` }}>
                <TrendingUp className="w-7 h-7" style={{ color: getSemanticColor("trust").primary }} />
              </div>
              <div>
                <h3 className="text-xl font-semibold fc-text-primary">Progression</h3>
                <p className="text-sm fc-text-dim mt-1">Edit rules and weekly schedule in program settings.</p>
              </div>
            </div>
            <Link href={`/coach/programs/${program.id}/edit`}>
              <Button variant="outline" className="fc-btn fc-btn-ghost rounded-2xl font-bold shrink-0">
                <Settings2 className="w-4 h-4 mr-2" />
                Edit Program
              </Button>
            </Link>
          </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-5 text-center">
              <div
                className="mx-auto mb-3 rounded-xl w-12 h-12 flex items-center justify-center"
                style={{
                  background: `${getSemanticColor("trust").primary}20`,
                }}
              >
                <Clock
                  className="w-6 h-6"
                  style={{ color: getSemanticColor("trust").primary }}
                />
              </div>
              <AnimatedNumber
                value={program.duration_weeks}
                size="h2"
                weight="bold"
                color={isDark ? "#fff" : "#1A1A1A"}
              />
              <div className="text-xs mt-1 text-[color:var(--fc-text-dim)]">
                Total Weeks
              </div>
            </div>

            <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-5 text-center">
              <div
                className="mx-auto mb-3 rounded-xl w-12 h-12 flex items-center justify-center"
                style={{
                  background: `${getSemanticColor("success").primary}20`,
                }}
              >
                <Users
                  className="w-6 h-6"
                  style={{ color: getSemanticColor("success").primary }}
                />
              </div>
              <AnimatedNumber
                value={0}
                size="h2"
                weight="bold"
                color={isDark ? "#fff" : "#1A1A1A"}
              />
              <div className="text-xs mt-1 text-[color:var(--fc-text-dim)]">
                Active Clients
              </div>
            </div>

            <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-5 text-center">
              <div
                className="mx-auto mb-3 rounded-xl w-12 h-12 flex items-center justify-center"
                style={{
                  background: `${getSemanticColor("energy").primary}20`,
                }}
              >
                <TrendingUp
                  className="w-6 h-6"
                  style={{ color: getSemanticColor("energy").primary }}
                />
              </div>
              <AnimatedNumber
                value={program.duration_weeks}
                size="h2"
                weight="bold"
                color={isDark ? "#fff" : "#1A1A1A"}
              />
              <div className="text-xs mt-1 text-[color:var(--fc-text-dim)]">
                Avg Duration (w)
              </div>
            </div>

            <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-5 text-center">
              <div
                className="mx-auto mb-3 rounded-xl w-12 h-12 flex items-center justify-center"
                style={{
                  background: `${getSemanticColor("warning").primary}20`,
                }}
              >
                <Target
                  className="w-6 h-6"
                  style={{ color: getSemanticColor("warning").primary }}
                />
              </div>
              <div
                className="text-sm font-semibold capitalize"
                style={{ color: isDark ? "#fff" : "#1A1A1A" }}
              >
                {program.target_audience.replace("_", " ")}
              </div>
              <div className="text-xs mt-1 text-[color:var(--fc-text-dim)]">
                Target Audience
              </div>
            </div>
          </div>

          <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest fc-text-dim">Training Schedule</h2>
          <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6">
            {/* Week selector */}
            <div className="flex items-center justify-between mb-4">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="min-w-11 min-h-11 rounded-xl fc-surface border border-[color:var(--fc-glass-border)]"
                onClick={() => setSelectedWeek((prev) => Math.max(1, prev - 1))}
                disabled={selectedWeek === 1}
                aria-label="Previous week"
              >
                <ChevronLeft className="w-5 h-5 fc-text-primary" />
              </Button>
              <span className="text-lg font-bold fc-text-primary">
                Week {selectedWeek} of {totalWeeks}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="min-w-11 min-h-11 rounded-xl fc-surface border border-[color:var(--fc-glass-border)]"
                onClick={() => setSelectedWeek((prev) => Math.min(totalWeeks, prev + 1))}
                disabled={selectedWeek === totalWeeks}
                aria-label="Next week"
              >
                <ChevronRight className="w-5 h-5 fc-text-primary" />
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {dayNames.map((label, idx) => {
                const scheduled = scheduleForWeek.find(
                  (s) =>
                    (s as any).program_day === idx + 1 ||
                    (s as any).day_of_week === idx
                );
                const templateId =
                  (scheduled as any)?.template_id ||
                  (scheduled as any)?.workout_template_id;
                const templateName = scheduled
                  ? templates[templateId]?.name || "Workout Day"
                  : "Rest Day";
                const isRest = !scheduled;
                const cardStyle = {
                  background: isDark
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.03)",
                  border: isDark
                    ? "1px solid rgba(255,255,255,0.1)"
                    : "1px solid rgba(0,0,0,0.1)",
                };
                if (!isRest && templateId) {
                  const templateHref = "/coach/workouts/templates/" + templateId;
                  return (
                    <Link
                      key={idx}
                      href={templateHref}
                      className="flex items-center justify-between gap-3 rounded-xl p-4 min-h-[52px] cursor-pointer transition-colors hover:bg-[color:var(--fc-glass-soft)] border border-transparent hover:border-[color:var(--fc-glass-border)]"
                      style={cardStyle}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Dumbbell
                            className="w-5 h-5 shrink-0"
                            style={{ color: getSemanticColor("trust").primary }}
                          />
                          <span
                            className="text-sm font-semibold"
                            style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                          >
                            {label}
                          </span>
                        </div>
                        <div
                          className="text-sm truncate"
                          style={{
                            color: isDark
                              ? "rgba(255,255,255,0.8)"
                              : "rgba(0,0,0,0.8)",
                          }}
                        >
                          {templateName}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 shrink-0 fc-text-dim" aria-hidden />
                    </Link>
                  );
                }
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3 rounded-xl p-4 min-h-[52px] opacity-75"
                    style={cardStyle}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Coffee
                        className="w-5 h-5 shrink-0"
                        style={{
                          color: isDark
                            ? "rgba(255,255,255,0.3)"
                            : "rgba(0,0,0,0.3)",
                        }}
                      />
                      <span
                        className="text-sm font-semibold"
                        style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                      >
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
        </div>
      </div>
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
