"use client";

import React from "react";
import styles from "./trainPage.module.css";

export interface TrainExtraWorkoutItem {
  id: string;
  name: string;
  exerciseCount: number;
  estimatedDuration: number;
  templateId: string;
}

export interface TrainExtraTrainingSectionProps {
  workouts: TrainExtraWorkoutItem[];
}

export function TrainExtraTrainingSection({
  workouts,
}: TrainExtraTrainingSectionProps) {
  if (workouts.length === 0) return null;

  return (
    <section className={styles.extraSection} aria-label="Extra training">
      <div className={styles.sectionHead}>
        <div className={styles.sectionTitleWrap}>
          <span className={styles.sectionAccentBar} aria-hidden />
          <h2 className={styles.sectionTitle}>Extra training</h2>
        </div>
      </div>
      <div className={styles.extraList}>
        {workouts.map((workout) => (
          <button
            key={workout.id}
            type="button"
            className={styles.extraRow}
            onClick={() => {
              window.location.href = `/client/workouts/${workout.id}/start`;
            }}
          >
            <div className={styles.dayMain}>
              <p className={styles.extraRowTitle}>{workout.name}</p>
              <p className={styles.extraRowSub}>
                {workout.estimatedDuration || 45} MIN ·{" "}
                {workout.exerciseCount > 0 ? workout.exerciseCount : "—"} EXERCISES
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
