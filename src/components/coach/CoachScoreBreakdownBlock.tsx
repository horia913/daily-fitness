"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AthleteScoreRing } from "@/components/client-ui";
import { ScoreBreakdown, type ScoreBreakdownComponent } from "@/components/client-ui/ScoreBreakdown";
import { AthleteScoreExplainerModal } from "@/components/coach/AthleteScoreExplainerModal";
import { fetchApi } from "@/lib/apiClient";
import type { CoachAthleteScoreBundle } from "@/types/coachAthleteScore";
import {
  formatAthleteScoreWindowRange,
  formatSteps,
  tierColorForKey,
  tierLabelForKey,
} from "@/lib/coachAthleteScoreUi";
import { tierForAthleteScoreRow } from "@/lib/clientDashboardPageData";

function deltaOrNull(current: number | null, prior: number | null): number | undefined {
  if (current == null || prior == null) return undefined;
  return Math.round(current - prior);
}

export function CoachScoreBreakdownBlock({ clientId }: { clientId: string }) {
  const [bundle, setBundle] = useState<CoachAthleteScoreBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [explainerOpen, setExplainerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchApi(`/api/coach/clients/${clientId}/athlete-score`);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error ?? `Failed to load score (${res.status})`);
        if (!cancelled) setBundle(body as CoachAthleteScoreBundle);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load athlete score");
          setBundle(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const scoreRow = bundle?.latest ?? null;
  const prior = bundle?.prior ?? null;
  const hasScore = scoreRow != null;
  const paused = bundle?.paused ?? false;

  const weekDelta =
    hasScore && prior
      ? Math.round(scoreRow.score - prior.score)
      : null;

  const components: ScoreBreakdownComponent[] = useMemo(() => {
    if (!scoreRow) return [];
    const sleepHint =
      bundle?.avgSleepHours != null
        ? `avg ${bundle.avgSleepHours.toFixed(1)}h / ${bundle.sleepTargetHours}h target`
        : "no sleep data this week";
    const stepsHint =
      bundle?.avgSteps != null
        ? `avg ${formatSteps(bundle.avgSteps)} / ${formatSteps(bundle.stepsTarget)} target`
        : "no steps data this week";

    return [
      {
        label: "Training",
        value: scoreRow.training_score,
        delta: deltaOrNull(scoreRow.training_score, prior?.training_score ?? null),
        subRows: [
          { label: "Completion", value: scoreRow.training_completion_score },
          { label: "Execution", value: scoreRow.training_execution_score },
        ],
      },
      {
        label: "Recovery",
        value: scoreRow.recovery_score,
        delta: deltaOrNull(scoreRow.recovery_score, prior?.recovery_score ?? null),
        subRows: [
          { label: "Sleep", value: scoreRow.recovery_sleep_score, hint: sleepHint },
          { label: "Steps", value: scoreRow.recovery_steps_score, hint: stepsHint },
        ],
      },
      {
        label: "Nutrition",
        value: scoreRow.nutrition_score,
        delta: deltaOrNull(scoreRow.nutrition_score, prior?.nutrition_score ?? null),
      },
      {
        label: "Extras",
        value: scoreRow.extras_score,
        delta: deltaOrNull(scoreRow.extras_score, prior?.extras_score ?? null),
      },
    ];
  }, [scoreRow, prior, bundle]);

  if (loading) {
    return (
      <div className="rounded-xl border bg-card p-8 animate-pulse h-64 mb-6" aria-hidden />
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border bg-card p-8 text-sm text-muted-foreground mb-6">{error}</div>
    );
  }

  if (!hasScore) {
    return (
      <div className="rounded-xl border bg-card p-8 mb-6 text-sm text-muted-foreground">
        No athlete score on file yet. Scores appear after the daily cron runs while the client has an
        active program with scheduled workouts.
      </div>
    );
  }

  const tierKey = tierForAthleteScoreRow(scoreRow);

  return (
    <>
      <section className="rounded-xl border bg-card p-8 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
          <h2 className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
            Athlete Score Breakdown
          </h2>
          <button
            type="button"
            onClick={() => setExplainerOpen(true)}
            className="text-sm text-[color:var(--fc-accent-cyan)] hover:underline"
          >
            How is this calculated?
          </button>
        </div>

        <div className="flex flex-wrap items-start gap-8">
          <AthleteScoreRing
            size={200}
            score={scoreRow.score}
            tier={tierKey}
            paused={paused}
            animated
          />
          <div className="min-w-0 flex-1 pt-2">
            <p className="text-3xl font-bold tabular-nums leading-none">
              {Math.round(scoreRow.score)}
              <span className="text-muted-foreground font-normal mx-2">·</span>
              <span style={{ color: tierColorForKey(tierKey) }}>{tierLabelForKey(tierKey)}</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {formatAthleteScoreWindowRange(scoreRow.window_start, scoreRow.window_end)}
            </p>
            <p className="mt-2 text-sm">
              {prior == null ? (
                <span className="text-muted-foreground">First week on record</span>
              ) : weekDelta != null && weekDelta !== 0 ? (
                <span
                  className={
                    weekDelta > 0
                      ? "text-[color:var(--fc-status-success)]"
                      : "text-[color:var(--fc-status-error)]"
                  }
                >
                  {weekDelta > 0 ? `▲ +${weekDelta}` : `▼ ${weekDelta}`} from last week
                </span>
              ) : (
                <span className="text-muted-foreground">— same as last week</span>
              )}
            </p>
          </div>
        </div>

        <ScoreBreakdown components={components} alwaysVisible coachLayout />
      </section>

      <AthleteScoreExplainerModal open={explainerOpen} onOpenChange={setExplainerOpen} />
    </>
  );
}
