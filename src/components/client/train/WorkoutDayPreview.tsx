"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { ClientGlassCard } from "@/components/client-ui";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Play,
  Loader2,
  Coffee,
  ChevronLeft,
  FileText,
} from "lucide-react";
import type { ProgramWeekDayCard } from "@/lib/programWeekStateBuilder";
import type { WorkoutSetEntry } from "@/types/workoutSetEntries";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { getExerciseVisuals } from "@/lib/exerciseIconMap";

const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const SET_TYPE_LABELS: Record<string, string> = {
  straight_set: "Straight Set",
  superset: "Superset",
  giant_set: "Giant Set",
  drop_set: "Drop Set",
  cluster_set: "Cluster Set",
  rest_pause: "Rest Pause",
  pre_exhaustion: "Pre-Exhaustion",
  amrap: "AMRAP",
  emom: "EMOM",
  tabata: "Tabata",
  for_time: "For Time",
  speed_work: "Speed Work",
  endurance: "Endurance",
};

export type PreviewDayStatus = "today" | "completed" | "missed" | "upcoming" | "rest";

export interface WorkoutDayPreviewProps {
  day: ProgramWeekDayCard | null;
  status: PreviewDayStatus;
  templateId: string | null;
  workoutName: string;
  dayLabel: string;
  estimatedDuration: number;
  scheduleId: string | null;
  onStartWorkout: (scheduleId: string) => void;
  onClose?: () => void;
  isStarting: boolean;
  startingScheduleId: string | null;
  clientId: string | undefined;
  /** Optional prefetched blocks from parent; hollow/empty entries trigger a full fetch in the preview. */
  blocks?: WorkoutSetEntry[] | null;
  /** Optional count from schedule RPC — used as footer fallback when block.exercises is not hydrated yet. */
  exerciseCount?: number;
}

export function WorkoutDayPreview({
  day,
  status,
  templateId,
  workoutName,
  dayLabel,
  estimatedDuration,
  scheduleId,
  onStartWorkout,
  onClose,
  isStarting,
  startingScheduleId,
  clientId,
  blocks: blocksProp,
  exerciseCount: exerciseCountProp,
}: WorkoutDayPreviewProps) {
  const [blocks, setBlocks] = useState<WorkoutSetEntry[] | null>(() =>
    blocksProp !== undefined && Array.isArray(blocksProp) ? blocksProp : null
  );
  const [loading, setLoading] = useState(() => {
    if (!templateId || status === "rest") return false;
    // Parent has not passed prefetched blocks yet (e.g. train page remount after workout) — effect will load.
    if (blocksProp === undefined) return true;
    const arr = Array.isArray(blocksProp) ? blocksProp : null;
    const sum =
      arr?.reduce((s, b) => s + (b.exercises?.length ?? 0), 0) ?? 0;
    const unusable =
      !arr ||
      arr.length === 0 ||
      (arr.length > 0 && sum === 0);
    return !!(templateId && unusable);
  });
  const [error, setError] = useState<string | null>(null);
  const [workoutLogId, setWorkoutLogId] = useState<string | null>(null);

  const exerciseCountRef = useRef(exerciseCountProp);
  exerciseCountRef.current = exerciseCountProp;

  const sumPreviewExercises = (arr: WorkoutSetEntry[] | null | undefined) =>
    (arr ?? []).reduce((s, b) => s + (b.exercises?.length ?? 0), 0);

  const loadBlocks = useCallback(async () => {
    if (!templateId) {
      setBlocks(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { WorkoutBlockService, WorkoutSetEntryService } = await import(
        "@/lib/workoutBlockService"
      );
      let data = await WorkoutBlockService.getWorkoutBlocks(templateId);
      const rpcCount = exerciseCountRef.current;
      if (
        data &&
        data.length > 0 &&
        sumPreviewExercises(data) === 0 &&
        typeof rpcCount === "number" &&
        rpcCount > 0
      ) {
        WorkoutSetEntryService.clearBlocksCacheForTemplates([templateId]);
        await new Promise((r) => setTimeout(r, 350));
        data = await WorkoutBlockService.getWorkoutBlocks(templateId);
      }
      setBlocks(data ?? []);
    } catch (e) {
      console.error("[WorkoutDayPreview] loadBlocks failed:", e);
      setError("Couldn't load workout details");
      setBlocks(null);
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  // Use preloaded blocks when they include exercises; empty / "hollow" lite prefetch refetches full blocks once.
  useEffect(() => {
    if (status === "rest" || !templateId) {
      setBlocks(null);
      setLoading(false);
      setError(null);
      return;
    }
    if (blocksProp !== undefined) {
      const arr = Array.isArray(blocksProp) ? blocksProp : null;
      const sumExerciseRows =
        arr?.reduce((s, b) => s + (b.exercises?.length ?? 0), 0) ?? 0;
      const unusable =
        !arr ||
        arr.length === 0 ||
        (arr.length > 0 && sumExerciseRows === 0);
      if (unusable) {
        void loadBlocks();
        return;
      }
      setBlocks(arr);
      setLoading(false);
      setError(null);
      return;
    }
    // blocksProp undefined: do not use exerciseCount-only placeholder — that breaks after navigate-back
    // when prefetch Map is empty but RPC still returns a count. Always load full blocks when we have templateId.
    void loadBlocks();
  }, [templateId, status, loadBlocks, blocksProp]);

  // Fetch workout log id for completed days (View Log link)
  useEffect(() => {
    if (status !== "completed" || !scheduleId || !clientId) {
      setWorkoutLogId(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("workout_logs")
          .select("id")
          .eq("client_id", clientId)
          .eq("program_schedule_id", scheduleId)
          .not("completed_at", "is", null)
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!cancelled && data?.id) setWorkoutLogId(data.id);
      } catch {
        if (!cancelled) setWorkoutLogId(null);
      }
    })();
    return () => { cancelled = true; };
  }, [status, scheduleId, clientId]);

  const sumBlockExercises =
    blocks?.reduce((sum, b) => sum + (b.exercises?.length ?? 0), 0) ?? 0;
  const totalExercises =
    sumBlockExercises > 0
      ? sumBlockExercises
      : typeof exerciseCountProp === "number"
        ? exerciseCountProp
        : 0;
  const canStart = scheduleId && status !== "rest" && status !== "completed";
  const isStartingThis = isStarting && startingScheduleId === scheduleId;

  /** Solid surface so content stays readable over the page gradient (avoid heavy /50 glass fills). */
  const cardClass = cn(
    "rounded-xl overflow-hidden transition-colors",
    "bg-[color:var(--fc-glass-base)] backdrop-blur-none shadow-lg",
    (status === "today" || status === "upcoming") && "border-l-2 border-cyan-500",
    status === "completed" && "border-l-4 border-emerald-500/80",
    status === "missed" && "border-l-4 border-amber-500/80",
    status === "upcoming" && "ring-1 ring-white/5",
    status === "rest" && "bg-[color:var(--fc-surface-sunken)]"
  );

  if (status === "rest") {
    return (
      <ClientGlassCard className={cn("p-6", cardClass)}>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 text-sm fc-text-dim hover:fc-text-primary mb-4"
            aria-label="Back"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
        )}
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center bg-[color:var(--fc-glass-highlight)] mb-4">
            <Coffee className="w-7 h-7 fc-text-dim" />
          </div>
          <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-lg bg-[color:var(--fc-glass-highlight)] fc-text-dim mb-2">
            Rest Day
          </span>
          <p className="text-base font-semibold fc-text-primary mb-1">Rest Day</p>
          <p className="text-sm fc-text-dim">Recovery is when the magic happens. Stay hydrated, stretch, and come back stronger.</p>
        </div>
      </ClientGlassCard>
    );
  }

  return (
    <ClientGlassCard className={cn("p-6", cardClass)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0 flex-1">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 text-sm fc-text-dim hover:fc-text-primary mb-2"
              aria-label="Back"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}
          <p className="text-xs fc-text-dim mb-0.5">{dayLabel}</p>
          <h3 className="text-lg font-bold fc-text-primary truncate">{workoutName}</h3>
          <div className="flex items-center gap-2 mt-2">
            <StatusBadge status={status} />
          </div>
        </div>
      </div>

      {/* Content: loading / error / exercise list */}
      <div className="min-h-[120px] max-h-[320px] overflow-y-auto">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        )}
        {error && !loading && (
          <div className="py-6 text-center">
            <p className="text-sm fc-text-dim mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={loadBlocks}>
              Retry
            </Button>
          </div>
        )}
        {!loading && !error && blocks && blocks.length > 0 && (
          <ul className="space-y-4">
            {blocks.map((block) => (
              <li key={block.id} className="space-y-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider fc-text-dim">
                  {SET_TYPE_LABELS[block.set_type] ?? block.set_type}
                </span>
                {(block.exercises ?? []).map((ex) => {
                  const sets = ex.sets ?? block.total_sets ?? 0;
                  const reps = ex.reps ?? block.reps_per_set ?? "—";
                  const weight = ex.weight_kg != null ? ` · ${ex.weight_kg} kg` : "";
                  const rest = (ex.rest_seconds ?? block.rest_seconds) != null
                    ? ` · ${(ex.rest_seconds ?? block.rest_seconds)}s rest`
                    : "";
                  const { Icon: ExIcon, color: exColor } = getExerciseVisuals({
                    category: undefined,
                    primaryMuscleGroup: ex.exercise?.primary_muscle_group ?? undefined,
                  });
                  return (
                    <div
                      key={ex.id}
                      className="flex items-center gap-3 py-2 border-b border-[color:var(--fc-glass-border)] last:border-0"
                    >
                      <div
                        className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{ background: `${exColor}18` }}
                      >
                        <ExIcon className="w-3.5 h-3.5" style={{ color: exColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium fc-text-primary truncate block">
                          {ex.exercise_letter ? `${ex.exercise_letter}. ` : ""}
                          {ex.exercise?.name ?? "Exercise"}
                        </span>
                        <span className="fc-text-dim text-xs">
                          {sets} × {reps}{weight}{rest}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </li>
            ))}
          </ul>
        )}
        {!loading && !error && blocks && blocks.length === 0 && (
          <p className="text-sm fc-text-dim py-4 text-center">No exercises in this workout.</p>
        )}
        {!loading && !error && !blocks && exerciseCountProp !== undefined && (
          <p className="text-sm fc-text-dim py-4 text-center">
            {totalExercises} exercise{totalExercises !== 1 ? "s" : ""} · ~{estimatedDuration || 45} min — tap Start to begin
          </p>
        )}
      </div>

      {/* Footer */}
      {!loading && !error && status !== "completed" && (
        <p className="text-xs fc-text-dim mt-3">
          {totalExercises} exercise{totalExercises !== 1 ? "s" : ""} · ~{estimatedDuration || 45} min
        </p>
      )}
      {status === "completed" && workoutLogId && (
        <a
          href={`/client/progress/workout-logs/${workoutLogId}`}
          className="inline-flex items-center gap-1.5 text-sm text-[color:var(--fc-accent-cyan)] hover:underline mt-3"
        >
          <FileText className="w-4 h-4" />
          View Log
        </a>
      )}

      {/* Action buttons */}
      <div className="mt-6 flex flex-col gap-2">
        {status === "today" && canStart && (
          <Button
            onClick={() => scheduleId && onStartWorkout(scheduleId)}
            disabled={isStartingThis}
            variant="fc-primary"
            className="w-full h-12 rounded-xl font-bold uppercase tracking-wider shadow-lg shadow-cyan-500/25"
          >
            {isStartingThis ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                Start Workout
              </>
            )}
          </Button>
        )}
        {status === "upcoming" && canStart && (
          <Button
            onClick={() => scheduleId && onStartWorkout(scheduleId)}
            disabled={isStartingThis}
            variant="fc-primary"
            className="w-full h-12 rounded-xl font-bold"
          >
            {isStartingThis ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                Start Workout
              </>
            )}
          </Button>
        )}
        {status === "missed" && canStart && (
          <Button
            variant="outline"
            onClick={() => scheduleId && onStartWorkout(scheduleId)}
            disabled={isStartingThis}
            className="w-full h-12 rounded-xl font-semibold border-2 border-amber-500 text-amber-700 dark:text-amber-400 dark:border-amber-400"
          >
            {isStartingThis ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Starting...
              </>
            ) : (
              "Start Missed Workout"
            )}
          </Button>
        )}
      </div>
    </ClientGlassCard>
  );
}

function StatusBadge({ status }: { status: PreviewDayStatus }) {
  if (status === "rest") return null;
  const config = {
    today: { label: "Today", className: "bg-[color:var(--fc-accent-cyan)]/20 text-[color:var(--fc-accent-cyan)]" },
    completed: { label: "Completed", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    missed: { label: "Missed", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    upcoming: { label: "Upcoming", className: "bg-[color:var(--fc-glass-highlight)] fc-text-dim" },
  }[status];
  return (
    <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-lg", config.className)}>
      {config.label}
    </span>
  );
}
