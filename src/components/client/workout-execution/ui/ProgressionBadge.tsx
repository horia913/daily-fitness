"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";
import type { ProgressionSuggestion } from "@/lib/clientProgressionService";

interface ProgressionBadgeProps {
  suggestion: ProgressionSuggestion | null | undefined;
  exerciseId: string;
}

export function ProgressionBadge({
  suggestion,
  exerciseId,
}: ProgressionBadgeProps) {
  if (!suggestion) {
    return null;
  }

  return (
    <div
      className="mb-3 w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
      style={{
        background: "color-mix(in srgb, var(--fc-status-success) 10%, var(--fc-surface-card))",
        border: "1px solid color-mix(in srgb, var(--fc-status-success) 25%, transparent)",
      }}
    >
      <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--fc-status-success)" }} />
      <span className="text-xs font-medium fc-text-primary">{suggestion.message}</span>
    </div>
  );
}
