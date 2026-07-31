"use client";

import React from "react";
import styles from "./trainPage.module.css";

export interface TrainCoachNoteProps {
  notes: string;
}

export function TrainCoachNote({ notes }: TrainCoachNoteProps) {
  const trimmed = notes?.trim();
  if (!trimmed) return null;

  return (
    <section className={styles.coachNote} aria-label="Coach note">
      <p className={styles.coachNoteLabel}>Coach note</p>
      <p className={styles.coachNoteBody}>{trimmed}</p>
    </section>
  );
}
