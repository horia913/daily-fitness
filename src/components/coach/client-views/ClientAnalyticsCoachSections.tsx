"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  Target,
  TrendingUp,
  Flame,
  Scale,
  Calendar,
  ImageIcon,
  UtensilsCrossed,
} from "lucide-react";
import type { ClientAnalyticsData } from "@/lib/clientAnalyticsService";
import type { DailyWellnessLog } from "@/lib/wellnessService";
import { dbToUiScale } from "@/lib/wellnessService";
import sec from "@/components/coach/client-detail/coachClientDetailUi.module.css";
import WellnessTable, { type WellnessTableRow } from "@/components/coach/client-detail/WellnessTable";
import ComplianceCard from "@/components/coach/client-detail/ComplianceCard";

type Props = {
  clientId: string;
  data: ClientAnalyticsData;
  weekDays: string[];
  lastWeekDays: string[];
};

function avgSleep(logs: DailyWellnessLog[]): number | null {
  const withSleep = logs.filter((l) => l.sleep_hours != null);
  if (withSleep.length === 0) return null;
  return withSleep.reduce((s, l) => s + (l.sleep_hours ?? 0), 0) / withSleep.length;
}

function avgStress(logs: DailyWellnessLog[]): number | null {
  const withStress = logs.filter((l) => l.stress_level != null);
  if (withStress.length === 0) return null;
  const sum = withStress.reduce((s, l) => s + (dbToUiScale(l.stress_level) ?? 0), 0);
  return sum / withStress.length;
}

function avgSoreness(logs: DailyWellnessLog[]): number | null {
  const withSoreness = logs.filter((l) => l.soreness_level != null);
  if (withSoreness.length === 0) return null;
  const sum = withSoreness.reduce((s, l) => s + (dbToUiScale(l.soreness_level) ?? 0), 0);
  return sum / withSoreness.length;
}

function sleepTrend(recent: number | null, older: number | null): "stable" | "improving" | "declining" {
  if (recent == null || older == null || older === 0) return "stable";
  const change = ((recent - older) / older) * 100;
  if (change > 3) return "improving";
  if (change < -3) return "declining";
  return "stable";
}

function lowerIsBetterTrend(recent: number | null, older: number | null): "stable" | "improving" | "declining" {
  if (recent == null || older == null) return "stable";
  const change = recent - older;
  if (change < -0.2) return "improving";
  if (change > 0.2) return "declining";
  return "stable";
}

export default function ClientAnalyticsCoachSections({
  clientId,
  data,
  weekDays,
  lastWeekDays,
}: Props) {
  const { overview, goals, workout, body, wellness, photos, nutrition, habits } = data;

  const wellnessRows: WellnessTableRow[] = useMemo(() => {
    const logRange = wellness.logs as DailyWellnessLog[];
    const thisWeekLogs = logRange.filter((l) => weekDays.includes(l.log_date));
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const lastMonthStartStr = lastMonthStart.toISOString().split("T")[0]!;
    const lastMonthEndStr = lastMonthEnd.toISOString().split("T")[0]!;
    const lastMonthLogs = logRange.filter((l) => l.log_date >= lastMonthStartStr && l.log_date <= lastMonthEndStr);

    const twSleep = avgSleep(thisWeekLogs);
    const twStress = avgStress(thisWeekLogs);
    const twSore = avgSoreness(thisWeekLogs);
    const lmSleep = avgSleep(lastMonthLogs);
    const lmStress = avgStress(lastMonthLogs);
    const lmSore = avgSoreness(lastMonthLogs);

    const lastWeekLogs = logRange.filter((l) => lastWeekDays.includes(l.log_date));
    const lwSleep = avgSleep(lastWeekLogs);
    const lwStress = avgStress(lastWeekLogs);
    const lwSore = avgSoreness(lastWeekLogs);

    const sleepTr =
      twSleep != null && lmSleep != null
        ? sleepTrend(twSleep, lmSleep)
        : twSleep != null && lwSleep != null
          ? sleepTrend(twSleep, lwSleep)
          : "stable";
    const stressTr =
      twStress != null && lmStress != null
        ? lowerIsBetterTrend(twStress, lmStress)
        : twStress != null && lwStress != null
          ? lowerIsBetterTrend(twStress, lwStress)
          : "stable";
    const soreTr =
      twSore != null && lmSore != null
        ? lowerIsBetterTrend(twSore, lmSore)
        : twSore != null && lwSore != null
          ? lowerIsBetterTrend(twSore, lwSore)
          : "stable";

    const sleepHours = (v: number | null) => (v == null ? null : `${v.toFixed(1)} h`);
    const stressLabel = (v: number | null) => (v == null ? null : `${v.toFixed(1)}/10`);
    const soreLabel = (v: number | null) => (v == null ? null : `${v.toFixed(1)}/10`);

    const sleepCurTone: "default" | "warn" | "good" =
      twSleep != null && (twSleep < 6.5 || twSleep > 9) ? "warn" : "default";
    const sleepPrevTone: "default" | "warn" | "good" =
      lmSleep != null && (lmSleep < 6.5 || lmSleep > 9) ? "warn" : "default";
    const stressCurTone: "default" | "warn" | "good" =
      twStress != null ? (twStress <= 3 ? "good" : twStress >= 7 ? "warn" : "default") : "default";
    const stressPrevTone: "default" | "warn" | "good" =
      lmStress != null ? (lmStress <= 3 ? "good" : lmStress >= 7 ? "warn" : "default") : "default";
    const soreCurTone: "default" | "warn" | "good" =
      twSore != null && twSore >= 7 ? "warn" : "default";
    const sorePrevTone: "default" | "warn" | "good" =
      lmSore != null && lmSore >= 7 ? "warn" : "default";

    return [
      {
        metric: "Avg Sleep",
        current: sleepHours(twSleep),
        previous: sleepHours(lmSleep),
        trend: sleepTr,
        currentTone: sleepCurTone,
        previousTone: sleepPrevTone,
      },
      {
        metric: "Avg Stress",
        current: stressLabel(twStress),
        previous: stressLabel(lmStress),
        trend: stressTr,
        currentTone: stressCurTone,
        previousTone: stressPrevTone,
      },
      {
        metric: "Avg Soreness",
        current: soreLabel(twSore),
        previous: soreLabel(lmSore),
        trend: soreTr,
        currentTone: soreCurTone,
        previousTone: sorePrevTone,
      },
    ];
  }, [wellness.logs, weekDays, lastWeekDays]);

  const threeMo = new Date();
  threeMo.setMonth(threeMo.getMonth() - 3);
  const threeMoStr = threeMo.toISOString().split("T")[0]!;
  const checkInCount3mo = wellness.logs.filter(
    (l) =>
      l.log_date >= threeMoStr &&
      l.sleep_hours != null &&
      l.stress_level != null &&
      l.soreness_level != null
  ).length;

  const { volWeeks, maxVol, topIdx } = useMemo(() => {
    const weeks = workout.weeklyVolume.slice(-12);
    const max = Math.max(...weeks.map((w) => w.totalVolume), 1);
    const indexed = weeks.map((w, i) => ({ i, v: w.totalVolume }));
    indexed.sort((a, b) => b.v - a.v);
    const top = new Set(indexed.slice(0, 3).map((x) => x.i));
    return { volWeeks: weeks, maxVol: max, topIdx: top };
  }, [workout.weeklyVolume]);

  const priorityRank = (priority: string | null | undefined): number => {
    if (priority === "high") return 3;
    if (priority === "medium") return 2;
    if (priority === "low") return 1;
    return 0;
  };
  const topActiveGoals = [...goals.active]
    .sort((a, b) => {
      const p = priorityRank(b.priority) - priorityRank(a.priority);
      if (p !== 0) return p;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    })
    .slice(0, 2);

  const programPct = overview.programProgress?.pct ?? null;

  return (
    <div className="space-y-3">
      {/* Overview 6 tiles */}
      <section className={sec.section}>
        <h2 className={sec.sectionTitle}>Overview</h2>
        <div className={sec.tileGrid3}>
          <div className={sec.statTile}>
            <div className={`${sec.statTileIcon} bg-[color:var(--fc-set-type-straight-soft)] text-[color:var(--fc-set-type-straight)]`}>
              <Target className="w-3.5 h-3.5" strokeWidth={2} />
            </div>
            <div className={`${sec.statTileNum} ${sec.statTileNumCyan}`}>
              {overview.overallAdherencePct != null ? `${overview.overallAdherencePct}%` : "—"}
            </div>
            <div className={sec.statTileLabel}>Adherence</div>
          </div>
          <div className={sec.statTile}>
            <div className={`${sec.statTileIcon} bg-[color:var(--fc-meal-dinner-soft)] text-[color:var(--fc-meal-dinner)]`}>
              <TrendingUp className="w-3.5 h-3.5" strokeWidth={2} />
            </div>
            <div className={`${sec.statTileNum} ${sec.statTileNumPurple}`}>
              {overview.trainingVolumeThisWeek >= 1000 ? (
                <>
                  {(overview.trainingVolumeThisWeek / 1000).toFixed(1)}
                  <span className={sec.statSuffix}>t</span>
                </>
              ) : (
                Math.round(overview.trainingVolumeThisWeek)
              )}
            </div>
            <div className={sec.statTileLabel}>Vol week</div>
          </div>
          <div className={sec.statTile}>
            <div className={`${sec.statTileIcon} bg-[color:var(--fc-effort-medium-soft)] text-[color:var(--fc-effort-medium)]`}>
              <Flame className="w-3.5 h-3.5" strokeWidth={2} />
            </div>
            <div className={`${sec.statTileNum} ${sec.statTileNumWarn}`}>{overview.checkinStreak}</div>
            <div className={sec.statTileLabel}>Streak</div>
          </div>
          <div className={sec.statTile}>
            <div className={`${sec.statTileIcon} bg-[color:var(--fc-set-type-straight-soft)] text-[color:var(--fc-set-type-straight)]`}>
              <Scale className="w-3.5 h-3.5" strokeWidth={2} />
            </div>
            <div className={`${sec.statTileNum} ${sec.statTileNumCyan}`}>
              {body.measurements.length === 0 || overview.bodyCompositionTrend.deltaKg == null
                ? "—"
                : overview.bodyCompositionTrend.label}
            </div>
            <div className={sec.statTileLabel}>Body 30d</div>
          </div>
          <div className={sec.statTile}>
            <div className={`${sec.statTileIcon} bg-[color:var(--fc-accent-lime-soft)] text-[color:var(--fc-accent-lime-2)]`}>
              <TrendingUp className="w-3.5 h-3.5" strokeWidth={2} />
            </div>
            <div className={`${sec.statTileNum} ${sec.statTileNumLime}`}>
              {programPct != null ? `${programPct}%` : "—"}
            </div>
            <div className={sec.statTileLabel}>Program</div>
          </div>
          <div className={sec.statTile}>
            <div className={`${sec.statTileIcon} bg-[color:var(--fc-effort-medium-soft)] text-[color:var(--fc-effort-medium)]`}>
              <Calendar className="w-3.5 h-3.5" strokeWidth={2} />
            </div>
            <div className={sec.statTileNum}>
              {overview.daysActiveLast30}
              <span className={sec.statSuffix}>/30</span>
            </div>
            <div className={sec.statTileLabel}>Active 30d</div>
          </div>
        </div>
      </section>

      {/* Volume trend */}
      <section className={sec.section}>
        <div className={sec.sectionHead}>
          <h2 className={sec.sectionTitle}>Volume trend</h2>
          <span className={sec.sectionMeta}>12 weeks</span>
        </div>
        {volWeeks.length > 0 ? (
          <div className="rounded-[11px] border border-[color:var(--fc-divider)] bg-[color:var(--fc-glass-soft)] px-1 py-2">
            <div className="flex gap-[3px] items-end h-[90px]">
              {volWeeks.map((w, idx) => {
                const v = w.totalVolume;
                const innerMax = 72;
                const barPx = v <= 0 ? 4 : 4 + (v / maxVol) * innerMax;
                const showLabel = topIdx.has(idx) && v > 0;
                const label = v >= 1000 ? `${(v / 1000).toFixed(1)}t` : `${Math.round(v)}`;
                return (
                  <div key={w.weekStart} className="flex-1 flex flex-col items-center justify-end h-full gap-0.5 min-w-0">
                    {showLabel ? (
                      <span
                        className="text-[9px] leading-none text-[color:var(--fc-text-quaternary)]"
                        style={{ fontFamily: "var(--font-geist-mono, ui-monospace)" }}
                      >
                        {label}
                      </span>
                    ) : (
                      <span className="h-[10px] shrink-0" />
                    )}
                    <div
                      className="w-full rounded-t-[4px] rounded-b-[1px] min-h-[3px] max-h-[81px]"
                      style={{
                        height: `${Math.round(barPx)}px`,
                        background:
                          v > 0
                            ? "linear-gradient(180deg, var(--fc-set-type-straight), rgba(79, 227, 232, 0.4))"
                            : "rgba(255,255,255,0.04)",
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-sm text-[color:var(--fc-text-subtle)]">No volume data yet.</p>
        )}
        <div
          className="flex justify-between text-[9px] font-mono text-[color:var(--fc-text-quaternary)] px-0.5"
          style={{ fontFamily: "var(--font-geist-mono, ui-monospace)" }}
        >
          <span>
            {volWeeks[0]
              ? new Date(volWeeks[0]!.weekStart + "T12:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : "—"}
          </span>
          <span>
            {volWeeks[Math.floor((volWeeks.length - 1) / 2)]
              ? new Date(volWeeks[Math.floor((volWeeks.length - 1) / 2)]!.weekStart + "T12:00:00").toLocaleDateString(
                  "en-US",
                  { month: "short", day: "numeric" }
                )
              : "—"}
          </span>
          <span>
            {volWeeks[volWeeks.length - 1]
              ? new Date(volWeeks[volWeeks.length - 1]!.weekStart + "T12:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : "—"}
          </span>
        </div>
      </section>

      {/* Body composition */}
      <section className={sec.section}>
        <h2 className={sec.sectionTitle}>Body composition</h2>
        {body.measurements.length === 0 ? (
          <div className="flex items-center gap-3 p-3.5 rounded-xl border border-dashed border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-soft)]">
            <div className="w-8 h-8 rounded-[10px] bg-[color:var(--fc-glass-highlight)] grid place-items-center shrink-0">
              <Scale className="w-4 h-4 text-[color:var(--fc-text-subtle)]" />
            </div>
            <p className="text-[12.5px] font-medium text-[color:var(--fc-text-primary)] m-0">
              No body metrics recorded yet
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div>
              <h3 className="text-base font-medium fc-text-primary mb-2">Weight</h3>
              <div className="flex items-end gap-1 h-24">
                {(() => {
                  const slice = body.measurements.slice(0, 12).reverse();
                  const ws = slice.map((m) => m.weight_kg).filter((w): w is number => w != null && !Number.isNaN(w));
                  const wMin = ws.length ? Math.min(...ws) : 0;
                  const wMax = ws.length ? Math.max(...ws) : 1;
                  const span = Math.max(wMax - wMin, 1e-6);
                  return slice.map((m) => {
                    const h =
                      m.weight_kg != null ? Math.min(100, Math.max(4, ((m.weight_kg - wMin) / span) * 100)) : 4;
                    return (
                      <div key={m.id} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                        <div className="w-full fc-progress-track rounded-t relative flex-1 min-h-[32px] overflow-hidden">
                          <div
                            className="absolute bottom-0 w-full rounded-t bg-cyan-500/85"
                            style={{ height: `${h}%` }}
                          />
                        </div>
                        <span className="text-[10px] fc-text-dim">
                          {new Date(m.measured_date + "T12:00:00").toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
              {body.firstMeasurement && body.measurements[0] ? (
                <p className="text-sm fc-text-subtle mt-2">
                  Start: {body.firstMeasurement.weight_kg?.toFixed(1)} kg → Current:{" "}
                  {body.measurements[0]!.weight_kg?.toFixed(1)} kg
                  {body.weightGoal != null ? ` | Goal: ${body.weightGoal} kg` : ""}
                </p>
              ) : null}
            </div>
          </div>
        )}
        <div className="mt-3 p-3 rounded-xl border border-[color:var(--fc-divider)] bg-[color:var(--fc-glass-soft)]">
          <h4
            className="m-0 mb-1 text-[13px] font-semibold text-[color:var(--fc-text-primary)]"
            style={{ fontFamily: "var(--f-headline, var(--font-geist-sans))" }}
          >
            Progress photos
          </h4>
          {photos.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {photos.slice(0, 10).map((p) => (
                <div
                  key={p.date}
                  className="flex-shrink-0 w-24 h-24 rounded-xl bg-[color:var(--fc-glass-highlight)] overflow-hidden border border-[color:var(--fc-glass-border)] relative"
                >
                  {p.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.previewUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 fc-text-dim" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-[color:var(--fc-text-subtle)] m-0">No progress photos uploaded yet</p>
          )}
        </div>
      </section>

      {/* Wellness */}
      <section className={sec.section}>
        <h2 className={sec.sectionTitle}>Wellness & Recovery</h2>
        <h3
          className="m-0 text-[13px] font-semibold text-[color:var(--fc-text-primary)]"
          style={{ fontFamily: "var(--f-headline, var(--font-geist-sans))" }}
        >
          Wellness trends
        </h3>
        <WellnessTable rows={wellnessRows} />
        <div className="p-2.5 px-3 rounded-[11px] border border-[color:var(--fc-divider)] bg-[color:var(--fc-glass-soft)]">
          <p className="m-0 text-xs font-medium text-[color:var(--fc-text-primary)]" style={{ fontFamily: "var(--font-geist-sans)" }}>
            Check-in consistency (last 3 months)
          </p>
          <p
            className="m-0 mt-1 text-[10px] text-[color:var(--fc-text-subtle)]"
            style={{ fontFamily: "var(--font-geist-mono, ui-monospace)" }}
          >
            Total check-ins: {checkInCount3mo} | Current streak: {overview.checkinStreak} | Best streak:{" "}
            {overview.bestStreak}
          </p>
        </div>
      </section>

      {/* Nutrition compliance summary: card only when goals/plan (no fake 0%); CTA when neither */}
      {nutrition.hasGoalsOrPlan ? (
        <section className={sec.section}>
          <ComplianceCard pct={nutrition.adherencePct ?? 0} name="Client overview" label="Compliance" />
        </section>
      ) : (
        <section className={sec.section}>
          <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-[14px] border border-dashed border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-soft)]">
            <p className="text-[12.5px] font-medium text-[color:var(--fc-text-primary)] m-0">
              No nutrition goals set. Set targets to track compliance.
            </p>
            <button
              type="button"
              className="text-[11px] font-semibold text-[color:var(--fc-set-type-straight)] bg-transparent border-0 p-0 cursor-pointer shrink-0"
              onClick={() => {
                window.location.href = `/coach/clients/${clientId}/meals`;
              }}
            >
              Set goals
            </button>
          </div>
        </section>
      )}

      {/* Goals */}
      <section className={sec.section}>
        <div className={sec.sectionHead}>
          <h2 className={sec.sectionTitle}>Goals</h2>
          <span className={sec.pillActive}>
            {goals.active.length} active
          </span>
        </div>
        {goals.active.length === 0 ? (
          <div>
            <p className="text-xs text-[color:var(--fc-text-subtle)] m-0">No active goals</p>
            <Link
              href={`/coach/clients/${clientId}/progress?section=goals`}
              className="inline-block mt-1 text-[11px] font-semibold text-[color:var(--fc-set-type-straight)]"
            >
              View goals page →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {topActiveGoals.map((g) => (
              <div key={g.id} className="py-1">
                <div className="flex justify-between items-center text-sm mb-1 gap-3">
                  <span className="font-medium fc-text-primary truncate">{g.title}</span>
                  <span className="fc-text-subtle tabular-nums shrink-0">
                    {Math.round(Math.min(100, Math.max(0, g.progress_percentage ?? 0)))}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-[color:var(--fc-glass-highlight)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[color:var(--fc-accent-cyan)]"
                    style={{ width: `${Math.min(100, g.progress_percentage ?? 0)}%` }}
                  />
                </div>
              </div>
            ))}
            <Link
              href={`/coach/clients/${clientId}/progress?section=goals`}
              className="inline-block text-[11px] font-semibold text-[color:var(--fc-set-type-straight)] pt-1"
            >
              View all →
            </Link>
          </div>
        )}
      </section>

      {habits.hasHabits ? (
        <section className={sec.section}>
          <h2 className={sec.sectionTitle}>Habit Tracking</h2>
          <h3 className="text-[13px] font-semibold fc-text-primary m-0 mb-2">Completion rate (last 30 days)</h3>
          <ul className="space-y-2 list-none p-0 m-0">
            {habits.assignments.map((a) => {
              const comp = habits.completionByHabit[a.id];
              const pct = comp && comp.total > 0 ? Math.round((comp.completed / comp.total) * 100) : 0;
              return (
                <li
                  key={a.id}
                  className="flex justify-between items-center border-b border-[color:var(--fc-glass-border)] py-2 last:border-b-0"
                >
                  <span className="text-sm fc-text-primary">{a.name ?? "Habit"}</span>
                  <span className="text-sm fc-text-subtle">
                    {comp?.completed ?? 0} / {comp?.total ?? 30} ({pct}%) · Streak: {comp?.streak ?? 0}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
