"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ClientPageShellProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function ClientPageShell({ children, className, style }: ClientPageShellProps) {
  return (
    <div
      style={style}
      className={cn(
        "relative z-10 mx-auto w-full max-w-3xl fc-page min-w-0 overflow-x-hidden",
        className
      )}
    >
      {children}
    </div>
  );
}

export default ClientPageShell;
