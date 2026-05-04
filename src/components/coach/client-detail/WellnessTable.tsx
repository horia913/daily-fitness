"use client";

import React from "react";
import styles from "./WellnessTable.module.css";

export type WellnessTableRow = {
  metric: string;
  current: string | null;
  previous: string | null;
  trend: "stable" | "improving" | "declining";
  currentTone?: "default" | "warn" | "good";
  previousTone?: "default" | "warn" | "good";
};

type Props = {
  rows: WellnessTableRow[];
};

function cellToneClass(tone: "default" | "warn" | "good" | undefined) {
  if (tone === "warn") return styles.valWarn;
  if (tone === "good") return styles.valGood;
  return styles.valDefault;
}

export default function WellnessTable({ rows }: Props) {
  return (
    <div className={styles.wrap}>
      <div className={`${styles.row} ${styles.head}`}>
        <span>Metric</span>
        <span className={styles.right}>This week</span>
        <span className={styles.right}>Last month</span>
        <span className={styles.right}>Trend</span>
      </div>
      {rows.map((r) => (
        <div key={r.metric} className={styles.row}>
          <span className={styles.metric}>{r.metric}</span>
          <span className={`${styles.right} ${cellToneClass(r.currentTone)}`}>
            {r.current == null ? <em className={styles.dash}>—</em> : r.current}
          </span>
          <span className={`${styles.right} ${cellToneClass(r.previousTone)}`}>
            {r.previous == null ? <em className={styles.dash}>—</em> : r.previous}
          </span>
          <span className={`${styles.right} ${styles.trend}`}>{r.trend}</span>
        </div>
      ))}
    </div>
  );
}
