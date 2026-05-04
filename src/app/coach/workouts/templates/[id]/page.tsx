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
import { CoachPageShell } from "@/components/coach-ui/CoachPageShell";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import {
  Dumbbell,
  Edit,
  ArrowLeft,
  Copy as CopyIcon,
  Trash2,
  FileQuestion,
} from "lucide-react";
import Link from "next/link";
import { WorkoutBlockService } from "@/lib/workoutBlockService";
import { WorkoutBlock } from "@/types/workoutBlocks";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/toast-provider";
import type {
  WorkoutSpeedSet,
  WorkoutEnduranceSet,
  WorkoutTimeProtocol,
} from "@/types/workoutSetEntries";
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

function blockTypeBadgeLabel(setType: string): string {
  const labels: Record<string, string> = {
    straight_set: "STRAIGHT SET",
    superset: "SUPERSET",
    giant_set: "GIANT SET",
    drop_set: "DROP SET",
    cluster_set: "CLUSTER SET",
    rest_pause: "REST-PAUSE",
    pre_exhaustion: "PRE-EXHAUSTION",
    amrap: "AMRAP",
    emom: "EMOM",
    for_time: "FOR-TIME",
    tabata: "TABATA",
    speed_work: "SPEED WORK",
    endurance: "ENDURANCE",
  };
  return labels[setType] ?? setType.replace(/_/g, " ").toUpperCase();
}

function displayExerciseName(ex: {
  exercise?: { name?: string | null } | null;
  exercise_order?: number | null;
}): string {
  return ex.exercise?.name?.trim() || `Exercise ${ex.exercise_order ?? ""}`.trim();
}

function displayReps(
  reps: string | number | null | undefined,
  fallback: string | number | null | undefined,
): string {
  const val = reps ?? fallback;
  if (val == null || String(val).trim() === "") return "—";
  return String(val);
}

function blockPrimaryLine(block: WorkoutBlock): string {
  const setType = String(block.set_type || "straight_set");
  const exercises = (block.exercises ?? []).slice().sort((a, b) => {
    const ao = a.exercise_order ?? 0;
    const bo = b.exercise_order ?? 0;
    return ao - bo;
  });
  const first = exercises[0];
  const second = exercises[1];
  const tp = (block.time_protocols?.[0] ?? null) as WorkoutTimeProtocol | null;

  switch (setType) {
    case "superset": {
      const a = first
        ? `A: ${displayExerciseName(first)} ${displayReps(first.reps, block.reps_per_set)} reps`
        : "A: —";
      const b = second
        ? `B: ${displayExerciseName(second)} ${displayReps(second.reps, block.reps_per_set)} reps`
        : "B: —";
      return `${a}, ${b}`;
    }
    case "giant_set": {
      const parts = exercises.map((ex, i) => {
        const letter = String.fromCharCode(65 + i);
        return `${letter}: ${displayExerciseName(ex)} × ${displayReps(ex.reps, block.reps_per_set)}`;
      });
      return parts.join(", ");
    }
    case "drop_set": {
      const ex = first;
      const exName = ex ? displayExerciseName(ex) : "Exercise";
      const mainReps = displayReps(ex?.reps, block.reps_per_set);
      const firstDrop = ex?.drop_sets?.slice().sort((a, b) => (a.drop_order ?? 0) - (b.drop_order ?? 0))[0];
      const dropReps = firstDrop?.reps ? `${firstDrop.reps}` : "—";
      const dropPct =
        firstDrop?.drop_percentage != null ? `${firstDrop.drop_percentage}% drop` : "drop set";
      return `${exName} ${mainReps} reps → ${dropReps} reps (${dropPct})`;
    }
    case "cluster_set": {
      const ex = first;
      const exName = ex ? displayExerciseName(ex) : "Exercise";
      const cfg = ex?.cluster_sets?.[0];
      const clusters = cfg?.clusters_per_set ?? block.total_sets ?? "—";
      const repsPerCluster = cfg?.reps_per_cluster ?? ex?.reps ?? block.reps_per_set ?? "—";
      const intraRest = cfg?.intra_cluster_rest ?? "—";
      return `${exName} ${clusters} × ${repsPerCluster} (intra-cluster rest ${intraRest}s)`;
    }
    case "rest_pause": {
      const ex = first;
      const exName = ex ? displayExerciseName(ex) : "Exercise";
      const reps = displayReps(ex?.reps, block.reps_per_set);
      const rp = ex?.rest_pause_sets?.[0];
      const pauses = rp?.max_rest_pauses ?? "—";
      const rpDur = rp?.rest_pause_duration ?? "—";
      return `${exName} ${reps} reps + up to ${pauses} rest-pauses of ${rpDur}s`;
    }
    case "pre_exhaustion": {
      const a = first
        ? `A: ${displayExerciseName(first)} × ${displayReps(first.reps, block.reps_per_set)}`
        : "A: —";
      const b = second
        ? `B: ${displayExerciseName(second)} × ${displayReps(second.reps, block.reps_per_set)}`
        : "B: —";
      return `${a} → ${b}`;
    }
    case "amrap": {
      const exName = first ? displayExerciseName(first) : "Exercise";
      const mins =
        (tp?.total_duration_minutes ?? Math.round((block.duration_seconds ?? 0) / 60)) || "—";
      const target = tp?.target_reps ?? first?.reps ?? "—";
      return `${exName} — AMRAP ${mins} min, target ${target} reps`;
    }
    case "emom": {
      const exName = first ? displayExerciseName(first) : "Exercise";
      const mins =
        (tp?.total_duration_minutes ?? Math.round((block.duration_seconds ?? 0) / 60)) || "—";
      const reps = tp?.reps_per_round ?? first?.reps ?? "—";
      return `${exName} — ${mins} minutes × ${reps} reps`;
    }
    case "for_time": {
      const exName = first ? displayExerciseName(first) : "Exercise";
      const target = tp?.target_reps ?? first?.reps ?? "—";
      const cap = tp?.time_cap_minutes ?? "—";
      return `${exName} — ${target} reps for time (cap ${cap} min)`;
    }
    case "tabata": {
      const rounds = tp?.rounds ?? "8";
      const work = tp?.work_seconds ?? "20";
      const rest = tp?.rest_seconds ?? "10";
      return `${rounds} rounds × ${work}s on / ${rest}s off`;
    }
    case "speed_work": {
      const summary = formatSpeedPrescriptionRow(first?.speed_sets?.[0]);
      return summary ?? "Speed work";
    }
    case "endurance": {
      const summary = formatEndurancePrescriptionRow(first?.endurance_sets?.[0]);
      return summary ?? "Endurance block";
    }
    case "straight_set":
    default: {
      const ex = first;
      const exName = ex ? displayExerciseName(ex) : "Exercise";
      const sets = ex?.sets ?? block.total_sets ?? "—";
      const reps = displayReps(ex?.reps, block.reps_per_set);
      const rpe = ex?.rir != null ? ` @ RPE ${ex.rir}` : "";
      const tempo = ex?.tempo ? `, tempo ${ex.tempo}` : "";
      return `${exName} ${sets} × ${reps}${rpe}${tempo}`;
    }
  }
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
      setLoading(true);
      templateTimeoutRef.current = setTimeout(() => {
        templateTimeoutRef.current = null;
        setLoading(false);
      }, 20_000);
      Promise.all([loadTemplate(), loadWorkoutBlocks()]).finally(() => {
        if (templateTimeoutRef.current) {
          clearTimeout(templateTimeoutRef.current);
          templateTimeoutRef.current = null;
        }
        setLoading(false);
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
        <CoachPageShell widthVariant="default-5xl" className="p-4 pb-32 sm:p-6">
          <PageSkeleton variant="list" />
        </CoachPageShell>
      </AnimatedBackground>
    );
  }

  if (error || !template) {
    return (
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <CoachPageShell widthVariant="default-5xl" className="p-4 pb-32 sm:p-6">
          <EmptyState
            icon={FileQuestion}
            title={error || "Template not found"}
            description={
              error
                ? "There was an error loading this template. Please try again."
                : "The template you're looking for doesn't exist or you don't have access to it."
            }
            action={{
              label: "Back to Templates",
              onClick: () => router.push("/coach/workouts/templates"),
            }}
          />
        </CoachPageShell>
      </AnimatedBackground>
    );
  }

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <CoachPageShell widthVariant="default-5xl" className="p-4 pb-32 sm:p-6">
        <div className="space-y-4">
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
                className="h-9 fc-btn border-[color-mix(in_srgb,var(--fc-status-error)_30%,transparent)] text-[color:var(--fc-status-error)] hover:bg-[color-mix(in_srgb,var(--fc-status-error)_10%,transparent)]"
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

          <p className="text-sm fc-text-dim">
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
              <span className="font-mono text-xs fc-text-dim">
                {exerciseCount}
              </span>
            </div>

            {workoutBlocks.length > 0 ? (
              <div className="space-y-2 border-b border-[color:var(--fc-glass-border)]/40 py-2">
                {workoutBlocks.map((block, idx) => (
                  <div
                    key={`${block.id}-${idx}`}
                    className="rounded-xl border border-[color:var(--fc-glass-border)]/40 bg-[color:var(--fc-glass-soft)]/30 px-3 py-2.5"
                  >
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-300">
                        {blockTypeBadgeLabel(String(block.set_type || ""))}
                      </span>
                      <span className="text-xs font-medium fc-text-dim">
                        Exercise {idx + 1}
                      </span>
                    </div>
                    <p className="text-sm leading-snug fc-text-primary">
                      {blockPrimaryLine(block)}
                    </p>
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
      </CoachPageShell>
    </AnimatedBackground>
  );
}
