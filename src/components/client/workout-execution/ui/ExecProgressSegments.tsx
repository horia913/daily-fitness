"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { LiveCardHue } from "../live-card/types";

/** Cap so very large workouts still fit the header row. */
const MAX_EXERCISE_SEGMENTS = 24;

/** Match LiveCard hue → CSS group colour (same mapping as liveCard.module.css). */
const HUE_BG: Record<LiveCardHue, string> = {
  a: "var(--fc-group-a)",
  b: "var(--fc-group-c)",
  c: "var(--fc-group-d)",
  d: "var(--fc-group-b)",
};

export interface LiveWorkoutSetEntryLike {
  setEntry: { exercises?: unknown[] | null };
  currentExerciseIndex?: number;
}

export function countWorkoutExercises(
  setEntries: LiveWorkoutSetEntryLike[] | null | undefined,
): number {
  if (!setEntries?.length) return 0;
  return setEntries.reduce((sum, entry) => {
    const n = Array.isArray(entry.setEntry?.exercises)
      ? entry.setEntry.exercises.length
      : 0;
    return sum + (n > 0 ? n : 1);
  }, 0);
}

/** 0-based global exercise index from set entry + in-entry exercise index. */
export function getGlobalExerciseIndex(
  setEntries: LiveWorkoutSetEntryLike[] | null | undefined,
  setEntryIndex: number,
  exerciseIndexInEntry: number,
): number {
  if (!setEntries?.length) return 0;
  let sum = 0;
  const safeIndex = Math.max(0, Math.min(setEntryIndex, setEntries.length - 1));
  for (let i = 0; i < safeIndex; i++) {
    const n = Array.isArray(setEntries[i]?.setEntry?.exercises)
      ? setEntries[i]!.setEntry.exercises!.length
      : 0;
    sum += n > 0 ? n : 1;
  }
  return sum + Math.max(0, exerciseIndexInEntry);
}

export type ExecProgressSegmentsProps =
  | {
      variant: "exercises";
      totalExercises: number;
      /** 0-based global index of the exercise the user is on */
      currentExerciseIndex: number;
      /** Hue for the “now” segment (defaults to group a). */
      currentHue?: LiveCardHue;
      className?: string;
    }
  | {
      variant: "sets";
      completedSets: number;
      totalSets: number;
      currentHue?: LiveCardHue;
      className?: string;
    };

function segmentStyle(
  state: "done" | "now" | "upcoming",
  currentHue: LiveCardHue,
): React.CSSProperties {
  if (state === "done") {
    return { background: "var(--fc-status-success)" };
  }
  if (state === "now") {
    return { background: HUE_BG[currentHue] };
  }
  return { background: "var(--fc-hairline, rgba(255,255,255,0.1))" };
}

/**
 * Header progress: one segment per exercise (workout order), or set-based
 * segments when variant is `sets`.
 * States: done (green) · now (group hue) · upcoming (dim).
 */
export function ExecProgressSegments(props: ExecProgressSegmentsProps) {
  const { className } = props;
  const currentHue: LiveCardHue = props.currentHue ?? "a";

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
        className={cn("flex items-center gap-[3px] w-full min-w-0", className)}
        aria-label="Workout exercise progress"
      >
        {Array.from({ length: segmentCount }).map((_, i) => {
          const state: "done" | "now" | "upcoming" = allComplete
            ? "done"
            : i < visualIndex
              ? "done"
              : i === visualIndex
                ? "now"
                : "upcoming";
          return (
            <div
              key={i}
              className="h-[3px] flex-1 rounded-[2px] transition-colors duration-300"
              style={segmentStyle(state, currentHue)}
            />
          );
        })}
      </div>
    );
  }

  const totalSets = Math.max(1, Math.floor(props.totalSets) || 1);
  const completed = Math.max(
    0,
    Math.min(Math.floor(props.completedSets) || 0, totalSets),
  );
  const allComplete = completed >= totalSets;

  return (
    <div
      className={cn("flex items-center gap-[3px] w-full min-w-0", className)}
      aria-label="Set progress"
    >
      {Array.from({ length: totalSets }).map((_, i) => {
        const state: "done" | "now" | "upcoming" = allComplete
          ? "done"
          : i < completed
            ? "done"
            : i === completed
              ? "now"
              : "upcoming";
        return (
          <div
            key={i}
            className="h-[3px] flex-1 rounded-[2px] transition-colors duration-300"
            style={segmentStyle(state, currentHue)}
          />
        );
      })}
    </div>
  );
}
