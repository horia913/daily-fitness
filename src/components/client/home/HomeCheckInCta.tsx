"use client";

import React from "react";
import styles from "./homePage.module.css";

export interface HomeCheckInCtaProps {
  dailyDoneToday: boolean;
}

export function HomeCheckInCta({ dailyDoneToday }: HomeCheckInCtaProps) {
  if (dailyDoneToday) {
    return (
      <div
        className={`${styles.checkInCta} ${styles.checkInCtaDone}`}
        role="status"
        aria-label="Checked in today"
      >
        ✓ Checked in today
      </div>
    );
  }

  return (
    <button
      type="button"
      className={styles.checkInCta}
      onClick={() => {
        window.location.href = "/client/check-ins";
      }}
    >
      ✓ Complete daily check-in
    </button>
  );
}
