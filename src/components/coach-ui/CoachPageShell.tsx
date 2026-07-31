"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  AtmosphericBackdrop,
  type AtmosphericVariant,
} from "@/components/ui/AtmosphericBackdrop";

/**
 * CoachPageShell — the coach-side page container primitive.
 *
 * Phase 0b finalization (Sun Apr 26, 2026): `backdrop` prop wires
 * {@link AtmosphericBackdrop} inside the shell (after parent
 * {@link AnimatedBackground} in route trees, before page content). Default
 * `info`. Same stacking pattern as {@link ClientPageShell}.
 *
 * Mirrors `ClientPageShell` structurally:
 *   - `relative z-10 mx-auto w-full fc-page min-w-0 overflow-x-hidden`
 *
 * The only additions on top of `ClientPageShell`'s base are:
 *   - a `widthVariant` prop that picks one of four agreed widths
 *     (ratified 2026-04-16 with the user; see
 *     `docs/ui/95-STANDARD.md` §3 and `docs/ui/screen-inventory.md`)
 *
 * The benchmark for this primitive is the coach dashboard
 * (`src/app/coach/page.tsx`), which uses the `benchmark-5xl` variant.
 *
 * `widthVariant` guide (see `docs/ui/screen-inventory.md` for per-route assignments):
 *   - `benchmark-5xl` : the coach dashboard itself. Freeze-parity variant.
 *                      Renders `max-w-5xl`. Used only by `/coach/page.tsx`.
 *   - `default-5xl`   : the default for coach hero + detail pages that are
 *                      not data-dense. Renders `max-w-5xl`. Same width as
 *                      `benchmark-5xl` today — the distinction is semantic
 *                      so that future divergence (padding, gaps) does not
 *                      require a variant rename.
 *   - `data-7xl`      : data-dense list / roster / table views (rosters
 *                      with > 6 columns or grids that fill 4 columns at
 *                      ≥1280px). Renders `max-w-7xl`.
 *   - `canvas-full`   : editing canvases (program station, meal builder).
 *                      No max-width cap — full viewport width with page-level gutters.
 *   - `form-2xl`      : single-column forms and wizards. Renders `max-w-2xl`.
 *
 * The `className` prop can still override the width on a case-by-case basis
 * thanks to `tailwind-merge` inside `cn()`; use that only when the four
 * variants above genuinely do not fit, and update the user first.
 */
export type CoachPageShellWidthVariant =
  | "benchmark-5xl"
  | "default-5xl"
  | "data-7xl"
  | "canvas-full"
  | "form-2xl";

interface CoachPageShellProps {
  children: React.ReactNode;
  widthVariant?: CoachPageShellWidthVariant;
  className?: string;
  style?: React.CSSProperties;
  backdrop?: AtmosphericVariant;
}

const WIDTH_BY_VARIANT: Record<CoachPageShellWidthVariant, string> = {
  "benchmark-5xl": "max-w-5xl",
  "default-5xl": "max-w-5xl",
  "data-7xl": "max-w-7xl",
  "canvas-full": "max-w-none",
  "form-2xl": "max-w-2xl",
};

export function CoachPageShell({
  children,
  widthVariant = "default-5xl",
  className,
  style,
  backdrop = "info",
}: CoachPageShellProps) {
  const widthClass = WIDTH_BY_VARIANT[widthVariant];

  return (
    <div
      style={style}
      className={cn(
        "relative z-10 mx-auto w-full fc-page min-w-0 overflow-x-hidden",
        widthClass,
        className
      )}
    >
      <AtmosphericBackdrop variant={backdrop} absolute className="z-0" />
      <div className="relative z-10 min-w-0">{children}</div>
    </div>
  );
}

export default CoachPageShell;
