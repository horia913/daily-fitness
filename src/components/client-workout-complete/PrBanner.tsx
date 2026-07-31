"use client";

import React from "react";
import { Trophy } from "lucide-react";
import styles from "./clientWorkoutCompleteV6.module.css";

export function PrBanner(props: {
  prCount: number;
  titleLine: string;
  onPress: () => void;
}) {
  return (
    <button type="button" className={styles.pr} onClick={props.onPress}>
      <span className={styles.prIco}>
        <Trophy size={16} strokeWidth={1.7} aria-hidden />
      </span>
      <span className={styles.prT}>
        <span className={styles.prH}>
          {props.prCount} new record{props.prCount === 1 ? "" : "s"}
        </span>
        <div className={styles.prB}>{props.titleLine}</div>
      </span>
      <span className={styles.prGo} aria-hidden>
        ›
      </span>
    </button>
  );
}
