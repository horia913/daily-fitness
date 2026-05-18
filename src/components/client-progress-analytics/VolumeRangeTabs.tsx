"use client";

import React from "react";
import v6 from "./progressAnalyticsV6.module.css";
import { cn } from "@/lib/utils";

export type VolumeWindowWeeks = 8 | 12 | 26;

const OPTIONS: { value: VolumeWindowWeeks; label: string }[] = [
  { value: 8, label: "8W" },
  { value: 12, label: "12W" },
  { value: 26, label: "6M" },
];

export function VolumeRangeTabs({
  value,
  onChange,
  disabled,
}: {
  value: VolumeWindowWeeks;
  onChange: (v: VolumeWindowWeeks) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={v6.rangeTabsWrap}
      role="tablist"
      aria-label="Volume chart window"
    >
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          data-active={value === o.value ? "true" : "false"}
          className={cn(v6.rangeTab, v6.rangeTabPurple)}
          disabled={disabled}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
