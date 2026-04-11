"use client";

import React from "react";
import { cn } from "@/lib/utils";

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
