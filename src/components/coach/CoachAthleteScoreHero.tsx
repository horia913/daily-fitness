"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { AthleteScoreRing } from "@/components/client-ui";
import { fetchApi } from "@/lib/apiClient";
import type { CoachAthleteScoreBundle } from "@/types/coachAthleteScore";
import {
  formatAthleteScoreWindowRange,
  tierColorForKey,
  tierLabelForKey,
} from "@/lib/coachAthleteScoreUi";
import { tierForAthleteScoreRow } from "@/lib/clientDashboardPageData";

function ScorePill({ label, value, hint }: { label: string; value: number | null; hint?: string }) {
  const missing = value == null;
  return (
    <div
      className={`flex-1 min-w-[4.5rem] rounded-lg bg-muted/40 px-4 py-3 ${missing ? "opacity-50" : ""}`}
    >
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums ${missing ? "italic text-muted-foreground" : ""}`}
      >
        {missing ? "—" : Math.round(value)}
      </p>
      {hint ? <p className="mt-1 text-[10px] text-muted-foreground leading-snug">{hint}</p> : null}
    </div>
  );
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

export function CoachAthleteScoreHero({
  clientId,
  onOpenBreakdown,
}: {
  clientId: string;
  onOpenBreakdown?: () => void;
}) {
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

  if (loading) {
    return (
      <div className="mb-6 rounded-xl border bg-card p-6 animate-pulse h-48" aria-hidden />
    );
  }

  if (error) {
    return (
      <div className="mb-6 rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        {error}
      </div>
    );
  }

  const scoreRow = bundle?.latest ?? null;
  const hasScore = scoreRow != null;
  const paused = bundle?.paused ?? false;
  const noProgram = !bundle?.hasActiveProgram;
  const showPlaceholder = !hasScore;
  const tierKey = scoreRow ? tierForAthleteScoreRow(scoreRow) : null;

  const adherence = scoreRow?.training_completion_score ?? null;
  const execution = scoreRow?.training_execution_score ?? null;

  const windowLabel = noProgram
    ? "No program assigned"
    : hasScore && scoreRow.window_start && scoreRow.window_end
      ? formatAthleteScoreWindowRange(scoreRow.window_start, scoreRow.window_end)
      : "Score will appear after first cron run";

  return (
    <section className="mb-6 rounded-xl border bg-card p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Athlete score
        </p>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Rolling 14 days</p>
          <p className="text-sm text-muted-foreground mt-0.5">{windowLabel}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <AthleteScoreRing
          size={120}
          score={hasScore ? scoreRow.score : null}
          tier={hasScore ? tierKey : null}
          paused={paused && hasScore}
          placeholder={showPlaceholder}
          animated={hasScore}
        />
        <div className="min-w-0 flex-1">
          {hasScore ? (
            <p className="text-3xl font-bold tabular-nums leading-none">
              {Math.round(scoreRow.score)}
              <span className="text-muted-foreground font-normal mx-2">·</span>
              <span style={{ color: tierColorForKey(tierKey) }}>{tierLabelForKey(tierKey)}</span>
            </p>
          ) : (
            <p className="text-lg text-muted-foreground">No score yet</p>
          )}
          {hasScore && adherence != null ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Adherence {Math.round(adherence)}
              {execution != null ? (
                <>
                  {" "}
                  × execution quality ({Math.round(execution)}%)
                </>
              ) : (
                " · execution pending"
              )}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <ScorePill label="Adherence" value={adherence} />
        <ScorePill
          label="Execution"
          value={execution}
          hint={execution == null ? "Shows after logged sets" : undefined}
        />
      </div>

      {hasScore && !noProgram && onOpenBreakdown ? (
        <div className="mt-4 text-right">
          <button
            type="button"
            onClick={onOpenBreakdown}
            className="text-sm text-[color:var(--fc-accent)] hover:underline"
          >
            Open full breakdown →
          </button>
        </div>
      ) : null}
    </section>
  );
}
