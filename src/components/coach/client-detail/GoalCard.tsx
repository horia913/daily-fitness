"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import styles from "./GoalCard.module.css";

export type GoalCardPillar = "training" | "nutrition" | "body" | "lifestyle";

type Props = {
  pillar: GoalCardPillar;
  title: string;
  categoryLabel: string;
  statusLabel: string;
  priorityLabel: string;
  progressPct: number;
  currentDisplay: string;
  targetDisplay: string | null;
  footIcon: LucideIcon;
  footText: string;
};

function accentVar(p: GoalCardPillar): string {
  if (p === "training") return "var(--fc-set-type-straight)";
  if (p === "nutrition") return "var(--fc-effort-easy)";
  if (p === "body") return "var(--fc-effort-medium)";
  return "var(--fc-meal-dinner)";
}

function barGradient(p: GoalCardPillar): string {
  if (p === "training")
    return "linear-gradient(90deg, var(--fc-set-type-straight), var(--fc-accent-lime-2))";
  if (p === "nutrition")
    return "linear-gradient(90deg, var(--fc-effort-easy), var(--fc-set-type-straight))";
  if (p === "body") return "linear-gradient(90deg, var(--fc-effort-medium), var(--fc-effort-medium))";
  return "linear-gradient(90deg, var(--fc-meal-dinner), var(--fc-meal-dinner))";
}

function statusPillClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "active") return styles.pillStatusActive;
  if (s === "paused") return styles.pillStatusPaused;
  if (s === "completed") return styles.pillStatusDone;
  return "";
}

export default function GoalCard({
  pillar,
  title,
  categoryLabel,
  statusLabel,
  priorityLabel,
  progressPct,
  currentDisplay,
  targetDisplay,
  footIcon: FootIcon,
  footText,
}: Props) {
  const pct = Math.max(0, Math.min(100, Math.round(progressPct)));
  return (
    <article
      className={styles.card}
      style={
        {
          "--goal-accent": accentVar(pillar),
        } as React.CSSProperties
      }
    >
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.pillRow}>
        <span className={styles.pill}>{categoryLabel}</span>
        <span className={`${styles.pill} ${statusPillClass(statusLabel)}`.trim()}>
          {statusLabel}
        </span>
        <span className={styles.pill}>{priorityLabel}</span>
      </div>
      <div className={styles.progressRow}>
        <span className={styles.current}>{currentDisplay}</span>
        <div className={styles.barTrack}>
          <div
            className={styles.barFill}
            style={{ width: `${pct}%`, background: barGradient(pillar) }}
          />
        </div>
        {targetDisplay ? <span className={styles.target}>{targetDisplay}</span> : null}
      </div>
      <div className={styles.foot}>
        <FootIcon className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
        <span>{footText}</span>
      </div>
    </article>
  );
}
