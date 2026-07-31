"use client";

import React from "react";
import v6 from "./progressAnalyticsV6.module.css";
import { cn } from "@/lib/utils";

type Variant = "cyan" | "purple";

export function WeeklyBarChart({
  values,
  variant,
  axisLeft,
  axisMid,
  axisRight,
  peakIndex,
  formatPeak,
}: {
  values: number[];
  variant: Variant;
  axisLeft: string;
  axisMid: string;
  axisRight: string;
  peakIndex?: number | null;
  formatPeak?: (v: number) => string;
}) {
  const n = Math.max(values.length, 1);
  const max = Math.max(...values, 1);
  const showPeakRow = peakIndex != null && formatPeak != null;

  return (
    <div className="w-full min-w-0">
      {showPeakRow ? (
        <div
          className="mb-0.5 grid w-full gap-[3px]"
          style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}
        >
          {values.map((v, i) => (
            <div key={`p-${i}`} className="min-w-0 text-center">
              {i === peakIndex && v > 0 ? (
                <span className={v6.peakLabel}>{formatPeak(v)}</span>
              ) : (
                <span className="block h-3" aria-hidden />
              )}
            </div>
          ))}
        </div>
      ) : null}
      <div
        className={v6.barChartWrap}
        style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}
      >
        {values.map((v, i) => {
          const isEmpty = v <= 0;
          const scaled = isEmpty ? 0.08 : Math.max(v / max, 0.08);
          const hPct = scaled * 100;
          return (
            <div
              key={i}
              className="flex min-h-0 flex-col items-stretch justify-end"
            >
              <div
                className={cn(v6.bar, isEmpty && v6.barEmpty)}
                style={
                  isEmpty
                    ? { height: `${Math.max(8, hPct * 0.35)}%` }
                    : {
                        height: `${hPct}%`,
                        background:
                          variant === "cyan"
                            ? "linear-gradient(180deg, var(--fc-accent), rgba(34, 211, 238, 0.4))"
                            : "linear-gradient(180deg, var(--purple), rgba(167,139,250,0.4))",
                      }
                }
              />
            </div>
          );
        })}
      </div>
      <div className={v6.axisRow}>
        <span className={v6.axisLabel}>{axisLeft}</span>
        <span className={v6.axisLabel}>{axisMid}</span>
        <span className={v6.axisLabel}>{axisRight}</span>
      </div>
    </div>
  );
}
