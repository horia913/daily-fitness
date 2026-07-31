import { MealPlanService, type MealFoodItem, type MacroTotals } from "@/lib/mealPlanService";
import {
  computeItemMacros,
  type FoodMacroSource,
} from "@/components/meal-display/mealDisplayUtils";
import type {
  DraftFoodItem,
  DraftMealOption,
  DraftPlanMeal,
  MealPlanDraftState,
} from "@/types/mealPlanDraft";

const TEMP_PREFIX = "temp-";

export function isTempId(id: string): boolean {
  return id.startsWith(TEMP_PREFIX);
}

export function newTempId(): string {
  return `${TEMP_PREFIX}${crypto.randomUUID()}`;
}

export function foodToMacroSource(food: {
  id: string;
  name: string;
  serving_size: number;
  serving_unit: string;
  calories_per_serving: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  calories_per_100g?: number | null;
  protein_per_100g?: number | null;
  carbs_per_100g?: number | null;
  fat_per_100g?: number | null;
  fiber_per_100g?: number | null;
}): FoodMacroSource {
  return {
    id: food.id,
    name: food.name,
    serving_size: food.serving_size,
    serving_unit: food.serving_unit,
    calories_per_serving: food.calories_per_serving,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
    fiber: food.fiber,
    sodium: 0,
    category: "General",
    created_at: "",
    updated_at: "",
    calories_per_100g: food.calories_per_100g,
    protein_per_100g: food.protein_per_100g,
    carbs_per_100g: food.carbs_per_100g,
    fat_per_100g: food.fat_per_100g,
    fiber_per_100g: food.fiber_per_100g,
  };
}

function draftFoodToMealFoodItem(item: DraftFoodItem, mealId: string, optionId: string): MealFoodItem {
  return {
    id: item.id,
    meal_id: mealId,
    meal_option_id: optionId,
    food_id: item.foodId,
    quantity: item.quantity,
    unit: item.unit,
    created_at: "",
    food: item.foodData,
  };
}

export function computeOptionTotals(option: DraftMealOption): MacroTotals {
  const items = option.foods.map((f) =>
    draftFoodToMealFoodItem(f, "", option.id),
  );
  return MealPlanService.calculateFoodItemTotals(items);
}

export function computeFoodMacros(item: DraftFoodItem): ReturnType<typeof computeItemMacros> {
  return computeItemMacros(draftFoodToMealFoodItem(item, "", ""));
}

export function recomputeDraftMeal(meal: DraftPlanMeal): DraftPlanMeal {
  const options = meal.options.map((opt) => {
    const totals = computeOptionTotals(opt);
    return { ...opt, totals };
  });
  const rowTotals =
    options.length > 0
      ? options[0].totals
      : { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  return { ...meal, options, rowTotals };
}

export function recomputeDraftState(state: MealPlanDraftState): MealPlanDraftState {
  return {
    ...state,
    meals: state.meals.map((m, i) => recomputeDraftMeal({ ...m, orderIndex: i })),
  };
}

export function cloneMealPlanDraft(state: MealPlanDraftState): MealPlanDraftState {
  return JSON.parse(JSON.stringify(state)) as MealPlanDraftState;
}

function normalizeMealForCompare(meal: DraftPlanMeal) {
  return {
    id: meal.id,
    name: meal.name,
    mealType: meal.mealType,
    orderIndex: meal.orderIndex,
    options: meal.options.map((o) => ({
      id: o.id,
      name: o.name,
      orderIndex: o.orderIndex,
      foods: o.foods.map((f) => ({
        id: f.id,
        foodId: f.foodId,
        quantity: f.quantity,
        unit: f.unit,
      })),
    })),
  };
}

export function mealPlanDraftsEqual(a: MealPlanDraftState, b: MealPlanDraftState): boolean {
  if (a.mealPlanId !== b.mealPlanId) return false;
  if (a.meals.length !== b.meals.length) return false;
  const normA = a.meals.map(normalizeMealForCompare);
  const normB = b.meals.map(normalizeMealForCompare);
  return JSON.stringify(normA) === JSON.stringify(normB);
}

export function hasUnsavedMealPlanChanges(workingCopy: MealPlanDraftState | null, baseline: MealPlanDraftState | null): boolean {
  if (!workingCopy || !baseline) return false;
  return !mealPlanDraftsEqual(workingCopy, baseline);
}
