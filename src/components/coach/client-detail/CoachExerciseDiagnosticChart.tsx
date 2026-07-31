"use client";

import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { CoachExerciseDiagnosticPayload } from "@/lib/coachExerciseDiagnostic";
import styles from "./CoachExerciseDiagnosticChart.module.css";

type SeriesKey = "volume" | "avgLoad" | "strength";

type Props = {
  data: CoachExerciseDiagnosticPayload;
  className?: string;
};

function formatKg(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}t`;
  if (Math.abs(n - Math.round(n)) < 0.05) return `${Math.round(n)} kg`;
  return `${Math.round(n * 10) / 10} kg`;
}

function formatIndex(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${Math.round(n * 10) / 10}`;
}

/** Split indexed points into contiguous polyline segments (gaps = null). */
function pathSegments(
  values: (number | null)[],
  xFor: (i: number) => number,
  yFor: (v: number) => number,
): string[] {
  const segs: string[] = [];
  let buf: string[] = [];
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v == null) {
      if (buf.length >= 2) segs.push(buf.join(" "));
      buf = [];
      continue;
    }
    buf.push(`${xFor(i)},${yFor(v)}`);
  }
  if (buf.length >= 2) segs.push(buf.join(" "));
  return segs;
}

export default function CoachExerciseDiagnosticChart({ data, className }: Props) {
  const [showVolume, setShowVolume] = useState(true);
  const [showLoad, setShowLoad] = useState(true);
  const [showStrength, setShowStrength] = useState(data.strengthEligible);
  const [hovered, setHovered] = useState<number | null>(null);

  React.useEffect(() => {
    setShowStrength(data.strengthEligible);
    setHovered(null);
  }, [data.exerciseId, data.strengthEligible]);

  const weeks = data.weeks;
  const strengthOn = data.strengthEligible && showStrength;

  const { minY, maxY } = useMemo(() => {
    const vals: number[] = [100];
    for (const w of weeks) {
      if (showVolume && w.volumeIndex != null) vals.push(w.volumeIndex);
      if (showLoad && w.avgLoadIndex != null) vals.push(w.avgLoadIndex);
      if (strengthOn && w.strengthIndex != null) vals.push(w.strengthIndex);
    }
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = Math.max(4, (max - min) * 0.08);
    return { minY: min - pad, maxY: max + pad };
  }, [weeks, showVolume, showLoad, strengthOn]);

  if (!data.enoughData) {
    return (
      <div className={cn(styles.shell, className)}>
        <p className={styles.empty}>
          Not enough data yet — need at least 3 weeks with sessions for this lift.
        </p>
      </div>
    );
  }

  const padding = { top: 14, right: 12, bottom: 18, left: 36 };
  const width = 960;
  const height = 280;
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const n = weeks.length;
  const rangeY = maxY - minY || 1;

  const xFor = (i: number) =>
    padding.left + (n <= 1 ? chartW / 2 : (i / (n - 1)) * chartW);
  const yFor = (v: number) =>
    padding.top + chartH - ((v - minY) / rangeY) * chartH;

  const volSegs = showVolume
    ? pathSegments(
        weeks.map((w) => w.volumeIndex),
        xFor,
        yFor,
      )
    : [];
  const loadSegs = showLoad
    ? pathSegments(
        weeks.map((w) => w.avgLoadIndex),
        xFor,
        yFor,
      )
    : [];
  const strSegs = strengthOn
    ? pathSegments(
        weeks.map((w) => w.strengthIndex),
        xFor,
        yFor,
      )
    : [];

  const hoveredWeek = hovered != null ? weeks[hovered] : null;

  const startLabel =
    weeks[0] != null
      ? new Date(weeks[0].weekStart + "T12:00:00").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : "";
  const endLabel =
    weeks[weeks.length - 1] != null
      ? new Date(weeks[weeks.length - 1]!.weekStart + "T12:00:00").toLocaleDateString(
          "en-US",
          { month: "short", day: "numeric" },
        )
      : "";

  return (
    <div className={cn(styles.shell, className)}>
      <p className={styles.legendHint}>
        Each line starts at 100 — the shape is the signal, not the height.
      </p>

      <div className={styles.toggles} role="group" aria-label="Series toggles">
        <button
          type="button"
          className={cn(styles.toggle, showVolume && styles.toggleOnVolume)}
          aria-pressed={showVolume}
          onClick={() => setShowVolume((v) => !v)}
        >
          Volume
        </button>
        <button
          type="button"
          className={cn(styles.toggle, showLoad && styles.toggleOnLoad)}
          aria-pressed={showLoad}
          onClick={() => setShowLoad((v) => !v)}
        >
          Avg load
        </button>
        {data.strengthEligible ? (
          <button
            type="button"
            className={cn(styles.toggle, strengthOn && styles.toggleOnStrength)}
            aria-pressed={strengthOn}
            onClick={() => setShowStrength((v) => !v)}
          >
            Strength
          </button>
        ) : null}
      </div>

      {!data.strengthEligible && data.strengthOmitReason ? (
        <p className={styles.omitNote}>Strength hidden — {data.strengthOmitReason}</p>
      ) : null}

      <div className={styles.chartWrap}>
        <svg
          className={styles.svg}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Exercise diagnostic indexed chart"
        >
          {[0.25, 0.5, 0.75].map((t) => {
            const y = padding.top + chartH * (1 - t);
            return (
              <line
                key={t}
                className={styles.gridLine}
                x1={padding.left}
                x2={padding.left + chartW}
                y1={y}
                y2={y}
              />
            );
          })}

          <line
            className={styles.baseline}
            x1={padding.left}
            x2={padding.left + chartW}
            y1={yFor(100)}
            y2={yFor(100)}
          />
          <text className={styles.yLabel} x={4} y={yFor(100) + 3}>
            100
          </text>

          {volSegs.map((pts, i) => (
            <polyline key={`v-${i}`} className={styles.lineVolume} points={pts} />
          ))}
          {loadSegs.map((pts, i) => (
            <polyline key={`l-${i}`} className={styles.lineLoad} points={pts} />
          ))}
          {strSegs.map((pts, i) => (
            <polyline key={`s-${i}`} className={styles.lineStrength} points={pts} />
          ))}

          {weeks.map((w, i) => {
            const x = xFor(i);
            const dots: { key: SeriesKey; y: number; fill: string }[] = [];
            if (showVolume && w.volumeIndex != null) {
              dots.push({ key: "volume", y: yFor(w.volumeIndex), fill: "var(--fc-group-c, #22d3ee)" });
            }
            if (showLoad && w.avgLoadIndex != null) {
              dots.push({ key: "avgLoad", y: yFor(w.avgLoadIndex), fill: "var(--gold, #f5c242)" });
            }
            if (strengthOn && w.strengthIndex != null) {
              dots.push({
                key: "strength",
                y: yFor(w.strengthIndex),
                fill: "var(--fc-effort-easy, #84cc16)",
              });
            }
            return (
              <g key={w.weekStart}>
                {dots.map((d) => (
                  <circle
                    key={d.key}
                    className={styles.dot}
                    cx={x}
                    cy={d.y}
                    r={hovered === i ? 5 : 3.5}
                    fill={d.fill}
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => setHovered(i)}
                    style={{ cursor: "pointer" }}
                  />
                ))}
                {/* Hit area for gap weeks too */}
                <rect
                  x={x - chartW / Math.max(n, 1) / 2}
                  y={padding.top}
                  width={Math.max(8, chartW / Math.max(n, 1))}
                  height={chartH}
                  fill="transparent"
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setHovered(i)}
                />
              </g>
            );
          })}

          {data.prMarkers.map((m, idx) => {
            const wi = weeks.findIndex((w) => w.weekStart === m.weekStart);
            if (wi < 0) return null;
            const x = xFor(wi);
            const yBase = padding.top + chartH;
            return (
              <g key={`pr-${m.date}-${idx}`}>
                <line
                  className={styles.prTick}
                  x1={x}
                  x2={x}
                  y1={yBase}
                  y2={yBase + 6}
                />
              </g>
            );
          })}
        </svg>

        <div className={styles.dateAxis}>
          <span>{startLabel}</span>
          <span>{endLabel}</span>
        </div>
      </div>

      {hoveredWeek ? (
        <div className={styles.hoverCard}>
          <div className={styles.hoverDate}>
            Week of{" "}
            {new Date(hoveredWeek.weekStart + "T12:00:00").toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
            {hoveredWeek.sessions === 0 ? " · no sessions" : null}
          </div>
          {showVolume ? (
            <div className={styles.hoverRow}>
              <span>Volume · idx {formatIndex(hoveredWeek.volumeIndex)}</span>
              <span className={styles.hoverAbs}>{formatKg(hoveredWeek.volumeKg)}</span>
            </div>
          ) : null}
          {showLoad ? (
            <div className={styles.hoverRow}>
              <span>Avg load · idx {formatIndex(hoveredWeek.avgLoadIndex)}</span>
              <span className={styles.hoverAbs}>{formatKg(hoveredWeek.avgLoadKg)}</span>
            </div>
          ) : null}
          {strengthOn ? (
            <div className={styles.hoverRow}>
              <span>Strength · idx {formatIndex(hoveredWeek.strengthIndex)}</span>
              <span className={styles.hoverAbs}>
                {hoveredWeek.estOneRmKg != null
                  ? `${formatKg(hoveredWeek.estOneRmKg)} est 1RM`
                  : "—"}
              </span>
            </div>
          ) : null}
          {data.prMarkers.some((m) => m.weekStart === hoveredWeek.weekStart) ? (
            <div className={styles.hoverRow}>
              <span>PR this week</span>
              <span className={styles.hoverAbs}>●</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
