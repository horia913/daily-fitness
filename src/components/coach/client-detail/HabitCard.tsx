"use client";

import React from "react";
import { Check } from "lucide-react";
import styles from "./HabitCard.module.css";

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"] as const;

type Props = {
  name: string;
  targetLine: string;
  badgeKind: "manual" | "auto";
  badgeText: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  iconVariant: "warn" | "cyan" | "purple" | "good";
  /** Length matches day count (7 or 30) */
  doneFlags: boolean[];
  completedLeft: React.ReactNode;
  lastLabel: string;
};

export default function HabitCard({
  name,
  targetLine,
  badgeKind,
  badgeText,
  Icon,
  iconVariant,
  doneFlags,
  completedLeft,
  lastLabel,
}: Props) {
  const iconWrap =
    iconVariant === "warn"
      ? styles.iconWarn
      : iconVariant === "purple"
        ? styles.iconPurple
        : iconVariant === "good"
          ? styles.iconGood
          : styles.iconCyan;

  return (
    <article className={styles.card}>
      <div className={styles.head}>
        <div className={`${styles.iconBox} ${iconWrap}`}>
          <Icon className={styles.icon} strokeWidth={2} />
        </div>
        <div className={styles.meta}>
          <div className={styles.titleRow}>
            <h3 className={styles.name}>{name}</h3>
            <span className={badgeKind === "manual" ? styles.pillManual : styles.pillAuto}>{badgeText}</span>
          </div>
          <p className={styles.target}>{targetLine}</p>
        </div>
      </div>
      <div className={styles.dots}>
        {doneFlags.map((done, i) => (
          <div
            key={i}
            className={`${styles.dayCell} ${done ? styles.dayDone : styles.dayIdle}`}
            title={String(i)}
          >
            {done ? <Check className={styles.check} strokeWidth={2.5} /> : DAY_LETTERS[i % 7]}
          </div>
        ))}
      </div>
      <div className={styles.foot}>
        <span className={styles.footLeft}>{completedLeft}</span>
        <span className={styles.footRight}>{lastLabel}</span>
      </div>
    </article>
  );
}
