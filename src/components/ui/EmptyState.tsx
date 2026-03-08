"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface EmptyStateProps {
  /** Icon as ReactNode (existing usage) or LucideIcon component */
  icon?: React.ReactNode | LucideIcon;
  title: string;
  description?: string;
  /** Legacy: use action object for link/button */
  action?: EmptyStateAction;
  /** New: optional CTA label */
  actionLabel?: string;
  /** New: optional CTA click handler */
  onAction?: () => void;
  /** New: optional CTA href (renders as link) */
  actionHref?: string;
  variant?: "default" | "compact" | "inline";
  className?: string;
}

function EmptyState({
  icon,
  title,
  description,
  action,
  actionLabel,
  onAction,
  actionHref,
  variant = "default",
  className,
}: EmptyStateProps) {
  let iconNode: React.ReactNode = null;

  if (icon) {
    if (React.isValidElement(icon)) {
      // Already a rendered element like <Dumbbell />
      iconNode = icon;
    } else if (
      typeof icon === "function" ||
      (typeof icon === "object" &&
        // Handle forwardRef / memo components which are objects with render/$$typeof
        (icon as any).render)
    ) {
      const Icon = icon as LucideIcon;
      iconNode = <Icon className="w-full h-full" />;
    }
  }

  const actionButton =
    action?.label != null ? (
      action.href ? (
        <Link href={action.href}>
          <Button variant="fc-primary" className="mt-3">
            {action.label}
          </Button>
        </Link>
      ) : action.onClick ? (
        <Button variant="fc-primary" className="mt-3" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null
    ) : actionLabel && (actionHref ? (
      <Link href={actionHref}>
        <Button variant="outline" className="mt-3">
          {actionLabel}
        </Button>
      </Link>
    ) : onAction ? (
      <Button variant="outline" className="mt-3" onClick={onAction}>
        {actionLabel}
      </Button>
    ) : null);

  if (variant === "inline") {
    return (
      <p
        className={cn(
          "text-sm fc-text-dim text-center py-4",
          className
        )}
      >
        {title}
      </p>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("text-center py-6", className)}>
        {iconNode && (
          <div className="w-8 h-8 mx-auto mb-2 flex items-center justify-center [&_svg]:w-8 [&_svg]:h-8 fc-text-dim opacity-50">
            {iconNode}
          </div>
        )}
        <p className="text-sm font-medium fc-text-primary">{title}</p>
        {description && (
          <p className="text-xs fc-text-dim mt-1">{description}</p>
        )}
        {actionButton}
      </div>
    );
  }

  // default variant
  return (
    <div
      className={cn(
        "fc-surface rounded-2xl p-8 text-center flex flex-col items-center justify-center",
        className
      )}
    >
      {iconNode && (
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 bg-[color:var(--fc-surface-sunken)] [&_svg]:w-8 [&_svg]:h-8 [&_svg]:fc-text-dim opacity-80">
          {iconNode}
        </div>
      )}
      <h3 className="text-base font-semibold fc-text-primary mb-2">{title}</h3>
      {description && (
        <p className="text-sm fc-text-subtle mt-1 max-w-sm mx-auto mb-6">
          {description}
        </p>
      )}
      {actionButton && <div className="mt-4">{actionButton}</div>}
    </div>
  );
}

export { EmptyState };
