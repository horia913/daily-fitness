"use client";

import React, { useEffect, useState } from "react";
import { AthleteScoreRing, SectionHeader } from "@/components/client-ui";
import {
  ScoreBreakdown,
  type ScoreBreakdownProps,
} from "@/components/client-ui/ScoreBreakdown";
import { BiggestWinCard } from "@/components/client/BiggestWinCard";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { isClientNutritionConfigured } from "@/lib/athleteScoreService";
import type { AthleteScore } from "@/types/athleteScore";
import { tierForAthleteScoreRow } from "@/lib/clientDashboardPageData";

export interface ClientScoreInsightsSectionProps {
  userId: string | null;
  athleteScore: AthleteScore | null;
  scoreError: string | null;
}

/**
 * Full athlete score + breakdown + biggest win (moved off `/client` per Cluster 7).
 * Minimal mount on `/client/me` — layout polish is deferred.
 */
export function ClientScoreInsightsSection({
  userId,
  athleteScore,
  scoreError,
}: ClientScoreInsightsSectionProps) {
  const [nutritionConfigured, setNutritionConfigured] = useState(false);
  const [breakdownTrends, setBreakdownTrends] = useState<
    ScoreBreakdownProps["trends"] | undefined
  >(undefined);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const nut = await isClientNutritionConfigured(userId, supabase);
      const { data: rows } = await supabase
        .from("athlete_scores")
        .select(
          "workout_completion_score, checkin_completion_score, nutrition_compliance_score, calculated_at",
        )
        .eq("client_id", userId)
        .order("calculated_at", { ascending: false })
        .limit(2);
      if (cancelled) return;
      setNutritionConfigured(nut);
      const r = rows ?? [];
      if (r.length >= 2) {
        const a = r[0] as {
          workout_completion_score?: number | null;
          checkin_completion_score?: number | null;
          nutrition_compliance_score?: number | null;
        };
        const b = r[1] as {
          workout_completion_score?: number | null;
          checkin_completion_score?: number | null;
          nutrition_compliance_score?: number | null;
        };
        setBreakdownTrends({
          programCompletion:
            (a.workout_completion_score ?? 0) - (b.workout_completion_score ?? 0),
          dailyCheckins:
            (a.checkin_completion_score ?? 0) - (b.checkin_completion_score ?? 0),
          nutrition: nut
            ? (a.nutrition_compliance_score ?? 0) -
              (b.nutrition_compliance_score ?? 0)
            : undefined,
        });
      } else {
        setBreakdownTrends(undefined);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, athleteScore?.calculated_at]);

  return (
    <section className="mb-8 mt-2 border-t border-[var(--fc-glass-border)] pt-6">
      <SectionHeader
        title="Athlete score"
        titleTone="plain"
        className="!mb-4"
      />
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
          ) : (
            <>
              <div className="flex w-full justify-center overflow-visible">
                <AthleteScoreRing
                  score={athleteScore?.score ?? null}
                  tier={
                    athleteScore != null
                      ? tierForAthleteScoreRow(athleteScore)
                      : null
                  }
                  animated
                  size={200}
                />
              </div>
              {athleteScore && (
                <div className="mt-6 w-full min-w-0">
                  <ScoreBreakdown
                    programCompletion={athleteScore.workout_completion_score}
                    dailyCheckins={athleteScore.checkin_completion_score}
                    nutrition={athleteScore.nutrition_compliance_score}
                    nutritionConfigured={nutritionConfigured}
                    trends={breakdownTrends}
                  />
                </div>
              )}
            </>
          )}
          <BiggestWinCard clientId={userId} />
        </div>
      </div>
    </section>
  );
}
