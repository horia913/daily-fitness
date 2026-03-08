"use client";

import React from "react";
import { Play } from "lucide-react";
import { PrimaryButton } from "./PrimaryButton";

interface AssignedWorkoutRowProps {
  title: string;
  subtitle?: string;
  rightMeta?: React.ReactNode;
  onStart: () => void;
}

export function AssignedWorkoutRow({
  title,
  subtitle,
  rightMeta,
  onStart,
}: AssignedWorkoutRowProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[color:var(--fc-glass-border)] last:border-0 gap-4">
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
