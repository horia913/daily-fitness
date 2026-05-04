"use client";

import React, { useMemo } from "react";
import { addCalendarDaysYmd, zonedCalendarDateString } from "@/lib/clientZonedCalendar";
import styles from "./HeatStrip.module.css";

export type HeatStripRange = "1W" | "2W" | "1M" | "3M";

const RANGE_DAYS: Record<HeatStripRange, number> = {
  "1W": 7,
  "2W": 14,
  "1M": 30,
  "3M": 90,
};

export type HeatStripDay = { date: string; compliance: number };

type Props = {
  range: HeatStripRange;
  onRangeChange: (r: HeatStripRange) => void;
  trend: HeatStripDay[];
  timeZone: string;
  /** When false, parent renders range tabs (e.g. in section header). */
  showRangeTabs?: boolean;
};

function tierClass(v: number | null): string {
  if (v == null || Number.isNaN(v)) return styles.cellEmpty;
  if (v <= 0) return styles.cellEmpty;
  if (v <= 33) return styles.cellL1;
  if (v <= 66) return styles.cellL2;
  return styles.cellL3;
}

function avgPct(values: (number | null)[]): number {
  const nums = values.filter((x): x is number => x != null && !Number.isNaN(x));
  if (!nums.length) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function avgTone(pct: number): "crit" | "warn" | "good" {
  if (pct <= 0) return "crit";
  if (pct < 50) return "warn";
  return "good";
}

export default function HeatStrip({
  range,
  onRangeChange,
  trend,
  timeZone,
  showRangeTabs = true,
}: Props) {
  const byDate = useMemo(() => {
    const m = new Map<string, number>();
    trend.forEach((d) => m.set(d.date, d.compliance));
    return m;
  }, [trend]);

  const cells = useMemo(() => {
    const days = RANGE_DAYS[range];
    const today = zonedCalendarDateString(new Date(), timeZone);
    const out: { date: string; value: number | null }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = addCalendarDaysYmd(today, -i);
      const v = byDate.has(date) ? (byDate.get(date) ?? null) : null;
      out.push({ date, value: v });
    }
    return out;
  }, [range, byDate, timeZone]);

  const avg = avgPct(cells.map((c) => c.value));
  const tone = avgTone(avg);

  const startLabel = new Date(cells[0]!.date + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endLabel = new Date(cells[cells.length - 1]!.date + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const ranges: HeatStripRange[] = ["1W", "2W", "1M", "3M"];

  return (
    <div>
      {showRangeTabs ? (
        <div className={styles.rangeRow}>
          {ranges.map((r) => (
            <button
              key={r}
              type="button"
              className={`${styles.rangeTab} ${range === r ? styles.rangeTabActive : ""}`}
              onClick={() => onRangeChange(r)}
            >
              {r}
            </button>
          ))}
        </div>
      ) : null}
      <div className={styles.stripWrap}>
        <div className={range === "3M" ? styles.grid90 : styles.rowFlex}>
          {cells.map((c) => (
            <div
              key={c.date}
              className={`${styles.cell} ${tierClass(c.value)}`}
              title={c.date}
            />
          ))}
        </div>
        <div className={styles.foot}>
          <span>{startLabel}</span>
          <span>
            Avg{" "}
            <strong className={tone === "crit" ? styles.avgCrit : tone === "warn" ? styles.avgWarn : styles.avgGood}>
              {avg}%
            </strong>
          </span>
          <span>{endLabel}</span>
        </div>
      </div>
    </div>
  );
}
