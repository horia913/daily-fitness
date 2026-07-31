"use client";

import React, { useMemo } from "react";
import { ChevronDown, ChevronUp, Minus } from "lucide-react";
import type { WellnessTrend } from "@/lib/wellnessAnalytics";
import v6 from "./progressAnalyticsV6.module.css";
import { cn } from "@/lib/utils";

type Metric = "sleep" | "stress" | "soreness";

type TrendPill = "stable" | "improving" | "declining";

function tierForValue(
  v: number | null,
  min: number,
  max: number,
): "on" | "mid" | "low" | "empty" {
  if (v == null || !Number.isFinite(v)) return "empty";
  const t = (v - min) / (max - min || 1);
  if (t >= 0.66) return "on";
  if (t >= 0.33) return "mid";
  return "low";
}

function colorVar(metric: Metric): string {
  if (metric === "sleep") return "var(--purple)";
  if (metric === "stress") return "var(--warning)";
  return "var(--fc-accent)";
}

function trendForMetric(
  metric: Metric,
  t: { sleep: string; stress: string; soreness: string },
): TrendPill {
  if (metric === "sleep") {
    if (t.sleep === "improving") return "improving";
    if (t.sleep === "declining") return "declining";
    return "stable";
  }
  if (metric === "stress") {
    if (t.stress === "improving") return "improving";
    if (t.stress === "worsening") return "declining";
    return "stable";
  }
  if (t.soreness === "improving") return "improving";
  if (t.soreness === "worsening") return "declining";
  return "stable";
}

function TrendPillView({ trend }: { trend: TrendPill }) {
  if (trend === "improving") {
    return (
      <span className={v6.trendPill}>
        <ChevronUp className="h-2 w-2 shrink-0" aria-hidden />
        Improving
      </span>
    );
  }
  if (trend === "declining") {
    return (
      <span className={cn(v6.trendPill, v6.trendPillNeg)}>
        <ChevronDown className="h-2 w-2 shrink-0" aria-hidden />
        Declining
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5"
      style={{
        background: "rgba(255,255,255,0.04)",
        borderColor: "var(--line)",
        color: "var(--t3)",
        fontFamily: 'var(--f-mono, "Geist Mono", monospace)',
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: "0.04em",
      }}
    >
      <Minus className="h-2 w-2 shrink-0" aria-hidden />
      Stable
    </span>
  );
}

export function WellnessSparkRow({
  title,
  metric,
  dailyData,
  avgLabel,
  avgDisplay,
  trends,
}: {
  title: string;
  metric: Metric;
  dailyData: WellnessTrend[];
  avgLabel: string;
  avgDisplay: React.ReactNode;
  trends: { sleep: string; stress: string; soreness: string };
}) {
  const slice = useMemo(() => {
    const n = dailyData.length;
    const take = Math.min(15, Math.max(10, n || 10));
    return dailyData.slice(-take);
  }, [dailyData]);

  const cells = useMemo(() => {
    const pick = (d: WellnessTrend) => {
      if (metric === "sleep") return d.sleepHours ?? d.sleepQuality;
      if (metric === "stress") return d.stressLevel;
      return d.sorenessLevel;
    };
    const nums = slice.map(pick).filter((x): x is number => x != null && Number.isFinite(x));
    const minV = nums.length ? Math.min(...nums) : 0;
    const maxV = nums.length ? Math.max(...nums) : 1;
    return slice.map((d) => {
      const v = pick(d);
      return { tier: tierForValue(v, minV, maxV) };
    });
  }, [metric, slice]);

  const col = colorVar(metric);
  const trend = trendForMetric(metric, trends);

  return (
    <div className={v6.sparkRow}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div
            className="text-[12px] font-medium text-[var(--t1)]"
            style={{ fontFamily: "var(--font-geist-sans, Geist, sans-serif)" }}
          >
            {title}
          </div>
          <div
            className="mt-0.5 text-[9.5px] text-[var(--t3)]"
            style={{
              fontFamily: 'var(--f-mono, "Geist Mono", monospace)',
            }}
          >
            {avgLabel}{" "}
            <span
              className="font-bold text-[13px] text-[var(--t1)]"
              style={{
                fontFamily:
                  'var(--f-display), var(--font-geist-sans, Geist), sans-serif',
              }}
            >
              {avgDisplay}
            </span>
          </div>
        </div>
        <TrendPillView trend={trend} />
      </div>
      <div className={v6.sparkCells}>
        {cells.map((c, i) => {
          if (c.tier === "empty") {
            return (
              <div
                key={i}
                className={v6.sparkCell}
                style={{ background: "rgba(255,255,255,0.04)" }}
              />
            );
          }
          const op = c.tier === "on" ? 1 : c.tier === "mid" ? 0.4 : 0.2;
          return (
            <div
              key={i}
              className={v6.sparkCell}
              style={{ background: col, opacity: op }}
            />
          );
        })}
      </div>
    </div>
  );
}
