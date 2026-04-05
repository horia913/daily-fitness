"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export interface ScoreBreakdownProps {
  programCompletion: number;
  dailyCheckins: number;
  nutrition?: number;
  nutritionConfigured?: boolean;
  /** Delta vs previous saved score row (same metrics). */
  trends?: {
    programCompletion: number;
    dailyCheckins: number;
    nutrition?: number;
  };
}

function safe(v: number | null | undefined) {
  return Math.min(100, Math.max(0, Number(v) || 0));
}

function TrendLine({ delta }: { delta: number }) {
  if (delta === 0) {
    return <span className="text-[10px] fc-text-dim">Flat vs last week</span>;
  }
  if (delta > 0) {
    return (
      <span className="text-[10px] text-emerald-500 dark:text-emerald-400">
        ↑ +{delta} from last week
      </span>
    );
  }
  return (
    <span className="text-[10px] text-amber-600 dark:text-amber-400">
      ↓ {Math.abs(delta)} from last week
    </span>
  );
}

export function ScoreBreakdown({
  programCompletion,
  dailyCheckins,
  nutrition = 0,
  nutritionConfigured = false,
  trends,
}: ScoreBreakdownProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const p = safe(programCompletion);
  const c = safe(dailyCheckins);
  const n = safe(nutrition);

  const items: {
    key: string;
    label: string;
    value: number;
    color: string;
    trend?: number;
  }[] = [
    {
      key: "program",
      label: "Program completion",
      value: p,
      color: "var(--fc-domain-workouts)",
      trend: trends?.programCompletion,
    },
    {
      key: "checkin",
      label: "Daily check-ins",
      value: c,
      color: "var(--fc-accent-cyan)",
      trend: trends?.dailyCheckins,
    },
  ];

  if (nutritionConfigured) {
    items.push({
      key: "nutrition",
      label: "Nutrition",
      value: n,
      color: "var(--fc-domain-meals)",
      trend: trends?.nutrition,
    });
  }

  return (
    <div className="w-full">
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

      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: isExpanded ? "420px" : "0",
          opacity: isExpanded ? 1 : 0,
        }}
      >
        <div className="divide-y divide-white/5 pt-2">
          {items.map((item) => (
            <div key={item.key} className="space-y-1 py-2.5 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium fc-text-primary">{item.label}</span>
                <span
                  className="text-lg font-bold tabular-nums shrink-0"
                  style={{ color: item.color }}
                >
                  {Math.round(item.value)}%
                </span>
              </div>
              {item.trend !== undefined && <TrendLine delta={item.trend} />}
              <div
                className="relative h-2 w-full rounded-full overflow-hidden"
                style={{ background: "var(--fc-surface-sunken)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.max(0, item.value))}%`,
                    background: item.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
