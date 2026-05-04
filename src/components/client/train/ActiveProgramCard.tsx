"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, Loader2, Dumbbell, ChevronRight, PauseCircle, Moon } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Badge } from "@/components/ui/badge";
import { ProgramWeekState, type ProgramWeekDayCard } from "@/lib/programWeekStateBuilder";
import { TrainingBlockService } from "@/lib/trainingBlockService";
import { TrainingBlock, TRAINING_BLOCK_GOALS } from "@/types/trainingBlock";

interface ActiveProgramCardProps {
  programWeek: ProgramWeekState;
  /** Program-scoped this-week counts from `get_client_dashboard` (same as home). */
  weeklyProgress: { current: number; goal: number };
  onStartWorkout: (scheduleId: string) => void;
  /** When set, main CTA opens the day preview instead of starting directly */
  onSelectDay?: (day: ProgramWeekDayCard) => void;
  isStarting: boolean;
  startingScheduleId: string | null;
  exerciseCounts?: Map<string, number>; // templateId -> exercise count
}

/** Monday = 1 … Sunday = 7 (matches train page / RPC weekday indexing). */
function todayOrdinalInWeek(): number {
  return ((new Date().getDay() + 6) % 7) + 1;
}

function getCurrentBlock(
  blocks: TrainingBlock[],
  absoluteWeek: number,
): { block: TrainingBlock; weekWithinBlock: number } | null {
  let accumulated = 0;
  for (const block of blocks) {
    accumulated += block.duration_weeks;
    if (absoluteWeek <= accumulated) {
      const weekWithinBlock = absoluteWeek - (accumulated - block.duration_weeks);
      return { block, weekWithinBlock };
    }
  }
  return null;
}

export function ActiveProgramCard({
  programWeek,
  weeklyProgress,
  onStartWorkout,
  onSelectDay,
  isStarting,
  startingScheduleId,
  exerciseCounts,
}: ActiveProgramCardProps) {
  const {
    programId,
    programName,
    currentUnlockedWeek,
    currentWeekNumber,
    totalWeeks,
    days,
    todaySlot,
    isRestDay,
    pauseStatus,
    pauseReason,
  } = programWeek;

  const [trainingBlocks, setTrainingBlocks] = useState<TrainingBlock[]>([]);
  const cachedProgramIdRef = useRef<string | null>(null);
  const cachedBlocksRef = useRef<TrainingBlock[] | null>(null);
  const inFlightProgramIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (pauseStatus === "paused" || !programId) return;
    if (cachedProgramIdRef.current === programId && cachedBlocksRef.current) {
      setTrainingBlocks(cachedBlocksRef.current);
      return;
    }
    if (inFlightProgramIdRef.current === programId) return;
    inFlightProgramIdRef.current = programId;
    cachedProgramIdRef.current = programId;
    cachedBlocksRef.current = null;
    const requestedId = programId;
    TrainingBlockService.getTrainingBlocks(programId).then((data) => {
      inFlightProgramIdRef.current = null;
      const blocks = data ?? [];
      if (cachedProgramIdRef.current === requestedId) {
        cachedBlocksRef.current = blocks;
        setTrainingBlocks(blocks);
      }
    });
  }, [programId, pauseStatus]);

  if (pauseStatus === "paused") {
    return (
      <div className="mb-6 rounded-[22px] border border-amber-500/25 bg-[var(--fc-surface-card)] p-5 shadow-[var(--fc-shadow-card)]">
        <div className="flex items-start gap-3">
          <PauseCircle className="h-5 w-5 shrink-0 text-amber-400" aria-hidden />
          <div className="min-w-0 flex-1">
            <Eyebrow tone="warning" className="mb-2">
              Program paused
            </Eyebrow>
            <p className="mt-2 text-sm text-white">
              Your coach has paused your program
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Training will resume when your coach unpauses
            </p>
            {pauseReason ? (
              <p className="mt-2 text-xs italic text-gray-400">&ldquo;{pauseReason}&rdquo;</p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  const blockInfo = trainingBlocks.length > 0
    ? getCurrentBlock(trainingBlocks, currentUnlockedWeek)
    : null;

  const safeGoal = Math.max(0, Math.floor(Number(weeklyProgress.goal) || 0));
  const safeCurrent = Math.max(0, Math.floor(Number(weeklyProgress.current) || 0));
  const weekPct =
    safeGoal > 0 ? Math.min(100, Math.round((safeCurrent / safeGoal) * 100)) : 0;

  const nextWorkout = (todaySlot && !todaySlot.isCompleted)
    ? todaySlot
    : days.find((d) => !d.isCompleted);

  const exerciseCount = nextWorkout && exerciseCounts
    ? exerciseCounts.get(nextWorkout.templateId) || 0
    : 0;

  const handleStart = () => {
    if (!nextWorkout || isRestDay) return;
    if (!nextWorkout.scheduleId) {
      console.warn(
        "[ActiveProgramCard] Next workout has no program_schedule id — snapshot/master mismatch; cannot start.",
      );
      return;
    }
    onSelectDay?.(nextWorkout);
    onStartWorkout(nextWorkout.scheduleId);
  };

  const goalChipLabel =
    blockInfo?.block.goal === "custom" && blockInfo.block.custom_goal_label
      ? blockInfo.block.custom_goal_label
      : blockInfo
        ? TRAINING_BLOCK_GOALS[blockInfo.block.goal]
        : null;

  const todayOrdinal = todayOrdinalInWeek();

  return (
    <div className="mb-6 rounded-[22px] border border-[color:var(--fc-glass-border)] bg-[var(--fc-surface-card)] p-5 shadow-[var(--fc-shadow-card)]">
      <div className="mb-3.5 flex items-start justify-between gap-2">
        <Eyebrow
          tone="dim"
          density="section"
          className="!mb-0 !text-[10.5px] !font-bold !tracking-[0.18em] !text-zinc-500"
        >
          Active program
        </Eyebrow>
        {programId ? (
          <button
            type="button"
            onClick={() => {
              window.location.href = `/client/programs/${programId}/details`;
            }}
            className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-[var(--fc-accent-cyan)] hover:opacity-90"
          >
            View outline
            <ChevronRight className="h-3 w-3" aria-hidden />
          </button>
        ) : null}
      </div>
      <h2
        className="mb-2 text-2xl font-semibold leading-[1.05] tracking-[-0.02em] fc-text-primary"
        style={{
          fontFamily: "var(--font-bricolage-grotesque, var(--font-body))",
        }}
      >
        {programName ?? "Your program"}
      </h2>
      {goalChipLabel ? (
        <div className="mb-3.5 flex flex-wrap items-center gap-2">
          <Badge variant="status-info">{goalChipLabel}</Badge>
          {blockInfo?.block.name ? (
            <span className="max-w-[55%] truncate text-xs fc-text-dim">
              {blockInfo.block.name}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mb-4 mt-4">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
            This week
          </span>
          <span
            className="shrink-0 text-lg font-bold tabular-nums text-white"
            style={{
              fontFamily: "var(--font-big-shoulders-display, var(--font-sans))",
            }}
          >
            {weekPct}%
            <span className="text-xs font-medium text-zinc-500">
              {" "}
              · {safeCurrent}/{safeGoal}
            </span>
          </span>
        </div>
        <div
          className="h-[6px] w-full overflow-hidden rounded-[3px] bg-white/[0.06]"
          role="progressbar"
          aria-valuenow={safeCurrent}
          aria-valuemin={0}
          aria-valuemax={safeGoal}
          aria-label="This week workout progress"
        >
          <div
            className="h-full rounded-[3px] transition-[width] duration-500 ease-out"
            style={{
              width: `${weekPct}%`,
              background:
                "linear-gradient(90deg, var(--fc-accent-lime), var(--fc-accent-lime-2))",
            }}
          />
        </div>
      </div>

      <div className="my-4 h-px w-[calc(100%+40px)] -mx-5 bg-[color:var(--fc-glass-border)]" aria-hidden />

      <div className="mb-6 flex items-center">
        <div className="min-w-0 flex-1">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
            Phase
          </div>
          <p
            className="text-base font-semibold leading-tight fc-text-primary"
            style={{
              fontFamily: "var(--font-bricolage-grotesque, var(--font-body))",
            }}
          >
            Week {currentWeekNumber} of {totalWeeks}
          </p>
        </div>
        <div className="flex min-w-0 flex-1 justify-end text-right">
          <div className="inline-flex flex-col items-end">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
              Today
            </div>
            <p
              className="text-base font-semibold leading-tight fc-text-primary"
              style={{
                fontFamily: "var(--font-bricolage-grotesque, var(--font-body))",
              }}
            >
              Day {todayOrdinal} of 7
            </p>
          </div>
        </div>
      </div>

      {!isRestDay && nextWorkout ? (
        <>
          <div className="mb-4 flex items-center gap-3 rounded-r-lg border-l-2 border-l-cyan-500 pl-3 pr-1 py-2">
            <div
              className="shrink-0 rounded-lg bg-cyan-500/20 p-2"
              aria-hidden
            >
              <Dumbbell className="h-5 w-5 text-cyan-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center gap-2">
                <Eyebrow tone="dim" density="section" className="!font-bold">
                  Up next
                </Eyebrow>
              </div>
              <h3 className="mb-1 text-lg font-bold fc-text-primary">{nextWorkout.workoutName}</h3>
              <p className="text-sm fc-text-dim">
                {exerciseCount > 0 ? `${exerciseCount} exercises` : "Workout"} • ~{nextWorkout.estimatedDuration || 45} min
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-cyan-400" aria-hidden />
          </div>

          <button
            type="button"
            onClick={handleStart}
            disabled={isStarting && startingScheduleId === nextWorkout.scheduleId}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50 bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40"
          >
            {isStarting && startingScheduleId === nextWorkout.scheduleId ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="h-5 w-5 fill-current" />
                START WORKOUT →
              </>
            )}
          </button>
        </>
      ) : (
        <div
          className="rounded-[18px] border border-[color:var(--fc-glass-border)] px-4 py-5 text-center"
          style={{
            background: `linear-gradient(135deg, rgba(79, 227, 232, 0.05) 0%, transparent 100%), var(--fc-surface-card)`,
          }}
        >
          <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-400">
            <Moon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
          </div>
          <p
            className="mb-1 text-lg font-semibold fc-text-primary"
            style={{
              fontFamily: "var(--font-bricolage-grotesque, var(--font-body))",
            }}
          >
            Rest day
          </p>
          <p className="text-xs leading-relaxed text-zinc-400">
            No workout scheduled for today. Recovery still counts — hydrate and
            move lightly if you can.
          </p>
        </div>
      )}
    </div>
  );
}
