"use client";

import React from "react";
import styles from "./ClientDetailHero.module.css";

export type ClientDetailHeroAccent = "cyan" | "lime" | "good" | "purple";

export type ClientDetailHeroStatTone =
  | "default"
  | "cyan"
  | "lime"
  | "good"
  | "purple"
  | "critical"
  | "warning";

export type ClientDetailHeroStat = {
  num: string | number;
  /** Smaller suffix after the main number (e.g. `/30`). */
  numSuffix?: string;
  label: string;
  /** @deprecated prefer `tone` */
  highlight?: boolean;
  tone?: ClientDetailHeroStatTone;
};

type Props = {
  eyebrow: string;
  title: string;
  subtitle?: string | null;
  stats: ClientDetailHeroStat[];
  accent?: ClientDetailHeroAccent;
};

export default function ClientDetailHero({
  eyebrow,
  title,
  subtitle,
  stats,
  accent = "cyan",
}: Props) {
  return (
    <section className={styles.wrap} data-accent={accent}>
      <div className={styles.glow} aria-hidden />
      <div className={styles.inner}>
        <div className={styles.eyebrowRow}>
          <span className={styles.pulseDot} aria-hidden />
          <span>{eyebrow}</span>
        </div>
        <h1 className={styles.title} style={{ fontFamily: "var(--f-headline, var(--font-geist-sans))" }}>
          {title}
        </h1>
        {subtitle ? (
          <p className={styles.subtitle}>{subtitle}</p>
        ) : null}
        {stats.length > 0 ? (
          <div className={styles.statsStrip}>
            {stats.map((s) => {
              const tone =
                s.tone ?? (s.highlight ? "cyan" : "default");
              const toneClass =
                tone === "cyan"
                  ? styles.statNumCyan
                  : tone === "lime"
                    ? styles.statNumLime
                    : tone === "good"
                      ? styles.statNumGood
                      : tone === "purple"
                        ? styles.statNumPurple
                        : tone === "critical"
                          ? styles.statNumCritical
                          : tone === "warning"
                            ? styles.statNumWarning
                            : "";
              return (
                <div key={s.label}>
                  <div
                    className={`${styles.statNum} ${toneClass}`.trim()}
                    style={{ fontFamily: "var(--f-display, var(--font-geist-sans))" }}
                  >
                    {s.num}
                    {s.numSuffix ? (
                      <span className={styles.statNumSuffix}>{s.numSuffix}</span>
                    ) : null}
                  </div>
                  <div className={styles.statLabel}>{s.label}</div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
