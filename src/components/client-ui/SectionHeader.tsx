"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, action, className }: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between mb-3",
        className
      )}
    >
      <h2 className="text-sm font-bold uppercase tracking-widest fc-text-dim">
        {title}
      </h2>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export default SectionHeader;
