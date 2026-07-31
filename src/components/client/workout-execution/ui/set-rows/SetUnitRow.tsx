"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import styles from "./setUnitRow.module.css";

/** Mockup `.srow` — thin one-line set/unit row (done or upcoming). Not an input row. */
export function SetUnitRow({
  label,
  summary,
  done = false,
  onSelect,
  className,
}: {
  /** e.g. "Set 1" / "Round 2" */
  label: string;
  /** Logged value (done) or target summary (upcoming) */
  summary: ReactNode;
  done?: boolean;
  /** Upcoming rows: tap to jump the active log to this set */
  onSelect?: () => void;
  className?: string;
}) {
  const interactive = Boolean(onSelect) && !done;
  const classNames = cn(styles.srow, done && styles.done, className);

  if (interactive) {
    return (
      <button
        type="button"
        className={classNames}
        onClick={onSelect}
        aria-label={`Go to ${label}`}
      >
        <span className={styles.tick} aria-hidden>
          {done ? "✓" : null}
        </span>
        <span className={styles.sn}>{label}</span>
        <span className={styles.sx}>{summary}</span>
      </button>
    );
  }

  return (
    <div className={classNames}>
      <span className={styles.tick} aria-hidden>
        {done ? "✓" : null}
      </span>
      <span className={styles.sn}>{label}</span>
      <span className={styles.sx}>{summary}</span>
    </div>
  );
}
