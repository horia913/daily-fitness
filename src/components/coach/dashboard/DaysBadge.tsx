"use client";

import { cn } from "@/lib/utils";

export type DaysBadgeTier = "critical" | "warning" | "new";
export type DaysBadgeSize = "lg" | "sm";

export interface DaysBadgeProps {
  /** Days since last check-in; `null` shows em dash (no baseline). */
  days: number | null;
  tier: DaysBadgeTier;
  size?: DaysBadgeSize;
  /** When set (e.g. "New"), replaces the numeric days display. */
  displayText?: string | null;
  className?: string;
}

const box: Record<DaysBadgeSize, string> = {
  lg: "h-14 w-14 rounded-[14px]",
  sm: "h-11 w-11 rounded-xl",
};

const numSize: Record<DaysBadgeSize, string> = {
  lg: "text-[26px] leading-none",
  sm: "text-lg leading-none",
};

export function DaysBadge({
  days,
  tier,
  size = "sm",
  displayText,
  className,
}: DaysBadgeProps) {
  const soft =
    tier === "critical"
      ? "bg-[color:color-mix(in_srgb,var(--fc-accent-cyan)_10%,transparent)] border border-[color:color-mix(in_srgb,var(--fc-accent-cyan)_20%,transparent)]"
      : tier === "warning"
        ? "bg-[color:var(--fc-sev-warning-soft)] border border-[color:var(--fc-sev-warning-border)]"
        : "bg-[color:var(--fc-sev-new-soft)] border border-[color:var(--fc-sev-new-border)]";

  const color =
    tier === "critical"
      ? "text-[color:var(--fc-accent-cyan)]"
      : tier === "warning"
        ? "text-[color:var(--fc-sev-warning)]"
        : "text-[color:var(--fc-sev-new)]";

  const display =
    displayText != null && displayText !== ""
      ? displayText
      : days == null
        ? "—"
        : String(days);

  const isTextLabel = Boolean(displayText != null && displayText !== "");

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center shrink-0",
        box[size],
        soft,
        className
      )}
    >
      <span
        className={cn(
          "font-bold tabular-nums",
          isTextLabel && size === "sm" && "text-[11px] leading-tight tracking-tight normal-case",
          isTextLabel && size === "lg" && "text-sm leading-tight tracking-tight normal-case",
          !isTextLabel && numSize[size],
          color,
          "font-[family-name:var(--f-display,var(--font-display,ui-sans-serif))]"
        )}
      >
        {display}
      </span>
      {!isTextLabel ? (
        <span
          className={cn(
            "mt-0.5 text-[7.5px] font-bold uppercase tracking-[0.12em] opacity-90",
            tier === "critical" && "text-[color:var(--fc-accent-cyan)]",
            tier === "warning" && "text-[color:var(--fc-sev-warning)]",
            tier === "new" && "text-[color:var(--fc-sev-new)]"
          )}
        >
          days
        </span>
      ) : null}
    </div>
  );
}
