"use client";

/**
 * Last-session card — v6 hairline panel (mockup log-field-options-375).
 * Header: "Last session" · date · N sets
 * Rows: index · reps × weight · effort word (tier colour) or muted —
 */

import React, { useEffect, useMemo, useState } from "react";
import type { LastSessionSetRow } from "@/lib/clientProgressionService";
import {
  clientEffortLabelFromStoredRpe,
  rpeToEffortTier,
  type EffortTier,
} from "@/lib/workoutEffortLabels";
import { cn } from "@/lib/utils";
import { formatLiveLastDate } from "../live-card/formatLiveCard";
import styles from "./lastSessionSetsSection.module.css";

function formatWeightKg(kg: number | null): string {
  if (kg == null || Number.isNaN(Number(kg))) return "—";
  const n = Math.round(Number(kg) * 10) / 10;
  return String(n);
}

const TIER_CLASS: Record<EffortTier, string> = {
  easy: styles.effEasy,
  medium: styles.effMedium,
  hard: styles.effHard,
  max: styles.effMax,
};

export interface LastSessionWorkoutSummary {
  weight: number | null;
  reps: number | null;
  avgRpe: number | null;
  date?: string | null;
  setDetails?: LastSessionSetRow[] | null;
}

interface LastSessionSetsSectionProps {
  lastWorkout: LastSessionWorkoutSummary | null | undefined;
}

export function LastSessionSetsSection({
  lastWorkout,
}: LastSessionSetsSectionProps) {
  const details = lastWorkout?.setDetails;
  const hasRows = Array.isArray(details) && details.length > 0;
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setShowAll(false);
  }, [lastWorkout]);

  const sortedSets = useMemo(() => {
    if (!hasRows || !details) return [];
    return [...details].sort((a, b) => a.set_number - b.set_number);
  }, [details, hasRows]);

  const totalSets = sortedSets.length;
  const visibleSets =
    !showAll && totalSets > 5 ? sortedSets.slice(0, 5) : sortedSets;
  const hasMore = totalSets > 5;

  const dateLabel = formatLiveLastDate(lastWorkout?.date ?? null);
  const metaParts = [
    dateLabel,
    hasRows ? `${totalSets} set${totalSets === 1 ? "" : "s"}` : null,
  ].filter(Boolean);
  const headerRight = metaParts.join(" · ");

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <span className={styles.title}>Last session</span>
        <div className={styles.headRight}>
          {headerRight ? (
            <span className={styles.meta}>{headerRight}</span>
          ) : null}
          {hasMore ? (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className={styles.moreBtn}
            >
              {showAll ? "Show less" : `Show all ${totalSets} →`}
            </button>
          ) : null}
        </div>
      </div>

      {!lastWorkout ? (
        <p className={styles.empty}>No previous data</p>
      ) : hasRows ? (
        <div className={styles.rows}>
          {visibleSets.map((set, i) => (
            <HistRow
              key={`${set.set_number}-${i}`}
              setNumber={set.set_number}
              weightKg={set.weight_kg}
              reps={set.reps_completed}
              rpe={set.rpe ?? null}
            />
          ))}
        </div>
      ) : (
        <div className={styles.rows}>
          <HistRow
            setNumber={null}
            weightKg={lastWorkout.weight}
            reps={lastWorkout.reps}
            rpe={
              lastWorkout.avgRpe != null && lastWorkout.avgRpe > 0
                ? Math.round(lastWorkout.avgRpe)
                : null
            }
          />
        </div>
      )}
      <div className={styles.safePad} aria-hidden />
    </div>
  );
}

interface HistRowProps {
  setNumber: number | null;
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
}

function HistRow({ setNumber, weightKg, reps, rpe }: HistRowProps) {
  const tier = rpeToEffortTier(rpe);
  const label = clientEffortLabelFromStoredRpe(rpe);
  const hasEffort = Boolean(tier && label);

  const val =
    reps != null && weightKg != null
      ? `${reps} × ${formatWeightKg(weightKg)} kg`
      : reps != null
        ? `${reps} reps`
        : weightKg != null
          ? `${formatWeightKg(weightKg)} kg`
          : "—";

  return (
    <div className={styles.row}>
      <span className={styles.idx}>{setNumber ?? "—"}</span>
      <span className={styles.val}>{val}</span>
      <span
        className={cn(
          styles.eff,
          hasEffort && tier ? TIER_CLASS[tier] : styles.effNa,
        )}
      >
        {hasEffort ? label : "—"}
      </span>
    </div>
  );
}
