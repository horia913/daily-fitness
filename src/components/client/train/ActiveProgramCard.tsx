"use client";

import React, { useState, useEffect, useRef } from "react";
import { ClientGlassCard } from "@/components/client-ui";
import { Play, Loader2, Dumbbell, ChevronRight } from "lucide-react";
import { ProgramWeekState, type ProgramWeekDayCard } from "@/lib/programWeekStateBuilder";
import { TrainingBlockService } from "@/lib/trainingBlockService";
import { TrainingBlock, TRAINING_BLOCK_GOALS } from "@/types/trainingBlock";

interface ActiveProgramCardProps {
  programWeek: ProgramWeekState;
  onStartWorkout: (scheduleId: string) => void;
  /** When set, main CTA opens the day preview instead of starting directly */
  onSelectDay?: (day: ProgramWeekDayCard) => void;
  isStarting: boolean;
  startingScheduleId: string | null;
  exerciseCounts?: Map<string, number>; // templateId -> exercise count
}

const GOAL_COLORS: Record<string, string> = {
  hypertrophy: "#06b6d4", strength: "#f97316", power: "#ef4444",
  peaking: "#a855f7", accumulation: "#3b82f6", conditioning: "#22c55e",
  deload: "#6b7280", general_fitness: "#14b8a6", sport_specific: "#eab308",
  custom: "#8b5cf6",
};

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
  onStartWorkout,
  onSelectDay,
  isStarting,
  startingScheduleId,
  exerciseCounts,
}: ActiveProgramCardProps) {
  const { programId, currentUnlockedWeek, totalWeeks, days, todaySlot, isRestDay } = programWeek;

  const [trainingBlocks, setTrainingBlocks] = useState<TrainingBlock[]>([]);
  const cachedProgramIdRef = useRef<string | null>(null);
  const cachedBlocksRef = useRef<TrainingBlock[] | null>(null);
  const inFlightProgramIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!programId) return;
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
  }, [programId]);

  const blockInfo = trainingBlocks.length > 0
    ? getCurrentBlock(trainingBlocks, currentUnlockedWeek)
    : null;

  const completedDays = days.filter((d) => d.isCompleted).length;
  const totalDays = days.length;
  const completionPercent = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

  const nextWorkout = (todaySlot && !todaySlot.isCompleted)
    ? todaySlot
    : days.find((d) => !d.isCompleted);

  const exerciseCount = nextWorkout && exerciseCounts
    ? exerciseCounts.get(nextWorkout.templateId) || 0
    : 0;

  const handleStart = () => {
    if (!nextWorkout || isRestDay) return;
    if (onSelectDay) {
      onSelectDay(nextWorkout);
    } else {
      onStartWorkout(nextWorkout.scheduleId);
    }
  };

  const gradId = "active-program-ring-grad";

  return (
    <ClientGlassCard
      className="p-6 mb-6 border border-[color:var(--fc-glass-border)] shadow-[0_0_20px_rgba(6,182,212,0.1)]"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h2 className="text-xl font-bold fc-text-primary mb-1">Active program</h2>
          {blockInfo && (
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: `${GOAL_COLORS[blockInfo.block.goal]}20`,
                  color: GOAL_COLORS[blockInfo.block.goal],
                  border: `1px solid ${GOAL_COLORS[blockInfo.block.goal]}40`,
                }}
              >
                {blockInfo.block.goal === "custom" && blockInfo.block.custom_goal_label
                  ? blockInfo.block.custom_goal_label
                  : TRAINING_BLOCK_GOALS[blockInfo.block.goal]}
              </span>
              {blockInfo.block.name && (
                <span className="text-xs fc-text-dim truncate">{blockInfo.block.name}</span>
              )}
            </div>
          )}
          <p className="text-sm fc-text-dim">
            Week {currentUnlockedWeek} of {totalWeeks} · Day {completedDays + 1} of {totalDays}
          </p>
        </div>
      </div>

      {/* Progress bar — cyan gradient */}
      <div className="mb-4">
        <div className="h-2.5 w-full rounded-full bg-[color:var(--fc-surface-sunken)] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-300"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative w-14 h-14 flex-shrink-0">
          <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
            <defs>
              <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
            <circle cx="28" cy="28" r="23" fill="none" stroke="var(--fc-glass-border)" strokeWidth="4" />
            <circle
              cx="28"
              cy="28"
              r="23"
              fill="none"
              stroke={`url(#${gradId})`}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${completionPercent * 1.445} 999`}
            />
          </svg>
        </div>
        <div>
          <p className="text-cyan-400 font-bold text-2xl tabular-nums">{completionPercent}%</p>
          <p className="text-sm font-bold fc-text-primary">
            {completedDays}/{totalDays} <span className="font-semibold fc-text-dim">workouts</span>
          </p>
          <p className="text-xs fc-text-dim">This week&apos;s progress</p>
        </div>
      </div>

      {!isRestDay && nextWorkout ? (
        <>
          <div className="mb-4 flex items-center gap-3 rounded-r-lg border-l-2 border-l-cyan-500 pl-3 pr-1 py-2">
            <div
              className="rounded-lg bg-cyan-500/20 p-2 shrink-0"
              aria-hidden
            >
              <Dumbbell className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider fc-text-dim">Up next</span>
              </div>
              <h3 className="text-lg font-bold fc-text-primary mb-1">{nextWorkout.workoutName}</h3>
              <p className="text-sm fc-text-dim">
                {exerciseCount > 0 ? `${exerciseCount} exercises` : "Workout"} • ~{nextWorkout.estimatedDuration || 45} min
              </p>
            </div>
            <ChevronRight className="w-5 h-5 shrink-0 text-cyan-400" aria-hidden />
          </div>

          <button
            onClick={handleStart}
            disabled={isStarting && startingScheduleId === nextWorkout.scheduleId}
            className="w-full h-14 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40"
          >
            {isStarting && startingScheduleId === nextWorkout.scheduleId ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                START WORKOUT →
              </>
            )}
          </button>
        </>
      ) : (
        <div className="text-center py-4">
          <p className="text-base font-semibold fc-text-primary mb-1">Rest day</p>
          <p className="text-sm fc-text-dim">No workout scheduled for today</p>
        </div>
      )}
    </ClientGlassCard>
  );
}
