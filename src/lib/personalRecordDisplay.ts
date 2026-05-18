/**
 * Human-readable captions for `personal_records` rows (v2 UI).
 */

export type PrUiRow = {
  record_type: string;
  record_value?: number | string | null;
  record_unit?: string | null;
  weight_at_record?: number | string | null;
  reps_at_record?: number | string | null;
};

function trimNumberDisplay(v: number): string {
  if (!Number.isFinite(v)) return "—";
  const r = Math.round(v * 1000) / 1000;
  if (Number.isInteger(r)) return String(r);
  const s = r.toFixed(3);
  return s.replace(/\.?0+$/, "");
}

function num(v: number | string | null | undefined): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function formatPrKindTag(recordType: string | null | undefined): string {
  const t = (recordType || "").toLowerCase().trim();
  if (t === "max_strength" || t === "weight") return "Max str";
  if (t === "strength_endurance") return "Volume";
  return "PR";
}

export function formatKgRepsLift(weight: number, reps: number): string {
  return `${trimNumberDisplay(weight)} kg × ${reps}`;
}

/** RECENT PRS / coach list primary line */
export function formatPrRecentListLine(row: PrUiRow): string {
  const t = (row.record_type || "").toLowerCase().trim();
  if (t === "max_strength" || t === "weight") {
    const w = num(row.weight_at_record ?? row.record_value);
    const r = num(row.reps_at_record);
    return `${trimNumberDisplay(w)} kg · ${r} rep${r === 1 ? "" : "s"}`;
  }
  if (t === "strength_endurance") {
    const vol = num(row.record_value);
    const w = num(row.weight_at_record);
    const r = num(row.reps_at_record);
    return `${trimNumberDisplay(vol)} vol · ${formatKgRepsLift(w, r)}`;
  }
  return formatPersonalRecordCaption(row.record_type, row.record_value, row.record_unit);
}

/** Overview "Latest:" line */
export function formatPrLatestLine(row: PrUiRow): string {
  const t = (row.record_type || "").toLowerCase().trim();
  if (t === "max_strength" || t === "weight") {
    const w = num(row.weight_at_record ?? row.record_value);
    return `${trimNumberDisplay(w)} kg`;
  }
  if (t === "strength_endurance") {
    const vol = num(row.record_value);
    const w = num(row.weight_at_record);
    const r = num(row.reps_at_record);
    return `${trimNumberDisplay(vol)} vol (${formatKgRepsLift(w, r)})`;
  }
  return formatPersonalRecordCaption(row.record_type, row.record_value, row.record_unit);
}

/**
 * Primary display line for a PR (charts, legacy call sites).
 */
export function formatPersonalRecordCaption(
  recordType: string | null | undefined,
  recordValue: number | string | null | undefined,
  recordUnit: string | null | undefined,
  ctx?: Pick<PrUiRow, "weight_at_record" | "reps_at_record">,
): string {
  if (ctx) {
    return formatPrRecentListLine({
      record_type: recordType ?? "",
      record_value: recordValue,
      record_unit: recordUnit,
      weight_at_record: ctx.weight_at_record,
      reps_at_record: ctx.reps_at_record,
    });
  }

  const v = num(recordValue);
  if (!Number.isFinite(v) && recordValue != null && recordValue !== "") {
    return "—";
  }
  const t = (recordType || "").toLowerCase().trim();
  const u = (recordUnit || "").trim();

  switch (t) {
    case "max_strength":
    case "weight": {
      const numStr = trimNumberDisplay(v);
      return u && u !== "kg" ? `${numStr} ${u}` : `${numStr} kg`;
    }
    case "strength_endurance": {
      return `${trimNumberDisplay(v)} vol`;
    }
    case "time": {
      const numStr = (Math.round(v * 100) / 100).toFixed(2);
      return u ? `${numStr} ${u}` : numStr;
    }
    case "distance":
    case "score": {
      const numStr = trimNumberDisplay(v);
      return u ? `${numStr} ${u}` : numStr;
    }
    case "reps":
      return `${trimNumberDisplay(v)} reps`;
    default:
      return u ? `${trimNumberDisplay(v)} ${u}` : trimNumberDisplay(v);
  }
}

export function formatPersonalRecordImprovementSuffix(
  recordType: string | null | undefined,
  delta: number,
  recordUnit: string | null | undefined,
): string {
  if (!Number.isFinite(delta) || delta <= 0) return "";
  const t = (recordType || "").toLowerCase().trim();
  const u = (recordUnit || "").trim();
  const n = trimNumberDisplay(delta);
  switch (t) {
    case "max_strength":
    case "weight":
      return `+${n} ${u || "kg"}`;
    case "strength_endurance":
      return `+${n} vol`;
    case "reps":
      return `+${n} reps`;
    case "time": {
      const tnum = delta.toFixed(2);
      return u ? `+${tnum} ${u}` : `+${tnum}`;
    }
    case "distance":
    case "score":
      return u ? `+${n} ${u}` : `+${n}`;
    default:
      return u ? `+${n} ${u}` : `+${n}`;
  }
}

export function prProgressOverTimeSubtitle(
  recordType: string | null | undefined,
): string {
  const t = (recordType || "").toLowerCase().trim();
  switch (t) {
    case "max_strength":
      return "max strength PR over time";
    case "strength_endurance":
      return "volume PR over time";
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
