/**
 * Map prescribed RPE → live-card Effort row.
 * Reuses workoutEffortLabels (same path as appendTargetEffortItem).
 * Valid display range: RPE 6–10; below 6 or null → blank.
 */

import {
  clientEffortLabelFromStoredRpe,
  rpeToEffortTier,
  type EffortTier,
} from "@/lib/workoutEffortLabels";
import type { LiveCardEffort } from "./types";

export function effortFromPrescribedRpe(rpeRaw: unknown): LiveCardEffort {
  if (rpeRaw == null || rpeRaw === "") {
    return { label: null, rpe: null, tier: null };
  }
  const n = Number(rpeRaw);
  if (!Number.isFinite(n) || n < 6) {
    return { label: null, rpe: null, tier: null };
  }
  const tier: EffortTier | null = rpeToEffortTier(n);
  const label = clientEffortLabelFromStoredRpe(n);
  return { label, rpe: n, tier };
}
