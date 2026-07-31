"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { AthleteScore } from "@/types/athleteScore";
import { ATHLETE_TIERS } from "@/types/athleteScore";
import {
  tierForAthleteScoreRow,
  type AthleteScoreChipState,
} from "@/lib/clientDashboardPageData";
import {
  buildAthleteScoreBreakdownComponents,
  fetchAthleteScoreWeekTrends,
} from "@/lib/athleteScoreBreakdown";
import styles from "./homePage.module.css";

const HERO_SIZE = 150;
const HERO_R = 65;
const HERO_STROKE = 10;

const TAKEOVER_SIZE = 118;
const TAKEOVER_R = 50;
const TAKEOVER_STROKE = 9;

function ScoreRingSvg({
  size,
  radius,
  stroke,
  percentage,
}: {
  size: number;
  radius: number;
  stroke: number;
  percentage: number;
}) {
  const center = size / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (percentage / 100) * circ;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="absolute inset-0 -rotate-90"
      aria-hidden
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="var(--fc-track)"
        strokeWidth={stroke}
      />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="var(--fc-accent)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ filter: "drop-shadow(0 0 7px var(--fc-accent-glow))" }}
      />
    </svg>
  );
}

interface HomeScoreTakeoverProps {
  open: boolean;
  onClose: () => void;
  score: number;
  tierLabel: string;
  athleteScore: AthleteScore;
  userId: string;
  paused: boolean;
}

function HomeScoreTakeover({
  open,
  onClose,
  score,
  tierLabel,
  athleteScore,
  userId,
  paused,
}: HomeScoreTakeoverProps) {
  const [mounted, setMounted] = useState(false);
  const [trends, setTrends] = useState<
    Awaited<ReturnType<typeof fetchAthleteScoreWeekTrends>> | undefined
  >(undefined);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !userId) return;
    let cancelled = false;
    fetchAthleteScoreWeekTrends(userId).then((t) => {
      if (!cancelled) setTrends(t);
    });
    return () => {
      cancelled = true;
    };
  }, [open, userId, athleteScore.calculated_at]);

  if (!open || !mounted) return null;

  const components = buildAthleteScoreBreakdownComponents(athleteScore, trends);
  const adherence = components.find((c) => c.label === "Adherence");
  const execution = components.find((c) => c.label === "Execution");

  const adherenceVal = adherence?.value ?? null;
  const executionVal = execution?.value ?? null;

  return createPortal(
    <div
      className={styles.takeover}
      role="dialog"
      aria-modal="true"
      aria-label="Athlete score breakdown"
    >
      <div className={styles.takeoverTop}>
        <button type="button" className={styles.takeoverBack} onClick={onClose}>
          ‹ Back
        </button>
        <button
          type="button"
          className={styles.takeoverClose}
          onClick={onClose}
          aria-label="Close breakdown"
        >
          ✕
        </button>
      </div>

      <div className={styles.takeoverHero}>
        <div className={styles.takeoverRing}>
          <ScoreRingSvg
            size={TAKEOVER_SIZE}
            radius={TAKEOVER_R}
            stroke={TAKEOVER_STROKE}
            percentage={score}
          />
          <span className={styles.takeoverRingValue}>{Math.round(score)}</span>
          <span className={styles.takeoverRingTier}>{tierLabel}</span>
        </div>
        <p className={styles.takeoverName}>Athlete Score</p>
        {paused ? (
          <p className={styles.takeoverNote}>Program paused — score frozen</p>
        ) : null}
      </div>

      <div className={styles.takeoverRow}>
        <span className={styles.takeoverRowKey}>Adherence</span>
        <span className={styles.takeoverRowValue}>
          {adherenceVal != null ? `${adherenceVal}%` : "—"}
        </span>
      </div>
      {adherenceVal != null ? (
        <div className={styles.takeoverBar}>
          <div
            className={styles.takeoverBarFill}
            style={{
              width: `${Math.min(100, adherenceVal)}%`,
              background: "var(--fc-accent)",
            }}
          />
        </div>
      ) : null}

      <div className={styles.takeoverRow}>
        <span className={styles.takeoverRowKey}>Execution</span>
        <span className={styles.takeoverRowValue}>
          {executionVal != null ? `${executionVal}%` : "—"}
        </span>
      </div>
      {executionVal != null ? (
        <div className={styles.takeoverBar}>
          <div
            className={styles.takeoverBarFill}
            style={{
              width: `${Math.min(100, executionVal)}%`,
              background: "var(--fc-status-success)",
            }}
          />
        </div>
      ) : null}

      <p className={styles.takeoverNote}>
        Your score = 70% completion + 30% execution. If execution is unavailable, completion carries 100%.
      </p>
    </div>,
    document.body,
  );
}

export interface HomeScoreHeroProps {
  userId: string | null;
  athleteScore: AthleteScore | null;
  scoreError: string | null;
  chipState?: AthleteScoreChipState;
}

export function HomeScoreHero({
  userId,
  athleteScore,
  scoreError,
  chipState = "default",
}: HomeScoreHeroProps) {
  const [takeoverOpen, setTakeoverOpen] = useState(false);
  const hasScore = athleteScore != null && !scoreError;
  const paused = chipState === "paused";

  if (!hasScore) {
    return (
      <div className={styles.scoreHero} aria-label="Athlete score unavailable">
        <div className={styles.scoreHeroRing}>
          <ScoreRingSvg
            size={HERO_SIZE}
            radius={HERO_R}
            stroke={HERO_STROKE}
            percentage={0}
          />
          <span className={styles.scoreHeroValue}>—</span>
          <span className={styles.scoreHeroMicro}>Athlete Score</span>
        </div>
        <span className={styles.scoreHeroTap}>
          {scoreError ? "Score unavailable" : "Complete a workout to unlock"}
        </span>
      </div>
    );
  }

  const tierKey = tierForAthleteScoreRow(athleteScore);
  const tierInfo = ATHLETE_TIERS.find((t) => t.key === tierKey) ?? ATHLETE_TIERS[4];
  const scoreValue = Math.round(athleteScore.score);
  const tierLabel = paused ? "Paused" : tierInfo.label;

  return (
    <>
      <button
        type="button"
        className={styles.scoreHero}
        onClick={() => setTakeoverOpen(true)}
        aria-label={`Athlete score ${scoreValue}, ${tierLabel}. Open breakdown.`}
        style={{ opacity: paused ? 0.75 : 1 }}
      >
        <div className={styles.scoreHeroRing}>
          <ScoreRingSvg
            size={HERO_SIZE}
            radius={HERO_R}
            stroke={HERO_STROKE}
            percentage={scoreValue}
          />
          <span className={styles.scoreHeroValue}>{scoreValue}</span>
          <span className={styles.scoreHeroMicro}>Athlete Score</span>
        </div>
        <span className={styles.scoreHeroTier}>{tierLabel}</span>
        <span className={styles.scoreHeroTap}>Tap for breakdown</span>
      </button>

      <HomeScoreTakeover
        open={takeoverOpen}
        onClose={() => setTakeoverOpen(false)}
        score={scoreValue}
        tierLabel={tierLabel}
        athleteScore={athleteScore}
        userId={userId ?? ""}
        paused={paused}
      />
    </>
  );
}
