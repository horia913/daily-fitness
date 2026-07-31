/**
 * Coach attention thresholds — single place for literals.
 * Future: coach-configurable without rewriting the classifier.
 */

export const COACH_ATTENTION_THRESHOLDS = {
  /** Missed scheduled days in rolling 7 → needs_attention */
  missedScheduledDaysNeedsAttention: 2,
  /** A single missed scheduled day → monitor */
  missedScheduledDaysMonitor: 1,
  /** Days since last trained session → needs_attention */
  inactiveTrainingDays: 7,
  /** Days since last trained session → monitor */
  inactiveTrainingDaysMonitor: 5,
  /** Days since last wellness check-in → needs_attention */
  checkInInactiveDays: 7,
  /** Days since last wellness check-in → monitor */
  checkInInactiveDaysMonitor: 3,
  /** Lookback for high-stress flag (UI stress ≥ threshold) */
  highStressLookbackDays: 14,
  /** UI stress scale 1–5 */
  highStressUiMin: 4,
  /** Execution on-target % below this → quality flag (monitor), unless recent PRs soften it */
  executionPctMin: 85,
  /** Nutrition 7d adherence below this (when meal plan active) → monitor */
  nutritionAdherencePctMin: 60,
  /** Rolling window (days) for missed-session counts */
  rollingMissedDays: 7,
  /** History window when loading adherence for signals */
  adherenceHistoryDays: 21,
} as const;

export type CoachAttentionThresholds = typeof COACH_ATTENTION_THRESHOLDS;
