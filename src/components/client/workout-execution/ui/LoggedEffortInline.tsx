"use client";

/**
 * Inline coloured effort word for logged-set history
 * (done .srow rows + LoggedSetsList titles).
 * Reuses workoutEffortLabels → --fc-effort-* (same as LiveCard effort stat).
 */

import {
  clientEffortLabelFromStoredRpe,
  rpeToEffortTier,
  type EffortTier,
} from "@/lib/workoutEffortLabels";
import { cn } from "@/lib/utils";
import setUnitStyles from "./set-rows/setUnitRow.module.css";

const TIER_CLASS: Record<EffortTier, string> = {
  easy: setUnitStyles.effortEasy,
  medium: setUnitStyles.effortMedium,
  hard: setUnitStyles.effortHard,
  max: setUnitStyles.effortMax,
};

/** Renders ` · RPE 8 · Hard` with Hard coloured by tier. Null when no RPE. */
export function LoggedEffortInline({
  rpe,
}: {
  rpe: number | null | undefined;
}) {
  const tier = rpeToEffortTier(rpe);
  const label = clientEffortLabelFromStoredRpe(rpe);
  if (tier == null || !label || rpe == null || Number(rpe) <= 0) return null;
  return (
    <>
      {" · RPE "}
      {Math.round(Number(rpe))}
      {" · "}
      <span className={cn(TIER_CLASS[tier])}>{label}</span>
    </>
  );
}
