/**
 * Maps get_client_nutrition_page RPC response to Fuel page state.
 * Used so the Fuel page can rely on a single RPC instead of 20+ queries.
 */

export interface NutritionPageRpcFoodItem {
  id?: string;
  meal_id?: string;
  food_id?: string;
  quantity?: number;
  unit?: string;
  meal_option_id?: string | null;
  food?: {
    id: string;
    name: string;
    serving_size?: number;
    serving_unit?: string;
    calories_per_serving?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
}

export interface NutritionPageRpcOption {
  id: string;
  meal_id?: string;
  name: string;
  order_index?: number;
}

export interface NutritionPageRpcCompletion {
  id?: string;
  meal_id?: string;
  client_id?: string;
  date?: string;
  completed_at?: string;
  photo_url?: string | null;
  notes?: string | null;
  meal_option_id?: string | null;
}

export interface NutritionPageRpcMeal {
  id: string;
  meal_plan_id?: string;
  name: string;
  meal_type: string;
  order_index?: number;
  notes?: string | null;
  food_items?: NutritionPageRpcFoodItem[] | null;
  options?: NutritionPageRpcOption[] | null;
  completion?: NutritionPageRpcCompletion | null;
}

export interface NutritionPageRpcGoal {
  id: string;
  title: string;
  target_value?: number | string | null;
  target_unit?: string | null;
  current_value?: number | null;
  progress_percentage?: number | null;
}

export interface NutritionPageRpcAssignment {
  id: string;
  meal_plan_id: string;
  start_date?: string | null;
  end_date?: string | null;
  label?: string | null;
  meal_plans?: {
    id: string;
    name: string;
    notes?: string | null;
    target_calories?: number | null;
    target_protein?: number | null;
    target_carbs?: number | null;
    target_fat?: number | null;
  } | null;
}

export interface NutritionPageRpcWeeklyComplianceDay {
  date: string;
  meals_completed: number;
}

export interface NutritionPageRpcFood {
  id: string;
  name: string;
  serving_size?: number;
  serving_unit?: string;
  calories_per_serving?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface NutritionPageRpcResponse {
  hasAssignment: boolean;
  assignmentId?: string;
  mealPlanId?: string;
  activeAssignments?: NutritionPageRpcAssignment[] | null;
  dailySelection?: { meal_plan_assignment_id: string } | null;
  meals?: NutritionPageRpcMeal[] | null;
  nutritionGoals?: NutritionPageRpcGoal[] | null;
  weeklyCompliance?: NutritionPageRpcWeeklyComplianceDay[] | null;
  allFoods?: NutritionPageRpcFood[] | null;
}

export interface MappedMealFoodItem {
  food: { id: string; name: string; serving_size: number; serving_unit: string };
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MappedMealOption {
  id: string;
  name: string;
  order_index: number;
  items: MappedMealFoodItem[];
  totals: { calories: number; protein: number; carbs: number; fat: number; fiber: number };
}

export interface MappedMeal {
  id: string;
  type: "breakfast" | "lunch" | "dinner" | "snack";
  name: string;
  emoji: string;
  items: MappedMealFoodItem[];
  logged: boolean;
  photoUrl?: string;
  logged_at?: string;
  options?: MappedMealOption[];
  loggedOptionId?: string;
}

function mealTypeToEmoji(mealType: string): string {
  switch (mealType) {
    case "breakfast": return "🍳";
    case "lunch": return "🥗";
    case "dinner": return "🍽️";
    case "snack": return "🍎";
    default: return "🍎";
  }
}

function mapFoodItem(fi: NutritionPageRpcFoodItem): MappedMealFoodItem | null {
  const food = fi.food;
  if (!food) return null;
  const servingSize = food.serving_size ?? 1;
  const multiplier = Number(fi.quantity) / servingSize;
  return {
    food: {
      id: food.id,
      name: food.name,
      serving_size: servingSize,
      serving_unit: food.serving_unit ?? "g",
    },
    quantity: Number(fi.quantity),
    calories: (food.calories_per_serving ?? 0) * multiplier,
    protein: (food.protein ?? 0) * multiplier,
    carbs: (food.carbs ?? 0) * multiplier,
    fat: (food.fat ?? 0) * multiplier,
  };
}

export function mapNutritionPageRpcToMeals(rpc: NutritionPageRpcResponse): MappedMeal[] {
  const mealRows = rpc.meals ?? [];
  const result: MappedMeal[] = [];

  for (const m of mealRows) {
    const foodItems = Array.isArray(m.food_items) ? m.food_items : [];
    const options = Array.isArray(m.options) ? m.options : [];
    const completion = m.completion ?? null;
    const hasOptions = options.length > 0;

    let mealOptionsDisplay: MappedMealOption[] = [];
    if (hasOptions) {
      mealOptionsDisplay = options.map((opt) => {
        const optionFoodItems = foodItems.filter(
          (fi) => fi.meal_option_id === opt.id
        );
        const items: MappedMealFoodItem[] = [];
        let calories = 0, protein = 0, carbs = 0, fat = 0;
        for (const item of optionFoodItems) {
          const mapped = mapFoodItem(item);
          if (mapped) {
            items.push(mapped);
            calories += mapped.calories;
            protein += mapped.protein;
            carbs += mapped.carbs;
            fat += mapped.fat;
          }
        }
        return {
          id: opt.id,
          name: opt.name,
          order_index: opt.order_index ?? 0,
          items,
          totals: { calories, protein, carbs, fat, fiber: 0 },
        };
      });
    }

    const legacyFoodItems = hasOptions
      ? []
      : foodItems.filter((fi) => !fi.meal_option_id);
    let mappedFoodItems: MappedMealFoodItem[] = [];
    let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;

    if (legacyFoodItems.length > 0) {
      for (const item of legacyFoodItems) {
        const mapped = mapFoodItem(item);
        if (mapped) {
          mappedFoodItems.push(mapped);
          totalCalories += mapped.calories;
          totalProtein += mapped.protein;
          totalCarbs += mapped.carbs;
          totalFat += mapped.fat;
        }
      }
    } else if (hasOptions && mealOptionsDisplay.length > 0) {
      mappedFoodItems = mealOptionsDisplay[0].items;
      totalCalories = mealOptionsDisplay[0].totals.calories;
      totalProtein = mealOptionsDisplay[0].totals.protein;
      totalCarbs = mealOptionsDisplay[0].totals.carbs;
      totalFat = mealOptionsDisplay[0].totals.fat;
    }

    if (completion?.meal_option_id && mealOptionsDisplay.length > 0) {
      const chosen = mealOptionsDisplay.find((o) => o.id === completion.meal_option_id);
      if (chosen) {
        mappedFoodItems = chosen.items;
        totalCalories = chosen.totals.calories;
        totalProtein = chosen.totals.protein;
        totalCarbs = chosen.totals.carbs;
        totalFat = chosen.totals.fat;
      }
    }

    const mealType = (m.meal_type || "snack") as "breakfast" | "lunch" | "dinner" | "snack";
    result.push({
      id: m.id,
      type: mealType,
      name: m.name,
      emoji: mealTypeToEmoji(m.meal_type),
      items: mappedFoodItems,
      logged: !!completion,
      photoUrl: completion?.photo_url ?? undefined,
      logged_at: completion?.completed_at,
      options: mealOptionsDisplay.length > 0 ? mealOptionsDisplay : undefined,
      loggedOptionId: completion?.meal_option_id ?? undefined,
    });
  }

  return result;
}

export interface MappedNutritionPageData {
  hasAssignment: boolean;
  assignmentId: string | null;
  mealPlanId: string | null;
  activeAssignments: NutritionPageRpcAssignment[];
  dailySelectionId: string | null;
  activeMealPlanInfo: {
    mealPlanId: string;
    name: string;
    startDate: string | null;
    endDate: string | null;
    description?: string;
  } | null;
  meals: MappedMeal[];
  nutritionGoals: Array<{
    id: string;
    title: string;
    target_value: number | string | null;
    target_unit?: string | null;
    current_value?: number | null;
    progress_percentage?: number | null;
    status: string;
  }>;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  weeklyCompliance: NutritionPageRpcWeeklyComplianceDay[];
  allFoods: NutritionPageRpcFood[];
}

export function mapNutritionPageRpcToPageData(rpc: NutritionPageRpcResponse): MappedNutritionPageData {
  const hasAssignment = rpc.hasAssignment === true;
  const assignmentId = rpc.assignmentId ?? null;
  const mealPlanId = rpc.mealPlanId ?? null;
  const activeAssignments = Array.isArray(rpc.activeAssignments) ? rpc.activeAssignments : [];
  const dailySelectionId = rpc.dailySelection?.meal_plan_assignment_id ?? null;

  const effectiveAssignment = activeAssignments.find((a) => a.id === assignmentId) ?? activeAssignments[0];
  const mealPlans = effectiveAssignment?.meal_plans;
  const activeMealPlanInfo = effectiveAssignment
    ? {
        mealPlanId: effectiveAssignment.meal_plan_id,
        name: mealPlans?.name ?? "Active Meal Plan",
        startDate: effectiveAssignment.start_date ?? null,
        endDate: effectiveAssignment.end_date ?? null,
        description: mealPlans?.notes ?? undefined,
      }
    : null;

  const meals = mapNutritionPageRpcToMeals(rpc);
  const nutritionGoals = (rpc.nutritionGoals ?? []).map((g) => ({
    id: g.id,
    title: g.title,
    target_value: g.target_value ?? null,
    target_unit: g.target_unit ?? null,
    current_value: g.current_value ?? null,
    progress_percentage: g.progress_percentage ?? null,
    status: "active",
  }));

  const targetCalories = mealPlans?.target_calories ?? 0;
  const targetProtein = Number(mealPlans?.target_protein ?? 0);
  const targetCarbs = Number(mealPlans?.target_carbs ?? 0);
  const targetFat = Number(mealPlans?.target_fat ?? 0);
  const weeklyCompliance = Array.isArray(rpc.weeklyCompliance) ? rpc.weeklyCompliance : [];
  const allFoods = Array.isArray(rpc.allFoods) ? rpc.allFoods : [];

  return {
    hasAssignment,
    assignmentId,
    mealPlanId,
    activeAssignments,
    dailySelectionId,
    activeMealPlanInfo,
    meals,
    nutritionGoals,
    targetCalories: Number(targetCalories),
    targetProtein,
    targetCarbs,
    targetFat,
    weeklyCompliance,
    allFoods,
  };
}
