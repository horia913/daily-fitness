"use client";

import { useMemo } from "react";
import type { DailyWellnessLog } from "@/lib/wellnessService";
import { dbToUiScale } from "@/lib/wellnessService";
import { CheckinDeltaPill, type DeltaTone } from "@/components/client/check-ins/checkinSuite";
import checkinSuiteStyles from "@/components/client/check-ins/checkinSuite/checkinSuiteV1.module.css";
import { cn } from "@/lib/utils";

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

function deltaSleep(last: number | null, thisW: number | null): { tone: DeltaTone; text: string } {
  if (last == null || thisW == null) return { tone: "stable", text: "—" };
  const d = thisW - last;
  if (Math.abs(d) < 0.05) return { tone: "stable", text: "stable" };
  if (d > 0) return { tone: "up", text: `+${d.toFixed(1)}` };
  return { tone: "down", text: d.toFixed(1) };
}

/** Lower stress/soreness = improving (same thresholds as arrow helpers in prior version). */
function deltaLowerIsBetter(last: number | null, thisW: number | null): { tone: DeltaTone; text: string } {
  if (last == null || thisW == null) return { tone: "stable", text: "—" };
  const d = thisW - last;
  if (Math.abs(d) < 0.15) return { tone: "stable", text: "stable" };
  if (d < 0) return { tone: "up", text: d.toFixed(1) };
  return { tone: "down", text: `+${d.toFixed(1)}` };
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
      sleepDelta: deltaSleep(lastSleep, thisSleep),
      stressDelta: deltaLowerIsBetter(lastStress, thisStress),
      soreDelta: deltaLowerIsBetter(lastSore, thisSore),
    };
  }, [thisWeekLogs, lastWeekLogs]);

  if (!row.hasAny) {
    return (
      <section className={cn(checkinSuiteStyles.root, checkinSuiteStyles.sectionCard)}>
        <p
          className={cn(checkinSuiteStyles.fontMono, "text-[10px] font-semibold uppercase tracking-[0.16em] mb-2")}
          style={{ color: "var(--cs-t3)" }}
        >
          Wellness trends
        </p>
        <div
          className="rounded-[11px] border border-dashed px-3.5 py-3.5 text-center"
          style={{
            background: "var(--cs-card-2)",
            borderColor: "var(--cs-line)",
          }}
        >
          <p className={cn(checkinSuiteStyles.fontBody, "text-[11px] leading-relaxed")} style={{ color: "var(--cs-t3)" }}>
            Log a few more days this week to see trends.
          </p>
        </div>
      </section>
    );
  }

  const fmtSleep = (n: number | null) => (n != null ? `${n.toFixed(1)} hrs` : "—");
  const fmtScale = (n: number | null) => (n != null ? n.toFixed(1) : "—");

  const rows: {
    name: string;
    last: string;
    thisV: string;
    delta: { tone: DeltaTone; text: string };
  }[] = [
    {
      name: "Avg sleep",
      last: fmtSleep(row.lastSleep),
      thisV: fmtSleep(row.thisSleep),
      delta: row.sleepDelta,
    },
    {
      name: "Avg stress",
      last: fmtScale(row.lastStress),
      thisV: fmtScale(row.thisStress),
      delta: row.stressDelta,
    },
    {
      name: "Avg soreness",
      last: fmtScale(row.lastSore),
      thisV: fmtScale(row.thisSore),
      delta: row.soreDelta,
    },
  ];

  return (
    <section className={cn(checkinSuiteStyles.root, checkinSuiteStyles.sectionCard)}>
      <p
        className={cn(checkinSuiteStyles.fontMono, "text-[10px] font-semibold uppercase tracking-[0.16em]")}
        style={{ color: "var(--fc-accent)" }}
      >
        Wellness trends
      </p>
      <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-x-2 gap-y-0 items-center text-[9px] font-medium uppercase tracking-[0.1em] pb-2 border-b" style={{ borderColor: "var(--cs-line-2)", color: "var(--cs-t3)" }}>
        <span className="justify-self-start font-mono">Metric</span>
        <span className="text-center font-mono">Last week</span>
        <span className="text-center font-mono">This week</span>
        <span className="text-right font-mono pr-0.5">Δ</span>
      </div>
      <div className="flex flex-col">
        {rows.map((r, i) => (
          <div
            key={r.name}
            className={cn(
              "grid grid-cols-[1fr_1fr_1fr_auto] gap-x-2 gap-y-0 items-center py-2.5 text-xs",
              i > 0 && "border-t",
            )}
            style={i > 0 ? { borderColor: "var(--cs-line-2)" } : undefined}
          >
            <span className={cn(checkinSuiteStyles.fontBody, "font-medium")} style={{ color: "var(--cs-t1)" }}>
              {r.name}
            </span>
            <span className={cn(checkinSuiteStyles.fontDisplay, "text-right text-sm font-bold")} style={{ color: "var(--cs-t2)" }}>
              {r.last}
            </span>
            <span className={cn(checkinSuiteStyles.fontDisplay, "text-right text-sm font-bold")} style={{ color: "var(--cs-t1)" }}>
              {r.thisV}
            </span>
            <CheckinDeltaPill tone={r.delta.tone} text={r.delta.text} />
          </div>
        ))}
      </div>
    </section>
  );
}
