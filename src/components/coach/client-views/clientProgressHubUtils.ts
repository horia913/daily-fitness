import type { BodyMeasurement } from "@/lib/measurementService";

export function getWeekStartMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().split("T")[0];
}

export function formatSinceStart(
  current: number,
  start: number,
  unit: string,
  lowerIsBetter: boolean
): { text: string; improving: boolean } {
  const diff = current - start;
  const pct = start !== 0 ? ((diff / start) * 100).toFixed(1) : "";
  const improving = lowerIsBetter ? diff < 0 : diff > 0;
  const arrow = diff < 0 ? "▼" : diff > 0 ? "▲" : "—";
  const delta =
    diff < 0
      ? Math.abs(diff).toFixed(1)
      : diff > 0
        ? `+${diff.toFixed(1)}`
        : "—";
  const suffix = pct ? ` (${pct}%)` : "";
  return {
    text: diff === 0 ? "—" : `${arrow} ${delta} ${unit}${suffix}`,
    improving,
  };
}

/** Latest row index with non-null numeric metric, then next older row with same metric. */
export function findMetricPair(
  measurements: BodyMeasurement[],
  pick: (m: BodyMeasurement) => number | null | undefined
): { latest: number; prior: number } | null {
  let latestI = -1;
  for (let i = 0; i < measurements.length; i++) {
    const v = pick(measurements[i]);
    if (v != null && !Number.isNaN(Number(v))) {
      latestI = i;
      break;
    }
  }
  if (latestI < 0) return null;
  const latest = Number(pick(measurements[latestI]));
  for (let j = latestI + 1; j < measurements.length; j++) {
    const v = pick(measurements[j]);
    if (v != null && !Number.isNaN(Number(v))) {
      return { latest, prior: Number(v) };
    }
  }
  return null;
}
