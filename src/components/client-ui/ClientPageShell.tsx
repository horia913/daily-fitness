"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  AtmosphericBackdrop,
  type AtmosphericVariant,
} from "@/components/ui/AtmosphericBackdrop";

/**
 * ClientPageShell — client-side page container.
 *
 * Phase 0b finalization (Sun Apr 26, 2026): `backdrop` prop wires
 * {@link AtmosphericBackdrop} inside the shell (after parent
 * {@link AnimatedBackground} in route trees, before page content). Default
 * `info` = calm cyan halo per design-system-v4 §3. Phase 1+ screens may pass
 * other {@link AtmosphericVariant} values per screen recipe. `absolute` on
 * the backdrop is true so it fills this `relative` shell; content sits in a
 * `relative z-10` wrapper so it paints above the overlay.
 */
interface ClientPageShellProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** v4 atmospheric role; default `info`. Type is {@link AtmosphericVariant} in `AtmosphericBackdrop.tsx`. */
  backdrop?: AtmosphericVariant;
}

export function ClientPageShell({
  children,
  className,
  style,
  backdrop = "info",
}: ClientPageShellProps) {
  return (
    <div
      style={style}
      className={cn(
        "relative z-10 mx-auto w-full max-w-3xl fc-page min-w-0 overflow-x-hidden",
        className
      )}
    >
      <AtmosphericBackdrop variant={backdrop} absolute className="z-0" />
      <div className="relative z-10 min-w-0">{children}</div>
    </div>
  );
}

export default ClientPageShell;
