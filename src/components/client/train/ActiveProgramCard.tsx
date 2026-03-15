"use client";

import React, { useState, useEffect, useRef } from "react";
import { ClientGlassCard } from "@/components/client-ui";
import { Progress } from "@/components/ui/progress";
import { Play, Loader2 } from "lucide-react";
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
    // Use cache if we already have blocks for this program
    if (cachedProgramIdRef.current === programId && cachedBlocksRef.current) {
      setTrainingBlocks(cachedBlocksRef.current);
      return;
    }
    // Don't start a second request if one is already in flight for this programId (Strict Mode)
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

  // Calculate completion percentage
  const completedDays = days.filter((d) => d.isCompleted).length;
  const totalDays = days.length;
  const completionPercent = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

  // Get next workout — skip todaySlot if it's already completed
  const nextWorkout = (todaySlot && !todaySlot.isCompleted)
    ? todaySlot
    : days.find((d) => !d.isCompleted);

  // Get exercise count from map if available
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

  return (
    <ClientGlassCard className="p-6 mb-6 border-l-4 border-cyan-400 bg-cyan-600 text-white">
      {/* Slightly darker cyan (600) for better contrast with white text */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white mb-1 drop-shadow-sm">Today&apos;s Workout</h2>
          {/* Training block badge — one line when present */}
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
                <span className="text-xs text-white/80 truncate">{blockInfo.block.name}</span>
              )}
            </div>
          )}
          <p className="text-sm text-white/80">
            Week {currentUnlockedWeek} of {totalWeeks} · Day {completedDays + 1} of {totalDays}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-white/80">Progress</span>
          <span className="text-xs font-semibold text-white">{completionPercent}% complete</span>
        </div>
        <div className="relative h-2 w-full rounded-full overflow-hidden bg-white/20">
          <div
            className="h-full rounded-full transition-all duration-300 bg-white"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>

      {/* Next Up Section */}
      {!isRestDay && nextWorkout ? (
        <>
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">⚡</span>
              <span className="text-xs font-bold uppercase tracking-wider text-white/80">NEXT UP</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1 drop-shadow-sm">{nextWorkout.workoutName}</h3>
            <p className="text-sm text-white/80">
              {exerciseCount > 0 ? `${exerciseCount} exercises` : "Workout"} • ~{nextWorkout.estimatedDuration || 45} min
            </p>
          </div>

          {/* Start Button — dark surface (previous card color) */}
          <button
            onClick={handleStart}
            disabled={isStarting && startingScheduleId === nextWorkout.scheduleId}
            className="w-full h-14 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed bg-[color:var(--fc-surface-card)] border border-[color:var(--fc-glass-border)] hover:bg-[color:var(--fc-surface-sunken)]"
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
          <p className="text-base font-semibold text-white mb-1">Rest day</p>
          <p className="text-sm text-white/80">No workout scheduled for today</p>
        </div>
      )}
    </ClientGlassCard>
  );
}
