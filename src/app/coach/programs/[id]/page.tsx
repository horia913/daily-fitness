"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";

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

  useEffect(() => {
    loadProgram();
    loadSchedule();
  }, [loadProgram, loadSchedule]);

  if (loading) {
    return (
      <AnimatedBackground>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-8 text-center">
            <div
              className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin mx-auto mb-4"
              style={{
                borderColor: `${getSemanticColor("trust").primary}40`,
                borderTopColor: "transparent",
              }}
            />
            <p
              style={{
                color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
              }}
            >
              Loading program...
            </p>
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
  const week1 = (schedule || []).filter((s) => (s.week_number || 1) === 1);

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
      <div className="min-h-screen p-4 sm:p-6 pb-24">
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
              <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full fc-glass border border-[color:var(--fc-glass-border)]">
                <Share2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full fc-glass border border-[color:var(--fc-glass-border)]">
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
              <h1 className="text-3xl font-bold tracking-tight fc-text-primary mb-4">
                {program.name}
              </h1>
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
            <h3 className="text-lg font-bold mb-4 fc-text-primary">
              Week 1
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {dayNames.map((label, idx) => {
                const scheduled = week1.find(
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
                return (
                  <div
                    key={idx}
                    className="rounded-xl p-4"
                    style={{
                      background: isDark
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(0,0,0,0.03)",
                      border: `1px solid ${
                        isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
                      }`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {isRest ? (
                        <Coffee
                          className="w-5 h-5"
                          style={{
                            color: isDark
                              ? "rgba(255,255,255,0.3)"
                              : "rgba(0,0,0,0.3)",
                          }}
                        />
                      ) : (
                        <Dumbbell
                          className="w-5 h-5"
                          style={{
                            color: getSemanticColor("trust").primary,
                          }}
                        />
                      )}
                      <span
                        className="text-sm font-semibold"
                        style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                      >
                        {label}
                      </span>
                    </div>
                    <div
                      className="text-sm"
                      style={{
                        color: isRest
                          ? isDark
                            ? "rgba(255,255,255,0.4)"
                            : "rgba(0,0,0,0.4)"
                          : isDark
                          ? "rgba(255,255,255,0.8)"
                          : "rgba(0,0,0,0.8)",
                      }}
                    >
                      {templateName}
                    </div>
                  </div>
                );
              })}
            </div>
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
