"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { AppCard } from "@/components/ui/AppCard";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronRight, Eye } from "lucide-react";

export interface WorkoutLogCardLog {
  id: string;
  workoutName: string;
  totalSets: number;
  totalWeight: number;
  total_duration_minutes?: number | null;
  started_at: string;
  completed_at: string | null;
  workout_set_logs: Array<{
    weight?: number | null;
    reps?: number | null;
    exercises?: { id: string; name?: string | null } | null;
  }>;
}

interface WorkoutLogCardProps {
  log: WorkoutLogCardLog;
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getExerciseNames(log: WorkoutLogCardLog, maxNames = 4): string {
  const names = [
    ...new Set(
      (log.workout_set_logs || [])
        .map((s) => s.exercises?.name)
        .filter((n): n is string => Boolean(n))
    ),
  ];
  const slice = names.slice(0, maxNames);
  const joined = slice.join(" · ");
  if (names.length > maxNames) return `${joined}...`;
  return joined;
}

export function WorkoutLogCard({ log }: WorkoutLogCardProps) {
  const router = useRouter();
  const workoutName = log.workoutName || "Workout";
  const completedDate = log.completed_at
    ? new Date(log.completed_at)
    : new Date(log.started_at);

  let duration: number | null = null;
  if (log.total_duration_minutes != null) {
    duration = Math.round(log.total_duration_minutes);
  } else if (log.completed_at && log.started_at) {
    const started = new Date(log.started_at);
    const completed = new Date(log.completed_at);
    duration = Math.round((completed.getTime() - started.getTime()) / 60000);
  }

  const volumeKg = Math.round(log.totalWeight);
  const detailUrl = `/client/progress/workout-logs/${log.id}`;
  const subtitlePills = (
    <div className="flex flex-wrap items-center gap-1.5">
      {duration != null && (
        <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-[color:var(--fc-surface-sunken)] border border-[color:var(--fc-surface-card-border)] text-[color:var(--fc-text-primary)]">
          {duration} min
        </span>
      )}
      <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-[color:var(--fc-surface-sunken)] border border-[color:var(--fc-surface-card-border)] text-[color:var(--fc-text-primary)]">
        {log.totalSets} sets
      </span>
      <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-[color:var(--fc-surface-sunken)] border border-[color:var(--fc-surface-card-border)] text-[color:var(--fc-text-primary)]">
        {volumeKg.toLocaleString()} kg total
      </span>
    </div>
  );

  const exercisePreview = getExerciseNames(log);

  return (
    <AppCard
      variant="client"
      accentColor="var(--fc-domain-workouts)"
      eyebrow={formatDateLabel(completedDate)}
      title={workoutName}
      subtitle={subtitlePills}
      onClick={() => router.push(detailUrl)}
      actions={
        <Link
          href={detailUrl}
          className="ml-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            size="sm"
            className="rounded-xl bg-[color:var(--fc-surface-card)] border border-[color:var(--fc-surface-card-border)] text-[color:var(--fc-text-primary)] hover:bg-[color:var(--fc-surface-elevated)] hover:border-[color:var(--fc-glass-border-strong)] fc-press"
          >
            <Eye className="w-4 h-4 mr-1.5" />
            View
            <ChevronRight className="w-4 h-4" />
          </Button>
        </Link>
      }
    >
      {exercisePreview && (
        <p className="text-sm text-[color:var(--fc-text-dim)] line-clamp-2">
          {exercisePreview}
        </p>
      )}
    </AppCard>
  );
}
