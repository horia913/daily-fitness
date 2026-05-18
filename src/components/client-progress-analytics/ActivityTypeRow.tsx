"use client";

import React from "react";
import v6 from "./progressAnalyticsV6.module.css";

export function ActivityTypeRow({
  name,
  pctOfTotal,
  count,
}: {
  name: string;
  pctOfTotal: number;
  count: number;
}) {
  return (
    <div className={v6.activityRow}>
      <span
        className="w-16 shrink-0 text-[11px] text-[var(--t2)]"
        style={{
          fontFamily: "var(--font-geist-sans, Geist, sans-serif)",
          overflowWrap: "break-word",
          wordWrap: "break-word",
          lineHeight: 1.25,
        }}
        title={name}
      >
        {name}
      </span>
      <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.05)]">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.max(2, Math.min(100, pctOfTotal))}%`,
            background: "linear-gradient(90deg, var(--cyan), var(--lime-2, #bef264))",
          }}
        />
      </div>
      <span
        className="w-[18px] shrink-0 text-right text-[13px] font-bold text-[var(--t1)]"
        style={{
          fontFamily:
            '"Big Shoulders Display", var(--font-geist-sans, Geist), sans-serif',
        }}
      >
        {count}
      </span>
    </div>
  );
}
