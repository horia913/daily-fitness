"use client";

import React from "react";
import { Lightbulb, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProgressionSuggestion } from "@/lib/clientProgressionService";
import {
  formatEffortSuffix,
  formatEffortSuffixFromAverage,
} from "@/lib/workoutEffortLabels";

interface PreviousPerformanceData {
  lastWorkout: {
    weight: number | null;
    reps: number | null;
    avgRpe: number | null;
    setDetails?: Array<{
      set_number?: number;
      weight_kg: number | null;
      reps_completed: number | null;
      rpe?: number | null;
    }> | null;
  } | null;
}

interface ProgressionNudgeProps {
  suggestion: ProgressionSuggestion | null | undefined;
  previousPerformance: PreviousPerformanceData | null | undefined;
  onApplySuggestion?: (weight: number | null, reps: number | null) => void;
  /** Merged onto the root container (e.g. `mb-0` when embedded in PrescriptionCard). */
  className?: string;
  /**
   * When set, last-session text uses the row matching this set/round in setDetails
   * (superset / giant / pre-exhaust).
   */
  previousSessionSetNumber?: number;
  /**
   * When false, hide previous-session lines (e.g. top nudge for multi-exercise blocks
   * where each exercise has its own nudge below).
   */
  showPreviousSession?: boolean;
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

/** Build “Last time: …” for PrescriptionCard / nudge logic. Uses setDetails row 1 when aggregate weight/reps are empty. */
export function formatLastTimeSummary(
  lastWorkout: {
    weight?: number | null;
    reps?: number | null;
    avgRpe?: number | null;
    setDetails?: Array<{
      set_number?: number;
      weight_kg: number | null;
      reps_completed: number | null;
      rpe?: number | null;
    }> | null;
  } | null | undefined,
): string | null {
  if (!lastWorkout) return null;
  let weight: number | null | undefined = lastWorkout.weight ?? null;
  let reps: number | null | undefined = lastWorkout.reps ?? null;
  const hasUsefulAggregate =
    (weight != null && weight > 0) || (reps != null && reps > 0);
  if (
    !hasUsefulAggregate &&
    Array.isArray(lastWorkout.setDetails) &&
    lastWorkout.setDetails.length > 0
  ) {
    const sorted = [...lastWorkout.setDetails].sort(
      (a, b) => (a.set_number ?? 0) - (b.set_number ?? 0),
    );
    const row = sorted[0];
    if (weight == null || weight <= 0) weight = row.weight_kg;
    if (reps == null || (typeof reps === "number" && reps <= 0))
      reps = row.reps_completed;
  }
  const parts: string[] = [];
  if (weight != null && weight > 0) parts.push(`${weight}kg`);
  if (reps != null) parts.push(`× ${reps}`);
  if (parts.length === 0) return null;
  const base = `Last time: ${parts.join(" ")}`;
  const effort = formatEffortSuffixFromAverage(lastWorkout.avgRpe);
  return effort ? `${base}${effort}` : base;
}

type LastWorkoutShape = NonNullable<Parameters<typeof formatLastTimeSummary>[0]>;

/**
 * Text for one exercise’s previous log for a specific set_number (e.g. superset round 2).
 * Prefers the matching row in setDetails; otherwise falls back to session aggregate.
 */
export function formatLastTimeForSetNumber(
  lastWorkout: LastWorkoutShape | null | undefined,
  setNumber: number,
): string | null {
  if (!lastWorkout || setNumber < 1) return null;

  const details = lastWorkout.setDetails;
  if (Array.isArray(details) && details.length > 0) {
    const row = details.find((s) => Number(s.set_number) === setNumber);
    if (row) {
      const parts: string[] = [];
      if (row.weight_kg != null && row.weight_kg > 0)
        parts.push(`${row.weight_kg}kg`);
      if (row.reps_completed != null) parts.push(`× ${row.reps_completed}`);
      if (parts.length > 0) {
        let s = parts.join(" ");
        const effort = formatEffortSuffix(row.rpe);
        if (effort) s += effort;
        return s;
      }
    }
  }

  return formatLastTimeSummary(lastWorkout);
}

function buildLastTimeLine(
  lastWorkout: PreviousPerformanceData["lastWorkout"],
): string | null {
  return formatLastTimeSummary(lastWorkout ?? undefined);
}

function normalizeLastTimeDisplay(raw: string | null): string | null {
  if (raw == null || !raw.trim()) return null;
  if (raw.startsWith("Last time")) return raw;
  return `Last time: ${raw}`;
}

export function ProgressionNudge({
  suggestion,
  previousPerformance,
  onApplySuggestion,
  previousSessionSetNumber,
  showPreviousSession = true,
  className,
}: ProgressionNudgeProps) {
  const lw = previousPerformance?.lastWorkout ?? null;
  const rawLastTime =
    showPreviousSession === false
      ? null
      : previousSessionSetNumber != null && previousSessionSetNumber >= 1
        ? formatLastTimeForSetNumber(lw as LastWorkoutShape, previousSessionSetNumber)
        : buildLastTimeLine(lw);
  const lastTimeLine = normalizeLastTimeDisplay(rawLastTime);

  const showSuggestionText = Boolean(
    suggestion &&
      suggestion.type !== "first_time" &&
      suggestion.message,
  );

  const hasSuggestedValues =
    suggestion?.suggestedWeight != null || suggestion?.suggestedReps != null;
  const showApply = !!onApplySuggestion && hasSuggestedValues;

  if (suggestion?.type === "first_time" && !lastTimeLine) return null;

  if (!lastTimeLine && !showSuggestionText && !showApply) return null;

  const colorClasses = getBorderAndBg(suggestion?.type);
  const iconColorClass = getIconColor(suggestion?.type);

  return (
    <div
      className={cn(
        "mb-3 w-full flex items-start gap-2 px-3 py-2 rounded-lg text-sm border",
        colorClasses,
        className,
      )}
    >
      <Lightbulb
        className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${iconColorClass}`}
      />
      <div className="flex-1 min-w-0 space-y-1">
        {previousSessionSetNumber != null && lastTimeLine ? (
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
            Previous session · Set {previousSessionSetNumber}
          </p>
        ) : null}
        {lastTimeLine ? (
          <p className="text-xs text-gray-300 leading-snug">{lastTimeLine}</p>
        ) : null}
        {showSuggestionText ? (
          <p
            className={`text-xs text-gray-200 leading-snug ${lastTimeLine ? "pt-0.5" : ""}`}
          >
            {suggestion!.message}
          </p>
        ) : null}
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
