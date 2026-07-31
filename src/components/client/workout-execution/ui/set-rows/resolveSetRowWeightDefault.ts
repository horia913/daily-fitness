import type { LastSessionSetRow } from "@/lib/clientProgressionService";

export function resolveSetRowWeightDefault({
  setNumber,
  previousRowWeight,
  lastSessionSetDetails,
  defaultWeight,
  suggestedWeight,
  /** Coach-prescribed weight for this set_number (from prescriptions / scalar). Highest priority when set. */
  prescribedWeightKg,
}: {
  setNumber: number;
  previousRowWeight?: string;
  lastSessionSetDetails?: LastSessionSetRow[] | null;
  defaultWeight: number | null;
  suggestedWeight: number | null;
  prescribedWeightKg?: number | null;
}): string {
  // 1. Per-set (or exercise-scalar) coach prescription
  if (prescribedWeightKg != null && prescribedWeightKg >= 0 && Number.isFinite(prescribedWeightKg)) {
    return String(prescribedWeightKg);
  }

  // 2–4. Existing progression / last-time / sticky / suggested defaults (unchanged)
  const fromLastSession = lastSessionSetDetails?.find(
    (row) => row.set_number === setNumber,
  )?.weight_kg;
  if (fromLastSession != null && fromLastSession > 0) {
    return String(fromLastSession);
  }

  if (setNumber > 1 && previousRowWeight?.trim()) {
    return previousRowWeight;
  }

  if (defaultWeight != null && defaultWeight > 0) {
    return String(defaultWeight);
  }

  if (suggestedWeight != null && suggestedWeight > 0) {
    return String(suggestedWeight);
  }

  return "";
}

export function resolveDropWeightFromInitial(initialWeight: number | null): string {
  if (initialWeight == null || initialWeight <= 0) return "";
  return String(Math.round(initialWeight * 0.8 * 2) / 2);
}
