"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, ChevronUp } from "lucide-react";

export type ScoreBreakdownLabel = "Training" | "Recovery" | "Nutrition" | "Extras";

export type ScoreBreakdownComponent = {
  label: ScoreBreakdownLabel;
  value: number | null;
  delta?: number;
  hint?: string;
  /** Sub-rows when expanded (e.g. completion % / execution %). */
  subRows?: { label: string; value: number | null; hint?: string }[];
};

export interface ScoreBreakdownProps {
  components: ScoreBreakdownComponent[];
  /** When true, bars are always shown and the collapse toggle is omitted. */
  alwaysVisible?: boolean;
  /** Coach stats layout: always-visible └ sub-rows, ▲/▼ deltas. */
  coachLayout?: boolean;
}

function safeBarWidth(v: number | null) {
  if (v === null || !Number.isFinite(v)) return 0;
  return Math.min(100, Math.max(0, v));
}

function TrendLine({ delta }: { delta: number }) {
  if (delta === 0) {
    return <span className="text-[10px] fc-text-dim">Flat vs last week</span>;
  }
  if (delta > 0) {
    return (
      <span className="text-[10px]" style={{ color: "var(--fc-status-success)" }}>
        ↑ +{delta} from last week
      </span>
    );
  }
  return (
    <span className="text-[10px]" style={{ color: "var(--fc-status-warning)" }}>
      ↓ {Math.abs(delta)} from last week
    </span>
  );
}

const LABEL_COLORS: Record<ScoreBreakdownLabel, string> = {
  Training: "var(--fc-domain-workouts)",
  Recovery: "var(--fc-accent-cyan)",
  Nutrition: "var(--fc-domain-meals)",
  Extras: "#8B5CF6",
};

function CoachDelta({ delta }: { delta: number | undefined }) {
  if (delta === undefined || delta === null || !Number.isFinite(delta)) {
    return <span className="text-xs text-muted-foreground shrink-0">— same</span>;
  }
  if (delta === 0) {
    return <span className="text-xs text-muted-foreground shrink-0">— same</span>;
  }
  if (delta > 0) {
    return (
      <span className="text-xs shrink-0" style={{ color: "var(--fc-status-success)" }}>
        ▲ +{Math.round(delta)}
      </span>
    );
  }
  return (
    <span className="text-xs shrink-0" style={{ color: "var(--fc-status-error)" }}>
      ▼ {Math.round(delta)}
    </span>
  );
}

export function ScoreBreakdown({
  components,
  alwaysVisible = false,
  coachLayout = false,
}: ScoreBreakdownProps) {
  const [isExpanded, setIsExpanded] = useState(alwaysVisible);
  const [openSubs, setOpenSubs] = useState<Record<string, boolean>>({});

  const expanded = alwaysVisible || isExpanded;

  const toggleSub = (key: string) => {
    setOpenSubs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="w-full">
      {!alwaysVisible ? (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex w-full items-center justify-center gap-2 text-sm fc-text-dim hover:fc-text-primary transition-colors py-2"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Hide breakdown
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              View breakdown
            </>
          )}
        </button>
      ) : null}

      <div
        className={alwaysVisible ? "overflow-visible" : "overflow-hidden transition-all duration-300 ease-in-out"}
        style={
          alwaysVisible
            ? undefined
            : {
                maxHeight: expanded ? "720px" : "0",
                opacity: expanded ? 1 : 0,
              }
        }
      >
        <div className="divide-y divide-[var(--fc-glass-border)] pt-4 pb-2 mt-1">
          {components.map((item) => {
            const key = item.label;
            const color = LABEL_COLORS[item.label];
            const unavailable = item.value === null;
            const nutritionOff = item.label === "Nutrition" && item.value === 0 && item.hint === "off";
            const barW = nutritionOff ? 0 : safeBarWidth(item.value);
            const displayPct =
              unavailable || nutritionOff
                ? nutritionOff
                  ? "Off"
                  : "—"
                : `${Math.round(item.value ?? 0)}%`;

            const barFill = unavailable
              ? "var(--fc-surface-sunken)"
              : nutritionOff
                ? "color-mix(in srgb, var(--fc-domain-meals) 35%, var(--fc-surface-sunken))"
                : color;

            return (
              <div key={key} className="space-y-2 py-3.5 first:pt-2 last:pb-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium fc-text-primary">{item.label}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-lg font-bold tabular-nums ${unavailable ? "fc-text-dim" : ""}`}
                      style={{ color: unavailable || nutritionOff ? undefined : color }}
                    >
                      {displayPct}
                    </span>
                    {coachLayout && item.delta !== undefined ? (
                      <CoachDelta delta={item.delta} />
                    ) : null}
                  </div>
                </div>
                {item.hint && item.hint !== "off" ? (
                  <p className="text-[11px] fc-text-dim leading-snug">{item.hint}</p>
                ) : null}
                {!coachLayout && item.delta !== undefined && item.delta !== null ? (
                  <TrendLine delta={item.delta} />
                ) : null}
                <div
                  className="relative h-2 w-full rounded-full overflow-hidden"
                  style={{ background: "var(--fc-surface-sunken)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${barW}%`,
                      background: barFill,
                      opacity: unavailable ? 0.45 : 1,
                    }}
                  />
                </div>
                {item.subRows?.length ? (
                  coachLayout ? (
                    <ul className="mt-1 space-y-1 pl-2 text-[11px] fc-text-dim">
                      {item.subRows.map((s) => (
                        <li key={s.label} className="flex flex-wrap items-baseline gap-x-1">
                          <span className="fc-text-subtle">└ {s.label}:</span>
                          <span className="tabular-nums fc-text-primary">
                            {s.value === null ? "—" : `${Math.round(s.value)}%`}
                          </span>
                          {s.hint ? (
                            <span className="fc-text-subtle">({s.hint})</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => toggleSub(key)}
                        className="flex items-center gap-1 text-[11px] fc-text-dim hover:fc-text-primary"
                      >
                        {openSubs[key] ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                        {openSubs[key] ? "Hide" : "Show"} details
                      </button>
                      {openSubs[key] ? (
                        <ul className="mt-2 space-y-1 pl-1 text-[11px] fc-text-dim">
                          {item.subRows.map((s) => (
                            <li key={s.label} className="flex justify-between gap-2">
                              <span>{s.label}</span>
                              <span className="tabular-nums fc-text-primary">
                                {s.value === null ? "—" : `${Math.round(s.value)}%`}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  )
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
