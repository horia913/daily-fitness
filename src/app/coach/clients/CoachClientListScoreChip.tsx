"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { tierColorForKey, tierLabelForKey } from "@/lib/coachAthleteScoreUi";
import type { CoachAthleteScoreSummary } from "@/types/coachAthleteScore";
import styles from "./coachClients.module.css";

const RING_SIZE = 36;
const STROKE = 4;

function ringGeometry(size: number, stroke: number) {
  const center = size / 2;
  const radius = Math.max(2, (size - stroke * 2) / 2);
  const circumference = 2 * Math.PI * radius;
  return { center, radius, circumference };
}

export function CoachClientListScoreChip({
  clientId,
  athleteScore,
}: {
  clientId: string;
  athleteScore: CoachAthleteScoreSummary | null | undefined;
}) {
  if (!athleteScore) return null;

  const { score, tier, paused } = athleteScore;
  const pct = Math.min(100, Math.max(0, Number(score)));
  const tierColor = tierColorForKey(tier);
  const { center, radius, circumference } = ringGeometry(RING_SIZE, STROKE);
  const dashOffset = circumference - (pct / 100) * circumference;

  return (
    <button
      type="button"
      className={cn(styles.listScoreChip, paused && styles.listScoreChipPaused)}
      aria-label={
        paused
          ? `Athlete score ${Math.round(score)}, program paused. View breakdown.`
          : `Athlete score ${Math.round(score)}, ${tierLabelForKey(tier)}. View breakdown.`
      }
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        window.location.href = `/coach/clients/${clientId}/stats`;
      }}
    >
      <div className={styles.listScoreRingWrap} style={{ width: RING_SIZE, height: RING_SIZE }}>
        <svg
          width={RING_SIZE}
          height={RING_SIZE}
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          className="-rotate-90"
          aria-hidden
        >
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="var(--fc-surface-sunken)"
            strokeWidth={STROKE}
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={tierColor}
            strokeWidth={STROKE}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
        </svg>
        <span className={styles.listScoreValue}>{Math.round(pct)}</span>
      </div>
      {paused ? (
        <span className={styles.listScoreCaption}>Paused</span>
      ) : (
        <span className={styles.listScoreCaption} style={{ color: tierColor }}>
          {tierLabelForKey(tier)}
        </span>
      )}
    </button>
  );
}
