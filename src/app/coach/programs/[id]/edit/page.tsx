"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
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
import {
  BookOpen,
  ArrowLeft,
  Calendar,
  TrendingUp,
  Dumbbell,
  Coffee,
  Info,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import ExerciseBlockCard from "@/components/features/workouts/ExerciseBlockCard";
import { useExerciseLibrary } from "@/hooks/useCoachData";
import ProgramProgressionRulesEditor from "@/components/coach/ProgramProgressionRulesEditor";
import ProgramProgressionService from "@/lib/programProgressionService";

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

// Helper function to generate block-type-specific summary
const getBlockSummary = (block: any): string => {
  if (!block) return "";

  const blockType = block.block_type || "";
  const exercises = block.exercises || [];
  const exerciseCount = exercises.length;

  switch (blockType) {
    case "straight_set": {
      const sets = block.total_sets || 3;
      const reps = block.reps_per_set || "10-12";
      const rest = block.rest_seconds || 60;
      // Get tempo and RIR from first exercise if available
      const firstExercise = exercises[0];
      const tempo = firstExercise?.tempo;
      const rir = firstExercise?.rir;
      let summary = `${sets} sets × ${reps} reps • ${rest}s rest`;
      if (tempo) summary += ` • Tempo ${tempo}`;
      if (rir !== undefined && rir !== null) summary += ` • RIR ${rir}`;
      return summary;
    }

    case "superset":
      return `Superset • ${exerciseCount} exercises • ${
        block.total_sets || 3
      } sets`;

    case "giant_set":
      return `Giant Set • ${exerciseCount} exercises • ${
        block.total_sets || 3
      } sets`;

    case "pre_exhaust":
      return `Pre-Exhaust • Isolation → Compound • ${
        block.total_sets || 3
      } sets`;

    case "drop_set": {
      // Aggregate drop sets from all exercises in the block
      const allDropSets: any[] = [];
      exercises.forEach((ex: any) => {
        if (ex.drop_sets && Array.isArray(ex.drop_sets)) {
          allDropSets.push(...ex.drop_sets);
        }
      });
      // Also check block-level drop_sets if available
      if (block.drop_sets && Array.isArray(block.drop_sets)) {
        allDropSets.push(...block.drop_sets);
      }
      const uniqueDropCount = new Set(
        allDropSets.map((ds: any) => ds.drop_order)
      ).size;
      return `${uniqueDropCount} drops • ${block.total_sets || 3} sets`;
    }

    case "cluster_set": {
      // Get cluster set config from first exercise
      const firstExercise = exercises.find(
        (ex: any) => ex.cluster_sets && ex.cluster_sets.length > 0
      );
      if (firstExercise?.cluster_sets?.[0]) {
        const config = firstExercise.cluster_sets[0];
        return `${config.clusters_per_set || 4} clusters × ${
          config.reps_per_cluster || 3
        } reps • ${config.intra_cluster_rest || 10}s intra-rest`;
      }
      // Fallback to block-level
      if (block.cluster_sets?.[0]) {
        const config = block.cluster_sets[0];
        return `${config.clusters_per_set || 4} clusters × ${
          config.reps_per_cluster || 3
        } reps • ${config.intra_cluster_rest || 10}s intra-rest`;
      }
      return `Cluster Set • ${block.total_sets || 3} sets`;
    }

    case "pyramid": {
      // Aggregate pyramid sets from all exercises
      const allPyramidSets: any[] = [];
      exercises.forEach((ex: any) => {
        if (ex.pyramid_sets && Array.isArray(ex.pyramid_sets)) {
          allPyramidSets.push(...ex.pyramid_sets);
        }
      });
      if (block.pyramid_sets && Array.isArray(block.pyramid_sets)) {
        allPyramidSets.push(...block.pyramid_sets);
      }
      const uniquePyramidCount = new Set(
        allPyramidSets.map((ps: any) => ps.pyramid_order)
      ).size;
      return `${uniquePyramidCount} sets • Pyramid progression`;
    }

    case "ladder": {
      // Aggregate ladder sets from all exercises
      const allLadderSets: any[] = [];
      exercises.forEach((ex: any) => {
        if (ex.ladder_sets && Array.isArray(ex.ladder_sets)) {
          allLadderSets.push(...ex.ladder_sets);
        }
      });
      if (block.ladder_sets && Array.isArray(block.ladder_sets)) {
        allLadderSets.push(...block.ladder_sets);
      }
      const uniqueLadderCount = new Set(
        allLadderSets.map((ls: any) => ls.ladder_order)
      ).size;
      return `Ladder • ${uniqueLadderCount} rungs`;
    }

    case "rest_pause": {
      // Get rest-pause config from first exercise
      const firstExercise = exercises.find(
        (ex: any) => ex.rest_pause_sets && ex.rest_pause_sets.length > 0
      );
      if (firstExercise?.rest_pause_sets?.[0]) {
        const config = firstExercise.rest_pause_sets[0];
        return `Rest-Pause • ${
          config.rest_pause_duration || 15
        }s pauses • max ${config.max_rest_pauses || 3}`;
      }
      // Fallback to block-level
      if (block.rest_pause_sets?.[0]) {
        const config = block.rest_pause_sets[0];
        return `Rest-Pause • ${
          config.rest_pause_duration || 15
        }s pauses • max ${config.max_rest_pauses || 3}`;
      }
      return `Rest-Pause • ${block.total_sets || 3} sets`;
    }

    case "circuit": {
      const protocol = block.time_protocol;
      const rounds = protocol?.rounds || block.block_parameters?.rounds || 3;
      const restBetween = protocol?.rest_seconds || block.rest_seconds || 60;
      return `${rounds} rounds • ${exerciseCount} exercises • ${restBetween}s rest between rounds`;
    }

    case "tabata": {
      const protocol = block.time_protocol;
      const work =
        protocol?.work_seconds || block.block_parameters?.work_seconds || 20;
      const rest =
        protocol?.rest_seconds || block.block_parameters?.rest_seconds || 10;
      const rounds = protocol?.rounds || block.block_parameters?.rounds || 8;
      return `Tabata • ${work}s/${rest}s • ${rounds} rounds`;
    }

    case "emom": {
      const protocol = block.time_protocol;
      const duration =
        protocol?.total_duration_minutes ||
        Math.floor((block.duration_seconds || 1200) / 60);
      return `EMOM • ${duration} minutes`;
    }

    case "amrap": {
      const protocol = block.time_protocol;
      const duration =
        protocol?.total_duration_minutes ||
        Math.floor((block.duration_seconds || 900) / 60);
      return `AMRAP • ${duration} minutes`;
    }

    case "for_time": {
      const protocol = block.time_protocol;
      const duration =
        protocol?.total_duration_minutes ||
        Math.floor((block.duration_seconds || 720) / 60);
      return `For Time • ${duration} min cap`;
    }

    default:
      return `${block.total_sets || 3} sets`;
  }
};

function EditProgramContent() {
  const params = useParams();
  const programId = useMemo(() => String(params?.id || ""), [params]);
  const { user } = useAuth();
  const { isDark, getSemanticColor, performanceSettings } = useTheme();
  const { exercises: availableExercises } = useExerciseLibrary(user?.id || "");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Program | null>(null);
  const [activeTab, setActiveTab] = useState<
    "basic" | "schedule" | "progression"
  >("basic");
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [schedule, setSchedule] = useState<ProgramSchedule[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [templateExercises, setTemplateExercises] = useState<
    Record<string, any[]>
  >({});
  const [templateBlocks, setTemplateBlocks] = useState<Record<string, any[]>>(
    {}
  );
  const [selectedScheduleForProgression, setSelectedScheduleForProgression] =
    useState<ProgramSchedule | null>(null);

  // Available exercises list for ExerciseBlockCard
  const availableExercisesList = availableExercises;

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

      // Load exercises and full block data for all templates in the schedule
      const templateIds = [
        ...new Set(sched?.map((s) => s.template_id).filter(Boolean) || []),
      ];
      const exercisesMap: Record<string, any[]> = {};
      const blocksMap: Record<string, any[]> = {};

      for (const templateId of templateIds) {
        try {
          // Get full block data with all related tables
          const { WorkoutBlockService } = await import(
            "@/lib/workoutBlockService"
          );
          const blocks = await WorkoutBlockService.getWorkoutBlocks(templateId);

          // Store full blocks for block-type-specific display
          blocksMap[templateId] = blocks;

          // Also create exercises map for matching
          const exercises: any[] = [];
          blocks.forEach((block) => {
            if (block.exercises && block.exercises.length > 0) {
              block.exercises.forEach((exercise) => {
                exercises.push({
                  id: exercise.id,
                  exercise_id: exercise.exercise_id,
                  exercise: exercise.exercise,
                  template_id: templateId,
                  block_id: block.id,
                  block_type: block.block_type,
                  block_name: block.block_name,
                  block_order: block.block_order,
                  exercise_letter: exercise.exercise_letter,
                  exercise_order: exercise.exercise_order,
                  // Store exercise-specific data
                  sets: exercise.sets,
                  reps: exercise.reps,
                  weight_kg: exercise.weight_kg,
                  tempo: exercise.tempo,
                  rir: exercise.rir,
                  rest_seconds: exercise.rest_seconds,
                });
              });
            }
          });

          exercisesMap[templateId] = exercises;
        } catch (error) {
          console.error(
            `Error loading exercises for template ${templateId}:`,
            error
          );
          exercisesMap[templateId] = [];
          blocksMap[templateId] = [];
        }
      }

      setTemplateExercises(exercisesMap);
      // Store blocks separately for block-type summaries
      setTemplateBlocks(blocksMap);
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

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}
      <div className="min-h-screen p-4 sm:p-6">
        <div className="max-w-5xl mx-auto space-y-6 relative z-10">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() =>
              (window.location.href = `/coach/programs/${form.id}`)
            }
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Program
          </Button>

          {/* Header */}
          <GlassCard elevation={3} className="p-6">
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: getSemanticColor("success").gradient,
                  boxShadow: `0 4px 12px ${
                    getSemanticColor("success").primary
                  }30`,
                }}
              >
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1
                  className="text-3xl font-bold mb-2 break-words"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  Edit Program
                </h1>
                <p
                  className="text-sm break-words"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                  }}
                >
                  {form.name}
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Tab Buttons */}
          <GlassCard elevation={2} className="p-2">
            <div className="flex gap-2">
              <Button
                variant={activeTab === "basic" ? "default" : "ghost"}
                onClick={() => setActiveTab("basic")}
                className="flex-1 rounded-xl"
                style={
                  activeTab === "basic"
                    ? {
                        background: getSemanticColor("trust").gradient,
                        boxShadow: `0 4px 12px ${
                          getSemanticColor("trust").primary
                        }30`,
                      }
                    : {}
                }
              >
                <BookOpen className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Basic Info</span>
              </Button>
              <Button
                variant={activeTab === "schedule" ? "default" : "ghost"}
                onClick={() => setActiveTab("schedule")}
                className="flex-1 rounded-xl"
                style={
                  activeTab === "schedule"
                    ? {
                        background: getSemanticColor("trust").gradient,
                        boxShadow: `0 4px 12px ${
                          getSemanticColor("trust").primary
                        }30`,
                      }
                    : {}
                }
              >
                <Calendar className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Weekly Schedule</span>
              </Button>
              <Button
                variant={activeTab === "progression" ? "default" : "ghost"}
                onClick={() => setActiveTab("progression")}
                className="flex-1 rounded-xl"
                style={
                  activeTab === "progression"
                    ? {
                        background: getSemanticColor("trust").gradient,
                        boxShadow: `0 4px 12px ${
                          getSemanticColor("trust").primary
                        }30`,
                      }
                    : {}
                }
              >
                <TrendingUp className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Progression Rules</span>
              </Button>
            </div>
          </GlassCard>

          {/* Tab Content */}
          {activeTab === "basic" && (
            <GlassCard elevation={2} className="p-6">
              <div className="space-y-6">
                {/* Program Name */}
                <div>
                  <label
                    className="text-sm font-semibold block mb-2"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.9)"
                        : "rgba(0,0,0,0.9)",
                    }}
                  >
                    Program Name *
                  </label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="text-base"
                    style={{
                      background: isDark
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.05)",
                      border: `1px solid ${
                        isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"
                      }`,
                      color: isDark ? "#fff" : "#1A1A1A",
                    }}
                  />
                </div>

                {/* Description */}
                <div>
                  <label
                    className="text-sm font-semibold block mb-2"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.9)"
                        : "rgba(0,0,0,0.9)",
                    }}
                  >
                    Description
                  </label>
                  <Textarea
                    value={form.description || ""}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    rows={4}
                    className="text-base resize-none"
                    style={{
                      background: isDark
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.05)",
                      border: `1px solid ${
                        isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"
                      }`,
                      color: isDark ? "#fff" : "#1A1A1A",
                    }}
                  />
                </div>

                {/* Difficulty & Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      className="text-sm font-semibold block mb-2"
                      style={{
                        color: isDark
                          ? "rgba(255,255,255,0.9)"
                          : "rgba(0,0,0,0.9)",
                      }}
                    >
                      Difficulty Level
                    </label>
                    <Select
                      value={form.difficulty_level}
                      onValueChange={(v) =>
                        setForm({ ...form, difficulty_level: v as any })
                      }
                    >
                      <SelectTrigger
                        style={{
                          background: isDark
                            ? "rgba(255,255,255,0.1)"
                            : "rgba(0,0,0,0.05)",
                          border: `1px solid ${
                            isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"
                          }`,
                          color: isDark ? "#fff" : "#1A1A1A",
                        }}
                      >
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
                    <label
                      className="text-sm font-semibold block mb-2"
                      style={{
                        color: isDark
                          ? "rgba(255,255,255,0.9)"
                          : "rgba(0,0,0,0.9)",
                      }}
                    >
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
                      style={{
                        background: isDark
                          ? "rgba(255,255,255,0.1)"
                          : "rgba(0,0,0,0.05)",
                        border: `1px solid ${
                          isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"
                        }`,
                        color: isDark ? "#fff" : "#1A1A1A",
                      }}
                    />
                  </div>
                </div>

                {/* Target Audience */}
                <div>
                  <label
                    className="text-sm font-semibold block mb-2"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.9)"
                        : "rgba(0,0,0,0.9)",
                    }}
                  >
                    Target Audience
                  </label>
                  <Select
                    value={form.target_audience}
                    onValueChange={(v) =>
                      setForm({ ...form, target_audience: v })
                    }
                  >
                    <SelectTrigger
                      style={{
                        background: isDark
                          ? "rgba(255,255,255,0.1)"
                          : "rgba(0,0,0,0.05)",
                        border: `1px solid ${
                          isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"
                        }`,
                        color: isDark ? "#fff" : "#1A1A1A",
                      }}
                    >
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

                {/* Active Toggle */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) =>
                      setForm({ ...form, is_active: e.target.checked })
                    }
                    className="w-5 h-5"
                  />
                  <label
                    className="text-sm font-semibold"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.9)"
                        : "rgba(0,0,0,0.9)",
                    }}
                  >
                    Program is active and visible to clients
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div
                className="flex items-center justify-end gap-3 mt-8 pt-6"
                style={{
                  borderTop: `1px solid ${
                    isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
                  }`,
                }}
              >
                <Button
                  variant="ghost"
                  onClick={() =>
                    (window.location.href = `/coach/programs/${form.id}`)
                  }
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={onSave}
                  disabled={saving || !form.name.trim()}
                  className="rounded-xl"
                  style={{
                    background: getSemanticColor("success").gradient,
                    boxShadow: `0 4px 12px ${
                      getSemanticColor("success").primary
                    }30`,
                    opacity: saving || !form.name.trim() ? 0.5 : 1,
                  }}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </GlassCard>
          )}

          {activeTab === "schedule" && (
            <div className="space-y-6">
              {/* Week Selector */}
              <GlassCard elevation={2} className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <label
                    className="text-sm font-semibold"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.9)"
                        : "rgba(0,0,0,0.9)",
                    }}
                  >
                    Select Week:
                  </label>
                  <Select
                    value={String(selectedWeek)}
                    onValueChange={(v) => setSelectedWeek(parseInt(v, 10))}
                  >
                    <SelectTrigger
                      className="w-40"
                      style={{
                        background: isDark
                          ? "rgba(255,255,255,0.1)"
                          : "rgba(0,0,0,0.05)",
                        border: `1px solid ${
                          isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"
                        }`,
                        color: isDark ? "#fff" : "#1A1A1A",
                      }}
                    >
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

                {/* Days Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 7 }).map((_, di) => {
                    const day = di + 1;
                    const current = schedule.find(
                      (s) =>
                        (s.week_number || 1) === selectedWeek &&
                        s.program_day === day
                    );
                    const value = current?.template_id || "rest";
                    const isRest = value === "rest";

                    return (
                      <div
                        key={day}
                        className="p-4 rounded-xl"
                        style={{
                          background: isDark
                            ? "rgba(255,255,255,0.05)"
                            : "rgba(0,0,0,0.03)",
                          border: `1px solid ${
                            isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
                          }`,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-3">
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
                            Day {day}
                          </span>
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
                              // First, save the current week's schedule
                              const result =
                                await WorkoutTemplateService.setProgramSchedule(
                                  form.id,
                                  day,
                                  selectedWeek,
                                  v
                                );
                              if (!result) {
                                alert(
                                  "Failed to save schedule. Please check if you have permission to edit this program."
                                );
                                return;
                              }

                              // Reload schedule to get updated Week 1 data
                              let sched =
                                await WorkoutTemplateService.getProgramSchedule(
                                  form.id
                                );
                              setSchedule(sched || []);

                              // Auto-fill logic: If Week 1 is being set, apply to all empty weeks
                              if (selectedWeek === 1) {
                                const totalWeeks = form.duration_weeks || 1;
                                const autoFillPromises: Promise<any>[] = [];
                                const weeksToFill: number[] = [];

                                // Get the complete Week 1 schedule
                                const week1Schedule = (sched || []).filter(
                                  (s) => (s.week_number || 1) === 1
                                );

                                for (let week = 2; week <= totalWeeks; week++) {
                                  // Check if this week is completely empty (all 7 days have no workouts)
                                  const weekSchedule = (sched || []).filter(
                                    (s) => (s.week_number || 1) === week
                                  );
                                  const hasAnyWorkout = weekSchedule.some(
                                    (s) =>
                                      s.template_id && s.template_id !== "rest"
                                  );

                                  // If week has no workouts, copy entire Week 1 schedule to this week
                                  if (
                                    !hasAnyWorkout &&
                                    week1Schedule.length > 0
                                  ) {
                                    weeksToFill.push(week);
                                    // Copy all Week 1 workouts to this week
                                    for (const week1Item of week1Schedule) {
                                      if (
                                        week1Item.template_id &&
                                        week1Item.template_id !== "rest"
                                      ) {
                                        autoFillPromises.push(
                                          WorkoutTemplateService.setProgramSchedule(
                                            form.id,
                                            week1Item.program_day,
                                            week,
                                            week1Item.template_id
                                          )
                                        );
                                      }
                                    }
                                  }
                                }

                                // Wait for all auto-fill operations to complete
                                if (autoFillPromises.length > 0) {
                                  await Promise.all(autoFillPromises);
                                  console.log(
                                    `✅ Auto-filled Week 1 schedule to ${
                                      weeksToFill.length
                                    } empty week(s): ${weeksToFill.join(", ")}`
                                  );

                                  // Reload schedule after auto-fill
                                  sched =
                                    await WorkoutTemplateService.getProgramSchedule(
                                      form.id
                                    );
                                  setSchedule(sched || []);
                                }
                              }

                              if (v !== "rest" && result?.id) {
                                try {
                                  await ProgramProgressionService.deleteProgressionRules(
                                    result.id,
                                    selectedWeek
                                  );
                                  const copySuccess =
                                    await ProgramProgressionService.copyWorkoutToProgram(
                                      form.id,
                                      result.id,
                                      v,
                                      selectedWeek
                                    );
                                  if (!copySuccess) {
                                    console.warn(
                                      "⚠️ Failed to copy workout data to progression rules after schedule update"
                                    );
                                  }
                                } catch (error) {
                                  console.error(
                                    "❌ Error copying workout to progression rules after schedule update:",
                                    error
                                  );
                                }
                              }

                              // Always reload progression rules and exercises after schedule change
                              // Reload exercises and blocks for updated templates
                              const templateIds = [
                                ...new Set(
                                  sched
                                    ?.map((s) => s.template_id)
                                    .filter(Boolean) || []
                                ),
                              ];
                              const exercisesMap: Record<string, any[]> = {};
                              const blocksMap: Record<string, any[]> = {};

                              for (const templateId of templateIds) {
                                try {
                                  const { WorkoutBlockService } = await import(
                                    "@/lib/workoutBlockService"
                                  );
                                  const blocks =
                                    await WorkoutBlockService.getWorkoutBlocks(
                                      templateId
                                    );

                                  blocksMap[templateId] = blocks;

                                  const exercises: any[] = [];
                                  blocks.forEach((block) => {
                                    if (
                                      block.exercises &&
                                      block.exercises.length > 0
                                    ) {
                                      block.exercises.forEach((exercise) => {
                                        exercises.push({
                                          id: exercise.id,
                                          exercise_id: exercise.exercise_id,
                                          exercise: exercise.exercise,
                                          template_id: templateId,
                                          block_id: block.id,
                                          block_type: block.block_type,
                                          block_name: block.block_name,
                                          block_order: block.block_order,
                                          exercise_letter:
                                            exercise.exercise_letter,
                                          exercise_order:
                                            exercise.exercise_order,
                                          sets: exercise.sets,
                                          reps: exercise.reps,
                                          weight_kg: exercise.weight_kg,
                                          tempo: exercise.tempo,
                                          rir: exercise.rir,
                                          rest_seconds: exercise.rest_seconds,
                                        });
                                      });
                                    }
                                  });

                                  exercisesMap[templateId] = exercises;
                                } catch (error) {
                                  console.error(
                                    `Error loading exercises for template ${templateId}:`,
                                    error
                                  );
                                  exercisesMap[templateId] = [];
                                  blocksMap[templateId] = [];
                                }
                              }

                              setTemplateExercises(exercisesMap);
                              setTemplateBlocks(blocksMap);
                            }
                          }}
                        >
                          <SelectTrigger
                            style={{
                              background: isDark
                                ? "rgba(255,255,255,0.1)"
                                : "rgba(255,255,255,0.8)",
                              border: `1px solid ${
                                isDark
                                  ? "rgba(255,255,255,0.2)"
                                  : "rgba(0,0,0,0.1)"
                              }`,
                              color: isDark ? "#fff" : "#1A1A1A",
                            }}
                          >
                            <SelectValue placeholder="Select..." />
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
              </GlassCard>

              {/* Info Card */}
              <GlassCard elevation={1} className="p-4">
                <div className="flex items-start gap-3">
                  <Info
                    className="w-5 h-5 flex-shrink-0 mt-0.5"
                    style={{
                      color: getSemanticColor("trust").primary,
                    }}
                  />
                  <p
                    className="text-sm"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.7)"
                        : "rgba(0,0,0,0.7)",
                    }}
                  >
                    Configure the workout schedule for each week of your
                    program. Select a workout template for each training day, or
                    choose "Rest Day" for recovery. Changes are saved
                    automatically when you make a selection.
                  </p>
                </div>
              </GlassCard>
            </div>
          )}

          {activeTab === "progression" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Progression Rules
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Edit workout parameters week by week. Changes apply only to
                  this program.
                </p>

                {schedule.filter((s) => (s.week_number || 1) === selectedWeek)
                  .length === 0 ? (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    <Calendar className="w-16 h-16 mx-auto mb-4" />
                    <h4 className="text-lg font-medium mb-2">
                      No Workouts Scheduled for Week {selectedWeek}
                    </h4>
                    <p className="text-sm mb-4">
                      Please assign workout templates to days in the Weekly
                      Schedule tab first.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Week Selector */}
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium">Week:</label>
                      <Select
                        value={String(selectedWeek)}
                        onValueChange={(v) => {
                          const w = parseInt(v, 10) || 1;
                          setSelectedWeek(w);
                          setSelectedScheduleForProgression(null);
                        }}
                      >
                        <SelectTrigger className="w-32 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[10000]" position="popper">
                          {Array.from(
                            { length: form?.duration_weeks || 1 },
                            (_, i) => (
                              <SelectItem
                                key={i + 1}
                                value={(i + 1).toString()}
                              >
                                Week {i + 1}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Day Selector */}
                    <div className="flex flex-wrap gap-2">
                      {schedule
                        .filter((s) => (s.week_number || 1) === selectedWeek)
                        .map((scheduleItem) => {
                          const template = templates.find(
                            (t) => t.id === scheduleItem.template_id
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
                              className="rounded-lg"
                            >
                              Day {scheduleItem.program_day}
                              {template && ` - ${template.name}`}
                            </Button>
                          );
                        })}
                    </div>

                    {/* Progression Rules Editor */}
                    {selectedScheduleForProgression && form?.id && (
                      <ProgramProgressionRulesEditor
                        programId={form.id}
                        programScheduleId={
                          selectedScheduleForProgression.id ||
                          `temp-${selectedScheduleForProgression.template_id}-${selectedScheduleForProgression.program_day}`
                        }
                        weekNumber={selectedWeek}
                        exercises={availableExercisesList as any}
                        templates={templates}
                        onUpdate={() => {
                          // Reload schedule to get updated IDs if program was just created
                          load();
                        }}
                      />
                    )}

                    {!selectedScheduleForProgression && (
                      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                        <p>Select a day above to edit progression rules.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
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
