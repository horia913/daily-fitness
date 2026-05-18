"use client";

import React from "react";
import styles from "./WellnessTable.module.css";

export type WellnessTableRow = {
  metric: string;
  current: string | React.ReactNode | null;
  previous: string | React.ReactNode | null;
  trend?: "stable" | "improving" | "declining";
  currentTone?: "default" | "warn" | "good";
  previousTone?: "default" | "warn" | "good";
};

type Props = {
  rows: WellnessTableRow[];
  /** When set, renders a 3-column table (metric | early date | late date) without the trend column. */
  compareDateLabels?: readonly [string, string];
  /** Use display font for numeric cells (body composition). */
  valueDisplayFont?: boolean;
};

function cellToneClass(tone: "default" | "warn" | "good" | undefined) {
  if (tone === "warn") return styles.valWarn;
  if (tone === "good") return styles.valGood;
  return styles.valDefault;
}

export default function WellnessTable({
  rows,
  compareDateLabels,
  valueDisplayFont,
}: Props) {
  const compare = Boolean(compareDateLabels?.length === 2);
  const valClass = (tone: "default" | "warn" | "good" | undefined) =>
    `${styles.right} ${cellToneClass(tone)}${valueDisplayFont ? ` ${styles.valDisplay}` : ""}`;

  return (
    <div className={styles.wrap}>
      <div
        className={`${styles.row} ${styles.head}${compare ? ` ${styles.rowCompare}` : ""}`}
      >
        <span>Metric</span>
        {compare ? (
          <>
            <span className={styles.right}>{compareDateLabels![0]}</span>
            <span className={styles.right}>{compareDateLabels![1]}</span>
          </>
        ) : (
          <>
            <span className={styles.right}>This week</span>
            <span className={styles.right}>Last month</span>
            <span className={styles.right}>Trend</span>
          </>
        )}
      </div>
      {rows.map((r) => (
        <div
          key={r.metric}
          className={`${styles.row}${compare ? ` ${styles.rowCompare}` : ""}`}
        >
          <span className={styles.metric}>{r.metric}</span>
          <span className={valClass(r.previousTone)}>
            {r.previous == null ? <em className={styles.dash}>—</em> : r.previous}
          </span>
          <span className={valClass(r.currentTone)}>
            {r.current == null ? <em className={styles.dash}>—</em> : r.current}
          </span>
          {!compare ? (
            <span className={`${styles.right} ${styles.trend}`}>{r.trend}</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
