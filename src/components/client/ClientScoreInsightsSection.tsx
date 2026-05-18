"use client";

import React, { useEffect, useState } from "react";
import { AthleteScoreRing, SectionHeader } from "@/components/client-ui";
import {
  ScoreBreakdown,
  type ScoreBreakdownComponent,
} from "@/components/client-ui/ScoreBreakdown";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { AthleteScore } from "@/types/athleteScore";
import { tierForAthleteScoreRow } from "@/lib/clientDashboardPageData";

export interface ClientScoreInsightsSectionProps {
  userId: string | null;
  athleteScore: AthleteScore | null;
  scoreError: string | null;
}

function formatScoreWindowLabel(windowStart: string): string {
  const raw = windowStart?.trim() ?? "";
  if (raw.length < 10) return raw;
  const d = new Date(`${raw.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Athlete score ring + always-visible breakdown (used on `/client/progress`).
 */
export function ClientScoreInsightsSection({
  userId,
  athleteScore,
  scoreError,
}: ClientScoreInsightsSectionProps) {
  const [nutritionOn, setNutritionOn] = useState(false);
  const [hasActiveProgram, setHasActiveProgram] = useState<boolean | null>(null);
  const [paused, setPaused] = useState(false);
  const [trends, setTrends] = useState<
    { training: number; recovery: number; nutrition: number; extras: number } | undefined
  >(undefined);

  const hasScore = athleteScore != null;
  const betweenPrograms = hasActiveProgram === false && hasScore;

  useEffect(() => {
    if (!userId) {
      setHasActiveProgram(null);
      setPaused(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: activeAssignment, error } = await supabase
        .from("program_assignments")
        .select("pause_status")
        .eq("client_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error("[ClientScoreInsightsSection] active assignment:", error);
        setHasActiveProgram(null);
        setPaused(false);
        return;
      }
      setHasActiveProgram(activeAssignment != null);
      setPaused(activeAssignment?.pause_status === "paused");
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const [{ data: mpa }, { data: amp }] = await Promise.all([
        supabase
          .from("meal_plan_assignments")
          .select("id")
          .eq("client_id", userId)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle(),
        supabase.from("assigned_meal_plans").select("id").eq("client_id", userId).limit(1).maybeSingle(),
      ]);
      if (cancelled) return;
      setNutritionOn(!!(mpa ?? amp));
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const { data: rows } = await supabase
        .from("athlete_scores")
        .select(
          "training_score, recovery_score, nutrition_score, extras_score, calculated_at",
        )
        .eq("client_id", userId)
        .order("window_start", { ascending: false })
        .limit(2);
      if (cancelled) return;
      const r = rows ?? [];
      if (r.length >= 2) {
        const a = r[0] as Record<string, unknown>;
        const b = r[1] as Record<string, unknown>;
        const d = (k: string) => {
          const av = a[k];
          const bv = b[k];
          if (av == null || bv == null) return 0;
          return Math.round(Number(av) - Number(bv));
        };
        setTrends({
          training: d("training_score"),
          recovery: d("recovery_score"),
          nutrition: d("nutrition_score"),
          extras: d("extras_score"),
        });
      } else {
        setTrends(undefined);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, athleteScore?.calculated_at]);

  const nutritionConfigured = nutritionOn;

  const breakdown: ScoreBreakdownComponent[] = athleteScore
    ? [
        {
          label: "Training",
          value: athleteScore.training_score != null ? Math.round(athleteScore.training_score) : null,
          delta: trends?.training,
          subRows: [
            {
              label: "Completion",
              value:
                athleteScore.training_completion_score != null
                  ? Math.round(athleteScore.training_completion_score)
                  : null,
            },
            {
              label: "Execution",
              value:
                athleteScore.training_execution_score != null
                  ? Math.round(athleteScore.training_execution_score)
                  : null,
            },
          ],
        },
        {
          label: "Recovery",
          value: athleteScore.recovery_score != null ? Math.round(athleteScore.recovery_score) : null,
          delta: trends?.recovery,
          subRows: [
            {
              label: "Sleep",
              value:
                athleteScore.recovery_sleep_score != null
                  ? Math.round(athleteScore.recovery_sleep_score)
                  : null,
            },
            {
              label: "Steps",
              value:
                athleteScore.recovery_steps_score != null
                  ? Math.round(athleteScore.recovery_steps_score)
                  : null,
            },
          ],
        },
        {
          label: "Nutrition",
          value: nutritionConfigured ? Math.round(athleteScore.nutrition_score ?? 0) : 0,
          delta: nutritionConfigured ? trends?.nutrition : undefined,
          hint: nutritionConfigured ? undefined : "off",
        },
        {
          label: "Extras",
          value: Math.round(athleteScore.extras_score ?? 0),
          delta: trends?.extras,
          hint:
            (athleteScore.extras_score ?? 0) < 1
              ? "Log activities to boost your score."
              : undefined,
        },
      ]
    : [];

  return (
    <section className="mb-8 mt-2 border-t border-[var(--fc-glass-border)] pt-6">
      <SectionHeader title="Athlete score" titleTone="plain" className="!mb-4" />
      <div className="flex flex-col items-center py-2">
        <div className="mb-4 flex w-full max-w-[min(100%,20rem)] flex-col items-center justify-center overflow-visible px-1">
          {scoreError ? (
            <div className="flex w-full flex-col items-center">
              <AthleteScoreRing score={0} tier="benched" animated={false} size={200} />
              <AlertTriangle
                className="mb-2 mt-4 h-5 w-5 text-[var(--fc-status-error)]"
                aria-hidden
              />
              <p className="px-1 text-center text-sm fc-text-dim">{scoreError}</p>
            </div>
          ) : !hasScore ? (
            <div className="flex w-full flex-col items-center">
              <AthleteScoreRing placeholder score={null} tier={null} animated={false} size={200} />
              <p className="mt-4 max-w-[16rem] px-2 text-center text-sm leading-snug fc-text-dim">
                Your score will appear once you start a program.
              </p>
            </div>
          ) : (
            <>
              <div className="flex w-full justify-center overflow-visible">
                <AthleteScoreRing
                  score={athleteScore.score}
                  tier={tierForAthleteScoreRow(athleteScore)}
                  paused={paused}
                  animated
                  size={200}
                />
              </div>
              {betweenPrograms && athleteScore.window_start ? (
                <p className="mt-3 text-center text-xs fc-text-dim">
                  Between programs · last updated{" "}
                  {formatScoreWindowLabel(athleteScore.window_start)}
                </p>
              ) : null}
              <div className="mt-6 w-full min-w-0">
                <ScoreBreakdown components={breakdown} alwaysVisible />
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
