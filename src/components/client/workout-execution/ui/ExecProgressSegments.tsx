"use client";

import React from "react";
import { cn } from "@/lib/utils";

/** Cap so very large workouts still fit the header row. */
const MAX_EXERCISE_SEGMENTS = 24;

export interface LiveWorkoutBlockLike {
  block: { exercises?: unknown[] | null };
  currentExerciseIndex?: number;
}

export function countWorkoutExercises(
  blocks: LiveWorkoutBlockLike[] | null | undefined,
): number {
  if (!blocks?.length) return 0;
  return blocks.reduce((sum, b) => {
    const n = Array.isArray(b.block?.exercises) ? b.block.exercises.length : 0;
    return sum + (n > 0 ? n : 1);
  }, 0);
}

/** 0-based global exercise index from block + in-block exercise index. */
export function getGlobalExerciseIndex(
  blocks: LiveWorkoutBlockLike[] | null | undefined,
  blockIndex: number,
  exerciseIndexInBlock: number,
): number {
  if (!blocks?.length) return 0;
  let sum = 0;
  const safeBlock = Math.max(0, Math.min(blockIndex, blocks.length - 1));
  for (let i = 0; i < safeBlock; i++) {
    const n = Array.isArray(blocks[i]?.block?.exercises)
      ? blocks[i]!.block.exercises!.length
      : 0;
    sum += n > 0 ? n : 1;
  }
  return sum + Math.max(0, exerciseIndexInBlock);
}

export type ExecProgressSegmentsProps =
  | {
      variant: "exercises";
      totalExercises: number;
      /** 0-based global index of the exercise the user is on */
      currentExerciseIndex: number;
      className?: string;
    }
  | {
      variant: "sets";
      completedSets: number;
      totalSets: number;
      className?: string;
    };

/**
 * Header progress: one segment per exercise (workout order), or set-based
 * segments when variant is `sets`.
 */
export function ExecProgressSegments(props: ExecProgressSegmentsProps) {
  const { className } = props;

  if (props.variant === "exercises") {
    const totalEx = Math.max(1, Math.floor(props.totalExercises) || 1);
    const rawCurrent = Math.max(0, Math.floor(props.currentExerciseIndex) || 0);
    const segmentCount = Math.min(totalEx, MAX_EXERCISE_SEGMENTS);
    let visualIndex: number;
    if (totalEx <= 1) {
      visualIndex = 0;
    } else if (totalEx <= MAX_EXERCISE_SEGMENTS) {
      visualIndex = Math.min(rawCurrent, segmentCount - 1);
    } else {
      const clamped = Math.min(rawCurrent, totalEx - 1);
      visualIndex = Math.round(
        (clamped / Math.max(1, totalEx - 1)) * (segmentCount - 1),
      );
    }
    const allComplete = rawCurrent >= totalEx;

    return (
      <div
        className={cn("flex min-w-0 max-w-[220px] flex-1 items-center gap-0.5 sm:gap-1", className)}
        role="progressbar"
        aria-valuenow={Math.min(rawCurrent + 1, totalEx)}
        aria-valuemin={1}
        aria-valuemax={totalEx}
        aria-label={`Exercise ${Math.min(rawCurrent + 1, totalEx)} of ${totalEx}`}
      >
        {Array.from({ length: segmentCount }).map((_, i) => {
          const isDone = allComplete || (!allComplete && i < visualIndex);
          const isActive = !allComplete && i === visualIndex;
          return (
            <div
              key={i}
              className={cn(
                "h-[3px] min-w-[2px] flex-1 rounded-sm transition-colors",
                allComplete
                  ? "bg-[var(--fc-accent-lime)] shadow-[0_0_6px_color-mix(in_srgb,var(--fc-accent-lime)_40%,transparent)]"
                  : isDone
                    ? "bg-[var(--fc-accent-lime)] shadow-[0_0_4px_color-mix(in_srgb,var(--fc-accent-lime)_35%,transparent)]"
                    : isActive
                      ? "bg-[var(--fc-accent-lime)] shadow-[0_0_10px_var(--fc-accent-lime)]"
                      : "bg-white/10",
              )}
            />
          );
        })}
      </div>
    );
  }

  // variant === "sets" — one segment per set when small; else compress with ratio
  const totalSets = Math.max(1, Math.floor(props.totalSets) || 1);
  const done = Math.max(0, Math.min(props.completedSets, totalSets));
  const allSetsComplete = done >= totalSets;
  const segmentCount = Math.min(totalSets, MAX_EXERCISE_SEGMENTS);
  let visualActive: number;
  if (totalSets <= 1) {
    visualActive = 0;
  } else if (totalSets <= MAX_EXERCISE_SEGMENTS) {
    visualActive = allSetsComplete ? segmentCount - 1 : Math.min(done, segmentCount - 1);
  } else {
    const p = totalSets > 0 ? done / totalSets : 0;
    visualActive = Math.min(
      segmentCount - 1,
      Math.floor(p * segmentCount),
    );
  }

  return (
    <div
      className={cn("flex min-w-0 max-w-[220px] flex-1 items-center gap-0.5 sm:gap-1", className)}
      role="progressbar"
      aria-valuenow={done}
      aria-valuemin={0}
      aria-valuemax={totalSets}
      aria-label="Set progress"
    >
      {Array.from({ length: segmentCount }).map((_, i) => {
        const isDone = allSetsComplete || (!allSetsComplete && i < visualActive);
        const isActive = !allSetsComplete && i === visualActive;
        return (
          <div
            key={i}
            className={cn(
              "h-[3px] min-w-[2px] flex-1 rounded-sm transition-colors",
              allSetsComplete
                ? "bg-[var(--fc-accent-lime)] shadow-[0_0_6px_color-mix(in_srgb,var(--fc-accent-lime)_40%,transparent)]"
                : isDone
                  ? "bg-[var(--fc-accent-lime)] shadow-[0_0_4px_color-mix(in_srgb,var(--fc-accent-lime)_35%,transparent)]"
                  : isActive
                    ? "bg-[var(--fc-accent-lime)] shadow-[0_0_10px_var(--fc-accent-lime)]"
                    : "bg-white/10",
            )}
          />
        );
      })}
    </div>
  );
}
