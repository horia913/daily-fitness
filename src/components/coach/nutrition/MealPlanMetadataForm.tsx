"use client";

import React, { useEffect, useState } from "react";
import type { MealPlan } from "@/lib/mealPlanService";
import styles from "./coachNutritionWorkspace.module.css";

export interface MealPlanMetadataFormValues {
  name: string;
  target_calories: string;
  target_protein: string;
  target_carbs: string;
  target_fat: string;
  description: string;
}

export const EMPTY_MEAL_PLAN_METADATA: MealPlanMetadataFormValues = {
  name: "",
  target_calories: "",
  target_protein: "",
  target_carbs: "",
  target_fat: "",
  description: "",
};

export function mealPlanToMetadataForm(plan: MealPlan): MealPlanMetadataFormValues {
  return {
    name: plan.name || "",
    target_calories: plan.target_calories?.toString() || "",
    target_protein: plan.target_protein != null ? String(plan.target_protein) : "",
    target_carbs: plan.target_carbs != null ? String(plan.target_carbs) : "",
    target_fat: plan.target_fat != null ? String(plan.target_fat) : "",
    description: plan.notes ?? plan.description ?? "",
  };
}

export function parseOptionalMacro(raw: string): number | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : undefined;
}

/** Empty string clears the column in the database (`null`). */
export function macroToNullable(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

export interface MealPlanMetadataFormProps {
  mode: "create" | "edit";
  initialValues: MealPlanMetadataFormValues;
  formId: string;
  onSubmit: (values: MealPlanMetadataFormValues) => void | Promise<void>;
}

export function MealPlanMetadataForm({
  mode,
  initialValues,
  formId,
  onSubmit,
}: MealPlanMetadataFormProps) {
  const [values, setValues] = useState<MealPlanMetadataFormValues>(initialValues);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const update = (field: keyof MealPlanMetadataFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form
      id={formId}
      className={styles.foodFormGrid}
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit(values);
      }}
    >
      <label className={styles.formField}>
        <span className={styles.formLabel}>Name *</span>
        <input
          className={styles.formInput}
          value={values.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="e.g., High protein cutting"
          required
        />
      </label>

      <label className={styles.formField}>
        <span className={styles.formLabel}>Target calories (optional)</span>
        <input
          className={styles.formInput}
          type="number"
          value={values.target_calories}
          onChange={(e) => update("target_calories", e.target.value)}
          placeholder="e.g., 2000"
        />
      </label>

      <div className={styles.formRow2}>
        <label className={styles.formField}>
          <span className={styles.formLabel}>Target protein g (optional)</span>
          <input
            className={styles.formInput}
            inputMode="decimal"
            value={values.target_protein}
            onChange={(e) => update("target_protein", e.target.value)}
            placeholder="e.g., 150"
          />
        </label>
        <label className={styles.formField}>
          <span className={styles.formLabel}>Target carbs g (optional)</span>
          <input
            className={styles.formInput}
            inputMode="decimal"
            value={values.target_carbs}
            onChange={(e) => update("target_carbs", e.target.value)}
            placeholder="e.g., 200"
          />
        </label>
      </div>

      <label className={styles.formField}>
        <span className={styles.formLabel}>Target fat g (optional)</span>
        <input
          className={styles.formInput}
          inputMode="decimal"
          value={values.target_fat}
          onChange={(e) => update("target_fat", e.target.value)}
          placeholder="e.g., 65"
        />
      </label>

      <label className={styles.formField}>
        <span className={styles.formLabel}>Notes (optional)</span>
        <textarea
          className={`${styles.formInput} ${styles.formTextarea}`}
          value={values.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="Coach-facing notes…"
          rows={3}
        />
      </label>

      {mode === "edit" ? (
        <p className={styles.formHint}>
          Meals and options are edited on the plan builder. This form is for name, targets, and notes only.
        </p>
      ) : null}
    </form>
  );
}
