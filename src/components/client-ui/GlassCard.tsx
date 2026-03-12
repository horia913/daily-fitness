"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ClientGlassCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function ClientGlassCard({ children, className, style }: ClientGlassCardProps) {
  // IMPORTANT: Custom card backgrounds (e.g. bg-cyan-600, bg-amber-50) only work if we do
  // NOT add the .fc-surface class here. That class is defined in ui-system.css and sets
  // background: var(--fc-surface-card), which overrides Tailwind bg-* on the same element.
  // So when the parent passes any bg-* class, we skip fc-surface so their background shows.
  const hasCustomBg = typeof className === "string" && /\bbg-/.test(className);
  return (
    <div
      style={style}
      className={cn(
        "rounded-2xl border border-[color:var(--fc-glass-border)] p-4",
        !hasCustomBg && "fc-surface bg-[color:var(--fc-surface-card)]",
        "backdrop-blur-[8px]",
        "shadow-[var(--fc-shadow-card)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export default ClientGlassCard;
