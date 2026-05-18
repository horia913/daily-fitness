"use client";

import React from "react";
import type { StrengthTimeRange } from "@/lib/strengthAnalytics";
import v6 from "./progressAnalyticsV6.module.css";

const OPTIONS: { value: StrengthTimeRange; label: string }[] = [
  { value: "1M", label: "1M" },
  { value: "3M", label: "3M" },
  { value: "6M", label: "6M" },
  { value: "1Y", label: "1Y" },
  { value: "ALL", label: "All" },
];

export function GlobalRangeTabs({
  value,
  onChange,
  disabled,
}: {
  value: StrengthTimeRange;
  onChange: (v: StrengthTimeRange) => void;
  disabled?: boolean;
}) {
  return (
    <div className={v6.rangeTabsWrap} role="tablist" aria-label="Analytics time range">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          data-active={value === o.value ? "true" : "false"}
          className={v6.rangeTab}
          disabled={disabled}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
