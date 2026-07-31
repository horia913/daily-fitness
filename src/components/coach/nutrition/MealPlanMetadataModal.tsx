"use client";

import React, { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { MealPlanService, type MealPlan } from "@/lib/mealPlanService";
import { useToast } from "@/components/ui/toast-provider";
import ResponsiveModal from "@/components/ui/ResponsiveModal";
import {
  EMPTY_MEAL_PLAN_METADATA,
  macroToNullable,
  MealPlanMetadataForm,
  mealPlanToMetadataForm,
  parseOptionalMacro,
  type MealPlanMetadataFormValues,
} from "./MealPlanMetadataForm";
import styles from "./coachNutritionWorkspace.module.css";

const FORM_ID = "meal-plan-metadata-form";

export interface MealPlanMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  mealPlan?: MealPlan | null;
  onCreated?: (plan: MealPlan) => void;
  onUpdated?: (plan: MealPlan) => void;
}

export function MealPlanMetadataModal({
  isOpen,
  onClose,
  mode,
  mealPlan,
  onCreated,
  onUpdated,
}: MealPlanMetadataModalProps) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);

  const initialValues = useMemo(() => {
    if (mode === "edit" && mealPlan) {
      return mealPlanToMetadataForm(mealPlan);
    }
    return EMPTY_MEAL_PLAN_METADATA;
  }, [mode, mealPlan, isOpen]);

  const handleSubmit = async (values: MealPlanMetadataFormValues) => {
    if (!values.name.trim()) {
      addToast({
        title: "Required",
        description: "Please enter a meal plan name.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      if (mode === "create") {
        if (!user?.id) return;
        const created = await MealPlanService.createMealPlan({
          name: values.name,
          target_calories: values.target_calories
            ? parseInt(values.target_calories, 10)
            : undefined,
          target_protein: parseOptionalMacro(values.target_protein),
          target_carbs: parseOptionalMacro(values.target_carbs),
          target_fat: parseOptionalMacro(values.target_fat),
          description: values.description.trim() || undefined,
          coach_id: user.id,
          is_active: true,
        });
        onCreated?.(created);
      } else if (mealPlan) {
        const updated = await MealPlanService.updateMealPlan(mealPlan.id, {
          name: values.name,
          description: values.description.trim(),
          target_calories: values.target_calories
            ? parseInt(values.target_calories, 10)
            : undefined,
          target_protein: macroToNullable(values.target_protein),
          target_carbs: macroToNullable(values.target_carbs),
          target_fat: macroToNullable(values.target_fat),
        });
        onUpdated?.(updated);
      }
    } catch (error) {
      console.error(`Error ${mode === "create" ? "creating" : "updating"} meal plan:`, error);
      addToast({
        title: "Error",
        description: `Error ${mode === "create" ? "creating" : "updating"} meal plan. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "create" ? "Create meal plan" : "Edit meal plan"}
      subtitle={
        mode === "edit" && mealPlan ? mealPlan.name : "Name, targets, and coach notes"
      }
      maxWidth="md"
      actions={
        <div className={styles.modalActions}>
          <button
            type="button"
            className={styles.ghostBtn}
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            form={FORM_ID}
            className={styles.modalSaveBtn}
            disabled={saving}
          >
            {saving ? (mode === "create" ? "Creating…" : "Saving…") : mode === "create" ? "Create" : "Save"}
          </button>
        </div>
      }
    >
      <MealPlanMetadataForm
        key={mode === "edit" ? mealPlan?.id : "create"}
        mode={mode}
        initialValues={initialValues}
        formId={FORM_ID}
        onSubmit={handleSubmit}
      />
    </ResponsiveModal>
  );
}
