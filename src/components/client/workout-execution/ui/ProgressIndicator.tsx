"use client";

import React from "react";
import { Progress } from "@/components/ui/progress";

interface ProgressIndicatorProps {
  current: number;
  total: number;
  label?: string;
  showBar?: boolean;
}

export function ProgressIndicator({
  current,
  total,
  label = "Set",
  showBar = true,
}: ProgressIndicatorProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
          {label} {current} of {total}
        </span>
        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
          {Math.round(percentage)}%
        </span>
      </div>
      {showBar && (
        <Progress
          value={percentage}
          className="h-3 bg-slate-200 dark:bg-slate-700"
        />
      )}
    </div>
  );
}
