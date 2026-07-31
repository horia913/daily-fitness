"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { CoachTriageClient } from "@/lib/coachInsightsBundle";
import { CoachAthleteCard } from "@/components/coach/CoachAthleteCard";
import styles from "./coachHomePage.module.css";

export interface CoachHomeQueueSectionProps {
  title: string;
  count: number;
  countTone: "warn" | "bad" | "mute" | "good";
  clients: CoachTriageClient[];
  allClearText?: string;
  previewLimit?: number;
  viewAllLabel?: string;
  className?: string;
}

export function CoachHomeQueueSection({
  title,
  count,
  countTone,
  clients,
  allClearText,
  previewLimit,
  viewAllLabel,
  className,
}: CoachHomeQueueSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const limit = previewLimit ?? clients.length;
  const showViewAll = viewAllLabel != null && count > limit && !expanded;
  const visible = expanded ? clients : clients.slice(0, limit);

  const countClass =
    countTone === "warn"
      ? styles.countWarn
      : countTone === "bad"
        ? styles.countBad
        : countTone === "good"
          ? styles.countGood
          : styles.countMute;

  return (
    <section className={className} aria-label={title}>
      <div className={styles.queueHead}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <span className={`${styles.countPill} ${countClass}`}>{count}</span>
      </div>

      {clients.length === 0 && allClearText ? (
        <div className={styles.allClear}>
          <span className={styles.allClearIcon} aria-hidden>
            ✓
          </span>
          <span className={styles.allClearText}>{allClearText}</span>
        </div>
      ) : (
        <div className={styles.queueList}>
          {visible.map((client) => (
            <CoachAthleteCard
              key={client.id}
              variant="row"
              density="compact"
              clientId={client.id}
              name={client.name}
              avatarUrl={client.avatarUrl}
              attention={{
                level: client.level,
                reasons: client.reasons,
              }}
              maxReasons={2}
            />
          ))}
        </div>
      )}

      {showViewAll ? (
        <button
          type="button"
          className={styles.viewAll}
          onClick={() => setExpanded(true)}
        >
          {viewAllLabel}
        </button>
      ) : null}
    </section>
  );
}

export interface CoachHomeTodayRowProps {
  icon: string;
  iconTone?: "default" | "good" | "accent";
  name: string;
  sub: string;
  value: string;
  valueColor?: string;
  href?: string;
}

export function CoachHomeTodayRow({
  icon,
  iconTone = "default",
  name,
  sub,
  value,
  valueColor,
  href,
}: CoachHomeTodayRowProps) {
  const avClass =
    iconTone === "good"
      ? `${styles.qav} ${styles.qavGood}`
      : iconTone === "accent"
        ? `${styles.qav} ${styles.qavAccent}`
        : styles.qav;

  const inner = (
    <>
      <span className={avClass} aria-hidden>
        {icon}
      </span>
      <div className={styles.qbody}>
        <div className={styles.qname}>{name}</div>
        <div className={styles.qsub}>{sub}</div>
      </div>
      <span
        className={styles.qdatum}
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={styles.qrow}>
        {inner}
      </Link>
    );
  }

  return (
    <div className={styles.qrow} style={{ cursor: "default" }}>
      {inner}
    </div>
  );
}
