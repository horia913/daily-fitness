"use client";

import styles from "./progressSuiteV1.module.css";

/** Display label is always RPE; value from stored RPE (rir column mapped to `rpe` in UI). */
export function PsRpePill({ value }: { value: number | null | undefined }) {
  if (value == null || Number.isNaN(Number(value))) {
    return <span className={styles.psRpeEmpty}>—</span>;
  }
  const n = Math.round(Number(value));
  let cls = styles.psRpeGood;
  if (n >= 10) cls = styles.psRpeCrit;
  else if (n >= 8) cls = styles.psRpeWarn;
  return <span className={`${styles.psRpe} ${cls}`}>RPE {n}</span>;
}
