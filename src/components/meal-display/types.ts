import type { MacroTotals } from "@/lib/mealPlanService";

export interface DisplayFoodItem {
  id: string;
  quantity: number;
  unit: string;
  foodName: string;
  macros: MacroTotals;
}

export interface DisplayMealOption {
  id: string;
  name: string;
  orderIndex: number;
  totals: MacroTotals;
  foods: DisplayFoodItem[];
}

export interface DisplayPlanMeal {
  id: string;
  name: string;
  mealType: string;
  orderIndex: number;
  options: DisplayMealOption[];
  /** First/default option totals — used on collapsed row. */
  rowTotals: MacroTotals;
}

export type MealHueIndex = 0 | 1 | 2 | 3;
