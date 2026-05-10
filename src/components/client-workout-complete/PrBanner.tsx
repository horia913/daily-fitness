"use client";

import React from "react";
import { ChevronRight, Star } from "lucide-react";
import styles from "./clientWorkoutCompleteV1.module.css";

export function PrBanner(props: {
  prCount: number;
  titleLine: string;
  onPress: () => void;
}) {
  return (
    <button type="button" className={styles.prBanner} onClick={props.onPress}>
      <div className={styles.prBannerIcon}>
        <Star size={18} aria-hidden />
      </div>
      <div className={styles.prBannerMeta}>
        <div className={styles.prBannerEyebrow}>
          {props.prCount} new record{props.prCount === 1 ? "" : "s"}
        </div>
        <p className={styles.prBannerTitle}>{props.titleLine}</p>
        <div className={styles.prBannerSub}>Tap to view PR history</div>
      </div>
      <ChevronRight size={14} className={styles.prBannerChevron} aria-hidden />
    </button>
  );
}
