"use client";

import React from "react";
import { Calendar, Check, Clock, Star, Trophy } from "lucide-react";
import type { CompleteAccent } from "./types";
import styles from "./clientWorkoutCompleteV1.module.css";
type ConfettiLevel = "full" | "light" | "none";

const CONFETTI_FULL = [
  { top: "12%", left: "8%", bg: "var(--lime)", delay: "0s" },
  { top: "18%", right: "10%", bg: "var(--cyan)", delay: "0.4s" },
  { top: "8%", left: "42%", bg: "var(--purple)", delay: "0.8s" },
  { top: "22%", right: "22%", bg: "var(--lime)", delay: "1.1s" },
  { bottom: "14%", left: "16%", bg: "var(--cyan)", delay: "0.2s" },
  { bottom: "10%", right: "12%", bg: "var(--rose)", delay: "0.6s" },
];

const CONFETTI_LIGHT = CONFETTI_FULL.slice(0, 3);

export function CelebrationHero(props: {
  accent: CompleteAccent;
  confetti: ConfettiLevel;
  title: string;
  durationParts: { mins: number; secs: number };
  dayLabel: string;
  headlineNumber: string;
  headlineUnit?: string | null;
  headlineLabel: string;
  deltaTier: "up" | "same" | "down" | "baseline";
  deltaNode: React.ReactNode;
  icon: "trophy" | "check" | "star";
}) {
  const dots = props.confetti === "none" ? [] : props.confetti === "light" ? CONFETTI_LIGHT : CONFETTI_FULL;

  const Icon =
    props.icon === "trophy" ? Trophy : props.icon === "star" ? Star : Check;

  return (
    <section className={styles.hero} data-accent={props.accent}>
      <div className={styles.heroGlow} aria-hidden />
      <div className={styles.heroTopBar} aria-hidden />
      {dots.map((d, i) => (
        <span
          key={i}
          className={styles.confetti}
          style={{
            ...(d.top ? { top: d.top } : {}),
            ...(d.bottom ? { bottom: d.bottom } : {}),
            ...(d.left ? { left: d.left } : {}),
            ...(d.right ? { right: d.right } : {}),
            background: d.bg,
            animationDelay: d.delay,
          }}
          aria-hidden
        />
      ))}
      <div className={styles.trophyWrap}>
        <div className={styles.trophy}>
          <Icon size={42} strokeWidth={2.2} aria-hidden />
        </div>
        <div className={styles.trophyBadge}>
          <Check size={13} strokeWidth={3} aria-hidden />
        </div>
      </div>
      <div className={styles.eyebrowRow}>
        <span className={styles.pulseDot} aria-hidden />
        Workout complete
      </div>
      <h1 className={styles.heroTitle}>{props.title}</h1>
      <div className={styles.subtitleRow}>
        <Clock size={11} aria-hidden />
        <span className={styles.subtitleDur}>
          {props.durationParts.mins}m {props.durationParts.secs}s
        </span>
        <span aria-hidden>·</span>
        <Calendar size={11} aria-hidden />
        <span>{props.dayLabel}</span>
      </div>
      <div className={styles.headlineBlock}>
        <div>
          <span className={styles.headlineNum}>{props.headlineNumber}</span>
          {props.headlineUnit ? (
            <span className={styles.headlineUnit}>{props.headlineUnit}</span>
          ) : null}
        </div>
        <span className={styles.headlineLabel}>{props.headlineLabel}</span>
        <span
          className={styles.deltaPill}
          data-tier={
            props.deltaTier === "up"
              ? "up"
              : props.deltaTier === "same"
                ? "same"
                : props.deltaTier === "down"
                  ? "down"
                  : "baseline"
          }
        >
          {props.deltaNode}
        </span>
      </div>
    </section>
  );
}
