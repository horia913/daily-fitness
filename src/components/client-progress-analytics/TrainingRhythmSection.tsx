"use client";

import React, { useMemo } from "react";
import { CalendarDays } from "lucide-react";
import v6 from "./progressAnalyticsV6.module.css";
import { WeeklyBarChart } from "./WeeklyBarChart";
import EmptyStateBlock from "@/components/coach/client-detail/EmptyStateBlock";
import { AlertCircle } from "lucide-react";
import type { TrainingRhythmSummary } from "@/lib/clientProgressAnalyticsRhythm";

function fmtAxis(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TrainingRhythmSection({
  data,
  error,
  onRetry,
  rangeMeta,
}: {
  data: TrainingRhythmSummary | null;
  error?: string | null;
  onRetry?: () => void;
  rangeMeta: string;
}) {
  const axis = useMemo(() => {
    if (!data?.weekKeys?.length) {
      return { left: "—", mid: "—", right: "—" };
    }
    const keys = data.weekKeys;
    const left = fmtAxis(keys[0]!);
    const mid = fmtAxis(keys[Math.floor((keys.length - 1) / 2)]!);
    const right = fmtAxis(keys[keys.length - 1]!);
    return { left, mid, right };
  }, [data?.weekKeys]);

  if (error) {
    return (
      <div className={v6.sectionCard}>
        <EmptyStateBlock
          compact
          icon={AlertCircle}
          title="Couldn't load Training rhythm"
          description={error}
          actions={
            onRetry
              ? [{ label: "Tap to retry", onClick: onRetry, variant: "outline" as const }]
              : undefined
          }
        />
      </div>
    );
  }

  if (!data) return null;

  const counts = data.weeklyWorkoutCounts;

  return (
    <section className={v6.sectionCard}>
      <div className={v6.sectionHead}>
        <div className={v6.sectionHeadLeft}>
          <span
            className={v6.sectionIcon}
            style={{
              background: "var(--cyan-soft)",
              color: "var(--cyan)",
            }}
          >
            <CalendarDays className="h-[13px] w-[13px]" strokeWidth={2} aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className={v6.sectionTitle}>Training rhythm</h2>
            <p className={v6.sectionMeta}>{rangeMeta}</p>
          </div>
        </div>
      </div>

      <div className={v6.pairedRow}>
        <div>
          <div className={v6.pairedLabel}>Workouts/wk</div>
          <div className={v6.pairedNum} style={{ color: "var(--cyan)" }}>
            {data.workoutsPerWeek5Avg.toFixed(1)}
          </div>
          <div className={v6.pairedSub}>5-week avg</div>
        </div>
        <div>
          <div className={v6.pairedLabel}>Avg duration</div>
          <div className={v6.pairedNum} style={{ color: "var(--t1)" }}>
            {data.thisWeekAvgDurationMin}
            <span
              style={{
                fontFamily: "var(--font-geist-sans, Geist, sans-serif)",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--t3)",
                marginLeft: 4,
              }}
            >
              min
            </span>
          </div>
          <div className={v6.pairedSub}>
            this week: {data.thisWeekAvgDurationMin} min
          </div>
        </div>
      </div>

      <WeeklyBarChart
        values={counts}
        variant="cyan"
        axisLeft={axis.left}
        axisMid={axis.mid}
        axisRight={axis.right}
      />
    </section>
  );
}
