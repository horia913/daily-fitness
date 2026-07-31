"use client";

import React from "react";
import { TrainAthleteScoreRing } from "@/components/client/train/TrainAthleteScoreRing";
import type { AthleteScore } from "@/types/athleteScore";
import type { AthleteScoreChipState } from "@/lib/clientDashboardPageData";
import styles from "./trainPage.module.css";

const RING_SIZE = 56;

export interface TrainPageHeaderProps {
  eyebrowLine: string;
  avatarUrl: string | null;
  avatarInitial: string;
  onAvatarClick: () => void;
  userId: string | null;
  athleteScore: AthleteScore | null;
  scoreError: string | null;
  athleteScoreChipState: AthleteScoreChipState;
  showScore: boolean;
}

export function TrainPageHeader({
  eyebrowLine,
  avatarUrl,
  avatarInitial,
  onAvatarClick,
  userId,
  athleteScore,
  scoreError,
  athleteScoreChipState,
  showScore,
}: TrainPageHeaderProps) {
  return (
    <header className={styles.header}>
      <button
        type="button"
        className={styles.avatarBtn}
        onClick={onAvatarClick}
        aria-label="Open profile"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" />
        ) : (
          <span className={styles.avatarInitial} aria-hidden>
            {avatarInitial}
          </span>
        )}
      </button>

      <div className={styles.headerCenter}>
        {eyebrowLine ? (
          <p className={styles.headerEyebrow}>{eyebrowLine}</p>
        ) : null}
        <h1 className={styles.headerTitle}>TRAINING</h1>
      </div>

      {showScore ? (
        <div className={styles.headerScore}>
          <TrainAthleteScoreRing
            userId={userId}
            athleteScore={athleteScore}
            scoreError={scoreError}
            chipState={athleteScoreChipState}
            size={RING_SIZE}
          />
        </div>
      ) : (
        <div className={styles.headerScore} style={{ width: RING_SIZE, height: RING_SIZE }} aria-hidden />
      )}
    </header>
  );
}
