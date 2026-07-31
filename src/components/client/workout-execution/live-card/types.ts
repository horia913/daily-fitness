import type { EffortTier } from "@/lib/workoutEffortLabels";
import type { ReactNode } from "react";

export type LiveCardHue = "a" | "b" | "c" | "d";

export type LiveCardStatus = "logging" | "resting" | "complete";

/** Target display: prefer reps × weight; unit variants for time/distance. */
export type LiveCardTarget =
  | {
      kind: "reps_weight";
      reps: string | number;
      weight: string | number;
      unit?: string;
    }
  | {
      kind: "reps_only";
      reps: string | number;
      unit?: string;
    }
  | {
      kind: "single";
      value: string | number;
      unit?: string;
    }
  /** Timed / holds — e.g. 45 seconds. */
  | {
      kind: "time";
      seconds: string | number;
      unit?: string;
    }
  /** Endurance / speed — e.g. 400 metres. */
  | {
      kind: "distance";
      meters: string | number;
      unit?: string;
    };

export type LiveCardEffort = {
  /** Display word from workoutEffortLabels (Easy/Medium/Hard/Max). */
  label: string | null;
  /** Stored RPE-like number shown as "RPE N". */
  rpe: number | null;
  tier: EffortTier | null;
};

export type LiveCardTechnique = {
  title: string;
  body: ReactNode;
};

export function groupIndexToHue(groupIndex: number): LiveCardHue {
  const i = ((groupIndex % 4) + 4) % 4;
  return (["a", "b", "c", "d"] as const)[i];
}
