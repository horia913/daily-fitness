import type { LucideIcon } from "lucide-react";
import type { PrescriptionItem, PrescriptionItemTone } from "./ui/PrescriptionCard";
import {
  clientEffortLabelFromStoredRpe,
  rpeToEffortTier,
} from "@/lib/workoutEffortLabels";

/** Push one `kind: "target-effort"` row when prescribed RPE is in 6–10. */
export function appendTargetEffortItem(
  items: PrescriptionItem[],
  rpeRaw: unknown,
  icon: LucideIcon,
  label = "Target effort",
): void {
  if (rpeRaw == null || rpeRaw === "") return;
  const n = Number(rpeRaw);
  if (!Number.isFinite(n) || n < 6) return;
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
