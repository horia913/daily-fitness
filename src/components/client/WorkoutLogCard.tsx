"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Calendar, ChevronRight } from "lucide-react";

export interface WorkoutLogCardLog {
  id: string;
  workoutName: string;
  totalSets: number;
  totalWeight: number;
  total_duration_minutes?: number | null;
  started_at: string;
  completed_at: string | null;
  overall_difficulty_rating?: number | null;
  programContext?: { dayNumber: number; programName: string } | null;
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
        .filter((n): n is string => Boolean(n)),
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
  const rating = log.overall_difficulty_rating;
  const exercisePreview = getExerciseNames(log);

  const statsLine = [
    log.programContext ? `Day ${log.programContext.dayNumber}` : null,
    duration != null ? `${duration} min` : null,
    `${log.totalSets} sets`,
    `${volumeKg.toLocaleString()} kg`,
    rating != null && rating > 0 ? `${rating}/5` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      type="button"
      onClick={() => router.push(detailUrl)}
      className="flex w-full min-h-[52px] items-center gap-3 py-3 pl-3 pr-1 text-left transition-colors hover:bg-white/[0.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500/50 border-l-2 border-l-[color:var(--fc-domain-workouts)] sm:pl-4"
    >
      <Calendar
        className="h-4 w-4 shrink-0 text-[color:var(--fc-text-dim)]"
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-[color:var(--fc-text-dim)]">
          {formatDateLabel(completedDate)}
        </p>
        <p className="truncate text-sm font-semibold text-[color:var(--fc-text-primary)]">
          {workoutName}
        </p>
        <p className="mt-0.5 text-xs text-[color:var(--fc-text-dim)]">{statsLine}</p>
        {exercisePreview ? (
          <p className="mt-1 line-clamp-1 text-xs text-[color:var(--fc-text-dim)]">
            {exercisePreview}
          </p>
        ) : null}
      </div>
      <ChevronRight
        className="h-5 w-5 shrink-0 text-[color:var(--fc-text-dim)]"
        aria-hidden
      />
    </button>
  );
}
