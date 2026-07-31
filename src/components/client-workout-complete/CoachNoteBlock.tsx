"use client";

import React from "react";
import styles from "./clientWorkoutCompleteV6.module.css";

function initials(first?: string | null): string {
  const t = (first ?? "").trim();
  if (!t) return "C";
  return t.slice(0, 1).toUpperCase();
}

export function CoachNoteBlock(props: {
  coachFirstName?: string | null;
  note: string;
}) {
  const first = props.coachFirstName?.trim() || "Coach";
  return (
    <div className={styles.coachNote}>
      <div className={styles.coachAvatar}>{initials(first)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className={styles.coachEyebrow}>
          {first} · your coach
        </div>
        <div className={styles.coachText}>{props.note}</div>
      </div>
    </div>
  );
}
