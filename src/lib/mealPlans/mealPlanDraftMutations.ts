import type { Food } from "@/lib/mealPlanService";
import type { MealPlanDraftState, MealTypeValue } from "@/types/mealPlanDraft";
import {
  foodToMacroSource,
  newTempId,
  recomputeDraftState,
} from "./mealPlanDraftUtils";

export const MAX_OPTIONS_PER_MEAL = 5;

export function addMealToDraft(state: MealPlanDraftState): MealPlanDraftState {
  const mealId = newTempId();
  const optionId = newTempId();
  const next: MealPlanDraftState = {
    ...state,
    meals: [
      ...state.meals,
      {
        id: mealId,
        name: "New Meal",
        mealType: "breakfast",
        orderIndex: state.meals.length,
        options: [
          {
            id: optionId,
            name: "Option 1",
            orderIndex: 0,
            foods: [],
            totals: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
          },
        ],
        rowTotals: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      },
    ],
  };
  return recomputeDraftState(next);
}

export function removeMealFromDraft(state: MealPlanDraftState, mealId: string): MealPlanDraftState {
  return recomputeDraftState({
    ...state,
    meals: state.meals.filter((m) => m.id !== mealId),
  });
}

export function updateMealInDraft(
  state: MealPlanDraftState,
  mealId: string,
  patch: Partial<{ name: string; mealType: MealTypeValue }>,
): MealPlanDraftState {
  return recomputeDraftState({
    ...state,
    meals: state.meals.map((m) => (m.id === mealId ? { ...m, ...patch } : m)),
  });
}

export function addOptionToDraft(state: MealPlanDraftState, mealId: string): MealPlanDraftState {
  return recomputeDraftState({
    ...state,
    meals: state.meals.map((m) => {
      if (m.id !== mealId) return m;
      if (m.options.length >= MAX_OPTIONS_PER_MEAL) return m;
      const optionNum = m.options.length + 1;
      return {
        ...m,
        options: [
          ...m.options,
          {
            id: newTempId(),
            name: `Option ${optionNum}`,
            orderIndex: m.options.length,
            foods: [],
            totals: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
          },
        ],
      };
    }),
  });
}

export function removeOptionFromDraft(
  state: MealPlanDraftState,
  mealId: string,
  optionId: string,
): MealPlanDraftState | null {
  const meal = state.meals.find((m) => m.id === mealId);
  if (!meal || meal.options.length <= 1) return null;
  return recomputeDraftState({
    ...state,
    meals: state.meals.map((m) =>
      m.id === mealId
        ? { ...m, options: m.options.filter((o) => o.id !== optionId) }
        : m,
    ),
  });
}

export function updateOptionInDraft(
  state: MealPlanDraftState,
  mealId: string,
  optionId: string,
  patch: Partial<{ name: string }>,
): MealPlanDraftState {
  return recomputeDraftState({
    ...state,
    meals: state.meals.map((m) =>
      m.id === mealId
        ? {
            ...m,
            options: m.options.map((o) => (o.id === optionId ? { ...o, ...patch } : o)),
          }
        : m,
    ),
  });
}

export function addFoodToDraft(
  state: MealPlanDraftState,
  mealId: string,
  optionId: string,
  food: Food,
): MealPlanDraftState {
  const foodData = foodToMacroSource(food);
  return recomputeDraftState({
    ...state,
    meals: state.meals.map((m) =>
      m.id === mealId
        ? {
            ...m,
            options: m.options.map((o) =>
              o.id === optionId
                ? {
                    ...o,
                    foods: [
                      ...o.foods,
                      {
                        id: newTempId(),
                        foodId: food.id,
                        foodName: food.name,
                        quantity: food.serving_size,
                        unit: food.serving_unit || "g",
                        foodData,
                      },
                    ],
                  }
                : o,
            ),
          }
        : m,
    ),
  });
}

export function removeFoodFromDraft(
  state: MealPlanDraftState,
  mealId: string,
  optionId: string,
  foodItemId: string,
): MealPlanDraftState {
  return recomputeDraftState({
    ...state,
    meals: state.meals.map((m) =>
      m.id === mealId
        ? {
            ...m,
            options: m.options.map((o) =>
              o.id === optionId
                ? { ...o, foods: o.foods.filter((f) => f.id !== foodItemId) }
                : o,
            ),
          }
        : m,
    ),
  });
}

export function updateFoodQuantityInDraft(
  state: MealPlanDraftState,
  mealId: string,
  optionId: string,
  foodItemId: string,
  quantity: number,
): MealPlanDraftState {
  return recomputeDraftState({
    ...state,
    meals: state.meals.map((m) =>
      m.id === mealId
        ? {
            ...m,
            options: m.options.map((o) =>
              o.id === optionId
                ? {
                    ...o,
                    foods: o.foods.map((f) =>
                      f.id === foodItemId ? { ...f, quantity: Math.max(0, quantity) } : f,
                    ),
                  }
                : o,
            ),
          }
        : m,
    ),
  });
}
