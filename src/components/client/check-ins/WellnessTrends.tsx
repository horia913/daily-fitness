"use client";

import { useMemo, Fragment } from "react";
import type { DailyWellnessLog } from "@/lib/wellnessService";
import { dbToUiScale } from "@/lib/wellnessService";

function avgSleep(logs: DailyWellnessLog[]): number | null {
  const withSleep = logs.filter((l) => l.sleep_hours != null);
  if (withSleep.length === 0) return null;
  return withSleep.reduce((s, l) => s + (l.sleep_hours ?? 0), 0) / withSleep.length;
}

function avgStress(logs: DailyWellnessLog[]): number | null {
  const withStress = logs.filter((l) => l.stress_level != null);
  if (withStress.length === 0) return null;
  const sum = withStress.reduce((s, l) => s + (dbToUiScale(l.stress_level) ?? 0), 0);
  return sum / withStress.length;
}

function avgSoreness(logs: DailyWellnessLog[]): number | null {
  const withS = logs.filter((l) => l.soreness_level != null);
  if (withS.length === 0) return null;
  const sum = withS.reduce((s, l) => s + (dbToUiScale(l.soreness_level) ?? 0), 0);
  return sum / withS.length;
}

type Arrow = "up" | "down" | "flat";

function sleepArrow(last: number | null, thisW: number | null): Arrow {
  if (last == null || thisW == null) return "flat";
  if (thisW > last + 0.05) return "up";
  if (thisW < last - 0.05) return "down";
  return "flat";
}

/** Lower stress/soreness = improving */
function lowerIsBetterArrow(last: number | null, thisW: number | null): Arrow {
  if (last == null || thisW == null) return "flat";
  if (thisW < last - 0.15) return "up";
  if (thisW > last + 0.15) return "down";
  return "flat";
}

function arrowMeta(
  kind: "sleep" | "stress" | "soreness",
  arrow: Arrow
): { char: string; className: string } {
  if (arrow === "flat") return { char: "→", className: "text-[color:var(--fc-text-subtle)] opacity-70" };
  if (kind === "sleep") {
    if (arrow === "up") return { char: "↑", className: "text-[color:var(--fc-status-success)]" };
    return { char: "↓", className: "text-red-500 dark:text-red-400" };
  }
  if (arrow === "up") return { char: "↑", className: "text-[color:var(--fc-status-success)]" };
  return { char: "↓", className: "text-red-500 dark:text-red-400" };
}

interface WellnessTrendsProps {
  thisWeekLogs: DailyWellnessLog[];
  lastWeekLogs: DailyWellnessLog[];
}

export function WellnessTrends({ thisWeekLogs, lastWeekLogs }: WellnessTrendsProps) {
  const row = useMemo(() => {
    const lastSleep = avgSleep(lastWeekLogs);
    const thisSleep = avgSleep(thisWeekLogs);
    const lastStress = avgStress(lastWeekLogs);
    const thisStress = avgStress(thisWeekLogs);
    const lastSore = avgSoreness(lastWeekLogs);
    const thisSore = avgSoreness(thisWeekLogs);

    const hasAny =
      lastSleep != null ||
      thisSleep != null ||
      lastStress != null ||
      thisStress != null ||
      lastSore != null ||
      thisSore != null;

    return {
      lastSleep,
      thisSleep,
      lastStress,
      thisStress,
      lastSore,
      thisSore,
      hasAny,
      sleepA: sleepArrow(lastSleep, thisSleep),
      stressA: lowerIsBetterArrow(lastStress, thisStress),
      soreA: lowerIsBetterArrow(lastSore, thisSore),
    };
  }, [thisWeekLogs, lastWeekLogs]);

  if (!row.hasAny) {
    return (
      <div className="pt-2">
        <h3 className="text-sm font-semibold fc-text-primary mb-2">Wellness Trends</h3>
        <p className="text-xs fc-text-dim">Log a few more days this week to see trends.</p>
      </div>
    );
  }

  const fmtSleep = (n: number | null) => (n != null ? `${n.toFixed(1)} hrs` : "—");
  const fmtScale = (n: number | null) => (n != null ? n.toFixed(1) : "—");

  const rows: { label: string; last: string; thisV: string; kind: "sleep" | "stress" | "soreness"; arrow: Arrow }[] = [
    {
      label: "Sleep",
      last: fmtSleep(row.lastSleep),
      thisV: fmtSleep(row.thisSleep),
      kind: "sleep",
      arrow: row.sleepA,
    },
    {
      label: "Stress",
      last: fmtScale(row.lastStress),
      thisV: fmtScale(row.thisStress),
      kind: "stress",
      arrow: row.stressA,
    },
    {
      label: "Soreness",
      last: fmtScale(row.lastSore),
      thisV: fmtScale(row.thisSore),
      kind: "soreness",
      arrow: row.soreA,
    },
  ];

  return (
    <div className="pt-2">
      <h3 className="text-sm font-semibold fc-text-primary mb-3">Wellness Trends</h3>
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 gap-y-2 text-xs items-center">
        <span className="fc-text-subtle font-medium" />
        <span className="fc-text-subtle text-right">Last wk</span>
        <span className="fc-text-subtle text-right">This wk</span>
        <span className="w-5" />
        {rows.map((r) => {
          const m = arrowMeta(r.kind, r.arrow);
          return (
            <Fragment key={r.label}>
              <span className="fc-text-primary font-medium">{r.label}</span>
              <span className="text-right fc-text-dim font-mono">{r.last}</span>
              <span className="text-right fc-text-primary font-mono">{r.thisV}</span>
              <span className={`text-center font-bold ${m.className}`} aria-hidden>
                {m.char}
              </span>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
