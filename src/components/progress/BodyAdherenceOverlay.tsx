"use client";

import { useMemo } from "react";
import type { BodyMetricsPoint } from "@/lib/metrics/body";
import type { NutritionAdherenceDay } from "@/lib/nutritionAdherenceHistoryService";
import { toLocalDateString } from "@/lib/clientActivityService";

type Props = {
  adherenceDays: NutritionAdherenceDay[];
  bodyPoints: BodyMetricsPoint[];
  /** Inclusive local YYYY-MM-DD window */
  startDate: string;
  endDate: string;
};

/**
 * Side-by-side view of meal adherence (planned days) and sparse body metrics.
 * No causal framing — two series shown together.
 */
export function BodyAdherenceOverlay({
  adherenceDays,
  bodyPoints,
  startDate,
  endDate,
}: Props) {
  const planned = useMemo(
    () =>
      adherenceDays.filter(
        (d) => d.date >= startDate && d.date <= endDate && d.assigned > 0
      ),
    [adherenceDays, startDate, endDate]
  );

  const bodyInRange = useMemo(
    () =>
      bodyPoints.filter((p) => {
        const d = String(p.measured_date).slice(0, 10);
        return d >= startDate && d <= endDate;
      }),
    [bodyPoints, startDate, endDate]
  );

  const hasWeight = bodyInRange.some((p) => p.weight_kg != null);
  const hasBf = bodyInRange.some((p) => p.body_fat_percentage != null);

  if (!hasWeight && !hasBf) return null;

  const width = 320;
  const height = 180;
  const padding = { top: 16, right: 44, bottom: 28, left: 36 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const startMs = new Date(startDate + "T12:00:00").getTime();
  const endMs = new Date(endDate + "T12:00:00").getTime();
  const span = Math.max(1, endMs - startMs);

  const xFor = (ymd: string) =>
    padding.left +
    ((new Date(ymd + "T12:00:00").getTime() - startMs) / span) * chartW;

  const adherenceYs = planned.map((d) => ({
    x: xFor(d.date),
    y:
      padding.top +
      chartH -
      (d.value ?? 0) * chartH,
  }));

  const weights = bodyInRange
    .filter((p) => p.weight_kg != null)
    .map((p) => ({
      date: String(p.measured_date).slice(0, 10),
      v: Number(p.weight_kg),
    }));
  const bfs = bodyInRange
    .filter((p) => p.body_fat_percentage != null)
    .map((p) => ({
      date: String(p.measured_date).slice(0, 10),
      v: Number(p.body_fat_percentage),
    }));

  const weightMin = weights.length
    ? Math.min(...weights.map((w) => w.v))
    : 0;
  const weightMax = weights.length
    ? Math.max(...weights.map((w) => w.v))
    : 1;
  const weightPad = Math.max(0.5, (weightMax - weightMin) * 0.15 || 1);
  const wLo = weightMin - weightPad;
  const wHi = weightMax + weightPad;

  const yWeight = (v: number) =>
    padding.top + chartH - ((v - wLo) / (wHi - wLo || 1)) * chartH;

  const bfMin = bfs.length ? Math.min(...bfs.map((b) => b.v)) : 0;
  const bfMax = bfs.length ? Math.max(...bfs.map((b) => b.v)) : 1;
  const bfPad = Math.max(0.5, (bfMax - bfMin) * 0.15 || 1);
  const bfLo = bfMin - bfPad;
  const bfHi = bfMax + bfPad;
  const yBf = (v: number) =>
    padding.top + chartH - ((v - bfLo) / (bfHi - bfLo || 1)) * chartH;

  const startLabel = new Date(startDate + "T12:00:00").toLocaleDateString(
    undefined,
    { month: "short", day: "numeric" }
  );
  const endLabel = new Date(endDate + "T12:00:00").toLocaleDateString(
    undefined,
    { month: "short", day: "numeric" }
  );

  return (
    <section className="rounded-2xl border border-[color:var(--fc-glass-border)] bg-transparent p-4 space-y-3">
      <div>
        <h2 className="text-base font-semibold text-[color:var(--fc-text-primary)] [font-family:var(--f-headline)]">
          Body &amp; adherence
        </h2>
        <p className="text-xs text-[color:var(--fc-text-dim)] mt-0.5 [font-family:var(--font-body)]">
          Weight{hasBf ? " and body fat" : ""} shown beside meal-plan adherence
          for the same period — logged points only. Not cause and effect.
        </p>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-full"
        style={{ height: 180, minHeight: 180 }}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Body metrics and adherence from ${startLabel} to ${endLabel}`}
      >
        {[0.25, 0.5, 0.75].map((r) => (
          <line
            key={r}
            x1={padding.left}
            y1={padding.top + chartH * (1 - r)}
            x2={padding.left + chartW}
            y2={padding.top + chartH * (1 - r)}
            stroke="var(--fc-hairline)"
            strokeWidth={0.5}
          />
        ))}

        {/* Adherence as faint bars (left scale 0–100%) */}
        {planned.map((d) => {
          const x = xFor(d.date);
          const h = (d.value ?? 0) * chartH;
          return (
            <rect
              key={`a-${d.date}`}
              x={x - 1.5}
              y={padding.top + chartH - h}
              width={3}
              height={Math.max(0, h)}
              fill="var(--fc-domain-meals)"
              fillOpacity={0.35}
            />
          );
        })}

        {adherenceYs.length >= 2 && (
          <polyline
            fill="none"
            stroke="var(--fc-domain-meals)"
            strokeWidth={1.25}
            strokeOpacity={0.5}
            points={adherenceYs.map((p) => `${p.x},${p.y}`).join(" ")}
          />
        )}

        {/* Sparse weight points */}
        {weights.map((w) => (
          <circle
            key={`w-${w.date}`}
            cx={xFor(w.date)}
            cy={yWeight(w.v)}
            r={4}
            fill="var(--fc-text-primary)"
            stroke="var(--fc-surface-card)"
            strokeWidth={1.5}
          >
            <title>
              {w.date}: {w.v} kg
            </title>
          </circle>
        ))}

        {/* Sparse BF% points */}
        {bfs.map((b) => (
          <circle
            key={`bf-${b.date}`}
            cx={xFor(b.date)}
            cy={yBf(b.v)}
            r={3.5}
            fill="var(--fc-status-info)"
            stroke="var(--fc-surface-card)"
            strokeWidth={1.5}
          >
            <title>
              {b.date}: {b.v}% BF
            </title>
          </circle>
        ))}

        <text
          x={padding.left}
          y={height - 8}
          fill="var(--fc-text-subtle)"
          fontSize={9}
        >
          {startLabel}
        </text>
        <text
          x={padding.left + chartW}
          y={height - 8}
          fill="var(--fc-text-subtle)"
          fontSize={9}
          textAnchor="end"
        >
          {endLabel}
        </text>
        {hasWeight && (
          <text
            x={width - 4}
            y={padding.top + 8}
            fill="var(--fc-text-subtle)"
            fontSize={8}
            textAnchor="end"
          >
            {wHi.toFixed(0)} kg
          </text>
        )}
      </svg>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[color:var(--fc-text-dim)] list-none m-0 p-0 [font-family:var(--f-mono)] uppercase tracking-wide">
        <li className="inline-flex items-center gap-1.5">
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm"
            style={{ background: "var(--fc-domain-meals)", opacity: 0.7 }}
            aria-hidden
          />
          Meal adherence
        </li>
        {hasWeight && (
          <li className="inline-flex items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full bg-[color:var(--fc-text-primary)]"
              aria-hidden
            />
            Weight (logged)
          </li>
        )}
        {hasBf && (
          <li className="inline-flex items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full bg-[color:var(--fc-status-info)]"
              aria-hidden
            />
            Body fat % (logged)
          </li>
        )}
      </ul>
    </section>
  );
}

/** Default ~90d window ending today (local). */
export function defaultOverlayWindow(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 90);
  return {
    startDate: toLocalDateString(start),
    endDate: toLocalDateString(end),
  };
}
