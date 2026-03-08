"use client";

import { CheckCircle } from "lucide-react";

export interface CompactGoalCardGoal {
  id: string;
  title: string;
  progress_percentage?: number | null;
  current_value?: number | null;
  target_value?: number | string | null;
  target_unit?: string | null;
  status: string;
}

interface CompactGoalCardProps {
  goal: CompactGoalCardGoal;
}

export function CompactGoalCard({ goal }: CompactGoalCardProps) {
  const progress = Math.min(goal.progress_percentage ?? 0, 100);
  const isCompleted = goal.status === "completed";
  const current = goal.current_value ?? 0;
  const target = goal.target_value;
  const unit = goal.target_unit ?? "";

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[color:var(--fc-glass-border)] p-3 bg-[color:var(--fc-glass-highlight)]/50">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold fc-text-primary truncate flex-1 min-w-0">
          {goal.title}
        </p>
        {isCompleted && (
          <CheckCircle className="w-4 h-4 fc-text-success shrink-0" aria-hidden />
        )}
      </div>
      <div className="w-full h-1.5 rounded-full overflow-hidden bg-[color:var(--fc-glass-border)]">
        <div
          className="h-full rounded-full transition-all bg-[color:var(--fc-accent-cyan)]"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs fc-text-dim">
        {target != null && (current !== undefined || target !== undefined)
          ? `${current} / ${target}${unit ? ` ${unit}` : ""}`
          : `${Math.round(progress)}%`}
      </p>
    </div>
  );
}
