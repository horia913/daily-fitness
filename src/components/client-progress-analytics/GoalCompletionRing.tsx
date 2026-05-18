"use client";

import React from "react";

export function GoalCompletionRing({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const r = 28;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  const gap = c - dash;
  let stroke = "var(--t4)";
  if (pct >= 100) stroke = "var(--lime)";
  else if (pct > 0) stroke = "var(--cyan)";

  return (
    <div className="flex items-center gap-3">
      <div className="relative h-16 w-16 shrink-0">
        <svg className="-rotate-90" width={64} height={64} viewBox="0 0 64 64" aria-hidden>
          <circle
            cx={32}
            cy={32}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={6}
          />
          <circle
            cx={32}
            cy={32}
            r={r}
            fill="none"
            stroke={stroke}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${gap}`}
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center text-[16px] font-bold"
          style={{
            fontFamily:
              '"Big Shoulders Display", var(--font-geist-sans, Geist), sans-serif',
            color: stroke,
          }}
        >
          {pct}%
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div
          className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--t3)]"
          style={{ fontFamily: 'var(--f-mono, "Geist Mono", monospace)' }}
        >
          Progress
        </div>
        <p
          className="mt-0.5 text-[13px] font-semibold leading-snug text-[var(--t1)]"
          style={{
            fontFamily: '"Bricolage Grotesque", var(--font-geist-sans, Geist), sans-serif',
          }}
        >
          {completed} of {total} goals completed
        </p>
        {total === 0 ? (
          <p
            className="mt-1 text-[10px] text-[var(--t3)]"
            style={{ fontFamily: 'var(--f-mono, "Geist Mono", monospace)' }}
          >
            Set targets in your profile
          </p>
        ) : null}
      </div>
    </div>
  );
}
