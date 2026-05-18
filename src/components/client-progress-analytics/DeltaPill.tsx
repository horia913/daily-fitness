"use client";

import React from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import v6 from "./progressAnalyticsV6.module.css";
import { cn } from "@/lib/utils";

export type BodyGoalIntent = "bulk" | "cut" | "recomp" | "unknown";

export function DeltaPill({ pct }: { pct: number }) {
  const rounded = Math.round(pct * 10) / 10;
  const up = rounded > 0.5;
  const down = rounded < -0.5;
  const Icon = up ? ArrowUp : down ? ArrowDown : Minus;
  const label = `${up ? "+" : ""}${rounded}% vs last wk`;
  return (
    <span
      className={cn(v6.deltaPill)}
      style={
        up
          ? {
              background: "var(--good-soft)",
              color: "var(--good)",
            }
          : down
            ? {
                background: "var(--critical-soft)",
                color: "var(--critical)",
              }
            : {
                background: "rgba(255,255,255,0.04)",
                color: "var(--t4)",
              }
      }
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {label}
    </span>
  );
}

/** Weight change pill: tone follows goal intent when known; otherwise neutral near zero. */
export function WeightDeltaPill({
  kgDelta,
  intent = "unknown",
}: {
  kgDelta: number;
  intent?: BodyGoalIntent;
}) {
  const rounded = Math.round(kgDelta * 10) / 10;
  const up = rounded > 0.05;
  const down = rounded < -0.05;
  const flat = !up && !down;
  const Icon = up ? ArrowUp : down ? ArrowDown : Minus;
  const label = `${up ? "+" : ""}${rounded} kg`;

  let style: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    color: "var(--t4)",
  };
  if (!flat) {
    if (intent === "bulk") {
      style = up
        ? { background: "var(--good-soft)", color: "var(--good)" }
        : { background: "var(--warning-soft)", color: "var(--warning)" };
    } else if (intent === "cut") {
      style = down
        ? { background: "var(--good-soft)", color: "var(--good)" }
        : { background: "var(--warning-soft)", color: "var(--warning)" };
    } else if (intent === "recomp") {
      style = {
        background: "rgba(255,255,255,0.04)",
        color: "var(--t3)",
      };
    } else {
      style = up
        ? { background: "var(--warning-soft)", color: "var(--warning)" }
        : down
          ? { background: "var(--good-soft)", color: "var(--good)" }
          : { background: "rgba(255,255,255,0.04)", color: "var(--t4)" };
    }
  }

  return (
    <span className={cn(v6.deltaPill)} style={style}>
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {label}
    </span>
  );
}
