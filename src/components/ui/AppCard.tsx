"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type AppCardShellTone = "neutral" | "success" | "error" | "warning" | "info";

const toneModifier: Record<Exclude<AppCardShellTone, "neutral">, string> = {
  success: "fc-card-shell--success",
  error: "fc-card-shell--error",
  warning: "fc-card-shell--warning",
  info: "fc-card-shell--info",
};

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
  /** Optional status for styling (maps to shell tone when `shellTone` omitted). */
  status?: "active" | "completed" | "inactive" | "logged" | "not_logged";
  /** Coach / client kept for footer divider tokens; both use the same shell chrome. */
  variant?: "coach" | "client";
  /** Overrides left accent color (4px bar); wins over semantic tone border. */
  accentColor?: string;
  /** Explicit shell tint; overrides status-derived tone when set. */
  shellTone?: AppCardShellTone;
}

function statusToShellTone(
  status: AppCardProps["status"]
): AppCardShellTone | undefined {
  if (!status) return undefined;
  if (status === "completed" || status === "logged") return "success";
  if (status === "inactive") return "warning";
  if (status === "not_logged") return "error";
  return "neutral";
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
  shellTone,
  status,
}: AppCardProps) {
  const resolvedTone = shellTone ?? statusToShellTone(status) ?? "neutral";
  const shellToneClass =
    resolvedTone !== "neutral" ? toneModifier[resolvedTone] : undefined;

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
        "fc-card-shell overflow-hidden transition-all duration-200",
        shellToneClass,
        isInteractive && "cursor-pointer fc-hover-rise",
        "hover:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.35)]",
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
