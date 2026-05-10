"use client";

import React from "react";
import type { AthleteScore } from "@/types/athleteScore";
import { tierForAthleteScoreRow } from "@/lib/clientDashboardPageData";
import { AthleteScoreRing } from "@/components/client-ui/AthleteScoreRing";
import { ATHLETE_TIERS } from "@/types/athleteScore";

interface AthleteScoreChipProps {
  athleteScore: AthleteScore | null;
}

export function AthleteScoreChip({ athleteScore }: AthleteScoreChipProps) {
  const tierKey = athleteScore ? tierForAthleteScoreRow(athleteScore) : "benched";
  const tierInfo = ATHLETE_TIERS.find((tier) => tier.key === tierKey) ?? ATHLETE_TIERS[4];
  const scoreValue = athleteScore ? Math.round(athleteScore.score) : 0;
  const ariaTier = tierInfo.label;

  return (
    <button
      type="button"
      onClick={() => {
        window.location.href = "/client/profile";
      }}
      aria-label={`Athlete Score: ${scoreValue}, ${ariaTier}. Tap to view breakdown.`}
      className="shrink-0 rounded-full transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-accent-cyan)]"
    >
      <AthleteScoreRing
        score={athleteScore?.score ?? null}
        tier={athleteScore ? tierKey : null}
        animated
        size={60}
      />
    </button>
  );
}
