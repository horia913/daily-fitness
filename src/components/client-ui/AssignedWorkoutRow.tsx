"use client";

import React from "react";
import { Dumbbell, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      <Button
        type="button"
        variant="btn-action"
        className="h-8 w-auto shrink-0 px-3 text-xs"
        onClick={onStart}
      >
        <Play className="mr-1 h-3.5 w-3.5" />
        Start
      </Button>
    </div>
  );
}
