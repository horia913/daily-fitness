"use client";

/**
 * Banner — v4 generalized banner atomic
 *
 * Spec refs: design-system-v4 §6.32 (Banner — info / warning / success;
 *             error variant added per project need), §15.2 (component
 *             conventions). Backed by .fc-card-status-{info,warning,error,
 *             success} (ui-system.css 1.B.2).
 *
 * Coexists with the existing ErrorBanner. Phase 0a is additive — ErrorBanner
 * call sites are NOT migrated here. Banner is the v4 atomic and may be adopted
 * in subsequent phases.
 *
 * Phase 0a: additive only.
 * Phase 0b: citation corrected from §6.30 → §6.32 (Task 1 calibration).
 */

import React from "react";
import { cn } from "@/lib/utils";

export type BannerVariant = "info" | "warning" | "error" | "success";

export interface BannerAction {
  label: string;
  onClick: () => void;
  /** When true, renders a more prominent button (uses .btn-action-sm). */
  primary?: boolean;
}

export interface BannerProps {
  variant: BannerVariant;
  /** Optional small icon node rendered to the left of the title. */
  icon?: React.ReactNode;
  /** Bold, single-line title. */
  title: React.ReactNode;
  /** Optional dim secondary line. */
  message?: React.ReactNode;
  /** Optional action button(s). The first action with primary=true uses btn-action. */
  actions?: BannerAction[];
  /** Optional dismiss handler. When provided, an "x" close button is rendered. */
  onDismiss?: () => void;
  className?: string;
  /** Override aria-live region politeness. Defaults: error="assertive", others="polite". */
  ariaLive?: "polite" | "assertive" | "off";
}

const VARIANT_CLASS: Record<BannerVariant, string> = {
  info: "fc-card-status-info",
  warning: "fc-card-status-warning",
  error: "fc-card-status-error",
  success: "fc-card-status-success",
};

export function Banner({
  variant,
  icon,
  title,
  message,
  actions,
  onDismiss,
  className,
  ariaLive,
}: BannerProps) {
  const live = ariaLive ?? (variant === "error" ? "assertive" : "polite");

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      aria-live={live}
      className={cn(
        VARIANT_CLASS[variant],
        "rounded-2xl p-4 flex items-start gap-3",
        className
      )}
    >
      {icon ? (
        <div className="shrink-0 mt-0.5" aria-hidden="true">
          {icon}
        </div>
      ) : null}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--fc-text-primary)]">
          {title}
        </p>
        {message ? (
          <p className="mt-1 text-xs text-[var(--fc-text-dim)]">{message}</p>
        ) : null}

        {actions && actions.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {actions.map((a, i) => (
              <button
                key={i}
                type="button"
                onClick={a.onClick}
                className={cn(
                  a.primary ? "btn-action btn-action-sm" : "btn-pill"
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 -mr-1 -mt-1 flex h-8 w-8 items-center justify-center rounded-full text-[var(--fc-text-dim)] hover:text-[var(--fc-text-primary)] hover:bg-[var(--fc-glass-soft)] transition-colors"
        >
          <span aria-hidden="true">×</span>
        </button>
      ) : null}
    </div>
  );
}

export default Banner;
