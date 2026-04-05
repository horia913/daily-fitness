"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";
import WorkoutTemplateService, {
  WorkoutTemplate,
} from "@/lib/workoutTemplateService";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";

import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Button } from "@/components/ui/button";
import {
  Dumbbell,
  Edit,
  ArrowLeft,
  Copy as CopyIcon,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { WorkoutBlockService } from "@/lib/workoutBlockService";
import { WorkoutBlock } from "@/types/workoutBlocks";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/toast-provider";
import type { WorkoutSpeedSet, WorkoutEnduranceSet } from "@/types/workoutSetEntries";
import { formatPaceMinSecPerKm } from "@/lib/enduranceFormUtils";

function formatSpeedPrescriptionRow(row: WorkoutSpeedSet | undefined): string | null {
  if (!row) return null;
  const parts: string[] = [];
  const dist = row.distance_meters;
  const distStr =
    dist >= 1000 ? `${(dist / 1000).toFixed(1)} km` : `${Math.round(dist)}m`;
  parts.push(`${row.intervals} × ${distStr}`);
  if (row.target_speed_pct != null && Number.isFinite(row.target_speed_pct)) {
    parts.push(`${Math.round(row.target_speed_pct)}% speed`);
  } else if (row.target_hr_pct != null && Number.isFinite(row.target_hr_pct)) {
    parts.push(`${Math.round(row.target_hr_pct)}% HR`);
  }
  if (row.rest_seconds != null && Number.isFinite(row.rest_seconds)) {
    parts.push(`${row.rest_seconds}s rest`);
  }
  if (row.load_pct_bw != null && Number.isFinite(row.load_pct_bw)) {
    parts.push(`${row.load_pct_bw}% BW`);
  }
  return parts.length ? parts.join(" · ") : null;
}

function formatEndurancePrescriptionRow(row: WorkoutEnduranceSet | undefined): string | null {
  if (!row) return null;
  const km = row.target_distance_meters / 1000;
  const parts: string[] = [`${km.toFixed(1)} km`];
  if (
    row.target_pace_seconds_per_km != null &&
    Number.isFinite(row.target_pace_seconds_per_km)
  ) {
    parts.push(formatPaceMinSecPerKm(row.target_pace_seconds_per_km));
  }
  if (row.target_hr_pct != null && Number.isFinite(row.target_hr_pct)) {
    parts.push(`${Math.round(row.target_hr_pct)}% HR`);
  } else if (row.hr_zone != null && Number.isFinite(row.hr_zone)) {
    parts.push(`Zone ${row.hr_zone}`);
  }
  return parts.length ? parts.join(" · ") : null;
}

function flatExerciseRowsFromBlocks(blocks: WorkoutBlock[]) {
  const rows: { key: string; name: string; setsReps: string }[] = [];
  blocks.forEach((block, bi) => {
    const exs = block.exercises || [];
    const setType = block.set_type;
    if (exs.length === 0) {
      rows.push({
        key: `empty-${block.id ?? bi}`,
        name:
          (block as { set_name?: string }).set_name ||
          String(block.set_type || "Block"),
        setsReps: "—",
      });
      return;
    }
    exs.forEach(
      (
        ex: {
          exercise?: { name?: string };
          exercise_id?: string;
          sets?: number;
          reps?: string | number;
          speed_sets?: WorkoutSpeedSet[];
          endurance_sets?: WorkoutEnduranceSet[];
        },
        ei: number,
      ) => {
        const name = ex.exercise?.name || "Exercise";
        const sets = ex.sets ?? block.total_sets ?? "—";
        const reps = ex.reps ?? block.reps_per_set ?? "—";
        let setsReps: string;
        if (setType === "speed_work") {
          const sp = formatSpeedPrescriptionRow(ex.speed_sets?.[0]);
          setsReps = sp ?? `${sets} × ${reps}`;
        } else if (setType === "endurance") {
          const ep = formatEndurancePrescriptionRow(ex.endurance_sets?.[0]);
          setsReps = ep ?? `${sets} × ${reps}`;
        } else {
          setsReps = `${sets} × ${reps}`;
        }
        rows.push({
          key: `${block.id}-${ex.exercise_id ?? ei}-${ei}`,
          name,
          setsReps,
        });
      },
    );
  });
  return rows;
}

export default function WorkoutTemplateDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const templateId = useMemo(() => String(params?.id || ""), [params]);
  const { getSemanticColor, performanceSettings } = useTheme();
  const { user, loading: authLoading } = useAuth();

  // Load exercises for name lookup
  const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
  const [workoutBlocks, setWorkoutBlocks] = useState<WorkoutBlock[]>([]);
  const [exerciseCount, setExerciseCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return getSemanticColor("success").primary;
      case "intermediate":
        return getSemanticColor("warning").primary;
      case "advanced":
        return getSemanticColor("critical").primary;
      default:
        return getSemanticColor("neutral").primary;
    }
  };

  // Reset state when templateId changes or component mounts
  useEffect(() => {
    if (templateId) {
      setLoading(true);
      setTemplate(null);
      setWorkoutBlocks([]);
      setExerciseCount(0);
      setError(null);
    }
  }, [templateId]);

  const templateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!authLoading && templateId && user?.id) {
      if (templateTimeoutRef.current) clearTimeout(templateTimeoutRef.current);
      templateTimeoutRef.current = setTimeout(() => {
        templateTimeoutRef.current = null;
        setLoading(false);
      }, 20_000);
      Promise.all([loadTemplate(), loadWorkoutBlocks()]).finally(() => {
        if (templateTimeoutRef.current) {
          clearTimeout(templateTimeoutRef.current);
          templateTimeoutRef.current = null;
        }
      });
      return () => {
        if (templateTimeoutRef.current) {
          clearTimeout(templateTimeoutRef.current);
          templateTimeoutRef.current = null;
        }
      };
    }
    if (!authLoading && templateId && !user?.id) {
      setError("User not authenticated");
      setLoading(false);
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [templateId, authLoading, user]);

  const loadTemplate = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      setError(null);

      // Use efficient single-template fetch; skip exercise count (we derive it from blocks below)
      const found = await WorkoutTemplateService.getWorkoutTemplateById(templateId, { skipExerciseCount: true });
      if (found) {
        setTemplate(found);
      } else {
        setError("Template not found");
      }
    } catch (error: any) {
      console.error("Error loading template:", error);
      setError(error?.message || "Failed to load template");
    } finally {
      setLoading(false);
    }
  };

  const loadWorkoutBlocks = async () => {
    try {
      const blocks = await WorkoutBlockService.getWorkoutBlocks(templateId);
      setWorkoutBlocks(blocks || []);
      setExerciseCount(WorkoutBlockService.countExercisesFromBlocks(blocks || []));
    } catch (error: any) {
      console.error("Error loading workout blocks:", error);
      setWorkoutBlocks([]);
    }
  };

  const handleDuplicate = async () => {
    if (!template) return;
    try {
      const dup = await WorkoutTemplateService.duplicateWorkoutTemplate(
        template.id,
        `${template.name} (Copy)`
      );
      if (dup) {
        router.push(`/coach/workouts/templates/${dup.id}`);
      }
    } catch (error) {
      console.error("Error duplicating template:", error);
      addToast({ title: "Couldn't duplicate template", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!template) return;
    if (
      !confirm(
        `Are you sure you want to delete "${template.name}"? This action cannot be undone.`
      )
    )
      return;

    try {
      await WorkoutTemplateService.deleteWorkoutTemplate(template.id);
      router.push("/coach/workouts/templates");
    } catch (error) {
      console.error("Error deleting template:", error);
      addToast({ title: "Couldn't delete template", variant: "destructive" });
    }
  };

  if (authLoading || loading) {
    return (
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="animate-pulse space-y-6">
              <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6">
                <div className="h-8 rounded mb-4 bg-[color:var(--fc-glass-highlight)]"></div>
                <div className="h-4 rounded w-2/3 bg-[color:var(--fc-glass-highlight)]"></div>
              </div>
            </div>
          </div>
        </div>
      </AnimatedBackground>
    );
  }

  if (error || !template) {
    return (
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 flex items-center justify-center p-4">
          <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-8 max-w-md text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{
                background: `${getSemanticColor("critical").primary}20`,
              }}
            >
              <Dumbbell
                className="w-8 h-8"
                style={{ color: getSemanticColor("critical").primary }}
              />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-[color:var(--fc-text-primary)]">
              {error || "Template not found"}
            </h2>
            <p className="text-sm mb-6 text-[color:var(--fc-text-dim)]">
              {error
                ? "There was an error loading this template. Please try again."
                : "The template you're looking for doesn't exist or you don't have access to it."}
            </p>
            <Link href="/coach/workouts/templates">
              <Button className="fc-btn fc-btn-primary">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Templates
              </Button>
            </Link>
          </div>
        </div>
      </AnimatedBackground>
    );
  }

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <div className="relative z-10 p-4 sm:p-6 pt-4">
        <div className="max-w-5xl mx-auto space-y-4">
          <nav className="flex min-h-12 flex-wrap items-center justify-between gap-2">
            <Link
              href="/coach/workouts/templates"
              className="inline-flex items-center gap-1.5 text-sm font-medium fc-text-dim hover:fc-text-primary"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              Templates
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="fc-ghost"
                size="sm"
                className="h-9"
                onClick={handleDuplicate}
              >
                <CopyIcon className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Duplicate</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 fc-btn border-red-500/30 text-red-500 hover:bg-red-500/10"
                onClick={handleDelete}
              >
                <Trash2 className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Delete</span>
              </Button>
              <Link href={`/coach/workouts/templates/${template.id}/edit`}>
                <Button size="sm" className="fc-btn fc-btn-primary h-9 font-semibold">
                  <Edit className="w-4 h-4 sm:mr-1" />
                  Edit
                </Button>
              </Link>
            </div>
          </nav>

          <header className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              <span
                className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                style={{
                  background: `${getSemanticColor("trust").primary}20`,
                  color: getSemanticColor("trust").primary,
                  borderColor: `${getSemanticColor("trust").primary}40`,
                }}
              >
                {template.category || "General"}
              </span>
              <span
                className="rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize"
                style={{
                  background: `${getDifficultyColor(template.difficulty_level)}20`,
                  color: getDifficultyColor(template.difficulty_level),
                  borderColor: `${getDifficultyColor(template.difficulty_level)}40`,
                }}
              >
                {template.difficulty_level}
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight fc-text-primary sm:text-2xl">
              {template.name}
            </h1>
            {template.description && (
              <p className="max-w-2xl text-sm leading-snug fc-text-dim line-clamp-3">
                {template.description}
              </p>
            )}
          </header>

          <p className="text-sm text-gray-400">
            {template.estimated_duration ?? 0} min · {exerciseCount} exercise
            {exerciseCount !== 1 ? "s" : ""} · {template.usage_count ?? 0}{" "}
            assignment{(template.usage_count ?? 0) !== 1 ? "s" : ""}
            {template.rating != null
              ? ` · ${Number(template.rating).toFixed(1)}/5`
              : ""}
          </p>

          <section>
            <div className="flex items-center justify-between border-b border-[color:var(--fc-glass-border)]/40 pb-2">
              <h2 className="text-sm font-semibold fc-text-primary">Exercises</h2>
              <span className="font-mono text-xs text-gray-400">
                {exerciseCount}
              </span>
            </div>

            {workoutBlocks.length > 0 ? (
              <div className="divide-y divide-[color:var(--fc-glass-border)]/40 border-b border-[color:var(--fc-glass-border)]/40">
                {flatExerciseRowsFromBlocks(workoutBlocks).map((row) => (
                  <div
                    key={row.key}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium fc-text-primary">
                      {row.name}
                    </span>
                    <span className="shrink-0 tabular-nums text-gray-400">
                      {row.setsReps}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Dumbbell}
                title="No exercises yet"
                description="Add exercises to this template to get started."
                actionLabel="Add exercises"
                actionHref={`/coach/workouts/templates/${template.id}/edit`}
              />
            )}
          </section>
        </div>
      </div>
    </AnimatedBackground>
  );
}
