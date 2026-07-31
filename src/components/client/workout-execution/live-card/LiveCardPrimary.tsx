"use client";

import { cn } from "@/lib/utils";
import styles from "./liveCard.module.css";
import type { LiveCardEffort, LiveCardTarget } from "./types";

function TargetValue({
  target,
  loadPct,
}: {
  target: LiveCardTarget;
  loadPct?: number | null;
}) {
  const pct =
    loadPct != null && Number.isFinite(Number(loadPct)) && Number(loadPct) > 0
      ? (
          <span className={styles.pct}>· {Math.round(Number(loadPct))}%</span>
        )
      : null;

  if (target.kind === "reps_weight") {
    return (
      <div className={styles.pval}>
        <span className={styles.big}>{target.reps}</span>
        <span className={styles.x}>×</span>
        <span className={styles.big}>{target.weight}</span>
        <span className={styles.u}>{target.unit ?? "kg"}</span>
        {pct}
      </div>
    );
  }
  if (target.kind === "reps_only") {
    return (
      <div className={styles.pval}>
        <span className={styles.big}>{target.reps}</span>
        <span className={styles.u}>{target.unit ?? "reps"}</span>
        {pct}
      </div>
    );
  }
  if (target.kind === "time") {
    return (
      <div className={styles.pval}>
        <span className={styles.big}>{target.seconds}</span>
        <span className={styles.u}>{target.unit ?? "seconds"}</span>
        {pct}
      </div>
    );
  }
  if (target.kind === "distance") {
    return (
      <div className={styles.pval}>
        <span className={styles.big}>{target.meters}</span>
        <span className={styles.u}>{target.unit ?? "metres"}</span>
        {pct}
      </div>
    );
  }
  return (
    <div className={styles.pval}>
      <span className={styles.big}>{target.value}</span>
      {target.unit ? <span className={styles.u}>{target.unit}</span> : null}
      {pct}
    </div>
  );
}

const TIER_CLASS = {
  easy: styles.effEasy,
  medium: styles.effMedium,
  hard: styles.effHard,
  max: styles.effMax,
} as const;

export function LiveCardPrimary({
  target,
  effort,
  compact,
  loadPct,
}: {
  target: LiveCardTarget;
  effort: LiveCardEffort;
  /** Smaller padding when nested in grouped gx block. */
  compact?: boolean;
  /** Coach load % of 1RM — small `· 75%` suffix on target. */
  loadPct?: number | null;
}) {
  const tierClass = effort.tier ? TIER_CLASS[effort.tier] : undefined;
  return (
    <div className={compact ? styles.gxprimary : styles.primary}>
      <div>
        <div className={styles.plbl}>Target</div>
        <TargetValue target={target} loadPct={loadPct} />
      </div>
      <div className={cn(tierClass)}>
        <div className={styles.plbl}>Effort</div>
        <div className={styles.pval}>
          {effort.label ? (
            <>
              <span className={styles.eword}>{effort.label}</span>
              {effort.rpe != null ? (
                <span className={styles.erpe}>RPE {effort.rpe}</span>
              ) : null}
            </>
          ) : (
            <span className={cn(styles.eword, styles.ewordNa)}>—</span>
          )}
        </div>
      </div>
    </div>
  );
}
