import { supabase } from "@/lib/supabase";
import {
  mapNutritionPageRpcToPageData,
  type NutritionPageRpcResponse,
} from "@/lib/nutritionPageDataMapper";

export interface HomeFuelGlanceData {
  caloriesConsumed: number;
  caloriesGoal: number;
  proteinConsumed: number;
  proteinGoal: number;
  caloriesPct: number;
}

/** Today’s fuel summary — same RPC + mapper as the Fuel page. Returns null when no targets. */
export async function fetchHomeFuelGlance(
  clientId: string,
): Promise<HomeFuelGlanceData | null> {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase.rpc("get_client_nutrition_page", {
    p_client_id: clientId,
    p_date: today,
  });

  if (error || !data) return null;

  const mapped = mapNutritionPageRpcToPageData(data as NutritionPageRpcResponse);
  const caloriesGoal = mapped.targetCalories;
  const proteinGoal = mapped.targetProtein;

  if (caloriesGoal <= 0 && proteinGoal <= 0) return null;

  let caloriesConsumed = 0;
  let proteinConsumed = 0;
  for (const meal of mapped.meals) {
    if (!meal.logged) continue;
    for (const item of meal.items) {
      caloriesConsumed += item.calories;
      proteinConsumed += item.protein;
    }
  }

  const caloriesPct =
    caloriesGoal > 0
      ? Math.min(100, Math.round((caloriesConsumed / caloriesGoal) * 100))
      : 0;

  return {
    caloriesConsumed: Math.round(caloriesConsumed),
    caloriesGoal,
    proteinConsumed: Math.round(proteinConsumed),
    proteinGoal,
    caloriesPct,
  };
}
