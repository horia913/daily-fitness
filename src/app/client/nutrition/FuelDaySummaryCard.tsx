"use client";

import styles from "./fuelPage.module.css";

export interface FuelDaySummaryCardProps {
  planName: string;
  dateLabel: string;
  loggedMeals: number;
  totalMeals: number;
  caloriesConsumed: number;
  caloriesGoal: number;
  protein: { consumed: number; goal: number };
  carbs: { consumed: number; goal: number };
  fat: { consumed: number; goal: number };
}

const R = 26;
const CIRC = 2 * Math.PI * R;

export function FuelDaySummaryCard({
  planName,
  dateLabel,
  loggedMeals,
  totalMeals,
  caloriesConsumed,
  caloriesGoal,
  protein,
  carbs,
  fat,
}: FuelDaySummaryCardProps) {
  const ringPct =
    totalMeals > 0 ? Math.min(1, loggedMeals / totalMeals) : 0;
  const dash = ringPct * CIRC;

  const pct = (cur: number, goal: number) =>
    goal > 0 ? Math.min(100, (cur / goal) * 100) : 0;

  const goalKcal = caloriesGoal > 0 ? caloriesGoal : null;

  return (
    <section className={styles.daySummary} aria-label="Daily meal plan summary">
      <div className={styles.daySummaryInner}>
        <div className={styles.dayHead}>
          <div className={styles.dayHeadLeft}>
            <div className={styles.eyebrowMealPlan}>Meal plan</div>
            <h2 className={styles.planName}>{planName}</h2>
            <p className={styles.planDate}>{dateLabel}</p>
          </div>
          <div className={styles.ringWrap} aria-hidden>
            <svg className={styles.ringSvg} viewBox="0 0 64 64">
              <circle className={styles.ringBg} cx="32" cy="32" r={R} />
              <circle
                className={styles.ringFg}
                cx="32"
                cy="32"
                r={R}
                strokeDasharray={`${dash} ${CIRC}`}
              />
            </svg>
            <div className={styles.ringCenter}>
              <div className={styles.ringNums}>
                {loggedMeals}
                <span>/{totalMeals || "—"}</span>
              </div>
              <div className={styles.ringMealsLabel}>Meals</div>
            </div>
          </div>
        </div>

        <div className={styles.calorieLine}>
          <span className={styles.calCurrent}>
            {Math.round(caloriesConsumed)}
          </span>
          <span className={styles.calSep}>/</span>
          <span className={styles.calTarget}>
            {goalKcal != null ? Math.round(goalKcal) : "—"}
          </span>
          <span className={styles.calUnit}>kcal</span>
        </div>

        <div className={styles.macroGrid}>
          <MacroBar
            label="Protein"
            consumed={protein.consumed}
            goal={protein.goal}
            pct={pct(protein.consumed, protein.goal)}
            fillClass={styles.macroFillProtein}
          />
          <MacroBar
            label="Carbs"
            consumed={carbs.consumed}
            goal={carbs.goal}
            pct={pct(carbs.consumed, carbs.goal)}
            fillClass={styles.macroFillCarbs}
          />
          <MacroBar
            label="Fat"
            consumed={fat.consumed}
            goal={fat.goal}
            pct={pct(fat.consumed, fat.goal)}
            fillClass={styles.macroFillFat}
          />
        </div>
      </div>
    </section>
  );
}

function MacroBar({
  label,
  consumed,
  goal,
  pct,
  fillClass,
}: {
  label: string;
  consumed: number;
  goal: number;
  pct: number;
  fillClass: string;
}) {
  const g = goal > 0 ? goal : null;
  return (
    <div className={styles.macroRow}>
      <span className={styles.macroLabel}>{label}</span>
      <div className={styles.macroTrack}>
        <div className={fillClass} style={{ width: `${pct}%` }} />
      </div>
      <div className={styles.macroValue}>
        <span>{Math.round(consumed)}</span>
        {g != null ? (
          <span style={{ color: "rgba(255,255,255,0.42)" }}> / {g}</span>
        ) : null}
        <span className={styles.macroValueUnit}> g</span>
      </div>
    </div>
  );
}
