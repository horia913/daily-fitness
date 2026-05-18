"use client";

import React, { useMemo } from "react";
import { Activity } from "lucide-react";
import type { StrengthTimeRange } from "@/lib/strengthAnalytics";
import {
  ACTIVITY_META,
  type ClientActivity,
} from "@/lib/clientActivityService";
import { SectionCard, SectionHead } from "./AnalyticsSectionChrome";
import { ActivityTypeRow } from "./ActivityTypeRow";
import EmptyStateBlock from "@/components/coach/client-detail/EmptyStateBlock";

function rangeMeta(tr: StrengthTimeRange): string {
  switch (tr) {
    case "1M":
      return "30";
    case "3M":
      return "90";
    case "6M":
      return "180";
    case "1Y":
      return "365";
    default:
      return "All time";
  }
}

export function ExtraActivitiesSection({
  timeRange,
  recentActivities,
}: {
  timeRange: StrengthTimeRange;
  recentActivities: ClientActivity[];
}) {
  const { rows, totalMinutes, count } = useMemo(() => {
    const byType: Record<string, number> = {};
    let totalMinutes = 0;
    for (const a of recentActivities) {
      totalMinutes += a.duration_minutes;
      const label =
        a.activity_type === "custom"
          ? (a.custom_activity_name ?? "Custom")
          : (ACTIVITY_META[a.activity_type]?.label ?? a.activity_type);
      byType[label] = (byType[label] || 0) + 1;
    }
    const entries = Object.entries(byType).sort((x, y) => y[1] - x[1]);
    const count = recentActivities.length;
    return { rows: entries, totalMinutes, count };
  }, [recentActivities]);

  const rangeLabel = rangeMeta(timeRange);
  const meta =
    rangeLabel === "All" ? "All time" : `${rangeLabel} days`;

  return (
    <SectionCard>
      <SectionHead
        icon={Activity}
        iconClassName="bg-[rgba(197,255,74,0.12)] text-[var(--lime)]"
        title="Extra activities"
        description="Outside programmed workouts"
        meta={meta}
      />
      {count === 0 ? (
        <EmptyStateBlock
          icon={Activity}
          title="No extra activities yet"
          description="Log walks, runs, or cycling sessions to see them here."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div
                className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--t3)]"
                style={{ fontFamily: 'var(--f-mono, "Geist Mono", monospace)' }}
              >
                Total
              </div>
              <div
                className="mt-1 text-[22px] font-bold leading-none text-[var(--t1)]"
                style={{
                  fontFamily:
                    '"Big Shoulders Display", var(--font-geist-sans, Geist), sans-serif',
                }}
              >
                {count}
              </div>
              <div
                className="mt-0.5 text-[9px] text-[var(--t4)]"
                style={{ fontFamily: 'var(--f-mono, "Geist Mono", monospace)' }}
              >
                {count === 1 ? "activity" : "activities"}
              </div>
            </div>
            <div>
              <div
                className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--t3)]"
                style={{ fontFamily: 'var(--f-mono, "Geist Mono", monospace)' }}
              >
                Minutes
              </div>
              <div
                className="mt-1 text-[22px] font-bold leading-none text-[var(--lime)]"
                style={{
                  fontFamily:
                    '"Big Shoulders Display", var(--font-geist-sans, Geist), sans-serif',
                }}
              >
                {totalMinutes}
              </div>
              <div
                className="mt-0.5 text-[9px] text-[var(--t4)]"
                style={{ fontFamily: 'var(--f-mono, "Geist Mono", monospace)' }}
              >
                min
              </div>
            </div>
          </div>
          <div className="border-t border-[var(--line-2)] pt-2">
            <div
              className="mb-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--t3)]"
              style={{ fontFamily: 'var(--f-mono, "Geist Mono", monospace)' }}
            >
              Activity types
            </div>
            <div className="flex flex-col">
              {rows.map(([name, c]) => (
                <ActivityTypeRow
                  key={name}
                  name={name}
                  count={c}
                  pctOfTotal={count > 0 ? Math.round((c / count) * 100) : 0}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </SectionCard>
  );
}
