/**
 * Returns Tailwind text color class for wellness metric values (good=green, ok=amber, concerning=red).
 * Use for the VALUE number/label only; keep labels in theme text color.
 */
export type WellnessMetricKey =
  | "sleep_hours"
  | "sleep_quality"
  | "stress"
  | "soreness";

export function getWellnessValueColor(
  value: number,
  metric: WellnessMetricKey
): string {
  if (metric === "sleep_hours") {
    if (value >= 7) return "text-green-600 dark:text-green-400";
    if (value >= 6) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  }
  if (metric === "sleep_quality") {
    if (value >= 4) return "text-green-600 dark:text-green-400";
    if (value >= 3) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  }
  // stress and soreness: lower is better (1-2 good, 3 ok, 4-5 concerning)
  if (value <= 2) return "text-green-600 dark:text-green-400";
  if (value <= 3) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}
