/**
 * Map prescribed RIR/RPE column → live-card Effort row.
 * Reuses workoutEffortLabels (same path as appendTargetEffortItem) — no new mapping.
 */

import {
  clientEffortLabelFromStoredRpe,
  rpeToEffortTier,
  type EffortTier,
} from "@/lib/workoutEffortLabels";
import type { LiveCardEffort } from "./types";

export function effortFromPrescribedRir(rirRaw: unknown): LiveCardEffort {
  if (rirRaw == null || rirRaw === "") {
    return { label: null, rpe: null, tier: null };
  }
  const n = Number(rirRaw);
  if (!Number.isFinite(n) || n <= 0) {
    return { label: null, rpe: null, tier: null };
  }
  const tier: EffortTier | null = rpeToEffortTier(n);
  const label = clientEffortLabelFromStoredRpe(n);
  return { label, rpe: n, tier };
}
