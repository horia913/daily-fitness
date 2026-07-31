import type { MacroTotals } from "@/lib/mealPlanService";
import type { FoodMacroSource } from "@/components/meal-display/mealDisplayUtils";

export const MEAL_PLAN_DRAFT_STORAGE_VERSION = 1;

export type MealTypeValue = "breakfast" | "lunch" | "dinner" | "snack";

export interface DraftFoodItem {
  id: string;
  foodId: string;
  foodName: string;
  quantity: number;
  unit: string;
  foodData: FoodMacroSource;
}

export interface DraftMealOption {
  id: string;
  name: string;
  orderIndex: number;
  foods: DraftFoodItem[];
  totals: MacroTotals;
}

export interface DraftPlanMeal {
  id: string;
  name: string;
  mealType: MealTypeValue;
  orderIndex: number;
  options: DraftMealOption[];
  /** First/default option totals — collapsed row display. */
  rowTotals: MacroTotals;
}

export interface MealPlanDraftState {
  mealPlanId: string;
  meals: DraftPlanMeal[];
}

export interface StoredMealPlanDraft {
  version: number;
  savedAt: string;
  workingCopy: MealPlanDraftState;
}

export type MealPlanSaveUiState = "idle" | "dirty" | "saving" | "saved" | "error";

export interface MealPlanCommitResult {
  success: boolean;
  error?: string;
  state?: MealPlanDraftState;
}
