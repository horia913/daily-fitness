"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCoachClient } from "@/contexts/CoachClientContext";
import { WeekReviewModal } from "@/components/coach/WeekReviewModal";
import {
  Dumbbell,
  TrendingUp,
  Trophy,
  Heart,
  Utensils,
  MessageCircle,
  SlidersHorizontal,
} from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import type { AttentionLevel } from "@/lib/coachClientAttention";
import { deltaTone, adherenceTierFromPercent } from "@/lib/coachWorkoutAdherence";
import { cn } from "@/lib/utils";
import ClientHeaderCard from "@/components/coach/client-detail/ClientHeaderCard";
import ov from "./CoachClientDailyReview.module.css";

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
  suppressWeeklyDeltas?: boolean;
  currentWeek: WeeklyReviewBucketJson;
  previousWeek: WeeklyReviewBucketJson;
} | null;

type Props = {
  clientId: string;
  name: string;
  email: string;
  phone?: string | null;
  attention: { level: AttentionLevel; reasons: string[] };
  streak: number;
  weeklyProgress: { current: number; goal: number };
  lastCheckinDate: string | null;
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

function formatRangeDate(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatVolume(kg: number): string {
  if (!Number.isFinite(kg)) return "0";
  if (Math.abs(kg) >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${Math.round(kg).toLocaleString()}`;
}

function daysBetweenYmd(fromYmd: string, toYmd: string): number | null {
  const a = new Date(`${fromYmd}T12:00:00Z`).getTime();
  const b = new Date(`${toYmd}T12:00:00Z`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.floor((b - a) / (86400 * 1000));
}

function checkinDeltaRow(
  delta: number | null,
  lowerBetter: boolean,
  suffix = ""
): { sym: string; text: string; color: string } {
  if (delta == null || Number.isNaN(delta)) {
    return { sym: "—", text: "", color: "var(--fc-text-quaternary)" };
  }
  if (delta === 0) {
    return { sym: "—", text: `0${suffix}`, color: "var(--fc-text-quaternary)" };
  }
  const tone = deltaTone(delta, lowerBetter);
  const sym = delta > 0 ? "▲" : "▼";
  const sign = delta > 0 ? "+" : "";
  if (tone === "green") {
    return { sym, text: `${sign}${delta}${suffix}`, color: "var(--fc-effort-easy)" };
  }
  if (tone === "red") {
    return { sym, text: `${sign}${delta}${suffix}`, color: "var(--fc-effort-max)" };
  }
  return { sym, text: `${sign}${delta}${suffix}`, color: "var(--fc-text-quaternary)" };
}

export default function CoachClientDailyReview({
  clientId,
  name,
  email,
  phone = null,
  attention,
  streak,
  weeklyProgress,
  lastCheckinDate,
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

  const adherencePct = useMemo(() => {
    const g = weeklyProgress.goal;
    if (!g || g <= 0) return null;
    return Math.round((weeklyProgress.current / g) * 100);
  }, [weeklyProgress.current, weeklyProgress.goal]);

  const alertCount = attention.reasons.length;

  const attentionDetail = useMemo(() => {
    const parts = attention.reasons.filter((r) => !r.startsWith("Flagged at-risk"));
    const tail = parts.length ? parts.join(" · ") : "review compliance";
    const checkInBit =
      lastCheckinDate && weeklyReview?.clientTimezone
        ? (() => {
            const today = new Date();
            const y = today.getFullYear();
            const m = String(today.getMonth() + 1).padStart(2, "0");
            const d = String(today.getDate()).padStart(2, "0");
            const todayStr = `${y}-${m}-${d}`;
            const diff = daysBetweenYmd(lastCheckinDate, todayStr);
            if (diff == null) return "";
            if (diff === 0) return " · last check-in today";
            return ` · last check-in ${diff}d ago`;
          })()
        : lastCheckinDate
          ? ""
          : " · no recent check-in";
    return `${tail}${checkInBit}`;
  }, [attention.reasons, lastCheckinDate, weeklyReview?.clientTimezone]);

  const flaggedForHeader =
    attention.level === "urgent" ||
    (adherencePct !== null && adherencePct < 40);

  const headerAlertSecondary =
    attention.reasons.length > 0
      ? attentionDetail
      : adherencePct != null
        ? `compliance · ${adherencePct}% weekly adherence${lastCheckinDate ? "" : " · no recent check-in"}`
        : "compliance · review client";

  const adherenceTier = adherenceTierFromPercent(todayWorkout?.adherencePercent ?? null);

  const openMessage = () => {
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

  const currentWeek = weeklyReview?.currentWeek ?? null;

  const weekJustStarted = !!currentWeek && (
    currentWeek.workouts.completed === 0 &&
    currentWeek.workouts.planned === 0 &&
    currentWeek.volume.totalKg === 0 &&
    currentWeek.prs.count === 0 &&
    currentWeek.checkIns.daily.submitted === 0 &&
    !currentWeek.checkIns.scheduled.submitted &&
    currentWeek.checkIns.daily.avgMood == null
  );

  const weekHeadline = (() => {
    if (!currentWeek) return "";
    if (weekJustStarted) return "Week just started";
    if (
      currentWeek.workouts.planned > 0 &&
      currentWeek.workouts.completed >= currentWeek.workouts.planned
    ) {
      return "Week complete";
    }
    return "Week in progress";
  })();

  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?";

  const todayMeta = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const latestCheckInMeta = latestCheckIn
    ? (() => {
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, "0");
        const d = String(today.getDate()).padStart(2, "0");
        const todayStr = `${y}-${m}-${d}`;
        const diff = daysBetweenYmd(latestCheckIn.date, todayStr);
        if (diff === 0) return "Today";
        if (diff != null) return `${diff}d ago`;
        return "";
      })()
    : "";

  const programProgressDisplay =
    program?.programProgressPercent != null
      ? program.programProgressPercent
      : program?.currentWeek != null &&
          program?.durationWeeks != null &&
          program.durationWeeks > 0
        ? Math.min(100, Math.round((program.currentWeek / program.durationWeeks) * 100))
        : null;

  const programStatusLabel = program
    ? program.behindOnWeeklyWorkouts
      ? "Behind"
      : programProgressDisplay != null && programProgressDisplay >= 95
        ? "Ahead"
        : "On track"
    : "";

  const nutritionEmpty =
    !nutrition?.planName &&
    (nutrition?.compliance7dPct == null || Number.isNaN(nutrition.compliance7dPct));

  return (
    <div className={ov.page}>
      <ClientHeaderCard
        clientId={clientId}
        name={name}
        email={email}
        initials={initials}
        adherencePct={adherencePct}
        streakDays={streak}
        alertCount={alertCount}
        trainedToday={trainedToday}
        attentionLevel={attention.level}
        attentionDetail={flaggedForHeader ? headerAlertSecondary : null}
        phone={phone}
        onMessage={openMessage}
      />

      {/* Today */}
      <section className={ov.section}>
        <div className={ov.sectionHead}>
          <span className={ov.eyebrow}>Today</span>
          <span className={ov.meta}>{todayMeta}</span>
        </div>
        {trainedToday && todayWorkout ? (
          <div className={ov.sessionRow} style={{ marginTop: 0, paddingTop: 0, borderTop: "none" }}>
            <div className={ov.sessionIcon} aria-hidden>
              <Dumbbell className="h-[13px] w-[13px]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-medium text-[color:var(--fc-text-primary)]">
                <b>{todayWorkout.workoutName}</b>
              </p>
              <p className="mt-1 font-mono text-[10px] text-[color:var(--fc-text-subtle)]">
                Today
                {todayWorkout.durationMinutes != null ? ` · ${todayWorkout.durationMinutes}min` : ""}
                {todayWorkout.totalSets != null ? ` · ${todayWorkout.totalSets} sets` : ""}
                {todayWorkout.totalVolume != null
                  ? ` · ${Math.round(Number(todayWorkout.totalVolume)).toLocaleString()} kg`
                  : ""}
              </p>
              {todayWorkout.adherencePercent != null && (
                <p className="mt-1 text-[11px]">
                  <span className="text-[color:var(--fc-text-subtle)]">Target: </span>
                  <span className={cn("font-medium", tierColor(adherenceTier))}>
                    {Math.round(todayWorkout.adherencePercent)}% sets on target
                  </span>
                </p>
              )}
              <Link
                href={`/coach/clients/${clientId}/workout-logs/${todayWorkout.logId}`}
                className="mt-2 inline-flex items-center gap-0.5 font-mono text-[10px] font-medium text-[color:var(--fc-set-type-straight)]"
              >
                Open
                <span aria-hidden>›</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className={ov.todayEmpty}>
            <div className={ov.todayEmptyIcon}>
              <Dumbbell className="h-4 w-4 text-[color:var(--fc-text-quaternary)]" aria-hidden />
            </div>
            <p className="text-[12.5px] font-medium text-[color:var(--fc-text-primary)]">
              No workout logged yet
            </p>
            {nextScheduledWorkout ? (
              <p className="mt-0.5 text-[11px] text-[color:var(--fc-text-subtle)]">
                Next scheduled ·{" "}
                <b style={{ color: "var(--fc-set-type-straight)" }}>{nextScheduledWorkout.dayName}</b>
                {" — "}
                {nextScheduledWorkout.workoutName}
              </p>
            ) : null}
          </div>
        )}
      </section>

      {/* This week */}
      <section className={ov.section}>
        <div className={ov.sectionHead}>
          <div>
            <span className={ov.eyebrow}>This week</span>
            <h2 className={cn(ov.sectionTitle, "mt-1")}>{weekHeadline}</h2>
          </div>
          {currentWeek ? (
            <span className={ov.meta}>
              {formatRangeDate(currentWeek.weekStart)} — {formatRangeDate(currentWeek.weekEnd)}
            </span>
          ) : null}
        </div>
        {currentWeek ? (
          !weeklyReview?.hasActiveAssignment ? (
            <p className="text-xs text-[color:var(--fc-text-subtle)]">
              No active program — stats stay at zero until you assign one.
            </p>
          ) : (
            <div className={ov.tileGrid4}>
              <button
                type="button"
                className={ov.tile}
                onClick={() => router.push(`/coach/clients/${clientId}/workout-logs`)}
              >
                <div
                  className={ov.tileIcon}
                  style={{
                    background: "var(--fc-set-type-straight-soft)",
                    color: "var(--fc-set-type-straight)",
                  }}
                >
                  <Dumbbell className="h-3 w-3" />
                </div>
                <div>
                  <span
                    className={cn(
                      ov.tileNum,
                      currentWeek.workouts.completed > 0 ? ov.tileNumAccentCyan : undefined,
                    )}
                    style={{ fontFamily: "var(--f-display, var(--font-geist-sans))" }}
                  >
                    {currentWeek.workouts.completed}/{currentWeek.workouts.planned}
                  </span>
                  <span className={ov.tileUnit}>sessions</span>
                </div>
                <div className={ov.tileLabel}>Workouts</div>
              </button>
              <button
                type="button"
                className={ov.tile}
                onClick={() => router.push(`/coach/clients/${clientId}/stats`)}
              >
                <div
                  className={ov.tileIcon}
                  style={{
                    background: "var(--fc-meal-dinner-soft)",
                    color: "var(--fc-meal-dinner)",
                  }}
                >
                  <TrendingUp className="h-3 w-3" />
                </div>
                <div>
                  <span
                    className={cn(
                      ov.tileNum,
                      currentWeek.volume.totalKg > 0 ? ov.tileNumAccentPurple : undefined,
                    )}
                    style={{ fontFamily: "var(--f-display, var(--font-geist-sans))" }}
                  >
                    {formatVolume(currentWeek.volume.totalKg)}
                  </span>
                  <span className={ov.tileUnit}>kg</span>
                </div>
                <div className={ov.tileLabel}>Volume</div>
              </button>
              <button
                type="button"
                className={ov.tile}
                onClick={() => router.push(`/coach/clients/${clientId}/stats`)}
              >
                <div
                  className={ov.tileIcon}
                  style={{
                    background: "var(--fc-effort-medium-soft)",
                    color: "var(--fc-effort-medium)",
                  }}
                >
                  <Trophy className="h-3 w-3" />
                </div>
                <div>
                  <span
                    className={cn(
                      ov.tileNum,
                      currentWeek.prs.count > 0 ? ov.tileNumAccentWarn : undefined,
                    )}
                    style={{ fontFamily: "var(--f-display, var(--font-geist-sans))" }}
                  >
                    {currentWeek.prs.count}
                  </span>
                </div>
                <div className={ov.tileLabel}>PRs</div>
              </button>
              <button
                type="button"
                className={ov.tile}
                onClick={() => router.push(`/coach/clients/${clientId}/progress`)}
              >
                <div
                  className={ov.tileIcon}
                  style={{
                    background: "var(--fc-accent-lime-soft)",
                    color: "var(--fc-accent-lime-2)",
                  }}
                >
                  <Heart className="h-3 w-3" />
                </div>
                <div>
                  <span
                    className={cn(
                      ov.tileNum,
                      currentWeek.checkIns.daily.submitted > 0 ? ov.tileNumAccentLime : undefined,
                    )}
                    style={{ fontFamily: "var(--f-display, var(--font-geist-sans))" }}
                  >
                    {currentWeek.checkIns.daily.submitted}/{currentWeek.checkIns.daily.total}
                  </span>
                </div>
                <div className={ov.tileLabel}>Check-ins</div>
              </button>
            </div>
          )
        ) : (
          <p className="text-xs text-[color:var(--fc-text-subtle)]">Weekly review unavailable</p>
        )}
      </section>

      {/* Latest check-in */}
      <section className={ov.section}>
        <div className={ov.sectionHead}>
          <span className={ov.eyebrow}>Latest check-in</span>
          {latestCheckIn ? <span className={ov.meta}>{latestCheckInMeta}</span> : null}
        </div>
        {latestCheckIn ? (
          <div className={ov.checkinStrip}>
            {(
              [
                {
                  key: "sleep",
                  label: "Sleep",
                  value: latestCheckIn.sleepHours,
                  unit: "h",
                  delta: latestCheckIn.sleepDelta,
                  lowerBetter: false,
                },
                {
                  key: "stress",
                  label: "Stress",
                  value: latestCheckIn.stressLevel,
                  unit: "/10",
                  delta: latestCheckIn.stressDelta,
                  lowerBetter: true,
                },
                {
                  key: "soreness",
                  label: "Soreness",
                  value: latestCheckIn.sorenessLevel,
                  unit: "/10",
                  delta: latestCheckIn.sorenessDelta,
                  lowerBetter: true,
                },
              ] as const
            ).map((col) => {
              const d = checkinDeltaRow(
                col.delta,
                col.lowerBetter,
                col.key === "sleep" ? "h" : ""
              );
              return (
                <div key={col.key} className={ov.checkinCell}>
                  <div className={ov.checkinLabel}>{col.label}</div>
                  <div className={ov.checkinValueRow}>
                    <span
                      className={ov.checkinValue}
                      style={{ fontFamily: "var(--f-display, var(--font-geist-sans))" }}
                    >
                      {col.value != null ? col.value : "—"}
                    </span>
                    {col.value != null ? (
                      <span className={ov.checkinUnit}>{col.unit}</span>
                    ) : null}
                  </div>
                  <div className={ov.checkinDelta} style={{ color: d.color }}>
                    {d.sym} {d.text}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-xs text-[color:var(--fc-text-subtle)]">
            No check-in yet · request one
          </p>
        )}
      </section>

      {/* Active program */}
      <section className={ov.section}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[color:var(--fc-set-type-straight)]">
            Active program
          </span>
          {program ? (
            <span
              className={cn(
                ov.statusPill,
                program.behindOnWeeklyWorkouts
                  ? ov.statusCrit
                  : programStatusLabel === "Ahead"
                    ? ov.statusCyan
                    : ov.statusGood,
              )}
            >
              {programStatusLabel}
            </span>
          ) : null}
        </div>
        {program ? (
          <>
            <div className="flex items-start justify-between gap-2">
              <h3
                className="max-w-[70%] truncate text-[14px] font-semibold text-[color:var(--fc-text-primary)]"
                style={{ fontFamily: "var(--f-headline, var(--font-geist-sans))" }}
              >
                {program.name}
              </h3>
              {program.currentWeek != null && program.durationWeeks != null ? (
                <span className="shrink-0 font-mono text-[10px] text-[color:var(--fc-text-quaternary)]">
                  W{program.currentWeek}/{program.durationWeeks}
                </span>
              ) : null}
            </div>
            {programProgressDisplay != null ? (
              <div className={ov.progBar}>
                <div className={ov.progFill} style={{ width: `${programProgressDisplay}%` }} />
              </div>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[color:var(--fc-text-subtle)]">
              <span>
                {programProgressDisplay != null ? `${programProgressDisplay}% complete` : ""}
              </span>
              <button
                type="button"
                onClick={() => setReviewOpen(true)}
                className="inline-flex items-center gap-0.5 font-medium text-[color:var(--fc-set-type-straight)]"
              >
                Review week
                <span aria-hidden className="text-[10px]">
                  →
                </span>
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-[color:var(--fc-text-subtle)]">
            No active program · Assign one
          </p>
        )}
      </section>

      {/* Nutrition */}
      <section className={ov.section}>
        <div className={ov.sectionHead}>
          <span className={cn(ov.eyebrow, ov.eyebrowGood)}>Nutrition</span>
        </div>
        {nutritionEmpty ? (
          <div className="flex flex-col gap-3">
            <span className={ov.pillMutedTag}>No plan</span>
            <div className={ov.todayEmpty}>
              <div
                className={ov.todayEmptyIcon}
                style={{
                  background: "var(--fc-effort-easy-soft)",
                  color: "var(--fc-effort-easy)",
                }}
              >
                <Utensils className="h-4 w-4" aria-hidden />
              </div>
              <p className="text-[12.5px] text-[color:var(--fc-text-primary)]">
                No meal plan assigned · Assign a plan or set macro targets
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {nutrition?.planName ? (
              <p className="text-sm font-medium text-[color:var(--fc-text-primary)]">{nutrition.planName}</p>
            ) : null}
            <p className="text-xs text-[color:var(--fc-text-subtle)]">
              {nutrition?.compliance7dPct != null
                ? `${nutrition.compliance7dPct}% compliance (7d)`
                : "Compliance —"}
              {` · ${nutrition?.mealsLoggedToday ?? 0} meal${
                nutrition?.mealsLoggedToday === 1 ? "" : "s"
              } logged today`}
            </p>
          </div>
        )}
      </section>

      <div className={ov.actionRow}>
        <button type="button" className={ov.btnOutline} onClick={openMessage}>
          <MessageCircle className="h-[13px] w-[13px]" aria-hidden />
          Message
        </button>
        <Link href={`/coach/clients/${clientId}/workouts`} className={ov.btnCyan}>
          <SlidersHorizontal className="h-[13px] w-[13px]" aria-hidden />
          Adjust plan
        </Link>
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
