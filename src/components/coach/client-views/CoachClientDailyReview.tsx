"use client";

import React, { useState } from "react";
import { useCoachClient } from "@/contexts/CoachClientContext";
import { WeekReviewModal } from "@/components/coach/WeekReviewModal";
import { Mail, Check, Circle } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
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

type Props = {
  clientId: string;
  name: string;
  email: string;
  attention: { level: AttentionLevel; reasons: string[] };
  weeklyProgress: { current: number; goal: number };
  trainedToday: boolean;
  todayWorkout: TodayWorkoutJson;
  nextScheduledWorkout: NextScheduledJson;
  latestCheckIn: LatestCheckInJson;
  weekWorkoutDots: boolean[];
  program: ProgramCardJson;
  nutrition: NutritionCardJson;
};

function tierColor(tier: "green" | "amber" | "red" | null) {
  if (tier === "green") return "text-emerald-400";
  if (tier === "amber") return "text-amber-400";
  if (tier === "red") return "text-red-400";
  return "text-gray-400";
}

function fmtDelta(n: number | null, suffix = "", lowerBetter = false): string {
  if (n === null || Number.isNaN(n)) return "";
  if (n === 0) return " ±0" + suffix;
  const sign = n > 0 ? "+" : "";
  const tone = deltaTone(n, lowerBetter);
  const emoji = tone === "green" ? "🟢" : tone === "red" ? "🔴" : "⚪";
  return ` (${sign}${n}${suffix}) ${emoji}`;
}

export default function CoachClientDailyReview({
  clientId,
  name,
  email,
  attention,
  weeklyProgress,
  trainedToday,
  todayWorkout,
  nextScheduledWorkout,
  latestCheckIn,
  weekWorkoutDots,
  program,
  nutrition,
}: Props) {
  const { clientName } = useCoachClient();
  const { addToast } = useToast();
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

  return (
    <div
      className="mx-auto w-full max-w-lg fc-page flex flex-col min-w-0 gap-3 pb-6"
      style={{ gap: "var(--fc-gap-sections)" }}
    >
      {attentionLine && (
        <div
          className="rounded-lg border border-white/5 px-3 py-2 text-xs sm:text-sm"
          style={attentionCardSurfaceStyle(attention.level)}
        >
          <span className="fc-text-primary line-clamp-2">{attentionLine}</span>
        </div>
      )}

      <section className="border-t border-white/5 pt-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400/60 mb-2">
          Today
        </h2>
        {trainedToday && todayWorkout ? (
          <div className="space-y-1 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-emerald-400">✅</span>
              <span className="font-medium text-white">{todayWorkout.workoutName}</span>
              <span className="text-xs text-gray-400">
                {todayWorkout.durationMinutes != null ? `${todayWorkout.durationMinutes} min` : "—"}
                {todayWorkout.totalSets != null ? ` · ${todayWorkout.totalSets} sets` : ""}
              </span>
            </div>
            <div className="text-xs sm:text-sm">
              <span className="text-gray-400">Volume: </span>
              <span className="text-white">
                {todayWorkout.totalVolume != null
                  ? `${Math.round(Number(todayWorkout.totalVolume)).toLocaleString()} kg`
                  : "—"}
              </span>
              {todayWorkout.volumeDeltaKg != null && (
                <span
                  className={cn(
                    todayWorkout.volumeDeltaKg > 0
                      ? "text-emerald-400"
                      : todayWorkout.volumeDeltaKg < 0
                        ? "text-red-400"
                        : "text-gray-400"
                  )}
                >
                  {todayWorkout.volumeDeltaKg > 0 ? " +" : " "}
                  {todayWorkout.volumeDeltaKg} kg
                </span>
              )}
            </div>
            {todayWorkout.adherencePercent != null && (
              <div className="text-xs sm:text-sm">
                <span className="text-gray-400">Target: </span>
                <span className={tierColor(adherenceTier)}>
                  {Math.round(todayWorkout.adherencePercent)}% sets on target
                  {adherenceTier === "green"
                    ? " ✅"
                    : adherenceTier === "amber"
                      ? " ⚠️"
                      : " 🔴"}
                </span>
              </div>
            )}
            <button
              type="button"
              className="text-xs text-cyan-400 hover:underline text-left pt-1"
              onClick={() => {
                window.location.href = `/coach/clients/${clientId}/workout-logs/${todayWorkout.logId}`;
              }}
            >
              View full log →
            </button>
          </div>
        ) : (
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2 text-gray-400">
              <span className="text-gray-500">⚪</span>
              <span>No workout logged today</span>
            </div>
            {nextScheduledWorkout && (
              <p className="text-xs text-gray-500">
                Next scheduled: {nextScheduledWorkout.dayName} — {nextScheduledWorkout.workoutName}
              </p>
            )}
          </div>
        )}
      </section>

      <section className="border-t border-white/5 pt-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400/60">
            This week
          </h2>
          <span className="text-xs text-white tabular-nums">
            {weeklyProgress.current}/
            {weeklyProgress.goal > 0 ? weeklyProgress.goal : "—"} workouts
          </span>
        </div>
        <div className="flex justify-between gap-1 max-w-xs">
          {weekWorkoutDots.map((done, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
              {done ? (
                <Check className="w-3.5 h-3.5 text-cyan-400" aria-hidden />
              ) : (
                <Circle className="w-3.5 h-3.5 text-gray-600" aria-hidden />
              )}
              <span className="text-[9px] text-gray-500">
                {["M", "T", "W", "T", "F", "S", "S"][i]}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-white/5 pt-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400/60 mb-2">
          Check-in
        </h2>
        {latestCheckIn ? (
          <div className="text-xs sm:text-sm space-y-1 text-gray-300">
            <p>
              <span className="text-gray-400">Sleep </span>
              <span className="text-white">
                {latestCheckIn.sleepHours != null ? `${latestCheckIn.sleepHours}h` : "—"}
              </span>
              {latestCheckIn.sleepDelta != null && (
                <span
                  className={cn(
                    latestCheckIn.sleepDelta >= 0 ? "text-emerald-400" : "text-red-400"
                  )}
                >
                  {fmtDelta(latestCheckIn.sleepDelta, "h")}
                </span>
              )}
              <span className="text-gray-400"> · Stress </span>
              <span className="text-white">
                {latestCheckIn.stressLevel != null ? `${latestCheckIn.stressLevel}/10` : "—"}
              </span>
              {latestCheckIn.stressDelta != null && (
                <span
                  className={cn(
                    deltaTone(latestCheckIn.stressDelta, true) === "green"
                      ? "text-emerald-400"
                      : deltaTone(latestCheckIn.stressDelta, true) === "red"
                        ? "text-red-400"
                        : "text-gray-400"
                  )}
                >
                  {fmtDelta(latestCheckIn.stressDelta, "", true)}
                </span>
              )}
              <span className="text-gray-400"> · Soreness </span>
              <span className="text-white">
                {latestCheckIn.sorenessLevel != null
                  ? `${latestCheckIn.sorenessLevel}/10`
                  : "—"}
              </span>
              {latestCheckIn.sorenessDelta != null && (
                <span
                  className={cn(
                    deltaTone(latestCheckIn.sorenessDelta, true) === "green"
                      ? "text-emerald-400"
                      : deltaTone(latestCheckIn.sorenessDelta, true) === "red"
                        ? "text-red-400"
                        : "text-gray-400"
                  )}
                >
                  {fmtDelta(latestCheckIn.sorenessDelta, "", true)}
                </span>
              )}
            </p>
          </div>
        ) : (
          <p className="text-xs text-gray-500">No check-in yet</p>
        )}
      </section>

      <section className="border-t border-white/5 pt-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400/60 mb-2">
          Program
        </h2>
        {program ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-white font-medium truncate">{program.name}</span>
              {program.currentWeek != null && program.durationWeeks != null && (
                <span className="text-xs text-gray-400 shrink-0">
                  W{program.currentWeek}/{program.durationWeeks}
                </span>
              )}
            </div>
            {program.programProgressPercent != null && (
              <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400"
                  style={{ width: `${program.programProgressPercent}%` }}
                />
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {program.progressionMode === "coach_managed" && program.weekReviewNeeded ? (
                <button
                  type="button"
                  className="text-xs font-medium text-cyan-400 hover:underline"
                  onClick={() => setReviewOpen(true)}
                >
                  Review week →
                </button>
              ) : program.behindOnWeeklyWorkouts ? (
                <span className="text-xs text-amber-400">Behind schedule ⚠️</span>
              ) : (
                <span className="text-xs text-emerald-400">On track ✅</span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-500">No active program</p>
        )}
      </section>

      <section className="border-t border-white/5 pt-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400/60 mb-2">
          Nutrition
        </h2>
        {nutrition ? (
          <p className="text-xs sm:text-sm text-gray-300">
            {nutrition.planName ? (
              <span className="text-white font-medium">{nutrition.planName}</span>
            ) : null}
            {nutrition.planName ? " · " : ""}
            {nutrition.compliance7dPct != null
              ? `${nutrition.compliance7dPct}% compliance (7d)`
              : "Compliance —"}
            {` · ${nutrition.mealsLoggedToday} meal${nutrition.mealsLoggedToday === 1 ? "" : "s"} logged today`}
          </p>
        ) : (
          <p className="text-xs text-gray-500">No meal plan</p>
        )}
      </section>

      <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-cyan-400 hover:bg-white/5 min-h-[44px]"
          onClick={openEmail}
        >
          <Mail className="w-4 h-4" />
          Email
        </button>
      </div>

      {program && program.progressionMode === "coach_managed" && (
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
