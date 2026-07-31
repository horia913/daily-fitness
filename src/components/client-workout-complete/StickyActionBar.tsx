"use client";

import React from "react";
import styles from "./clientWorkoutCompleteV6.module.css";

export function StickyActionBar(props: {
  onDone: () => void;
  onViewPrHistory: () => void;
  disabled?: boolean;
}) {
  return (
    <div className={styles.cta}>
      <button
        type="button"
        className={styles.btn}
        onClick={props.onDone}
        disabled={props.disabled}
      >
        Done
      </button>
      <button
        type="button"
        className={styles.btn2}
        onClick={props.onViewPrHistory}
      >
        View PR history
      </button>
    </div>
  );
}
