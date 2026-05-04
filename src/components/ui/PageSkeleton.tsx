"use client";

import React from "react";
import { cn } from "@/lib/utils";

/**
 * PageSkeleton — structural first-load skeleton.
 *
 * Skeleton usage guide:
 * - `Skeleton` / `SkeletonCard` (`components/ui/Skeleton.tsx`): generic inline pulse primitives for ad-hoc loading states inside components.
 * - `LoadingSkeleton` (`components/ui/LoadingSkeleton.tsx`): list-row skeleton tuned for coach dashboard list rows.
 * - `PageSkeleton` (this file): full-page placeholder with structural variants for route-level loading states.
 *
 * Variants ratified 2026-04-16 (see `docs/ui/95-STANDARD.md` §12 and
 * `docs/ui/UI-UPLIFT-WORKFLOW.md`). Three shapes cover ~90% of the 22
 * pages that still show a full-page spinner:
 *
 *   - `dashboard` — hero-sized top block + three stacked section blocks.
 *                   Matches the coach-dashboard loading shape (hero + 3).
 *   - `list`      — filter/toolbar bar + six roster rows.
 *                   Use on `/coach/clients`, `/coach/programs`, etc.
 *   - `form`      — header + five field groups.
 *                   Use on `/coach/clients/add`, any create/edit form.
 *
 * **Width-agnostic on purpose.** The caller is expected to wrap this
 * component in its page shell (`ClientPageShell` or `CoachPageShell`)
 * so loading and loaded states live inside the same shell, at the same
 * width and padding. See `.cursor/rules/ui-page-shells.md`.
 *
 * Visual primitive: `fc-skeleton` (shimmer gradient defined in
 * `src/styles/ui-system.css`). This matches the coach-dashboard
 * benchmark's loading branch (`<div className="fc-skeleton rounded-2xl"
 * style={{ height: ... }} />`).
 */
export type PageSkeletonVariant = "dashboard" | "list" | "form";

interface PageSkeletonProps {
  variant: PageSkeletonVariant;
  className?: string;
}

function SkeletonBlock({
  height,
  className,
}: {
  height: number;
  className?: string;
}) {
  return (
    <div
      className={cn("fc-skeleton rounded-2xl", className)}
      style={{ height }}
      aria-hidden
    />
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <SkeletonBlock height={100} />
      <SkeletonBlock height={180} />
      <SkeletonBlock height={200} />
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <SkeletonBlock height={64} />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBlock key={i} height={72} />
        ))}
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <SkeletonBlock height={48} className="w-1/2" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <SkeletonBlock height={16} className="w-32" />
          <SkeletonBlock height={44} />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton({ variant, className }: PageSkeletonProps) {
  return (
    <div className={cn("w-full", className)} aria-hidden>
      {variant === "dashboard" && <DashboardSkeleton />}
      {variant === "list" && <ListSkeleton />}
      {variant === "form" && <FormSkeleton />}
    </div>
  );
}

export default PageSkeleton;
