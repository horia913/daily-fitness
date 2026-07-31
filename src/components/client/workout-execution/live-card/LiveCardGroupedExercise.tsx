"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import styles from "./liveCard.module.css";
import { LiveCardPrimary } from "./LiveCardPrimary";
import { LiveCardNote } from "./LiveCardTechnique";
import type { LiveCardEffort, LiveCardTarget } from "./types";

export function LiveCardGroupedExercise({
  badge,
  name,
  target,
  effort,
  loadPct,
  note,
  hint,
  logged,
  loggedValue,
  logSlot,
}: {
  badge: string;
  name: string;
  target: LiveCardTarget;
  effort: LiveCardEffort;
  /** Coach load % — small suffix on target. */
  loadPct?: number | null;
  /** Client-facing coach note when set. */
  note?: string | null;
  /** Compact tempo/last hint (no full 3-stat strip). */
  hint?: string | null;
  logged?: boolean;
  loggedValue?: string;
  logSlot?: ReactNode;
}) {
  return (
    <div className={cn(styles.gx, logged && styles.logged)}>
      <div className={styles.gxhead}>
        <span className={styles.gxbadge}>{badge}</span>
        <span className={styles.gxname}>{name}</span>
        {logged && loggedValue ? (
          <span className={styles.loggedval}>{loggedValue}</span>
        ) : null}
        {logged ? <span className={styles.ok}>✓</span> : null}
      </div>
      {!logged ? (
        <>
          <LiveCardPrimary
            target={target}
            effort={effort}
            compact
            loadPct={loadPct}
          />
          {hint ? <div className={styles.gxHint}>{hint}</div> : null}
          {note?.trim() ? <LiveCardNote>{note.trim()}</LiveCardNote> : null}
          {logSlot ? <div className={styles.gxlog}>{logSlot}</div> : null}
        </>
      ) : null}
    </div>
  );
}

export function LiveCardGlue({
  children,
  timer,
  resting,
}: {
  children: ReactNode;
  timer?: string | null;
  resting?: boolean;
}) {
  return (
    <div className={cn(styles.glue, resting && styles.glueResting)}>
      <span>{children}</span>
      {timer ? <span className={styles.glueTimer}>{timer}</span> : null}
    </div>
  );
}
