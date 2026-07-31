"use client";

import React, { useMemo } from "react";
import v6 from "./progressAnalyticsV6.module.css";

type Pt = { date: string; estimatedOneRM: number };

function padSeries(values: number[], target: number): number[] {
  if (values.length >= target) return values.slice(-target);
  const pad = target - values.length;
  return [...Array(pad).fill(values[0] ?? 0), ...values];
}

export function MiniOneRmLineChart({
  dataPoints,
  height = 48,
}: {
  dataPoints: Pt[];
  height?: number;
}) {
  const vals = useMemo(
    () => dataPoints.map((d) => d.estimatedOneRM).filter((n) => Number.isFinite(n)),
    [dataPoints],
  );
  const series = useMemo(() => {
    const raw = vals.length ? vals : [0];
    const capped = raw.length > 6 ? raw.slice(-6) : padSeries(raw, Math.min(6, Math.max(4, raw.length)));
    return capped.length >= 4 ? capped : padSeries(capped, 4);
  }, [vals]);

  const w = 280;
  const h = height;
  const padX = 4;
  const padY = 4;
  const minV = Math.min(...series);
  const maxV = Math.max(...series);
  const span = maxV - minV || 1;
  const n = series.length;
  const pts = series.map((v, i) => {
    const x = padX + (i / Math.max(1, n - 1)) * (w - padX * 2);
    const y = padY + (1 - (v - minV) / span) * (h - padY * 2);
    return { x, y, v };
  });
  const d = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const last = pts[pts.length - 1];

  return (
    <div className={v6.miniChartBox} style={{ height: h + 12 }}>
      <svg
        width="100%"
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className="block"
        aria-hidden
      >
        {[0.25, 0.5, 0.75].map((t) => {
          const y = padY + t * (h - padY * 2);
          return (
            <line
              key={t}
              x1={padX}
              x2={w - padX}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.04)"
              strokeWidth={1}
              strokeDasharray="2 4"
            />
          );
        })}
        <path d={d} fill="none" stroke="var(--fc-accent)" strokeWidth={2} strokeLinejoin="round" />
        {last ? (
          <>
            <circle
              cx={last.x}
              cy={last.y}
              r={6}
              fill="var(--fc-accent)"
              fillOpacity={0.3}
            />
            <circle cx={last.x} cy={last.y} r={3} fill="var(--fc-accent)" />
          </>
        ) : null}
      </svg>
    </div>
  );
}
