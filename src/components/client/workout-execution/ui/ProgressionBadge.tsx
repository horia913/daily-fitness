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
    <Badge
      variant="outline"
      className="mb-3 w-full justify-start bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100"
    >
      <TrendingUp className="w-3 h-3 mr-2" />
      <span className="text-sm font-medium">{suggestion.message}</span>
    </Badge>
  );
}
