"use client";

import React from "react";
import { Home, Share2 } from "lucide-react";
import styles from "./clientWorkoutCompleteV1.module.css";

export function StickyActionBar(props: {
  onShare: () => void;
  onDashboard: () => void;
  disabled?: boolean;
}) {
  return (
    <div className={styles.stickyBar}>
      <button
        type="button"
        className={styles.btnOutline}
        onClick={props.onShare}
        aria-label="Share workout summary"
      >
        <Share2 size={15} aria-hidden />
      </button>
      <button
        type="button"
        className={styles.btnPrimary}
        onClick={props.onDashboard}
        disabled={props.disabled}
      >
        <Home size={14} aria-hidden />
        Back to dashboard
      </button>
    </div>
  );
}
