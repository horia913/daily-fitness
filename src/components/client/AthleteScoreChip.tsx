"use client";

import React from "react";
import type { AthleteScore } from "@/types/athleteScore";
import { tierForAthleteScoreRow } from "@/lib/clientDashboardPageData";
import type { AthleteScoreChipState } from "@/lib/clientDashboardPageData";
import { AthleteScoreRing } from "@/components/client-ui/AthleteScoreRing";
import { ATHLETE_TIERS } from "@/types/athleteScore";

interface AthleteScoreChipProps {
  athleteScore: AthleteScore | null;
  chipState?: AthleteScoreChipState;
  /** Coach check-ins header: 48px ring + inline score/tier, links to client overview. */
  compact?: boolean;
  coachClientId?: string;
}

export function AthleteScoreChip({
  athleteScore,
  chipState = "default",
  compact = false,
  coachClientId,
}: AthleteScoreChipProps) {
  const hasScore = athleteScore != null;
  const paused = chipState === "paused";
  const ringSize = compact ? 48 : 60;

  if (!hasScore) {
    if (compact) return null;
    return (
      <button
        type="button"
        onClick={() => {
          window.location.href = "/client/profile";
        }}
        aria-label="Athlete score: not available until you start a program."
        className="relative shrink-0 rounded-full transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-accent)]"
      >
        <AthleteScoreRing placeholder score={null} tier={null} animated={false} size={ringSize} />
      </button>
    );
  }

  const tierKey = tierForAthleteScoreRow(athleteScore);
  const tierInfo = ATHLETE_TIERS.find((t) => t.key === tierKey) ?? ATHLETE_TIERS[4];
  const scoreValue = Math.round(athleteScore.score);

  const href = compact && coachClientId
    ? `/coach/clients/${coachClientId}`
    : "/client/profile";

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => {
          window.location.href = href;
        }}
        aria-label={`Athlete Score: ${scoreValue}, ${tierInfo.label}. View breakdown.`}
        className="flex items-center gap-2 shrink-0 rounded-lg border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-surface-card)] px-3 py-2 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-accent)]"
      >
        <AthleteScoreRing
          score={athleteScore.score}
          tier={tierKey}
          paused={paused}
          animated={false}
          size={ringSize}
        />
        <div className="text-left min-w-0">
          <p className="text-xl font-bold tabular-nums leading-none text-[color:var(--fc-text-primary)]">
            {scoreValue}
          </p>
          <p className="text-[10px] text-[color:var(--fc-text-dim)] mt-0.5 truncate max-w-[5rem]">
            {paused ? "Paused" : tierInfo.label}
          </p>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        window.location.href = href;
      }}
      aria-label={`Athlete Score: ${scoreValue}, ${tierInfo.label}. Tap to view breakdown.`}
      className="relative shrink-0 rounded-full transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-accent)]"
    >
      <AthleteScoreRing
        score={athleteScore.score}
        tier={tierKey}
        paused={paused}
        animated
        size={ringSize}
      />
    </button>
  );
}
