import type { LucideIcon } from "lucide-react";
import type { PrescriptionItem, PrescriptionItemTone } from "./ui/PrescriptionCard";
import {
  clientEffortLabelFromStoredRpe,
  rpeToEffortTier,
} from "@/lib/workoutEffortLabels";

/** Push one `kind: "target-effort"` row when prescribed RIR/RPE is a positive number. */
export function appendTargetEffortItem(
  items: PrescriptionItem[],
  rirRaw: unknown,
  icon: LucideIcon,
  label = "Target effort",
): void {
  if (rirRaw == null || rirRaw === "") return;
  const n = Number(rirRaw);
  if (!Number.isFinite(n) || n <= 0) return;
  const tier = rpeToEffortTier(n);
  const tierLabel = clientEffortLabelFromStoredRpe(n);
  const tone: PrescriptionItemTone = tier
    ? (`effort-${tier}` as PrescriptionItemTone)
    : "default";
  items.push({
    icon,
    label,
    value: tierLabel ?? `RPE ${n}`,
    unit: ` · RPE ${n}`,
    tone,
    kind: "target-effort",
  });
}
