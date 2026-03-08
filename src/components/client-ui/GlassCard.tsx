"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ClientGlassCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function ClientGlassCard({ children, className, style }: ClientGlassCardProps) {
  return (
    <div
      style={style}
      className={cn(
        "fc-surface rounded-2xl border border-[color:var(--fc-glass-border)] p-4",
        "bg-[color:var(--fc-surface-card)]",
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
