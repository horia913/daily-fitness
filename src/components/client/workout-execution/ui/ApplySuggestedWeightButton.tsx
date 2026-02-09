"use client";

import React from "react";

interface ApplySuggestedWeightButtonProps {
  suggestedKg: number;
  onApply: () => void;
  className?: string;
}

/** Small button shown below weight input: "Apply suggested (75kg)". */
export function ApplySuggestedWeightButton({
  suggestedKg,
  onApply,
  className = "",
}: ApplySuggestedWeightButtonProps) {
  return (
    <button
      type="button"
      onClick={onApply}
      className={
        "text-xs font-medium rounded-lg px-3 py-1.5 transition-all active:scale-95 " +
        className
      }
      style={{
        background: 'color-mix(in srgb, var(--fc-domain-workouts) 10%, var(--fc-surface-card))',
        border: '1px solid color-mix(in srgb, var(--fc-domain-workouts) 25%, transparent)',
        color: 'var(--fc-domain-workouts)',
      }}
    >
      Apply suggested ({suggestedKg} kg)
    </button>
  );
}
