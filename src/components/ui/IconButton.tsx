"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type IconButtonSize = "sm" | "md" | "lg";
type IconButtonVariant = "ghost" | "filled";

const sizeClassMap: Record<IconButtonSize, string> = {
  sm: "h-8 w-8",
  md: "h-[38px] w-[38px]",
  lg: "h-[50px] w-[50px]",
};

const variantClassMap: Record<IconButtonVariant, string> = {
  ghost:
    "bg-transparent text-[var(--fc-text-dim)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--fc-text-primary)]",
  filled:
    "text-[var(--fc-text-primary)] border border-[var(--fc-glass-border)] bg-[color:color-mix(in_srgb,var(--fc-surface-card)_86%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--fc-surface-elevated)_92%,transparent)]",
};

export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  size?: IconButtonSize;
  variant?: IconButtonVariant;
  showDot?: boolean;
  /** Notification dot palette (default lime for client; coach uses orange). */
  dotTone?: "lime" | "coach";
  badgeCount?: number;
  children: React.ReactNode;
}

export function IconButton({
  size = "md",
  variant = "ghost",
  showDot = false,
  dotTone = "lime",
  badgeCount,
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "relative inline-flex items-center justify-center rounded-full transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50",
        sizeClassMap[size],
        variantClassMap[variant],
        className
      )}
      {...props}
    >
      {children}

      {showDot && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute right-[9px] top-2 h-2 w-2 rounded-full",
            dotTone === "coach"
              ? "bg-[var(--fc-coach-action)] shadow-[0_0_8px_var(--fc-coach-action-glow)]"
              : "bg-[var(--fc-accent-lime)] shadow-[0_0_8px_var(--fc-accent-lime-glow)]"
          )}
        />
      )}

      {typeof badgeCount === "number" && badgeCount > 0 && (
        <span className="absolute -right-1 -top-1 min-w-[16px] rounded-full bg-[var(--fc-accent-lime)] px-1 text-center text-[10px] font-bold leading-4 text-[#061018]">
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      )}
    </button>
  );
}
