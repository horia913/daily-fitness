"use client";

import React from "react";
import { Dumbbell, Play } from "lucide-react";
import { PrimaryButton } from "./PrimaryButton";
import { getCategoryAccent } from "@/lib/workoutCategoryColors";
import { cn } from "@/lib/utils";

interface AssignedWorkoutRowProps {
  title: string;
  subtitle?: string;
  /** workout_templates.category text */
  category?: string | null;
  rightMeta?: React.ReactNode;
  onStart: () => void;
}

export function AssignedWorkoutRow({
  title,
  subtitle,
  category,
  rightMeta,
  onStart,
}: AssignedWorkoutRowProps) {
  const accent = getCategoryAccent(category || "");
  return (
    <div
      className={cn(
        "flex items-center justify-between py-2 border-b border-[color:var(--fc-glass-border)] last:border-0 gap-3 sm:gap-4 border-l-2 pl-3 -ml-1",
        accent.border
      )}
    >
      <div
        className={cn("rounded-lg p-1.5 shrink-0", accent.iconBg)}
        aria-hidden
      >
        <Dumbbell className={cn("w-3.5 h-3.5", accent.text)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold fc-text-primary text-sm truncate">{title}</p>
        {subtitle && <p className="text-xs fc-text-dim">{subtitle}</p>}
      </div>
      {rightMeta && (
        <div className="shrink-0 text-xs fc-text-dim">{rightMeta}</div>
      )}
      <PrimaryButton
        className="shrink-0 h-8 px-3 text-xs w-auto"
        onClick={onStart}
      >
        <Play className="w-3.5 h-3.5 mr-1" />
        Start
      </PrimaryButton>
    </div>
  );
}
