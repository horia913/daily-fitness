"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AthleteScoreRing } from "@/components/client-ui";
import { ScoreBreakdown, type ScoreBreakdownComponent } from "@/components/client-ui/ScoreBreakdown";
import { AthleteScoreExplainerModal } from "@/components/coach/AthleteScoreExplainerModal";
import { fetchApi } from "@/lib/apiClient";
import type { CoachAthleteScoreBundle } from "@/types/coachAthleteScore";
import {
  formatAthleteScoreWindowRange,
  tierColorForKey,
  tierLabelForKey,
} from "@/lib/coachAthleteScoreUi";
import { tierForAthleteScoreRow } from "@/lib/clientDashboardPageData";

function deltaOrNull(current: number | null, prior: number | null): number | undefined {
  if (current == null || prior == null) return undefined;
  return Math.round(current - prior);
}

async function fetchAthleteScoreBundle(
  clientId: string,
): Promise<CoachAthleteScoreBundle> {
  const res = await fetchApi(`/api/coach/clients/${clientId}/athlete-score`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error ?? `Failed to load score (${res.status})`);
  }
  return body as CoachAthleteScoreBundle;
}

export function CoachScoreBreakdownBlock({ clientId }: { clientId: string }) {
  const [explainerOpen, setExplainerOpen] = useState(false);

  const scoreQuery = useQuery({
    queryKey: ["coach-client", clientId, "athlete-score"],
    queryFn: () => fetchAthleteScoreBundle(clientId),
    enabled: !!clientId,
  });

  const loading = scoreQuery.isLoading;
  const error = scoreQuery.isError
    ? scoreQuery.error instanceof Error
      ? scoreQuery.error.message
      : "Failed to load athlete score"
    : null;
  const bundle = scoreQuery.data ?? null;

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

    const adherence = scoreRow.training_completion_score;
    const execution = scoreRow.training_execution_score;

    return [
      {
        label: "Adherence",
        value: adherence,
        delta: deltaOrNull(adherence, prior?.training_completion_score ?? null),
        hint: "Required program workouts completed in the rolling 14-day window",
      },
      {
        label: "Execution",
        value: execution,
        delta: deltaOrNull(execution, prior?.training_execution_score ?? null),
        hint:
          execution != null
            ? "Sets on target vs prescribed in the same rolling 14-day window"
            : "Shows after logged sets with prescription data",
      },
    ];
  }, [scoreRow, prior]);

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
            className="text-sm text-[color:var(--fc-accent)] hover:underline"
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
                <span className="text-muted-foreground">First score window on record</span>
              ) : weekDelta != null && weekDelta !== 0 ? (
                <span
                  className={
                    weekDelta > 0
                      ? "text-[color:var(--fc-status-success)]"
                      : "text-[color:var(--fc-status-error)]"
                  }
                >
                  {weekDelta > 0 ? `▲ +${weekDelta}` : `▼ ${weekDelta}`} vs prior window
                </span>
              ) : (
                <span className="text-muted-foreground">— same as prior window</span>
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
