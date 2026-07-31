"use client";

import React from "react";
import Link from "next/link";
import type { MealPlan } from "@/lib/mealPlanService";
import type { DraftPlanMeal } from "@/types/mealPlanDraft";
import { PlanMacroStrip } from "./PlanMacroStrip";
import { MealListEditor, type MealListEditorHandle } from "./MealListEditor";
import { MealPlanSaveButton } from "./MealPlanSaveButton";
import { computePlanTotalsFromMeals } from "./loadPlanBuilderMeals";
import type { MealPlanSaveUiState } from "@/types/mealPlanDraft";
import type { Food } from "@/lib/mealPlanService";
import type { MealTypeValue } from "@/types/mealPlanDraft";
import styles from "./mealDisplay.module.css";

export interface CoachPlanBuilderViewProps {
  mealPlan: MealPlan;
  meals: DraftPlanMeal[];
  assignedCount: number;
  openMealId: string | null;
  saveState: MealPlanSaveUiState;
  isDirty: boolean;
  saveError: string | null;
  maxOptionsPerMeal: number;
  onToggleMeal: (mealId: string) => void;
  onEditMetadata: () => void;
  onAssign: () => void;
  onSave: () => void;
  onAddMeal: () => void;
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
  onBackNavigate?: () => boolean;
  mealListEditorRef?: React.Ref<MealListEditorHandle>;
}

export function CoachPlanBuilderView({
  mealPlan,
  meals,
  assignedCount,
  openMealId,
  saveState,
  isDirty,
  saveError,
  maxOptionsPerMeal,
  onToggleMeal,
  onEditMetadata,
  onAssign,
  onSave,
  onAddMeal,
  onUpdateMeal,
  onDeleteMeal,
  onAddOption,
  onUpdateOption,
  onDeleteOption,
  onAddFood,
  onRemoveFood,
  onUpdateFoodQuantity,
  onBackNavigate,
  mealListEditorRef,
}: CoachPlanBuilderViewProps) {
  const computed = computePlanTotalsFromMeals(meals);
  const notes = (mealPlan.notes ?? mealPlan.description ?? "").trim();
  const clientLabel = `${assignedCount} client${assignedCount === 1 ? "" : "s"} assigned`;

  const handleBackClick = (e: React.MouseEvent) => {
    if (onBackNavigate && !onBackNavigate()) {
      e.preventDefault();
    }
  };

  return (
    <div className={styles.page}>
      <Link href="/coach/nutrition" className={styles.back} onClick={handleBackClick}>
        ‹ Nutrition
      </Link>

      <div className={styles.headerRow}>
        <div className={styles.headerLeft}>
          <h1 className={styles.h1}>{mealPlan.name}</h1>
          <button
            type="button"
            className={styles.pencil}
            aria-label="Edit plan metadata"
            onClick={onEditMetadata}
          >
            ✎
          </button>
          {mealPlan.is_active ? (
            <span className={`${styles.pill} ${styles.pillGood}`}>
              <span className={styles.pillDot} aria-hidden />
              Active
            </span>
          ) : (
            <span className={`${styles.pill} ${styles.pillMute}`}>
              <span className={styles.pillDot} aria-hidden />
              Inactive
            </span>
          )}
          <span className={styles.assignedCount}>{clientLabel}</span>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.ghostBtn} onClick={onAssign}>
            ◉+ Assign
          </button>
          <MealPlanSaveButton
            saveState={saveState}
            isDirty={isDirty}
            errorMessage={saveError}
            onSave={onSave}
          />
        </div>
      </div>

      <PlanMacroStrip computed={computed} targets={mealPlan} />

      <div className={styles.sectionHeadRow}>
        <span className={styles.sect}>Meals · {meals.length}</span>
        {meals.length > 0 ? (
          <span className={styles.sectionHint}>
            Expand a meal to edit options &amp; foods
          </span>
        ) : null}
      </div>

      {meals.length === 0 ? (
        <>
          <p className={styles.emptyLine}>No meals yet.</p>
          <button type="button" className={styles.addMealRow} onClick={onAddMeal}>
            ＋ Add meal
          </button>
        </>
      ) : (
        <MealListEditor
          ref={mealListEditorRef}
          meals={meals}
          openMealId={openMealId}
          maxOptionsPerMeal={maxOptionsPerMeal}
          onToggleMeal={onToggleMeal}
          onUpdateMeal={onUpdateMeal}
          onDeleteMeal={onDeleteMeal}
          onAddOption={onAddOption}
          onUpdateOption={onUpdateOption}
          onDeleteOption={onDeleteOption}
          onAddFood={onAddFood}
          onRemoveFood={onRemoveFood}
          onUpdateFoodQuantity={onUpdateFoodQuantity}
          onAddMeal={onAddMeal}
        />
      )}

      {notes ? (
        <div className={styles.notes}>
          <div className={styles.notesLabel}>Plan notes</div>
          <p className={styles.notesBody}>{notes}</p>
        </div>
      ) : null}
    </div>
  );
}
