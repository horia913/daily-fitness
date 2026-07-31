"use client";

import { macroVarianceBand } from "@/lib/macroVariance";
import styles from "./fuelPage.module.css";

export interface FuelDaySummaryCardProps {
  planName: string;
  loggedMeals: number;
  totalMeals: number;
  caloriesConsumed: number;
  caloriesGoal: number;
  protein: { consumed: number; goal: number };
  carbs: { consumed: number; goal: number };
  fat: { consumed: number; goal: number };
}

const VARIANCE_FILL = {
  on: styles.macroFillOn,
  near: styles.macroFillNear,
  off: styles.macroFillOff,
} as const;

export function FuelDaySummaryCard({
  planName,
  loggedMeals,
  totalMeals,
  caloriesConsumed,
  caloriesGoal,
  protein,
  carbs,
  fat,
}: FuelDaySummaryCardProps) {
  const goalKcal = caloriesGoal > 0 ? caloriesGoal : null;
  const kcalBand = macroVarianceBand(caloriesConsumed, caloriesGoal);

  return (
    <section
      className={styles.daySummary}
      style={{ ["--h" as string]: "var(--fc-status-success)" }}
      aria-label="Daily meal plan summary"
    >
      <div className={styles.dsRow}>
        <div className={styles.ring} aria-hidden>
          <span className={styles.ringN}>
            {loggedMeals}/{totalMeals || "—"}
          </span>
          <span className={styles.ringL}>MEALS</span>
        </div>
        <div className={styles.kcBlock}>
          <div className={styles.planLabel}>{planName}</div>
          <div className={styles.kcalRow}>
            <span
              className={styles.kcalA}
              data-band={kcalBand}
            >
              {Math.round(caloriesConsumed).toLocaleString()}
            </span>
            <span className={styles.kcalB}>
              / {goalKcal != null ? Math.round(goalKcal).toLocaleString() : "—"}{" "}
              kcal
            </span>
          </div>
        </div>
      </div>

      <div className={styles.macroGrid}>
        <MacroBar
          label="Protein"
          consumed={protein.consumed}
          goal={protein.goal}
        />
        <MacroBar
          label="Carbs"
          consumed={carbs.consumed}
          goal={carbs.goal}
        />
        <MacroBar label="Fat" consumed={fat.consumed} goal={fat.goal} />
      </div>
    </section>
  );
}

function MacroBar({
  label,
  consumed,
  goal,
}: {
  label: string;
  consumed: number;
  goal: number;
}) {
  const band = macroVarianceBand(consumed, goal);
  const pct = goal > 0 ? Math.min(100, (consumed / goal) * 100) : 0;
  const g = goal > 0 ? goal : null;
  return (
    <div className={styles.macroRow} data-band={band}>
      <span className={styles.macroLabel}>{label}</span>
      <div className={styles.macroTrack}>
        <i
          className={VARIANCE_FILL[band]}
          style={{ width: `${pct}%` }}
          aria-hidden
        />
      </div>
      <div className={styles.macroValue}>
        <b>{Math.round(consumed)}</b>
        {g != null ? ` / ${Math.round(g)} g` : " g"}
      </div>
    </div>
  );
}
