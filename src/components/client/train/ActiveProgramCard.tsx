"use client";

import React, { useState, useEffect } from "react";
import { ClientGlassCard } from "@/components/client-ui";
import { Progress } from "@/components/ui/progress";
import { Play, Loader2 } from "lucide-react";
import { ProgramWeekState } from "@/lib/programWeekStateBuilder";
import { TrainingBlockService } from "@/lib/trainingBlockService";
import { TrainingBlock, TRAINING_BLOCK_GOALS } from "@/types/trainingBlock";

interface ActiveProgramCardProps {
  programWeek: ProgramWeekState;
  onStartWorkout: (scheduleId: string) => void;
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
  isStarting,
  startingScheduleId,
  exerciseCounts,
}: ActiveProgramCardProps) {
  const { programName, programId, currentUnlockedWeek, totalWeeks, days, todaySlot, isRestDay } = programWeek;

  const [trainingBlocks, setTrainingBlocks] = useState<TrainingBlock[]>([]);
  useEffect(() => {
    if (programId) {
      TrainingBlockService.getTrainingBlocks(programId).then(setTrainingBlocks);
    }
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
    if (nextWorkout && !isRestDay) {
      onStartWorkout(nextWorkout.scheduleId);
    }
  };

  return (
    <ClientGlassCard className="p-6 mb-6">
      {/* Program Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h2 className="text-xl font-bold fc-text-primary mb-1">{programName}</h2>
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
                <span className="text-xs fc-text-dim truncate">{blockInfo.block.name}</span>
              )}
            </div>
          )}
          <p className="text-sm fc-text-dim">
            Week {currentUnlockedWeek} of {totalWeeks} · Day {completedDays + 1} of {totalDays}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs fc-text-dim">Progress</span>
          <span className="text-xs font-semibold fc-text-primary">{completionPercent}% complete</span>
        </div>
        <div className="relative h-2 w-full rounded-full overflow-hidden" style={{ background: "var(--fc-surface-sunken)" }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${completionPercent}%`,
              background: "var(--fc-accent-cyan)",
            }}
          />
        </div>
      </div>

      {/* Next Up Section */}
      {!isRestDay && nextWorkout ? (
        <>
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">⚡</span>
              <span className="text-xs font-bold uppercase tracking-wider fc-text-dim">NEXT UP</span>
            </div>
            <h3 className="text-lg font-bold fc-text-primary mb-1">{nextWorkout.workoutName}</h3>
            <p className="text-sm fc-text-dim">
              {exerciseCount > 0 ? `${exerciseCount} exercises` : "Workout"} • ~{nextWorkout.estimatedDuration || 45} min
            </p>
          </div>

          {/* Start Button */}
          <button
            onClick={handleStart}
            disabled={isStarting && startingScheduleId === nextWorkout.scheduleId}
            className="w-full h-14 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "var(--fc-accent-cyan)" }}
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
