"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import styles from "./MetricRow.module.css";

export type MetricTone = "cyan" | "good" | "warning" | "purple";

export type MetricItem = {
  label: string;
  icon: LucideIcon;
  tone: MetricTone;
  /** 0–100, or null for "Not tracked" */
  valuePct: number | null;
};

function valueClass(pct: number | null): string {
  if (pct == null || Number.isNaN(pct)) return styles.valMuted;
  if (pct <= 0) return styles.valCrit;
  if (pct < 50) return styles.valWarn;
  if (pct < 100) return styles.valGood;
  return styles.valLime;
}

function barFillClass(pct: number | null): string {
  if (pct == null || Number.isNaN(pct)) return styles.barMuted;
  if (pct <= 0) return styles.barCrit;
  if (pct < 50) return styles.barWarn;
  if (pct < 100) return styles.barGood;
  return styles.barLime;
}

export default function MetricRow({ items }: { items: MetricItem[] }) {
  return (
    <div className={styles.grid}>
      {items.map((m) => {
        const Icon = m.icon;
        const headClass =
          m.tone === "cyan"
            ? styles.headCyan
            : m.tone === "good"
              ? styles.headGood
              : m.tone === "purple"
                ? styles.headPurple
                : styles.headWarn;
        const pct = m.valuePct;
        const barW = pct == null ? 6 : Math.max(6, Math.min(100, pct));
        return (
          <div key={m.label} className={styles.tile}>
            <div className={`${styles.head} ${headClass}`}>
              <Icon className={styles.headIcon} strokeWidth={2} aria-hidden />
              <span>{m.label}</span>
            </div>
            <div className={`${styles.value} ${valueClass(pct)}`}>
              {pct == null ? "Not tracked" : `${Math.round(pct)}%`}
            </div>
            <div className={styles.barTrack}>
              <div
                className={`${styles.barFill} ${barFillClass(pct)}`}
                style={{ width: `${barW}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
