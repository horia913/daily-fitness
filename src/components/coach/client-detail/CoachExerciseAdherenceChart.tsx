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

const SETS = "#2E7BFF";
const REPS = "#22D3EE";
const BAD = "#FF5A4D";

type Props = {
  data: CoachExerciseChartsPayload;
};

function deltaClass(n: number | null): string {
  if (n == null || n === 0) return styles.flat;
  return n > 0 ? styles.up : styles.dn;
}

function deltaLabel(n: number | null, unit = "pts"): string {
  if (n == null) return "—";
  if (n === 0) return `flat vs first half`;
  const arrow = n > 0 ? "▲" : "▼";
  return `${arrow} ${Math.abs(n)} ${unit} vs first half`;
}

function pctTone(n: number | null): string {
  if (n == null) return "#8B93A1";
  if (n >= 90) return "#22E56A";
  if (n >= 80) return "#FFB020";
  return BAD;
}

export default function CoachExerciseAdherenceChart({ data }: Props) {
  const gid = useId().replace(/:/g, "");
  const [showSets, setShowSets] = useState(true);
  const [showReps, setShowReps] = useState(true);
  const [hovered, setHovered] = useState<number | null>(null);

  React.useEffect(() => {
    setHovered(null);
  }, [data.exercise.id, data.range]);

  const points = data.adherence.points;
  const bands = data.phaseBands;
  const kpi = data.adherence.kpi;

  const width = 1100;
  const height = 268;
  const pad = { top: 18, right: 16, bottom: 40, left: 46 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const n = points.length;
  const yMin = 0;
  const yMax = 100;

  const xFor = (i: number) =>
    pad.left + (n <= 1 ? chartW / 2 : (i / Math.max(1, n - 1)) * chartW);
  const yFor = (v: number) =>
    pad.top + chartH - ((v - yMin) / (yMax - yMin)) * chartH;

  const weekIndex = useMemo(() => {
    const m = new Map<string, number>();
    points.forEach((p, i) => m.set(p.weekStart, i));
    return m;
  }, [points]);

  const setsVals = points.map((p) => p.setsPct);
  const repsVals = points.map((p) => p.repsPct);
  const setsSegs = showSets ? polylineSegments(setsVals, xFor, yFor) : [];
  const repsSegs = showReps ? polylineSegments(repsVals, xFor, yFor) : [];
  const setsAreas = showSets
    ? areaPaths(setsVals, xFor, yFor, pad.top + chartH)
    : [];
  const y80 = yFor(80);
  const baselineY = pad.top + chartH;

  if (!data.enoughData) {
    return (
      <div className={styles.card}>
        <div className={styles.chead}>
          <p className={styles.eyebrow}>Adherence</p>
          <h3 className={styles.title}>{data.exercise.name}</h3>
          <p className={styles.sub}>Did they do what was programmed?</p>
        </div>
        <p className={styles.empty}>
          Not enough data yet — need at least 3 weeks with sessions for this
          lift.
        </p>
      </div>
    );
  }

  if (!data.adherence.available) {
    return (
      <div className={styles.card}>
        <div className={styles.chead}>
          <p className={styles.eyebrow}>Adherence</p>
          <h3 className={styles.title}>{data.exercise.name}</h3>
          <p className={styles.sub}>Did they do what was programmed?</p>
        </div>
        <p className={styles.empty}>
          {data.adherence.unavailableReason ??
            "Adherence unavailable for this exercise."}
        </p>
      </div>
    );
  }

  const hi = hovered != null ? points[hovered] : null;
  const hoverLeft =
    hovered != null
      ? `${Math.min(72, Math.max(8, (xFor(hovered) / width) * 100 - 8))}%`
      : "50%";

  return (
    <div className={styles.card}>
      <div className={styles.chead}>
        <div className={styles.chRow}>
          <span>
            <p className={styles.eyebrow}>Adherence</p>
            <h3 className={styles.title}>{data.exercise.name}</h3>
            <p className={styles.sub}>Did they do what was programmed?</p>
          </span>
        </div>
        <div className={styles.kpis}>
          <span>
            <div className={styles.kpiLabel}>
              <i className={styles.kpiDot} style={{ background: SETS }} />
              Sets · current
            </div>
            <div
              className={styles.kpiValue}
              style={{ color: pctTone(kpi.currentSetsPct) }}
            >
              {kpi.currentSetsPct != null ? `${kpi.currentSetsPct}%` : "—"}
            </div>
            <div className={`${styles.kpiDelta} ${deltaClass(kpi.deltaSetsPct)}`}>
              {deltaLabel(kpi.deltaSetsPct)}
            </div>
          </span>
          <span>
            <div className={styles.kpiLabel}>
              <i className={styles.kpiDot} style={{ background: REPS }} />
              Reps · current
            </div>
            <div
              className={styles.kpiValue}
              style={{ color: pctTone(kpi.currentRepsPct) }}
            >
              {kpi.currentRepsPct != null ? `${kpi.currentRepsPct}%` : "—"}
            </div>
            <div className={`${styles.kpiDelta} ${deltaClass(kpi.deltaRepsPct)}`}>
              {deltaLabel(kpi.deltaRepsPct)}
            </div>
          </span>
          <span>
            <div className={styles.kpiLabel}>Sessions missed</div>
            <div className={styles.kpiValue}>{kpi.sessionsMissed}</div>
            <div className={`${styles.kpiDelta} ${styles.flat}`}>
              of {kpi.sessionsScheduled} scheduled
            </div>
          </span>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.toggles}>
          <button
            type="button"
            className={`${styles.toggle} ${showSets ? styles.toggleOn : ""}`}
            style={
              showSets
                ? {
                    borderColor: "color-mix(in srgb, #2E7BFF 55%, transparent)",
                    background: "color-mix(in srgb, #2E7BFF 12%, transparent)",
                  }
                : undefined
            }
            onClick={() => setShowSets((v) => !v)}
          >
            <i
              className={styles.toggleDot}
              style={{
                background: SETS,
                boxShadow: showSets ? `0 0 9px -1px ${SETS}` : undefined,
              }}
            />
            Sets
          </button>
          <button
            type="button"
            className={`${styles.toggle} ${showReps ? styles.toggleOn : ""}`}
            style={
              showReps
                ? {
                    borderColor: "color-mix(in srgb, #22D3EE 55%, transparent)",
                    background: "color-mix(in srgb, #22D3EE 12%, transparent)",
                  }
                : undefined
            }
            onClick={() => setShowReps((v) => !v)}
          >
            <i
              className={styles.toggleDot}
              style={{
                background: REPS,
                boxShadow: showReps ? `0 0 9px -1px ${REPS}` : undefined,
              }}
            />
            Reps
          </button>
        </div>

        <div className={styles.legend}>
          <span>% of prescribed completed · hover for raw counts</span>
          {bands.map((b) => (
            <span key={b.id} className={styles.ph}>
              <i
                className={styles.phSwatch}
                style={{ background: hexToRgba(b.color, 0.28) }}
              />
              {b.name}
            </span>
          ))}
          <span className={styles.ph}>
            <i
              className={styles.phSwatch}
              style={{ background: "rgba(255,90,77,.18)" }}
            />
            below 80%
          </span>
        </div>

        <div className={styles.plot}>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className={styles.svg}
            role="img"
            aria-label="Adherence chart"
          >
            <defs>
              <linearGradient id={`gSets-${gid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SETS} stopOpacity={0.28} />
                <stop offset="100%" stopColor={SETS} stopOpacity={0} />
              </linearGradient>
            </defs>

            {/* Phase bands */}
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

            {/* Under-80% zone */}
            <rect
              x={pad.left}
              y={y80}
              width={chartW}
              height={baselineY - y80}
              fill="rgba(255,90,77,.05)"
            />

            {/* Grid */}
            {[100, 80, 60, 40].map((tick) => {
              const y = yFor(tick);
              const is80 = tick === 80;
              const is100 = tick === 100;
              return (
                <g key={tick}>
                  <line
                    x1={pad.left}
                    y1={y}
                    x2={pad.left + chartW}
                    y2={y}
                    stroke={
                      is80
                        ? "rgba(255,90,77,.22)"
                        : is100
                          ? "rgba(255,255,255,.2)"
                          : "rgba(255,255,255,.04)"
                    }
                    strokeDasharray={is80 || is100 ? "3 5" : undefined}
                  />
                  <text
                    x={pad.left - 8}
                    y={y + 4}
                    textAnchor="end"
                    fill={is80 ? "rgba(255,90,77,.6)" : is100 ? "#8B93A1" : "#3D434D"}
                    fontFamily="JetBrains Mono, monospace"
                    fontSize={10}
                  >
                    {tick}%
                  </text>
                </g>
              );
            })}

            {setsAreas.map((d, i) => (
              <path key={`sa-${i}`} d={d} fill={`url(#gSets-${gid})`} />
            ))}

            {setsSegs.map((pts, i) => (
              <polyline
                key={`ss-${i}`}
                points={pts}
                fill="none"
                stroke={SETS}
                strokeWidth={2.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: "drop-shadow(0 0 8px rgba(46,123,255,.5))" }}
              />
            ))}
            {repsSegs.map((pts, i) => (
              <polyline
                key={`rs-${i}`}
                points={pts}
                fill="none"
                stroke={REPS}
                strokeWidth={2.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: "drop-shadow(0 0 8px rgba(34,211,238,.5))" }}
              />
            ))}

            {/* Dots */}
            {showSets
              ? points.map((p, i) =>
                  p.setsPct != null ? (
                    <circle
                      key={`sd-${i}`}
                      cx={xFor(i)}
                      cy={yFor(p.setsPct)}
                      r={2.8}
                      fill="#0A0B0D"
                      stroke={SETS}
                      strokeWidth={1.8}
                    />
                  ) : null,
                )
              : null}
            {showReps
              ? points.map((p, i) =>
                  p.repsPct != null ? (
                    <circle
                      key={`rd-${i}`}
                      cx={xFor(i)}
                      cy={yFor(p.repsPct)}
                      r={2.8}
                      fill="#0A0B0D"
                      stroke={REPS}
                      strokeWidth={1.8}
                    />
                  ) : null,
                )
              : null}

            {hovered != null && points[hovered] ? (
              <g>
                <line
                  x1={xFor(hovered)}
                  y1={pad.top}
                  x2={xFor(hovered)}
                  y2={baselineY}
                  stroke="rgba(255,255,255,.28)"
                />
                {showSets && points[hovered]!.setsPct != null ? (
                  <circle
                    cx={xFor(hovered)}
                    cy={yFor(points[hovered]!.setsPct!)}
                    r={5.5}
                    fill="#0A0B0D"
                    stroke={SETS}
                    strokeWidth={2.6}
                  />
                ) : null}
                {showReps && points[hovered]!.repsPct != null ? (
                  <circle
                    cx={xFor(hovered)}
                    cy={yFor(points[hovered]!.repsPct!)}
                    r={5.5}
                    fill="#0A0B0D"
                    stroke={REPS}
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
                  y={height - 12}
                  textAnchor="middle"
                  fill="#3D434D"
                  fontFamily="JetBrains Mono, monospace"
                  fontSize={9.5}
                >
                  {formatWeekLabel(p.weekStart, i)}
                </text>
              );
            })}

            {/* Hit targets */}
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
              {showSets ? (
                <div className={styles.hoverRow}>
                  <i className={styles.hoverDot} style={{ background: SETS }} />
                  <span className={styles.hoverKey}>Sets</span>
                  <span className={styles.hoverVal} style={{ color: SETS }}>
                    {hi.setsPct != null ? `${hi.setsPct}%` : "—"}
                  </span>
                  <span className={styles.hoverAbs}>
                    {hi.setsPrescribed > 0
                      ? `${hi.setsCompleted} of ${hi.setsPrescribed}`
                      : hi.sessions === 0
                        ? "not programmed"
                        : `${hi.setsCompleted} of ${hi.setsPrescribed}`}
                  </span>
                </div>
              ) : null}
              {showReps ? (
                <div className={styles.hoverRow}>
                  <i className={styles.hoverDot} style={{ background: REPS }} />
                  <span className={styles.hoverKey}>Reps</span>
                  <span className={styles.hoverVal} style={{ color: REPS }}>
                    {hi.repsPct != null ? `${hi.repsPct}%` : "—"}
                  </span>
                  <span className={styles.hoverAbs}>
                    {hi.repsPrescribed > 0
                      ? `${hi.repsMet} of ${hi.repsPrescribed}`
                      : hi.sessions === 0
                        ? "not programmed"
                        : `${hi.repsMet} of ${hi.repsPrescribed}`}
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
