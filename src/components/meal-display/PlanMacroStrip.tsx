"use client";

import React from "react";
import type { MealPlan } from "@/lib/mealPlanService";
import {
  computeGramDelta,
  computeKcalDelta,
  formatKcal,
  hasTarget,
  roundInt,
} from "./mealDisplayUtils";
import type { MacroTotals } from "@/lib/mealPlanService";
import styles from "./mealDisplay.module.css";

const BADGE_HUES = [styles.badgeA, styles.badgeB, styles.badgeC, styles.badgeD] as const;

export function hueBadgeClass(hue: 0 | 1 | 2 | 3): string {
  return BADGE_HUES[hue];
}

export function hueOptClass(hue: 0 | 1 | 2 | 3): string {
  const map = [styles.optHueA, styles.optHueB, styles.optHueC, styles.optHueD] as const;
  return map[hue];
}

interface PlanMacroStripProps {
  computed: MacroTotals;
  targets: Pick<
    MealPlan,
    "target_calories" | "target_protein" | "target_carbs" | "target_fat"
  >;
}

function MacroColumn({
  label,
  valueMain,
  valueSuffix,
  delta,
}: {
  label: string;
  valueMain: React.ReactNode;
  valueSuffix: React.ReactNode;
  delta: ReturnType<typeof computeKcalDelta>;
}) {
  return (
    <div className={styles.mc}>
      <div className={styles.mcLabel}>{label}</div>
      <div className={styles.mcValue}>
        {valueMain}
        {valueSuffix}
      </div>
      {delta ? (
        <div
          className={`${styles.mcDelta} ${delta.colorClass === "good" ? styles.deltaGood : styles.deltaWarn}`}
        >
          {delta.text}
        </div>
      ) : null}
    </div>
  );
}

export function PlanMacroStrip({ computed, targets }: PlanMacroStripProps) {
  const kcalDelta = hasTarget(targets.target_calories)
    ? computeKcalDelta(computed.calories, targets.target_calories)
    : null;
  const pDelta = hasTarget(targets.target_protein)
    ? computeGramDelta(computed.protein, targets.target_protein, "G")
    : null;
  const cDelta = hasTarget(targets.target_carbs)
    ? computeGramDelta(computed.carbs, targets.target_carbs, "G")
    : null;
  const fDelta = hasTarget(targets.target_fat)
    ? computeGramDelta(computed.fat, targets.target_fat, "G")
    : null;

  return (
    <div className={styles.macros}>
      <MacroColumn
        label="Calories"
        valueMain={formatKcal(computed.calories)}
        valueSuffix={
          hasTarget(targets.target_calories) ? (
            <span className={styles.mcOf}> / {formatKcal(targets.target_calories!)}</span>
          ) : (
            <span className={styles.mcOf}> / —</span>
          )
        }
        delta={kcalDelta}
      />
      <MacroColumn
        label="Protein"
        valueMain={<>{roundInt(computed.protein)}</>}
        valueSuffix={
          hasTarget(targets.target_protein) ? (
            <span className={styles.mcOf}>g / {roundInt(targets.target_protein!)}</span>
          ) : (
            <span className={styles.mcOf}>g / —</span>
          )
        }
        delta={pDelta}
      />
      <MacroColumn
        label="Carbs"
        valueMain={<>{roundInt(computed.carbs)}</>}
        valueSuffix={
          hasTarget(targets.target_carbs) ? (
            <span className={styles.mcOf}>g / {roundInt(targets.target_carbs!)}</span>
          ) : (
            <span className={styles.mcOf}>g / —</span>
          )
        }
        delta={cDelta}
      />
      <MacroColumn
        label="Fat"
        valueMain={<>{roundInt(computed.fat)}</>}
        valueSuffix={
          hasTarget(targets.target_fat) ? (
            <span className={styles.mcOf}>g / {roundInt(targets.target_fat!)}</span>
          ) : (
            <span className={styles.mcOf}>g / —</span>
          )
        }
        delta={fDelta}
      />
      <div className={styles.legendC}>
        <span className={styles.legendLine}>COMPUTED FROM MEALS / TARGET</span>
        <span className={styles.legendLine}>±5% KCAL · ±8G MACROS = ON TARGET</span>
      </div>
    </div>
  );
}
