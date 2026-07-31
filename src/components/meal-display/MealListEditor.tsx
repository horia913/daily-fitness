"use client";

import React, {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type { MealTypeValue } from "@/types/mealPlanDraft";
import type { DraftPlanMeal } from "@/types/mealPlanDraft";
import type { Food } from "@/lib/mealPlanService";
import {
  formatFoodMacros,
  formatKcal,
  mealTypeBadge,
  optionHueIndex,
  roundInt,
} from "./mealDisplayUtils";
import { computeFoodMacros } from "@/lib/mealPlans/mealPlanDraftUtils";
import { hueBadgeClass, hueOptClass } from "./PlanMacroStrip";
import { InlineFoodSearch, type InlineFoodSearchHandle } from "./InlineFoodSearch";
import styles from "./mealDisplay.module.css";

const MEAL_TYPES: { value: MealTypeValue; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

export interface MealListEditorHandle {
  openFoodSearch: () => void;
}

export interface MealListEditorProps {
  meals: DraftPlanMeal[];
  openMealId: string | null;
  maxOptionsPerMeal: number;
  onToggleMeal: (mealId: string) => void;
  onUpdateMeal: (mealId: string, patch: Partial<{ name: string; mealType: MealTypeValue }>) => void;
  onDeleteMeal: (mealId: string) => void;
  onAddOption: (mealId: string) => void;
  onUpdateOption: (mealId: string, optionId: string, patch: Partial<{ name: string }>) => void;
  onDeleteOption: (mealId: string, optionId: string) => void;
  onAddFood: (mealId: string, optionId: string, food: Food) => void;
  onRemoveFood: (mealId: string, optionId: string, foodItemId: string) => void;
  onUpdateFoodQuantity: (
    mealId: string,
    optionId: string,
    foodItemId: string,
    quantity: number,
  ) => void;
  onAddMeal: () => void;
}

export const MealListEditor = forwardRef<MealListEditorHandle, MealListEditorProps>(
  function MealListEditor(
    {
      meals,
      openMealId,
      maxOptionsPerMeal,
      onToggleMeal,
      onUpdateMeal,
      onDeleteMeal,
      onAddOption,
      onUpdateOption,
      onDeleteOption,
      onAddFood,
      onRemoveFood,
      onUpdateFoodQuantity,
      onAddMeal,
    },
    ref,
  ) {
    const [foodSearchKey, setFoodSearchKey] = useState<string | null>(null);
    const foodSearchRef = useRef<InlineFoodSearchHandle>(null);

    const foodSearchOptionId = foodSearchKey
      ? (foodSearchKey.split("::")[1] ?? null)
      : null;
    const foodSearchMealId = foodSearchKey
      ? (foodSearchKey.split("::")[0] ?? null)
      : null;

    const planFoodIds = useMemo(() => {
      const ids = new Set<string>();
      meals.forEach((m) =>
        m.options.forEach((o) => o.foods.forEach((f) => ids.add(f.foodId))),
      );
      return [...ids];
    }, [meals]);

    useImperativeHandle(ref, () => ({
      openFoodSearch: () => {
        if (!openMealId) return;
        const meal = meals.find((m) => m.id === openMealId);
        const firstOpt = meal?.options[0];
        if (!firstOpt) return;
        setFoodSearchKey(`${openMealId}::${firstOpt.id}`);
        requestAnimationFrame(() => {
          foodSearchRef.current?.focusInput();
        });
      },
    }));

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
                  {isOpen ? (
                    <>
                      <input
                        type="text"
                        className={styles.inlineNameInput}
                        value={meal.name}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => onUpdateMeal(meal.id, { name: e.target.value })}
                      />
                      <select
                        className={styles.inlineTypeSelect}
                        value={meal.mealType}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          onUpdateMeal(meal.id, {
                            mealType: e.target.value as MealTypeValue,
                          })
                        }
                      >
                        {MEAL_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <div className={styles.mname}>{meal.name}</div>
                  )}
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
                    aria-label={`Delete ${meal.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Are you sure you want to delete this meal?")) {
                        onDeleteMeal(meal.id);
                      }
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
                    const searchOpen =
                      foodSearchMealId === meal.id && foodSearchOptionId === option.id;

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
                            <input
                              type="text"
                              className={styles.inlineOptionName}
                              value={option.name}
                              onChange={(e) =>
                                onUpdateOption(meal.id, option.id, { name: e.target.value })
                              }
                            />
                            {showOptionMacros ? (
                              <>
                                <span className={styles.sep}>·</span>
                                {formatFoodMacros(option.totals)}
                              </>
                            ) : null}
                          </span>
                          {meal.options.length > 1 ? (
                            <button
                              type="button"
                              className={styles.oRemove}
                              onClick={() => {
                                if (
                                  confirm(
                                    "Delete this option? All foods in this option will be removed.",
                                  )
                                ) {
                                  onDeleteOption(meal.id, option.id);
                                }
                              }}
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                        {option.foods.map((food) => {
                          const macros = computeFoodMacros(food);
                          return (
                            <div key={food.id} className={styles.food}>
                              <span className={styles.fn}>
                                {food.foodName}
                                <input
                                  type="number"
                                  className={styles.inlineQtyInput}
                                  value={food.quantity}
                                  min={0}
                                  step={0.1}
                                  onChange={(e) =>
                                    onUpdateFoodQuantity(
                                      meal.id,
                                      option.id,
                                      food.id,
                                      parseFloat(e.target.value) || 0,
                                    )
                                  }
                                />
                                <span className={styles.fq}>{food.unit}</span>
                              </span>
                              <span className={styles.fm}>{formatFoodMacros(macros)}</span>
                              <button
                                type="button"
                                className={styles.foodRemove}
                                aria-label={`Remove ${food.foodName}`}
                                onClick={() => onRemoveFood(meal.id, option.id, food.id)}
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })}
                        {searchOpen ? (
                          <InlineFoodSearch
                            ref={foodSearchRef}
                            planFoodIds={planFoodIds}
                            onSelect={(f) => {
                              onAddFood(meal.id, option.id, f);
                              setFoodSearchKey(null);
                            }}
                            onCancel={() => setFoodSearchKey(null)}
                          />
                        ) : (
                          <button
                            type="button"
                            className={styles.addFood}
                            onClick={() => setFoodSearchKey(`${meal.id}::${option.id}`)}
                          >
                            ＋ Add food
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {meal.options.length < maxOptionsPerMeal ? (
                    <button
                      type="button"
                      className={styles.addOption}
                      onClick={() => onAddOption(meal.id)}
                    >
                      ＋ Add option
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
        <button type="button" className={styles.addMealRow} onClick={onAddMeal}>
          ＋ Add meal
        </button>
      </div>
    );
  },
);
