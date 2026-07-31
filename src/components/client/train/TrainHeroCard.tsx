"use client";

import React, { useMemo } from "react";
import type { ProgramWeekDayCard, ProgramWeekState } from "@/lib/programWeekStateBuilder";
import styles from "./trainPage.module.css";

/** Monday = 1 … Sunday = 7 (matches train page / RPC weekday indexing). */
function todayOrdinalInWeek(): number {
  return ((new Date().getDay() + 6) % 7) + 1;
}

export interface TrainHeroCardProps {
  programWeek: ProgramWeekState;
  phaseChipLabel: string | null;
  exerciseCounts: Map<string, number>;
}

export function TrainHeroCard({
  programWeek,
  phaseChipLabel,
  exerciseCounts,
}: TrainHeroCardProps) {
  const { days, todaySlot, isRestDay } = programWeek;

  const nextWorkout = useMemo(() => {
    if (todaySlot && !todaySlot.isCompleted && todaySlot.templateId) return todaySlot;
    return days.find((d) => !d.isCompleted && d.templateId) ?? null;
  }, [days, todaySlot]);

  const heroWorkout = isRestDay ? nextWorkout : (todaySlot?.templateId ? todaySlot : nextWorkout);

  const exerciseCount =
    heroWorkout && exerciseCounts.has(heroWorkout.templateId)
      ? exerciseCounts.get(heroWorkout.templateId) ?? 0
      : heroWorkout
        ? exerciseCounts.get(heroWorkout.templateId) ?? 0
        : 0;

  const minutes = heroWorkout?.estimatedDuration || 45;
  const todayOrdinal = todayOrdinalInWeek();

  if (isRestDay) {
    return (
      <div className={styles.heroCard}>
        <div className={styles.heroInner}>
          <p className={styles.heroLabel}>
            Today · Day {todayOrdinal} of 7
          </p>
          <p className={styles.heroRestTitle}>Rest day</p>
          <p className={styles.heroRestBody}>
            No workout scheduled for today. Recovery still counts.
          </p>
          {nextWorkout ? (
            <p className={styles.heroNextSession}>
              Next up: <strong>{nextWorkout.workoutName}</strong>
            </p>
          ) : null}
          {phaseChipLabel ? (
            <span className={styles.phaseChip}>{phaseChipLabel}</span>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.heroCard}>
      <div className={styles.heroInner}>
        <p className={styles.heroLabel}>
          Today · Day {todayOrdinal} of 7
        </p>
        <div className={styles.heroMinutesRow}>
          <span className={styles.heroMinutes}>{minutes}</span>
          <span className={styles.heroMinutesUnit}>MIN</span>
        </div>
        <h2 className={styles.heroWorkoutName}>
          {heroWorkout?.workoutName ?? "Workout"}
        </h2>
        <p className={styles.heroSub}>
          {exerciseCount > 0 ? `${exerciseCount} exercises` : "Workout"} · Program workout
        </p>
        {phaseChipLabel ? (
          <span className={styles.phaseChip}>{phaseChipLabel}</span>
        ) : null}
      </div>
    </div>
  );
}

export function resolveTrainPrimaryWorkout(
  programWeek: ProgramWeekState,
): ProgramWeekDayCard | null {
  const { days, todaySlot, isRestDay } = programWeek;
  if (isRestDay) return null;
  if (todaySlot && !todaySlot.isCompleted && todaySlot.templateId) return todaySlot;
  return days.find((d) => !d.isCompleted && d.templateId) ?? null;
}
