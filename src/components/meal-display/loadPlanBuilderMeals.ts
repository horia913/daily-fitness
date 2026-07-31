import { supabase } from "@/lib/supabase";
import { MealPlanService, type MealFoodItem } from "@/lib/mealPlanService";
import {
  computeItemMacros,
  sumMacros,
  type FoodMacroSource,
} from "./mealDisplayUtils";
import type { DisplayPlanMeal } from "./types";

export async function loadPlanBuilderMeals(mealPlanId: string): Promise<{ meals: DisplayPlanMeal[] }> {
  const { data: mealsData, error: mealsError } = await supabase
    .from("meals")
    .select("id, name, meal_type, order_index, created_at")
    .eq("meal_plan_id", mealPlanId)
    .order("order_index", { ascending: true });

  if (mealsError) throw mealsError;

  if (!mealsData?.length) {
    return { meals: [] };
  }

  const mealIds = mealsData.map((m) => m.id as string);

  const [{ data: optionsData }, { data: foodItemsData }] = await Promise.all([
    supabase
      .from("meal_options")
      .select("id, meal_id, name, order_index")
      .in("meal_id", mealIds)
      .order("order_index", { ascending: true }),
    supabase
      .from("meal_food_items")
      .select("id, meal_id, meal_option_id, food_id, quantity, unit")
      .in("meal_id", mealIds),
  ]);

  const foodIds = [
    ...new Set((foodItemsData || []).map((fi: { food_id: string }) => fi.food_id)),
  ] as string[];

  let foodsById = new Map<string, FoodMacroSource>();
  if (foodIds.length > 0) {
    const { data: foodsData } = await supabase
      .from("foods")
      .select(
        "id, name, serving_size, serving_unit, calories_per_serving, protein, carbs, fat, fiber, sodium, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g",
      )
      .in("id", foodIds);
    foodsById = new Map(
      (foodsData || []).map((f) => [f.id as string, f as FoodMacroSource]),
    );
  }

  const itemsByOption = new Map<string, MealFoodItem[]>();
  (foodItemsData || []).forEach((raw: Record<string, unknown>) => {
    if (!raw.meal_option_id) return;
    const item: MealFoodItem = {
      id: String(raw.id),
      meal_id: String(raw.meal_id),
      meal_option_id: String(raw.meal_option_id),
      food_id: String(raw.food_id),
      quantity: Number(raw.quantity) || 0,
      unit: String(raw.unit || "g"),
      created_at: "",
      food: foodsById.get(String(raw.food_id)),
    };
    const key = item.meal_option_id!;
    if (!itemsByOption.has(key)) itemsByOption.set(key, []);
    itemsByOption.get(key)!.push(item);
  });

  const optionsByMeal = new Map<string, Array<Record<string, unknown>>>();
  (optionsData || []).forEach((opt: Record<string, unknown>) => {
    const mealId = String(opt.meal_id);
    if (!optionsByMeal.has(mealId)) optionsByMeal.set(mealId, []);
    optionsByMeal.get(mealId)!.push(opt);
  });

  const meals: DisplayPlanMeal[] = mealsData.map((meal: Record<string, unknown>) => {
    const mealId = String(meal.id);
    const mealOptions = optionsByMeal.get(mealId) || [];
    const displayOptions = mealOptions.map((opt: Record<string, unknown>, idx: number) => {
      const optionId = String(opt.id);
      const optionItems = itemsByOption.get(optionId) || [];
      const totals = MealPlanService.calculateFoodItemTotals(optionItems);
      return {
        id: optionId,
        name: String(opt.name),
        orderIndex: Number(opt.order_index ?? idx),
        totals,
        foods: optionItems.map((item) => {
          const macros = computeItemMacros(item);
          return {
            id: item.id,
            quantity: item.quantity,
            unit: item.unit,
            foodName: item.food?.name || "Unknown food",
            macros,
          };
        }),
      };
    });

    const rowTotals =
      displayOptions.length > 0
        ? displayOptions[0].totals
        : { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

    return {
      id: mealId,
      name: String(meal.name),
      mealType: String(meal.meal_type),
      orderIndex: Number(meal.order_index ?? 0),
      options: displayOptions,
      rowTotals,
    };
  });

  return { meals };
}

export function computePlanTotalsFromMeals(meals: Array<{ rowTotals: import("@/lib/mealPlanService").MacroTotals }>) {
  return sumMacros(meals.map((m) => m.rowTotals));
}
