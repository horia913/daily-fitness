"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface PillProps {
  children: React.ReactNode;
  className?: string;
}

export function Pill({ children, className }: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider",
        "bg-[color:var(--fc-glass-soft)]",
        "border border-[color:var(--fc-glass-border)]",
        "fc-text-dim",
        className
      )}
    >
      {children}
    </span>
  );
}

export default Pill;
