"use client";

import React from "react";
import { Calendar, Target, Dumbbell, TrendingUp } from "lucide-react";
import v6 from "./progressAnalyticsV6.module.css";
import { cn } from "@/lib/utils";

function IconBadge({
  children,
  colorVar,
  bgSoft,
}: {
  children: React.ReactNode;
  colorVar: string;
  bgSoft: string;
}) {
  return (
    <span
      className={v6.iconBadge}
      style={{
        background: bgSoft,
        color: colorVar,
      }}
    >
      {children}
    </span>
  );
}

export function TopStatsPaired({
  weeksLabel,
  workoutsLoggedInRange,
  goalPct,
  goalsCompleted,
  goalsTotal,
  latestWeightKg,
  bodyFatPct,
  exercisesTracked,
}: {
  weeksLabel: string;
  workoutsLoggedInRange: number;
  goalPct: number;
  goalsCompleted: number;
  goalsTotal: number;
  latestWeightKg: number | null;
  bodyFatPct: number | null;
  exercisesTracked: number;
}) {
  const goalColor =
    goalPct >= 100
      ? "var(--good)"
      : goalPct > 0
        ? "var(--fc-accent)"
        : "var(--t4)";

  const bodyFatOk =
    bodyFatPct != null && Number.isFinite(bodyFatPct) && bodyFatPct > 0;

  return (
    <div className={v6.statsGrid}>
      <div className={v6.statPair}>
        <div className={v6.iconRow}>
          <IconBadge colorVar="var(--fc-accent)" bgSoft="var(--fc-accent-dim)">
            <Calendar className="h-3 w-3" strokeWidth={2.2} aria-hidden />
          </IconBadge>
          <span className={v6.eyebrowMono}>{weeksLabel}</span>
        </div>
        <div className={v6.statNum} style={{ color: "var(--fc-accent)" }}>
          {workoutsLoggedInRange}
        </div>
        <div className={v6.statSub}>workouts logged</div>
      </div>

      <div className={v6.statPair}>
        <div className={v6.iconRow}>
          <IconBadge colorVar="var(--fc-accent)" bgSoft="var(--fc-accent-dim)">
            <Target className="h-3 w-3" strokeWidth={2.2} aria-hidden />
          </IconBadge>
          <span className={v6.eyebrowMono}>Goals</span>
        </div>
        <div className={v6.statNum} style={{ color: goalColor }}>
          {goalPct}%
        </div>
        <div className={v6.statSub}>
          {goalsCompleted} of {goalsTotal} completed
        </div>
      </div>

      <div className={v6.statPair}>
        <div className={v6.iconRow}>
          <IconBadge colorVar="var(--warning)" bgSoft="var(--warning-soft)">
            <Dumbbell className="h-3 w-3" strokeWidth={2.2} aria-hidden />
          </IconBadge>
          <span className={v6.eyebrowMono}>Latest</span>
        </div>
        <div className={v6.statNum}>
          {latestWeightKg != null ? `${Math.round(latestWeightKg * 10) / 10} kg` : "—"}
        </div>
        <div className={cn(v6.statSub, !bodyFatOk && "italic")}>
          {bodyFatOk ? (
            <span style={{ color: "var(--t3)" }}>
              {Math.round(bodyFatPct! * 10) / 10}% body fat
            </span>
          ) : (
            <span style={{ color: "var(--t4)" }}>
              — body fat (not tracked)
            </span>
          )}
        </div>
      </div>

      <div className={v6.statPair}>
        <div className={v6.iconRow}>
          <IconBadge colorVar="var(--purple)" bgSoft="var(--purple-soft)">
            <TrendingUp className="h-3 w-3" strokeWidth={2.2} aria-hidden />
          </IconBadge>
          <span className={v6.eyebrowMono}>Strength</span>
        </div>
        <div className={v6.statNum}>{exercisesTracked}</div>
        <div className={v6.statSub}>exercises tracked</div>
      </div>
    </div>
  );
}
