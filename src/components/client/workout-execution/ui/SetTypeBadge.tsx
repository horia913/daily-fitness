"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { SetType } from "@/types/workoutSetEntries";
import { WORKOUT_SET_TYPE_CONFIGS } from "@/types/workoutSetEntries";

const BADGE_CLASS_BY_TYPE: Record<SetType, string> = {
  straight_set:
    "bg-cyan-500/40 text-cyan-300 border border-cyan-500/50",
  superset:
    "bg-purple-500/40 text-purple-300 border border-purple-500/50",
  giant_set:
    "bg-indigo-500/40 text-indigo-300 border border-indigo-500/50",
  drop_set:
    "bg-amber-500/40 text-amber-300 border border-amber-500/50",
  cluster_set:
    "bg-orange-500/40 text-orange-300 border border-orange-500/50",
  rest_pause:
    "bg-rose-500/40 text-rose-300 border border-rose-500/50",
  pre_exhaustion:
    "bg-pink-500/40 text-pink-300 border border-pink-500/50",
  amrap:
    "bg-emerald-500/40 text-emerald-300 border border-emerald-500/50",
  emom:
    "bg-teal-500/40 text-teal-300 border border-teal-500/50",
  tabata:
    "bg-red-500/40 text-red-300 border border-red-500/50",
  for_time:
    "bg-yellow-500/40 text-yellow-300 border border-yellow-500/50",
  speed_work:
    "bg-sky-500/40 text-sky-300 border border-sky-500/50",
  endurance:
    "bg-green-500/40 text-green-300 border border-green-500/50",
};

export interface SetTypeBadgeProps {
  setType: SetType | string;
  className?: string;
}

export function SetTypeBadge({ setType, className }: SetTypeBadgeProps) {
  const key = setType as SetType;
  const colors =
    key in BADGE_CLASS_BY_TYPE
      ? BADGE_CLASS_BY_TYPE[key]
      : BADGE_CLASS_BY_TYPE.straight_set;
  const label = (
    WORKOUT_SET_TYPE_CONFIGS[key as SetType]?.name ?? "Straight Set"
  )
    .toUpperCase()
    .replace(/\s+/g, " ");

  return (
    <span
      className={cn(
        "inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        colors,
        className,
      )}
    >
      {label}
    </span>
  );
}
