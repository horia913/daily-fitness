"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle, MessageCircle, Phone, Settings } from "lucide-react";
import type { AttentionLevel } from "@/lib/coachClientAttention";
import styles from "./ClientHeaderCard.module.css";
import { CoachStandingNote } from "./CoachStandingNote";

type Props = {
  clientId: string;
  name: string;
  email: string;
  initials: string;
  /** Instance program adherence: completed / scheduled required workouts this week */
  programAdherence?: { completed: number; scheduled: number } | null;
  /** Fallback when completed/scheduled counts are unavailable (e.g. check-ins hub) */
  adherencePct?: number | null;
  /** Program progress week X of N */
  progress?: { currentWeek: number; totalWeeks: number } | null;
  streakDays: number;
  alertCount: number;
  trainedToday: boolean;
  attentionLevel: AttentionLevel;
  /** Shown in alert bar after bold lead */
  attentionDetail: string | null;
  phone?: string | null;
  onMessage: () => void;
  /** When set, overrides auto flag (critical left-stripe + alert bar). */
  flagged?: boolean;
  /** Private standing coach note; omit to hide the note row (e.g. check-ins hub). */
  standingNote?: string | null;
  onStandingNoteSaved?: (note: string | null) => void;
};

function adherencePillVariant(pct: number | null): "good" | "warn" | "crit" | "muted" {
  if (pct == null || Number.isNaN(pct)) return "muted";
  if (pct < 40) return "crit";
  if (pct < 70) return "warn";
  return "good";
}

export default function ClientHeaderCard({
  clientId,
  name,
  email,
  initials,
  programAdherence,
  adherencePct: adherencePctProp,
  progress,
  streakDays,
  alertCount,
  trainedToday,
  attentionLevel,
  attentionDetail,
  phone,
  onMessage,
  flagged: flaggedProp,
  standingNote,
  onStandingNoteSaved,
}: Props) {
  const adherencePct =
    programAdherence && programAdherence.scheduled > 0
      ? Math.round((programAdherence.completed / programAdherence.scheduled) * 100)
      : adherencePctProp != null && !Number.isNaN(adherencePctProp)
        ? Math.round(adherencePctProp)
        : null;
  const adVariant = adherencePillVariant(adherencePct);
  const flagged =
    flaggedProp !== undefined
      ? flaggedProp
      : attentionLevel === "urgent" || (adherencePct != null && adherencePct < 40);

  const avatarTone: "default" | "healthy" | "varied" =
    attentionLevel === "good" && trainedToday
      ? "healthy"
      : attentionLevel === "warning"
        ? "varied"
        : "default";

  const dotClass =
    attentionLevel === "urgent"
      ? styles.dotCrit
      : attentionLevel === "warning"
        ? styles.dotWarn
        : styles.dotGood;

  const pillClass = (v: "good" | "warn" | "crit" | "muted") => {
    if (v === "good") return `${styles.pill} ${styles.pillGood}`;
    if (v === "warn") return `${styles.pill} ${styles.pillWarn}`;
    if (v === "crit") return `${styles.pill} ${styles.pillCrit}`;
    return `${styles.pill} ${styles.pillMuted}`;
  };

  const streakPillVariant =
    streakDays > 7 ? ("good" as const) : ("muted" as const);

  const toneClass =
    flagged || attentionLevel === "urgent"
      ? styles.toneCrit
      : attentionLevel === "warning"
        ? styles.toneWarn
        : attentionLevel === "good"
          ? styles.toneGood
          : styles.toneMuted;

  return (
    <article
      className={`${styles.card} ${toneClass} ${flagged ? styles.flagged : ""}`}
      data-flagged={flagged ? "1" : "0"}
    >
      <div className={styles.inner}>
        <div className={styles.topRow}>
          <div className={styles.avatarWrap}>
            <div
              className={`${styles.avatar} ${
                avatarTone === "healthy"
                  ? styles.avatarHealthy
                  : avatarTone === "varied"
                    ? styles.avatarVaried
                    : styles.avatarDefault
              }`}
              aria-hidden
            >
              {initials}
            </div>
            <span className={`${styles.statusDot} ${dotClass}`} title="Status" />
          </div>
          <div className={styles.meta}>
            <h1 className={styles.name} style={{ fontFamily: "var(--f-headline, var(--font-geist-sans))" }}>
              {name}
            </h1>
            <p className={styles.email}>{email || "No email on file"}</p>
          </div>
          <div className={styles.actions}>
            {phone ? (
              <a className={styles.iconBtn} href={`tel:${phone}`} aria-label="Call client">
                <Phone className="h-4 w-4" aria-hidden />
              </a>
            ) : (
              <span className={styles.iconBtn} aria-label="No phone on file" title="No phone on file">
                <Phone className="h-4 w-4 opacity-35" aria-hidden />
              </span>
            )}
            <button
              type="button"
              className={styles.iconBtn}
              aria-label="Message client"
              onClick={onMessage}
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
            </button>
            <Link
              href={`/coach/clients/${clientId}/profile`}
              className={styles.iconBtn}
              aria-label="Client settings"
            >
              <Settings className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>

        <div className={styles.pillRow}>
          {programAdherence && programAdherence.scheduled > 0 ? (
            <span className={pillClass(adVariant)}>
              Adherence {programAdherence.completed}/{programAdherence.scheduled}
            </span>
          ) : adherencePct != null ? (
            <span className={pillClass(adVariant)}>Adherence {adherencePct}%</span>
          ) : null}
          {progress && progress.totalWeeks > 0 ? (
            <span className={pillClass("muted")}>
              Progress W{progress.currentWeek}/{progress.totalWeeks}
            </span>
          ) : null}
          <span className={pillClass(streakPillVariant)}>{streakDays}d streak</span>
          {alertCount > 0 ? (
            <span className={pillClass("crit")}>{alertCount} alerts</span>
          ) : null}
          {!trainedToday ? (
            <span className={pillClass("muted")}>No session today</span>
          ) : null}
        </div>

        {flagged && attentionDetail ? (
          <div className={styles.alertBar}>
            <AlertTriangle
              className="mt-0.5 h-3.5 w-3.5 shrink-0"
              style={{ color: "var(--fc-effort-max)" }}
              aria-hidden
            />
            <p className={styles.alertText}>
              <strong style={{ color: "var(--fc-effort-max)" }}>Flagged at-risk</strong>
              <span> · {attentionDetail}</span>
            </p>
          </div>
        ) : attentionDetail ? (
          <p className={styles.reasonLine}>{attentionDetail}</p>
        ) : null}

        {standingNote !== undefined ? (
          <CoachStandingNote
            clientId={clientId}
            initialNote={standingNote}
            onSaved={onStandingNoteSaved}
          />
        ) : null}
      </div>
    </article>
  );
}
