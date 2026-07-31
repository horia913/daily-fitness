"use client";

import React from "react";
import { Heart } from "lucide-react";
import type { StrengthTimeRange } from "@/lib/strengthAnalytics";
import type { WellnessStats } from "@/lib/wellnessAnalytics";
import { SectionCard, SectionHead } from "./AnalyticsSectionChrome";
import { WellnessSparkRow } from "./WellnessSparkRow";
import EmptyStateBlock from "@/components/coach/client-detail/EmptyStateBlock";

function rangeMeta(tr: StrengthTimeRange): string {
  switch (tr) {
    case "1M":
      return "30 days";
    case "3M":
      return "90 days";
    case "6M":
      return "180 days";
    case "1Y":
      return "365 days";
    default:
      return "All time";
  }
}

function fmtStepsK(n: number): string {
  if (n >= 1000) return `${Math.round(n / 100) / 10}k`;
  return `${Math.round(n)}`;
}

export function WellnessRecoverySection({
  timeRange,
  wellnessStats,
}: {
  timeRange: StrengthTimeRange;
  wellnessStats: WellnessStats | null;
}) {
  const daily = wellnessStats?.dailyData ?? [];
  if (!wellnessStats || daily.length === 0) {
    return (
      <SectionCard>
        <SectionHead
          icon={Heart}
          iconClassName="bg-[rgba(244,114,182,0.12)] text-[#f472b6]"
          title="Wellness & recovery"
          meta={rangeMeta(timeRange)}
        />
        <EmptyStateBlock
          icon={Heart}
          title="No wellness data"
          description="Log daily wellness check-ins to see trends here."
        />
      </SectionCard>
    );
  }

  const { averages, trends } = wellnessStats;

  return (
    <SectionCard>
      <SectionHead
        icon={Heart}
        iconClassName="bg-[rgba(244,114,182,0.12)] text-[#f472b6]"
        title="Wellness & recovery"
        meta={rangeMeta(timeRange)}
      />

      <div className="flex flex-col gap-2">
        <WellnessSparkRow
          title="Sleep hours"
          metric="sleep"
          dailyData={daily}
          avgLabel="Avg"
          avgDisplay={<>{averages.sleepHours.toFixed(1)}h</>}
          trends={trends}
        />
        <WellnessSparkRow
          title="Stress level"
          metric="stress"
          dailyData={daily}
          avgLabel="Avg"
          avgDisplay={
            <>
              {averages.stress.toFixed(1)}/5
            </>
          }
          trends={trends}
        />
        <WellnessSparkRow
          title="Soreness level"
          metric="soreness"
          dailyData={daily}
          avgLabel="Avg"
          avgDisplay={
            <>
              {averages.soreness.toFixed(1)}/5
            </>
          }
          trends={trends}
        />
      </div>

      <div
        className="grid grid-cols-3 gap-1.5 border-t border-[var(--line-2)] pt-2"
        style={{ marginTop: 2 }}
      >
        <div className="text-center">
          <div
            className="font-bold leading-none text-[var(--purple)]"
            style={{
              fontFamily:
                'var(--f-display), var(--font-geist-sans, Geist), sans-serif',
              fontSize: 16,
            }}
          >
            {averages.sleepHours.toFixed(1)}
            <span
              className="text-[11px] font-medium text-[var(--t3)]"
              style={{ fontFamily: "var(--font-geist-sans, Geist, sans-serif)" }}
            >
              h
            </span>
          </div>
          <div
            className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-[var(--t4)]"
            style={{ fontFamily: 'var(--f-mono, "Geist Mono", monospace)' }}
          >
            Avg sleep
          </div>
        </div>
        <div className="text-center">
          <div
            className="font-bold leading-none text-[var(--warning)]"
            style={{
              fontFamily:
                'var(--f-display), var(--font-geist-sans, Geist), sans-serif',
              fontSize: 16,
            }}
          >
            {averages.stress.toFixed(1)}
            <span
              className="text-[11px] font-medium text-[var(--t3)]"
              style={{ fontFamily: "var(--font-geist-sans, Geist, sans-serif)" }}
            >
              /5
            </span>
          </div>
          <div
            className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-[var(--t4)]"
            style={{ fontFamily: 'var(--f-mono, "Geist Mono", monospace)' }}
          >
            Avg stress
          </div>
        </div>
        <div className="text-center">
          <div
            className="font-bold leading-none text-[var(--fc-accent)]"
            style={{
              fontFamily:
                'var(--f-display), var(--font-geist-sans, Geist), sans-serif',
              fontSize: 16,
            }}
          >
            {fmtStepsK(averages.steps)}
          </div>
          <div
            className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-[var(--t4)]"
            style={{ fontFamily: 'var(--f-mono, "Geist Mono", monospace)' }}
          >
            Avg steps
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
