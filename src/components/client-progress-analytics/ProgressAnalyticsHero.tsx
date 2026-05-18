"use client";

import React from "react";
import { AnalyticsHero } from "@/components/coach-analytics/AnalyticsHero";
import type { StrengthTimeRange } from "@/lib/strengthAnalytics";
import { GlobalRangeTabs } from "./GlobalRangeTabs";

export function ProgressAnalyticsHero({
  timeRange,
  onTimeRangeChange,
  rangeDisabled,
}: {
  timeRange: StrengthTimeRange;
  onTimeRangeChange: (v: StrengthTimeRange) => void;
  rangeDisabled?: boolean;
}) {
  return (
    <AnalyticsHero
      accent="cyan"
      eyebrow="Performance · Analytics"
      title="Overview"
      subtitle="Training insights for the range you select"
      controls={
        <GlobalRangeTabs
          value={timeRange}
          onChange={onTimeRangeChange}
          disabled={rangeDisabled}
        />
      }
    />
  );
}
