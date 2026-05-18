"use client";

import React from "react";
import { Star } from "lucide-react";
import v6 from "./progressAnalyticsV6.module.css";

function InsightBody({
  text,
  boldPhrases,
}: {
  text: string;
  boldPhrases: readonly string[];
}) {
  let nodes: React.ReactNode[] = [text];
  for (const phrase of boldPhrases) {
    nodes = nodes.flatMap((node, ni) => {
      if (typeof node !== "string") return [node];
      const parts = node.split(phrase);
      if (parts.length === 1) return [node];
      const out: React.ReactNode[] = [];
      parts.forEach((p, i) => {
        if (p) out.push(p);
        if (i < parts.length - 1) {
          out.push(
            <strong
              key={`${phrase}-${ni}-${i}`}
              className="font-semibold text-[var(--warning)]"
            >
              {phrase}
            </strong>,
          );
        }
      });
      return out;
    });
  }
  return (
    <p
      className="text-[12.5px] font-medium leading-[1.45] text-[var(--t1)]"
      style={{ fontFamily: "var(--font-geist-sans, Geist, sans-serif)" }}
    >
      {nodes}
    </p>
  );
}

export type RecoveryWeekBar = { weekStart: string; volume: number };

export function RecoveryInsightCard({
  notEnoughData,
  insightText,
  boldPhrases,
  chartData,
}: {
  notEnoughData: boolean;
  insightText: string | null;
  boldPhrases: readonly string[];
  chartData: RecoveryWeekBar[];
}) {
  return (
    <div className={v6.recoveryCard}>
      <div className="flex items-start gap-2.5">
        <div
          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px] text-[#1a1208]"
          style={{
            background: "linear-gradient(135deg, var(--warning), #E69E1F)",
            boxShadow: "0 4px 12px rgba(245, 194, 66, 0.25)",
          }}
        >
          <Star className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <div
            className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[var(--warning)]"
            style={{ fontFamily: 'var(--f-mono, "Geist Mono", monospace)' }}
          >
            Recovery insight
          </div>
          <div
            className="mt-0.5 text-[9.5px] text-[var(--t3)]"
            style={{ fontFamily: 'var(--f-mono, "Geist Mono", monospace)' }}
          >
            Training load vs recovery · 4 weeks
          </div>
        </div>
      </div>

      {notEnoughData || !insightText ? (
        <p
          className="text-[12px] text-[var(--t3)]"
          style={{ fontFamily: "var(--font-geist-sans, Geist, sans-serif)" }}
        >
          Not enough data yet — keep logging to see recovery insights.
        </p>
      ) : (
        <>
          <InsightBody text={insightText} boldPhrases={boldPhrases} />
          {chartData.length > 0 ? (
            <div className="mt-1 rounded-[10px] border border-[rgba(245,194,66,0.12)] bg-[rgba(0,0,0,0.2)] p-2">
              <div className="flex h-16 items-end justify-center gap-1.5 px-1">
                {(() => {
                  const maxV = Math.max(...chartData.map((w) => w.volume), 1);
                  return chartData.map((w) => {
                    const barPx = Math.max(6, Math.round((w.volume / maxV) * 56));
                    const label = new Date(w.weekStart + "T12:00:00").toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric" },
                    );
                    return (
                      <div
                        key={w.weekStart}
                        className="flex min-w-0 max-w-[52px] flex-1 flex-col items-center justify-end gap-1"
                      >
                        <div
                          className="w-full rounded-t-md"
                          style={{
                            height: barPx,
                            background:
                              "linear-gradient(180deg, var(--warning), rgba(245,194,66,0.35))",
                          }}
                        />
                        <span
                          className="text-[8px] text-[var(--t4)]"
                          style={{ fontFamily: 'var(--f-mono, "Geist Mono", monospace)' }}
                        >
                          {label}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
