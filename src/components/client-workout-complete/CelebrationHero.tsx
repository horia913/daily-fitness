"use client";

import React from "react";
import type { CompleteAccent } from "./types";
import styles from "./clientWorkoutCompleteV6.module.css";

export function CelebrationHero(props: {
  accent: CompleteAccent;
  title: string;
  workoutName: string;
  durationParts: { mins: number; secs: number };
  dayLabel: string;
  headlineNumber: string;
  headlineUnit?: string | null;
  headlineLabel: string;
  deltaTier: "up" | "same" | "down" | "baseline";
  deltaNode: React.ReactNode;
}) {
  void props.accent;
  const dur = `${props.durationParts.mins}m ${String(props.durationParts.secs).padStart(2, "0")}s`;
  return (
    <section className={styles.hero}>
      <div className={styles.eyebrow}>● Workout complete</div>
      <h1 className={`${styles.heroTitle} ${styles.disp}`}>{props.title}</h1>
      <div className={styles.when}>
        {props.workoutName}
        {" · "}
        {dur}
        {" · "}
        {props.dayLabel}
      </div>
      <div className={styles.vol}>
        <span className={`${styles.volN} ${styles.disp}`}>
          {props.headlineNumber}
        </span>
        {props.headlineUnit ? (
          <span className={styles.volU}>{props.headlineUnit}</span>
        ) : null}
        <div className={styles.volLbl}>{props.headlineLabel}</div>
      </div>
      <div className={styles.delta} data-tier={props.deltaTier}>
        {props.deltaNode}
      </div>
    </section>
  );
}
