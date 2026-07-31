"use client";

import React, { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import type { VolumeStats } from "@/lib/volumeAnalytics";
import v6 from "./progressAnalyticsV6.module.css";
import { WeeklyBarChart } from "./WeeklyBarChart";
import { DeltaPill } from "./DeltaPill";
import {
  VolumeRangeTabs,
  type VolumeWindowWeeks,
} from "./VolumeRangeTabs";
import EmptyStateBlock from "@/components/coach/client-detail/EmptyStateBlock";
import { AlertCircle } from "lucide-react";

function fmtAxisFromWeekStart(weekStart: string): string {
  const d = new Date(weekStart + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function compactVolKg(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return `${Math.round(v)}`;
}

export function TrainingVolumeSection({
  stats,
  volumeWeeks,
  onVolumeWeeksChange,
  busy,
  error,
  onRetry,
  hideRangeTabs = false,
}: {
  stats: VolumeStats | null;
  volumeWeeks: VolumeWindowWeeks;
  onVolumeWeeksChange?: (w: VolumeWindowWeeks) => void;
  busy?: boolean;
  error?: string | null;
  onRetry?: () => void;
  /** When true, page-level time control owns the window — hide local 8W/12W/6M tabs. */
  hideRangeTabs?: boolean;
}) {
  const weeklyVolumes = useMemo(() => {
    if (!stats?.weeklyData?.length) return [];
    return stats.weeklyData.map((w) => w.totalVolume);
  }, [stats?.weeklyData]);

  const axis = useMemo(() => {
    if (!stats?.weeklyData?.length) {
      return { left: "—", mid: "—", right: "—" };
    }
    const wd = stats.weeklyData;
    const left = fmtAxisFromWeekStart(wd[0]!.weekStart);
    const mid = fmtAxisFromWeekStart(wd[Math.floor((wd.length - 1) / 2)]!.weekStart);
    const right = fmtAxisFromWeekStart(wd[wd.length - 1]!.weekStart);
    return { left, mid, right };
  }, [stats?.weeklyData]);

  const peakIndex = useMemo(() => {
    if (!weeklyVolumes.length) return null;
    let max = 0;
    let idx = 0;
    weeklyVolumes.forEach((v, i) => {
      if (v > max) {
        max = v;
        idx = i;
      }
    });
    return max > 0 ? idx : null;
  }, [weeklyVolumes]);

  const lastWeek = stats?.weeklyData?.[stats.weeklyData.length - 1];
  const setsThisWk = lastWeek?.totalSets ?? 0;
  const avgVolPerWeek =
    stats?.weeklyData?.length && stats.weeklyData.length > 0
      ? stats.weeklyData.reduce((s, w) => s + w.totalVolume, 0) /
        stats.weeklyData.length
      : 0;
  const fourWk = stats?.fourWeekAvg ?? 0;

  if (error) {
    return (
      <div className={v6.sectionCard}>
        <EmptyStateBlock
          compact
          icon={AlertCircle}
          title="Couldn't load Training volume"
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

  if (!stats || !stats.weeklyData.length) {
    return (
      <div className={v6.sectionCard}>
        <div className={v6.sectionHead}>
          <div className={v6.sectionHeadLeft}>
            <span
              className={v6.sectionIcon}
              style={{
                background: "var(--purple-soft)",
                color: "var(--purple)",
              }}
            >
              <TrendingUp className="h-[13px] w-[13px]" strokeWidth={2} aria-hidden />
            </span>
            <div>
              <h2 className={v6.sectionTitle}>Training volume</h2>
              <p className={v6.sectionDesc}>Weekly total (weight × reps)</p>
            </div>
          </div>
        </div>
        <p style={{ color: "var(--t3)", fontSize: 12 }}>No volume data in this window yet.</p>
      </div>
    );
  }

  const curVol = stats.currentWeekVolume;
  const delta = stats.weekOverWeekChange;

  return (
    <section className={v6.sectionCard}>
      <div className={v6.sectionHead}>
        <div className={v6.sectionHeadLeft}>
          <span
            className={v6.sectionIcon}
            style={{
              background: "var(--purple-soft)",
              color: "var(--purple)",
            }}
          >
            <TrendingUp className="h-[13px] w-[13px]" strokeWidth={2} aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className={v6.sectionTitle}>Training volume</h2>
            <p className={v6.sectionDesc}>Weekly total (weight × reps)</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-baseline gap-2" style={{ padding: "2px 0" }}>
        <span className={v6.headlineVol} style={{ color: "var(--purple)" }}>
          {Math.round(curVol).toLocaleString()}
          <span
            style={{
              fontFamily: "var(--font-geist-sans, Geist, sans-serif)",
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--t3)",
              marginLeft: 6,
            }}
          >
            kg
          </span>
        </span>
        <DeltaPill pct={delta} />
      </div>

      {!hideRangeTabs && onVolumeWeeksChange ? (
        <VolumeRangeTabs
          value={volumeWeeks}
          onChange={onVolumeWeeksChange}
          disabled={busy}
        />
      ) : null}

      <WeeklyBarChart
        values={weeklyVolumes}
        variant="purple"
        axisLeft={axis.left}
        axisMid={axis.mid}
        axisRight={axis.right}
        peakIndex={peakIndex ?? undefined}
        formatPeak={(v) => compactVolKg(v)}
      />

      <div className={v6.footerGrid}>
        <div>
          <div className={v6.footerLabel}>Sets this wk</div>
          <div className={v6.footerNum}>{setsThisWk}</div>
        </div>
        <div>
          <div className={v6.footerLabel}>Avg vol/wk</div>
          <div className={v6.footerNum}>
            {Math.round(avgVolPerWeek).toLocaleString()}
            <span className={v6.footerUnit}> kg</span>
          </div>
        </div>
        <div>
          <div className={v6.footerLabel}>4-wk avg</div>
          <div className={v6.footerNum}>
            {Math.round(fourWk).toLocaleString()}
            <span className={v6.footerUnit}> kg</span>
          </div>
        </div>
      </div>
    </section>
  );
}
