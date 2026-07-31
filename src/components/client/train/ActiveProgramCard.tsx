"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Play, Loader2, Dumbbell, ChevronRight, PauseCircle, Moon } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Badge } from "@/components/ui/badge";
import { ProgramWeekState, type ProgramWeekDayCard } from "@/lib/programWeekStateBuilder";
import { loadInstancePhases } from "@/lib/programInstance/instanceCanvasLoad";
import { supabase } from "@/lib/supabase";
import {
  buildPhaseWeekRanges,
  clientPhaseChipLabel,
  formatClientWeekPositionLine,
  resolvePhaseForAbsoluteWeek,
} from "@/lib/clientInstancePhaseContext";

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
    programAssignmentId,
    totalWeeks,
    days,
    todaySlot,
    isRestDay,
    pauseStatus,
    pauseReason,
    displayWeekNumber,
  } = programWeek;

  const [phaseChipLabel, setPhaseChipLabel] = useState<string | null>(null);
  const [weekWithinPhase, setWeekWithinPhase] = useState<number | null>(null);
  const [phaseDurationWeeks, setPhaseDurationWeeks] = useState<number | null>(null);

  const absoluteWeek =
    displayWeekNumber > 0 ? displayWeekNumber : programWeek.currentWeekNumber;

  useEffect(() => {
    if (pauseStatus === "paused" || !programAssignmentId) {
      setPhaseChipLabel(null);
      setWeekWithinPhase(null);
      setPhaseDurationWeeks(null);
      return;
    }
    let cancelled = false;
    loadInstancePhases(supabase, programAssignmentId).then((phases) => {
      if (cancelled) return;
      const ranges = buildPhaseWeekRanges(phases);
      const pos = resolvePhaseForAbsoluteWeek(absoluteWeek, ranges);
      if (pos) {
        setPhaseChipLabel(clientPhaseChipLabel(pos.range.phase));
        setWeekWithinPhase(pos.weekWithinPhase);
        setPhaseDurationWeeks(
          Math.max(0, Math.floor(Number(pos.range.phase.duration_weeks) || 0)) || null,
        );
      } else {
        setPhaseChipLabel(null);
        setWeekWithinPhase(null);
        setPhaseDurationWeeks(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [programAssignmentId, pauseStatus, absoluteWeek]);

  const weekPositionLine = useMemo(
    () =>
      formatClientWeekPositionLine({
        absoluteWeek,
        totalWeeks,
        weekWithinPhase,
        phaseDurationWeeks,
      }),
    [absoluteWeek, totalWeeks, weekWithinPhase, phaseDurationWeeks],
  );

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
        "[ActiveProgramCard] Next workout has no program_day_assignment id; cannot start.",
      );
      return;
    }
    onStartWorkout(nextWorkout.scheduleId);
  };

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
            className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-[var(--fc-accent)] hover:opacity-90"
          >
            Full program details
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
      {phaseChipLabel ? (
        <div className="mb-3.5 flex flex-wrap items-center gap-2">
          <Badge variant="status-info">{phaseChipLabel}</Badge>
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
                "linear-gradient(90deg, var(--fc-accent), var(--fc-accent))",
            }}
          />
        </div>
      </div>

      <div className="my-4 h-px w-[calc(100%+40px)] -mx-5 bg-[color:var(--fc-glass-border)]" aria-hidden />

      <div className="mb-6 flex items-center">
        <div className="min-w-0 flex-1">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
            Program
          </div>
          <p
            className="text-base font-semibold leading-tight fc-text-primary"
            style={{
              fontFamily: "var(--font-bricolage-grotesque, var(--font-body))",
            }}
          >
            {weekPositionLine}
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
          <div className="mb-4 flex items-center gap-3 rounded-r-lg border-l-2 border-l-[color:var(--fc-group-c)] pl-3 pr-1 py-2">
            <div
              className="shrink-0 rounded-lg bg-[color-mix(in_srgb,var(--fc-group-c)_20%,transparent)] p-2"
              aria-hidden
            >
              <Dumbbell className="h-5 w-5 text-[color:var(--fc-group-c)]" />
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
            <ChevronRight className="h-5 w-5 shrink-0 text-[color:var(--fc-group-c)]" aria-hidden />
          </div>

          <button
            type="button"
            onClick={handleStart}
            disabled={isStarting && startingScheduleId === nextWorkout.scheduleId}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50 bg-gradient-to-r from-[color-mix(in_srgb,var(--fc-group-c)_75%,black)] to-[color:var(--fc-group-c)] shadow-lg shadow-[0_0_24px_color-mix(in_srgb,var(--fc-group-c)_25%,transparent)] hover:shadow-[0_0_24px_color-mix(in_srgb,var(--fc-group-c)_40%,transparent)]"
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
            background: `linear-gradient(135deg, rgba(34, 211, 238, 0.05) 0%, transparent 100%), var(--fc-surface-card)`,
          }}
        >
          <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--fc-group-c)_15%,transparent)] text-[color:var(--fc-group-c)]">
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
