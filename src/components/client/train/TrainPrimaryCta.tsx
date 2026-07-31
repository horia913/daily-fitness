"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import styles from "./trainPage.module.css";

export interface TrainPrimaryCtaProps {
  onClick: () => void;
  disabled: boolean;
  isLoading: boolean;
  label?: string;
}

export function TrainPrimaryCta({
  onClick,
  disabled,
  isLoading,
  label = "▶ START WORKOUT",
}: TrainPrimaryCtaProps) {
  return (
    <button
      type="button"
      className={`fc-btn fc-btn-primary fc-press ${styles.primaryCta}`}
      onClick={onClick}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          Starting…
        </>
      ) : (
        label
      )}
    </button>
  );
}

export interface TrainWeekProgressProps {
  weeklyProgress: { current: number; goal: number };
}

export function TrainWeekProgress({ weeklyProgress }: TrainWeekProgressProps) {
  const safeGoal = Math.max(0, Math.floor(Number(weeklyProgress.goal) || 0));
  const safeCurrent = Math.max(0, Math.floor(Number(weeklyProgress.current) || 0));
  const pct =
    safeGoal > 0 ? Math.min(100, Math.round((safeCurrent / safeGoal) * 100)) : 0;

  return (
    <div
      className={styles.weekProgress}
      role="progressbar"
      aria-valuenow={safeCurrent}
      aria-valuemin={0}
      aria-valuemax={safeGoal}
      aria-label="This week workout progress"
    >
      <div className={styles.weekProgressHead}>
        <span className={styles.weekProgressLabel}>This week</span>
        <span className={styles.weekProgressValue}>
          {pct}% <span className={styles.weekProgressFrac}>· {safeCurrent}/{safeGoal}</span>
        </span>
      </div>
      <div className={styles.weekProgressBar}>
        <div
          className={styles.weekProgressFill}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
