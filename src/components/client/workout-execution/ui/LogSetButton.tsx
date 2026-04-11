"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface LogSetButtonProps {
  onClick: () => void;
  ready: boolean;
  loading?: boolean;
  label?: string;
  className?: string;
}

/**
 * Primary log CTA: cyan/teal gradient always; dimmer when not ready (no gray).
 * Never uses `disabled` — parent should no-op in onClick when not ready.
 */
export function LogSetButton({
  onClick,
  ready,
  loading = false,
  label = "Log set",
  className,
}: LogSetButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-busy={loading}
      className={cn(
        "relative w-full overflow-hidden rounded-xl px-4 py-3.5 text-base font-semibold text-white shadow-lg transition-all active:scale-[0.98]",
        "bg-gradient-to-r from-cyan-600 via-cyan-500 to-teal-500 ring-1 ring-cyan-400/30 ring-inset shadow-cyan-500/25",
        ready && !loading && "active:brightness-110",
        !ready && !loading && "opacity-50",
        loading && "opacity-90",
        className,
      )}
    >
      <span className="relative z-10 uppercase tracking-wide">
        {loading ? "Saving…" : label}
      </span>
    </button>
  );
}
