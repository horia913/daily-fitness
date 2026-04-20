"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCoachClient } from "@/contexts/CoachClientContext";
import { WeekReviewModal } from "@/components/coach/WeekReviewModal";
import { Mail, Dumbbell, TrendingUp, Trophy, Heart, Smile } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import GlassCard from "@/components/ui/GlassCard";
import { attentionCardSurfaceStyle } from "@/lib/coachClientAttention";
import type { AttentionLevel } from "@/lib/coachClientAttention";
import { deltaTone, adherenceTierFromPercent } from "@/lib/coachWorkoutAdherence";
import { cn } from "@/lib/utils";

export type TodayWorkoutJson = {
  logId: string;
  workoutName: string;
  durationMinutes: number | null;
  totalSets: number | null;
  totalVolume: number | null;
  volumeDeltaKg: number | null;
  setsDelta: number | null;
  setsOnTarget: number;
  totalPrescribedSets: number;
  adherencePercent: number | null;
} | null;

export type NextScheduledJson = {
  dayName: string;
  workoutName: string;
} | null;

export type LatestCheckInJson = {
  date: string;
  sleepHours: number | null;
  stressLevel: number | null;
  sorenessLevel: number | null;
  sleepDelta: number | null;
  stressDelta: number | null;
  sorenessDelta: number | null;
} | null;

export type ProgramCardJson = {
  assignmentId: string;
  programId: string;
  name: string;
  currentWeek: number | null;
  durationWeeks: number | null;
  progressionMode: string | null;
  coachUnlockedWeek: number | null;
  weekReviewNeeded: boolean;
  reviewWeekNumber: number | null;
  behindOnWeeklyWorkouts: boolean;
  programProgressPercent: number | null;
} | null;

export type NutritionCardJson = {
  planName?: string;
  compliance7dPct: number | null;
  mealsLoggedToday: number;
} | null;

export type WeeklyReviewBucketJson = {
  weekStart: string;
  weekEnd: string;
  workouts: {
    completed: number;
    planned: number;
    workoutIds: string[];
  };
  volume: {
    totalKg: number;
  };
  prs: {
    count: number;
    items: Array<{
      exerciseId: string | null;
      exerciseName: string | null;
      weight: number | null;
      reps: number | null;
      achievedDate: string;
    }>;
  };
  checkIns: {
    daily: {
      submitted: number;
      total: number;
      avgMood: number | null;
      avgEnergy: number | null;
      avgSleep: number | null;
      avgStress: number | null;
    };
    scheduled: {
      submitted: boolean;
      submittedDate: string | null;
    };
  };
  bodyMetrics: {
    weight: number | null;
    bodyFat: number | null;
  };
};

export type WeeklyReviewJson = {
  clientId: string;
  clientTimezone: string;
  hasActiveAssignment: boolean;
  currentWeek: WeeklyReviewBucketJson;
  previousWeek: WeeklyReviewBucketJson;
} | null;

type Props = {
  clientId: string;
  name: string;
  email: string;
  attention: { level: AttentionLevel; reasons: string[] };
  trainedToday: boolean;
  todayWorkout: TodayWorkoutJson;
  nextScheduledWorkout: NextScheduledJson;
  latestCheckIn: LatestCheckInJson;
  program: ProgramCardJson;
  nutrition: NutritionCardJson;
  weeklyReview: WeeklyReviewJson;
};

function tierColor(tier: "green" | "amber" | "red" | null) {
  if (tier === "green") return "text-[color:var(--fc-status-success)]";
  if (tier === "amber") return "text-[color:var(--fc-status-warning)]";
  if (tier === "red") return "text-[color:var(--fc-status-error)]";
  return "text-[color:var(--fc-text-dim)]";
}

function fmtDelta(n: number | null, suffix = "", _lowerBetter = false): string {
  if (n === null || Number.isNaN(n)) return "";
  if (n === 0) return ` ±0${suffix}`;
  const sign = n > 0 ? "+" : "";
  return ` (${sign}${n}${suffix})`;
}

export default function CoachClientDailyReview({
  clientId,
  name,
  email,
  attention,
  trainedToday,
  todayWorkout,
  nextScheduledWorkout,
  latestCheckIn,
  program,
  nutrition,
  weeklyReview,
}: Props) {
  const { clientName } = useCoachClient();
  const { addToast } = useToast();
  const router = useRouter();
  const [reviewOpen, setReviewOpen] = useState(false);

  const attentionLine =
    attention.reasons.length > 0
      ? attention.reasons.slice(0, 2).join(" · ")
      : null;

  const adherenceTier = adherenceTierFromPercent(
    todayWorkout?.adherencePercent ?? null
  );

  const openEmail = () => {
    if (email) {
      window.open(`mailto:${email}`, "_blank");
    } else {
      addToast({ title: "No email on file", variant: "destructive" });
    }
  };

  const reviewWeek =
    program?.reviewWeekNumber ??
    program?.coachUnlockedWeek ??
    program?.currentWeek ??
    1;

  const formatRangeDate = (ymd: string): string => {
    const d = new Date(`${ymd}T12:00:00`);
    if (Number.isNaN(d.getTime())) return ymd;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatVolume = (kg: number): string => {
    if (!Number.isFinite(kg)) return "0 kg";
    if (Math.abs(kg) >= 1000) return `${(kg / 1000).toFixed(1)}t`;
    return `${Math.round(kg).toLocaleString()} kg`;
  };

  const deltaBadge = (
    current: number | null,
    previous: number | null,
    lowerBetter = false
  ): { text: string; className: string } | null => {
    if (current == null || previous == null) return null;
    const delta = current - previous;
    if (delta === 0) {
      return {
        text: "—",
        className:
          "border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-text-dim)]",
      };
    }
    const sign = delta > 0 ? "+" : "";
    const tone = deltaTone(delta, lowerBetter);
    if (tone === "green") {
      return {
        text: `${sign}${delta}`,
        className:
          "border border-[color-mix(in_srgb,var(--fc-status-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--fc-status-success)_12%,transparent)] text-[color:var(--fc-status-success)]",
      };
    }
    return {
      text: `${sign}${delta}`,
      className:
        "border border-[color-mix(in_srgb,var(--fc-status-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--fc-status-warning)_12%,transparent)] text-[color:var(--fc-status-warning)]",
    };
  };

  const currentWeek = weeklyReview?.currentWeek ?? null;
  const previousWeek = weeklyReview?.previousWeek ?? null;
  const hasPreviousWeekData = !!previousWeek && (
    previousWeek.workouts.completed > 0 ||
    previousWeek.workouts.planned > 0 ||
    previousWeek.volume.totalKg > 0 ||
    previousWeek.prs.count > 0 ||
    previousWeek.checkIns.daily.submitted > 0 ||
    previousWeek.checkIns.daily.avgMood != null ||
    previousWeek.checkIns.scheduled.submitted
  );
  const weekJustStarted = !!currentWeek && (
    currentWeek.workouts.completed === 0 &&
    currentWeek.workouts.planned === 0 &&
    currentWeek.volume.totalKg === 0 &&
    currentWeek.prs.count === 0 &&
    currentWeek.checkIns.daily.submitted === 0 &&
    !currentWeek.checkIns.scheduled.submitted &&
    currentWeek.checkIns.daily.avgMood == null
  );

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

  return (
    <div className="fc-page mx-auto flex min-w-0 w-full max-w-6xl flex-col gap-[var(--fc-gap-sections)] pb-8">
      <GlassCard elevation={2} className="fc-card-shell flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-center gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--fc-glass-border)] bg-[color-mix(in_srgb,var(--fc-accent)_14%,transparent)] text-sm font-bold text-[color:var(--fc-accent)]"
            aria-hidden
          >
            {initials}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight text-[color:var(--fc-text-primary)] sm:text-2xl">
              {name}
            </h1>
            {email ? (
              <p className="mt-0.5 truncate text-sm text-[color:var(--fc-text-dim)]">{email}</p>
            ) : (
              <p className="mt-0.5 text-sm text-[color:var(--fc-text-dim)]">No email on file</p>
            )}
          </div>
        </div>
        {trainedToday ? (
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--fc-status-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--fc-status-success)_12%,transparent)] px-3 py-1 text-xs font-medium text-[color:var(--fc-status-success)]">
            Trained today
          </span>
        ) : (
          <span className="inline-flex w-fit items-center rounded-full border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-soft)] px-3 py-1 text-xs font-medium text-[color:var(--fc-text-dim)]">
            No session logged today
          </span>
        )}
      </GlassCard>

      {attentionLine && (
        <GlassCard
          elevation={2}
          className="fc-card-shell !p-3 text-xs sm:!p-4 sm:text-sm"
          surfaceStyle={attentionCardSurfaceStyle(attention.level)}
        >
          <span className="line-clamp-3 text-[color:var(--fc-text-primary)]">{attentionLine}</span>
        </GlassCard>
      )}

      <GlassCard elevation={2} className="fc-card-shell space-y-4 p-4 sm:p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--fc-text-dim)]">
          Today
        </h2>
        {trainedToday && todayWorkout ? (
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[color:var(--fc-status-success)]" aria-hidden>
                ●
              </span>
              <span className="font-semibold text-[color:var(--fc-text-primary)]">{todayWorkout.workoutName}</span>
              <span className="text-xs text-[color:var(--fc-text-dim)]">
                {todayWorkout.durationMinutes != null ? `${todayWorkout.durationMinutes} min` : "—"}
                {todayWorkout.totalSets != null ? ` · ${todayWorkout.totalSets} sets` : ""}
              </span>
            </div>
            <div className="text-xs sm:text-sm">
              <span className="text-[color:var(--fc-text-dim)]">Volume: </span>
              <span className="text-[color:var(--fc-text-primary)] tabular-nums">
                {todayWorkout.totalVolume != null
                  ? `${Math.round(Number(todayWorkout.totalVolume)).toLocaleString()} kg`
                  : "—"}
              </span>
              {todayWorkout.volumeDeltaKg != null && (
                <span
                  className={cn(
                    "tabular-nums",
                    todayWorkout.volumeDeltaKg > 0
                      ? "text-[color:var(--fc-status-success)]"
                      : todayWorkout.volumeDeltaKg < 0
                        ? "text-[color:var(--fc-status-error)]"
                        : "text-[color:var(--fc-text-dim)]",
                  )}
                >
                  {todayWorkout.volumeDeltaKg > 0 ? " +" : " "}
                  {todayWorkout.volumeDeltaKg} kg
                </span>
              )}
            </div>
            {todayWorkout.adherencePercent != null && (
              <div className="text-xs sm:text-sm">
                <span className="text-[color:var(--fc-text-dim)]">Target: </span>
                <span className={cn("font-medium", tierColor(adherenceTier))}>
                  {Math.round(todayWorkout.adherencePercent)}% sets on target
                  {adherenceTier === "green"
                    ? " · On target"
                    : adherenceTier === "amber"
                      ? " · Close"
                      : " · Below target"}
                </span>
              </div>
            )}
            <Link
              href={`/coach/clients/${clientId}/workout-logs/${todayWorkout.logId}`}
              className="inline-flex text-xs font-medium text-[color:var(--fc-accent)] hover:underline"
            >
              View full log →
            </Link>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-[color:var(--fc-text-dim)]">
              <span className="text-[color:var(--fc-text-subtle)]" aria-hidden>
                ○
              </span>
              <span>No workout logged today</span>
            </div>
            {nextScheduledWorkout && (
              <p className="text-xs text-[color:var(--fc-text-dim)]">
                Next scheduled: <span className="text-[color:var(--fc-text-primary)]">{nextScheduledWorkout.dayName}</span>{" "}
                — {nextScheduledWorkout.workoutName}
              </p>
            )}
          </div>
        )}
      </GlassCard>

      <GlassCard elevation={2} className="fc-card-shell space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--fc-text-dim)]">
            This week
          </h2>
          {currentWeek ? (
            <p className="text-xs text-[color:var(--fc-text-dim)]">
              Mon {formatRangeDate(currentWeek.weekStart)} — Sun {formatRangeDate(currentWeek.weekEnd)}
            </p>
          ) : null}
        </div>
        {currentWeek ? (
          <>
            <div className="rounded-xl border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-soft)] p-4">
              {!weeklyReview?.hasActiveAssignment ? (
                <p className="text-xs text-[color:var(--fc-text-dim)]">
                  No active program — workout and volume stats stay at zero until you assign one.
                </p>
              ) : (
                <>
                  {weekJustStarted && (
                    <p className="mb-3 text-xs text-[color:var(--fc-text-dim)]">Week just started</p>
                  )}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {[
                      {
                        key: "workouts",
                        icon: <Dumbbell className="h-3.5 w-3.5 text-[color:var(--fc-accent)]" aria-hidden />,
                        value: `${currentWeek.workouts.completed}/${currentWeek.workouts.planned}`,
                        label: "Workouts",
                        delta: hasPreviousWeekData
                          ? deltaBadge(currentWeek.workouts.completed, previousWeek?.workouts.completed ?? null)
                          : null,
                        onClick: () => {
                          router.push(`/coach/clients/${clientId}/workout-logs`);
                        },
                        sub: null as string | null,
                      },
                      {
                        key: "volume",
                        icon: <TrendingUp className="h-3.5 w-3.5 text-[color:var(--fc-accent)]" aria-hidden />,
                        value: formatVolume(currentWeek.volume.totalKg),
                        label: "Volume",
                        delta: hasPreviousWeekData
                          ? deltaBadge(Math.round(currentWeek.volume.totalKg), Math.round(previousWeek?.volume.totalKg ?? 0))
                          : null,
                        onClick: () => {
                          router.push(`/coach/clients/${clientId}/stats`);
                        },
                        sub: null as string | null,
                      },
                      {
                        key: "prs",
                        icon: <Trophy className="h-3.5 w-3.5 text-[color:var(--fc-accent)]" aria-hidden />,
                        value: `${currentWeek.prs.count}`,
                        label: "PRs",
                        delta: hasPreviousWeekData
                          ? deltaBadge(currentWeek.prs.count, previousWeek?.prs.count ?? null)
                          : null,
                        onClick: () => {
                          router.push(`/coach/clients/${clientId}/stats`);
                        },
                        sub: null as string | null,
                      },
                      {
                        key: "checkins",
                        icon: <Heart className="h-3.5 w-3.5 text-[color:var(--fc-accent)]" aria-hidden />,
                        value: `${currentWeek.checkIns.daily.submitted}/7`,
                        label: "Check-ins",
                        delta: hasPreviousWeekData
                          ? deltaBadge(currentWeek.checkIns.daily.submitted, previousWeek?.checkIns.daily.submitted ?? null)
                          : null,
                        onClick: () => {
                          router.push(`/coach/clients/${clientId}/check-ins`);
                        },
                        sub: `Wkly: ${currentWeek.checkIns.scheduled.submitted ? "done" : "pending"}`,
                      },
                      ...(currentWeek.checkIns.daily.avgMood != null
                        ? [{
                            key: "mood",
                            icon: <Smile className="h-3.5 w-3.5 text-[color:var(--fc-accent)]" aria-hidden />,
                            value: `${Math.round(currentWeek.checkIns.daily.avgMood * 10) / 10}/10`,
                            label: "Avg mood",
                            delta: hasPreviousWeekData
                              ? deltaBadge(
                                  Math.round((currentWeek.checkIns.daily.avgMood ?? 0) * 10),
                                  previousWeek?.checkIns.daily.avgMood != null
                                    ? Math.round(previousWeek.checkIns.daily.avgMood * 10)
                                    : null
                                )
                              : null,
                            onClick: () => {
                              router.push(`/coach/clients/${clientId}/check-ins`);
                            },
                            sub: null as string | null,
                          }]
                        : []),
                    ].map((tile) => (
                      <button
                        key={tile.key}
                        type="button"
                        onClick={tile.onClick}
                        className="min-h-[96px] rounded-xl border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-surface-sunken)] p-3 text-left transition-colors hover:border-[color:var(--fc-accent)] hover:bg-[color:var(--fc-glass-highlight)]"
                      >
                        <div className="mb-2">{tile.icon}</div>
                        <p className="text-xl font-bold tabular-nums text-[color:var(--fc-text-primary)]">{tile.value}</p>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-[color:var(--fc-text-dim)]">
                          {tile.label}
                        </p>
                        {tile.sub ? (
                          <p className="mt-1 text-[10px] text-[color:var(--fc-text-dim)]">{tile.sub}</p>
                        ) : null}
                        {tile.delta ? (
                          <span className={`mt-1.5 inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium ${tile.delta.className}`}>
                            {tile.delta.text}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <p className="text-xs text-[color:var(--fc-text-dim)]">Weekly review unavailable</p>
        )}
      </GlassCard>

      <GlassCard elevation={2} className="fc-card-shell space-y-3 p-4 sm:p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--fc-text-dim)]">
          Latest check-in
        </h2>
        {latestCheckIn ? (
          <div className="space-y-1 text-xs sm:text-sm leading-relaxed text-[color:var(--fc-text-primary)]">
            <p>
              <span className="text-[color:var(--fc-text-dim)]">Sleep </span>
              <span className="font-medium tabular-nums">
                {latestCheckIn.sleepHours != null ? `${latestCheckIn.sleepHours}h` : "—"}
              </span>
              {latestCheckIn.sleepDelta != null && (
                <span
                  className={cn(
                    "tabular-nums",
                    latestCheckIn.sleepDelta >= 0
                      ? "text-[color:var(--fc-status-success)]"
                      : "text-[color:var(--fc-status-error)]",
                  )}
                >
                  {fmtDelta(latestCheckIn.sleepDelta, "h")}
                </span>
              )}
              <span className="text-[color:var(--fc-text-dim)]"> · Stress </span>
              <span className="font-medium tabular-nums">
                {latestCheckIn.stressLevel != null ? `${latestCheckIn.stressLevel}/10` : "—"}
              </span>
              {latestCheckIn.stressDelta != null && (
                <span
                  className={cn(
                    "tabular-nums",
                    deltaTone(latestCheckIn.stressDelta, true) === "green"
                      ? "text-[color:var(--fc-status-success)]"
                      : deltaTone(latestCheckIn.stressDelta, true) === "red"
                        ? "text-[color:var(--fc-status-error)]"
                        : "text-[color:var(--fc-text-dim)]",
                  )}
                >
                  {fmtDelta(latestCheckIn.stressDelta, "", true)}
                </span>
              )}
              <span className="text-[color:var(--fc-text-dim)]"> · Soreness </span>
              <span className="font-medium tabular-nums">
                {latestCheckIn.sorenessLevel != null
                  ? `${latestCheckIn.sorenessLevel}/10`
                  : "—"}
              </span>
              {latestCheckIn.sorenessDelta != null && (
                <span
                  className={cn(
                    "tabular-nums",
                    deltaTone(latestCheckIn.sorenessDelta, true) === "green"
                      ? "text-[color:var(--fc-status-success)]"
                      : deltaTone(latestCheckIn.sorenessDelta, true) === "red"
                        ? "text-[color:var(--fc-status-error)]"
                        : "text-[color:var(--fc-text-dim)]",
                  )}
                >
                  {fmtDelta(latestCheckIn.sorenessDelta, "", true)}
                </span>
              )}
            </p>
          </div>
        ) : (
          <p className="text-xs text-[color:var(--fc-text-dim)]">No check-in yet</p>
        )}
      </GlassCard>

      <GlassCard elevation={2} className="fc-card-shell space-y-3 p-4 sm:p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--fc-text-dim)]">
          Program
        </h2>
        {program ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate font-medium text-[color:var(--fc-text-primary)]">{program.name}</span>
              {program.currentWeek != null && program.durationWeeks != null && (
                <span className="shrink-0 text-xs text-[color:var(--fc-text-dim)]">
                  W{program.currentWeek}/{program.durationWeeks}
                </span>
              )}
            </div>
            {program.programProgressPercent != null && (
              <div className="h-2 w-full overflow-hidden rounded-full bg-[color:var(--fc-glass-border)]">
                <div
                  className="h-full rounded-full bg-[color:var(--fc-accent)]"
                  style={{ width: `${program.programProgressPercent}%` }}
                />
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="text-xs font-medium text-[color:var(--fc-accent)] hover:underline"
                onClick={() => setReviewOpen(true)}
              >
                Review week →
              </button>
              {program.behindOnWeeklyWorkouts ? (
                <span className="text-xs font-medium text-[color:var(--fc-status-warning)]">Behind schedule</span>
              ) : (
                <span className="text-xs font-medium text-[color:var(--fc-status-success)]">On track</span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-[color:var(--fc-text-dim)]">No active program</p>
        )}
      </GlassCard>

      <GlassCard elevation={2} className="fc-card-shell space-y-3 p-4 sm:p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--fc-text-dim)]">
          Nutrition
        </h2>
        {nutrition ? (
          <p className="text-xs sm:text-sm text-[color:var(--fc-text-primary)]">
            {nutrition.planName ? (
              <span className="font-medium text-[color:var(--fc-text-primary)]">{nutrition.planName}</span>
            ) : null}
            {nutrition.planName ? " · " : ""}
            {nutrition.compliance7dPct != null
              ? `${nutrition.compliance7dPct}% compliance (7d)`
              : "Compliance —"}
            {` · ${nutrition.mealsLoggedToday} meal${nutrition.mealsLoggedToday === 1 ? "" : "s"} logged today`}
          </p>
        ) : (
          <p className="text-xs text-[color:var(--fc-text-dim)]">No meal plan</p>
        )}
      </GlassCard>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="fc-btn fc-btn-secondary inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium"
          onClick={openEmail}
        >
          <Mail className="h-4 w-4" aria-hidden />
          Email client
        </button>
      </div>

      {program && (
        <WeekReviewModal
          isOpen={reviewOpen}
          onClose={() => setReviewOpen(false)}
          onComplete={() => setReviewOpen(false)}
          programAssignmentId={program.assignmentId}
          programId={program.programId}
          weekNumber={reviewWeek}
          clientName={clientName || name}
        />
      )}
    </div>
  );
}
