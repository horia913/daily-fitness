"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
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

interface Program {
  id: string;
  name: string;
  description?: string;
  coach_id: string;
  difficulty_level: "beginner" | "intermediate" | "advanced";
  duration_weeks: number;
  target_audience: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function EditProgramPage() {
  const params = useParams();
  const programId = useMemo(() => String(params?.id || ""), [params]);
  const { user } = useAuth();
  const { getThemeStyles } = useTheme();
  const theme = getThemeStyles();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Program | null>(null);
  const [activeTab, setActiveTab] = useState<
    "basic" | "schedule" | "progression"
  >("basic");
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [schedule, setSchedule] = useState<ProgramSchedule[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);

  const load = useCallback(async () => {
    if (!programId) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("workout_programs")
        .select("*")
        .eq("id", programId)
        .single();
      if (data) setForm(data as Program);
      // Load coach templates and current schedule
      if (user?.id) {
        const list = await WorkoutTemplateService.getWorkoutTemplates(user.id);
        setTemplates(list || []);
      }
      const sched = await WorkoutTemplateService.getProgramSchedule(programId);
      setSchedule(sched || []);
    } finally {
      setLoading(false);
    }
  }, [programId, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const onSave = async () => {
    if (!form || !form.name.trim()) return;
    setSaving(true);
    try {
      await WorkoutTemplateService.updateProgram(form.id, {
        name: form.name,
        description: form.description,
        difficulty_level: form.difficulty_level,
        duration_weeks: form.duration_weeks,
        target_audience: form.target_audience,
        is_active: form.is_active,
        coach_id: form.coach_id,
      });
      window.location.href = `/coach/programs/${form.id}`;
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) {
    return (
      <div className={`min-h-screen ${theme.background}`}>
        <div className="max-w-2xl mx-auto p-6">
          <div className={`${theme.card} rounded-2xl p-6`}>
            <div className="animate-pulse h-7 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.background}`}>
      <div className="p-4 sm:p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className={`${theme.card} ${theme.shadow} rounded-2xl p-6`}>
            <h1 className={`text-xl font-bold ${theme.text} mb-4`}>
              Edit Program
            </h1>

            <div className="flex space-x-2 mb-4">
              <Button
                variant={activeTab === "basic" ? "default" : "outline"}
                onClick={() => setActiveTab("basic")}
              >
                Basic Info
              </Button>
              <Button
                variant={activeTab === "schedule" ? "default" : "outline"}
                onClick={() => setActiveTab("schedule")}
              >
                Weekly Schedule
              </Button>
              <Button
                variant={activeTab === "progression" ? "default" : "outline"}
                onClick={() => setActiveTab("progression")}
              >
                Progression Rules
              </Button>
            </div>

            {activeTab === "basic" && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-2">
                    Program Name
                  </label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-2">
                    Description
                  </label>
                  <Textarea
                    value={form.description || ""}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium block mb-2">
                      Difficulty Level
                    </label>
                    <Select
                      value={form.difficulty_level}
                      onValueChange={(v) =>
                        setForm({ ...form, difficulty_level: v as any })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">
                          Intermediate
                        </SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">
                      Duration (Weeks)
                    </label>
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
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2">
                    Target Audience
                  </label>
                  <Select
                    value={form.target_audience}
                    onValueChange={(v) =>
                      setForm({ ...form, target_audience: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general_fitness">
                        General Fitness
                      </SelectItem>
                      <SelectItem value="weight_loss">Weight Loss</SelectItem>
                      <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                      <SelectItem value="strength">Strength</SelectItem>
                      <SelectItem value="endurance">Endurance</SelectItem>
                      <SelectItem value="athletic_performance">
                        Athletic Performance
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* is_public removed from schema - no control */}
              </div>
            )}

            {activeTab === "schedule" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Week</span>
                  <Select
                    value={String(selectedWeek)}
                    onValueChange={(v) => setSelectedWeek(parseInt(v, 10))}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: form.duration_weeks || 1 }).map(
                        (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>
                            Week {i + 1}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Array.from({ length: 6 }).map((_, di) => {
                    const day = di + 1;
                    const current = schedule.find(
                      (s) =>
                        (s.week_number || 1) === selectedWeek &&
                        s.program_day === day
                    );
                    const value = current?.template_id || "rest";
                    return (
                      <div key={day} className={`${theme.card} rounded-xl p-4`}>
                        <div className="text-sm font-medium mb-2">
                          Day {day}
                        </div>
                        <Select
                          value={value}
                          onValueChange={async (v) => {
                            if (v === "rest") {
                              await WorkoutTemplateService.removeProgramSchedule(
                                form.id,
                                day,
                                selectedWeek
                              );
                              setSchedule((prev) =>
                                prev.filter(
                                  (s) =>
                                    !(
                                      (s.week_number || 1) === selectedWeek &&
                                      s.program_day === day
                                    )
                                )
                              );
                            } else {
                              await WorkoutTemplateService.setProgramSchedule(
                                form.id,
                                day,
                                selectedWeek,
                                v
                              );
                              const sched =
                                await WorkoutTemplateService.getProgramSchedule(
                                  form.id
                                );
                              setSchedule(sched || []);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select template or Rest" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rest">Rest Day</SelectItem>
                            {templates.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === "progression" && (
              <div className="space-y-2">
                <p className={`${theme.textSecondary} text-sm`}>
                  Progression rules editor will map fields to
                  program_progression_rules per week and (optionally) exercise.
                </p>
              </div>
            )}

            {activeTab === "basic" && (
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() =>
                    (window.location.href = `/coach/programs/${form.id}`)
                  }
                >
                  Cancel
                </Button>
                <Button onClick={onSave} disabled={saving || !form.name.trim()}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
