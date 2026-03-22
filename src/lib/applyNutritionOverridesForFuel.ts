/**
 * Applies client_meal_overrides to get_client_nutrition_page RPC payload
 * before mapping to Fuel UI. Keeps override logic in one client-side place
 * (no RPC migration required).
 */

import { supabase } from '@/lib/supabase'
import { getOverridesForAssignment, applyOverridesToLines } from '@/lib/clientMealOverrideService'
import type {
  NutritionPageRpcResponse,
  NutritionPageRpcMeal,
  NutritionPageRpcFoodItem,
  NutritionPageRpcFood,
} from '@/lib/nutritionPageDataMapper'

export async function applyClientMealOverridesToNutritionRpc(
  rpc: NutritionPageRpcResponse
): Promise<NutritionPageRpcResponse> {
  if (!rpc.hasAssignment || !rpc.assignmentId) return rpc

  const overrides = await getOverridesForAssignment(rpc.assignmentId)
  if (!overrides.length) return rpc

  const meals = rpc.meals ?? []
  const baseLines: Parameters<typeof applyOverridesToLines>[0] = []

  for (const m of meals) {
    for (const fi of m.food_items ?? []) {
      const foodId = fi.food?.id ?? fi.food_id
      const mfiId = fi.id
      if (!foodId || !mfiId) continue
      baseLines.push({
        meal_food_item_id: mfiId,
        meal_id: m.id,
        meal_option_id: fi.meal_option_id ?? null,
        food_id: foodId,
        food_name: fi.food?.name ?? '',
        quantity: fi.quantity ?? null,
        unit: (fi.unit as string | null) ?? null,
      })
    }
  }

  const effectiveLines = applyOverridesToLines(baseLines, overrides)
  const foodIds = [...new Set(effectiveLines.map((l) => l.food_id))]

  const foodMap = new Map<string, NutritionPageRpcFood>()
  for (const f of rpc.allFoods ?? []) {
    foodMap.set(f.id, f)
  }

  const missing = foodIds.filter((id) => !foodMap.has(id))
  if (missing.length > 0) {
    const { data } = await supabase
      .from('foods')
      .select('id, name, serving_size, serving_unit, calories_per_serving, protein, carbs, fat')
      .in('id', missing)
    for (const f of data ?? []) {
      foodMap.set(f.id, f as NutritionPageRpcFood)
    }
  }

  const byMeal = new Map<string, NutritionPageRpcFoodItem[]>()
  for (const line of effectiveLines) {
    const f = foodMap.get(line.food_id)
    if (!f) continue
    const item: NutritionPageRpcFoodItem = {
      id: line.meal_food_item_id ?? `override-${line.key}`,
      meal_id: line.meal_id,
      food_id: line.food_id,
      quantity: Number(line.quantity) || 0,
      unit: line.unit ?? undefined,
      meal_option_id: line.meal_option_id ?? undefined,
      food: {
        id: f.id,
        name: f.name,
        serving_size: f.serving_size,
        serving_unit: f.serving_unit,
        calories_per_serving: f.calories_per_serving,
        protein: f.protein,
        carbs: f.carbs,
        fat: f.fat,
      },
    }
    const list = byMeal.get(line.meal_id) || []
    list.push(item)
    byMeal.set(line.meal_id, list)
  }

  const newMeals: NutritionPageRpcMeal[] = meals.map((m) => ({
    ...m,
    food_items: byMeal.get(m.id) ?? [],
  }))

  return {
    ...rpc,
    meals: newMeals,
  }
}
