"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import styles from "./liveCard.module.css";
import type { LiveCardHue, LiveCardStatus } from "./types";
import { useLiveRestTimer } from "../LiveRestTimerContext";
import { LiveCardGlue } from "./LiveCardGroupedExercise";

const HUE_CLASS: Record<LiveCardHue, string> = {
  a: styles.hueA,
  b: styles.hueB,
  c: styles.hueC,
  d: styles.hueD,
};

export interface LiveCardProps {
  hue?: LiveCardHue;
  heading: string;
  status?: LiveCardStatus;
  statusLabel?: string;
  children: ReactNode;
  className?: string;
  /**
   * When `auto` (default), inject resting glue from LiveRestTimerContext.
   * Grouped cards that own their glue should pass `none` and feed the timer themselves.
   */
  restGlue?: "auto" | "none";
}

function defaultStatusLabel(status: LiveCardStatus): string {
  switch (status) {
    case "resting":
      return "● Resting";
    case "complete":
      return "● Done";
    default:
      return "● Logging now";
  }
}

/** Transparent shell + hue left rail + lhead. */
export function LiveCard({
  hue = "a",
  heading,
  status = "logging",
  statusLabel,
  children,
  className,
  restGlue = "auto",
}: LiveCardProps) {
  const rest = useLiveRestTimer();
  const isResting = Boolean(rest?.isResting) && status !== "complete";
  const effectiveStatus: LiveCardStatus = isResting ? "resting" : status;
  const effectiveLabel =
    statusLabel != null && !isResting
      ? statusLabel
      : defaultStatusLabel(effectiveStatus);

  return (
    <div className={cn(styles.live, HUE_CLASS[hue], className)}>
      <div className={styles.lhead}>
        <span className={styles.lheadTitle}>{heading}</span>
        <span
          className={cn(
            styles.lheadStatus,
            effectiveStatus === "resting" && styles.lheadStatusResting,
          )}
        >
          {effectiveLabel}
        </span>
      </div>
      {children}
      {isResting && restGlue === "auto" && rest ? (
        <LiveCardGlue resting timer={rest.countdownLabel}>
          {`↺ resting — Set ${rest.nextSetNumber ?? "—"} next`}
        </LiveCardGlue>
      ) : null}
    </div>
  );
}

export function LiveCardExerciseName({
  name,
  badge,
  endSlot,
}: {
  name: string;
  badge?: string;
  /** Swap / video actions — sits at end of name row (mockup `.exrow`). */
  endSlot?: ReactNode;
}) {
  return (
    <div className={styles.exrow}>
      <div className={styles.exname}>
        {badge ? <span className={styles.badge}>{badge}</span> : null}
        {name}
      </div>
      {endSlot}
    </div>
  );
}
