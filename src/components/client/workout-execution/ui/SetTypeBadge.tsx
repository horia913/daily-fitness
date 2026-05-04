"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { SetType } from "@/types/workoutSetEntries";
import { WORKOUT_SET_TYPE_CONFIGS } from "@/types/workoutSetEntries";

const KNOWN: SetType[] = [
  "straight_set",
  "superset",
  "giant_set",
  "drop_set",
  "cluster_set",
  "rest_pause",
  "pre_exhaustion",
  "amrap",
  "emom",
  "tabata",
  "for_time",
  "speed_work",
  "endurance",
];

function normalizeSetType(setType: string): SetType {
  return (KNOWN.includes(setType as SetType) ? setType : "straight_set") as SetType;
}

export interface SetTypeBadgeProps {
  setType: SetType | string;
  className?: string;
}

export function SetTypeBadge({ setType, className }: SetTypeBadgeProps) {
  const key = normalizeSetType(String(setType));
  const label = (
    WORKOUT_SET_TYPE_CONFIGS[key]?.name ?? "Straight Set"
  )
    .toUpperCase()
    .replace(/\s+/g, " ");

  return (
    <span
      data-set-type={key}
      className={cn("fc-set-type-badge", className)}
    >
      {label}
    </span>
  );
}
