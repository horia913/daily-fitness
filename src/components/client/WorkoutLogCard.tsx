"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import ps from "@/components/client/progress-suite/progressSuiteV1.module.css";
import { cn } from "@/lib/utils";

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

function getExerciseNames(log: WorkoutLogCardLog, maxNames = 3): string {
  const names = [
    ...new Set(
      (log.workout_set_logs || [])
        .map((s) => s.exercises?.name)
        .filter((n): n is string => Boolean(n)),
    ),
  ];
  const slice = names.slice(0, maxNames);
  const joined = slice.join(" · ");
  if (names.length > maxNames) return `${joined}…`;
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
  const exercisePreview = getExerciseNames(log);
  const hasLoggedSets = log.totalSets > 0;

  const dayName = completedDate.toLocaleDateString("en-US", { weekday: "short" });
  const dayNum = completedDate.getDate();
  const monthAbbr = completedDate.toLocaleDateString("en-US", { month: "short" });

  const boldIf = (cond: boolean, content: React.ReactNode) => (
    <span style={{ fontWeight: cond ? 500 : 400, color: cond ? "var(--ps-t1)" : "var(--ps-t3)" }}>{content}</span>
  );

  return (
    <button
      type="button"
      onClick={() => router.push(detailUrl)}
      className={ps.psLogRow}
    >
      <span
        className={cn(ps.psLogStripe, !hasLoggedSets && ps.psLogStripeMuted)}
        aria-hidden
      />
      <div className={ps.psLogDateCol}>
        <span className={cn(ps.psFontMono, "text-[9px] uppercase")} style={{ color: "var(--ps-t3)", letterSpacing: "0.1em" }}>
          {dayName}
        </span>
        <span className={cn(ps.psFontDisplay, "text-xl font-bold leading-none tabular-nums")} style={{ color: "var(--ps-t1)" }}>
          {dayNum}
        </span>
        <span className={cn(ps.psFontMono, "text-[9px] uppercase")} style={{ color: "var(--ps-t3)", letterSpacing: "0.1em" }}>
          {monthAbbr}
        </span>
      </div>
      <div className={ps.psLogInfo}>
        <p
          className={cn(ps.psFontBody, "truncate text-[13px] font-semibold leading-tight")}
          style={{ color: "var(--ps-t1)", fontWeight: hasLoggedSets ? 600 : 500 }}
        >
          {workoutName}
        </p>
        <p
          className={cn(ps.psFontMono, "text-[9.5px] leading-snug")}
          style={{ color: "var(--ps-t3)", letterSpacing: "0.04em" }}
        >
          {boldIf(log.totalSets > 0, `${log.totalSets} sets`)}
          <span style={{ color: "var(--ps-t4)" }}> · </span>
          {boldIf(volumeKg > 0, `${volumeKg.toLocaleString()} kg`)}
          <span style={{ color: "var(--ps-t4)" }}> · </span>
          {boldIf(duration != null && duration > 0, duration != null && duration > 0 ? `${duration} min` : "0 min")}
        </p>
        {exercisePreview && hasLoggedSets ? (
          <p
            className={cn(ps.psFontBody, "line-clamp-1 text-[10.5px] leading-snug")}
            style={{ color: "var(--ps-t3)", marginTop: 2 }}
          >
            {exercisePreview}
          </p>
        ) : null}
      </div>
      <ChevronRight
        className={cn(ps.psNavChevron, "h-[14px] w-[14px] self-center")}
        aria-hidden
      />
    </button>
  );
}
