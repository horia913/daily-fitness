"use client";

import React from "react";
import { cn } from "@/lib/utils";

/**
 * Shell decision matrix:
 * - `Card` (`components/ui/card.tsx`): legacy shadcn layouts (forms/tables) where `fc-card-shell` is not required.
 * - `AppCard` (`components/ui/AppCard.tsx`): feature row cards with status/header/footer slots.
 * - `GlassCard` (`components/ui/GlassCard.tsx`): coach/admin prescription shell with elevation + press behavior.
 * - `ClientGlassCard` (this file): client-route shell with default p-4 and automatic outline when className contains bg-*.
 */
export type ClientCardShellTone = "neutral" | "success" | "error" | "warning" | "info";

const toneModifier: Record<Exclude<ClientCardShellTone, "neutral">, string> = {
  success: "fc-card-shell--success",
  error: "fc-card-shell--error",
  warning: "fc-card-shell--warning",
  info: "fc-card-shell--info",
};

interface ClientGlassCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Semantic shell tint; neutral = prescription cyan shell. */
  tone?: ClientCardShellTone;
}

export function ClientGlassCard({
  children,
  className,
  style,
  tone = "neutral",
}: ClientGlassCardProps) {
  // Custom `bg-*` only works if we skip the shell fill (outline keeps left accent).
  const hasCustomBg = typeof className === "string" && /\bbg-/.test(className);
  const shellToneClass =
    !hasCustomBg && tone !== "neutral" ? toneModifier[tone] : undefined;

  return (
    <div
      style={style}
      className={cn(
        "p-4",
        hasCustomBg
          ? "fc-card-shell-outline"
          : cn("fc-card-shell", shellToneClass),
        className
      )}
    >
      {children}
    </div>
  );
}

export default ClientGlassCard;
