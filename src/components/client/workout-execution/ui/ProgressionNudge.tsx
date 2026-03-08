"use client";

import React from "react";
import { Lightbulb, ArrowUpRight } from "lucide-react";
import type { ProgressionSuggestion } from "@/lib/clientProgressionService";

interface PreviousPerformanceData {
  lastWorkout: {
    weight: number | null;
    reps: number | null;
    avgRpe: number | null;
  } | null;
}

interface ProgressionNudgeProps {
  suggestion: ProgressionSuggestion | null | undefined;
  previousPerformance: PreviousPerformanceData | null | undefined;
  onApplySuggestion?: (weight: number | null, reps: number | null) => void;
}

function getBorderAndBg(type: ProgressionSuggestion["type"]): string {
  switch (type) {
    case "progress":
      return "bg-emerald-900/20 border-emerald-700/30";
    case "repeat":
    case "plateau":
      return "bg-amber-900/20 border-amber-700/30";
    case "match":
      return "bg-gray-700/30 border-gray-600/30";
    case "deload":
      return "bg-blue-900/20 border-blue-700/30";
    default:
      return "bg-gray-800/20 border-gray-700/30";
  }
}

function getIconColor(type: ProgressionSuggestion["type"]): string {
  switch (type) {
    case "progress":
      return "text-emerald-400";
    case "repeat":
    case "plateau":
      return "text-amber-400";
    case "match":
      return "text-gray-400";
    case "deload":
      return "text-blue-400";
    default:
      return "text-gray-400";
  }
}

function buildLastTimeLine(
  lastWorkout: PreviousPerformanceData["lastWorkout"]
): string | null {
  if (!lastWorkout) return null;
  const { weight, reps, avgRpe } = lastWorkout;
  const parts: string[] = [];
  if (weight != null && weight > 0) parts.push(`${weight}kg`);
  if (reps != null) parts.push(`× ${reps}`);
  if (parts.length === 0) return null;
  const base = `Last time: ${parts.join(" ")}`;
  if (avgRpe != null) return `${base} · RPE ${avgRpe}`;
  return base;
}

export function ProgressionNudge({
  suggestion,
  previousPerformance,
  onApplySuggestion,
}: ProgressionNudgeProps) {
  console.log('[ProgressionNudge] RENDER:', {
    suggestion: suggestion?.type || 'null',
    previousPerformance: previousPerformance?.lastWorkout ? 'has data' : 'null',
    lastTimeLineWeight: previousPerformance?.lastWorkout?.weight,
  });

  const lastTimeLine = buildLastTimeLine(
    previousPerformance?.lastWorkout ?? null
  );

  // Don't render if there is nothing to show
  if (!lastTimeLine && !suggestion) return null;

  // Don't show an empty nudge for first_time with no previous data context
  if (suggestion?.type === "first_time" && !lastTimeLine) return null;

  const colorClasses = getBorderAndBg(suggestion?.type);
  const iconColorClass = getIconColor(suggestion?.type);

  const hasSuggestedValues =
    suggestion?.suggestedWeight != null || suggestion?.suggestedReps != null;
  const showApply = !!onApplySuggestion && hasSuggestedValues;

  return (
    <div
      className={`mb-3 w-full flex items-start gap-2 px-3 py-2 rounded-lg text-sm border ${colorClasses}`}
    >
      <Lightbulb
        className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${iconColorClass}`}
      />
      <div className="flex-1 min-w-0">
        {lastTimeLine && (
          <p className="text-xs text-gray-400 leading-snug">{lastTimeLine}</p>
        )}
        {suggestion && suggestion.type !== "first_time" && suggestion.message && (
          <p className="text-xs text-gray-200 leading-snug mt-0.5">
            {suggestion.message}
          </p>
        )}
      </div>
      {showApply && (
        <button
          onClick={() =>
            onApplySuggestion(
              suggestion?.suggestedWeight ?? null,
              suggestion?.suggestedReps ?? null
            )
          }
          className="flex-shrink-0 flex items-center gap-0.5 text-xs font-medium text-gray-300 hover:text-white transition-colors ml-1"
        >
          Apply
          <ArrowUpRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
