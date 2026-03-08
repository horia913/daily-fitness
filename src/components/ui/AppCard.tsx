"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface AppCardProps {
  /** Small label above title: category, type, or status. Max ~5 words. */
  eyebrow?: string;
  /** Optional 16px icon rendered inline with eyebrow (e.g. Dumbbell, FileText). */
  eyebrowIcon?: React.ReactNode;
  /** Primary name — largest text on the card. */
  title: string;
  /** One line of supporting context, or rich content (e.g. pills/badges). */
  subtitle?: React.ReactNode;
  /** Main content slot — card-specific body. */
  children?: React.ReactNode;
  /** Footer actions — primary left, secondary right. */
  actions?: React.ReactNode;
  /** Makes the whole card clickable and adds hover rise. */
  onClick?: () => void;
  className?: string;
  /** Optional status for future styling (e.g. inactive, logged). */
  status?: "active" | "completed" | "inactive" | "logged" | "not_logged";
  /** Coach = glass surface; client = solid surface. */
  variant?: "coach" | "client";
  /** CSS color for 3px left accent bar (e.g. "var(--fc-accent-cyan)"). */
  accentColor?: string;
}

export function AppCard({
  eyebrow,
  eyebrowIcon,
  title,
  subtitle,
  children,
  actions,
  onClick,
  className,
  variant = "coach",
  accentColor,
}: AppCardProps) {
  const surfaceClass =
    variant === "coach"
      ? "fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]"
      : "fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)]";

  const isInteractive = typeof onClick === "function";

  return (
    <div
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        surfaceClass,
        "overflow-hidden transition-all duration-200",
        isInteractive && "cursor-pointer fc-hover-rise",
        "hover:border-[color:var(--fc-glass-border-strong)] hover:shadow-[var(--fc-shadow-card)]",
        accentColor && "border-l-[3px]",
        className
      )}
      style={accentColor ? { borderLeftColor: accentColor } : undefined}
    >
      <div className="p-4 sm:p-5 space-y-3">
        {/* Eyebrow */}
        {eyebrow && (
          <div
            className="flex items-center gap-2 text-xs uppercase tracking-wide font-semibold text-[color:var(--fc-text-dim)]"
            data-slot="app-card-eyebrow"
          >
            {eyebrowIcon && (
              <span className="shrink-0 [&>svg]:w-4 [&>svg]:h-4 [&>svg]:opacity-80">
                {eyebrowIcon}
              </span>
            )}
            <span>{eyebrow}</span>
          </div>
        )}

        {/* Title */}
        <h3
          className="text-lg font-bold text-[color:var(--fc-text-primary)] line-clamp-2 leading-tight"
          data-slot="app-card-title"
        >
          {title}
        </h3>

        {/* Subtitle */}
        {subtitle != null && subtitle !== "" && (
          <div
            className="text-sm text-[color:var(--fc-text-dim)]"
            data-slot="app-card-subtitle"
          >
            {subtitle}
          </div>
        )}

        {/* Body */}
        {children && (
          <div className="pt-1" data-slot="app-card-body">
            {children}
          </div>
        )}

        {/* Footer */}
        {actions && (
          <div
            className={cn(
              "flex items-center gap-2 pt-3 border-t",
              variant === "coach"
                ? "border-[color:var(--fc-glass-border)]"
                : "border-[color:var(--fc-surface-card-border)]"
            )}
            data-slot="app-card-actions"
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

export default AppCard;
