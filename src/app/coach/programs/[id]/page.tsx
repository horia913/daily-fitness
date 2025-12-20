"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { supabase } from "@/lib/supabase";
import WorkoutTemplateService, {
  ProgramSchedule,
  WorkoutTemplate,
} from "@/lib/workoutTemplateService";
import { Button } from "@/components/ui/button";
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
  is_public: boolean;
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
      const { data, error } = await supabase
        .from("workout_programs")
        .select("*")
        .eq("id", programId)
        .single();

      if (!error) setProgram(data as Program);
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
          <GlassCard elevation={2} className="p-8 text-center">
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
          </GlassCard>
        </div>
      </AnimatedBackground>
    );
  }

  if (!program) {
    return (
      <AnimatedBackground>
        <div className="min-h-screen flex items-center justify-center p-4">
          <GlassCard elevation={2} className="p-8 text-center">
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
          </GlassCard>
        </div>
      </AnimatedBackground>
    );
  }

  const dayNames = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6"];
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
      <div className="min-h-screen p-4 sm:p-6">
        <div className="max-w-5xl mx-auto space-y-6 relative z-10">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => (window.location.href = "/coach/programs")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Programs
          </Button>

          {/* Header */}
          <GlassCard elevation={3} className="p-6">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: getSemanticColor("success").gradient,
                    boxShadow: `0 4px 12px ${
                      getSemanticColor("success").primary
                    }30`,
                  }}
                >
                  <Calendar className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1
                    className="text-3xl font-bold mb-2 break-words"
                    style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                  >
                    {program.name}
                  </h1>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-xs px-2 py-1 rounded-lg font-semibold capitalize"
                      style={{
                        background: `${
                          getDifficultyColor(program.difficulty_level).primary
                        }20`,
                        color: getDifficultyColor(program.difficulty_level)
                          .primary,
                      }}
                    >
                      {program.difficulty_level}
                    </span>
                    <span
                      className="text-sm"
                      style={{
                        color: isDark
                          ? "rgba(255,255,255,0.6)"
                          : "rgba(0,0,0,0.6)",
                      }}
                    >
                      Created{" "}
                      {new Date(program.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  onClick={() =>
                    (window.location.href = `/coach/programs/${program.id}/edit`)
                  }
                  className="rounded-xl flex-1 sm:flex-initial"
                  style={{
                    background: getSemanticColor("trust").gradient,
                    boxShadow: `0 4px 12px ${
                      getSemanticColor("trust").primary
                    }30`,
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" /> Edit Program
                </Button>
              </div>
            </div>
          </GlassCard>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <GlassCard elevation={2} className="p-5 text-center">
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
              <div
                className="text-xs mt-1"
                style={{
                  color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                }}
              >
                Total Weeks
              </div>
            </GlassCard>

            <GlassCard elevation={2} className="p-5 text-center">
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
              <div
                className="text-xs mt-1"
                style={{
                  color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                }}
              >
                Active Clients
              </div>
            </GlassCard>

            <GlassCard elevation={2} className="p-5 text-center">
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
              <div
                className="text-xs mt-1"
                style={{
                  color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                }}
              >
                Avg Duration (w)
              </div>
            </GlassCard>

            <GlassCard elevation={2} className="p-5 text-center">
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
              <div
                className="text-xs mt-1"
                style={{
                  color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                }}
              >
                Target Audience
              </div>
            </GlassCard>
          </div>

          {/* Description */}
          {program.description && (
            <GlassCard elevation={2} className="p-6">
              <h3
                className="text-lg font-bold mb-3"
                style={{ color: isDark ? "#fff" : "#1A1A1A" }}
              >
                Program Description
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{
                  color: isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.8)",
                }}
              >
                {program.description}
              </p>
            </GlassCard>
          )}

          {/* Week 1 Schedule */}
          <GlassCard elevation={2} className="p-6">
            <h3
              className="text-lg font-bold mb-4"
              style={{ color: isDark ? "#fff" : "#1A1A1A" }}
            >
              Weekly Schedule (Week 1)
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
          </GlassCard>
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
