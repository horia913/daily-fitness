"use client";

import React from "react";
import { ChevronUp, Star } from "lucide-react";
import type { ExerciseProgression, StrengthTimeRange } from "@/lib/strengthAnalytics";
import v6 from "./progressAnalyticsV6.module.css";
import { MiniOneRmLineChart } from "./MiniOneRmLineChart";
import { cn } from "@/lib/utils";

function fmtMmmD(isoDate: string): string {
  const d = new Date(isoDate.includes("T") ? isoDate : `${isoDate}T12:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const RANGE_OPTS: { value: StrengthTimeRange; label: string }[] = [
  { value: "1M", label: "1M" },
  { value: "3M", label: "3M" },
  { value: "6M", label: "6M" },
  { value: "1Y", label: "1Y" },
  { value: "ALL", label: "ALL" },
];

function formatSub(p: ExerciseProgression, sessionApprox?: number) {
  const last = p.dataPoints[p.dataPoints.length - 1];
  const n = sessionApprox ?? p.dataPoints.length;
  if (last) {
    return `${n} sessions · last ${fmtMmmD(last.date)}`;
  }
  return `All-time best · ${p.allTimeMax} kg × ${p.allTimeMaxReps}`;
}

export function ExerciseGainCard({
  progression,
  activeRange,
  onRangeChange,
  variant = "full",
  sessionCount,
  nameOverride,
}: {
  progression: ExerciseProgression;
  activeRange: StrengthTimeRange;
  onRangeChange?: (r: StrengthTimeRange) => void;
  variant?: "full" | "featured";
  sessionCount?: number;
  nameOverride?: string;
}) {
  const pct = progression.progressPercent;
  const showTrend = variant === "full" && pct != null && Math.abs(pct) >= 0.05;
  const trendUp = pct > 0;
  const sinceLabel =
    pct != null && Math.abs(pct) >= 0.05
      ? `${pct > 0 ? "+" : ""}${Math.round(pct)}%`
      : "—";

  return (
    <div className={v6.gainCard}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "font-semibold text-[13px] text-[var(--t1)]",
              v6.nameWrap,
            )}
            style={{ fontFamily: "var(--font-geist-sans, Geist, sans-serif)" }}
          >
            {nameOverride ?? progression.exerciseName}
          </div>
          <div
            className="mt-0.5 text-[9.5px] text-[var(--t3)]"
            style={{
              fontFamily: 'var(--f-mono, "Geist Mono", monospace)',
              letterSpacing: "0.04em",
            }}
          >
            {formatSub(progression, sessionCount)}
          </div>
        </div>
        {showTrend ? (
          <span
            className={cn(v6.trendPill, !trendUp && v6.trendPillNeg)}
            title="Progress vs start of range"
          >
            <ChevronUp
              className={cn("h-2 w-2 shrink-0", !trendUp && "rotate-180")}
              aria-hidden
            />
            {Math.abs(Math.round(pct))}%
          </span>
        ) : null}
      </div>

      {variant === "full" ? (
        <div className={v6.gainRangeTabs}>
          {RANGE_OPTS.map((o) => (
            <button
              key={o.value}
              type="button"
              data-active={activeRange === o.value}
              className={v6.gainRangeTab}
              onClick={() => onRangeChange?.(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <div
            className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--t3)]"
            style={{ fontFamily: 'var(--f-mono, "Geist Mono", monospace)' }}
          >
            Est. 1RM
          </div>
          <div className="flex items-baseline gap-1">
            <span
              className="text-[24px] font-bold leading-none text-[var(--t1)]"
              style={{
                fontFamily:
                  'var(--f-display), var(--font-geist-sans, Geist), sans-serif',
              }}
            >
              {progression.currentOneRM}
            </span>
            <span
              className="text-[13px] text-[var(--t3)]"
              style={{ fontFamily: "var(--font-geist-sans, Geist, sans-serif)" }}
            >
              kg
            </span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div
            className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--t3)]"
            style={{ fontFamily: 'var(--f-mono, "Geist Mono", monospace)' }}
          >
            Since first
          </div>
          <span
            className="text-[18px] font-bold leading-none text-[var(--fc-accent)]"
            style={{
              fontFamily:
                'var(--f-display), var(--font-geist-sans, Geist), sans-serif',
            }}
          >
            {sinceLabel}
          </span>
        </div>
      </div>

      {variant === "full" && progression.dataPoints.length > 0 ? (
        <MiniOneRmLineChart dataPoints={progression.dataPoints} />
      ) : null}

      {variant === "full" &&
      progression.allTimeMax > 0 &&
      progression.dataPoints.length ? (
        <div
          className="flex items-center gap-1.5 text-[9.5px] text-[var(--t3)]"
          style={{
            fontFamily: 'var(--f-mono, "Geist Mono", monospace)',
          }}
        >
          <Star className="h-2.5 w-2.5 shrink-0 text-[var(--fc-accent)]" aria-hidden />
          <span>
            All-time best: {progression.allTimeMax} × {progression.allTimeMaxReps}{" "}
            (
            {fmtMmmD(
              [...progression.dataPoints].sort(
                (a, b) => b.estimatedOneRM - a.estimatedOneRM,
              )[0]!.date,
            )}
            )
          </span>
        </div>
      ) : null}
    </div>
  );
}
