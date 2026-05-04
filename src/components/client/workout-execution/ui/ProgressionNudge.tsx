"use client";

import React from "react";
import { Lightbulb, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/ui/Eyebrow";
import type { ProgressionSuggestion } from "@/lib/clientProgressionService";
import {
  clientEffortLabelFromStoredRpe,
  formatEffortSuffix,
  formatEffortSuffixFromAverage,
  rpeToEffortTier,
  type EffortTier,
} from "@/lib/workoutEffortLabels";

const TIER_PILL_CLASS: Record<EffortTier, string> = {
  easy: "text-[color:var(--fc-effort-easy)] bg-[color:var(--fc-effort-easy-soft)] border-[color:var(--fc-effort-easy-border)]",
  medium:
    "text-[color:var(--fc-effort-medium)] bg-[color:var(--fc-effort-medium-soft)] border-[color:var(--fc-effort-medium-border)]",
  hard: "text-[color:var(--fc-effort-hard)] bg-[color:var(--fc-effort-hard-soft)] border-[color:var(--fc-effort-hard-border)]",
  max: "text-[color:var(--fc-effort-max)] bg-[color:var(--fc-effort-max-soft)] border-[color:var(--fc-effort-max-border)]",
};

/** Inline effort pill for "Last time: …kg × …reps [Hard]" rows. */
function EffortInlinePill({ rpe }: { rpe: number | null | undefined }) {
  const tier = rpeToEffortTier(rpe);
  const label = clientEffortLabelFromStoredRpe(rpe);
  if (!tier || !label) return null;
  return (
    <span
      className={cn(
        "ml-1.5 inline-flex items-center rounded-full border py-[2px] px-[7px] text-[12px] font-semibold leading-tight",
        "font-sans",
        TIER_PILL_CLASS[tier],
      )}
    >
      {label}
    </span>
  );
}

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

type LastWorkoutShape = {
  weight?: number | null;
  reps?: number | null;
  avgRpe?: number | null;
  setDetails?: Array<{
    set_number?: number;
    weight_kg: number | null;
    reps_completed: number | null;
    rpe?: number | null;
  }> | null;
};

interface LastTimeDisplay {
  weight: number | null;
  reps: number | null;
  rpe: number | null;
}

function isLastTimeEmpty(d: LastTimeDisplay | null | undefined): boolean {
  if (!d) return true;
  const hasW = d.weight != null && d.weight > 0;
  const hasR = d.reps != null;
  return !hasW && !hasR;
}

function formatWeightNumForLastTime(w: number): string {
  return Number.isInteger(w) ? String(w) : String(w);
}

function pickLastTimeDisplay(
  lastWorkout: LastWorkoutShape | null | undefined,
): LastTimeDisplay | null {
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
  const avg =
    lastWorkout.avgRpe != null && lastWorkout.avgRpe > 0
      ? Math.round(lastWorkout.avgRpe)
      : null;
  const wn =
    weight != null && weight > 0 ? (typeof weight === "number" ? weight : Number(weight)) : null;
  const rn = reps != null ? (typeof reps === "number" ? reps : Number(reps)) : null;
  const d: LastTimeDisplay = {
    weight: wn != null && Number.isFinite(wn) && wn > 0 ? wn : null,
    reps: rn != null && Number.isFinite(rn) ? rn : null,
    rpe: avg,
  };
  return isLastTimeEmpty(d) ? null : d;
}

function pickLastTimeDisplayForSet(
  lastWorkout: LastWorkoutShape | null | undefined,
  setNumber: number,
): LastTimeDisplay | null {
  if (!lastWorkout || setNumber < 1) return null;
  const details = lastWorkout.setDetails;
  if (Array.isArray(details) && details.length > 0) {
    const row = details.find((s) => Number(s.set_number) === setNumber);
    if (row) {
      const w =
        row.weight_kg != null && row.weight_kg > 0 ? row.weight_kg : null;
      const r =
        row.reps_completed != null && Number.isFinite(Number(row.reps_completed))
          ? row.reps_completed
          : null;
      const d: LastTimeDisplay = {
        weight: w,
        reps: r,
        rpe: row.rpe != null && row.rpe > 0 ? Math.round(Number(row.rpe)) : null,
      };
      if (!isLastTimeEmpty(d)) return d;
    }
  }
  return pickLastTimeDisplay(lastWorkout);
}

/** Back-compat: build "Last time: …" string (kept in case external callers import). */
export function formatLastTimeSummary(
  lastWorkout: LastWorkoutShape | null | undefined,
): string | null {
  const d = pickLastTimeDisplay(lastWorkout);
  if (!d || isLastTimeEmpty(d)) return null;
  const parts: string[] = [];
  if (d.weight != null && d.weight > 0)
    parts.push(`${formatWeightNumForLastTime(d.weight)}kg`);
  if (d.reps != null) parts.push(`× ${d.reps}`);
  const text = parts.join(" ");
  const effort = formatEffortSuffix(d.rpe) ?? formatEffortSuffixFromAverage(d.rpe);
  return `Last time: ${text}${effort ?? ""}`;
}

/** Back-compat for set-specific text. */
export function formatLastTimeForSetNumber(
  lastWorkout: LastWorkoutShape | null | undefined,
  setNumber: number,
): string | null {
  const d = pickLastTimeDisplayForSet(lastWorkout, setNumber);
  if (!d || isLastTimeEmpty(d)) return null;
  const parts: string[] = [];
  if (d.weight != null && d.weight > 0)
    parts.push(`${formatWeightNumForLastTime(d.weight)}kg`);
  if (d.reps != null) parts.push(`× ${d.reps}`);
  const text = parts.join(" ");
  const effort = formatEffortSuffix(d.rpe);
  return effort ? `${text}${effort}` : text;
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
  const lastTimeDisplay: LastTimeDisplay | null =
    showPreviousSession === false
      ? null
      : previousSessionSetNumber != null && previousSessionSetNumber >= 1
        ? pickLastTimeDisplayForSet(lw as LastWorkoutShape, previousSessionSetNumber)
        : pickLastTimeDisplay(lw as LastWorkoutShape);

  const showSuggestionText = Boolean(
    suggestion &&
      suggestion.type !== "first_time" &&
      suggestion.message,
  );

  const hasSuggestedValues =
    suggestion?.suggestedWeight != null || suggestion?.suggestedReps != null;
  const showApply = !!onApplySuggestion && hasSuggestedValues;

  if (suggestion?.type === "first_time" && isLastTimeEmpty(lastTimeDisplay))
    return null;

  if (isLastTimeEmpty(lastTimeDisplay) && !showSuggestionText && !showApply)
    return null;

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
        {previousSessionSetNumber != null && lastTimeDisplay ? (
          <Eyebrow
            tone="zinc"
            density="section"
            className="!text-[10px] !font-medium !text-gray-500"
          >
            Previous session · Set {previousSessionSetNumber}
          </Eyebrow>
        ) : null}
        {lastTimeDisplay ? (
          <p
            className="leading-snug text-[14px] font-semibold text-[color:var(--fc-text-primary)]"
            style={{
              fontFamily:
                "var(--font-bricolage-grotesque, var(--font-sans), ui-sans-serif)",
            }}
          >
            <span className="font-sans font-normal text-[color:var(--fc-text-dim)]">
              Last time:{" "}
            </span>
            {lastTimeDisplay.weight != null && lastTimeDisplay.weight > 0 ? (
              <>
                <span
                  className="num mx-px text-[18px] font-bold text-[color:var(--fc-text-primary)]"
                  style={{
                    fontFamily:
                      "var(--font-display, var(--font-number, ui-sans-serif))",
                  }}
                >
                  {formatWeightNumForLastTime(lastTimeDisplay.weight)}
                </span>
                <span className="font-sans text-[14px] font-medium text-[color:var(--fc-text-quaternary)]">
                  {" "}
                  kg
                </span>
              </>
            ) : null}
            {lastTimeDisplay.reps != null ? (
              <>
                {lastTimeDisplay.weight != null && lastTimeDisplay.weight > 0 ? (
                  <span className="font-sans font-normal text-[color:var(--fc-text-dim)]">
                    {" "}
                    ×{" "}
                  </span>
                ) : null}
                <span
                  className="num mx-px text-[18px] font-bold text-[color:var(--fc-text-primary)]"
                  style={{
                    fontFamily:
                      "var(--font-display, var(--font-number, ui-sans-serif))",
                  }}
                >
                  {String(lastTimeDisplay.reps)}
                </span>
                <span className="font-sans text-[14px] font-medium text-[color:var(--fc-text-quaternary)]">
                  {" "}
                  reps
                </span>
              </>
            ) : null}
            <EffortInlinePill rpe={lastTimeDisplay.rpe} />
          </p>
        ) : null}
        {showSuggestionText ? (
          <p
            className={`text-xs text-gray-200 leading-snug ${lastTimeDisplay ? "pt-0.5" : ""}`}
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
