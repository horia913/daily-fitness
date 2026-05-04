"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type EyebrowTone =
  | "lime"
  | "cyan"
  | "cyanMuted"
  | "cyanEmphasis"
  | "gold"
  | "dim"
  | "subtle"
  | "warning"
  | "amber"
  | "zinc"
  | "emerald";

type EyebrowDensity = "default" | "section" | "statStrip";

const toneClassMap: Record<EyebrowTone, string> = {
  lime: "text-[var(--fc-accent-lime)]",
  cyan: "text-[var(--fc-accent-cyan)]",
  cyanMuted: "text-cyan-300/70",
  cyanEmphasis: "text-cyan-400/90",
  gold: "text-[var(--fc-accent-gold)]",
  dim: "text-[var(--fc-text-dim)]",
  subtle: "text-[color:var(--fc-text-subtle)]",
  warning: "text-[var(--fc-status-warning)]",
  amber: "text-amber-400",
  zinc: "text-zinc-400",
  emerald: "text-emerald-300/80",
};

const toneGlowClassMap: Record<EyebrowTone, string> = {
  lime: "shadow-[0_0_12px_color-mix(in_srgb,var(--fc-accent-lime)_40%,transparent)]",
  cyan: "shadow-[0_0_12px_color-mix(in_srgb,var(--fc-accent-cyan)_40%,transparent)]",
  cyanMuted:
    "shadow-[0_0_12px_color-mix(in_srgb,var(--fc-accent-cyan)_25%,transparent)]",
  cyanEmphasis:
    "shadow-[0_0_12px_color-mix(in_srgb,var(--fc-accent-cyan)_30%,transparent)]",
  gold: "shadow-[0_0_12px_color-mix(in_srgb,var(--fc-accent-gold)_40%,transparent)]",
  dim: "shadow-[0_0_12px_color-mix(in_srgb,var(--fc-text-dim)_40%,transparent)]",
  subtle:
    "shadow-[0_0_12px_color-mix(in_srgb,var(--fc-text-subtle)_30%,transparent)]",
  warning: "shadow-[0_0_12px_color-mix(in_srgb,var(--fc-status-warning)_40%,transparent)]",
  amber: "shadow-[0_0_12px_color-mix(in_srgb,var(--fc-status-warning)_35%,transparent)]",
  zinc: "shadow-[0_0_12px_color-mix(in_srgb,var(--fc-text-dim)_25%,transparent)]",
  emerald:
    "shadow-[0_0_12px_color-mix(in_srgb,var(--fc-status-success)_30%,transparent)]",
};

const densityClassMap: Record<EyebrowDensity, string> = {
  default: "mb-[10px] text-[10.5px] font-bold uppercase tracking-[0.18em]",
  section: "mb-0 text-xs font-semibold uppercase tracking-wider",
  statStrip:
    "mb-1.5 text-[9.5px] font-semibold uppercase tracking-[0.12em]",
};

export interface EyebrowProps extends React.HTMLAttributes<HTMLElement> {
  tone?: EyebrowTone;
  /** Renders the animated pulse dot (Eyebrow-owned). */
  showPulseDot?: boolean;
  /**
   * When true, applies `.fc-client-dashboard-eyebrow` so the pulse uses the
   * v5 `::before` animation (Phone 1 greeting). Mutually exclusive with the
   * span-based `showPulseDot`.
   */
  dashboardEyebrow?: boolean;
  /** Visual scale for section labels vs page eyebrows vs stat-strip labels. */
  density?: EyebrowDensity;
  /** Use `span` when the eyebrow must sit inline (e.g. timer row). */
  as?: "div" | "span";
  children: React.ReactNode;
}

export function Eyebrow({
  tone = "dim",
  showPulseDot = false,
  dashboardEyebrow = false,
  density = "default",
  as = "div",
  className,
  children,
  ...props
}: EyebrowProps) {
  const Comp = as;
  const useDashEyebrow = Boolean(dashboardEyebrow);
  const showSpanPulse = Boolean(showPulseDot) && !useDashEyebrow;

  return (
    <Comp
      className={cn(
        densityClassMap[density],
        "inline-flex items-center gap-2",
        toneClassMap[tone],
        useDashEyebrow && "fc-client-dashboard-eyebrow",
        className
      )}
      {...props}
    >
      {showSpanPulse && (
        <span
          aria-hidden="true"
          className={cn(
            "h-[6px] w-[6px] rounded-full animate-[pulse_2s_ease-in-out_infinite]",
            toneClassMap[tone],
            toneGlowClassMap[tone]
          )}
        />
      )}
      <span>{children}</span>
    </Comp>
  );
}
