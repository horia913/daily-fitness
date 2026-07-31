"use client";

import React, { useId, useMemo, useState } from "react";
import type { CoachExerciseChartsPayload } from "@/lib/coachExerciseCharts/getCoachExerciseCharts";
import {
  areaPaths,
  formatWeekLabel,
  formatWeekRange,
  hexToRgba,
  polylineSegments,
} from "./coachExerciseChartSvg";
import styles from "./CoachExerciseCharts.module.css";

const TOP = "#22E56A";
const SETVOL = "#9D6BFF";
const LOADVOL = "#FFB020";
const GOLD = "#F5C242";

type Props = {
  data: CoachExerciseChartsPayload;
};

function fmtKg(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 1000) return `${Math.round(n).toLocaleString("en-US")} kg`;
  if (Math.abs(n - Math.round(n)) < 0.05) return `${Math.round(n)} kg`;
  return `${Math.round(n * 10) / 10} kg`;
}

function deltaPctLabel(pct: number | null, from: number | null, unit = ""): string {
  if (pct == null) return "—";
  if (pct === 0) return "flat vs window start";
  const arrow = pct > 0 ? "▲" : "▼";
  const fromBit =
    from != null
      ? ` · from ${unit === "kg" ? fmtKg(from) : `${from}${unit}`}`
      : "";
  return `${arrow} ${Math.abs(pct)}%${fromBit}`;
}

function deltaClass(n: number | null): string {
  if (n == null || n === 0) return styles.flat;
  return n > 0 ? styles.up : styles.dn;
}

export default function CoachExerciseProgressionChart({ data }: Props) {
  const gid = useId().replace(/:/g, "");
  const [showTop, setShowTop] = useState(true);
  const [showSetVol, setShowSetVol] = useState(true);
  const [showLoadVol, setShowLoadVol] = useState(true);
  const [hovered, setHovered] = useState<number | null>(null);

  React.useEffect(() => {
    setHovered(null);
  }, [data.exercise.id, data.range]);

  const points = data.progression.points;
  const bands = data.phaseBands;
  const kpi = data.progression.kpi;
  const prs = data.progression.prMarkers;

  const width = 1100;
  const height = 286;
  const pad = { top: 16, right: 16, bottom: 58, left: 46 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const n = points.length;
  const prY = height - 30;

  const { minY, maxY } = useMemo(() => {
    const vals: number[] = [100];
    for (const p of points) {
      if (showTop && p.topSetIndexed != null) vals.push(p.topSetIndexed);
      if (showSetVol && p.setVolumeIndexed != null) vals.push(p.setVolumeIndexed);
      if (showLoadVol && p.loadVolumeIndexed != null)
        vals.push(p.loadVolumeIndexed);
    }
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const padY = Math.max(8, (max - min) * 0.1);
    return { minY: min - padY, maxY: max + padY };
  }, [points, showTop, showSetVol, showLoadVol]);

  const xFor = (i: number) =>
    pad.left + (n <= 1 ? chartW / 2 : (i / Math.max(1, n - 1)) * chartW);
  const yFor = (v: number) =>
    pad.top + chartH - ((v - minY) / (maxY - minY || 1)) * chartH;

  const weekIndex = useMemo(() => {
    const m = new Map<string, number>();
    points.forEach((p, i) => m.set(p.weekStart, i));
    return m;
  }, [points]);

  const topVals = points.map((p) => p.topSetIndexed);
  const setVals = points.map((p) => p.setVolumeIndexed);
  const loadVals = points.map((p) => p.loadVolumeIndexed);
  const topSegs = showTop ? polylineSegments(topVals, xFor, yFor) : [];
  const setSegs = showSetVol ? polylineSegments(setVals, xFor, yFor) : [];
  const loadSegs = showLoadVol ? polylineSegments(loadVals, xFor, yFor) : [];
  const topAreas = showTop
    ? areaPaths(topVals, xFor, yFor, pad.top + chartH)
    : [];
  const baselineY = pad.top + chartH;

  if (!data.enoughData) {
    return (
      <div className={styles.card}>
        <div className={styles.chead}>
          <p className={styles.eyebrow}>Progression</p>
          <h3 className={styles.title}>{data.exercise.name}</h3>
          <p className={styles.sub}>
            What they actually lifted — logged values only
          </p>
        </div>
        <p className={styles.empty}>
          Not enough data yet — need at least 3 weeks with sessions for this
          lift.
        </p>
      </div>
    );
  }

  if (!data.progression.available) {
    return (
      <div className={styles.card}>
        <div className={styles.chead}>
          <p className={styles.eyebrow}>Progression</p>
          <h3 className={styles.title}>{data.exercise.name}</h3>
        </div>
        <p className={styles.empty}>
          {data.progression.unavailableReason ??
            "Progression unavailable for this exercise."}
        </p>
      </div>
    );
  }

  const hasTop = points.some((p) => p.topSetIndexed != null);
  const hasSetVol = points.some((p) => p.setVolumeIndexed != null);
  const hasLoadVol = points.some((p) => p.loadVolumeIndexed != null);

  const hi = hovered != null ? points[hovered] : null;
  const hoverLeft =
    hovered != null
      ? `${Math.min(72, Math.max(8, (xFor(hovered) / width) * 100 - 8))}%`
      : "50%";

  const yTicks = [maxY, (maxY + 100) / 2, 100, (minY + 100) / 2].map((v) =>
    Math.round(v),
  );
  const uniqueTicks = [...new Set(yTicks)].sort((a, b) => b - a);

  return (
    <div className={styles.card}>
      <div className={styles.chead}>
        <div className={styles.chRow}>
          <span>
            <p className={styles.eyebrow}>Progression</p>
            <h3 className={styles.title}>{data.exercise.name}</h3>
            <p className={styles.sub}>
              What they actually lifted — logged values only
            </p>
          </span>
        </div>
        <div className={styles.kpis}>
          <span>
            <div className={styles.kpiLabel}>
              <i className={styles.kpiDot} style={{ background: TOP }} />
              Top set
            </div>
            <div className={styles.kpiValue} style={{ color: TOP }}>
              {kpi.currentTopSetKg != null
                ? Math.round(kpi.currentTopSetKg)
                : "—"}
              {kpi.currentTopSetKg != null ? (
                <span className={styles.kpiUnit}> kg</span>
              ) : null}
            </div>
            <div
              className={`${styles.kpiDelta} ${deltaClass(kpi.deltaTopSetPct)}`}
            >
              {deltaPctLabel(kpi.deltaTopSetPct, kpi.baselineTopSetKg, "kg")}
            </div>
          </span>
          <span>
            <div className={styles.kpiLabel}>
              <i className={styles.kpiDot} style={{ background: SETVOL }} />
              Set volume
            </div>
            <div className={styles.kpiValue}>
              {kpi.currentSetVolume != null ? kpi.currentSetVolume : "—"}
              {kpi.currentSetVolume != null ? (
                <span className={styles.kpiUnit}> /wk</span>
              ) : null}
            </div>
            <div
              className={`${styles.kpiDelta} ${deltaClass(kpi.deltaSetVolumePct)}`}
            >
              {deltaPctLabel(kpi.deltaSetVolumePct, kpi.baselineSetVolume)}
            </div>
          </span>
          <span>
            <div className={styles.kpiLabel}>
              <i className={styles.kpiDot} style={{ background: LOADVOL }} />
              Load volume
            </div>
            <div className={styles.kpiValue}>
              {kpi.currentLoadVolumeKg != null
                ? Math.round(kpi.currentLoadVolumeKg).toLocaleString("en-US")
                : "—"}
              {kpi.currentLoadVolumeKg != null ? (
                <span className={styles.kpiUnit}> kg</span>
              ) : null}
            </div>
            <div
              className={`${styles.kpiDelta} ${deltaClass(kpi.deltaLoadVolumePct)}`}
            >
              {deltaPctLabel(
                kpi.deltaLoadVolumePct,
                kpi.baselineLoadVolumeKg,
                "kg",
              )}
            </div>
          </span>
          <span>
            <div className={styles.kpiLabel}>Records set</div>
            <div className={styles.kpiValue} style={{ color: GOLD }}>
              {kpi.recordsSet}
            </div>
            <div className={`${styles.kpiDelta} ${styles.flat}`}>
              {kpi.lastPrWeekLabel
                ? `last · ${kpi.lastPrWeekLabel}`
                : "none in range"}
            </div>
          </span>
        </div>
      </div>

      <div className={styles.body}>
        {!hasTop ? (
          <p className={styles.omitNote}>
            Top set omitted — no weighted sets in this window.
          </p>
        ) : null}
        {!hasSetVol ? (
          <p className={styles.omitNote}>
            Set volume omitted — no working sets in this window.
          </p>
        ) : null}
        {!hasLoadVol ? (
          <p className={styles.omitNote}>
            Load volume omitted — no weight×reps products in this window.
          </p>
        ) : null}
        {!data.exercise.strengthEligible ? (
          <p className={styles.omitNote}>
            Est. 1RM is not plotted here (by design). This lift is also outside
            the est-1RM eligibility rule (athletic development or missing
            primary muscle) — progression still uses logged top set / volume.
          </p>
        ) : null}

        <div className={styles.toggles}>
          {hasTop ? (
            <button
              type="button"
              className={`${styles.toggle} ${showTop ? styles.toggleOn : ""}`}
              style={
                showTop
                  ? {
                      borderColor:
                        "color-mix(in srgb, #22E56A 55%, transparent)",
                      background:
                        "color-mix(in srgb, #22E56A 12%, transparent)",
                    }
                  : undefined
              }
              onClick={() => setShowTop((v) => !v)}
            >
              <i
                className={styles.toggleDot}
                style={{
                  background: TOP,
                  boxShadow: showTop ? `0 0 9px -1px ${TOP}` : undefined,
                }}
              />
              Top set
            </button>
          ) : null}
          {hasSetVol ? (
            <button
              type="button"
              className={`${styles.toggle} ${showSetVol ? styles.toggleOn : ""}`}
              style={
                showSetVol
                  ? {
                      borderColor:
                        "color-mix(in srgb, #9D6BFF 55%, transparent)",
                      background:
                        "color-mix(in srgb, #9D6BFF 12%, transparent)",
                    }
                  : undefined
              }
              onClick={() => setShowSetVol((v) => !v)}
            >
              <i
                className={styles.toggleDot}
                style={{
                  background: SETVOL,
                  boxShadow: showSetVol ? `0 0 9px -1px ${SETVOL}` : undefined,
                }}
              />
              Set volume
            </button>
          ) : null}
          {hasLoadVol ? (
            <button
              type="button"
              className={`${styles.toggle} ${showLoadVol ? styles.toggleOn : ""}`}
              style={
                showLoadVol
                  ? {
                      borderColor:
                        "color-mix(in srgb, #FFB020 55%, transparent)",
                      background:
                        "color-mix(in srgb, #FFB020 12%, transparent)",
                    }
                  : undefined
              }
              onClick={() => setShowLoadVol((v) => !v)}
            >
              <i
                className={styles.toggleDot}
                style={{
                  background: LOADVOL,
                  boxShadow: showLoadVol
                    ? `0 0 9px -1px ${LOADVOL}`
                    : undefined,
                }}
              />
              Load volume
            </button>
          ) : null}
        </div>

        <div className={styles.legend}>
          <span>indexed to 100 at window start · hover for absolutes</span>
          {bands.map((b) => (
            <span key={b.id} className={styles.ph}>
              <i
                className={styles.phSwatch}
                style={{ background: hexToRgba(b.color, 0.28) }}
              />
              {b.name}
            </span>
          ))}
          {prs.length > 0 ? (
            <span className={styles.ph}>
              <i
                className={styles.phSwatch}
                style={{
                  background: GOLD,
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                }}
              />
              PR
            </span>
          ) : null}
        </div>

        <div className={styles.plot}>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className={styles.svg}
            role="img"
            aria-label="Progression chart"
          >
            <defs>
              <linearGradient id={`gTop-${gid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={TOP} stopOpacity={0.26} />
                <stop offset="100%" stopColor={TOP} stopOpacity={0} />
              </linearGradient>
            </defs>

            {bands.map((b, bi) => {
              const i0 = weekIndex.get(b.weekStart) ?? 0;
              const i1 = weekIndex.get(b.weekEnd) ?? n - 1;
              const x0 = xFor(i0);
              const x1 = xFor(i1);
              const w = Math.max(4, x1 - x0);
              return (
                <g key={b.id}>
                  <rect
                    x={x0}
                    y={pad.top}
                    width={w}
                    height={chartH}
                    fill={hexToRgba(b.color, 0.055)}
                  />
                  {bi > 0 ? (
                    <line
                      x1={x0}
                      y1={pad.top}
                      x2={x0}
                      y2={baselineY}
                      stroke={hexToRgba(b.color, 0.4)}
                      strokeWidth={1}
                      strokeDasharray="3 4"
                    />
                  ) : null}
                  <text
                    x={x0 + 12}
                    y={pad.top + 14}
                    fill={hexToRgba(b.color, 0.8)}
                    fontFamily="JetBrains Mono, monospace"
                    fontSize={8.5}
                    letterSpacing={1.6}
                  >
                    {b.name.toUpperCase()}
                  </text>
                </g>
              );
            })}

            {uniqueTicks.map((tick) => {
              const y = yFor(tick);
              const is100 = tick === 100;
              return (
                <g key={tick}>
                  <line
                    x1={pad.left}
                    y1={y}
                    x2={pad.left + chartW}
                    y2={y}
                    stroke={
                      is100 ? "rgba(255,255,255,.2)" : "rgba(255,255,255,.04)"
                    }
                    strokeDasharray={is100 ? "4 5" : undefined}
                  />
                  <text
                    x={pad.left - 8}
                    y={y + 4}
                    textAnchor="end"
                    fill={is100 ? "#8B93A1" : "#3D434D"}
                    fontFamily="JetBrains Mono, monospace"
                    fontSize={10}
                  >
                    {tick}
                  </text>
                </g>
              );
            })}

            {topAreas.map((d, i) => (
              <path key={`ta-${i}`} d={d} fill={`url(#gTop-${gid})`} />
            ))}

            {loadSegs.map((pts, i) => (
              <polyline
                key={`ls-${i}`}
                points={pts}
                fill="none"
                stroke={LOADVOL}
                strokeWidth={2.4}
                strokeOpacity={0.9}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: "drop-shadow(0 0 7px rgba(255,176,32,.45))" }}
              />
            ))}
            {setSegs.map((pts, i) => (
              <polyline
                key={`sv-${i}`}
                points={pts}
                fill="none"
                stroke={SETVOL}
                strokeWidth={2.4}
                strokeOpacity={0.9}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: "drop-shadow(0 0 7px rgba(157,107,255,.45))" }}
              />
            ))}
            {topSegs.map((pts, i) => (
              <polyline
                key={`ts-${i}`}
                points={pts}
                fill="none"
                stroke={TOP}
                strokeWidth={2.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: "drop-shadow(0 0 9px rgba(34,229,106,.55))" }}
              />
            ))}

            {showTop
              ? points.map((p, i) =>
                  p.topSetIndexed != null ? (
                    <circle
                      key={`td-${i}`}
                      cx={xFor(i)}
                      cy={yFor(p.topSetIndexed)}
                      r={3}
                      fill="#0A0B0D"
                      stroke={TOP}
                      strokeWidth={1.9}
                    />
                  ) : null,
                )
              : null}

            {/* PR stems to top-set line */}
            {prs.map((pr, i) => {
              const wi = weekIndex.get(pr.weekStart);
              if (wi == null) return null;
              const pt = points[wi];
              const yTop =
                pt?.topSetIndexed != null
                  ? yFor(pt.topSetIndexed)
                  : pr.topSetIndexed != null
                    ? yFor(pr.topSetIndexed)
                    : baselineY;
              const x = xFor(wi);
              return (
                <g key={`pr-${i}`}>
                  <line
                    x1={x}
                    y1={yTop}
                    x2={x}
                    y2={prY}
                    stroke="rgba(245,194,66,.35)"
                    strokeWidth={1}
                    strokeDasharray="2 3"
                  />
                  <circle cx={x} cy={prY} r={4} fill={GOLD} />
                </g>
              );
            })}

            {hovered != null && points[hovered] ? (
              <g>
                <line
                  x1={xFor(hovered)}
                  y1={pad.top}
                  x2={xFor(hovered)}
                  y2={baselineY}
                  stroke="rgba(255,255,255,.28)"
                />
                {showLoadVol && points[hovered]!.loadVolumeIndexed != null ? (
                  <circle
                    cx={xFor(hovered)}
                    cy={yFor(points[hovered]!.loadVolumeIndexed!)}
                    r={5.5}
                    fill="#0A0B0D"
                    stroke={LOADVOL}
                    strokeWidth={2.6}
                  />
                ) : null}
                {showSetVol && points[hovered]!.setVolumeIndexed != null ? (
                  <circle
                    cx={xFor(hovered)}
                    cy={yFor(points[hovered]!.setVolumeIndexed!)}
                    r={5.5}
                    fill="#0A0B0D"
                    stroke={SETVOL}
                    strokeWidth={2.6}
                  />
                ) : null}
                {showTop && points[hovered]!.topSetIndexed != null ? (
                  <circle
                    cx={xFor(hovered)}
                    cy={yFor(points[hovered]!.topSetIndexed!)}
                    r={5.5}
                    fill="#0A0B0D"
                    stroke={TOP}
                    strokeWidth={2.6}
                  />
                ) : null}
              </g>
            ) : null}

            {points.map((p, i) => {
              if (i % Math.max(1, Math.floor(n / 5)) !== 0 && i !== n - 1)
                return null;
              return (
                <text
                  key={`ax-${i}`}
                  x={xFor(i)}
                  y={height - 8}
                  textAnchor="middle"
                  fill="#3D434D"
                  fontFamily="JetBrains Mono, monospace"
                  fontSize={9.5}
                >
                  {formatWeekLabel(p.weekStart, i)}
                </text>
              );
            })}

            {points.map((_, i) => {
              const x = xFor(i);
              const half =
                n <= 1 ? chartW / 2 : chartW / Math.max(1, n - 1) / 2;
              return (
                <rect
                  key={`hit-${i}`}
                  className={styles.hitLayer}
                  x={x - half}
                  y={pad.top}
                  width={Math.max(8, half * 2)}
                  height={chartH}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                />
              );
            })}
          </svg>

          {hi ? (
            <div className={styles.hoverbox} style={{ left: hoverLeft }}>
              <div className={styles.hoverWk}>
                Week {hovered! + 1} · {formatWeekRange(hi.weekStart)}
              </div>
              {hi.phaseName ? (
                <div
                  className={styles.hoverPhase}
                  style={{
                    color:
                      bands.find((b) => b.name === hi.phaseName)?.color ??
                      "#FF8A1F",
                  }}
                >
                  {hi.phaseName}
                </div>
              ) : (
                <div className={styles.hoverPhase} style={{ color: "#3D434D" }}>
                  No phase
                </div>
              )}
              {showTop && hasTop ? (
                <div className={styles.hoverRow}>
                  <i className={styles.hoverDot} style={{ background: TOP }} />
                  <span className={styles.hoverKey}>Top set</span>
                  <span className={styles.hoverVal} style={{ color: TOP }}>
                    {hi.topSetIndexed != null ? hi.topSetIndexed : "—"}
                  </span>
                  <span className={styles.hoverAbs}>
                    {hi.topSetKg != null
                      ? `${fmtKg(hi.topSetKg)}${
                          hi.topSetReps != null ? ` × ${hi.topSetReps}` : ""
                        }`
                      : "gap"}
                  </span>
                </div>
              ) : null}
              {showSetVol && hasSetVol ? (
                <div className={styles.hoverRow}>
                  <i
                    className={styles.hoverDot}
                    style={{ background: SETVOL }}
                  />
                  <span className={styles.hoverKey}>Set volume</span>
                  <span className={styles.hoverVal} style={{ color: SETVOL }}>
                    {hi.setVolumeIndexed != null ? hi.setVolumeIndexed : "—"}
                  </span>
                  <span className={styles.hoverAbs}>
                    {hi.setVolume != null ? `${hi.setVolume} sets` : "gap"}
                  </span>
                </div>
              ) : null}
              {showLoadVol && hasLoadVol ? (
                <div className={styles.hoverRow}>
                  <i
                    className={styles.hoverDot}
                    style={{ background: LOADVOL }}
                  />
                  <span className={styles.hoverKey}>Load volume</span>
                  <span className={styles.hoverVal} style={{ color: LOADVOL }}>
                    {hi.loadVolumeIndexed != null ? hi.loadVolumeIndexed : "—"}
                  </span>
                  <span className={styles.hoverAbs}>
                    {hi.loadVolumeKg != null
                      ? fmtKg(hi.loadVolumeKg)
                      : "gap"}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        {data.axisNote ? (
          <p className={styles.axisNote}>{data.axisNote}</p>
        ) : null}
      </div>
    </div>
  );
}
