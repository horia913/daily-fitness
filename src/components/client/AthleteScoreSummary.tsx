"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { AthleteScoreRing } from "@/components/client-ui/AthleteScoreRing";
import type { AthleteScore } from "@/types/athleteScore";
import { ATHLETE_TIERS } from "@/types/athleteScore";
import { tierForAthleteScoreRow } from "@/lib/clientDashboardPageData";

export interface AthleteScoreSummaryProps {
  athleteScore: AthleteScore | null;
  scoreError: string | null;
}

export function AthleteScoreSummary({ athleteScore, scoreError }: AthleteScoreSummaryProps) {
  const tierKey =
    athleteScore != null ? tierForAthleteScoreRow(athleteScore) : "benched";
  const tierLabel = ATHLETE_TIERS.find((t) => t.key === tierKey)?.label ?? "—";

  return (
    <section className="mb-[22px] mx-5">
      <div className="flex flex-col items-center gap-3">
        {scoreError ? (
          <>
            <AthleteScoreRing score={0} tier="benched" animated={false} size={140} />
            <AlertTriangle
              className="h-5 w-5 text-[var(--fc-status-error)]"
              aria-hidden
            />
            <p className="text-center text-sm fc-text-dim px-2">{scoreError}</p>
          </>
        ) : (
          <>
            <div className="flex justify-center overflow-visible w-full">
              <AthleteScoreRing
                score={athleteScore?.score ?? null}
                tier={athleteScore != null ? tierKey : null}
                animated
                size={140}
              />
            </div>
            <p
              className="text-center text-sm font-medium fc-text-primary"
              style={{ fontFamily: "var(--f-headline, var(--font-body))" }}
            >
              Athlete Score · {athleteScore?.score ?? "—"} · {tierLabel}
            </p>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/client/me";
              }}
              className="text-sm font-medium fc-text-primary hover:fc-text-subtle transition-colors bg-transparent border-0 p-0 cursor-pointer"
            >
              View breakdown →
            </button>
          </>
        )}
      </div>
    </section>
  );
}
