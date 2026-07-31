"use client";

import React, { useState } from "react";
import {
  FOOD_CATEGORIES,
  type FoodCatalogFormState,
  createFoodFromCatalogForm,
  validateFoodCatalogForm,
} from "@/lib/mealPlans/foodCatalogForm";
import type { Food } from "@/lib/mealPlanService";
import styles from "./mealDisplay.module.css";

interface InlineCreateFoodFormProps {
  initialForm: FoodCatalogFormState;
  onCreated: (food: Food) => void;
  onCancel: () => void;
}

export function InlineCreateFoodForm({
  initialForm,
  onCreated,
  onCancel,
}: InlineCreateFoodFormProps) {
  const [form, setForm] = useState<FoodCatalogFormState>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const update = (field: keyof FoodCatalogFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSave = async () => {
    const validationError = validateFoodCatalogForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    try {
      const food = await createFoodFromCatalogForm(form);
      onCreated(food);
    } catch {
      setError("Couldn't save food. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.createFoodForm}>
      <p className={styles.createFoodLabel}>Create custom food</p>
      <div className={styles.createFoodGrid}>
        <label className={styles.createFoodField}>
          <span className={styles.createFoodFieldLabel}>Name</span>
          <input
            type="text"
            className={styles.inlineInput}
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
          />
        </label>
        <label className={styles.createFoodField}>
          <span className={styles.createFoodFieldLabel}>Brand</span>
          <input
            type="text"
            className={styles.inlineInput}
            value={form.brand}
            onChange={(e) => update("brand", e.target.value)}
          />
        </label>
        <label className={styles.createFoodField}>
          <span className={styles.createFoodFieldLabel}>Serving</span>
          <span className={styles.createFoodServingRow}>
            <input
              type="number"
              className={styles.inlineQtyInput}
              value={form.serving_size}
              min={0}
              step={0.1}
              onChange={(e) => update("serving_size", e.target.value)}
            />
            <input
              type="text"
              className={styles.inlineQtyInput}
              value={form.serving_unit}
              onChange={(e) => update("serving_unit", e.target.value)}
            />
          </span>
        </label>
        <label className={styles.createFoodField}>
          <span className={styles.createFoodFieldLabel}>Calories</span>
          <input
            type="number"
            className={styles.inlineInput}
            value={form.calories_per_serving}
            min={0}
            onChange={(e) => update("calories_per_serving", e.target.value)}
          />
        </label>
        <label className={styles.createFoodField}>
          <span className={styles.createFoodFieldLabel}>Protein (g)</span>
          <input
            type="number"
            className={styles.inlineInput}
            value={form.protein}
            min={0}
            onChange={(e) => update("protein", e.target.value)}
          />
        </label>
        <label className={styles.createFoodField}>
          <span className={styles.createFoodFieldLabel}>Carbs (g)</span>
          <input
            type="number"
            className={styles.inlineInput}
            value={form.carbs}
            min={0}
            onChange={(e) => update("carbs", e.target.value)}
          />
        </label>
        <label className={styles.createFoodField}>
          <span className={styles.createFoodFieldLabel}>Fat (g)</span>
          <input
            type="number"
            className={styles.inlineInput}
            value={form.fat}
            min={0}
            onChange={(e) => update("fat", e.target.value)}
          />
        </label>
        <label className={styles.createFoodField}>
          <span className={styles.createFoodFieldLabel}>Fiber (g)</span>
          <input
            type="number"
            className={styles.inlineInput}
            value={form.fiber}
            min={0}
            onChange={(e) => update("fiber", e.target.value)}
          />
        </label>
        <label className={styles.createFoodFieldWide}>
          <span className={styles.createFoodFieldLabel}>Category</span>
          <select
            className={styles.inlineTypeSelect}
            value={form.category}
            onChange={(e) => update("category", e.target.value)}
          >
            {FOOD_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error ? <p className={styles.createFoodError}>{error}</p> : null}
      <div className={styles.createFoodActions}>
        <button type="button" className={styles.foodSearchCancel} onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className={styles.createFoodSave}
          disabled={saving}
          onClick={() => void handleSave()}
        >
          {saving ? "Saving…" : "Save food"}
        </button>
      </div>
    </div>
  );
}
