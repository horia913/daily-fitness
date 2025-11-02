"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";
import WorkoutTemplateService, {
  ProgramSchedule,
  WorkoutTemplate,
} from "@/lib/workoutTemplateService";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Edit,
  X,
  Users,
  TrendingUp,
  Clock,
  Target,
} from "lucide-react";

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

export default function ProgramDetailsPage() {
  const params = useParams();
  const programId = useMemo(() => String(params?.id || ""), [params]);
  const { user } = useAuth();
  const { getThemeStyles } = useTheme();
  const theme = getThemeStyles();

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
      <div className={`min-h-screen ${theme.background}`}>
        <div className="animate-pulse p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
          <div className={`${theme.card} rounded-2xl p-6`}>
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-20 bg-slate-200 dark:bg-slate-700 rounded-xl"
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className={`min-h-screen ${theme.background}`}>
        <div className="max-w-3xl mx-auto p-6">
          <div className={`${theme.card} ${theme.shadow} rounded-2xl p-6`}>
            <p className={`${theme.text}`}>Program not found.</p>
          </div>
        </div>
      </div>
    );
  }

  const dayNames = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6"];
  const week1 = (schedule || []).filter((s) => (s.week_number || 1) === 1);

  return (
    <div className={`min-h-screen ${theme.background}`}>
      <div className="p-4 sm:p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className={`${theme.card} ${theme.shadow} rounded-2xl p-6`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "18px",
                    background:
                      "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Calendar
                    style={{ width: "32px", height: "32px", color: "#FFFFFF" }}
                  />
                </div>
                <div>
                  <h1 className={`text-2xl font-bold ${theme.text}`}>
                    {program.name}
                  </h1>
                  <p className={`${theme.textSecondary} text-sm`}>
                    Created {new Date(program.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    (window.location.href = `/coach/programs/${program.id}/edit`)
                  }
                >
                  <Edit className="w-4 h-4 mr-2" /> Edit
                </Button>
              </div>
            </div>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`${theme.card} rounded-2xl p-5 text-center`}>
              <div className="mx-auto mb-2 rounded-xl w-10 h-10 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-2xl font-bold">{program.duration_weeks}</div>
              <div className={`${theme.textSecondary} text-xs`}>Weeks</div>
            </div>
            <div className={`${theme.card} rounded-2xl p-5 text-center`}>
              <div className="mx-auto mb-2 rounded-xl w-10 h-10 flex items-center justify-center bg-green-100 dark:bg-green-900/30">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-2xl font-bold">{0}</div>
              <div className={`${theme.textSecondary} text-xs`}>
                Active Clients
              </div>
            </div>
            <div className={`${theme.card} rounded-2xl p-5 text-center`}>
              <div className="mx-auto mb-2 rounded-xl w-10 h-10 flex items-center justify-center bg-yellow-100 dark:bg-yellow-900/30">
                <TrendingUp className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="text-2xl font-bold">
                {program.duration_weeks > 0
                  ? Math.round(program.duration_weeks)
                  : 0}
              </div>
              <div className={`${theme.textSecondary} text-xs`}>
                Avg Duration (w)
              </div>
            </div>
            <div className={`${theme.card} rounded-2xl p-5 text-center`}>
              <div className="mx-auto mb-2 rounded-xl w-10 h-10 flex items-center justify-center bg-purple-100 dark:bg-purple-900/30">
                <Target className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-sm font-semibold capitalize">
                {program.target_audience.replace("_", " ")}
              </div>
              <div className={`${theme.textSecondary} text-xs`}>Target</div>
            </div>
          </div>

          {/* Description */}
          {program.description && (
            <div className={`${theme.card} rounded-2xl p-6`}>
              <h3 className={`text-lg font-semibold ${theme.text} mb-2`}>
                Description
              </h3>
              <p className={`${theme.textSecondary}`}>{program.description}</p>
            </div>
          )}

          {/* Week 1 Schedule snapshot */}
          <div className={`${theme.card} rounded-2xl p-6`}>
            <h3 className={`text-lg font-semibold ${theme.text} mb-4`}>
              Weekly Schedule (Week 1)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
                    className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4"
                  >
                    <div className="text-sm font-semibold mb-1">{label}</div>
                    <div
                      className={`${
                        isRest ? "text-slate-400" : theme.text
                      } text-sm`}
                    >
                      {templateName}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
