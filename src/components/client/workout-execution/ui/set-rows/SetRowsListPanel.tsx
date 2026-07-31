import React from "react";
import { cn } from "@/lib/utils";

interface SetRowsListPanelProps {
  doneCount: number;
  totalSets: number;
  onFillRemaining?: () => void;
  fillRemainingLabel?: string;
  children: React.ReactNode;
  className?: string;
}

export function SetRowsListPanel({
  doneCount,
  totalSets,
  onFillRemaining,
  fillRemainingLabel = "Fill remaining with target",
  children,
  className,
}: SetRowsListPanelProps) {
  const progressPct = (doneCount / Math.max(1, totalSets)) * 100;

  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 bg-white/[0.02] p-2.5",
        className,
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
        <p className="text-xs font-medium text-zinc-300">
          <span className="font-semibold tabular-nums text-[var(--fc-accent)]">
            {doneCount}
          </span>
          <span className="text-zinc-500"> / </span>
          <span className="tabular-nums text-zinc-400">{totalSets}</span>
          <span className="ml-1 text-zinc-500">done</span>
        </p>
        {onFillRemaining ? (
          <button
            type="button"
            onClick={onFillRemaining}
            className="text-[10px] font-semibold uppercase tracking-wide text-[var(--fc-accent)] hover:opacity-90"
          >
            {fillRemainingLabel}
          </button>
        ) : null}
      </div>
      <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-[var(--fc-accent)] transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
