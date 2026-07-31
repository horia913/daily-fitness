"use client";

import React from "react";
import {
  formatFoodMacros,
  formatKcal,
  formatQty,
  mealTypeBadge,
  optionHueIndex,
  roundInt,
} from "./mealDisplayUtils";
import { hueBadgeClass, hueOptClass } from "./PlanMacroStrip";
import type { DisplayPlanMeal } from "./types";
import styles from "./mealDisplay.module.css";

export interface MealListDisplayProps {
  meals: DisplayPlanMeal[];
  openMealId: string | null;
  onToggleMeal: (mealId: string) => void;
  onEditMeal: (meal: DisplayPlanMeal) => void;
  onDeleteMeal: (mealId: string) => void;
  onEditOption: (meal: DisplayPlanMeal) => void;
  onAddOption: (mealId: string) => void;
}

export function MealListDisplay({
  meals,
  openMealId,
  onToggleMeal,
  onEditMeal,
  onDeleteMeal,
  onEditOption,
  onAddOption,
}: MealListDisplayProps) {
  return (
    <div className={styles.mlist}>
      {meals.map((meal) => {
        const isOpen = openMealId === meal.id;
        const typeBadge = mealTypeBadge(meal.mealType);
        const optionCount = meal.options.length;
        const optionLabel = `${optionCount} option${optionCount === 1 ? "" : "s"}`;

        return (
          <article
            key={meal.id}
            className={`${styles.mrow} ${isOpen ? styles.mrowOpen : ""}`}
          >
            <div
              className={styles.mhead}
              onClick={() => onToggleMeal(meal.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onToggleMeal(meal.id);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <span className={`${styles.badge} ${hueBadgeClass(typeBadge.hue)}`}>
                {typeBadge.letter}
              </span>
              <div className={styles.mb}>
                <div className={styles.mname}>{meal.name}</div>
                <div className={styles.mrx}>
                  <b>{formatKcal(meal.rowTotals.calories)} kcal</b>
                  <span className={styles.sep}>·</span>
                  P {roundInt(meal.rowTotals.protein)}
                  <span className={styles.sep}>·</span>
                  C {roundInt(meal.rowTotals.carbs)}
                  <span className={styles.sep}>·</span>
                  F {roundInt(meal.rowTotals.fat)}
                  <span className={styles.sep}>·</span>
                  {optionLabel}
                </div>
              </div>
              <div className={styles.mact}>
                <button
                  type="button"
                  className={styles.icb}
                  aria-label={`Edit ${meal.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditMeal(meal);
                  }}
                >
                  ✎
                </button>
                <button
                  type="button"
                  className={styles.icb}
                  aria-label={`Delete ${meal.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteMeal(meal.id);
                  }}
                >
                  🗑
                </button>
              </div>
              <span className={styles.chev} aria-hidden>
                ›
              </span>
            </div>

            <div className={styles.mbody}>
              <div className={styles.minner}>
                {meal.options.map((option, optionIndex) => {
                  const hue = optionHueIndex(optionIndex);
                  const subBadge = `${typeBadge.letter}${optionIndex + 1}`;
                  const showOptionMacros = meal.options.length > 1;

                  return (
                    <div
                      key={option.id}
                      className={`${styles.opt} ${hueOptClass(hue)}`}
                    >
                      <div className={styles.ohead}>
                        <span className={`${styles.badge} ${hueBadgeClass(hue)}`}>
                          {subBadge}
                        </span>
                        <span className={styles.ometa}>
                          <b>{option.name}</b>
                          {showOptionMacros ? (
                            <>
                              <span className={styles.sep}>·</span>
                              {formatFoodMacros(option.totals).replace(" kcal", " kcal")}
                            </>
                          ) : null}
                        </span>
                        <button
                          type="button"
                          className={styles.oedit}
                          onClick={() => onEditOption(meal)}
                        >
                          Edit option →
                        </button>
                      </div>
                      {option.foods.map((food) => (
                        <div key={food.id} className={styles.food}>
                          <span className={styles.fn}>
                            {food.foodName}
                            <span className={styles.fq}>
                              {formatQty(food.quantity, food.unit)}
                            </span>
                          </span>
                          <span className={styles.fm}>{formatFoodMacros(food.macros)}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
                <button
                  type="button"
                  className={styles.addOption}
                  onClick={() => onAddOption(meal.id)}
                >
                  ＋ Add option
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
