/**
 * Human-readable captions for `personal_records` rows (no weight×reps unless type is reps).
 */

function trimNumberDisplay(v: number): string {
  if (!Number.isFinite(v)) return "—";
  const r = Math.round(v * 1000) / 1000;
  if (Number.isInteger(r)) return String(r);
  const s = r.toFixed(3);
  return s.replace(/\.?0+$/, "");
}

/**
 * Primary display line for a PR (e.g. "77.5 kg", "5.70 s", "1000 m", "12 reps").
 */
export function formatPersonalRecordCaption(
  recordType: string | null | undefined,
  recordValue: number | string | null | undefined,
  recordUnit: string | null | undefined
): string {
  const v =
    typeof recordValue === "number"
      ? recordValue
      : parseFloat(String(recordValue ?? "").replace(/,/g, ""));
  if (!Number.isFinite(v)) return "—";
  const t = (recordType || "").toLowerCase().trim();
  const u = (recordUnit || "").trim();

  switch (t) {
    case "weight": {
      const num = trimNumberDisplay(v);
      return u ? `${num} ${u}` : `${num} kg`;
    }
    case "time": {
      const num = (Math.round(v * 100) / 100).toFixed(2);
      return u ? `${num} ${u}` : num;
    }
    case "distance":
    case "score": {
      const num = trimNumberDisplay(v);
      return u ? `${num} ${u}` : num;
    }
    case "reps":
      return `${trimNumberDisplay(v)} reps`;
    default:
      return u ? `${trimNumberDisplay(v)} ${u}` : trimNumberDisplay(v);
  }
}

/**
 * Suffix for a positive delta vs previous_record_value (e.g. "+7.5 kg", "+2 reps").
 */
export function formatPersonalRecordImprovementSuffix(
  recordType: string | null | undefined,
  delta: number,
  recordUnit: string | null | undefined
): string {
  if (!Number.isFinite(delta) || delta <= 0) return "";
  const t = (recordType || "").toLowerCase().trim();
  const u = (recordUnit || "").trim();
  const num = trimNumberDisplay(delta);
  switch (t) {
    case "weight":
      return `+${num} ${u || "kg"}`;
    case "reps":
      return `+${num} reps`;
    case "time": {
      const tnum = delta.toFixed(2);
      return u ? `+${tnum} ${u}` : `+${tnum}`;
    }
    case "distance":
    case "score":
      return u ? `+${num} ${u}` : `+${num}`;
    default:
      return u ? `+${num} ${u}` : `+${num}`;
  }
}

/**
 * Subtitle line for PR Progress charts (matches record_type vocabulary).
 */
export function prProgressOverTimeSubtitle(
  recordType: string | null | undefined
): string {
  const t = (recordType || "").toLowerCase().trim();
  switch (t) {
    case "weight":
      return "weight PR over time";
    case "time":
      return "time PR over time";
    case "distance":
      return "distance PR over time";
    case "reps":
      return "reps PR over time";
    case "score":
      return "score PR over time";
    default:
      return "PR over time";
  }
}
