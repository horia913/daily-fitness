"use client";

import React, { useCallback, useMemo, useState } from "react";
import { usePageData } from "@/hooks/usePageData";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/toast-provider";
import ResponsiveModal from "@/components/ui/ResponsiveModal";
import { fetchCoachFoods, type CoachFoodRow } from "./fetchCoachFoods";
import type { NutritionWorkspaceMeta } from "./fetchNutritionWorkspaceData";
import styles from "./coachNutritionWorkspace.module.css";

import {
  EMPTY_FOOD_CATALOG_FORM,
  FOOD_CATEGORIES,
  type FoodCatalogFormState,
  createFoodFromCatalogForm,
  validateFoodCatalogForm,
} from "@/lib/mealPlans/foodCatalogForm";

function formatMacroLine(food: CoachFoodRow): React.ReactNode {
  const serving = `${food.serving_size}${food.serving_unit}`;
  const kcal = Math.round(food.calories_per_serving);

  return (
    <span className={styles.macroLine}>
      <span className={styles.macroKcal}>{kcal} kcal</span>
      <span className={styles.macroSep}> · </span>
      P {food.protein}g
      <span className={styles.macroSep}> · </span>
      C {food.carbs}g
      <span className={styles.macroSep}> · </span>
      F {food.fat}g
      <span className={styles.macroSep}> · </span>
      <span className={styles.servingSuffix}>{serving}</span>
    </span>
  );
}

function FoodActions({
  food,
  onView,
  onDelete,
}: {
  food: CoachFoodRow;
  onView: (food: CoachFoodRow) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className={styles.actions}>
      <button
        type="button"
        className={styles.iconBtn}
        aria-label={`View ${food.name}`}
        onClick={() => onView(food)}
      >
        ⊙
      </button>
      <button
        type="button"
        className={styles.iconBtn}
        aria-label={`Delete ${food.name}`}
        onClick={() => onDelete(food.id)}
      >
        🗑
      </button>
    </div>
  );
}

export interface CoachFoodDatabasePanelProps {
  onMetaChange?: (meta: Partial<NutritionWorkspaceMeta>) => void;
}

export function CoachFoodDatabasePanel({ onMetaChange }: CoachFoodDatabasePanelProps) {
  const { addToast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<FoodCatalogFormState>(EMPTY_FOOD_CATALOG_FORM);
  const [saving, setSaving] = useState(false);
  const [detailFood, setDetailFood] = useState<CoachFoodRow | null>(null);

  const fetchFn = useCallback(async () => fetchCoachFoods(), []);
  const { data, loading, error, refetch } = usePageData(fetchFn, []);
  const foods = data?.foods ?? [];
  const totalCount = data?.totalCount ?? 0;

  React.useEffect(() => {
    onMetaChange?.({ foodCount: totalCount });
  }, [totalCount, onMetaChange]);

  const categoriesInData = useMemo(() => {
    const set = new Set<string>();
    foods.forEach((f) => {
      if (f.category) set.add(f.category);
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [foods]);

  const filteredFoods = useMemo(() => {
    let list = [...foods].sort((a, b) => a.name.localeCompare(b.name));
    if (categoryFilter !== "all") {
      list = list.filter((f) => f.category === categoryFilter);
    }
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.brand ?? "").toLowerCase().includes(q),
    );
  }, [foods, searchQuery, categoryFilter]);

  const handleDeleteFood = async (foodId: string) => {
    if (!confirm("Are you sure you want to delete this food item?")) return;
    try {
      const { error: deleteError } = await supabase
        .from("foods")
        .delete()
        .eq("id", foodId);
      if (deleteError) throw deleteError;
      if (detailFood?.id === foodId) setDetailFood(null);
      refetch();
      addToast({ title: "Food deleted", variant: "success" });
    } catch (err) {
      console.error("Error deleting food:", err);
      addToast({
        title: "Couldn't delete food. Please try again.",
        variant: "destructive",
      });
    }
  };

  const validateAddForm = (): string | null => validateFoodCatalogForm(addForm);

  const handleSaveFood = async () => {
    const validationError = validateAddForm();
    if (validationError) {
      addToast({
        title: "Invalid form",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await createFoodFromCatalogForm(addForm);
      setShowAddModal(false);
      setAddForm(EMPTY_FOOD_CATALOG_FORM);
      refetch();
      addToast({
        title: "Food added",
        description: "The food was saved to the database.",
        variant: "success",
      });
    } catch (err) {
      console.error("Error creating food:", err);
      addToast({
        title: "Couldn't save food. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateAddField = (field: keyof FoodCatalogFormState, value: string) => {
    setAddForm((prev) => ({ ...prev, [field]: value }));
  };

  if (error && !loading && foods.length === 0) {
    return (
      <div className={styles.errorBlock}>
        <p className={styles.errorText}>{error}</p>
        <button type="button" className={styles.ghostBtn} onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <div className={styles.assignHeader}>
        <p className={styles.tabSummary}>{totalCount} foods</p>
        <label className={styles.searchWrap}>
          <span className={styles.searchIcon} aria-hidden>
            ⌕
          </span>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Search by name or brand…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </label>
        <button
          type="button"
          className={`${styles.chip} ${categoryFilter === "all" ? styles.chipOn : styles.chipOff}`}
          onClick={() => setCategoryFilter("all")}
        >
          All {totalCount}
        </button>
        {categoriesInData.map((cat) => {
          const count = foods.filter((f) => f.category === cat).length;
          return (
            <button
              key={cat}
              type="button"
              className={`${styles.chip} ${categoryFilter === cat ? styles.chipOn : styles.chipOff}`}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat} {count}
            </button>
          );
        })}
        <button
          type="button"
          className={`${styles.ghostBtn} ${styles.assignCta}`}
          onClick={() => {
            setAddForm(EMPTY_FOOD_CATALOG_FORM);
            setShowAddModal(true);
          }}
        >
          ＋ Add food
        </button>
      </div>

      <div className={`${styles.tableHead} ${styles.foodTableHead}`} aria-hidden>
        <span className={styles.th}>Food</span>
        <span className={styles.th}>Brand</span>
        <span className={styles.th}>Category</span>
        <span className={styles.th}>Macros</span>
        <span className={styles.th}>Actions</span>
      </div>

      {loading && foods.length === 0 ? (
        <div className={styles.loadingStack} aria-busy="true">
          <div className="fc-skeleton h-14 rounded-none" />
          <div className="fc-skeleton h-14 rounded-none" />
          <div className="fc-skeleton h-14 rounded-none" />
        </div>
      ) : filteredFoods.length === 0 ? (
        <p className={styles.emptyText}>
          {searchQuery || categoryFilter !== "all"
            ? "No foods match your filters."
            : "No foods in the database yet."}
        </p>
      ) : (
        filteredFoods.map((food) => (
          <article key={food.id} className={styles.tableRow}>
            <div className={`${styles.tableRowDesktop} ${styles.foodTableRowDesktop}`}>
              <span className={styles.planName}>{food.name}</span>
              <span className={styles.metaMono}>{food.brand?.trim() || "—"}</span>
              <span className={`${styles.chip} ${styles.categoryChip}`}>{food.category}</span>
              {formatMacroLine(food)}
              <FoodActions
                food={food}
                onView={setDetailFood}
                onDelete={handleDeleteFood}
              />
            </div>

            <div className={`${styles.tableRowMobile} ${styles.foodTableRowMobile}`}>
              <div className={styles.mobileTop}>
                <span className={styles.planName}>{food.name}</span>
                <span className={`${styles.chip} ${styles.categoryChip}`}>{food.category}</span>
              </div>
              <div className={styles.foodMobileBrandLine}>
                <span className={styles.metaMono}>{food.brand?.trim() || "—"}</span>
                <span className={styles.servingSuffix}>
                  {food.serving_size}
                  {food.serving_unit}
                </span>
              </div>
              {formatMacroLine(food)}
              <FoodActions
                food={food}
                onView={setDetailFood}
                onDelete={handleDeleteFood}
              />
            </div>
          </article>
        ))
      )}

      <ResponsiveModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add food"
        subtitle="Enter nutritional information per serving"
        maxWidth="md"
        actions={
          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.ghostBtn}
              onClick={() => setShowAddModal(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.modalSaveBtn}
              onClick={() => void handleSaveFood()}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save food"}
            </button>
          </div>
        }
      >
        <div className={styles.foodFormGrid}>
          <label className={styles.formField}>
            <span className={styles.formLabel}>Name</span>
            <input
              className={styles.formInput}
              value={addForm.name}
              onChange={(e) => updateAddField("name", e.target.value)}
              required
            />
          </label>
          <label className={styles.formField}>
            <span className={styles.formLabel}>Brand</span>
            <input
              className={styles.formInput}
              value={addForm.brand}
              onChange={(e) => updateAddField("brand", e.target.value)}
              placeholder="Optional"
            />
          </label>
          <div className={styles.formRow2}>
            <label className={styles.formField}>
              <span className={styles.formLabel}>Serving size</span>
              <input
                className={styles.formInput}
                type="number"
                min="0"
                step="any"
                value={addForm.serving_size}
                onChange={(e) => updateAddField("serving_size", e.target.value)}
              />
            </label>
            <label className={styles.formField}>
              <span className={styles.formLabel}>Unit</span>
              <input
                className={styles.formInput}
                value={addForm.serving_unit}
                onChange={(e) => updateAddField("serving_unit", e.target.value)}
              />
            </label>
          </div>
          <label className={styles.formField}>
            <span className={styles.formLabel}>Calories (kcal)</span>
            <input
              className={styles.formInput}
              type="number"
              min="0"
              step="any"
              value={addForm.calories_per_serving}
              onChange={(e) => updateAddField("calories_per_serving", e.target.value)}
            />
          </label>
          <div className={styles.formRow2}>
            <label className={styles.formField}>
              <span className={styles.formLabel}>Protein (g)</span>
              <input
                className={styles.formInput}
                type="number"
                min="0"
                step="any"
                value={addForm.protein}
                onChange={(e) => updateAddField("protein", e.target.value)}
              />
            </label>
            <label className={styles.formField}>
              <span className={styles.formLabel}>Carbs (g)</span>
              <input
                className={styles.formInput}
                type="number"
                min="0"
                step="any"
                value={addForm.carbs}
                onChange={(e) => updateAddField("carbs", e.target.value)}
              />
            </label>
          </div>
          <div className={styles.formRow2}>
            <label className={styles.formField}>
              <span className={styles.formLabel}>Fat (g)</span>
              <input
                className={styles.formInput}
                type="number"
                min="0"
                step="any"
                value={addForm.fat}
                onChange={(e) => updateAddField("fat", e.target.value)}
              />
            </label>
            <label className={styles.formField}>
              <span className={styles.formLabel}>Fiber (g)</span>
              <input
                className={styles.formInput}
                type="number"
                min="0"
                step="any"
                value={addForm.fiber}
                onChange={(e) => updateAddField("fiber", e.target.value)}
              />
            </label>
          </div>
          <label className={styles.formField}>
            <span className={styles.formLabel}>Category</span>
            <select
              className={styles.formInput}
              value={addForm.category}
              onChange={(e) => updateAddField("category", e.target.value)}
            >
              {FOOD_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>
        </div>
      </ResponsiveModal>

      <ResponsiveModal
        isOpen={detailFood != null}
        onClose={() => setDetailFood(null)}
        title={detailFood?.name ?? "Food details"}
        subtitle={detailFood?.brand?.trim() || undefined}
        maxWidth="md"
        actions={
          detailFood ? (
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.ghostBtn}
                onClick={() => setDetailFood(null)}
              >
                Close
              </button>
              <button
                type="button"
                className={`${styles.ghostBtn} ${styles.dangerBtn}`}
                onClick={() => void handleDeleteFood(detailFood.id)}
              >
                Delete
              </button>
            </div>
          ) : undefined
        }
      >
        {detailFood ? (
          <div className={styles.foodDetailBody}>
            <div className={styles.foodDetailRow}>
              <span className={styles.formLabel}>Brand</span>
              <span className={styles.metaMono}>{detailFood.brand?.trim() || "—"}</span>
            </div>
            <div className={styles.foodDetailRow}>
              <span className={styles.formLabel}>Serving</span>
              <span className={styles.metaMono}>
                {detailFood.serving_size} {detailFood.serving_unit}
              </span>
            </div>
            <div className={styles.foodDetailRow}>
              <span className={styles.formLabel}>Category</span>
              <span className={`${styles.chip} ${styles.categoryChip}`}>
                {detailFood.category}
              </span>
            </div>
            <div className={styles.foodDetailMacros}>
              <span className={styles.formLabel}>Macros per serving</span>
              {formatMacroLine(detailFood)}
              {detailFood.fiber > 0 ? (
                <span className={styles.metaMono}>Fiber {detailFood.fiber}g</span>
              ) : null}
            </div>
          </div>
        ) : null}
      </ResponsiveModal>
    </>
  );
}
