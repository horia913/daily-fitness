"use client";

import React from "react";
import {
  Activity,
  ChevronDown,
  Dumbbell,
  Heart,
  Layers,
  Sparkles,
} from "lucide-react";
import type { ExerciseProgression, TrainedExercise } from "@/lib/strengthAnalytics";
import v6 from "./progressAnalyticsV6.module.css";
import { MiniOneRmLineChart } from "./MiniOneRmLineChart";
import { cn } from "@/lib/utils";

function fmtMmmD(isoDate: string): string {
  const d = new Date(isoDate.includes("T") ? isoDate : `${isoDate}T12:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type Variant = "strength" | "compound" | "cardio" | "isolation" | "mobility";

function exerciseVariant(name: string): Variant {
  const n = name.toLowerCase();
  if (/run|cycle|bike|walk|jog|rower|ski|swim|cardio/.test(n)) return "cardio";
  if (/stretch|mobil|yoga|foam|roll/.test(n)) return "mobility";
  if (/curl|extension|fly|raise|pushdown|pressdown|lateral|shrug|rope|kickback/.test(n))
    return "isolation";
  if (/bench|squat|dead|press|pull.?up|chin|row|lunge|hip thrust|clean|snatch|rdl|good morning/.test(n))
    return "compound";
  return "strength";
}

function variantStyles(v: Variant): { box: string; Icon: typeof Dumbbell } {
  switch (v) {
    case "cardio":
      return {
        box: "bg-[rgba(163,230,53,0.12)] text-[var(--fc-accent)] border border-[rgba(163,230,53,0.22)]",
        Icon: Activity,
      };
    case "mobility":
      return {
        box: "bg-[rgba(244,114,182,0.1)] text-[#f472b6] border border-[rgba(244,114,182,0.22)]",
        Icon: Heart,
      };
    case "isolation":
      return {
        box: "bg-[rgba(245,194,66,0.1)] text-[var(--warning)] border border-[rgba(245,194,66,0.2)]",
        Icon: Layers,
      };
    case "compound":
      return {
        box: "bg-[rgba(168,85,247,0.12)] text-[var(--purple)] border border-[rgba(168,85,247,0.22)]",
        Icon: Sparkles,
      };
    default:
      return {
        box: "bg-[color:var(--fc-group-c-soft)] text-[var(--fc-accent)] border border-[var(--fc-accent-glow)]",
        Icon: Dumbbell,
      };
  }
}

export function ExerciseAccordionRow({
  exercise,
  expanded,
  onToggle,
  progression,
  loading,
}: {
  exercise: TrainedExercise;
  expanded: boolean;
  onToggle: () => void;
  progression: ExerciseProgression | null;
  loading: boolean;
}) {
  const v = exerciseVariant(exercise.name);
  const { box, Icon } = variantStyles(v);
  const lastStr = exercise.lastTrained ? fmtMmmD(exercise.lastTrained) : "—";
  const pct =
    progression && progression.progressPercent != null
      ? progression.progressPercent
      : null;
  const sinceLabel =
    pct != null && Math.abs(pct) >= 0.05 ? `${pct > 0 ? "+" : ""}${Math.round(pct)}%` : "—";

  return (
    <div className={cn(v6.accordion, expanded && v6.accordionOpen)}>
      <button
        type="button"
        className="flex w-full items-center gap-[9px] px-3 py-[11px] text-left"
        onClick={onToggle}
      >
        <div
          className={cn(
            "flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px]",
            box,
          )}
        >
          <Icon className="h-[13px] w-[13px]" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "font-semibold text-[12.5px] text-[var(--t1)]",
              v6.nameWrap,
            )}
            style={{ fontFamily: "var(--font-geist-sans, Geist, sans-serif)" }}
          >
            {exercise.name}
          </div>
          <div
            className="mt-0.5 text-[9.5px] text-[var(--t3)]"
            style={{
              fontFamily: 'var(--f-mono, "Geist Mono", monospace)',
              letterSpacing: "0.04em",
            }}
          >
            <span className="font-semibold text-[var(--t2)]">{exercise.sessionCount}</span>{" "}
            sessions · last {lastStr}
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-3 w-3 shrink-0 text-[var(--t4)] transition-transform",
            expanded && "rotate-180 text-[var(--fc-accent)]",
          )}
          aria-hidden
        />
      </button>
      {expanded ? (
        <div className="border-t border-[var(--line-2)] px-3 pb-[11px] pt-[11px]">
          {loading ? (
            <div className="flex justify-center py-6">
              <div
                className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--fc-accent)] border-t-transparent"
                aria-hidden
              />
            </div>
          ) : progression && progression.dataPoints.length >= 2 ? (
            <>
              <div className="flex items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <div
                    className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--t3)]"
                    style={{ fontFamily: 'var(--f-mono, "Geist Mono", monospace)' }}
                  >
                    Est. 1RM
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span
                      className="text-[24px] font-bold leading-none text-[var(--t1)]"
                      style={{
                        fontFamily:
                          'var(--f-display), var(--font-geist-sans, Geist), sans-serif',
                      }}
                    >
                      {progression.currentOneRM}
                    </span>
                    <span className="text-[13px] text-[var(--t3)]">kg</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div
                    className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--t3)]"
                    style={{ fontFamily: 'var(--f-mono, "Geist Mono", monospace)' }}
                  >
                    Progress
                  </div>
                  <span
                    className="text-[18px] font-bold leading-none text-[var(--fc-accent)]"
                    style={{
                      fontFamily:
                        'var(--f-display), var(--font-geist-sans, Geist), sans-serif',
                    }}
                  >
                    {sinceLabel}
                  </span>
                </div>
              </div>
              <div className="mt-2">
                <MiniOneRmLineChart dataPoints={progression.dataPoints} />
              </div>
            </>
          ) : (
            <p
              className="py-4 text-center text-[12px] text-[var(--t3)]"
              style={{ fontFamily: "var(--font-geist-sans, Geist, sans-serif)" }}
            >
              Need at least 2 sessions to show chart.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
