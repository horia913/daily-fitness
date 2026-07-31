"use client";

import React from "react";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface ApplySuggestedWeightButtonProps {
  suggestedKg: number;
  onApply: () => void;
  className?: string;
}

/** Mock suggest-pill: lightning + “Apply suggested · X kg”. */
export function ApplySuggestedWeightButton({
  suggestedKg,
  onApply,
  className = "",
}: ApplySuggestedWeightButtonProps) {
  return (
    <button
      type="button"
      onClick={onApply}
      className={cn(
        "mb-3.5 inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[color:var(--fc-glass-border)] bg-white/[0.04] px-3 py-1.5 text-[11.5px] font-semibold text-[color:var(--fc-group-c)] transition-opacity hover:opacity-95",
        className,
      )}
    >
      <Zap className="h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden />
      Apply suggested · {suggestedKg} kg
    </button>
  );
}
